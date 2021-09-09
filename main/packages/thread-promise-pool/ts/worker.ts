// tslint:disable no-console
import {isMainThread, parentPort, workerData, WorkerOptions} from 'worker_threads';

let verbose = false;
let initialDone: Promise<any> = Promise.resolve();

// process.on('uncaughtException', function(err) {
//   // log.error('Uncaught exception', err, err.stack);
//   console.error(`[thread-pool] worker pid:${workerData.id} Uncaught exception: `, err);
//   parentPort!.postMessage({
//     type: 'error',
//     data: err.toString()
//   });
// });

// process.on('unhandledRejection', err => {
//   // log.warn('unhandledRejection', err);
//   console.error(`[thread-pool] worker pid:${workerData.id} unhandledRejection`, err);
//   parentPort!.postMessage({
//     type: 'error',
//     data: err ? err.toString() : err
//   });
// });

export interface InitialOptions {
  verbose?: boolean;
  /** After worker being created, the exported function will be run,
   * You can put any initial logic in it, like calling `require('source-map-support/register')` or
   * setup process event handling for uncaughtException and unhandledRejection.
   */
  initializer?: {file: string; exportFn?: string};
}
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
  verbose = !!(workerData as InitialOptions).verbose;
  if ((workerData as InitialOptions).initializer) {
    const {file, exportFn} = (workerData as InitialOptions).initializer!;
    if (exportFn == null)
      initialDone = Promise.resolve(require(file));
    else
      initialDone = Promise.resolve(require(file)[exportFn]());
  } else {
    initialDone = Promise.resolve();
  }
}

if (!isMainThread) {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  parentPort!.on('message', executeOnEvent);
}

async function executeOnEvent(data: Task | Command) {
  if ((data as Command).exit) {
    if (verbose) {
      // eslint-disable-next-line no-console
      console.log(`[thread-pool] worker ${workerData?.id} exit`);
    }
    parentPort!.off('message', executeOnEvent);
    // Don't call process.exit(0), there might be some unfinished output stream still on-going at this moment.
    return;
  }
  await initialDone;
  if (verbose) {
    console.log(`[thread-pool] worker ${workerData?.id} run`);
  }
  try {
    const result = await Promise.resolve(require((data as Task).file)[(data as Task).exportFn](
      ...((data as Task).args || [])
      ));

    if (verbose) {
      console.log(`[thread-pool] worker ${workerData?.id} wait`);
    }
    if (result != null && (result as TaskResult).transferList) {
      const transferList = (result as TaskResult).transferList;
      delete result.transferList;
      parentPort!.postMessage({ type: 'wait', data: result }, transferList);
    } else {
      parentPort!.postMessage({ type: 'wait', data: result });
    }

  } catch (ex) {
    console.log(`[thread-pool] worker ${workerData?.id} error`, ex);
    try {
      parentPort!.postMessage({
        type: 'error',
        data: ex.toString()
      });
    } catch (err) {
      parentPort!.postMessage({
        type: 'error',
        data: err.toString()
      });
    }
  }
}
