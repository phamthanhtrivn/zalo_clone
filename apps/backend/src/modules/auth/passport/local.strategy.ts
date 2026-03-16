import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthUser } from '../types/auth.type';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'phone' });
  }

  async validate(phone: string, password: string): Promise<AuthUser> {
    const user = (await this.authService.validateUser(
      phone,
      password,
    )) as AuthUser;
    if (!user) {
      throw new UnauthorizedException({
        message: 'Tài khoản hoặc mật khẩu không chính xác !',
      });
    }
    console.log(`User ${user.phone} vừa đăng nhập`);
    return user;
  }
}
