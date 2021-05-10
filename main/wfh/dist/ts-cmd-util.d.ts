import _ts from 'typescript';
import { CompilerOptions as RequiredCompilerOptions } from './package-mgr/package-list-helper';
export { RequiredCompilerOptions };
export declare function mergeBaseUrlAndPaths(ts: typeof _ts, fromTsconfigFile: string, mergeToTsconfigDir: string, mergeTo: RequiredCompilerOptions): void;
