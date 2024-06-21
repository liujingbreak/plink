import { mat4 } from 'gl-matrix';
import { SingleActionFactory, SimplexReactor, SimplexReactorMergeType, TableOf, ActionsOf } from '@wfh/reactivizer';
import { TerminalCanvas } from './terminal-canvas';
export interface BaseWidgetActions {
    setSize(width: number, height: number): SingleActionFactory;
    querySizeOf(width: number | null, height: number | null): SingleActionFactory;
    preferredSize(width: number, height: number): SingleActionFactory;
    /** As response to "querySizeOf" */
    prefWidthFor(width: number, constrainHeight: number): SingleActionFactory;
    /** As response to "querySizeOf" */
    prefHeightFor(constrainWidth: number, height: number): SingleActionFactory;
    overflow(yes: boolean): SingleActionFactory;
    setParent(p: TerminalWidget | null): SingleActionFactory;
    render(canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
}
declare const tableForBase: readonly ["setSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent"];
export type BaseWidget = SimplexReactor<BaseWidgetActions, typeof tableForBase>;
export declare const applyBase: <I2, LI2 extends readonly (keyof I2)[]>(targetService: SimplexReactor<I2, LI2>) => SimplexReactor<BaseWidgetActions & I2, (("setSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent") | LI2[number])[]>;
export interface ContainerWidgetInput {
    addChild<I extends BaseWidgetActions, L extends typeof tableForBase>(...children: SimplexReactor<I, L>[]): SingleActionFactory;
    removeChild<I extends ActionsOf<BaseWidget>, L extends TableOf<BaseWidget>>(...children: SimplexReactor<I, L>[]): SingleActionFactory;
}
export interface ContainerWidgetOutput {
    renderSelf(canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
    renderChild(index: number, child: BaseWidget, canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
    allChildren(children: Array<BaseWidget>): SingleActionFactory;
}
declare const tableFor: readonly ["allChildren"];
export type TerminalWidget = SimplexReactorMergeType<SimplexReactor<ContainerWidgetInput & ContainerWidgetOutput, typeof tableFor>, BaseWidget>;
export declare function createWidget(): SimplexReactor<BaseWidgetActions & ContainerWidgetInput & ContainerWidgetOutput, ("setSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "allChildren")[]>;
export {};
