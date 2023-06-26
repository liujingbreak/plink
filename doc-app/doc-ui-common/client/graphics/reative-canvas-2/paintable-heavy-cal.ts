import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createActionStreamByType} from '@wfh/redux-toolkit-observable/es/rx-utils';
import {createReactiveWorkerPool} from '../../utils/worker-pool';

const pool = createReactiveWorkerPool(
  // eslint-disable-next-line @typescript-eslint/tslint/config
  () => rx.of(new Worker(new URL('./paintable-worker', import.meta.url))),
  {
    concurrent: 2,
    maxIdleWorkers: 1,
    debug: process.env.NODE_ENV === 'development' ? 'WorkerPool' : false
  }
);

export type SlowActions = {
  calcBoundingBox(): void;
};

export const heavyCal = createActionStreamByType<SlowActions>();
const {action$, _actionToObject} = heavyCal;

rx.merge(
  action$.pipe(
    op.mergeMap(action => {
      const msg = _actionToObject(action);
      return pool.execute(msg);
    }),
    op.map(res => {
      console.log(res);
    })
  )
).subscribe();

