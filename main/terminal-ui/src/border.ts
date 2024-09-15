import * as rx from 'rxjs';
import {vec2} from 'gl-matrix';
import {SingleActionFactory, CoreOptsOfExtSmplxRctr, ActionMeta} from '@wfh/reactivizer';
// import {TerminalCanvas} from './terminal-canvas';
import {createContainerBase, BaseWidget, TerminalContainer} from './base';
import {TextStyle, TerminalCanvas} from './canvas';

export interface BorderContainerActions {
  setBorderStyle(style: TextStyle): SingleActionFactory;
  setPadding(top: number, right: number, bottom: number, left: number): SingleActionFactory;
  setBorder(type: 'padding' | 'line'): SingleActionFactory;
}
const tableForBorderContainer = ['setBorder', 'setBorderStyle', 'setPadding'] as const;

// https://symbl.cc/en/unicode/blocks/box-drawing/
const BORDER_CHARS = ['╭─╮', '╰─╯', '│'];
export function createBorderContainer(child: BaseWidget, opts?: CoreOptsOfExtSmplxRctr<TerminalContainer, BorderContainerActions>) {
  const container = createContainerBase({name: 'borderContainer', ...opts as CoreOptsOfExtSmplxRctr<TerminalContainer>});
  const service = container.config<BorderContainerActions, typeof tableForBorderContainer>({
    tableFor: tableForBorderContainer
  });
  const {r, table, s} = service;
  const childPos = [0, 0] as [number, number];
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
      s.ft.onContentSizeChange(
        sizes[0][0] + line + right + left,
        sizes[0][1] + line + top + bottom
      ).dp(m, m2, m3);
    })
  ));
  const reflowData = rx.combineLatest([
    table.l.onSize,
    table.l.setBorder,
    table.l.setPadding,
    table.l.allChildren
  ]);
  r('reflow -> onSize, setLayoutValid', s.pt.reflow.pipe(
    rx.withLatestFrom(reflowData),
    rx.map(([[m], [[, w, h], [, border], [, top, right, bottom, left], [, children]]]) => {
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
    })
  ));

  const renderData = rx.combineLatest([
    table.l.setBorder,
    rx.combineLatest([table.l.setBorderStyle, table.l.onBgChangeWithParent]).pipe(
      rx.map(([[, style], [, bg]]) => {
        return bg ? [bg, ...style] : style;
      })
    ),
    table.l.onSize
  ]);
  r('renderSelf', s.pt.renderSelf.pipe(
    rx.withLatestFrom(renderData),
    rx.map(([[m, canvas, trans], [[, border], style, [, w, h]]]) => {
      const pos = [0, 0] as [number, number];
      if (border === 'line' && w > 2 && h > 2) {
        vec2.transformMat4(pos, pos, trans);
        renderLineBorder(m, canvas, pos[0], pos[1], w, h, style);
      }
    })
  ));
  r('init', new rx.Observable<never>(() => {
    s.ft.latestReflowData(reflowData).dp();
    s.ft.setPadding(0, 1, 0, 1).dp();
    s.ft.setBorder('line').dp();
    s.ft.addChild(child).dp();
    s.ft.setBorderStyle([]).dp();
    s.ft.onChildPositions(new Map<BaseWidget, [number, number]>([[child, childPos]])).dp();
  }));
  return service;
}

export function renderLineBorder(m: ActionMeta, canvas: TerminalCanvas, x: number, y: number, w: number, h: number, style: TextStyle) {
  canvas.s.ft.addString(x, y, BORDER_CHARS[0][0] + BORDER_CHARS[0][1].repeat(w - 2) + BORDER_CHARS[0][2], style).dp(m);
  for (let i = 1, l = h - 2; i <= l; i++) {
    const top = y + i;
    canvas.s.ft.addString(x, top, BORDER_CHARS[2], style).dp(m);
    canvas.s.ft.addString(x + w - 1, top, BORDER_CHARS[2], style).dp(m);
  }
  canvas.s.ft.addString(x, y + h - 1, BORDER_CHARS[1][0] + BORDER_CHARS[1][1].repeat(w - 2) + BORDER_CHARS[1][2], style).dp(m);
}
