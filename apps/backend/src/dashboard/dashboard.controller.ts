import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { GetClerkUser } from '../auth/decorators/get-clerk-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AddRepositoryDto } from './dto/dashboard.dto';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('repos')
  @ApiOperation({ summary: 'Get user repositories' })
  @ApiResponse({ status: 200, description: 'Repositories retrieved successfully' })
  async getUserRepos(@GetClerkUser() user: any) {
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

  @Get('prs')
  @ApiOperation({ summary: 'Get user pull requests' })
  @ApiResponse({ status: 200, description: 'Pull requests retrieved successfully' })
  async getUserPRs(@GetClerkUser() user: any) {
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

  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getUserStats(@GetClerkUser() user: any) {
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
      totalRepos,
      totalPRs,
      totalDocs,
      docsGenerated: totalDocs,
      pendingDocs: totalPRs - totalDocs,
    };
  }

  @Post('repos')
  @ApiOperation({ summary: 'Add repository' })
  @ApiResponse({ status: 201, description: 'Repository added successfully' })
  async addRepo(
    @GetClerkUser() user: any,
    @Body() addRepositoryDto: AddRepositoryDto,
  ) {
    let dbUser = await this.prisma.user.findUnique({
      where: { clerkId: user.clerkId },
    });

    if (!dbUser) {
      dbUser = await this.prisma.user.create({
        data: {
          clerkId: user.clerkId,
          email: user.email,
          githubId: addRepositoryDto.installationId,
        },
      });
    }

    const repo = await this.prisma.repo.create({
      data: {
        name: addRepositoryDto.name,
        owner: addRepositoryDto.owner,
        userId: dbUser.id,
        installId: addRepositoryDto.installationId,
        provider: 'github',
      },
    });

    return {
      id: repo.id,
      name: repo.name,
      owner: repo.owner,
      provider: repo.provider,
    };
  }
}