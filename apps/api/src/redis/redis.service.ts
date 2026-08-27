import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private isOffline = false;
  private memoryDb = new Map<string, { value: string; expiresAt?: number }>();

  onModuleInit() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 3) {
          return null; // Stop retrying
        }
        return 1000;
      }
    });

    this.client.on('error', (err) => {
      if (!this.isOffline) {
        this.logger.warn(`Redis connection failed, falling back to in-memory store. Error: ${err.message}`);
        this.isOffline = true;
      }
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connected successfully.');
      this.isOffline = false;
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isOffline) {
      try {
        if (ttlSeconds) {
          await this.client.set(key, value, 'EX', ttlSeconds);
          return;
        } else {
          await this.client.set(key, value);
          return;
        }
      } catch (err: any) {
        this.logger.warn(`Redis write failed: ${err.message}. Falling back to memory.`);
        this.isOffline = true;
      }
    }

    const expiresAt = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined;
    this.memoryDb.set(key, { value, expiresAt });
  }

  async get(key: string): Promise<string | null> {
    if (!this.isOffline) {
      try {
        return await this.client.get(key);
      } catch (err: any) {
        this.logger.warn(`Redis read failed: ${err.message}. Falling back to memory.`);
        this.isOffline = true;
      }
    }

    const record = this.memoryDb.get(key);
    if (!record) return null;
    if (record.expiresAt && record.expiresAt < Date.now()) {
      this.memoryDb.delete(key);
      return null;
    }
    return record.value;
  }

  async del(key: string): Promise<void> {
    if (!this.isOffline) {
      try {
        await this.client.del(key);
        return;
      } catch (err: any) {
        this.logger.warn(`Redis delete failed: ${err.message}. Falling back to memory.`);
        this.isOffline = true;
      }
    }

    this.memoryDb.delete(key);
  }
}
