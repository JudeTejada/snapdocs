import { Module } from "@nestjs/common";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksService } from "./webhooks.service";
import { GitHubModule } from "../github/github.module";
import { DashboardModule } from "../dashboard/dashboard.module";

@Module({
  imports: [GitHubModule, DashboardModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
