import {PaintableContext} from '@wfh/doc-ui-common/client/graphics/reactiveCanvas.state';
import {createCanvas} from '@wfh/doc-ui-common/client/graphics/canvas-utils';
import {ofPayloadAction} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import * as stackBlur from 'stackblur-canvas';
import Color from 'color';

// interface CircleState {
//   cachedCanvas?: HTMLCanvasElement;
//   error?: Error;
// }

export function create(ctx: PaintableContext) {
  let cachedCanvas: HTMLCanvasElement | undefined;

  const baseSlice = ctx.createPaintableSlice({name: 'Circle', debug: true});
  rx.merge(
    baseSlice.action$.pipe(
      ofPayloadAction(baseSlice.actions.render),
      op.tap(({payload: ctx}) => {
        if (cachedCanvas) {
          ctx.scale(2, 2);
          ctx.drawImage(cachedCanvas, 0, 0);
        }
      })
    ),
    baseSlice.getStore().pipe(
      op.map(s => s.pctx), op.distinctUntilChanged(), op.filter(p => p != null),
      op.switchMap(pctx => {
        return pctx!.action$.pipe(ofPayloadAction(pctx!.actions.resize),
          op.tap(() => {
            const w = pctx!.getState().width >> 1;
            const h = pctx!.getState().height >> 1;
            cachedCanvas = createCanvas(w, h);
            // const pctx = baseSlice.getState().pctx!;
            const ctx = cachedCanvas.getContext('2d')!;
            ctx.fillStyle = 'white';
            ctx.fillRect(0,0,w,h);
            ctx.fillStyle = new Color('red').mix(new Color('white'), 0.7).hex();

            ctx.beginPath();
            ctx.arc(0, h >> 1, w >> 3, 0, 2 * Math.PI);
            ctx.fill();
            ctx.closePath();
            // gBlur(ctx, 15);
            stackBlur.canvasRGBA(cachedCanvas, 0, 0, cachedCanvas.width, cachedCanvas.height, 5);
          })
        );
      })
    )
  ).pipe(
    op.takeUntil(baseSlice.destroy$)
  ).subscribe();

  return [baseSlice];
}
