import { Controller, Get, Head } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('System')
@Controller()
export class AppController {
  @Get()
  @Head()
  @ApiOperation({ summary: 'Root Health Check' })
  getRoot(): { name: string; status: string } {
    return {
      name: 'MyKart API',
      status: 'ok',
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'API Health Check' })
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

