import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { PrismaModule } from "./prisma/prisma.module";
// import { BullmqModule } from "./bullmq/bullmq.module";
// import { WebhooksController } from "./webhooks/webhooks.controller";
import { GitHubService } from "./github/github.service";
import { ClerkModule } from "./auth/clerk.module";
import { AuthController } from "./auth/auth.controller";
import { DashboardController } from "./dashboard/dashboard.controller";
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
    // BullmqModule,
  ],
  controllers: [
    AppController,
    AuthController,
    DashboardController,
    // WebhooksController
  ],
  providers: [GitHubService],
})
export class AppModule {}
