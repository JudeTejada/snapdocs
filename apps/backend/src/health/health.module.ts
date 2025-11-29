import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { BullmqModule } from '../bullmq/bullmq.module';

@Module({
  imports: [BullmqModule],
  controllers: [HealthController],
})
export class HealthModule {}