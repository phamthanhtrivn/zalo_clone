import { IsDateString, IsEnum, IsNotEmpty, Matches } from 'class-validator';
import { IsAtLeast14 } from 'src/common/decorator/check-valid-old.decorator';
import { Gender } from 'src/common/types/enums/gender';

export class SignUpDto {
  @IsNotEmpty({ message: 'Vui lòng nhập tên của bạn' })
  @Matches(/^[A-ZÀ-Ỹ][a-zà-ỹ]*(\s[A-ZÀ-Ỹ][a-zà-ỹ]*)*$/, {
    message: 'Mỗi chữ cái đầu phải viết hoa',
  })
  name: string;

  @IsDateString()
  @IsAtLeast14({ message: 'Người dùng phải đủ 14 tuổi' })
  birthDay: Date;

  @IsEnum(Gender, { message: 'Vui lòng chọn giới tính' })
  gender: Gender;

  @IsNotEmpty()
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/, {
    message:
      'Mật khẩu phải có ít nhất 8 ký tự, ít nhất 1 chữ in hoa, ít nhất 1 số và 1 ký tự đặc biệt',
  })
  password: string;

  @IsNotEmpty({ message: 'Vui lòng xác nhận lại mật khẩu' })
  repassword: string;
}
