import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ClerkService } from "./clerk.service";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production",
      signOptions: { expiresIn: "24h" },
    }),
  ],
  providers: [ClerkService],
  exports: [ClerkService, JwtModule],
})
export class ClerkModule {}