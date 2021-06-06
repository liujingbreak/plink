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
import {EpicFactory, Slice, ofPayloadAction, createSlice, PayloadAction} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
// import {DFS} from '@wfh/plink/wfh/dist-es5/utils/graph';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import * as easeFn from '../animation/ease-functions';

export type ReactiveCanvasProps = React.PropsWithChildren<{
  className?: string;
  /** default 2 */
  scaleRatio?: number;
  onReady?(paintCtx: PaintableContext): Iterable<PaintableSlice<any, any>>;
}>;
export interface ReactiveCanvasState {
  ctx?: CanvasRenderingContext2D;
  componentProps: ReactiveCanvasProps;
  canvas: HTMLCanvasElement | null;
  width: number;
  height: number;
  pixelWidth: number;
  pixelHeight: number;
  rootPaintable?: PaintableSlice;
  _lastAnimFrameTime?: number;
  animEscapeTime: number;
  _animatingPaintables: [Set<PaintableSlice>];
  error?: Error;
}

/**
 * PaintableContext is a tailored version of reactiveCanvasSlice for a child Paintable component
 */
export class PaintableContext {
  action$: Slice<ReactiveCanvasState, typeof reducers>['action$'];
  actions: Slice<ReactiveCanvasState, typeof reducers>['actions'];

  constructor(private canvasSlice: Slice<ReactiveCanvasState, typeof reducers>) {
    this.action$ = canvasSlice.action$;
    this.actions = canvasSlice.actions;
  }

  setAnimating(paintable: PaintableSlice<any, any>, yes: boolean) {
    this.canvasSlice.actionDispatcher.setAnimating([paintable, yes]);
  }
  renderCanvas() {
    this.canvasSlice.actionDispatcher.render();
  }
  // /** So that children will be rendered to a different canvas */
  // changeCanvasContext(ctx: CanvasRenderingContext2D) {
  //   this.canvasSlice.actionDispatcher.changeContext(ctx);
  // }

  createPaintableSlice<S = {}, R = {}>(name: string,
    extendInitialState: S = {} as S,
    extendReducers: R = {} as R,
    actionInterceptor?: rx.OperatorFunction<PayloadAction<BasePaintableState & S>, PayloadAction<BasePaintableState & S>>,
    debug?: boolean): PaintableSlice<S, R> {
    const slice = createSlice<BasePaintableState & S, typeof basePaintableReducers>({
      name,
      initialState: Object.assign({attached: false}, extendInitialState),
      reducers: Object.assign(basePaintableReducers, extendReducers),
      debug
    });
    slice.addEpic(slice => {
      return inputAction$ => {
        const action$ = actionInterceptor ? inputAction$.pipe(actionInterceptor) : inputAction$;
        const dispatcher = slice.actionDispatcher;
        return rx.merge(
          action$.pipe(ofPayloadAction(slice.actions.renderAll),
            op.map(({payload}) => {
              payload.canvasCtx.save();
              dispatcher.render(payload);
              if (slice.getState().children)
                dispatcher._renderChildren(payload);
              dispatcher.afterRender(payload);
              payload.canvasCtx.restore();
            })
          ),

          action$.pipe(ofPayloadAction(slice.actions._renderChildren),
            op.map(({payload}) => {
              for (const chr of slice.getState().children![0].values()) {
                chr.actionDispatcher.renderAll(payload);
              }
          })),
          action$.pipe(ofPayloadAction(slice.actions.setAnimating),
            op.switchMap(animating => {
              if (animating) {
                return slice.getStore().pipe(op.map(s => s.attached),
                  op.distinctUntilChanged(), op.filter(attached => attached), op.take(1),
                  op.map(() => {
                    this.setAnimating(slice, true);
                  })
                );
              } else {
                this.setAnimating(slice, false);
                return rx.EMPTY;
              }
            })
          ),
          action$.pipe(ofPayloadAction(slice.actions.addChildren),
            op.map(({payload: children}) => {
              // const state = slice.getState();
              slice.dispatch({
                type: 'set parent',
                reducer(s: BasePaintableState) {
                  if (s.children == null)
                    s.children = [new Set()];

                  let chrSet: Set<PaintableSlice> = s.children ? s.children[0] : new Set();

                  for (const chr of children) {
                    chrSet.add(chr);
                    chr.actionDispatcher._setParent(slice);
                  }
                  s.children = [chrSet];
                }
              });
            })
          ),
          action$.pipe(ofPayloadAction(slice.actions.removeChildren),
            op.map(({payload: children}) => {
              slice.dispatch({
                type: 'detach children',
                reducer(s: BasePaintableState) {
                  for (const chr of children) {
                    chr.actionDispatcher._setParent(undefined);
                  }
                }
              });
            })
          ),
          action$.pipe(ofPayloadAction(slice.actions.clearChildren),
            op.map(action => {
              const childrenState = slice.getState().children;
              if (childrenState == null)
                return;
              slice.actionDispatcher.removeChildren(childrenState[0].values());
            })
          ),
          slice.getStore().pipe(op.map(s => s.parent),
            op.distinctUntilChanged(),
            op.switchMap(parent => {
              if (parent == null) {
                dispatcher._setAttached(false);
                return rx.EMPTY;
              }
              return rx.merge(
                // parent.action$.pipe(ofPayloadAction(parent.actions._renderChildren),
                //   op.map(({payload}) => {
                //     payload.canvasCtx.save();
                //     dispatcher.render(payload);
                //     dispatcher._renderChildren(payload);
                //     dispatcher.afterRender(payload);
                //     payload.canvasCtx.restore();
                //   })
                // ),
                parent.getStore().pipe(
                  op.map(s => s.attached), op.distinctUntilChanged(),
                  op.map(attached => {
                    dispatcher._setAttached(attached);
                  })
                )
              );
            })
          )
        ).pipe(
          op.ignoreElements()
        );
      };
    });
    return slice as PaintableSlice<S, R>;
  }

