import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {Matrix, identity, compose} from 'transformation-matrix';
import {createActionStreamByType, ActionStreamControl} from '@wfh/redux-toolkit-observable/es/rx-utils';
import {Segment} from '../canvas-utils';
import type {ReactiveCanvas2Engine} from './reactiveCanvas2.worker';

let SEQ = 0;

export type Paintable<E = unknown> = readonly [
  ActionStreamControl<PaintableActions & E>,
  PaintableState,
  {
    attached$: () => rx.Observable<readonly [Required<PaintableState>, ...Paintable]>;
  }
];

export type PaintableState = {
  id: string;
  x: number;
  y: number;
  /** absolute size, value is calculated by relativeWidth */
  width: number;
  /** absolute size, value is calculated by relativeHeight */
  height: number;
  /** relative size of parent, if parent is not a positional paintable, size is relative to reactive canvas, value is between 0 ~ 1 */
  relativeWidth?: number;
  /** relative size of parent, if parent is not a positional paintable, size is relative to reactive canvas, value is between 0 ~ 1 */
  relativeHeight?: number;
  transPipeline: string[];
  transPipelineByName: Map<string, (up: rx.Observable<Matrix>) => rx.Observable<Matrix>>;
  /** used to actual render and calculate interactions detection */
  transform: Matrix;
  detached: boolean;
  treeDetached: boolean;
  parent?: Paintable;
  canvasEngine?: ReactiveCanvas2Engine;
};

