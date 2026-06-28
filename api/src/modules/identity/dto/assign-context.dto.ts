import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class AssignContextDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  roleId: string;

  @IsString()
  @IsOptional()
  verticalId?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
