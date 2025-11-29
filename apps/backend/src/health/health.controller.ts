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

  @Get('sync')
  @ApiOperation({ summary: 'Sync system health check' })
  @ApiResponse({ status: 200, description: 'Sync system is healthy' })
  @ApiResponse({ status: 503, description: 'Sync system is unhealthy' })
  async syncHealth() {
    const health: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      sync: {
        queues: {},
        metrics: {},
      },
    };

    try {
      // Get queue statistics
      const queueStats = await this.bullQueueService.getQueueStats();
      health.sync.queues = queueStats;

      // Calculate health metrics
      const totalFailed = queueStats.generateDocs.failed + queueStats.syncRepositories.failed;
      const totalWaiting = queueStats.generateDocs.waiting + queueStats.syncRepositories.waiting;
      const totalActive = queueStats.generateDocs.active + queueStats.syncRepositories.active;

      health.sync.metrics = {
        totalFailed,
        totalWaiting,
        totalActive,
        healthScore: this.calculateHealthScore(totalFailed, totalWaiting, totalActive),
      };

      // Determine overall sync health
      if (totalFailed > 20 || totalWaiting > 100) {
        health.status = 'warning';
      }

      if (totalFailed > 50) {
        health.status = 'error';
        throw new Error('Sync system unhealthy - too many failed jobs');
      }

    } catch (error) {
      health.status = 'error';
      health.error = error.message;
      throw new Error('Sync health check failed');
    }

    return health;
  }

  private calculateHealthScore(failed: number, waiting: number, active: number): number {
    // Simple health score calculation (0-100)
    let score = 100;
    
    // Deduct points for failed jobs
    score -= Math.min(failed * 2, 40);
    
    // Deduct points for waiting jobs
    score -= Math.min(waiting * 0.5, 30);
    
    // Deduct points for active jobs (some active is good, too many is bad)
    score -= Math.min(active * 0.2, 10);
    
    return Math.max(0, score);
  }
}