import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  AddRepositoryDto,
  RepositorySummary,
  PRSummary,
  UserStats,
} from "./dto/dashboard.dto";

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getUserRepos(clerkId: string): Promise<Array<{ id: string; name: string; owner: string }>> {
    const repos = await this.prisma.repo.findMany({
      where: {
        user: {
          clerkId,
        },
      },
      select: {
        id: true,
        name: true,
        owner: true,
      },
    });

    return repos;
  }

  async findRepoByOwnerAndName(
    owner: string,
    name: string,
  ): Promise<{ id: string; name: string; owner: string; installId: string } | null> {
    const repo = await this.prisma.repo.findFirst({
      where: {
        owner,
        name,
      },
      select: {
        id: true,
        name: true,
        owner: true,
        installId: true,
      },
    });

    return repo;
  }

  /**
   * Sync a single PR to the database and return the created/updated record.
   * Used when we need the PR's database ID for subsequent operations.
   */
  async syncPullRequestAndReturn(
    repoId: string,
    prData: { number: number; title: string; author: string; state: string; sha: string },
  ) {
    try {
      const pr = await this.prisma.pullRequest.upsert({
        where: {
          repoId_number: {
            repoId,
            number: prData.number,
          },
        },
        update: {
          title: prData.title,
          author: prData.author,
          state: prData.state,
          sha: prData.sha,
          updatedAt: new Date(),
        },
        create: {
          number: prData.number,
          title: prData.title,
          author: prData.author,
          mergedAt: new Date(0), // Open PRs don't have merged_at, use epoch
          state: prData.state,
          sha: prData.sha,
          repo: {
            connect: {
              id: repoId,
            },
          },
        },
      });

      return pr;
    } catch (error) {
      console.error(`Error syncing PR ${prData.number} for repo ${repoId}:`, error);
      return null;
    }
  }

  async findUserReposWithPRs(clerkId: string): Promise<RepositorySummary[]> {
    const repos = await this.prisma.repo.findMany({
      where: {
        user: {
          clerkId,
        },
      },
      include: {
        prs: {
          orderBy: {
            mergedAt: "desc",
          },
          take: 5,
          include: {
            docs: true,
          },
        },
      },
    });

    return repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      owner: repo.owner,
      provider: repo.provider,
      createdAt: repo.createdAt,
      prCount: repo.prs.length,
      recentPRs: repo.prs.map((pr: any) => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        mergedAt: pr.mergedAt,
        hasDocs: !!pr.docs,
      })),
    }));
  }

  async findUserPRs(clerkId: string): Promise<PRSummary[]> {
    const prs = await this.prisma.pullRequest.findMany({
      where: {
        repo: {
          user: {
            clerkId,
          },
        },
      },
      include: {
        repo: true,
        docs: true,
      },
      orderBy: {
        mergedAt: "desc",
      },
      take: 20,
    });

    return prs.map((pr) => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      author: pr.author,
      mergedAt: pr.mergedAt,
      repo: {
        name: pr.repo.name,
        owner: pr.repo.owner,
      },
      hasDocs: !!pr.docs,
      docsSummary: pr.docs?.summary
        ? pr.docs.summary.substring(0, 200) + "..."
        : null,
    }));
  }

  /**
   * Find a single PR by ID with full details.
   * Ensures the PR belongs to the user via clerkId.
   */
  async findPullRequestById(prId: string, clerkId: string) {
    const pr = await this.prisma.pullRequest.findFirst({
      where: {
        id: prId,
        repo: {
          user: {
            clerkId,
          },
        },
      },
      include: {
        repo: {
          select: {
            id: true,
            name: true,
            owner: true,
            installId: true,
          },
        },
        docs: true,
      },
    });

    return pr;
  }

  async getUserStats(clerkId: string): Promise<UserStats> {
    const [totalRepos, totalPRs, totalDocs] = await Promise.all([
      this.prisma.repo.count({
        where: {
          user: {
            clerkId,
          },
        },
      }),
      this.prisma.pullRequest.count({
        where: {
          repo: {
            user: {
              clerkId,
            },
          },
        },
      }),
      this.prisma.documentation.count({
        where: {
          pr: {
            repo: {
              user: {
                clerkId,
              },
            },
          },
        },
      }),
    ]);

    return {
      totalRepos,
      totalPRs,
      totalDocs,
      docsGenerated: totalDocs,
      pendingDocs: totalPRs - totalDocs,
    };
  }

  async createRepository(clerkId: string, addRepositoryDto: AddRepositoryDto) {
    return this.prisma.repo.create({
      data: {
        name: addRepositoryDto.name,
        owner: addRepositoryDto.owner,
        userId: clerkId,
        installId: addRepositoryDto.installationId,
        provider: "github",
      },
    });
  }

  async createRepositoryFromGitHubData(
    clerkId: string,
    githubRepo: any,
    installationId: string,
  ) {
    // Get user ID first
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      throw new Error(`User with clerkId ${clerkId} not found`);
    }

    const owner = githubRepo.owner.login || githubRepo.owner;
    const name = githubRepo.name;

    // First try to find existing repo using the unique constraint
    const existingRepo = await this.prisma.repo.findFirst({
      where: {
        owner,
        name,
      },
    });

    if (existingRepo) {
      // Update existing repo
      return this.prisma.repo.update({
        where: {
          id: existingRepo.id,
        },
        data: {
          installId: installationId,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new repo
      return this.prisma.repo.create({
        data: {
          name,
          owner,
          userId: user.id,
          installId: installationId,
          provider: "github",
        },
      });
    }
  }

  async syncPullRequestsForRepository(repoId: string, pullRequests: any[]) {
    for (const pr of pullRequests) {
      try {
        // Only sync OPEN pull requests for documentation purposes
        if (pr.state === "open") {
          await this.prisma.pullRequest.upsert({
            where: {
              repoId_number: {
                repoId,
                number: pr.number,
              },
            },
            update: {
              title: pr.title,
              author: pr.author,
              mergedAt: new Date(0), // Open PRs don't have merged_at, use epoch
              state: pr.state,
              sha: pr.sha,
              updatedAt: new Date(),
            },
            create: {
              number: pr.number,
              title: pr.title,
              author: pr.author,
              mergedAt: new Date(0), // Open PRs don't have merged_at, use epoch
              state: pr.state,
              sha: pr.sha,
              repo: {
                connect: {
                  id: repoId,
                },
              },
            },
          });
        }
      } catch (error) {
        console.error(
          `Error syncing PR ${pr.number} for repo ${repoId}:`,
          error,
        );
      }
    }
  }

  async updateUserLastSync(clerkId: string) {
    return this.prisma.user.update({
      where: { clerkId },
      data: { lastSyncAt: new Date() },
    });
  }

  async updateRepoLastSync(repoId: string) {
    return this.prisma.repo.update({
      where: { id: repoId },
      data: { lastSyncAt: new Date() },
    });
  }

  async getUserLastSync(clerkId: string): Promise<Date | null> {
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      select: { lastSyncAt: true },
    });
    return user?.lastSyncAt;
  }

  async getRepoLastSync(repoId: string): Promise<Date | null> {
    const repo = await this.prisma.repo.findUnique({
      where: { id: repoId },
      select: { lastSyncAt: true },
    });
    return repo?.lastSyncAt;
  }

  async isDataStale(
    clerkId: string,
    staleThresholdMinutes: number = 30,
  ): Promise<boolean> {
    const lastSync = await this.getUserLastSync(clerkId);
    if (!lastSync) return true;

    const staleThreshold = new Date(
      Date.now() - staleThresholdMinutes * 60 * 1000,
    );
    return lastSync < staleThreshold;
  }

  async deleteClosedPRs(
    owner: string,
    name: string,
    numbers: number[],
  ): Promise<void> {
    await this.prisma.pullRequest.deleteMany({
      where: {
        repo: {
          owner,
          name,
        },
        number: {
          in: numbers,
        },
      },
    });
  }

  async deletePullRequest(
    owner: string,
    name: string,
    prNumber: number,
  ): Promise<void> {
    await this.prisma.pullRequest.deleteMany({
      where: {
        repo: {
          owner,
          name,
        },
        number: prNumber,
      },
    });
  }

  /**
   * Update the state of a pull request.
   * Used when a PR is merged or closed via webhook.
   */
  async updatePullRequestState(
    owner: string,
    name: string,
    prNumber: number,
    state: string,
    mergedAt?: Date,
  ): Promise<void> {
    await this.prisma.pullRequest.updateMany({
      where: {
        repo: {
          owner,
          name,
        },
        number: prNumber,
      },
      data: {
        state,
        ...(mergedAt && { mergedAt }),
        updatedAt: new Date(),
      },
    });
  }
}
