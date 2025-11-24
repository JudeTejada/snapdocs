import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { Octokit } from '@octokit/rest';

@Injectable()
export class GitHubService {
  private readonly logger = new Logger(GitHubService.name);

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.error('GitHub webhook secret not configured');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf-8')
      .digest('hex');

    const expectedSignatureHeader = `sha256=${expectedSignature}`;
    
    try {
      const receivedSignature = signature;
      const receivedSigBuffer = Buffer.from(receivedSignature);
      const expectedSigBuffer = Buffer.from(expectedSignatureHeader);

      // Use timing-safe comparison
      const isValid = crypto.timingSafeEqual(
        receivedSigBuffer,
        expectedSigBuffer
      );

      if (!isValid) {
        this.logger.warn('Invalid GitHub webhook signature');
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error verifying GitHub signature', error);
      return false;
    }
  }

  async getInstallationToken(installationId: string): Promise<string> {
    try {
      const response = await fetch(
        `https://api.github.com/app/installations/${installationId}/access_tokens`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_APP_PRIVATE_KEY}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'SnapDocs/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get installation token: ${response.statusText}`);
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      this.logger.error('Error getting installation token', error);
      throw error;
    }
  }

  createOctokitClient(token: string): Octokit {
    return new Octokit({
      auth: token,
      userAgent: 'SnapDocs/1.0',
    });
  }

  async getPullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    installationToken: string
  ) {
    const octokit = this.createOctokitClient(installationToken);
    
    try {
      const { data } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
      });
      
      return data;
    } catch (error) {
      this.logger.error('Error fetching pull request', error);
      throw error;
    }
  }

  async getPullRequestFiles(
    owner: string,
    repo: string,
    pullNumber: number,
    installationToken: string
  ) {
    const octokit = this.createOctokitClient(installationToken);
    
    try {
      const { data } = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 100,
      });
      
      return data;
    } catch (error) {
      this.logger.error('Error fetching pull request files', error);
      throw error;
    }
  }

  async postComment(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string,
    installationToken: string
  ) {
    const octokit = this.createOctokitClient(installationToken);
    
    try {
      const { data } = await octokit.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body,
      });
      
      return data;
    } catch (error) {
      this.logger.error('Error posting comment', error);
      throw error;
    }
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