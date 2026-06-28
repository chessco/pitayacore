import { IsString, IsNotEmpty } from 'class-validator';

export class AssignVerticalRoleDto {
  @IsString()
  @IsNotEmpty()
  verticalId: string;

  @IsString()
  @IsNotEmpty()
  roleId: string;
}
