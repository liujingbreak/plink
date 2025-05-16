import * as rx from 'rxjs';
import {vec2} from 'gl-matrix';
import {CreateOptsOfFac, SimplexReactorOfFac, SingleActionFactory, ActionMeta} from '@wfh/reactivizer';
import {querySchemeForComponent} from '../app/color-theme.js';
import {BaseWidget} from './base.js';
import {baseContainerFac} from './container.js';
import {Canvas, TextStyle} from './canvas.js';

export interface BorderContainerActions {
  setBorderStyle(style: TextStyle): SingleActionFactory;
  setPadding(top: number, right: number, bottom: number, left: number): SingleActionFactory;
  setBorder(type: 'none' | 'line'): SingleActionFactory;
}
const tableForBorderContainer = ['setBorder', 'setBorderStyle', 'setPadding'] as const;

// https://symbl.cc/en/unicode/blocks/box-drawing/
const BORDER_CHARS = ['╭─╮', '╰─╯', '│'];
export const borderFac = baseContainerFac.forExtend<BorderContainerActions, typeof tableForBorderContainer>({
  name: 'border',
  tableFor: tableForBorderContainer
}).interceptorByType(ad => rx.merge(
  ad.at.setBorderStyle.pipe(
    rx.distinctUntilChanged(({p: [a]}, {p: [b]}) => a === b)
  ),
  ad.ofOtherTypes()
)).defineReactor(({init}, child: BaseWidget) => {
  const service = init();
  const {r, latest, ft, pt} = service;
  const childPos = [0, 0] as [number, number];
  const positions = new Map<BaseWidget, [number, number]>([[child, childPos]]);
  r('querySizeOf -> prefWidthFor, prefHeightFor', pt.querySizeOf.pipe(
    rx.withLatestFrom(latest.allChildren, latest.setBorder, latest.setPadding),
    rx.mergeMap(([[m, w, h], [, children], [, border], [, top, right, bottom, left]]) => {
      if (w == null && h != null) {
        const qh = h - top - bottom - (border === 'line' ? 2 : 0);
        if (qh < 0) {
          ft.prefWidthFor(0, h).dp(m);
          return rx.EMPTY;
        }
        return children[0].ft.querySizeOf(null, qh).re(m).od(
          children[0].pt.prefWidthFor
        ).pipe(
          rx.take(1),
          rx.map(([, childWidth]) => {
            ft.prefWidthFor(childWidth + left + right + (border === 'line' ? 2 : 0), h).dp(m);
          })
        );
      } else if (h == null && w != null) {
        const qw = w - left - right - (border === 'line' ? 2 : 0);
        if (qw < 0) {
          ft.prefHeightFor(w, 0).dp(m);
          return rx.EMPTY;
        }
        return children[0].ft.querySizeOf(qw, null).re(m).od(
          children[0].pt.prefHeightFor
        ).pipe(
          rx.take(1),
          rx.map(([, , childHeight]) => {
            ft.prefHeightFor(w, childHeight + top + bottom + (border === 'line' ? 2 : 0)).dp(m);
          })
        );
      }
      return rx.EMPTY;
    })
  ));
  r('onChildPreferredSizeChange,... -> onContentSizeChange', rx.combineLatest([
    pt.onChildPreferredSizeChange,
    latest.setBorder, latest.setPadding
  ]).pipe(
    rx.map(([[m, sizes], [m2, border], [m3, top, right, bottom, left]]) => {
      const line = border === 'line' ? 2 : 0;
      if (sizes.length > 0) {
        ft.onContentSizeChange(
          sizes[0][0] + line + right + left,
          sizes[0][1] + line + top + bottom
        ).dp(m, m2, m3);
      } else {
        ft.onContentSizeChange(
          line + right + left,
          line + top + bottom
        ).dp(m, m2, m3);
      }
    })
  ));
  const reflowData = [
    latest.onSize,
    latest.setBorder,
    latest.setPadding,
    latest.allChildren
  ] as const;
  r('reflow -> onSize, setLayoutValid', pt.reflow.pipe(
    rx.withLatestFrom(...reflowData),
    rx.map(([[m], [, w, h], [, border], [, top, right, bottom, left], [, children]]) => {
      ft.setLayoutValid(true).dp(m);
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
        children[0].ft.onSize(cWidth, cHeight).dp(m);
        ft.onChildPositions(positions).dp(m);
      }
    })
  ));

  const renderData = rx.combineLatest([
    latest.setBorder,
    rx.combineLatest([latest.setBorderStyle, latest.onBgChangeWithParent]).pipe(
      rx.map(([[, style], [, bg]]) => {
        return bg ? [bg, ...style] : style;
      })
    ),
    latest.onSize
  ]);
  r('renderSelf', pt.renderSelf.pipe(
    rx.withLatestFrom(renderData),
    rx.switchMap(([[m, canvas, trans], [[, border], style, [, w, h]]]) => {
      const pos = [0, 0] as [number, number];
      if (border === 'line' && w > 2 && h > 2) {
        vec2.transformMat4(pos, pos, trans);
        renderLineBorder(m, canvas, pos[0], pos[1], w, h, style);
        return rx.EMPTY;
      } else if (border === 'none') {
        return rx.combineLatest([
          latest.setPadding,
          latest.onBgChangeWithParent
        ]).pipe(
          rx.take(1),
          rx.map(([[, t, r, b, l], [, bgColor]]) => {
            if (bgColor && (t > 0 || r > 0 || b > 0 || l > 0)) {
              vec2.transformMat4(pos, pos, trans);
              const [x, y] = pos;
              const bgStyle = [bgColor];
              const topLine = ' '.repeat(w);
              for (let i = 0; i < t; i++) {
                canvas.ft.addString(x, y + i, topLine, bgStyle).dp(m);
              }
              for (let i = 0; i < b; i++) {
                canvas.ft.addString(x, y + i + h - b, topLine, bgStyle).dp(m);
              }
              const leftFillLine = ' '.repeat(l);
              const rightFillLine = ' '.repeat(r);

              // service.log('-- render padding background');
              for (let i = t, l = h - b; i < l; i++) {
                canvas.ft.addString(x, y + i, leftFillLine, bgStyle).dp(m);
                canvas.ft.addString(x + w - r, y + i, rightFillLine, bgStyle).dp(m);
              }
            }
          })
        );
      }
      return rx.EMPTY;
    })
  ));
  r('init', new rx.Observable<never>(() => {
    ft.requestReflowOn(...reflowData).dp();
    // ft.latestReflowData(rx.merge(...reflowData)).dp();
    ft.setPadding(0, 1, 0, 1).dp();
    ft.setBorder('line').dp();
    ft.addChild(child).dp();
    ft.setBorderStyle([]).dp();
    ft.onChildPositions(positions).dp();
  }));
  r('"theming" -> setBorderStyle',
    querySchemeForComponent(service).pipe(
      rx.map(([colors, ...m]) => {
        const s = [`hex(${colors.outlineVariant})`] as TextStyle;
        ft.setBorderStyle(s).dp(...m);
      })
    ));
});

export type BorderContainerOpts = CreateOptsOfFac<typeof borderFac>;
export type BorderContainer = SimplexReactorOfFac<typeof borderFac>;
export function createBorderContainer(child: BaseWidget, opts?: BorderContainerOpts) {
  return (opts ? borderFac.setting(opts) : borderFac).create(child);
}

export function renderLineBorder(m: ActionMeta, canvas: Canvas, x: number, y: number, w: number, h: number, style: TextStyle) {
  canvas.ft.addString(x, y, BORDER_CHARS[0][0] + BORDER_CHARS[0][1].repeat(w - 2) + BORDER_CHARS[0][2], style).dp(m);
  for (let i = 1, l = h - 2; i <= l; i++) {
    const top = y + i;
    canvas.ft.addString(x, top, BORDER_CHARS[2], style).dp(m);
    canvas.ft.addString(x + w - 1, top, BORDER_CHARS[2], style).dp(m);
  }
  canvas.ft.addString(x, y + h - 1, BORDER_CHARS[1][0] + BORDER_CHARS[1][1].repeat(w - 2) + BORDER_CHARS[1][2], style).dp(m);
}
