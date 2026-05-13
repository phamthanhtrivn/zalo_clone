import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ContentDto {
  @IsOptional()
  @IsString()
  text?: string;
  @IsOptional()
  @IsString()
  icon?: string;
  @IsOptional()
  @IsNumber()
  voiceDuration?: number;
}
