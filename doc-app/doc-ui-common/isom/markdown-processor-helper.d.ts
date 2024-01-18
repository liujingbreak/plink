import type { DefaultTreeAdapterMap } from 'parse5';
import { TOC } from '../isom/md-types';
export type ChildNode = DefaultTreeAdapterMap['childNode'];
export type Element = DefaultTreeAdapterMap['element'];
export type TextNode = DefaultTreeAdapterMap['textNode'];
export declare function lookupTextNodeIn(el: Element): string;
export declare function createTocTree(input: TOC[]): TOC[];
