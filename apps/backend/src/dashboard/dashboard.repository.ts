import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddRepositoryDto, RepositorySummary, PRSummary, UserStats } from './dto/dashboard.dto';

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

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
            mergedAt: 'desc',
          },
          take: 5,
          include: {
            docs: true,
          },
        },
      },
    });

    return repos.map(repo => ({
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
        mergedAt: 'desc',
      },
      take: 20,
    });

    return prs.map(pr => ({
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
        ? pr.docs.summary.substring(0, 200) + '...' : null,
    }));
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
        provider: 'github',
      },
    });
  }
}