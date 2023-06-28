import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createActionStreamByType} from '@wfh/redux-toolkit-observable/es/rx-utils';
import {createReactiveWorkerPool} from '../../utils/worker-pool';
import {Rectangle, Segment} from '../canvas-utils';

const pool = createReactiveWorkerPool(
  // eslint-disable-next-line @typescript-eslint/tslint/config
  () => rx.of(new Worker(new URL('./paintable-worker', import.meta.url))),
  {
    concurrent: 2,
    maxIdleWorkers: 1,
    debug: process.env.NODE_ENV === 'development' ? 'WorkerPool' : false
  }
);

export type BackgrounActions = {
  calcBBox(segs: Record<string, Segment[]>): void;
  transformBBox(rects: {[key: string]: Rectangle}): void;
};

type ResponseEvents = {
  calcBBoxDone(rects: {[key: string]: Rectangle}): void;
};

export function createForCanvas() {
  const heavyCal = createActionStreamByType<BackgrounActions & ResponseEvents>();
  const {action$, _actionToObject, ofType} = heavyCal;

  rx.merge(
    action$.pipe(
      ofType('transformBBox', 'calcBBox'),
      op.mergeMap(action => {
        const msg = _actionToObject(action);
        return pool.executeStatefully(msg);
      }),
      op.map(res => {
        console.log(res);
      })
    )
  ).subscribe();
  return heavyCal;
}
