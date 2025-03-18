import * as rx from 'rxjs';
import { CoreOptions, SingleActionFactory, SimplexReactor, ActionMeta } from '@wfh/reactivizer';
import { BaseWidget, ScrollableOptions, TerminalCanvasOpts, ElevatorOptions, FlexContainer, FlexContainerOpts, KeyEventOptions, TerminalCanvas, KeyEventServcie, app } from '../index';
import { ColorTheme, ColorThemeOpts } from './color-theme';
import { StatusbarOptions } from './statusbar';
export interface AppActions {
    setFullScreenMode(): SingleActionFactory;
    /** If width or height is larger than the number of available columens and rows,
    * it is same effect as "setFullScreenMode" */
    setSize(width: number, height: number): SingleActionFactory;
    showPopup(component: BaseWidget): SingleActionFactory;
}
export interface AppSignals extends AppActions {
    /** In context of "showPopup" action */
    onExit(): SingleActionFactory;
    onPopup(component: BaseWidget): SingleActionFactory;
    onHelp(helper: FlexContainer): SingleActionFactory;
    onReady(context: AppContext): SingleActionFactory;
}
export interface AppOptions {
    default?: Pick<CoreOptions<AppSignals>, 'debug' | 'log'>;
    core?: CoreOptions<AppSignals>;
    statusbar?: StatusbarOptions;
    keyService?: KeyEventOptions;
    scrollable?: ScrollableOptions;
    elevator?: ElevatorOptions;
    canvas?: TerminalCanvasOpts;
    cover?: FlexContainerOpts;
    main?: FlexContainerOpts;
    colorTheme?: ColorThemeOpts;
}
export interface AppContext {
    canvas: TerminalCanvas;
    main: BaseWidget;
    app: SimplexReactor<AppSignals>;
    keyEventService: KeyEventServcie;
    statusbar: app.Statusbar;
    colorTheme: ColorTheme;
}
export declare function createApp(mainComponent: BaseWidget, canScroll?: boolean, opts?: AppOptions): SimplexReactor<app.AppSignals, readonly ["onReady"]>;
export declare function queryAppContext(currComp: BaseWidget, m?: ActionMeta): rx.Observable<app.AppContext>;
