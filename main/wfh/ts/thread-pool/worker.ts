import {isMainThread, parentPort, workerData} from 'worker_threads';

export interface Task<T> {
  exit: boolean;
  file: string;
  exportFn: string;
  args?: any[];
}

export interface Command {
  exit: boolean;
}

if (workerData) {
  executeOnEvent(workerData);
}

if (!isMainThread) {
  parentPort!.on('message', executeOnEvent);
}

async function executeOnEvent(data: Task<any> | Command) {
  if (data.exit) {
    process.exit(0);
    return;
  }
  try {
    const result = await Promise.resolve(require((data as Task<any>).file)[(data as Task<any>).exportFn](
      ...((data as Task<any>).args || []))
    );
    parentPort!.postMessage({
      type: 'wait',
      data: result
    });
  } catch (ex) {
    parentPort!.postMessage({
      type: 'error',
      data: ex
    });
  }
}
