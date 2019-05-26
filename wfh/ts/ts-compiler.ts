// tslint:disable no-console
import * as ts from 'typescript';
import {readFileSync} from 'fs';


export function readTsConfig(tsconfigFile: string): ts.CompilerOptions {
	const tsconfig = ts.readConfigFile(tsconfigFile, (file) => readFileSync(file, 'utf-8')).config;
	return ts.parseJsonConfigFileContent(tsconfig, ts.sys, process.cwd().replace(/\\/g, '/'),
		undefined, tsconfigFile).options;
}

/**
 * Refer to https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API#transpiling-a-single-file
 * @param tsCode 
 */
export function transpileSingleTs(tsCode: string, compilerOptions: ts.CompilerOptions): string {
	const res = ts.transpileModule(tsCode, {compilerOptions});
	if (res.diagnostics && res.diagnostics.length > 0) {
		const msg = `Failed to transpile TS expression: ${tsCode}\n` + res.diagnostics.join('\n');
		console.error(msg);
		throw new Error(msg);
	}
	return res.outputText;
}

// import * as fs from 'fs';
import * as Path from 'path';
// import {inspect} from 'util';
const chalk = require('chalk');
const {red, yellow} = chalk;
class TsCompiler {
	fileNames: string[] = [];
	files: ts.MapLike<{ version: number }> = {};
	langService: ts.LanguageService;
	fileContent = new Map<string, string>();
	// currentFile: string;

	constructor(public compilerOptions: ts.CompilerOptions) {
		const self = this;
		const compilerHost = ts.createCompilerHost(compilerOptions);

		const serviceHost: ts.LanguageServiceHost = {
			getNewLine() { return '\n'; },
			getCompilationSettings() { return self.compilerOptions;},
			getScriptFileNames() {return self.fileNames;},
			getScriptVersion: fileName =>
				this.files[fileName] && this.files[fileName].version.toString(),
			getScriptSnapshot: fileName => {
				if (this.fileContent.has(fileName))
					return ts.ScriptSnapshot.fromString(this.fileContent.get(fileName));
				if (ts.sys.fileExists(fileName))
					return ts.ScriptSnapshot.fromString(ts.sys.readFile(fileName));
				return undefined;
			},
			getCurrentDirectory: () => process.cwd(),
			getDefaultLibFileName: () => compilerHost.getDefaultLibFileName	(compilerOptions),
			fileExists: ts.sys.fileExists,
			readFile(path: string, encode?: string) {
				if (self.fileContent.has(path))
					return self.fileContent.get(path);
				return compilerHost.readFile(path);
			},
			readDirectory: compilerHost.readDirectory,
			getDirectories: compilerHost.getDirectories,
			directoryExists: ts.sys.directoryExists, // debuggable('directoryExists', compilerHost.directoryExists),
			realpath: compilerHost.realpath // debuggable('realpath', compilerHost.realpath),

		};
		this.langService = ts.createLanguageService( serviceHost, ts.createDocumentRegistry());

	}

	compile(fileName: string, srcCode: string): string {
		fileName = Path.resolve(fileName).replace(/\\/g, '/');
		this.fileContent.set(fileName, srcCode);
		this.fileNames.push(fileName);
		// this.currentFile = fileName;
		return this.emitFile(fileName);
	}

	protected emitFile(fileName: string): string {
		const output = this.langService.getEmitOutput(fileName);
		this.logErrors(fileName);
		if (output.emitSkipped) {
			console.log(red(`ts-compiler - compile ${fileName} failed`));
			this.logErrors(fileName, true);
			throw new Error('Failed to compile Typescript ' + fileName);
		}
		if (output.outputFiles.length > 1) {
			throw new Error('ts-compiler - what the heck, there are more than one output files? ' +
				output.outputFiles.map(o => yellow(o.name)).join(', '));
		}
		for (const o of output.outputFiles) {
			return o.text;
		}
	  }

	protected logErrors(fileName: string, isError = false) {
		const allDiagnostics = this.langService
			.getCompilerOptionsDiagnostics()
			.concat(this.langService.getSyntacticDiagnostics(fileName))
			.concat(this.langService.getSemanticDiagnostics(fileName));

		allDiagnostics.forEach(diagnostic => {
			const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
			if (diagnostic.file) {
				const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
				console.log((isError ? red : yellow)(`[wfh.ts-compiler] ${(isError ? 'Error' : 'Warning')} ` +
					`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`));
			} else {
				console.log((isError ? red : yellow)(`[wfh.ts-compiler] ${(isError ? 'Error' : 'Warning')}: ${message}`));
			}
		});
	}
}

let singletonCompiler: TsCompiler;
export function transpileAndCheck(tsCode: string, filename: string, co: ts.CompilerOptions|string): string {
	if (typeof co === 'string') {
		co = readTsConfig(co);
	}
	co.declaration = false;
	co.declarationMap = false;
	co.inlineSourceMap = true;
	co.sourceMap = false;
	if (singletonCompiler == null)
		singletonCompiler = new TsCompiler(co);
	return singletonCompiler.compile(filename, tsCode);
}

/**
 * Exactly like ts-node, so that we can `require()` a ts file directly without `tsc`
 * @param ext 
 * @param compilerOpt 
 */
export function registerExtension(ext: string, compilerOpt: ts.CompilerOptions) {
	const old = require.extensions[ext] || require.extensions['.js'];
	// compilerOpt.inlineSources = true;
	require.extensions[ext] = function(m: any, filename) {
		//   if (shouldIgnore(filename, ignore)) {
		// 	return old(m, filename);
		//   }
		const _compile = m._compile;
		m._compile = function(code: string, fileName: string) {
			const jscode = transpileAndCheck(code, fileName, compilerOpt);
			// console.log(jscode);
			return _compile.call(this, jscode, fileName);
		};
		return old(m, filename);
	};
}

