import { Injectable } from '@nestjs/common';
import { DashboardRepository } from './dashboard.repository';
import { AddRepositoryDto, RepositorySummary, PRSummary, UserStats } from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async getUserRepos(clerkId: string): Promise<RepositorySummary[]> {
    return this.dashboardRepository.findUserReposWithPRs(clerkId);
  }

  async getUserPRs(clerkId: string): Promise<PRSummary[]> {
    return this.dashboardRepository.findUserPRs(clerkId);
  }

  async getUserStats(clerkId: string): Promise<UserStats> {
    return this.dashboardRepository.getUserStats(clerkId);
  }

  async addRepository(clerkId: string, addRepositoryDto: AddRepositoryDto) {
    return this.dashboardRepository.createRepository(clerkId, addRepositoryDto);
  }
}