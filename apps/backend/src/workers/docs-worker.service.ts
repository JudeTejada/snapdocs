import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { GitHubService } from "../github/github.service";
import { GeminiService } from "../ai/gemini.service";
import { PrismaService } from "../prisma/prisma.service";

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

@Injectable()
export class DocsWorkerService {
  private readonly logger = new Logger(DocsWorkerService.name);

  constructor(
    private readonly githubService: GitHubService,
    private readonly geminiService: GeminiService,
    private readonly prisma: PrismaService,
  ) {}

  async process(job: Job<GenerateDocsJobData>) {
    const { repository, installation, pullRequest } = job.data;
    const jobId = job.id;
    const startTime = Date.now();

    this.logger.log(
      `🔄 Processing documentation generation for PR #${pullRequest.number} in ${repository.full_name}, Job ID: ${jobId}`,
    );

    try {
      // Step 1: Get the PR details from GitHub
      const prDetails = await this.githubService.getPullRequest(
        repository.owner,
        repository.name,
        pullRequest.number,
        String(installation.id),
      );

      // Step 2: Get the PR diff
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
      const docRecord = await this.saveDocumentation({
        repository,
        pullRequest,
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

  private async saveDocumentation(data: {
    repository: any;
    pullRequest: any;
    documentation: string;
  }) {
    // Find or create the repository in our database
    let repo = await this.prisma.repo.findFirst({
      where: {
        owner: data.repository.owner,
        name: data.repository.name,
      },
    });

    if (!repo) {
      repo = await this.prisma.repo.create({
        data: {
          name: data.repository.name,
          owner: data.repository.owner,
          installId: String(data.repository.id),
          userId: "", // TODO: Associate with proper user
        },
      });
    }

    // Find or create the PR record
    let pr = await this.prisma.pullRequest.findFirst({
      where: {
        repoId: repo.id,
        number: data.pullRequest.number,
      },
    });

    if (!pr) {
      pr = await this.prisma.pullRequest.create({
        data: {
          repoId: repo.id,
          number: data.pullRequest.number,
          title: data.pullRequest.title,
          author: data.pullRequest.author,
          mergedAt: new Date(data.pullRequest.merged_at || new Date()),
          state: "closed",
          sha: data.pullRequest.sha,
        },
      });
    }

    // Create or update documentation
    const doc = await this.prisma.documentation.upsert({
      where: {
        prId: pr.id,
      },
      update: {
        summary: data.documentation,
        generatedAt: new Date(),
      },
      create: {
        prId: pr.id,
        summary: data.documentation,
        generatedAt: new Date(),
      },
    });

    return doc;
  }
}
