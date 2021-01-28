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
// tslint:disable no-console
const ts = __importStar(require("typescript"));
const fs_1 = require("fs");
function readTsConfig(tsconfigFile) {
    const tsconfig = ts.readConfigFile(tsconfigFile, (file) => fs_1.readFileSync(file, 'utf-8')).config;
    return ts.parseJsonConfigFileContent(tsconfig, ts.sys, process.cwd().replace(/\\/g, '/'), undefined, tsconfigFile).options;
}
exports.readTsConfig = readTsConfig;
/**
 * call ts.parseJsonConfigFileContent()
 * @param jsonCompilerOpt
 * @param file
 * @param basePath - (tsconfig file directory)
 *  A root directory to resolve relative path entries in the config file to. e.g. outDir
 */
function jsonToCompilerOptions(jsonCompilerOpt, file = 'tsconfig.json', basePath = process.cwd()) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy90cy1jb21waWxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLCtDQUFpQztBQUNqQywyQkFBZ0M7QUFHaEMsU0FBZ0IsWUFBWSxDQUFDLFlBQW9CO0lBQy9DLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxpQkFBWSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUMvRixPQUFPLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsRUFDdEYsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUNyQyxDQUFDO0FBSkQsb0NBSUM7QUFFRDs7Ozs7O0dBTUc7QUFDSCxTQUFnQixxQkFBcUIsQ0FBQyxlQUFvQixFQUFFLElBQUksR0FBRyxlQUFlLEVBQ2hGLFFBQVEsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFO0lBQ3hCLE9BQU8sRUFBRSxDQUFDLDBCQUEwQixDQUFDLEVBQUMsZUFBZSxFQUFFLGVBQWUsRUFBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQzdHLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDM0IsQ0FBQztBQUpELHNEQUlDO0FBRUQ7OztHQUdHO0FBQ0gsU0FBZ0IsaUJBQWlCLENBQUMsTUFBYyxFQUFFLGVBQW1DO0lBQ25GLE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLEVBQUMs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QkFBdUI7QUFDdkIsa0NBQWtDO0FBQ2xDLGVBQWU7QUFDZixlQUFlO0FBQ2Ysc0NBQXNDO0FBQ3RDLG1DQUFtQztBQUNuQyw0QkFBNEI7QUFDNUIsOEJBQThCO0FBQzlCLFVBQVU7QUFDVixTQUFTO0FBQ1QsbUJBQW1CO0FBQ25CLHVEQUF1RDtBQUN2RCw0REFBNEQ7QUFDNUQsUUFBUTtBQUNSLE9BQU87QUFFUCxtREFBbUQ7QUFDbkQsZ0VBQWdFO0FBQ2hFLElBQUkiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7cmVhZEZpbGVTeW5jfSBmcm9tICdmcyc7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRUc0NvbmZpZyh0c2NvbmZpZ0ZpbGU6IHN0cmluZyk6IHRzLkNvbXBpbGVyT3B0aW9ucyB7XG4gIGNvbnN0IHRzY29uZmlnID0gdHMucmVhZENvbmZpZ0ZpbGUodHNjb25maWdGaWxlLCAoZmlsZSkgPT4gcmVhZEZpbGVTeW5jKGZpbGUsICd1dGYtOCcpKS5jb25maWc7XG4gIHJldHVybiB0cy5wYXJzZUpzb25Db25maWdGaWxlQ29udGVudCh0c2NvbmZpZywgdHMuc3lzLCBwcm9jZXNzLmN3ZCgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICB1bmRlZmluZWQsIHRzY29uZmlnRmlsZSkub3B0aW9ucztcbn1cblxuLyoqXG4gKiBjYWxsIHRzLnBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50KClcbiAqIEBwYXJhbSBqc29uQ29tcGlsZXJPcHQgXG4gKiBAcGFyYW0gZmlsZSBcbiAqIEBwYXJhbSBiYXNlUGF0aCAtICh0c2NvbmZpZyBmaWxlIGRpcmVjdG9yeSkgXG4gKiAgQSByb290IGRpcmVjdG9yeSB0byByZXNvbHZlIHJlbGF0aXZlIHBhdGggZW50cmllcyBpbiB0aGUgY29uZmlnIGZpbGUgdG8uIGUuZy4gb3V0RGlyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBqc29uVG9Db21waWxlck9wdGlvbnMoanNvbkNvbXBpbGVyT3B0OiBhbnksIGZpbGUgPSAndHNjb25maWcuanNvbicsXG4gIGJhc2VQYXRoID0gcHJvY2Vzcy5jd2QoKSk6IHRzLkNvbXBpbGVyT3B0aW9ucyB7XG4gIHJldHVybiB0cy5wYXJzZUpzb25Db25maWdGaWxlQ29udGVudCh7Y29tcGlsZXJPcHRpb25zOiBqc29uQ29tcGlsZXJPcHR9LCB0cy5zeXMsIGJhc2VQYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgdW5kZWZpbmVkLCBmaWxlKS5vcHRpb25zO1xufVxuXG4vKipcbiAqIFJlZmVyIHRvIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC93aWtpL1VzaW5nLXRoZS1Db21waWxlci1BUEkjdHJhbnNwaWxpbmctYS1zaW5nbGUtZmlsZVxuICogQHBhcmFtIHRzQ29kZSBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zcGlsZVNpbmdsZVRzKHRzQ29kZTogc3RyaW5nLCBjb21waWxlck9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyk6IHN0cmluZyB7XG4gIGNvbnN0IHJlcyA9IHRzLnRyYW5zcGlsZU1vZHVsZSh0c0NvZGUsIHtjb21waWxlck9wdGlvbnN9KTtcbiAgaWYgKHJlcy5kaWFnbm9zdGljcyAmJiByZXMuZGlhZ25vc3RpY3MubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IG1zZyA9IGBGYWlsZWQgdG8gdHJhbnNwaWxlIFRTIGV4cHJlc3Npb246ICR7dHNDb2RlfVxcbmAgKyByZXMuZGlhZ25vc3RpY3Muam9pbignXFxuJyk7XG4gICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICB9XG4gIHJldHVybiByZXMub3V0cHV0VGV4dDtcbn1cblxuLy8gaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCB7aW5zcGVjdH0gZnJvbSAndXRpbCc7XG5jb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5jb25zdCB7cmVkLCB5ZWxsb3d9ID0gY2hhbGs7XG5jbGFzcyBUc0NvbXBpbGVyIHtcbiAgZmlsZU5hbWVzOiBzdHJpbmdbXSA9IFtdO1xuICBmaWxlczogdHMuTWFwTGlrZTx7IHZlcnNpb246IG51bWJlciB9PiA9IHt9O1xuICBsYW5nU2VydmljZTogdHMuTGFuZ3VhZ2VTZXJ2aWNlO1xuICBmaWxlQ29udGVudCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIC8vIGN1cnJlbnRGaWxlOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocHVibGljIGNvbXBpbGVyT3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgY29uc3QgY29tcGlsZXJIb3N0ID0gdHMuY3JlYXRlQ29tcGlsZXJIb3N0KGNvbXBpbGVyT3B0aW9ucyk7XG5cbiAgICBjb25zdCBzZXJ2aWNlSG9zdDogdHMuTGFuZ3VhZ2VTZXJ2aWNlSG9zdCA9IHtcbiAgICAgIGdldE5ld0xpbmUoKSB7IHJldHVybiAnXFxuJzsgfSxcbiAgICAgIGdldENvbXBpbGF0aW9uU2V0dGluZ3MoKSB7IHJldHVybiBzZWxmLmNvbXBpbGVyT3B0aW9uczt9LFxuICAgICAgZ2V0U2NyaXB0RmlsZU5hbWVzKCkge3JldHVybiBzZWxmLmZpbGVOYW1lczt9LFxuICAgICAgZ2V0U2NyaXB0VmVyc2lvbjogZmlsZU5hbWUgPT5cbiAgICAgICAgdGhpcy5maWxlc1tmaWxlTmFtZV0gJiYgdGhpcy5maWxlc1tmaWxlTmFtZV0udmVyc2lvbi50b1N0cmluZygpLFxuICAgICAgZ2V0U2NyaXB0U25hcHNob3Q6IGZpbGVOYW1lID0+IHtcbiAgICAgICAgaWYgKHRoaXMuZmlsZUNvbnRlbnQuaGFzKGZpbGVOYW1lKSlcbiAgICAgICAgICByZXR1cm4gdHMuU2NyaXB0U25hcHNob3QuZnJvbVN0cmluZyh0aGlzLmZpbGVDb250ZW50LmdldChmaWxlTmFtZSkhKTtcbiAgICAgICAgaWYgKHRzLnN5cy5maWxlRXhpc3RzKGZpbGVOYW1lKSlcbiAgICAgICAgICByZXR1cm4gdHMuU2NyaXB0U25hcHNob3QuZnJvbVN0cmluZyh0cy5zeXMucmVhZEZpbGUoZmlsZU5hbWUpISk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9LFxuICAgICAgZ2V0Q3VycmVudERpcmVjdG9yeTogKCkgPT4gcHJvY2Vzcy5jd2QoKSxcbiAgICAgIGdldERlZmF1bHRMaWJGaWxlTmFtZTogKCkgPT4gY29tcGlsZXJIb3N0LmdldERlZmF1bHRMaWJGaWxlTmFtZVx0KGNvbXBpbGVyT3B0aW9ucyksXG4gICAgICBmaWxlRXhpc3RzOiAoZjogc3RyaW5nKSA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGYpO1xuICAgICAgICByZXR1cm4gY29tcGlsZXJIb3N0LmZpbGVFeGlzdHMoZik7XG4gICAgICB9LFxuICAgICAgcmVhZEZpbGUocGF0aDogc3RyaW5nLCBlbmNvZGU/OiBzdHJpbmcpIHtcbiAgICAgICAgaWYgKHNlbGYuZmlsZUNvbnRlbnQuaGFzKHBhdGgpKVxuICAgICAgICAgIHJldHVybiBzZWxmLmZpbGVDb250ZW50LmdldChwYXRoKTtcbiAgICAgICAgcmV0dXJuIGNvbXBpbGVySG9zdC5yZWFkRmlsZShwYXRoKTtcbiAgICAgIH0sXG4gICAgICByZWFkRGlyZWN0b3J5OiBjb21waWxlckhvc3QucmVhZERpcmVjdG9yeSxcbiAgICAgIGdldERpcmVjdG9yaWVzOiBjb21waWxlckhvc3QuZ2V0RGlyZWN0b3JpZXMsXG4gICAgICBkaXJlY3RvcnlFeGlzdHM6IHRzLnN5cy5kaXJlY3RvcnlFeGlzdHMsIC8vIGRlYnVnZ2FibGUoJ2RpcmVjdG9yeUV4aXN0cycsIGNvbXBpbGVySG9zdC5kaXJlY3RvcnlFeGlzdHMpLFxuICAgICAgcmVhbHBhdGg6IGNvbXBpbGVySG9zdC5yZWFscGF0aCAvLyBkZWJ1Z2dhYmxlKCdyZWFscGF0aCcsIGNvbXBpbGVySG9zdC5yZWFscGF0aCksXG4gICAgfTtcbiAgICB0aGlzLmxhbmdTZXJ2aWNlID0gdHMuY3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlKCBzZXJ2aWNlSG9zdCwgdHMuY3JlYXRlRG9jdW1lbnRSZWdpc3RyeSgpKTtcblxuICB9XG5cbiAgY29tcGlsZShmaWxlTmFtZTogc3RyaW5nLCBzcmNDb2RlOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGZpbGVOYW1lID0gUGF0aC5yZXNvbHZlKGZpbGVOYW1lKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgdGhpcy5maWxlQ29udGVudC5zZXQoZmlsZU5hbWUsIHNyY0NvZGUpO1xuICAgIHRoaXMuZmlsZU5hbWVzLnB1c2goZmlsZU5hbWUpO1xuICAgIC8vIHRoaXMuY3VycmVudEZpbGUgPSBmaWxlTmFtZTtcbiAgICByZXR1cm4gdGhpcy5lbWl0RmlsZShmaWxlTmFtZSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgZW1pdEZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgb3V0cHV0ID0gdGhpcy5sYW5nU2VydmljZS5nZXRFbWl0T3V0cHV0KGZpbGVOYW1lKTtcbiAgICB0aGlzLmxvZ0Vycm9ycyhmaWxlTmFtZSk7XG4gICAgaWYgKG91dHB1dC5lbWl0U2tpcHBlZCkge1xuICAgICAgY29uc29sZS5sb2cocmVkKGB0cy1jb21waWxlciAtIGNvbXBpbGUgJHtmaWxlTmFtZX0gZmFpbGVkYCkpO1xuICAgICAgdGhpcy5sb2dFcnJvcnMoZmlsZU5hbWUsIHRydWUpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gY29tcGlsZSBUeXBlc2NyaXB0ICcgKyBmaWxlTmFtZSk7XG4gICAgfVxuICAgIGlmIChvdXRwdXQub3V0cHV0RmlsZXMubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCd0cy1jb21waWxlciAtIHdoYXQgdGhlIGhlY2ssIHRoZXJlIGFyZSBtb3JlIHRoYW4gb25lIG91dHB1dCBmaWxlcz8gJyArXG4gICAgICAgIG91dHB1dC5vdXRwdXRGaWxlcy5tYXAobyA9PiB5ZWxsb3coby5uYW1lKSkuam9pbignLCAnKSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgbyBvZiBvdXRwdXQub3V0cHV0RmlsZXMpIHtcbiAgICAgIHJldHVybiBvLnRleHQ7XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIGxvZ0Vycm9ycyhmaWxlTmFtZTogc3RyaW5nLCBpc0Vycm9yID0gZmFsc2UpIHtcbiAgICBjb25zdCBhbGxEaWFnbm9zdGljcyA9IHRoaXMubGFuZ1NlcnZpY2VcbiAgICAgIC5nZXRDb21waWxlck9wdGlvbnNEaWFnbm9zdGljcygpXG4gICAgICAuY29uY2F0KHRoaXMubGFuZ1NlcnZpY2UuZ2V0U3ludGFjdGljRGlhZ25vc3RpY3MoZmlsZU5hbWUpKVxuICAgICAgLmNvbmNhdCh0aGlzLmxhbmdTZXJ2aWNlLmdldFNlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWUpKTtcblxuICAgIGFsbERpYWdub3N0aWNzLmZvckVhY2goZGlhZ25vc3RpYyA9PiB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gdHMuZmxhdHRlbkRpYWdub3N0aWNNZXNzYWdlVGV4dChkaWFnbm9zdGljLm1lc3NhZ2VUZXh0LCAnXFxuJyk7XG4gICAgICBpZiAoZGlhZ25vc3RpYy5maWxlKSB7XG4gICAgICAgIGNvbnN0IHsgbGluZSwgY2hhcmFjdGVyIH0gPSBkaWFnbm9zdGljLmZpbGUuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24oZGlhZ25vc3RpYy5zdGFydCEpO1xuICAgICAgICBjb25zb2xlLmxvZygoaXNFcnJvciA/IHJlZCA6IHllbGxvdykoYFt3ZmgudHMtY29tcGlsZXJdICR7KGlzRXJyb3IgPyAnRXJyb3InIDogJ1dhcm5pbmcnKX0gYCArXG4gICAgICAgICAgYCR7ZGlhZ25vc3RpYy5maWxlLmZpbGVOYW1lfSAoJHtsaW5lICsgMX0sJHtjaGFyYWN0ZXIgKyAxfSk6ICR7bWVzc2FnZX1gKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZygoaXNFcnJvciA/IHJlZCA6IHllbGxvdykoYFt3ZmgudHMtY29tcGlsZXJdICR7KGlzRXJyb3IgPyAnRXJyb3InIDogJ1dhcm5pbmcnKX06ICR7bWVzc2FnZX1gKSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxubGV0IHNpbmdsZXRvbkNvbXBpbGVyOiBUc0NvbXBpbGVyO1xuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zcGlsZUFuZENoZWNrKHRzQ29kZTogc3RyaW5nLCBmaWxlbmFtZTogc3RyaW5nLCBjbzogdHMuQ29tcGlsZXJPcHRpb25zfHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGlmICh0eXBlb2YgY28gPT09ICdzdHJpbmcnKSB7XG4gICAgY28gPSByZWFkVHNDb25maWcoY28pO1xuICB9XG4gIGNvLmRlY2xhcmF0aW9uID0gZmFsc2U7XG4gIGNvLmRlY2xhcmF0aW9uTWFwID0gZmFsc2U7XG4gIC8vIGNvLmlubGluZVNvdXJjZU1hcCA9IHRydWU7XG4gIC8vIGNvLnNvdXJjZU1hcCA9IHRydWU7XG4gIGlmIChzaW5nbGV0b25Db21waWxlciA9PSBudWxsKVxuICAgIHNpbmdsZXRvbkNvbXBpbGVyID0gbmV3IFRzQ29tcGlsZXIoY28pO1xuICByZXR1cm4gc2luZ2xldG9uQ29tcGlsZXIuY29tcGlsZShmaWxlbmFtZSwgdHNDb2RlKTtcbn1cblxuLyoqXG4gKiBFeGFjdGx5IGxpa2UgdHMtbm9kZSwgc28gdGhhdCB3ZSBjYW4gYHJlcXVpcmUoKWAgYSB0cyBmaWxlIGRpcmVjdGx5IHdpdGhvdXQgYHRzY2BcbiAqIEBwYXJhbSBleHQgXG4gKiBAcGFyYW0gY29tcGlsZXJPcHQgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlckV4dGVuc2lvbihleHQ6IHN0cmluZywgY29tcGlsZXJPcHQ6IHRzLkNvbXBpbGVyT3B0aW9ucykge1xuICBjb25zdCBvbGQgPSByZXF1aXJlLmV4dGVuc2lvbnNbZXh0XSB8fCByZXF1aXJlLmV4dGVuc2lvbnNbJy5qcyddO1xuICAvLyBjb21waWxlck9wdC5pbmxpbmVTb3VyY2VzID0gdHJ1ZTtcbiAgY29tcGlsZXJPcHQuaW5saW5lU291cmNlTWFwID0gZmFsc2U7XG4gIGNvbXBpbGVyT3B0LmlubGluZVNvdXJjZXMgPSBmYWxzZTtcbiAgcmVxdWlyZS5leHRlbnNpb25zW2V4dF0gPSBmdW5jdGlvbihtOiBhbnksIGZpbGVuYW1lKSB7XG4gICAgLy8gICBpZiAoc2hvdWxkSWdub3JlKGZpbGVuYW1lLCBpZ25vcmUpKSB7XG4gICAgLy8gXHRyZXR1cm4gb2xkKG0sIGZpbGVuYW1lKTtcbiAgICAvLyAgIH1cbiAgICBjb25zdCBfY29tcGlsZSA9IG0uX2NvbXBpbGU7XG4gICAgbS5fY29tcGlsZSA9IGZ1bmN0aW9uKGNvZGU6IHN0cmluZywgZmlsZU5hbWU6IHN0cmluZykge1xuICAgICAgY29uc3QganNjb2RlID0gdHJhbnNwaWxlQW5kQ2hlY2soY29kZSwgZmlsZU5hbWUsIGNvbXBpbGVyT3B0KTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKGpzY29kZSk7XG4gICAgICByZXR1cm4gX2NvbXBpbGUuY2FsbCh0aGlzLCBqc2NvZGUsIGZpbGVOYW1lKTtcbiAgICB9O1xuICAgIHJldHVybiBvbGQobSwgZmlsZW5hbWUpO1xuICB9O1xufVxuXG4vLyBleHBvcnQgZnVuY3Rpb24gdGVzdENvbXBpbGVyKGZpbGU6IHN0cmluZykge1xuLy8gICBjb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG4vLyAgIGNvbnNvbGUubG9nKGZpbGUpO1xuLy8gICBjb25zdCBjb21waWxlck9wdCA9IHtcbi8vICAgICBiYXNlVXJsOiAnLicsXG4vLyAgICAgb3V0RGlyOiAnJyxcbi8vICAgICBkZWNsYXJhdGlvbjogdHJ1ZSxcbi8vICAgICBtb2R1bGU6ICdjb21tb25qcycsXG4vLyAgICAgdGFyZ2V0OiAnZXMyMDE1Jyxcbi8vICAgICBub0ltcGxpY2l0QW55OiB0cnVlLFxuLy8gICAgIHN1cHByZXNzSW1wbGljaXRBbnlJbmRleEVycm9yczogdHJ1ZSxcbi8vICAgICBhbGxvd1N5bnRoZXRpY0RlZmF1bHRJbXBvcnRzOiB0cnVlLFxuLy8gICAgIGVzTW9kdWxlSW50ZXJvcDogdHJ1ZSxcbi8vICAgICBpbmxpbmVTb3VyY2VNYXA6IGZhbHNlLFxuLy8gICAgIGlubGluZVNvdXJjZXM6IHRydWUsXG4vLyAgICAgbW9kdWxlUmVzb2x1dGlvbjogJ25vZGUnLFxuLy8gICAgIGV4cGVyaW1lbnRhbERlY29yYXRvcnM6IHRydWUsXG4vLyAgICAgZW1pdERlY29yYXRvck1ldGFkYXRhOiB0cnVlLFxuLy8gICAgIG5vVW51c2VkTG9jYWxzOiB0cnVlLFxuLy8gICAgIHByZXNlcnZlU3ltbGlua3M6IGZhbHNlLFxuLy8gICAgIGRvd25sZXZlbEl0ZXJhdGlvbjogZmFsc2UsXG4vLyAgICAgc3RyaWN0TnVsbENoZWNrczogdHJ1ZSxcbi8vICAgICByZXNvbHZlSnNvbk1vZHVsZTogdHJ1ZSxcbi8vICAgICBkaWFnbm9zdGljczogdHJ1ZSxcbi8vICAgICBsaWI6IFsgJ2VzMjAxNicsICdlczIwMTUnLCAnZG9tJyBdLFxuLy8gICAgIHByZXR0eTogdHJ1ZSxcbi8vICAgICByb290RGlyOiAnLi4nLFxuLy8gICAgIGltcG9ydEhlbHBlcnM6IHRydWUsXG4vLyAgICAgc2tpcExpYkNoZWNrOiB0cnVlLFxuLy8gICAgIHNvdXJjZU1hcDogdHJ1ZSxcbi8vICAgICBlbWl0RGVjbGFyYXRpb25Pbmx5OiBmYWxzZSxcbi8vICAgICBwYXRoczoge1xuLy8gICAgICAgJyonOiBbXG4vLyAgICAgICAgICcuLi9ub2RlX21vZHVsZXMvQHR5cGVzLyonLFxuLy8gICAgICAgICAnbm9kZV9tb2R1bGVzL0B0eXBlcy8qJyxcbi8vICAgICAgICAgJ25vZGVfbW9kdWxlcy8qJyxcbi8vICAgICAgICAgJy4uL25vZGVfbW9kdWxlcy8qJ1xuLy8gICAgICAgXVxuLy8gICAgIH0sXG4vLyAgICAgdHlwZVJvb3RzOiBbXG4vLyAgICAgICAnL1VzZXJzL2xpdWppbmcvYmsvbXl0b29sL25vZGVfbW9kdWxlcy9AdHlwZXMnXG4vLyAgICAgICAvLycuL25vZGVfbW9kdWxlcy9AdHlwZXMnLCAnLi4vbm9kZV9tb2R1bGVzL0B0eXBlcydcbi8vICAgICBdXG4vLyAgIH07XG5cbi8vICAgY29uc3QgY28gPSBqc29uVG9Db21waWxlck9wdGlvbnMoY29tcGlsZXJPcHQpO1xuLy8gICB0cmFuc3BpbGVBbmRDaGVjayhmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSwgZmlsZSwgY28pO1xuLy8gfVxuIl19