class Queue {
  constructor() {}
  add() {
    return Promise.resolve();
  }
  on() {}
  close() {
    return Promise.resolve();
  }
}
class Worker {
  constructor() {}
  on() {}
  close() {
    return Promise.resolve();
  }
}
class QueueEvents {
  constructor() {}
  on() {}
  close() {
    return Promise.resolve();
  }
}
module.exports = { Queue, Worker, QueueEvents };
