import { Controller, Get, Post, Body } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { GetClerkUser } from '../auth/decorators/get-clerk-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { UseGuards } from '@nestjs/common';

@Controller('dashboard')
@UseGuards(ClerkAuthGuard)
export class DashboardController {
  constructor(private prisma: PrismaService) {}

  @Get('repos')
  async getUserRepos(@GetClerkUser() user: any) {
    try {
      const repos = await this.prisma.repo.findMany({
        where: {
          user: {
            clerkId: user.clerkId,
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

      return {
        success: true,
        repos: repos.map(repo => ({
          id: repo.id,
          name: repo.name,
          owner: repo.owner,
          provider: repo.provider,
          createdAt: repo.createdAt,
          prCount: repo.prs.length,
          recentPRs: repo.prs.map(pr => ({
            id: pr.id,
            number: pr.number,
            title: pr.title,
            mergedAt: pr.mergedAt,
            hasDocs: !!pr.docs,
          })),
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('prs')
  async getUserPRs(@GetClerkUser() user: any) {
    try {
      const prs = await this.prisma.pullRequest.findMany({
        where: {
          repo: {
            user: {
              clerkId: user.clerkId,
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

      return {
        success: true,
        prs: prs.map(pr => ({
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
          docsSummary: pr.docs?.summary ? 
            pr.docs.summary.substring(0, 200) + '...' : null,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('stats')
  async getUserStats(@GetClerkUser() user: any) {
    try {
      const [totalRepos, totalPRs, totalDocs] = await Promise.all([
        this.prisma.repo.count({
          where: {
            user: {
              clerkId: user.clerkId,
            },
          },
        }),
        this.prisma.pullRequest.count({
          where: {
            repo: {
              user: {
                clerkId: user.clerkId,
              },
            },
          },
        }),
        this.prisma.documentation.count({
          where: {
            pr: {
              repo: {
                user: {
                  clerkId: user.clerkId,
                },
              },
            },
          },
        }),
      ]);

      return {
        success: true,
        stats: {
          totalRepos,
          totalPRs,
          totalDocs,
          docsGenerated: totalDocs,
          pendingDocs: totalPRs - totalDocs,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('repos')
  async addRepo(
    @GetClerkUser() user: any,
    @Body() body: { owner: string; name: string; installationId: string }
  ) {
    try {
      // Get or create user in database
      let dbUser = await this.prisma.user.findUnique({
        where: { clerkId: user.clerkId },
      });

      if (!dbUser) {
        dbUser = await this.prisma.user.create({
          data: {
            clerkId: user.clerkId,
            email: user.email,
            githubId: body.installationId,
          },
        });
      }

      const repo = await this.prisma.repo.create({
        data: {
          name: body.name,
          owner: body.owner,
          userId: dbUser.id,
          installId: body.installationId,
          provider: 'github',
        },
      });

      return {
        success: true,
        repo: {
          id: repo.id,
          name: repo.name,
          owner: repo.owner,
          provider: repo.provider,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}