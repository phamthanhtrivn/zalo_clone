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

  @IsOptional()
  storyLink?: {
    storyId?: string;
    authorId?: string;
    previewText?: string;
    previewImage?: string;
  } | null;
}
