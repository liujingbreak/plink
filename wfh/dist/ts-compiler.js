"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable no-console
const ts = tslib_1.__importStar(require("typescript"));
const fs_1 = require("fs");
function readTsConfig(tsconfigFile) {
    const tsconfig = ts.readConfigFile(tsconfigFile, (file) => fs_1.readFileSync(file, 'utf-8')).config;
    return ts.parseJsonConfigFileContent(tsconfig, ts.sys, process.cwd().replace(/\\/g, '/'), undefined, tsconfigFile).options;
}
exports.readTsConfig = readTsConfig;
/**
 * Refer to https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API#transpiling-a-single-file
 * @param tsCode
 */
function transpileSingleTs(tsCode, compilerOptions) {
    const res = ts.transpileModule(tsCode, { compilerOptions });
    if (res.diagnostics && res.diagnostics.length > 0) {
        const msg = `Failed to transpile TS expression: ${tsCode}\n` + res.diagnostics.join('\n');
        console.error(msg);
        throw new Error(msg);
    }
    return res.outputText;
}
exports.transpileSingleTs = transpileSingleTs;
// import * as fs from 'fs';
const Path = tslib_1.__importStar(require("path"));
// import {inspect} from 'util';
const chalk = require('chalk');
const { red, yellow } = chalk;
class TsCompiler {
    // currentFile: string;
    constructor(compilerOptions) {
        this.compilerOptions = compilerOptions;
        this.fileNames = [];
        this.files = {};
        this.fileContent = new Map();
        const self = this;
        const compilerHost = ts.createCompilerHost(compilerOptions);
        this.serviceHost = {
            getNewLine() { return '\n'; },
            getCompilationSettings() { return self.compilerOptions; },
            getScriptFileNames() { return self.fileNames; },
            getScriptVersion: fileName => this.files[fileName] && this.files[fileName].version.toString(),
            getScriptSnapshot: fileName => {
                if (this.fileContent.has(fileName))
                    return ts.ScriptSnapshot.fromString(this.fileContent.get(fileName));
                if (ts.sys.fileExists(fileName))
                    return ts.ScriptSnapshot.fromString(ts.sys.readFile(fileName));
                return undefined;
            },
            getCurrentDirectory: () => process.cwd(),
            getDefaultLibFileName: () => compilerHost.getDefaultLibFileName(compilerOptions),
            fileExists: ts.sys.fileExists,
            readFile(path, encode) {
                if (self.fileContent.has(path))
                    return self.fileContent.get(path);
                return compilerHost.readFile(path);
            },
            readDirectory: compilerHost.readDirectory,
            getDirectories: compilerHost.getDirectories,
            directoryExists: ts.sys.directoryExists,
            realpath: compilerHost.realpath // debuggable('realpath', compilerHost.realpath),
        };
        this.langService = ts.createLanguageService(this.serviceHost, ts.createDocumentRegistry());
    }
    compile(fileName, srcCode) {
        fileName = Path.resolve(fileName).replace(/\\/g, '/');
        this.fileContent.set(fileName, srcCode);
        this.fileNames.push(fileName);
        // this.currentFile = fileName;
        return this.emitFile(fileName);
    }
    emitFile(fileName) {
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
    logErrors(fileName, isError = false) {
        const allDiagnostics = this.langService
            .getCompilerOptionsDiagnostics()
            .concat(this.langService.getSyntacticDiagnostics(fileName))
            .concat(this.langService.getSemanticDiagnostics(fileName));
        allDiagnostics.forEach(diagnostic => {
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            if (diagnostic.file) {
                const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
                console.log((isError ? red : yellow)(`[wfh.ts-compiler] ${(isError ? 'Error' : 'Warning')} ` +
                    `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`));
            }
            else {
                console.log((isError ? red : yellow)(`[wfh.ts-compiler] ${(isError ? 'Error' : 'Warning')}: ${message}`));
            }
        });
    }
}
let singletonCompiler;
function transpileAndCheck(tsCode, filename, co) {
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
exports.transpileAndCheck = transpileAndCheck;
/**
 * Exactly like ts-node, so that we can `require()` a ts file directly without `tsc`
 * @param ext
 * @param compilerOpt
 */
function registerExtension(ext, compilerOpt) {
    const old = require.extensions[ext] || require.extensions['.js'];
    // compilerOpt.inlineSources = true;
    require.extensions[ext] = function (m, filename) {
        //   if (shouldIgnore(filename, ignore)) {
        // 	return old(m, filename);
        //   }
        const _compile = m._compile;
        m._compile = function (code, fileName) {
            const jscode = transpileAndCheck(code, fileName, compilerOpt);
            // console.log(jscode);
            return _compile.call(this, jscode, fileName);
        };
        return old(m, filename);
    };
}
exports.registerExtension = registerExtension;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy90cy1jb21waWxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw0QkFBNEI7QUFDNUIsdURBQWlDO0FBQ2pDLDJCQUFnQztBQUdoQyxTQUFnQixZQUFZLENBQUMsWUFBb0I7SUFDaEQsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLGlCQUFZLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0lBQy9GLE9BQU8sRUFBRSxDQUFDLDBCQUEwQixDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUN2RixTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ25DLENBQUM7QUFKRCxvQ0FJQztBQUVEOzs7R0FHRztBQUNILFNBQWdCLGlCQUFpQixDQUFDLE1BQWMsRUFBRSxlQUFtQztJQUNwRixNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxFQUFDLGVBQWUsRUFBQyxDQUFDLENBQUM7SUFDMUQsSUFBSSxHQUFHLENBQUMsV0FBVyxJQUFJLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUNsRCxNQUFNLEdBQUcsR0FBRyxzQ0FBc0MsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUYsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3JCO0lBQ0QsT0FBTyxHQUFHLENBQUMsVUFBVSxDQUFDO0FBQ3ZCLENB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