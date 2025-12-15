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
      const receivedSignature = signature;
      const receivedSigBuffer = Buffer.from(receivedSignature);
      const expectedSigBuffer = Buffer.from(expectedSignatureHeader);

      // Use timing-safe comparison
      const isValid = crypto.timingSafeEqual(
        receivedSigBuffer,
        expectedSigBuffer,
      );

      if (!isValid) {
        this.logger.warn("Invalid GitHub webhook signature");
      }

      return isValid;
    } catch (error) {
      this.logger.error("Error verifying GitHub signature", error);
      return false;
    }
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

  async uninstallAppInstallation(installationId: string): Promise<void> {
    try {
      this.logger.log(`Uninstalling GitHub App installation ${installationId}`);

      const octokit = this.getAppOctokit();

      await octokit.apps.deleteInstallation({
        installation_id: Number(installationId),
      });

      // Clear from cache
      this.installationOctokitCache.delete(installationId);

      this.logger.log(
        `Successfully uninstalled installation ${installationId}`,
      );
    } catch (error: any) {
      if (error.status === 404) {
        this.logger.warn(
          `Installation ${installationId} not found - may already be uninstalled`,
        );
        return;
      }
      this.logger.error("Error uninstalling GitHub App", error);
      throw error;
    }
  }

  async getInstallationRepositories(installationId: string): Promise<any[]> {
    try {
      this.logger.log(
        `Getting repositories for installation ${installationId}`,
      );

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

  async getRepository(owner: string, repo: string, installationId: string) {
    const octokit = this.getInstallationOctokit(installationId);

    const { data } = await octokit.repos.get({
      owner,
      repo,
    });

    return data;
  }

  async getPullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    installationId: string,
  ) {
    const octokit = this.getInstallationOctokit(installationId);

    const { data } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });

    return data;
  }

  async getRepositoryPullRequests(
    owner: string,
    repo: string,
    installationId: string,
  ): Promise<any[]> {
    try {
      this.logger.log(`Getting pull requests for ${owner}/${repo}`);

      const octokit = this.getInstallationOctokit(installationId);

      const { data } = await octokit.pulls.list({
        owner,
        repo,
        state: "open",
        per_page: 100,
      });

      const pullRequests = data || [];

      this.logger.log(
        `Found ${pullRequests.length} pull requests for ${owner}/${repo}`,
      );

      return pullRequests.map((pr) => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        author: pr.user.login,
        author_id: pr.user.id,
        state: pr.state,
        merged_at: pr.merged_at,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        html_url: pr.html_url,
        sha: pr.head.sha,
        ref: pr.head.ref,
        base_ref: pr.base.ref,
        draft: pr.draft,
      }));
    } catch (error) {
      this.logger.error(
        `Error getting pull requests for ${owner}/${repo}`,
        error,
      );
      throw error;
    }
  }

  async getPullRequestFiles(
    owner: string,
    repo: string,
    pullNumber: number,
    installationId: string,
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
    installationId: string,
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
