import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Field to sort by' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class PRPaginationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ['createdAt', 'number', 'title', 'state', 'author'],
    default: 'createdAt'
  })
  @IsOptional()
  @IsIn(['createdAt', 'number', 'title', 'state', 'author'])
  sortBy?: string = 'createdAt';
}

export class RepoPaginationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ['createdAt', 'name', 'owner', 'lastSyncAt'],
    default: 'createdAt'
  })
  @IsOptional()
  @IsIn(['createdAt', 'name', 'owner', 'lastSyncAt'])
  sortBy?: string = 'createdAt';
}

export class PaginationMeta {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;
}
