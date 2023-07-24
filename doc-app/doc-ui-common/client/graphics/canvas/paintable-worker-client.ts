import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createActionStreamByType, ActionStreamControl} from '@wfh/redux-toolkit-observable/es/rx-utils';
import {WorkerMsgData, createReactiveWorkerPool} from '../../utils/worker-pool';
import {Rectangle, SegmentNumbers} from '../canvas-utils';

const NUM_WORKER = 2;
const pool = createReactiveWorkerPool(
  // eslint-disable-next-line @typescript-eslint/tslint/config
  () => rx.of(new Worker(new URL('./paintable-worker', import.meta.url))),
  {
    concurrent: NUM_WORKER,
    maxIdleWorkers: NUM_WORKER,
    debug: process.env.NODE_ENV === 'development' ? 'WorkerPool' : false
  }
);

let SEQ = 0;

export type WorkerClientAction = {
  updateDetectable(paintableId: string, segs: Iterable<[string, Iterable<SegmentNumbers>]>): void;
  // transform(paintableId: string, matrix: Matrix): void;
  detectPoint(reqId: string, xy: Float32Array): void;
  calculateFaceCenter(reqId: string, segements: SegmentNumbers[]): void;
  getBBoxesOf(paintableId: string): void;

  canvasDestroyed(): void;
  /** Release resource of specific paintable,
   * including delete its segments and bounding box from detect tree
   */
  deletePaintable(paintableId: string): void;
};

export type ActionsToWorker = {
  _updateDetectable(treeId: string, paintableId: string, key: string, segs: SegmentNumbers[]): void;
  // _transform(treeId: string, paintableId: string, m: Matrix): void;
  _getBBoxesOf(treeId: string, paintableId: string): void;
  _detectPoint(treeId: string, reqId: string, xy: Float32Array): void;
  destroyDetectTree(treeId: string): void;
};

export type ResponseEvents = {
  doneTaskForKey(treeId: string, paintableId: string, key: string): void;
  gotBBoxesOf(treeId: string, paintableId: string, rects: Rectangle[]): void;
  detectedIntersection(
    forReqId: string,
    // segsWithKey: Array<[key: string, doesIntersect: boolean, intersectionEdge: [start: Float32Array, end: Float32Array][]]>,
    segsKey: Array<string>,
    originPoint: Float32Array
  ): void;
  faceCenterCalculated(id: string, pointXY: Float32Array): void;
  _doneDetectPoint(
    treeId: string,
    forReqId: string,
    // intersectionEdge: Array<[key: string, doesIntersect: boolean, intersectionEdge: [start: Float32Array, end: Float32Array][]]>,
    intersectObjectKeys: string[],
    originPoint: Float32Array
  ): void;
};

export function createForCanvas() {
  const heavyCal = createActionStreamByType<WorkerClientAction & ResponseEvents & ActionsToWorker>({
    debug: process.env.NODE_ENV === 'development' ? 'workerClient' : false
  });
  const {dispatcher, actionByType, payloadByType, _actionToObject, _actionFromObject} = heavyCal;
  const detectTreeId = (SEQ++).toString(16);

  rx.merge(
    actionByType._updateDetectable.pipe(
      op.mergeMap(action => {
        const msg = _actionToObject(action);
        const [treeId, key] = action.payload;
        return pool.executeForKey(msg, treeId + '/' + key);
      }),
      op.map(res => _actionFromObject(res as WorkerMsgData<any>['content']))
    ),
    payloadByType.updateDetectable.pipe(
      op.mergeMap(([id, objectsWithKey]) => rx.of(...objectsWithKey).pipe(
        // a `key` must be unique amongst all paintables within a single detection interval tree,
        // that's why `id + '/' + key` is passes as new `key`
        op.map(([key, segs]) => dispatcher._updateDetectable(detectTreeId, id, id + '/' + key, [...segs]))
      ))
    ),

    payloadByType.getBBoxesOf.pipe(
      op.map(paintableId => {
        dispatcher._getBBoxesOf(detectTreeId, paintableId);
      })
    ),
    payloadByType.detectPoint.pipe(
      op.switchMap(([reqId, xy]) => {
        dispatcher._detectPoint(detectTreeId, reqId, xy);
        return payloadByType._doneDetectPoint.pipe(
          op.filter(([, resId]) => resId === reqId),
          op.take(NUM_WORKER),
          op.reduce((acc, [, _reqId, intersWithKey, p]) => {
            acc[2].push(...intersWithKey);
            return acc;
          }),
          op.map(([, , intersections, point]) => {
            dispatcher.detectedIntersection(reqId, intersections, point);
          })
        );
      })
    ),
    rx.merge(actionByType._getBBoxesOf, actionByType._detectPoint).pipe(
      op.mergeMap(action => {
        const msg = _actionToObject(action);
        return pool.executeAllWorker(msg, NUM_WORKER);
      }),
      op.map(res => _actionFromObject(res))
    ),
    actionByType.calculateFaceCenter.pipe(
      op.mergeMap(action => pool.execute(action))
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
