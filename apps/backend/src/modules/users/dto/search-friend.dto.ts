import { IsNotEmpty, IsOptional } from 'class-validator';

export class SearchFriendDto {
  @IsNotEmpty({ message: 'UserID không được để trống' })
  userId!: string;

  @IsOptional()
  key?: string;
}
