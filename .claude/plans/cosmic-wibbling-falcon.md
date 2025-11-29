# BullMQ Documentation Generation Integration Plan

## Current State Analysis

### Existing Infrastructure ✅
- **GeminiService**: Already implemented at `src/ai/gemini.service.ts`
- **BullMQ**: Queue infrastructure configured with `generateDocs` queue
- **GitHub Integration**: Full Octokit-based service with webhook verification
- **Webhooks Controller**: Already processes merged PRs and calls `bullQueueService.addGenerateDocsJob()`
- **Prisma Schema**: `Documentation` and `PullRequest` models exist
- **SyncWorkerService**: Pattern established for worker implementation

### What Needs to be Added

#### 1. DocsWorkerService (Worker Implementation)
**File**: `src/workers/docs-worker.service.ts`
- Process `generateDocs` queue jobs
- Fetch PR diff from GitHub using existing GitHubService
- Generate documentation using GeminiService
- Save documentation to database via Prisma
- Post documentation comment to GitHub PR
- Error handling with retry logic

#### 2. Update WorkersModule
**File**: `src/workers/workers.module.ts`
- Add DocsWorkerService to providers
- Export DocsWorkerService
- Import required dependencies (GitHubModule, etc.)

#### 3. Update BullQueueService
**File**: `src/bullmq/bullmq.service.ts`
- Initialize DocsWorker in `onModuleInit()`
- Add worker event listeners (completed, failed)
- Handle worker lifecycle management

#### 4. Database Operations
**File**: `src/dashboard/dashboard.repository.ts` (or new docs repository)
- Add method to save documentation to PullRequest record
- Update PR status tracking

## Implementation Steps

### Step 1: Create DocsWorkerService
```typescript
// src/workers/docs-worker.service.ts
@Injectable()
export class DocsWorkerService {
  constructor(
    private readonly githubService: GitHubService,
    private readonly geminiService: GeminiService,
    private readonly prisma: PrismaService,
  ) {}

  async process(job: Job<GenerateDocsJobData>) {
    // Implementation here
  }
}
```

### Step 2: Update WorkersModule
- Import GitHubModule and PrismaModule
- Add DocsWorkerService to providers
- Export DocsWorkerService

### Step 3: Update BullQueueService
- Initialize DocsWorker in onModuleInit()
- Add connection config for worker
- Add event listeners

### Step 4: Database Integration
- Extend existing repository or create DocsRepository
- Save generated documentation to Documentation table
- Update PullRequest status

## Key Design Decisions

1. **Reuse Existing Infrastructure**: Leverage existing BullMQ setup, GitHubService, and GeminiService
2. **Follow Established Patterns**: Use SyncWorkerService as reference for implementation
3. **Database Integration**: Use existing Prisma models (Documentation, PullRequest)
4. **Error Handling**: Implement retry logic with exponential backoff
5. **Rate Limiting**: Keep Gemini free-tier rate limiting in place

## User Decisions

1. **Database**: Create separate `docs.repository.ts`
2. **Worker Lifecycle**: Initialize in BullQueueService (follow existing pattern)
3. **API Management**: Add GeminiCostGuard for daily usage tracking

## Files to Create/Modify

### New Files
- `src/workers/docs-worker.service.ts`
- `src/docs/docs.repository.ts`
- `src/ai/gemini-cost.guard.ts`

### Modified Files
- `src/workers/workers.module.ts` (add DocsWorkerService)
- `src/bullmq/bullmq.service.ts` (initialize docs worker)
- `src/webhooks/webhooks.controller.ts` (apply cost guard)
- `src/app.module.ts` (ensure modules are imported)

## Integration Points

1. **Webhook → Queue**: Already working via `bullQueueService.addGenerateDocsJob()`
2. **Queue → Worker**: Will work after adding worker initialization
3. **Worker → Database**: Save via Prisma
4. **Worker → GitHub**: Post comment via GitHubService

## Next Steps

1. Implement DocsWorkerService following the pattern from SyncWorkerService
2. Wire up the worker in BullQueueService
3. Update WorkersModule dependencies
4. Test the full flow: webhook → queue → worker → GitHub comment
