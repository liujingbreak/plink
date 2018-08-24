import * as ts from 'typescript';
import {readFileSync} from 'fs';

export function readTsConfig(tsconfigFile: string): ts.CompilerOptions {
	let tsconfig = ts.readConfigFile(tsconfigFile, (file) => readFileSync(file, 'utf-8')).config;
	return ts.parseJsonConfigFileContent(tsconfig, ts.sys, process.cwd().replace(/\\/g, '/'),
		undefined, tsconfigFile).options;
}

/**
 * Refer to https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API#transpiling-a-single-file
 * @param tsCode 
 */
export function transpileSingleTs(tsCode: string, compilerOptions: ts.CompilerOptions): string {
	let res = ts.transpileModule(tsCode, {compilerOptions});
	if (res.diagnostics && res.diagnostics.length > 0) {
		let msg = `Failed to transpile TS expression: ${tsCode}\n` + res.diagnostics.join('\n');
		console.error(msg);
		throw new Error(msg);
	}
	return res.outputText;
}
