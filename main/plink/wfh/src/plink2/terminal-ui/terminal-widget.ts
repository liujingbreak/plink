import * as rx from 'rxjs';
import {mat4} from 'gl-matrix';
import {SingleActionFactory, SimplexReactor, SimplexReactorMergeType, TableOf, ActionMeta, ActionsOf, Action, InferMapParam,
  ActionDispenser} from '@wfh/reactivizer';
import {conciseNocolorConsoleLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {TerminalCanvas} from './terminal-canvas';

export interface BaseWidgetActions {
  setSize(width: number, height: number): SingleActionFactory;
  querySizeOf(width: number | null, height: number | null): SingleActionFactory;
  preferredSize(width: number, height: number): SingleActionFactory;
  /** As response to "querySizeOf" */
  prefWidthFor(width: number, constrainHeight: number): SingleActionFactory;
  /** As response to "querySizeOf" */
  prefHeightFor(constrainWidth: number, height: number): SingleActionFactory;
  overflow(yes: boolean): SingleActionFactory;

  setParent(p: TerminalWidget | null): SingleActionFactory;
  /** this message will be interceptor intercepts and skips if there is no "Rerender" action dispatched after last "render" message is handled */
  render(canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
  needRerender(need: boolean): SingleActionFactory;
  /** If following action is dispatched, the next render message must not be skipped on current widget */
  addRerenderAction(actionOrPayload$: rx.Observable<Action<any> | InferMapParam<any>>): SingleActionFactory;
}
const tableForBase = ['setSize', 'overflow', 'preferredSize', 'prefHeightFor', 'prefWidthFor', 'setParent', 'needRerender'] as const;
export type BaseWidget = SimplexReactor<BaseWidgetActions, typeof tableForBase>;

/** Do not prepend controller to returned service, otherwise interceptor won't work */
export function createBase() {
  const service = new SimplexReactor<BaseWidgetActions, typeof tableForBase>({tableFor: tableForBase});
  const {s, r} = service;

  service.s.interceptor$.next(a$ => {
    const ad = new ActionDispenser<BaseWidgetActions>(a$);
    return rx.merge(
      ad.at.render.pipe(
        rx.filter(() => service.table.getData().needRerender[0] === true)
      ),
      ad.ofOtherTypes());
  });
  r('addRerenderAction', rx.merge(
    s.pt.setSize,
    s.pt.addRerenderAction.pipe(
      rx.mergeMap(([, action$]) => action$)
    ).pipe(
      rx.map(actionOrPayload => {
        const m = Array.isArray(actionOrPayload) ? (actionOrPayload as unknown as [ActionMeta, ...unknown[]])[0] : actionOrPayload as Action<unknown>;
        s.ft.needRerender(true).dp(m);
      })
    )
  ));
  r('render', s.pt.render.pipe(
    rx.map(() => s.ft.needRerender(false).dp())
  ));
  s.ft.needRerender(true).dp();
  return service;
}

export interface ContainerWidgetInput {
  addChild<I extends BaseWidgetActions, L extends typeof tableForBase>(...children: SimplexReactor<I, L>[]): SingleActionFactory;
  removeChild<I extends ActionsOf<BaseWidget>, L extends TableOf<BaseWidget>>(...children: SimplexReactor<I, L>[]): SingleActionFactory;
  /** If following action is dispatched, the next render message must be handled, and relow action will be dispatched along with "render" message */
  addReflowAction(actionOrPayload$: rx.Observable<Action<any> | InferMapParam<any>>): SingleActionFactory;
}

export interface ContainerWidgetOutput {
  renderSelf(canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
  renderChild(index: number, child: BaseWidget, canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
  allChildren(children: Array<BaseWidget>): SingleActionFactory;
  onChildError(childId: string, errInfo: readonly [err: any, label: string | null]): SingleActionFactory;
  setLayoutValid(isValid: boolean): SingleActionFactory;
  reflow(): SingleActionFactory;
}

const tableFor = ['allChildren', 'setLayoutValid'] as const;
export type TerminalWidget = SimplexReactorMergeType<SimplexReactor<ContainerWidgetInput & ContainerWidgetOutput, typeof tableFor>, BaseWidget>;

export function createWidget() {
  const service = createBase().config<ContainerWidgetInput & ContainerWidgetOutput, typeof tableFor>({
    tableFor,
    log: conciseNocolorConsoleLogger
  });

  const {r, s, table} = service;
  const children = [] as BaseWidget[];

  r('addChild -> child.setParent', s.pt.addChild.pipe(
    rx.map(([m, ...added]) => {
      children.push(...added);
      for (const child of children) {
        child.s.ft.setParent(service).dp(m);
      }
    })
  ));
  r('removeChild', s.pt.removeChild.pipe(
    rx.map(([, ...widgets]) => {
      for (const w of widgets) {
        const idx = children.findIndex(c => c === w);
        if (idx >= 0)
          children.splice(idx, 1);
      }
    })
  ));

  r('addReflowAction', s.pt.addReflowAction.pipe(
    rx.mergeMap(action$ => action$),
    rx.map(actionOrPayload => {
      const m = Array.isArray(actionOrPayload) ? (actionOrPayload as unknown as [ActionMeta, ...unknown[]])[0] : actionOrPayload as Action<unknown>;
      s.ft.needRerender(true).dp(m);
      s.ft.setLayoutValid(false).dp(m);
    })
  ));

  r('renderSelf -> reflow', s.pt.renderSelf.pipe(
    rx.withLatestFrom(table.l.setLayoutValid),
    rx.map(([[m], [, valid]]) => {
      if (!valid)
        s.ft.reflow().dp(m);
    })
  ));

  r('render -> renderSelf, renderChild, rendered', s.pt.render.pipe(
    rx.map(([m, canvas, trans]) => {
      s.ft.renderSelf(canvas, trans).dp(m);
      for (let i = 0, l = children.length; i < l; i++) {
        const chr = children[i];
        s.ft.renderChild(i, chr, canvas, trans).dp(m);
      }
    })
  ));
  r('renderChild -> child.render, canvas.addString', s.pt.renderChild.pipe(
    rx.map(([m, _index, chr, canvas, trans]) => {
      chr.s.ft.render(canvas, trans).re(m).dp();
    })
  ));
  r('setParent, onChildError -> parent.onChildError', s.pt.setParent.pipe(
    rx.switchMap(([, parent]) => {
      return parent ?
        rx.merge(
          service.error$.pipe(
            rx.tap(errInfo => parent.s.ft.onChildError(service.s.logPrefix, errInfo))
          ),
          s.pt.onChildError.pipe(
            rx.tap(([, childId, errInfo]) => parent.s.ft.onChildError(childId, errInfo))
          )
        ) :
        rx.EMPTY;
    })
  ));
  s.ft.allChildren(children).dp();
  s.ft.setSize(0, 0).dp();
  s.ft.preferredSize(0, 0).dp();
  s.ft.setParent(null).dp();
  s.ft.overflow(false).dp();
  s.ft.setLayoutValid(false).dp();
  return service;
}

