import {isMainThread, parentPort, workerData, WorkerOptions} from 'worker_threads';

export interface Task {
  file: string;
  /**
   * A function which can return Promise or non-Promise value
   */
  exportFn: string;
  args?: any[];
  /** Worker message transferList, see
   * https://nodejs.org/docs/latest-v12.x/api/worker_threads.html#worker_threads_port_postmessage_value_transferlist
   * may be a list of ArrayBuffer, MessagePort and FileHandle objects. After transferring, 
   * they will not be usable on the sending side of the channel anymore (even if they are not contained in value).
   * Unlike with child processes, transferring handles such as network sockets is currently not supported.
   * If value contains SharedArrayBuffer instances, those will be accessible from either thread. 
   * They cannot be listed in transferList.
   * value may still contain ArrayBuffer instances that are not in transferList;
   * in that case, the underlying memory is copied rather than moved.
   */
  transferList?: WorkerOptions['transferList'];
}

export interface TaskResult {
  transferList?: WorkerOptions['transferList'];
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

async function executeOnEvent(data: Task | Command) {
  if ((data as Command).exit) {
    process.exit(0);
    return;
  }
  try {
    const result = await Promise.resolve(require((data as Task).file)[(data as Task).exportFn](
      ...((data as Task).args || [])
      ));
    if ((result as TaskResult).transferList) {
      const transferList = (result as TaskResult).transferList;
      delete result.transferList;
      parentPort!.postMessage({ type: 'wait', data: result }, transferList);
    } else {
      parentPort!.postMessage({ type: 'wait', data: result });
    }

  } catch (ex) {
    parentPort!.postMessage({
      type: 'error',
      data: ex
    });
  }
}
