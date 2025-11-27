# SnapDocs Backend - Senior Engineer Setup Guide

> A comprehensive guide for setting up and architecting the SnapDocs NestJS backend following best practices.

---

## Table of Contents

1. [Project Architecture](#project-architecture)
2. [Module Structure](#module-structure)
3. [Configuration Management](#configuration-management)
4. [Database Layer](#database-layer)
5. [Authentication](#authentication)
6. [Background Jobs](#background-jobs)
7. [API Design](#api-design)
8. [Error Handling](#error-handling)
9. [Testing Strategy](#testing-strategy)
10. [Security Considerations](#security-considerations)
11. [Development Workflow](#development-workflow)

---

## Project Architecture

### High-Level System Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SNAPDOCS BACKEND                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   GitHub Webhook ──► WebhooksController ──► BullMQ Queue                    │
│                           │                      │                           │
│                           ▼                      ▼                           │
│                    Signature Validation    DocsGeneratorProcessor           │
│                           │                      │                           │
│                           ▼                      ├──► GitHubService (fetch)  │
│                    Extract PR Data               ├──► DiffAnalyzer           │
│                           │                      ├──► OpenAI Service         │
│                           ▼                      ├──► PrismaService (save)   │
│                    Queue Job                     └──► NotificationService    │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Frontend ──► AuthController ──► ClerkService ──► User Validation          │
│       │                                                                      │
│       └──► DashboardController ──► PrismaService ──► Repos/PRs/Docs         │
│       │                                                                      │
│       └──► ExportsController ──► MarkdownService ──► Download Files         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
apps/backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── main.ts                # Application bootstrap
│   ├── app.module.ts          # Root module
│   │
│   ├── config/                # Configuration
│   │   ├── configuration.ts   # Config factory
│   │   └── validation.ts      # Env validation
│   │
│   ├── common/                # Shared utilities
│   │   ├── filters/           # Exception filters
│   │   ├── interceptors/      # Response interceptors
│   │   ├── guards/            # Auth guards
│   │   ├── decorators/        # Custom decorators
│   │   └── dto/               # Shared DTOs
│   │
│   ├── prisma/                # Database module
│   │   ├── prisma.module.ts
│   │   ├── prisma.service.ts
│   │   └── repository.service.ts
│   │
│   ├── auth/                  # Authentication
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── clerk.service.ts
│   │   ├── guards/
│   │   ├── decorators/
│   │   └── dto/
│   │
│   ├── github/                # GitHub integration
│   │   ├── github.module.ts
│   │   ├── github.service.ts
│   │   └── dto/
│   │
│   ├── webhooks/              # Webhook handlers
│   │   ├── webhooks.module.ts
│   │   ├── webhooks.controller.ts
│   │   └── dto/
│   │
│   ├── bullmq/                # Job queue
│   │   ├── bullmq.module.ts
│   │   ├── bullmq.service.ts
│   │   ├── processors/
│   │   │   └── docs-generator.processor.ts
│   │   ├── services/
│   │   │   └── diff-analyzer.service.ts
│   │   └── jobs/
│   │       └── generate-docs.job.ts
│   │
│   ├── ai/                    # AI documentation
│   │   ├── ai.module.ts
│   │   ├── openai.service.ts
│   │   ├── prompts/
│   │   │   └── documentation.prompt.ts
│   │   └── services/
│   │       └── chunker.service.ts
│   │
│   ├── notifications/         # Notification services
│   │   ├── notifications.module.ts
│   │   ├── github-comment.service.ts
│   │   ├── email.service.ts
│   │   └── slack.service.ts
│   │
│   ├── exports/               # Export functionality
│   │   ├── exports.module.ts
│   │   ├── exports.controller.ts
│   │   ├── markdown.service.ts
│   │   └── notion.service.ts
│   │
│   ├── dashboard/             # Dashboard APIs
│   │   ├── dashboard.module.ts
│   │   ├── dashboard.controller.ts
│   │   └── dto/
│   │
│   └── health/                # Health checks
│       ├── health.module.ts
│       └── health.controller.ts
│
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example
├── nest-cli.json
├── tsconfig.json
└── package.json
```

---

## Module Structure

### Module Design Principles

1. **Single Responsibility**: Each module handles one domain
2. **Encapsulation**: Export only what's needed by other modules
3. **Dependency Injection**: Use NestJS DI for all dependencies
4. **Lazy Loading**: Consider lazy loading for large modules

### Standard Module Template

```typescript
// feature.module.ts
import { Module } from '@nestjs/common';
import { FeatureController } from './feature.controller';
import { FeatureService } from './feature.service';

@Module({
  imports: [
    // Dependencies from other modules
  ],
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService], // Only if needed externally
})
export class FeatureModule {}
```

### Root AppModule Configuration

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validateEnv } from './config/validation';

// Feature modules
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GitHubModule } from './github/github.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { BullmqModule } from './bullmq/bullmq.module';
import { AiModule } from './ai/ai.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ExportsModule } from './exports/exports.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Global configuration - MUST be first
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
      validate: validateEnv,
      validationOptions: {
        allowUnknown: false,
        abortEarly: true,
      },
    }),

    // Infrastructure modules
    PrismaModule,
    BullmqModule,

    // Feature modules
    AuthModule,
    GitHubModule,
    WebhooksModule,
    AiModule,
    NotificationsModule,
    ExportsModule,
    DashboardModule,
    HealthModule,
  ],
})
export class AppModule {}
```

---

## Configuration Management

### Environment Variables

**File: `.env.example`**

```env
# Application
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/snapdocs

# Redis (BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Authentication (Clerk)
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx

# GitHub App
GITHUB_APP_ID=123456
GITHUB_APP_SLUG=snapdocs
GITHUB_CLIENT_ID=Iv1.xxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxx
GITHUB_WEBHOOK_SECRET=whsec_xxxxx
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"

# AI (OpenAI)
OPENAI_API_KEY=sk-xxxxx
OPENAI_MODEL=gpt-4-turbo-preview

# Email (Resend) - Optional
RESEND_API_KEY=re_xxxxx

# Notion - Optional
NOTION_API_KEY=secret_xxxxx
```

### Configuration Factory

**File: `src/config/configuration.ts`**

```typescript
export default () => ({
  // Application
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Database
  database: {
    url: process.env.DATABASE_URL,
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // Clerk
  clerk: {
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  },

  // GitHub
  github: {
    appId: process.env.GITHUB_APP_ID,
    appSlug: process.env.GITHUB_APP_SLUG,
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
    privateKey: process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
  },

  // Resend (optional)
  resend: {
    apiKey: process.env.RESEND_API_KEY,
  },

  // Notion (optional)
  notion: {
    apiKey: process.env.NOTION_API_KEY,
  },
});
```

### Environment Validation

**File: `src/config/validation.ts`**

```typescript
import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, IsOptional, validateSync, IsEnum } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  CLERK_SECRET_KEY: string;

  @IsString()
  GITHUB_APP_ID: string;

  @IsString()
  GITHUB_WEBHOOK_SECRET: string;

  @IsString()
  GITHUB_PRIVATE_KEY: string;

  @IsString()
  @IsOptional()
  OPENAI_API_KEY: string;

  @IsString()
  @IsOptional()
  REDIS_HOST: string;

  @IsNumber()
  @IsOptional()
  REDIS_PORT: number;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
```

### Using Configuration in Services

```typescript
// CORRECT: Use ConfigService
@Injectable()
export class MyService {
  constructor(private readonly configService: ConfigService) {}

  someMethod() {
    const apiKey = this.configService.get<string>('openai.apiKey');
    const port = this.configService.get<number>('port');
  }
}

// WRONG: Direct process.env access
const apiKey = process.env.OPENAI_API_KEY; // ❌ Never do this
```

---

## Database Layer

### Prisma Service Setup

**File: `src/prisma/prisma.service.ts`**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: configService.get<string>('database.url'),
    });
    super({
      adapter,
      log: configService.get('nodeEnv') === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}
```

### Repository Pattern (Optional)

For complex queries, use repository services:

```typescript
// src/prisma/repositories/documentation.repository.ts
@Injectable()
export class DocumentationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPrId(prId: string) {
    return this.prisma.documentation.findUnique({
      where: { prId },
      include: { pr: { include: { repo: true } } },
    });
  }

  async createOrUpdate(prId: string, data: CreateDocumentationDto) {
    return this.prisma.documentation.upsert({
      where: { prId },
      create: { prId, ...data },
      update: data,
    });
  }
}
```

---

## Authentication

### Clerk Auth Guard

**File: `src/auth/guards/clerk-auth.guard.ts`**

```typescript
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ClerkService } from '../clerk.service';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly clerkService: ClerkService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    try {
      const user = await this.clerkService.verifyAuthToken(token);
      request.user = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
```

### User Decorator

**File: `src/auth/decorators/get-clerk-user.decorator.ts`**

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ClerkUser } from '../clerk.service';

export const GetClerkUser = createParamDecorator(
  (data: keyof ClerkUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as ClerkUser;

    return data ? user?.[data] : user;
  },
);
```

---

## Background Jobs

### BullMQ Module Setup

**File: `src/bullmq/bullmq.module.ts`**

```typescript
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
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
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

### Job Processor

**File: `src/bullmq/processors/docs-generator.processor.ts`**

```typescript
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { GitHubService } from '../../github/github.service';
import { OpenAiService } from '../../ai/openai.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DiffAnalyzerService } from '../services/diff-analyzer.service';
import { GitHubCommentService } from '../../notifications/github-comment.service';
import { GenerateDocsJobData } from '../jobs/generate-docs.job';

@Processor('generateDocs')
export class DocsGeneratorProcessor extends WorkerHost {
  private readonly logger = new Logger(DocsGeneratorProcessor.name);

  constructor(
    private readonly githubService: GitHubService,
    private readonly aiService: OpenAiService,
    private readonly prisma: PrismaService,
    private readonly diffAnalyzer: DiffAnalyzerService,
    private readonly commentService: GitHubCommentService,
  ) {
    super();
  }

  async process(job: Job<GenerateDocsJobData>): Promise<void> {
    const { repository, installation, pullRequest } = job.data;

    this.logger.log(`Processing PR #${pullRequest.number} from ${repository.full_name}`);

    try {
      // Step 1: Get installation token
      await job.updateProgress(10);
      const token = await this.githubService.getInstallationToken(
        installation.id.toString(),
      );

      // Step 2: Fetch PR files
      await job.updateProgress(20);
      const files = await this.githubService.getPullRequestFiles(
        repository.owner,
        repository.name,
        pullRequest.number,
        token,
      );

      // Step 3: Analyze diff
      await job.updateProgress(40);
      const analyzedDiff = this.diffAnalyzer.analyzeDiff(files);

      // Step 4: Generate documentation via AI
      await job.updateProgress(60);
      const docs = await this.aiService.generateDocumentation(analyzedDiff, {
        title: pullRequest.title,
        body: pullRequest.body,
        author: pullRequest.author,
      });

      // Step 5: Save to database
      await job.updateProgress(80);
      const repo = await this.prisma.repo.findFirst({
        where: { owner: repository.owner, name: repository.name },
      });

      if (repo) {
        const pr = await this.prisma.pullRequest.upsert({
          where: { repoId_number: { repoId: repo.id, number: pullRequest.number } },
          create: {
            repoId: repo.id,
            number: pullRequest.number,
            title: pullRequest.title,
            author: pullRequest.author,
            mergedAt: new Date(pullRequest.merged_at),
            sha: pullRequest.sha,
          },
          update: {
            title: pullRequest.title,
            sha: pullRequest.sha,
          },
        });

        await this.prisma.documentation.upsert({
          where: { prId: pr.id },
          create: {
            prId: pr.id,
            summary: docs.summary,
            snippets: docs.snippets,
            changelog: docs.changelog,
            json: docs.raw,
          },
          update: {
            summary: docs.summary,
            snippets: docs.snippets,
            changelog: docs.changelog,
            json: docs.raw,
          },
        });
      }

      // Step 6: Post comment to GitHub
      await job.updateProgress(90);
      await this.commentService.postDocumentation(
        repository.owner,
        repository.name,
        pullRequest.number,
        docs,
        token,
      );

      await job.updateProgress(100);
      this.logger.log(`Successfully processed PR #${pullRequest.number}`);
    } catch (error) {
      this.logger.error(`Failed to process PR #${pullRequest.number}`, error.stack);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }
}
```

---

## API Design

### RESTful Endpoint Conventions

```
GET    /api/v1/resources          # List resources
GET    /api/v1/resources/:id      # Get single resource
POST   /api/v1/resources          # Create resource
PUT    /api/v1/resources/:id      # Update resource (full)
PATCH  /api/v1/resources/:id      # Update resource (partial)
DELETE /api/v1/resources/:id      # Delete resource
```

### Standard Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "HTTP_400",
    "message": "Validation failed",
    "details": { ... }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/api/v1/repos"
}
```

### DTO Validation

```typescript
// src/dashboard/dto/add-repository.dto.ts
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddRepositoryDto {
  @ApiProperty({ example: 'my-repo', description: 'Repository name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'username', description: 'Repository owner' })
  @IsString()
  @IsNotEmpty()
  owner: string;

  @ApiProperty({ example: '12345', description: 'GitHub installation ID' })
  @IsString()
  @IsNotEmpty()
  installationId: string;
}
```

---

## Error Handling

### Global Exception Filter

Already implemented in `src/common/filters/http-exception.filter.ts`.

### Custom Business Exceptions

```typescript
// src/common/exceptions/business.exceptions.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class GitHubConnectionException extends HttpException {
  constructor(message: string = 'GitHub connection failed') {
    super(
      {
        code: 'GITHUB_CONNECTION_ERROR',
        message,
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

export class DocumentationGenerationException extends HttpException {
  constructor(prNumber: number, reason: string) {
    super(
      {
        code: 'DOCS_GENERATION_ERROR',
        message: `Failed to generate documentation for PR #${prNumber}`,
        details: { reason },
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
```

---

## Testing Strategy

### Test File Naming

```
src/
├── github/
│   ├── github.service.ts
│   └── github.service.spec.ts      # Unit test
├── webhooks/
│   ├── webhooks.controller.ts
│   └── webhooks.controller.spec.ts # Unit/Integration test
test/
├── e2e/
│   └── docs-generation.e2e-spec.ts # E2E test
```

### Unit Test Example

```typescript
// src/github/github.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GitHubService } from './github.service';

describe('GitHubService', () => {
  let service: GitHubService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                'github.webhookSecret': 'test-secret',
                'github.privateKey': 'test-key',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<GitHubService>(GitHubService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('verifyWebhookSignature', () => {
    it('should return true for valid signature', () => {
      const payload = '{"test": "data"}';
      // Generate valid signature for test
      const result = service.verifyWebhookSignature(payload, 'sha256=...');
      expect(result).toBeDefined();
    });

    it('should return false for invalid signature', () => {
      const result = service.verifyWebhookSignature('payload', 'invalid');
      expect(result).toBe(false);
    });
  });
});
```

### Running Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

---

## Security Considerations

### 1. Webhook Signature Verification
Always verify GitHub webhook signatures using timing-safe comparison.

### 2. Environment Variables
- Never commit `.env` files
- Use different keys for dev/prod
- Rotate secrets regularly

### 3. API Security
- All endpoints require authentication (except webhooks, health)
- Rate limiting on public endpoints
- Input validation on all DTOs

### 4. GitHub App Permissions
Request minimum required permissions:
- Pull Requests: Read
- Contents: Read
- Metadata: Read

### 5. Database Security
- Use parameterized queries (Prisma handles this)
- Limit data exposure in responses
- Cascade deletes for user data

---

## Development Workflow

### 1. Local Development

```bash
# Start dependencies
docker-compose up -d postgres redis

# Run migrations
npx prisma migrate dev

# Start dev server
pnpm dev:backend

# In another terminal, start worker (if separate)
# npm run worker
```

### 2. Testing Webhooks Locally

```bash
# Install ngrok
brew install ngrok

# Expose local server
ngrok http 3001

# Update GitHub App webhook URL to ngrok URL
# https://xxxxx.ngrok.io/api/v1/webhooks/github
```

### 3. Code Quality

```bash
# Lint
pnpm lint

# Type check
pnpm typecheck

# Format
pnpm format
```

### 4. Database Operations

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name your_migration_name

# Reset database (dev only)
npx prisma migrate reset

# View data
npx prisma studio
```

---

## Quick Reference Commands

| Command | Description |
|---------|-------------|
| `pnpm dev:backend` | Start dev server with watch |
| `pnpm build` | Build for production |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript check |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Tests in watch mode |
| `npm run test:cov` | Coverage report |
| `npx prisma studio` | Open Prisma GUI |
| `npx prisma migrate dev` | Run migrations |

---

## Next Steps

1. Review `IMPLEMENTATION_TASKS.md` for detailed task breakdown
2. Start with Phase 1 (Critical infrastructure fixes)
3. Set up local development environment
4. Implement features following this guide's patterns
