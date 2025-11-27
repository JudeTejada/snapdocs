# SnapDocs Queue Flow Implementation Guide

> Complete implementation guide for the PR merge → Queue → AI Processing → GitHub Comment flow using GLM 4.5 Flash

---

## Table of Contents

1. [Flow Overview](#flow-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [GLM AI Service Implementation](#glm-ai-service-implementation)
5. [Job Processor Implementation](#job-processor-implementation)
6. [Diff Analyzer Service](#diff-analyzer-service)
7. [GitHub Comment Service](#github-comment-service)
8. [Error Handling & Retry Logic](#error-handling--retry-logic)
9. [Testing the Flow](#testing-the-flow)

---

## Flow Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE PR → DOCS FLOW                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. GitHub Webhook (PR Merged)                                               │
│         │                                                                    │
│         ▼                                                                    │
│  2. WebhooksController                                                       │
│         │ • Verify signature                                                 │
│         │ • Check action === "closed" && merged === true                     │
│         │ • Extract PR data                                                  │
│         ▼                                                                    │
│  3. BullMQ Queue (generateDocs)                                              │
│         │ • Job queued with PR data                                          │
│         │ • Retry policy: 3 attempts, exponential backoff                    │
│         ▼                                                                    │
│  4. DocsGeneratorProcessor                                                   │
│         │                                                                    │
│         ├──► 4a. Get Installation Token (GitHub API)                         │
│         │                                                                    │
│         ├──► 4b. Fetch PR Files/Diff (GitHub API)                            │
│         │                                                                    │
│         ├──► 4c. Analyze Diff (DiffAnalyzerService)                          │
│         │         • Categorize changes                                       │
│         │         • Extract statistics                                       │
│         │                                                                    │
│         ├──► 4d. Generate Documentation (GlmAiService)                       │
│         │         • Send diff to GLM 4.5 Flash                               │
│         │         • Parse JSON response                                      │
│         │         • Fallback on failure                                      │
│         │                                                                    │
│         ├──► 4e. Save to Database (PrismaService)                            │
│         │         • Create/Update PullRequest                                │
│         │         • Create/Update Documentation                              │
│         │                                                                    │
│         └──► 4f. Post GitHub Comment (GitHubCommentService)                  │
│                   • Format markdown                                          │
│                   • Post to merged PR                                        │
│                                                                              │
│  5. DONE - Documentation generated and posted!                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture Diagram

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│    GitHub       │      │   NestJS API    │      │     Redis       │
│   (Webhook)     │─────►│  (Backend)      │─────►│   (BullMQ)      │
└─────────────────┘      └─────────────────┘      └────────┬────────┘
                                                          │
                                                          ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   PostgreSQL    │◄─────│   Processor     │◄─────│   Worker        │
│   (Database)    │      │  (Job Handler)  │      │   (Consumer)    │
└─────────────────┘      └────────┬────────┘      └─────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
            ┌───────────┐  ┌───────────┐  ┌───────────┐
            │  GitHub   │  │   GLM     │  │  GitHub   │
            │   API     │  │   AI      │  │  Comment  │
            │  (Diff)   │  │  (4.5)    │  │   API     │
            └───────────┘  └───────────┘  └───────────┘
```

---

## Step-by-Step Implementation

### Step 1: Update Configuration

**File: `src/config/configuration.ts`**

```typescript
export default () => ({
  // ... existing config

  // Redis (BullMQ)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // GLM AI
  glm: {
    apiKey: process.env.GLM_API_KEY,
    baseUrl: process.env.GLM_BASE_URL || 'https://api.z.ai/api',
    model: process.env.GLM_MODEL || 'glm-4.5-flash',
  },
});
```

**File: `.env`**

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# GLM AI
GLM_API_KEY=your_glm_api_key_here
GLM_BASE_URL=https://api.z.ai/api
GLM_MODEL=glm-4.5-flash
```

---

### Step 2: Create Job Types

**File: `src/bullmq/jobs/generate-docs.job.ts`**

```typescript
export interface GenerateDocsJobData {
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
    body: string | null;
    html_url: string;
    merged: boolean;
    merged_at: string;
    author: string;
    author_id: number;
    sha: string;
    ref: string;
    base_ref: string;
  };
  timestamp: string;
}

export interface GeneratedDocumentation {
  summary: string;
  whatChanged: string;
  fileBreakdown: FileBreakdown[];
  codeSnippets: CodeSnippet[];
  developerNotes: string | null;
  changelog: string;
  breakingChanges: string[];
  raw: Record<string, any>;
}

export interface FileBreakdown {
  filename: string;
  changeType: 'added' | 'modified' | 'deleted' | 'renamed';
  summary: string;
  linesAdded: number;
  linesRemoved: number;
}

export interface CodeSnippet {
  filename: string;
  language: string;
  before: string | null;
  after: string | null;
  description: string;
}
```

---

## GLM AI Service Implementation

**File: `src/ai/glm-ai.service.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GeneratedDocumentation,
  FileBreakdown,
} from '../bullmq/jobs/generate-docs.job';

interface GlmChoice {
  message: {
    role: string;
    content: string;
    reasoning_content?: string;
  };
  finish_reason: string;
}

interface GlmResponse {
  id: string;
  model: string;
  choices: GlmChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface AnalyzedDiff {
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string;
  }>;
  summary: {
    totalFiles: number;
    additions: number;
    deletions: number;
  };
  categories: {
    models: string[];
    functions: string[];
    routes: string[];
    tests: string[];
    config: string[];
    other: string[];
  };
}

interface PRInfo {
  title: string;
  body: string | null;
  author: string;
}

@Injectable()
export class GlmAiService {
  private readonly logger = new Logger(GlmAiService.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly modelName: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('glm.apiKey');
    this.baseUrl = this.configService.get<string>('glm.baseUrl') || 'https://api.z.ai/api';
    this.modelName = this.configService.get<string>('glm.model') || 'glm-4.5-flash';

    if (!this.apiKey) {
      this.logger.warn(
        'GLM_API_KEY not configured. Using fallback documentation generation.',
      );
    } else {
      this.logger.log(`GLM AI service initialized with model: ${this.modelName}`);
    }
  }

  async generateDocumentation(
    analyzedDiff: AnalyzedDiff,
    prInfo: PRInfo,
  ): Promise<GeneratedDocumentation> {
    if (!this.apiKey) {
      this.logger.warn('No GLM_API_KEY configured, using fallback');
      return this.fallbackDocumentation(analyzedDiff, prInfo);
    }

    try {
      const userPrompt = this.buildPrompt(analyzedDiff, prInfo);

      this.logger.debug(`Generating documentation for PR: ${prInfo.title}`);

      const response = await fetch(`${this.baseUrl}/paas/v4/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(),
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 4000,
          stream: false,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GLM API error (${response.status}): ${errorText}`);
      }

      const data: GlmResponse = await response.json();

      const rawResponse =
        data.choices?.[0]?.message?.content?.trim() ||
        data.choices?.[0]?.message?.reasoning_content?.trim() ||
        '';

      this.logger.debug(`GLM raw response length: ${rawResponse.length}`);

      const cleanText = rawResponse
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();

      let parsed: any;
      try {
        parsed = JSON.parse(cleanText);
      } catch (parseError) {
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (extractError) {
            this.logger.error('Failed to extract JSON from GLM response');
            throw new Error('Invalid JSON response from GLM');
          }
        } else {
          throw new Error('Invalid JSON response from GLM');
        }
      }

      const docs = this.validateAndFormatDocs(parsed, analyzedDiff);

      this.logger.log('GLM documentation generation completed successfully');

      if (data.usage) {
        this.logger.debug(
          `Token usage - Prompt: ${data.usage.prompt_tokens}, Completion: ${data.usage.completion_tokens}, Total: ${data.usage.total_tokens}`,
        );
      }

      return docs;
    } catch (error: any) {
      this.logger.error(`GLM API error: ${error.message}`, error.stack);

      if (error.message?.includes('401') || error.message?.includes('API_KEY_INVALID')) {
        this.logger.error('Invalid GLM API key');
      } else if (error.message?.includes('429') || error.message?.includes('RATE_LIMIT')) {
        this.logger.warn('GLM API rate limit exceeded');
      }

      return this.fallbackDocumentation(analyzedDiff, prInfo);
    }
  }

  private getSystemPrompt(): string {
    return `You are a senior documentation writer specializing in code change documentation.
Your task is to analyze code diffs and generate comprehensive, developer-friendly documentation.

You must respond with a valid JSON object containing:
- summary: A 2-4 sentence high-level summary of what changed
- whatChanged: Detailed explanation of what was changed and why
- fileBreakdown: Array of objects with {filename, changeType, summary, linesAdded, linesRemoved}
- codeSnippets: Array of important code changes with {filename, language, before, after, description}
- developerNotes: Any important notes for developers (nullable)
- changelog: A changelog-style entry for this PR
- breakingChanges: Array of breaking change warnings (empty if none)

Be concise but thorough. Focus on the "why" not just the "what".
NO markdown outside JSON. JSON only.`;
  }

  private buildPrompt(analyzedDiff: AnalyzedDiff, prInfo: PRInfo): string {
    const filesList = analyzedDiff.files
      .map(
        (f) =>
          `- ${f.filename} (${f.status}): +${f.additions}/-${f.deletions}`,
      )
      .join('\n');

    const patchSummary = analyzedDiff.files
      .filter((f) => f.patch)
      .slice(0, 10) // Limit to first 10 files to avoid token limits
      .map((f) => {
        const truncatedPatch = f.patch!.length > 2000
          ? f.patch!.substring(0, 2000) + '\n... (truncated)'
          : f.patch;
        return `### ${f.filename}\n\`\`\`diff\n${truncatedPatch}\n\`\`\``;
      })
      .join('\n\n');

    return `Analyze this Pull Request and generate documentation.

## PR Information
- Title: ${prInfo.title}
- Author: ${prInfo.author}
- Description: ${prInfo.body || 'No description provided'}

## Summary Statistics
- Total Files Changed: ${analyzedDiff.summary.totalFiles}
- Lines Added: ${analyzedDiff.summary.additions}
- Lines Removed: ${analyzedDiff.summary.deletions}

## Files Changed
${filesList}

## Code Changes (Diffs)
${patchSummary || 'No patch content available'}

## Categories Detected
- Models/Schema: ${analyzedDiff.categories.models.join(', ') || 'None'}
- Functions: ${analyzedDiff.categories.functions.join(', ') || 'None'}
- Routes/Endpoints: ${analyzedDiff.categories.routes.join(', ') || 'None'}
- Tests: ${analyzedDiff.categories.tests.join(', ') || 'None'}
- Config: ${analyzedDiff.categories.config.join(', ') || 'None'}

Generate comprehensive documentation in the required JSON format.`;
  }

  private validateAndFormatDocs(
    parsed: any,
    analyzedDiff: AnalyzedDiff,
  ): GeneratedDocumentation {
    return {
      summary:
        typeof parsed.summary === 'string'
          ? parsed.summary
          : 'Documentation generated for PR changes.',
      whatChanged:
        typeof parsed.whatChanged === 'string'
          ? parsed.whatChanged
          : 'Various code changes were made.',
      fileBreakdown: Array.isArray(parsed.fileBreakdown)
        ? parsed.fileBreakdown.map((fb: any) => ({
            filename: fb.filename || 'unknown',
            changeType: ['added', 'modified', 'deleted', 'renamed'].includes(
              fb.changeType,
            )
              ? fb.changeType
              : 'modified',
            summary: fb.summary || 'File changed',
            linesAdded: typeof fb.linesAdded === 'number' ? fb.linesAdded : 0,
            linesRemoved:
              typeof fb.linesRemoved === 'number' ? fb.linesRemoved : 0,
          }))
        : analyzedDiff.files.map((f) => ({
            filename: f.filename,
            changeType: f.status as any,
            summary: `File ${f.status}`,
            linesAdded: f.additions,
            linesRemoved: f.deletions,
          })),
      codeSnippets: Array.isArray(parsed.codeSnippets)
        ? parsed.codeSnippets.slice(0, 5)
        : [],
      developerNotes: parsed.developerNotes || null,
      changelog:
        typeof parsed.changelog === 'string'
          ? parsed.changelog
          : `- Updated ${analyzedDiff.summary.totalFiles} files`,
      breakingChanges: Array.isArray(parsed.breakingChanges)
        ? parsed.breakingChanges.filter((bc: any) => typeof bc === 'string')
        : [],
      raw: parsed,
    };
  }

  private fallbackDocumentation(
    analyzedDiff: AnalyzedDiff,
    prInfo: PRInfo,
  ): GeneratedDocumentation {
    this.logger.warn('Using fallback documentation generation');

    const fileBreakdown: FileBreakdown[] = analyzedDiff.files.map((f) => ({
      filename: f.filename,
      changeType: (f.status === 'added'
        ? 'added'
        : f.status === 'removed'
          ? 'deleted'
          : 'modified') as any,
      summary: `File ${f.status} with ${f.additions} additions and ${f.deletions} deletions`,
      linesAdded: f.additions,
      linesRemoved: f.deletions,
    }));

    return {
      summary: `This PR "${prInfo.title}" by ${prInfo.author} modified ${analyzedDiff.summary.totalFiles} files with ${analyzedDiff.summary.additions} additions and ${analyzedDiff.summary.deletions} deletions.`,
      whatChanged: prInfo.body || 'No description provided for this PR.',
      fileBreakdown,
      codeSnippets: [],
      developerNotes: null,
      changelog: `- ${prInfo.title}\n  - Modified ${analyzedDiff.summary.totalFiles} files\n  - +${analyzedDiff.summary.additions}/-${analyzedDiff.summary.deletions} lines`,
      breakingChanges: [],
      raw: { fallback: true },
    };
  }
}
```

**File: `src/ai/ai.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { GlmAiService } from './glm-ai.service';

@Module({
  providers: [GlmAiService],
  exports: [GlmAiService],
})
export class AiModule {}
```

---

## Job Processor Implementation

**File: `src/bullmq/processors/docs-generator.processor.ts`**

```typescript
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { GitHubService } from '../../github/github.service';
import { GlmAiService } from '../../ai/glm-ai.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DiffAnalyzerService } from '../services/diff-analyzer.service';
import { GitHubCommentService } from '../../notifications/github-comment.service';
import { GenerateDocsJobData } from '../jobs/generate-docs.job';

@Processor('generateDocs', {
  concurrency: 2, // Process 2 jobs at a time
})
export class DocsGeneratorProcessor extends WorkerHost {
  private readonly logger = new Logger(DocsGeneratorProcessor.name);

  constructor(
    private readonly githubService: GitHubService,
    private readonly aiService: GlmAiService,
    private readonly prisma: PrismaService,
    private readonly diffAnalyzer: DiffAnalyzerService,
    private readonly commentService: GitHubCommentService,
  ) {
    super();
  }

  async process(job: Job<GenerateDocsJobData>): Promise<any> {
    const { repository, installation, pullRequest } = job.data;
    const jobId = job.id;

    this.logger.log(
      `[Job ${jobId}] Processing PR #${pullRequest.number} from ${repository.full_name}`,
    );

    try {
      // Step 1: Get installation access token (10%)
      await job.updateProgress(10);
      this.logger.debug(`[Job ${jobId}] Getting installation token...`);

      const installationToken = await this.githubService.getInstallationToken(
        installation.id.toString(),
      );

      // Step 2: Fetch PR files/diff (30%)
      await job.updateProgress(30);
      this.logger.debug(`[Job ${jobId}] Fetching PR files...`);

      const files = await this.githubService.getPullRequestFiles(
        repository.owner,
        repository.name,
        pullRequest.number,
        installationToken,
      );

      this.logger.debug(`[Job ${jobId}] Found ${files.length} changed files`);

      // Step 3: Analyze the diff (40%)
      await job.updateProgress(40);
      this.logger.debug(`[Job ${jobId}] Analyzing diff...`);

      const analyzedDiff = this.diffAnalyzer.analyzeDiff(files);

      // Step 4: Generate documentation via GLM AI (60%)
      await job.updateProgress(60);
      this.logger.debug(`[Job ${jobId}] Generating documentation with GLM AI...`);

      const documentation = await this.aiService.generateDocumentation(
        analyzedDiff,
        {
          title: pullRequest.title,
          body: pullRequest.body,
          author: pullRequest.author,
        },
      );

      // Step 5: Save to database (80%)
      await job.updateProgress(80);
      this.logger.debug(`[Job ${jobId}] Saving to database...`);

      await this.saveToDatabase(repository, pullRequest, documentation);

      // Step 6: Post comment to GitHub PR (90%)
      await job.updateProgress(90);
      this.logger.debug(`[Job ${jobId}] Posting comment to GitHub...`);

      await this.commentService.postDocumentation(
        repository.owner,
        repository.name,
        pullRequest.number,
        documentation,
        installationToken,
      );

      // Done! (100%)
      await job.updateProgress(100);
      this.logger.log(
        `[Job ${jobId}] Successfully processed PR #${pullRequest.number}`,
      );

      return {
        success: true,
        prNumber: pullRequest.number,
        repository: repository.full_name,
        summary: documentation.summary,
      };
    } catch (error: any) {
      this.logger.error(
        `[Job ${jobId}] Failed to process PR #${pullRequest.number}: ${error.message}`,
        error.stack,
      );
      throw error; // Let BullMQ handle retry
    }
  }

  private async saveToDatabase(
    repository: GenerateDocsJobData['repository'],
    pullRequest: GenerateDocsJobData['pullRequest'],
    documentation: any,
  ): Promise<void> {
    // Find or create the repo
    let repo = await this.prisma.repo.findFirst({
      where: {
        owner: repository.owner,
        name: repository.name,
      },
    });

    if (!repo) {
      this.logger.warn(
        `Repository ${repository.full_name} not found in database. Skipping DB save.`,
      );
      return;
    }

    // Upsert the pull request
    const pr = await this.prisma.pullRequest.upsert({
      where: {
        repoId_number: {
          repoId: repo.id,
          number: pullRequest.number,
        },
      },
      create: {
        repoId: repo.id,
        number: pullRequest.number,
        title: pullRequest.title,
        author: pullRequest.author,
        mergedAt: new Date(pullRequest.merged_at),
        sha: pullRequest.sha,
        state: 'closed',
      },
      update: {
        title: pullRequest.title,
        sha: pullRequest.sha,
        mergedAt: new Date(pullRequest.merged_at),
      },
    });

    // Upsert the documentation
    await this.prisma.documentation.upsert({
      where: { prId: pr.id },
      create: {
        prId: pr.id,
        summary: documentation.summary,
        snippets: JSON.stringify(documentation.codeSnippets),
        changelog: documentation.changelog,
        json: documentation.raw,
      },
      update: {
        summary: documentation.summary,
        snippets: JSON.stringify(documentation.codeSnippets),
        changelog: documentation.changelog,
        json: documentation.raw,
        updatedAt: new Date(),
      },
    });

    this.logger.debug(`Saved documentation for PR #${pullRequest.number}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed for PR #${job.data.pullRequest?.number}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} failed for PR #${job.data.pullRequest?.number}: ${error.message}`,
    );
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job, progress: number) {
    this.logger.debug(`Job ${job.id} progress: ${progress}%`);
  }
}
```

---

## Diff Analyzer Service

**File: `src/bullmq/services/diff-analyzer.service.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';

interface GitHubFile {
  sha: string;
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  previous_filename?: string;
}

interface AnalyzedDiff {
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string;
  }>;
  summary: {
    totalFiles: number;
    additions: number;
    deletions: number;
  };
  categories: {
    models: string[];
    functions: string[];
    routes: string[];
    tests: string[];
    config: string[];
    other: string[];
  };
}

@Injectable()
export class DiffAnalyzerService {
  private readonly logger = new Logger(DiffAnalyzerService.name);

  analyzeDiff(files: GitHubFile[]): AnalyzedDiff {
    this.logger.debug(`Analyzing ${files.length} files`);

    const categories = this.categorizeFiles(files);
    const summary = this.calculateSummary(files);

    return {
      files: files.map((f) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch,
      })),
      summary,
      categories,
    };
  }

  private categorizeFiles(files: GitHubFile[]): AnalyzedDiff['categories'] {
    const categories: AnalyzedDiff['categories'] = {
      models: [],
      functions: [],
      routes: [],
      tests: [],
      config: [],
      other: [],
    };

    for (const file of files) {
      const filename = file.filename.toLowerCase();

      // Models/Schema detection
      if (
        filename.includes('schema.prisma') ||
        filename.includes('/models/') ||
        filename.includes('/entities/') ||
        filename.includes('.entity.ts') ||
        filename.includes('.model.ts')
      ) {
        categories.models.push(file.filename);
        continue;
      }

      // Routes/Controllers detection
      if (
        filename.includes('.controller.ts') ||
        filename.includes('/routes/') ||
        filename.includes('/api/') ||
        filename.includes('.routes.ts')
      ) {
        categories.routes.push(file.filename);
        continue;
      }

      // Tests detection
      if (
        filename.includes('.spec.ts') ||
        filename.includes('.test.ts') ||
        filename.includes('__tests__') ||
        filename.includes('/test/')
      ) {
        categories.tests.push(file.filename);
        continue;
      }

      // Config detection
      if (
        filename.includes('.config.') ||
        filename.includes('/config/') ||
        filename.includes('.env') ||
        filename.includes('tsconfig') ||
        filename.includes('package.json') ||
        filename.includes('.yml') ||
        filename.includes('.yaml')
      ) {
        categories.config.push(file.filename);
        continue;
      }

      // Services/Functions detection
      if (
        filename.includes('.service.ts') ||
        filename.includes('/services/') ||
        filename.includes('/utils/') ||
        filename.includes('/helpers/')
      ) {
        categories.functions.push(file.filename);
        continue;
      }

      // Everything else
      categories.other.push(file.filename);
    }

    return categories;
  }

  private calculateSummary(files: GitHubFile[]): AnalyzedDiff['summary'] {
    return files.reduce(
      (acc, file) => ({
        totalFiles: acc.totalFiles + 1,
        additions: acc.additions + file.additions,
        deletions: acc.deletions + file.deletions,
      }),
      { totalFiles: 0, additions: 0, deletions: 0 },
    );
  }
}
```

---

## GitHub Comment Service

**File: `src/notifications/github-comment.service.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { GitHubService } from '../github/github.service';
import { GeneratedDocumentation } from '../bullmq/jobs/generate-docs.job';

