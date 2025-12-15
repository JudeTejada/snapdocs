import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  Logger,
} from "@nestjs/common";
import { WebhooksService } from "./webhooks.service";
import { WebhookResponseDto } from "../github/dto/github-webhook.dto";

/**
 * Controller responsible for receiving GitHub webhook events.
 * Follows thin controller pattern - delegates all business logic to WebhooksService.
 */
@Controller("webhooks")
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Post("github")
  @HttpCode(200)
  async handleGitHubWebhook(
    @Body() payload: any,
    @Headers("x-hub-signature-256") signature: string,
    @Headers("x-github-event") event: string,
    @Headers("x-github-delivery") delivery: string,
  ): Promise<WebhookResponseDto> {
    try {
      this.logger.log(
        `Received GitHub webhook: ${event} (delivery: ${delivery})`,
      );

      // Verify webhook authenticity
      const rawPayload = JSON.stringify(payload);
      const isValidSignature = this.webhooksService.verifySignature(
        rawPayload,
        signature,
      );

      if (!isValidSignature) {
        this.logger.warn(`Invalid signature for webhook delivery: ${delivery}`);
        return {
          success: false,
          message: "Invalid signature",
        };
      }

      // Route to appropriate handler based on event type
      switch (event) {
        case "pull_request":
          return this.webhooksService.handlePullRequestEvent(payload);

        default:
          return this.webhooksService.createIgnoredResponse(
            event,
            payload.action,
          );
      }
    } catch (error) {
      this.logger.error("Error processing GitHub webhook", error);
      return {
        success: false,
        message: "Internal server error",
      };
    }
  }
}
