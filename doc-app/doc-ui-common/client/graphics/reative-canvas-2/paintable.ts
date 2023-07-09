import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {Matrix, identity, compose} from 'transformation-matrix';
import {createActionStreamByType, ActionStreamControl} from '@wfh/redux-toolkit-observable/es/rx-utils';
import {createAnimationManager} from '../../animation/ease-functions';
import {Segment} from '../canvas-utils';
import {WorkerClientAction, ResponseEvents} from './paintable-worker-client';

let SEQ = 0;

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
  parent?: [p: PaintableCtl, pState: PaintableState];
  /** For touch detection */
  workerClient?: ActionStreamControl<WorkerClientAction & ResponseEvents>;
  animateMgr?: ReturnType<typeof createAnimationManager>;
  // isDetectablesValid: boolean;
};

export type PaintableActions = {
  setProp(override: Partial<Pick<PaintableState, 'width' | 'height' | 'relativeHeight' | 'relativeWidth'>>): void;
  /** attach to a parent paintable object */
  attachTo(p: PaintableCtl, pState: PaintableState): void;
  onResize(w: number, h: number): void;
  /** set absolute size, alternatively call setRelativeSize() */
  // setSize(w: number, h: number): void;
  /** change relative size which is proportional to parent's size */
  // setRelativeSize(w: number, h: number): void;
  // setTouchDetection(enable: boolean): void;
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
  transformChanged(): void;
  /**
   * Begin actual content and child paintables rendering, at this moment,
   * transform matrix is composed.
   */
  renderContent<E extends PaintableActions = PaintableActions>(
    ctx: CanvasRenderingContext2D,
    state: PaintableState,
    ctl: ActionStreamControl<E>
  ): void;
  detach(): void;
  updateDetectables(objectsByKey: Iterable<[key: string, segments: Segment[]]>): void;
  /** Event: one of ancestors is detached, so current "paintable" is no long connected to canvas */
  treeDetached(): void;
  treeAttached(): void;
};

type InternalActions = {
  render(ctx: CanvasRenderingContext2D): void;
  composeTransform(): void;
  setTreeAttached(attached: boolean): void;
};

const TRANSFORM_BY_PARENT_OPERATOR = 'baseOnParent';
const hasOwnProperty = (t: any, prop: string) => Object.prototype.hasOwnProperty.call(t, prop);

export function createPaintable<
  // eslint-disable-next-line space-before-function-paren
  ExtActions extends Record<string, ((...payload: any[]) => void)> = Record<string, never>
>(opts?: Parameters<typeof createActionStreamByType>[0]) {
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

    // When rendering, check whether transform is "dirty" which requires to be "composed",
    // otherwise directly emit `renderContent`
    pt.render.pipe(
      op.withLatestFrom(pt.setTransformDirty),
      op.switchMap(([ctx, dirty]) => {
        if (dirty) {
          return rx.merge(
            // wait for `composeTransform` result: "transform" becomes not `dirty`
            pt.setTransformDirty.pipe(
              op.filter(dirty => !dirty),
              op.take(1),
              op.tap(() => dispatcher.transformChanged()),
              op.mapTo(ctx)
            ),
            // compose tranform matrix
            new rx.Observable<never>(sub => {
              dispatcher.composeTransform();
              sub.complete();
            })
          );
        } else {
          return rx.of(ctx);
        }
      }),
      op.map((ctx) => dispatcher.renderContent(ctx, state, ctl))
    ),

    parentChange$(ctl, state).pipe(
      op.switchMap(([parent, pState]) => {
        state.detached = false;
        state.parent = [parent, pState];
        state.workerClient = pState.workerClient;
        state.animateMgr = pState.animateMgr;

        const {actionByType: pActions} = parent;
        // When attached to a new parent, should always trigger `transform` recalculation
        dispatcher.setTransformDirty(true);

        return rx.merge(
          // Side effect on relative size change or parent resize
          rx.combineLatest(
            rx.merge(
              rx.of([pState.width, pState.height]),
              pActions.onResize.pipe(
                op.map(({payload}) => payload)
              )
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
          pActions.setTransformDirty.pipe(
            op.filter(({payload}) => payload),
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
          pActions.renderContent.pipe(
            op.map(({payload: [ctx]}) => {
              dispatcher.render(ctx);
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
        if (state.workerClient)
          state.workerClient.dispatcher.updateDetectable(state.id,
            (function* () {
              for (const [key, segs] of objectsWithKey)
                yield [key, segs.map(seg => seg.toNumbers())];
            })());
      })
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
    op.takeUntil(aot.detach)
  ).subscribe();

  return [ctl as unknown as ActionStreamControl<PaintableActions & ExtActions>, state] as const;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type PaintableCtl<E extends Record<string, (...a: any[]) => void> = Record<string, never>> = ActionStreamControl<PaintableActions & E>;

// eslint-disable-next-line @typescript-eslint/ban-types, space-before-function-paren
export function parentChange$<E extends Record<string, (...a: any[]) => void> = Record<string, never>>(
  control: ActionStreamControl<PaintableActions & E>, state: PaintableState
): rx.Observable<[p: PaintableCtl, pState: PaintableState]> {
  return rx.concat(
    state.parent ? rx.of(state.parent) : rx.EMPTY,
    (control as ActionStreamControl<PaintableActions>).payloadByType.attachTo
  );
}
