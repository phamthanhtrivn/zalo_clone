import { ArrayNotEmpty, IsArray, IsMongoId } from 'class-validator';

export class ForwardMessageDto {
  @IsMongoId()
  userId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  messageIds: string[];
  
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  targetConversationIds: string[];
}
