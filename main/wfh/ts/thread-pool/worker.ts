import {isMainThread, parentPort} from 'worker_threads';

export interface Task<T> {
  file: string;
  exportFn: string;
  args?: any[];
}

if (!isMainThread) {
  parentPort!.once('message', (data: Task<any>) => {
    require(data.file)[data.exportFn](...(data.args || []));
  });
}
