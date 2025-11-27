# SnapDocs Backend Implementation Tasks

> A comprehensive task list for implementing the documentation automation system based on `SYSTEM_ARCHITECTURE.md`

---

## Phase 1: Core Infrastructure Fixes (Priority: CRITICAL)

These must be done first before any feature work.

### Task 1.1: Fix Module Imports in AppModule

**File:** `src/app.module.ts`

**Current Issue:** `BullmqModule` and `WebhooksModule` exist but are NOT imported.

**Changes Required:**
```typescript
import { BullmqModule } from './bullmq/bullmq.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    // ... existing imports
    BullmqModule,
    WebhooksModule,
  ],
})
```

**Acceptance Criteria:**
- [ ] BullmqModule imported and functional
- [ ] WebhooksModule created and imported
- [ ] No circular dependency errors

---



### Task 1.3: Fix BullmqModule to Use ConfigService

**File:** `src/bullmq/bullmq.module.ts`

**Current Issue:** Uses `process.env.REDIS_HOST` directly.

**Changes Required:**
```typescript
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
    BullModule.registerQueue({ name: 'generateDocs' }),
  ],
})
```

**Acceptance Criteria:**
- [ ] Redis connection configured via ConfigService
- [ ] Queue registration works

---

### Task 1.4: Add Redis & OpenAI Config

**File:** `src/config/configuration.ts`

**Add:**
```typescript
redis: {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD,
},
openai: {
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
},
resend: {
  apiKey: process.env.RESEND_API_KEY,
},
```

**File:** `src/config/validation.ts`

**Add validation for new env vars.**

**Acceptance Criteria:**
- [ ] All new config keys accessible via ConfigService
- [ ] Env validation updated

---

## Phase 2: Background Job Processing (Priority: HIGH)

### Task 2.1: Create WebhooksModule

**Files to create:**
- `src/webhooks/webhooks.module.ts`

```typescript
@Module({
  imports: [BullmqModule, PrismaModule],
  controllers: [WebhooksController],
  providers: [GitHubService],
})
export class WebhooksModule {}
```

**Acceptance Criteria:**
- [ ] Module properly encapsulates webhook logic
- [ ] Dependencies correctly injected

---

### Task 2.2: Create DocsGeneratorProcessor

**File:** `src/bullmq/processors/docs-generator.processor.ts`

**Purpose:** Process the `generateDocs` queue jobs.

**Implementation:**
```typescript
@Processor('generateDocs')
export class DocsGeneratorProcessor {
  constructor(
    private readonly githubService: GitHubService,
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
    private readonly diffAnalyzer: DiffAnalyzerService,
  ) {}

  @Process('generateDocs')
  async handleGenerateDocs(job: Job<GenerateDocsJobData>) {
    // 1. Get installation token
    // 2. Fetch PR diff from GitHub
    // 3. Analyze diff (categorize changes)
    // 4. Generate AI documentation
    // 5. Save to database
    // 6. Post comment to GitHub PR
  }

  @OnQueueCompleted()
  onCompleted(job: Job) { /* log success */ }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) { /* log failure */ }
}
```

**Acceptance Criteria:**
- [ ] Processor registered with BullMQ
- [ ] Full pipeline implemented (fetch → analyze → AI → save → notify)
- [ ] Error handling with retries
- [ ] Job progress updates

---

### Task 2.3: Create DiffAnalyzerService

**File:** `src/bullmq/services/diff-analyzer.service.ts`

**Purpose:** Pre-process PR diffs before sending to AI.

**Implementation:**
```typescript
@Injectable()
export class DiffAnalyzerService {
  analyzeDiff(files: GitHubFile[]): AnalyzedDiff {
    return {
      modelsChanged: this.findModelChanges(files),
      functionsChanged: this.findFunctionChanges(files),
      routesChanged: this.findRouteChanges(files),
      testsChanged: this.findTestChanges(files),
      configChanged: this.findConfigChanges(files),
      summary: {
        filesAdded: number,
        filesModified: number,
        filesDeleted: number,
        linesAdded: number,
        linesRemoved: number,
      },
    };
  }
}
```

**Acceptance Criteria:**
- [ ] Categorizes changes by type (models, functions, routes, tests)
- [ ] Provides summary statistics
- [ ] Handles large diffs gracefully

