import { IsNotEmpty } from 'class-validator';

export class RequestFriendPhone {
  @IsNotEmpty({ message: 'UserID không được để trống' })
  userId!: string;

  @IsNotEmpty({ message: 'phone không được để trống' })
  phone!: string;
}

export default RequestFriendPhone;
