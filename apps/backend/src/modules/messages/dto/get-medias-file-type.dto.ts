import { FileType } from '@zalo-clone/shared-types';
import { IsEnum, IsMongoId, IsNumberString, IsOptional } from 'class-validator';

export class GetMediasFileTypeDto {
  @IsMongoId()
  userId: string;
  @IsOptional()
  @IsEnum(FileType)
  type?: FileType | 'LINK';
  @IsOptional()
  @IsMongoId()
  cursor?: string;
  @IsOptional()
  @IsNumberString()
  limit?: string;
  @IsOptional()
  senderId?: string;
  @IsOptional()
  fromDate?: string;
  @IsOptional()
  toDate?: string;
}
