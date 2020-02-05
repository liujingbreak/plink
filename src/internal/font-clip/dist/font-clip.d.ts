/// <reference path="fonteditor-core.d.ts" />
import { CreateOpt } from 'fonteditor-core';
export declare function convert(str: string): string;
/**
 * clip and minimize font file to only contain specific character subset and cnverto woff2
 * @param source source file
 * @param clipChars subset
 */
export declare function clipToWoff2(source: string, destDir: string, toFormats?: CreateOpt['type'][], clipChars?: string | null): Promise<void[]>;
export declare function example(subset?: string): Promise<void[][]>;
export declare function notoSans(subset?: string): Promise<void[][]>;
/**
 * https://www.qqxiuzi.cn/zh/hanzi-unicode-bianma.php
 * @param code
 */
