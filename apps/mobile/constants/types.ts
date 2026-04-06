import { Gender } from "./../../../packages/shared-types/src/enums/gender";
export interface UserLogin {
  phone: string;
  password: string;
}

export enum Purpose {
  SignUp = "sign_up",
  ForgotPassword = "forgot_password",
}

export interface OtpVerify {
  phone: string;
  otp: string;
  purpose: string;
}

export interface AuthUser {
  userId: string;
  phone: string;
  name: string;
}

export interface CompleteSignUp {
  name: string;
  birthDay: Date;
  gender: Gender;
  password: string;
  repassword: string;
}

export interface ResetPassword {
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePassword {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}
