import { Logger } from '@nestjs/common';

export class SyncLogger {
  private readonly logger = new Logger(SyncLogger.name);

  logSyncStart(userId: string, context: string) {
    this.logger.log(`🔄 Sync started - User: ${userId}, Context: ${context}`);
  }

  logSyncComplete(userId: string, duration: number, reposSynced: number, prsSynced: number) {
    this.logger.log(
      `✅ Sync completed - User: ${userId}, Duration: ${duration}ms, Repos: ${reposSynced}, PRs: ${prsSynced}`
    );
  }

  logSyncError(userId: string, error: Error, context: string) {
    this.logger.error(
      `❌ Sync failed - User: ${userId}, Context: ${context}, Error: ${error.message}`,
      error.stack
    );
  }

  logSyncSkipped(userId: string, reason: string) {
    this.logger.warn(`⏭️  Sync skipped - User: ${userId}, Reason: ${reason}`);
  }

  logApiCall(method: string, endpoint: string, duration: number, status: number) {
    this.logger.log(`🌐 API Call - ${method} ${endpoint} - ${status} (${duration}ms)`);
  }

  logRateLimitWarning(service: string, remaining: number) {
    this.logger.warn(`⚠️  Rate limit warning - Service: ${service}, Remaining: ${remaining}`);
  }

  logQueueMetrics(queueName: string, waiting: number, active: number, failed: number) {
    this.logger.log(
      `📊 Queue Metrics - ${queueName}: Waiting: ${waiting}, Active: ${active}, Failed: ${failed}`
    );
  }
}

export const syncLogger = new SyncLogger();