# GitHub App Integration Guide

This document describes the proper implementation for connecting your frontend to a GitHub App and setting up the backend connection for SnapDocs.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication Flow](#authentication-flow)
3. [Critical: JWT Token Generation](#critical-jwt-token-generation)
4. [Current Issues & Fixes](#current-issues--fixes)
5. [Environment Configuration](#environment-configuration)
6. [Security Considerations](#security-considerations)

---

## Architecture Overview

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│    Frontend     │◄────►│    Backend      │◄────►│   GitHub API    │
│   (Next.js)     │      │   (NestJS)      │      │                 │
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │                        │                        │
        │  1. User clicks        │                        │
        │     "Connect GitHub"   │                        │
        │───────────────────────►│                        │
        │                        │                        │
        │  2. Returns install    │                        │
        │     URL                │                        │
        │◄───────────────────────│                        │
        │                        │                        │
        │  3. Redirect to GitHub │                        │
        │────────────────────────────────────────────────►│
        │                        │                        │
        │  4. User installs app  │                        │
        │     on repositories    │                        │
        │                        │                        │
        │  5. GitHub redirects   │                        │
        │     with installation_id                        │
        │◄───────────────────────────────────────────────│
        │                        │                        │
        │  6. Frontend callback  │                        │
        │     saves installation │                        │
        │───────────────────────►│                        │
        │                        │                        │
        │                        │  7. Backend stores     │
        │                        │     installation_id    │
        │                        │     in database        │
        │                        │                        │
        │                        │  8. Generate JWT       │
        │                        │     from private key   │
        │                        │─────────────────────────►
        │                        │                        │
        │                        │  9. Get installation   │
        │                        │     access token       │
        │                        │◄─────────────────────────
        │                        │                        │
        │                        │  10. Use token for     │
        │                        │      API calls         │
        │                        │─────────────────────────►
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| GitHubConnection | `frontend/src/components/GitHubConnection.tsx` | UI for connecting/disconnecting GitHub |
| GitHub Callback | `frontend/src/app/auth/github/callback/page.tsx` | Handles OAuth callback from GitHub |
| API Service | `frontend/src/services/api.ts` | Frontend API client |
| Auth Controller | `backend/src/auth/auth.controller.ts` | OAuth endpoints |
| GitHub Service | `backend/src/github/github.service.ts` | GitHub API interactions |

---

## Authentication Flow

### Step 1: User Initiates Connection (Frontend)

```typescript
// GitHubConnection.tsx
const handleConnectGitHub = async () => {
  const token = await getToken(); // Clerk auth token
  const installUrl = await apiService.installGitHubApp(token);
  window.location.href = installUrl; // Redirect to GitHub
};
```

### Step 2: Backend Returns Installation URL

```typescript
// auth.controller.ts
@Get("github/install")
@UseGuards(ClerkAuthGuard)
async installGitHubApp(@GetClerkUser() user: any, @Res() res: Response) {
  const appSlug = this.configService.get<string>("github.appSlug");
  const clientId = this.configService.get<string>("github.clientId");
  const frontendUrl = this.configService.get<string>("frontendUrl");
  
  // Use ConfigService for callback URL (not hardcoded)
  const backendUrl = this.configService.get<string>("backendUrl") || "http://localhost:3001";
  const redirectUri = `${backendUrl}/api/v1/auth/github/callback`;
  
  const installUrl = `https://github.com/apps/${appSlug}/installations/new?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  
  return res.json({ success: true, url: installUrl });
}
```

### Step 3: GitHub Redirects After Installation

GitHub redirects to your callback URL with:
- `installation_id` - The ID of the GitHub App installation
- `setup_action` - Either "install" or "update"
- `state` - Optional state parameter you passed

### Step 4: Backend Callback Handler

```typescript
// auth.controller.ts
@Get("github/callback")
async githubCallback(
  @Query("installation_id") installationId: string,
  @Query("state") state: string,
  @Res() res: Response,
) {
  if (!installationId) {
    const frontendUrl = this.configService.get<string>("frontendUrl");
    return res.redirect(`${frontendUrl}/dashboard?error=no_installation`);
  }

  // Redirect to frontend callback with installation data
  const frontendUrl = this.configService.get<string>("frontendUrl");
  return res.redirect(
    `${frontendUrl}/auth/github/callback?installation_id=${installationId}`
  );
}
```

### Step 5: Frontend Callback Saves Installation

```typescript
// frontend/src/app/auth/github/callback/page.tsx
useEffect(() => {
  const handleCallback = async () => {
    const installationId = searchParams.get('installation_id');
    const token = await getToken();
    
    // Save installation ID to backend
    const response = await apiService.connectGitHub(installationId, token);
    
    if (response.success) {
      router.push('/dashboard?success=github_connected');
    }
  };
  handleCallback();
}, []);
```

---

## Critical: JWT Token Generation

### The Problem

GitHub Apps use **JWT (JSON Web Token)** authentication. The current implementation incorrectly uses the private key directly as a Bearer token:

```typescript
// ❌ WRONG - Current implementation
const response = await fetch(
  `https://api.github.com/app/installations/${installationId}/access_tokens`,
  {
    headers: {
      Authorization: `Bearer ${privateKey}`, // This is WRONG!
    },
  }
);
```

### The Solution

You must generate a JWT signed with the private key:

```typescript
// ✅ CORRECT - Proper JWT generation
import * as jwt from 'jsonwebtoken';

private generateAppJWT(): string {
  const appId = this.configService.get<string>("github.appId");
  const privateKey = this.configService.get<string>("github.privateKey");
  
  if (!appId || !privateKey) {
    throw new Error("GitHub App ID or private key not configured");
  }

  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    iat: now - 60,           // Issued at time (60 seconds in the past for clock drift)
    exp: now + (10 * 60),    // Expiration time (10 minutes max)
    iss: appId,              // GitHub App ID
  };

  // The private key needs newlines properly formatted
  const formattedKey = privateKey.replace(/\\n/g, '\n');
  
  return jwt.sign(payload, formattedKey, { algorithm: 'RS256' });
}
```

### Getting Installation Access Token

```typescript
async getInstallationToken(installationId: string): Promise<string> {
  try {
    // Generate JWT for GitHub App authentication
    const appJWT = this.generateAppJWT();

    const response = await fetch(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${appJWT}`,  // Use JWT, not private key!
          Accept: "application/vnd.github+json",
          "User-Agent": this.appUserAgent,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Failed to get installation token: ${response.status} - ${errorBody}`
      );
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    this.logger.error("Error getting installation token", error);
    throw error;
  }
}
```

### Token Hierarchy

```
┌────────────────────────────────────────────────────────────────┐
│                      GitHub App Authentication                  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  1. Private Key (stored securely, never exposed)               │
│         │                                                      │
│         ▼                                                      │
│  2. App JWT (generated from private key, valid 10 min)         │
│         │                                                      │
│         ▼                                                      │
│  3. Installation Access Token (obtained via JWT, valid 1 hr)   │
│         │                                                      │
│         ▼                                                      │
│  4. API Calls (use installation token for repo access)         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Current Issues & Fixes

### Issue 1: Install `@octokit/auth-app`

You already have `@octokit/rest`, but need the auth-app package for proper GitHub App authentication:

```bash
cd apps/backend
npm install @octokit/auth-app
```

### Issue 2: Fix `github.service.ts` Using Octokit

The `@octokit/auth-app` package handles **all the complexity** for you:
- JWT generation from private key
- Installation token fetching
- Automatic token caching and refresh
- Proper error handling

**Complete refactored `github.service.ts`:**

```typescript
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

@Injectable()
export class GitHubService {
  private readonly logger = new Logger(GitHubService.name);
  private readonly appUserAgent = "SnapDocs/1.0";
  
  // Cached app-level Octokit instance
  private appOctokit: Octokit | null = null;
  
  // Cache for installation Octokit instances
  private installationOctokitCache = new Map<string, Octokit>();

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get an Octokit instance authenticated as the GitHub App itself
   * Used for app-level operations (listing installations, deleting installations)
   */
  private getAppOctokit(): Octokit {
    if (this.appOctokit) {
      return this.appOctokit;
    }

    const appId = this.configService.get<string>("github.appId");
    const privateKey = this.configService.get<string>("github.privateKey");

    if (!appId || !privateKey) {
      throw new Error("GitHub App ID or private key not configured");
    }

    // Handle private key formatting (env vars may have escaped newlines)
    const formattedKey = privateKey.replace(/\\n/g, "\n");

    this.appOctokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId,
        privateKey: formattedKey,
      },
      userAgent: this.appUserAgent,
    });

    return this.appOctokit;
  }

  /**
   * Get an Octokit instance authenticated as a specific installation
   * Used for repository-level operations (reading PRs, posting comments)
   * Tokens are automatically cached and refreshed by @octokit/auth-app
   */
  getInstallationOctokit(installationId: string): Octokit {
    // Check cache first
    const cached = this.installationOctokitCache.get(installationId);
    if (cached) {
      return cached;
    }

    const appId = this.configService.get<string>("github.appId");
    const privateKey = this.configService.get<string>("github.privateKey");

    if (!appId || !privateKey) {
      throw new Error("GitHub App ID or private key not configured");
    }

    const formattedKey = privateKey.replace(/\\n/g, "\n");

    const octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId,
        privateKey: formattedKey,
        installationId: Number(installationId),
      },
      userAgent: this.appUserAgent,
    });

    // Cache the instance
    this.installationOctokitCache.set(installationId, octokit);

    return octokit;
  }

  /**
   * Get an installation access token (if you need the raw token)
   * Most of the time, use getInstallationOctokit() instead
   */
  async getInstallationToken(installationId: string): Promise<string> {
    try {
      const appId = this.configService.get<string>("github.appId");
      const privateKey = this.configService.get<string>("github.privateKey");
      const formattedKey = privateKey.replace(/\\n/g, "\n");

      const auth = createAppAuth({
        appId,
        privateKey: formattedKey,
        installationId: Number(installationId),
      });

      const installationAuth = await auth({ type: "installation" });
      return installationAuth.token;
    } catch (error) {
      this.logger.error("Error getting installation token", error);
      throw error;
    }
  }

  /**
   * Uninstall/revoke a GitHub App installation
   */
  async uninstallAppInstallation(installationId: string): Promise<void> {
    try {
      this.logger.log(`Uninstalling GitHub App installation ${installationId}`);

      const octokit = this.getAppOctokit();

      await octokit.apps.deleteInstallation({
        installation_id: Number(installationId),
      });

      // Clear from cache
      this.installationOctokitCache.delete(installationId);

      this.logger.log(`Successfully uninstalled installation ${installationId}`);
    } catch (error: any) {
      if (error.status === 404) {
        this.logger.warn(`Installation ${installationId} not found - may already be uninstalled`);
        return;
      }
      this.logger.error("Error uninstalling GitHub App", error);
      throw error;
    }
  }

  /**
   * Get repositories accessible to an installation
   */
  async getInstallationRepositories(installationId: string): Promise<any[]> {
    try {
      this.logger.log(`Getting repositories for installation ${installationId}`);

      const octokit = this.getInstallationOctokit(installationId);

      const { data } = await octokit.apps.listReposAccessibleToInstallation({
        per_page: 100,
      });

      const repositories = data.repositories || [];

      this.logger.log(`Found ${repositories.length} repositories`);

      return repositories.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        owner: repo.owner.login,
        owner_id: repo.owner.id,
        private: repo.private,
        description: repo.description,
        html_url: repo.html_url,
        default_branch: repo.default_branch,
        language: repo.language,
        archived: repo.archived,
        disabled: repo.disabled,
        permissions: repo.permissions,
        created_at: repo.created_at,
        updated_at: repo.updated_at,
        pushed_at: repo.pushed_at,
      }));
    } catch (error) {
      this.logger.error("Error getting installation repositories", error);
      throw error;
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = this.configService.get<string>("github.webhookSecret");
    if (!secret) {
      this.logger.error("GitHub webhook secret not configured");
      return false;
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload, "utf-8")
      .digest("hex");

    const expectedSignatureHeader = `sha256=${expectedSignature}`;

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignatureHeader)
      );
    } catch (error) {
      this.logger.error("Error verifying GitHub signature", error);
      return false;
    }
  }

  async getPullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    installationId: string
  ) {
    const octokit = this.getInstallationOctokit(installationId);

    const { data } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });

    return data;
  }

  async getPullRequestFiles(
    owner: string,
    repo: string,
    pullNumber: number,
    installationId: string
  ) {
    const octokit = this.getInstallationOctokit(installationId);

    const { data } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
    });

    return data;
  }

  async postComment(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string,
    installationId: string
  ) {
    const octokit = this.getInstallationOctokit(installationId);

    const { data } = await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    });

    return data;
  }

  extractPullRequestData(webhookPayload: any) {
    const pr = webhookPayload.pull_request;
    const repo = webhookPayload.repository;
    const installation = webhookPayload.installation;

    return {
      repository: {
        id: repo.id,
        name: repo.name,
        owner: repo.owner.login,
        full_name: repo.full_name,
      },
      installation: {
        id: installation.id,
      },
      pullRequest: {
        id: pr.id,
        number: pr.number,
        title: pr.title,
        body: pr.body,
        html_url: pr.html_url,
        merged: pr.merged,
        merged_at: pr.merged_at,
        author: pr.user.login,
        author_id: pr.user.id,
        sha: pr.head.sha,
        ref: pr.head.ref,
        base_ref: pr.base.ref,
      },
    };
  }
}
```

### Why Octokit is Better

| Feature | Raw fetch | Octokit + auth-app |
|---------|-----------|-------------------|
| JWT Generation | Manual | Automatic |
| Token Caching | Manual | Built-in |
| Token Refresh | Manual | Automatic |
| Error Handling | Manual parsing | Typed errors |
| Rate Limiting | Manual | Built-in retry |
| TypeScript Types | None | Full coverage |
| API Methods | Raw URLs | `octokit.pulls.get()` |

### Issue 3: Hardcoded URLs

Replace hardcoded localhost URLs with ConfigService:

```typescript
// ❌ Before
const redirectUri = `http://localhost:3001/api/v1/auth/github/callback`;

// ✅ After
const backendUrl = this.configService.get<string>("backendUrl") || "http://localhost:3001";
const redirectUri = `${backendUrl}/api/v1/auth/github/callback`;
```

---

## Environment Configuration

### Required Environment Variables

```bash
# .env
# GitHub App Configuration
GITHUB_APP_ID=123456                    # Your GitHub App ID (numeric)
GITHUB_APP_SLUG=your-app-name           # URL-friendly app name
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxx       # OAuth Client ID
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxx   # OAuth Client Secret (if using OAuth flow)
GITHUB_WEBHOOK_SECRET=your-webhook-secret
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----"

# Application URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001       # Add this for proper redirects
```

### Private Key Formatting

GitHub provides the private key as a `.pem` file. For environment variables:

**Option 1: Single line with `\n`**
```bash
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\nmore...\n-----END RSA PRIVATE KEY-----"
```

**Option 2: Base64 encoded**
```bash
# Encode
cat private-key.pem | base64 -w 0 > private-key-base64.txt

# In code
const privateKey = Buffer.from(process.env.GITHUB_PRIVATE_KEY, 'base64').toString('utf-8');
```

### Update `configuration.ts`

```typescript
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || "development",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  backendUrl: process.env.BACKEND_URL || "http://localhost:3001",  // Add this
  database: {
    url: process.env.DATABASE_URL,
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    appId: process.env.GITHUB_APP_ID,
    appSlug: process.env.GITHUB_APP_SLUG,
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
    privateKey: process.env.GITHUB_PRIVATE_KEY,
  },
});
```

---

## Security Considerations

### 1. Private Key Protection

- **Never commit** the private key to version control
- Store in environment variables or secrets manager
- Use `.env.local` for local development (gitignored)
- In production, use AWS Secrets Manager, HashiCorp Vault, etc.

### 2. Token Caching Strategy

```typescript
// Cache installation tokens (valid for 1 hour)
private tokenCache = new Map<string, { token: string; expiresAt: number }>();

async getInstallationToken(installationId: string): Promise<string> {
  const cached = this.tokenCache.get(installationId);
  const now = Date.now();
  
  // Return cached token if valid (with 5 min buffer)
  if (cached && cached.expiresAt > now + 5 * 60 * 1000) {
    return cached.token;
  }
  
  // Fetch new token
  const token = await this.fetchNewInstallationToken(installationId);
  
  // Cache for 55 minutes (tokens expire in 1 hour)
  this.tokenCache.set(installationId, {
    token,
    expiresAt: now + 55 * 60 * 1000,
  });
  
  return token;
}
```

### 3. Webhook Signature Verification

Always verify webhook signatures to prevent spoofing:

```typescript
verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = this.configService.get<string>("github.webhookSecret");
  
  const expectedSignature = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(payload, "utf-8")
    .digest("hex")}`;

  // Timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### 4. Minimal Permissions

Configure your GitHub App with minimal required permissions:

- **Repository contents**: Read (for reading PR diffs)
- **Pull requests**: Read & Write (for posting comments)
- **Metadata**: Read (required)

### 5. Rate Limiting

GitHub API has rate limits:
- **App JWT requests**: 5,000/hour
- **Installation token requests**: Varies by plan

Implement exponential backoff for rate limit errors:

```typescript
async withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.status === 403 && error.message.includes('rate limit')) {
        const retryAfter = parseInt(error.headers?.['retry-after'] || '60');
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Quick Reference

### API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/auth/github/install` | GET | Clerk | Get installation URL |
| `/auth/github/callback` | GET | None | OAuth callback |
| `/auth/github/connect` | POST | Clerk | Save installation ID |
| `/auth/github/disconnect` | POST | Clerk | Remove installation |
| `/auth/github/status` | GET | Clerk | Check connection status |
| `/auth/github/repositories` | GET | Clerk | List accessible repos |

### Token Types

| Token | Generated From | Valid For | Used For |
|-------|---------------|-----------|----------|
| App JWT | Private Key | 10 min | App-level API calls |
| Installation Token | App JWT | 1 hour | Repo-level API calls |

### Useful Links

- [GitHub Apps Documentation](https://docs.github.com/en/apps)
- [Authenticating as a GitHub App](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/about-authentication-with-a-github-app)
- [GitHub REST API](https://docs.github.com/en/rest)
- [Octokit.js](https://github.com/octokit/octokit.js)
