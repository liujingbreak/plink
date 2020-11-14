import {isMainThread, parentPort} from 'worker_threads';

export interface Task<T> {
  exit: boolean;
  file: string;
  exportFn: string;
  args?: any[];
}

if (!isMainThread) {
  parentPort!.on('message', executeOnEvent);
}

async function executeOnEvent(data: Task<any>) {
  if (data.exit) {
    process.exit(0);
    return;
  }
  await Promise.resolve(require(data.file)[data.exportFn](...(data.args || [])));
  parentPort!.postMessage('done');
}
