import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { GitHubModule } from '../github/github.module';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [GitHubModule, DashboardModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
