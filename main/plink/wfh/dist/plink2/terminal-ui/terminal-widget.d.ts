import * as rx from 'rxjs';
import { mat4 } from 'gl-matrix';
import { SingleActionFactory, SimplexReactor, SimplexReactorMergeType, TableOf, ActionsOf, Action, InferMapParam } from '@wfh/reactivizer';
import { TerminalCanvas, BackgroundStyle } from './terminal-canvas';
export interface BaseWidgetActions {
    setSize(width: number, height: number): SingleActionFactory;
    /** Implementation needs to handle this action */
    querySizeOf(width: number | null, height: number | null): SingleActionFactory;
    preferredSize(width: number, height: number): SingleActionFactory;
    /** As response to "querySizeOf" */
    prefWidthFor(width: number, constrainHeight: number): SingleActionFactory;
    /** As response to "querySizeOf" */
    prefHeightFor(constrainWidth: number, height: number): SingleActionFactory;
    overflow(yes: boolean): SingleActionFactory;
    setParent(p: TerminalContainer | null): SingleActionFactory;
    /** this message will be interceptor intercepts and skips if there is no "Rerender" action dispatched after last "render" message is handled */
    render(canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
    onRender(canvas: TerminalCanvas, absTransform: mat4, renderSelf: boolean): SingleActionFactory;
    needRerender(need: boolean): SingleActionFactory;
    /** If following action is dispatched, the next render message must not be skipped on current widget */
    addRerenderAction(actionOrPayload$: rx.Observable<Action<any> | InferMapParam<any>>): SingleActionFactory;
}
export declare const tableForBase: readonly ["setSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender"];
export type BaseWidget = SimplexReactor<BaseWidgetActions, typeof tableForBase>;
/** Do not prepend controller to returned service, otherwise interceptor won't work */
export declare function createBase(): SimplexReactor<BaseWidgetActions, readonly ["setSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender"]>;
export interface ContainerWidgetInput {
    addChild<I extends BaseWidgetActions, L extends typeof tableForBase>(...children: SimplexReactor<I, L>[]): SingleActionFactory;
    removeChild<I extends ActionsOf<BaseWidget>, L extends TableOf<BaseWidget>>(...children: SimplexReactor<I, L>[]): SingleActionFactory;
    /** If following action is dispatched, the next render message must be handled, and relow action will be dispatched along with "render" message */
    addReflowAction(actionOrPayload$: rx.Observable<Action<any> | InferMapParam<any>>): SingleActionFactory;
    setBackground(color: BackgroundStyle | null): SingleActionFactory;
}
export interface ContainerWidgetOutput {
    renderSelf(canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
    renderChild(index: number, child: BaseWidget, canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
    allChildren(children: Array<BaseWidget>): SingleActionFactory;
    onChildError(childId: string, errInfo: readonly [err: any, label: string | null]): SingleActionFactory;
    onChildPreferredSizeChange(sizes: [w: number, h: number][]): SingleActionFactory;
    setLayoutValid(isValid: boolean): SingleActionFactory;
    /** Implementation must dispatch setLayoutValid(true) */
    reflow(): SingleActionFactory;
    /** Child should dispatch this action */
    renderBackgroundFor(child: BaseWidget): SingleActionFactory;
}
declare const tableFor: readonly ["allChildren", "setLayoutValid", "setBackground", "onChildPreferredSizeChange"];
export type TerminalContainer = SimplexReactorMergeType<SimplexReactor<ContainerWidgetInput & ContainerWidgetOutput, typeof tableFor>, BaseWidget>;
export declare function createContainerBase(): SimplexReactor<BaseWidgetActions & ContainerWidgetInput & ContainerWidgetOutput, ("setSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "allChildren" | "setLayoutValid" | "setBackground" | "onChildPreferredSizeChange")[]>;
export {};
