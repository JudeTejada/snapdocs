import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByClerkId(clerkId: string) {
    return this.prisma.user.findUnique({
      where: { clerkId },
    });
  }

  async create(data: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        clerkId: data.clerkId,
        email: data.email,
        githubId: data.githubId ?? null,
        tokens: data.tokens ?? {},
      },
    });
  }

  async updateByClerkId(clerkId: string, data: UpdateUserDto) {
    return this.prisma.user.update({
      where: { clerkId },
      data,
    });
  }

  async upsertByClerkId(
    clerkId: string,
    createData: CreateUserDto,
    updateData: UpdateUserDto,
  ) {
    return this.prisma.user.upsert({
      where: { clerkId },
      create: createData,
      update: updateData,
    });
  }

  async findOrCreate(clerkId: string, data: Omit<CreateUserDto, 'clerkId'>) {
    let user = await this.findByClerkId(clerkId);

    if (!user) {
      user = await this.create({
        clerkId,
        email: data.email,
        githubId: data.githubId ?? null,
        tokens: data.tokens ?? {},
      });
    }

    return user;
  }

  async findWithGitHubId(clerkId: string) {
    return this.prisma.user.findUnique({
      where: { clerkId },
      select: {
        githubId: true,
      },
    });
  }

  async disconnectGitHub(clerkId: string) {
    return this.prisma.user.update({
      where: { clerkId },
      data: {
        githubId: null,
        tokens: {},
      },
    });
  }

  async findAllConnected() {
    return this.prisma.user.findMany({
      where: {
        githubId: {
          not: null,
        },
      },
      select: {
        clerkId: true,
        email: true,
        githubId: true,
        createdAt: true,
      },
    });
  }
}