/* eslint-disable array-callback-return */
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
import {EpicFactory, Slice, ofPayloadAction, createSlice, PayloadAction, Action,
  castByActionType, Actions, SliceOptions, Reducers} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
// import {DFS} from '@wfh/plink/wfh/dist-es5/utils/graph';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import * as easeFn from '../animation/ease-functions';

export interface ReactiveCanvasState {
  ctx?: CanvasRenderingContext2D;
  componentProps: ReactiveCanvasProps;
  canvas: HTMLCanvasElement | null;
  width: number;
  height: number;
  pixelWidth: number;
  pixelHeight: number;
  rootPaintable?: PositionalPaintableSlice;
  // _lastAnimFrameTime?: number;
  // We want a separate observable store to perform well in animation frames
  animFrameTime$: rx.BehaviorSubject<number | undefined | null>;
  // animEscapeTime: number;
  _countAnimatings:  number;
  // _needRender?: boolean;
  error?: Error;
}


export type ReactiveCanvasProps = React.PropsWithChildren<{
  className?: string;
  /** default 2 */
  scaleRatio?: number;
  onReady?(paintCtx: PaintableContext): Iterable<PaintableSlice<any, any>> | void;
}>;

export type ReactiveCanvasSlice = Slice<ReactiveCanvasState, typeof reducers>;

export interface BasePaintableState {
  // pctx?: PaintableContext;
  children?: [Set<PaintableSlice>];
  parent?: PaintableSlice;
  attached: boolean;
  error?: Error;
}

export type PaintableSlice<S = undefined, R = undefined> = Slice<
  S extends undefined ? BasePaintableState : BasePaintableState & S,
  R extends undefined ? typeof basePaintableReducers : typeof basePaintableReducers & R
>;

export interface PaintableCreateOption<S = undefined, R extends Reducers<any> | undefined = undefined,
  SliceState = S extends undefined ? BasePaintableState : BasePaintableState & S
  > {
  name: string;
  extendInitialState?: S;
  extendReducers?: R;
  actionInterceptor?: ((slice: PaintableSlice<S, R>) => rx.OperatorFunction<
    PayloadAction<SliceState> | Action<SliceState>,
    PayloadAction<SliceState> | Action<SliceState>>) | null;
  debug?: boolean;
}

export type PositionalPaintableSlice<S = undefined, R = undefined> =
  PaintableSlice<S extends undefined ? PositionalState : PositionalState & S,
    R extends undefined ? typeof positionalReducers : typeof positionalReducers & R>;

