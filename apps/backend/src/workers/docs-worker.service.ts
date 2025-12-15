import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { GitHubService } from "../github/github.service";
import { GeminiService, PRSummaryResult } from "../ai/gemini.service";
import { DocumentationService } from "../documentation/documentation.service";

interface GenerateDocsJobData {
  repository: {
    id: number;
    name: string;
    owner: string;
    full_name: string;
  };
  installation: {
    id: number;
  };
  pullRequest: {
    id: number;
    number: number;
    title: string;
    body?: string;
    merged: boolean;
    merged_at?: string;
    author: string;
    sha: string;
  };
  timestamp: string;
}

interface GenerateSummaryJobData {
  prId: string;
  owner: string;
  repoName: string;
  prNumber: number;
  prTitle: string;
  author: string;
  installationId: string;
  timestamp: string;
}

export interface FileStats {
  totalFiles: number;
  additions: number;
  deletions: number;
  addedCount: number;
  modifiedCount: number;
  deletedCount: number;
  renamedCount: number;
  touchedAreas: string[];
}

@Injectable()
export class DocsWorkerService {
  private readonly logger = new Logger(DocsWorkerService.name);

  constructor(
    private readonly githubService: GitHubService,
    private readonly geminiService: GeminiService,
    private readonly documentationService: DocumentationService,
  ) {}

