import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import * as dns from 'node:dns';

dns.setServers(['1.1.1.1']);
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port');

  app.setGlobalPrefix('/api');
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.enableCors({
    origin: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Chỉ cho phép các field trong DTO
      forbidNonWhitelisted: true, // Có field ngoài DTO sẽ báo lỗi
      transform: true, // Tự động chuyển kiểu dữ liệu
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter()); // Xử lý exception toàn cục
  app.useGlobalInterceptors(new ResponseInterceptor()); // Định dạng response toàn cục

  await app.listen(port!);
}
bootstrap();