@Injectable()
export class GitHubCommentService {
  private readonly logger = new Logger(GitHubCommentService.name);

  constructor(private readonly githubService: GitHubService) {}

  async postDocumentation(
    owner: string,
    repo: string,
    prNumber: number,
    docs: GeneratedDocumentation,
    installationToken: string,
  ): Promise<void> {
    const comment = this.formatComment(docs);

    try {
      await this.githubService.postComment(
        owner,
        repo,
        prNumber,
        comment,
        installationToken,
      );

      this.logger.log(
        `Posted documentation comment to ${owner}/${repo}#${prNumber}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to post comment to ${owner}/${repo}#${prNumber}: ${error.message}`,
      );
      throw error;
    }
  }

  private formatComment(docs: GeneratedDocumentation): string {
    const parts: string[] = [];

    // Header
    parts.push('## 📚 Auto-Generated Documentation\n');

    // Summary
    parts.push('### Summary');
    parts.push(docs.summary);
    parts.push('');

    // What Changed
    if (docs.whatChanged) {
      parts.push('### What Changed');
      parts.push(docs.whatChanged);
      parts.push('');
    }

    // File Breakdown
    if (docs.fileBreakdown.length > 0) {
      parts.push('### Files Changed');
      parts.push('| File | Change | Lines |');
      parts.push('|------|--------|-------|');

      for (const file of docs.fileBreakdown.slice(0, 15)) {
        const emoji = this.getChangeEmoji(file.changeType);
        parts.push(
          `| \`${file.filename}\` | ${emoji} ${file.changeType} | +${file.linesAdded}/-${file.linesRemoved} |`,
        );
      }

      if (docs.fileBreakdown.length > 15) {
        parts.push(
          `| ... | +${docs.fileBreakdown.length - 15} more files | |`,
        );
      }
      parts.push('');
    }

    // Breaking Changes
    if (docs.breakingChanges.length > 0) {
      parts.push('### ⚠️ Breaking Changes');
      for (const bc of docs.breakingChanges) {
        parts.push(`- ${bc}`);
      }
      parts.push('');
    }

    // Developer Notes
    if (docs.developerNotes) {
      parts.push('### 📝 Developer Notes');
      parts.push(docs.developerNotes);
      parts.push('');
    }

    // Changelog
    parts.push('<details>');
    parts.push('<summary>📋 Changelog</summary>');
    parts.push('');
    parts.push('```');
    parts.push(docs.changelog);
    parts.push('```');
    parts.push('</details>');
    parts.push('');

    // Footer
    parts.push('---');
    parts.push(
      '*🤖 Generated by [SnapDocs](https://github.com/your-org/snapdocs) using GLM 4.5 Flash*',
    );

    return parts.join('\n');
  }

