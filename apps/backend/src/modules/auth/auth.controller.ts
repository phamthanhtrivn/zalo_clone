import { AuthService } from './services/auth.service';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Purpose, VerifyOtpDto } from './dto/verify-otp.dto';
import { SignUpDto } from './dto/signUp.dto';
import { TempVerifyGuard } from './passport/temp-auth.guard';
import { Public } from 'src/common/decorator/is-public.decorator';
import { RequestOtpDTO } from './dto/request-otp.dto';
import { AuthUser } from './types/auth.type';
import { JwtAuthGuard } from './passport/jwt-auth.guard';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { RequireTempPurpose } from 'src/common/decorator/temp_purpose.decorator';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  @Public()
  async signUp(@Body() requestOtp: RequestOtpDTO) {
    return this.authService.signUp(requestOtp.phone);
  }

  @Post('otp/verify')
  @Public()
  verifyOtp(@Body() verifyOtp: VerifyOtpDto) {
    return this.authService.verifyOtp(
      verifyOtp.phone,
      verifyOtp.otp,
      verifyOtp.purpose,
    );
  }

  @Post('complete-sign-up')
  @Public()
  @RequireTempPurpose(Purpose.SignUp)
  @UseGuards(TempVerifyGuard)
  async completeSignUp(@Request() req, @Body() signUpDto: SignUpDto) {
    if (signUpDto.password !== signUpDto.repassword) {
      throw new BadRequestException('Mật khẩu xác nhận không khớp !');
    }
    try {
      return await this.authService.completeSignUp(
        req.user.phone,
        signUpDto.name,
        signUpDto.gender,
        signUpDto.birthDay,
        signUpDto.password,
      );
    } catch (err) {
      console.log(`Lỗi khi sign up: ${err}`);
      throw new InternalServerErrorException('Lỗi sign up');
    }
  }

  @Post('forgot-password')
  @Public()
  forgotPassword(@Body('phone') phone: string) {
    console.log(phone);
    return this.authService.forgotPassword(phone);
  }

  @Post('reset-password')
  @Public()
  @RequireTempPurpose(Purpose.ForgotPassword)
  @UseGuards(TempVerifyGuard)
  resetPassword(@Request() req, @Body() resetPasswordDto: ResetPasswordDto) {
    if (resetPasswordDto.confirmPassword !== resetPasswordDto.newPassword) {
      throw new BadRequestException('Mật khẩu xác nhận không khớp !');
    }
    const device = req.headers['user-agent'] as string;
    return this.authService.resetPassword(
      req.user,
      resetPasswordDto.newPassword,
      device,
    );
  }

  @Post('signin-with-temp')
  @Public()
  @RequireTempPurpose(Purpose.ForgotPassword)
  @UseGuards(TempVerifyGuard)
  loginWithTemp(@Request() req) {
    const device = req.headers['user-agent'] as string;

    return this.authService.signIn(
      {
        userId: req.user.userId as string,
        phone: req.user.phone as string,
        name: req.user.name as string,
      },
      device,
    );
  }

  @Post('sign-in')
  @Public()
  @UseGuards(LocalAuthGuard)
  logIn(@Request() req) {
    const device = req.headers['user-agent'] as string;
    return this.authService.signIn(req.user, device);
  }

  @Post('sign-out')
  @UseGuards(JwtAuthGuard)
  logOut(
    @Request() req: { user: AuthUser },
    @Body('refreshToken') token: string,
  ) {
    return this.authService.signOut(req.user.userId, token);
  }

  @Post('token/refresh')
  @Public()
  refreshToken(@Body('refreshToken') token: string) {
    if (!token) {
      throw new BadRequestException('Refresh token không tồn tại !');
    }
    return this.authService.refresh(token);
  }

  // api này chỉ để test
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  profile(@Request() req) {
    return req.user as AuthUser;
  }
}
