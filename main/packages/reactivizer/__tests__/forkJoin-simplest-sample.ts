import {createWorkerControl, ForkTransferablePayload, fork} from '../src/forkJoin-node-worker';
// For browser environment web worker, import from "@wfh/reactivize/web-worker-broker" instead

export async function createController() {
  const heavyWorkService = {
    async compute(data: SharedArrayBuffer, offset: number, length: number) {
      if (length < 1000) {
        // calcuate directly, return result as a transferable data structure `ForkTransferablePayload`
        // or you may consider return "void" type and write result to SharedArrayBuffer "data" instead (by Atomics operations optionally)
      } else {
        // Split data to one half to be processed in a forked thread or web worker
        const forkDone = fork(heavyWorkReactorComposite, 'compute', [data, 0, length >> 1]);
        // another half fo data to be recursively processed in current thread
        await heavyWorkService.compute(data, length >> 1, length - (length >> 1));
        // Inform the forkJoin scheduler that current worker is about to waiting
        // for Forked function returns and join, so that it can accept other task at same time.
        o.dp.wait();
        await forkDone;
        o.dp.stopWaiting();
      }
    },

    computeAllInWorker(data: SharedArrayBuffer, offset: number, length: number) {
      return fork(heavyWorkReactorComposite, 'compute', [data, offset, length]);
    }
  };

  const heavyWorkReactorComposite = (await createWorkerControl({name: 'heavyWork'})).reativizeRecursiveFuncs(heavyWorkService);
  const {o} = heavyWorkReactorComposite;
}

