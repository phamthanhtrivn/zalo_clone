import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res; // Này là trường hợp tự throw lỗi
      } else if (typeof res === 'object' && res !== null && 'message' in res) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        message = (res as any).message || res;
      }
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      // Ta trả về thêm một trường errors để dễ xử lý ở Mobile
      errors: Array.isArray(message) ? message : null,
      message: Array.isArray(message) ? 'Dữ liệu không hợp lệ' : message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
