import { mat4 } from 'gl-matrix';
import { SingleActionFactory, SimplexReactor } from '@wfh/reactivizer';
import { TerminalCanvas } from './terminal-canvas';
/** A pristine single line text rendable unit */
export type StaticTextLabel = {
    text: string;
    displayLength: number;
    width?: number;
};
interface TwInput {
    setTransform(mat: mat4): SingleActionFactory;
    addChild(...children: (TerminalWidget | StaticTextLabel)[]): SingleActionFactory;
    removeChild(...children: (TerminalWidget | string)[]): SingleActionFactory;
    setParent(p: TerminalWidget): SingleActionFactory;
    render(canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
    setSize(width: number, height: number): SingleActionFactory;
}
interface TwOutput {
    rendered(): SingleActionFactory;
    renderChild(index: number, child: StaticTextLabel | TerminalWidget, canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
    allChildren(children: Array<TerminalWidget | StaticTextLabel>): SingleActionFactory;
    preferredSize(width: number, height: number): SingleActionFactory;
    resized(width: number, height: number): SingleActionFactory;
}
declare const tableFor: readonly ["setParent", "allChildren", "setTransform", "setSize", "preferredSize"];
export type TerminalWidget = SimplexReactor<TwInput & TwOutput, typeof tableFor>;
export declare function createWidget(): SimplexReactor<TwInput & TwOutput, readonly ["setParent", "allChildren", "setTransform", "setSize", "preferredSize"]>;
export declare function isStaticTextLabel(obj: any): obj is StaticTextLabel;
export {};
