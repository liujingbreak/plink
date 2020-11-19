import {Worker} from 'worker_threads';
import {queue} from './promise-queque';
// import Path from 'path';

export default function newThreadPool(maxParalle: number, idleTimeMs: number) {

}

export class Pool {
  private promiseQ: ReturnType<typeof queue>;
  private workers: Worker[] = [];

  constructor(maxParalle: number, idleTimeMs: number) {
    this.promiseQ = queue(maxParalle);
  }

  submit<T>(task: () => Promise<T>): Promise<T> {
    return this.promiseQ.add(task);
  }

  protected createWorker() {
    this.workers.push(new Worker(require.resolve('./worker')));
  }
}
