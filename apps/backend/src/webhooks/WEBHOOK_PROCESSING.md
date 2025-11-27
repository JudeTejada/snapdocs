# GitHub Webhook Processing Guide

This document describes the end-to-end flow for processing GitHub webhooks in SnapDocs, from receiving the webhook to generating documentation.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [End-to-End Flow](#end-to-end-flow)
3. [Webhook Configuration](#webhook-configuration)
4. [Webhook Controller](#webhook-controller)
5. [Signature Verification](#signature-verification)
6. [Event Processing](#event-processing)
7. [Job Queue Processing](#job-queue-processing)
8. [Error Handling & Retries](#error-handling--retries)
9. [Testing Webhooks](#testing-webhooks)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           WEBHOOK PROCESSING PIPELINE                            │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────┐     ┌──────────────┐
│  GitHub  │────►│   Backend    │────►│    Redis     │────►│ Worker  │────►│   GitHub     │
│  Event   │     │  Controller  │     │    Queue     │     │ Process │     │   API        │
└──────────┘     └──────────────┘     └──────────────┘     └─────────┘     └──────────────┘
     │                  │                    │                   │                │
     │  1. PR Merged    │                    │                   │                │
     │  Webhook sent    │                    │                   │                │
     │─────────────────►│                    │                   │                │
     │                  │                    │                   │                │
     │                  │  2. Verify         │                   │                │
     │                  │  signature         │                   │                │
     │                  │                    │                   │                │
     │                  │  3. Extract        │                   │                │
     │                  │  PR data           │                   │                │
     │                  │                    │                   │                │
     │                  │  4. Add job        │                   │                │
     │                  │─────────────────────►                  │                │
     │                  │                    │                   │                │
     │                  │                    │  5. Process job   │                │
     │                  │                    │──────────────────►│                │
     │                  │                    │                   │                │
     │                  │                    │                   │  6. Fetch PR   │
     │                  │                    │                   │  diff/files    │
     │                  │                    │                   │───────────────►│
     │                  │                    │                   │                │
     │                  │                    │                   │  7. Generate   │
     │                  │                    │                   │  docs (AI)     │
     │                  │                    │                   │                │
     │                  │                    │                   │  8. Post       │
     │                  │                    │                   │  comment       │
     │                  │                    │                   │───────────────►│
     │                  │                    │                   │                │
     │  9. Comment      │                    │                   │                │
     │  appears on PR   │                    │                   │                │
     │◄─────────────────────────────────────────────────────────────────────────────
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| Webhook Controller | `webhooks/webhooks.controller.ts` | Receives and validates webhooks |
| GitHub Service | `github/github.service.ts` | Signature verification, data extraction |
| BullMQ Service | `bullmq/bullmq.service.ts` | Job queue management |
| BullMQ Module | `bullmq/bullmq.module.ts` | Queue configuration |
| Webhook DTO | `dto/github-webhook.dto.ts` | Payload type definitions |

---

## End-to-End Flow

### Step 1: GitHub Sends Webhook

When a PR is merged, GitHub sends a POST request to your webhook endpoint:

```
POST /api/v1/webhooks/github
Headers:
  - x-hub-signature-256: sha256=abc123...
  - x-github-event: pull_request
  - x-github-delivery: unique-delivery-id
  - content-type: application/json
```

### Step 2: Backend Receives Webhook

```typescript
// webhooks.controller.ts
@Post('github')
@HttpCode(200)
async handleGitHubWebhook(
  @Body() payload: GitHubWebhookDto,
  @Headers('x-hub-signature-256') signature: string,
  @Headers('x-github-event') event: string,
  @Headers('x-github-delivery') delivery: string,
): Promise<WebhookResponseDto>
```

### Step 3: Verify Signature

```typescript
const rawPayload = JSON.stringify(payload);
const isValidSignature = this.githubService.verifyWebhookSignature(
  rawPayload,
  signature,
);

if (!isValidSignature) {
  return { success: false, message: 'Invalid signature' };
}
```

### Step 4: Check Event Type

Only process merged PRs:

```typescript
if (event === 'pull_request' && payload.action === 'closed' && payload.pull_request.merged) {
  // Process the merged PR
}
```

### Step 5: Extract PR Data

```typescript
const extractedData = this.githubService.extractPullRequestData(payload);
// Returns:
// {
//   repository: { id, name, owner, full_name },
//   installation: { id },
//   pullRequest: { id, number, title, body, html_url, merged, author, sha, ref, base_ref }
// }
```

### Step 6: Add Job to Queue

```typescript
await this.bullQueueService.addGenerateDocsJob(extractedData);
```

### Step 7: Worker Processes Job

The worker (to be implemented) picks up the job and:
1. Fetches PR diff from GitHub API
2. Sends diff to AI for documentation generation
3. Posts generated documentation as PR comment

### Step 8: Return Response

```typescript
return {
  success: true,
  message: 'Webhook processed successfully',
  data: {
    pr_number: payload.pull_request.number,
    pr_title: payload.pull_request.title,
    repository: `${extractedData.repository.owner}/${extractedData.repository.name}`,
  },
};
```

---

## Webhook Configuration

### GitHub App Settings

Configure webhooks in your GitHub App settings:

1. Go to GitHub App settings → Webhooks
2. Set **Webhook URL**: `https://your-domain.com/api/v1/webhooks/github`
3. Set **Content type**: `application/json`
4. Set **Secret**: Your `GITHUB_WEBHOOK_SECRET` value
5. Select events:
   - ✅ Pull requests

### Environment Variables

```bash
# .env
GITHUB_WEBHOOK_SECRET=your-webhook-secret-here
```

### Local Development with ngrok

For local testing, use ngrok to expose your local server:

```bash
# Terminal 1: Start your backend
pnpm dev:backend

# Terminal 2: Expose with ngrok
ngrok http 3001

# Use the ngrok URL in GitHub App settings:
# https://abc123.ngrok.io/api/v1/webhooks/github
```

---

## Webhook Controller

### Full Implementation

```typescript
// webhooks/webhooks.controller.ts
import { Controller, Post, Body, Headers, HttpCode, Logger } from '@nestjs/common';
import { GitHubService } from '../github/github.service';
import { BullQueueService } from '../bullmq/bullmq.service';
import { GitHubWebhookDto, WebhookResponseDto } from '../dto/github-webhook.dto';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly githubService: GitHubService,
    private readonly bullQueueService: BullQueueService,
  ) {}

  @Post('github')
  @HttpCode(200)
  async handleGitHubWebhook(
    @Body() payload: GitHubWebhookDto,
    @Headers('x-hub-signature-256') signature: string,
    @Headers('x-github-event') event: string,
    @Headers('x-github-delivery') delivery: string,
  ): Promise<WebhookResponseDto> {
    try {
      this.logger.log(`Received GitHub webhook: ${event} (delivery: ${delivery})`);

      // Step 1: Verify signature
      const rawPayload = JSON.stringify(payload);
      const isValidSignature = this.githubService.verifyWebhookSignature(
        rawPayload,
        signature,
      );

      if (!isValidSignature) {
        this.logger.warn('Invalid signature for webhook delivery: ', delivery);
        return {
          success: false,
          message: 'Invalid signature',
        };
      }

      // Step 2: Process merged PRs only
      if (event === 'pull_request' && payload.action === 'closed' && payload.pull_request.merged) {
        this.logger.log(`Processing merged PR: ${payload.pull_request.title} (#${payload.pull_request.number})`);

        // Step 3: Extract data
        const extractedData = this.githubService.extractPullRequestData(payload);
        
        // Step 4: Queue job for async processing
        await this.bullQueueService.addGenerateDocsJob(extractedData);

        return {
          success: true,
          message: 'Webhook processed successfully',
          data: {
            pr_number: payload.pull_request.number,
            pr_title: payload.pull_request.title,
            repository: `${extractedData.repository.owner}/${extractedData.repository.name}`,
          },
        };
      }

      // Ignore other events
      this.logger.log(`Ignoring webhook event: ${event} with action: ${payload.action}`);
      return {
        success: true,
        message: 'Event ignored',
        data: { event, action: payload.action },
      };
    } catch (error) {
      this.logger.error('Error processing GitHub webhook', error);
      return {
        success: false,
        message: 'Internal server error',
      };
    }
  }
}
```

---

## Signature Verification

### How It Works

GitHub signs each webhook payload using HMAC-SHA256 with your webhook secret:

```typescript
// github.service.ts
verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = this.configService.get<string>("github.webhookSecret");
  if (!secret) {
    this.logger.error("GitHub webhook secret not configured");
    return false;
  }

  // Create expected signature
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload, "utf-8")
    .digest("hex");

  const expectedSignatureHeader = `sha256=${expectedSignature}`;

  try {
    // Timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignatureHeader)
    );
  } catch (error) {
    this.logger.error("Error verifying GitHub signature", error);
    return false;
  }
}
```

### Security Notes

1. **Always verify signatures** - Never process unverified webhooks
2. **Use timing-safe comparison** - Prevents timing attacks
3. **Keep secret secure** - Store in environment variables only
4. **Log failed verifications** - For security monitoring

---

## Event Processing

### Supported Events

| Event | Action | Processed | Description |
|-------|--------|-----------|-------------|
| `pull_request` | `closed` + `merged=true` | ✅ | Merged PR - triggers doc generation |
| `pull_request` | `closed` + `merged=false` | ❌ | Closed without merge - ignored |
| `pull_request` | `opened` | ❌ | New PR - ignored |
| `pull_request` | `synchronize` | ❌ | PR updated - ignored |
| `push` | - | ❌ | Direct push - ignored |

### Webhook Payload Structure

```typescript
// dto/github-webhook.dto.ts
export class GitHubWebhookDto {
  action: string;           // 'opened', 'closed', 'synchronize', etc.
  
  pull_request: {
    id: number;
    number: number;         // PR number (e.g., #123)
    title: string;
    html_url: string;       // Link to PR on GitHub
    body: string;           // PR description
    merged: boolean;        // Was it merged?
    merged_at: string;      // When it was merged
    user: {
      login: string;        // PR author username
      id: number;
    };
    head: {
      sha: string;          // Commit SHA
      ref: string;          // Branch name (feature-branch)
    };
    base: {
      ref: string;          // Target branch (main)
    };
  };

  repository: {
    id: number;
    name: string;           // Repo name
    full_name: string;      // owner/repo
    owner: {
      login: string;        // Owner username/org
    };
  };

  installation: {
    id: number;             // GitHub App installation ID
  };
}
```

### Extracted Data Structure

```typescript
// Output from extractPullRequestData()
{
  repository: {
    id: 123456,
    name: "my-repo",
    owner: "username",
    full_name: "username/my-repo"
  },
  installation: {
    id: 789012
  },
  pullRequest: {
    id: 111222,
    number: 42,
    title: "Add new feature",
    body: "This PR adds...",
    html_url: "https://github.com/username/my-repo/pull/42",
    merged: true,
    merged_at: "2024-01-15T10:30:00Z",
    author: "contributor",
    author_id: 333444,
    sha: "abc123def456",
    ref: "feature-branch",
    base_ref: "main"
  }
}
```

---

## Job Queue Processing

### BullMQ Configuration

```typescript
// bullmq/bullmq.module.ts
@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'generateDocs',
    }),
  ],
  providers: [BullQueueService],
  exports: [BullQueueService],
})
export class BullmqModule {}
```

### Adding Jobs to Queue

```typescript
// bullmq/bullmq.service.ts
async addGenerateDocsJob(data: any) {
  this.logger.log(`Adding generateDocs job for PR: ${data.pullRequest?.number}`);

  const job = await this.generateDocsQueue.add('generateDocs', {
    repository: data.repository,
    installation: data.installation,
    pullRequest: data.pullRequest,
    timestamp: new Date().toISOString(),
  }, {
    attempts: 3,                    // Retry up to 3 times
    backoff: {
      type: 'exponential',          // Exponential backoff
      delay: 2000,                  // Start with 2 seconds
    },
    removeOnComplete: 100,          // Keep last 100 completed jobs
    removeOnFail: 50,               // Keep last 50 failed jobs
  });

  return job;
}
```

### Job Processor (To Be Implemented)

Create a worker to process jobs:

```typescript
// bullmq/generateDocs.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { GitHubService } from '../github/github.service';

