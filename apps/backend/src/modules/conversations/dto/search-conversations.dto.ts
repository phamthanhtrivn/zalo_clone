import {
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  Matches,
} from 'class-validator';

export class SearchConversationsDto {
  @IsOptional()
  @IsMongoId()
  userId: string;

  @IsNotEmpty()
  @Matches(/\S/, { message: 'Keyword khong duoc chi chua khoang trang' })
  keyword: string;

  @IsOptional()
  @IsIn(['all', 'contacts', 'messages', 'files', 'groups'])
  scope?: 'all' | 'contacts' | 'messages' | 'files' | 'groups';

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
