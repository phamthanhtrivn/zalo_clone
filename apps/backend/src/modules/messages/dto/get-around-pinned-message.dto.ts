import { IsMongoId, IsNumberString, IsOptional } from 'class-validator';

export class GetAroundPinnedMessage {
  @IsMongoId()
  userId: string;
  @IsMongoId()
  messageId: string;
  @IsOptional()
  @IsNumberString()
  limit: number;
}
