import * as rx from 'rxjs';
import {mat4} from 'gl-matrix';
import {createActionStreamByType, ActionStreamControl} from '@wfh/redux-toolkit-observable/es/rx-utils';
import {ActionFunctions, ReactorComposite, PayloadStream} from '@wfh/reactivizer';
import {Segment, mat4ToStr} from '../canvas-utils';
// import type {ReactiveCanvas2Engine} from './reactiveCanvas2.worker';

export type Paintable<E extends ActionFunctions = Record<string, never>> = readonly [
  compositeController: ReactorComposite<PaintableActions, PaintableEvents & E>,
  latestInput: {[K in 'attachTo' | 'setSize' | 'setRelativeSize']: PayloadStream<PaintableActions, K>},
  latestEvent: {[K in 'onResize' | 'setTransform' | 'transformChanged' | 'treeAttached' | 'treeDetached' | 'isDetached']: PayloadStream<PaintableEvents, K>}
];

export type PaintableActions = {
  setSize(width: number, height: number): void;
  setRelativeSize(rWidth?: number, rHeight?: number): void;
  /** attach to a parent paintable object */
  attachTo(p: Paintable): void;
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

  detach(): void;
  updateDetectables(objectsByKey: Iterable<[key: string, segments: Segment[]]>): void;
};

