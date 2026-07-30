import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class ConfirmSelectionDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  accountIds: string[];
}
