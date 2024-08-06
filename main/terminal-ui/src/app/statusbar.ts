import * as rx from 'rxjs';
import {SingleActionFactory, CoreOptions} from '@wfh/reactivizer';
import {createFlexContainer, Scrollable, KeyEventServcie, createTextWidget} from '../index';

export interface StatusbarMessages {
  trackScrollable(scrollable: Scrollable): SingleActionFactory;
  trackKeypressService(service: KeyEventServcie): SingleActionFactory;

  onScrollStatus(vertical: number, horizontal: number): SingleActionFactory;
  onKeypressStatus(text: string, isValid: boolean): SingleActionFactory;
}

const tableFor = ['trackKeypressService', 'trackScrollable'] as const;

export function createStatusbar(opts?: CoreOptions<StatusbarMessages>) {
  const container = createFlexContainer({name: 'StatusBar', ...opts as any});
  const statusbar = container.config<StatusbarMessages, typeof tableFor>({
    tableFor
  });
  container.s.ft.setBackground('bgBlue').dp();
  const {r, s, table} = statusbar;
  const labelScrollText = createTextWidget('scroll', opts as any);
  const labelScrollValue1 = createTextWidget('0%', opts as any);
  const labelScrollValue2 = createTextWidget('0%', opts as any);
  const labelKeypress = createTextWidget('', {name: 'keypressInfo', ...opts as any});
  labelKeypress.s.ft.setFlexGrow(1).dp();

  s.ft.addChild(labelKeypress.asBaseType,
    labelScrollText.asBaseType,
    labelScrollValue1.asBaseType,
    labelScrollValue2.asBaseType
  ).dp();
  r('trackScrollable, scrollable.onValidScroll', table.l.trackScrollable.pipe(
    rx.switchMap(([, scrollable]) => {
      return rx.combineLatest([
        scrollable.table.l.onValidScroll,
        scrollable.table.l.onSize.pipe(
          rx.distinctUntilChanged(([, aW, aH], [, bW, bH]) => aW === bW && aH === bH)
        ),
        scrollable.table.l.onContent.pipe(
          rx.switchMap(([, compotent]) => compotent.table.l.onSize.pipe(
            rx.distinctUntilChanged(([, aW, aH], [, bW, bH]) => aW === bW && aH === bH)
          ))
        )
      ]).pipe(
        rx.map(([[m1, sLeft, sTop], [m2, sWidth, sHeight], [m3, cWidth, cHeight]]) => {
          const scrollSpaceY = cHeight - sHeight;
          if (scrollSpaceY < Number.EPSILON)
            return;
          const scrollSpaceX = cWidth - sWidth;
          if (scrollSpaceX < Number.EPSILON)
            return;
          const vertRatio = sTop / scrollSpaceY;
          const horizRatio = sLeft / scrollSpaceX;
          s.ft.onScrollStatus(vertRatio < Number.EPSILON ? 0 : vertRatio,
            horizRatio < Number.EPSILON ? 0 : horizRatio).dp(m1, m2, m3);
        })
      );
    })
  ));

  r('trackKeypressService, keyEventServcie.onDisplayKeys, keyEventServcie.onInputCompleted',
    table.l.trackKeypressService.pipe(
      rx.switchMap(([, keypress]) => {
        return rx.merge(
          keypress.table.l.onDisplayKeys.pipe(
            rx.map(([m, text, _isCompleted, isValid]) => {
              s.ft.onKeypressStatus(text, isValid).dp(m);
            })
          ),
          keypress.s.pt.onExit.pipe(
            rx.map(([m]) => {
              s.ft.onKeypressStatus('Quit', true).dp(m);
            })
          )
        );
      })
    ));

  r('onScrollStatus', s.pt.onScrollStatus.pipe(
    rx.map(([m, v, h]) => {
      labelScrollValue1.s.ft.setContent('row: ' + Math.floor(v * 100) + '%').dp(m);
      labelScrollValue2.s.ft.setContent('col: ' + Math.floor(h * 100) + '%').dp(m);
    })
  ));
  r('onKeypressStatus', s.pt.onKeypressStatus.pipe(
    rx.map(([m, text, valid]) => {
      labelKeypress.s.ft.setContent(text).dp(m);
    })
  ));
  return statusbar;
}
