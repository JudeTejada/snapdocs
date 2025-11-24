import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class BullQueueService {
  private readonly logger = new Logger(BullQueueService.name);

  constructor(
    @InjectQueue('generateDocs') private readonly generateDocsQueue: Queue,
  ) {}

  async addGenerateDocsJob(data: any) {
    this.logger.log(`Adding generateDocs job to queue for PR: ${data.pullRequest?.number}`);

    try {
      const job = await this.generateDocsQueue.add('generateDocs', {
        repository: data.repository,
        installation: data.installation,
        pullRequest: data.pullRequest,
        timestamp: new Date().toISOString(),
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      });

      this.logger.log(`Job added successfully with ID: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error('Failed to add job to queue', error);
      throw error;
    }
  }

  async getQueueStats() {
    const waiting = await this.generateDocsQueue.getWaiting();
    const active = await this.generateDocsQueue.getActive();
    const completed = await this.generateDocsQueue.getCompleted();
    const failed = await this.generateDocsQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }
}