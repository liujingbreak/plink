import * as rx from 'rxjs';
import {vec2, mat4} from 'gl-matrix';
import {SingleActionFactory, CoreOptsOfExtSmplxRctr, ActionDispenser} from '@wfh/reactivizer';
// import {TerminalCanvas} from './terminal-canvas';
import {createContainerBase, BaseWidget, TerminalContainer} from './base';
import {TextStyle} from './canvas';

export interface BorderContainerActions {
  setBorderStyle(style: TextStyle): SingleActionFactory;
  setPadding(top: number, right: number, bottom: number, left: number): SingleActionFactory;
  setBorder(type: 'padding' | 'line'): SingleActionFactory;
}
const tableForBorderContainer = ['setBorder', 'setBorderStyle', 'setPadding'] as const;

const BORDER_CHARS = ['╭─╮', '╰─╯', '│'];
export function createBorderContainer(child: BaseWidget, opts?: CoreOptsOfExtSmplxRctr<TerminalContainer, BorderContainerActions>) {
  const container = createContainerBase({name: 'borderContainer', ...opts as CoreOptsOfExtSmplxRctr<TerminalContainer>});
  const service = container.config<BorderContainerActions, typeof tableForBorderContainer>({
    tableFor: tableForBorderContainer
  });
  const {r, table, s} = service;
  const childPos = [0, 0];
  // intercept "renderChild"
  s.interceptor$.next(action$ => {
    const dispenser = ActionDispenser.ofAction$<typeof service.s>(action$);
    return rx.merge(
      dispenser.at.renderChild.pipe(
        rx.map(action => {
          const {p: [ , child, canvas, trans]} = action;
          const pos = childPos;
          const tranOfChild = mat4.fromTranslation(mat4.create(), [pos[0], pos[1], 0]);
          mat4.mul(tranOfChild, trans, tranOfChild);
          child.s.ft.render(canvas, tranOfChild).dp(action);
        }),
        rx.ignoreElements()
      ),
      dispenser.ofOtherTypes()
    );
  });
  r('querySizeOf -> prefWidthFor, prefHeightFor', s.pt.querySizeOf.pipe(
    rx.withLatestFrom(table.l.allChildren, table.l.setBorder, table.l.setPadding),
    rx.mergeMap(([[m, w, h], [, children], [, border], [, top, right, bottom, left]]) => {
      if (w == null && h != null) {
        return children[0].s.ft.querySizeOf(null, h - top - bottom - (border === 'line' ? 2 : 0)).re(m).od(
          children[0].s.pt.prefWidthFor
        ).pipe(
          rx.take(1),
          rx.map(([, childWidth]) => {
            s.ft.prefWidthFor(childWidth + left + right + (border === 'line' ? 2 : 0), h).dp(m);
          })
        );
      } else if (h == null && w != null) {
        return children[0].s.ft.querySizeOf(w - left - right - (border === 'line' ? 2 : 0), null).re(m).od(
          children[0].s.pt.prefHeightFor
        ).pipe(
          rx.take(1),
          rx.map(([, , childHeight]) => {
            s.ft.prefHeightFor(w, childHeight + top + bottom + (border === 'line' ? 2 : 0)).dp(m);
          })
        );
      }
      return rx.EMPTY;
    })
  ));
  r('onChildPreferredSizeChange,... -> preferredSize', rx.combineLatest([
    s.pt.onChildPreferredSizeChange,
    table.l.setBorder, table.l.setPadding
  ]).pipe(
    rx.map(([[m, sizes], [m2, border], [m3, top, right, bottom, left]]) => {
      const line = border === 'line' ? 2 : 0;
      s.ft.preferredSize(
        sizes[0][0] + line + right + left,
        sizes[0][1] + line + top + bottom
      ).dp(m, m2, m3);
    })
  ));
  r('reflow -> onSize, setLayoutValid', s.pt.reflow.pipe(
    rx.withLatestFrom(table.l.onSize, table.l.setBorder, table.l.setPadding, table.l.allChildren),
    rx.map(([[m], [, w, h], [, border], [, top, right, bottom, left], [, children]]) => {
      s.ft.setLayoutValid(true).dp(m);
      childPos[0] = childPos[1] = 0;
      let borderLine = 0;
      if (border === 'line') {
        childPos[0] = 1;
        childPos[1] = 1;
        borderLine = 2;
      }
      childPos[0] += left;
      childPos[1] += top;
      const cWidth = w - left - right - borderLine;
      const cHeight = h - top - bottom - borderLine;
      if (cWidth > 0 && cHeight > 0) {
        children[0].s.ft.onSize(cWidth, cHeight).dp(m);
      }
      // service.log('>>>>>>>>>>>>>>>>>>>>>>>>>>> childPos', childPos);
    })
  ));
  r('renderSelf', s.pt.renderSelf.pipe(
    rx.withLatestFrom(
      table.l.setBorder,
      rx.combineLatest([table.l.setBorderStyle, table.l.onBgChangeWithParent]).pipe(
        rx.map(([[, style], [, bg]]) => {
          return bg ? [bg, ...style] : style;
        })
      ),
      table.l.onSize
    ),
    rx.map(([[m, canvas, trans], [, border], style, [, w, h]]) => {
      const pos = [0, 0] as vec2;
      if (border === 'line' && w > 2 && h > 2) {
        vec2.transformMat4(pos, pos, trans);
        canvas.s.ft.addString(pos[0], pos[1], BORDER_CHARS[0][0] + BORDER_CHARS[0][1].repeat(w - 2) + BORDER_CHARS[0][2], style).dp(m);
        for (let i = 1, l = h - 2; i <= l; i++) {
          const y = pos[1] + i;
          canvas.s.ft.addString(pos[0], y, BORDER_CHARS[2], style).dp(m);
          canvas.s.ft.addString(pos[0] + w - 1, y, BORDER_CHARS[2], style).dp(m);
        }
        canvas.s.ft.addString(pos[0], pos[1] + h - 1, BORDER_CHARS[1][0] + BORDER_CHARS[1][1].repeat(w - 2) + BORDER_CHARS[1][2], style).dp(m);
      }
    })
  ));
  r('init', new rx.Observable<never>(() => {
    s.ft.addReflowAction(s.pt.setBorder).dp();
    s.ft.addReflowAction(s.pt.setPadding).dp();
    s.ft.addRerenderAction(s.pt.setBorderStyle).dp();
    s.ft.setPadding(0, 1, 0, 1).dp();
    s.ft.setBorder('line').dp();
    s.ft.addChild(child).dp();
    s.ft.setBorderStyle([]).dp();
  }));
  return service;
}
