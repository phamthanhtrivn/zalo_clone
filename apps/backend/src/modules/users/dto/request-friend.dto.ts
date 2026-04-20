import { IsNotEmpty } from 'class-validator';
export class RequestFriendDto {
  @IsNotEmpty({ message: 'UserID không được để trống' })
  userId!: string;
  @IsNotEmpty({ message: 'FriendID không được để trống' })
  friendId!: string;
}
