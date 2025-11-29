import { Module } from '@nestjs/common';
import { SyncWorkerService } from './sync-worker.service';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [SyncModule],
  providers: [SyncWorkerService],
  exports: [SyncWorkerService],
})
export class WorkersModule {}