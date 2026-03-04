/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { UsersService } from '../../users/users.service';
import { RedisService } from '../../../common/redis/redis.service';
import {
  BadRequestException,
  Body,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Gender } from '@zalo-clone/shared-types';
import * as bcrypt from 'bcrypt';
import { AuthUser } from '../types/auth.type';
import { TokenService } from './jwt.service';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  constructor(
    private redisService: RedisService,
    private userService: UsersService,
    private tokenService: TokenService,
    private sessionService: SessionService,
  ) {}

  //tạo key để lưu otp trong redis
  private otpKey(phone: string) {
    return `otp:${phone}`;
  }

  private resendKey(phone: string) {
    return `otp:resend:${phone}`;
  }

  //send otp
  async sendOtp(phone: string) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const canResend = await this.redisService.ttl(this.resendKey(phone));

    if (canResend > 0) {
      throw new BadRequestException(
        `Vui lòng đợi ${canResend} giây để gửi lại OTP`,
      );
    }

    // Giả lập gửi otp
    console.log(`Otp for ${phone} is ${otp}`);

    //lưu otp
    await this.redisService.set(
      this.otpKey(phone),
      otp,
      'EX',
      Number(process.env.OTP_EXPIRE_SECONDS),
    );

    //lưu vết để tính thời gian cho phép gửi lại otp
    await this.redisService.set(
      this.resendKey(phone),
      '1',
      'EX',
      Number(process.env.OTP_RESEND_SECONDS),
    );

    return true;
  }

  async verifyOtp(phone: string, otp: string) {
    const savedOtp = await this.redisService.get(this.otpKey(phone));

    if (!savedOtp) {
      throw new BadRequestException('OTP đã hết hạn !');
    }

    if (otp !== savedOtp) {
      throw new BadRequestException('Nhập sai mã OTP !');
    }

    await this.redisService.del(this.otpKey(phone));

    const tmp_token = await this.tokenService.signTempVerify({
      phone,
      type: 'temp_verify',
    });
    return { message: 'Xác thực thành công', tmp_token };
  }

  async signUp(phone: string) {
    const user = await this.userService.findByPhone(phone);
    if (user) {
      throw new ConflictException(
        'Số điện thoại đã được đăng ký. Vui lòng đăng nhập !',
      );
    }
    if (await this.sendOtp(phone)) {
      return { message: 'Mã otp đã được gọi. Vui lòng kiểm tra hộp thư !' };
    }
  }

  async completeSignUp(
    phone: string,
    name: string,
    gender: Gender,
    birthday: Date,
    password: string,
  ) {
    await this.userService.createRegister(
      phone,
      name,
      gender,
      birthday,
      password,
    );
    return { message: 'Đăng ký tài khoản thành công !' };
  }

  async validateUser(phone: string, pass: string): Promise<AuthUser | null> {
    const user = await this.userService.findByPhone(phone);
    if (user && (await bcrypt.compare(pass, user.password))) {
      return { userId: user.id, phone: user.phone };
    }
    return null;
  }

  async refresh(refreshToken: string) {
    const payload = await this.tokenService.verifyRefresh(refreshToken);

    const session = await this.sessionService.findValidSession(
      payload.userId,
      refreshToken,
    );

    console.log(session);
    if (!session) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.findById(payload.id);

    const accessToken = await this.tokenService.signAccess({
      userId: user?.id,
      phone: user?.phone,
    });

    return { accessToken };
  }

  async signIn(user: AuthUser, device?: string) {
    const accessToken = await this.tokenService.signAccess(user);
    const refreshToken = await this.tokenService.signRefresh(user);

    const hashToken = await bcrypt.hash(refreshToken, 10);

    try {
      await this.sessionService.create(
        user.userId,
        hashToken,
        new Date(this.tokenService.decode(refreshToken).exp * 1000),
        device,
      );
    } catch (err) {
      console.log(err);
      throw err;
    }

    return { accessToken, refreshToken };
  }

  async signOut(userId: string, refreshToken: string) {
    await this.sessionService.remove(userId, refreshToken);

    return { message: 'Đăng xuất thành công !' };
  }
}
