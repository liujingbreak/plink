import * as rx from 'rxjs';
import {mat4, vec2} from 'gl-matrix';
import {SingleActionFactory, SimplexReactor, SimplexReactorMergeType, ActionMeta, Action, InferMapParam} from '@wfh/reactivizer';
import {conciseNocolorConsoleLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {TerminalCanvas, BackgroundStyle} from './terminal-canvas';

export interface BaseWidgetActions {
  setSize(width: number, height: number): SingleActionFactory;
  /** Implementation needs to handle this action */
  querySizeOf(width: number | null, height: number | null): SingleActionFactory;
  preferredSize(width: number, height: number): SingleActionFactory;
  /** As response to "querySizeOf" */
  prefWidthFor(width: number, constrainHeight: number): SingleActionFactory;
  /** As response to "querySizeOf" */
  prefHeightFor(constrainWidth: number, height: number): SingleActionFactory;
  overflow(yes: boolean): SingleActionFactory;

  setParent(p: TerminalContainer | null): SingleActionFactory;
  /** this message will be interceptor intercepts and skips if there is no "Rerender" action dispatched after last "render" message is handled */
  render(canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
  onRender(canvas: TerminalCanvas, absTransform: mat4, renderSelf: boolean): SingleActionFactory;
  needRerender(need: boolean): SingleActionFactory;
  /** If following action is dispatched, the next render message must not be skipped on current widget */
  addRerenderAction(actionOrPayload$: rx.Observable<Action<any> | InferMapParam<any>>): SingleActionFactory;
}
export const tableForBase = ['setSize', 'overflow', 'preferredSize', 'prefHeightFor', 'prefWidthFor', 'setParent', 'needRerender'] as const;
export type BaseWidget = SimplexReactor<BaseWidgetActions, typeof tableForBase>;

/** Do not prepend controller to returned service, otherwise interceptor won't work */
export function createBase() {
  const service = new SimplexReactor<BaseWidgetActions, typeof tableForBase>({tableFor: tableForBase});
  const {s, r, table} = service;

  r('addRerenderAction', rx.merge(
    s.pt.setSize.pipe(
      rx.distinctUntilChanged(([, w1, h1], [, w2, h2]) => w1 === w2 && h1 === h2)
    ),
    s.pt.addRerenderAction.pipe(
      rx.mergeMap(([, action$]) => action$)
    ).pipe(
      rx.map(actionOrPayload => {
        const m = Array.isArray(actionOrPayload) ? (actionOrPayload as unknown as [ActionMeta, ...unknown[]])[0] : actionOrPayload as Action<unknown>;
        s.ft.needRerender(true).dp(m);
      })
    )
  ));
  r('render -> needRerender, onRender, renderBackgroundFor', s.pt.render.pipe(
    rx.withLatestFrom(table.l.needRerender, table.l.setParent),
    rx.map(([[m, canvas, trans], [, renderSelf], [, parent]]) => {
      if (renderSelf && parent) {
        parent.s.ft.renderBackgroundFor(service).dp(m);
      }
      s.ft.onRender(canvas, trans, renderSelf).dp(m);
      if (renderSelf)
        s.ft.needRerender(false).dp(m);
    })
  ));
  r('setParent, onChildError, parent.destory$ -> parent.onChildError, dispose()', s.pt.setParent.pipe(
    rx.switchMap(([, parent]) => parent ?
      rx.merge(
        service.error$.pipe(
          rx.tap(errInfo => parent.s.ft.onChildError(service.s.logPrefix, errInfo))
        ),
        parent.destory$.pipe(
          rx.map(() => service.dispose())
        )
      ) :
      rx.EMPTY)
  ));
  s.ft.needRerender(true).dp();
  return service;
}

export interface ContainerWidgetInput {
  addChild(...children: BaseWidget[]): SingleActionFactory;
  removeChild(...children: BaseWidget[]): SingleActionFactory;
  /** If following action is dispatched, the next render message must be handled, and relow action will be dispatched along with "render" message */
  addReflowAction(actionOrPayload$: rx.Observable<Action<any> | InferMapParam<any>>): SingleActionFactory;
  setBackground(color: BackgroundStyle | null): SingleActionFactory;
}

export interface ContainerWidgetOutput {
  renderSelf(canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
  renderChild(index: number, child: BaseWidget, canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
  allChildren(children: Array<BaseWidget>): SingleActionFactory;
  onChildError(childId: string, errInfo: readonly [err: any, label: string | null]): SingleActionFactory;
  onChildPreferredSizeChange(sizes: [w: number, h: number][]): SingleActionFactory;
  setLayoutValid(isValid: boolean): SingleActionFactory;
  /** Implementation must dispatch setLayoutValid(true) */
  reflow(): SingleActionFactory;
  /** No reaction yet , preserve for future */
  renderBackgroundFor(child: BaseWidget): SingleActionFactory;
}

const tableFor = ['allChildren', 'setLayoutValid', 'setBackground', 'onChildPreferredSizeChange'] as const;
export type TerminalContainer = SimplexReactorMergeType<SimplexReactor<ContainerWidgetInput & ContainerWidgetOutput, typeof tableFor>, BaseWidget>;

export function createContainerBase() {
  const base = createBase();
  const service = base.config<ContainerWidgetInput & ContainerWidgetOutput, typeof tableFor>({
    tableFor,
    log: conciseNocolorConsoleLogger
  });

  const {r, s, table} = service;
  const {ft} = s;
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
  r('addChild, removeChild, children.preferredSize -> onChildPreferredSizeChange', rx.merge(
    s.pt.addChild,
    s.pt.removeChild
  ).pipe(
    rx.switchMap(() => table.l.allChildren.pipe(
      rx.switchMap(([, children]) => {
        return rx.combineLatest([...children].map(widget => {
          return widget.table.l.preferredSize.pipe(
            rx.distinctUntilChanged(([, w1, h1], [, w2, h2]) => w1 === w2 && h1 === h2)
          );
        }));
      }),
      rx.map(preferredSizeOfChildren => {
        ft.onChildPreferredSizeChange(preferredSizeOfChildren.map(([, w, h]) => [w, h] as const)).dp();
      })
    ))
  ));

  r('addReflowAction', s.pt.addReflowAction.pipe(
    rx.mergeMap(([, action$]) => action$),
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

  r('reflow -> child.needRerender(true)', s.pt.reflow.pipe(
    rx.withLatestFrom(table.l.allChildren),
    rx.map(([[m], [, allChildren]]) => {
      for (const child of allChildren)
        child.s.ft.needRerender(true).dp(m);
    })
  ));

  r('onRender -> renderSelf, renderChild, rendered', s.pt.onRender.pipe(
    rx.map(([m, canvas, trans, renderSelf]) => {
      if (renderSelf)
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
  r('onChildError', s.pt.onChildError.pipe(
    rx.withLatestFrom(s.pt.setParent),
    rx.map(([[, childId, errInfo], [, parent]]) => {
      if (parent)
        parent.s.ft.onChildError(childId, errInfo);
    })
  ));
  r('renderSelf, setBackground, setSize -> canvas.addString', s.pt.renderSelf.pipe(
    rx.mergeMap(a => rx.combineLatest([
      table.l.setSize,
      table.l.setBackground
    ]).pipe(
      rx.take(1),
      rx.map(b => [a, ...b] as const)
    )),
    rx.map(([[m, canvas, trans], [, width, height], [, bg]], idx) => {
      const pos = [0, 0] as vec2;
      vec2.transformMat4(pos, pos, trans);
      if (bg) {
        const fill = ' '.repeat(width);
        for (let i = 0; i < height; i++) {
          canvas.s.ft.addString(pos[0], pos[1] + i, fill, [bg]).dp(m);
        }
      } else {
        if (idx === 0) {
          const fill = ' '.repeat(width);
          for (let i = 0; i < height; i++) {
            canvas.s.ft.addString(pos[0], pos[1] + i, fill).dp(m);
          }
        } else {
          canvas.s.ft.clearRect(pos[0], pos[1], width, height).dp(m);
        }
      }
    })
  ));
  r('setParent, parent.setBackground -> setBackground', table.l.setParent.pipe(
    rx.switchMap(([, parent]) => parent ?
      parent.table.l.setBackground.pipe(
        rx.withLatestFrom(table.l.setBackground),
        rx.mergeMap(([[m, pBg], [, ownBg]]) => new rx.Observable<never>(_sub => {
          if (pBg) {
            ft.setBackground(pBg).dp(m);
            return () => {
              return ft.setBackground(ownBg).dp(m);
            };
          }
        }))
      ) :
      rx.EMPTY)
  ));
  ft.addReflowAction(s.pt.setSize).dp();
  ft.addReflowAction(s.pt.onChildPreferredSizeChange).dp();
  ft.allChildren(children).dp();
  ft.setSize(0, 0).dp();
  ft.preferredSize(0, 0).dp();
  ft.setParent(null).dp();
  ft.overflow(false).dp();
  ft.setLayoutValid(false).dp();
  ft.setBackground(null).dp();
  return service;
}

