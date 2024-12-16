import * as rx from 'rxjs';
import {SingleActionFactory, CreateOptsInDef, SimplexReactorOfFac} from '@wfh/reactivizer';
import {borderFac, createFlexContainer, Scrollable, KeyEventServcie, DisplayMode, createTextWidget} from '../index';

export interface StatusbarMessages {
  trackScrollable(scrollable: Scrollable): SingleActionFactory;
  trackKeypressService(service: KeyEventServcie): SingleActionFactory;
  onScrollStatus(vertical: number | null, horizontal: number | null): SingleActionFactory;
  onKeypressStatus(text: string, isValid: boolean): SingleActionFactory;
}
const tableFor = ['trackKeypressService', 'trackScrollable'] as const;

export type StatusbarOptions = CreateOptsInDef<StatusbarMessages, typeof borderFac>;
export const statusbarFac = borderFac.forExtend<StatusbarMessages, typeof tableFor>({
  name: 'statusbar',
  tableFor
}).defineReactor((init, opts?: StatusbarOptions) => {
  const container = createFlexContainer({
    ...opts as any,
    name: (opts?.name ?? 'statusbar') + '.container'
  });
  const statusbar = init({
    ...opts as any,
    name: (opts?.name ?? 'statusbar') + '.border'
  }, container);
  statusbar.s.ft.setPadding(0, 0, 0, 1).dp();
  statusbar.s.ft.setBorder('padding').dp();
  statusbar.s.ft.setFlexShrink(0).dp();
  const {r, s, table} = statusbar;
  const labelScrollText = createTextWidget('scroll', {
    // ...opts as any,
    name: (opts?.name ?? 'statusbar') + '.label'
  });
  const labelScrollValueR = createTextWidget('0%', {
    // ...opts as any,
    name: (opts?.name ?? 'statusbar') + '.v1'
  });
  const labelScrollValueC = createTextWidget('0%', {
    // ...opts as any,
    name: (opts?.name ?? 'statusbar') + '.v2'
  });
  const HELP_KEY_HINT = 'Press <Enter> for help';
  const labelKeypress = createTextWidget(HELP_KEY_HINT, {
    ...opts as any,
    name: (opts?.name ?? 'statusbar') + '.key'
  });
  labelKeypress.s.ft.setFlexGrow(1).dp();

  statusbar.s.ft.setBackground('bgHsl(120,50,80)').dp();
  labelKeypress.s.ft.setStyle(['hex(#000000)']).dp();
  // labelKeypress.s.ft.setBackground('bgHsl(90,50,80)').dp();
  labelScrollText.s.ft.setStyle(['hex(#000000)', 'bgHsl(90, 50, 70)']).dp();
  labelScrollValueR.s.ft.setStyle(['hex(#000000)', 'bgHsl(140, 50, 70)']).dp();
  labelScrollValueC.s.ft.setStyle(['hex(#000000)', 'bgHsl(150, 50, 70)']).dp();
  container.s.ft.setBorderSpacing(0).dp();
  container.s.ft.addChild(labelKeypress,
    labelScrollText,
    labelScrollValueR,
    labelScrollValueC
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
      labelScrollValueR.s.ft.setContent(v != null ? 'row: ' + Math.floor(v * 100) + '%' : '').dp(m);
      labelScrollValueC.s.ft.setContent(h != null ? 'col: ' + Math.floor(h * 100) + '%' : '').dp(m);
    })
  ));
  r('onKeypressStatus', s.pt.onKeypressStatus.pipe(
    rx.map(([m, text, valid]) => {
      labelKeypress.s.ft.setContent(text.length === 0 ? HELP_KEY_HINT : text).dp(m);
      return valid;
    }),
    rx.distinctUntilChanged(),
    rx.map(valid => {
      labelKeypress.s.ft.setStyle(valid ? ['green'] : ['hex(#000000)']).dp();
    })
  ));
});
export type Statusbar = SimplexReactorOfFac<typeof statusbarFac>;
export function createStatusbar(opts?: StatusbarOptions) {
  return statusbarFac.create(opts);
}
