/* eslint-disable array-bracket-newline */
import * as rx from 'rxjs';
import {CoreOptions, SingleActionFactory} from '@wfh/reactivizer';
import {BaseWidget} from '../base';
import {Rectangle} from '../canvas';
import {baseContainerFac} from '../container';

export interface PosPopupInput {
  setAbsPos(x: number, y: number): SingleActionFactory;
  dockTo(c: BaseWidget): SingleActionFactory;
}
export interface PosPopupEvents extends PosPopupInput {
  isDocked(dockTarget: Rectangle | false): SingleActionFactory;
  onDockType(type: `${'up' | 'down'}${'Left' | 'Right'}`): SingleActionFactory;
}
const tableFor = ['setAbsPos', 'isDocked'] as const;
export const positionalFac = baseContainerFac.forExtend<PosPopupEvents, typeof tableFor>({
  name: 'positional',
  tableFor
}).defineReactor((init, content: BaseWidget, opts?: CoreOptions<PosPopupInput>) => {
  const {ft, r, pt, table} = init(opts);
  r('reflow -> c.onSize,onChildPositions', pt.reflow.pipe(
    rx.withLatestFrom(
      table.l.allDisplayChildren,
      table.l.isDocked,
      table.l.onSize
    ),
    rx.switchMap(([[m], [, children], [, isDocked], [, width, height]]) => {
      if (children.length === 0)
        return rx.EMPTY;
      if (isDocked) {
        const [x, y, w, h] = isDocked;
        const hor = x > width - x - w ? 'Left' : 'Right';
        const ver = y > height - y - h ? 'up' : 'down';
        ft.onDockType(`${ver}${hor}`).dp(m);
        const maxWidth = hor === 'Left' ? x + w : width - x;
        const maxHeight = ver === 'up' ? y : height - y - h;
        return rx.concat(
          children[0].table.l.preferredSize.pipe(
            rx.mergeMap(([, pw, ph]) => {
              if (pw <= maxWidth && ph <= maxHeight) {
                children[0].ft.onSize(pw, ph).dp(m);
                return rx.EMPTY;
              } else if (pw > maxWidth && ph > maxHeight) {
                children[0].ft.onSize(maxWidth, maxHeight).dp(m);
                return rx.EMPTY;
              } else if (pw > maxWidth) {
                return children[0].ft.querySizeOf(maxWidth, null).re(m).od(
                  children[0].pt.prefHeightFor
                );
              } else if (ph > maxHeight) {
                return children[0].ft.querySizeOf(null, maxHeight).re(m).od(
                  children[0].pt.prefWidthFor
                );
              }
              return rx.EMPTY;
            }),
            rx.take(1),
            rx.map(([, cw, ch]) => {
              children[0].ft.onSize(cw > maxWidth ? maxWidth : cw, ch > maxHeight ? maxHeight : ch).dp(m);
            })
          ),
          rx.defer(() => children[0].table.l.onSize).pipe(
            rx.map(([, cWidth, cHeight]) => {
              const posX = hor === 'Left' ? x + w - cWidth : x;
              const posY = ver === 'up' ? y - cHeight : y + h;
              ft.onChildPositions(new Map([[children[0], [posX, posY]]])).dp(m);
            }),
            rx.take(1)
          )
        );
      } else {
        return table.l.setAbsPos.pipe(
          rx.map(([, x, y]) => [] as ),
          rx.take(1)
        );
      }
      return rx.EMPTY;
    })
  ));
  r('setAbsPos -> isDocked', pt.setAbsPos.pipe(
    rx.map(([m]) => {
      ft.isDocked(false).dp(m);
    })
  ));
  r('dockTo... -> isDocked', pt.dockTo.pipe(
    rx.switchMap(([m, c]) => c.ft.queryAbsBounding().re(m).od(
      c.pt.didQueryAbsBounding
    ).pipe(
      rx.map(([m2, r]) => {
        if (r)
          ft.isDocked(r).dp(m, m2);
      })
    ))
  ));
  ft.addChild(content).dp();
  ft.addReflowAction(pt.isDocked).dp();
});
