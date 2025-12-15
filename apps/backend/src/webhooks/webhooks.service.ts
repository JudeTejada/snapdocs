import { Injectable, Logger } from "@nestjs/common";
import { GitHubService } from "../github/github.service";
import { BullQueueService } from "../bullmq/bullmq.service";
import { DashboardRepository } from "../dashboard/dashboard.repository";
import { WebhookResponseDto } from "../github/dto/github-webhook.dto";

/**
 * Context object passed to webhook handlers containing parsed PR info
 */
export interface PullRequestContext {
  owner: string;
  name: string;
  prNumber: number;
  prTitle: string;
  payload: any;
}

/**
 * Service responsible for processing GitHub webhook events.
 * Follows Single Responsibility Principle by separating handlers by action type.
 */
@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly githubService: GitHubService,
    private readonly bullQueueService: BullQueueService,
    private readonly dashboardRepository: DashboardRepository,
  ) {}

  /**
   * Verifies the webhook signature to ensure authenticity
   */
  verifySignature(rawPayload: string, signature: string): boolean {
    return this.githubService.verifyWebhookSignature(rawPayload, signature);
  }


  async handlePullRequestEvent(payload: any): Promise<WebhookResponseDto> {
    const context = this.extractPullRequestContext(payload);
    const action = payload.action;

    switch (action) {
      case "opened":
      case "reopened":
        return this.handlePullRequestOpened(context);

      case "closed":
        return payload.pull_request.merged
          ? this.handlePullRequestMerged(context)
          : this.handlePullRequestClosed(context);

      default:
        return this.createIgnoredResponse("pull_request", action);
    }
  }


  private async handlePullRequestOpened(
    context: PullRequestContext,
  ): Promise<WebhookResponseDto> {
    const { owner, name, prNumber, prTitle, payload } = context;

    this.logger.log(
      `Processing opened PR: ${prTitle} (#${prNumber}) from ${owner}/${name}`,
    );

    const repo = await this.dashboardRepository.findRepoByOwnerAndName(
      owner,
      name,
    );

    if (!repo) {
      this.logger.warn(
        `Repository ${owner}/${name} not found in database, skipping PR sync`,
      );
      return {
        success: true,
        message: "Repository not found, PR not synced",
        data: {
          pr_number: prNumber,
          pr_title: prTitle,
          repository: `${owner}/${name}`,
          action: "opened_skipped",
        },
      };
    }

    const prData = {
      number: prNumber,
      title: prTitle,
      author: payload.pull_request.user.login,
      state: "open",
      sha: payload.pull_request.head.sha,
    };

    // Sync PR to database and get the PR record
    const syncedPR = await this.dashboardRepository.syncPullRequestAndReturn(
      repo.id,
      prData,
    );

    // Queue AI summary generation job
    if (syncedPR) {
      await this.bullQueueService.addGenerateSummaryJob({
        prId: syncedPR.id,
        owner,
        repoName: name,
        prNumber,
        prTitle,
        author: prData.author,
        installationId: repo.installId,
      });

      this.logger.log(
        `Queued summary generation job for PR #${prNumber}`,
      );
    }

    return {
      success: true,
      message: "Opened PR synced and summary generation queued",
      data: {
        pr_number: prNumber,
        pr_title: prTitle,
        repository: `${owner}/${name}`,
        action: "opened_synced",
        summaryQueued: !!syncedPR,
      },
    };
  }


  private async handlePullRequestMerged(
    context: PullRequestContext,
  ): Promise<WebhookResponseDto> {
    const { owner, name, prNumber, prTitle, payload } = context;

    this.logger.log(`Processing merged PR: ${prTitle} (#${prNumber})`);

    // Update PR state to "merged" in the database
    const mergedAt = payload.pull_request.merged_at
      ? new Date(payload.pull_request.merged_at)
      : new Date();

    await this.dashboardRepository.updatePullRequestState(
      owner,
      name,
      prNumber,
      "merged",
      mergedAt,
    );

    this.logger.log(
      `Updated PR #${prNumber} state to "merged" in database`,
    );

    const extractedData = this.githubService.extractPullRequestData(payload);
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
  }


  private async handlePullRequestClosed(
    context: PullRequestContext,
  ): Promise<WebhookResponseDto> {
    const { owner, name, prNumber, prTitle } = context;

    this.logger.log(
      `Deleting closed (non-merged) PR: ${prTitle} (#${prNumber}) from ${owner}/${name}`,
    );

    await this.dashboardRepository.deletePullRequest(owner, name, prNumber);

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

  /**
   * Extracts common PR context from the webhook payload
   */
  private extractPullRequestContext(payload: any): PullRequestContext {
    return {
      owner: payload.repository.owner.login,
      name: payload.repository.name,
      prNumber: payload.pull_request.number,
      prTitle: payload.pull_request.title,
      payload,
    };
  }

  /**
   * Creates a standard response for ignored/unhandled events
   */
  createIgnoredResponse(event: string, action: string): WebhookResponseDto {
    this.logger.log(`Ignoring webhook event: ${event} with action: ${action}`);
    return {
      success: true,
      message: "Event ignored",
      data: { event, action },
    };
  }
}
