import { Module } from '@nestjs/common';
import { SyncWorkerService } from './sync-worker.service';
import { DocsWorkerService } from './docs-worker.service';
import { SyncModule } from '../sync/sync.module';
import { GitHubModule } from '../github/github.module';
import { AiModule } from '../ai/ai.module';
import { DocumentationModule } from '../documentation/documentation.module';

@Module({
  imports: [SyncModule, GitHubModule, AiModule, DocumentationModule],
  providers: [SyncWorkerService, DocsWorkerService],
  exports: [SyncWorkerService, DocsWorkerService],
})
export class WorkersModule {}