  private getChangeEmoji(changeType: string): string {
    switch (changeType) {
      case 'added':
        return '🟢';
      case 'deleted':
        return '🔴';
      case 'modified':
        return '🟡';
      case 'renamed':
        return '🔵';
      default:
        return '⚪';
    }
  }
}
```

**File: `src/notifications/notifications.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { GitHubCommentService } from './github-comment.service';
import { GitHubModule } from '../github/github.module';

@Module({
  imports: [GitHubModule],
  providers: [GitHubCommentService],
  exports: [GitHubCommentService],
})
export class NotificationsModule {}
```

---

## Error Handling & Retry Logic

### BullMQ Retry Configuration

The queue is configured with automatic retries:

```typescript
// In BullQueueService.addGenerateDocsJob()
{
  attempts: 3,              // Retry 3 times
  backoff: {
    type: 'exponential',    // Exponential backoff
    delay: 2000,            // Start with 2s delay
  },                        // Retry at: 2s, 4s, 8s
  removeOnComplete: 100,    // Keep last 100 completed jobs
  removeOnFail: 50,         // Keep last 50 failed jobs
}
```

### Custom Error Types

**File: `src/common/exceptions/queue.exceptions.ts`**

```typescript
export class GitHubTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitHubTokenError';
  }
}

