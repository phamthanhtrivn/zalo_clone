import { CallStatus } from '@zalo-clone/shared-types';
import { IsEnum, IsMongoId } from 'class-validator';

export class UpdateCallMessageDto {
  @IsMongoId()
  messageId: string;
  @IsMongoId()
  conversationId: string;
  @IsEnum(CallStatus)
  status: CallStatus;
}
