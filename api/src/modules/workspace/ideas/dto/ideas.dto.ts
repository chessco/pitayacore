import { WorkspaceIdeaStatus } from '@prisma/mysql-client';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class CreateIdeaDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(WorkspaceIdeaStatus)
  @IsOptional()
  status?: WorkspaceIdeaStatus;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  category?: string;
}

export class UpdateIdeaDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(WorkspaceIdeaStatus)
  @IsOptional()
  status?: WorkspaceIdeaStatus;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  category?: string;
}
