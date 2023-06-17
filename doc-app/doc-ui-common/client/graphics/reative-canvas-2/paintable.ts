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
  /** Transformation matrix of position relative to parent */
  transform: Matrix;
  transPipeline: string[];
  transPipelineByName: Map<string, (up: rx.Observable<Matrix>) => rx.Observable<Matrix>>;
  /** used to actual render and calculate interactions detection */
  absTransform: Matrix;
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
  /** set absolute size, alternatively call changeRelativeSize() */
  setSize(w: number, h: number): void;
  /** change relative size which is proportional to parent's size */
  changeRelativeSize(w: number, h: number): void;
  // changeTransform(m: Matrix): void;
  // onTransformChanged(absTransform: Matrix): void;
  addTransformOperator(
    name: string,
    op: (up: rx.Observable<Matrix>) => rx.Observable<Matrix>
  ): void;
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
    absTransform: identity(),
    transPipelineByName: new Map(),
    transPipeline: [],
    detached: true
  };

  const ctl = createActionStreamByType<PaintableActions>();

  const {actionOfType: aot, dispatcher} = ctl;

  rx.merge(
    // aot('changeTransform').pipe(
    //   op.tap(({payload}) => state.transform = payload)
    // ),
    aot('setSize').pipe(
      op.tap(({payload: [w, h]}) => {
        state.width = w;
        state.height = h;
        dispatcher.onResize(state.width, state.height);
      })
    ),
    aot('addTransformOperator').pipe(
      op.tap(({payload: [key, op]}) => {
        state.transPipelineByName.set(key, op);
        state.transPipeline.push(key);
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
            op.map(m => compose(pState.absTransform, state.transform))
          );
        });

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
              rx.of([state.width, state.height]),
              aot('changeRelativeSize').pipe(
                op.map(({payload}) => payload)
              )
            )
          ).pipe(
            op.map(([[pW, pH], [rW, rH]]) => {
              state.width = pW * rW;
              state.height = pH * rH;
              dispatcher.onResize(state.width, state.height);
            })
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
            const idx = state.transPipeline.indexOf(TRANSFORM_BY_PARENT_OPERATOR);
            state.transPipeline.splice(idx, 1);
            state.transPipelineByName.delete(TRANSFORM_BY_PARENT_OPERATOR);
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
