import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { GeminiCostGuard } from './gemini-cost.guard';

@Module({
  providers: [GeminiService, GeminiCostGuard],
  exports: [GeminiService, GeminiCostGuard],
})
export class AiModule {}
