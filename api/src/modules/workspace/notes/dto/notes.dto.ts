import { IsString, IsNotEmpty, IsOptional, IsInt, IsIn } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  tags?: any;
}

export class UpdateNoteDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsOptional()
  tags?: any;
}

export class VoteNoteDto {
  @IsInt()
  @IsIn([1, -1])
  value: number;
}
