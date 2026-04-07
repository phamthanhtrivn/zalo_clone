import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import cookieParser from 'cookie-parser';

import * as dns from 'node:dns';
dns.setServers(['1.1.1.1']);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port');
  const clientUrl = configService.get<string>('client_url');

  app.use(cookieParser());
  app.enableCors({
    origin: clientUrl,

    credentials: true,

    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',

    allowedHeaders: 'Content-Type,Accept,Authorization',
  });

  app.setGlobalPrefix('/api');
  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Chỉ cho phép các field trong DTO
      forbidNonWhitelisted: true, // Có field ngoài DTO sẽ báo lỗi
      transform: true, // Tự động chuyển kiểu dữ liệu
      stopAtFirstError: true,
      exceptionFactory: (errors) => {
        const result = errors.map((error) => ({
          field: error.property,
          // 💡 Chỉ lấy duy nhất 1 chuỗi thông báo lỗi đầu tiên
          error: Object.values(error.constraints || {})[0],
        }));
        // Thay vì ném ra mảng string, ta ném ra object có cấu trúc
        return new BadRequestException(result);
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter()); // Xử lý exception toàn cục
  app.useGlobalInterceptors(new ResponseInterceptor()); // Định dạng response toàn cục

  await app.listen(port!);
}
bootstrap();
