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
function jsonToCompilerOptions(jsonCompilerOpt, file = 'tsconfig.json') {
    return ts.parseJsonConfigFileContent({ compilerOptions: jsonCompilerOpt }, ts.sys, process.cwd().replace(/\\/g, '/'), undefined, file).options;
}
exports.jsonToCompilerOptions = jsonToCompilerOptions;
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
    // co.inlineSourceMap = true;
    // co.sourceMap = true;
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
    compilerOpt.inlineSourceMap = false;
    compilerOpt.inlineSources = false;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy90cy1jb21waWxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIsK0NBQWlDO0FBQ2pDLDJCQUFnQztBQUdoQyxTQUFnQixZQUFZLENBQUMsWUFBb0I7SUFDL0MsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLGlCQUFZLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0lBQy9GLE9BQU8sRUFBRSxDQUFDLDBCQUEwQixDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUN0RixTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ3JDLENBQUM7QUFKRCxvQ0FJQztBQUVELFNBQWdCLHFCQUFxQixDQUFDLGVBQW9CLEVBQUUsSUFBSSxHQUFHLGVBQWU7SUFDaEYsT0FBTyxFQUFFLENBQUMsMEJBQTBCLENBQUMsRUFBQyxlQUFlLEVBQUUsZUFBZSxFQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsRUFDbEgsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUMzQixDQUFDO0FBSEQsc0RBR0M7QUFFRDs7O0dBR0c7QUFDSCxTQUFnQixpQkFBaUIsQ0FBQyxNQUFjLEVBQUUsZUFBbUM7SUFDbkYsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsRUFBQyxlQUFlLEVBQUMsQ0FBQyxDQUFDO0lBQzFELElBQUksR0FBRyxDQUFDLFdBQVcsSUFB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LENBQUMsR0FBRyxVQUFTLENBQU0sRUFBRSxRQUFRO1FBQ2pELDBDQUEwQztRQUMxQyw0QkFBNEI7UUFDNUIsTUFBTTtRQUNOLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFDNUIsQ0FBQyxDQUFDLFFBQVEsR0FBRyxVQUFTLElBQVksRUFBRSxRQUFnQjtZQUNsRCxNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQzlELHVCQUF1QjtZQUN2QixPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMvQyxDQUFDLENBQUM7UUFDRixPQUFPLEdBQUcsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDMUIsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQWpCRCw4Q0FpQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7cmVhZEZpbGVTeW5jfSBmcm9tICdmcyc7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRUc0NvbmZpZyh0c2NvbmZpZ0ZpbGU6IHN0cmluZyk6IHRzLkNvbXBpbGVyT3B0aW9ucyB7XG4gIGNvbnN0IHRzY29uZmlnID0gdHMucmVhZENvbmZpZ0ZpbGUodHNjb25maWdGaWxlLCAoZmlsZSkgPT4gcmVhZEZpbGVTeW5jKGZpbGUsICd1dGYtOCcpKS5jb25maWc7XG4gIHJldHVybiB0cy5wYXJzZUpzb25Db25maWdGaWxlQ29udGVudCh0c2NvbmZpZywgdHMuc3lzLCBwcm9jZXNzLmN3ZCgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICB1bmRlZmluZWQsIHRzY29uZmlnRmlsZSkub3B0aW9ucztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGpzb25Ub0NvbXBpbGVyT3B0aW9ucyhqc29uQ29tcGlsZXJPcHQ6IGFueSwgZmlsZSA9ICd0c2NvbmZpZy5qc29uJyk6IHRzLkNvbXBpbGVyT3B0aW9ucyB7XG4gIHJldHVybiB0cy5wYXJzZUpzb25Db25maWdGaWxlQ29udGVudCh7Y29tcGlsZXJPcHRpb25zOiBqc29uQ29tcGlsZXJPcHR9LCB0cy5zeXMsIHByb2Nlc3MuY3dkKCkucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICB1bmRlZmluZWQsIGZpbGUpLm9wdGlvbnM7XG59XG5cbi8qKlxuICogUmVmZXIgdG8gaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L3dpa2kvVXNpbmctdGhlLUNvbXBpbGVyLUFQSSN0cmFuc3BpbGluZy1hLXNpbmdsZS1maWxlXG4gKiBAcGFyYW0gdHNDb2RlIFxuICovXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNwaWxlU2luZ2xlVHModHNDb2RlOiBzdHJpbmcsIGNvbXBpbGVyT3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKTogc3RyaW5nIHtcbiAgY29uc3QgcmVzID0gdHMudHJhbnNwaWxlTW9kdWxlKHRzQ29kZSwge2NvbXBpbGVyT3B0aW9uc30pO1xuICBpZiAocmVzLmRpYWdub3N0aWNzICYmIHJlcy5kaWFnbm9zdGljcy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgbXNnID0gYEZhaWxlZCB0byB0cmFuc3BpbGUgVFMgZXhwcmVzc2lvbjogJHt0c0NvZGV9XFxuYCArIHJlcy5kaWFnbm9zdGljcy5qb2luKCdcXG4nKTtcbiAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gIH1cbiAgcmV0dXJuIHJlcy5vdXRwdXRUZXh0O1xufVxuXG4vLyBpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0IHtpbnNwZWN0fSBmcm9tICd1dGlsJztcbmNvbnN0IGNoYWxrID0gcmVxdWlyZSgnY2hhbGsnKTtcbmNvbnN0IHtyZWQsIHllbGxvd30gPSBjaGFsaztcbmNsYXNzIFRzQ29tcGlsZXIge1xuICBmaWxlTmFtZXM6IHN0cmluZ1tdID0gW107XG4gIGZpbGVzOiB0cy5NYXBMaWtlPHsgdmVyc2lvbjogbnVtYmVyIH0+ID0ge307XG4gIGxhbmdTZXJ2aWNlOiB0cy5MYW5ndWFnZVNlcnZpY2U7XG4gIGZpbGVDb250ZW50ID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgLy8gY3VycmVudEZpbGU6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgY29tcGlsZXJPcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICBjb25zdCBjb21waWxlckhvc3QgPSB0cy5jcmVhdGVDb21waWxlckhvc3QoY29tcGlsZXJPcHRpb25zKTtcblxuICAgIGNvbnN0IHNlcnZpY2VIb3N0OiB0cy5MYW5ndWFnZVNlcnZpY2VIb3N0ID0ge1xuICAgICAgZ2V0TmV3TGluZSgpIHsgcmV0dXJuICdcXG4nOyB9LFxuICAgICAgZ2V0Q29tcGlsYXRpb25TZXR0aW5ncygpIHsgcmV0dXJuIHNlbGYuY29tcGlsZXJPcHRpb25zO30sXG4gICAgICBnZXRTY3JpcHRGaWxlTmFtZXMoKSB7cmV0dXJuIHNlbGYuZmlsZU5hbWVzO30sXG4gICAgICBnZXRTY3JpcHRWZXJzaW9uOiBmaWxlTmFtZSA9PlxuICAgICAgICB0aGlzLmZpbGVzW2ZpbGVOYW1lXSAmJiB0aGlzLmZpbGVzW2ZpbGVOYW1lXS52ZXJzaW9uLnRvU3RyaW5nKCksXG4gICAgICBnZXRTY3JpcHRTbmFwc2hvdDogZmlsZU5hbWUgPT4ge1xuICAgICAgICBpZiAodGhpcy5maWxlQ29udGVudC5oYXMoZmlsZU5hbWUpKVxuICAgICAgICAgIHJldHVybiB0cy5TY3JpcHRTbmFwc2hvdC5mcm9tU3RyaW5nKHRoaXMuZmlsZUNvbnRlbnQuZ2V0KGZpbGVOYW1lKSEpO1xuICAgICAgICBpZiAodHMuc3lzLmZpbGVFeGlzdHMoZmlsZU5hbWUpKVxuICAgICAgICAgIHJldHVybiB0cy5TY3JpcHRTbmFwc2hvdC5mcm9tU3RyaW5nKHRzLnN5cy5yZWFkRmlsZShmaWxlTmFtZSkhKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH0sXG4gICAgICBnZXRDdXJyZW50RGlyZWN0b3J5OiAoKSA9PiBwcm9jZXNzLmN3ZCgpLFxuICAgICAgZ2V0RGVmYXVsdExpYkZpbGVOYW1lOiAoKSA9PiBjb21waWxlckhvc3QuZ2V0RGVmYXVsdExpYkZpbGVOYW1lXHQoY29tcGlsZXJPcHRpb25zKSxcbiAgICAgIGZpbGVFeGlzdHM6IHRzLnN5cy5maWxlRXhpc3RzLFxuICAgICAgcmVhZEZpbGUocGF0aDogc3RyaW5nLCBlbmNvZGU/OiBzdHJpbmcpIHtcbiAgICAgICAgaWYgKHNlbGYuZmlsZUNvbnRlbnQuaGFzKHBhdGgpKVxuICAgICAgICAgIHJldHVybiBzZWxmLmZpbGVDb250ZW50LmdldChwYXRoKTtcbiAgICAgICAgcmV0dXJuIGNvbXBpbGVySG9zdC5yZWFkRmlsZShwYXRoKTtcbiAgICAgIH0sXG4gICAgICByZWFkRGlyZWN0b3J5OiBjb21waWxlckhvc3QucmVhZERpcmVjdG9yeSxcbiAgICAgIGdldERpcmVjdG9yaWVzOiBjb21waWxlckhvc3QuZ2V0RGlyZWN0b3JpZXMsXG4gICAgICBkaXJlY3RvcnlFeGlzdHM6IHRzLnN5cy5kaXJlY3RvcnlFeGlzdHMsIC8vIGRlYnVnZ2FibGUoJ2RpcmVjdG9yeUV4aXN0cycsIGNvbXBpbGVySG9zdC5kaXJlY3RvcnlFeGlzdHMpLFxuICAgICAgcmVhbHBhdGg6IGNvbXBpbGVySG9zdC5yZWFscGF0aCAvLyBkZWJ1Z2dhYmxlKCdyZWFscGF0aCcsIGNvbXBpbGVySG9zdC5yZWFscGF0aCksXG5cbiAgICB9O1xuICAgIHRoaXMubGFuZ1NlcnZpY2UgPSB0cy5jcmVhdGVMYW5ndWFnZVNlcnZpY2UoIHNlcnZpY2VIb3N0LCB0cy5jcmVhdGVEb2N1bWVudFJlZ2lzdHJ5KCkpO1xuXG4gIH1cblxuICBjb21waWxlKGZpbGVOYW1lOiBzdHJpbmcsIHNyY0NvZGU6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgZmlsZU5hbWUgPSBQYXRoLnJlc29sdmUoZmlsZU5hbWUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICB0aGlzLmZpbGVDb250ZW50LnNldChmaWxlTmFtZSwgc3JjQ29kZSk7XG4gICAgdGhpcy5maWxlTmFtZXMucHVzaChmaWxlTmFtZSk7XG4gICAgLy8gdGhpcy5jdXJyZW50RmlsZSA9IGZpbGVOYW1lO1xuICAgIHJldHVybiB0aGlzLmVtaXRGaWxlKGZpbGVOYW1lKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBlbWl0RmlsZShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBvdXRwdXQgPSB0aGlzLmxhbmdTZXJ2aWNlLmdldEVtaXRPdXRwdXQoZmlsZU5hbWUpO1xuICAgIHRoaXMubG9nRXJyb3JzKGZpbGVOYW1lKTtcbiAgICBpZiAob3V0cHV0LmVtaXRTa2lwcGVkKSB7XG4gICAgICBjb25zb2xlLmxvZyhyZWQoYHRzLWNvbXBpbGVyIC0gY29tcGlsZSAke2ZpbGVOYW1lfSBmYWlsZWRgKSk7XG4gICAgICB0aGlzLmxvZ0Vycm9ycyhmaWxlTmFtZSwgdHJ1ZSk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBjb21waWxlIFR5cGVzY3JpcHQgJyArIGZpbGVOYW1lKTtcbiAgICB9XG4gICAgaWYgKG91dHB1dC5vdXRwdXRGaWxlcy5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3RzLWNvbXBpbGVyIC0gd2hhdCB0aGUgaGVjaywgdGhlcmUgYXJlIG1vcmUgdGhhbiBvbmUgb3V0cHV0IGZpbGVzPyAnICtcbiAgICAgICAgb3V0cHV0Lm91dHB1dEZpbGVzLm1hcChvID0+IHllbGxvdyhvLm5hbWUpKS5qb2luKCcsICcpKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBvIG9mIG91dHB1dC5vdXRwdXRGaWxlcykge1xuICAgICAgcmV0dXJuIG8udGV4dDtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgbG9nRXJyb3JzKGZpbGVOYW1lOiBzdHJpbmcsIGlzRXJyb3IgPSBmYWxzZSkge1xuICAgIGNvbnN0IGFsbERpYWdub3N0aWNzID0gdGhpcy5sYW5nU2VydmljZVxuICAgICAgLmdldENvbXBpbGVyT3B0aW9uc0RpYWdub3N0aWNzKClcbiAgICAgIC5jb25jYXQodGhpcy5sYW5nU2VydmljZS5nZXRTeW50YWN0aWNEaWFnbm9zdGljcyhmaWxlTmFtZSkpXG4gICAgICAuY29uY2F0KHRoaXMubGFuZ1NlcnZpY2UuZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhmaWxlTmFtZSkpO1xuXG4gICAgYWxsRGlhZ25vc3RpY3MuZm9yRWFjaChkaWFnbm9zdGljID0+IHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0cy5mbGF0dGVuRGlhZ25vc3RpY01lc3NhZ2VUZXh0KGRpYWdub3N0aWMubWVzc2FnZVRleHQsICdcXG4nKTtcbiAgICAgIGlmIChkaWFnbm9zdGljLmZpbGUpIHtcbiAgICAgICAgY29uc3QgeyBsaW5lLCBjaGFyYWN0ZXIgfSA9IGRpYWdub3N0aWMuZmlsZS5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihkaWFnbm9zdGljLnN0YXJ0ISk7XG4gICAgICAgIGNvbnNvbGUubG9nKChpc0Vycm9yID8gcmVkIDogeWVsbG93KShgW3dmaC50cy1jb21waWxlcl0gJHsoaXNFcnJvciA/ICdFcnJvcicgOiAnV2FybmluZycpfSBgICtcbiAgICAgICAgICBgJHtkaWFnbm9zdGljLmZpbGUuZmlsZU5hbWV9ICgke2xpbmUgKyAxfSwke2NoYXJhY3RlciArIDF9KTogJHttZXNzYWdlfWApKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKChpc0Vycm9yID8gcmVkIDogeWVsbG93KShgW3dmaC50cy1jb21waWxlcl0gJHsoaXNFcnJvciA/ICdFcnJvcicgOiAnV2FybmluZycpfTogJHttZXNzYWdlfWApKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5sZXQgc2luZ2xldG9uQ29tcGlsZXI6IFRzQ29tcGlsZXI7XG5leHBvcnQgZnVuY3Rpb24gdHJhbnNwaWxlQW5kQ2hlY2sodHNDb2RlOiBzdHJpbmcsIGZpbGVuYW1lOiBzdHJpbmcsIGNvOiB0cy5Db21waWxlck9wdGlvbnN8c3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgaWYgKHR5cGVvZiBjbyA9PT0gJ3N0cmluZycpIHtcbiAgICBjbyA9IHJlYWRUc0NvbmZpZyhjbyk7XG4gIH1cbiAgY28uZGVjbGFyYXRpb24gPSBmYWxzZTtcbiAgY28uZGVjbGFyYXRpb25NYXAgPSBmYWxzZTtcbiAgLy8gY28uaW5saW5lU291cmNlTWFwID0gdHJ1ZTtcbiAgLy8gY28uc291cmNlTWFwID0gdHJ1ZTtcbiAgaWYgKHNpbmdsZXRvbkNvbXBpbGVyID09IG51bGwpXG4gICAgc2luZ2xldG9uQ29tcGlsZXIgPSBuZXcgVHNDb21waWxlcihjbyk7XG4gIHJldHVybiBzaW5nbGV0b25Db21waWxlci5jb21waWxlKGZpbGVuYW1lLCB0c0NvZGUpO1xufVxuXG4vKipcbiAqIEV4YWN0bHkgbGlrZSB0cy1ub2RlLCBzbyB0aGF0IHdlIGNhbiBgcmVxdWlyZSgpYCBhIHRzIGZpbGUgZGlyZWN0bHkgd2l0aG91dCBgdHNjYFxuICogQHBhcmFtIGV4dCBcbiAqIEBwYXJhbSBjb21waWxlck9wdCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyRXh0ZW5zaW9uKGV4dDogc3RyaW5nLCBjb21waWxlck9wdDogdHMuQ29tcGlsZXJPcHRpb25zKSB7XG4gIGNvbnN0IG9sZCA9IHJlcXVpcmUuZXh0ZW5zaW9uc1tleHRdIHx8IHJlcXVpcmUuZXh0ZW5zaW9uc1snLmpzJ107XG4gIC8vIGNvbXBpbGVyT3B0LmlubGluZVNvdXJjZXMgPSB0cnVlO1xuICBjb21waWxlck9wdC5pbmxpbmVTb3VyY2VNYXAgPSBmYWxzZTtcbiAgY29tcGlsZXJPcHQuaW5saW5lU291cmNlcyA9IGZhbHNlO1xuICByZXF1aXJlLmV4dGVuc2lvbnNbZXh0XSA9IGZ1bmN0aW9uKG06IGFueSwgZmlsZW5hbWUpIHtcbiAgICAvLyAgIGlmIChzaG91bGRJZ25vcmUoZmlsZW5hbWUsIGlnbm9yZSkpIHtcbiAgICAvLyBcdHJldHVybiBvbGQobSwgZmlsZW5hbWUpO1xuICAgIC8vICAgfVxuICAgIGNvbnN0IF9jb21waWxlID0gbS5fY29tcGlsZTtcbiAgICBtLl9jb21waWxlID0gZnVuY3Rpb24oY29kZTogc3RyaW5nLCBmaWxlTmFtZTogc3RyaW5nKSB7XG4gICAgICBjb25zdCBqc2NvZGUgPSB0cmFuc3BpbGVBbmRDaGVjayhjb2RlLCBmaWxlTmFtZSwgY29tcGlsZXJPcHQpO1xuICAgICAgLy8gY29uc29sZS5sb2coanNjb2RlKTtcbiAgICAgIHJldHVybiBfY29tcGlsZS5jYWxsKHRoaXMsIGpzY29kZSwgZmlsZU5hbWUpO1xuICAgIH07XG4gICAgcmV0dXJuIG9sZChtLCBmaWxlbmFtZSk7XG4gIH07XG59XG5cbiJdfQ==