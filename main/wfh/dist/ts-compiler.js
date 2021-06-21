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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerExtension = exports.transpileAndCheck = exports.transpileSingleTs = exports.jsonToCompilerOptions = exports.readTsConfig = void 0;
// eslint-disable  no-console
const ts = __importStar(require("typescript"));
const fs_1 = require("fs");
const misc_1 = require("./utils/misc");
function readTsConfig(tsconfigFile) {
    const tsconfig = ts.readConfigFile(tsconfigFile, (file) => fs_1.readFileSync(file, 'utf-8')).config;
    return ts.parseJsonConfigFileContent(tsconfig, ts.sys, misc_1.plinkEnv.workDir.replace(/\\/g, '/'), undefined, tsconfigFile).options;
}
exports.readTsConfig = readTsConfig;
/**
 * call ts.parseJsonConfigFileContent()
 * @param jsonCompilerOpt
 * @param file
 * @param basePath - (tsconfig file directory)
 *  A root directory to resolve relative path entries in the config file to. e.g. outDir
 */
function jsonToCompilerOptions(jsonCompilerOpt, file = 'tsconfig.json', basePath = misc_1.plinkEnv.workDir) {
    return ts.parseJsonConfigFileContent({ compilerOptions: jsonCompilerOpt }, ts.sys, basePath.replace(/\\/g, '/'), undefined, file).options;
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
        const cwd = misc_1.plinkEnv.workDir;
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
            getCurrentDirectory: () => cwd,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy90cy1jb21waWxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLCtDQUFpQztBQUNqQywyQkFBZ0M7QUFDaEMsdUNBQXNDO0FBRXRDLFNBQWdCLFlBQVksQ0FBQyxZQUFvQjtJQUMvQyxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsaUJBQVksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7SUFDL0YsT0FBTyxFQUFFLENBQUMsMEJBQTBCLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsZUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUN6RixTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ3JDLENBQUM7QUFKRCxvQ0FJQztBQUVEOzs7Ozs7R0FNRztBQUNILFNBQWdCLHFCQUFxQixDQUFDLGVBQW9CLEVBQUUsSUFBSSxHQUFHLGVBQWUsRUFDaEYsUUFBUSxHQUFHLGVBQVEsQ0FBQyxPQUFPO0lBQzNCLE9BQU8sRUFBRSxDQUFDLDBCQUEwQixDQUFDLEVBQUMsZUFBZSxFQUFFLGVBQWUsRUFBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQzdHLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDM0IsQ0FBQztBQUpELHNEQUlDO0FBRUQ7OztHQUdHO0FBQ0gsU0FBZ0IsaUJBQWlCLENBQUMsTUFBYyxFQUFFLGVBQW1DO0lBQ25GLE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLEVB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QiwyQkFBMkI7QUFDM0IsMEJBQTBCO0FBQzFCLHVCQUF1QjtBQUN2QixrQ0FBa0M7QUFDbEMsZUFBZTtBQUNmLGVBQWU7QUFDZixzQ0FBc0M7QUFDdEMsbUNBQW1DO0FBQ25DLDRCQUE0QjtBQUM1Qiw4QkFBOEI7QUFDOUIsVUFBVTtBQUNWLFNBQVM7QUFDVCxtQkFBbUI7QUFDbkIsdURBQXVEO0FBQ3ZELDREQUE0RDtBQUM1RCxRQUFRO0FBQ1IsT0FBTztBQUVQLG1EQUFtRDtBQUNuRCxnRUFBZ0U7QUFDaEUsSUFBSSIsInNvdXJjZXNDb250ZW50IjpbIi8vIGVzbGludC1kaXNhYmxlICBuby1jb25zb2xlXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7cmVhZEZpbGVTeW5jfSBmcm9tICdmcyc7XG5pbXBvcnQge3BsaW5rRW52fSBmcm9tICcuL3V0aWxzL21pc2MnO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVhZFRzQ29uZmlnKHRzY29uZmlnRmlsZTogc3RyaW5nKTogdHMuQ29tcGlsZXJPcHRpb25zIHtcbiAgY29uc3QgdHNjb25maWcgPSB0cy5yZWFkQ29uZmlnRmlsZSh0c2NvbmZpZ0ZpbGUsIChmaWxlKSA9PiByZWFkRmlsZVN5bmMoZmlsZSwgJ3V0Zi04JykpLmNvbmZpZztcbiAgcmV0dXJuIHRzLnBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50KHRzY29uZmlnLCB0cy5zeXMsIHBsaW5rRW52LndvcmtEaXIucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgIHVuZGVmaW5lZCwgdHNjb25maWdGaWxlKS5vcHRpb25zO1xufVxuXG4vKipcbiAqIGNhbGwgdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQoKVxuICogQHBhcmFtIGpzb25Db21waWxlck9wdCBcbiAqIEBwYXJhbSBmaWxlIFxuICogQHBhcmFtIGJhc2VQYXRoIC0gKHRzY29uZmlnIGZpbGUgZGlyZWN0b3J5KSBcbiAqICBBIHJvb3QgZGlyZWN0b3J5IHRvIHJlc29sdmUgcmVsYXRpdmUgcGF0aCBlbnRyaWVzIGluIHRoZSBjb25maWcgZmlsZSB0by4gZS5nLiBvdXREaXJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGpzb25Ub0NvbXBpbGVyT3B0aW9ucyhqc29uQ29tcGlsZXJPcHQ6IGFueSwgZmlsZSA9ICd0c2NvbmZpZy5qc29uJyxcbiAgYmFzZVBhdGggPSBwbGlua0Vudi53b3JrRGlyKTogdHMuQ29tcGlsZXJPcHRpb25zIHtcbiAgcmV0dXJuIHRzLnBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50KHtjb21waWxlck9wdGlvbnM6IGpzb25Db21waWxlck9wdH0sIHRzLnN5cywgYmFzZVBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICB1bmRlZmluZWQsIGZpbGUpLm9wdGlvbnM7XG59XG5cbi8qKlxuICogUmVmZXIgdG8gaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L3dpa2kvVXNpbmctdGhlLUNvbXBpbGVyLUFQSSN0cmFuc3BpbGluZy1hLXNpbmdsZS1maWxlXG4gKiBAcGFyYW0gdHNDb2RlIFxuICovXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNwaWxlU2luZ2xlVHModHNDb2RlOiBzdHJpbmcsIGNvbXBpbGVyT3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKTogc3RyaW5nIHtcbiAgY29uc3QgcmVzID0gdHMudHJhbnNwaWxlTW9kdWxlKHRzQ29kZSwge2NvbXBpbGVyT3B0aW9uc30pO1xuICBpZiAocmVzLmRpYWdub3N0aWNzICYmIHJlcy5kaWFnbm9zdGljcy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgbXNnID0gYEZhaWxlZCB0byB0cmFuc3BpbGUgVFMgZXhwcmVzc2lvbjogJHt0c0NvZGV9XFxuYCArIHJlcy5kaWFnbm9zdGljcy5qb2luKCdcXG4nKTtcbiAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gIH1cbiAgcmV0dXJuIHJlcy5vdXRwdXRUZXh0O1xufVxuXG4vLyBpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0IHtpbnNwZWN0fSBmcm9tICd1dGlsJztcbmNvbnN0IGNoYWxrID0gcmVxdWlyZSgnY2hhbGsnKTtcbmNvbnN0IHtyZWQsIHllbGxvd30gPSBjaGFsaztcbmNsYXNzIFRzQ29tcGlsZXIge1xuICBmaWxlTmFtZXM6IHN0cmluZ1tdID0gW107XG4gIGZpbGVzOiB0cy5NYXBMaWtlPHsgdmVyc2lvbjogbnVtYmVyIH0+ID0ge307XG4gIGxhbmdTZXJ2aWNlOiB0cy5MYW5ndWFnZVNlcnZpY2U7XG4gIGZpbGVDb250ZW50ID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgLy8gY3VycmVudEZpbGU6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgY29tcGlsZXJPcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICBjb25zdCBjb21waWxlckhvc3QgPSB0cy5jcmVhdGVDb21waWxlckhvc3QoY29tcGlsZXJPcHRpb25zKTtcblxuICAgIGNvbnN0IGN3ZCA9IHBsaW5rRW52LndvcmtEaXI7XG4gICAgY29uc3Qgc2VydmljZUhvc3Q6IHRzLkxhbmd1YWdlU2VydmljZUhvc3QgPSB7XG4gICAgICBnZXROZXdMaW5lKCkgeyByZXR1cm4gJ1xcbic7IH0sXG4gICAgICBnZXRDb21waWxhdGlvblNldHRpbmdzKCkgeyByZXR1cm4gc2VsZi5jb21waWxlck9wdGlvbnM7fSxcbiAgICAgIGdldFNjcmlwdEZpbGVOYW1lcygpIHtyZXR1cm4gc2VsZi5maWxlTmFtZXM7fSxcbiAgICAgIGdldFNjcmlwdFZlcnNpb246IGZpbGVOYW1lID0+XG4gICAgICAgIHRoaXMuZmlsZXNbZmlsZU5hbWVdICYmIHRoaXMuZmlsZXNbZmlsZU5hbWVdLnZlcnNpb24udG9TdHJpbmcoKSxcbiAgICAgIGdldFNjcmlwdFNuYXBzaG90OiBmaWxlTmFtZSA9PiB7XG4gICAgICAgIGlmICh0aGlzLmZpbGVDb250ZW50LmhhcyhmaWxlTmFtZSkpXG4gICAgICAgICAgcmV0dXJuIHRzLlNjcmlwdFNuYXBzaG90LmZyb21TdHJpbmcodGhpcy5maWxlQ29udGVudC5nZXQoZmlsZU5hbWUpISk7XG4gICAgICAgIGlmICh0cy5zeXMuZmlsZUV4aXN0cyhmaWxlTmFtZSkpXG4gICAgICAgICAgcmV0dXJuIHRzLlNjcmlwdFNuYXBzaG90LmZyb21TdHJpbmcodHMuc3lzLnJlYWRGaWxlKGZpbGVOYW1lKSEpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfSxcbiAgICAgIGdldEN1cnJlbnREaXJlY3Rvcnk6ICgpID0+IGN3ZCxcbiAgICAgIGdldERlZmF1bHRMaWJGaWxlTmFtZTogKCkgPT4gY29tcGlsZXJIb3N0LmdldERlZmF1bHRMaWJGaWxlTmFtZVx0KGNvbXBpbGVyT3B0aW9ucyksXG4gICAgICBmaWxlRXhpc3RzOiAoZjogc3RyaW5nKSA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGYpO1xuICAgICAgICByZXR1cm4gY29tcGlsZXJIb3N0LmZpbGVFeGlzdHMoZik7XG4gICAgICB9LFxuICAgICAgcmVhZEZpbGUocGF0aDogc3RyaW5nLCBlbmNvZGU/OiBzdHJpbmcpIHtcbiAgICAgICAgaWYgKHNlbGYuZmlsZUNvbnRlbnQuaGFzKHBhdGgpKVxuICAgICAgICAgIHJldHVybiBzZWxmLmZpbGVDb250ZW50LmdldChwYXRoKTtcbiAgICAgICAgcmV0dXJuIGNvbXBpbGVySG9zdC5yZWFkRmlsZShwYXRoKTtcbiAgICAgIH0sXG4gICAgICByZWFkRGlyZWN0b3J5OiBjb21waWxlckhvc3QucmVhZERpcmVjdG9yeSxcbiAgICAgIGdldERpcmVjdG9yaWVzOiBjb21waWxlckhvc3QuZ2V0RGlyZWN0b3JpZXMsXG4gICAgICBkaXJlY3RvcnlFeGlzdHM6IHRzLnN5cy5kaXJlY3RvcnlFeGlzdHMsIC8vIGRlYnVnZ2FibGUoJ2RpcmVjdG9yeUV4aXN0cycsIGNvbXBpbGVySG9zdC5kaXJlY3RvcnlFeGlzdHMpLFxuICAgICAgcmVhbHBhdGg6IGNvbXBpbGVySG9zdC5yZWFscGF0aCAvLyBkZWJ1Z2dhYmxlKCdyZWFscGF0aCcsIGNvbXBpbGVySG9zdC5yZWFscGF0aCksXG4gICAgfTtcbiAgICB0aGlzLmxhbmdTZXJ2aWNlID0gdHMuY3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlKCBzZXJ2aWNlSG9zdCwgdHMuY3JlYXRlRG9jdW1lbnRSZWdpc3RyeSgpKTtcblxuICB9XG5cbiAgY29tcGlsZShmaWxlTmFtZTogc3RyaW5nLCBzcmNDb2RlOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGZpbGVOYW1lID0gUGF0aC5yZXNvbHZlKGZpbGVOYW1lKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgdGhpcy5maWxlQ29udGVudC5zZXQoZmlsZU5hbWUsIHNyY0NvZGUpO1xuICAgIHRoaXMuZmlsZU5hbWVzLnB1c2goZmlsZU5hbWUpO1xuICAgIC8vIHRoaXMuY3VycmVudEZpbGUgPSBmaWxlTmFtZTtcbiAgICByZXR1cm4gdGhpcy5lbWl0RmlsZShmaWxlTmFtZSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgZW1pdEZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgb3V0cHV0ID0gdGhpcy5sYW5nU2VydmljZS5nZXRFbWl0T3V0cHV0KGZpbGVOYW1lKTtcbiAgICB0aGlzLmxvZ0Vycm9ycyhmaWxlTmFtZSk7XG4gICAgaWYgKG91dHB1dC5lbWl0U2tpcHBlZCkge1xuICAgICAgY29uc29sZS5sb2cocmVkKGB0cy1jb21waWxlciAtIGNvbXBpbGUgJHtmaWxlTmFtZX0gZmFpbGVkYCkpO1xuICAgICAgdGhpcy5sb2dFcnJvcnMoZmlsZU5hbWUsIHRydWUpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gY29tcGlsZSBUeXBlc2NyaXB0ICcgKyBmaWxlTmFtZSk7XG4gICAgfVxuICAgIGlmIChvdXRwdXQub3V0cHV0RmlsZXMubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCd0cy1jb21waWxlciAtIHdoYXQgdGhlIGhlY2ssIHRoZXJlIGFyZSBtb3JlIHRoYW4gb25lIG91dHB1dCBmaWxlcz8gJyArXG4gICAgICAgIG91dHB1dC5vdXRwdXRGaWxlcy5tYXAobyA9PiB5ZWxsb3coby5uYW1lKSkuam9pbignLCAnKSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgbyBvZiBvdXRwdXQub3V0cHV0RmlsZXMpIHtcbiAgICAgIHJldHVybiBvLnRleHQ7XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIGxvZ0Vycm9ycyhmaWxlTmFtZTogc3RyaW5nLCBpc0Vycm9yID0gZmFsc2UpIHtcbiAgICBjb25zdCBhbGxEaWFnbm9zdGljcyA9IHRoaXMubGFuZ1NlcnZpY2VcbiAgICAgIC5nZXRDb21waWxlck9wdGlvbnNEaWFnbm9zdGljcygpXG4gICAgICAuY29uY2F0KHRoaXMubGFuZ1NlcnZpY2UuZ2V0U3ludGFjdGljRGlhZ25vc3RpY3MoZmlsZU5hbWUpKVxuICAgICAgLmNvbmNhdCh0aGlzLmxhbmdTZXJ2aWNlLmdldFNlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWUpKTtcblxuICAgIGFsbERpYWdub3N0aWNzLmZvckVhY2goZGlhZ25vc3RpYyA9PiB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gdHMuZmxhdHRlbkRpYWdub3N0aWNNZXNzYWdlVGV4dChkaWFnbm9zdGljLm1lc3NhZ2VUZXh0LCAnXFxuJyk7XG4gICAgICBpZiAoZGlhZ25vc3RpYy5maWxlKSB7XG4gICAgICAgIGNvbnN0IHsgbGluZSwgY2hhcmFjdGVyIH0gPSBkaWFnbm9zdGljLmZpbGUuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24oZGlhZ25vc3RpYy5zdGFydCEpO1xuICAgICAgICBjb25zb2xlLmxvZygoaXNFcnJvciA/IHJlZCA6IHllbGxvdykoYFt3ZmgudHMtY29tcGlsZXJdICR7KGlzRXJyb3IgPyAnRXJyb3InIDogJ1dhcm5pbmcnKX0gYCArXG4gICAgICAgICAgYCR7ZGlhZ25vc3RpYy5maWxlLmZpbGVOYW1lfSAoJHtsaW5lICsgMX0sJHtjaGFyYWN0ZXIgKyAxfSk6ICR7bWVzc2FnZX1gKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZygoaXNFcnJvciA/IHJlZCA6IHllbGxvdykoYFt3ZmgudHMtY29tcGlsZXJdICR7KGlzRXJyb3IgPyAnRXJyb3InIDogJ1dhcm5pbmcnKX06ICR7bWVzc2FnZX1gKSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxubGV0IHNpbmdsZXRvbkNvbXBpbGVyOiBUc0NvbXBpbGVyO1xuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zcGlsZUFuZENoZWNrKHRzQ29kZTogc3RyaW5nLCBmaWxlbmFtZTogc3RyaW5nLCBjbzogdHMuQ29tcGlsZXJPcHRpb25zfHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGlmICh0eXBlb2YgY28gPT09ICdzdHJpbmcnKSB7XG4gICAgY28gPSByZWFkVHNDb25maWcoY28pO1xuICB9XG4gIGNvLmRlY2xhcmF0aW9uID0gZmFsc2U7XG4gIGNvLmRlY2xhcmF0aW9uTWFwID0gZmFsc2U7XG4gIC8vIGNvLmlubGluZVNvdXJjZU1hcCA9IHRydWU7XG4gIC8vIGNvLnNvdXJjZU1hcCA9IHRydWU7XG4gIGlmIChzaW5nbGV0b25Db21waWxlciA9PSBudWxsKVxuICAgIHNpbmdsZXRvbkNvbXBpbGVyID0gbmV3IFRzQ29tcGlsZXIoY28pO1xuICByZXR1cm4gc2luZ2xldG9uQ29tcGlsZXIuY29tcGlsZShmaWxlbmFtZSwgdHNDb2RlKTtcbn1cblxuLyoqXG4gKiBFeGFjdGx5IGxpa2UgdHMtbm9kZSwgc28gdGhhdCB3ZSBjYW4gYHJlcXVpcmUoKWAgYSB0cyBmaWxlIGRpcmVjdGx5IHdpdGhvdXQgYHRzY2BcbiAqIEBwYXJhbSBleHQgXG4gKiBAcGFyYW0gY29tcGlsZXJPcHQgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlckV4dGVuc2lvbihleHQ6IHN0cmluZywgY29tcGlsZXJPcHQ6IHRzLkNvbXBpbGVyT3B0aW9ucykge1xuICBjb25zdCBvbGQgPSByZXF1aXJlLmV4dGVuc2lvbnNbZXh0XSB8fCByZXF1aXJlLmV4dGVuc2lvbnNbJy5qcyddO1xuICAvLyBjb21waWxlck9wdC5pbmxpbmVTb3VyY2VzID0gdHJ1ZTtcbiAgY29tcGlsZXJPcHQuaW5saW5lU291cmNlTWFwID0gZmFsc2U7XG4gIGNvbXBpbGVyT3B0LmlubGluZVNvdXJjZXMgPSBmYWxzZTtcbiAgcmVxdWlyZS5leHRlbnNpb25zW2V4dF0gPSBmdW5jdGlvbihtOiBhbnksIGZpbGVuYW1lKSB7XG4gICAgLy8gICBpZiAoc2hvdWxkSWdub3JlKGZpbGVuYW1lLCBpZ25vcmUpKSB7XG4gICAgLy8gXHRyZXR1cm4gb2xkKG0sIGZpbGVuYW1lKTtcbiAgICAvLyAgIH1cbiAgICBjb25zdCBfY29tcGlsZSA9IG0uX2NvbXBpbGU7XG4gICAgbS5fY29tcGlsZSA9IGZ1bmN0aW9uKGNvZGU6IHN0cmluZywgZmlsZU5hbWU6IHN0cmluZykge1xuICAgICAgY29uc3QganNjb2RlID0gdHJhbnNwaWxlQW5kQ2hlY2soY29kZSwgZmlsZU5hbWUsIGNvbXBpbGVyT3B0KTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKGpzY29kZSk7XG4gICAgICByZXR1cm4gX2NvbXBpbGUuY2FsbCh0aGlzLCBqc2NvZGUsIGZpbGVOYW1lKTtcbiAgICB9O1xuICAgIHJldHVybiBvbGQobSwgZmlsZW5hbWUpO1xuICB9O1xufVxuXG4vLyBleHBvcnQgZnVuY3Rpb24gdGVzdENvbXBpbGVyKGZpbGU6IHN0cmluZykge1xuLy8gICBjb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG4vLyAgIGNvbnNvbGUubG9nKGZpbGUpO1xuLy8gICBjb25zdCBjb21waWxlck9wdCA9IHtcbi8vICAgICBiYXNlVXJsOiAnLicsXG4vLyAgICAgb3V0RGlyOiAnJyxcbi8vICAgICBkZWNsYXJhdGlvbjogdHJ1ZSxcbi8vICAgICBtb2R1bGU6ICdjb21tb25qcycsXG4vLyAgICAgdGFyZ2V0OiAnZXMyMDE1Jyxcbi8vICAgICBub0ltcGxpY2l0QW55OiB0cnVlLFxuLy8gICAgIHN1cHByZXNzSW1wbGljaXRBbnlJbmRleEVycm9yczogdHJ1ZSxcbi8vICAgICBhbGxvd1N5bnRoZXRpY0RlZmF1bHRJbXBvcnRzOiB0cnVlLFxuLy8gICAgIGVzTW9kdWxlSW50ZXJvcDogdHJ1ZSxcbi8vICAgICBpbmxpbmVTb3VyY2VNYXA6IGZhbHNlLFxuLy8gICAgIGlubGluZVNvdXJjZXM6IHRydWUsXG4vLyAgICAgbW9kdWxlUmVzb2x1dGlvbjogJ25vZGUnLFxuLy8gICAgIGV4cGVyaW1lbnRhbERlY29yYXRvcnM6IHRydWUsXG4vLyAgICAgZW1pdERlY29yYXRvck1ldGFkYXRhOiB0cnVlLFxuLy8gICAgIG5vVW51c2VkTG9jYWxzOiB0cnVlLFxuLy8gICAgIHByZXNlcnZlU3ltbGlua3M6IGZhbHNlLFxuLy8gICAgIGRvd25sZXZlbEl0ZXJhdGlvbjogZmFsc2UsXG4vLyAgICAgc3RyaWN0TnVsbENoZWNrczogdHJ1ZSxcbi8vICAgICByZXNvbHZlSnNvbk1vZHVsZTogdHJ1ZSxcbi8vICAgICBkaWFnbm9zdGljczogdHJ1ZSxcbi8vICAgICBsaWI6IFsgJ2VzMjAxNicsICdlczIwMTUnLCAnZG9tJyBdLFxuLy8gICAgIHByZXR0eTogdHJ1ZSxcbi8vICAgICByb290RGlyOiAnLi4nLFxuLy8gICAgIGltcG9ydEhlbHBlcnM6IHRydWUsXG4vLyAgICAgc2tpcExpYkNoZWNrOiB0cnVlLFxuLy8gICAgIHNvdXJjZU1hcDogdHJ1ZSxcbi8vICAgICBlbWl0RGVjbGFyYXRpb25Pbmx5OiBmYWxzZSxcbi8vICAgICBwYXRoczoge1xuLy8gICAgICAgJyonOiBbXG4vLyAgICAgICAgICcuLi9ub2RlX21vZHVsZXMvQHR5cGVzLyonLFxuLy8gICAgICAgICAnbm9kZV9tb2R1bGVzL0B0eXBlcy8qJyxcbi8vICAgICAgICAgJ25vZGVfbW9kdWxlcy8qJyxcbi8vICAgICAgICAgJy4uL25vZGVfbW9kdWxlcy8qJ1xuLy8gICAgICAgXVxuLy8gICAgIH0sXG4vLyAgICAgdHlwZVJvb3RzOiBbXG4vLyAgICAgICAnL1VzZXJzL2xpdWppbmcvYmsvbXl0b29sL25vZGVfbW9kdWxlcy9AdHlwZXMnXG4vLyAgICAgICAvLycuL25vZGVfbW9kdWxlcy9AdHlwZXMnLCAnLi4vbm9kZV9tb2R1bGVzL0B0eXBlcydcbi8vICAgICBdXG4vLyAgIH07XG5cbi8vICAgY29uc3QgY28gPSBqc29uVG9Db21waWxlck9wdGlvbnMoY29tcGlsZXJPcHQpO1xuLy8gICB0cmFuc3BpbGVBbmRDaGVjayhmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSwgZmlsZSwgY28pO1xuLy8gfVxuIl19