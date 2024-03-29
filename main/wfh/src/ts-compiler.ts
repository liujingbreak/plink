/**
 * Deprecated: use main/wfh/ts/utils/tsc-util.ts instead
 */
import {readFileSync} from 'fs';
import * as Path from 'path';
import * as ts from 'typescript';
import chalk from 'chalk';
import {getLogger} from 'log4js';
import {plinkEnv} from './utils/misc';
const log = getLogger('plink.ts-compiler');

export function readTsConfig(tsconfigFile: string, localTypescript: typeof ts = ts): ts.CompilerOptions {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const tsconfig = localTypescript.readConfigFile(tsconfigFile, (file) => readFileSync(file, 'utf-8')).config;
  return localTypescript.parseJsonConfigFileContent(tsconfig, localTypescript.sys, plinkEnv.workDir.replace(/\\/g, '/'),
    undefined, tsconfigFile).options;
}

/**
 * call ts.parseJsonConfigFileContent()
 * @param jsonCompilerOpt 
 * @param file 
 * @param basePath - (tsconfig file directory) 
 *  A root directory to resolve relative path entries in the config file to. e.g. outDir
 */
export function jsonToCompilerOptions(jsonCompilerOpt: any, file = 'tsconfig.json',
  basePath = plinkEnv.workDir): ts.CompilerOptions {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  return ts.parseJsonConfigFileContent({compilerOptions: jsonCompilerOpt}, ts.sys, basePath.replace(/\\/g, '/'),
    undefined, file).options;
}

/**
 * Refer to https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API#transpiling-a-single-file
 * @param tsCode 
 */
export function transpileSingleTs(tsCode: string, compilerOptions: ts.CompilerOptions, localTypescript: typeof ts = ts): string {
  const res = localTypescript.transpileModule(tsCode, {compilerOptions});
  if (res.diagnostics && res.diagnostics.length > 0) {
    const msg = `Failed to transpile TS expression: ${tsCode}\n` + res.diagnostics.join('\n');
    console.error(msg);
    throw new Error(msg);
  }
  return res.outputText;
}

// import * as fs from 'fs';

// import {inspect} from 'util';
const {red, yellow} = chalk;
class TsCompiler {
  fileNames: string[] = [];
  files: ts.MapLike<{version: number}> = {};
  langService: ts.LanguageService;
  fileContent = new Map<string, string>();
  // currentFile: string;

  constructor(public compilerOptions: ts.CompilerOptions) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const compilerHost = ts.createCompilerHost(compilerOptions);

    const cwd = plinkEnv.workDir;
    const serviceHost: ts.LanguageServiceHost = {
      getNewLine() { return '\n'; },
      getCompilationSettings() { return self.compilerOptions; },
      getScriptFileNames() {return self.fileNames; },
      getScriptVersion: fileName =>
        this.files[fileName] && this.files[fileName].version.toString(),
      getScriptSnapshot: fileName => {
        if (this.fileContent.has(fileName))
          return ts.ScriptSnapshot.fromString(this.fileContent.get(fileName)!);
        if (ts.sys.fileExists(fileName))
          return ts.ScriptSnapshot.fromString(ts.sys.readFile(fileName)!);
        return undefined;
      },
      getCurrentDirectory: () => cwd,
      getDefaultLibFileName: () => compilerHost.getDefaultLibFileName	(compilerOptions),
      fileExists: (f: string) => {
        // console.log(f);
        return compilerHost.fileExists(f);
      },
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

  compile(fileName: string, srcCode: string): string | undefined {
    fileName = Path.resolve(fileName).replace(/\\/g, '/');
    this.fileContent.set(fileName, srcCode);
    this.fileNames.push(fileName);
    // this.currentFile = fileName;
    return this.emitFile(fileName);
  }

  protected emitFile(fileName: string): string | undefined {
    const output = this.langService.getEmitOutput(fileName);
    this.logErrors(fileName);
    if (output.emitSkipped) {
      // eslint-disable-next-line no-console
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
        const {line, character} = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
        log.info((isError ? red : yellow)(`[wfh.ts-compiler] ${(isError ? 'Error' : 'Warning')} ` +
          `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`));
      } else {
        log.info((isError ? red : yellow)(`[wfh.ts-compiler] ${(isError ? 'Error' : 'Warning')}: ${message}`));
      }
    });
  }
}

let singletonCompiler: TsCompiler;
export function transpileAndCheck(tsCode: string, filename: string, co: ts.CompilerOptions | string): string | undefined {
  if (typeof co === 'string') {
    co = readTsConfig(co);
  }
  co.declaration = false;
  co.declarationMap = false;
  // co.inlineSourceMap = true;
  // co.sourceMap = true;
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
  compilerOpt.inlineSourceMap = false;
  compilerOpt.inlineSources = false;
  require.extensions[ext] = function(m: any, filename) {

    const _compile = m._compile;
    m._compile = function(code: string, fileName: string) {
      const jscode = transpileAndCheck(code, fileName, compilerOpt);
      // console.log(jscode);
      return _compile.call(this, jscode, fileName);
    };
    return old(m, filename);
  };
}

// export function testCompiler(file: string) {
//   const fs = require('fs');
//   console.log(file);
//   const compilerOpt = {
//     baseUrl: '.',
//     outDir: '',
//     declaration: true,
//     module: 'commonjs',
//     target: 'es2015',
//     noImplicitAny: true,
//     suppressImplicitAnyIndexErrors: true,
//     allowSyntheticDefaultImports: true,
//     esModuleInterop: true,
//     inlineSourceMap: false,
//     inlineSources: true,
//     moduleResolution: 'node',
//     experimentalDecorators: true,
//     emitDecoratorMetadata: true,
//     noUnusedLocals: true,
//     preserveSymlinks: false,
//     downlevelIteration: false,
//     strictNullChecks: true,
//     resolveJsonModule: true,
//     diagnostics: true,
//     lib: [ 'es2016', 'es2015', 'dom' ],
//     pretty: true,
//     rootDir: '..',
//     importHelpers: true,
//     skipLibCheck: true,
//     sourceMap: true,
//     emitDeclarationOnly: false,
//     paths: {
//       '*': [
//         '../node_modules/@types/*',
//         'node_modules/@types/*',
//         'node_modules/*',
//         '../node_modules/*'
//       ]
//     },
//     typeRoots: [
//       '/Users/liujing/bk/mytool/node_modules/@types'
//       //'./node_modules/@types', '../node_modules/@types'
//     ]
//   };

//   const co = jsonToCompilerOptions(compilerOpt);
//   transpileAndCheck(fs.readFileSync(file, 'utf8'), file, co);
// }