export interface PositionalState {
  /** value is calculated by relativeX */
  x: number;
  /** value is calculated by relativeY */
  y: number;
  /** value is calculated by relativeWidth */
  w: number;
  /** value is calculated by relativeHeight */
  h: number;
  /** relative size of parent, if parent is not a positional paintable, size is relative to reactive canvas, value is between 0 ~ 1 */
  relativeWidth?: number;
  relativeHeight?: number;
  /** relative left position to parent width, 0 - 1 */
  relativeX?: number;
  /** relative right position to parent height, 0 - 1 */
  relativeY?: number;
}

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
  /** Bunch rendering in next frame */
  // renderLater(s: ReactiveCanvasState) {
  //   s._needRender = true;
  // },
  // renderImmediately() {},
  startAnimating(s: ReactiveCanvasState) {
    s._countAnimatings++;
  },
  stopAnimating(s: ReactiveCanvasState) {
    s._countAnimatings--;
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
  onDomMount(s: ReactiveCanvasState) {},
  _componentTreeReady(s: ReactiveCanvasState) {},
  _syncComponentProps(s: ReactiveCanvasState, payload: ReactiveCanvasProps) {
    s.componentProps = {...s.componentProps, ...payload};
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
    _countAnimatings: 0,
    animFrameTime$: new rx.BehaviorSubject<number | null | undefined>(null)
    // rendering: false,
    // animEscapeTime: 0
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
  const rootPaintableInitialState: PositionalState = {
    x: 0, y: 0, w: 400, h: 300
  };
  const rootPaintable = pCtx.createPosPaintable({
    name: 'root',
    extendInitialState: rootPaintableInitialState,
    extendReducers: positionalReducers
    , debug: true
  });
  rootPaintable.addEpic(rootPaintableSlice => {
    return action$ => {
      return rx.merge(
        slice.getStore().pipe(
          op.distinctUntilChanged((a, b) => a.width === b.width && a.height === b.height),
          op.map(s => {
            rootPaintable.actionDispatcher.changeSize([s.width, s.height]);
          })
        )
      ).pipe(op.ignoreElements());
    };
  });

  rootPaintable.actionDispatcher._setAsRoot();
  slice.dispatch({type: 'set rootPaintable', reducer(s: ReactiveCanvasState) {
    s.rootPaintable = rootPaintable;
  }});

  function animationFrames() {
    requestAnimationFrame(time => {
      slice.getState().animFrameTime$.next(time);
      if (pCtx.needRender) {
        renderImmediately();
        slice.dispatch({type: 'render done', reducer(s: ReactiveCanvasState) {
          pCtx.needRender = false;
        }});
      }
      if (slice.getState()._countAnimatings > 0) {
        animationFrames();
      }
    });
  }

  function renderImmediately() {
    const s = slice.getState();
    const ctx = s.ctx!;
    ctx.clearRect(0, 0, s.width, s.height);
    if (s.rootPaintable) {
      s.rootPaintable.actionDispatcher.renderAll(ctx);
    }
  }

  return (action$, state$) => {
    return rx.merge(
      rx.combineLatest(
        action$.pipe(ofPayloadAction(slice.actions._afterResize)),
        action$.pipe(ofPayloadAction(slice.actions._componentTreeReady))
      ).pipe(
        op.map(() => {
          renderImmediately();
        })
      ),
      state$.pipe(op.map(s => s._countAnimatings),
        op.distinctUntilChanged(),
        op.scan((old, val) => {
          if (val === 1 && old === 0) {
            // slice.actionDispatcher.render();
            animationFrames();
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
            if (children)
              rootPaintable.actionDispatcher.addChildren(children);
            slice.actionDispatcher._componentTreeReady();
          }
        })),
      action$.pipe(ofPayloadAction(slice.actions.onDomMount),
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

/**
 * PaintableContext is a tailored version of reactiveCanvasSlice for a child Paintable component
 */
export class PaintableContext {
  action$: Slice<ReactiveCanvasState, typeof reducers>['action$'];
  actions: Slice<ReactiveCanvasState, typeof reducers>['actions'];
  actionByType: {[K in keyof typeof reducers]:
    rx.Observable<ReturnType<Actions<ReactiveCanvasState, typeof reducers>[K]>>};
  needRender = false;

  constructor(private canvasSlice: Slice<ReactiveCanvasState, typeof reducers>) {
    this.action$ = canvasSlice.action$;
    this.actions = canvasSlice.actions;
    this.actionByType = castByActionType(canvasSlice.actions, canvasSlice.action$);
  }

  /** reqest to render canvas later in animation frame, the actual rendering will be batched */
  renderCanvas() {
    // this.canvasSlice.actionDispatcher.renderLater();
    if (this.getState()._countAnimatings === 0) {
      throw new Error('renderCanvas() must be called after createAnimation() is subscribed and before its completion');
    }
    this.needRender = true;
  }

  createPaintableSlice<S = undefined, R extends Reducers<S> | undefined = undefined>({name, extendInitialState, extendReducers, actionInterceptor, debug}:
    PaintableCreateOption<S, R>): PaintableSlice<S, R> {

    const initState: BasePaintableState = {
      // pctx: this,
      attached: false
    };

    const slice = createSliceWith({
      name, initialState: initState, reducers: basePaintableReducers, extendInitialState, extendReducers});

    slice.addEpic(slice => {
      return action$ => {
        const dispatcher = slice.actionDispatcher;
        const actionsByType = castByActionType(slice.actions, action$);
        return rx.merge(
          actionsByType.renderAll.pipe(
            op.map(({payload}) => {
              payload.save();
              dispatcher.render(payload);
              if (slice.getState().children)
                dispatcher._renderChildren(payload);
              dispatcher.afterRender(payload);
              payload.restore();
            })
          ),

          actionsByType._renderChildren.pipe(
            op.map(({payload}) => {
              for (const chr of slice.getState().children![0].values()) {
                chr.actionDispatcher.renderAll(payload);
              }
          })),
          actionsByType.setAnimating.pipe(
            op.switchMap(({payload: animating}) => {
              if (animating) {
                return slice.getStore().pipe(op.map(s => s.attached),
                  op.distinctUntilChanged(), op.filter(attached => attached), op.take(1),
                  op.map(() => {
                    this.canvasSlice.actionDispatcher.startAnimating();
                  })
                );
              } else {
                this.canvasSlice.actionDispatcher.stopAnimating();
                return rx.EMPTY;
              }
            })
          ),
          actionsByType.addChildren.pipe(
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
          actionsByType.removeChildren.pipe(
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
          actionsByType.clearChildren.pipe(
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

    if (actionInterceptor) {
      const interceptor = actionInterceptor(slice as unknown as PaintableSlice<S, R>);
      (slice).setActionInterceptor(interceptor);
    }

    this.canvasSlice.destroy$.subscribe({next() {
      slice.destroy();
    }});
    return slice as unknown as PaintableSlice<S, R>;
  }

  createPosPaintable<S = undefined, R extends Reducers<S> | undefined = undefined>(
    opt: PaintableCreateOption<S, R>): PositionalPaintableSlice<S, R> {
    const initialPosState: PositionalState = {
      x: 0, y: 0, w: 400, h: 300,
      relativeHeight: 1,
      relativeWidth: 1
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    opt.extendInitialState = opt.extendInitialState ?
      Object.assign(initialPosState, opt.extendInitialState) : initialPosState as any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    opt.extendReducers = opt.extendReducers ?
      Object.assign(positionalReducers, opt.extendReducers) :
      positionalReducers as any;

    const positionalPaintable = this.createPaintableSlice(opt as PaintableCreateOption<PositionalState, typeof positionalReducers>);
    positionalPaintable.addEpic(positionalEpicFactory);

    return positionalPaintable as unknown as PositionalPaintableSlice<S, R>;
  }

  createAnimation(startValue: number, endValue: number, durationMSec: number,
    timingFuntion: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear' = 'ease')
    : rx.Observable<number> {
    return rx.defer(() => {
      this.canvasSlice.actionDispatcher.startAnimating();
      return easeFn.animate(startValue, endValue, durationMSec, timingFuntion,
        this.getState().animFrameTime$
          .pipe(
            op.filter(time => time != null)
          ) as rx.Observable<number>
      );
    }).pipe(
      op.finalize(() => {
        this.canvasSlice.actionDispatcher.stopAnimating();
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

function createSliceWith<BS, BR extends Reducers<any>, ES, ER extends Reducers<any>>(
  sliceOpt: SliceOptions<BS, BR> & {extendInitialState?: ES; extendReducers?: ER}) {

  const initState = sliceOpt.extendInitialState ? {...sliceOpt.initialState, ...sliceOpt.extendInitialState} : {...sliceOpt.initialState};
  const reducers = sliceOpt.extendReducers ? {...sliceOpt.reducers, ...sliceOpt.extendReducers} : sliceOpt.reducers;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const slice = createSlice<ES extends undefined ? BS : BS & ES, ER extends undefined ? BR : BR & ER>({
    ...(sliceOpt as any),
    initialState: initState,
    reducers
  });

  return slice;
}

export const basePaintableReducers = {
  // init(s: BasePaintableState, pctx: PaintableContext) {
  //   s.pctx = pctx;
  // },
  addChildren(s: BasePaintableState, children: Iterable<PaintableSlice<any, any>>) {},
  removeChildren(s: BasePaintableState, children: Iterable<PaintableSlice<any, any>>) {
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
  /** render self and children */
  renderAll(s: BasePaintableState, _canvasCtx: CanvasRenderingContext2D) {},
  /** render self only, not chidren */
  render(s: BasePaintableState, _canvasCtx: CanvasRenderingContext2D) {},
  _renderChildren(s: BasePaintableState, _canvasCtx: CanvasRenderingContext2D) {},
  afterRender(s: BasePaintableState, _canvasCtx: CanvasRenderingContext2D) {},
  _setAsRoot(s: BasePaintableState) {
    s.attached = true;
  }
  // destroy(s: BasePaintableState) {}
};

export const positionalReducers = {
  changePosition(s: PositionalState, pos: [number, number]) {
    s.x = pos[0];
    s.y = pos[1];
  },
  changeSize(s: PositionalState, size: [number, number]) {
    s.w = size[0];
    s.h = size[1];
  },
  changeRelativeWidth(s: PositionalState, size: number) {
    s.relativeWidth = size;
  },
  changeRelativeHeight(s: PositionalState, size: number) {
    s.relativeHeight = size;
  },
  changeRelativeX(s: PositionalState, value: number) {
    s.relativeX = value;
  },
  changeRelativeY(s: PositionalState, value: number) {
    s.relativeY = value;
  }
};

export const positionalEpicFactory: EpicFactory<
  PositionalState & BasePaintableState,
  typeof positionalReducers & typeof basePaintableReducers
> = slice => {
  return action$ => {
    return rx.merge(
      rx.combineLatest(
        slice.getStore().pipe(
          op.map(state => state.parent), op.distinctUntilChanged(),
          op.switchMap(parent => parent != null ? parent.getStore() : rx.EMPTY),
          op.map(pState => (pState as unknown as Partial<PositionalState>)),
          op.distinctUntilChanged((a, b) => a.w === b.w && a.h === b.h)
        ),
        slice.getStore().pipe(
          op.distinctUntilChanged((a, b) => a.relativeHeight === b.relativeHeight && a.relativeWidth === b.relativeWidth &&
            a.relativeX === b.relativeX && a.relativeY === b.relativeY)
        )
      ).pipe(
        op.map(([p, child]) => {
          slice.dispatch({
            type: 'sync child position',
            reducer(d: PositionalState & BasePaintableState) {
              if (child.relativeX != null && p.w != null) {
                d.x = p.w * child.relativeX;
              }
              if (child.relativeY != null && p.h != null) {
                d.y = p.h * child.relativeY;
              }
              if (child.relativeWidth != null && p.w != null) {
                d.w = p.w * child.relativeWidth;
              }
              if (child.relativeHeight != null && p.h != null) {
                d.h = p.h * child.relativeHeight;
              }
            }
          });
        })
      )
    ).pipe(op.ignoreElements());
  };
};

