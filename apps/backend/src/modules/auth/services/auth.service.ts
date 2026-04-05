import { TempVerifyPayload } from './../types/tmp-verify-payload.type';
import { UsersService } from '../../users/users.service';
import { RedisService } from '../../../common/redis/redis.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Gender } from '@zalo-clone/shared-types';
import * as bcrypt from 'bcrypt';
import { AuthUser } from '../types/auth.type';
import { TokenService } from './jwt.service';
import { SessionService } from './session.service';
import { Purpose } from '../dto/verify-otp.dto';

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
      Number(process.env.OTP_EXPIRE_SECONDS) || 300,
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

  async verifyOtp(phone: string, otp: string, purpose: Purpose) {
    const user = await this.userService.findByPhone(phone);
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
      purpose,
      type: 'temp_verify',
      userId: user?._id,
    } as TempVerifyPayload);
    return { message: 'Xác thực thành công', tmp_token };
  }

  async forgotPassword(phone: string) {
    const user = await this.userService.findByPhone(phone);
    if (!user) {
      return { message: 'Số điện thoại chưa được đăng ký !' };
    }
    if (await this.sendOtp(phone)) {
      return { message: 'Mã otp đã được gọi. Vui lòng kiểm tra hộp thư !' };
    }
  }

  async resetPassword(user: AuthUser, password: string, device: string) {
    await this.userService.updatePassword(user.phone, password);

    return this.signIn(
      { userId: user.userId, phone: user.phone, name: user.name },
      device,
    );
  }

  async signUp(phone: string) {
    const user = await this.userService.findByPhone(phone);
    if (user) {
      throw new ConflictException(
        'Số điện thoại đã được đăng ký. Vui lòng đăng nhập !',
      );
    }
    if (await this.sendOtp(phone)) {
      return {
        message: 'Mã otp đã được gọi. Vui lòng kiểm tra hộp thư !',
        expiresIn: process.env.OTP_RESEND_SECONDS,
      };
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

  async validateUser(phone: string, pass: string): Promise<any> {
    const user = await this.userService.findByPhone(phone);
    if (user && (await bcrypt.compare(pass, user.password))) {
      return { userId: user._id, phone: user.phone, name: user.profile?.name };
    }
    return null;
  }

  async refresh(refreshToken: string) {
    const payload = (await this.tokenService.verifyRefresh(
      refreshToken,
    )) as AuthUser;

    console.log(payload);

    const session = await this.sessionService.findValidSession(
      payload.userId,
      refreshToken,
    );

    if (!session) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.findById(payload.userId);
    const accessToken = await this.tokenService.signAccess({
      userId: user?.id as string,
      phone: user?.phone,
    });

    return { accessToken };
  }

  async signIn(user: AuthUser, device: string) {
    await this.sessionService.removeByDevice(user.userId, device);

    const accessToken = await this.tokenService.signAccess(user);
    const refreshToken = await this.tokenService.signRefresh(user);

    const hashToken = await bcrypt.hash(refreshToken, 10);

    await this.sessionService.create(
      user.userId,
      hashToken,
      new Date(this.tokenService.decode(refreshToken).exp * 1000),
      device,
    );

    return { accessToken, refreshToken, user };
  }

  async signOut(userId: string, refreshToken: string) {
    const deleted = await this.sessionService.remove(userId, refreshToken);

    if (deleted) {
      return { message: 'Đăng xuất thành công !' };
    } else {
      throw new ForbiddenException('Không có phiên đăng nhập !');
    }
  }
}
