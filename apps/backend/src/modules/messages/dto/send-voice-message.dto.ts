import { Transform } from 'class-transformer';
import { IsMongoId, IsNumber, IsOptional } from 'class-validator';

export class SendVoiceMessageDto {
  @IsMongoId()
  senderId: string;

  @IsMongoId()
  conversationId: string;

  @IsOptional()
  @Transform(({ value }) => {
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return undefined;
    }
  })
  content?: {
    voiceDuration?: number;
  };

  @IsOptional()
  @IsMongoId()
  repliedId?: string;

  @IsOptional()
  @IsNumber()
  expireDuration?: number;
}
