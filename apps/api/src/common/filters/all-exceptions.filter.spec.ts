import { AllExceptionsFilter } from './all-exceptions.filter';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockArgumentsHost: ArgumentsHost;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockRequest = {
      method: 'GET',
      url: '/test-route',
    };
    mockArgumentsHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('masks internal error details and stack trace in production for unhandled exceptions', () => {
    process.env.NODE_ENV = 'production';
    const exception = new Error('Database connection string leaked: postgresql://secret');

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        path: '/test-route',
        message: 'Internal server error',
      }),
    );
    const jsonArg = mockResponse.json.mock.calls[0][0];
    expect(jsonArg).not.toHaveProperty('errorDetail');
    expect(jsonArg).not.toHaveProperty('stack');
    expect(JSON.stringify(jsonArg)).not.toContain('postgresql://secret');
  });

  it('preserves user-facing message for HttpExceptions in production', () => {
    process.env.NODE_ENV = 'production';
    const exception = new HttpException('Invalid email or password', HttpStatus.UNAUTHORIZED);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        path: '/test-route',
        message: 'Invalid email or password',
      }),
    );
    const jsonArg = mockResponse.json.mock.calls[0][0];
    expect(jsonArg).not.toHaveProperty('errorDetail');
    expect(jsonArg).not.toHaveProperty('stack');
  });

  it('includes errorDetail and stack in non-production environments', () => {
    process.env.NODE_ENV = 'development';
    const exception = new Error('Local dev error');

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        path: '/test-route',
        message: 'Local dev error',
        errorDetail: 'Error: Local dev error',
      }),
    );
    const jsonArg = mockResponse.json.mock.calls[0][0];
    expect(jsonArg).toHaveProperty('stack');
  });
});
