import { IsOptional, IsString, IsEmail, IsObject } from 'class-validator';

export class CreateUserDto {
  @IsString()
  clerkId: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  githubId?: string | null;

  @IsOptional()
  @IsObject()
  tokens?: any;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  githubId?: string | null;

  @IsOptional()
  @IsObject()
  tokens?: any;
}

export class UserProfileResponseDto {
  clerkId: string;
  email: string;
  githubId?: string | null;
  createdAt: Date;
}

export class GitHubStatusDto {
  connected: boolean;
  installationId?: string | null;
}