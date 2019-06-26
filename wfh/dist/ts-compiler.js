"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable no-console
const ts = __importStar(require("typescript"));
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
const Path = __importStar(require("path"));
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
        const serviceHost = {
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
        this.langService = ts.createLanguageService(serviceHost, ts.createDocumentRegistry());
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy90cy1jb21waWxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIsK0NBQWlDO0FBQ2pDLDJCQUFnQztBQUdoQyxTQUFnQixZQUFZLENBQUMsWUFBb0I7SUFDaEQsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLGlCQUFZLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0lBQy9GLE9BQU8sRUFBRSxDQUFDLDBCQUEwQixDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUN2RixTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ25DLENBQUM7QUFKRCxvQ0FJQztBQUVEOzs7R0FHRztBQUNILFNBQWdCLGlCQUFpQixDQUFDLE1BQWMsRUFBRSxlQUFtQztJQUNwRixNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxFQUFDLGVBQWUsRUFBQyxDQUFDLENBQUM7SUFDMUQsSUFBSSxHQUFHLENBQUMsV0FBVyxJQUFJLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUNsRCxNQUFNLEdBQUcsR0FBRyxzQ0FBc0MsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUYsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3JCO0lBQ0QsT0FBTyxHQUFHLENBQUMsVUFBVSxDQUFDO0FB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LE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUM5QyxDQUFDLENBQUM7UUFDRixPQUFPLEdBQUcsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDekIsQ0FBQyxDQUFDO0FBQ0gsQ0FBQztBQWZELDhDQWVDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbm8tY29uc29sZVxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge3JlYWRGaWxlU3luY30gZnJvbSAnZnMnO1xuXG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkVHNDb25maWcodHNjb25maWdGaWxlOiBzdHJpbmcpOiB0cy5Db21waWxlck9wdGlvbnMge1xuXHRjb25zdCB0c2NvbmZpZyA9IHRzLnJlYWRDb25maWdGaWxlKHRzY29uZmlnRmlsZSwgKGZpbGUpID0+IHJlYWRGaWxlU3luYyhmaWxlLCAndXRmLTgnKSkuY29uZmlnO1xuXHRyZXR1cm4gdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQodHNjb25maWcsIHRzLnN5cywgcHJvY2Vzcy5jd2QoKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG5cdFx0dW5kZWZpbmVkLCB0c2NvbmZpZ0ZpbGUpLm9wdGlvbnM7XG59XG5cbi8qKlxuICogUmVmZXIgdG8gaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L3dpa2kvVXNpbmctdGhlLUNvbXBpbGVyLUFQSSN0cmFuc3BpbGluZy1hLXNpbmdsZS1maWxlXG4gKiBAcGFyYW0gdHNDb2RlIFxuICovXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNwaWxlU2luZ2xlVHModHNDb2RlOiBzdHJpbmcsIGNvbXBpbGVyT3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKTogc3RyaW5nIHtcblx0Y29uc3QgcmVzID0gdHMudHJhbnNwaWxlTW9kdWxlKHRzQ29kZSwge2NvbXBpbGVyT3B0aW9uc30pO1xuXHRpZiAocmVzLmRpYWdub3N0aWNzICYmIHJlcy5kaWFnbm9zdGljcy5sZW5ndGggPiAwKSB7XG5cdFx0Y29uc3QgbXNnID0gYEZhaWxlZCB0byB0cmFuc3BpbGUgVFMgZXhwcmVzc2lvbjogJHt0c0NvZGV9XFxuYCArIHJlcy5kaWFnbm9zdGljcy5qb2luKCdcXG4nKTtcblx0XHRjb25zb2xlLmVycm9yKG1zZyk7XG5cdFx0dGhyb3cgbmV3IEVycm9yKG1zZyk7XG5cdH1cblx0cmV0dXJuIHJlcy5vdXRwdXRUZXh0O1xufVxuXG4vLyBpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0IHtpbnNwZWN0fSBmcm9tICd1dGlsJztcbmNvbnN0IGNoYWxrID0gcmVxdWlyZSgnY2hhbGsnKTtcbmNvbnN0IHtyZWQsIHllbGxvd30gPSBjaGFsaztcbmNsYXNzIFRzQ29tcGlsZXIge1xuXHRmaWxlTmFtZXM6IHN0cmluZ1tdID0gW107XG5cdGZpbGVzOiB0cy5NYXBMaWtlPHsgdmVyc2lvbjogbnVtYmVyIH0+ID0ge307XG5cdGxhbmdTZXJ2aWNlOiB0cy5MYW5ndWFnZVNlcnZpY2U7XG5cdGZpbGVDb250ZW50ID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcblx0Ly8gY3VycmVudEZpbGU6IHN0cmluZztcblxuXHRjb25zdHJ1Y3RvcihwdWJsaWMgY29tcGlsZXJPcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpIHtcblx0XHRjb25zdCBzZWxmID0gdGhpcztcblx0XHRjb25zdCBjb21waWxlckhvc3QgPSB0cy5jcmVhdGVDb21waWxlckhvc3QoY29tcGlsZXJPcHRpb25zKTtcblxuXHRcdGNvbnN0IHNlcnZpY2VIb3N0OiB0cy5MYW5ndWFnZVNlcnZpY2VIb3N0ID0ge1xuXHRcdFx0Z2V0TmV3TGluZSgpIHsgcmV0dXJuICdcXG4nOyB9LFxuXHRcdFx0Z2V0Q29tcGlsYXRpb25TZXR0aW5ncygpIHsgcmV0dXJuIHNlbGYuY29tcGlsZXJPcHRpb25zO30sXG5cdFx0XHRnZXRTY3JpcHRGaWxlTmFtZXMoKSB7cmV0dXJuIHNlbGYuZmlsZU5hbWVzO30sXG5cdFx0XHRnZXRTY3JpcHRWZXJzaW9uOiBmaWxlTmFtZSA9PlxuXHRcdFx0XHR0aGlzLmZpbGVzW2ZpbGVOYW1lXSAmJiB0aGlzLmZpbGVzW2ZpbGVOYW1lXS52ZXJzaW9uLnRvU3RyaW5nKCksXG5cdFx0XHRnZXRTY3JpcHRTbmFwc2hvdDogZmlsZU5hbWUgPT4ge1xuXHRcdFx0XHRpZiAodGhpcy5maWxlQ29udGVudC5oYXMoZmlsZU5hbWUpKVxuXHRcdFx0XHRcdHJldHVybiB0cy5TY3JpcHRTbmFwc2hvdC5mcm9tU3RyaW5nKHRoaXMuZmlsZUNvbnRlbnQuZ2V0KGZpbGVOYW1lKSEpO1xuXHRcdFx0XHRpZiAodHMuc3lzLmZpbGVFeGlzdHMoZmlsZU5hbWUpKVxuXHRcdFx0XHRcdHJldHVybiB0cy5TY3JpcHRTbmFwc2hvdC5mcm9tU3RyaW5nKHRzLnN5cy5yZWFkRmlsZShmaWxlTmFtZSkhKTtcblx0XHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdH0sXG5cdFx0XHRnZXRDdXJyZW50RGlyZWN0b3J5OiAoKSA9PiBwcm9jZXNzLmN3ZCgpLFxuXHRcdFx0Z2V0RGVmYXVsdExpYkZpbGVOYW1lOiAoKSA9PiBjb21waWxlckhvc3QuZ2V0RGVmYXVsdExpYkZpbGVOYW1lXHQoY29tcGlsZXJPcHRpb25zKSxcblx0XHRcdGZpbGVFeGlzdHM6IHRzLnN5cy5maWxlRXhpc3RzLFxuXHRcdFx0cmVhZEZpbGUocGF0aDogc3RyaW5nLCBlbmNvZGU/OiBzdHJpbmcpIHtcblx0XHRcdFx0aWYgKHNlbGYuZmlsZUNvbnRlbnQuaGFzKHBhdGgpKVxuXHRcdFx0XHRcdHJldHVybiBzZWxmLmZpbGVDb250ZW50LmdldChwYXRoKTtcblx0XHRcdFx0cmV0dXJuIGNvbXBpbGVySG9zdC5yZWFkRmlsZShwYXRoKTtcblx0XHRcdH0sXG5cdFx0XHRyZWFkRGlyZWN0b3J5OiBjb21waWxlckhvc3QucmVhZERpcmVjdG9yeSxcblx0XHRcdGdldERpcmVjdG9yaWVzOiBjb21waWxlckhvc3QuZ2V0RGlyZWN0b3JpZXMsXG5cdFx0XHRkaXJlY3RvcnlFeGlzdHM6IHRzLnN5cy5kaXJlY3RvcnlFeGlzdHMsIC8vIGRlYnVnZ2FibGUoJ2RpcmVjdG9yeUV4aXN0cycsIGNvbXBpbGVySG9zdC5kaXJlY3RvcnlFeGlzdHMpLFxuXHRcdFx0cmVhbHBhdGg6IGNvbXBpbGVySG9zdC5yZWFscGF0aCAvLyBkZWJ1Z2dhYmxlKCdyZWFscGF0aCcsIGNvbXBpbGVySG9zdC5yZWFscGF0aCksXG5cblx0XHR9O1xuXHRcdHRoaXMubGFuZ1NlcnZpY2UgPSB0cy5jcmVhdGVMYW5ndWFnZVNlcnZpY2UoIHNlcnZpY2VIb3N0LCB0cy5jcmVhdGVEb2N1bWVudFJlZ2lzdHJ5KCkpO1xuXG5cdH1cblxuXHRjb21waWxlKGZpbGVOYW1lOiBzdHJpbmcsIHNyY0NvZGU6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG5cdFx0ZmlsZU5hbWUgPSBQYXRoLnJlc29sdmUoZmlsZU5hbWUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblx0XHR0aGlzLmZpbGVDb250ZW50LnNldChmaWxlTmFtZSwgc3JjQ29kZSk7XG5cdFx0dGhpcy5maWxlTmFtZXMucHVzaChmaWxlTmFtZSk7XG5cdFx0Ly8gdGhpcy5jdXJyZW50RmlsZSA9IGZpbGVOYW1lO1xuXHRcdHJldHVybiB0aGlzLmVtaXRGaWxlKGZpbGVOYW1lKTtcblx0fVxuXG5cdHByb3RlY3RlZCBlbWl0RmlsZShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcblx0XHRjb25zdCBvdXRwdXQgPSB0aGlzLmxhbmdTZXJ2aWNlLmdldEVtaXRPdXRwdXQoZmlsZU5hbWUpO1xuXHRcdHRoaXMubG9nRXJyb3JzKGZpbGVOYW1lKTtcblx0XHRpZiAob3V0cHV0LmVtaXRTa2lwcGVkKSB7XG5cdFx0XHRjb25zb2xlLmxvZyhyZWQoYHRzLWNvbXBpbGVyIC0gY29tcGlsZSAke2ZpbGVOYW1lfSBmYWlsZWRgKSk7XG5cdFx0XHR0aGlzLmxvZ0Vycm9ycyhmaWxlTmFtZSwgdHJ1ZSk7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBjb21waWxlIFR5cGVzY3JpcHQgJyArIGZpbGVOYW1lKTtcblx0XHR9XG5cdFx0aWYgKG91dHB1dC5vdXRwdXRGaWxlcy5sZW5ndGggPiAxKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ3RzLWNvbXBpbGVyIC0gd2hhdCB0aGUgaGVjaywgdGhlcmUgYXJlIG1vcmUgdGhhbiBvbmUgb3V0cHV0IGZpbGVzPyAnICtcblx0XHRcdFx0b3V0cHV0Lm91dHB1dEZpbGVzLm1hcChvID0+IHllbGxvdyhvLm5hbWUpKS5qb2luKCcsICcpKTtcblx0XHR9XG5cdFx0Zm9yIChjb25zdCBvIG9mIG91dHB1dC5vdXRwdXRGaWxlcykge1xuXHRcdFx0cmV0dXJuIG8udGV4dDtcblx0XHR9XG5cdCAgfVxuXG5cdHByb3RlY3RlZCBsb2dFcnJvcnMoZmlsZU5hbWU6IHN0cmluZywgaXNFcnJvciA9IGZhbHNlKSB7XG5cdFx0Y29uc3QgYWxsRGlhZ25vc3RpY3MgPSB0aGlzLmxhbmdTZXJ2aWNlXG5cdFx0XHQuZ2V0Q29tcGlsZXJPcHRpb25zRGlhZ25vc3RpY3MoKVxuXHRcdFx0LmNvbmNhdCh0aGlzLmxhbmdTZXJ2aWNlLmdldFN5bnRhY3RpY0RpYWdub3N0aWNzKGZpbGVOYW1lKSlcblx0XHRcdC5jb25jYXQodGhpcy5sYW5nU2VydmljZS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lKSk7XG5cblx0XHRhbGxEaWFnbm9zdGljcy5mb3JFYWNoKGRpYWdub3N0aWMgPT4ge1xuXHRcdFx0Y29uc3QgbWVzc2FnZSA9IHRzLmZsYXR0ZW5EaWFnbm9zdGljTWVzc2FnZVRleHQoZGlhZ25vc3RpYy5tZXNzYWdlVGV4dCwgJ1xcbicpO1xuXHRcdFx0aWYgKGRpYWdub3N0aWMuZmlsZSkge1xuXHRcdFx0XHRjb25zdCB7IGxpbmUsIGNoYXJhY3RlciB9ID0gZGlhZ25vc3RpYy5maWxlLmdldExpbmVBbmRDaGFyYWN0ZXJPZlBvc2l0aW9uKGRpYWdub3N0aWMuc3RhcnQhKTtcblx0XHRcdFx0Y29uc29sZS5sb2coKGlzRXJyb3IgPyByZWQgOiB5ZWxsb3cpKGBbd2ZoLnRzLWNvbXBpbGVyXSAkeyhpc0Vycm9yID8gJ0Vycm9yJyA6ICdXYXJuaW5nJyl9IGAgK1xuXHRcdFx0XHRcdGAke2RpYWdub3N0aWMuZmlsZS5maWxlTmFtZX0gKCR7bGluZSArIDF9LCR7Y2hhcmFjdGVyICsgMX0pOiAke21lc3NhZ2V9YCkpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y29uc29sZS5sb2coKGlzRXJyb3IgPyByZWQgOiB5ZWxsb3cpKGBbd2ZoLnRzLWNvbXBpbGVyXSAkeyhpc0Vycm9yID8gJ0Vycm9yJyA6ICdXYXJuaW5nJyl9OiAke21lc3NhZ2V9YCkpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG59XG5cbmxldCBzaW5nbGV0b25Db21waWxlcjogVHNDb21waWxlcjtcbmV4cG9ydCBmdW5jdGlvbiB0cmFuc3BpbGVBbmRDaGVjayh0c0NvZGU6IHN0cmluZywgZmlsZW5hbWU6IHN0cmluZywgY286IHRzLkNvbXBpbGVyT3B0aW9uc3xzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuXHRpZiAodHlwZW9mIGNvID09PSAnc3RyaW5nJykge1xuXHRcdGNvID0gcmVhZFRzQ29uZmlnKGNvKTtcblx0fVxuXHRjby5kZWNsYXJhdGlvbiA9IGZhbHNlO1xuXHRjby5kZWNsYXJhdGlvbk1hcCA9IGZhbHNlO1xuXHRjby5pbmxpbmVTb3VyY2VNYXAgPSB0cnVlO1xuXHRjby5zb3VyY2VNYXAgPSBmYWxzZTtcblx0aWYgKHNpbmdsZXRvbkNvbXBpbGVyID09IG51bGwpXG5cdFx0c2luZ2xldG9uQ29tcGlsZXIgPSBuZXcgVHNDb21waWxlcihjbyk7XG5cdHJldHVybiBzaW5nbGV0b25Db21waWxlci5jb21waWxlKGZpbGVuYW1lLCB0c0NvZGUpO1xufVxuXG4vKipcbiAqIEV4YWN0bHkgbGlrZSB0cy1ub2RlLCBzbyB0aGF0IHdlIGNhbiBgcmVxdWlyZSgpYCBhIHRzIGZpbGUgZGlyZWN0bHkgd2l0aG91dCBgdHNjYFxuICogQHBhcmFtIGV4dCBcbiAqIEBwYXJhbSBjb21waWxlck9wdCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyRXh0ZW5zaW9uKGV4dDogc3RyaW5nLCBjb21waWxlck9wdDogdHMuQ29tcGlsZXJPcHRpb25zKSB7XG5cdGNvbnN0IG9sZCA9IHJlcXVpcmUuZXh0ZW5zaW9uc1tleHRdIHx8IHJlcXVpcmUuZXh0ZW5zaW9uc1snLmpzJ107XG5cdC8vIGNvbXBpbGVyT3B0LmlubGluZVNvdXJjZXMgPSB0cnVlO1xuXHRyZXF1aXJlLmV4dGVuc2lvbnNbZXh0XSA9IGZ1bmN0aW9uKG06IGFueSwgZmlsZW5hbWUpIHtcblx0XHQvLyAgIGlmIChzaG91bGRJZ25vcmUoZmlsZW5hbWUsIGlnbm9yZSkpIHtcblx0XHQvLyBcdHJldHVybiBvbGQobSwgZmlsZW5hbWUpO1xuXHRcdC8vICAgfVxuXHRcdGNvbnN0IF9jb21waWxlID0gbS5fY29tcGlsZTtcblx0XHRtLl9jb21waWxlID0gZnVuY3Rpb24oY29kZTogc3RyaW5nLCBmaWxlTmFtZTogc3RyaW5nKSB7XG5cdFx0XHRjb25zdCBqc2NvZGUgPSB0cmFuc3BpbGVBbmRDaGVjayhjb2RlLCBmaWxlTmFtZSwgY29tcGlsZXJPcHQpO1xuXHRcdFx0Ly8gY29uc29sZS5sb2coanNjb2RlKTtcblx0XHRcdHJldHVybiBfY29tcGlsZS5jYWxsKHRoaXMsIGpzY29kZSwgZmlsZU5hbWUpO1xuXHRcdH07XG5cdFx0cmV0dXJuIG9sZChtLCBmaWxlbmFtZSk7XG5cdH07XG59XG5cbiJdfQ==