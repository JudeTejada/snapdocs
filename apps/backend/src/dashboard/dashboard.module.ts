import { Module } from '@nestjs/common';
import { DashboardRepository } from './dashboard.repository';
import { DashboardService } from './dashboard.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { ClerkModule } from '../auth/clerk.module';
import { GitHubModule } from '../github/github.module';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [PrismaModule, UsersModule, ClerkModule, GitHubModule],
  providers: [DashboardRepository, DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}