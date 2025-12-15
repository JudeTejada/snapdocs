import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findRepository(owner: string, name: string) {
    return this.prisma.repo.findUnique({
      where: {
        owner_name: {
          owner,
          name,
        },
      },
    });
  }

  async upsertPullRequest(repoId: string, params: {
    number: number;
    title: string;
    author: string;
    mergedAt?: string;
    state?: string;
    sha?: string;
  }) {
    const mergedAt = params.mergedAt ? new Date(params.mergedAt) : new Date();

    return this.prisma.pullRequest.upsert({
      where: {
        repoId_number: {
          repoId,
          number: params.number,
        },
      },
      update: {
        title: params.title,
        author: params.author,
        mergedAt,
        state: params.state ?? 'closed',
        sha: params.sha,
      },
      create: {
        repoId,
        number: params.number,
        title: params.title,
        author: params.author,
        mergedAt,
        state: params.state ?? 'closed',
        sha: params.sha,
      },
    });
  }

  async ensurePullRequestExists(prId: string) {
    const pullRequest = await this.prisma.pullRequest.findUnique({ where: { id: prId } });

    if (!pullRequest) {
      throw new NotFoundException(`Pull request ${prId} was not found. Run sync before generating docs.`);
    }

    return pullRequest;
  }

  async upsertDocumentation(params: {
    prId: string;
    summary: string;
    json?: Record<string, unknown> | null;
  }) {
    return this.prisma.documentation.upsert({
      where: { prId: params.prId },
      update: {
        summary: params.summary,
        json: params.json as Prisma.InputJsonValue,
        generatedAt: new Date(),
      },
      create: {
        prId: params.prId,
        summary: params.summary,
        json: params.json as Prisma.InputJsonValue,
        generatedAt: new Date(),
      },
    });
  }
}
