# SnapDoc - Documentation Automation SaaS Implementation

## Project Overview

Build a Documentation automation SaaS that detects merged PRs, analyzes changes, and generates comprehensive documentation with multiple output channels.

## Tech Stack

- Backend: Node.js + NestJS + PostgreSQL + Prisma + BullMQ
- Frontend: Next.js 14 + ShadCN UI
- AI: OpenAI API (GPT-5) for doc generation
- Auth: Clerk / NextAuth
- Email: Resend or Postmark
- Deployment: Railway/Fly.io (backend), Vercel (frontend)

---

## PHASE 1: GitHub App Setup

### ✅ STEP 1 — Create GitHub App

- [ ] Create GitHub App in GitHub Developer Settings
- [ ] Configure App Permissions:
  - [ ] Pull Requests: Read
  - [ ] Contents: Read
  - [ ] Metadata: Read
  - [ ] Commit Status: Read & Write (optional)
- [ ] Subscribe to Events:
  - [ ] pull_request.closed
  - [ ] pull_request.merged
- [ ] Generate and store App ID, Private Key
- [ ] Set webhook URL for production

---

## PHASE 2: Backend Infrastructure

### ✅ STEP 2 — Webhook Handler (NestJS)

- [ ] Create NestJS project structure
- [ ] Install dependencies:
  - [ ] @nestjs/bullmq
  - [ ] @octokit/rest
  - [ ] @prisma/client
  - [ ] prisma
  - [ ] crypto (for signature verification)
- [ ] Setup Prisma with PostgreSQL
- [ ] Create webhook route: POST /api/webhooks/github
- [ ] Implement GitHub signature verification
- [ ] Extract PR data (repo, number, author, commit SHA)
- [ ] Save minimal PR info to database
- [ ] Push job to BullMQ queue: 'generateDocs'
- [ ] Add error handling and logging

### ✅ STEP 3 — Background Worker (BullMQ)

- [ ] Setup BullMQ queue and worker
- [ ] Implement job processing steps:

#### (1) Fetch PR Diff

- [ ] Use GitHub API to get PR details
- [ ] GET /repos/:owner/:repo/pulls/:pull_number
- [ ] GET /repos/:owner/:repo/pulls/:pull_number/files
- [ ] Extract added/removed lines, changed files, patch content

#### (2) Pre-process Diff

- [ ] Categorize changes:
  - [ ] Models changed (TS, Prisma)
  - [ ] Functions changed
  - [ ] New API routes
  - [ ] Modified logic blocks
  - [ ] Removed code
  - [ ] Comments added

#### (3) AI Documentation Generation

- [ ] Setup OpenAI API integration
- [ ] Create documentation prompt template
- [ ] Process diff in chunks
- [ ] Generate:
  - [ ] High-level summary (2-4 sentences)
  - [ ] What changed and why section
  - [ ] Mini-map style breakdown per file
  - [ ] Code snippet examples (before/after)
  - [ ] Developer instructions
  - [ ] Changelog version update
  - [ ] Breaking change warnings

#### (4) Post-process

- [ ] Clean AI output
- [ ] Remove hallucinations
- [ ] Convert to markdown format
- [ ] Validate content quality

#### (5) Database Storage

- [ ] Save PR ID, summary markdown, code snippets, classified changes
- [ ] Link documentation to PullRequest record

---

## PHASE 3: Output Channels

### ✅ STEP 4 — Output Channels Implementation

#### (A) GitHub PR Comment

- [ ] Post comment back to merged PR
- [ ] Format: "Here is the auto-generated documentation for this PR"
- [ ] Include summary and links to full docs

#### (B) Email Notification

- [ ] Setup Resend or Postmark integration
- [ ] Send email to team members
- [ ] Include documentation summary and links

#### (C) Export Features

- [ ] Markdown file download
- [ ] Notion export via Notion API
- [ ] Slack notification integration

#### (D) Dashboard Integration

- [ ] Update dashboard with new documentation
- [ ] Real-time notifications
- [ ] History tracking

---

## PHASE 4: Database Schema (Prisma)

### ✅ STEP 5 — Database Implementation

- [ ] Setup Prisma schema with models:

  ```prisma
  model User {
    id        String   @id @default(cuid())
    email     String   @unique
    githubId  String?
    tokens    Json?
    accounts  Account[]
    repos     Repo[]
  }

  model Repo {
    id        String   @id @default(cuid())
    name      String
    owner     String
    provider  String
    installId String
    userId    String
    user      User     @relation(fields: [userId], references: [id])
    prs       PullRequest[]
  }

  model PullRequest {
    id        String   @id @default(cuid())
    repoId    String
    number    Int
    title     String
    author    String
    mergedAt  DateTime
    docs      Documentation?
  }

  model Documentation {
    id        String   @id @default(cuid())
    prId      String
    summary   String
    snippets  String
    changelog String
    json      Json?
  }
  ```

- [ ] Run database migrations
- [ ] Create database indexes for performance

---

## PHASE 5: Frontend Dashboard

### ✅ STEP 6 — Next.js Frontend Setup

