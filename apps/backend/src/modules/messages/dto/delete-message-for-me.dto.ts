import { IsMongoId } from 'class-validator';

export class DeleteMessageForMeDto {
  @IsMongoId()
  userId: string;
  @IsMongoId()
  messageId: string;
  @IsMongoId()
  conversationId: string;
}
