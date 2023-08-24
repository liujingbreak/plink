import * as rx from 'rxjs';
import * as op from 'rxjs';
// import {Matrix, identity, compose} from 'transformation-matrix';
import {mat4} from 'gl-matrix';
import {createActionStreamByType, ActionStreamControl, PayloadStreams} from '@wfh/redux-toolkit-observable/es/rx-utils';
import {Segment, mat4ToStr} from '../canvas-utils';
import type {ReactiveCanvas2Engine} from './reactiveCanvas2.worker';

let SEQ = 0;

export type Paintable<E extends Record<string, (...a: any[]) => void> = Record<string, never>> = readonly [
  ActionStreamControl<PaintableActions & E>,
  PaintableState,
  PayloadStreams<Pick<PaintableActions, 'setTransformDirty' | 'onResize'>>
];

export type PaintableState = {
  id: string;
  /** absolute size, value is calculated by relativeWidth */
  width: number;
  /** absolute size, value is calculated by relativeHeight */
  height: number;
  /** relative size of parent, if parent is not a positional paintable, size is relative to reactive canvas, value is between 0 ~ 1 */
  relativeWidth?: number;
  /** relative size of parent, if parent is not a positional paintable, size is relative to reactive canvas, value is between 0 ~ 1 */
  relativeHeight?: number;
  transPipeline: string[];
  transPipelineByName: Map<string, (up: rx.Observable<mat4>) => rx.Observable<mat4>>;
  /** used to actual render and calculate interactions detection */
  transform: mat4;
  detached: boolean;
  treeDetached: boolean;
  // isTransformDirty: boolean;
  epics: ((c: ActionStreamControl<any>, s: Required<PaintableState>) => rx.Observable<any>)[];
  parent?: Paintable;
  canvasEngine?: ReactiveCanvas2Engine;
  epicObservables?: Array<rx.Observable<any>>;
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
    op: (up: rx.Observable<mat4>) => rx.Observable<mat4>
  ): void;

  renderContent(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    state: Required<PaintableState>
  ): void;

  /** `epic` is a concept borrowed from [redux-observable](https://redux-observable.js.org/docs/basics/Epics.html).
   * The returned "epic" observable will be subscribed when `treeAttached` event is dispatched until `treeDetached` event
   * is dispatched.
   * @param epicFactory the function return "epic", it is invoked only once at beginning, but the `epic` that it returns could
   * be subscribed multiple times, if there are multiple `treeAttached` events dispatched.
   */
  // eslint-disable-next-line @typescript-eslint/ban-types
  addEpic<E extends Record<string, (...a: any[]) => void> = Record<string, never>>(
    epicFactory: (
      c: ActionStreamControl<Omit<PaintableActions, 'addEpic'> & E>,
      s: Required<PaintableState>,
      replayablePayload: Paintable[2]
    ) => rx.Observable<any>
  ): void;
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
  transformChanged(m: mat4): void;
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

