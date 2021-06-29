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
import {EpicFactory, ofPayloadAction, Slice, castByActionType} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import {PaintableContext, PaintableSlice} from '@wfh/doc-ui-common/client/graphics/reactiveCanvas.state';
import {drawSegmentPath, createSegments, smoothSegments} from '@wfh/doc-ui-common/client/graphics/canvas-utils';
import {compose, applyToPoint, scale, translate} from 'transformation-matrix';

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
  style?: Record<string, unknown>;
  error?: Error;
  createPaintables?(p: PaintableContext): Iterable<PaintableSlice<any, any>>;
}
interface GradientState {
  position: [left: number, top: number];
  color: string;
  error?: Error;
}

const reducers = {
  changeColor(s: BackgroundDemoState, startColor: Color) {
    s.topColor = startColor;
    s.leftColor = startColor.hue(startColor.hue() + 20).alpha(0.8);
    s.rightColor = startColor.hue(startColor.hue() - 30).alpha(0.9);
  },
  _syncComponentProps(s: BackgroundDemoState, payload: BackgroundDemoProps) {
    s.componentProps = {...payload};
  }
};

export function sliceOptionFactory() {
  const initialState: BackgroundDemoState = {
    mainColor: new Color('#ffffff')
    // topColor: startColor, // .saturationl(90).lightness(80).alpha(1),
    // leftColor: startColor.hue(startColor.hue() + 20).alpha(0.8),
    // rightColor: startColor.hue(startColor.hue() - 30).alpha(0.9)
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
  slice.dispatch({
    type: 'init-createPaintables',
    reducer(s: BackgroundDemoState) {
      s.createPaintables = (pctx) => {
        return createPaintable(pctx, slice);
      };
    }
  });
  slice.actionDispatcher.changeColor(new Color('#1916A5').lightness(60));
  return (action$) => {
    return rx.merge(
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

function createGradient(pctx: PaintableContext, color: string, left: number, top: number) {
  const initialState: GradientState = {
    color,
    position: [left, top]
  };

  const extendReducers = {
    changeColor(s: GradientState, col: string) {
      s.color = col;
    },
    setPosition(s: GradientState, pos: [left: number, top: number]) {
      s.position = pos;
    }
  };
  const gradientPaintableSlice = pctx.createPaintableSlice({name: 'bg-gradient',
    extendInitialState: initialState,
    extendReducers
  });
  gradientPaintableSlice.addEpic((slice) => action$ => {
    return action$.pipe(ofPayloadAction(slice.actions.render),
      op.map(({payload: ctx}) => {
        const s = gradientPaintableSlice.getState();
        // const pctx = s.pctx!;
        const canvasState = pctx.getState();
        const color = s.color;
        const gradient = ctx.createRadialGradient(s.position[0], s.position[1], 0, s.position[0], s.position[1],
          // Math.floor(Math.pow(canvasState.width * canvasState.width + canvasState.height * canvasState.height, 0.5)));
          Math.max(canvasState.width, canvasState.height));
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.3, new Color(color).alpha(0.5).toString());
        gradient.addColorStop(0.5, new Color(color).alpha(0.3).toString());
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
  const top = createGradient(pctx, bgDemoSlice.getState().topColor!.toString(), pctx.getState().width >> 1, 0);
  const left = createGradient(pctx, bgDemoSlice.getState().leftColor!.toString(), 0, pctx.getState().height >> 1);
  const right = createGradient(pctx, bgDemoSlice.getState().rightColor!.toString(), pctx.getState().width, pctx.getState().height >> 1);
  const bgSlice = pctx.createPosPaintable({name: 'main-background', debug: true});

  bgSlice.addEpic(slice => action$ => {
    const actionStreams = castByActionType(slice.actions, action$);
    const pctxActionStreams = castByActionType(pctx.actions, pctx.action$);
    return rx.merge(
      actionStreams.render.pipe(
        op.map(({payload: ctx}) => {
          const mainColor = bgDemoSlice.getState().mainColor;
          if (mainColor == null)
            return;
          ctx.fillStyle = mainColor.hex();
          // console.log(pctx.getState().width, pctx.getState().height);
          ctx.fillRect(0, 0, pctx.getState().width, pctx.getState().height);
        })
      ),
      actionStreams.afterRender.pipe(
        op.map(({payload: ctx}) => {
          ctx.strokeStyle = 'white';
          const state = pctx.getState();
          const triaHeight = Math.min(state.height, state.width) >> 1;
          const halfTriaEdgeLen = Math.tan(Math.PI / 6) * triaHeight;
          const centerX = state.width >> 1;
          const triangleVertices: [number, number][] = [
            [centerX, pctx.getState().height >> 2],
            [Math.round(centerX - halfTriaEdgeLen), triaHeight + (pctx.getState().height >> 2)],
            [Math.round(centerX + halfTriaEdgeLen), triaHeight + (pctx.getState().height >> 2)]
          ];
          const segs = createSegments(triangleVertices);
          const segments = Array.from(segs);
          smoothSegments(segments, {closed: true, type: 'asymmetric'});
          ctx.beginPath();
          drawSegmentPath(segments, ctx, true);
          ctx.closePath();
          ctx.stroke();


          const matrix = compose(scale(state.width >> 1, state.height >> 1), translate(1, 1));
          const rectangle = Array.from(createSegments([[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(point => {
            const newP = applyToPoint(matrix, point as [number, number]);
            return newP;
          })));
          smoothSegments(rectangle, {closed: true, type: 'asymmetric'});
          ctx.beginPath();
          drawSegmentPath(rectangle, ctx, true);
          ctx.closePath();
          ctx.stroke();

          const text = bgDemoSlice.getState().topColor?.toString();
          ctx.fillStyle = 'black';
          ctx.translate(pctx.getState().width >> 1, pctx.getState().height >> 1);
          ctx.scale(4, 4);
          if (text)
            ctx.fillText(text, 0, 0);
        })),
      // observe canvas's resize action
      pctxActionStreams.resize.pipe(
        op.map(() => {
          top.actionDispatcher.setPosition([pctx.getState().width >> 1, 0]);
          left.actionDispatcher.setPosition([0, pctx.getState().height >> 1]);
          right.actionDispatcher.setPosition([pctx.getState().width, pctx.getState().height >> 1]);
        })),
      // pctxActionStreams._onDomMount.pipe(
      //   op.map(() => {
      //     setTimeout(() => {
      //       pctx.createAnimation(0, 360, 5000, 'linear').pipe(
      //         op.map((value, idx) => {
      //           // console.log('frame ', idx, value);
      //           return Math.floor(value);
      //         }),
      //         op.distinctUntilChanged(),
      //         op.map((value, idx) => {
      //           // tslint:disable-next-line: no-console
      //           console.log('frame', idx, value);
      //           const col = bgDemoSlice.getState().topColor;
      //           if (col) {
      //             bgDemoSlice.actionDispatcher.changeColor(col.hue(value));
      //             pctx.renderCanvas();
      //           }
      //         })
      //       ).subscribe();
      //     }, 20);
      //   })
      // ),
      bgDemoSlice.getStore().pipe(
        op.map(s => s.topColor), op.distinctUntilChanged(),
        op.map((topColor) => {
          if (topColor) {
            top.actionDispatcher.changeColor(topColor.toString());
            left.actionDispatcher.changeColor(bgDemoSlice.getState().leftColor!.toString());
            right.actionDispatcher.changeColor(bgDemoSlice.getState().rightColor!.toString());
          }
        })
      )
    ).pipe(
      op.ignoreElements()
    );
  });
  bgSlice.actionDispatcher.addChildren([left, top, right]);

  return [bgSlice];
}

// function createTriangle(pctx: PaintableContext) {

// }
