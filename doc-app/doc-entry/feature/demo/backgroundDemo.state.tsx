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
import {EpicFactory, ofPayloadAction, Slice} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import {PaintableContext, createPaintableSlice} from '@wfh/doc-ui-common/client/graphics/reactiveCanvas.state';

import Color from 'color';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';

export type BackgroundDemoProps = React.PropsWithChildren<{
  // define component properties
  sliceRef?(slice: BackgroundDemoSlice): void;
  mainColor?: string;
  leftColor?: string;
  rightColor?: string;
  topColor?: string;
}>;
export interface BackgroundDemoState {
  componentProps?: BackgroundDemoProps;
  mainColor?: Color;
  leftColor?: Color;
  rightColor?: Color;
  topColor?: Color;
  canvasPaintCtx?: PaintableContext;
  style?: object;
  error?: Error;
}
interface GradientState {
  position: [left: number, top: number];
  color: string;
  error?: Error;
}

const reducers = {
  _syncComponentProps(s: BackgroundDemoState, payload: BackgroundDemoProps) {
    s.componentProps = {...payload};
  },
  _paint(s: BackgroundDemoState, pctx: PaintableContext) {
    s.canvasPaintCtx = pctx;
  }
  // define more reducers...
};

export function sliceOptionFactory() {
  const initialState: BackgroundDemoState = {
    mainColor: new Color('#1916A5').saturationl(50),
    topColor: new Color('#FCFAE9').saturationl(90).lightness(80).alpha(1),
    leftColor: new Color('#7470d9').alpha(0.8),
    rightColor: new Color('#1916A5').saturationl(90).lightness(50).alpha(0.5)
  };
  return {
    name: 'BackgroundDemo',
    initialState,
    reducers,
    debug: process.env.NODE_ENV !== 'production'
  };
}

export type BackgroundDemoSlice = Slice<BackgroundDemoState, typeof reducers>;

export const epicFactory: EpicFactory<BackgroundDemoState, typeof reducers> = function(slice) {
  return (action$) => {
    return rx.merge(
      action$.pipe(ofPayloadAction(slice.actions._paint),
        op.map(action => {
          createPaintable(action.payload, slice);
        })),
      slice.getStore().pipe(
        op.map(s => s.componentProps), // watch component property changes
        op.filter(props => props != null),
        op.distinctUntilChanged(), // distinctUntilChanged accept an expression as parameter
        op.map(() => {
          // slice.actionDispatcher....
        })
      ),
      slice.getStore().pipe(
        op.distinctUntilChanged((a, b) => a.mainColor === b.mainColor && a.canvasPaintCtx === b.canvasPaintCtx),
        op.filter(s => s.mainColor != null && s.canvasPaintCtx != null),
        op.map(s => {
          s.canvasPaintCtx!.renderCanvas();
        })
      ),
      slice.getStore().pipe(
        op.map(s => s.componentProps?.sliceRef), op.distinctUntilChanged(),
        op.tap(sliceRef => {
          if (sliceRef) {
            sliceRef(slice);
          }
        })
      )
    ).pipe(op.ignoreElements());
  };
};

function createGradient(color: string, left: number, top: number) {
  const initialState: GradientState = {
    color,
    position: [left, top]
  };

  const gradientPaintableSlice = createPaintableSlice('bg-gradient', initialState, {
    setPosition(s: GradientState, pos: [left: number, top: number]) {
      s.position = pos;
    }
  }, true);
  gradientPaintableSlice.addEpic((slice) => action$ => {
    return action$.pipe(ofPayloadAction(slice.actions.render),
      op.map(({payload: ctx}) => {
        const s = gradientPaintableSlice.getState();
        const pctx = s.pctx!;
        const canvasState = pctx.getState();
        const color = s.color;
        const gradient = ctx.createRadialGradient(s.position[0], s.position[1], 0, s.position[0], s.position[1],
          // Math.floor(Math.pow(canvasState.width * canvasState.width + canvasState.height * canvasState.height, 0.5)));
          Math.max(canvasState.width, canvasState.height));
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, new Color(color).alpha(0).toString());
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, pctx.getState().width, pctx.getState().height);
      }),
      op.ignoreElements()
    );
  });
  return gradientPaintableSlice;
}

function createPaintable(pctx: PaintableContext, bgDemoSlice: BackgroundDemoSlice) {
  const top = createGradient(bgDemoSlice.getState().topColor!.toString(), pctx.getState().width >> 1, 0);
  const left = createGradient(bgDemoSlice.getState().leftColor!.toString(), 0, pctx.getState().height >> 1);
  const right = createGradient(bgDemoSlice.getState().rightColor!.toString(), pctx.getState().width, pctx.getState().height >> 1);
  const bgSlice = createPaintableSlice('p-background', {}, {}, true);
  bgSlice.addEpic(slice => action$ => {
    return rx.merge(
      action$.pipe(ofPayloadAction(slice.actions.render),
        op.map(({payload: ctx}) => {
          const mainColor = bgDemoSlice.getState().mainColor;
          if (mainColor == null)
            return;
          ctx.fillStyle = mainColor.hex();
          // console.log(pctx.getState().width, pctx.getState().height);
          ctx.fillRect(0, 0, pctx.getState().width, pctx.getState().height);
        })
      ),
      action$.pipe(ofPayloadAction(slice.actions.init),
        op.map(({payload: pctx}) => {
          pctx.addChild(top.actionDispatcher, left.actionDispatcher, right.actionDispatcher);
        })),
      // observe canvas's resize action
      pctx.action$.pipe(ofPayloadAction(pctx.actions.resize),
        op.map(() => {
          top.actionDispatcher.setPosition([pctx.getState().width >> 1, 0]);
          left.actionDispatcher.setPosition([0, pctx.getState().height >> 1]);
          right.actionDispatcher.setPosition([pctx.getState().width, pctx.getState().height >> 1]);
        }))
    ).pipe(
      op.ignoreElements()
    );
  });
  pctx.addChild(bgSlice.actionDispatcher);
}
