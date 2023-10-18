import * as rx from 'rxjs';
import {mat4} from 'gl-matrix';
import {ActionFunctions, EmptyActionFunctions, ReactorComposite, ReactorCompositeOpt} from '@wfh/reactivizer';
import {Segment, mat4ToStr} from '../canvas-utils';
// import type {ReactiveCanvas2Engine} from './reactiveCanvas2.worker';

const inputTableFor = ['attachTo', 'setSize', 'setRelativeSize'] as const;
const outputTableFor = ['onResize', 'setTransform', 'setTransformDirty', 'setAbsoluteTransform', 'treeAttached', 'treeDetached', 'isDetached'] as const;

export type Paintable<
  I extends ActionFunctions = EmptyActionFunctions,
  E extends ActionFunctions = EmptyActionFunctions,
  IT extends ReadonlyArray<keyof I> = readonly[],
  OT extends ReadonlyArray<keyof E> = readonly[]
> = ReactorComposite<
PaintableActions & I, PaintableEvents & E,
ReadonlyArray<IT[number] | (typeof inputTableFor)[number]>,
ReadonlyArray<OT[number] | (typeof outputTableFor)[number]>
>;

export type PaintableActions = {
  // TODO: who will call it?
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
  /** A paintable implementation should react to this event, draw actual contents */
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
   * Local transformation matrix, which has initial value of mat.identity
   */
  setTransform(m: mat4): void;
  /** Indicate that `setAbsoluteTransform` needs to be re-calculated based on 'setTransform'.
   */
  setTransformDirty(isDirty: boolean): void;
  /**
   * When this event is dispatched, its time we do any kind of cache invalidation and
   * transformation job for painting objects, to get ready for actually painting "transformed" things
   * in `renderContent` phase
   *
   * This event is dispatched right before `renderContent`
   */
  setAbsoluteTransform(m: mat4): void;
  /** child paintables react to this event */
  afterRender(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void;
  composeTransform(): void;
};

const TRANSFORM_BY_PARENT_OPERATOR = 'baseOnParent';
// const hasOwnProperty = (t: any, prop: string) => Object.prototype.hasOwnProperty.call(t, prop);

// eslint-disable-next-line space-before-function-paren
export function createPaintable<I extends ActionFunctions = Record<string, never>, E extends ActionFunctions = Record<string, never>,
  IT extends ReadonlyArray<keyof I> = readonly [], OT extends ReadonlyArray<keyof E> = readonly []>(
  opts?: ReactorCompositeOpt<PaintableActions & I, PaintableEvents & E, IT, OT>
): Paintable<I, E, IT, OT> {
  const transPipelineByName: Map<string, (up: rx.Observable<mat4>) => rx.Observable<mat4>> = new Map();
  const transPipeline = [] as string[];

  const composite = new ReactorComposite<PaintableActions, PaintableEvents, typeof inputTableFor, typeof outputTableFor>({
    debug: process.env.NODE_ENV === 'development' ? 'Paintable' : false,
    ...(opts as any) ?? {},
    inputTableFor: (opts?.inputTableFor ? opts.inputTableFor.concat(inputTableFor) : inputTableFor) as typeof inputTableFor,
    outputTableFor: opts?.outputTableFor ? (opts.outputTableFor as readonly unknown[] as typeof outputTableFor).concat(outputTableFor) : outputTableFor
  });
  const {i, o, r} = composite;
  const li = composite.inputTable.l;
  const latestEvents = composite.outputTable.l;

  r(i.at.detach.pipe(
    rx.tap(a => o.dpf.isDetached(a, true))
  ));

  r(o.pt.setTransform.pipe(
    rx.distinctUntilChanged(([, a], [, b]) => mat4.equals(a, b)),
    rx.tap(([m]) => o.dpf.setTransformDirty(m, true))
  ));

  r('When attached to a parent', li.attachTo.pipe(
    rx.switchMap(([m, pComp]) => {
      const pli = pComp.inputTable.l;
      const plo = pComp.outputTable.l;
      o.dpf.isDetached(m, false);

      // When attached to a new parent, should always trigger `transform` recalculation
      o.dpf.setTransformDirty(m, true);
      // state.canvasEngine = pState.canvasEngine;

      return rx.merge(
        // Side effect on relative size change or parent resize
        li.setRelativeSize.pipe(
          rx.filter(([, w, h]) => w != null && h != null),
          rx.switchMap(([mr, w, h]) => rx.merge(pli.setSize, plo.onResize).pipe(
            rx.map(([m, pW, pH]) => {
              o.dpf.onResize([m, mr], pW * w!, pH * h!);
            })
          ))
        ),

        // When parent's set"AbsoluteTransform" is dirty (transform is changed),
        // current Paintable should also be marked as dirty, since
        // transformOperator "baseOnParent" depends on it
        plo.setAbsoluteTransform.pipe(
          rx.tap(([m]) => o.dpf.setTransformDirty(m, true))
        ),
        plo.treeDetached.pipe(
          rx.map(([m]) => o.dpf.setTreeAttached(m, false))
        ),
        plo.treeAttached.pipe(
          rx.map(([m]) => o.dpf.setTreeAttached(m, true))
        ),
        // When parent dispatches "afterRender", dispatch `composeTransform` if current transform is "dirty"
        // otherwise directly emit `renderContent`, and trigger current paintable dispatching
        // "setAbsoluteTransform","renderContent" and "afterRender"
        pComp.o.pt.afterRender.pipe(
          rx.withLatestFrom(latestEvents.setTransformDirty),
          rx.switchMap(([[pM, ctx], [m, dirty]]) => {
            if (dirty) {
              const r = [pM, m];
              o.dpf.setTransformDirty(r, false);
              return o.dfo.composeTransform(o.at.setAbsoluteTransform, [pM, m]).pipe(
                rx.take(1),
                rx.map(() => {
                  return [r, ctx] as const;
                })
              );
            }
            return rx.of([[pM, m], ctx] as const);
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
            // eslint-disable-next-line no-console
            rx.tap((m: mat4) => console.log('transformOperator', key + '\n' + mat4ToStr(m))),
            transPipelineByName.get(key)!,
            rx.timeout(1000)
          ]) as rx.OperatorFunction<mat4, mat4>[][])
          .reduce((acc, it) => { acc.push(...it); return acc; }, [] as rx.OperatorFunction<mat4, mat4>[])
        :
        transPipeline.map(key => transPipelineByName.get(key)!);

      return o.at.composeTransform.pipe(
        rx.switchMap(action => rx.of(mat4.create()).pipe(
          ...(ops as [rx.OperatorFunction<mat4, mat4>]),
          rx.timeout(1000),
          rx.map(matrix => {
            o.dpf.setAbsoluteTransform(action, matrix);
          }),
        ))
      );
    })
  ));

  // r(i.pt.updateDetectables.pipe(
  //   rx.map(([m, objectsWithKey]) => {
  //     // if (state.canvasEngine?.workerClient) {
  //     //   state.canvasEngine?.workerClient.dispatcher.updateDetectable(state.id,
  //     //     (function* () {
  //     //       for (const [key, segs] of objectsWithKey)
  //     //         yield [key, segs.map(seg => seg.toNumbers())];
  //     //     })());
  //     // }
  //   })
  // ));

  // Push absolute transformation calculation operator as last entry in pipeline,
  // new matrix is "parent transform" multiple "upStream matrix"
  i.dp.putTransformOperator(TRANSFORM_BY_PARENT_OPERATOR, (upStream: rx.Observable<mat4>) => {
    return upStream.pipe(
      rx.withLatestFrom(latestEvents.isDetached),
      rx.mergeMap(([mat, [, isDetached]]) => {
        return isDetached ?
          rx.of(mat) :
          li.attachTo.pipe(
            rx.take(1),
            rx.mergeMap(([, comp]) => {
              const plo = comp.outputTable.l;
              return plo.setAbsoluteTransform.pipe(
                rx.map(([, pTransform]) => mat4.mul(mat, pTransform, mat))
              );
            }),
            rx.take(1)
          );
      })
    );
  });

  o.dp.setTransform(mat4.create());

  return composite as unknown as Paintable<I, E, IT, OT>;
}

