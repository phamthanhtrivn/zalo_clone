import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, ArrayMinSize } from 'class-validator';

export class CreatePollDto {
  @IsString({ message: 'Tiêu đề phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  title: string;

  @IsArray({ message: 'Danh sách phương án phải là một mảng' })
  @ArrayMinSize(2, { message: 'Phải có ít nhất 2 phương án' })
  @IsString({ each: true, message: 'Mỗi phương án phải là một chuỗi ký tự' })
  options: string[];

  @IsBoolean({ message: 'Lựa chọn nhiều phải là kiểu true/false' })
  @IsOptional()
  isMultipleChoice?: boolean;

  @IsBoolean({ message: 'Thêm phương án phải là kiểu true/false' })
  @IsOptional()
  allowAddOptions?: boolean;

  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @IsBoolean()
  @IsOptional()
  hideResultsUntilVoted?: boolean;

  @IsOptional()
  expiresAt?: string;
}