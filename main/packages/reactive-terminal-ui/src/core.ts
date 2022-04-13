import {Slice, createSlice} from '@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit-hook';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import {canvasSlice} from './canvas';

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
  renderAll(_s: BasePaintableState, _canvasCtx: CanvasRenderingContext2D) {},
  /** render self only, not chidren */
  render(_s: BasePaintableState, _canvasCtx: CanvasRenderingContext2D) {},
  _renderChildren(_s: BasePaintableState, _canvasCtx: CanvasRenderingContext2D) {},
  afterRender(_s: BasePaintableState, _canvasCtx: CanvasRenderingContext2D) {},
  _setAsRoot(s: BasePaintableState) {
    s.attached = true;
  }
};

export type PositionalState = {
  x: number;
  y: number;
  w: number;
  h: number;
  /** relative size of parent, if parent is not a positional paintable, size is relative to reactive canvas, value is between 0 ~ 1 */
  relativeWidth?: number;
  relativeHeight?: number;
  /** relative left position to parent width */
  relativeX?: number;
  /** relative right position to parent height */
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
    initialState: {
      ...initState
    },
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

  return rootSlice;
}

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
