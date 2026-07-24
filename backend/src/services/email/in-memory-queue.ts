import { logger } from '../../utils/logger';
import { EMAIL_QUEUE_CONFIG } from '../../config/email';

export type EmailQueueStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dead_lettered';

export interface EmailJobData {
  id: string;
  to: string;
  subject: string;
  html: string;
  retryCount: number;
  maxRetries: number;
  status: EmailQueueStatus;
  error?: string;
  createdAt: Date;
  lastAttemptAt?: Date;
}

type JobProcessor = (job: EmailJobData) => Promise<{ status: EmailQueueStatus; error?: string }>;

export class InMemoryEmailQueue {
  private queue: EmailJobData[] = [];
  private deadLetterQueue: EmailJobData[] = [];
  private processing = false;
  private processedCount = 0;
  private failedCount = 0;
  private processor: JobProcessor | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private jobCounter = 0;

  add(data: { to: string; subject: string; html: string }): EmailJobData {
    this.jobCounter++;
    const job: EmailJobData = {
      id: `email_${Date.now()}_${this.jobCounter}`,
      to: data.to,
      subject: data.subject,
      html: data.html,
      retryCount: 0,
      maxRetries: EMAIL_QUEUE_CONFIG.maxRetries,
      status: 'pending',
      createdAt: new Date(),
    };
    this.queue.push(job);

    if (!this.processing && this.intervalId === null) {
      this.startProcessing();
    }

    return job;
  }

  private startProcessing(): void {
    this.intervalId = setInterval(() => {
      this.processNext();
    }, 1000);
  }

  stopProcessing(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.processing = false;
  }

  private processNext(): void {
    if (this.processing) return;

    const job = this.queue.find(j => j.status === 'pending');
    if (!job) return;

    this.processing = true;
    job.status = 'processing';
    job.lastAttemptAt = new Date();

    const processPromise = this.processor
      ? this.processor(job)
      : Promise.resolve({ status: 'completed' as EmailQueueStatus });

    processPromise
      .then(result => {
        if (result.status === 'completed') {
          job.status = 'completed';
          this.processedCount++;
          logger.info('In-memory email job completed', { jobId: job.id, to: job.to, subject: job.subject });
        } else {
          this.handleFailure(job, result.error);
        }
      })
      .catch(err => {
        this.handleFailure(job, (err as Error).message);
      })
      .finally(() => {
        this.processing = false;
      });
  }

  private handleFailure(job: EmailJobData, error?: string): void {
    job.retryCount++;
    job.error = error;

    if (job.retryCount >= job.maxRetries) {
      job.status = 'dead_lettered';
      this.deadLetterQueue.push({ ...job });
      if (this.deadLetterQueue.length > EMAIL_QUEUE_CONFIG.deadLetterQueueMaxSize) {
        this.deadLetterQueue.shift();
      }
      this.failedCount++;
      logger.error('Email job dead-lettered after max retries', undefined, {
        jobId: job.id,
        to: job.to,
        subject: job.subject,
        retries: job.retryCount,
        error,
      });
    } else {
      const delay = EMAIL_QUEUE_CONFIG.backoffDelay * Math.pow(2, job.retryCount - 1);
      job.status = 'pending';
      logger.warn('Email job failed, will retry', {
        jobId: job.id,
        to: job.to,
        subject: job.subject,
        retryCount: job.retryCount,
        nextRetryDelay: delay,
        error,
      });
      setTimeout(() => {
        const existing = this.queue.find(j => j.id === job.id);
        if (existing && existing.status !== 'dead_lettered') {
          existing.status = 'pending';
        }
      }, delay);
    }
  }

  processQueue(processor: JobProcessor): void {
    this.processor = processor;
  }

  getDeadLetterQueue(): EmailJobData[] {
    return [...this.deadLetterQueue];
  }

  requeueDeadLetter(jobId: string): boolean {
    const idx = this.deadLetterQueue.findIndex(j => j.id === jobId);
    if (idx === -1) return false;
    const job = this.deadLetterQueue[idx];
    this.deadLetterQueue.splice(idx, 1);
    job.retryCount = 0;
    job.status = 'pending';
    job.error = undefined;
    this.queue.push(job);
    return true;
  }

  getQueueLength(): number {
    return this.queue.filter(j => j.status === 'pending').length;
  }

  getJobs(): EmailJobData[] {
    return [...this.queue];
  }

  getMetrics() {
    return {
      totalQueued: this.jobCounter,
      totalProcessed: this.processedCount,
      totalFailed: this.failedCount,
      deadLetterCount: this.deadLetterQueue.length,
      queueDepth: this.getQueueLength(),
    };
  }

  reset(): void {
    this.queue = [];
    this.deadLetterQueue = [];
    this.processedCount = 0;
    this.failedCount = 0;
    this.jobCounter = 0;
    this.stopProcessing();
  }
}
