import { EventEmitter } from 'events';

type StoredEntry = { value: string; expiresAt: number | null };

export class Redis extends EventEmitter {
  // Shared in-memory store so e2e tests exercise real set/get/del semantics.
  static store = new Map<string, StoredEntry>();

  constructor() {
    super();
    process.nextTick(() => {
      this.emit('connect');
      this.emit('ready');
    });
  }

  private static isExpired(entry: StoredEntry | undefined): boolean {
    return !!entry && entry.expiresAt !== null && entry.expiresAt <= Date.now();
  }

  get(key: string): Promise<string | null> {
    const entry = Redis.store.get(key);
    if (Redis.isExpired(entry)) {
      Redis.store.delete(key);
      return Promise.resolve(null);
    }
    return Promise.resolve(entry ? entry.value : null);
  }

  set(key: string, value: string, ttlSeconds?: number): Promise<string> {
    const expiresAt =
      ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    Redis.store.set(key, { value, expiresAt });
    return Promise.resolve('OK');
  }

  del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (Redis.store.delete(key)) {
        deleted++;
      }
    }
    return Promise.resolve(deleted);
  }

  quit() {
    return Promise.resolve('OK');
  }
  disconnect() {}
  info() {
    return Promise.resolve('redis_version:6.0.0');
  }
  defineCommand() {}
  eval() {
    return Promise.resolve(null);
  }
}

export default Redis;
