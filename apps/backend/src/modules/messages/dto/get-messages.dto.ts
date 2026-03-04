import { IsMongoId, IsNumberString, IsOptional } from 'class-validator';

export class GetMessagesDto {
  @IsMongoId()
  userId: string;
  @IsOptional()
  @IsMongoId()
  cursor?: string; // _id của message cũ nhất hiện có
  @IsOptional()
  @IsNumberString()
  limit?: string;
}