  animate(startValue: number, endValue: number, durationSec: number,
    timingFuntion: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear' = 'ease')
    :rx.Observable<number> {

    let timingFn: (input: number) => number;
    switch (timingFuntion) {
      case 'ease':
        timingFn = easeFn.ease;
        break;
      case 'ease-in':
        timingFn = easeFn.easeIn;
        break;
      case 'ease-out':
        timingFn = easeFn.easeOut;
        break;
      case 'ease-in-out':
        timingFn = easeFn.easeInOut;
        break;
      default:
        timingFn = easeFn.linear;
        break;
    }

    return this.getStore().pipe(
      op.map(s => s._lastAnimFrameTime),
      op.distinctUntilChanged(),
      op.filter(time => time != null),
      op.take<number>(1),
      op.switchMap(initTime => {
        const deltaValue = endValue - startValue;
        return rx.concat(
          this.getStore().pipe(
            op.map(s => s._lastAnimFrameTime!),
            op.distinctUntilChanged(),
            op.filter(time => time > initTime),
            op.map(time => {
              let progress = (time - initTime) / durationSec;
              let currValue = startValue + deltaValue * timingFn(progress);
              return currValue;
            }),
            op.takeWhile(currValue => currValue < endValue)
          ),
          rx.of(endValue)
        );
      })
    );
  }

  getState() {
    return this.canvasSlice.getState();
  }
  getStore() {
    return this.canvasSlice.getStore();
  }
}
export interface BasePaintableState {
  pctx?: PaintableContext;
  children?: [Set<PaintableSlice>];
  parent?: PaintableSlice;
  attached: boolean;
  error?: Error;
}
export const basePaintableReducers = {
  init(s: BasePaintableState, pctx: PaintableContext) {
    s.pctx = pctx;
  },
  addChildren(s: BasePaintableState, children: Iterable<PaintableSlice>) {},
  removeChildren(s: BasePaintableState, children: Iterable<PaintableSlice>) {
    for (const chr of children) {
      s.children![0].delete(chr);
    }
    s.children = [s.children![0]];
  },
  clearChildren(s: BasePaintableState) {},
  setAnimating(s: BasePaintableState, yes: boolean) {},
  _setAttached(s: BasePaintableState, attached: boolean) {
    s.attached = attached;
  },
  _setParent(s: BasePaintableState, parent: PaintableSlice<any, any> | undefined) {
    s.parent = parent;
  },
  renderAll(s: BasePaintableState, _payload: {escapeTime: number; canvasCtx: CanvasRenderingContext2D}) {},
  render(s: BasePaintableState, _payload: {escapeTime: number; canvasCtx: CanvasRenderingContext2D}) {},
  _renderChildren(s: BasePaintableState, _payload: {escapeTime: number; canvasCtx: CanvasRenderingContext2D}) {},
  afterRender(s: BasePaintableState, _payload: {escapeTime: number; canvasCtx: CanvasRenderingContext2D}) {}
  // destroy(s: BasePaintableState) {}
};

export type PaintableSlice<S = {}, R = {}> = Slice<BasePaintableState & S, typeof basePaintableReducers & R>;

const reducers = {
  resize(s: ReactiveCanvasState) {
    if (s.canvas == null)
      return;
    const vw = s.canvas.parentElement!.clientWidth;
    const vh = s.canvas.parentElement!.clientHeight;

    if (vw !== s.pixelWidth || vh !== s.pixelHeight) {
      const ratio = s.componentProps.scaleRatio!;
      s.pixelWidth = vw;
      s.pixelHeight = vh;
      s.width = Math.floor(vw * ratio);
      s.height = Math.floor(vh * ratio);
    }
  },
  _afterResize(s: ReactiveCanvasState) {
  },
  render(s: ReactiveCanvasState) {},
  setAnimating(s: ReactiveCanvasState, [paintable, yes]: [paintable: PaintableSlice, animating: boolean]) {
    // s.animatings = isIncrement ? s.animatings + 1 : s.animatings - 1;
    if (yes) {
      if (!s._animatingPaintables[0].has(paintable)) {
        s._animatingPaintables[0].add(paintable);
        s._animatingPaintables = [s._animatingPaintables[0]]; // for dirty detection
      }
    } else {
      if (s._animatingPaintables[0].has(paintable)) {
        s._animatingPaintables[0].delete(paintable);
        s._animatingPaintables = [s._animatingPaintables[0]];
      }
    }
  },
  changeContext(s: ReactiveCanvasState, newCtx: CanvasRenderingContext2D) {
    s.ctx = newCtx;
  },
  _create(s: ReactiveCanvasState, payload: HTMLCanvasElement | null) {
    if (payload) {
      s.canvas = payload;
      s.ctx = payload.getContext('2d')!;
    }
  },
  _onDomMount(s: ReactiveCanvasState) {},
  _componentTreeReady(s: ReactiveCanvasState) {},
  _syncComponentProps(s: ReactiveCanvasState, payload: ReactiveCanvasProps) {
    s.componentProps = {...s.componentProps, ...payload};
  },
  _calAnimEscapeTime(s: ReactiveCanvasState, time: number) {
    if (s._lastAnimFrameTime)
      s.animEscapeTime = time - s._lastAnimFrameTime;
    s._lastAnimFrameTime = time;
  }
};

export function sliceOptionFactory() {
  const initialState: ReactiveCanvasState = {
    componentProps: {
      scaleRatio: 2
    },
    canvas: null,
    width: 0,
    height: 0,
    pixelHeight: 0,
    pixelWidth: 0,
    // rootId,
    // rootPaintable: createPaintableSlice('root'),
    // components: [new Map([ [rootId, rootPaintableData] ])],
    _animatingPaintables: [new Set()],
    // rendering: false,
    animEscapeTime: 0
  };
  return {
    name: 'ReactiveCanvas',
    initialState,
    reducers,
    debug: process.env.NODE_ENV !== 'production'
  };
}

export const epicFactory: EpicFactory<ReactiveCanvasState, typeof reducers> = function(slice) {
  const pCtx = new PaintableContext(slice);
  const rootPaintable = pCtx.createPaintableSlice('root');
  slice.dispatch({type: 'set rootPaintable', reducer(s: ReactiveCanvasState) {
    s.rootPaintable = rootPaintable;
  }});

  return (action$, state$) => {
    return rx.merge(
      rx.combineLatest(
        action$.pipe(ofPayloadAction(slice.actions._afterResize)),
        action$.pipe(ofPayloadAction(slice.actions._componentTreeReady))
      ).pipe(
        op.map(() => {
          renderImmediately(slice);
        }),
        op.switchMap(() => action$.pipe(ofPayloadAction(slice.actions.render))),
        op.exhaustMap(() => render(slice))
      ),

      state$.pipe(op.map(s => s._animatingPaintables[0].size),
        op.scan((old, val) => {
          if (val === 1 && old === 0) {
            slice.actionDispatcher.render();
          }
          return val;
        })
      ),
      slice.getStore().pipe(op.distinctUntilChanged((x, y) => x.width === y.width && x.height === y.height),
        op.filter(s => s.canvas != null),
        op.tap((s) => {
          const can = s.canvas!;
          can.setAttribute('width', s.width + '');
          can.setAttribute('height', s.height + '');
          can.style.width = s.pixelWidth + 'px';
          can.style.height = s.pixelHeight + 'px';
        })
      ),
      slice.getStore().pipe(op.map(s => s.componentProps.onReady),
        op.distinctUntilChanged(),
        op.map(factory => {
          if (factory) {
            const children = factory(pCtx);
            rootPaintable.actionDispatcher.clearChildren();
            rootPaintable.actionDispatcher.addChildren(children);
            slice.actionDispatcher._componentTreeReady();
          }
        })),
      action$.pipe(ofPayloadAction(slice.actions._onDomMount),
        op.switchMap(() => rx.timer(150)),
        op.map(() => {
          slice.actionDispatcher.resize(); // let other paintable react on "resize" action first
          slice.actionDispatcher._afterResize(); // trigger re-render
        }),
        op.switchMap(() => rx.fromEvent<UIEvent>(window, 'resize')),
        op.throttleTime(300, rx.asapScheduler, {trailing: true}),
        op.map(event => {
          slice.actionDispatcher.resize();
          slice.actionDispatcher._afterResize();
        })
      )
    ).pipe(op.ignoreElements());
  };
};

function render(slice: Slice<ReactiveCanvasState, typeof reducers>) {
  return new rx.Observable(sub => {
    requestAnimationFrame(time => {
      renderImmediately(slice, time);
      sub.next();
      sub.complete();
    });
  });
}

function renderImmediately(slice: Slice<ReactiveCanvasState, typeof reducers>, time?: number) {
  const s = slice.getState();
  if (time)
    slice.actionDispatcher._calAnimEscapeTime(time);

  const ctx = s.ctx;
  if (ctx == null)
    return;
  ctx.clearRect(0,0, s.width, s.height);
  if (s.rootPaintable) {
    s.rootPaintable.actionDispatcher.renderAll({
      escapeTime: s.animEscapeTime,
      canvasCtx: ctx
    });
  }
  if (slice.getState()._animatingPaintables[0].size > 0) {
    slice.actionDispatcher.render();
  }
}

export type ReactiveCanvasSlice = Slice<ReactiveCanvasState, typeof reducers>;
