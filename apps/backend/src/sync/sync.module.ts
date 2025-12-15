import { Module, forwardRef } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncWorkerService } from '../workers/sync-worker.service';
import { GitHubModule } from '../github/github.module';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [GitHubModule, UsersModule, PrismaModule, forwardRef(() => DashboardModule)],
  providers: [SyncService, SyncWorkerService],
  exports: [SyncService, SyncWorkerService],
})
export class SyncModule {}