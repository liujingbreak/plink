import * as rx from 'rxjs';
import {SingleActionFactory, CoreOptions} from '@wfh/reactivizer';
import {createFlexContainer, Scrollable, KeyEventServcie, createTextWidget} from '../index';

export interface StatusbarMessages {
  trackScrollable(scrollable: Scrollable): SingleActionFactory;
  trackKeypressService(service: KeyEventServcie): SingleActionFactory;

  onScrollStatus(vertical: number, horizontal: number): SingleActionFactory;
  onKeypressStatus(text: string): SingleActionFactory;
}

const tableFor = ['trackKeypressService', 'trackScrollable'] as const;

export function createStatusbar(opts?: CoreOptions<StatusbarMessages>) {
  const container = createFlexContainer(opts as any);
  const statusbar = container.config<StatusbarMessages, typeof tableFor>({
    tableFor
  });
  const {r, s, table} = statusbar;
  const labelScrollText = createTextWidget('scroll:');
  const labelScrollValue1 = createTextWidget('');
  const labelScrollValue2 = createTextWidget('');
  const labelKeypress = createTextWidget('');

  s.ft.addChild(labelScrollText.asBaseType,
    labelScrollValue1.asBaseType,
    labelScrollValue2.asBaseType,
    labelKeypress.asBaseType).dp();
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
          const vertRatio = sTop / (cHeight - sHeight);
          const horizRatio = sLeft / (cWidth - sWidth);
          s.ft.onScrollStatus(vertRatio, horizRatio).dp(m1, m2, m3);
        })
      );
    })
  ));

  r('trackKeypressService, keyEventServcie.onDisplayKeys, keyEventServcie.onInputCompleted',
    table.l.trackKeypressService.pipe(
      rx.switchMap(([, keypress]) => {
        return keypress.table.l.onDisplayKeys.pipe(
          rx.map(([m, text]) => {
            s.ft.onKeypressStatus(text).dp(m);
          })
        );
      })
    ));

  r('onScrollStatus', s.pt.onScrollStatus.pipe(
    rx.map(([m, v, h]) => {
      labelScrollValue1.s.ft.setContent('row: ' + Math.floor(v * 100)).dp(m);
      labelScrollValue2.s.ft.setContent('col: ' + Math.floor(h * 100)).dp(m);
    })
  ));
  return statusbar;
}
