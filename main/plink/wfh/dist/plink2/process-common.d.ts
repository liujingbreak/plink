export declare function setupTTY(screenColumns: number, screenRows: number): void;
export declare function lookupPlinkRoot(cwd: string): string | undefined;
/**
 * Simply guessing any code point that is greater than 16-bit (might be Surrogate pairs) is full-width character,
 * and code point within CJK range is also full-width
 */
export declare function isCodePointFullWidth(codePoint: number): boolean;
