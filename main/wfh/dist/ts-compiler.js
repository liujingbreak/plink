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
const log = log4js_1.getLogger('plink.ts-compiler');
function readTsConfig(tsconfigFile) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy90cy1jb21waWxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0NBQWlDO0FBQ2pDLDJCQUFnQztBQUNoQyx1Q0FBc0M7QUFDdEMsMkNBQTZCO0FBQzdCLGtEQUEwQjtBQUMxQixtQ0FBaUM7QUFDakMsTUFBTSxHQUFHLEdBQUcsa0JBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBRTNDLFNBQWdCLFlBQVksQ0FBQyxZQUFvQjtJQUMvQyxtRUFBbUU7SUFDbkUsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLGlCQUFZLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0lBQy9GLE9BQU8sRUFBRSxDQUFDLDBCQUEwQixDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsR0FBRyxFQUFFLGVBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsRUFDekYsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUNyQyxDQUFDO0FBTEQsb0NBS0M7QUFFRDs7Ozs7O0dBTUc7QUFDSCxTQUFnQixxQkFBcUIsQ0FBQyxlQUFvQixFQUFFLElBQUksR0FBRyxlQUFlLEVBQ2hGLFFBQVEsR0FBRyxlQUFRLENBQUMsT0FBTztJQUMzQixtRUFBbUU7SUFDbkUsT0FBTyxFQUFFLENBQUMsMEJBQTBCLENBQUMsRUFBQyxlQUFlLEVBQUUsZUFBZSxFQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsRUFDN0csU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUMzQixDQUFDO0FBTEQsc0RBS0M7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MEM7QUFDMUMsb0JBQW9CO0FBQ3BCLHFCQUFxQjtBQUNyQiwyQkFBMkI7QUFDM0IsMEJBQTBCO0FBQzFCLHVCQUF1QjtBQUN2QixrQ0FBa0M7QUFDbEMsZUFBZTtBQUNmLGVBQWU7QUFDZixzQ0FBc0M7QUFDdEMsbUNBQW1DO0FBQ25DLDRCQUE0QjtBQUM1Qiw4QkFBOEI7QUFDOUIsVUFBVTtBQUNWLFNBQVM7QUFDVCxtQkFBbUI7QUFDbkIsdURBQXVEO0FBQ3ZELDREQUE0RDtBQUM1RCxRQUFRO0FBQ1IsT0FBTztBQUVQLG1EQUFtRDtBQUNuRCxnRUFBZ0U7QUFDaEUsSUFBSSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtyZWFkRmlsZVN5bmN9IGZyb20gJ2ZzJztcbmltcG9ydCB7cGxpbmtFbnZ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay50cy1jb21waWxlcicpO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVhZFRzQ29uZmlnKHRzY29uZmlnRmlsZTogc3RyaW5nKTogdHMuQ29tcGlsZXJPcHRpb25zIHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICBjb25zdCB0c2NvbmZpZyA9IHRzLnJlYWRDb25maWdGaWxlKHRzY29uZmlnRmlsZSwgKGZpbGUpID0+IHJlYWRGaWxlU3luYyhmaWxlLCAndXRmLTgnKSkuY29uZmlnO1xuICByZXR1cm4gdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQodHNjb25maWcsIHRzLnN5cywgcGxpbmtFbnYud29ya0Rpci5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgdW5kZWZpbmVkLCB0c2NvbmZpZ0ZpbGUpLm9wdGlvbnM7XG59XG5cbi8qKlxuICogY2FsbCB0cy5wYXJzZUpzb25Db25maWdGaWxlQ29udGVudCgpXG4gKiBAcGFyYW0ganNvbkNvbXBpbGVyT3B0IFxuICogQHBhcmFtIGZpbGUgXG4gKiBAcGFyYW0gYmFzZVBhdGggLSAodHNjb25maWcgZmlsZSBkaXJlY3RvcnkpIFxuICogIEEgcm9vdCBkaXJlY3RvcnkgdG8gcmVzb2x2ZSByZWxhdGl2ZSBwYXRoIGVudHJpZXMgaW4gdGhlIGNvbmZpZyBmaWxlIHRvLiBlLmcuIG91dERpclxuICovXG5leHBvcnQgZnVuY3Rpb24ganNvblRvQ29tcGlsZXJPcHRpb25zKGpzb25Db21waWxlck9wdDogYW55LCBmaWxlID0gJ3RzY29uZmlnLmpzb24nLFxuICBiYXNlUGF0aCA9IHBsaW5rRW52LndvcmtEaXIpOiB0cy5Db21waWxlck9wdGlvbnMge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gIHJldHVybiB0cy5wYXJzZUpzb25Db25maWdGaWxlQ29udGVudCh7Y29tcGlsZXJPcHRpb25zOiBqc29uQ29tcGlsZXJPcHR9LCB0cy5zeXMsIGJhc2VQYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgdW5kZWZpbmVkLCBmaWxlKS5vcHRpb25zO1xufVxuXG4vKipcbiAqIFJlZmVyIHRvIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC93aWtpL1VzaW5nLXRoZS1Db21waWxlci1BUEkjdHJhbnNwaWxpbmctYS1zaW5nbGUtZmlsZVxuICogQHBhcmFtIHRzQ29kZSBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zcGlsZVNpbmdsZVRzKHRzQ29kZTogc3RyaW5nLCBjb21waWxlck9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyk6IHN0cmluZyB7XG4gIGNvbnN0IHJlcyA9IHRzLnRyYW5zcGlsZU1vZHVsZSh0c0NvZGUsIHtjb21waWxlck9wdGlvbnN9KTtcbiAgaWYgKHJlcy5kaWFnbm9zdGljcyAmJiByZXMuZGlhZ25vc3RpY3MubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IG1zZyA9IGBGYWlsZWQgdG8gdHJhbnNwaWxlIFRTIGV4cHJlc3Npb246ICR7dHNDb2RlfVxcbmAgKyByZXMuZGlhZ25vc3RpY3Muam9pbignXFxuJyk7XG4gICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICB9XG4gIHJldHVybiByZXMub3V0cHV0VGV4dDtcbn1cblxuLy8gaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuXG4vLyBpbXBvcnQge2luc3BlY3R9IGZyb20gJ3V0aWwnO1xuY29uc3Qge3JlZCwgeWVsbG93fSA9IGNoYWxrO1xuY2xhc3MgVHNDb21waWxlciB7XG4gIGZpbGVOYW1lczogc3RyaW5nW10gPSBbXTtcbiAgZmlsZXM6IHRzLk1hcExpa2U8eyB2ZXJzaW9uOiBudW1iZXIgfT4gPSB7fTtcbiAgbGFuZ1NlcnZpY2U6IHRzLkxhbmd1YWdlU2VydmljZTtcbiAgZmlsZUNvbnRlbnQgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAvLyBjdXJyZW50RmlsZTogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBjb21waWxlck9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucykge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdGhpcy1hbGlhc1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIGNvbnN0IGNvbXBpbGVySG9zdCA9IHRzLmNyZWF0ZUNvbXBpbGVySG9zdChjb21waWxlck9wdGlvbnMpO1xuXG4gICAgY29uc3QgY3dkID0gcGxpbmtFbnYud29ya0RpcjtcbiAgICBjb25zdCBzZXJ2aWNlSG9zdDogdHMuTGFuZ3VhZ2VTZXJ2aWNlSG9zdCA9IHtcbiAgICAgIGdldE5ld0xpbmUoKSB7IHJldHVybiAnXFxuJzsgfSxcbiAgICAgIGdldENvbXBpbGF0aW9uU2V0dGluZ3MoKSB7IHJldHVybiBzZWxmLmNvbXBpbGVyT3B0aW9uczt9LFxuICAgICAgZ2V0U2NyaXB0RmlsZU5hbWVzKCkge3JldHVybiBzZWxmLmZpbGVOYW1lczt9LFxuICAgICAgZ2V0U2NyaXB0VmVyc2lvbjogZmlsZU5hbWUgPT5cbiAgICAgICAgdGhpcy5maWxlc1tmaWxlTmFtZV0gJiYgdGhpcy5maWxlc1tmaWxlTmFtZV0udmVyc2lvbi50b1N0cmluZygpLFxuICAgICAgZ2V0U2NyaXB0U25hcHNob3Q6IGZpbGVOYW1lID0+IHtcbiAgICAgICAgaWYgKHRoaXMuZmlsZUNvbnRlbnQuaGFzKGZpbGVOYW1lKSlcbiAgICAgICAgICByZXR1cm4gdHMuU2NyaXB0U25hcHNob3QuZnJvbVN0cmluZyh0aGlzLmZpbGVDb250ZW50LmdldChmaWxlTmFtZSkhKTtcbiAgICAgICAgaWYgKHRzLnN5cy5maWxlRXhpc3RzKGZpbGVOYW1lKSlcbiAgICAgICAgICByZXR1cm4gdHMuU2NyaXB0U25hcHNob3QuZnJvbVN0cmluZyh0cy5zeXMucmVhZEZpbGUoZmlsZU5hbWUpISk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9LFxuICAgICAgZ2V0Q3VycmVudERpcmVjdG9yeTogKCkgPT4gY3dkLFxuICAgICAgZ2V0RGVmYXVsdExpYkZpbGVOYW1lOiAoKSA9PiBjb21waWxlckhvc3QuZ2V0RGVmYXVsdExpYkZpbGVOYW1lXHQoY29tcGlsZXJPcHRpb25zKSxcbiAgICAgIGZpbGVFeGlzdHM6IChmOiBzdHJpbmcpID0+IHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coZik7XG4gICAgICAgIHJldHVybiBjb21waWxlckhvc3QuZmlsZUV4aXN0cyhmKTtcbiAgICAgIH0sXG4gICAgICByZWFkRmlsZShwYXRoOiBzdHJpbmcsIGVuY29kZT86IHN0cmluZykge1xuICAgICAgICBpZiAoc2VsZi5maWxlQ29udGVudC5oYXMocGF0aCkpXG4gICAgICAgICAgcmV0dXJuIHNlbGYuZmlsZUNvbnRlbnQuZ2V0KHBhdGgpO1xuICAgICAgICByZXR1cm4gY29tcGlsZXJIb3N0LnJlYWRGaWxlKHBhdGgpO1xuICAgICAgfSxcbiAgICAgIHJlYWREaXJlY3Rvcnk6IGNvbXBpbGVySG9zdC5yZWFkRGlyZWN0b3J5LFxuICAgICAgZ2V0RGlyZWN0b3JpZXM6IGNvbXBpbGVySG9zdC5nZXREaXJlY3RvcmllcyxcbiAgICAgIGRpcmVjdG9yeUV4aXN0czogdHMuc3lzLmRpcmVjdG9yeUV4aXN0cywgLy8gZGVidWdnYWJsZSgnZGlyZWN0b3J5RXhpc3RzJywgY29tcGlsZXJIb3N0LmRpcmVjdG9yeUV4aXN0cyksXG4gICAgICByZWFscGF0aDogY29tcGlsZXJIb3N0LnJlYWxwYXRoIC8vIGRlYnVnZ2FibGUoJ3JlYWxwYXRoJywgY29tcGlsZXJIb3N0LnJlYWxwYXRoKSxcbiAgICB9O1xuICAgIHRoaXMubGFuZ1NlcnZpY2UgPSB0cy5jcmVhdGVMYW5ndWFnZVNlcnZpY2UoIHNlcnZpY2VIb3N0LCB0cy5jcmVhdGVEb2N1bWVudFJlZ2lzdHJ5KCkpO1xuXG4gIH1cblxuICBjb21waWxlKGZpbGVOYW1lOiBzdHJpbmcsIHNyY0NvZGU6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgZmlsZU5hbWUgPSBQYXRoLnJlc29sdmUoZmlsZU5hbWUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICB0aGlzLmZpbGVDb250ZW50LnNldChmaWxlTmFtZSwgc3JjQ29kZSk7XG4gICAgdGhpcy5maWxlTmFtZXMucHVzaChmaWxlTmFtZSk7XG4gICAgLy8gdGhpcy5jdXJyZW50RmlsZSA9IGZpbGVOYW1lO1xuICAgIHJldHVybiB0aGlzLmVtaXRGaWxlKGZpbGVOYW1lKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBlbWl0RmlsZShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBvdXRwdXQgPSB0aGlzLmxhbmdTZXJ2aWNlLmdldEVtaXRPdXRwdXQoZmlsZU5hbWUpO1xuICAgIHRoaXMubG9nRXJyb3JzKGZpbGVOYW1lKTtcbiAgICBpZiAob3V0cHV0LmVtaXRTa2lwcGVkKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2cocmVkKGB0cy1jb21waWxlciAtIGNvbXBpbGUgJHtmaWxlTmFtZX0gZmFpbGVkYCkpO1xuICAgICAgdGhpcy5sb2dFcnJvcnMoZmlsZU5hbWUsIHRydWUpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gY29tcGlsZSBUeXBlc2NyaXB0ICcgKyBmaWxlTmFtZSk7XG4gICAgfVxuICAgIGlmIChvdXRwdXQub3V0cHV0RmlsZXMubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCd0cy1jb21waWxlciAtIHdoYXQgdGhlIGhlY2ssIHRoZXJlIGFyZSBtb3JlIHRoYW4gb25lIG91dHB1dCBmaWxlcz8gJyArXG4gICAgICAgIG91dHB1dC5vdXRwdXRGaWxlcy5tYXAobyA9PiB5ZWxsb3coby5uYW1lKSkuam9pbignLCAnKSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgbyBvZiBvdXRwdXQub3V0cHV0RmlsZXMpIHtcbiAgICAgIHJldHVybiBvLnRleHQ7XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIGxvZ0Vycm9ycyhmaWxlTmFtZTogc3RyaW5nLCBpc0Vycm9yID0gZmFsc2UpIHtcbiAgICBjb25zdCBhbGxEaWFnbm9zdGljcyA9IHRoaXMubGFuZ1NlcnZpY2VcbiAgICAgIC5nZXRDb21waWxlck9wdGlvbnNEaWFnbm9zdGljcygpXG4gICAgICAuY29uY2F0KHRoaXMubGFuZ1NlcnZpY2UuZ2V0U3ludGFjdGljRGlhZ25vc3RpY3MoZmlsZU5hbWUpKVxuICAgICAgLmNvbmNhdCh0aGlzLmxhbmdTZXJ2aWNlLmdldFNlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWUpKTtcblxuICAgIGFsbERpYWdub3N0aWNzLmZvckVhY2goZGlhZ25vc3RpYyA9PiB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gdHMuZmxhdHRlbkRpYWdub3N0aWNNZXNzYWdlVGV4dChkaWFnbm9zdGljLm1lc3NhZ2VUZXh0LCAnXFxuJyk7XG4gICAgICBpZiAoZGlhZ25vc3RpYy5maWxlKSB7XG4gICAgICAgIGNvbnN0IHsgbGluZSwgY2hhcmFjdGVyIH0gPSBkaWFnbm9zdGljLmZpbGUuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24oZGlhZ25vc3RpYy5zdGFydCEpO1xuICAgICAgICBsb2cuaW5mbygoaXNFcnJvciA/IHJlZCA6IHllbGxvdykoYFt3ZmgudHMtY29tcGlsZXJdICR7KGlzRXJyb3IgPyAnRXJyb3InIDogJ1dhcm5pbmcnKX0gYCArXG4gICAgICAgICAgYCR7ZGlhZ25vc3RpYy5maWxlLmZpbGVOYW1lfSAoJHtsaW5lICsgMX0sJHtjaGFyYWN0ZXIgKyAxfSk6ICR7bWVzc2FnZX1gKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuaW5mbygoaXNFcnJvciA/IHJlZCA6IHllbGxvdykoYFt3ZmgudHMtY29tcGlsZXJdICR7KGlzRXJyb3IgPyAnRXJyb3InIDogJ1dhcm5pbmcnKX06ICR7bWVzc2FnZX1gKSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxubGV0IHNpbmdsZXRvbkNvbXBpbGVyOiBUc0NvbXBpbGVyO1xuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zcGlsZUFuZENoZWNrKHRzQ29kZTogc3RyaW5nLCBmaWxlbmFtZTogc3RyaW5nLCBjbzogdHMuQ29tcGlsZXJPcHRpb25zfHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGlmICh0eXBlb2YgY28gPT09ICdzdHJpbmcnKSB7XG4gICAgY28gPSByZWFkVHNDb25maWcoY28pO1xuICB9XG4gIGNvLmRlY2xhcmF0aW9uID0gZmFsc2U7XG4gIGNvLmRlY2xhcmF0aW9uTWFwID0gZmFsc2U7XG4gIC8vIGNvLmlubGluZVNvdXJjZU1hcCA9IHRydWU7XG4gIC8vIGNvLnNvdXJjZU1hcCA9IHRydWU7XG4gIGlmIChzaW5nbGV0b25Db21waWxlciA9PSBudWxsKVxuICAgIHNpbmdsZXRvbkNvbXBpbGVyID0gbmV3IFRzQ29tcGlsZXIoY28pO1xuICByZXR1cm4gc2luZ2xldG9uQ29tcGlsZXIuY29tcGlsZShmaWxlbmFtZSwgdHNDb2RlKTtcbn1cblxuLyoqXG4gKiBFeGFjdGx5IGxpa2UgdHMtbm9kZSwgc28gdGhhdCB3ZSBjYW4gYHJlcXVpcmUoKWAgYSB0cyBmaWxlIGRpcmVjdGx5IHdpdGhvdXQgYHRzY2BcbiAqIEBwYXJhbSBleHQgXG4gKiBAcGFyYW0gY29tcGlsZXJPcHQgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlckV4dGVuc2lvbihleHQ6IHN0cmluZywgY29tcGlsZXJPcHQ6IHRzLkNvbXBpbGVyT3B0aW9ucykge1xuICBjb25zdCBvbGQgPSByZXF1aXJlLmV4dGVuc2lvbnNbZXh0XSB8fCByZXF1aXJlLmV4dGVuc2lvbnNbJy5qcyddO1xuICAvLyBjb21waWxlck9wdC5pbmxpbmVTb3VyY2VzID0gdHJ1ZTtcbiAgY29tcGlsZXJPcHQuaW5saW5lU291cmNlTWFwID0gZmFsc2U7XG4gIGNvbXBpbGVyT3B0LmlubGluZVNvdXJjZXMgPSBmYWxzZTtcbiAgcmVxdWlyZS5leHRlbnNpb25zW2V4dF0gPSBmdW5jdGlvbihtOiBhbnksIGZpbGVuYW1lKSB7XG5cbiAgICBjb25zdCBfY29tcGlsZSA9IG0uX2NvbXBpbGU7XG4gICAgbS5fY29tcGlsZSA9IGZ1bmN0aW9uKGNvZGU6IHN0cmluZywgZmlsZU5hbWU6IHN0cmluZykge1xuICAgICAgY29uc3QganNjb2RlID0gdHJhbnNwaWxlQW5kQ2hlY2soY29kZSwgZmlsZU5hbWUsIGNvbXBpbGVyT3B0KTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKGpzY29kZSk7XG4gICAgICByZXR1cm4gX2NvbXBpbGUuY2FsbCh0aGlzLCBqc2NvZGUsIGZpbGVOYW1lKTtcbiAgICB9O1xuICAgIHJldHVybiBvbGQobSwgZmlsZW5hbWUpO1xuICB9O1xufVxuXG4vLyBleHBvcnQgZnVuY3Rpb24gdGVzdENvbXBpbGVyKGZpbGU6IHN0cmluZykge1xuLy8gICBjb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG4vLyAgIGNvbnNvbGUubG9nKGZpbGUpO1xuLy8gICBjb25zdCBjb21waWxlck9wdCA9IHtcbi8vICAgICBiYXNlVXJsOiAnLicsXG4vLyAgICAgb3V0RGlyOiAnJyxcbi8vICAgICBkZWNsYXJhdGlvbjogdHJ1ZSxcbi8vICAgICBtb2R1bGU6ICdjb21tb25qcycsXG4vLyAgICAgdGFyZ2V0OiAnZXMyMDE1Jyxcbi8vICAgICBub0ltcGxpY2l0QW55OiB0cnVlLFxuLy8gICAgIHN1cHByZXNzSW1wbGljaXRBbnlJbmRleEVycm9yczogdHJ1ZSxcbi8vICAgICBhbGxvd1N5bnRoZXRpY0RlZmF1bHRJbXBvcnRzOiB0cnVlLFxuLy8gICAgIGVzTW9kdWxlSW50ZXJvcDogdHJ1ZSxcbi8vICAgICBpbmxpbmVTb3VyY2VNYXA6IGZhbHNlLFxuLy8gICAgIGlubGluZVNvdXJjZXM6IHRydWUsXG4vLyAgICAgbW9kdWxlUmVzb2x1dGlvbjogJ25vZGUnLFxuLy8gICAgIGV4cGVyaW1lbnRhbERlY29yYXRvcnM6IHRydWUsXG4vLyAgICAgZW1pdERlY29yYXRvck1ldGFkYXRhOiB0cnVlLFxuLy8gICAgIG5vVW51c2VkTG9jYWxzOiB0cnVlLFxuLy8gICAgIHByZXNlcnZlU3ltbGlua3M6IGZhbHNlLFxuLy8gICAgIGRvd25sZXZlbEl0ZXJhdGlvbjogZmFsc2UsXG4vLyAgICAgc3RyaWN0TnVsbENoZWNrczogdHJ1ZSxcbi8vICAgICByZXNvbHZlSnNvbk1vZHVsZTogdHJ1ZSxcbi8vICAgICBkaWFnbm9zdGljczogdHJ1ZSxcbi8vICAgICBsaWI6IFsgJ2VzMjAxNicsICdlczIwMTUnLCAnZG9tJyBdLFxuLy8gICAgIHByZXR0eTogdHJ1ZSxcbi8vICAgICByb290RGlyOiAnLi4nLFxuLy8gICAgIGltcG9ydEhlbHBlcnM6IHRydWUsXG4vLyAgICAgc2tpcExpYkNoZWNrOiB0cnVlLFxuLy8gICAgIHNvdXJjZU1hcDogdHJ1ZSxcbi8vICAgICBlbWl0RGVjbGFyYXRpb25Pbmx5OiBmYWxzZSxcbi8vICAgICBwYXRoczoge1xuLy8gICAgICAgJyonOiBbXG4vLyAgICAgICAgICcuLi9ub2RlX21vZHVsZXMvQHR5cGVzLyonLFxuLy8gICAgICAgICAnbm9kZV9tb2R1bGVzL0B0eXBlcy8qJyxcbi8vICAgICAgICAgJ25vZGVfbW9kdWxlcy8qJyxcbi8vICAgICAgICAgJy4uL25vZGVfbW9kdWxlcy8qJ1xuLy8gICAgICAgXVxuLy8gICAgIH0sXG4vLyAgICAgdHlwZVJvb3RzOiBbXG4vLyAgICAgICAnL1VzZXJzL2xpdWppbmcvYmsvbXl0b29sL25vZGVfbW9kdWxlcy9AdHlwZXMnXG4vLyAgICAgICAvLycuL25vZGVfbW9kdWxlcy9AdHlwZXMnLCAnLi4vbm9kZV9tb2R1bGVzL0B0eXBlcydcbi8vICAgICBdXG4vLyAgIH07XG5cbi8vICAgY29uc3QgY28gPSBqc29uVG9Db21waWxlck9wdGlvbnMoY29tcGlsZXJPcHQpO1xuLy8gICB0cmFuc3BpbGVBbmRDaGVjayhmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSwgZmlsZSwgY28pO1xuLy8gfVxuIl19