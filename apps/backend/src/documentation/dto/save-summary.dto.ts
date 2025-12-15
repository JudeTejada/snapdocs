import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SaveSummaryDto {
  @IsString()
  @IsNotEmpty()
  prId!: string;

  @IsString()
  @IsNotEmpty()
  summary!: string;

  @IsOptional()
  json?: Record<string, unknown>;
}
