import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {IntervalTree} from '@wfh/plink/wfh/dist-es/share/algorithms/interval-tree';
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
  yPositionTree: IntervalTree<IntervalTree<string>>;
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
        bounds: new Map(),
        yPositionTree: new IntervalTree()
      };
      canvasInstanceState.paintableById.set(paintableId, paintableState);
    }
    return paintableState;
  }

  return rx.merge(
    rx.merge(
      pt._updateDetectable.pipe(
        op.map(([treeId, paintableId, key, numbersArr]) => {
          const bound = boundsOf(numbersArr.map(nums => new Segment(nums)));
          const s = initState(treeId, paintableId);
          s.bounds.set(key, bound);
          /* const yNode = */s.yPositionTree.insertInterval(bound.y, bound.y + bound.h);
          // if (yNode.value == null) {
          //   const xPositionTree = new IntervalTree<string>();
          //   yNode.value = xPositionTree;
          // }
          // const xNode = yNode.value.insertInterval(bound.x, bound.x + bound.w);
          // if (xNode.value != null) {
          //   xNode.value = key + ',' + xNode.value;
          // } else {
          //   xNode.value = key;
          // }
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

