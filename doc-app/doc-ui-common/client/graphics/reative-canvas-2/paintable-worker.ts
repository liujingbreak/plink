import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {applyToPoint} from 'transformation-matrix';
import {createActionStreamByType} from '@wfh/redux-toolkit-observable/es/rx-utils';
import {boundsOf, Rectangle} from '../canvas-utils';
import type {BackgrounActions, ResponseEvents} from './paintable-heavy-cal';

/* eslint-disable no-restricted-globals */
addEventListener('message', event => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const msg = event.data;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  _actionFromObject(msg);
  console.log(event);
});

type CanvasBgState = {
  bounds: Map<string, Rectangle>;
};

const canvasBgState: CanvasBgState = {
  bounds: new Map()
};

const {dispatcher, actionByType: aot, _actionFromObject, _actionToObject} =
  createActionStreamByType<BackgrounActions & ResponseEvents>();

rx.merge(
  aot.calcBBoxByKey.pipe(
    op.map(({payload: [key, segs]}) => {
      const bound = boundsOf(segs);
      canvasBgState.bounds.set(key, bound);
      dispatcher.doneTaskForKey(key);
    })
  ),
  aot.transformBBoxByKey.pipe(
    op.map(({payload: [key, m]}) => {
      const rect = canvasBgState.bounds.get(key);
      if (rect) {
        const changed = {...applyToPoint(m, rect)} as Rectangle;
        canvasBgState.bounds.set(key, changed);
      }
      dispatcher.doneTaskForKey(key);
    })
  ),
  aot.doneTaskForKey.pipe(
    op.map(action => {
      postMessage(_actionToObject(action));
    })
  )
).pipe(
  op.catchError((err, src) => {
    void Promise.resolve().then(() => {throw err; });
    return src;
  })
).subscribe();
