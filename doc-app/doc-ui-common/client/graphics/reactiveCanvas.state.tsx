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
import {EpicFactory, Slice, ofPayloadAction, createSlice} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import {DFS} from '@wfh/plink/wfh/dist-es5/utils/graph';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';

export type ReactiveCanvasProps = React.PropsWithChildren<{
  className?: string;
  /** default 2 */
  scaleRatio?: number;
  onReady?(ctx: PaintableContext): void;
}>;
export interface ReactiveCanvasState {
  ctx?: CanvasRenderingContext2D;
  componentProps: ReactiveCanvasProps;
  canvas: HTMLCanvasElement | null;
  width: number;
  height: number;
  pixelWidth: number;
  pixelHeight: number;
  rootId: number;
  /** number of animating paintables */
  // animatings: number;
  _lastAnimFrameTime?: number;
  animEscapeTime: number;
  /** Since it is too expensive to creat a mutable version of Set, so use an Array to wrap it
   * key is id, mutable!! */
  components: [Map<number, PaintableWithRelations>];
  _animatingPaintables: [Set<number>];
  /** This DFS object is for rendering paintable tree */
  _dfs?: DFS<number>;
  // rendering: boolean;
  // needRenderNextFrame: boolean;
  error?: Error;
}

export interface PaintableFactory {
  // tslint:disable-next-line: callable-types
  (ctx: PaintableContext): Paintable;
}

/**
 * PaintableContext is a tailored version of reactiveCanvasSlice for a child Paintable component
 */
export class PaintableContext {
  action$: Slice<ReactiveCanvasState, typeof reducers>['action$'];
  actions: Slice<ReactiveCanvasState, typeof reducers>['actions'];

  constructor(public id: number, private canvasSlice: Slice<ReactiveCanvasState, typeof reducers>) {
    this.action$ = canvasSlice.action$;
    this.actions = canvasSlice.actions;
  }

  addChild(...children: Paintable[]) {
    this.canvasSlice.actionDispatcher.addPaintable([this.id, children]);
  }

  removeChild(...childIds: number[]) {
    this.canvasSlice.actionDispatcher.removePaintable(childIds);
  }

  setAnimating(yes: boolean) {
    this.canvasSlice.actionDispatcher.setAnimating([this.id, yes]);
  }
  renderCanvas() {
    this.canvasSlice.actionDispatcher.render();
  }
  /** So that children will be rendered to a different canvas */
  changeCanvasContext(ctx: CanvasRenderingContext2D) {
    this.canvasSlice.actionDispatcher.changeContext(ctx);
  }

  getState() {
    return this.canvasSlice.getState();
  }
  getStore() {
    return this.canvasSlice.getStore();
  }
}

/**
 * You should not implement this interface directly, instead, you call createPaintableSlice()
 * and get `.actionDispatcher` of returned slice 
 */
export interface Paintable {
  init(pctx: PaintableContext): void;
  render(canvasCtx: CanvasRenderingContext2D): void;
  /** children is rendered */
  afterRender(canvasCtx: CanvasRenderingContext2D): void;
  destroy(): void;
}
export interface BasePaintableState {
  pctx?: PaintableContext;
  error?: Error;
}
export const basePaintableReducers = {
  init(s: BasePaintableState, pctx: PaintableContext) {
    s.pctx = pctx;
  },
  render(s: BasePaintableState, canvasCtx: CanvasRenderingContext2D) {},
  afterRender(s: BasePaintableState, canvasCtx: CanvasRenderingContext2D) {},
  destroy(s: BasePaintableState) {}
};

export type PaintableSlice<S = {}, R = {}> = Slice<BasePaintableState & S, typeof basePaintableReducers & R>;

export function createPaintableSlice<S = {}, R = {}>(name: string,
  extendInitialState: S = {} as S,
  extendReducers: R = {} as R,
  debug?: boolean): PaintableSlice<S, R> {
  const slice = createSlice<BasePaintableState & S, typeof basePaintableReducers & R>({
    name,
    initialState: Object.assign({}, extendInitialState),
    reducers: Object.assign(basePaintableReducers, extendReducers),
    debug
  });
  return slice;
}

