import { Controller, Get, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async check() {
    let dbStatus = 'ok';
    let redisStatus = 'ok';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      dbStatus = 'error';
      this.logger.error('Database health check failed', e);
    }

    try {
      await this.redis.getClient().ping();
    } catch (e) {
      redisStatus = 'error';
      this.logger.error('Redis health check failed', e);
    }

    const overallStatus =
      dbStatus === 'ok' && redisStatus === 'ok' ? 'ok' : 'error';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
    };
  }

  @Get('check-db')
  async checkDb() {
    try {
      const result = await this.prisma.$queryRawUnsafe(`
        SELECT 
          current_database() as database,
          current_user as "user",
          version() as db_version
      `);
      
      const tables = await this.prisma.$queryRawUnsafe(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      const users = await this.prisma.$queryRawUnsafe(`
        SELECT id, email, role FROM "User"
      `);

      return {
        status: 'ok',
        env: {
          database_url_exists: !!process.env.DATABASE_URL,
        },
        connection: result,
        tables: tables,
        users: users
      };
    } catch (e) {
      return {
        status: 'error',
        error: e.message,
      };
    }
  }
}