export type PaintableEvents = {
  onResize(w: number, h: number): void;
  renderContent(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ): void;
  /** Event: one of ancestors or current paintable is detached, so current "paintable" is no long connected to canvas */
  treeDetached(): void;
  treeAttached(): void;
  /** internal events, observe treeDetached/treeAttached instead */
  setTreeAttached(attached: boolean): void;

  isDetached(detached: boolean): void;
  /**
   * Indicate whether `transform` should be calculate by transform operators once `render` is emitted.
   * @param isDirty `true` there is any side effect so that `transform` should be to be re-calculated,
   *  set to `false` once transform operators are executed and `transform` is updated.
   */
  // setTransformDirty(isDirty: boolean): void;
  setTransform(m: mat4, isDirty: boolean): void;
  /**
   * When this event is dispatched, its time we do any kind of cache invalidation and
   * transformation job for painting objects, to get ready for actually painting "transformed" things
   * in `renderContent` phase
   *
   * This event is dispatched right before `renderContent`
   */
  transformChanged(m: mat4): void;
  afterRender(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void;
  composeTransform(): void;
};

const TRANSFORM_BY_PARENT_OPERATOR = 'baseOnParent';
// const hasOwnProperty = (t: any, prop: string) => Object.prototype.hasOwnProperty.call(t, prop);

// eslint-disable-next-line space-before-function-paren
export function createPaintable<E extends ActionFunctions = Record<string, never>>(
  opts?: Parameters<typeof createActionStreamByType>[0]
): Paintable<E> {
  const transPipelineByName: Map<string, (up: rx.Observable<mat4>) => rx.Observable<mat4>> = new Map();
  const transPipeline = [] as string[];

  const composite = new ReactorComposite<PaintableActions, PaintableEvents>(opts ?? {debug: process.env.NODE_ENV === 'development' ? 'Paintable' : false});
  const {i, o, r} = composite;
  const latestInput = i.createLatestPayloadsFor('attachTo', 'setSize', 'setRelativeSize');
  const latestEvents = o.createLatestPayloadsFor('onResize', 'setTransform', 'transformChanged', 'treeAttached', 'treeDetached', 'isDetached');

  r(i.at.detach.pipe(
    rx.tap(a => o.dpf.isDetached(a, true))
  ));

  r(latestInput.attachTo.pipe(
    rx.map(([m, parent]) => {
      o.dpf.isDetached(m, false);
      return parent;
    }),
    rx.withLatestFrom(latestEvents.setTransform),
    rx.switchMap(([[pComp, pli, plo], [, transform]]) => {
      // When attached to a new parent, should always trigger `transform` recalculation
      o.dp.setTransform(transform, true);
      // state.canvasEngine = pState.canvasEngine;

      return rx.merge(
        // Side effect on relative size change or parent resize
        latestInput.setRelativeSize.pipe(
          rx.filter(([, w, h]) => w != null && h != null),
          rx.switchMap(([mr, w, h]) => rx.merge(pli.setSize, plo.onResize).pipe(
            rx.map(([m, pW, pH]) => {
              o.dpf.onResize([m, mr], pW * w!, pH * h!);
            })
          ))
        ),

        // When parent transform is dirty (transform is changed),
        // current Paintable should also be marked as dirty, since
        // transformOperator "baseOnParent" depends on `parentState.transform`
        plo.setTransform.pipe(
          rx.filter(([, , isDirty]) => isDirty),
          rx.withLatestFrom(latestEvents.setTransform),
          rx.tap(([[m], [, currMat]]) => o.dpf.setTransform(m, currMat, true))
        ),
        plo.treeDetached.pipe(
          rx.map(([m]) => o.dpf.setTreeAttached(m, false))
        ),
        plo.treeAttached.pipe(
          rx.map(([m]) => o.dpf.setTreeAttached(m, true))
        ),
        // When rendering, check whether transform is "dirty" which requires to be "composed",
        // otherwise directly emit `renderContent`
        pComp.o.pt.afterRender.pipe(
          rx.withLatestFrom(latestEvents.setTransform),
          rx.switchMap(([[pM, ctx], [m, , dirty]]) => {
            return dirty ?
              rx.merge(
                // wait for `composeTransform` result "transform" becomes not `dirty`
                o.pt.setTransform.pipe(
                  rx.filter(([, , dirty]) => !dirty),
                  rx.take(1),
                  rx.map(([, mat]) => {
                    const r = [pM, m];
                    o.dpf.transformChanged(r, mat);
                    return [r, ctx] as const;
                  })
                ),
                // compose tranform matrix
                new rx.Observable<never>(sub => {
                  o.dpf.composeTransform([pM, m]);
                  sub.complete();
                })
              ) :
              rx.of([[pM, m], ctx] as const);
          }),
          rx.map(([m, ctx]) => {
            ctx.save();
            o.dpf.renderContent(m, ctx);
            ctx.restore();
            o.dp.afterRender(ctx);
          })
        )
      ).pipe(
        rx.takeUntil(i.at.detach),
        rx.ignoreElements()
      );
    })
  ));

  r('Event setTreeAttached -> treeDetached/treeAttached', o.pt.setTreeAttached.pipe(
    rx.map(([, attached]) => attached),
    rx.distinctUntilChanged(),
    rx.map(attached => attached ? o.dp.treeAttached() : o.dp.treeDetached())
  ));

  // When putTransformOperator() and composeTransform(),
  // caculate matrix and dispatch setTransform()
  r('calculate transform matrix', i.pt.putTransformOperator.pipe(
    rx.switchMap(([, key, op]) => {
      transPipelineByName.set(key, op);
      transPipeline.push(key);
      const ops = process.env.NODE_ENV === 'development' ?
        (transPipeline.map(
          key => [
            transPipelineByName.get(key)!,
            // eslint-disable-next-line no-console
            rx.tap((m: mat4) => console.log('transformOperator', key + '\n' + mat4ToStr(m)))
          ]) as [rx.OperatorFunction<mat4, mat4>, rx.MonoTypeOperatorFunction<mat4>][])
          .reduce((acc, it) => { acc.push(...it); return acc; }, [] as rx.OperatorFunction<mat4, mat4>[])
        :
        transPipeline.map(key => transPipelineByName.get(key)!);

      return o.at.composeTransform.pipe(
        rx.switchMap(action => rx.of(mat4.create()).pipe(
          ...(ops as [rx.OperatorFunction<mat4, mat4>]),
          rx.map(matrix => {
            o.dpf.setTransform(action, matrix, true);
          })
        ))
      );
    })
  ));

  r(i.pt.updateDetectables.pipe(
    rx.map(([m, objectsWithKey]) => {
      // if (state.canvasEngine?.workerClient) {
      //   state.canvasEngine?.workerClient.dispatcher.updateDetectable(state.id,
      //     (function* () {
      //       for (const [key, segs] of objectsWithKey)
      //         yield [key, segs.map(seg => seg.toNumbers())];
      //     })());
      // }
    })
  ));

  // Push absolute transformation calculation operator as last entry in pipeline
  i.dp.putTransformOperator(TRANSFORM_BY_PARENT_OPERATOR, (upStream: rx.Observable<mat4>) => {
    return upStream.pipe(
      rx.withLatestFrom(latestEvents.isDetached),
      rx.mergeMap(([mat, [_meta, isDetached]]) => {
        return isDetached ?
          rx.of(mat) :
          latestInput.attachTo.pipe(
            rx.take(1),
            rx.mergeMap(([, [_comp, _pli, plo]]) => {
              return plo.setTransform.pipe(
                rx.map(([, pTransform]) => mat4.mul(mat, pTransform, mat))
              );
            }),
            rx.take(1)
          );
      })
    );
  });

  o.dp.setTransform(mat4.create(), true);
  composite.startAll();

  return [
    composite as unknown as ReactorComposite<PaintableActions, PaintableEvents & E>,
    latestInput, latestEvents
  ];
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type PaintableCtl<E extends Record<string, (...a: any[]) => void> = Record<string, never>> = ActionStreamControl<PaintableActions & E>;

