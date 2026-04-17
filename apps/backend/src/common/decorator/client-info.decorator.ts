import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import UAParserImport from 'ua-parser-js';
import geoip from 'geoip-lite';
import { Request } from 'express';

const UAParser = UAParserImport as unknown as {
  new (ua?: string): UAParserImport.UAParser;
};

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

    // Lấy IP (Ưu tiên x-forwarded-for nếu chạy sau Nginx/Proxy)
    let ip = req.headers['x-forwarded-for'] || req.ip || '127.0.0.1';
    if (typeof ip !== 'string') ip = ip[0]; // Xử lý nếu là array
    ip = ip.split(',')[0].trim(); // Lấy IP thực tế đầu tiên

    // Parse thông tin Device / Browser
    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();

    let deviceName = 'Thiết bị không xác định';
    if (device.model) {
      // Ví dụ: Apple iPhone, Samsung SM-G998B
      deviceName = `${device.vendor || ''} ${device.model}`.trim();
    } else if (os.name) {
      // Ví dụ: Windows 10 - Chrome
      deviceName =
        `${os.name} ${os.version || ''} - ${browser.name || ''}`.trim();
    }

    let deviceType: 'browser' | 'mobile' | 'tablet' = 'browser';

    if (device.type === 'mobile' || device.type === 'wearable') {
      deviceType = 'mobile';
    } else if (device.type === 'tablet') {
      deviceType = 'tablet';
    }

    // Lấy Location từ IP
    const geo = geoip.lookup(ip);
    const location = geo
      ? `${geo.city}, ${geo.country}`
      : 'Vị trí không xác định';

    //deviceId được frontend phát sinh và lưu cứng vào phần mềm client
    // và gửi kèm trong headers mỗi request
    const deviceId = (req.headers['x-device-id'] as string) || 'unknown-device';

    return {
      deviceId,
      deviceName,
      ip,
      deviceType,
      location,
    };
  },
);
