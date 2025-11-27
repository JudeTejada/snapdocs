# SnapDocs Deployment Guide - Render.com

> Complete guide for deploying SnapDocs to Render.com with free tier analysis and production recommendations.

---

## Table of Contents

1. [Render Free Tier Analysis](#render-free-tier-analysis)
2. [Architecture for Render](#architecture-for-render)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Cost Optimization](#cost-optimization)
6. [Scaling Beyond Free Tier](#scaling-beyond-free-tier)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Render Free Tier Analysis

### What You Get for Free

| Service | Free Tier Limits | SnapDocs Usage Estimate |
|---------|------------------|-------------------------|
| **Web Service** | 750 hours/month, 512MB RAM, 0.1 vCPU | ~31 days if always on (spins down after 15min idle) |
| **PostgreSQL** | 1GB storage, **expires after 30 days** | ⚠️ Must upgrade or recreate monthly |
| **Key Value (Redis)** | 25MB RAM, limited connections | ~500-1000 jobs/day with small payloads |
| **Bandwidth** | 100GB egress/month | Sufficient for moderate usage |
| **Build Minutes** | 500 minutes/month | ~50-100 deployments |

### Free Tier Limitations & Impact

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RENDER FREE TIER REALITY CHECK                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ⚠️  CRITICAL LIMITATIONS:                                                  │
│                                                                             │
│  1. PostgreSQL expires after 30 days                                        │
│     → You lose all data unless you upgrade ($7/month) or recreate          │
│     → NOT suitable for production                                          │
│                                                                             │
│  2. Web service spins down after 15 minutes of inactivity                  │
│     → First request after idle takes 30-60 seconds (cold start)            │
│     → GitHub webhooks may timeout waiting for cold start                   │
│     → Solution: Use external uptime monitor to ping every 14 min           │
│                                                                             │
│  3. Redis (Key Value) has 25MB limit                                        │
│     → Each job payload ~2-5KB                                              │
│     → Can handle ~5,000-10,000 pending jobs                                │
│     → Should be fine for hobby use                                         │
│                                                                             │
│  4. 512MB RAM limit                                                         │
│     → NestJS + BullMQ worker uses ~150-250MB                               │
│     → Large diffs in AI processing can spike to 400MB+                     │
│     → May OOM on very large PRs (100+ files)                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Can Free Tier Handle SnapDocs?

| Use Case | Free Tier Verdict | Notes |
|----------|-------------------|-------|
| **Development/Testing** | ✅ Yes | Perfect for testing the full flow |
| **Personal Projects** | ⚠️ Maybe | Works if you accept 30-day DB limit |
| **Small Team (< 5 repos)** | ⚠️ Limited | Cold starts may cause webhook timeouts |
| **Production** | ❌ No | Too many limitations, data loss risk |

### Realistic Free Tier Capacity

```
Estimated Monthly Capacity (Free Tier):

PRs Processed:        ~100-300 PRs/month
                      (limited by cold starts, not compute)

Webhook Success Rate: ~70-85%
                      (15-30% may fail due to cold start timeouts)

Data Retention:       30 days (then DB deleted)

Concurrent Jobs:      1-2 (limited RAM)

Response Time:        50-800ms warm, 30-60s cold
```

---

## Architecture for Render

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RENDER DEPLOYMENT ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐         ┌─────────────────┐                            │
│  │   Render Web    │         │  Render Redis   │                            │
│  │   Service       │◄───────►│  (Key Value)    │                            │
│  │   (Backend)     │         │                 │                            │
│  │   - API Server  │         │  - Job Queue    │                            │
│  │   - Worker      │         │  - 25MB Free    │                            │
│  │   512MB RAM     │         │                 │                            │
│  └────────┬────────┘         └─────────────────┘                            │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐         ┌─────────────────┐                            │
│  │ Render Postgres │         │    External     │                            │
│  │                 │         │    Services     │                            │
│  │  - 1GB Storage  │         │                 │                            │
│  │  - 30 day limit │         │  - GitHub API   │                            │
│  │  (FREE)         │         │  - GLM AI API   │                            │
│  │                 │         │  - Clerk Auth   │                            │
│  │  OR             │         │                 │                            │
│  │                 │         │                 │                            │
│  │  - Starter $7   │         │                 │                            │
│  │  - Persistent   │         │                 │                            │
│  └─────────────────┘         └─────────────────┘                            │
│                                                                              │
│  ┌─────────────────┐                                                        │
│  │  Vercel/Render  │  (Frontend - Next.js)                                  │
│  │  Static Site    │  - Free tier works great                               │
│  └─────────────────┘                                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Single Service vs Separate Worker

**Option A: Combined (Recommended for Free Tier)**
- API + Worker in same service
- Simpler, uses less resources
- Worker runs in-process with BullMQ

**Option B: Separate Services (Better for Scale)**
- API service + Worker service
- Each gets 750 hours
- Better isolation but more complex

---

## Step-by-Step Deployment

### Prerequisites

1. [Render.com account](https://render.com)
2. GitHub repository with SnapDocs code
3. GitHub App created and configured
4. GLM API key

### Step 1: Create PostgreSQL Database

1. Go to Render Dashboard → **New** → **PostgreSQL**
2. Configure:
   - **Name**: `snapdocs-db`
   - **Database**: `snapdocs`
   - **User**: `snapdocs_user`
   - **Region**: Choose closest to your users
   - **Plan**: Free (⚠️ expires in 30 days) or Starter ($7/month)
3. Click **Create Database**
4. Copy the **Internal Database URL** (starts with `postgres://`)

### Step 2: Create Redis (Key Value Store)

1. Go to Render Dashboard → **New** → **Key Value**
2. Configure:
   - **Name**: `snapdocs-redis`
   - **Region**: Same as database
   - **Plan**: Free (25MB) or Starter ($10/month for 100MB)
3. Click **Create Key Value**
4. Copy the **Internal Redis URL**

### Step 3: Create Web Service (Backend)

1. Go to Render Dashboard → **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `snapdocs-api`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Root Directory**: `apps/backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Plan**: Free

4. Add Environment Variables (see next section)
5. Click **Create Web Service**

### Step 4: Create Static Site (Frontend) - Optional

1. Go to Render Dashboard → **New** → **Static Site**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `snapdocs-web`
   - **Branch**: `main`
   - **Root Directory**: `apps/frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `out` or `.next` (depending on config)

---

## Environment Configuration

### Backend Environment Variables

In Render Web Service → Environment:

```env
# Application
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://snapdocs-web.onrender.com

# Database (from Render PostgreSQL)
DATABASE_URL=postgres://snapdocs_user:PASSWORD@HOSTNAME:5432/snapdocs

# Redis (from Render Key Value - Internal URL)
REDIS_HOST=red-xxxxxxxxx
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Clerk Auth
CLERK_SECRET_KEY=sk_live_xxxxx
CLERK_PUBLISHABLE_KEY=pk_live_xxxxx

# GitHub App
GITHUB_APP_ID=123456
GITHUB_APP_SLUG=snapdocs
GITHUB_CLIENT_ID=Iv1.xxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxx
GITHUB_WEBHOOK_SECRET=whsec_xxxxx
# For multiline private key, use Render's secret file feature or encode as base64
GITHUB_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----

# GLM AI
GLM_API_KEY=your_glm_api_key
GLM_BASE_URL=https://api.z.ai/api
GLM_MODEL=glm-4.5-flash
```

### Handling GitHub Private Key

The GitHub private key is multiline. Options:

**Option 1: Escape newlines**
```env
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\nmore...\n-----END RSA PRIVATE KEY-----"
```

**Option 2: Base64 encode**
```bash
# Encode
cat private-key.pem | base64

# In .env
GITHUB_PRIVATE_KEY_BASE64=LS0tLS1CRUdJTi...

# In code
const privateKey = Buffer.from(process.env.GITHUB_PRIVATE_KEY_BASE64, 'base64').toString('utf-8');
```

**Option 3: Render Secret Files**
1. Go to Web Service → Environment → Secret Files
2. Add file: `/etc/secrets/github-private-key.pem`
3. Paste the private key content
4. In code: `fs.readFileSync('/etc/secrets/github-private-key.pem', 'utf-8')`

### render.yaml (Infrastructure as Code)

Create `render.yaml` in project root:

```yaml
services:
  # Backend API + Worker
  - type: web
    name: snapdocs-api
    runtime: node
    region: oregon
    plan: free
    rootDir: apps/backend
    buildCommand: npm install && npm run build
    startCommand: npm run start:prod
    healthCheckPath: /api/v1/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: DATABASE_URL
        fromDatabase:
          name: snapdocs-db
          property: connectionString
      - key: REDIS_HOST
        fromService:
          name: snapdocs-redis
          type: kvs
          property: host
      - key: REDIS_PORT
        fromService:
          name: snapdocs-redis
          type: kvs
          property: port
      - key: CLERK_SECRET_KEY
        sync: false  # Set manually
      - key: GITHUB_APP_ID
        sync: false
      - key: GITHUB_WEBHOOK_SECRET
        sync: false
      - key: GITHUB_PRIVATE_KEY
        sync: false
      - key: GLM_API_KEY
        sync: false

  # Frontend (Optional)
  - type: web
    name: snapdocs-web
    runtime: static
    region: oregon
    plan: free
    rootDir: apps/frontend
    buildCommand: npm install && npm run build
    staticPublishPath: out
    headers:
      - path: /*
        name: X-Frame-Options
        value: DENY

databases:
  - name: snapdocs-db
    plan: free  # Change to starter for persistence
    region: oregon

# Redis Key Value Store
# Note: KVS must be created manually in dashboard
# render.yaml doesn't fully support KVS yet
```

---

## Cost Optimization

### Free Tier Optimization Tips

#### 1. Prevent Cold Starts (Critical for Webhooks)

Use an external service to ping your API every 14 minutes:

**Option A: UptimeRobot (Free)**
1. Sign up at [uptimerobot.com](https://uptimerobot.com)
2. Add HTTP monitor for `https://snapdocs-api.onrender.com/api/v1/health`
3. Set interval to 5 minutes

**Option B: Cron-job.org (Free)**
1. Sign up at [cron-job.org](https://cron-job.org)
2. Create job hitting your health endpoint every 14 minutes

**Option C: GitHub Actions (Free)**
```yaml
# .github/workflows/keepalive.yml
name: Keep Render Alive
on:
  schedule:
    - cron: '*/14 * * * *'  # Every 14 minutes
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping API
        run: curl -f https://snapdocs-api.onrender.com/api/v1/health || exit 0
```

#### 2. Optimize Memory Usage

```typescript
// In main.ts - reduce memory footprint
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'], // Reduce logging in production
  });
  
  // ... rest of config
}
```

#### 3. Limit Concurrent Jobs

```typescript
// In bullmq.module.ts
@Processor('generateDocs', {
  concurrency: 1, // Process one job at a time to save memory
})
```

#### 4. Handle Database Expiration

Create a script to backup before expiration:

```bash
#!/bin/bash
# backup-db.sh - Run before 30-day expiration

# Export from Render
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Import to new free instance
psql $NEW_DATABASE_URL < backup_$(date +%Y%m%d).sql
```

### Minimum Viable Paid Setup

For actual production use, minimum recommended:

| Service | Plan | Cost/Month |
|---------|------|------------|
| Web Service | Starter | $7 |
| PostgreSQL | Starter | $7 |
| Redis | Starter | $10 |
| **Total** | | **$24/month** |

This gives you:
- 512MB-1GB RAM (no sleep)
- Persistent database
- 100MB Redis
- Better performance

---

## Scaling Beyond Free Tier

### When to Upgrade

Upgrade when you see:
- Webhook failures > 20%
- Memory errors in logs
- Job queue backing up
- Cold start complaints from users

### Scaling Path

```
Phase 1: Hobby ($0/month)
├── Free Web Service
├── Free PostgreSQL (30-day)
└── Free Redis (25MB)
    │
    │ Upgrade triggers:
    │ - Need data persistence
    │ - > 100 PRs/month
    │
    ▼
Phase 2: Starter ($24/month)
├── Starter Web ($7)
├── Starter PostgreSQL ($7)
└── Starter Redis ($10)
    │
    │ Upgrade triggers:
    │ - > 500 PRs/month
    │ - Need better latency
    │
    ▼
Phase 3: Standard ($50-100/month)
├── Standard Web ($25)
│   └── 1GB RAM, auto-scaling
├── Standard PostgreSQL ($20)
│   └── 10GB storage
└── Standard Redis ($20)
    └── 1GB memory
    │
    │ Upgrade triggers:
    │ - Multi-tenant SaaS
    │ - > 2000 PRs/month
    │
    ▼
Phase 4: Pro/Custom
├── Dedicated resources
├── Read replicas
└── Multi-region
```

---

## Monitoring & Maintenance

### Health Check Endpoint

Ensure this is implemented:

```typescript
// src/health/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bullQueue: BullQueueService,
  ) {}

  @Get()
  async check() {
    const dbHealthy = await this.checkDatabase();
    const redisHealthy = await this.checkRedis();

    return {
      status: dbHealthy && redisHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'up' : 'down',
        redis: redisHealthy ? 'up' : 'down',
      },
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      const stats = await this.bullQueue.getQueueStats();
      return true;
    } catch {
      return false;
    }
  }
}
```

### Render Dashboard Monitoring

1. **Metrics Tab**: CPU, Memory, Request count
2. **Logs Tab**: Real-time application logs
3. **Events Tab**: Deploy history, scaling events

### Alerting (Free Options)

1. **Render Native**: Email alerts for deploy failures
2. **UptimeRobot**: Alerts when health check fails
3. **Better Stack** (free tier): Log aggregation + alerts

### Log Aggregation

For free tier, use console logging. For paid:

```typescript
// In main.ts
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

const app = await NestFactory.create(AppModule, {
  logger: WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    ],
  }),
});
```

---

## Troubleshooting

### Common Issues

#### 1. Webhook Timeouts (502/504)

**Cause**: Cold start taking too long

**Solution**:
```typescript
// In webhooks.controller.ts
@Post('github')
@HttpCode(200)
async handleGitHubWebhook(...) {
  // Immediately respond, process async
  this.processWebhookAsync(payload).catch(err => 
    this.logger.error('Async webhook processing failed', err)
  );
  
  return { success: true, message: 'Webhook queued' };
}

private async processWebhookAsync(payload: any) {
  // Actual processing here
}
```

Or use keep-alive pinging (recommended).

#### 2. Memory Exceeded (OOM)

**Cause**: Large PR diffs consuming too much memory

**Solution**:
```typescript
// In diff-analyzer.service.ts
analyzeDiff(files: GitHubFile[]): AnalyzedDiff {
  // Limit files processed
  const limitedFiles = files.slice(0, 50);
  
  // Truncate large patches
  const processedFiles = limitedFiles.map(f => ({
    ...f,
    patch: f.patch?.substring(0, 5000), // Limit patch size
  }));
  
  return this.processFiles(processedFiles);
}
```

#### 3. Database Connection Errors

**Cause**: Connection pool exhaustion

**Solution**:
```typescript
// In prisma.service.ts
const adapter = new PrismaPg({
  connectionString: configService.get<string>('database.url'),
  max: 3, // Limit connections for free tier
});
```

#### 4. Redis Connection Refused

**Cause**: Using external URL instead of internal

**Solution**: Use the **Internal Redis URL** from Render dashboard, not the external one.

#### 5. Build Failures

**Cause**: Node version mismatch

**Solution**: Add `.node-version` or `.nvmrc`:
```
20.11.0
```

Or in `package.json`:
```json
{
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### Debug Checklist

```bash
# 1. Check service logs
render logs snapdocs-api --tail 100

# 2. Verify environment variables
# Go to Render Dashboard → Service → Environment

# 3. Test database connection
# Use Render's Shell feature or add debug endpoint

# 4. Check queue status
# Add endpoint to expose queue stats

# 5. Verify GitHub webhook
# Check GitHub App → Advanced → Recent Deliveries
```

---

## Summary

### Free Tier Verdict

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Development** | ⭐⭐⭐⭐⭐ | Perfect for testing |
| **Hobby/Personal** | ⭐⭐⭐ | Works with workarounds |
| **Production** | ⭐ | Not recommended |

### Recommendations

1. **For Development**: Use free tier with keep-alive ping
2. **For Side Project**: Use free tier + accept 30-day DB reset
3. **For Production**: Minimum $24/month (Starter tier all services)
4. **For SaaS**: $50-100/month (Standard tier)

### Quick Start Commands

```bash
# 1. Deploy via render.yaml
render blueprint apply

# 2. Or manually via CLI
render services create --name snapdocs-api --type web

# 3. Check status
render services list

# 4. View logs
render logs snapdocs-api --tail
```

### Next Steps

1. Create Render account
2. Set up PostgreSQL and Redis
3. Deploy backend service
4. Configure environment variables
5. Update GitHub App webhook URL to Render URL
6. Set up keep-alive monitoring
7. Test with a real PR merge

Good luck with your deployment! 🚀
