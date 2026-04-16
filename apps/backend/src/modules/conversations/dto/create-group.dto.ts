import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsOptional()
  name!: string;

  @IsArray({ message: 'Danh sách thành viên phải là mảng' })
  @ArrayMinSize(2, { message: 'Phải chọn ít nhất 2 bạn bè để tạo nhóm' })
  @IsString({ each: true })
  memberIds!: string[];

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
