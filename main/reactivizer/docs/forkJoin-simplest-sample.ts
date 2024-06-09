import * as rx from 'rxjs';
import {createWorkerControlOfFn, createWorkerControl, setIdleDuring} from '@wfh/reactivizer/dist/fork-join/node-worker';
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
        const forkDone = s.ft.fork('compute', data, offset, length >> 1).do(s.pt.computeResolved);
        // another half fo data to be recursively processed in current thread
        await heavyWorkService.compute(data, offset + (length >> 1), length - (length >> 1));
        // Inform the forkJoin scheduler that current worker is about to waiting
        // for Forked function returns and join, so that it can accept other task at same time.
        const [, result] = await rx.firstValueFrom(forkDone);
        return result;
      }
    }

    // computeAllInWorker(data: SharedArrayBuffer, offset: number, length: number) {
    //   return o.ft.fork('compute', data, offset, length).do(i.at.computeResolved);
    // }
  };
  const myParallelService = createWorkerControlOfFn(heavyWorkService, {name: 'myParallelService', debug: true});
  const {s} = myParallelService;
  return myParallelService;
}

// ----------------- Hand made controller ----------------
type MyParallelService = {
  compute(data: SharedArrayBuffer, offset: number, length: number): SingleActionFactory;
  computeReturned(): SingleActionFactory;
  computeAllInWorker(data: SharedArrayBuffer, offset: number, length: number): SingleActionFactory;
  computeAllInWorkerReturned(): SingleActionFactory;
};

export function createHandMadeParallelService() {
  const myParallelService = createWorkerControl<MyParallelService>({
    name: 'myParallelService',
    debug: true
  });
  const {s, r} = myParallelService;
  r('compute -> computeReturned', s.pt.compute.pipe(
    rx.mergeMap(async ([m, data, offset, length]) => {
      if (length < 1000) {
        // calcuate directly, return result as a transferable data structure `ForkTransferablePayload`
        // or you may consider return "void" type and write result to SharedArrayBuffer "data" instead (by Atomics operations optionally)
      } else {
        // o.dp.forkAction<MyParallelServiceInput, 'compute'>('compute', data, offset, true);
        // Split data to one half to be processed in a forked thread or web worker
        const forkDone$ = s.ft.fork('compute', data, offset, length >> 1).do(s.pt.computeReturned);
        // another half fo data to be recursively processed in current thread
        await rx.firstValueFrom(s.ft.compute(
          data,  offset + (length >> 1), length - (length >> 1)
        ).do(s.pt.computeReturned));
        // Inform the forkJoin scheduler that current worker is about to waiting
        // for Forked function returns and join, so that it can accept other task at same time.
        await setIdleDuring.asPromise(myParallelService, forkDone$);
        s.ft.computeReturned().dp(m);
      }
    })
  ));

  r('computeAllInWorker -> computeAllInWorkerReturned', s.pt.computeAllInWorker.pipe(
    rx.mergeMap(async ([m, data, offset, length]) => {
      await rx.firstValueFrom(s.ft.fork('compute', data, offset, length).do(s.pt.computeReturned));
      s.ft.computeAllInWorkerReturned().dp(m);
    })
  ));
  return myParallelService;
}
