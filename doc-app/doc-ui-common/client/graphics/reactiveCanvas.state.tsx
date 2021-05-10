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
import {EpicFactory, Slice, ofPayloadAction} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import {DFS} from '@wfh/plink/wfh/dist-es5/utils/graph';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';

export type ReactiveCanvasProps = React.PropsWithChildren<{
  className?: string;
  /** default 2 */
  scaleRatio?: number;
  // epicFactory?: EpicFactory<ReactiveCanvasState, typeof reducers>;
  sliceRef?(slice: ReactiveCanvasSlice): void;
}>;
export interface ReactiveCanvasState {
  componentProps: ReactiveCanvasProps;
  canvas: HTMLCanvasElement | null;
  width: number;
  height: number;
  pixelWidth: number;
  pixelHeight: number;
  rootId: string;
  /** Since it is too expensive to creat a mutable version of Set, so use an Array to wrap it */
  animatingPaintables: [Set<string>];
  /** key is id, mutable!! */
  components: [Map<string, PaintableWithRelations>];
  renderStarted: boolean;
  error?: Error;
}

export interface PaintableFactory {
  // tslint:disable-next-line: callable-types
  (ctx: ReactiveCanvasCtx): Paintable;
}

export class ReactiveCanvasCtx {
  constructor(public id: string, private canvasSlice: Slice<ReactiveCanvasState, typeof reducers>,
    public getState: Slice<ReactiveCanvasState, typeof reducers>['getState'],
    public getStore: Slice<ReactiveCanvasState, typeof reducers>['getStore']) {}

  addChild(...children: Paintable[]) {
    this.canvasSlice.actionDispatcher.addPaintable([this.id, children]);
  }

  removeChild(...childIds: string[]) {
    this.canvasSlice.actionDispatcher.removePaintable(childIds);
  }
}

export interface Paintable {
  init(ctx: ReactiveCanvasCtx): void;
  render(canvasCtx: CanvasRenderingContext2D): void;
  destroy(): void;
}

interface PaintableWithRelations {
  /** parent id */
  p?: string;
  id: string;
  children?: [Set<string>];
  paintable: Paintable;
}

const reducers = {
  create(s: ReactiveCanvasState, payload: HTMLCanvasElement | null) {
    if (payload) {
      s.canvas = payload;
    }
  },
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
  render() {},
  addPaintable(s: ReactiveCanvasState, payload: [parentId: string, children: Iterable<Paintable>]) {},
  _addPaintableDone(s: ReactiveCanvasState, [parentId, children]: [parentId: string, children: Iterable<[id: string, paintable: Paintable]>]) {
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
  removePaintable(s: ReactiveCanvasState, ids: string[]) {
    for (const id of ids) {
      const pw = s.components[0].get(id);
      if (pw == null)
        continue;
      s.components[0].delete(id);
      if (pw.p) {
        const parentPw = s.components[0].get(pw.p)!;
        parentPw.children![0].delete(id);
        parentPw.children = [...parentPw.children!];
      }
    }
  },
  _removePaintable(s: ReactiveCanvasState, targets: PaintableWithRelations[]) {
    for (const {id, p} of targets) {
      s.components[0].delete(id);
      if (p != null) {
        const parent = s.components[0].get(p)!;
        const children = parent.children;
        if (children) {
          children[0].delete(id);
          parent.children = [...children];
        }
      }
    }
    s.components = [...s.components];
  },
  _syncComponentProps(s: ReactiveCanvasState, payload: ReactiveCanvasProps) {
    s.componentProps = {...s.componentProps, ...payload};
  }
  // define more reducers...
};

let idSeed = 0;

export function sliceOptionFactory() {
  const rootId = '' + idSeed++;
  const rootPaintable: Paintable = {
    init(api) {},
    render(ctx) {},
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
    animatingPaintables: [new Set()],
    renderStarted: false
  };
  return {
    name: 'ReactiveCanvas',
    initialState,
    reducers,
    debug: process.env.NODE_ENV !== 'production'
  };
}

export const epicFactory: EpicFactory<ReactiveCanvasState, typeof reducers> = function(slice) {
  return (action$) => {
    return rx.merge(
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
      slice.getStore().pipe(op.map(s => s.componentProps.sliceRef),
        op.distinctUntilChanged(),
        op.map(sliceRef => {
          if (sliceRef) {
            sliceRef(slice);
          }
        })),
      action$.pipe(ofPayloadAction(slice.actions.addPaintable),
        op.tap(({payload: [parentId, children]}) => {
          const toBeAdded: [id: string, instance: Paintable][] = [];
          for (const child of children) {
            const id = '' + idSeed++;
            child.init(new ReactiveCanvasCtx(id, slice, slice.getState, slice.getStore));
            toBeAdded.push([id, child]);
          }

          slice.actionDispatcher._addPaintableDone([parentId, toBeAdded]);
        })
      ),
      action$.pipe(ofPayloadAction(slice.actions.removePaintable),
        op.tap(({payload: ids}) => {
          const s = slice.getState();
          const topSorted: PaintableWithRelations[] = [];
          const bfs = new DFS<string>(parentId => {
            const parent = s.components[0].get(parentId);
            return parent?.children ? parent.children[0] : [];
          }, (v => {
            topSorted.push(s.components[0].get(v.data)!);
          }));
          bfs.visit(ids);

          const comps = slice.getState().components[0];
          for (const {id} of topSorted) {
            const instance = comps.get(id);
            if (instance) {
              instance.paintable.destroy();
            }
          }
          slice.actionDispatcher._removePaintable(topSorted);
        })
      ),
      action$.pipe(ofPayloadAction(slice.actions.render),
        op.tap(() => {
          const s = slice.getState();
          if (s.canvas == null)
            return;
          const ctx = s.canvas.getContext('2d')!;
          const bfs = new DFS<string>(parentId => {
            console.log('render ', parentId);
            ctx.save();
            const pw = s.components[0].get(parentId)!;
            pw.paintable.render(ctx);
            // ctx.restore();
            return pw.children ? pw.children[0] : [];
          }, (v => {
            ctx.restore();
          }));
          bfs.visit(s.rootId);
        }))
    ).pipe(op.ignoreElements());
  };
};

export type ReactiveCanvasSlice = Slice<ReactiveCanvasState, typeof reducers>;
