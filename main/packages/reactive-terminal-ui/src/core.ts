import {Slice, createSlice, castByActionType, EpicFactory} from '@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit-hook';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import {canvasSlice} from './canvas';

type Canvas = typeof canvasSlice;
export type PaintableSlice<S = undefined, R = undefined> = Slice<
  S extends undefined ? BasePaintableState : BasePaintableState & S,
  R extends undefined ? typeof basePaintableReducers : typeof basePaintableReducers & R
>;

export type BasePaintableState = {
  // pctx?: PaintableContext;
  children?: [Set<PaintableSlice<any, any>>];
  parent?: PaintableSlice;
  attached: boolean;
  error?: Error;
};

export const basePaintableReducers = {
  addChildren(_s: BasePaintableState, _children: Iterable<PaintableSlice<any, any>>) {},
  removeChildren(s: BasePaintableState, children: Iterable<PaintableSlice<any, any>>) {
    for (const chr of children) {
      s.children![0].delete(chr);
    }
    s.children = [s.children![0]];
  },
  clearChildren(_s: BasePaintableState) {},
  setAnimating(_s: BasePaintableState, _yes: boolean) {},
  _setAttached(s: BasePaintableState, attached: boolean) {
    s.attached = attached;
  },
  _setParent(s: BasePaintableState, parent: PaintableSlice<any, any> | undefined) {
    s.parent = parent;
  },
  /** render self and children */
  renderAll(_s: BasePaintableState, _canvasCtx: Canvas) {},
  /** render self only, not chidren */
  render(_s: BasePaintableState, _canvasCtx: Canvas) {},
  _renderChildren(_s: BasePaintableState, _canvasCtx: Canvas) {},
  afterRender(_s: BasePaintableState, _canvasCtx: Canvas) {},
  _setAsRoot(s: BasePaintableState) {
    s.attached = true;
  }
};

const basePaintableEpic: EpicFactory<BasePaintableState, typeof basePaintableReducers> = slice => {
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
      // actionsByType.setAnimating.pipe(
        // op.switchMap(({payload: animating}) => {
          // if (animating) {
            // return slice.getStore().pipe(op.map(s => s.attached),
              // op.distinctUntilChanged(), op.filter(attached => attached), op.take(1),
              // op.map(() => {
                // this.canvasSlice.actionDispatcher.startAnimating();
              // })
            // );
          // } else {
            // this.canvasSlice.actionDispatcher.stopAnimating();
            // return rx.EMPTY;
          // }
        // })
      // ),
      actionsByType.addChildren.pipe(
        op.map(({payload: children}) => {
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
            reducer(_s: BasePaintableState) {
              for (const chr of children) {
                chr.actionDispatcher._setParent(undefined);
              }
            }
          });
        })
      ),
      actionsByType.clearChildren.pipe(
        op.map(_action => {
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
};

export type PositionalState = {
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
} & BasePaintableState;

export const positionalReducers = {
  changePosition(s: PositionalState, x: number, y: number) {
    s.x = x;
    s.y = y;
  },
  changeSize(s: PositionalState, width: number, height: number) {
    s.w = width;
    s.h = height;
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
  },
  _syncPosition(d: PositionalState, p: PositionalState) {
    if (d.relativeX != null && p.w != null) {
      d.x = p.w * d.relativeX;
    }
    if (d.relativeY != null && p.h != null) {
      d.y = p.h * d.relativeY;
    }
    if (d.relativeWidth != null && p.w != null) {
      d.w = p.w * d.relativeWidth;
    }
    if (d.relativeHeight != null && p.h != null) {
      d.h = p.h * d.relativeHeight;
    }
  }
};

const initState: BasePaintableState & PositionalState = {
  attached: false,
  x: 0, y: 0, w: 400, h: 300,
  relativeHeight: 1,
  relativeWidth: 1
};

export function createRoot(_x: number, _y: number, _width: number, _height: number) {
  const rootSlice = createSlice<typeof initState, typeof basePaintableReducers & typeof positionalReducers>({
    name: 'root',
    initialState: { ...initState },
    reducers: {...basePaintableReducers, ...positionalReducers}
  });

  rootSlice.addEpic(slice => _action$ => {
    return rx.merge(
      canvasSlice.action$ByType.resize.pipe(
        op.map(({payload: [w, h]}) => {
          slice.actionDispatcher.changeSize(w, h);
        })
      )
    ).pipe(
      op.catchError((err, src) => {
        // eslint-disable-next-line no-console
        console.log(err);
        return src;
      }),
      op.ignoreElements()
    );
  });

  rootSlice.addEpic(basePaintableEpic as any);
  rootSlice.addEpic(positionalEpicFactory);

  return rootSlice;
}

export const positionalEpicFactory: EpicFactory<
  PositionalState & BasePaintableState,
  typeof positionalReducers & typeof basePaintableReducers
> = slice => {
  return _action$ => {
    // const actionsByType = castByActionType(slice.actions, action$);

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
        op.map(([p]) => {
          if (p.x != null && p.y != null)
            slice.actionDispatcher._syncPosition(p as PositionalState);
        })
      )
    ).pipe(op.ignoreElements());
  };
};
// export function createSliceWith<BS, BR extends Reducers<any>, ES, ER extends Reducers<any>>(
  // sliceOpt: SliceOptions<BS, BR> & {extendInitialState?: ES; extendReducers?: ER}) {

  // const initState = sliceOpt.extendInitialState ? {...sliceOpt.initialState, ...sliceOpt.extendInitialState} : {...sliceOpt.initialState};
  // const reducers = sliceOpt.extendReducers ? {...sliceOpt.reducers, ...sliceOpt.extendReducers} : sliceOpt.reducers;
  // // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  // const slice = createSlice<ES extends undefined ? BS : BS & ES, ER extends undefined ? BR : BR & ER>({
    // ...(sliceOpt as any),
    // initialState: initState,
    // reducers
  // });

  // return slice;
// }
