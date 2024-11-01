import { SimplexReactorExtendType, OptionsOfSmplxRctr, SingleActionFactory, CoreOptions } from '@wfh/reactivizer';
import { BaseWidget, OffsetParent } from './base';
import { TerminalContainer } from './container';
import { TerminalCanvasOptions } from './canvas';
import { FocusService } from './focusable';
export interface ScrollActions {
    scrollTo(left: number, top: number): SingleActionFactory;
    scroll(relativeLeft: number, relativeTop: number): SingleActionFactory;
    /** Set which axis direction is allowed to be scrollabe */
    setScrollable(x: boolean, y: boolean): SingleActionFactory;
}
interface ScrollSignals extends ScrollActions {
    onContent(component: BaseWidget): SingleActionFactory;
    onValidScroll(left: number, top: number): SingleActionFactory;
    onOverflow(xOverflow: boolean, yOverflow: boolean): SingleActionFactory;
    /** true if content size is bigger than scrollable container size */
    isScrollNeeded(needed: boolean): SingleActionFactory;
}
declare const tableFor: readonly ["onValidScroll", "setScrollable", "onOverflow", "onContent", "isScrollNeeded"];
/** Scrollable is a TerminalContainer which has an offline canvas, child components will only be "render"ed
 * when they are scrolled to become visible, and they are firstly rendered to the offline canvas then will be copied
 * to outsider canvas afterward
 */
export type Scrollable = SimplexReactorExtendType<TerminalContainer, ScrollSignals, typeof tableFor>;
export interface ScrollableOptions {
    default?: CoreOptions;
    core?: Partial<OptionsOfSmplxRctr<Scrollable>>;
    canvas?: TerminalCanvasOptions;
    focusable?: Partial<OptionsOfSmplxRctr<FocusService>>;
}
export declare function createScrollable(comp: BaseWidget, opts?: ScrollableOptions): Scrollable & OffsetParent;
export {};
