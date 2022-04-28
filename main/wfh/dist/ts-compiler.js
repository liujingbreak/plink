"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerExtension = exports.transpileAndCheck = exports.transpileSingleTs = exports.jsonToCompilerOptions = exports.readTsConfig = void 0;
const ts = __importStar(require("typescript"));
const fs_1 = require("fs");
const misc_1 = require("./utils/misc");
const Path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const log4js_1 = require("log4js");
const log = (0, log4js_1.getLogger)('plink.ts-compiler');
function readTsConfig(tsconfigFile) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const tsconfig = ts.readConfigFile(tsconfigFile, (file) => (0, fs_1.readFileSync)(file, 'utf-8')).config;
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
// import {inspect} from 'util';
const { red, yellow } = chalk_1.default;
class TsCompiler {
    // currentFile: string;
    constructor(compilerOptions) {
        this.compilerOptions = compilerOptions;
        this.fileNames = [];
        this.files = {};
        this.fileContent = new Map();
        // eslint-disable-next-line @typescript-eslint/no-this-alias
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
    logErrors(fileName, isError = false) {
        const allDiagnostics = this.langService
            .getCompilerOptionsDiagnostics()
            .concat(this.langService.getSyntacticDiagnostics(fileName))
            .concat(this.langService.getSemanticDiagnostics(fileName));
        allDiagnostics.forEach(diagnostic => {
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            if (diagnostic.file) {
                const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
                log.info((isError ? red : yellow)(`[wfh.ts-compiler] ${(isError ? 'Error' : 'Warning')} ` +
                    `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`));
            }
            else {
                log.info((isError ? red : yellow)(`[wfh.ts-compiler] ${(isError ? 'Error' : 'Warning')}: ${message}`));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy90cy1jb21waWxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtDQUFpQztBQUNqQywyQkFBZ0M7QUFDaEMsdUNBQXNDO0FBQ3RDLDJDQUE2QjtBQUM3QixrREFBMEI7QUFDMUIsbUNBQWlDO0FBQ2pDLE1BQU0sR0FBRyxHQUFHLElBQUEsa0JBQVMsRUFBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBRTNDLFNBQWdCLFlBQVksQ0FBQyxZQUFvQjtJQUMvQyxtRUFBbUU7SUFDbkUsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUEsaUJBQVksRUFBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7SUFDL0YsT0FBTyxFQUFFLENBQUMsMEJBQTBCLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsZUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUN6RixTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ3JDLENBQUM7QUFMRCxvQ0FLQztBQUVEOzs7Ozs7R0FNRztBQUNILFNBQWdCLHFCQUFxQixDQUFDLGVBQW9CLEVBQUUsSUFBSSxHQUFHLGVBQWUsRUFDaEYsUUFBUSxHQUFHLGVBQVEsQ0FBQyxPQUFPO0lBQzNCLG1FQUFtRTtJQUNuRSxPQUFPLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyxFQUFDLGVBQWUsRUFBRSxlQUFlLEVBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUM3RyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQzNCLENB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QXlCO0FBQ3pCLDBDQUEwQztBQUMxQyxvQkFBb0I7QUFDcEIscUJBQXFCO0FBQ3JCLDJCQUEyQjtBQUMzQiwwQkFBMEI7QUFDMUIsdUJBQXVCO0FBQ3ZCLGtDQUFrQztBQUNsQyxlQUFlO0FBQ2YsZUFBZTtBQUNmLHNDQUFzQztBQUN0QyxtQ0FBbUM7QUFDbkMsNEJBQTRCO0FBQzVCLDhCQUE4QjtBQUM5QixVQUFVO0FBQ1YsU0FBUztBQUNULG1CQUFtQjtBQUNuQix1REFBdUQ7QUFDdkQsNERBQTREO0FBQzVELFFBQVE7QUFDUixPQUFPO0FBRVAsbURBQW1EO0FBQ25ELGdFQUFnRTtBQUNoRSxJQUFJIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge3JlYWRGaWxlU3luY30gZnJvbSAnZnMnO1xuaW1wb3J0IHtwbGlua0Vudn0gZnJvbSAnLi91dGlscy9taXNjJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLnRzLWNvbXBpbGVyJyk7XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkVHNDb25maWcodHNjb25maWdGaWxlOiBzdHJpbmcpOiB0cy5Db21waWxlck9wdGlvbnMge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gIGNvbnN0IHRzY29uZmlnID0gdHMucmVhZENvbmZpZ0ZpbGUodHNjb25maWdGaWxlLCAoZmlsZSkgPT4gcmVhZEZpbGVTeW5jKGZpbGUsICd1dGYtOCcpKS5jb25maWc7XG4gIHJldHVybiB0cy5wYXJzZUpzb25Db25maWdGaWxlQ29udGVudCh0c2NvbmZpZywgdHMuc3lzLCBwbGlua0Vudi53b3JrRGlyLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICB1bmRlZmluZWQsIHRzY29uZmlnRmlsZSkub3B0aW9ucztcbn1cblxuLyoqXG4gKiBjYWxsIHRzLnBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50KClcbiAqIEBwYXJhbSBqc29uQ29tcGlsZXJPcHQgXG4gKiBAcGFyYW0gZmlsZSBcbiAqIEBwYXJhbSBiYXNlUGF0aCAtICh0c2NvbmZpZyBmaWxlIGRpcmVjdG9yeSkgXG4gKiAgQSByb290IGRpcmVjdG9yeSB0byByZXNvbHZlIHJlbGF0aXZlIHBhdGggZW50cmllcyBpbiB0aGUgY29uZmlnIGZpbGUgdG8uIGUuZy4gb3V0RGlyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBqc29uVG9Db21waWxlck9wdGlvbnMoanNvbkNvbXBpbGVyT3B0OiBhbnksIGZpbGUgPSAndHNjb25maWcuanNvbicsXG4gIGJhc2VQYXRoID0gcGxpbmtFbnYud29ya0Rpcik6IHRzLkNvbXBpbGVyT3B0aW9ucyB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgcmV0dXJuIHRzLnBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50KHtjb21waWxlck9wdGlvbnM6IGpzb25Db21waWxlck9wdH0sIHRzLnN5cywgYmFzZVBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICB1bmRlZmluZWQsIGZpbGUpLm9wdGlvbnM7XG59XG5cbi8qKlxuICogUmVmZXIgdG8gaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L3dpa2kvVXNpbmctdGhlLUNvbXBpbGVyLUFQSSN0cmFuc3BpbGluZy1hLXNpbmdsZS1maWxlXG4gKiBAcGFyYW0gdHNDb2RlIFxuICovXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNwaWxlU2luZ2xlVHModHNDb2RlOiBzdHJpbmcsIGNvbXBpbGVyT3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKTogc3RyaW5nIHtcbiAgY29uc3QgcmVzID0gdHMudHJhbnNwaWxlTW9kdWxlKHRzQ29kZSwge2NvbXBpbGVyT3B0aW9uc30pO1xuICBpZiAocmVzLmRpYWdub3N0aWNzICYmIHJlcy5kaWFnbm9zdGljcy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgbXNnID0gYEZhaWxlZCB0byB0cmFuc3BpbGUgVFMgZXhwcmVzc2lvbjogJHt0c0NvZGV9XFxuYCArIHJlcy5kaWFnbm9zdGljcy5qb2luKCdcXG4nKTtcbiAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gIH1cbiAgcmV0dXJuIHJlcy5vdXRwdXRUZXh0O1xufVxuXG4vLyBpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5cbi8vIGltcG9ydCB7aW5zcGVjdH0gZnJvbSAndXRpbCc7XG5jb25zdCB7cmVkLCB5ZWxsb3d9ID0gY2hhbGs7XG5jbGFzcyBUc0NvbXBpbGVyIHtcbiAgZmlsZU5hbWVzOiBzdHJpbmdbXSA9IFtdO1xuICBmaWxlczogdHMuTWFwTGlrZTx7IHZlcnNpb246IG51bWJlciB9PiA9IHt9O1xuICBsYW5nU2VydmljZTogdHMuTGFuZ3VhZ2VTZXJ2aWNlO1xuICBmaWxlQ29udGVudCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIC8vIGN1cnJlbnRGaWxlOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocHVibGljIGNvbXBpbGVyT3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby10aGlzLWFsaWFzXG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgY29uc3QgY29tcGlsZXJIb3N0ID0gdHMuY3JlYXRlQ29tcGlsZXJIb3N0KGNvbXBpbGVyT3B0aW9ucyk7XG5cbiAgICBjb25zdCBjd2QgPSBwbGlua0Vudi53b3JrRGlyO1xuICAgIGNvbnN0IHNlcnZpY2VIb3N0OiB0cy5MYW5ndWFnZVNlcnZpY2VIb3N0ID0ge1xuICAgICAgZ2V0TmV3TGluZSgpIHsgcmV0dXJuICdcXG4nOyB9LFxuICAgICAgZ2V0Q29tcGlsYXRpb25TZXR0aW5ncygpIHsgcmV0dXJuIHNlbGYuY29tcGlsZXJPcHRpb25zO30sXG4gICAgICBnZXRTY3JpcHRGaWxlTmFtZXMoKSB7cmV0dXJuIHNlbGYuZmlsZU5hbWVzO30sXG4gICAgICBnZXRTY3JpcHRWZXJzaW9uOiBmaWxlTmFtZSA9PlxuICAgICAgICB0aGlzLmZpbGVzW2ZpbGVOYW1lXSAmJiB0aGlzLmZpbGVzW2ZpbGVOYW1lXS52ZXJzaW9uLnRvU3RyaW5nKCksXG4gICAgICBnZXRTY3JpcHRTbmFwc2hvdDogZmlsZU5hbWUgPT4ge1xuICAgICAgICBpZiAodGhpcy5maWxlQ29udGVudC5oYXMoZmlsZU5hbWUpKVxuICAgICAgICAgIHJldHVybiB0cy5TY3JpcHRTbmFwc2hvdC5mcm9tU3RyaW5nKHRoaXMuZmlsZUNvbnRlbnQuZ2V0KGZpbGVOYW1lKSEpO1xuICAgICAgICBpZiAodHMuc3lzLmZpbGVFeGlzdHMoZmlsZU5hbWUpKVxuICAgICAgICAgIHJldHVybiB0cy5TY3JpcHRTbmFwc2hvdC5mcm9tU3RyaW5nKHRzLnN5cy5yZWFkRmlsZShmaWxlTmFtZSkhKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH0sXG4gICAgICBnZXRDdXJyZW50RGlyZWN0b3J5OiAoKSA9PiBjd2QsXG4gICAgICBnZXREZWZhdWx0TGliRmlsZU5hbWU6ICgpID0+IGNvbXBpbGVySG9zdC5nZXREZWZhdWx0TGliRmlsZU5hbWVcdChjb21waWxlck9wdGlvbnMpLFxuICAgICAgZmlsZUV4aXN0czogKGY6IHN0cmluZykgPT4ge1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhmKTtcbiAgICAgICAgcmV0dXJuIGNvbXBpbGVySG9zdC5maWxlRXhpc3RzKGYpO1xuICAgICAgfSxcbiAgICAgIHJlYWRGaWxlKHBhdGg6IHN0cmluZywgZW5jb2RlPzogc3RyaW5nKSB7XG4gICAgICAgIGlmIChzZWxmLmZpbGVDb250ZW50LmhhcyhwYXRoKSlcbiAgICAgICAgICByZXR1cm4gc2VsZi5maWxlQ29udGVudC5nZXQocGF0aCk7XG4gICAgICAgIHJldHVybiBjb21waWxlckhvc3QucmVhZEZpbGUocGF0aCk7XG4gICAgICB9LFxuICAgICAgcmVhZERpcmVjdG9yeTogY29tcGlsZXJIb3N0LnJlYWREaXJlY3RvcnksXG4gICAgICBnZXREaXJlY3RvcmllczogY29tcGlsZXJIb3N0LmdldERpcmVjdG9yaWVzLFxuICAgICAgZGlyZWN0b3J5RXhpc3RzOiB0cy5zeXMuZGlyZWN0b3J5RXhpc3RzLCAvLyBkZWJ1Z2dhYmxlKCdkaXJlY3RvcnlFeGlzdHMnLCBjb21waWxlckhvc3QuZGlyZWN0b3J5RXhpc3RzKSxcbiAgICAgIHJlYWxwYXRoOiBjb21waWxlckhvc3QucmVhbHBhdGggLy8gZGVidWdnYWJsZSgncmVhbHBhdGgnLCBjb21waWxlckhvc3QucmVhbHBhdGgpLFxuICAgIH07XG4gICAgdGhpcy5sYW5nU2VydmljZSA9IHRzLmNyZWF0ZUxhbmd1YWdlU2VydmljZSggc2VydmljZUhvc3QsIHRzLmNyZWF0ZURvY3VtZW50UmVnaXN0cnkoKSk7XG5cbiAgfVxuXG4gIGNvbXBpbGUoZmlsZU5hbWU6IHN0cmluZywgc3JjQ29kZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICBmaWxlTmFtZSA9IFBhdGgucmVzb2x2ZShmaWxlTmFtZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHRoaXMuZmlsZUNvbnRlbnQuc2V0KGZpbGVOYW1lLCBzcmNDb2RlKTtcbiAgICB0aGlzLmZpbGVOYW1lcy5wdXNoKGZpbGVOYW1lKTtcbiAgICAvLyB0aGlzLmN1cnJlbnRGaWxlID0gZmlsZU5hbWU7XG4gICAgcmV0dXJuIHRoaXMuZW1pdEZpbGUoZmlsZU5hbWUpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGVtaXRGaWxlKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IG91dHB1dCA9IHRoaXMubGFuZ1NlcnZpY2UuZ2V0RW1pdE91dHB1dChmaWxlTmFtZSk7XG4gICAgdGhpcy5sb2dFcnJvcnMoZmlsZU5hbWUpO1xuICAgIGlmIChvdXRwdXQuZW1pdFNraXBwZWQpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhyZWQoYHRzLWNvbXBpbGVyIC0gY29tcGlsZSAke2ZpbGVOYW1lfSBmYWlsZWRgKSk7XG4gICAgICB0aGlzLmxvZ0Vycm9ycyhmaWxlTmFtZSwgdHJ1ZSk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBjb21waWxlIFR5cGVzY3JpcHQgJyArIGZpbGVOYW1lKTtcbiAgICB9XG4gICAgaWYgKG91dHB1dC5vdXRwdXRGaWxlcy5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3RzLWNvbXBpbGVyIC0gd2hhdCB0aGUgaGVjaywgdGhlcmUgYXJlIG1vcmUgdGhhbiBvbmUgb3V0cHV0IGZpbGVzPyAnICtcbiAgICAgICAgb3V0cHV0Lm91dHB1dEZpbGVzLm1hcChvID0+IHllbGxvdyhvLm5hbWUpKS5qb2luKCcsICcpKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBvIG9mIG91dHB1dC5vdXRwdXRGaWxlcykge1xuICAgICAgcmV0dXJuIG8udGV4dDtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgbG9nRXJyb3JzKGZpbGVOYW1lOiBzdHJpbmcsIGlzRXJyb3IgPSBmYWxzZSkge1xuICAgIGNvbnN0IGFsbERpYWdub3N0aWNzID0gdGhpcy5sYW5nU2VydmljZVxuICAgICAgLmdldENvbXBpbGVyT3B0aW9uc0RpYWdub3N0aWNzKClcbiAgICAgIC5jb25jYXQodGhpcy5sYW5nU2VydmljZS5nZXRTeW50YWN0aWNEaWFnbm9zdGljcyhmaWxlTmFtZSkpXG4gICAgICAuY29uY2F0KHRoaXMubGFuZ1NlcnZpY2UuZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhmaWxlTmFtZSkpO1xuXG4gICAgYWxsRGlhZ25vc3RpY3MuZm9yRWFjaChkaWFnbm9zdGljID0+IHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0cy5mbGF0dGVuRGlhZ25vc3RpY01lc3NhZ2VUZXh0KGRpYWdub3N0aWMubWVzc2FnZVRleHQsICdcXG4nKTtcbiAgICAgIGlmIChkaWFnbm9zdGljLmZpbGUpIHtcbiAgICAgICAgY29uc3QgeyBsaW5lLCBjaGFyYWN0ZXIgfSA9IGRpYWdub3N0aWMuZmlsZS5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihkaWFnbm9zdGljLnN0YXJ0ISk7XG4gICAgICAgIGxvZy5pbmZvKChpc0Vycm9yID8gcmVkIDogeWVsbG93KShgW3dmaC50cy1jb21waWxlcl0gJHsoaXNFcnJvciA/ICdFcnJvcicgOiAnV2FybmluZycpfSBgICtcbiAgICAgICAgICBgJHtkaWFnbm9zdGljLmZpbGUuZmlsZU5hbWV9ICgke2xpbmUgKyAxfSwke2NoYXJhY3RlciArIDF9KTogJHttZXNzYWdlfWApKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5pbmZvKChpc0Vycm9yID8gcmVkIDogeWVsbG93KShgW3dmaC50cy1jb21waWxlcl0gJHsoaXNFcnJvciA/ICdFcnJvcicgOiAnV2FybmluZycpfTogJHttZXNzYWdlfWApKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5sZXQgc2luZ2xldG9uQ29tcGlsZXI6IFRzQ29tcGlsZXI7XG5leHBvcnQgZnVuY3Rpb24gdHJhbnNwaWxlQW5kQ2hlY2sodHNDb2RlOiBzdHJpbmcsIGZpbGVuYW1lOiBzdHJpbmcsIGNvOiB0cy5Db21waWxlck9wdGlvbnN8c3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgaWYgKHR5cGVvZiBjbyA9PT0gJ3N0cmluZycpIHtcbiAgICBjbyA9IHJlYWRUc0NvbmZpZyhjbyk7XG4gIH1cbiAgY28uZGVjbGFyYXRpb24gPSBmYWxzZTtcbiAgY28uZGVjbGFyYXRpb25NYXAgPSBmYWxzZTtcbiAgLy8gY28uaW5saW5lU291cmNlTWFwID0gdHJ1ZTtcbiAgLy8gY28uc291cmNlTWFwID0gdHJ1ZTtcbiAgaWYgKHNpbmdsZXRvbkNvbXBpbGVyID09IG51bGwpXG4gICAgc2luZ2xldG9uQ29tcGlsZXIgPSBuZXcgVHNDb21waWxlcihjbyk7XG4gIHJldHVybiBzaW5nbGV0b25Db21waWxlci5jb21waWxlKGZpbGVuYW1lLCB0c0NvZGUpO1xufVxuXG4vKipcbiAqIEV4YWN0bHkgbGlrZSB0cy1ub2RlLCBzbyB0aGF0IHdlIGNhbiBgcmVxdWlyZSgpYCBhIHRzIGZpbGUgZGlyZWN0bHkgd2l0aG91dCBgdHNjYFxuICogQHBhcmFtIGV4dCBcbiAqIEBwYXJhbSBjb21waWxlck9wdCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyRXh0ZW5zaW9uKGV4dDogc3RyaW5nLCBjb21waWxlck9wdDogdHMuQ29tcGlsZXJPcHRpb25zKSB7XG4gIGNvbnN0IG9sZCA9IHJlcXVpcmUuZXh0ZW5zaW9uc1tleHRdIHx8IHJlcXVpcmUuZXh0ZW5zaW9uc1snLmpzJ107XG4gIC8vIGNvbXBpbGVyT3B0LmlubGluZVNvdXJjZXMgPSB0cnVlO1xuICBjb21waWxlck9wdC5pbmxpbmVTb3VyY2VNYXAgPSBmYWxzZTtcbiAgY29tcGlsZXJPcHQuaW5saW5lU291cmNlcyA9IGZhbHNlO1xuICByZXF1aXJlLmV4dGVuc2lvbnNbZXh0XSA9IGZ1bmN0aW9uKG06IGFueSwgZmlsZW5hbWUpIHtcblxuICAgIGNvbnN0IF9jb21waWxlID0gbS5fY29tcGlsZTtcbiAgICBtLl9jb21waWxlID0gZnVuY3Rpb24oY29kZTogc3RyaW5nLCBmaWxlTmFtZTogc3RyaW5nKSB7XG4gICAgICBjb25zdCBqc2NvZGUgPSB0cmFuc3BpbGVBbmRDaGVjayhjb2RlLCBmaWxlTmFtZSwgY29tcGlsZXJPcHQpO1xuICAgICAgLy8gY29uc29sZS5sb2coanNjb2RlKTtcbiAgICAgIHJldHVybiBfY29tcGlsZS5jYWxsKHRoaXMsIGpzY29kZSwgZmlsZU5hbWUpO1xuICAgIH07XG4gICAgcmV0dXJuIG9sZChtLCBmaWxlbmFtZSk7XG4gIH07XG59XG5cbi8vIGV4cG9ydCBmdW5jdGlvbiB0ZXN0Q29tcGlsZXIoZmlsZTogc3RyaW5nKSB7XG4vLyAgIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbi8vICAgY29uc29sZS5sb2coZmlsZSk7XG4vLyAgIGNvbnN0IGNvbXBpbGVyT3B0ID0ge1xuLy8gICAgIGJhc2VVcmw6ICcuJyxcbi8vICAgICBvdXREaXI6ICcnLFxuLy8gICAgIGRlY2xhcmF0aW9uOiB0cnVlLFxuLy8gICAgIG1vZHVsZTogJ2NvbW1vbmpzJyxcbi8vICAgICB0YXJnZXQ6ICdlczIwMTUnLFxuLy8gICAgIG5vSW1wbGljaXRBbnk6IHRydWUsXG4vLyAgICAgc3VwcHJlc3NJbXBsaWNpdEFueUluZGV4RXJyb3JzOiB0cnVlLFxuLy8gICAgIGFsbG93U3ludGhldGljRGVmYXVsdEltcG9ydHM6IHRydWUsXG4vLyAgICAgZXNNb2R1bGVJbnRlcm9wOiB0cnVlLFxuLy8gICAgIGlubGluZVNvdXJjZU1hcDogZmFsc2UsXG4vLyAgICAgaW5saW5lU291cmNlczogdHJ1ZSxcbi8vICAgICBtb2R1bGVSZXNvbHV0aW9uOiAnbm9kZScsXG4vLyAgICAgZXhwZXJpbWVudGFsRGVjb3JhdG9yczogdHJ1ZSxcbi8vICAgICBlbWl0RGVjb3JhdG9yTWV0YWRhdGE6IHRydWUsXG4vLyAgICAgbm9VbnVzZWRMb2NhbHM6IHRydWUsXG4vLyAgICAgcHJlc2VydmVTeW1saW5rczogZmFsc2UsXG4vLyAgICAgZG93bmxldmVsSXRlcmF0aW9uOiBmYWxzZSxcbi8vICAgICBzdHJpY3ROdWxsQ2hlY2tzOiB0cnVlLFxuLy8gICAgIHJlc29sdmVKc29uTW9kdWxlOiB0cnVlLFxuLy8gICAgIGRpYWdub3N0aWNzOiB0cnVlLFxuLy8gICAgIGxpYjogWyAnZXMyMDE2JywgJ2VzMjAxNScsICdkb20nIF0sXG4vLyAgICAgcHJldHR5OiB0cnVlLFxuLy8gICAgIHJvb3REaXI6ICcuLicsXG4vLyAgICAgaW1wb3J0SGVscGVyczogdHJ1ZSxcbi8vICAgICBza2lwTGliQ2hlY2s6IHRydWUsXG4vLyAgICAgc291cmNlTWFwOiB0cnVlLFxuLy8gICAgIGVtaXREZWNsYXJhdGlvbk9ubHk6IGZhbHNlLFxuLy8gICAgIHBhdGhzOiB7XG4vLyAgICAgICAnKic6IFtcbi8vICAgICAgICAgJy4uL25vZGVfbW9kdWxlcy9AdHlwZXMvKicsXG4vLyAgICAgICAgICdub2RlX21vZHVsZXMvQHR5cGVzLyonLFxuLy8gICAgICAgICAnbm9kZV9tb2R1bGVzLyonLFxuLy8gICAgICAgICAnLi4vbm9kZV9tb2R1bGVzLyonXG4vLyAgICAgICBdXG4vLyAgICAgfSxcbi8vICAgICB0eXBlUm9vdHM6IFtcbi8vICAgICAgICcvVXNlcnMvbGl1amluZy9iay9teXRvb2wvbm9kZV9tb2R1bGVzL0B0eXBlcydcbi8vICAgICAgIC8vJy4vbm9kZV9tb2R1bGVzL0B0eXBlcycsICcuLi9ub2RlX21vZHVsZXMvQHR5cGVzJ1xuLy8gICAgIF1cbi8vICAgfTtcblxuLy8gICBjb25zdCBjbyA9IGpzb25Ub0NvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdCk7XG4vLyAgIHRyYW5zcGlsZUFuZENoZWNrKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlLCBjbyk7XG4vLyB9XG4iXX0=