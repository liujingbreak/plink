import * as rx from 'rxjs';
import { mat4 } from 'gl-matrix';
import { SingleActionFactory, CoreOptsOfExtSmplxRctr, SimplexReactor, SimplexReactorMergeType, Action, InferMapParam, SimplexReactorOptions } from '@wfh/reactivizer';
import { TerminalCanvas, Rectangle, BackgroundStyle } from './terminal-canvas';
export interface BaseWidgetMessages {
    /** to override automatical "preferredSize" in layout calculation */
    setPreferredSize(width: number | null, height: number | null): SingleActionFactory;
    setFlexGrow(value: number): SingleActionFactory;
    onSize(width: number, height: number): SingleActionFactory;
    /** Implementation needs to handle this action */
    querySizeOf(width: number | null, height: number | null): SingleActionFactory;
    /** Be aware that an interceptor is filtering "preferredSize" action for distinctUntilChanged(), which will affect action table, some action will be skipped due to duplication */
    preferredSize(width: number, height: number): SingleActionFactory;
    /** As response to "querySizeOf" */
    prefWidthFor(width: number, constrainHeight: number): SingleActionFactory;
    /** As response to "querySizeOf" */
    prefHeightFor(constrainWidth: number, height: number): SingleActionFactory;
    overflow(yes: boolean): SingleActionFactory;
    setParent(p: TerminalContainer | null): SingleActionFactory;
    /** this message will be interceptor intercepts and skips if there is no "Rerender" action dispatched after last "render" message is handled,
     * @param relRerenderArea - Rectangle to be rerendered, the coordinate is relative to target (this) component
     */
    render(canvas: TerminalCanvas, absTransform: mat4, relRerenderArea?: Rectangle): SingleActionFactory;
    /** Implementation needed to handle this action */
    onRender(canvas: TerminalCanvas, absTransform: mat4, renderSelf: boolean, renderArea: Rectangle): SingleActionFactory;
    needRerender(need: boolean): SingleActionFactory;
    /** If following action is dispatched, the next render message must not be skipped on current widget */
    addRerenderAction(actionOrPayload$: rx.Observable<Action<any> | InferMapParam<any>>): SingleActionFactory;
}
export declare const tableForBase: readonly ["onSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow"];
export type BaseWidget = SimplexReactor<BaseWidgetMessages, typeof tableForBase>;
/** Do not prepend controller to returned service, otherwise interceptor won't work */
export declare function createBase(opts?: Partial<SimplexReactorOptions<BaseWidgetMessages, typeof tableForBase>>): SimplexReactor<BaseWidgetMessages, readonly ["onSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow"], unknown>;
export interface ContainerWidgetInput {
    addChild(...children: BaseWidget[]): SingleActionFactory;
    removeChild(...children: BaseWidget[]): SingleActionFactory;
    /** If following action is dispatched, the next render message must be handled, and relow action will be dispatched along with "render" message */
    addReflowAction(actionOrPayload$: rx.Observable<Action<any> | InferMapParam<any>>): SingleActionFactory;
    setBackground(color: BackgroundStyle | null): SingleActionFactory;
}
export interface ContainerWidgetOutput {
    renderSelf(canvas: TerminalCanvas, absTransform: mat4, renderArea: Rectangle): SingleActionFactory;
    renderChild(index: number, child: BaseWidget, canvas: TerminalCanvas, absTransform: mat4, renderArea: Rectangle): SingleActionFactory;
    allChildren(children: Array<BaseWidget>): SingleActionFactory;
    onChildError(childId: string, errInfo: readonly [err: any, label: string | null]): SingleActionFactory;
    onChildPreferredSizeChange(sizes: [w: number, h: number][]): SingleActionFactory;
    onBgChangeWithParent(color: BackgroundStyle | null | undefined): SingleActionFactory;
    setLayoutValid(isValid: boolean): SingleActionFactory;
    /** Implementation must dispatch setLayoutValid(true) */
    reflow(): SingleActionFactory;
    /** No reaction yet , preserve for future */
    renderBackgroundFor(child: BaseWidget): SingleActionFactory;
}
declare const tableFor: readonly ["allChildren", "setLayoutValid", "setBackground", "onBgChangeWithParent", "onChildPreferredSizeChange"];
export type TerminalContainer = SimplexReactorMergeType<SimplexReactor<ContainerWidgetInput & ContainerWidgetOutput, typeof tableFor>, BaseWidget>;
export declare function createContainerBase(opts?: CoreOptsOfExtSmplxRctr<BaseWidget, ContainerWidgetInput & ContainerWidgetOutput>): SimplexReactor<BaseWidgetMessages & ContainerWidgetInput & ContainerWidgetOutput, readonly ("allChildren" | "setLayoutValid" | "setBackground" | "onBgChangeWithParent" | "onChildPreferredSizeChange" | "onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow")[], SimplexReactor<BaseWidgetMessages, readonly ["onSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow"], unknown>>;
export {};
