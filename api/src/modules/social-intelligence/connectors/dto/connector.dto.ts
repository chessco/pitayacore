import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { SocialSource } from '../../dto/normalized-content';

export class CreateConnectorDto {
  @IsEnum(SocialSource)
  provider: SocialSource;

  /** External page / account / channel id on the provider. */
  @IsString()
  @IsNotEmpty()
  externalAccountId: string;

  /** Raw access token — encrypted at rest before storage, never returned. */
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateConnectorDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  accessToken?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
