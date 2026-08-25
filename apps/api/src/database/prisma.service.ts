import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({
      connectionString,
      max: 40,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    try {
      await Promise.race([
        this.$disconnect(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Prisma disconnect timeout')),
            2000,
          ),
        ),
      ]);
    } catch (e) {
      console.warn('Prisma disconnect warning:', e.message);
    } finally {
      if (this.pool) {
        try {
          await Promise.race([
            this.pool.end(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Pool end timeout')), 1000),
            ),
          ]);
        } catch (e) {
          console.warn('Pool end warning:', e.message);
        }
      }
    }
  }
}
