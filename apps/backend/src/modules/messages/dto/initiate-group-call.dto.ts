import { IsEnum, IsMongoId } from 'class-validator';
import { CallType } from 'src/common/types/enums/call-type';

export class InitiateGroupCallDto {
  @IsMongoId()
  senderId: string;

  @IsMongoId()
  conversationId: string;

  @IsEnum(CallType)
  type: CallType;
}