// eslint-disable-next-line space-before-function-paren
export function createPaintable<E extends Record<string, (...a: any[]) => void> = Record<string, never>>(
  opts?: Parameters<typeof createActionStreamByType>[0]
): Paintable<E> {
  const state: PaintableState = {
    id: (SEQ++).toString(16),
    width: 100,
    height: 150,
    transform: mat4.create(),
    transPipelineByName: new Map(),
    transPipeline: [],
    detached: true,
    treeDetached: true,
    // isTransformDirty: true,
    epics: []
  };

  const ctl = createActionStreamByType<PaintableActions & InternalActions>(opts ?? {debug: process.env.NODE_ENV === 'development' ? 'Paintable' : false});
  const rPayloads = ctl.createLatestPayloads('setTransformDirty', 'onResize');

  const {actionByType: aot, payloadByType: pt, dispatcher} = ctl;

  rx.merge(
    pt.setProp.pipe(
      rx.map(payload => {
        Object.assign(state, payload);
        if (hasOwnProperty(payload, 'width') || hasOwnProperty(payload, 'height')) {
          dispatcher.onResize(state.width, state.height);
        }
      })
    ),
    // pt.setTransformDirty.pipe(
    //   op.map(dirty => {state.isTransformDirty = dirty; })
    // ),
    pt.setTreeAttached.pipe(
      op.map(attached => {
        state.treeDetached = !attached;
        return attached;
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
      })
    ),

    rx.concat(
      rx.defer(() => state.transPipeline.length > 0 ? rx.of(true) : rx.EMPTY),
      aot.putTransformOperator
    ).pipe(
      op.switchMap(() => {
        const ops = process.env.NODE_ENV === 'development' ?
          (state.transPipeline.map(
            key => [
              state.transPipelineByName.get(key)!,
              // eslint-disable-next-line no-console
              op.tap((m: mat4) => console.log('transformOperator', key + '\n' + mat4ToStr(m)))
            ]) as [rx.OperatorFunction<mat4, mat4>, rx.MonoTypeOperatorFunction<mat4>][])
            .reduce((acc, it) => { acc.push(...it); return acc; }, [] as rx.OperatorFunction<mat4, mat4>[])
          :
          state.transPipeline.map(key => state.transPipelineByName.get(key)!);

        return aot.composeTransform.pipe(
          op.mapTo(mat4.create()),
          ...(ops as [rx.OperatorFunction<mat4, mat4>])
        );
      }),
      op.map(matrix => {
        state.transform = matrix;
        dispatcher.setTransformDirty(false);
      })
    ),
    pt.attachTo.pipe(
      op.map(parent => {
        state.detached = false;
        state.parent = parent;
      })
    ),

    attached$().pipe(
      op.switchMap((currState) => {
        const [pCtl, pState, prPayloads] = currState.parent;
        state.canvasEngine = pState.canvasEngine;
        const {actionByType: pActions, payloadByType: pPayloads} = pCtl as unknown as ActionStreamControl<PaintableActions & InternalActions>;
        // When attached to a new parent, should always trigger `transform` recalculation
        dispatcher.setTransformDirty(true);

        return rx.merge(
          // Side effect on relative size change or parent resize
          rx.combineLatest([
            rx.merge(
              rx.of([pState.width, pState.height]),
              pPayloads.onResize
            ),
            rx.merge(
              rx.of([state.relativeWidth, state.relativeHeight]),
              pt.setProp.pipe(
                op.filter(payload => hasOwnProperty(payload, 'relativeWidth') || hasOwnProperty(payload, 'relativeHeight')),
                op.map(payload => [payload.relativeWidth, payload.relativeHeight])
              )
            )
          ]).pipe(
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
          prPayloads.setTransformDirty.pipe(
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
            op.withLatestFrom(rPayloads.setTransformDirty),
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
      op.map(epic => state.epics.push(epic as any))
    ),
    rx.concat(
      rx.defer(() => rx.of(...state.epics)),
      pt.addEpic
    ).pipe(
      op.mergeMap(epic => {
        return rx.concat(
          rx.defer(() => !state.treeDetached ? rx.of(true) : rx.EMPTY),
          aot.treeAttached
        ).pipe(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          op.switchMap(() => {return epic(ctl as any, state as Required<typeof state>, rPayloads); }),
          op.takeUntil(pt.treeDetached)
        );
      })
    )
  ).pipe(
    op.takeUntil(aot.detach),
    op.catchError((err, src) => {
      console.error(err);
      return src;
    })
  ).subscribe();

  // Push absolute transformation calculation operator as last entry in pipeline
  dispatcher.putTransformOperator(TRANSFORM_BY_PARENT_OPERATOR, (upStream: rx.Observable<mat4>) => {
    return upStream.pipe(
      op.map(m => {
        return state.parent ?
          mat4.mul(m, state.parent[1].transform, m) :
          m;
      })
    );
  });
  dispatcher.setTransformDirty(true);

  function attached$() {
    return rx.concat(
      rx.defer(() => state.parent ? rx.of(state as Required<PaintableState>) : rx.EMPTY),
      pt.attachTo.pipe(
        op.map(_p => {
          return state as Required<PaintableState>;
        })
      )
    );
  }

  return [
    ctl as unknown as ActionStreamControl<PaintableActions & E>,
    state,
    rPayloads as PayloadStreams<PaintableActions & typeof rPayloads extends PayloadStreams<infer X> ? X : never>
  ];
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type PaintableCtl<E extends Record<string, (...a: any[]) => void> = Record<string, never>> = ActionStreamControl<PaintableActions & E>;

