/**
 * @param  {[type]} text
 * @param  {object} replacements
 * @param  {number} replacements.start
 * @param  {number} replacements.end
 * @param  {string} replacements.replacement
 * @return {string}           	replaced text
 */
export interface ReplacementInf {
    start: number;
    end: number;
    text?: string;
    replacement?: string;
}
export declare class Replacement implements ReplacementInf {
    start: number;
    end: number;
    text: string;
    constructor(start: number, end: number, text: string);
}
export declare function _sortAndRemoveOverlap(replacements: ReplacementInf[], removeOverlap: boolean | undefined, text: string): void;
export declare function _replaceSorted(text: string, replacements: ReplacementInf[]): string;
export default function replaceCode(text: string, replacements: ReplacementInf[], removeOverlap?: boolean): string;
