import { Module } from '@nestjs/common';
import { SyncWorkerService } from './sync-worker.service';
import { DocsWorkerService } from './docs-worker.service';
import { SyncModule } from '../sync/sync.module';
import { GitHubModule } from '../github/github.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [SyncModule, GitHubModule, PrismaModule, AiModule],
  providers: [SyncWorkerService, DocsWorkerService],
  exports: [SyncWorkerService, DocsWorkerService],
})
export class WorkersModule {}