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
import { BaseReactorFactory, ActionMeta, SingleActionFactory, SimplexReactorOfFac, CoreOptions } from '@wfh/reactivizer';
import { BaseWidget } from '../core/base.js';
/** This structure is the exported JSON structure of https://material-foundation.github.io/material-theme-builder,
* by click `+` icon button at right top corner of the screen, you can get a "export" panel, then click "export" and
* choose JSON type.
* */
export interface MaterialThemeColors {
    schemes: {
        'light'?: MaterialScheme;
        'light-medium-contrast'?: MaterialScheme;
        'light-high-contrast'?: MaterialScheme;
        'dark'?: MaterialScheme;
        'dark-medium-contrast'?: MaterialScheme;
        'dark-high-contrast'?: MaterialScheme;
    };
    palettes: {
        /** key is '0' - '100' at inteval of '5' */
        'primary': Record<string, string>;
        'secondary': Record<string, string>;
        'tertiary': Record<string, string>;
        'neutral': Record<string, string>;
        'neutral-variant': Record<string, string>;
    };
}
export interface MaterialScheme {
    primary: string;
    surfaceTint: string;
    onPrimary: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    secondary: string;
    onSecondary: string;
    secondaryContainer: string;
    onSecondaryContainer: string;
    tertiary: string;
    onTertiary: string;
    tertiaryContainer: string;
    onTertiaryContainer: string;
    error: string;
    onError: string;
    errorContainer: string;
    onErrorContainer: string;
    background: string;
    onBackground: string;
    surface: string;
    onSurface: string;
    surfaceVariant: string;
    onSurfaceVariant: string;
    outline: string;
    outlineVariant: string;
    shadow: string;
    scrim: string;
    inverseSurface: string;
    inverseOnSurface: string;
    inversePrimary: string;
    primaryFixed: string;
    onPrimaryFixed: string;
    primaryFixedDim: string;
    onPrimaryFixedVariant: string;
    secondaryFixed: string;
    onSecondaryFixed: string;
    secondaryFixedDim: string;
    onSecondaryFixedVariant: string;
    tertiaryFixed: string;
    onTertiaryFixed: string;
    tertiaryFixedDim: string;
    onTertiaryFixedVariant: string;
    surfaceDim: string;
    surfaceBright: string;
    surfaceContainerLowest: string;
    surfaceContainerLow: string;
    surfaceContainer: string;
    surfaceContainerHigh: string;
    surfaceContainerHighest: string;
}
interface ThemeInput {
    loadColors(json: MaterialThemeColors): SingleActionFactory;
    /** default is "light" */
    setScheme(schemeKey: keyof MaterialThemeColors['schemes']): SingleActionFactory;
}
export declare const colorThemeFac: BaseReactorFactory<ThemeInput, readonly ["loadColors", "setScheme"], CoreOptions<ThemeInput>, []>;
export type ColorTheme = SimplexReactorOfFac<typeof colorThemeFac>;
export type ColorThemeOpts = CoreOptions<ThemeInput>;
export declare const defaultColorTheme: import("@wfh/reactivizer").SimplexReactor<ThemeInput, readonly ["loadColors", "setScheme"]>;
export declare const CONTEXT_KEY = "__colorTheme";
/**
* The returned observable contains defaultColorTheme if current component does not have AppContext,
* if always synchronously emit ColorTheme immediately when it is subscribed, late on it keeps observing
* new changes.
**/
export declare function queryThemeForComponent(c: BaseWidget): rx.Observable<import("@wfh/reactivizer").SimplexReactor<ThemeInput, readonly ["loadColors", "setScheme"]>>;
export declare function querySchemeForComponent(c: BaseWidget): rx.Observable<readonly [MaterialScheme, ...ActionMeta[]]>;
export {};
