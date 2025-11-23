import { plainToInstance } from "class-transformer";
import { IsString, IsNumber, IsOptional, validateSync } from "class-validator";

class EnvironmentVariables {
  @IsNumber({}, { message: "PORT must be a valid number" })
  @IsOptional()
  PORT?: number;

  @IsString({ message: "NODE_ENV must be a valid string" })
  NODE_ENV: string;

  @IsString()
  FRONTEND_URL: string;

  @IsString({ message: "DATABASE_URL must be a valid string" })
  DATABASE_URL: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
