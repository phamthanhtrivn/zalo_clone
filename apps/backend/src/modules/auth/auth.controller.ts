import { AuthService } from './services/auth.service';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  Request,
  Res,
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
import { ChangePasswordDTO } from './dto/change-password.dto';
import type { Response } from 'express';

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
    const device = req.headers['user-agent'] as string;
    try {
      return await this.authService.completeSignUp(
        req.user.phone,
        signUpDto.name,
        signUpDto.gender,
        signUpDto.birthDay,
        signUpDto.password,
        device,
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
  async logIn(@Request() req, @Res({ passthrough: true }) res: Response) {
    const device = req.headers['user-agent'] as string;

    const result = await this.authService.signIn(req.user, device);

    // Set Cookie cho Web (Mobile sẽ lờ đi cái này)
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return result;
  }

  @Post('sign-out')
  @UseGuards(JwtAuthGuard)
  async logOut(
    @Request() req: { user: AuthUser; cookies: any },
    @Body('refreshToken') bodyToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      console.log(req.user, req.cookies?.refreshToken);
      const token = (req.cookies?.refreshToken as string) || bodyToken;

      const result = await this.authService.signOut(req.user.userId, token);

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      return result;
    } catch (err: any) {
      console.log(err);
      throw new InternalServerErrorException(err);
    }
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Request() req: { user: AuthUser },
    @Body() changePasswordDTO: ChangePasswordDTO,
  ) {
    return this.authService.changePassword(
      changePasswordDTO.oldPassword,
      changePasswordDTO.newPassword,
      changePasswordDTO.confirmPassword,
      req.user.phone,
    );
  }

  @Post('token/refresh')
  @Public()
  refreshToken(@Request() req, @Body('refreshToken') bodyToken: string) {
    const token = (req.cookies?.refreshToken as string) || bodyToken;
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
