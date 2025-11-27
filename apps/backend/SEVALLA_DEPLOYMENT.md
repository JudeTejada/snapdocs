# SnapDocs Deployment Guide - Sevalla

> Complete guide for deploying SnapDocs (Backend + Frontend) to Sevalla (by Kinsta)

---

## Table of Contents

1. [Why Sevalla](#why-sevalla)
2. [Pricing Overview](#pricing-overview)
3. [Architecture](#architecture)
4. [Prerequisites](#prerequisites)
5. [Step-by-Step Deployment](#step-by-step-deployment)
6. [Database Setup (PostgreSQL)](#database-setup-postgresql)
7. [Redis Setup](#redis-setup)
8. [Backend Deployment](#backend-deployment)
9. [Frontend Deployment](#frontend-deployment)
10. [Environment Configuration](#environment-configuration)
11. [Custom Domain & SSL](#custom-domain--ssl)
12. [Monitoring & Logs](#monitoring--logs)
13. [Cost Optimization](#cost-optimization)
14. [Troubleshooting](#troubleshooting)

---

## Why Sevalla

Sevalla is a PaaS platform by Kinsta, built on Google Kubernetes Engine with Cloudflare integration.

| Feature | Sevalla | Why It's Good for SnapDocs |
|---------|---------|----------------------------|
| **Kubernetes-based** | GKE under the hood | Production-grade reliability |
| **Cloudflare CDN** | Built-in | Global edge, DDoS protection |
| **PostgreSQL** | Managed, auto-backups | No DB management needed |
| **Redis** | Managed | Perfect for BullMQ |
| **Hibernation** | Pause unused pods | Save money on dev environments |
| **25 Data Centers** | Global | Low latency worldwide |
| **$50 Free Credit** | Trial | Test before committing |
| **Prisma Support** | First-class | Works great with NestJS |

---

## Pricing Overview

### Sevalla Pricing Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SEVALLA PRICING (2024)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  FREE TRIAL: $50 credit (no credit card required)                       │
│  ├── Good for ~2-4 weeks of testing                                     │
│  └── Full access to all features                                        │
│                                                                         │
│  APPLICATION HOSTING (Runtime Pods):                                    │
│  ├── Hobby:    $5/month   (0.3 CPU, 0.3GB RAM)                         │
│  ├── Standard: $18/month  (1 CPU, 1GB RAM)                             │
│  ├── Standard: $36/month  (2 CPU, 2GB RAM)                             │
│  ├── Standard: $80/month  (4 CPU, 4GB RAM)                             │
│  └── Memory/CPU optimized tiers available                              │
│                                                                         │
│  DATABASE HOSTING:                                                      │
│  ├── DB 1:  $5/month   (0.25 CPU, 0.25GB RAM, 1GB storage)            │
│  ├── DB 2:  $34/month  (0.5 CPU, 2GB RAM, 5GB storage)                 │
│  ├── DB 3:  $65/month  (1 CPU, 4GB RAM, 10GB storage)                  │
│  └── Higher tiers available                                            │
│                                                                         │
│  ADDITIONAL COSTS:                                                      │
│  ├── Build time:     $0.02/minute                                      │
│  ├── Bandwidth:      $0.10/GB (external), internal FREE                │
│  ├── Extra storage:  $10/month per 10GB                                │
│  └── Object storage: $0.02/GB/month                                    │
│                                                                         │
│  STATIC SITES: FREE (up to 100 sites, 1GB each)                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Estimated Monthly Cost for SnapDocs

| Service | Tier | Estimated Cost |
|---------|------|----------------|
| **Backend (NestJS + Worker)** | Standard (1 CPU, 1GB) | $18/month |
| **PostgreSQL** | DB 1 (0.25 CPU, 1GB) | $5/month |
| **Redis** | DB 1 (0.25 CPU, 1GB) | $5/month |
| **Frontend (Next.js)** | Hobby or Static | $0-5/month |
| **Build time** | ~10 builds/month | ~$2/month |
| **Bandwidth** | ~10GB external | ~$1/month |
| **Total** | | **~$31-36/month** |

### Budget-Friendly Setup

For lower costs, use Hobby tier:

| Service | Tier | Cost |
|---------|------|------|
| Backend | Hobby (0.3 CPU, 0.3GB) | $5/month |
| PostgreSQL | DB 1 | $5/month |
| Redis | DB 1 | $5/month |
| Frontend | Static (FREE) | $0/month |
| **Total** | | **~$15-18/month** |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     SEVALLA PROJECT ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                        ┌─────────────────┐                              │
│                        │   Cloudflare    │                              │
│                        │   CDN + WAF     │                              │
│                        └────────┬────────┘                              │
│                                 │                                       │
│   ┌─────────────────────────────┼─────────────────────────────┐        │
│   │           Sevalla Project: "snapdocs"                      │        │
│   │                             │                              │        │
│   │   ┌─────────────────────────┼─────────────────────────┐   │        │
│   │   │                         │                          │   │        │
│   │   │   ┌──────────────┐      │      ┌──────────────┐   │   │        │
│   │   │   │   Backend    │      │      │   Frontend   │   │   │        │
│   │   │   │   App        │◄─────┴─────►│   App        │   │   │        │
│   │   │   │              │             │   (Static)   │   │   │        │
│   │   │   │  - NestJS    │             │              │   │   │        │
│   │   │   │  - API       │             │  - Next.js   │   │   │        │
│   │   │   │  - Worker    │             │  - SSG       │   │   │        │
│   │   │   └──────┬───────┘             └──────────────┘   │   │        │
│   │   │          │                                         │   │        │
│   │   │          │ Private Network                         │   │        │
│   │   │          │                                         │   │        │
│   │   │   ┌──────▼───────┐      ┌──────────────┐          │   │        │
│   │   │   │  PostgreSQL  │      │    Redis     │          │   │        │
│   │   │   │   Database   │      │   Database   │          │   │        │
│   │   │   │              │      │              │          │   │        │
│   │   │   │  - Managed   │      │  - BullMQ    │          │   │        │
│   │   │   │  - Backups   │      │  - Queue     │          │   │        │
│   │   │   └──────────────┘      └──────────────┘          │   │        │
│   │   │                                                    │   │        │
│   │   └────────────────────────────────────────────────────┘   │        │
│   │                                                             │        │
│   └─────────────────────────────────────────────────────────────┘        │
│                                                                          │
│   External Services:                                                     │
│   ├── GitHub API (webhooks, PR data)                                    │
│   ├── GLM AI API (documentation generation)                             │
│   └── Clerk Auth (authentication)                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

1. **Sevalla Account**: Sign up at [sevalla.com](https://sevalla.com) (get $50 free credit)
2. **GitHub Account**: For repository connection
3. **GitHub App**: Created and configured for SnapDocs
4. **API Keys**:
   - Clerk Secret Key
   - GLM API Key
   - GitHub App credentials

---

## Step-by-Step Deployment

### Step 1: Create Sevalla Account

1. Go to [sevalla.com/signup](https://sevalla.com/signup)
2. Sign up with email or GitHub
3. Claim your **$50 free credit**
4. Complete account verification

### Step 2: Create a New Application

1. Go to **Applications** in dashboard
2. Click **"Add application"**
3. Choose **"Import from GitHub"**
4. Authorize Sevalla to access your repository
5. Select your SnapDocs repository

---

## Database Setup (PostgreSQL)

### Create PostgreSQL Database

1. Go to **Databases** in Sevalla dashboard
2. Click **"Add database"**
3. Select **PostgreSQL**
4. Configure:

| Setting | Value |
|---------|-------|
| Database name | `snapdocs-db` |
| Database user | `snapdocs_user` |
| Password | (auto-generated or custom) |
| Region | Same as your app (e.g., `us-east1`) |
| Size | DB 1 ($5/month) for start |

5. Click **"Create database"**

### Get Connection Details

After creation, go to Database → **Connections**:

```
Host: <db-id>.db.sevalla.com
Port: 5432
Database: snapdocs-db
Username: snapdocs_user
Password: ********

# Connection string format:
postgresql://snapdocs_user:PASSWORD@<db-id>.db.sevalla.com:5432/snapdocs-db
```

### Internal vs External Connections

- **Internal**: Use for app-to-db within Sevalla (faster, secure)
- **External**: Use for local development or migrations

```
# Internal connection (use in your app)
DATABASE_URL=postgresql://user:pass@internal-host:5432/db

# External connection (for local prisma commands)
DATABASE_URL=postgresql://user:pass@external-host:5432/db
```

---

## Redis Setup

### Create Redis Database

1. Go to **Databases** → **"Add database"**
2. Select **Redis**
3. Configure:

| Setting | Value |
|---------|-------|
| Database name | `snapdocs-redis` |
| Region | Same as your app |
| Size | DB 1 ($5/month) |

4. Click **"Create database"**

### Get Redis Connection Details

```
Host: <redis-id>.redis.sevalla.com
Port: 6379
Password: ********

# Connection string format:
redis://default:PASSWORD@<redis-id>.redis.sevalla.com:6379
```

---

## Backend Deployment

### Create Backend Application

1. Go to **Applications** → **"Add application"**
2. Select GitHub repository
3. Configure:

| Setting | Value |
|---------|-------|
| Application name | `snapdocs-api` |
| Branch | `main` |
| Root path | `apps/backend` |
| Build pack | Nixpacks (auto-detect) |
| Region | Same as databases |
| Pod size | Standard ($18) or Hobby ($5) |

### Build Settings

Sevalla auto-detects NestJS. If needed, customize:

**Build command:**
```bash
npm install && npx prisma generate && npm run build
```

**Start command:**
```bash
npx prisma migrate deploy && npm run start:prod
```

### Add Dockerfile (Optional)

For more control, add `apps/backend/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
USER nestjs
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
```

### Connect Database to Application

1. Go to Backend App → **Settings** → **Connections**
2. Click **"Add connection"**
3. Select your PostgreSQL database
4. Set environment variable name: `DATABASE_URL`
5. Repeat for Redis with variable: `REDIS_URL`

---

## Frontend Deployment

### Option A: Static Site (FREE)

If using Next.js static export:

1. Go to **Static Sites** → **"Add site"**
2. Connect GitHub repository
3. Configure:

| Setting | Value |
|---------|-------|
| Site name | `snapdocs-web` |
| Branch | `main` |
| Root path | `apps/frontend` |
| Build command | `npm install && npm run build` |
| Publish directory | `out` |

4. Add environment variable:
```
NEXT_PUBLIC_API_URL=https://snapdocs-api.sevalla.app/api/v1
```

### Option B: Application (SSR)

For server-side rendering:

1. Go to **Applications** → **"Add application"**
2. Configure:

| Setting | Value |
|---------|-------|
| Application name | `snapdocs-web` |
| Root path | `apps/frontend` |
| Pod size | Hobby ($5/month) |

---

## Environment Configuration

### Backend Environment Variables

Go to Backend App → **Settings** → **Environment variables**:

```env
# Application
NODE_ENV=production
PORT=3001

# Database (auto-set via connection)
DATABASE_URL=<auto-populated>

# Redis (auto-set via connection)  
REDIS_URL=<auto-populated>

# For BullMQ (parse from REDIS_URL or set separately)
REDIS_HOST=<redis-host>
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password>

# Frontend URL
FRONTEND_URL=https://snapdocs-web.sevalla.app

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
NEXT_PUBLIC_API_URL=https://snapdocs-api.sevalla.app/api/v1
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

### Handling GitHub Private Key

Sevalla supports multiline environment variables. Options:

**Option 1: Escape newlines**
```
GITHUB_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----
```

**Option 2: Base64 encode**
```bash
# Encode locally
cat private-key.pem | base64 -w 0

# Set as env var
GITHUB_PRIVATE_KEY_BASE64=LS0tLS1CRUdJTi4uLg==
```

Then decode in your app:
```typescript
const privateKey = Buffer.from(
  configService.get('GITHUB_PRIVATE_KEY_BASE64'), 
  'base64'
).toString('utf-8');
```

---

## Custom Domain & SSL

### Add Custom Domain

1. Go to App → **Domains**
2. Click **"Add domain"**
3. Enter your domain: `api.snapdocs.app`
4. Add DNS records:

```
Type: CNAME
Name: api
Value: <your-app>.sevalla.app
```

### SSL Certificate

Sevalla automatically provisions SSL via Cloudflare:
- Free SSL certificates
- Auto-renewal
- HTTP → HTTPS redirect

### Recommended Setup

| Service | Domain |
|---------|--------|
| Backend | `api.snapdocs.app` |
| Frontend | `app.snapdocs.app` |

---

## Monitoring & Logs

### View Logs

1. Go to App → **Logs**
2. Filter by:
   - Runtime logs
   - Build logs
   - Deployment logs

### Metrics Dashboard

Sevalla provides:
- CPU usage
- Memory usage
- Network traffic
- Request count
- Response times

### Health Checks

Configure in App → **Settings** → **Health checks**:

| Setting | Value |
|---------|-------|
| Path | `/api/v1/health` |
| Protocol | HTTP |
| Interval | 30 seconds |
| Timeout | 10 seconds |

### Alerts

Set up alerts in **Settings** → **Notifications**:
- Deploy failures
- Health check failures
- Resource usage thresholds

---

## Cost Optimization

### 1. Use Hibernation for Dev Environments

Sevalla can pause pods when not in use:

1. Go to App → **Settings** → **Pods**
2. Enable **"Hibernate when inactive"**
3. Set timeout (e.g., 30 minutes)

**Savings:** Up to 70% on dev/staging environments

### 2. Right-Size Your Pods

Start small and scale up:

```
Development:  Hobby ($5/month)
Staging:      Hobby with hibernation
Production:   Standard ($18/month)
```

### 3. Use Static Sites for Frontend

If your Next.js app can be statically exported:
- Static sites are **FREE** (up to 100 sites)
- 1GB per site, 100GB bandwidth

```bash
# In apps/frontend/package.json
{
  "scripts": {
    "build": "next build && next export"
  }
}
```

### 4. Optimize Build Time

Build time costs $0.02/minute. Optimize:

```dockerfile
# Use Docker layer caching
COPY package*.json ./
RUN npm ci
# Then copy source
COPY . .
```

### 5. Monitor Usage

Go to **Billing** → **Usage** to track:
- Pod hours
- Build minutes
- Bandwidth
- Storage

---

## Troubleshooting

### Common Issues

#### 1. Build Fails: "Cannot find module"

**Cause:** Wrong root path or missing dependencies

**Solution:**
```
Root path: apps/backend
Build command: npm install && npm run build
```

#### 2. Database Connection Refused

**Cause:** Using external URL for internal connection

**Solution:**
1. Use the **internal** connection string
2. Ensure database is in same region as app
3. Check connection is added in Settings → Connections

#### 3. Redis Connection Failed

**Cause:** Missing TLS or wrong credentials

**Solution:**
```typescript
// For Sevalla Redis, TLS may be required
const redisUrl = new URL(process.env.REDIS_URL);
const connection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port),
  password: redisUrl.password,
  tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
};
```

#### 4. Prisma Migration Fails

**Cause:** Database not ready during build

**Solution:** Run migrations at start, not build:
```json
{
  "scripts": {
    "start:prod": "npx prisma migrate deploy && node dist/main.js"
  }
}
```

#### 5. Health Check Failing

**Cause:** App not responding on expected path

**Solution:**
1. Verify health endpoint exists
2. Check PORT environment variable
3. Ensure app binds to `0.0.0.0`

```typescript
// main.ts
await app.listen(process.env.PORT || 3001, '0.0.0.0');
```

#### 6. Out of Memory

**Cause:** Pod size too small

**Solution:**
1. Upgrade to larger pod
2. Optimize memory usage:
   - Reduce concurrent BullMQ jobs
   - Add pagination to DB queries
   - Limit diff sizes sent to AI

### Debug with SSH

Sevalla provides web terminal:

1. Go to App → **Terminal**
2. Run commands directly in the container

```bash
# Check environment
printenv | grep DATABASE

# Test database connection
npx prisma db pull

# Check logs
tail -f /var/log/app.log
```

### Contact Support

Sevalla offers:
- Live chat support
- Email support
- Documentation at [docs.sevalla.com](https://docs.sevalla.com)

---

## Deployment Checklist

- [ ] Create Sevalla account and claim $50 credit
- [ ] Create PostgreSQL database
- [ ] Create Redis database
- [ ] Deploy backend application
- [ ] Connect databases to backend
- [ ] Configure backend environment variables
- [ ] Run Prisma migrations
- [ ] Deploy frontend (static or app)
- [ ] Configure frontend environment variables
- [ ] Add custom domains
- [ ] Configure SSL (automatic)
- [ ] Set up health checks
- [ ] Update GitHub App webhook URL
- [ ] Test webhook flow
- [ ] Configure hibernation for non-prod
- [ ] Set up monitoring alerts

---

## Quick Commands Reference

### Sevalla CLI (optional)

Sevalla primarily uses dashboard, but you can use Git:

```bash
# Deploy via git push (if configured)
git push sevalla main

# Or use GitHub integration (recommended)
git push origin main  # Auto-deploys
```

### Local Development with Sevalla DB

```bash
# Get external connection string from Sevalla dashboard
export DATABASE_URL="postgresql://user:pass@external-host:5432/db"

# Run migrations locally
npx prisma migrate dev

# Open Prisma Studio
npx prisma studio
```

---

## Cost Comparison Summary

| Setup | Monthly Cost |
|-------|--------------|
| **Budget** (Hobby pods) | ~$15-18 |
| **Standard** (1 CPU pods) | ~$31-36 |
| **Production** (2 CPU pods) | ~$50-60 |

### Sevalla vs Others

| Provider | Similar Setup |
|----------|---------------|
| **Sevalla** | ~$31/month (Standard) |
| **Railway** | ~$20-25/month |
| **Render** | ~$24/month |
| **Fly.io** | ~$15-20/month |
| **Heroku** | ~$35-50/month |

**Sevalla Advantages:**
- Cloudflare CDN included
- Kubernetes reliability
- Better support (Kinsta backing)
- More predictable pricing
- 25 global data centers

**Best For:**
- Teams wanting enterprise-grade infrastructure
- Apps needing global presence
- Those who value support quality

---

Good luck with your Sevalla deployment! 🚀
