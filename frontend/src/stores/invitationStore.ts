import { create } from 'zustand';

interface Invitation {
  token: string;
  disputeId: string;
  disputeTitle: string;
  initiatorEmail: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

interface InvitationStore {
  currentInvitation: Invitation | null;
  isLoading: boolean;
  error: string | null;
  setInvitation: (invitation: Invitation) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearInvitation: () => void;
}

export const useInvitationStore = create<InvitationStore>((set) => ({
  currentInvitation: null,
  isLoading: false,
  error: null,
  setInvitation: (invitation) => set({ currentInvitation: invitation, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearInvitation: () => set({ currentInvitation: null, error: null }),
}));
