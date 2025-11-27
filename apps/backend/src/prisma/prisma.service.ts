import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly configService: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: configService.get<string>('database.url')
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
