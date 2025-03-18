/* eslint-disable array-bracket-newline */
import * as rx from 'rxjs';
import {ActionMeta, SingleActionFactory, SimplexReactorOfFac, CreateOptsInDef, CoreOptions} from '@wfh/reactivizer';
import {BaseWidget, DisplayMode} from '../core/base';
import {textFac, TextOptions} from '../hoc/text';
import {Rectangle} from '../core/canvas';
import {baseContainerFac} from '../core/container';
import {queryElevatorContainer} from '../core/elevator-container';
import {queryAppContext} from './app-shell';
import {querySchemeForComponent} from './color-theme';

export interface PosPopupInput {
  setRelativePos(x: number, y: number): SingleActionFactory;
  dockTo(c: BaseWidget): SingleActionFactory;
  show(): SingleActionFactory;
  hide(): SingleActionFactory;
}
export interface PosPopupEvents extends PosPopupInput {
  isDocked(dockTarget: Rectangle | false): SingleActionFactory;
  onDockType(type: `${'up' | 'down'}${'Left' | 'Right'}`): SingleActionFactory;
}
const tableFor = ['setRelativePos', 'isDocked'] as const;
export type PositionalPopupOpts = CreateOptsInDef<PosPopupInput, typeof baseContainerFac>;
export const positionalFac = baseContainerFac.forExtend<PosPopupEvents, typeof tableFor>({
  name: 'positional',
  tableFor
}).defineReactor((init, content: BaseWidget, opts?: PositionalPopupOpts) => {
  const service = init(opts);
  const {ft, r, pt, table} = service;
  r('reflow -> c.onSize,onChildPositions', pt.reflow.pipe(
    rx.withLatestFrom(
      table.l.allDisplayChildren,
      table.l.isDocked,
      table.l.setRelativePos,
      table.l.onSize,
      table.l.onChildPositions
    ),
    rx.switchMap(([[m], [, children], [, isDocked], [, relX, relY], [, width, height], [, childPos]]) => {
      if (children.length === 0)
        return rx.EMPTY;
      service.log('--relow: isDocked', isDocked);
      if (isDocked) {
        let [x, y] = isDocked;
        const [, , w, h] = isDocked;
        x += relX;
        y += relY;
        const hor = x > width - x - w ? 'Left' : 'Right';
        const ver = y > height - y - h ? 'up' : 'down';
        ft.onDockType(`${ver}${hor}`).dp(m);
        const maxWidth = hor === 'Left' ? x + w : width - x;
        const maxHeight = ver === 'up' ? y : height - y - h;
        return rx.concat(
          children[0].table.l.preferredSize.pipe(
            rx.mergeMap(([, pw, ph]) => {
              // service.log('--relow: child preferredSize', pw, ph, 'max size', maxWidth, maxHeight);
              if (pw <= maxWidth && ph <= maxHeight) {
                return rx.of([null, pw, ph] as const);
              } else if (pw > maxWidth && ph > maxHeight) {
                return rx.of([null, maxWidth, maxHeight] as const);
              } else if (pw > maxWidth) {
                return children[0].ft.querySizeOf(maxWidth, null).re(m).od(
                  children[0].pt.prefHeightFor
                );
              } else if (ph > maxHeight) {
                return children[0].ft.querySizeOf(null, maxHeight).re(m).od(
                  children[0].pt.prefWidthFor
                );
              }
              return rx.of([null, pw, ph] as const);
            }),
            rx.map(([, cw, ch]) => {
              children[0].ft.onSize(cw > maxWidth ? maxWidth : cw, ch > maxHeight ? maxHeight : ch).dp(m);
            }),
            rx.take(1)
          ),
          rx.defer(() => {
            service.log('-- >>> child set position start');
            return children[0].table.l.onSize;
          }).pipe(
            rx.map(([, cWidth, cHeight]) => {
              const posX = hor === 'Left' ? x + w - cWidth : x;
              const posY = ver === 'up' ? y - cHeight : y + h;
              childPos.set(children[0], [posX, posY]);
              ft.onChildPositions(childPos).dp(m);
            }),
            rx.take(1)
          )
        );
      } else {
        return table.l.setRelativePos.pipe(
          rx.map(([, x, y]) => {
            children[0].ft.onSize(9, 1).dp(m);
            childPos.set(children[0], [x, y]);
            ft.onChildPositions(childPos).dp(m);
          }),
          rx.take(1)
        );
      }
    })
  ));
  r('show -> setDisplay', pt.show.pipe(
    rx.map(() => ft.setDisplay(DisplayMode.visible))
  ));
  r('hide -> setDisplay', pt.hide.pipe(
    rx.map(() => {
      ft.setDisplay(DisplayMode.hidden);
    })
  ));
  r('setRelativePos -> isDocked', pt.setRelativePos.pipe(
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
  content.ft.setFocusable(true).dp();
  content.ft.setFocusStyle(null).dp();
  ft.addChild(content).dp();
  ft.addReflowAction(pt.isDocked).dp();
  ft.setRelativePos(0, 0).dp();
  ft.isDocked(false).dp();
});
export type PositionalPopup = SimplexReactorOfFac<typeof positionalFac>;

export function showPopupFor(
  dockTo: BaseWidget,
  content: BaseWidget,
  attrs?: {
    relativePos?: [number, number] | null;
    actionMeta?: ActionMeta | null;
    allowUserEvents?: boolean;
  },
  opts?: PositionalPopupOpts
) {
  const popup = positionalFac.create(content, opts);
  if (attrs?.relativePos)
    popup.ft.setRelativePos(...attrs.relativePos).dp(attrs?.actionMeta ?? undefined);
  popup.ft.dockTo(dockTo).dp(attrs?.actionMeta ?? undefined);
  popup.r('"showPopupFor"', queryElevatorContainer(dockTo).pipe(
    rx.mergeMap(elevator => {
      elevator.ft.addLayer(popup, attrs?.allowUserEvents).dp(attrs?.actionMeta ?? undefined);
      popup.ft.show().dp();
      return popup.pt.hide.pipe(
        rx.map(([m]) => {
          elevator.ft.removeChild(popup).dp(m);
        })
      );
    }),
    rx.take(1)
  ));
  return popup;
}

export interface TooltipsOptions {
  name?: string;
  debug?: boolean;
  log?: CoreOptions['log'];
  positionalOpts?: PositionalPopupOpts;
  textOpts?: TextOptions;
}

export function bindToolTipsTo(c: BaseWidget, tooltips: string | BaseWidget, delayShowMs = 800, opts?: TooltipsOptions) {
  c.r('c.onEnter -> "showPopupFor",popup.hide', c.pt.onEnter.pipe(
    rx.switchMap(([m]) => {
      return rx.timer(delayShowMs).pipe(
        rx.takeUntil(c.pt.onLeave),
        rx.map(() => {
          let textComp: BaseWidget;
          if (typeof tooltips === 'string') {
            const bordedText = textFac.create(tooltips, {
              name: opts?.name ? opts.name + '.label' : 'popup.label',
              debug: opts?.debug,
              log: opts?.log,
              ...opts?.textOpts
            });
            bordedText.ft.setPadding(0, 1, 0, 1).dp(m);
            textComp = bordedText;
          } else {
            textComp = tooltips;
          }
          const popup = showPopupFor(c, textComp!, {
            actionMeta: m,
            allowUserEvents: false
          },
          {
            debug: opts?.debug,
            log: opts?.log,
            name: opts?.name,
            ...opts?.positionalOpts
          });
          return [popup, textComp!] as const;
        }),
        rx.mergeMap(([popup, textComp]) => querySchemeForComponent(textComp).pipe(
          rx.map(([colors]) => {
            textComp.ft.setBackground(`bgHex(${colors.inverseSurface})`).dp();
            textComp.ft.setForeground([`hex(${colors.inverseOnSurface})`]).dp();
          }),
          rx.takeUntil(rx.merge(
            queryAppContext(c, m).pipe(
              rx.switchMap(({keyEventService}) => keyEventService.pt.onEsc)
            ),
            c.pt.onLeave
          ).pipe(
            rx.map(([m2]) => {
              popup.ft.hide().dp(m2, m);
            })
          ))
        ))
      );
    })
  ));
}
