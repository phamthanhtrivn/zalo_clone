import { ConfigService } from '@nestjs/config';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { TMP_PURPOSE_KEY } from 'src/common/decorator/temp_purpose.decorator';

@Injectable()
export class TempVerifyGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const requiredPurpose = this.reflector.getAllAndOverride<string>(
      TMP_PURPOSE_KEY,
      [context.getHandler(), context.getClass()],
    );
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }
    const payload = await this.jwtService.verifyAsync<Record<string, unknown>>(
      token,
      {
        secret: this.configService.get<string>('tmp_secret'),
      },
    );

    if (requiredPurpose && payload.purpose !== requiredPurpose) {
      throw new UnauthorizedException('Sai mục đích token');
    }
    request['user'] = payload;

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    return type === 'Bearer' ? token : undefined;
  }
}
