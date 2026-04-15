import {
  IsMongoId,
  IsOptional,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContentDto } from './content.dto';

export class SendMessageDto {
  @IsMongoId()
  senderId: string;
  @IsMongoId()
  conversationId: string;
  @IsOptional()
  @ValidateNested()
  @Type(() => ContentDto)
  content?: ContentDto;
  @IsOptional()
  @IsMongoId()
  repliedId?: string;
  @IsOptional()
  @IsNumber()
  expireDuration?: number;
}
