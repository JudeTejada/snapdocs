import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UpdateUserDto, UserProfileResponseDto, GitHubStatusDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getOrCreateUser(clerkId: string, email: string, githubId?: string | null): Promise<UserProfileResponseDto> {
    const user = await this.usersRepository.findOrCreate(clerkId, {
      email,
      githubId: githubId ?? null,
      tokens: {},
    });

    return {
      clerkId: user.clerkId,
      email: user.email,
      githubId: user.githubId,
      createdAt: user.createdAt,
    };
  }

  async getUserByClerkId(clerkId: string) {
    return this.usersRepository.findByClerkId(clerkId);
  }

  async updateUser(clerkId: string, data: UpdateUserDto) {
    return this.usersRepository.updateByClerkId(clerkId, data);
  }

  async syncUser(clerkId: string, email: string): Promise<UserProfileResponseDto> {
    const user = await this.usersRepository.upsertByClerkId(
      clerkId,
      {
        clerkId,
        email,
        githubId: null,
        tokens: {},
      },
      { email },
    );

    return {
      clerkId: user.clerkId,
      email: user.email,
      githubId: user.githubId,
      createdAt: user.createdAt,
    };
  }

  async connectGitHub(clerkId: string, installationId: string) {
    return this.usersRepository.updateByClerkId(clerkId, { githubId: installationId });
  }

  async disconnectGitHub(clerkId: string) {
    return this.usersRepository.disconnectGitHub(clerkId);
  }

  async getGitHubStatus(clerkId: string): Promise<GitHubStatusDto> {
    const user = await this.usersRepository.findWithGitHubId(clerkId);
    return {
      connected: !!user?.githubId,
      installationId: user?.githubId,
    };
  }

  async findUserByClerkId(clerkId: string): Promise<UserProfileResponseDto | null> {
    const user = await this.usersRepository.findByClerkId(clerkId);
    if (!user) {
      return null;
    }

    return {
      clerkId: user.clerkId,
      email: user.email,
      githubId: user.githubId,
      createdAt: user.createdAt,
    };
  }
}