import { Injectable } from '@nestjs/common';
import { DashboardRepository } from './dashboard.repository';
import { UsersService } from '../users/users.service';
import { GitHubService } from '../github/github.service';
import { AddRepositoryDto, RepositorySummary, PRSummary, UserStats } from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly dashboardRepository: DashboardRepository,
    private readonly usersService: UsersService,
    private readonly githubService: GitHubService,
  ) {}

  async getUserRepos(clerkId: string): Promise<RepositorySummary[]> {
    // First sync repositories from GitHub to database
    await this.syncRepositoriesFromGitHub(clerkId);
    return this.dashboardRepository.findUserReposWithPRs(clerkId);
  }

  async getUserPRs(clerkId: string): Promise<PRSummary[]> {
    // First sync repositories from GitHub to database
    await this.syncRepositoriesFromGitHub(clerkId);
    return this.dashboardRepository.findUserPRs(clerkId);
  }

  async getUserStats(clerkId: string): Promise<UserStats> {
    // First sync repositories from GitHub to database
    await this.syncRepositoriesFromGitHub(clerkId);
    return this.dashboardRepository.getUserStats(clerkId);
  }

  async addRepository(clerkId: string, addRepositoryDto: AddRepositoryDto) {
    return this.dashboardRepository.createRepository(clerkId, addRepositoryDto);
  }

  private async syncRepositoriesFromGitHub(clerkId: string) {
    const githubStatus = await this.usersService.getGitHubStatus(clerkId);

    if (!githubStatus.connected) {
      return;
    }

    try {
      const repositories = await this.githubService.getInstallationRepositories(githubStatus.installationId);

      // Get or create user
      const user = await this.usersService.findUserByClerkId(clerkId);
      if (!user) {
        console.log(`User with clerkId ${clerkId} not found`);
        return;
      }

      // Sync each repository to the database
      for (const repo of repositories) {
        try {
          const syncedRepo = await this.dashboardRepository.createRepositoryFromGitHubData(clerkId, repo, githubStatus.installationId);
          
          // Sync pull requests for this repository
          const pullRequests = await this.githubService.getRepositoryPullRequests(
            repo.owner.login || repo.owner,
            repo.name,
            githubStatus.installationId
          );
          
          await this.dashboardRepository.syncPullRequestsForRepository(syncedRepo.id, pullRequests);
        } catch (error) {
          // Ignore duplicate errors (repository already exists)
          if (error.code !== 'P2002') {
            console.error(`Error syncing repository ${repo.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error syncing repositories from GitHub:', error);
    }
  }
}