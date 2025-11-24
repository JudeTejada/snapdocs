import { IsString, IsObject } from 'class-validator';

export class GitHubWebhookDto {
  @IsString()
  id: string;

  @IsString()
  event: string;

  @IsString()
  action: string;

  @IsObject()
  pull_request: {
    id: number;
    number: number;
    title: string;
    html_url: string;
    body: string;
    merged: boolean;
    merged_at: string;
    user: {
      login: string;
      id: number;
    };
    head: {
      sha: string;
      ref: string;
    };
    base: {
      ref: string;
    };
  };

  @IsObject()
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
  };

  @IsObject()
  installation: {
    id: number;
  };
}

export class WebhookResponseDto {
  success: boolean;
  message: string;
  data?: any;
}