import * as rx from 'rxjs';
import {createWorkerControlOfFn, createWorkerControl} from '@wfh/reactivizer/dist/fork-join/node-worker';
import {SingleActionFactory} from '@wfh/reactivizer';
// For browser environment web worker, import from "@wfh/reactivize/es/fork-join/forkJoin-web-worker" instead

export function createMyParallelService() {
  const heavyWorkService = {
    async compute(data: SharedArrayBuffer, offset: number, length: number): Promise<number> {
      if (length < 1000) {
        // calcuate directly, return result as a transferable data structure `ForkTransferablePayload`
        // or you may consider return "void" type and write result to SharedArrayBuffer "data" instead (by Atomics operations optionally)
        return Promise.resolve(0);
      } else {
        // Split data to one half to be processed in a forked thread or web worker
        const forkDone = o.ft.fork('compute', data, offset, length >> 1).do(i.at.computeResolved);
        // another half fo data to be recursively processed in current thread
        await heavyWorkService.compute(data, offset + (length >> 1), length - (length >> 1));
        // Inform the forkJoin scheduler that current worker is about to waiting
        // for Forked function returns and join, so that it can accept other task at same time.
        const [, result] = await rx.firstValueFrom(forkDone);
        return result;
      }
    },

    // computeAllInWorker(data: SharedArrayBuffer, offset: number, length: number) {
    //   return o.ft.fork('compute', data, offset, length).do(i.at.computeResolved);
    // }
  };
  const myParallelService = createWorkerControlOfFn(heavyWorkService, {name: 'myParallelService', debug: true});

  const {i, o} = myParallelService;
  return myParallelService;
}

// ----------------- Hand made controller ----------------
type MyParallelServiceInput = {
  compute(data: SharedArrayBuffer, offset: number, length: number): SingleActionFactory;
  computeReturned(): MyParallelServiceOutput['computeReturned'];
  computeAllInWorker(data: SharedArrayBuffer, offset: number, length: number): SingleActionFactory;
};

type MyParallelServiceOutput = {
  /** recursively dispatch "compute" back to self */
  compute: MyParallelServiceInput['compute'];
  computeReturned(): SingleActionFactory;
  computeAllInWorkerReturned(): SingleActionFactory;
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
        // o.dp.forkAction<MyParallelServiceInput, 'compute'>('compute', data, offset, true);
        // Split data to one half to be processed in a forked thread or web worker
        const forkDone$ = o.ft.fork('compute', data, offset, length >> 1).do(i.at.computeReturned);
        // another half fo data to be recursively processed in current thread
        await rx.firstValueFrom(o.ft.compute(
          data,  offset + (length >> 1), length - (length >> 1)
        ).do(i.at.computeReturned));
        // Inform the forkJoin scheduler that current worker is about to waiting
        // for Forked function returns and join, so that it can accept other task at same time.
        await forkDone$;
        o.ft.computeReturned().dp(m);
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
