import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BullQueueService } from '../bullmq/bullmq.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(
    private readonly bullQueueService: BullQueueService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Run every 30 minutes to sync repositories for all connected users
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handlePeriodicSync() {
    this.logger.log('Starting periodic repository sync for all connected users');

    try {
      const connectedUsers = await this.usersService.getAllConnectedUsers();
      this.logger.log(`Found ${connectedUsers.length} connected users to sync`);

      let successCount = 0;
      let errorCount = 0;

      for (const user of connectedUsers) {
        try {
          await this.bullQueueService.addSyncRepositoriesJob({ clerkId: user.clerkId });
          successCount++;
          this.logger.debug(`Scheduled sync for user: ${user.clerkId}`);
        } catch (error) {
          errorCount++;
          this.logger.error(`Failed to schedule sync for user: ${user.clerkId}`, error);
        }
      }

      this.logger.log(`Periodic sync completed. Scheduled: ${successCount}, Errors: ${errorCount}`);
    } catch (error) {
      this.logger.error('Error during periodic sync', error);
    }
  }

  /**
   * Run daily at 2 AM to clean up old sync job data
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCleanup() {
    this.logger.log('Starting daily cleanup of old sync job data');

    try {
      // Clean up completed jobs older than 7 days
      // This is handled by BullMQ's removeOnComplete setting, but we can add additional cleanup here if needed
      
      this.logger.log('Daily cleanup completed');
    } catch (error) {
      this.logger.error('Error during daily cleanup', error);
    }
  }

  /**
   * Run every hour to monitor sync health
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleSyncHealthCheck() {
    this.logger.log('Running sync health check');

    try {
      const queueStats = await this.bullQueueService.getQueueStats();
      
      this.logger.log(`Queue health check - GenerateDocs: ${JSON.stringify(queueStats.generateDocs)}`);
      this.logger.log(`Queue health check - SyncRepositories: ${JSON.stringify(queueStats.syncRepositories)}`);

      // Alert if failed jobs are high
      const totalFailed = queueStats.generateDocs.failed + queueStats.syncRepositories.failed;
      if (totalFailed > 10) {
        this.logger.warn(`High number of failed jobs detected: ${totalFailed}`);
      }

      // Alert if sync repositories queue is backed up
      const syncQueueTotal = queueStats.syncRepositories.waiting + queueStats.syncRepositories.active;
      if (syncQueueTotal > 50) {
        this.logger.warn(`Sync repositories queue is backed up: ${syncQueueTotal} jobs`);
      }
    } catch (error) {
      this.logger.error('Error during sync health check', error);
    }
  }
}