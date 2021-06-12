/**
 * For those components which has complicated "state" or a lot async "actions",
 * leverage a Redux (Redux-toolkit, Redux-observable) like internal store to manage
 * your component.
 * 
 * It's more powerful than React's useReducer() (https://reactjs.org/docs/hooks-reference.html#usereducer)
 * 
 * You should be familiar with concept of "slice" (Redux-toolkit) and "Epic" (Redux-observable) first.
 * 
 * Unlike real Redux-toolkit, we does not use ImmerJs inside, its your job to take care of
 * immutabilities of state, but also as perks, you can use any ImmerJS unfriendly object in state,
 * e.g. DOM object, React Component, functions
 */
import {EpicFactory, ofPayloadAction as ofa, Slice} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import {PaintableContext, PaintableSlice} from '@wfh/doc-ui-common/client/graphics/reactiveCanvas.state';
// import {createCanvas} from '@wfh/doc-ui-common/client/graphics/canvas-utils';
import Color from 'color';
import glur from 'glur';
// import { ofPayloadAction } from '@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit';

export type BackgroundBlurDemoProps = React.PropsWithChildren<{
  // define component properties
  sliceRef?(slice: BackgroundBlurDemoSlice): void;
}>;
export interface BackgroundBlurDemoState {
  componentProps?: BackgroundBlurDemoProps;
  canvasPaintCtx?: PaintableContext;
  createPaintables?(p: PaintableContext): Iterable<PaintableSlice<any, any>>;
  error?: Error;
}

const reducers = {
  _syncComponentProps(s: BackgroundBlurDemoState, payload: BackgroundBlurDemoProps) {
    s.componentProps = {...payload};
  },
  _paint(s: BackgroundBlurDemoState, pctx: PaintableContext) {
    s.canvasPaintCtx = pctx;
  }
  // define more reducers...
};

export function sliceOptionFactory() {
  const initialState: BackgroundBlurDemoState = {};
  return {
    name: 'BackgroundBlurDemo',
    initialState,
    reducers,
    debug: process.env.NODE_ENV !== 'production'
  };
}

export type BackgroundBlurDemoSlice = Slice<BackgroundBlurDemoState, typeof reducers>;

export const epicFactory: EpicFactory<BackgroundBlurDemoState, typeof reducers> = function(slice) {
  slice.dispatch({
    type: 'createPaintables',
    reducer(s: BackgroundBlurDemoState) {
      s.createPaintables = pctx => createPaintable(pctx, slice);
    }
  });
  return (action$) => {
    return rx.merge(
      action$.pipe(ofa(slice.actions._paint),
        op.map(action => {
          createPaintable(action.payload, slice);
        })),
      // Observe state (state$) change event, exactly like React.useEffect(), but more powerful for async time based reactions
      slice.getStore().pipe(
        op.map(s => s.componentProps), // watch component property changes
        op.filter(props => props != null),
        op.distinctUntilChanged(), // distinctUntilChanged accept an expression as parameter
        op.map(() => {
          // slice.actionDispatcher....
        })
      ),
      slice.getStore().pipe(
        op.map(s => s.componentProps?.sliceRef), op.distinctUntilChanged(),
        op.map(sliceRef => {
          if (sliceRef) {
            sliceRef(slice);
          }
        })
      )
    ).pipe(op.ignoreElements());
  };
};

interface BlurCanvasState {
  // bluredCanvasCtx?: CanvasRenderingContext2D;
}

function createPaintable(pctx: PaintableContext, bgDemoSlice: BackgroundBlurDemoSlice) {
  const initialState: BlurCanvasState = {};
  const extendReducers = {
    // setCacheCtx(s: BlurCanvasState, ctx: CanvasRenderingContext2D) {
    //   s.bluredCanvasCtx = ctx;
    // }
  };

  const mainPaintable = pctx.createPaintableSlice({name: 'mainPaintable', extendInitialState: initialState,
    extendReducers,
    debug: true
  });

  mainPaintable.addEpic(slice => {
    return action$ => {
      return rx.merge(
        action$.pipe(ofa(slice.actions.render),
          op.map(({payload: ctx}) => {
            ctx.fillStyle = '#FCFAE9';
            const {canvas} = ctx;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          })
        ),

        action$.pipe(ofa(slice.actions.afterRender),
          op.map(({payload: ctx}) => {
            // const cache = slice.getState().bluredCanvasCtx;
            // if (cache) {
              const {canvas} = ctx;
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const {data} = imgData;
              glur(// data.data as any,
                new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
                imgData.width, imgData.height, 55);
              ctx.putImageData(imgData, 0, 0);
          })
        )
      ).pipe(op.ignoreElements());
    };
  });

  const circleColor = new Color('green').hue(95).saturationl(80).lightness(60).hex();
  const fontColor = 'blue';
  const circle1 = pctx.createPaintableSlice({name: 'circle1', debug: true});
  circle1.addEpic(slice => {
    return action$ => rx.merge(
      action$.pipe(ofa(slice.actions.render),
        op.map(({payload: ctx}) => {
          ctx.save();
          ctx.fillStyle = circleColor;
          const c = ctx.canvas;
          ctx.beginPath();
          ctx.arc(c.width >> 1, c.height, Math.min(c.height, c.width) >> 1, 0, Math.PI * 2);
          ctx.fill();
          ctx.closePath();
          ctx.font = `${Math.floor(ctx.canvas.height / 5)}px Roboto`;
          ctx.fillStyle = fontColor;
          ctx.fillText('PLink', Math.floor(ctx.canvas.width * 0.1), ctx.canvas.height >> 1);
          ctx.restore();
        }))
    ).pipe(op.ignoreElements());
  });
  mainPaintable.actionDispatcher.addChildren([circle1]);

  return [mainPaintable];
}