@Processor('generateDocs')
export class GenerateDocsProcessor extends WorkerHost {
  private readonly logger = new Logger(GenerateDocsProcessor.name);

  constructor(private readonly githubService: GitHubService) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    this.logger.log(`Processing job ${job.id} for PR #${job.data.pullRequest.number}`);

    const { repository, installation, pullRequest } = job.data;

    try {
      // Step 1: Get installation Octokit client
      const octokit = this.githubService.getInstallationOctokit(
        String(installation.id)
      );

      // Step 2: Fetch PR files/diff
      const files = await this.githubService.getPullRequestFiles(
        repository.owner,
        repository.name,
        pullRequest.number,
        String(installation.id)
      );

      this.logger.log(`Fetched ${files.length} files from PR`);

      // Step 3: Generate documentation using AI
      // const documentation = await this.aiService.generateDocs(files, pullRequest);

      // Step 4: Post comment on PR
      // await this.githubService.postComment(
      //   repository.owner,
      //   repository.name,
      //   pullRequest.number,
      //   documentation,
      //   String(installation.id)
      // );

      return {
        success: true,
        filesProcessed: files.length,
        pr: pullRequest.number,
      };
    } catch (error) {
      this.logger.error(`Failed to process job ${job.id}`, error);
      throw error; // Will trigger retry
    }
  }
}
```

### Register Processor in Module

```typescript
// bullmq/bullmq.module.ts
import { GenerateDocsProcessor } from './generateDocs.processor';