- [ ] Setup Next.js 14 with App Router
- [ ] Install ShadCN UI components
- [ ] Configure authentication (Clerk/NextAuth)
- [ ] Setup environment variables

### ✅ STEP 7 — Frontend Pages

Create pages:

- [ ] /dashboard - Main overview
- [ ] /repos - Connect GitHub App, manage repositories
- [ ] /repos/[id] - Repository details and PR history
- [ ] /prs/[id] - PR documentation viewer
- [ ] /settings/billing - Billing and subscription management

### ✅ STEP 8 — Frontend Features

- [ ] Repository selector component
- [ ] PR list with status indicators
- [ ] Documentation previewer
- [ ] Download Markdown button
- [ ] Dark mode toggle
- [ ] Search and filter functionality
- [ ] Export options (Markdown, Notion, PDF)

---

## PHASE 6: SaaS Features

### ✅ STEP 9 — User Flow Implementation

- [ ] User authentication system
- [ ] GitHub OAuth integration
- [ ] Repository connection flow
- [ ] Repository selection and monitoring setup
- [ ] User dashboard with project overview

### ✅ STEP 10 — Billing System

- [ ] Integrate Stripe payment processing
- [ ] Implement subscription tiers:
  - [ ] Free tier: 20 PR summaries/month
  - [ ] Pro tier: unlimited PR summaries
  - [ ] Team tier: multi-repo + Slack + Notion integration
- [ ] Usage tracking and limits
- [ ] Billing dashboard
- [ ] Webhook handling for payment events

---

## PHASE 7: Deployment & Infrastructure

### ✅ STEP 11 — Backend Deployment

- [ ] Deploy NestJS to Railway or Fly.io
- [ ] Setup environment variables on hosting platform
- [ ] Deploy BullMQ workers (same or separate service)
- [ ] Setup PostgreSQL database (Railway, Supabase, or similar)
- [ ] Configure Redis for BullMQ
- [ ] Setup health checks and monitoring

### ✅ STEP 12 — Frontend Deployment

- [ ] Deploy Next.js to Vercel
- [ ] Configure custom domain (if needed)
- [ ] Setup environment variables
- [ ] Configure redirects and headers

### ✅ STEP 13 — Webhook Configuration

- [ ] Setup HTTPS webhook endpoint
- [ ] Configure GitHub App webhook URL
- [ ] Test webhook delivery
- [ ] Setup monitoring for webhook failures

---

## PHASE 8: Advanced Features

### ✅ STEP 14 — Additional Integrations

- [ ] GitLab webhook support
- [ ] Bitbucket webhook support
- [ ] Slack integration
- [ ] Microsoft Teams integration
- [ ] Discord integration

### ✅ STEP 15 — Advanced AI Features

- [ ] Custom AI prompts per repository type
- [ ] Multi-language support
- [ ] Code language detection
- [ ] Framework-specific documentation templates
- [ ] Breaking change detection

### ✅ STEP 16 — Analytics & Monitoring

- [ ] Usage analytics dashboard
- [ ] Performance monitoring
- [ ] Error tracking and alerting
- [ ] User feedback collection
- [ ] A/B testing for AI prompts

---

## PHASE 9: Testing & Quality Assurance

### ✅ STEP 17 — Testing Implementation

- [ ] Unit tests for all backend services
- [ ] Integration tests for webhooks
- [ ] E2E tests for frontend flows
- [ ] Load testing for high-volume PR processing
- [ ] Security testing for webhook endpoints

### ✅ STEP 18 — Documentation & DevOps

- [ ] API documentation (OpenAPI/Swagger)
- [ ] Developer setup guide
- [ ] Deployment scripts
- [ ] CI/CD pipeline setup
- [ ] Monitoring and alerting setup

---

## PHASE 10: Launch & Marketing

### ✅ STEP 19 — Pre-Launch

- [ ] Beta testing with select users
- [ ] Performance optimization
- [ ] Security audit
- [ ] Legal compliance (privacy policy, terms of service)
- [ ] Landing page creation

### ✅ STEP 20 — Launch Preparation

- [ ] Marketing website
- [ ] Feature documentation
- [ ] Tutorial videos
- [ ] Community building
- [ ] Press kit preparation

---

## Success Metrics

- [ ] Successfully process 100+ merged PRs/day
- [ ] < 5 minute average documentation generation time
- [ ] 95%+ user satisfaction with generated docs
- [ ] < 1% webhook failure rate
- [ ] Sub-second dashboard load times

---

## Timeline Estimate

- **Phase 1-3**: 4 weeks (Core functionality)
- **Phase 4-5**: 3 weeks (Database + Frontend)
- **Phase 6**: 2 weeks (SaaS features)
- **Phase 7**: 1 week (Deployment)
- **Phase 8-9**: 3 weeks (Advanced features + Testing)
- **Phase 10**: 2 weeks (Launch preparation)

**Total Estimated Timeline**: 15 weeks

---

## Notes

- Start with GitHub integration first (highest priority)
- Focus on core webhook → AI → database → basic dashboard flow
- Add advanced features incrementally
- Ensure proper error handling and retry mechanisms throughout
- Consider rate limiting for AI API calls
- Plan for webhook security and authentication from day one
