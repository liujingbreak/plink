import * as rx from 'rxjs';
import type * as material from '@material/material-color-utilities' with { 'resolution-mode': 'import' };
import { BaseWidget } from './base';
export declare function findLowestCommonAncestor(...comps: BaseWidget[]): BaseWidget | null | undefined;
export declare const materialColorUtil$: rx.ReplaySubject<typeof material>;
/**
 * @param hue 0 - 360
 * @param chroma 0 - round 120
 * @param tone 0 - 100
 */
export declare function hexColorFrom(hue: number, chroma: number, tone: number): rx.Observable<string>;
/**
 * @param hex String representing color as hex code. Accepts strings with or
 *     without leading #, and string representing the color using 3, 6, or 8
 *     hex characters
 */
export declare function hctColorFromHex(hex: string): rx.Observable<material.Hct>;