  async process(job: Job<GenerateDocsJobData>) {
    const { repository, installation, pullRequest } = job.data;
    const jobId = job.id;
    const startTime = Date.now();

    this.logger.log(
      `🔄 Processing documentation generation for PR #${pullRequest.number} in ${repository.full_name}, Job ID: ${jobId}`,
    );

    try {

      const prFiles = await this.githubService.getPullRequestFiles(
        repository.owner,
        repository.name,
        pullRequest.number,
        String(installation.id),
      );

      // Convert files to diff format
      const diff = this.formatFilesAsDiff(prFiles);

      // Step 3: Generate documentation using Gemini
      const documentation = await this.geminiService.generateDocumentation(
        diff,
        {
          repo: repository.full_name,
          prNumber: pullRequest.number,
          author: pullRequest.author,
          title: pullRequest.title,
        },
      );

      // Step 4: Save to database
      const docRecord = await this.documentationService.saveDocumentationForPullRequest({
        repository,
        pullRequest: {
          number: pullRequest.number,
          title: pullRequest.title,
          author: pullRequest.author,
          mergedAt: pullRequest.merged_at,
          state: pullRequest.merged ? "merged" : "closed",
          sha: pullRequest.sha,
        },
        documentation,
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ Successfully completed documentation generation for PR #${pullRequest.number} in ${duration}ms`,
      );

      return {
        success: true,
        prNumber: pullRequest.number,
        repository: repository.full_name,
        jobId,
        duration,
        documentationId: docRecord.id,
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `❌ Failed to generate documentation for PR #${pullRequest.number} after ${duration}ms`,
        error,
      );

      // Re-throw to trigger retry logic
      throw error;
    }
  }

  private formatFilesAsDiff(files: any[]): string {
    let diff = "";

    for (const file of files) {
      diff += `File: ${file.filename}\n`;
      diff += `Status: ${file.status}\n`;
      diff += `Changes: +${file.additions} -${file.deletions}\n\n`;

      if (file.patch) {
        diff += file.patch;
      }

      diff += "\n\n";
    }

    return diff.trim();
  }

  /**
   * Process summary generation for opened PRs.
   * Called from the generateDocs queue with job name 'generateSummary'.
   */
  async processSummary(job: Job<GenerateSummaryJobData>) {
    const { prId, owner, repoName, prNumber, prTitle, author, installationId } =
      job.data;
    const jobId = job.id;
    const startTime = Date.now();

    this.logger.log(
      `🔄 Processing summary generation for PR #${prNumber} in ${owner}/${repoName}, Job ID: ${jobId}`,
    );

    try {
      // Step 1: Get the PR diff from GitHub
      const prFiles = await this.githubService.getPullRequestFiles(
        owner,
        repoName,
        prNumber,
        installationId,
      );

      // Step 2: Convert files to diff format
      const diff = this.formatFilesAsDiff(prFiles);
      const fileStats = this.computeFileStats(prFiles);

      if (!diff || diff.trim().length === 0) {
        this.logger.warn(`No diff found for PR #${prNumber}, skipping summary generation`);
        return {
          success: true,
          prNumber,
          jobId,
          skipped: true,
          reason: "No diff available",
        };
      }

      // Step 3: Generate summary using Gemini
      const summaryResult = await this.geminiService.generatePRSummary(diff, {
        repo: `${owner}/${repoName}`,
        prNumber,
        title: prTitle,
        author,
        fileStats,
      });

      // Step 4: Save to Documentation table
      await this.documentationService.saveSummary(prId, {
        summary: summaryResult.summary,
        json: summaryResult as any,
      });

      // Step 5: Post or update the PR comment with the AI summary (non-blocking)
      try {
        const commentBody = this.buildSummaryComment(summaryResult, {
          prNumber,
          prTitle,
          repoOwner: owner,
          repoName,
          author,
          fileStats,
        });

        await this.githubService.upsertCommentWithMarker({
          owner,
          repo: repoName,
          issueNumber: prNumber,
          body: commentBody,
          installationId,
        });
      } catch (commentError) {
        this.logger.warn(
          `Posted summary comment failed for PR #${prNumber}: ${commentError}`,
        );
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ Successfully generated summary for PR #${prNumber} in ${duration}ms`,
      );

      return {
        success: true,
        prNumber,
        repository: `${owner}/${repoName}`,
        jobId,
        duration,
        riskLevel: summaryResult.riskLevel,
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `❌ Failed to generate summary for PR #${prNumber} after ${duration}ms`,
        error,
      );

      // Re-throw to trigger retry logic
      throw error;
    }
  }

  private computeFileStats(files: Array<{ filename: string; status: string; additions: number; deletions: number }>): FileStats {
    const stats: FileStats = {
      totalFiles: files.length,
      additions: 0,
      deletions: 0,
      addedCount: 0,
      modifiedCount: 0,
      deletedCount: 0,
      renamedCount: 0,
      touchedAreas: [],
    };

    const areas = new Set<string>();

    files.forEach((file) => {
      stats.additions += file.additions || 0;
      stats.deletions += file.deletions || 0;

      switch (file.status) {
        case "added":
          stats.addedCount += 1;
          break;
        case "removed":
          stats.deletedCount += 1;
          break;
        case "modified":
          stats.modifiedCount += 1;
          break;
        case "renamed":
          stats.renamedCount += 1;
          break;
        default:
          stats.modifiedCount += 1;
      }

      const [area] = file.filename.split("/");
      if (area) {
        areas.add(area);
      }
    });

    stats.touchedAreas = Array.from(areas).sort().slice(0, 6);

    return stats;
  }

  private buildSummaryComment(
    summary: PRSummaryResult,
    meta: {
      prNumber: number;
      prTitle: string;
      repoOwner: string;
      repoName: string;
      author: string;
      fileStats?: FileStats;
    },
  ): string {
    const scopeLine = meta.fileStats
      ? `**Scope:** ${meta.fileStats.totalFiles} files (+${meta.fileStats.additions}/-${meta.fileStats.deletions}); added ${meta.fileStats.addedCount}, modified ${meta.fileStats.modifiedCount}${meta.fileStats.renamedCount ? `, renamed ${meta.fileStats.renamedCount}` : ""}, deleted ${meta.fileStats.deletedCount}`
      : "";
    const areasLine =
      meta.fileStats && meta.fileStats.touchedAreas.length > 0
        ? `**Areas:** ${meta.fileStats.touchedAreas.join(", ")}`
        : "";

    const lines = [
      `# PR #${meta.prNumber}: ${meta.prTitle}`,
      "",
      `**Repository:** ${meta.repoOwner}/${meta.repoName}`,
      `**Author:** @${meta.author}`,
      `**Risk Level:** ${summary.riskLevel.toUpperCase()}`,
      summary.breakingChanges ? "**⚠️ Contains Breaking Changes**" : "",
      scopeLine,
      areasLine,
      "",
      "## Summary",
      "",
      summary.summary,
      "",
    ].filter(Boolean);

    lines.push(
      "---",
      `*Generated by SnapDocs on ${new Date(summary.generatedAt).toLocaleDateString()}*`,
    );

    return lines.filter(Boolean).join("\n");
  }
}
