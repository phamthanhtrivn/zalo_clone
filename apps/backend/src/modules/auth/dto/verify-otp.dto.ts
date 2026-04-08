import { IsEnum, IsPhoneNumber, Length } from 'class-validator';

export enum Purpose {
  SignUp = 'sign_up',
  ForgotPassword = 'forgot_password',
}

export class VerifyOtpDto {
  @IsPhoneNumber('VN')
  phone: string;

  @Length(6, 6)
  otp: string;

  @IsEnum(Purpose)
  purpose: Purpose;
}
