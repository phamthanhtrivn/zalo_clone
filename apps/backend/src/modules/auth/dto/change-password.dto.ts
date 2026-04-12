import { IsNotEmpty, Matches } from 'class-validator';

export class ChangePasswordDTO {
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu cũ' })
  oldPassword: string;

  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu mới' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/, {
    message:
      'Password phải có ít nhất 8 ký tự, ít nhất 1 chữ in hoa, ít nhất 1 số và 1 ký tự đặc biệt',
  })
  newPassword: string;

  @IsNotEmpty({ message: 'Hãy nhập lại mật khẩu để xác nhận' })
  confirmPassword: string;
}