---

### Task 2.4: Create Job Types & DTOs

**File:** `src/bullmq/jobs/generate-docs.job.ts`

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
    body: string;
    author: string;
    sha: string;
    merged_at: string;
  };
}
```

**Acceptance Criteria:**
- [ ] Type-safe job data interfaces
- [ ] Shared between producer and consumer

---

## Phase 3: AI Documentation Service (Priority: HIGH)

### Task 3.1: Create AI Module

**Files:**
- `src/ai/ai.module.ts`
- `src/ai/openai.service.ts`
- `src/ai/prompts/documentation.prompt.ts`

**OpenAI Service:**
```typescript
@Injectable()
export class OpenAiService {
  private client: OpenAI;

  constructor(private configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('openai.apiKey'),
    });
  }

  async generateDocumentation(analyzedDiff: AnalyzedDiff, prInfo: PRInfo): Promise<GeneratedDocs> {
    const prompt = this.buildPrompt(analyzedDiff, prInfo);
    const response = await this.client.chat.completions.create({
      model: this.configService.get('openai.model'),
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }],
      temperature: 0.3,
    });
    return this.parseResponse(response);
  }
}
```

**Acceptance Criteria:**
- [ ] OpenAI SDK integrated
- [ ] Prompt templates for documentation generation
- [ ] Response parsing and formatting

---

### Task 3.2: Create Prompt Templates

**File:** `src/ai/prompts/documentation.prompt.ts`

```typescript
export const SYSTEM_PROMPT = `You are a senior documentation writer.
Given code diffs, generate comprehensive documentation including:
1. High-level summary (2-4 sentences)
2. What changed and why
3. Mini-map style breakdown per file
4. Code snippet examples (before/after)
5. Developer instructions if needed
6. Changelog version of the update
7. Breaking change warnings`;

export const buildUserPrompt = (diff: AnalyzedDiff, pr: PRInfo): string => {
  // Build structured prompt with categorized changes
};
```

**Acceptance Criteria:**
- [ ] Clear, structured prompts
- [ ] Handles different change types appropriately
- [ ] Includes PR context (title, description)

---

### Task 3.3: Implement Diff Chunking

**File:** `src/ai/services/chunker.service.ts`

**Purpose:** Split large diffs into manageable chunks for AI processing.

```typescript
@Injectable()
export class ChunkerService {
  private readonly MAX_TOKENS = 8000;

  chunkDiff(files: GitHubFile[]): DiffChunk[] {
    // Group files by importance/type
    // Split if exceeds token limit
    // Maintain context between chunks
  }
}
```

**Acceptance Criteria:**
- [ ] Respects token limits
- [ ] Prioritizes important files
- [ ] Maintains context for multi-chunk processing

---

## Phase 4: Notification Services (Priority: MEDIUM)

### Task 4.1: Create Notifications Module

**Files:**
- `src/notifications/notifications.module.ts`
- `src/notifications/github-comment.service.ts`
- `src/notifications/email.service.ts`
- `src/notifications/slack.service.ts` (optional)

---

### Task 4.2: GitHub Comment Service

**File:** `src/notifications/github-comment.service.ts`

```typescript
@Injectable()
export class GitHubCommentService {
  constructor(private githubService: GitHubService) {}

  async postDocumentation(
    owner: string,
    repo: string,
    prNumber: number,
    docs: GeneratedDocs,
    installationToken: string,
  ): Promise<void> {
    const comment = this.formatComment(docs);
    await this.githubService.postComment(owner, repo, prNumber, comment, installationToken);
  }

