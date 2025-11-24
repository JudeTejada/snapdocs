import { Controller, Get, Post, Body, Headers, UseGuards } from '@nestjs/common';
import { ClerkService } from './clerk.service';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { GetClerkUser } from './decorators/get-clerk-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private clerkService: ClerkService,
    private prisma: PrismaService,
  ) {}

  @Get('me')
  @UseGuards(ClerkAuthGuard)
  async getCurrentUser(@GetClerkUser() user: any) {
    try {
      // Try to find user in database
      let dbUser = await this.prisma.user.findUnique({
        where: { clerkId: user.clerkId },
      });

      // If user doesn't exist in DB, create them
      if (!dbUser) {
        dbUser = await this.prisma.user.create({
          data: {
            clerkId: user.clerkId,
            email: user.email,
            githubId: null,
            tokens: {},
          },
        });
      }

      return {
        success: true,
        user: {
          clerkId: dbUser.clerkId,
          email: dbUser.email,
          githubId: dbUser.githubId,
          createdAt: dbUser.createdAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('sync-user')
  @UseGuards(ClerkAuthGuard)
  async syncUser(@GetClerkUser() user: any) {
    try {
      // Create or update user in database
      const dbUser = await this.prisma.user.upsert({
        where: { clerkId: user.clerkId },
        create: {
          clerkId: user.clerkId,
          email: user.email,
          githubId: null,
          tokens: {},
        },
        update: {
          email: user.email,
        },
      });

      return {
        success: true,
        user: {
          clerkId: dbUser.clerkId,
          email: dbUser.email,
          githubId: dbUser.githubId,
          createdAt: dbUser.createdAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('github/connect')
  @UseGuards(ClerkAuthGuard)
  async connectGitHub(
    @GetClerkUser() user: any,
    @Body() body: { code: string; installationId: string }
  ) {
    try {
      // This would handle GitHub OAuth flow
      // For now, we'll just store the installation ID
      
      await this.prisma.user.update({
        where: { clerkId: user.clerkId },
        data: {
          githubId: body.installationId.toString(),
        },
      });

      return {
        success: true,
        message: 'GitHub connected successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('github/disconnect')
  @UseGuards(ClerkAuthGuard)
  async disconnectGitHub(@GetClerkUser() user: any) {
    try {
      await this.prisma.user.update({
        where: { clerkId: user.clerkId },
        data: {
          githubId: null,
        },
      });

      return {
        success: true,
        message: 'GitHub disconnected successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('github/status')
  @UseGuards(ClerkAuthGuard)
  async getGitHubStatus(@GetClerkUser() user: any) {
    try {
      const dbUser = await this.prisma.user.findUnique({
        where: { clerkId: user.clerkId },
        select: {
          githubId: true,
        },
      });

      return {
        success: true,
        connected: !!dbUser?.githubId,
        installationId: dbUser?.githubId,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}