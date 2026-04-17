import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { StringValue } from 'ms';
import { RedisService } from 'src/common/redis/redis.service';
import { AuthUser } from '../../modules/auth/types/auth.type';

@Injectable()
export class TokenService {
  constructor(
    private jwt: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  async signAccess(payload: any) {
    return await this.jwt.signAsync(payload, {
      secret: this.configService.get<string>('access_secret'),
      expiresIn: this.configService.get<StringValue>('access_expires'),
    });
  }

  async signRefresh(payload: any) {
    return await this.jwt.signAsync(payload, {
      secret: this.configService.get<string>('refresh_secret'),
      expiresIn: this.configService.get<StringValue>('refresh_expires'),
    });
  }

  decode(payload: any): any {
    return this.jwt.decode(payload);
  }

  verifyRefresh(token: string): any {
    return this.jwt.verifyAsync(token, {
      secret: this.configService.get<string>('refresh_secret'),
    });
  }

  verifyAccessToken(token: string): AuthUser {
    return this.jwt.verify(token, {
      secret: this.configService.get<string>('access_secret'),
    });
  }

  async signTempVerify(payload: any) {
    const token = await this.jwt.signAsync(payload, {
      secret: this.configService.get<string>('tmp_secret'),
      expiresIn: this.configService.get<StringValue>('tmp_expires'),
    });

    await this.redisService.set(
      `tmp_token_valid:${token}`,
      token,
      'EX',
      Number(this.configService.get<StringValue>('tmp_expires')),
    );

    return token;
  }
}
