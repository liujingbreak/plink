/**
 * Before you get start to configure color theme, you can get some knowledge of Google Material color system
 *
 * Color roles:
 * https://m3.material.io/styles/color/roles
 *
 * Online Material theme builder
 * https://material-foundation.github.io/material-theme-builder
 *
 * Material components (web) docs
 * https://github.com/material-components/material-web/blob/main/docs
 *
 * Material color utilities library:
 * https://github.com/material-foundation/material-color-utilities/tree/main/typescript
 *
 * `npm i @material/material-color-utilities`
 */
import * as rx from 'rxjs';
import { BaseReactorFactory } from '@wfh/reactivizer';
import defaultThemeJson from '../../res/default-theme.json' with { type: 'json' };
const tableFor = ['loadColors', 'setScheme'];
export const colorThemeFac = new BaseReactorFactory({
    name: 'theme',
    tableFor
}).defineReactor((init, opts) => {
    const service = init(opts);
    const { ft } = service;
    ft.loadColors(defaultThemeJson).dp();
    ft.setScheme('light').dp();
});
export const defaultColorTheme = colorThemeFac.create();
export const CONTEXT_KEY = '__colorTheme';
/**
* The returned observable contains defaultColorTheme if current component does not have AppContext,
* if always synchronously emit ColorTheme immediately when it is subscribed, late on it keeps observing
* new changes.
**/
export function queryThemeForComponent(c) {
    const ctx$ = c.ft.queryContext(CONTEXT_KEY).od(c.pt.onContextChange).pipe(rx.filter(([, , v]) => v != null), rx.map(([, , v]) => v), rx.share());
    return rx.concat(rx.merge(ctx$, rx.of(defaultColorTheme)).pipe(rx.take(1)), ctx$);
}
export function querySchemeForComponent(c) {
    return queryThemeForComponent(c).pipe(rx.switchMap(theme => rx.combineLatest([
        theme.latest.setScheme,
        theme.latest.loadColors
    ]).pipe(rx.map(([[m, key], [m2, colors]]) => [colors.schemes[key], m, m2]), rx.filter(([v]) => v != null))), rx.share());
}
//# sourceMappingURL=color-theme.js.map