export type PaintableActions = {
  setProp(override: Partial<Pick<PaintableState, 'width' | 'height' | 'relativeHeight' | 'relativeWidth'>>): void;
  /** attach to a parent paintable object */
  attachTo(p: Paintable): void;
  onResize(w: number, h: number): void;
  /**
   * `putTransformOperator` helps to customize how `matrix` is finally calculated.
   * Be aware of the order of first time of emitting this action matters, it decides how pipeline is composed.
   *
   * The action can be emitted multiple time with same `name` without being duplicate,
   * the order of pipline opertors are not changed.
   *
   * @param name a short name being added to `transPipeline`, which indicates the order of pipe operators
   * in final transformation matrix calculaton pipeline
   */
  putTransformOperator(
    name: string,
    op: (up: rx.Observable<Matrix>) => rx.Observable<Matrix>
  ): void;

  renderContent(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    state: Required<PaintableState>
  ): void;

  // `epic` is a concept borrowed from [redux-observable](https://redux-observable.js.org/docs/basics/Epics.html)
  addEpic<E>(epic: (...params: Paintable<E>) => rx.Observable<any>): void;
  /**
   * Indicate whether `transform` should be calculate by transform operators once `render` is emitted.
   * @param isDirty `true` there is any side effect so that `transform` should be to be re-calculated,
   *  set to `false` once transform operators are executed and `transform` is updated.
   */
  setTransformDirty(isDirty: boolean): void;
  /**
   * When this event is dispatched, its time we do any kind of cache invalidation and
   * transformation job for painting objects, to get ready for actually painting "transformed" things
   * in `renderContent` phase
   *
   * This event is dispatched right before `renderContent`
   */
  transformChanged(m: Matrix): void;
  /**
   * Begin actual content and child paintables rendering, at this moment,
   * transform matrix is composed.
   */
  // renderContent<E extends PaintableActions = PaintableActions>(
  //   ctx: CanvasRenderingContext2D,
  //   state: Required<PaintableState>,
  //   ctl: ActionStreamControl<E>
  // ): void;
  afterRender(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void;
  detach(): void;
  updateDetectables(objectsByKey: Iterable<[key: string, segments: Segment[]]>): void;
  /** Event: one of ancestors or current paintable is detached, so current "paintable" is no long connected to canvas */
  treeDetached(): void;
  treeAttached(): void;
};

type InternalActions = {
  composeTransform(): void;
  setTreeAttached(attached: boolean): void;
};

const TRANSFORM_BY_PARENT_OPERATOR = 'baseOnParent';
const hasOwnProperty = (t: any, prop: string) => Object.prototype.hasOwnProperty.call(t, prop);

export function createPaintable(
  opts?: Parameters<typeof createActionStreamByType>[0]
): Paintable {
  const state: PaintableState = {
    id: (SEQ++).toString(16),
    x: 0,
    y: 0,
    width: 100,
    height: 150,
    transform: identity(),
    transPipelineByName: new Map(),
    transPipeline: [],
    detached: true,
    treeDetached: true
  };

  const ctl = createActionStreamByType<PaintableActions & InternalActions>(opts ?? {debug: process.env.NODE_ENV === 'development' ? 'Paintable' : false});

  const {actionByType: aot, payloadByType: pt, dispatcher} = ctl;

  rx.merge(
    pt.setProp.pipe(
      op.map(payload => {
        Object.assign(state, payload);
        if (hasOwnProperty(payload, 'width') || hasOwnProperty(payload, 'height')) {
          dispatcher.onResize(state.width, state.height);
        }
      })
    ),
    pt.setTreeAttached.pipe(
      op.map(payload => {
        state.treeDetached = !payload;
        return payload;
      }),
      op.distinctUntilChanged(),
      op.map(attached => attached ? dispatcher.treeAttached() : dispatcher.treeDetached())
    ),

    pt.putTransformOperator.pipe(
      op.tap(([key, op]) => {
        if (!state.transPipelineByName.has(key)) {
          state.transPipeline.push(key);
        }
        state.transPipelineByName.set(key, op);
      }),
      op.switchMap(() => {
        const ops = state.transPipeline.map(key => state.transPipelineByName.get(key)!) as [rx.OperatorFunction<Matrix, Matrix>];
        return aot.composeTransform.pipe(
          op.mapTo(identity()),
          ...ops
        );
      }),
      op.map(matrix => {
        state.transform = matrix;
        dispatcher.setTransformDirty(false);
      })
    ),

    attached$().pipe(
      op.switchMap(([currState, ...parent]) => {
        state.detached = false;
        state.parent = parent;
        const [pCtl, pState] = parent;
        state.canvasEngine = pState.canvasEngine;
        const {actionByType: pActions, payloadByType: pPayloads} = pCtl as unknown as ActionStreamControl<PaintableActions & InternalActions>;
        // When attached to a new parent, should always trigger `transform` recalculation
        dispatcher.setTransformDirty(true);

        return rx.merge(
          // Side effect on relative size change or parent resize
          rx.combineLatest(
            rx.merge(
              rx.of([pState.width, pState.height]),
              pPayloads.onResize
            ),
            rx.merge(
              rx.of([state.relativeWidth, state.relativeHeight]),
              aot.setProp.pipe(
                op.filter(({payload}) => hasOwnProperty(payload, 'relativeWidth') || hasOwnProperty(payload, 'relativeHeight')),
                op.map(({payload}) => [payload.relativeWidth, payload.relativeHeight])
              )
            )
          ).pipe(
            op.map(([[pW, pH], [rW, rH]]) => {
              if (rW == null || rH == null)
                return;
              state.width = pW * rW;
              state.height = pH * rH;
              dispatcher.onResize(state.width, state.height);
            })
          ),

          // When parent transform is dirty (transform is changed),
          // current Paintable should also be marked as dirty, since
          // transformOperator "baseOnParent" depends on `parentState.transform`
          pPayloads.setTransformDirty.pipe(
            op.filter(payload => payload),
            op.tap(() => dispatcher.setTransformDirty(true))
          ),
          rx.merge(
            rx.of(pState.treeDetached).pipe(
              op.map(detached => dispatcher.setTreeAttached(!detached))
            ),
            pActions.treeDetached.pipe(
              op.map(() => {
                dispatcher.setTreeAttached(false);
              })
            ),
            pActions.treeAttached.pipe(
              op.map(() => {
                dispatcher.setTreeAttached(true);
              })
            )
          ),
          // When rendering, check whether transform is "dirty" which requires to be "composed",
          // otherwise directly emit `renderContent`
          pPayloads.afterRender.pipe(
            op.withLatestFrom(pt.setTransformDirty),
            op.switchMap(([ctx, dirty]) => {
              return dirty ?
                rx.merge(
                  // wait for `composeTransform` result "transform" becomes not `dirty`
                  pt.setTransformDirty.pipe(
                    op.filter(dirty => !dirty),
                    op.take(1),
                    op.tap(() => dispatcher.transformChanged(state.transform)),
                    op.mapTo(ctx)
                  ),
                  // compose tranform matrix
                  new rx.Observable<never>(sub => {
                    dispatcher.composeTransform();
                    sub.complete();
                  })
                ) :
                rx.of(ctx);
            }),
            op.map(ctx => {
              ctx.save();
              dispatcher.renderContent(ctx, currState);
              ctx.restore();
              dispatcher.afterRender(ctx);
            })
          )
        ).pipe(
          op.takeUntil(aot.detach),
          op.ignoreElements()
        );
      }),
      op.catchError((err, src) => {
        console.error(err);
        return src;
      })
    ),
    aot.detach.pipe(
      op.map(() => {
        state.detached = true;
        state.parent = undefined;
        dispatcher.setTreeAttached(false);
      })
    ),
    pt.updateDetectables.pipe(
      op.map(objectsWithKey => {
        if (state.canvasEngine?.workerClient) {
          state.canvasEngine?.workerClient.dispatcher.updateDetectable(state.id,
            (function* () {
              for (const [key, segs] of objectsWithKey)
                yield [key, segs.map(seg => seg.toNumbers())];
            })());
        }
      })
    ),
    pt.addEpic.pipe(
      op.mergeMap(epic => epic(ctl as ActionStreamControl<PaintableActions>, state, {attached$}))
    ),
    new rx.Observable(sub => {
      // Push absolute transformation calculation operator as last entry in pipeline
      dispatcher.putTransformOperator(TRANSFORM_BY_PARENT_OPERATOR, (upStream: rx.Observable<Matrix>) => {
        return upStream.pipe(
          op.map(m => {
            return state.parent ?
              compose(state.parent[1].transform, m) :
              m;
          })
        );
      });

      sub.complete();
    })
  ).pipe(
    op.takeUntil(aot.detach),
    op.catchError((err, src) => {
      console.error(err);
      return src;
    })
  ).subscribe();

  function attached$() {
    return rx.concat(
      state.parent ? rx.of([state as Required<PaintableState>, ...state.parent] as const) : rx.EMPTY,
      pt.attachTo.pipe(
        op.map(p => {
          return [state as Required<PaintableState>, ...p] as const;
        })
      )
    );
  }

  return [
    ctl as ActionStreamControl<PaintableActions>,
    state,
    {
      attached$
    }
  ];
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type PaintableCtl<E extends Record<string, (...a: any[]) => void> = Record<string, never>> = ActionStreamControl<PaintableActions & E>;

