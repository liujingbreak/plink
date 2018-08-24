import * as ts from 'typescript';
export declare function readTsConfig(tsconfigFile: string): ts.CompilerOptions;
/**
 * Refer to https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API#transpiling-a-single-file
 * @param tsCode
 */
export declare function transpileSingleTs(tsCode: string, compilerOptions: ts.CompilerOptions): string;
