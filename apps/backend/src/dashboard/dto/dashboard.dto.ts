import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class AddRepositoryDto {
  @ApiProperty()
  @IsString()
  owner: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  installationId: string;
}

export class RepositorySummary {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  owner: string;

  @ApiProperty()
  provider: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  prCount: number;

  @ApiProperty({ type: [Object] })
  recentPRs: Array<{
    id: string;
    number: number;
    title: string;
    mergedAt: Date;
    hasDocs: boolean;
  }>;
}

export class PRSummary {
  @ApiProperty()
  id: string;

  @ApiProperty()
  number: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  author: string;

  @ApiProperty()
  mergedAt: Date;

  @ApiProperty({ type: Object })
  repo: {
    name: string;
    owner: string;
  };

  @ApiProperty()
  hasDocs: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  docsSummary?: string;
}

export class UserStats {
  @ApiProperty()
  totalRepos: number;

  @ApiProperty()
  totalPRs: number;

  @ApiProperty()
  totalDocs: number;

  @ApiProperty()
  docsGenerated: number;

  @ApiProperty()
  pendingDocs: number;
}