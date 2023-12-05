import * as rx from 'rxjs';
import {createWorkerControl, fork} from '@wfh/reactivizer/dist/fork-join/node-worker';
// For browser environment web worker, import from "@wfh/reactivize/es/fork-join/forkJoin-web-worker" instead

export function createMyParallelService() {
  const heavyWorkService = {
    async compute(data: SharedArrayBuffer, offset: number, length: number) {
      if (length < 1000) {
        // calcuate directly, return result as a transferable data structure `ForkTransferablePayload`
        // or you may consider return "void" type and write result to SharedArrayBuffer "data" instead (by Atomics operations optionally)
      } else {
        // Split data to one half to be processed in a forked thread or web worker
        const forkDone = fork(myParallelService, 'compute', [data, offset, length >> 1]);
        // another half fo data to be recursively processed in current thread
        await heavyWorkService.compute(data, offset + (length >> 1), length - (length >> 1));
        // Inform the forkJoin scheduler that current worker is about to waiting
        // for Forked function returns and join, so that it can accept other task at same time.
        o.dp.wait();
        await forkDone;
        o.dp.stopWaiting();
      }
    },

    computeAllInWorker(data: SharedArrayBuffer, offset: number, length: number) {
      return fork(myParallelService, 'compute', [data, offset, length]);
    }
  };
  const myParallelService = createWorkerControl({name: 'myParallelService', debug: true})
    .reativizeRecursiveFuncs(heavyWorkService);

  const {o} = myParallelService;
  return myParallelService;
}

// ----------------- Hand made controller ----------------
type MyParallelServiceInput = {
  compute(data: SharedArrayBuffer, offset: number, length: number): void;
  computeAllInWorker(data: SharedArrayBuffer, offset: number, length: number): void;
};

type MyParallelServiceOutput = {
  /** recursively dispatch "compute" back to self */
  compute: MyParallelServiceInput['compute'];
  computeReturned(): void;
  computeAllInWorkerReturned(): void;
};

export function createHandMadeParallelService() {
  const myParallelService = createWorkerControl<MyParallelServiceInput, MyParallelServiceOutput>({
    name: 'myParallelService',
    debug: true
  });
  const {i, o, r} = myParallelService;
  r('compute -> fork or compute recursively', i.pt.compute.pipe(
    rx.mergeMap(async ([m, data, offset, length]) => {
      if (length < 1000) {
        // calcuate directly, return result as a transferable data structure `ForkTransferablePayload`
        // or you may consider return "void" type and write result to SharedArrayBuffer "data" instead (by Atomics operations optionally)
      } else {
        // Split data to one half to be processed in a forked thread or web worker
        const forkDone = fork(myParallelService, 'compute', [data, offset, length >> 1]);
        // another half fo data to be recursively processed in current thread
        await rx.firstValueFrom(myParallelService.o.do.compute(
          myParallelService.o.at.computeReturned, data,  offset + (length >> 1), length - (length >> 1)
        ));
        // Inform the forkJoin scheduler that current worker is about to waiting
        // for Forked function returns and join, so that it can accept other task at same time.
        o.dp.wait();
        await forkDone;
        o.dp.stopWaiting();
        o.dpf.computeReturned(m);
      }
    })
  ));

  r('computeAllInWorker', i.pt.computeAllInWorker.pipe(
    rx.mergeMap(async ([m, data, offset, length]) => {
      await fork(myParallelService, 'compute', [data, offset, length]);
      o.dpf.computeAllInWorkerReturned(m);
    })
  ));
  return myParallelService;
}
