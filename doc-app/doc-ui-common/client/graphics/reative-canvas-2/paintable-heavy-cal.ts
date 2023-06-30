import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {Matrix} from 'transformation-matrix';
import {createActionStreamByType} from '@wfh/redux-toolkit-observable/es/rx-utils';
import {createReactiveWorkerPool} from '../../utils/worker-pool';
import {Segment} from '../canvas-utils';

const pool = createReactiveWorkerPool(
  // eslint-disable-next-line @typescript-eslint/tslint/config
  () => rx.of(new Worker(new URL('./paintable-worker', import.meta.url))),
  {
    concurrent: 2,
    maxIdleWorkers: 1,
    debug: process.env.NODE_ENV === 'development' ? 'WorkerPool' : false
  }
);

let SEQ = 0;

export type BackgrounActions = {
  calcBBox(segs: Record<string, Segment[]>): void;
  transformBBox(keys: string[], matrix: Matrix): void;
  canvasDestroyed(): void;
};

export type ActionsToWorker = {
  calcBBoxByKey(treeId: string, key: string, segs: Segment[]): void;
  transformBBoxByKey(treeId: string, key: string, m: Matrix): void;
};

export type ResponseEvents = {
  doneTaskForKey(key: string): void;
};

export function createForCanvas() {
  const heavyCal = createActionStreamByType<BackgrounActions & ResponseEvents & ActionsToWorker>();
  const {dispatcher, actionByType, action$, _actionToObject, ofType, _actionFromObject} = heavyCal;
  const detectTreeId = 'detect' + SEQ++;

  rx.merge(
    action$.pipe(
      ofType('transformBBoxByKey', 'calcBBoxByKey'),
      op.mergeMap(action => {
        const msg = _actionToObject(action);
        const [key] = action.payload;
        return pool.executeStatefully(msg, key);
      }),
      op.map(res => _actionFromObject(res as any))
    ),
    actionByType.transformBBox.pipe(
      op.mergeMap(action => {
        const [keys, matrix] = action.payload;
        return rx.of(...keys.map(key => [key, matrix] as const));
      }),
      op.map(([key, m]) => {
        dispatcher.transformBBoxByKey(detectTreeId, key, m);
      })
    ),
    actionByType.calcBBox.pipe(
      op.mergeMap(({payload}) => rx.of(...Object.entries(payload))),
      op.map(([key, segs]) => dispatcher.calcBBoxByKey(detectTreeId, key, segs))
    )
  ).pipe(
    op.catchError((err, src) => {
      void Promise.resolve().then(() => {throw err; });
      return src;
    })
  ).subscribe();
  return heavyCal;
}
