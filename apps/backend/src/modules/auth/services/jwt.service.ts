import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { StringValue } from 'ms';

@Injectable()
export class TokenService {
  constructor(
    private jwt: JwtService,
    private configService: ConfigService,
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

  verifyRefresh(token: string) {
    return this.jwt.verifyAsync(token, {
      secret: this.configService.get<string>('refresh_secret'),
    });
  }

  async signTempVerify(payload: any) {
    return await this.jwt.signAsync(payload, {
      secret: this.configService.get<string>('tmp_secret'),
      expiresIn: this.configService.get<StringValue>('tmp_expires'),
    });
  }
}
