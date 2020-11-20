import {Worker} from 'worker_threads';
// import {queue} from './promise-queque';
import {Task, Command} from './worker';
import Path from 'path';

export default function newThreadPool(maxParalle: number, idleTimeMs: number) {

}

export class Pool {
  private busyWorkers: Worker[] = [];
  private idleWorkers: Worker[] = [];
  private tasks: Task<any>[];

  constructor(private maxParalle: number, idleTimeMs: number) {
  }

  submit<T>(task: Task<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.idleWorkers.length > 0) {
        this.idleWorkers.pop()!.postMessage(task);
      } else if (this.busyWorkers.length < this.maxParalle) {
        // Create new worker
        const worker = new Worker(require.resolve('./worker'), {
          workerData: task
        });
        this.busyWorkers.push(worker);
        worker.on('message', (msg: {type: 'error' | 'wait', data: T}) => {
          if (msg.type === 'wait') {
            resolve(msg.data);
          } else if (msg.type === 'error') {
            reject(msg.data);
          }

          if (this.tasks.length > 0 ) {
            worker.postMessage(this.tasks.shift());
          } else {
            // TODO: set Timer for max idle time.
          }
        });
        worker.on('error', err => {
          reject(err);
        });
        worker.on('exit', (code) => {
          let idx = this.busyWorkers.findIndex(item => item === worker);
          if (idx >= 0)
            this.busyWorkers.splice(idx, 1);
          idx = this.idleWorkers.findIndex(item => item === worker);
          if (idx >= 0)
            this.idleWorkers.splice(idx, 1);
          if (code !== 0) {
            reject('Thread exist with code ' + code);
          }
        });
      }
      this.tasks.push(task);
    });
  }
}
