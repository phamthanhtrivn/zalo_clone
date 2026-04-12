import { IsNotEmpty, Matches } from 'class-validator';
export class SearchFriendDto {
  @IsNotEmpty({ message: 'UserID không được để trống' })
  userId: string;
  @IsNotEmpty({ message: 'Key không được để trống' })
  @Matches(/\S/, { message: 'Key không được chỉ chứa khoảng trắng' })
  key: string;
}
