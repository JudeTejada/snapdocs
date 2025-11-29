import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SyncService } from '../sync/sync.service';
import { syncLogger } from '../common/utils/logger.util';

@Injectable()
export class SyncWorkerService {
  private readonly logger = new Logger(SyncWorkerService.name);

  constructor(private readonly syncService: SyncService) {}

  async process(job: Job<{ clerkId: string }>) {
    const { clerkId } = job.data;
    const jobId = job.id;
    const startTime = Date.now();
    
    this.logger.log(`🔄 Processing sync repositories job for user: ${clerkId}, Job ID: ${jobId}`);
    syncLogger.logSyncStart(clerkId, `background-job-${jobId}`);

    try {
      await this.syncService.syncRepositoriesFromGitHub(clerkId);
      
      const duration = Date.now() - startTime;
      this.logger.log(`✅ Successfully completed sync repositories job for user: ${clerkId} in ${duration}ms`);
      
      return {
        success: true,
        clerkId,
        jobId,
        duration,
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ Failed to sync repositories for user: ${clerkId} after ${duration}ms`, error);
      syncLogger.logSyncError(clerkId, error, `background-job-${jobId}`);
      
      // Re-throw to trigger retry logic
      throw error;
    }
  }
}