export class AiGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiGenerationError';
  }
}

export class DatabaseSaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseSaveError';
  }
}
```

### Dead Letter Queue (Optional)

For jobs that fail all retries:

```typescript
// In bullmq.module.ts
BullModule.registerQueue({
  name: 'generateDocs',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
}),
BullModule.registerQueue({
  name: 'generateDocs-dlq', // Dead letter queue
}),
```

---

## Testing the Flow

### Manual Test via curl

```bash
# Simulate a GitHub webhook (for testing)
curl -X POST http://localhost:3001/api/v1/webhooks/github \
  -H "Content-Type: application/json" \
  -H "x-github-event: pull_request" \
  -H "x-github-delivery: test-123" \
  -H "x-hub-signature-256: sha256=YOUR_SIGNATURE" \
  -d '{
    "action": "closed",
    "pull_request": {
      "id": 123,
      "number": 42,
      "title": "Test PR",
      "body": "This is a test PR",
      "merged": true,
      "merged_at": "2024-01-15T10:30:00Z",
      "user": { "login": "testuser", "id": 1 },
      "head": { "sha": "abc123", "ref": "feature-branch" },
      "base": { "ref": "main" },
      "html_url": "https://github.com/owner/repo/pull/42"
    },
    "repository": {
      "id": 456,
      "name": "test-repo",
      "full_name": "owner/test-repo",
      "owner": { "login": "owner" }
    },
    "installation": { "id": 789 }
  }'
