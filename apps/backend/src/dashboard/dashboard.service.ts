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
    // Check if data is stale and trigger background sync if needed
    const isStale = await this.dashboardRepository.isDataStale(clerkId, 30);
    if (isStale) {
      // Fire and forget - don't wait for sync to complete
      this.triggerBackgroundSync(clerkId);
    }

    return this.dashboardRepository.findUserReposWithPRs(clerkId);
  }

  async getUserPRs(clerkId: string): Promise<PRSummary[]> {
    // Check if data is stale and trigger background sync if needed
    const isStale = await this.dashboardRepository.isDataStale(clerkId, 30);
    if (isStale) {
      // Fire and forget - don't wait for sync to complete
      this.triggerBackgroundSync(clerkId);
    }

    return this.dashboardRepository.findUserPRs(clerkId);
  }

  async getUserStats(clerkId: string): Promise<UserStats> {
    // Check if data is stale and trigger background sync if needed
    const isStale = await this.dashboardRepository.isDataStale(clerkId, 30);
    if (isStale) {
      // Fire and forget - don't wait for sync to complete
      this.triggerBackgroundSync(clerkId);
    }

    return this.dashboardRepository.getUserStats(clerkId);
  }

  async addRepository(clerkId: string, addRepositoryDto: AddRepositoryDto) {
    return this.dashboardRepository.createRepository(clerkId, addRepositoryDto);
  }

  async refreshData(clerkId: string): Promise<void> {
    // Trigger immediate background sync
    await this.bullQueueService.addSyncRepositoriesJob({ clerkId });
  }

  async getSyncStatus(clerkId: string) {
    return this.syncService.getSyncStatus(clerkId);
  }

  private triggerBackgroundSync(clerkId: string): void {
    // Fire and forget - don't wait for completion
    this.bullQueueService.addSyncRepositoriesJob({ clerkId }).catch((error) => {
      console.error(
        `Failed to trigger background sync for user ${clerkId}:`,
        error,
      );
    });
  }
}
