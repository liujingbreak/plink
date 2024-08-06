import * as rx from 'rxjs';
import {mat4, vec2} from 'gl-matrix';
import {SingleActionFactory, CoreOptsOfExtSmplxRctr, ActionDispenser, SimplexReactor, SimplexReactorMergeType, ActionMeta, Action, InferMapParam, SimplexReactorOptions} from '@wfh/reactivizer';
import {TerminalCanvas, Rectangle, BackgroundStyle} from './terminal-canvas';

export interface BaseWidgetMessages {
  /** to override automatical "preferredSize" in layout calculation */
  setPreferredSize(width: number | null, height: number | null): SingleActionFactory;
  setFlexGrow(value: number): SingleActionFactory;
  onSize(width: number, height: number): SingleActionFactory;
  /** Implementation needs to handle this action */
  querySizeOf(width: number | null, height: number | null): SingleActionFactory;
  /** Be aware that an interceptor is filtering "preferredSize" action for distinctUntilChanged(), which will affect action table, some action will be skipped due to duplication */
  preferredSize(width: number, height: number): SingleActionFactory;
  /** As response to "querySizeOf" */
  prefWidthFor(width: number, constrainHeight: number): SingleActionFactory;
  /** As response to "querySizeOf" */
  prefHeightFor(constrainWidth: number, height: number): SingleActionFactory;
  overflow(yes: boolean): SingleActionFactory;

  setParent(p: TerminalContainer | null): SingleActionFactory;
  ofCanvas(canvas: TerminalCanvas | null): SingleActionFactory;
  /** this message will be interceptor intercepts and skips if there is no "Rerender" action dispatched after last "render" message is handled,
   * @param relRerenderArea - Rectangle to be rerendered, the coordinate is relative to target (this) component
   */
  render(canvas: TerminalCanvas, absTransform: mat4, relRerenderArea?: Rectangle): SingleActionFactory;
  /** Implementation needed to handle this action */
  onRender(canvas: TerminalCanvas, absTransform: mat4, renderSelf: boolean, renderArea: Rectangle): SingleActionFactory;
  needRerender(need: boolean): SingleActionFactory;
  /** If following action is dispatched, the next render message must not be skipped on current widget */
  addRerenderAction(actionOrPayload$: rx.Observable<Action<any> | InferMapParam<any>>): SingleActionFactory;
}
export const tableForBase = [
  'onSize', 'overflow', 'preferredSize', 'prefHeightFor', 'prefWidthFor', 'setParent', 'needRerender',
  'setPreferredSize', 'setFlexGrow', 'ofCanvas'
] as const;
export type BaseWidget = SimplexReactor<BaseWidgetMessages, typeof tableForBase>;

