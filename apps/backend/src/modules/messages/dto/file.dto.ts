import { IsEnum, IsNumber, IsString } from 'class-validator';
import { FileType } from 'src/common/types/enums/file-type';

export class FileDto {
  @IsString()
  fileName: string;
  @IsString()
  fileUrl: string;
  @IsNumber()
  fileSize: number;
  @IsEnum(FileType)
  type: FileType;
}
