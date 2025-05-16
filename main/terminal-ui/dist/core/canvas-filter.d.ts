import { SingleActionFactory, SimplexReactor } from '@wfh/reactivizer';
import { TextStyle } from './canvas.js';
export interface CanvasFilterInput {
    onRenderForFilter(x: number, y: number, units: number[], style: TextStyle): SingleActionFactory;
    /** a needClear related to this message must be dispathed synchronously as response,
     * otherwise will block process */
    onClearForFilter(x: number, y: number, width: number): SingleActionFactory;
}
export interface CanvasFilterOutput {
    /** message must be related to TerminalCanvas.addRenderFilter, otherwise canvas will ignore this message */
    renderBypassFilter(x: number, y: number, units: number[], style: TextStyle): SingleActionFactory;
    /** In context of onClearForFilter */
    allowClear(need: boolean): SingleActionFactory;
}
export type CanvasFilter = SimplexReactor<CanvasFilterInput & CanvasFilterOutput>;
