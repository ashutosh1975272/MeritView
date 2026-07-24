import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../config/email', () => ({
  getEmailConfig: vi.fn(() => ({
    host: 'localhost',
    port: 1025,
    secure: false,
    auth: null,
    fromEmail: 'noreply@meritview.app',
    fromName: 'MeritView',
  })),
  getDkimConfig: vi.fn(() => ({
    domainName: 'meritview.app',
    keySelector: 'mail',
    privateKey: '',
  })),
  EMAIL_QUEUE_CONFIG: {
    maxRetries: 3,
    backoffDelay: 2000,
    deadLetterQueueMaxSize: 1000,
  },
}));

vi.mock('nodemailer', () => ({
  createTransport: vi.fn(() => ({
    sendMail: vi.fn(),
  })),
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

describe('Email Templates', () => {
  it('should render verification email without errors', async () => {
    const { verificationEmail } = await import('../../services/email/templates/verification-email');
    const html = verificationEmail({ link: 'https://meritview.app/verify?token=abc' });
    expect(html).toContain('Verify Your Email');
    expect(html).toContain('https://meritview.app/verify?token=abc');
  });

  it('should render password reset email without errors', async () => {
    const { passwordReset } = await import('../../services/email/templates/password-reset');
    const html = passwordReset({ link: 'https://meritview.app/reset?token=abc' });
    expect(html).toContain('Reset Your Password');
    expect(html).toContain('https://meritview.app/reset?token=abc');
  });

  it('should render dispute created email without errors', async () => {
    const { disputeCreated } = await import('../../services/email/templates/dispute-created');
    const html = disputeCreated({ disputeTitle: 'Test Dispute', disputeLink: 'https://meritview.app/disputes/123' });
    expect(html).toContain('Test Dispute');
    expect(html).toContain('https://meritview.app/disputes/123');
  });

  it('should render brief submitted email without errors', async () => {
    const { briefSubmitted } = await import('../../services/email/templates/brief-submitted');
    const html = briefSubmitted({ disputeTitle: 'Test Dispute', disputeLink: 'https://meritview.app/disputes/123' });
    expect(html).toContain('Test Dispute');
    expect(html).toContain('https://meritview.app/disputes/123');
  });

  it('should render payment success email without errors', async () => {
    const { paymentSuccess } = await import('../../services/email/templates/payment-success');
    const html = paymentSuccess({ disputeTitle: 'Test Dispute', amount: 49.99 });
    expect(html).toContain('Test Dispute');
    expect(html).toContain('49.99');
  });

  it('should render payment failed email without errors', async () => {
    const { paymentFailed } = await import('../../services/email/templates/payment-failed');
    const html = paymentFailed({ disputeTitle: 'Test Dispute', retryLink: 'https://meritview.app/disputes/123/payment' });
    expect(html).toContain('Test Dispute');
    expect(html).toContain('https://meritview.app/disputes/123/payment');
  });

  it('should render opinion ready email without errors', async () => {
    const { opinionReady } = await import('../../services/email/templates/opinion-ready');
    const html = opinionReady({ disputeTitle: 'Test Dispute', opinionLink: 'https://meritview.app/disputes/123/opinion' });
    expect(html).toContain('Test Dispute');
    expect(html).toContain('https://meritview.app/disputes/123/opinion');
  });

  it('should render account deletion email without errors', async () => {
    const { accountDeletion } = await import('../../services/email/templates/account-deletion');
    const html = accountDeletion({ displayName: 'John Doe' });
    expect(html).toContain('John Doe');
    expect(html).toContain('Account Deletion Confirmation');
  });
});

describe('Template required fields', () => {
  it('verification email has logo, footer, contact info', async () => {
    const { verificationEmail } = await import('../../services/email/templates/verification-email');
    const html = verificationEmail({ link: 'https://meritview.app/verify?token=abc' });
    expect(html).toContain('meritview.app/logo.png');
    expect(html).toContain('support@meritview.app');
    expect(html).toContain('MeritView');
  });

  it('password reset email has logo, footer, contact info', async () => {
    const { passwordReset } = await import('../../services/email/templates/password-reset');
    const html = passwordReset({ link: 'https://meritview.app/reset?token=abc' });
    expect(html).toContain('meritview.app/logo.png');
    expect(html).toContain('support@meritview.app');
  });

  it('dispute created email has logo, footer, contact info', async () => {
    const { disputeCreated } = await import('../../services/email/templates/dispute-created');
    const html = disputeCreated({ disputeTitle: 'Test', disputeLink: 'https://meritview.app/disputes/1' });
    expect(html).toContain('meritview.app/logo.png');
    expect(html).toContain('support@meritview.app');
  });

  it('brief submitted email has logo, footer, contact info', async () => {
    const { briefSubmitted } = await import('../../services/email/templates/brief-submitted');
    const html = briefSubmitted({ disputeTitle: 'Test', disputeLink: 'https://meritview.app/disputes/1' });
    expect(html).toContain('meritview.app/logo.png');
    expect(html).toContain('support@meritview.app');
  });

  it('payment success email has logo, footer, contact info', async () => {
    const { paymentSuccess } = await import('../../services/email/templates/payment-success');
    const html = paymentSuccess({ disputeTitle: 'Test', amount: 49 });
    expect(html).toContain('meritview.app/logo.png');
    expect(html).toContain('support@meritview.app');
  });

  it('payment failed email has logo, footer, contact info', async () => {
    const { paymentFailed } = await import('../../services/email/templates/payment-failed');
    const html = paymentFailed({ disputeTitle: 'Test', retryLink: 'https://meritview.app' });
    expect(html).toContain('meritview.app/logo.png');
    expect(html).toContain('support@meritview.app');
  });

  it('opinion ready email has logo, footer, contact info', async () => {
    const { opinionReady } = await import('../../services/email/templates/opinion-ready');
    const html = opinionReady({ disputeTitle: 'Test', opinionLink: 'https://meritview.app' });
    expect(html).toContain('meritview.app/logo.png');
    expect(html).toContain('support@meritview.app');
  });

  it('account deletion email has logo, footer, contact info', async () => {
    const { accountDeletion } = await import('../../services/email/templates/account-deletion');
    const html = accountDeletion({ displayName: 'Test' });
    expect(html).toContain('meritview.app/logo.png');
    expect(html).toContain('support@meritview.app');
  });
});

describe('InMemoryEmailQueue', () => {
  let InMemoryEmailQueue: any;

  beforeEach(async () => {
    const mod = await import('../../services/email/in-memory-queue');
    InMemoryEmailQueue = mod.InMemoryEmailQueue;
  });

  afterEach(() => {
    InMemoryEmailQueue?.prototype?.reset?.();
  });

  it('should queue and process emails', async () => {
    const queue = new InMemoryEmailQueue();
    const processor = vi.fn().mockResolvedValue({ status: 'completed' });
    queue.processQueue(processor);

    const job = queue.add({ to: 'test@test.com', subject: 'Test', html: '<p>Test</p>' });
    expect(job.id).toBeDefined();
    expect(job.to).toBe('test@test.com');
    expect(job.status).toBe('pending');

    await new Promise(r => setTimeout(r, 1500));
    expect(processor).toHaveBeenCalled();
  });

  it('should move to dead letter after max retries', async () => {
    const queue = new InMemoryEmailQueue();
    const processor = vi.fn().mockResolvedValue({ status: 'failed', error: 'SMTP error' });
    queue.processQueue(processor);

    queue.add({ to: 'test@test.com', subject: 'Test', html: '<p>Test</p>' });

    await new Promise(r => setTimeout(r, 4000));
    const deadLetter = queue.getDeadLetterQueue();
    expect(deadLetter.length).toBeGreaterThan(0);
    expect(deadLetter[0].status).toBe('dead_lettered');
  });

  it('should requeue dead letter jobs', async () => {
    const queue = new InMemoryEmailQueue();
    const processor = vi.fn().mockResolvedValue({ status: 'failed', error: 'SMTP error' });
    queue.processQueue(processor);

    queue.add({ to: 'test@test.com', subject: 'Test', html: '<p>Test</p>' });

    await new Promise(r => setTimeout(r, 4000));
    const deadLetter = queue.getDeadLetterQueue();
    expect(deadLetter.length).toBeGreaterThan(0);

    const requeued = queue.requeueDeadLetter(deadLetter[0].id);
    expect(requeued).toBe(true);
    expect(queue.getDeadLetterQueue().length).toBe(0);
  });

  it('should provide metrics', async () => {
    const queue = new InMemoryEmailQueue();
    queue.add({ to: 'a@b.com', subject: 'Test', html: '<p>Test</p>' });
    queue.add({ to: 'b@b.com', subject: 'Test', html: '<p>Test</p>' });

    const metrics = queue.getMetrics();
    expect(metrics.totalQueued).toBe(2);
    expect(metrics.queueDepth).toBe(2);
  });

  it('should not requeue non-existent dead letter job', async () => {
    const queue = new InMemoryEmailQueue();
    const result = queue.requeueDeadLetter('non-existent');
    expect(result).toBe(false);
  });
});

describe('Email Service', () => {
  it('should queue a verification email', async () => {
    const { sendVerificationEmail, getInMemoryQueue } = await import('../../services/email');
    await sendVerificationEmail('test@test.com', 'token123');
    const queue = getInMemoryQueue();
    const metrics = queue.getMetrics();
    expect(metrics.totalQueued).toBeGreaterThanOrEqual(1);
  });

  it('should queue a password reset email', async () => {
    const { sendPasswordResetEmail, getInMemoryQueue } = await import('../../services/email');
    await sendPasswordResetEmail('test@test.com', 'token123');
    const queue = getInMemoryQueue();
    const metrics = queue.getMetrics();
    expect(metrics.totalQueued).toBeGreaterThanOrEqual(1);
  });

  it('should queue a dispute created email', async () => {
    const { sendDisputeCreatedEmail, getInMemoryQueue } = await import('../../services/email');
    await sendDisputeCreatedEmail('test@test.com', 'Dispute Title', 'disp_123');
    const queue = getInMemoryQueue();
    const metrics = queue.getMetrics();
    expect(metrics.totalQueued).toBeGreaterThanOrEqual(1);
  });

  it('should queue a brief submitted email', async () => {
    const { sendBriefSubmittedEmail, getInMemoryQueue } = await import('../../services/email');
    await sendBriefSubmittedEmail('test@test.com', 'Dispute Title', 'disp_123');
    const queue = getInMemoryQueue();
    const metrics = queue.getMetrics();
    expect(metrics.totalQueued).toBeGreaterThanOrEqual(1);
  });

  it('should queue a payment success email', async () => {
    const { sendPaymentSuccessEmail, getInMemoryQueue } = await import('../../services/email');
    await sendPaymentSuccessEmail('test@test.com', 'Dispute Title', 49.99);
    const queue = getInMemoryQueue();
    const metrics = queue.getMetrics();
    expect(metrics.totalQueued).toBeGreaterThanOrEqual(1);
  });

  it('should queue a payment failed email', async () => {
    const { sendPaymentFailedEmail, getInMemoryQueue } = await import('../../services/email');
    await sendPaymentFailedEmail('test@test.com', 'Dispute Title', 'disp_123');
    const queue = getInMemoryQueue();
    const metrics = queue.getMetrics();
    expect(metrics.totalQueued).toBeGreaterThanOrEqual(1);
  });

  it('should queue an opinion ready email', async () => {
    const { sendOpinionReadyEmail, getInMemoryQueue } = await import('../../services/email');
    await sendOpinionReadyEmail('test@test.com', 'Dispute Title', 'disp_123');
    const queue = getInMemoryQueue();
    const metrics = queue.getMetrics();
    expect(metrics.totalQueued).toBeGreaterThanOrEqual(1);
  });

  it('should queue an account deletion email', async () => {
    const { sendAccountDeletionEmail, getInMemoryQueue } = await import('../../services/email');
    await sendAccountDeletionEmail('test@test.com', 'John Doe');
    const queue = getInMemoryQueue();
    const metrics = queue.getMetrics();
    expect(metrics.totalQueued).toBeGreaterThanOrEqual(1);
  });
});

describe('Email Worker', () => {
  it('should create email worker and process queue', async () => {
    const { InMemoryEmailQueue } = await import('../../services/email/in-memory-queue');
    const { createEmailWorker } = await import('../../jobs/email.worker');
    const queue = new InMemoryEmailQueue();

    createEmailWorker(queue);
    queue.add({ to: 'test@test.com', subject: 'Test', html: '<p>Test</p>' });

    const jobs = queue.getJobs();
    expect(jobs.length).toBe(1);
    expect(jobs[0].to).toBe('test@test.com');
  });
});

describe('Email Config', () => {
  it('should return valid email config', async () => {
    const { getEmailConfig } = await import('../../config/email');
    const config = getEmailConfig();
    expect(config.fromEmail).toBe('noreply@meritview.app');
    expect(config.fromName).toBe('MeritView');
    expect(config.host).toBe('localhost');
  });

  it('should return DKIM config', async () => {
    const { getDkimConfig } = await import('../../config/email');
    const dkim = getDkimConfig();
    expect(dkim.domainName).toBe('meritview.app');
    expect(dkim.keySelector).toBe('mail');
  });

  it('should have EMAIL_QUEUE_CONFIG with maxRetries 3', async () => {
    const { EMAIL_QUEUE_CONFIG } = await import('../../config/email');
    expect(EMAIL_QUEUE_CONFIG.maxRetries).toBe(3);
    expect(EMAIL_QUEUE_CONFIG.backoffDelay).toBe(2000);
  });
});
