import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsArray,
  IsEnum,
} from 'class-validator';

export enum CapsuleStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

export class CreateCapsuleDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsString()
  @IsNotEmpty()
  agentId: string;

  @IsEnum(CapsuleStatus)
  @IsOptional()
  status?: CapsuleStatus;

  @IsArray()
  @IsNotEmpty()
  contentBlocks: any[];

  @IsArray()
  @IsOptional()
  knowledgeIds?: string[];

  @IsObject()
  @IsOptional()
  promptConfig?: any;

  @IsObject()
  @IsOptional()
  ctaConfig?: any;

  @IsString()
  @IsOptional()
  tenantId?: string;
}
