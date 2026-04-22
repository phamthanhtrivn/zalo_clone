import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { parseClientInfo } from '../util/client-info.util';

export interface IClientInfo {
  deviceId: string;
  deviceName: string;
  ip: string;
  deviceType: 'browser' | 'mobile' | 'tablet';
  location: string;
}

export const ClientContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): IClientInfo => {
    const req = ctx.switchToHttp().getRequest<Request>();

    const userAgent = req.headers['user-agent'] || '';
    const rawIp = req.headers['x-forwarded-for'] || req.ip || '127.0.0.1';
    const deviceId = (req.headers['x-device-id'] as string) || 'unknown-device';

    // Gọi hàm dùng chung
    const parsedInfo = parseClientInfo(userAgent, rawIp as string);

    return {
      deviceId,
      ...parsedInfo, // Gộp kết quả vào
    };
  },
);
