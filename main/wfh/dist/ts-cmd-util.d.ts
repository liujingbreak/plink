import _ts from 'typescript';
import { CompilerOptions as RequiredCompilerOptions } from './package-mgr/package-list-helper';
export { RequiredCompilerOptions };
/**
 *
 * @param ts
 * @param fromTsconfigFile
 * @param mergeToTsconfigDir
 * @param mergeTo
 * @return json of fromTsconfigFile
 */
export declare function mergeBaseUrlAndPaths(ts: typeof _ts, fromTsconfigFile: string, mergeToTsconfigDir: string, mergeTo: RequiredCompilerOptions): {
    compilerOptions: RequiredCompilerOptions;
};
/**
 * typescript's parseConfigFileTextToJson() does not read "extends" property, I have to write my own implementation
 * @param ts
 * @param file
 */
export declare function parseConfigFileToJson(ts: typeof _ts, file: string): {
    compilerOptions: RequiredCompilerOptions;
    extends?: string | undefined;
};
