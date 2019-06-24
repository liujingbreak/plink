import * as ts from 'typescript';
export declare function resolveImportBindName(src: ts.SourceFile, modulePath: string, propertyName: string, resolveFn?: (targetPath: string, currFile: string) => string): string | undefined | null;
/**
 * This function does not intent to be fully conform to real TS or JS module resolve logic
 * @param targetPath
 * @param currFile
 */
export declare function defaultResolveModule(targetPath: string, currFile: string): string;
