import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createActionStreamByType, ActionStreamControl} from '@wfh/redux-toolkit-observable/es/rx-utils';
import {WorkerMsgData, createReactiveWorkerPool} from '../../utils/worker-pool';
import {Rectangle} from '../canvas-utils';

const pool = createReactiveWorkerPool(
  // eslint-disable-next-line @typescript-eslint/tslint/config
  () => rx.of(new Worker(new URL('./paintable-worker', import.meta.url))),
  {
    concurrent: 2,
    maxIdleWorkers: 2,
    debug: process.env.NODE_ENV === 'development' ? 'WorkerPool' : false
  }
);

let SEQ = 0;

export type WorkerClientAction = {
  updateDetectable(paintableId: string, segs: Record<string, (number | null)[][]>): void;
  // transform(paintableId: string, matrix: Matrix): void;
  isInsideSegments(x: number, y: number): void;
  getBBoxesOf(paintableId: string): void;

  canvasDestroyed(): void;
  /** Release resource of specific paintable,
   * including delete its segments and bounding box from detect tree
   */
  deletePaintable(paintableId: string): void;
};

export type ActionsToWorker = {
  // createDetectTree(treeId: string): void;
  _updateDetectable(treeId: string, paintableId: string, key: string, segs: (number | null)[][]): void;
  // _transform(treeId: string, paintableId: string, m: Matrix): void;
  _getBBoxesOf(treeId: string, paintableId: string): void;
  destroyDetectTree(treeId: string): void;
};

export type ResponseEvents = {
  doneTaskForKey(treeId: string, paintableId: string, key: string): void;
  gotBBoxesOf(treeId: string, paintableId: string, rects: Rectangle[]): void;
};

export function createForCanvas() {
  const heavyCal = createActionStreamByType<WorkerClientAction & ResponseEvents & ActionsToWorker>({
    debug: process.env.NODE_ENV === 'development' ? 'workerClient' : false
  });
  const {dispatcher, actionByType, payloadByType, action$, _actionToObject, ofType, _actionFromObject} = heavyCal;
  const detectTreeId = (SEQ++).toString(16);

  rx.merge(
    action$.pipe(
      ofType('_updateDetectable'),
      op.mergeMap(action => {
        const msg = _actionToObject(action);
        const [treeId, paintableId, key] = action.payload;
        return pool.executeForKey(msg, treeId + '/' + paintableId + '/' + key);
      }),
      op.map(res => _actionFromObject(res as WorkerMsgData<any>['content']))
    ),
    payloadByType.updateDetectable.pipe(
      op.mergeMap(([id, segs]) => rx.of(...Object.entries(segs)).pipe(
        op.map(([key, segs]) => dispatcher._updateDetectable(detectTreeId, id, key, segs))
      ))
    ),
    payloadByType.getBBoxesOf.pipe(
      op.map(paintableId => {
        dispatcher._getBBoxesOf(detectTreeId, paintableId);
      })
    ),
    actionByType._getBBoxesOf.pipe(
      op.mergeMap(action => {
        const msg = _actionToObject(action);
        return pool.executeAllWorker(msg);
      }),
      op.map(res => _actionFromObject(res))
    ),
    actionByType.canvasDestroyed.pipe(
      op.map(() => dispatcher.destroyDetectTree(detectTreeId))
    )
  ).pipe(
    op.catchError((err, src) => {
      void Promise.resolve().then(() => {throw err; });
      return src;
    })
  ).subscribe();
  return heavyCal as ActionStreamControl<WorkerClientAction & ResponseEvents>;
}
