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
import { ClerkAuthGuard } from "./guards/clerk-auth.guard";
import { GetClerkUser } from "./decorators/get-clerk-user.decorator";
import { ConnectGitHubDto } from "./dto/auth.dto";
import { GitHubService } from "../github/github.service";
import { UsersService } from "../users/users.service";
import { SyncService } from "../sync/sync.service";
import { DashboardService } from "../dashboard/dashboard.service";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly githubService: GitHubService,
    private readonly syncService: SyncService,
    private readonly dashboardService: DashboardService,
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
    const dbUser = await this.usersService.getOrCreateUser(
      user.clerkId,
      user.email,
    );

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
    const dbUser = await this.usersService.syncUser(user.clerkId, user.email);

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
    // 1. Connect GitHub account
    await this.usersService.connectGitHub(
      user.clerkId,
      connectGitHubDto.installationId,
    );

    // 2. Sync repositories immediately (inline, not queued)
    await this.syncService.syncRepositoriesFromGitHub(user.clerkId);

    // 3. Also sync PRs initially (inline)
    await this.syncService.syncPullRequestsFromGitHub(user.clerkId);

    return { message: "GitHub connected successfully" };
  }

  @Post("github/disconnect")
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Disconnect GitHub account" })
  @ApiResponse({ status: 200, description: "GitHub disconnected successfully" })
  async disconnectGitHub(@GetClerkUser() user: any) {
    const githubStatus = await this.usersService.getGitHubStatus(user.clerkId);

    if (!githubStatus.connected) {
      return { message: "User not connected to GitHub" };
    }

    try {
      await this.githubService.uninstallAppInstallation(
        githubStatus.installationId,
      );

      await this.usersService.disconnectGitHub(user.clerkId);

      return {
        message: "GitHub disconnected successfully",
        installationId: githubStatus.installationId,
      };
    } catch (error) {
      console.error("Error disconnecting GitHub:", error);

      return {
        error: "Failed to uninstall GitHub App",
        message: "Please try again or contact support if the issue persists",
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
    const backendUrl =
      this.configService.get<string>("backendUrl") || "http://localhost:3001";

    if (!clientId || !appId || !appSlug || !frontendUrl) {
      throw new Error("GitHub configuration not complete");
    }

    const redirectUri = `${backendUrl}/api/v1/auth/github/callback`;
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
      const frontendUrl = this.configService.get<string>("frontendUrl");
      return res.redirect(`${frontendUrl}/dashboard?error=no_installation`);
    }

    // Since we can't get Clerk user from callback, redirect to frontend with installation data
    const frontendUrl = this.configService.get<string>("frontendUrl");
    const redirectUrl = `${frontendUrl}/auth/github/callback?installation_id=${installationId}${state ? `&state=${state}` : ""}`;
    return res.redirect(redirectUrl);
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
    return await this.usersService.getGitHubStatus(user.clerkId);
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
    const githubStatus = await this.usersService.getGitHubStatus(user.clerkId);

    if (!githubStatus.connected) {
      return {
        success: false,
        error: "GitHub account not connected",
      };
    }

    // Return cached repositories from local database (no GitHub API call)
    const repositories = await this.dashboardService.getUserRepos(user.clerkId);

    return {
      success: true,
      data: repositories,
      count: repositories.length,
    };
  }

  @Get("github/configure")
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get URL to configure GitHub App installation (manage repositories)" })
  @ApiResponse({
    status: 200,
    description: "GitHub configuration URL retrieved successfully",
  })
  async getGitHubConfigureUrl(@GetClerkUser() user: any) {
    const githubStatus = await this.usersService.getGitHubStatus(user.clerkId);

    if (!githubStatus.connected) {
      return {
        success: false,
        error: "GitHub not connected",
      };
    }

    // GitHub's installation settings page where users can modify repository access
    const configureUrl = `https://github.com/settings/installations/${githubStatus.installationId}`;

    return {
      success: true,
      url: configureUrl,
      installationId: githubStatus.installationId,
    };
  }

  @Post("github/sync")
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Trigger repository and PR sync from GitHub" })
  @ApiResponse({ status: 200, description: "Sync triggered successfully" })
  async triggerSync(@GetClerkUser() user: any) {
    const githubStatus = await this.usersService.getGitHubStatus(user.clerkId);

    if (!githubStatus.connected) {
      return {
        success: false,
        error: "GitHub not connected",
      };
    }

    // Sync repositories and PRs
    await this.syncService.syncRepositoriesFromGitHub(user.clerkId);
    await this.syncService.syncPullRequestsFromGitHub(user.clerkId);

    return {
      success: true,
      message: "Sync completed successfully",
    };
  }
}
