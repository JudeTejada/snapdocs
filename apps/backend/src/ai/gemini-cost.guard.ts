import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GeminiCostGuard implements CanActivate {
  private readonly logger = new Logger(GeminiCostGuard.name);
  private dailyUsage = 0;
  private readonly DAILY_LIMIT = 250; // Free tier limit
  private lastReset = new Date();

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    // Reset counter if new day
    const now = new Date();
    if (now.getDate() !== this.lastReset.getDate()) {
      this.dailyUsage = 0;
      this.lastReset = now;
      this.logger.log('Daily Gemini API usage counter reset');
    }

    const apiKey = this.configService.get<string>('ai.geminiApiKey');

    // Check if this is a FREE tier key from AI Studio
    if (apiKey && apiKey.startsWith('AIza')) {
      this.dailyUsage++;

      this.logger.log(
        `Free tier usage: ${this.dailyUsage}/${this.DAILY_LIMIT} today`,
      );

      if (this.dailyUsage > this.DAILY_LIMIT) {
        const errorMessage = `Daily free tier limit exceeded! (${this.dailyUsage}/${this.DAILY_LIMIT})`;
        this.logger.error(errorMessage);

        throw new HttpException(
          {
            status: HttpStatus.TOO_MANY_REQUESTS,
            error: 'GEMINI_DAILY_LIMIT_EXCEEDED',
            message: 'Daily API usage limit reached. Please try again tomorrow or upgrade to a paid tier.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } else {
      // Paid tier key - allow unlimited
      this.logger.log('Paid tier API key detected - unlimited usage');
    }

    return true;
  }
}