@Module({
  imports: [
    BullModule.forRoot({ /* ... */ }),
    BullModule.registerQueue({ name: 'generateDocs' }),
  ],
  providers: [BullQueueService, GenerateDocsProcessor],
  exports: [BullQueueService],
})
export class BullmqModule {}
```

---

## Error Handling & Retries

### Retry Configuration

```typescript
{
  attempts: 3,              // Max 3 attempts
  backoff: {
    type: 'exponential',    // 2s → 4s → 8s
    delay: 2000,
  },
}
```

### Error Scenarios

| Error | Handled By | Action |
|-------|------------|--------|
| Invalid signature | Controller | Return 200 with error message |
| GitHub API rate limit | Worker retry | Exponential backoff |
| GitHub API error | Worker retry | Up to 3 attempts |
| Redis connection error | BullMQ | Auto-reconnect |
| AI service error | Worker retry | Up to 3 attempts |

### Monitoring Queue

```typescript
// Get queue statistics
const stats = await this.bullQueueService.getQueueStats();
// {
//   waiting: 5,
//   active: 1,
//   completed: 100,
//   failed: 2
// }
```

---

## Testing Webhooks

### Manual Testing with curl

```bash
# Generate signature
SECRET="your-webhook-secret"
PAYLOAD='{"action":"closed","pull_request":{"merged":true,"number":1,"title":"Test"},"repository":{"name":"test","owner":{"login":"user"}},"installation":{"id":123}}'
SIGNATURE="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)"

