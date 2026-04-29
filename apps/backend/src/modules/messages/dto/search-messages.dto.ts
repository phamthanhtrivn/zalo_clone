import { IsDateString, IsMongoId, IsOptional, IsString } from 'class-validator';

export class SearchMessagesDto {
  @IsMongoId()
  userId: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsMongoId()
  senderId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsMongoId()
  cursor?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
