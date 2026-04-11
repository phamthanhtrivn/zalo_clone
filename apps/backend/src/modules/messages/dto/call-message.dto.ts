import { IsEnum, IsMongoId } from 'class-validator';
import { CallType } from 'src/common/types/enums/call-type';

export class CallMessageDto {
  @IsMongoId()
  senderId: string;
  @IsMongoId()
  conversationId: string;

  @IsEnum(CallType)
  type: CallType;
}
