import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  Logger,
} from "@nestjs/common";
import { GitHubService } from "../github/github.service";
import { BullQueueService } from "../bullmq/bullmq.service";
import { DashboardRepository } from "../dashboard/dashboard.repository";
import {
  GitHubWebhookDto,
  WebhookResponseDto,
} from "../github/dto/github-webhook.dto";

@Controller("webhooks")
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly githubService: GitHubService,
    private readonly bullQueueService: BullQueueService,
    private readonly dashboardRepository: DashboardRepository,
  ) {}

  @Post("github")
  @HttpCode(200)
  async handleGitHubWebhook(
    @Body() payload,
    @Headers("x-hub-signature-256") signature: string,
    @Headers("x-github-event") event: string,
    @Headers("x-github-delivery") delivery: string,
  ): Promise<WebhookResponseDto> {
    try {
      this.logger.log(
        `Received GitHub webhook: ${event} (delivery: ${delivery})`,
      );

      const rawPayload = JSON.stringify(payload);
      const isValidSignature = this.githubService.verifyWebhookSignature(
        rawPayload,
        signature,
      );

      if (!isValidSignature) {
        this.logger.warn("Invalid signature for webhook delivery: ", delivery);
        return {
          success: false,
          message: "Invalid signature",
        };
      }

      if (event === "pull_request") {
        const owner = payload.repository.owner.login;
        const name = payload.repository.name;
        const prNumber = payload.pull_request.number;
        const prTitle = payload.pull_request.title;

        if (payload.action === "closed") {
          if (payload.pull_request.merged) {
            this.logger.log(`Processing merged PR: ${prTitle} (#${prNumber})`);

            const extractedData =
              this.githubService.extractPullRequestData(payload);

            await this.bullQueueService.addGenerateDocsJob(extractedData);

            return {
              success: true,
              message: "Webhook processed successfully",
              data: {
                pr_number: prNumber,
                pr_title: prTitle,
                repository: `${owner}/${name}`,
                action: "merged",
              },
            };
          } else {
            this.logger.log(
              `Deleting closed (non-merged) PR: ${prTitle} (#${prNumber}) from ${owner}/${name}`,
            );

            await this.dashboardRepository.deletePullRequest(
              owner,
              name,
              prNumber,
            );

            return {
              success: true,
              message: "Closed PR deleted successfully",
              data: {
                pr_number: prNumber,
                pr_title: prTitle,
                repository: `${owner}/${name}`,
                action: "closed_deleted",
              },
            };
          }
        }
      }

      this.logger.log(
        `Ignoring webhook event: ${event} with action: ${payload.action}`,
      );
      return {
        success: true,
        message: "Event ignored",
        data: {
          event,
          action: payload.action,
        },
      };
    } catch (error) {
      this.logger.error("Error processing GitHub webhook", error);
      return {
        success: false,
        message: "Internal server error",
      };
    }
  }
}
