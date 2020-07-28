"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerExtension = exports.transpileAndCheck = exports.transpileSingleTs = exports.jsonToCompilerOptions = exports.readTsConfig = void 0;
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
            fileExists: (f) => {
                // console.log(f);
                return compilerHost.fileExists(f);
            },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy90cy1jb21waWxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLCtDQUFpQztBQUNqQywyQkFBZ0M7QUFHaEMsU0FBZ0IsWUFBWSxDQUFDLFlBQW9CO0lBQy9DLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxpQkFBWSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUMvRixPQUFPLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsRUFDdEYsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUNyQyxDQUFDO0FBSkQsb0NBSUM7QUFFRCxTQUFnQixxQkFBcUIsQ0FBQyxlQUFvQixFQUFFLElBQUksR0FBRyxlQUFlO0lBQ2hGLE9BQU8sRUFBRSxDQUFDLDBCQUEwQixDQUFDLEVBQUMsZUFBZSxFQUFFLGVBQWUsRUFBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQ2xILFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDM0IsQ0FBQztBQUhELHNEQUdDO0FBRUQ7OztHQUdHO0FBQ0gsU0FBZ0IsaUJBQWlCLENBQUMsTUFBYyxFQUFFLGVBQW1DO0lBQ25GLE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLEVBQUMsZUFBZSxFQUFDLENBQUMsQ0FBQztJQUMxRCxJQUFJLEdBQUcs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QUFlO0FBQ2Ysc0NBQXNDO0FBQ3RDLG1DQUFtQztBQUNuQyw0QkFBNEI7QUFDNUIsOEJBQThCO0FBQzlCLFVBQVU7QUFDVixTQUFTO0FBQ1QsbUJBQW1CO0FBQ25CLHVEQUF1RDtBQUN2RCw0REFBNEQ7QUFDNUQsUUFBUTtBQUNSLE9BQU87QUFFUCxtREFBbUQ7QUFDbkQsZ0VBQWdFO0FBQ2hFLElBQUkiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7cmVhZEZpbGVTeW5jfSBmcm9tICdmcyc7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRUc0NvbmZpZyh0c2NvbmZpZ0ZpbGU6IHN0cmluZyk6IHRzLkNvbXBpbGVyT3B0aW9ucyB7XG4gIGNvbnN0IHRzY29uZmlnID0gdHMucmVhZENvbmZpZ0ZpbGUodHNjb25maWdGaWxlLCAoZmlsZSkgPT4gcmVhZEZpbGVTeW5jKGZpbGUsICd1dGYtOCcpKS5jb25maWc7XG4gIHJldHVybiB0cy5wYXJzZUpzb25Db25maWdGaWxlQ29udGVudCh0c2NvbmZpZywgdHMuc3lzLCBwcm9jZXNzLmN3ZCgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICB1bmRlZmluZWQsIHRzY29uZmlnRmlsZSkub3B0aW9ucztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGpzb25Ub0NvbXBpbGVyT3B0aW9ucyhqc29uQ29tcGlsZXJPcHQ6IGFueSwgZmlsZSA9ICd0c2NvbmZpZy5qc29uJyk6IHRzLkNvbXBpbGVyT3B0aW9ucyB7XG4gIHJldHVybiB0cy5wYXJzZUpzb25Db25maWdGaWxlQ29udGVudCh7Y29tcGlsZXJPcHRpb25zOiBqc29uQ29tcGlsZXJPcHR9LCB0cy5zeXMsIHByb2Nlc3MuY3dkKCkucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICB1bmRlZmluZWQsIGZpbGUpLm9wdGlvbnM7XG59XG5cbi8qKlxuICogUmVmZXIgdG8gaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L3dpa2kvVXNpbmctdGhlLUNvbXBpbGVyLUFQSSN0cmFuc3BpbGluZy1hLXNpbmdsZS1maWxlXG4gKiBAcGFyYW0gdHNDb2RlIFxuICovXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNwaWxlU2luZ2xlVHModHNDb2RlOiBzdHJpbmcsIGNvbXBpbGVyT3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKTogc3RyaW5nIHtcbiAgY29uc3QgcmVzID0gdHMudHJhbnNwaWxlTW9kdWxlKHRzQ29kZSwge2NvbXBpbGVyT3B0aW9uc30pO1xuICBpZiAocmVzLmRpYWdub3N0aWNzICYmIHJlcy5kaWFnbm9zdGljcy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgbXNnID0gYEZhaWxlZCB0byB0cmFuc3BpbGUgVFMgZXhwcmVzc2lvbjogJHt0c0NvZGV9XFxuYCArIHJlcy5kaWFnbm9zdGljcy5qb2luKCdcXG4nKTtcbiAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gIH1cbiAgcmV0dXJuIHJlcy5vdXRwdXRUZXh0O1xufVxuXG4vLyBpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0IHtpbnNwZWN0fSBmcm9tICd1dGlsJztcbmNvbnN0IGNoYWxrID0gcmVxdWlyZSgnY2hhbGsnKTtcbmNvbnN0IHtyZWQsIHllbGxvd30gPSBjaGFsaztcbmNsYXNzIFRzQ29tcGlsZXIge1xuICBmaWxlTmFtZXM6IHN0cmluZ1tdID0gW107XG4gIGZpbGVzOiB0cy5NYXBMaWtlPHsgdmVyc2lvbjogbnVtYmVyIH0+ID0ge307XG4gIGxhbmdTZXJ2aWNlOiB0cy5MYW5ndWFnZVNlcnZpY2U7XG4gIGZpbGVDb250ZW50ID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgLy8gY3VycmVudEZpbGU6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgY29tcGlsZXJPcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICBjb25zdCBjb21waWxlckhvc3QgPSB0cy5jcmVhdGVDb21waWxlckhvc3QoY29tcGlsZXJPcHRpb25zKTtcblxuICAgIGNvbnN0IHNlcnZpY2VIb3N0OiB0cy5MYW5ndWFnZVNlcnZpY2VIb3N0ID0ge1xuICAgICAgZ2V0TmV3TGluZSgpIHsgcmV0dXJuICdcXG4nOyB9LFxuICAgICAgZ2V0Q29tcGlsYXRpb25TZXR0aW5ncygpIHsgcmV0dXJuIHNlbGYuY29tcGlsZXJPcHRpb25zO30sXG4gICAgICBnZXRTY3JpcHRGaWxlTmFtZXMoKSB7cmV0dXJuIHNlbGYuZmlsZU5hbWVzO30sXG4gICAgICBnZXRTY3JpcHRWZXJzaW9uOiBmaWxlTmFtZSA9PlxuICAgICAgICB0aGlzLmZpbGVzW2ZpbGVOYW1lXSAmJiB0aGlzLmZpbGVzW2ZpbGVOYW1lXS52ZXJzaW9uLnRvU3RyaW5nKCksXG4gICAgICBnZXRTY3JpcHRTbmFwc2hvdDogZmlsZU5hbWUgPT4ge1xuICAgICAgICBpZiAodGhpcy5maWxlQ29udGVudC5oYXMoZmlsZU5hbWUpKVxuICAgICAgICAgIHJldHVybiB0cy5TY3JpcHRTbmFwc2hvdC5mcm9tU3RyaW5nKHRoaXMuZmlsZUNvbnRlbnQuZ2V0KGZpbGVOYW1lKSEpO1xuICAgICAgICBpZiAodHMuc3lzLmZpbGVFeGlzdHMoZmlsZU5hbWUpKVxuICAgICAgICAgIHJldHVybiB0cy5TY3JpcHRTbmFwc2hvdC5mcm9tU3RyaW5nKHRzLnN5cy5yZWFkRmlsZShmaWxlTmFtZSkhKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH0sXG4gICAgICBnZXRDdXJyZW50RGlyZWN0b3J5OiAoKSA9PiBwcm9jZXNzLmN3ZCgpLFxuICAgICAgZ2V0RGVmYXVsdExpYkZpbGVOYW1lOiAoKSA9PiBjb21waWxlckhvc3QuZ2V0RGVmYXVsdExpYkZpbGVOYW1lXHQoY29tcGlsZXJPcHRpb25zKSxcbiAgICAgIGZpbGVFeGlzdHM6IChmOiBzdHJpbmcpID0+IHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coZik7XG4gICAgICAgIHJldHVybiBjb21waWxlckhvc3QuZmlsZUV4aXN0cyhmKTtcbiAgICAgIH0sXG4gICAgICByZWFkRmlsZShwYXRoOiBzdHJpbmcsIGVuY29kZT86IHN0cmluZykge1xuICAgICAgICBpZiAoc2VsZi5maWxlQ29udGVudC5oYXMocGF0aCkpXG4gICAgICAgICAgcmV0dXJuIHNlbGYuZmlsZUNvbnRlbnQuZ2V0KHBhdGgpO1xuICAgICAgICByZXR1cm4gY29tcGlsZXJIb3N0LnJlYWRGaWxlKHBhdGgpO1xuICAgICAgfSxcbiAgICAgIHJlYWREaXJlY3Rvcnk6IGNvbXBpbGVySG9zdC5yZWFkRGlyZWN0b3J5LFxuICAgICAgZ2V0RGlyZWN0b3JpZXM6IGNvbXBpbGVySG9zdC5nZXREaXJlY3RvcmllcyxcbiAgICAgIGRpcmVjdG9yeUV4aXN0czogdHMuc3lzLmRpcmVjdG9yeUV4aXN0cywgLy8gZGVidWdnYWJsZSgnZGlyZWN0b3J5RXhpc3RzJywgY29tcGlsZXJIb3N0LmRpcmVjdG9yeUV4aXN0cyksXG4gICAgICByZWFscGF0aDogY29tcGlsZXJIb3N0LnJlYWxwYXRoIC8vIGRlYnVnZ2FibGUoJ3JlYWxwYXRoJywgY29tcGlsZXJIb3N0LnJlYWxwYXRoKSxcbiAgICB9O1xuICAgIHRoaXMubGFuZ1NlcnZpY2UgPSB0cy5jcmVhdGVMYW5ndWFnZVNlcnZpY2UoIHNlcnZpY2VIb3N0LCB0cy5jcmVhdGVEb2N1bWVudFJlZ2lzdHJ5KCkpO1xuXG4gIH1cblxuICBjb21waWxlKGZpbGVOYW1lOiBzdHJpbmcsIHNyY0NvZGU6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgZmlsZU5hbWUgPSBQYXRoLnJlc29sdmUoZmlsZU5hbWUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICB0aGlzLmZpbGVDb250ZW50LnNldChmaWxlTmFtZSwgc3JjQ29kZSk7XG4gICAgdGhpcy5maWxlTmFtZXMucHVzaChmaWxlTmFtZSk7XG4gICAgLy8gdGhpcy5jdXJyZW50RmlsZSA9IGZpbGVOYW1lO1xuICAgIHJldHVybiB0aGlzLmVtaXRGaWxlKGZpbGVOYW1lKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBlbWl0RmlsZShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBvdXRwdXQgPSB0aGlzLmxhbmdTZXJ2aWNlLmdldEVtaXRPdXRwdXQoZmlsZU5hbWUpO1xuICAgIHRoaXMubG9nRXJyb3JzKGZpbGVOYW1lKTtcbiAgICBpZiAob3V0cHV0LmVtaXRTa2lwcGVkKSB7XG4gICAgICBjb25zb2xlLmxvZyhyZWQoYHRzLWNvbXBpbGVyIC0gY29tcGlsZSAke2ZpbGVOYW1lfSBmYWlsZWRgKSk7XG4gICAgICB0aGlzLmxvZ0Vycm9ycyhmaWxlTmFtZSwgdHJ1ZSk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBjb21waWxlIFR5cGVzY3JpcHQgJyArIGZpbGVOYW1lKTtcbiAgICB9XG4gICAgaWYgKG91dHB1dC5vdXRwdXRGaWxlcy5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3RzLWNvbXBpbGVyIC0gd2hhdCB0aGUgaGVjaywgdGhlcmUgYXJlIG1vcmUgdGhhbiBvbmUgb3V0cHV0IGZpbGVzPyAnICtcbiAgICAgICAgb3V0cHV0Lm91dHB1dEZpbGVzLm1hcChvID0+IHllbGxvdyhvLm5hbWUpKS5qb2luKCcsICcpKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBvIG9mIG91dHB1dC5vdXRwdXRGaWxlcykge1xuICAgICAgcmV0dXJuIG8udGV4dDtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgbG9nRXJyb3JzKGZpbGVOYW1lOiBzdHJpbmcsIGlzRXJyb3IgPSBmYWxzZSkge1xuICAgIGNvbnN0IGFsbERpYWdub3N0aWNzID0gdGhpcy5sYW5nU2VydmljZVxuICAgICAgLmdldENvbXBpbGVyT3B0aW9uc0RpYWdub3N0aWNzKClcbiAgICAgIC5jb25jYXQodGhpcy5sYW5nU2VydmljZS5nZXRTeW50YWN0aWNEaWFnbm9zdGljcyhmaWxlTmFtZSkpXG4gICAgICAuY29uY2F0KHRoaXMubGFuZ1NlcnZpY2UuZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhmaWxlTmFtZSkpO1xuXG4gICAgYWxsRGlhZ25vc3RpY3MuZm9yRWFjaChkaWFnbm9zdGljID0+IHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0cy5mbGF0dGVuRGlhZ25vc3RpY01lc3NhZ2VUZXh0KGRpYWdub3N0aWMubWVzc2FnZVRleHQsICdcXG4nKTtcbiAgICAgIGlmIChkaWFnbm9zdGljLmZpbGUpIHtcbiAgICAgICAgY29uc3QgeyBsaW5lLCBjaGFyYWN0ZXIgfSA9IGRpYWdub3N0aWMuZmlsZS5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihkaWFnbm9zdGljLnN0YXJ0ISk7XG4gICAgICAgIGNvbnNvbGUubG9nKChpc0Vycm9yID8gcmVkIDogeWVsbG93KShgW3dmaC50cy1jb21waWxlcl0gJHsoaXNFcnJvciA/ICdFcnJvcicgOiAnV2FybmluZycpfSBgICtcbiAgICAgICAgICBgJHtkaWFnbm9zdGljLmZpbGUuZmlsZU5hbWV9ICgke2xpbmUgKyAxfSwke2NoYXJhY3RlciArIDF9KTogJHttZXNzYWdlfWApKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKChpc0Vycm9yID8gcmVkIDogeWVsbG93KShgW3dmaC50cy1jb21waWxlcl0gJHsoaXNFcnJvciA/ICdFcnJvcicgOiAnV2FybmluZycpfTogJHttZXNzYWdlfWApKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5sZXQgc2luZ2xldG9uQ29tcGlsZXI6IFRzQ29tcGlsZXI7XG5leHBvcnQgZnVuY3Rpb24gdHJhbnNwaWxlQW5kQ2hlY2sodHNDb2RlOiBzdHJpbmcsIGZpbGVuYW1lOiBzdHJpbmcsIGNvOiB0cy5Db21waWxlck9wdGlvbnN8c3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgaWYgKHR5cGVvZiBjbyA9PT0gJ3N0cmluZycpIHtcbiAgICBjbyA9IHJlYWRUc0NvbmZpZyhjbyk7XG4gIH1cbiAgY28uZGVjbGFyYXRpb24gPSBmYWxzZTtcbiAgY28uZGVjbGFyYXRpb25NYXAgPSBmYWxzZTtcbiAgLy8gY28uaW5saW5lU291cmNlTWFwID0gdHJ1ZTtcbiAgLy8gY28uc291cmNlTWFwID0gdHJ1ZTtcbiAgaWYgKHNpbmdsZXRvbkNvbXBpbGVyID09IG51bGwpXG4gICAgc2luZ2xldG9uQ29tcGlsZXIgPSBuZXcgVHNDb21waWxlcihjbyk7XG4gIHJldHVybiBzaW5nbGV0b25Db21waWxlci5jb21waWxlKGZpbGVuYW1lLCB0c0NvZGUpO1xufVxuXG4vKipcbiAqIEV4YWN0bHkgbGlrZSB0cy1ub2RlLCBzbyB0aGF0IHdlIGNhbiBgcmVxdWlyZSgpYCBhIHRzIGZpbGUgZGlyZWN0bHkgd2l0aG91dCBgdHNjYFxuICogQHBhcmFtIGV4dCBcbiAqIEBwYXJhbSBjb21waWxlck9wdCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyRXh0ZW5zaW9uKGV4dDogc3RyaW5nLCBjb21waWxlck9wdDogdHMuQ29tcGlsZXJPcHRpb25zKSB7XG4gIGNvbnN0IG9sZCA9IHJlcXVpcmUuZXh0ZW5zaW9uc1tleHRdIHx8IHJlcXVpcmUuZXh0ZW5zaW9uc1snLmpzJ107XG4gIC8vIGNvbXBpbGVyT3B0LmlubGluZVNvdXJjZXMgPSB0cnVlO1xuICBjb21waWxlck9wdC5pbmxpbmVTb3VyY2VNYXAgPSBmYWxzZTtcbiAgY29tcGlsZXJPcHQuaW5saW5lU291cmNlcyA9IGZhbHNlO1xuICByZXF1aXJlLmV4dGVuc2lvbnNbZXh0XSA9IGZ1bmN0aW9uKG06IGFueSwgZmlsZW5hbWUpIHtcbiAgICAvLyAgIGlmIChzaG91bGRJZ25vcmUoZmlsZW5hbWUsIGlnbm9yZSkpIHtcbiAgICAvLyBcdHJldHVybiBvbGQobSwgZmlsZW5hbWUpO1xuICAgIC8vICAgfVxuICAgIGNvbnN0IF9jb21waWxlID0gbS5fY29tcGlsZTtcbiAgICBtLl9jb21waWxlID0gZnVuY3Rpb24oY29kZTogc3RyaW5nLCBmaWxlTmFtZTogc3RyaW5nKSB7XG4gICAgICBjb25zdCBqc2NvZGUgPSB0cmFuc3BpbGVBbmRDaGVjayhjb2RlLCBmaWxlTmFtZSwgY29tcGlsZXJPcHQpO1xuICAgICAgLy8gY29uc29sZS5sb2coanNjb2RlKTtcbiAgICAgIHJldHVybiBfY29tcGlsZS5jYWxsKHRoaXMsIGpzY29kZSwgZmlsZU5hbWUpO1xuICAgIH07XG4gICAgcmV0dXJuIG9sZChtLCBmaWxlbmFtZSk7XG4gIH07XG59XG5cbi8vIGV4cG9ydCBmdW5jdGlvbiB0ZXN0Q29tcGlsZXIoZmlsZTogc3RyaW5nKSB7XG4vLyAgIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbi8vICAgY29uc29sZS5sb2coZmlsZSk7XG4vLyAgIGNvbnN0IGNvbXBpbGVyT3B0ID0ge1xuLy8gICAgIGJhc2VVcmw6ICcuJyxcbi8vICAgICBvdXREaXI6ICcnLFxuLy8gICAgIGRlY2xhcmF0aW9uOiB0cnVlLFxuLy8gICAgIG1vZHVsZTogJ2NvbW1vbmpzJyxcbi8vICAgICB0YXJnZXQ6ICdlczIwMTUnLFxuLy8gICAgIG5vSW1wbGljaXRBbnk6IHRydWUsXG4vLyAgICAgc3VwcHJlc3NJbXBsaWNpdEFueUluZGV4RXJyb3JzOiB0cnVlLFxuLy8gICAgIGFsbG93U3ludGhldGljRGVmYXVsdEltcG9ydHM6IHRydWUsXG4vLyAgICAgZXNNb2R1bGVJbnRlcm9wOiB0cnVlLFxuLy8gICAgIGlubGluZVNvdXJjZU1hcDogZmFsc2UsXG4vLyAgICAgaW5saW5lU291cmNlczogdHJ1ZSxcbi8vICAgICBtb2R1bGVSZXNvbHV0aW9uOiAnbm9kZScsXG4vLyAgICAgZXhwZXJpbWVudGFsRGVjb3JhdG9yczogdHJ1ZSxcbi8vICAgICBlbWl0RGVjb3JhdG9yTWV0YWRhdGE6IHRydWUsXG4vLyAgICAgbm9VbnVzZWRMb2NhbHM6IHRydWUsXG4vLyAgICAgcHJlc2VydmVTeW1saW5rczogZmFsc2UsXG4vLyAgICAgZG93bmxldmVsSXRlcmF0aW9uOiBmYWxzZSxcbi8vICAgICBzdHJpY3ROdWxsQ2hlY2tzOiB0cnVlLFxuLy8gICAgIHJlc29sdmVKc29uTW9kdWxlOiB0cnVlLFxuLy8gICAgIGRpYWdub3N0aWNzOiB0cnVlLFxuLy8gICAgIGxpYjogWyAnZXMyMDE2JywgJ2VzMjAxNScsICdkb20nIF0sXG4vLyAgICAgcHJldHR5OiB0cnVlLFxuLy8gICAgIHJvb3REaXI6ICcuLicsXG4vLyAgICAgaW1wb3J0SGVscGVyczogdHJ1ZSxcbi8vICAgICBza2lwTGliQ2hlY2s6IHRydWUsXG4vLyAgICAgc291cmNlTWFwOiB0cnVlLFxuLy8gICAgIGVtaXREZWNsYXJhdGlvbk9ubHk6IGZhbHNlLFxuLy8gICAgIHBhdGhzOiB7XG4vLyAgICAgICAnKic6IFtcbi8vICAgICAgICAgJy4uL25vZGVfbW9kdWxlcy9AdHlwZXMvKicsXG4vLyAgICAgICAgICdub2RlX21vZHVsZXMvQHR5cGVzLyonLFxuLy8gICAgICAgICAnbm9kZV9tb2R1bGVzLyonLFxuLy8gICAgICAgICAnLi4vbm9kZV9tb2R1bGVzLyonXG4vLyAgICAgICBdXG4vLyAgICAgfSxcbi8vICAgICB0eXBlUm9vdHM6IFtcbi8vICAgICAgICcvVXNlcnMvbGl1amluZy9iay9teXRvb2wvbm9kZV9tb2R1bGVzL0B0eXBlcydcbi8vICAgICAgIC8vJy4vbm9kZV9tb2R1bGVzL0B0eXBlcycsICcuLi9ub2RlX21vZHVsZXMvQHR5cGVzJ1xuLy8gICAgIF1cbi8vICAgfTtcblxuLy8gICBjb25zdCBjbyA9IGpzb25Ub0NvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdCk7XG4vLyAgIHRyYW5zcGlsZUFuZENoZWNrKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlLCBjbyk7XG4vLyB9XG4iXX0=