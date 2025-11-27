import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { GitHubModule } from "./github/github.module";
import { ClerkModule } from "./auth/clerk.module";
import { AuthController } from "./auth/auth.controller";
import { HealthModule } from "./health/health.module";
import configuration from "./config/configuration";
import { validateEnv } from "./config/validation";
import { UsersModule } from './users/users.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      load: [configuration],
      validate: validateEnv,
      validationOptions: {
        allowUnknown: false,
        abortEarly: true,
      },
    }),
    PrismaModule,
    ClerkModule,
    HealthModule,
    UsersModule,
    DashboardModule,
    GitHubModule,
  ],
  controllers: [
    AppController,
    AuthController,
  ],
  providers: [],
})
export class AppModule {}
