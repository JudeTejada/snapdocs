import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Worker } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { SyncWorkerService } from '../workers/sync-worker.service';
import { DocsWorkerService } from '../workers/docs-worker.service';

@Injectable()
export class BullQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BullQueueService.name);

  constructor(
    @InjectQueue('generateDocs') private readonly generateDocsQueue: Queue,
    @InjectQueue('syncRepositories') private readonly syncRepositoriesQueue: Queue,
    private readonly configService: ConfigService,
    private readonly syncWorkerService: SyncWorkerService,
    private readonly docsWorkerService: DocsWorkerService,
  ) {}

  private syncWorker: Worker | null = null;
  private docsWorker: Worker | null = null;

  async onModuleInit() {
    try {
      const connection = await this.generateDocsQueue.client;
      await connection.ping();
      this.logger.log('✓ Successfully connected to Redis via BullMQ');
      this.logger.log(`Redis Host: ${this.configService.get('redis.host')}, Port: ${this.configService.get('redis.port')}`);

      // Initialize workers
      this.initializeSyncWorker();
      this.initializeDocsWorker();
    } catch (error) {
      this.logger.error('✗ Failed to connect to Redis', error);
      throw error;
    }
  }

  private initializeSyncWorker() {
    try {
      this.syncWorker = new Worker('syncRepositories', async (job) => {
        return this.syncWorkerService.process(job);
      }, {
        connection: {
          host: this.configService.get('redis.host'),
          port: this.configService.get('redis.port'),
        },
      });

      this.syncWorker.on('completed', (job) => {
        this.logger.log(`Sync job ${job.id} completed successfully`);
      });

      this.syncWorker.on('failed', (job, err) => {
        this.logger.error(`Sync job ${job.id} failed:`, err);
      });

      this.logger.log('✓ Sync worker initialized successfully');
    } catch (error) {
      this.logger.error('✗ Failed to initialize sync worker', error);
      throw error;
    }
  }

  private initializeDocsWorker() {
    try {
      this.docsWorker = new Worker('generateDocs', async (job) => {
        return this.docsWorkerService.process(job);
      }, {
        connection: {
          host: this.configService.get('redis.host'),
          port: this.configService.get('redis.port'),
        },
      });

      this.docsWorker.on('completed', (job) => {
        this.logger.log(`Docs generation job ${job.id} completed successfully`);
      });

      this.docsWorker.on('failed', (job, err) => {
        this.logger.error(`Docs generation job ${job.id} failed:`, err);
      });

      this.logger.log('✓ Docs worker initialized successfully');
    } catch (error) {
      this.logger.error('✗ Failed to initialize docs worker', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.generateDocsQueue.close();
      await this.syncRepositoriesQueue.close();

      if (this.syncWorker) {
        await this.syncWorker.close();
        this.logger.log('✓ Sync worker closed successfully');
      }

      if (this.docsWorker) {
        await this.docsWorker.close();
        this.logger.log('✓ Docs worker closed successfully');
      }

      this.logger.log('✓ Redis connection closed successfully');
    } catch (error) {
      this.logger.error('✗ Error closing Redis connection', error);
    }
  }

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

  async addSyncRepositoriesJob(data: { clerkId: string }) {
    this.logger.log(`Adding syncRepositories job to queue for user: ${data.clerkId}`);

    try {
      const job = await this.syncRepositoriesQueue.add('syncRepositories', {
        clerkId: data.clerkId,
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

      this.logger.log(`Sync job added successfully with ID: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error('Failed to add sync job to queue', error);
      throw error;
    }
  }

  async getQueueStats() {
    const generateDocsWaiting = await this.generateDocsQueue.getWaiting();
    const generateDocsActive = await this.generateDocsQueue.getActive();
    const generateDocsCompleted = await this.generateDocsQueue.getCompleted();
    const generateDocsFailed = await this.generateDocsQueue.getFailed();

    const syncReposWaiting = await this.syncRepositoriesQueue.getWaiting();
    const syncReposActive = await this.syncRepositoriesQueue.getActive();
    const syncReposCompleted = await this.syncRepositoriesQueue.getCompleted();
    const syncReposFailed = await this.syncRepositoriesQueue.getFailed();

    return {
      generateDocs: {
        waiting: generateDocsWaiting.length,
        active: generateDocsActive.length,
        completed: generateDocsCompleted.length,
        failed: generateDocsFailed.length,
      },
      syncRepositories: {
        waiting: syncReposWaiting.length,
        active: syncReposActive.length,
        completed: syncReposCompleted.length,
        failed: syncReposFailed.length,
      },
    };
  }
}