import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  Query,
} from "@nestjs/common";
import { Response } from "express";
import { ConfigService } from "@nestjs/config";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { ClerkService } from "./clerk.service";
import { ClerkAuthGuard } from "./guards/clerk-auth.guard";
import { GetClerkUser } from "./decorators/get-clerk-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { ConnectGitHubDto } from "./dto/auth.dto";
import { GitHubService } from "../github/github.service";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly clerkService: ClerkService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly githubService: GitHubService,
  ) {}

  @Get("me")
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({
    status: 200,
    description: "User profile retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getCurrentUser(@GetClerkUser() user: any) {
    let dbUser = await this.prisma.user.findUnique({
      where: { clerkId: user.clerkId },
    });

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
      clerkId: dbUser.clerkId,
      email: dbUser.email,
      githubId: dbUser.githubId,
      createdAt: dbUser.createdAt,
    };
  }

  @Post("sync-user")
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Sync user data" })
  @ApiResponse({ status: 200, description: "User synced successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  async syncUser(@GetClerkUser() user: any) {
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
      clerkId: dbUser.clerkId,
      email: dbUser.email,
      githubId: dbUser.githubId,
      createdAt: dbUser.createdAt,
    };
  }

  @Post("github/connect")
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Connect GitHub account" })
  @ApiResponse({ status: 200, description: "GitHub connected successfully" })
  @ApiResponse({ status: 400, description: "Invalid request data" })
  async connectGitHub(
    @GetClerkUser() user: any,
    @Body() connectGitHubDto: ConnectGitHubDto,
  ) {
    await this.prisma.user.update({
      where: { clerkId: user.clerkId },
      data: {
        githubId: connectGitHubDto.installationId,
      },
    });

    return { message: "GitHub connected successfully" };
  }

  @Post("github/disconnect")
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Disconnect GitHub account" })
  @ApiResponse({ status: 200, description: "GitHub disconnected successfully" })
  async disconnectGitHub(@GetClerkUser() user: any) {
    // Get current user with GitHub installation ID
    const dbUser = await this.prisma.user.findUnique({
      where: { clerkId: user.clerkId },
      select: { githubId: true },
    });

    if (!dbUser?.githubId) {
      // User is not connected to GitHub, nothing to do
      return { message: "User not connected to GitHub" };
    }

    try {
      // Step 1: Uninstall GitHub App from user's account
      await this.githubService.uninstallAppInstallation(dbUser.githubId);

      // Step 2: Update our database only after successful uninstall
      await this.prisma.user.update({
        where: { clerkId: user.clerkId },
        data: {
          githubId: null,
          // Clear any stored tokens as well
          tokens: {},
        },
      });

      return { 
        message: "GitHub disconnected successfully",
        installationId: dbUser.githubId 
      };
    } catch (error) {
      console.error("Error disconnecting GitHub:", error);
      
      // If uninstall failed, we should not clear our database
      // This prevents the user from being stuck in a state where they're
      // not connected to us but still have the app installed on GitHub
      return {
        error: "Failed to uninstall GitHub App",
        message: "Please try again or contact support if the issue persists"
      };
    }
  }

  @Get("github/install")
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Install GitHub App" })
  @ApiResponse({
    status: 302,
    description: "Redirect to GitHub App installation",
  })
  async installGitHubApp(@GetClerkUser() user: any, @Res() res: Response) {
    const clientId = this.configService.get<string>("github.clientId");
    const appId = this.configService.get<string>("github.appId");
    const appSlug = this.configService.get<string>("github.appSlug");
    const frontendUrl = this.configService.get<string>("frontendUrl");

    if (!clientId || !appId || !appSlug || !frontendUrl) {
      throw new Error("GitHub configuration not complete");
    }

    const redirectUri = `http://localhost:3001/api/v1/auth/github/callback`;
    const installUrl = `https://github.com/apps/${appSlug}/installations/new?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    console.log("installUrl", installUrl);
    return res.json({ success: true, url: installUrl });
  }

  @Get("github/callback")
  @ApiOperation({ summary: "GitHub App OAuth callback" })
  @ApiResponse({ status: 200, description: "GitHub connected successfully" })
  async githubCallback(
    @Query("installation_id") installationId: string,
    @Query("state") state: string,
    @Res() res: Response,
  ) {
    if (!installationId) {
      return res.redirect("http://localhost:3000/dashboard?error=no_installation");
    }

    // Since we can't get Clerk user from callback, redirect to frontend with installation data
    const frontendUrl = `http://localhost:3000/auth/github/callback?installation_id=${installationId}${state ? `&state=${state}` : ''}`;
    return res.redirect(frontendUrl);
  }

  @Get("github/status")
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get GitHub connection status" })
  @ApiResponse({
    status: 200,
    description: "GitHub status retrieved successfully",
  })
  async getGitHubStatus(@GetClerkUser() user: any) {
    const dbUser = await this.prisma.user.findUnique({
      where: { clerkId: user.clerkId },
      select: {
        githubId: true,
      },
    });

    return {
      connected: !!dbUser?.githubId,
      installationId: dbUser?.githubId,
    };
  }

  @Get("github/repositories")
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user repositories accessible to GitHub App" })
  @ApiResponse({
    status: 200,
    description: "User repositories retrieved successfully",
  })
  async getUserRepositories(@GetClerkUser() user: any) {
    const dbUser = await this.prisma.user.findUnique({
      where: { clerkId: user.clerkId },
      select: {
        githubId: true,
      },
    });

    if (!dbUser?.githubId) {
      return {
        success: false,
        error: "GitHub account not connected",
      };
    }

    try {
      const repositories = await this.githubService.getInstallationRepositories(dbUser.githubId);
      
      return {
        success: true,
        data: repositories,
        count: repositories.length,
      };
    } catch (error) {
      console.error("Error fetching user repositories:", error);
      return {
        success: false,
        error: "Failed to fetch repositories",
      };
    }
  }
}
