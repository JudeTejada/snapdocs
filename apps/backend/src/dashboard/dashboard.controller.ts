import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { GetClerkUser } from '../auth/decorators/get-clerk-user.decorator';
import { AddRepositoryDto } from './dto/dashboard.dto';
import { DashboardService } from './dashboard.service';
import { UsersService } from '../users/users.service';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly usersService: UsersService,
  ) {}

  @Get('repos')
  @ApiOperation({ summary: 'Get user repositories' })
  @ApiResponse({ status: 200, description: 'Repositories retrieved successfully' })
  async getUserRepos(@GetClerkUser() user: any) {
    return this.dashboardService.getUserRepos(user.clerkId);
  }

  @Get('prs')
  @ApiOperation({ summary: 'Get user pull requests' })
  @ApiResponse({ status: 200, description: 'Pull requests retrieved successfully' })
  async getUserPRs(@GetClerkUser() user: any) {
    return this.dashboardService.getUserPRs(user.clerkId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getUserStats(@GetClerkUser() user: any) {
    return this.dashboardService.getUserStats(user.clerkId);
  }

  @Post('repos')
  @ApiOperation({ summary: 'Add repository' })
  @ApiResponse({ status: 201, description: 'Repository added successfully' })
  async addRepo(
    @GetClerkUser() user: any,
    @Body() addRepositoryDto: AddRepositoryDto,
  ) {
    await this.usersService.getOrCreateUser(
      user.clerkId, 
      user.email, 
      addRepositoryDto.installationId
    );

    const repo = await this.dashboardService.addRepository(user.clerkId, addRepositoryDto);

    return {
      id: repo.id,
      name: repo.name,
      owner: repo.owner,
      provider: repo.provider,
    };
  }
}