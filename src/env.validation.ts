import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsString,
  validateSync,
  IsOptional,
} from 'class-validator';

class EnvironmentVariables {
  @IsString()
  APP_NAME: string = 'Dance App';

  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_SECRET: string;

  @IsBoolean({})
  REQUIRE_EMAIL_VERIF: boolean = false;

  @IsString()
  JWT_EXPIRES_IN: string = '15m';

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  @IsString()
  @IsOptional()
  MAIL_FROM: string;

  @IsBoolean()
  MAIL_DEBUG: boolean = false;

  @IsString()
  @IsOptional()
  MAIL_ADAPTER: string;

  @IsString()
  @IsOptional()
  SMTP_HOST: string;

  @IsNumber()
  @IsOptional()
  SMTP_PORT: number;

  @IsBoolean()
  @IsOptional()
  SMTP_SECURE: boolean;

  @IsString()
  @IsOptional()
  SMTP_USER: string;

  @IsString()
  @IsOptional()
  SMTP_PASS: string;

  @IsString()
  @IsOptional()
  SENDGRID_API_KEY: string;

  @IsString()
  @IsOptional()
  MAILGUN_SMTP_HOST: string;

  @IsNumber()
  @IsOptional()
  MAILGUN_SMTP_PORT: number;

  @IsString()
  @IsOptional()
  MAILGUN_SMTP_USER: string;

  @IsString()
  @IsOptional()
  MAILGUN_SMTP_PASS: string;
}

export function validate(config: Record<string, unknown>) {
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
