import { describe, it, expect, vi, beforeEach } from 'vitest';
import { acceptInvitation, createInvitation, declineInvitation, getInvitationStatus } from '../../services/invitations';
import { prisma } from '../../db/prisma';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../../utils/errors';

vi.mock('../../db/prisma', () => {
  const mockPrisma = {
    party: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    dispute: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    invitation: {
      upsert: vi.fn(),
    },
    invitationEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  mockPrisma.$transaction.mockImplementation(async (args: any) => {
    if (Array.isArray(args)) {
      return Promise.all(args.map((a: any) => (typeof a === 'function' ? a(mockPrisma) : a)));
    }
    return args(mockPrisma);
  });
  return { prisma: mockPrisma };
});

vi.mock('../../config/redis', () => ({
  redis: { get: vi.fn(), setex: vi.fn(), del: vi.fn(), incr: vi.fn(), expire: vi.fn() },
}));

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() },
}));

vi.mock('../../utils/audit', () => ({
  createAuditEvent: vi.fn(),
}));

vi.mock('../../jobs/queues', () => ({
  addEmailJob: vi.fn(),
}));

vi.mock('../../services/disputes/state-machine', () => ({
  validateTransition: vi.fn().mockReturnValue(true),
}));

describe('Invitations Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.$transaction as any).mockImplementation(async (args: any) => {
      if (Array.isArray(args)) {
        return Promise.all(args.map((a: any) => (typeof a === 'function' ? a(prisma) : a)));
      }
      return args(prisma);
    });
    (prisma.invitation.upsert as any).mockResolvedValue({ id: 'invitation_123', partyId: 'party_123' });
    (prisma.invitationEvent.create as any).mockResolvedValue({ id: 'event_123', invitationId: 'invitation_123', eventType: 'SENT' });
  });

  describe('acceptInvitation', () => {
    const mockParty = {
      id: 'party_123',
      disputeId: 'dispute_123',
      invitationStatus: 'PENDING',
      invitationEmail: 'respondent@example.com',
      invitationToken: 'valid_token',
      invitationExpiresAt: new Date(Date.now() + 86400000),
      dispute: { id: 'dispute_123', title: 'Test Dispute' },
    };

    it('should accept invitation for existing user', async () => {
      (prisma.party.findUnique as any).mockResolvedValue(mockParty);
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user_456', email: 'respondent@example.com' });

      const result = await acceptInvitation('valid_token');

      expect(result.message).toBe('Invitation accepted');
      expect(result.disputeId).toBe('dispute_123');
      expect(prisma.party.update).toHaveBeenCalled();
      expect(prisma.dispute.update).toHaveBeenCalled();
    });

    it('should create guest user on accept when no account exists and displayName provided', async () => {
      (prisma.party.findUnique as any).mockResolvedValue(mockParty);
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue({
        id: 'guest_789',
        email: 'respondent@example.com',
        accountType: 'GUEST',
      });

      const result = await acceptInvitation('valid_token', 'Guest Respondent');

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'respondent@example.com',
          accountType: 'GUEST',
          emailVerified: true,
          displayName: 'Guest Respondent',
        }),
      });
      expect(result.message).toBe('Invitation accepted');
      expect(result.userId).toBe('guest_789');
    });

    it('should throw error when no account exists and no displayName provided', async () => {
      (prisma.party.findUnique as any).mockResolvedValue(mockParty);
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(acceptInvitation('valid_token')).rejects.toThrow(BadRequestError);
    });

    it('should throw error for expired invitation', async () => {
      const expiredParty = {
        ...mockParty,
        invitationExpiresAt: new Date(Date.now() - 86400000),
      };
      (prisma.party.findUnique as any).mockResolvedValue(expiredParty);

      await expect(acceptInvitation('expired_token')).rejects.toThrow(BadRequestError);
    });

    it('should throw error for non-pending invitation', async () => {
      (prisma.party.findUnique as any).mockResolvedValue({
        ...mockParty,
        invitationStatus: 'DECLINED',
      });

      await expect(acceptInvitation('declined_token')).rejects.toThrow(ConflictError);
    });

    it('should throw error for non-existent token', async () => {
      (prisma.party.findUnique as any).mockResolvedValue(null);

      await expect(acceptInvitation('invalid_token')).rejects.toThrow(NotFoundError);
    });
  });

  describe('declineInvitation', () => {
    it('should decline invitation successfully', async () => {
      (prisma.party.findUnique as any).mockResolvedValue({
        id: 'party_123',
        disputeId: 'dispute_123',
        invitationStatus: 'PENDING',
        invitationEmail: 'test@example.com',
        dispute: { title: 'Test' },
      });

      const result = await declineInvitation('valid_token');

      expect(result.message).toBe('Invitation declined');
    });
  });

  describe('getInvitationStatus', () => {
    it('should return NOT_SENT when no respondent party exists', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'dispute_123',
        parties: [],
      });

      const result = await getInvitationStatus('dispute_123');

      expect(result.status).toBe('NOT_SENT');
    });

    it('should return invitation status', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'dispute_123',
        parties: [{
          id: 'party_123',
          invitationEmail: 'test@example.com',
          invitationStatus: 'PENDING',
          invitationSentAt: new Date(),
          invitationExpiresAt: new Date(Date.now() + 86400000),
          invitationAcceptedAt: null,
        }],
      });

      const result = await getInvitationStatus('dispute_123');

      expect(result.status).toBe('PENDING');
      expect(result.email).toBe('test@example.com');
    });

    it('should mark expired invitations', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'dispute_123',
        parties: [{
          id: 'party_123',
          invitationEmail: 'test@example.com',
          invitationStatus: 'PENDING',
          invitationSentAt: new Date(),
          invitationExpiresAt: new Date(Date.now() - 86400000),
          invitationAcceptedAt: null,
        }],
      });

      const result = await getInvitationStatus('dispute_123');

      expect(result.status).toBe('EXPIRED');
    });
  });
});
