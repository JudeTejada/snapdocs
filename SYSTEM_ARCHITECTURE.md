✅ 1. Core Concept

When a PR gets merged (GitHub, GitLab, Bitbucket), your service:

Detects the merged PR via webhook

Pulls the diff

Analyzes what changed (files, functions, types, comments, new endpoints, schema changes)

Generates:

Minimap-style summary

Human-readable docs summary

Updated code snippets

Changelog format summary

Saves & exposes it via:

API

Notion export

Markdown export

Email summary

GitHub PR comment

This turns into a "Documentation automation SaaS".

✅ 2. Tech Stack (Recommended)
Backend

Node.js + NestJS (you’re familiar with this)

PostgreSQL + Prisma

BullMQ for background jobs

Clerk / NextAuth for auth (if dashboard needed)

OpenAI API (GPT-5) for doc generation

Frontend Dashboard

Next.js 14 (App Router)

ShadCN UI (you already use this)

Project management (list of repos, history, generated docs)

Webhooks

GitHub (primary)

GitLab / Bitbucket later

✅ 3. System Architecture
Developer merges PR → GitHub Webhook → Your Webhook API  
→ Validate signature  
→ Queue job in BullMQ  
→ Fetch PR diff from GitHub API  
→ AI processes diff  
→ Store summary in DB  
→ Post comment back to GitHub + send email + update dashboard

✅ 4. Detailed E2E Implementation Plan
STEP 1 — Create GitHub App

Your SaaS will use a GitHub App, because:

✔ can receive PR events
✔ can read diffs
✔ can comment back to PRs
✔ can identify repository + installation

Permissions required:

Pull Requests: Read

Contents: Read

Metadata: Read

Commit Status: Read & Write (optional)

Events to subscribe:

pull_request.closed

pull_request.merged

STEP 2 — Webhook Handler (NestJS)

Route:

POST /api/webhooks/github


Tasks:

Verify GitHub signature

Check action === "closed" && merged === true

Extract:

repo name

PR number

author

commit SHA

Save minimal info to DB

Push a job to BullMQ queue: generateDocs

STEP 3 — Background Worker (BullMQ)

Job steps:

(1) Fetch PR diff

Use:

GET /repos/:owner/:repo/pulls/:pull_number
GET /repos/:owner/:repo/pulls/:pull_number/files


Extract:

added/removed lines

changed files

per-file patch content

(2) Pre-process the diff

Split by:

- Models changed (TS, Prisma)
- Functions changed
- New API routes
- Modified logic blocks
- Removed code
- Comments added

(3) AI Prompt for Documentation

Example prompt:

You are a senior documentation writer.

Given these diffs, generate:

1. High-level summary (2-4 sentences)
2. Section: What changed and why
3. Mini-map style breakdown per file
4. Code snippet examples (before/after)
5. Developer instructions if needed
6. Changelog version of the update
7. Breaking change warnings


Feed diff in chunks.

(4) Post-process

Clean output

Remove hallucinations

Convert to markdown

(5) Save to DB

Store:

PR ID

Summary markdown

Code snippets

Classified changes

STEP 4 — Output Channels
(A) Post comment on GitHub PR

Comment summary back to merged PR:

"Here is the auto-generated documentation for this PR."

(B) Email the team

Send via Resend or Postmark

(C) Export

Markdown file (download)

Notion export via Notion API

Slack notification

(D) Dashboard

View:

Repo list

History of merges

Generated summaries

Download documentation

STEP 5 — SaaS Features
User Flow

User signs in (Clerk / NextAuth)

Connect GitHub

Choose repositories to monitor

Done — automation runs on every merge

Billing

Use Stripe:

Free tier: 20 PR summaries / month

Pro tier: unlimited

Team tier: multi repo + Slack + Notion


6. Database Schema (Prisma)
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

7. Frontend (Next.js + ShadCN)

Pages to build:

/dashboard

/repos → connect GitHub App

/repos/[id] → repo details

/prs/[id] → PR doc viewer

/settings/billing

Features:

Repo selector

PR list with statuses

Documentation previewer

Download Markdown button

Dark mode

8. Deployment
Backend

Deploy NestJS to Railway or Fly.io

BullMQ workers on same or separate service

Frontend

Deploy Next.js to Vercel

Webhook

Use ngrok in dev

Use HTTPS on prod

GitHub requires public URL
