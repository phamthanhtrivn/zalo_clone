import { IsEnum, IsMongoId } from 'class-validator';
import { EmojiType } from 'src/common/types/enums/emoji-type';

export class ReactionDto {
  @IsMongoId()
  userId: string;
  @IsEnum(EmojiType)
  emojiType: EmojiType;
  @IsMongoId()
  messageId: string;
  @IsMongoId()
  conversationId: string;
}
