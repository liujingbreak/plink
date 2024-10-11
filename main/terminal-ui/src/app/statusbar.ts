import * as rx from 'rxjs';
import {SingleActionFactory, SimplexReactorExtendType, OptionsOfSmplxRctr} from '@wfh/reactivizer';
import {FlexContainer, createFlexContainer, Scrollable, KeyEventServcie, createBorderContainer, DisplayMode, createTextWidget} from '../index';

export interface StatusbarMessages {
  trackScrollable(scrollable: Scrollable): SingleActionFactory;
  trackKeypressService(service: KeyEventServcie): SingleActionFactory;
  onScrollStatus(vertical: number | null, horizontal: number | null): SingleActionFactory;
  onKeypressStatus(text: string, isValid: boolean): SingleActionFactory;
}

const tableFor = ['trackKeypressService', 'trackScrollable'] as const;

export type Statusbar = SimplexReactorExtendType<FlexContainer, StatusbarMessages, typeof tableFor>;
export type StatusbarOptions = Partial<OptionsOfSmplxRctr<Statusbar>>;
export function createStatusbar(opts?: StatusbarOptions) {
  const container = createFlexContainer({
    ...opts as any,
    name: (opts?.name ?? 'statusbar') + '.container'
  });
  const containerWithBorder = createBorderContainer(container.asBaseType.asBaseType, {name: 'StatusBar', ...opts as any});
  const statusbar = containerWithBorder.config<StatusbarMessages, typeof tableFor>({
    tableFor
  });
  // containerWithBorder.s.ft.setBackground('bgBlue').dp();
  statusbar.s.ft.setPadding(0, 1, 0, 1).dp();
  statusbar.s.ft.setBorder('padding').dp();
  statusbar.s.ft.setFlexShrink(0).dp();
  const {r, s, table} = statusbar;
  const labelScrollText = createTextWidget('scroll', {
    ...opts as any,
    name: (opts?.name ?? 'statusbar') + '.container'
  });
  const labelScrollValue1 = createTextWidget('0%', {
    ...opts as any,
    name: (opts?.name ?? 'statusbar') + '.v1'
  });
  const labelScrollValue2 = createTextWidget('0%', {
    ...opts as any,
    name: (opts?.name ?? 'statusbar') + '.v2'
  });
  const HELP_KEY_HINT = 'Press <Enter> for help';
  const labelKeypress = createTextWidget(HELP_KEY_HINT, {
    ...opts as any,
    name: (opts?.name ?? 'statusbar') + '.key'
  });
  labelKeypress.s.ft.setFlexGrow(1).dp();

  container.s.ft.addChild(labelKeypress.b,
    labelScrollText.b,
    labelScrollValue1.b,
    labelScrollValue2.b
  ).dp();
  r('trackScrollable, scrollable.onValidScroll -> onScrollStatus', table.l.trackScrollable.pipe(
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
          const vertRatio = scrollSpaceY < Number.EPSILON ? null : 1 - (cHeight - sTop - sHeight) / scrollSpaceY;
          const scrollSpaceX = cWidth - sWidth;
          const horizRatio = scrollSpaceX < Number.EPSILON ? null : 1 - (cWidth - sLeft - sWidth) / scrollSpaceX;
          s.ft.onScrollStatus(vertRatio != null ? vertRatio < Number.EPSILON ? 0 : vertRatio : null,
            horizRatio != null ? horizRatio < Number.EPSILON ? 0 : horizRatio : null).dp(m1, m2, m3);
        })
      );
    })
  ));

  r('trackScrollable, scrollable.isScrollNeeded -> "labelScrollText"', table.l.trackScrollable.pipe(
    rx.switchMap(([, scrollable]) => scrollable.table.l.isScrollNeeded.pipe(
      rx.distinctUntilChanged(([, need0], [, need1]) => need0 === need1),
      rx.map(([m, need]) => {
        labelScrollText.s.ft.setDisplay(need ? DisplayMode.visible : DisplayMode.none).dp(m);
      })
    ))
  ));

  r('trackKeypressService, keyEventServcie.onDisplayKeys, keyEventServcie.onInputCompleted -> onKeypressStatus',
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
              s.ft.onKeypressStatus('Bye', true).dp(m);
            })
          )
        );
      })
    ));

  r('onScrollStatus', s.pt.onScrollStatus.pipe(
    rx.map(([m, v, h]) => {
      labelScrollValue1.s.ft.setContent(v != null ? 'row: ' + Math.floor(v * 100) + '%' : '').dp(m);
      labelScrollValue2.s.ft.setContent(h != null ? 'col: ' + Math.floor(h * 100) + '%' : '').dp(m);
    })
  ));
  r('onKeypressStatus', s.pt.onKeypressStatus.pipe(
    rx.map(([m, text, valid]) => {
      labelKeypress.s.ft.setContent(text.length === 0 ? HELP_KEY_HINT : text).dp(m);
      return valid;
    }),
    rx.distinctUntilChanged(),
    rx.map(valid => {
      labelKeypress.s.ft.setStyle(valid ? ['green'] : []).dp();
    })
  ));
  return statusbar;
}