interface PaintableWithRelations {
  /** parent id */
  p?: number;
  id: number;
  children?: [Set<number>];
  paintable: Paintable;
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
  render(s: ReactiveCanvasState) {
  },
  addPaintable(s: ReactiveCanvasState, [parentId, children]: [parentId: number, children: Iterable<Paintable>]) {
  },
  setAnimating(s: ReactiveCanvasState, [id, yes]: [paintableId: number, animating: boolean]) {
    // s.animatings = isIncrement ? s.animatings + 1 : s.animatings - 1;
    if (yes) {
      if (!s._animatingPaintables[0].has(id)) {
        s._animatingPaintables[0].add(id);
        s._animatingPaintables = [s._animatingPaintables[0]]; // for dirty detection
      }
    } else {
      if (s._animatingPaintables[0].has(id)) {
        s._animatingPaintables[0].delete(id);
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
  _addPaintableDone(s: ReactiveCanvasState, [parentId, children]: [parentId: number, children: Iterable<[id: number, instance: Paintable]>]) {
    const pw = s.components[0].get(parentId)!;
    let existingChildren = pw.children;
    if (existingChildren == null) {
      existingChildren = [new Set()];
      pw.children = existingChildren;
    }
    for (const [id, instance] of children) {
      s.components[0].set(id, {id, p: parentId, paintable: instance});
      existingChildren[0].add(id);
    }
    s.components = [...s.components];
  },
  removePaintable(s: ReactiveCanvasState, ids: number[]) {
    for (const id of ids) {
      const pw = s.components[0].get(id);
      if (pw == null)
        continue;
      s.components[0].delete(id);
      if (pw.p) {
        const parentPw = s.components[0].get(pw.p)!;
        parentPw.children![0].delete(id);
        parentPw.children = [parentPw.children![0]];
      }
    }
  },
  _removePaintable(s: ReactiveCanvasState, targets: PaintableWithRelations[]) {
    for (const {id, p} of targets) {
      s.components[0].delete(id);
      s._animatingPaintables[0].delete(id);
      if (p != null) {
        const parent = s.components[0].get(p)!;
        const children = parent.children;
        if (children) {
          children[0].delete(id);
          parent.children = [...children];
        }
      }
    }
    s._animatingPaintables = [s._animatingPaintables[0]];
    s.components = [s.components[0]];
  },
  _syncComponentProps(s: ReactiveCanvasState, payload: ReactiveCanvasProps) {
    s.componentProps = {...s.componentProps, ...payload};
  },
  _calAnimEscapeTime(s: ReactiveCanvasState, time: number) {
    if (s._lastAnimFrameTime)
      s.animEscapeTime = time - s._lastAnimFrameTime;
    s._lastAnimFrameTime = time;
  }
  // define more reducers...
};

let idSeed = 0;

export function sliceOptionFactory() {
  const rootId = idSeed++;
  const rootPaintable: Paintable = {
    init(api) {},
    render(ctx) {},
    afterRender() {},
    destroy() {}
  };
  const rootPaintableData: PaintableWithRelations = {
    id: rootId,
    children: [new Set()],
    paintable: rootPaintable
  };
  const initialState: ReactiveCanvasState = {
    componentProps: {
      scaleRatio: 2
    },
    canvas: null,
    width: 0,
    height: 0,
    pixelHeight: 0,
    pixelWidth: 0,
    rootId,
    components: [new Map([ [rootId, rootPaintableData] ])],
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
  const rootPaintableCtx = new PaintableContext(slice.getState().rootId, slice);

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
            factory(rootPaintableCtx);
            slice.actionDispatcher._componentTreeReady();
          }
        })),
      action$.pipe(ofPayloadAction(slice.actions.addPaintable),
        op.observeOn(rx.queueScheduler), // queue up paintables, to make sure parent is added to components earlier than children
        op.map(({payload: [pid, children]}) => {
          const childrenWithId: [id: number, child: Paintable][] = Array.from(children).map(paintable => [idSeed++, paintable]);
          slice.actionDispatcher._addPaintableDone([pid, childrenWithId]);
          for (const [id, paintable] of childrenWithId) {
            paintable.init(new PaintableContext(id, slice));
          }
        })
      ),
      action$.pipe(ofPayloadAction(slice.actions.removePaintable),
        op.tap(({payload: ids}) => {
          const s = slice.getState();
          const topSorted: PaintableWithRelations[] = [];
          const bfs = new DFS<number>(parentId => {
            const parent = s.components[0].get(parentId);
            return parent?.children ? parent.children[0] : [];
          }, (v => {
            topSorted.push(s.components[0].get(v.data)!);
          }));
          bfs.visit(ids);

          const comps = s.components[0];
          for (const {id} of topSorted) {
            const instance = comps.get(id);
            if (instance) {
              instance.paintable.destroy();
            }
          }
          slice.actionDispatcher._removePaintable(topSorted);
        })
      ),
      action$.pipe(ofPayloadAction(slice.actions._onDomMount),
        op.switchMap(() => rx.timer(50)),
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

  const dfs = new DFS<number>(parentId => {
    const ctx = slice.getState().ctx!; // get latest context, paintables may change it during rendering
    ctx.save();
    const pw = s.components[0].get(parentId)!;
    pw.paintable.render(ctx);
    ctx.restore();
    return pw.children ? pw.children[0] : [];
  }, (v => {
    const ctx = slice.getState().ctx!;
    const pw = s.components[0].get(v.data)!;
    pw.paintable.afterRender(ctx);
    ctx.restore();
  }));
  dfs.visit([s.rootId]);
  if (slice.getState()._animatingPaintables[0].size > 0) {
    slice.actionDispatcher.render();
  }
}

export type ReactiveCanvasSlice = Slice<ReactiveCanvasState, typeof reducers>;
