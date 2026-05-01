import { IsArray, IsNotEmpty, IsString, ArrayMinSize } from 'class-validator';

export class VotePollDto {
  @IsString()
  @IsNotEmpty()
  pollId: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Vui lòng chọn ít nhất 1 phương án' })
  @IsString({ each: true })
  optionIds: string[];
}