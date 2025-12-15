import { Injectable, Logger } from '@nestjs/common';
import { GitHubService } from '../github/github.service';
import { DashboardRepository } from '../dashboard/dashboard.repository';
import { UsersService } from '../users/users.service';
import { syncLogger } from '../common/utils/logger.util';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly githubService: GitHubService,
    private readonly dashboardRepository: DashboardRepository,
    private readonly usersService: UsersService,
  ) {}

  async syncRepositoriesFromGitHub(clerkId: string): Promise<void> {
    const startTime = Date.now();
    syncLogger.logSyncStart(clerkId, 'full-repository-sync');

    const githubStatus = await this.usersService.getGitHubStatus(clerkId);

    if (!githubStatus.connected) {
      syncLogger.logSyncSkipped(clerkId, 'GitHub not connected');
      return;
    }

    try {
      const repositories = await this.githubService.getInstallationRepositories(githubStatus.installationId);
      this.logger.log(`Found ${repositories.length} repositories for user: ${clerkId}`);

      // Get or create user
      const user = await this.usersService.findUserByClerkId(clerkId);
      if (!user) {
        syncLogger.logSyncError(clerkId, new Error('User not found'), 'user-validation');
        return;
      }

      let syncedCount = 0;
      let totalPRsSynced = 0;
      let errorCount = 0;

      // Sync each repository to the database
      for (const repo of repositories) {
        try {
          this.logger.debug(`Syncing repository: ${repo.full_name}`);
          
          const syncedRepo = await this.dashboardRepository.createRepositoryFromGitHubData(clerkId, repo, githubStatus.installationId);
          
          // Sync pull requests for this repository
          const pullRequests = await this.githubService.getRepositoryPullRequests(
            repo.owner.login || repo.owner,
            repo.name,
            githubStatus.installationId
          );
          
          await this.dashboardRepository.syncPullRequestsForRepository(syncedRepo.id, pullRequests);
          
          // Update repository last sync timestamp
          await this.dashboardRepository.updateRepoLastSync(syncedRepo.id);
          
          syncedCount++;
          totalPRsSynced += pullRequests.length;
          this.logger.debug(`Successfully synced repository: ${repo.full_name} with ${pullRequests.length} PRs`);
        } catch (error) {
          errorCount++;
          // Ignore duplicate errors (repository already exists)
          if (error.code !== 'P2002') {
            this.logger.error(`Error syncing repository ${repo.name}:`, error);
          } else {
            this.logger.debug(`Repository ${repo.name} already exists, skipping`);
          }
        }
      }

      // Update user last sync timestamp
      await this.dashboardRepository.updateUserLastSync(clerkId);

      const duration = Date.now() - startTime;
      syncLogger.logSyncComplete(clerkId, duration, syncedCount, totalPRsSynced);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      syncLogger.logSyncError(clerkId, error, 'repository-sync');
      throw error;
    }
  }

  async syncSingleRepository(clerkId: string, owner: string, repoName: string): Promise<void> {
    this.logger.log(`Starting single repository sync: ${owner}/${repoName} for user: ${clerkId}`);

    const githubStatus = await this.usersService.getGitHubStatus(clerkId);

    if (!githubStatus.connected) {
      this.logger.warn(`GitHub not connected for user: ${clerkId}`);
      return;
    }

    try {
      // Get repository details
      const repo = await this.githubService.getRepository(owner, repoName, githubStatus.installationId);
      
      const syncedRepo = await this.dashboardRepository.createRepositoryFromGitHubData(clerkId, repo, githubStatus.installationId);
      
      // Sync pull requests for this repository
      const pullRequests = await this.githubService.getRepositoryPullRequests(
        owner,
        repoName,
        githubStatus.installationId
      );
      
      await this.dashboardRepository.syncPullRequestsForRepository(syncedRepo.id, pullRequests);
      
      // Update repository last sync timestamp
      await this.dashboardRepository.updateRepoLastSync(syncedRepo.id);
      
      this.logger.log(`Successfully synced single repository: ${owner}/${repoName}`);
    } catch (error) {
      this.logger.error(`Error syncing single repository ${owner}/${repoName}:`, error);
      throw error;
    }
  }

  async getSyncStatus(clerkId: string): Promise<{
    lastSyncAt: Date | null;
    isStale: boolean;
    staleThresholdMinutes: number;
  }> {
    const lastSyncAt = await this.dashboardRepository.getUserLastSync(clerkId);
    const isStale = await this.dashboardRepository.isDataStale(clerkId, 30);

    return {
      lastSyncAt,
      isStale,
      staleThresholdMinutes: 30,
    };
  }

  async syncPullRequestsFromGitHub(clerkId: string): Promise<void> {
    const startTime = Date.now();
    syncLogger.logSyncStart(clerkId, 'pull-requests-only-sync');

    const githubStatus = await this.usersService.getGitHubStatus(clerkId);

    if (!githubStatus.connected) {
      syncLogger.logSyncSkipped(clerkId, 'GitHub not connected');
      return;
    }

    try {
      // Get user's repositories from database (not from GitHub)
      const repositories = await this.dashboardRepository.getUserRepos(clerkId);

      this.logger.log(`Found ${repositories.length} repositories for user: ${clerkId}`);

      let totalPRsSynced = 0;
      let errorCount = 0;

      // Sync PRs for each repository
      for (const repo of repositories) {
        try {
          this.logger.debug(`Syncing PRs for repository: ${repo.owner}/${repo.name}`);

          const pullRequests = await this.githubService.getRepositoryPullRequests(
            repo.owner,
            repo.name,
            githubStatus.installationId
          );

          await this.dashboardRepository.syncPullRequestsForRepository(repo.id, pullRequests);

          totalPRsSynced += pullRequests.length;
          this.logger.debug(`Successfully synced ${pullRequests.length} PRs for ${repo.owner}/${repo.name}`);
        } catch (error) {
          errorCount++;
          this.logger.error(`Error syncing PRs for repository ${repo.name}:`, error);
        }
      }

      // Update user last sync timestamp
      await this.dashboardRepository.updateUserLastSync(clerkId);

      const duration = Date.now() - startTime;
      syncLogger.logSyncComplete(clerkId, duration, 0, totalPRsSynced);

    } catch (error) {
      const duration = Date.now() - startTime;
      syncLogger.logSyncError(clerkId, error, 'pull-requests-sync');
      throw error;
    }
  }
}