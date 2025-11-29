import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { BullQueueService } from '../bullmq/bullmq.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bullQueueService: BullQueueService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Application health check' })
  @ApiResponse({ status: 200, description: 'Application is healthy' })
  @ApiResponse({ status: 503, description: 'Application is unhealthy' })
  async check() {
    const health: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'unknown',
        redis: 'unknown',
      },
    };

    try {
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;
      health.checks.database = 'ok';
    } catch (error) {
      health.checks.database = 'error';
      health.status = 'error';
    }

    try {
      // Check Redis/BullMQ connection
      await this.bullQueueService.getQueueStats();
      health.checks.redis = 'ok';
    } catch (error) {
      health.checks.redis = 'error';
      health.status = 'error';
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    health.memory = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
    };

    if (health.status === 'error') {
      throw new Error('Health check failed');
    }

    return health;
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  async ready() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async live() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}