# Send test webhook
curl -X POST http://localhost:3001/api/v1/webhooks/github \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: $SIGNATURE" \
  -H "x-github-event: pull_request" \
  -H "x-github-delivery: test-123" \
  -d "$PAYLOAD"
```

### Using GitHub's Webhook Redelivery

1. Go to your GitHub App settings
2. Click "Advanced" in the sidebar
3. Find recent webhook deliveries
4. Click "Redeliver" to resend

### Unit Testing

```typescript
// webhooks.controller.spec.ts
describe('WebhooksController', () => {
  it('should process merged PR webhook', async () => {
    const payload = {
      action: 'closed',
      pull_request: {
        merged: true,
        number: 42,
        title: 'Test PR',
        // ...
      },
      // ...
    };

    const result = await controller.handleGitHubWebhook(
      payload,
      'sha256=valid-signature',
      'pull_request',
      'delivery-123'
    );

    expect(result.success).toBe(true);
    expect(bullQueueService.addGenerateDocsJob).toHaveBeenCalled();
  });

  it('should reject invalid signature', async () => {
    const result = await controller.handleGitHubWebhook(
      payload,
      'sha256=invalid-signature',
      'pull_request',
      'delivery-123'
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid signature');
  });
});
```

---

## Troubleshooting

### Common Issues

#### 1. "Invalid signature" Error

**Causes:**
- Webhook secret mismatch between GitHub and `.env`
- Payload modified during transmission
- Newline or encoding issues

**Solutions:**
```bash
# Verify your secret matches
echo $GITHUB_WEBHOOK_SECRET

# Check GitHub App settings for the same secret
```

#### 2. Webhook Not Received

**Causes:**
- Firewall blocking incoming requests
- Wrong webhook URL in GitHub settings
- Server not running

**Solutions:**
```bash
# Check if endpoint is accessible
curl -X POST https://your-domain.com/api/v1/webhooks/github

# Check GitHub App webhook delivery history for errors
```

#### 3. Jobs Not Processing

**Causes:**
- Redis not running
- Worker not started
- Queue name mismatch

**Solutions:**
```bash
# Check Redis connection
redis-cli ping  # Should return PONG

# Check queue stats
curl http://localhost:3001/api/v1/dashboard/queue-stats
```

#### 4. Rate Limiting

**Causes:**
- Too many GitHub API calls
- Token not properly cached

**Solutions:**
- Use `getInstallationOctokit()` which caches tokens
- Implement request throttling
- Check rate limit headers in responses

### Logging

Enable verbose logging for debugging:

```typescript
// In your service
this.logger.debug('Webhook payload:', JSON.stringify(payload, null, 2));
this.logger.debug('Extracted data:', extractedData);
```

### Webhook Delivery History

Check recent webhooks in GitHub:
1. Go to GitHub App settings
2. Click "Advanced" 
3. View "Recent Deliveries"
4. Check response codes and bodies

---

## Quick Reference

### Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/webhooks/github` | POST | Signature | Receive GitHub webhooks |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_WEBHOOK_SECRET` | Yes | Webhook signature secret |
| `REDIS_HOST` | Yes | Redis server host |
| `REDIS_PORT` | Yes | Redis server port |

### Event Flow Summary

```
1. PR merged on GitHub
      ↓
2. GitHub sends webhook to /webhooks/github
      ↓
3. Controller verifies signature
      ↓
4. Controller extracts PR data
      ↓
5. Job added to Redis queue
      ↓
6. Worker picks up job
      ↓
7. Worker fetches PR diff via GitHub API
      ↓
8. AI generates documentation
      ↓
9. Worker posts comment on PR
      ↓
10. Documentation visible on GitHub PR
```

### Useful Links

- [GitHub Webhooks Documentation](https://docs.github.com/en/webhooks)
- [GitHub Webhook Events](https://docs.github.com/en/webhooks/webhook-events-and-payloads)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Securing Webhooks](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
