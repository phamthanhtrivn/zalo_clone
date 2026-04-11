import { IsMongoId } from 'class-validator';

export class GetPinnedMessagesDto {
  @IsMongoId()
  userId: string;
}
