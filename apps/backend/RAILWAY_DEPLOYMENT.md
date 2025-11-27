# SnapDocs Deployment Guide - Railway (Free Trial)

> Complete guide for deploying SnapDocs to Railway.app using the **FREE $5 trial credit** - no credit card required!

---

## Table of Contents

1. [Free Trial Overview](#free-trial-overview)
2. [Free Trial Architecture](#free-trial-architecture)
3. [Maximizing Your $5 Credit](#maximizing-your-5-credit)
4. [Prerequisites](#prerequisites)
5. [Step-by-Step Deployment](#step-by-step-deployment)
6. [Environment Configuration](#environment-configuration)
7. [Database Setup](#database-setup)
8. [Redis Setup](#redis-setup)
9. [Cost-Saving Optimizations](#cost-saving-optimizations)
10. [Monitoring Usage](#monitoring-usage)
11. [When Credits Run Out](#when-credits-run-out)
12. [Troubleshooting](#troubleshooting)

---

## Free Trial Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   RAILWAY FREE TRIAL - $5 CREDIT                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ✅ NO CREDIT CARD REQUIRED                                             │
│  ✅ FULL ACCESS TO ALL FEATURES                                         │
│  ✅ PostgreSQL, Redis, Web Services included                            │
│  ✅ 500 hours of execution time                                         │
│  ✅ Perfect for development & testing                                   │
│                                                                         │
│  💰 $5 ONE-TIME CREDIT BREAKDOWN:                                       │
│  ├── ~500 hours of 0.1 vCPU service                                    │
│  ├── ~2-3 weeks with optimized setup                                   │
│  └── Enough to fully test SnapDocs                                     │
│                                                                         │
│  ⚠️  LIMITATIONS:                                                       │
│  ├── Services stop when $5 exhausted                                   │
│  ├── No custom domains on free trial                                   │
│  ├── Max 500MB RAM per service                                         │
│  └── GitHub/email verification required                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### What $5 Gets You

| Resource | Cost | $5 Gets You |
|----------|------|-------------|
| **vCPU** | $0.000463/min | ~180 hours @ 1 vCPU |
| **RAM** | $0.000231/min | ~360 hours @ 1GB |
| **Disk** | $0.000231/min | ~360 hours @ 1GB |

### Optimized Free Trial Setup

| Service | Resources | Daily Cost | Days on $5 |
|---------|-----------|------------|------------|
| Backend | 0.1 vCPU, 256MB | ~$0.15/day | |
| PostgreSQL | 0.1 vCPU, 256MB | ~$0.10/day | |
| Redis | 0.1 vCPU, 128MB | ~$0.08/day | |
| **Total** | | **~$0.33/day** | **~15 days** |

> **Pro Tip:** Skip frontend on Railway, deploy to Vercel FREE instead = **~21 days!**

---

## Free Trial Architecture

### Recommended: Minimal Setup (Backend Only on Railway)

```
┌─────────────────────────────────────────────────────────────────────────┐
│              FREE TRIAL OPTIMIZED ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   🆓 VERCEL (FREE)                    🆓 RAILWAY ($5 credit)            │
│   ┌──────────────┐                   ┌─────────────────────────────┐   │
│   │   Frontend   │                   │   Railway Project           │   │
│   │   (Next.js)  │                   │                             │   │
│   │              │                   │   ┌───────────────────┐     │   │
│   │  - FREE tier │◄─────────────────►│   │     Backend       │     │   │
│   │  - Unlimited │    API calls      │   │     (NestJS)      │     │   │
│   │  - Global CDN│                   │   │   0.1 CPU, 256MB  │     │   │
│   └──────────────┘                   │   └─────────┬─────────┘     │   │
│                                      │             │               │   │
│                                      │   ┌─────────▼─────────┐     │   │
│                                      │   │   PostgreSQL      │     │   │
│                                      │   │   0.1 CPU, 256MB  │     │   │
│                                      │   └───────────────────┘     │   │
│                                      │                             │   │
│                                      │   ┌───────────────────┐     │   │
│                                      │   │      Redis        │     │   │
│                                      │   │   0.1 CPU, 128MB  │     │   │
│                                      │   └───────────────────┘     │   │
│                                      │                             │   │
│                                      └─────────────────────────────┘   │
│                                                                         │
│   Cost: $0/month (Vercel) + ~$0.33/day (Railway) = ~15-21 days free    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Alternative: Full Stack on Railway (Shorter Trial)

```
┌─────────────────────────────────────────────────────────────────────────┐
│   Railway Project (all services) - ~10-12 days on $5                    │
│                                                                         │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│   │   Backend    │  │  PostgreSQL  │  │    Redis     │                 │
│   │   0.1 CPU    │  │   0.1 CPU    │  │   0.1 CPU    │                 │
│   │   256MB      │  │   256MB      │  │   128MB      │                 │
│   └──────────────┘  └──────────────┘  └──────────────┘                 │
│                                                                         │
│   ┌──────────────┐                                                      │
│   │   Frontend   │  ← Adds ~$0.12/day = fewer days                     │
│   │   0.1 CPU    │                                                      │
│   │   256MB      │                                                      │
│   └──────────────┘                                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Maximizing Your $5 Credit

### Strategy 1: Backend Only on Railway (RECOMMENDED)

Deploy frontend to **Vercel FREE tier** to maximize Railway credits.

| Where | What | Cost |
|-------|------|------|
| **Vercel** | Next.js Frontend | $0 (FREE forever) |
| **Railway** | NestJS + PostgreSQL + Redis | ~$0.33/day |

**Result:** ~15-21 days of free usage

### Strategy 2: Pause Services When Not Testing

```bash
# Stop all services (via Railway Dashboard)
# Services → Click service → Settings → "Pause Service"

# Or delete and redeploy when needed
```

### Strategy 3: Minimal Resources

Configure each service with minimum resources:

| Service | CPU | RAM | Why |
|---------|-----|-----|-----|
| Backend | 0.1 vCPU | 256MB | NestJS runs fine |
| PostgreSQL | 0.1 vCPU | 256MB | Minimum for Prisma |
| Redis | 0.1 vCPU | 128MB | BullMQ needs little |

### Strategy 4: Use External Free Services

| Service | Free Alternative |
|---------|------------------|
| Frontend | Vercel (FREE) |
| Redis | Upstash (10K/day FREE) |
| Database | Neon.tech (FREE tier) |

**Most Aggressive:** Backend only on Railway + Vercel + Upstash + Neon = **$5 lasts 30+ days**

---

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Account**: For repository connection
3. **GitHub App**: Created and configured for SnapDocs
4. **API Keys**:
   - Clerk Secret Key
   - GLM API Key
   - GitHub App credentials

---

## Step-by-Step Deployment

### Step 1: Create Railway Project

1. Go to [railway.app/dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Empty Project"**
4. Name it `snapdocs`

### Step 2: Add PostgreSQL Database

1. In your project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway automatically provisions and configures it
4. Click on the PostgreSQL service to see connection details

**Connection variables auto-generated:**
- `DATABASE_URL` - Full connection string
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

### Step 3: Add Redis

1. Click **"+ New"**
2. Select **"Database"** → **"Add Redis"**
3. Railway provisions Redis automatically

**Connection variables auto-generated:**
- `REDIS_URL` - Full connection string
- `REDISHOST`, `REDISPORT`, `REDISUSER`, `REDISPASSWORD`

### Step 4: Deploy Backend Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your SnapDocs repository
3. Configure the service:

**Settings Tab:**
```
Root Directory: apps/backend
Build Command: npm install && npm run build
Start Command: npm run start:prod
```

4. Go to **Variables** tab and add environment variables (see next section)

### Step 5: Deploy Frontend Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select the same repository
3. Configure:

**Settings Tab:**
```
Root Directory: apps/frontend
Build Command: npm install && npm run build
Start Command: npm run start
```

4. Add frontend environment variables

### Step 6: Connect Services

Railway automatically creates internal networking. Reference other services using variables:

```
# In Backend service, reference database
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Reference Redis
REDIS_URL=${{Redis.REDIS_URL}}
```

---

## Environment Configuration

### Backend Environment Variables

In Railway Dashboard → Backend Service → Variables:

```env
# Application
NODE_ENV=production
PORT=3001
FRONTEND_URL=${{Frontend.RAILWAY_PUBLIC_DOMAIN}}

# Database (auto-linked from PostgreSQL service)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (auto-linked from Redis service)
REDIS_URL=${{Redis.REDIS_URL}}

# Parse Redis URL for BullMQ (if needed separately)
REDIS_HOST=${{Redis.REDISHOST}}
REDIS_PORT=${{Redis.REDISPORT}}
REDIS_PASSWORD=${{Redis.REDISPASSWORD}}

# Clerk Authentication
CLERK_SECRET_KEY=sk_live_xxxxx
CLERK_PUBLISHABLE_KEY=pk_live_xxxxx

# GitHub App
GITHUB_APP_ID=123456
GITHUB_APP_SLUG=snapdocs
GITHUB_CLIENT_ID=Iv1.xxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxx
GITHUB_WEBHOOK_SECRET=whsec_xxxxx
GITHUB_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----

# GLM AI
GLM_API_KEY=your_glm_api_key
GLM_BASE_URL=https://api.z.ai/api
GLM_MODEL=glm-4.5-flash
```

### Frontend Environment Variables

```env
# API URL (reference backend service)
NEXT_PUBLIC_API_URL=https://${{Backend.RAILWAY_PUBLIC_DOMAIN}}/api/v1

# Clerk (public keys only)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

### Railway Variable References

Railway supports referencing other services:

```
${{ServiceName.VARIABLE_NAME}}

Examples:
${{Postgres.DATABASE_URL}}
${{Redis.REDIS_URL}}
${{Backend.RAILWAY_PUBLIC_DOMAIN}}
```

---

## Database Setup

### Run Prisma Migrations

**Option 1: Via Railway CLI**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Run migrations
railway run npx prisma migrate deploy
```

**Option 2: Via package.json script**

Add to `apps/backend/package.json`:

```json
{
  "scripts": {
    "start:prod": "npx prisma migrate deploy && node dist/main.js"
  }
}
```

This runs migrations on every deploy.

**Option 3: One-time via Railway Shell**

1. Go to Backend service → **"Shell"** tab
2. Run:
```bash
npx prisma migrate deploy
```

### Seed Database (Optional)

```bash
railway run npx prisma db seed
```

---

## Redis Setup

### BullMQ Configuration for Railway

Update `apps/backend/src/bullmq/bullmq.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        
        // Parse Railway's Redis URL
        if (redisUrl) {
          const url = new URL(redisUrl);
          return {
            connection: {
              host: url.hostname,
              port: parseInt(url.port, 10),
              password: url.password || undefined,
              username: url.username || 'default',
              tls: url.protocol === 'rediss:' ? {} : undefined,
            },
          };
        }

        // Fallback for local development
        return {
          connection: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
            password: configService.get('REDIS_PASSWORD'),
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: 'generateDocs' }),
  ],
  // ... rest of module
})
export class BullmqModule {}
```

---

## Monitoring Usage

### Check Your Credit Balance

1. Go to **Railway Dashboard** → **Usage** tab
2. See remaining credits and daily burn rate
3. Estimate days remaining

### View Logs

1. Go to Service → **"Logs"** tab
2. Real-time streaming logs

### Health Check (Recommended)

```typescript
// src/health/health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

---

## When Credits Run Out

### What Happens

1. Services **stop** (not deleted)
2. Data in PostgreSQL/Redis is **preserved**
3. You can't deploy until you add credits

### Options When $5 Exhausted

| Option | Cost | Notes |
|--------|------|-------|
| **Hobby Plan** | $5/month | Includes $5 usage credits |
| **Migrate to free services** | $0 | Neon + Upstash + Vercel |
| **Export data & delete** | $0 | Download DB backup first |

### Export Your Data Before Deletion

```bash
# Backup PostgreSQL
railway run pg_dump $DATABASE_URL > backup.sql

# Or use Prisma
railway run npx prisma db pull
```

---

## Cost-Saving Optimizations

### 1. Use Minimum Resources

Railway auto-scales, but you can set limits to save credits:

```
# In Railway Dashboard → Service → Settings → Resources
vCPU: 0.1 (minimum)
RAM: 256MB (minimum for NestJS)
```

### 2. Deploy Frontend to Vercel (FREE)

Don't waste Railway credits on frontend:

```bash
# Deploy frontend to Vercel
cd apps/frontend
npx vercel

# Set environment variable
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app/api/v1
```

### 3. Use Upstash Redis Instead (FREE)

Skip Railway Redis, use Upstash free tier:

1. Sign up at [upstash.com](https://upstash.com)
2. Create Redis database (FREE: 10K commands/day)
3. Use Upstash URL in Railway:

```env
REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379
```

**Savings:** ~$0.08/day = extends trial by ~3 days

### 4. Use Neon PostgreSQL (FREE)

Skip Railway PostgreSQL, use Neon free tier:

1. Sign up at [neon.tech](https://neon.tech)
2. Create PostgreSQL database (FREE: 0.5GB)
3. Use Neon URL in Railway:

```env
DATABASE_URL=postgresql://user:pass@xxx.neon.tech/snapdocs
```

**Savings:** ~$0.10/day = extends trial by ~4 days

### 5. Pause When Not Using

```
Railway Dashboard → Service → Settings → "Pause Service"
```

Services don't consume credits when paused.

### Maximum Free Setup

| Service | Provider | Cost |
|---------|----------|------|
| Backend | Railway | ~$0.15/day |
| PostgreSQL | Neon.tech | FREE |
| Redis | Upstash | FREE |
| Frontend | Vercel | FREE |
| **Total** | | **~$0.15/day = 33 days!** |

---

## Troubleshooting

### Common Issues

#### 1. Build Fails: "Cannot find module"

**Cause:** Dependencies not installed or wrong root directory

**Solution:**
```bash
# Ensure root directory is correct
Root Directory: apps/backend

# Check build command
Build Command: npm install && npm run build
```

#### 2. Database Connection Refused

**Cause:** Using external URL instead of internal

**Solution:**
```env
# Use Railway's variable reference
DATABASE_URL=${{Postgres.DATABASE_URL}}

# NOT a hardcoded external URL
```

#### 3. Redis Connection Failed

**Cause:** TLS required but not configured

**Solution:**
```typescript
// In BullMQ config
connection: {
  host: url.hostname,
  port: parseInt(url.port, 10),
  password: url.password,
  tls: {}, // Enable TLS for Railway Redis
}
```

#### 4. Prisma Migration Fails

**Cause:** Database not ready during build

**Solution:**
```json
// Run migration at start, not build
{
  "scripts": {
    "start:prod": "npx prisma migrate deploy && node dist/main.js"
  }
}
```

#### 5. Out of Memory

**Cause:** Service exceeds RAM limit

**Solution:**
1. Increase RAM in Service → Settings
2. Optimize code (reduce concurrent jobs, add pagination)
3. Add swap (not available on Railway, optimize instead)

#### 6. Webhook Timeouts

**Cause:** Processing takes too long

**Solution:**
```typescript
// Return immediately, process async
@Post('github')
async handleWebhook(@Body() payload) {
  // Queue job and return fast
  await this.queueService.addJob(payload);
  return { success: true, message: 'Queued' };
}
```

### Debug Commands

```bash
# Railway CLI debugging
railway login
railway link
railway status
railway logs
railway shell  # Interactive shell in service

# Run one-off commands
railway run npx prisma studio
railway run npm run test
```

### Check Service Health

```bash
# Via curl
curl https://your-backend.railway.app/api/v1/health

# Expected response
{"status":"ok","timestamp":"2024-01-15T10:30:00.000Z"}
```

---

## Quick Reference

### Railway CLI Commands

```bash
# Install
npm install -g @railway/cli

# Auth
railway login
railway logout

# Project
railway init          # Create new project
railway link          # Link to existing project
railway status        # View project status

# Development
railway run <cmd>     # Run command with Railway env
railway shell         # Open shell in service
railway logs          # View logs

# Deployment
railway up            # Deploy current directory
railway down          # Stop services
```

### Project Structure

```
snapdocs/
├── apps/
│   ├── backend/          # Railway Service 1
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   └── frontend/         # Railway Service 2
│       ├── package.json
│       └── src/
├── railway.json          # Optional: Railway config
└── package.json
```

### Optional: railway.json

Create in project root for config-as-code:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## Deployment Checklist

- [ ] Create Railway project
- [ ] Add PostgreSQL database
- [ ] Add Redis
- [ ] Deploy backend service (apps/backend)
- [ ] Configure backend environment variables
- [ ] Run Prisma migrations
- [ ] Deploy frontend service (apps/frontend)
- [ ] Configure frontend environment variables
- [ ] Add custom domains
- [ ] Update GitHub App webhook URL
- [ ] Test webhook flow
- [ ] Set spending limits
- [ ] Configure health checks

---

## Summary

### Free Trial Quick Reference

| Setup | Daily Cost | Days on $5 |
|-------|------------|------------|
| **Full stack on Railway** | ~$0.45/day | ~11 days |
| **Backend only (Vercel frontend)** | ~$0.33/day | ~15 days |
| **Backend + external DBs** | ~$0.15/day | ~33 days |

### Recommended Free Trial Setup

```
✅ Backend (NestJS)     → Railway      (~$0.15/day)
✅ PostgreSQL           → Neon.tech    (FREE)
✅ Redis                → Upstash      (FREE)
✅ Frontend (Next.js)   → Vercel       (FREE)

Total: ~$0.15/day = 33+ days of free testing!
```

### Free Trial Checklist

- [ ] Sign up at railway.app (get $5 credit)
- [ ] Create project with backend service only
- [ ] Set up Neon.tech for PostgreSQL (FREE)
- [ ] Set up Upstash for Redis (FREE)
- [ ] Deploy frontend to Vercel (FREE)
- [ ] Monitor usage in Railway dashboard
- [ ] Pause services when not testing

### After Free Trial

| Path | Cost | Best For |
|------|------|----------|
| Hobby Plan | $5/month + usage | Continued development |
| Stay 100% free | $0 | Neon + Upstash + Vercel + free compute |
| Production | ~$15-25/month | Real users |

Good luck with your free deployment! 🚀
