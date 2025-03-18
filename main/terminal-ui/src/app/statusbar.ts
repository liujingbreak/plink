import * as rx from 'rxjs';
import {SingleActionFactory, CreateOptsInDef, SimplexReactorOfFac} from '@wfh/reactivizer';
import {borderFac, createFlexContainer, Scrollable, KeyEventServcie,
  DisplayMode, createTextWidget, TextStyle, querySchemeForComponent} from '../index';
import {textFac} from '../hoc/text';

export interface StatusbarInput {
  setMessage(text: string, style?: TextStyle): SingleActionFactory;
}
export interface StatusbarTheme {
  /** default is MaterialScheme['surfaceContainer'] */
  setBgSurfaceColor(color: string) : SingleActionFactory;
  /** defautlt is MaterialScheme['onSurface'] */
  setBgOnSurfaceColor(color: string): SingleActionFactory;
}
export interface StatusbarMessages extends StatusbarInput, StatusbarTheme {
  trackScrollable(scrollable: Scrollable): SingleActionFactory;
  trackKeypressService(service: KeyEventServcie): SingleActionFactory;
  onScrollStatus(vertical: number | null, horizontal: number | null): SingleActionFactory;
  onKeypressStatus(text: string, isValid: boolean): SingleActionFactory;
}
const tableFor = ['trackKeypressService', 'trackScrollable', 'setMessage',
  'setBgOnSurfaceColor', 'setBgSurfaceColor'] as const;

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
  statusbar.ft.setPadding(0, 0, 0, 1).dp();
  statusbar.ft.setBorder('none').dp();
  statusbar.ft.setFlexShrink(0).dp();
  const {r, pt, ft, latest} = statusbar;
  const labelScrollText = textFac.create('scroll', {
    // ...opts as any,
    name: (opts?.name ?? 'statusbar') + '.label'
  });
  const labelScrollValueR = textFac.create('0%', {
    // ...opts as any,
    name: (opts?.name ?? 'statusbar') + '.v1'
  });
  const labelScrollValueC = textFac.create('0%', {
    // ...opts as any,
    name: (opts?.name ?? 'statusbar') + '.v2'
  });
  const HELP_KEY_HINT = 'Press <Enter> for help';
  const labelKeypress = createTextWidget(HELP_KEY_HINT, {
    ...opts as any,
    name: (opts?.name ?? 'statusbar') + '.key'
  });

  const customizedMsg = createTextWidget('', {
    name: statusbar.s.logPrefix + '.msg', debug: opts?.debug, log: opts?.log
  });
  customizedMsg.ft.setFlexGrow(1).dp();
  container.ft.setBorderSpacing(0).dp();
  container.ft.addChild(
    labelKeypress,
    customizedMsg,
    labelScrollText,
    labelScrollValueR,
    labelScrollValueC
  ).dp();
  r('trackScrollable, scrollable.onValidScroll -> onScrollStatus', latest.trackScrollable.pipe(
    rx.switchMap(([, scrollable]) => {
      return rx.combineLatest([
        scrollable.latest.onValidScroll,
        scrollable.latest.onSize.pipe(
          rx.distinctUntilChanged(([, aW, aH], [, bW, bH]) => aW === bW && aH === bH)
        ),
        scrollable.latest.onContent.pipe(
          rx.switchMap(([, compotent]) => compotent.latest.onSize.pipe(
            rx.distinctUntilChanged(([, aW, aH], [, bW, bH]) => aW === bW && aH === bH)
          ))
        )
      ]).pipe(
        rx.map(([[m1, sLeft, sTop], [m2, sWidth, sHeight], [m3, cWidth, cHeight]]) => {
          const scrollSpaceY = cHeight - sHeight;
          const vertRatio = scrollSpaceY < Number.EPSILON ? null : 1 - (cHeight - sTop - sHeight) / scrollSpaceY;
          const scrollSpaceX = cWidth - sWidth;
          const horizRatio = scrollSpaceX < Number.EPSILON ? null : 1 - (cWidth - sLeft - sWidth) / scrollSpaceX;
          ft.onScrollStatus(vertRatio != null ? vertRatio < Number.EPSILON ? 0 : vertRatio : null,
            horizRatio != null ? horizRatio < Number.EPSILON ? 0 : horizRatio : null).dp(m1, m2, m3);
        })
      );
    })
  ));

  r('trackScrollable, scrollable.isScrollNeeded -> "labelScrollText"', latest.trackScrollable.pipe(
    rx.switchMap(([, scrollable]) => scrollable.latest.isScrollNeeded.pipe(
      rx.distinctUntilChanged(([, need0], [, need1]) => need0 === need1),
      rx.map(([m, need]) => {
        labelScrollText.ft.setDisplay(need ? DisplayMode.visible : DisplayMode.none).dp(m);
      })
    ))
  ));

  r('trackKeypressService, keyEventServcie.onDisplayKeys, keyEventServcie.onInputCompleted -> onKeypressStatus',
    latest.trackKeypressService.pipe(
      rx.switchMap(([, keypress]) => {
        return rx.merge(
          keypress.latest.onDisplayKeys.pipe(
            rx.map(([m, text, _isCompleted, isValid]) => {
              ft.onKeypressStatus(text, isValid).dp(m);
            })
          ),
          keypress.pt.onExit.pipe(
            rx.map(([m]) => {
              ft.onKeypressStatus('Bye', true).dp(m);
            })
          )
        );
      })
    ));

  r('onScrollStatus', pt.onScrollStatus.pipe(
    rx.map(([m, v, h]) => {
      labelScrollValueR.ft.setContent(v != null ? ' row: ' + Math.floor(v * 100) + '%' : '').dp(m);
      labelScrollValueC.ft.setContent(h != null ? ' col: ' + Math.floor(h * 100) + '%' : '').dp(m);
    })
  ));
  const colors$ = querySchemeForComponent(statusbar);
  r('onKeypressStatus', pt.onKeypressStatus.pipe(
    rx.map(([m, text, valid]) => {
      labelKeypress.ft.setContent(text.length === 0 ? HELP_KEY_HINT : text).dp(m);
      return valid;
    }),
    rx.distinctUntilChanged(),
    rx.withLatestFrom(colors$),
    rx.map(([valid, [colors]]) => {
      labelKeypress.ft.setStyle(
        valid ?
          [`hex(${colors.onPrimary})`] :
          [`hex(${colors.onPrimaryContainer})`]
      ).dp();
      statusbar.ft.setBackground(
        valid ?
          `bgHex(${colors.primary})` :
          `bgHex(${colors.primaryContainer})`
      ).dp();
    })
  ));
  r('setMessage', latest.setMessage.pipe(
    rx.map(([m, t]) => customizedMsg.ft.setContent(t).dp(m))
  ));
  r('"theming"', colors$.pipe(
    rx.map(([colors, m1, m2]) => {
      statusbar.ft.setBackground(`bgHex(${colors.primary})`).dp(m1, m2);
      labelKeypress.ft.setStyle([`hex(${colors.onPrimary})`]).dp(m1, m2);
      labelScrollText.ft.setForeground([`hex(${colors.onSecondary})`]).dp(m1, m2);
      labelScrollText.ft.setBackground(`bgHex(${colors.secondary})`).dp(m1, m2);
      labelScrollValueR.ft.setBackground(`bgHex(${colors.secondaryContainer})`).dp(m1, m2);
      labelScrollValueR.ft.setForeground([`hex(${colors.onSecondaryContainer})`]).dp(m1, m2);
      labelScrollValueC.ft.setBackground(`bgHex(${colors.tertiaryContainer})`).dp(m1, m2);
      labelScrollValueC.ft.setForeground([`hex(${colors.onTertiaryContainer})`]).dp(m1, m2);
    })
  ));
  labelScrollText.ft.setPadding(0, 1, 0, 1).dp();
});
export type Statusbar = SimplexReactorOfFac<typeof statusbarFac>;
export function createStatusbar(opts?: StatusbarOptions) {
  return statusbarFac.create(opts);
}
