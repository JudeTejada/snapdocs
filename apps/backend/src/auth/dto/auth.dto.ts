import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional } from 'class-validator';

export class UserDto {
  @ApiProperty()
  @IsString()
  clerkId: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  githubId?: string;

  @ApiProperty()
  createdAt: Date;
}

export class ConnectGitHubDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  installationId: string;
}

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