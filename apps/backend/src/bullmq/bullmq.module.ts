import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullQueueService } from './bullmq.service';
import { SyncModule } from '../sync/sync.module';
import { WorkersModule } from '../workers/workers.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => SyncModule),
    forwardRef(() => WorkersModule),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'generateDocs',
    }),
    BullModule.registerQueue({
      name: 'syncRepositories',
    }),
  ],
  providers: [BullQueueService],
  exports: [BullQueueService],
})
export class BullmqModule {}