import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullQueueService } from './bullmq.service';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'generateDocs',
    }),
  ],
  providers: [BullQueueService],
  exports: [BullQueueService],
})
export class BullmqModule {}