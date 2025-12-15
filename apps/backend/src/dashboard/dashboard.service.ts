import { Injectable } from "@nestjs/common";
import { DashboardRepository } from "./dashboard.repository";
import { UsersService } from "../users/users.service";
import {
  AddRepositoryDto,
  RepositorySummary,
  PRSummary,
  UserStats,
} from "./dto/dashboard.dto";
import { BullQueueService } from "../bullmq/bullmq.service";
import { SyncService } from "../sync/sync.service";

@Injectable()
export class DashboardService {
  constructor(
    private readonly dashboardRepository: DashboardRepository,
    private readonly usersService: UsersService,
    private readonly bullQueueService: BullQueueService,
    private readonly syncService: SyncService,
  ) {}

  async getUserRepos(clerkId: string): Promise<RepositorySummary[]> {
    return this.dashboardRepository.findUserReposWithPRs(clerkId);
  }

  async getUserPRs(clerkId: string): Promise<PRSummary[]> {
    return this.dashboardRepository.findUserPRs(clerkId);
  }

  async getUserPRsPaginated(
    clerkId: string,
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    return this.dashboardRepository.findUserPRsPaginated(clerkId, page, limit, sortBy, sortOrder);
  }

  async getUserReposPaginated(
    clerkId: string,
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    return this.dashboardRepository.findUserReposPaginated(clerkId, page, limit, sortBy, sortOrder);
  }

  async getUserStats(clerkId: string): Promise<UserStats> {
    return this.dashboardRepository.getUserStats(clerkId);
  }

  async addRepository(clerkId: string, addRepositoryDto: AddRepositoryDto) {
    return this.dashboardRepository.createRepository(clerkId, addRepositoryDto);
  }

  async refreshData(clerkId: string): Promise<void> {
    // Trigger immediate background sync (PRs only)
    await this.bullQueueService.addSyncRepositoriesJob({ clerkId });
  }

  async getSyncStatus(clerkId: string) {
    return this.syncService.getSyncStatus(clerkId);
  }

  async getPRDetail(prId: string, clerkId: string) {
    const pr = await this.dashboardRepository.findPullRequestById(prId, clerkId);
    if (!pr) {
      return null;
    }
    return pr;
  }

  async getRepositoryWithPRs(
    repoId: string,
    clerkId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    return this.dashboardRepository.findRepositoryWithPRs(repoId, clerkId, page, limit);
  }
}
