import { EventEmitter } from 'events';

export class Redis extends EventEmitter {
  constructor() {
    super();
    process.nextTick(() => {
      this.emit('connect');
      this.emit('ready');
    });
  }
  get() {
    return Promise.resolve(null);
  }
  set() {
    return Promise.resolve('OK');
  }
  del() {
    return Promise.resolve(1);
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
