import { AuthService } from './services/auth.service';
import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SignUpDto } from './dto/signUp.dto';
import { TempVerifyGuard } from './passport/temp-auth.guard';
import { Public } from 'src/common/decorator/is-public.decorator';
import { RequestOtpDTO } from './dto/request-otp.dto';
import { AuthUser } from './types/auth.type';
import { JwtAuthGuard } from './passport/jwt-auth.guard';
import { LocalAuthGuard } from './passport/local-auth.guard';

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
    return this.authService.verifyOtp(verifyOtp.phone, verifyOtp.otp);
  }

  @Post('complete-sign-up')
  @Public()
  @UseGuards(TempVerifyGuard)
  async completeSignUp(@Body() signUpDto: SignUpDto) {
    console.log('Request user:', signUpDto);
    try {
      return await this.authService.completeSignUp(
        signUpDto.phone,
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

  @Post('sign-in')
  @Public()
  @UseGuards(LocalAuthGuard)
  logIn(@Request() req) {
    const device = req.headers['user-agent'] as string;
    return this.authService.signIn(req.user, device);
  }

  @Post('log-out')
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
    return this.authService.refresh(token);
  }

  // api này chỉ để test
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  profile(@Request() req) {
    return req.user as AuthUser;
  }
}
