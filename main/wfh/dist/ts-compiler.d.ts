import * as ts from 'typescript';
export declare function readTsConfig(tsconfigFile: string, localTypescript?: typeof ts): ts.CompilerOptions;
/**
 * call ts.parseJsonConfigFileContent()
 * @param jsonCompilerOpt
 * @param file
 * @param basePath - (tsconfig file directory)
 *  A root directory to resolve relative path entries in the config file to. e.g. outDir
 */
export declare function jsonToCompilerOptions(jsonCompilerOpt: any, file?: string, basePath?: string): ts.CompilerOptions;
/**
 * Refer to https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API#transpiling-a-single-file
 * @param tsCode
 */
export declare function transpileSingleTs(tsCode: string, compilerOptions: ts.CompilerOptions, localTypescript?: typeof ts): string;
export declare function transpileAndCheck(tsCode: string, filename: string, co: ts.CompilerOptions | string): string | undefined;
/**
 * Exactly like ts-node, so that we can `require()` a ts file directly without `tsc`
 * @param ext
 * @param compilerOpt
 */
export declare function registerExtension(ext: string, compilerOpt: ts.CompilerOptions): void;
