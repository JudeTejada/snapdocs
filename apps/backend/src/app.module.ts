import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { GitHubService } from "./github/github.service";
import { ClerkModule } from "./auth/clerk.module";
import { AuthController } from "./auth/auth.controller";
import { DashboardController } from "./dashboard/dashboard.controller";
import { HealthModule } from "./health/health.module";
import configuration from "./config/configuration";
import { validateEnv } from "./config/validation";

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
  ],
  controllers: [
    AppController,
    AuthController,
    DashboardController,
  ],
  providers: [GitHubService],
})
export class AppModule {}
