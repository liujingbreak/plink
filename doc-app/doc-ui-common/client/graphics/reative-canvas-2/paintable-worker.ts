import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {IntervalTree} from '@wfh/plink/wfh/dist-es/share/algorithms/interval-tree';
import type {IntervalTreeNode} from '@wfh/plink/wfh/dist-es/share/algorithms/interval-tree';
import {boundsOf, Rectangle, Segment, isInsideSegments} from '../canvas-utils';
import {createWorkerControl} from '../../utils/worker-impl-util';
import type {ActionsToWorker, ResponseEvents} from './paintable-worker-client';

type CanvasDataState = {
  /** key is Paintable ID */
  paintableById: Map<string, PaintableState>;
  /** value is paintable dataKey */
  yPositionTree: IntervalTree<IntervalTree<string>>;
  segmentsByKey: Map<string, Segment[]>;
};

type PaintableState = {
  /** key is dataKey */
  bounds: Map<string, Rectangle>;
};

const unsub = createWorkerControl<ActionsToWorker & ResponseEvents>((control, workerNo) => {
  const {actionByType: aot, payloadByType: pt, dispatcher} = control;
  // key is tree ID
  const canvasBgState = new Map<string, CanvasDataState>();

  function initState(treeId: string, paintableId: string) {
    const canvasInstanceState = initCanvasState(treeId);

    let paintableState = canvasInstanceState.paintableById.get(paintableId);
    if (paintableState == null) {
      paintableState = {
        bounds: new Map()
      };
      canvasInstanceState.paintableById.set(paintableId, paintableState);
    }
    return paintableState;
  }

  function initCanvasState(treeId: string) {
    let canvasInstanceState = canvasBgState.get(treeId);
    if (canvasInstanceState == null) {
      canvasInstanceState = {
        paintableById: new Map(),
        yPositionTree: new IntervalTree(),
        segmentsByKey: new Map()
      };
      canvasBgState.set(treeId, canvasInstanceState);
    }
    return canvasInstanceState;
  }

  return rx.merge(
    rx.merge(
      pt._updateDetectable.pipe(
        op.map(([treeId, paintableId, key, numbersArr]) => {
          const segs = numbersArr.map(nums => new Segment(nums));
          const bound = boundsOf(segs);
          const canvasState = initCanvasState(treeId);
          canvasState.segmentsByKey.set(key, segs);

          const s = initState(treeId, paintableId);
          const c = canvasBgState.get(treeId)!;
          const existingB = s.bounds.get(key);
          if (existingB) {
            const yHigh = existingB.y + existingB.h;
            const yNode = c.yPositionTree.searchIntervalNode(existingB.y, yHigh);
            const xHigh = existingB.x + existingB.w;
            const xNode = yNode?.value.searchIntervalNode(existingB.x, xHigh);
            if (xNode) {
              const valueArr = xNode.value.split(',');
              if (valueArr.indexOf(key) >= 0) {
                xNode.value = valueArr.filter(v => v !== key).join(',');
                if (xNode.value.length === 0) {
                  yNode?.value.deleteInterval(existingB.x, xHigh);
                  if (yNode?.value.size() === 0 && yNode.weight === 1) {
                    c.yPositionTree.deleteInterval(existingB.y, yHigh);
                  }
                }
              }
            }
          }
          s.bounds.set(key, bound);
          const yNode = c.yPositionTree.insertInterval(bound.y, bound.y + bound.h);
          if (yNode.value == null) {
            const xPositionTree = new IntervalTree<string>();
            yNode.value = xPositionTree;
          }
          const xNode = yNode.value.insertInterval(bound.x, bound.x + bound.w);
          if (xNode.value != null) {
            xNode.value = key + ',' + xNode.value;
          } else {
            xNode.value = key;
          }
          dispatcher.doneTaskForKey(treeId, paintableId, key);
        })
      ),
      pt._getBBoxesOf.pipe(
        op.map(([treeId, paintableId]) => {
          const bounds = canvasBgState.get(treeId)?.paintableById.get(paintableId)?.bounds;
          const rects = [] as Rectangle[];
          initState(treeId, paintableId);

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
      ),
      pt._detectPoint.pipe(
        op.map(([treeId, xy]) => {
          const c = initCanvasState(treeId);
          const yPositions = c.yPositionTree.searchMultipleOverlaps(xy[1], xy[1]);
          const resultKeyAndInters = [] as string[];
          for (const [, , xTree] of yPositions) {
            const founds = xTree.searchMultipleOverlaps(xy[0], xy[0]);
            for (const [, , ids] of founds) {
              const keys = ids.split(',');
              for (const key of keys) {
                const segs = c.segmentsByKey.get(key);
                if (segs && isInsideSegments(xy[0], xy[1], segs)) {
                  resultKeyAndInters.push(key);
                }
              }
            }
          }
          dispatcher._doneDetectPoint(treeId, resultKeyAndInters, xy);
        })
      )
    ).pipe(
      // To avoid messages passed to `postMessage()`, remember `epic` returns an observable of messages (actions) which is
    // supposed to be sent to parent thread
      op.ignoreElements()
    ),
    // Below actions are all piped to `postMessage()`
    aot.doneTaskForKey,
    aot.gotBBoxesOf,
    aot._doneDetectPoint
  );
}, {debug: true});

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

export function printTree(tree: IntervalTree) {
  const lines = [] as string[];
  tree.inorderWalk((node, level) => {
    let p = node as IntervalTreeNode<any> | null;
    let leadingSpaceChars = '';
    while (p) {
      leadingSpaceChars = (p.p?.p && ((p === p.p.left && p.p.p.right === p.p) || (p === p.p.right && p.p.p.left === p.p)) ? '|  ' : '   ') + leadingSpaceChars;
      p = p.p;
    }
    const str = `${leadingSpaceChars}+- ${node.p ? node.p?.left === node ? 'L' : 'R' : 'root'} ${node.key + ''} - ${node.maxHighOfMulti + ''}` +
      `(max ${node.max} ${node.highValuesTree ? '[tree]' : ''}): size: ${node.size}`;
    // lines.push(node.isRed ? chalk.red(str) : str);
    lines.push(str);
  });
  lines.push('total size: ' + tree.root?.size);
  return ':\n' + lines.join('\n');
}