  private formatComment(docs: GeneratedDocs): string {
    return `## 📚 Auto-Generated Documentation

### Summary
${docs.summary}

### Changes
${docs.changes}

### Changelog
${docs.changelog}

---
*Generated by SnapDocs*`;
  }
}
```

**Acceptance Criteria:**
- [ ] Posts formatted markdown comment to PR
- [ ] Handles rate limits gracefully
- [ ] Updates existing comment if re-run

---

### Task 4.3: Email Service (Resend)

**File:** `src/notifications/email.service.ts`

```typescript
@Injectable()
export class EmailService {
  private resend: Resend;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(this.configService.get('resend.apiKey'));
  }

  async sendDocsSummary(to: string, docs: GeneratedDocs, pr: PRInfo): Promise<void> {
    await this.resend.emails.send({
      from: 'SnapDocs <noreply@snapdocs.app>',
      to,
      subject: `Documentation generated for PR #${pr.number}`,
      html: this.buildEmailTemplate(docs, pr),
    });
  }
}
```

**Acceptance Criteria:**
- [ ] Resend SDK integrated
- [ ] HTML email templates
- [ ] Configurable recipients

---

## Phase 5: Export Services (Priority: MEDIUM)

### Task 5.1: Create Exports Module

**Files:**
- `src/exports/exports.module.ts`
- `src/exports/exports.controller.ts`
- `src/exports/markdown.service.ts`
- `src/exports/notion.service.ts` (optional)

---

### Task 5.2: Markdown Export Endpoint

**File:** `src/exports/exports.controller.ts`

```typescript
@Controller('exports')
@UseGuards(ClerkAuthGuard)
export class ExportsController {
  @Get('documentation/:prId/markdown')
  async exportMarkdown(@Param('prId') prId: string): Promise<StreamableFile> {
    const docs = await this.prisma.documentation.findUnique({ where: { prId } });
    const markdown = this.markdownService.generate(docs);
    return new StreamableFile(Buffer.from(markdown));
  }
}
```

**Acceptance Criteria:**
- [ ] Download documentation as .md file
- [ ] Proper content-disposition headers
- [ ] Auth protected

---

## Phase 6: Testing & Quality (Priority: HIGH)

### Task 6.1: Unit Tests for GitHubService

**File:** `src/github/github.service.spec.ts`

**Test Cases:**
- [ ] `verifyWebhookSignature` - valid signature
- [ ] `verifyWebhookSignature` - invalid signature
- [ ] `extractPullRequestData` - correct data extraction
- [ ] `getPullRequestFiles` - API integration
- [ ] `postComment` - successful post

---

### Task 6.2: Unit Tests for DocsGeneratorProcessor

**File:** `src/bullmq/processors/docs-generator.processor.spec.ts`

**Test Cases:**
- [ ] Job processing success flow
- [ ] Handling missing installation token
- [ ] AI service error handling
- [ ] Database save failures
- [ ] Retry logic

---

### Task 6.3: Integration Tests for Webhook Flow

**File:** `src/webhooks/webhooks.controller.spec.ts`

**Test Cases:**
- [ ] Valid webhook processed
- [ ] Invalid signature rejected
- [ ] Non-merged PR ignored
- [ ] Job queued correctly

---

### Task 6.4: E2E Test for Full Pipeline

**File:** `test/e2e/docs-generation.e2e-spec.ts`

**Test Cases:**
- [ ] Full flow: webhook → queue → AI → save → comment
- [ ] Error recovery scenarios

---

## Implementation Checklist Summary

### Critical Path (Must Complete First)
- [ ] Phase 1: All tasks (infrastructure fixes)
- [ ] Phase 2: Tasks 2.1-2.4 (job processing)
- [ ] Phase 3: Tasks 3.1-3.2 (AI service)

### Secondary (Feature Complete)
- [ ] Phase 4: Task 4.2 (GitHub comments)
- [ ] Phase 5: Task 5.2 (Markdown export)
- [ ] Phase 6: Tasks 6.1-6.3 (core tests)

### Nice to Have
- [ ] Phase 4: Tasks 4.3-4.4 (email, Slack)
- [ ] Phase 5: Task 5.3 (Notion export)
- [ ] Phase 6: Task 6.4 (E2E tests)

---

## Dependencies to Install

```bash
# AI
pnpm add openai

# Email (optional)
pnpm add resend

# Notion (optional)
pnpm add @notionhq/client
```

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1 | 0.5 day | None |
| Phase 2 | 1.5 days | Phase 1 |
| Phase 3 | 1 day | Phase 2 |
| Phase 4 | 0.5 day | Phase 3 |
| Phase 5 | 0.5 day | Phase 3 |
| Phase 6 | 1 day | All phases |

**Total: ~5 days for MVP**
