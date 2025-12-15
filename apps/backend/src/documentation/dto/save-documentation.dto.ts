import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';

export class RepositoryDto {
  @IsString()
  @IsNotEmpty()
  owner!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class PullRequestDto {
  @IsInt()
  @Min(1)
  number!: number;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  author!: string;

  @IsOptional()
  @IsDateString()
  mergedAt?: string;

  @IsOptional()
  @IsIn(['open', 'closed', 'merged'])
  state?: string;

  @IsOptional()
  @IsString()
  sha?: string;
}

export class SaveDocumentationDto {
  @ValidateNested()
  @Type(() => RepositoryDto)
  repository!: RepositoryDto;

  @ValidateNested()
  @Type(() => PullRequestDto)
  pullRequest!: PullRequestDto;

  @IsString()
  @IsNotEmpty()
  documentation!: string;
}
