import * as materialUtils from '@material/material-color-utilities';
import { BaseWidget } from './base.js';
export declare function findLowestCommonAncestor(...comps: BaseWidget[]): BaseWidget | null | undefined;
/**
 * @param hue 0 - 360
 * @param chroma 0 - round 120
 * @param tone 0 - 100
 */
export declare function hexColorFrom(hue: number, chroma: number, tone: number): string;
/**
 * @param hex String representing color as hex code. Accepts strings with or
 *     without leading #, and string representing the color using 3, 6, or 8
 *     hex characters
 */
export declare function hctColorFromHex(hex: string): materialUtils.Hct;
