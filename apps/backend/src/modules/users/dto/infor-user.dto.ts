import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Gender } from 'src/common/types/enums/gender';

class ProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  avatarUrl?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsDateString()
  birthday?: Date;

  @IsOptional()
  @IsString()
  bio?: string;
}

class SettingsDto {
  @IsOptional()
  @IsBoolean()
  allowMessagesFromStrangers?: boolean;

  @IsOptional()
  @IsBoolean()
  allowCallFromStrangers?: boolean;
}

export class InforUser {
  @IsOptional()
  @IsEmail()
  email?: string;

  @ValidateNested()
  @Type(() => ProfileDto)
  profile?: ProfileDto;

  @ValidateNested()
  @Type(() => SettingsDto)
  settings?: SettingsDto;
}