/** Do not prepend controller to returned service, otherwise interceptor won't work */
export function createBase(opts?: Partial<SimplexReactorOptions<BaseWidgetMessages, typeof tableForBase>>) {
  const service = new SimplexReactor<BaseWidgetMessages, typeof tableForBase>({tableFor: tableForBase, ...opts});
  const {s, r, table} = service;

  // When table "setPreferredSize" contains non-null value, override corresponding "preferredSize" event, change or skip it
  service.s.prependInterceptor(up => {
    const disp = ActionDispenser.ofAction$<BaseWidget>(up);
    return rx.merge(
      disp.at.preferredSize.pipe(
        rx.withLatestFrom(table.l.setPreferredSize),
        rx.map(([a, [, w, h]]) => {
          if (w != null && a.p[0] !== w)
            a.p[0] = w;
          if (h != null && a.p[1] !== h)
            a.p[1] = h;
          return a;
        }),
        rx.distinctUntilChanged((a, b) => a.p[0] === b.p[0] && a.p[1] === b.p[1])
      ),
      disp.ofOtherTypes()
    );
  });
  r('addRerenderAction', rx.merge(
    s.pt.onSize.pipe(
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
  r('needRerender, ofCanvas', s.pt.needRerender.pipe(
    rx.withLatestFrom(table.l.ofCanvas),
    rx.map(([[m, need], [, canvas]]) => {
      if (canvas && need)
        canvas.s.ft.requestRender().dp(m);
    })
  ));
  r('render -> needRerender, onRender, renderBackgroundFor', s.pt.render.pipe(
    rx.withLatestFrom(table.l.needRerender, table.l.setParent, table.l.onSize),
    rx.map(([[m, canvas, trans, rerenderRect], [, renderSelf], [, parent], [, width, height]]) => {
      if (renderSelf && parent) {
        parent.s.ft.renderBackgroundFor(service).dp(m);
      }
      s.ft.onRender(canvas, trans, renderSelf, rerenderRect ?? [0, 0, width, height]).dp(m);
      if (renderSelf)
        s.ft.needRerender(false).dp(m);
    })
  ));
  r('setParent, error$, parent.destory$ -> parent.onChildError, dispose()', table.l.setParent.pipe(
    rx.switchMap(([m, parent]) => {
      if (parent == null) {
        s.ft.ofCanvas(null).dp(m);
        return rx.EMPTY;
      }
      return rx.merge(
        parent.table.l.ofCanvas.pipe(
          rx.map(([m, canvas]) => s.ft.ofCanvas(canvas).dp(m))
        ),
        service.error$.pipe(
          rx.tap(errInfo => parent.s.ft.onChildError(service.s.logPrefix, errInfo))
        ),
        parent.destory$.pipe(
          rx.map(() => service.dispose())
        )
      );
    })
  ));
  r('init', new rx.Observable<never>(() => {
    s.ft.setFlexGrow(0).dp();
    s.ft.setPreferredSize(null, null).dp();
    s.ft.needRerender(true).dp();
    s.ft.setParent(null).dp();
    s.ft.ofCanvas(null).dp();
  }));
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
  renderSelf(canvas: TerminalCanvas, absTransform: mat4, renderArea: Rectangle): SingleActionFactory;
  renderChild(index: number, child: BaseWidget, canvas: TerminalCanvas, absTransform: mat4, renderArea: Rectangle): SingleActionFactory;
  allChildren(children: Array<BaseWidget>): SingleActionFactory;
  onChildError(childId: string, errInfo: readonly [err: any, label: string | null]): SingleActionFactory;
  onChildPreferredSizeChange(sizes: [w: number, h: number][]): SingleActionFactory;
  onBgChangeWithParent(color: BackgroundStyle | null | undefined): SingleActionFactory;
  setLayoutValid(isValid: boolean): SingleActionFactory;
  /** Implementation must dispatch setLayoutValid(true) */
  reflow(): SingleActionFactory;
  /** No reaction yet , preserve for future */
  renderBackgroundFor(child: BaseWidget): SingleActionFactory;
}

const tableFor = ['allChildren', 'setLayoutValid', 'setBackground', 'onBgChangeWithParent', 'onChildPreferredSizeChange'] as const;
export type TerminalContainer = SimplexReactorMergeType<SimplexReactor<ContainerWidgetInput & ContainerWidgetOutput, typeof tableFor>, BaseWidget>;

export function createContainerBase(opts?: CoreOptsOfExtSmplxRctr<BaseWidget, ContainerWidgetInput & ContainerWidgetOutput>) {
  const base = createBase(opts as any);
  const service = base.config<ContainerWidgetInput & ContainerWidgetOutput, typeof tableFor>({
    tableFor
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

  r('addReflowAction -> needRerender, setLayoutValid', s.pt.addReflowAction.pipe(
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

  r('onRender -> renderSelf, renderChild', s.pt.onRender.pipe(
    rx.map(([m, canvas, trans, renderSelf, area]) => {
      if (renderSelf)
        s.ft.renderSelf(canvas, trans, area).dp(m);
      for (let i = 0, l = children.length; i < l; i++) {
        const chr = children[i];
        s.ft.renderChild(i, chr, canvas, trans, area).dp(m);
      }
    })
  ));
  r('renderChild -> child.render, canvas.addString', s.pt.renderChild.pipe(
    rx.map(([m, _index, chr, canvas, trans]) => {
      chr.s.ft.render(canvas, trans).re(m).dp();
    })
  ));
  r('onChildError -> parent.onChildError', s.pt.onChildError.pipe(
    rx.withLatestFrom(s.pt.setParent),
    rx.map(([[, childId, errInfo], [, parent]]) => {
      if (parent)
        parent.s.ft.onChildError(childId, errInfo);
    })
  ));
  r('renderSelf, onBgChangeWithParent, onSize -> canvas.addString, canvas.clearRect', s.pt.renderSelf.pipe(
    rx.mergeMap(a => rx.combineLatest([
      table.l.onSize,
      table.l.onBgChangeWithParent
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
  r('setParent, parent.onBgChangeWithParent -> onBgChangeWithParent', rx.combineLatest([
    table.l.setParent.pipe(
      rx.switchMap(([, parent]) => parent?.table.l.onBgChangeWithParent ?? rx.of([null, null] as const))
    ),
    table.l.setBackground
  ]).pipe(
    rx.map(([[m, pBg], [m2, ownBg]]) => {
      if (ownBg)
        s.ft.onBgChangeWithParent(ownBg).dp(m2);
      else if (m && pBg)
        s.ft.onBgChangeWithParent(pBg).dp(m, m2);
      else
        s.ft.onBgChangeWithParent(null).dp(m2);
    })
  ));
  r('init', new rx.Observable<never>(() => {
    ft.addReflowAction(s.pt.onSize).dp();
    ft.addReflowAction(s.pt.onChildPreferredSizeChange).dp();
    ft.addRerenderAction(s.pt.onBgChangeWithParent).dp();
    ft.allChildren(children).dp();
    ft.onSize(0, 0).dp();
    ft.preferredSize(0, 0).dp();
    ft.overflow(false).dp();
    ft.setLayoutValid(false).dp();
    ft.setBackground(null).dp();
  }));
  return service;
}

