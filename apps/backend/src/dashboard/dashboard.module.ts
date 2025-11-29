import { Module, forwardRef } from '@nestjs/common';
import { DashboardRepository } from './dashboard.repository';
import { DashboardService } from './dashboard.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { ClerkModule } from '../auth/clerk.module';
import { GitHubModule } from '../github/github.module';
import { DashboardController } from './dashboard.controller';
import { BullmqModule } from '../bullmq/bullmq.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [PrismaModule, UsersModule, ClerkModule, GitHubModule, BullmqModule, forwardRef(() => SyncModule)],
  providers: [DashboardRepository, DashboardService],
  controllers: [DashboardController],
  exports: [BullmqModule, DashboardRepository],
})
export class DashboardModule {}