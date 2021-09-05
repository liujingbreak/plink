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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy90cy1jb21waWxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0NBQWlDO0FBQ2pDLDJCQUFnQztBQUNoQyx1Q0FBc0M7QUFDdEMsMkNBQTZCO0FBQzdCLGtEQUEwQjtBQUMxQixtQ0FBaUM7QUFDakMsTUFBTSxHQUFHLEdBQUcsSUFBQSxrQkFBUyxFQUFDLG1CQUFtQixDQUFDLENBQUM7QUFFM0MsU0FBZ0IsWUFBWSxDQUFDLFlBQW9CO0lBQy9DLG1FQUFtRTtJQUNuRSxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBQSxpQkFBWSxFQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUMvRixPQUFPLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLEdBQUcsRUFBRSxlQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQ3pGLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDckMsQ0FBQztBQUxELG9DQUtDO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsU0FBZ0IscUJBQXFCLENBQUMsZUFBb0IsRUFBRSxJQUFJLEdBQUcsZUFBZSxFQUNoRixRQUFRLEdBQUcsZUFBUSxDQUFDLE9BQU87SUFDM0IsbUVBQW1FO0lBQ25FLE9BQU8sRUFBRSxDQUFDLDBCQUEwQixDQUFDLEVBQUMsZUFBZSxFQUFFLGVBQWUsRUFBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQzdHLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDM0IsQ0FBQztB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QUFDekIsMENBQTBDO0FBQzFDLG9CQUFvQjtBQUNwQixxQkFBcUI7QUFDckIsMkJBQTJCO0FBQzNCLDBCQUEwQjtBQUMxQix1QkFBdUI7QUFDdkIsa0NBQWtDO0FBQ2xDLGVBQWU7QUFDZixlQUFlO0FBQ2Ysc0NBQXNDO0FBQ3RDLG1DQUFtQztBQUNuQyw0QkFBNEI7QUFDNUIsOEJBQThCO0FBQzlCLFVBQVU7QUFDVixTQUFTO0FBQ1QsbUJBQW1CO0FBQ25CLHVEQUF1RDtBQUN2RCw0REFBNEQ7QUFDNUQsUUFBUTtBQUNSLE9BQU87QUFFUCxtREFBbUQ7QUFDbkQsZ0VBQWdFO0FBQ2hFLElBQUkiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7cmVhZEZpbGVTeW5jfSBmcm9tICdmcyc7XG5pbXBvcnQge3BsaW5rRW52fSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsudHMtY29tcGlsZXInKTtcblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRUc0NvbmZpZyh0c2NvbmZpZ0ZpbGU6IHN0cmluZyk6IHRzLkNvbXBpbGVyT3B0aW9ucyB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgY29uc3QgdHNjb25maWcgPSB0cy5yZWFkQ29uZmlnRmlsZSh0c2NvbmZpZ0ZpbGUsIChmaWxlKSA9PiByZWFkRmlsZVN5bmMoZmlsZSwgJ3V0Zi04JykpLmNvbmZpZztcbiAgcmV0dXJuIHRzLnBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50KHRzY29uZmlnLCB0cy5zeXMsIHBsaW5rRW52LndvcmtEaXIucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgIHVuZGVmaW5lZCwgdHNjb25maWdGaWxlKS5vcHRpb25zO1xufVxuXG4vKipcbiAqIGNhbGwgdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQoKVxuICogQHBhcmFtIGpzb25Db21waWxlck9wdCBcbiAqIEBwYXJhbSBmaWxlIFxuICogQHBhcmFtIGJhc2VQYXRoIC0gKHRzY29uZmlnIGZpbGUgZGlyZWN0b3J5KSBcbiAqICBBIHJvb3QgZGlyZWN0b3J5IHRvIHJlc29sdmUgcmVsYXRpdmUgcGF0aCBlbnRyaWVzIGluIHRoZSBjb25maWcgZmlsZSB0by4gZS5nLiBvdXREaXJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGpzb25Ub0NvbXBpbGVyT3B0aW9ucyhqc29uQ29tcGlsZXJPcHQ6IGFueSwgZmlsZSA9ICd0c2NvbmZpZy5qc29uJyxcbiAgYmFzZVBhdGggPSBwbGlua0Vudi53b3JrRGlyKTogdHMuQ29tcGlsZXJPcHRpb25zIHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICByZXR1cm4gdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQoe2NvbXBpbGVyT3B0aW9uczoganNvbkNvbXBpbGVyT3B0fSwgdHMuc3lzLCBiYXNlUGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gIHVuZGVmaW5lZCwgZmlsZSkub3B0aW9ucztcbn1cblxuLyoqXG4gKiBSZWZlciB0byBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvd2lraS9Vc2luZy10aGUtQ29tcGlsZXItQVBJI3RyYW5zcGlsaW5nLWEtc2luZ2xlLWZpbGVcbiAqIEBwYXJhbSB0c0NvZGUgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0cmFuc3BpbGVTaW5nbGVUcyh0c0NvZGU6IHN0cmluZywgY29tcGlsZXJPcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpOiBzdHJpbmcge1xuICBjb25zdCByZXMgPSB0cy50cmFuc3BpbGVNb2R1bGUodHNDb2RlLCB7Y29tcGlsZXJPcHRpb25zfSk7XG4gIGlmIChyZXMuZGlhZ25vc3RpY3MgJiYgcmVzLmRpYWdub3N0aWNzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBtc2cgPSBgRmFpbGVkIHRvIHRyYW5zcGlsZSBUUyBleHByZXNzaW9uOiAke3RzQ29kZX1cXG5gICsgcmVzLmRpYWdub3N0aWNzLmpvaW4oJ1xcbicpO1xuICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgfVxuICByZXR1cm4gcmVzLm91dHB1dFRleHQ7XG59XG5cbi8vIGltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcblxuLy8gaW1wb3J0IHtpbnNwZWN0fSBmcm9tICd1dGlsJztcbmNvbnN0IHtyZWQsIHllbGxvd30gPSBjaGFsaztcbmNsYXNzIFRzQ29tcGlsZXIge1xuICBmaWxlTmFtZXM6IHN0cmluZ1tdID0gW107XG4gIGZpbGVzOiB0cy5NYXBMaWtlPHsgdmVyc2lvbjogbnVtYmVyIH0+ID0ge307XG4gIGxhbmdTZXJ2aWNlOiB0cy5MYW5ndWFnZVNlcnZpY2U7XG4gIGZpbGVDb250ZW50ID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgLy8gY3VycmVudEZpbGU6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgY29tcGlsZXJPcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXRoaXMtYWxpYXNcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICBjb25zdCBjb21waWxlckhvc3QgPSB0cy5jcmVhdGVDb21waWxlckhvc3QoY29tcGlsZXJPcHRpb25zKTtcblxuICAgIGNvbnN0IGN3ZCA9IHBsaW5rRW52LndvcmtEaXI7XG4gICAgY29uc3Qgc2VydmljZUhvc3Q6IHRzLkxhbmd1YWdlU2VydmljZUhvc3QgPSB7XG4gICAgICBnZXROZXdMaW5lKCkgeyByZXR1cm4gJ1xcbic7IH0sXG4gICAgICBnZXRDb21waWxhdGlvblNldHRpbmdzKCkgeyByZXR1cm4gc2VsZi5jb21waWxlck9wdGlvbnM7fSxcbiAgICAgIGdldFNjcmlwdEZpbGVOYW1lcygpIHtyZXR1cm4gc2VsZi5maWxlTmFtZXM7fSxcbiAgICAgIGdldFNjcmlwdFZlcnNpb246IGZpbGVOYW1lID0+XG4gICAgICAgIHRoaXMuZmlsZXNbZmlsZU5hbWVdICYmIHRoaXMuZmlsZXNbZmlsZU5hbWVdLnZlcnNpb24udG9TdHJpbmcoKSxcbiAgICAgIGdldFNjcmlwdFNuYXBzaG90OiBmaWxlTmFtZSA9PiB7XG4gICAgICAgIGlmICh0aGlzLmZpbGVDb250ZW50LmhhcyhmaWxlTmFtZSkpXG4gICAgICAgICAgcmV0dXJuIHRzLlNjcmlwdFNuYXBzaG90LmZyb21TdHJpbmcodGhpcy5maWxlQ29udGVudC5nZXQoZmlsZU5hbWUpISk7XG4gICAgICAgIGlmICh0cy5zeXMuZmlsZUV4aXN0cyhmaWxlTmFtZSkpXG4gICAgICAgICAgcmV0dXJuIHRzLlNjcmlwdFNuYXBzaG90LmZyb21TdHJpbmcodHMuc3lzLnJlYWRGaWxlKGZpbGVOYW1lKSEpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfSxcbiAgICAgIGdldEN1cnJlbnREaXJlY3Rvcnk6ICgpID0+IGN3ZCxcbiAgICAgIGdldERlZmF1bHRMaWJGaWxlTmFtZTogKCkgPT4gY29tcGlsZXJIb3N0LmdldERlZmF1bHRMaWJGaWxlTmFtZVx0KGNvbXBpbGVyT3B0aW9ucyksXG4gICAgICBmaWxlRXhpc3RzOiAoZjogc3RyaW5nKSA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGYpO1xuICAgICAgICByZXR1cm4gY29tcGlsZXJIb3N0LmZpbGVFeGlzdHMoZik7XG4gICAgICB9LFxuICAgICAgcmVhZEZpbGUocGF0aDogc3RyaW5nLCBlbmNvZGU/OiBzdHJpbmcpIHtcbiAgICAgICAgaWYgKHNlbGYuZmlsZUNvbnRlbnQuaGFzKHBhdGgpKVxuICAgICAgICAgIHJldHVybiBzZWxmLmZpbGVDb250ZW50LmdldChwYXRoKTtcbiAgICAgICAgcmV0dXJuIGNvbXBpbGVySG9zdC5yZWFkRmlsZShwYXRoKTtcbiAgICAgIH0sXG4gICAgICByZWFkRGlyZWN0b3J5OiBjb21waWxlckhvc3QucmVhZERpcmVjdG9yeSxcbiAgICAgIGdldERpcmVjdG9yaWVzOiBjb21waWxlckhvc3QuZ2V0RGlyZWN0b3JpZXMsXG4gICAgICBkaXJlY3RvcnlFeGlzdHM6IHRzLnN5cy5kaXJlY3RvcnlFeGlzdHMsIC8vIGRlYnVnZ2FibGUoJ2RpcmVjdG9yeUV4aXN0cycsIGNvbXBpbGVySG9zdC5kaXJlY3RvcnlFeGlzdHMpLFxuICAgICAgcmVhbHBhdGg6IGNvbXBpbGVySG9zdC5yZWFscGF0aCAvLyBkZWJ1Z2dhYmxlKCdyZWFscGF0aCcsIGNvbXBpbGVySG9zdC5yZWFscGF0aCksXG4gICAgfTtcbiAgICB0aGlzLmxhbmdTZXJ2aWNlID0gdHMuY3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlKCBzZXJ2aWNlSG9zdCwgdHMuY3JlYXRlRG9jdW1lbnRSZWdpc3RyeSgpKTtcblxuICB9XG5cbiAgY29tcGlsZShmaWxlTmFtZTogc3RyaW5nLCBzcmNDb2RlOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGZpbGVOYW1lID0gUGF0aC5yZXNvbHZlKGZpbGVOYW1lKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgdGhpcy5maWxlQ29udGVudC5zZXQoZmlsZU5hbWUsIHNyY0NvZGUpO1xuICAgIHRoaXMuZmlsZU5hbWVzLnB1c2goZmlsZU5hbWUpO1xuICAgIC8vIHRoaXMuY3VycmVudEZpbGUgPSBmaWxlTmFtZTtcbiAgICByZXR1cm4gdGhpcy5lbWl0RmlsZShmaWxlTmFtZSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgZW1pdEZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgb3V0cHV0ID0gdGhpcy5sYW5nU2VydmljZS5nZXRFbWl0T3V0cHV0KGZpbGVOYW1lKTtcbiAgICB0aGlzLmxvZ0Vycm9ycyhmaWxlTmFtZSk7XG4gICAgaWYgKG91dHB1dC5lbWl0U2tpcHBlZCkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKHJlZChgdHMtY29tcGlsZXIgLSBjb21waWxlICR7ZmlsZU5hbWV9IGZhaWxlZGApKTtcbiAgICAgIHRoaXMubG9nRXJyb3JzKGZpbGVOYW1lLCB0cnVlKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGNvbXBpbGUgVHlwZXNjcmlwdCAnICsgZmlsZU5hbWUpO1xuICAgIH1cbiAgICBpZiAob3V0cHV0Lm91dHB1dEZpbGVzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigndHMtY29tcGlsZXIgLSB3aGF0IHRoZSBoZWNrLCB0aGVyZSBhcmUgbW9yZSB0aGFuIG9uZSBvdXRwdXQgZmlsZXM/ICcgK1xuICAgICAgICBvdXRwdXQub3V0cHV0RmlsZXMubWFwKG8gPT4geWVsbG93KG8ubmFtZSkpLmpvaW4oJywgJykpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IG8gb2Ygb3V0cHV0Lm91dHB1dEZpbGVzKSB7XG4gICAgICByZXR1cm4gby50ZXh0O1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBsb2dFcnJvcnMoZmlsZU5hbWU6IHN0cmluZywgaXNFcnJvciA9IGZhbHNlKSB7XG4gICAgY29uc3QgYWxsRGlhZ25vc3RpY3MgPSB0aGlzLmxhbmdTZXJ2aWNlXG4gICAgICAuZ2V0Q29tcGlsZXJPcHRpb25zRGlhZ25vc3RpY3MoKVxuICAgICAgLmNvbmNhdCh0aGlzLmxhbmdTZXJ2aWNlLmdldFN5bnRhY3RpY0RpYWdub3N0aWNzKGZpbGVOYW1lKSlcbiAgICAgIC5jb25jYXQodGhpcy5sYW5nU2VydmljZS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lKSk7XG5cbiAgICBhbGxEaWFnbm9zdGljcy5mb3JFYWNoKGRpYWdub3N0aWMgPT4ge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IHRzLmZsYXR0ZW5EaWFnbm9zdGljTWVzc2FnZVRleHQoZGlhZ25vc3RpYy5tZXNzYWdlVGV4dCwgJ1xcbicpO1xuICAgICAgaWYgKGRpYWdub3N0aWMuZmlsZSkge1xuICAgICAgICBjb25zdCB7IGxpbmUsIGNoYXJhY3RlciB9ID0gZGlhZ25vc3RpYy5maWxlLmdldExpbmVBbmRDaGFyYWN0ZXJPZlBvc2l0aW9uKGRpYWdub3N0aWMuc3RhcnQhKTtcbiAgICAgICAgbG9nLmluZm8oKGlzRXJyb3IgPyByZWQgOiB5ZWxsb3cpKGBbd2ZoLnRzLWNvbXBpbGVyXSAkeyhpc0Vycm9yID8gJ0Vycm9yJyA6ICdXYXJuaW5nJyl9IGAgK1xuICAgICAgICAgIGAke2RpYWdub3N0aWMuZmlsZS5maWxlTmFtZX0gKCR7bGluZSArIDF9LCR7Y2hhcmFjdGVyICsgMX0pOiAke21lc3NhZ2V9YCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmluZm8oKGlzRXJyb3IgPyByZWQgOiB5ZWxsb3cpKGBbd2ZoLnRzLWNvbXBpbGVyXSAkeyhpc0Vycm9yID8gJ0Vycm9yJyA6ICdXYXJuaW5nJyl9OiAke21lc3NhZ2V9YCkpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmxldCBzaW5nbGV0b25Db21waWxlcjogVHNDb21waWxlcjtcbmV4cG9ydCBmdW5jdGlvbiB0cmFuc3BpbGVBbmRDaGVjayh0c0NvZGU6IHN0cmluZywgZmlsZW5hbWU6IHN0cmluZywgY286IHRzLkNvbXBpbGVyT3B0aW9uc3xzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBpZiAodHlwZW9mIGNvID09PSAnc3RyaW5nJykge1xuICAgIGNvID0gcmVhZFRzQ29uZmlnKGNvKTtcbiAgfVxuICBjby5kZWNsYXJhdGlvbiA9IGZhbHNlO1xuICBjby5kZWNsYXJhdGlvbk1hcCA9IGZhbHNlO1xuICAvLyBjby5pbmxpbmVTb3VyY2VNYXAgPSB0cnVlO1xuICAvLyBjby5zb3VyY2VNYXAgPSB0cnVlO1xuICBpZiAoc2luZ2xldG9uQ29tcGlsZXIgPT0gbnVsbClcbiAgICBzaW5nbGV0b25Db21waWxlciA9IG5ldyBUc0NvbXBpbGVyKGNvKTtcbiAgcmV0dXJuIHNpbmdsZXRvbkNvbXBpbGVyLmNvbXBpbGUoZmlsZW5hbWUsIHRzQ29kZSk7XG59XG5cbi8qKlxuICogRXhhY3RseSBsaWtlIHRzLW5vZGUsIHNvIHRoYXQgd2UgY2FuIGByZXF1aXJlKClgIGEgdHMgZmlsZSBkaXJlY3RseSB3aXRob3V0IGB0c2NgXG4gKiBAcGFyYW0gZXh0IFxuICogQHBhcmFtIGNvbXBpbGVyT3B0IFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJFeHRlbnNpb24oZXh0OiBzdHJpbmcsIGNvbXBpbGVyT3B0OiB0cy5Db21waWxlck9wdGlvbnMpIHtcbiAgY29uc3Qgb2xkID0gcmVxdWlyZS5leHRlbnNpb25zW2V4dF0gfHwgcmVxdWlyZS5leHRlbnNpb25zWycuanMnXTtcbiAgLy8gY29tcGlsZXJPcHQuaW5saW5lU291cmNlcyA9IHRydWU7XG4gIGNvbXBpbGVyT3B0LmlubGluZVNvdXJjZU1hcCA9IGZhbHNlO1xuICBjb21waWxlck9wdC5pbmxpbmVTb3VyY2VzID0gZmFsc2U7XG4gIHJlcXVpcmUuZXh0ZW5zaW9uc1tleHRdID0gZnVuY3Rpb24obTogYW55LCBmaWxlbmFtZSkge1xuXG4gICAgY29uc3QgX2NvbXBpbGUgPSBtLl9jb21waWxlO1xuICAgIG0uX2NvbXBpbGUgPSBmdW5jdGlvbihjb2RlOiBzdHJpbmcsIGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgICAgIGNvbnN0IGpzY29kZSA9IHRyYW5zcGlsZUFuZENoZWNrKGNvZGUsIGZpbGVOYW1lLCBjb21waWxlck9wdCk7XG4gICAgICAvLyBjb25zb2xlLmxvZyhqc2NvZGUpO1xuICAgICAgcmV0dXJuIF9jb21waWxlLmNhbGwodGhpcywganNjb2RlLCBmaWxlTmFtZSk7XG4gICAgfTtcbiAgICByZXR1cm4gb2xkKG0sIGZpbGVuYW1lKTtcbiAgfTtcbn1cblxuLy8gZXhwb3J0IGZ1bmN0aW9uIHRlc3RDb21waWxlcihmaWxlOiBzdHJpbmcpIHtcbi8vICAgY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuLy8gICBjb25zb2xlLmxvZyhmaWxlKTtcbi8vICAgY29uc3QgY29tcGlsZXJPcHQgPSB7XG4vLyAgICAgYmFzZVVybDogJy4nLFxuLy8gICAgIG91dERpcjogJycsXG4vLyAgICAgZGVjbGFyYXRpb246IHRydWUsXG4vLyAgICAgbW9kdWxlOiAnY29tbW9uanMnLFxuLy8gICAgIHRhcmdldDogJ2VzMjAxNScsXG4vLyAgICAgbm9JbXBsaWNpdEFueTogdHJ1ZSxcbi8vICAgICBzdXBwcmVzc0ltcGxpY2l0QW55SW5kZXhFcnJvcnM6IHRydWUsXG4vLyAgICAgYWxsb3dTeW50aGV0aWNEZWZhdWx0SW1wb3J0czogdHJ1ZSxcbi8vICAgICBlc01vZHVsZUludGVyb3A6IHRydWUsXG4vLyAgICAgaW5saW5lU291cmNlTWFwOiBmYWxzZSxcbi8vICAgICBpbmxpbmVTb3VyY2VzOiB0cnVlLFxuLy8gICAgIG1vZHVsZVJlc29sdXRpb246ICdub2RlJyxcbi8vICAgICBleHBlcmltZW50YWxEZWNvcmF0b3JzOiB0cnVlLFxuLy8gICAgIGVtaXREZWNvcmF0b3JNZXRhZGF0YTogdHJ1ZSxcbi8vICAgICBub1VudXNlZExvY2FsczogdHJ1ZSxcbi8vICAgICBwcmVzZXJ2ZVN5bWxpbmtzOiBmYWxzZSxcbi8vICAgICBkb3dubGV2ZWxJdGVyYXRpb246IGZhbHNlLFxuLy8gICAgIHN0cmljdE51bGxDaGVja3M6IHRydWUsXG4vLyAgICAgcmVzb2x2ZUpzb25Nb2R1bGU6IHRydWUsXG4vLyAgICAgZGlhZ25vc3RpY3M6IHRydWUsXG4vLyAgICAgbGliOiBbICdlczIwMTYnLCAnZXMyMDE1JywgJ2RvbScgXSxcbi8vICAgICBwcmV0dHk6IHRydWUsXG4vLyAgICAgcm9vdERpcjogJy4uJyxcbi8vICAgICBpbXBvcnRIZWxwZXJzOiB0cnVlLFxuLy8gICAgIHNraXBMaWJDaGVjazogdHJ1ZSxcbi8vICAgICBzb3VyY2VNYXA6IHRydWUsXG4vLyAgICAgZW1pdERlY2xhcmF0aW9uT25seTogZmFsc2UsXG4vLyAgICAgcGF0aHM6IHtcbi8vICAgICAgICcqJzogW1xuLy8gICAgICAgICAnLi4vbm9kZV9tb2R1bGVzL0B0eXBlcy8qJyxcbi8vICAgICAgICAgJ25vZGVfbW9kdWxlcy9AdHlwZXMvKicsXG4vLyAgICAgICAgICdub2RlX21vZHVsZXMvKicsXG4vLyAgICAgICAgICcuLi9ub2RlX21vZHVsZXMvKidcbi8vICAgICAgIF1cbi8vICAgICB9LFxuLy8gICAgIHR5cGVSb290czogW1xuLy8gICAgICAgJy9Vc2Vycy9saXVqaW5nL2JrL215dG9vbC9ub2RlX21vZHVsZXMvQHR5cGVzJ1xuLy8gICAgICAgLy8nLi9ub2RlX21vZHVsZXMvQHR5cGVzJywgJy4uL25vZGVfbW9kdWxlcy9AdHlwZXMnXG4vLyAgICAgXVxuLy8gICB9O1xuXG4vLyAgIGNvbnN0IGNvID0ganNvblRvQ29tcGlsZXJPcHRpb25zKGNvbXBpbGVyT3B0KTtcbi8vICAgdHJhbnNwaWxlQW5kQ2hlY2soZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUsIGNvKTtcbi8vIH1cbiJdfQ==