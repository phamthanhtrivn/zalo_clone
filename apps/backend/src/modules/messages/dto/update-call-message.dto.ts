import { IsEnum, IsMongoId } from 'class-validator';
import { CallStatus } from 'src/common/types/enums/call-status';

export class UpdateCallMessageDto {
  @IsMongoId()
  messageId: string;
  @IsMongoId()
  conversationId: string;
  @IsEnum(CallStatus)
  status: CallStatus;
}