```

### Unit Test Example

```typescript
// src/bullmq/processors/docs-generator.processor.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { DocsGeneratorProcessor } from './docs-generator.processor';
import { GitHubService } from '../../github/github.service';
import { GlmAiService } from '../../ai/glm-ai.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DiffAnalyzerService } from '../services/diff-analyzer.service';
import { GitHubCommentService } from '../../notifications/github-comment.service';

describe('DocsGeneratorProcessor', () => {
  let processor: DocsGeneratorProcessor;
  let githubService: jest.Mocked<GitHubService>;
  let aiService: jest.Mocked<GlmAiService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocsGeneratorProcessor,
        {
          provide: GitHubService,
          useValue: {
            getInstallationToken: jest.fn().mockResolvedValue('test-token'),
            getPullRequestFiles: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: GlmAiService,
          useValue: {
            generateDocumentation: jest.fn().mockResolvedValue({
              summary: 'Test summary',
              whatChanged: 'Test changes',
              fileBreakdown: [],
              codeSnippets: [],
              developerNotes: null,
              changelog: '- Test',
              breakingChanges: [],
              raw: {},
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            repo: { findFirst: jest.fn() },
            pullRequest: { upsert: jest.fn() },
            documentation: { upsert: jest.fn() },
          },
        },
        {
          provide: DiffAnalyzerService,
          useValue: {
            analyzeDiff: jest.fn().mockReturnValue({
              files: [],
              summary: { totalFiles: 0, additions: 0, deletions: 0 },
              categories: {
                models: [],
                functions: [],
                routes: [],
                tests: [],
                config: [],
                other: [],
              },
            }),
          },
        },
        {
          provide: GitHubCommentService,
          useValue: {
            postDocumentation: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<DocsGeneratorProcessor>(DocsGeneratorProcessor);
    githubService = module.get(GitHubService);
    aiService = module.get(GlmAiService);
  });

  it('should process job successfully', async () => {
    const mockJob = {
      id: 'test-job-1',
      data: {
        repository: { id: 1, name: 'test', owner: 'owner', full_name: 'owner/test' },
        installation: { id: 123 },
        pullRequest: {
          id: 1,
          number: 42,
          title: 'Test PR',
          body: 'Test body',
          merged: true,
          merged_at: '2024-01-15T10:30:00Z',
          author: 'testuser',
          author_id: 1,
          sha: 'abc123',
          ref: 'feature',
          base_ref: 'main',
          html_url: 'https://github.com/owner/test/pull/42',
        },
        timestamp: new Date().toISOString(),
      },
      updateProgress: jest.fn(),
    } as any;

    const result = await processor.process(mockJob);

    expect(result.success).toBe(true);
    expect(githubService.getInstallationToken).toHaveBeenCalled();
    expect(aiService.generateDocumentation).toHaveBeenCalled();
  });
});
```

---

## Module Wiring

### Update AppModule

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validateEnv } from './config/validation';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GitHubModule } from './github/github.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { BullmqModule } from './bullmq/bullmq.module';
import { AiModule } from './ai/ai.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
      validate: validateEnv,
    }),
    PrismaModule,
    BullmqModule,
    AuthModule,
    GitHubModule,
    WebhooksModule,
    AiModule,
    NotificationsModule,
    DashboardModule,
    HealthModule,
  ],
})
export class AppModule {}
```

### Update BullmqModule

```typescript
// src/bullmq/bullmq.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullQueueService } from './bullmq.service';
import { DocsGeneratorProcessor } from './processors/docs-generator.processor';
import { DiffAnalyzerService } from './services/diff-analyzer.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GitHubModule } from '../github/github.module';
import { AiModule } from '../ai/ai.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'generateDocs',
    }),
    PrismaModule,
    GitHubModule,
    AiModule,
    NotificationsModule,
  ],
  providers: [
    BullQueueService,
    DocsGeneratorProcessor,
    DiffAnalyzerService,
  ],
  exports: [BullQueueService],
})
export class BullmqModule {}
```

---

## Summary

This implementation provides:

1. **Webhook Handler** → Validates GitHub signatures, extracts PR data, queues job
2. **BullMQ Queue** → Manages job processing with retries and backoff
3. **Job Processor** → Orchestrates the full pipeline (fetch → analyze → AI → save → comment)
4. **GLM AI Service** → Generates documentation using GLM 4.5 Flash with fallback
5. **Diff Analyzer** → Categorizes code changes for better AI prompts
6. **GitHub Comment Service** → Posts formatted markdown to merged PRs

The flow is resilient with:
- 3 retry attempts with exponential backoff
- Fallback documentation when AI fails
- Progress tracking for monitoring
- Comprehensive logging
