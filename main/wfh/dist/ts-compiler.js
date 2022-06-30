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
const fs_1 = require("fs");
const Path = __importStar(require("path"));
const ts = __importStar(require("typescript"));
const chalk_1 = __importDefault(require("chalk"));
const log4js_1 = require("log4js");
const misc_1 = require("./utils/misc");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy90cy1jb21waWxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJCQUFnQztBQUNoQywyQ0FBNkI7QUFDN0IsK0NBQWlDO0FBQ2pDLGtEQUEwQjtBQUMxQixtQ0FBaUM7QUFDakMsdUNBQXNDO0FBQ3RDLE1BQU0sR0FBRyxHQUFHLElBQUEsa0JBQVMsRUFBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBRTNDLFNBQWdCLFlBQVksQ0FBQyxZQUFvQjtJQUMvQyxtRUFBbUU7SUFDbkUsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUEsaUJBQVksRUFBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7SUFDL0YsT0FBTyxFQUFFLENBQUMsMEJBQTBCLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsZUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUN6RixTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ3JDLENBQUM7QUFMRCxvQ0FLQztBQUVEOzs7Ozs7R0FNRztBQUNILFNBQWdCLHFCQUFxQixDQUFDLGVBQW9CLEVBQUUsSUFBSSxHQUFHLGVBQWUsRUFDaEYsUUFBUSxHQUFHLGVBQVEsQ0FBQyxPQUFPO0lBQzNCLG1FQUFtRTtJQUNuRSxPQUFPLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyxFQUFDLGVBQWUsRUFBRSxlQUFlLEVBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUMzRyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQzdCLENB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QXlCO0FBQ3pCLDBDQUEwQztBQUMxQyxvQkFBb0I7QUFDcEIscUJBQXFCO0FBQ3JCLDJCQUEyQjtBQUMzQiwwQkFBMEI7QUFDMUIsdUJBQXVCO0FBQ3ZCLGtDQUFrQztBQUNsQyxlQUFlO0FBQ2YsZUFBZTtBQUNmLHNDQUFzQztBQUN0QyxtQ0FBbUM7QUFDbkMsNEJBQTRCO0FBQzVCLDhCQUE4QjtBQUM5QixVQUFVO0FBQ1YsU0FBUztBQUNULG1CQUFtQjtBQUNuQix1REFBdUQ7QUFDdkQsNERBQTREO0FBQzVELFFBQVE7QUFDUixPQUFPO0FBRVAsbURBQW1EO0FBQ25ELGdFQUFnRTtBQUNoRSxJQUFJIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtyZWFkRmlsZVN5bmN9IGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7cGxpbmtFbnZ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLnRzLWNvbXBpbGVyJyk7XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkVHNDb25maWcodHNjb25maWdGaWxlOiBzdHJpbmcpOiB0cy5Db21waWxlck9wdGlvbnMge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gIGNvbnN0IHRzY29uZmlnID0gdHMucmVhZENvbmZpZ0ZpbGUodHNjb25maWdGaWxlLCAoZmlsZSkgPT4gcmVhZEZpbGVTeW5jKGZpbGUsICd1dGYtOCcpKS5jb25maWc7XG4gIHJldHVybiB0cy5wYXJzZUpzb25Db25maWdGaWxlQ29udGVudCh0c2NvbmZpZywgdHMuc3lzLCBwbGlua0Vudi53b3JrRGlyLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICB1bmRlZmluZWQsIHRzY29uZmlnRmlsZSkub3B0aW9ucztcbn1cblxuLyoqXG4gKiBjYWxsIHRzLnBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50KClcbiAqIEBwYXJhbSBqc29uQ29tcGlsZXJPcHQgXG4gKiBAcGFyYW0gZmlsZSBcbiAqIEBwYXJhbSBiYXNlUGF0aCAtICh0c2NvbmZpZyBmaWxlIGRpcmVjdG9yeSkgXG4gKiAgQSByb290IGRpcmVjdG9yeSB0byByZXNvbHZlIHJlbGF0aXZlIHBhdGggZW50cmllcyBpbiB0aGUgY29uZmlnIGZpbGUgdG8uIGUuZy4gb3V0RGlyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBqc29uVG9Db21waWxlck9wdGlvbnMoanNvbkNvbXBpbGVyT3B0OiBhbnksIGZpbGUgPSAndHNjb25maWcuanNvbicsXG4gIGJhc2VQYXRoID0gcGxpbmtFbnYud29ya0Rpcik6IHRzLkNvbXBpbGVyT3B0aW9ucyB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgcmV0dXJuIHRzLnBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50KHtjb21waWxlck9wdGlvbnM6IGpzb25Db21waWxlck9wdH0sIHRzLnN5cywgYmFzZVBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgIHVuZGVmaW5lZCwgZmlsZSkub3B0aW9ucztcbn1cblxuLyoqXG4gKiBSZWZlciB0byBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvd2lraS9Vc2luZy10aGUtQ29tcGlsZXItQVBJI3RyYW5zcGlsaW5nLWEtc2luZ2xlLWZpbGVcbiAqIEBwYXJhbSB0c0NvZGUgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0cmFuc3BpbGVTaW5nbGVUcyh0c0NvZGU6IHN0cmluZywgY29tcGlsZXJPcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpOiBzdHJpbmcge1xuICBjb25zdCByZXMgPSB0cy50cmFuc3BpbGVNb2R1bGUodHNDb2RlLCB7Y29tcGlsZXJPcHRpb25zfSk7XG4gIGlmIChyZXMuZGlhZ25vc3RpY3MgJiYgcmVzLmRpYWdub3N0aWNzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBtc2cgPSBgRmFpbGVkIHRvIHRyYW5zcGlsZSBUUyBleHByZXNzaW9uOiAke3RzQ29kZX1cXG5gICsgcmVzLmRpYWdub3N0aWNzLmpvaW4oJ1xcbicpO1xuICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgfVxuICByZXR1cm4gcmVzLm91dHB1dFRleHQ7XG59XG5cbi8vIGltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcblxuLy8gaW1wb3J0IHtpbnNwZWN0fSBmcm9tICd1dGlsJztcbmNvbnN0IHtyZWQsIHllbGxvd30gPSBjaGFsaztcbmNsYXNzIFRzQ29tcGlsZXIge1xuICBmaWxlTmFtZXM6IHN0cmluZ1tdID0gW107XG4gIGZpbGVzOiB0cy5NYXBMaWtlPHt2ZXJzaW9uOiBudW1iZXJ9PiA9IHt9O1xuICBsYW5nU2VydmljZTogdHMuTGFuZ3VhZ2VTZXJ2aWNlO1xuICBmaWxlQ29udGVudCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIC8vIGN1cnJlbnRGaWxlOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocHVibGljIGNvbXBpbGVyT3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby10aGlzLWFsaWFzXG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgY29uc3QgY29tcGlsZXJIb3N0ID0gdHMuY3JlYXRlQ29tcGlsZXJIb3N0KGNvbXBpbGVyT3B0aW9ucyk7XG5cbiAgICBjb25zdCBjd2QgPSBwbGlua0Vudi53b3JrRGlyO1xuICAgIGNvbnN0IHNlcnZpY2VIb3N0OiB0cy5MYW5ndWFnZVNlcnZpY2VIb3N0ID0ge1xuICAgICAgZ2V0TmV3TGluZSgpIHsgcmV0dXJuICdcXG4nOyB9LFxuICAgICAgZ2V0Q29tcGlsYXRpb25TZXR0aW5ncygpIHsgcmV0dXJuIHNlbGYuY29tcGlsZXJPcHRpb25zOyB9LFxuICAgICAgZ2V0U2NyaXB0RmlsZU5hbWVzKCkge3JldHVybiBzZWxmLmZpbGVOYW1lczsgfSxcbiAgICAgIGdldFNjcmlwdFZlcnNpb246IGZpbGVOYW1lID0+XG4gICAgICAgIHRoaXMuZmlsZXNbZmlsZU5hbWVdICYmIHRoaXMuZmlsZXNbZmlsZU5hbWVdLnZlcnNpb24udG9TdHJpbmcoKSxcbiAgICAgIGdldFNjcmlwdFNuYXBzaG90OiBmaWxlTmFtZSA9PiB7XG4gICAgICAgIGlmICh0aGlzLmZpbGVDb250ZW50LmhhcyhmaWxlTmFtZSkpXG4gICAgICAgICAgcmV0dXJuIHRzLlNjcmlwdFNuYXBzaG90LmZyb21TdHJpbmcodGhpcy5maWxlQ29udGVudC5nZXQoZmlsZU5hbWUpISk7XG4gICAgICAgIGlmICh0cy5zeXMuZmlsZUV4aXN0cyhmaWxlTmFtZSkpXG4gICAgICAgICAgcmV0dXJuIHRzLlNjcmlwdFNuYXBzaG90LmZyb21TdHJpbmcodHMuc3lzLnJlYWRGaWxlKGZpbGVOYW1lKSEpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfSxcbiAgICAgIGdldEN1cnJlbnREaXJlY3Rvcnk6ICgpID0+IGN3ZCxcbiAgICAgIGdldERlZmF1bHRMaWJGaWxlTmFtZTogKCkgPT4gY29tcGlsZXJIb3N0LmdldERlZmF1bHRMaWJGaWxlTmFtZVx0KGNvbXBpbGVyT3B0aW9ucyksXG4gICAgICBmaWxlRXhpc3RzOiAoZjogc3RyaW5nKSA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGYpO1xuICAgICAgICByZXR1cm4gY29tcGlsZXJIb3N0LmZpbGVFeGlzdHMoZik7XG4gICAgICB9LFxuICAgICAgcmVhZEZpbGUocGF0aDogc3RyaW5nLCBlbmNvZGU/OiBzdHJpbmcpIHtcbiAgICAgICAgaWYgKHNlbGYuZmlsZUNvbnRlbnQuaGFzKHBhdGgpKVxuICAgICAgICAgIHJldHVybiBzZWxmLmZpbGVDb250ZW50LmdldChwYXRoKTtcbiAgICAgICAgcmV0dXJuIGNvbXBpbGVySG9zdC5yZWFkRmlsZShwYXRoKTtcbiAgICAgIH0sXG4gICAgICByZWFkRGlyZWN0b3J5OiBjb21waWxlckhvc3QucmVhZERpcmVjdG9yeSxcbiAgICAgIGdldERpcmVjdG9yaWVzOiBjb21waWxlckhvc3QuZ2V0RGlyZWN0b3JpZXMsXG4gICAgICBkaXJlY3RvcnlFeGlzdHM6IHRzLnN5cy5kaXJlY3RvcnlFeGlzdHMsIC8vIGRlYnVnZ2FibGUoJ2RpcmVjdG9yeUV4aXN0cycsIGNvbXBpbGVySG9zdC5kaXJlY3RvcnlFeGlzdHMpLFxuICAgICAgcmVhbHBhdGg6IGNvbXBpbGVySG9zdC5yZWFscGF0aCAvLyBkZWJ1Z2dhYmxlKCdyZWFscGF0aCcsIGNvbXBpbGVySG9zdC5yZWFscGF0aCksXG4gICAgfTtcbiAgICB0aGlzLmxhbmdTZXJ2aWNlID0gdHMuY3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlKCBzZXJ2aWNlSG9zdCwgdHMuY3JlYXRlRG9jdW1lbnRSZWdpc3RyeSgpKTtcblxuICB9XG5cbiAgY29tcGlsZShmaWxlTmFtZTogc3RyaW5nLCBzcmNDb2RlOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGZpbGVOYW1lID0gUGF0aC5yZXNvbHZlKGZpbGVOYW1lKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgdGhpcy5maWxlQ29udGVudC5zZXQoZmlsZU5hbWUsIHNyY0NvZGUpO1xuICAgIHRoaXMuZmlsZU5hbWVzLnB1c2goZmlsZU5hbWUpO1xuICAgIC8vIHRoaXMuY3VycmVudEZpbGUgPSBmaWxlTmFtZTtcbiAgICByZXR1cm4gdGhpcy5lbWl0RmlsZShmaWxlTmFtZSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgZW1pdEZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgb3V0cHV0ID0gdGhpcy5sYW5nU2VydmljZS5nZXRFbWl0T3V0cHV0KGZpbGVOYW1lKTtcbiAgICB0aGlzLmxvZ0Vycm9ycyhmaWxlTmFtZSk7XG4gICAgaWYgKG91dHB1dC5lbWl0U2tpcHBlZCkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKHJlZChgdHMtY29tcGlsZXIgLSBjb21waWxlICR7ZmlsZU5hbWV9IGZhaWxlZGApKTtcbiAgICAgIHRoaXMubG9nRXJyb3JzKGZpbGVOYW1lLCB0cnVlKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGNvbXBpbGUgVHlwZXNjcmlwdCAnICsgZmlsZU5hbWUpO1xuICAgIH1cbiAgICBpZiAob3V0cHV0Lm91dHB1dEZpbGVzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigndHMtY29tcGlsZXIgLSB3aGF0IHRoZSBoZWNrLCB0aGVyZSBhcmUgbW9yZSB0aGFuIG9uZSBvdXRwdXQgZmlsZXM/ICcgK1xuICAgICAgICBvdXRwdXQub3V0cHV0RmlsZXMubWFwKG8gPT4geWVsbG93KG8ubmFtZSkpLmpvaW4oJywgJykpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IG8gb2Ygb3V0cHV0Lm91dHB1dEZpbGVzKSB7XG4gICAgICByZXR1cm4gby50ZXh0O1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBsb2dFcnJvcnMoZmlsZU5hbWU6IHN0cmluZywgaXNFcnJvciA9IGZhbHNlKSB7XG4gICAgY29uc3QgYWxsRGlhZ25vc3RpY3MgPSB0aGlzLmxhbmdTZXJ2aWNlXG4gICAgICAuZ2V0Q29tcGlsZXJPcHRpb25zRGlhZ25vc3RpY3MoKVxuICAgICAgLmNvbmNhdCh0aGlzLmxhbmdTZXJ2aWNlLmdldFN5bnRhY3RpY0RpYWdub3N0aWNzKGZpbGVOYW1lKSlcbiAgICAgIC5jb25jYXQodGhpcy5sYW5nU2VydmljZS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lKSk7XG5cbiAgICBhbGxEaWFnbm9zdGljcy5mb3JFYWNoKGRpYWdub3N0aWMgPT4ge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IHRzLmZsYXR0ZW5EaWFnbm9zdGljTWVzc2FnZVRleHQoZGlhZ25vc3RpYy5tZXNzYWdlVGV4dCwgJ1xcbicpO1xuICAgICAgaWYgKGRpYWdub3N0aWMuZmlsZSkge1xuICAgICAgICBjb25zdCB7bGluZSwgY2hhcmFjdGVyfSA9IGRpYWdub3N0aWMuZmlsZS5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihkaWFnbm9zdGljLnN0YXJ0ISk7XG4gICAgICAgIGxvZy5pbmZvKChpc0Vycm9yID8gcmVkIDogeWVsbG93KShgW3dmaC50cy1jb21waWxlcl0gJHsoaXNFcnJvciA/ICdFcnJvcicgOiAnV2FybmluZycpfSBgICtcbiAgICAgICAgICBgJHtkaWFnbm9zdGljLmZpbGUuZmlsZU5hbWV9ICgke2xpbmUgKyAxfSwke2NoYXJhY3RlciArIDF9KTogJHttZXNzYWdlfWApKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5pbmZvKChpc0Vycm9yID8gcmVkIDogeWVsbG93KShgW3dmaC50cy1jb21waWxlcl0gJHsoaXNFcnJvciA/ICdFcnJvcicgOiAnV2FybmluZycpfTogJHttZXNzYWdlfWApKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5sZXQgc2luZ2xldG9uQ29tcGlsZXI6IFRzQ29tcGlsZXI7XG5leHBvcnQgZnVuY3Rpb24gdHJhbnNwaWxlQW5kQ2hlY2sodHNDb2RlOiBzdHJpbmcsIGZpbGVuYW1lOiBzdHJpbmcsIGNvOiB0cy5Db21waWxlck9wdGlvbnMgfCBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBpZiAodHlwZW9mIGNvID09PSAnc3RyaW5nJykge1xuICAgIGNvID0gcmVhZFRzQ29uZmlnKGNvKTtcbiAgfVxuICBjby5kZWNsYXJhdGlvbiA9IGZhbHNlO1xuICBjby5kZWNsYXJhdGlvbk1hcCA9IGZhbHNlO1xuICAvLyBjby5pbmxpbmVTb3VyY2VNYXAgPSB0cnVlO1xuICAvLyBjby5zb3VyY2VNYXAgPSB0cnVlO1xuICBpZiAoc2luZ2xldG9uQ29tcGlsZXIgPT0gbnVsbClcbiAgICBzaW5nbGV0b25Db21waWxlciA9IG5ldyBUc0NvbXBpbGVyKGNvKTtcbiAgcmV0dXJuIHNpbmdsZXRvbkNvbXBpbGVyLmNvbXBpbGUoZmlsZW5hbWUsIHRzQ29kZSk7XG59XG5cbi8qKlxuICogRXhhY3RseSBsaWtlIHRzLW5vZGUsIHNvIHRoYXQgd2UgY2FuIGByZXF1aXJlKClgIGEgdHMgZmlsZSBkaXJlY3RseSB3aXRob3V0IGB0c2NgXG4gKiBAcGFyYW0gZXh0IFxuICogQHBhcmFtIGNvbXBpbGVyT3B0IFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJFeHRlbnNpb24oZXh0OiBzdHJpbmcsIGNvbXBpbGVyT3B0OiB0cy5Db21waWxlck9wdGlvbnMpIHtcbiAgY29uc3Qgb2xkID0gcmVxdWlyZS5leHRlbnNpb25zW2V4dF0gfHwgcmVxdWlyZS5leHRlbnNpb25zWycuanMnXTtcbiAgLy8gY29tcGlsZXJPcHQuaW5saW5lU291cmNlcyA9IHRydWU7XG4gIGNvbXBpbGVyT3B0LmlubGluZVNvdXJjZU1hcCA9IGZhbHNlO1xuICBjb21waWxlck9wdC5pbmxpbmVTb3VyY2VzID0gZmFsc2U7XG4gIHJlcXVpcmUuZXh0ZW5zaW9uc1tleHRdID0gZnVuY3Rpb24obTogYW55LCBmaWxlbmFtZSkge1xuXG4gICAgY29uc3QgX2NvbXBpbGUgPSBtLl9jb21waWxlO1xuICAgIG0uX2NvbXBpbGUgPSBmdW5jdGlvbihjb2RlOiBzdHJpbmcsIGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgICAgIGNvbnN0IGpzY29kZSA9IHRyYW5zcGlsZUFuZENoZWNrKGNvZGUsIGZpbGVOYW1lLCBjb21waWxlck9wdCk7XG4gICAgICAvLyBjb25zb2xlLmxvZyhqc2NvZGUpO1xuICAgICAgcmV0dXJuIF9jb21waWxlLmNhbGwodGhpcywganNjb2RlLCBmaWxlTmFtZSk7XG4gICAgfTtcbiAgICByZXR1cm4gb2xkKG0sIGZpbGVuYW1lKTtcbiAgfTtcbn1cblxuLy8gZXhwb3J0IGZ1bmN0aW9uIHRlc3RDb21waWxlcihmaWxlOiBzdHJpbmcpIHtcbi8vICAgY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuLy8gICBjb25zb2xlLmxvZyhmaWxlKTtcbi8vICAgY29uc3QgY29tcGlsZXJPcHQgPSB7XG4vLyAgICAgYmFzZVVybDogJy4nLFxuLy8gICAgIG91dERpcjogJycsXG4vLyAgICAgZGVjbGFyYXRpb246IHRydWUsXG4vLyAgICAgbW9kdWxlOiAnY29tbW9uanMnLFxuLy8gICAgIHRhcmdldDogJ2VzMjAxNScsXG4vLyAgICAgbm9JbXBsaWNpdEFueTogdHJ1ZSxcbi8vICAgICBzdXBwcmVzc0ltcGxpY2l0QW55SW5kZXhFcnJvcnM6IHRydWUsXG4vLyAgICAgYWxsb3dTeW50aGV0aWNEZWZhdWx0SW1wb3J0czogdHJ1ZSxcbi8vICAgICBlc01vZHVsZUludGVyb3A6IHRydWUsXG4vLyAgICAgaW5saW5lU291cmNlTWFwOiBmYWxzZSxcbi8vICAgICBpbmxpbmVTb3VyY2VzOiB0cnVlLFxuLy8gICAgIG1vZHVsZVJlc29sdXRpb246ICdub2RlJyxcbi8vICAgICBleHBlcmltZW50YWxEZWNvcmF0b3JzOiB0cnVlLFxuLy8gICAgIGVtaXREZWNvcmF0b3JNZXRhZGF0YTogdHJ1ZSxcbi8vICAgICBub1VudXNlZExvY2FsczogdHJ1ZSxcbi8vICAgICBwcmVzZXJ2ZVN5bWxpbmtzOiBmYWxzZSxcbi8vICAgICBkb3dubGV2ZWxJdGVyYXRpb246IGZhbHNlLFxuLy8gICAgIHN0cmljdE51bGxDaGVja3M6IHRydWUsXG4vLyAgICAgcmVzb2x2ZUpzb25Nb2R1bGU6IHRydWUsXG4vLyAgICAgZGlhZ25vc3RpY3M6IHRydWUsXG4vLyAgICAgbGliOiBbICdlczIwMTYnLCAnZXMyMDE1JywgJ2RvbScgXSxcbi8vICAgICBwcmV0dHk6IHRydWUsXG4vLyAgICAgcm9vdERpcjogJy4uJyxcbi8vICAgICBpbXBvcnRIZWxwZXJzOiB0cnVlLFxuLy8gICAgIHNraXBMaWJDaGVjazogdHJ1ZSxcbi8vICAgICBzb3VyY2VNYXA6IHRydWUsXG4vLyAgICAgZW1pdERlY2xhcmF0aW9uT25seTogZmFsc2UsXG4vLyAgICAgcGF0aHM6IHtcbi8vICAgICAgICcqJzogW1xuLy8gICAgICAgICAnLi4vbm9kZV9tb2R1bGVzL0B0eXBlcy8qJyxcbi8vICAgICAgICAgJ25vZGVfbW9kdWxlcy9AdHlwZXMvKicsXG4vLyAgICAgICAgICdub2RlX21vZHVsZXMvKicsXG4vLyAgICAgICAgICcuLi9ub2RlX21vZHVsZXMvKidcbi8vICAgICAgIF1cbi8vICAgICB9LFxuLy8gICAgIHR5cGVSb290czogW1xuLy8gICAgICAgJy9Vc2Vycy9saXVqaW5nL2JrL215dG9vbC9ub2RlX21vZHVsZXMvQHR5cGVzJ1xuLy8gICAgICAgLy8nLi9ub2RlX21vZHVsZXMvQHR5cGVzJywgJy4uL25vZGVfbW9kdWxlcy9AdHlwZXMnXG4vLyAgICAgXVxuLy8gICB9O1xuXG4vLyAgIGNvbnN0IGNvID0ganNvblRvQ29tcGlsZXJPcHRpb25zKGNvbXBpbGVyT3B0KTtcbi8vICAgdHJhbnNwaWxlQW5kQ2hlY2soZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUsIGNvKTtcbi8vIH1cbiJdfQ==