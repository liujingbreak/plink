import * as rx from 'rxjs';
import { DefaultTreeAdapterMap } from 'parse5';
import { TOC } from '../isom/types';
export type ChildNode = DefaultTreeAdapterMap['childNode'];
export type Element = DefaultTreeAdapterMap['element'];
export type TextNode = DefaultTreeAdapterMap['textNode'];
export declare function lookupTextNodeIn(el: Element): string;
export declare function createTocTree(input: TOC[]): TOC[];
export declare function elementByTagName(html: string, elementTagName: string): rx.Observable<Element>;
