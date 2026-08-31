import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof Error
        ? exception.message
        : typeof exception === 'object' && exception !== null && 'message' in exception
        ? (exception as any).message
        : 'Internal server error';

    const stack = exception instanceof Error ? exception.stack : undefined;

    this.logger.error(
      `[${request.method}] ${request.url} Status: ${status} Error: ${message}`,
      stack,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      stack: process.env.NODE_ENV !== 'production' ? stack : message,
      errorDetail: String(exception),
    });
  }
}
