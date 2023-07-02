import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {boundsOf, Rectangle, Segment} from '../canvas-utils';
import {createWorkerControl} from '../../utils/worker-impl-util';
import type {ActionsToWorker, ResponseEvents} from './paintable-worker-client';

type CanvasDataState = {
  /** key is Paintable ID */
  paintableById: Map<string, PaintableState>;
};

type PaintableState = {
  /** key is dataKey */
  bounds: Map<string, Rectangle>;
};

const unsub = createWorkerControl<ActionsToWorker & ResponseEvents>(control => {
  const {actionByType: aot, payloadByType: pt, dispatcher} = control;
  // key is tree ID
  const canvasBgState = new Map<string, CanvasDataState>();

  function initState(treeId: string, paintableId: string) {
    let canvasInstanceState = canvasBgState.get(treeId);
    if (canvasInstanceState == null) {
      canvasInstanceState = {
        paintableById: new Map()
      };
      canvasBgState.set(treeId, canvasInstanceState);
    }
    let paintableState = canvasInstanceState.paintableById.get(paintableId);
    if (paintableState == null) {
      paintableState = {
        bounds: new Map()
      };
      canvasInstanceState.paintableById.set(paintableId, paintableState);
    }
    return paintableState;
  }

  return rx.merge(
    rx.merge(
      pt._updateDetectable.pipe(
        op.map(([treeId, paintableId, key, numbersArr]) => {
          const bound = boundsOf(numbersArr.map(nums => new Segment(nums as [number, number])));
          const s = initState(treeId, paintableId);
          s.bounds.set(key, bound);
          dispatcher.doneTaskForKey(treeId, paintableId, key);
        })
      ),
      pt._getBBoxesOf.pipe(
        op.map(([treeId, paintableId]) => {
          const bounds = canvasBgState.get(treeId)?.paintableById.get(paintableId)?.bounds;
          const rects = [] as Rectangle[];
          if (bounds) {
            for (const bound of bounds.values()) {
              const rect = {...bound};
              rects.push(rect);
            }
          }
          dispatcher.gotBBoxesOf(treeId, paintableId, rects);
        })
      ),
      pt.destroyDetectTree.pipe(
        op.map(treeId => {
          canvasBgState.delete(treeId);
        })
      )
    ).pipe(
      op.ignoreElements()
    ),
    aot.doneTaskForKey,
    aot.gotBBoxesOf
  );
});

declare global {
  interface ImportMeta {
    webpackHot: any;
  }
}
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/tslint/config
if (import.meta.webpackHot) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/tslint/config
  import.meta.webpackHot.dispose((_data: any) => {
    unsub();
  });
}

