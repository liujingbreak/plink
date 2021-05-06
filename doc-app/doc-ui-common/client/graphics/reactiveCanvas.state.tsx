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
  epicFactory?: EpicFactory<ReactiveCanvasState, typeof reducers>;
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
  components: [Map<string, Paintable>];
  /** mutable!! key is parent id, value is array of children ids */
  childrenMap: [Map<string, Set<string>>];
  /** mutable!! key is children id, value is parent id */
  parentsMap: [Map<string, string>];
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
  render(canvasCtx: CanvasRenderingContext2D): void;
  destroy(): void;
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
      s.width = vw * ratio;
      s.height = vh * ratio;
    }
  },
  render() {},
  addPaintable(s: ReactiveCanvasState, payload: [parentId: string, children: Iterable<Paintable>]) {},
  _addPaintableDone(s: ReactiveCanvasState, [parentId, children]: [parentId: string, children: Iterable<[id: string, paintable: Paintable]>]) {
    let existingChildren = s.childrenMap[0].get(parentId);
    if (existingChildren == null) {
      existingChildren = new Set();
      s.childrenMap[0].set(parentId, existingChildren);
    }
    for (const [id, instance] of children) {
      s.components[0].set(id, instance);
      existingChildren.add(id);
      s.parentsMap[0].set(id, parentId);
    }
    s.childrenMap = [...s.childrenMap];
    s.components = [...s.components];
    s.parentsMap = [...s.parentsMap];
  },
  removePaintable(s: ReactiveCanvasState, childrenIds: string[]) {
    for (const id of childrenIds) {
      const pid = s.parentsMap[0].get(id);
      if (pid == null)
        continue;
      s.parentsMap[0].delete(id);
      s.parentsMap = [s.parentsMap[0]];
      const childrenIdSet = s.childrenMap[0].get(pid)!;
      childrenIdSet.delete(id);
      if (childrenIdSet.size === 0) {
        s.childrenMap[0].delete(pid);
        s.childrenMap = [s.childrenMap[0]];
      }
    }
  },
  _removePaintable(s: ReactiveCanvasState, childrenIds: string[]) {
    for (const id of childrenIds) {
      s.components[0].delete(id);
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
    render(ctx) {},
    destroy() {}
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
    components: [new Map([ [rootId, rootPaintable] ])],
    animatingPaintables: [new Set()],
    childrenMap: [new Map()],
    parentsMap: [new Map()],
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
        op.tap(({payload: childrenIds}) => {
          const comps = slice.getState().components;
          for (const id of childrenIds) {
            const instance = comps[0].get(id);
            if (instance) {
              instance.destroy();
            }
          }
          slice.actionDispatcher._removePaintable(childrenIds);
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
            s.components[0].get(parentId)?.render(ctx);
            // ctx.restore();
            return s.childrenMap[0].get(parentId)!;
          }, (v => {
            ctx.restore();
          }));
          bfs.visit(s.rootId);
        }))
    ).pipe(op.ignoreElements());
  };
};
