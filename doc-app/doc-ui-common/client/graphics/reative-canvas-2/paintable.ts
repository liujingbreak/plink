import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {Matrix, identity, compose} from 'transformation-matrix';
import {createActionStreamByType, ActionStreamControl} from '@wfh/redux-toolkit-observable/es/rx-utils';

export type PaintableState = {
  x: number;
  y: number;
  /** value is calculated by relativeWidth */
  width: number;
  /** value is calculated by relativeHeight */
  height: number;
  /** relative size of parent, if parent is not a positional paintable, size is relative to reactive canvas, value is between 0 ~ 1 */
  relativeWidth?: number;
  relativeHeight?: number;
  transPipeline: string[];
  transPipelineByName: Map<string, (up: rx.Observable<Matrix>) => rx.Observable<Matrix>>;
  /** used to actual render and calculate interactions detection */
  transform: Matrix;
  detached: boolean;
  parent?: [PaintableCtl, PaintableState];
  /** bounding box calculation is expensive, if it is not used for interaction detective,
  * we shall not calculate it in case of actions like:
  *   - ancestorDetached
  *   - detach
  */
  boundingBox?: {x: number; y: number; w: number; h: number};
};

export type PaintableActions = {
  /** attach to a parent paintable object */
  attachTo(p: ActionStreamControl<PaintableActions>, pState: PaintableState): void;
  onResize(w: number, h: number): void;
  /** set absolute size, alternatively call setRelativeSize() */
  setSize(w: number, h: number): void;
  /** change relative size which is proportional to parent's size */
  setRelativeSize(w: number, h: number): void;
  addTransformOperator(
    name: string,
    op: (up: rx.Observable<Matrix>) => rx.Observable<Matrix>
  ): void;
  removeTransformOperator(name: string): void;
  /**
   * Indicate whether `transform` should be calculate by transform operators once `renderContent` is emitted.
   * @param isDirty `true` there is any side effect so that `transform` should be to be re-calculated,
   *  set to `false` once transform operators are executed and `transform` is updated.
   */
  setTransformDirty(isDirty: boolean): void;
  _composeTransform(): void;
  /** @param transform undefined if there is not dirty transformation
   * needs to be composed
   */
  _onTransformComposed(transform?: Matrix): void;
  renderContent(
    ctx: CanvasRenderingContext2D,
    state: PaintableState,
    ctl: ActionStreamControl<PaintableActions>
  ): void;
  detach(): void;
  /** Event: one of ancestors is detached, so current "paintable" is no long connected to canvas */
  ancestorDetached(): void;
};

const TRANSFORM_BY_PARENT_OPERATOR = 'baseOnParent';

// eslint-disable-next-line space-before-function-paren, @typescript-eslint/ban-types
export function createControl<ExtActions extends Record<string, ((...payload: any[]) => void)> = {}>() {
  const state: PaintableState = {
    x: 0,
    y: 0,
    width: 100,
    height: 150,
    transform: identity(),
    transPipelineByName: new Map(),
    transPipeline: [],
    detached: true
  };

  const ctl = createActionStreamByType<PaintableActions>();

  const {actionOfType: aot, dispatcher} = ctl;

  rx.merge(
    aot('setSize').pipe(
      op.tap(({payload: [w, h]}) => {
        state.width = w;
        state.height = h;
        dispatcher.onResize(state.width, state.height);
      })
    ),
    aot('setRelativeSize').pipe(
      op.tap(({payload: [w, h]}) => {
        state.relativeWidth = w;
        state.relativeHeight = h;
      })
    ),

    rx.merge(
      aot('addTransformOperator').pipe(
        op.tap(({payload: [key, op]}) => {
          state.transPipelineByName.set(key, op);
          state.transPipeline.push(key);
        })
      ),
      aot('removeTransformOperator').pipe(
        op.tap(({payload}) => {
          const idx = state.transPipeline.indexOf(payload);
          state.transPipeline.splice(idx, 1);
          state.transPipelineByName.delete(payload);
        })
      )
    ).pipe(
      op.switchMap(() => {
        const ops = state.transPipeline.map(key => state.transPipelineByName.get(key)!) as [rx.OperatorFunction<Matrix, Matrix>];
        return aot('_composeTransform').pipe(
          op.mapTo(identity()),
          op.tap(() => {
            dispatcher.setTransformDirty(false);
          }),
          ...ops
        );
      }),
      op.map(matrix => {
        state.transform = matrix;
        dispatcher._onTransformComposed(matrix);
      })
    ),

    // When rendering, check whether transform should be "composed"
    aot('renderContent').pipe(
      op.withLatestFrom(aot('setTransformDirty').pipe(
        op.map(({payload: dirty}) => dirty),
        op.distinctUntilChanged(),
        op.filter( dirty => dirty)
      )),
      op.tap(([, dirty]) => {
        if (dirty)
          dispatcher._composeTransform();
        else
          dispatcher._onTransformComposed();
      })
    ),

    parentChange$(ctl, state).pipe(
      op.switchMap(({payload: [parent, pState]}) => {
        state.detached = false;
        state.parent = [parent, pState];
        const {actionOfType: pac} = parent;

        // Push absolute transformation calculation operator as last entry in pipeline
        dispatcher.addTransformOperator(TRANSFORM_BY_PARENT_OPERATOR, (upStream: rx.Observable<Matrix>) => {
          return upStream.pipe(
            op.map(m => compose(pState.transform, m))
          );
        });

        // When attached to a new parent, should always trigger `transform` recalculation
        dispatcher.setTransformDirty(true);

        return rx.merge(
          // Side effect on relative size change or parent resize
          rx.combineLatest(
            rx.concat(
              rx.of([pState.width, pState.height]),
              pac('onResize').pipe(
                op.map(({payload}) => payload)
              )
            ),
            rx.concat(
              rx.of([state.relativeWidth, state.relativeHeight]),
              aot('setRelativeSize').pipe(
                op.map(({payload}) => payload)
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
          pac('setTransformDirty').pipe(
            op.filter(({payload}) => payload),
            op.tap(() => dispatcher.setTransformDirty(true))
          ),

          // Pass down parent's detach event
          rx.merge(
            pac('detach'),
            pac('ancestorDetached')
          ).pipe(
            op.map(() => {
              dispatcher.ancestorDetached();
            })
          ),

          pac('renderContent').pipe(
            op.map(({payload: [ctx]}) => {
              dispatcher.renderContent(ctx, state, ctl);
            })
          )
        ).pipe(
          op.takeUntil(aot('detach')),
          op.finalize(() => {
            dispatcher.removeTransformOperator(TRANSFORM_BY_PARENT_OPERATOR);
          })
        );
      })
    ),
    aot('detach').pipe(
      op.tap(() => {
        state.detached = true;
        state.parent = undefined;
      })
    )
  ).pipe(
    op.takeUntil(aot('detach'))
  ).subscribe();

  return [ctl as unknown as ActionStreamControl<PaintableActions & ExtActions>, state] as const;
}

export type PaintableCtl = ActionStreamControl<PaintableActions>;

export function parentChange$({actionOfType: aot}: ActionStreamControl<PaintableActions>, state: PaintableState) {
  return rx.concat(
    state.parent ? rx.of({payload: state.parent}) : rx.EMPTY,
    aot('attachTo')
  );
}
