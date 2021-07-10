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
import {drawSegmentPath, createSegments, smoothSegments, drawSegmentCtl, transSegments, boundsOf, Segment
} from '@wfh/doc-ui-common/client/graphics/canvas-utils';
import {transform, applyToPoint, rotate, scale, translate, Matrix} from 'transformation-matrix';
import {bend, randomNumbers, randomePointInsideCircle} from '@wfh/doc-ui-common/client/graphics/randomCurves';
// import {easeInOut} from '@wfh/doc-ui-common/client/animation/ease-functions';
import bezierEasing from 'bezier-easing';

import Color from 'color';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';

const gradientCurveFn = bezierEasing(0.9, 0, 0.2, 1);
const gradientLevels = [0, 0.2, 0.4, 0.6, 0.8, 1].map(level => ({level, value: 1 - gradientCurveFn(level)}));

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

        gradientLevels.forEach(({level, value}) => {
          gradient.addColorStop(level, new Color(color).alpha(value).toString());
        });

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
  // const curveBg = createCurveBg(pctx, 4);

  const halfTriaEdgeLen = Math.tan(Math.PI / 6) * 100;

  let triangleVertices: [number, number][] = [
    randomePointInsideCircle([0, 0], [0, 10]),
    randomePointInsideCircle([halfTriaEdgeLen, 100], [0, 10]),
    randomePointInsideCircle([-halfTriaEdgeLen, 100], [0, 10])
  ];
  const segs = createSegments(triangleVertices);
  const segments = Array.from(segs);
  smoothSegments(segments, {closed: true, type: 'asymmetric'});
  // drawSegmentCtl(segments, ctx, true);

  const bounds = boundsOf(segments, true);
  const center: [number, number] = [bounds.x + (bounds.w / 2), bounds.y + (bounds.h / 2)];

  const triangleShapes = [segments];
  for (let i = 1; i <= 4; i++) {
    const segs2 = Array.from(transSegments(segments,
      transform(translate(25 * i, 0), rotate(Math.PI * i / 12, center[0], center[1]))
    ));
    triangleShapes.push(segs2);
  }

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
          ctx.strokeStyle = 'rgba(255,255,255, 0.3)';
          ctx.fillStyle ='rgba(255,255,255, 0.1)';
          const state = pctx.getState();
          const triaHeight = Math.min(state.height, state.width) * 1.3;
          const triaCurveShapeHeight = bounds.h / 100 * triaHeight;
          const centerX = state.width >> 1;

          // triangleVertices = bend(triangleVertices, {closed: true, vertexNormalRange: [-0.2, 0]});

          const transformAsChild = transform(translate(centerX, (state.height - triaCurveShapeHeight) / 2), scale(triaHeight / 100, triaHeight / 100));

          ctx.beginPath();
          drawSegmentPath(transSegments(triangleShapes[0], transformAsChild), ctx, {closed: true, round: true});
          ctx.closePath();
          ctx.fill();


          for (let i = 1; i < triangleShapes.length; i++) {
            const segs2 = triangleShapes[i];

            ctx.beginPath();
            drawSegmentPath(transSegments(segs2, transformAsChild), ctx, {closed: true, round: true});
            ctx.closePath();
            ctx.fill();
          }

          const text = bgDemoSlice.getState().topColor?.toString();
          ctx.fillStyle = '#303030';
          ctx.translate(pctx.getState().width >> 1, pctx.getState().height >> 1);
          ctx.scale(4, 4);
          ctx.font = '10px Hatton-Regular,Arial,Helvetica,sans-serif';
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

interface MatrixState {
  matrix?: Matrix;
}

function createCurveBg(pctx: PaintableContext, numOfCurves: number) {
  const extendInitialState: MatrixState = {
  };

  const extendReducers = {
    scale(s: MatrixState, size: [number, number]) {
      s.matrix = scale(size[0], size[1]);
    }
  };


  const slice = pctx.createPosPaintable({
    name: 'curveBg',
    extendInitialState,
    extendReducers,
    debug: true
  });
  slice.addEpic(slice => action$ => {
    const topPointsX = randomNumbers(0.4, 1, numOfCurves);
    const bottomPointX = randomNumbers(0, 0.5, numOfCurves);

    const lines = topPointsX.map((topX, idx) => {
      const segs = Array.from(
        createSegments(bend([[topX, 0], [bottomPointX[idx], 1]] as [number, number][], {
          vertexNormalRange: [-0.15, -0.05]
        }))
      );
      smoothSegments(segs, {closed: false});
      return segs;
    });

    const actions = castByActionType(slice.actions, action$);
    return rx.merge(
      actions.render.pipe(
        op.map(({payload: ctx}) => {
          for (let line of lines) {
            const m = slice.getState().matrix;
            if (m) {
              line = [...transSegments(line, m)];
            }
            ctx.strokeStyle = 'white';
            ctx.beginPath();
            drawSegmentPath(line, ctx);
            // ctx.closePath();
            ctx.stroke();
          }
        })
      ),
      pctx.actionByType.resize.pipe(
        op.tap(action => {
          const canvasState = pctx.getState();
          slice.actionDispatcher.scale([canvasState.width, canvasState.height]);
        })
      )
    ).pipe(op.ignoreElements());
  });
  return slice;
}

// function createTriangle(pctx: PaintableContext) {

// }
