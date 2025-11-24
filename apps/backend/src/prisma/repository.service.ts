import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class RepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrUpdateRepository(data: {
    name: string;
    owner: string;
    installId: string;
    userId?: string;
  }) {
    const { name, owner, installId, userId } = data;

    return this.prisma.repo.upsert({
      where: {
        owner_name: {
          owner,
          name,
        },
      },
      create: {
        name,
        owner,
        installId,
        userId: userId || 'default-user',
      },
      update: {
        installId,
        updatedAt: new Date(),
      },
    });
  }

  async createPullRequest(data: {
    repoId: string;
    number: number;
    title: string;
    author: string;
    mergedAt: Date;
    sha?: string;
  }) {
    const { repoId, number, title, author, mergedAt, sha } = data;

    return this.prisma.pullRequest.upsert({
      where: {
        repoId_number: {
          repoId,
          number,
        },
      },
      create: {
        repoId,
        number,
        title,
        author,
        mergedAt,
        sha,
        state: 'closed',
      },
      update: {
        title,
        sha,
        mergedAt,
        updatedAt: new Date(),
      },
    });
  }
}