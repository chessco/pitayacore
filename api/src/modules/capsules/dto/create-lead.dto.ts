import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsObject,
} from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  capsuleId: string;

  @IsString()
  @IsOptional()
  conversationId?: string;

  @IsString()
  @IsOptional()
  campaignId?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}
