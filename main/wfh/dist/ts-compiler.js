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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy90cy1jb21waWxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLCtDQUFpQztBQUNqQywyQkFBZ0M7QUFDaEMsdUNBQXNDO0FBRXRDLFNBQWdCLFlBQVksQ0FBQyxZQUFvQjtJQUMvQyxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsaUJBQVksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7SUFDL0YsT0FBTyxFQUFFLENBQUMsMEJBQTBCLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsZUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUN6RixTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ3JDLENBQUM7QUFKRCxvQ0FJQztBQUVEOzs7Ozs7R0FNRztBQUNILFNBQWdCLHFCQUFxQixDQUFDLGVBQW9CLEVBQUUsSUFBSSxHQUFHLGVBQWUsRUFDaEYsUUFBUSxHQUFHLGVBQVEsQ0FBQyxPQUFPO0lBQzNCLE9BQU8sRUFBRSxDQUFDLDBCQUEwQixDQUFDLEVBQUMsZUFBZSxFQUFFLGVBQWUsRUFBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQzdHLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDM0IsQ0FBQztBQUpELHNEQUlDO0FBRUQ7OztHQUdHO0FBQ0gsU0FBZ0IsaUJBQWlCLENBQUMsTUFBYyxFQUFFLGVBQW1DO0lBQ25GLE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLEVBQUMsZUFBZSxFQUFDLENBQUMsQ0FBQztJQUMxRCxJQUFJLEdBQUcsQ0FBQyxXQUFXLElBQUksR0FBRyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ2pELE1BQU0sR0FBRyxHQUFHLHNDQUFzQyxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxRixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ25CLE1BQU0sSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDdEI7SUFDRCxPQUFPLEdBQUcsQ0FBQyxVQUFVLENBQUM7QUFDeEIsQ0FBQztBQVJELDhDQVFDO0FBRUQsNEJBQTRCO0FBQzVCLDJDQUE2QjtBQUM3QixnQ0FBZ0M7QUFDaEMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQy9CLE1BQU0sRUFBQyxHQUFHLEVBQUUsTUFBTSxFQUFDLEdBQUcsS0FBSyxDQUFDO0FBQzVCLE1BQU0sVUFBVTtJQUtkLHVCQUF1QjtJQUV2QixZQUFtQixlQUFtQztRQUFuQyxvQkFBZSxHQUFmLGVBQWUsQ0FBb0I7UUFOdEQsY0FBUyxHQUFhLEVBQUUsQ0FBQztRQUN6QixVQUFLLEdBQW9DLEVBQUUsQ0FBQztRQUU1QyxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBSXRDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQztRQUNsQixNQUFNLFlBQVksR0FBRyxFQUFFLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDLENBQUM7UUFFNUQsTUFBTSxHQUFHLEdBQUcsZUFBUSxDQUFDLE9BQU8sQ0FBQztRQUM3QixNQUFNLFdBQVcsR0FBMkI7WUFDMUMsVUFBVSxLQUFLLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQztZQUM3QixzQkFBc0IsS0FBSyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQSxDQUFDO1lBQ3hELGtCQUFrQixLQUFJLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBLENBQUM7WUFDN0MsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FDM0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUU7WUFDakUsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLEVBQUU7Z0JBQzVCLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDO29CQUNoQyxPQUFPLEVBQUUsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBRSxDQUFDLENBQUM7Z0JBQ3ZFLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDO29CQUM3QixPQUFPLEVBQUUsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBRSxDQUFDLENBQUM7Z0JBQ2xFLE9BQU8sU0FBUyxDQUFDO1lBQ25CLENBQUM7WUFDRCxtQkFBbUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHO1lBQzlCLHFCQUFxQixFQUFFLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxxQkFBcUIsQ0FBRSxlQUFlLENBQUM7WUFDakYsVUFBVSxFQUFFLENBQUMsQ0FBUyxFQUFFLEVBQUU7Z0JBQ3hCLGtCQUFrQjtnQkFDbEIsT0FBTyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BDLENBQUM7WUFDRCxRQUFRLENBQUMsSUFBWSxFQUFFLE1BQWU7Z0JBQ3BDLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO29CQUM1QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNwQyxPQUFPLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckMsQ0FBQztZQUNELGFBQWEsRUFBRSxZQUFZLENBQUMsYUFBYTtZQUN6QyxjQUFjLEVBQUUsWUFBWSxDQUFDLGNBQWM7WUFDM0MsZUFBZSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsZUFBZTtZQUN2QyxRQUFRLEVBQUUsWUFBWSxDQUFDLFFBQVEsQ0FBQyxpREFBaUQ7U0FDbEYsQ0FBQztRQUNGLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDLHFCQUFxQixDQUFFLFdBQVcsRUFBRSxFQUFFLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO0lBRXpGLENBQUM7SUFFRCxPQUFPLENBQUMsUUFBZ0IsRUFBRSxPQUFlO1FBQ3ZDLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzlCLCtCQUErQjtRQUMvQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUVTLFFBQVEsQ0FBQyxRQUFnQjtRQUNqQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN4RCxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3pCLElBQUksTUFBTSxDQUFDLFdBQVcsRUFBRTtZQUN0QixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsUUFBUSxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQzdELElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQy9CLE1BQU0sSUFBSSxLQUFLLENBQUMsK0JBQStCLEdBQUcsUUFBUSxDQUFDLENBQUM7U0FDN0Q7UUFDRCxJQUFJLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUNqQyxNQUFNLElBQUksS0FBSyxDQUFDLHFFQUFxRTtnQkFDbkYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7U0FDM0Q7UUFDRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxXQUFXLEVBQUU7WUFDbEMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDO1NBQ2Y7SUFDSCxDQUFDO0lBRVMsU0FBUyxDQUFDLFFBQWdCLEVBQUUsT0FBTyxHQUFHLEtBQUs7UUFDbkQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFdBQVc7YUFDcEMsNkJBQTZCLEVBQUU7YUFDL0IsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDMUQsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsc0JBQXNCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUU3RCxjQUFjLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ2xDLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyw0QkFBNEIsQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzlFLElBQUksVUFBVSxDQUFDLElBQUksRUFBRTtnQkFDbkIsTUFBTSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLFVBQVUsQ0FBQyxLQUFNLENBQUMsQ0FBQztnQkFDN0YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUc7b0JBQzFGLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssSUFBSSxHQUFHLENBQUMsSUFBSSxTQUFTLEdBQUcsQ0FBQyxNQUFNLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQzthQUM5RTtpQkFBTTtnQkFDTCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDM0c7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQUVELElBQUksaUJBQTZCLENBQUM7QUFDbEMsU0FBZ0IsaUJBQWlCLENBQUMsTUFBYyxFQUFFLFFBQWdCLEVBQUUsRUFBNkI7SUFDL0YsSUFBSSxPQUFPLEVBQUUsS0FBSyxRQUFRLEVBQUU7UUFDMUIsRUFBRSxHQUFHLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUN2QjtJQUNELEVBQUUsQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO0lBQ3ZCLEVBQUUsQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDO0lBQzFCLDZCQUE2QjtJQUM3Qix1QkFBdUI7SUFDdkIsSUFBSSxpQkFBaUIsSUFBSSxJQUFJO1FBQzNCLGlCQUFpQixHQUFHLElBQUksVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3pDLE9BQU8saUJBQWlCLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztBQUNyRCxDQUFDO0FBWEQsOENBV0M7QUFFRDs7OztHQUlHO0FBQ0gsU0FBZ0IsaUJBQWlCLENBQUMsR0FBVyxFQUFFLFdBQStCO0lBQzVFLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNqRSxvQ0FBb0M7SUFDcEMsV0FBVyxDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUM7SUFDcEMsV0FBVyxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUM7SUFDbEMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxVQUFTLENBQU0sRUFBRSxRQUFRO1FBQ2pELDBDQUEwQztRQUMxQyw0QkFBNEI7UUFDNUIsTUFBTTtRQUNOLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFDNUIsQ0FBQyxDQUFDLFFBQVEsR0FBRyxVQUFTLElBQVksRUFBRSxRQUFnQjtZQUNsRCxNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQzlELHVCQUF1QjtZQUN2QixPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMvQyxDQUFDLENBQUM7UUFDRixPQUFPLEdBQUcsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDMUIsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQWpCRCw4Q0FpQkM7QUFFRCwrQ0FBK0M7QUFDL0MsOEJBQThCO0FBQzlCLHVCQUF1QjtBQUN2QiwwQkFBMEI7QUFDMUIsb0JBQW9CO0FBQ3BCLGtCQUFrQjtBQUNsQix5QkFBeUI7QUFDekIsMEJBQTBCO0FBQzFCLHdCQUF3QjtBQUN4QiwyQkFBMkI7QUFDM0IsNENBQTRDO0FBQzVDLDBDQUEwQztBQUMxQyw2QkFBNkI7QUFDN0IsOEJBQThCO0FBQzlCLDJCQUEyQjtBQUMzQixnQ0FBZ0M7QUFDaEMsb0NBQW9DO0FBQ3BDLG1DQUFtQztBQUNuQyw0QkFBNEI7QUFDNUIsK0JBQStCO0FBQy9CLGlDQUFpQztBQUNqQyw4QkFBOEI7QUFDOUIsK0JBQStCO0FBQy9CLHlCQUF5QjtBQUN6QiwwQ0FBMEM7QUFDMUMsb0JBQW9CO0FBQ3BCLHFCQUFxQjtBQUNyQiwyQkFBMkI7QUFDM0IsMEJBQTBCO0FBQzFCLHVCQUF1QjtBQUN2QixrQ0FBa0M7QUFDbEMsZUFBZTtBQUNmLGVBQWU7QUFDZixzQ0FBc0M7QUFDdEMsbUNBQW1DO0FBQ25DLDRCQUE0QjtBQUM1Qiw4QkFBOEI7QUFDOUIsVUFBVTtBQUNWLFNBQVM7QUFDVCxtQkFBbUI7QUFDbkIsdURBQXVEO0FBQ3ZELDREQUE0RDtBQUM1RCxRQUFRO0FBQ1IsT0FBTztBQUVQLG1EQUFtRDtBQUNuRCxnRUFBZ0U7QUFDaEUsSUFBSSIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGVcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtyZWFkRmlsZVN5bmN9IGZyb20gJ2ZzJztcbmltcG9ydCB7cGxpbmtFbnZ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkVHNDb25maWcodHNjb25maWdGaWxlOiBzdHJpbmcpOiB0cy5Db21waWxlck9wdGlvbnMge1xuICBjb25zdCB0c2NvbmZpZyA9IHRzLnJlYWRDb25maWdGaWxlKHRzY29uZmlnRmlsZSwgKGZpbGUpID0+IHJlYWRGaWxlU3luYyhmaWxlLCAndXRmLTgnKSkuY29uZmlnO1xuICByZXR1cm4gdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQodHNjb25maWcsIHRzLnN5cywgcGxpbmtFbnYud29ya0Rpci5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgdW5kZWZpbmVkLCB0c2NvbmZpZ0ZpbGUpLm9wdGlvbnM7XG59XG5cbi8qKlxuICogY2FsbCB0cy5wYXJzZUpzb25Db25maWdGaWxlQ29udGVudCgpXG4gKiBAcGFyYW0ganNvbkNvbXBpbGVyT3B0IFxuICogQHBhcmFtIGZpbGUgXG4gKiBAcGFyYW0gYmFzZVBhdGggLSAodHNjb25maWcgZmlsZSBkaXJlY3RvcnkpIFxuICogIEEgcm9vdCBkaXJlY3RvcnkgdG8gcmVzb2x2ZSByZWxhdGl2ZSBwYXRoIGVudHJpZXMgaW4gdGhlIGNvbmZpZyBmaWxlIHRvLiBlLmcuIG91dERpclxuICovXG5leHBvcnQgZnVuY3Rpb24ganNvblRvQ29tcGlsZXJPcHRpb25zKGpzb25Db21waWxlck9wdDogYW55LCBmaWxlID0gJ3RzY29uZmlnLmpzb24nLFxuICBiYXNlUGF0aCA9IHBsaW5rRW52LndvcmtEaXIpOiB0cy5Db21waWxlck9wdGlvbnMge1xuICByZXR1cm4gdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQoe2NvbXBpbGVyT3B0aW9uczoganNvbkNvbXBpbGVyT3B0fSwgdHMuc3lzLCBiYXNlUGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gIHVuZGVmaW5lZCwgZmlsZSkub3B0aW9ucztcbn1cblxuLyoqXG4gKiBSZWZlciB0byBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvd2lraS9Vc2luZy10aGUtQ29tcGlsZXItQVBJI3RyYW5zcGlsaW5nLWEtc2luZ2xlLWZpbGVcbiAqIEBwYXJhbSB0c0NvZGUgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0cmFuc3BpbGVTaW5nbGVUcyh0c0NvZGU6IHN0cmluZywgY29tcGlsZXJPcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpOiBzdHJpbmcge1xuICBjb25zdCByZXMgPSB0cy50cmFuc3BpbGVNb2R1bGUodHNDb2RlLCB7Y29tcGlsZXJPcHRpb25zfSk7XG4gIGlmIChyZXMuZGlhZ25vc3RpY3MgJiYgcmVzLmRpYWdub3N0aWNzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBtc2cgPSBgRmFpbGVkIHRvIHRyYW5zcGlsZSBUUyBleHByZXNzaW9uOiAke3RzQ29kZX1cXG5gICsgcmVzLmRpYWdub3N0aWNzLmpvaW4oJ1xcbicpO1xuICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgfVxuICByZXR1cm4gcmVzLm91dHB1dFRleHQ7XG59XG5cbi8vIGltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG4vLyBpbXBvcnQge2luc3BlY3R9IGZyb20gJ3V0aWwnO1xuY29uc3QgY2hhbGsgPSByZXF1aXJlKCdjaGFsaycpO1xuY29uc3Qge3JlZCwgeWVsbG93fSA9IGNoYWxrO1xuY2xhc3MgVHNDb21waWxlciB7XG4gIGZpbGVOYW1lczogc3RyaW5nW10gPSBbXTtcbiAgZmlsZXM6IHRzLk1hcExpa2U8eyB2ZXJzaW9uOiBudW1iZXIgfT4gPSB7fTtcbiAgbGFuZ1NlcnZpY2U6IHRzLkxhbmd1YWdlU2VydmljZTtcbiAgZmlsZUNvbnRlbnQgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAvLyBjdXJyZW50RmlsZTogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBjb21waWxlck9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucykge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIGNvbnN0IGNvbXBpbGVySG9zdCA9IHRzLmNyZWF0ZUNvbXBpbGVySG9zdChjb21waWxlck9wdGlvbnMpO1xuXG4gICAgY29uc3QgY3dkID0gcGxpbmtFbnYud29ya0RpcjtcbiAgICBjb25zdCBzZXJ2aWNlSG9zdDogdHMuTGFuZ3VhZ2VTZXJ2aWNlSG9zdCA9IHtcbiAgICAgIGdldE5ld0xpbmUoKSB7IHJldHVybiAnXFxuJzsgfSxcbiAgICAgIGdldENvbXBpbGF0aW9uU2V0dGluZ3MoKSB7IHJldHVybiBzZWxmLmNvbXBpbGVyT3B0aW9uczt9LFxuICAgICAgZ2V0U2NyaXB0RmlsZU5hbWVzKCkge3JldHVybiBzZWxmLmZpbGVOYW1lczt9LFxuICAgICAgZ2V0U2NyaXB0VmVyc2lvbjogZmlsZU5hbWUgPT5cbiAgICAgICAgdGhpcy5maWxlc1tmaWxlTmFtZV0gJiYgdGhpcy5maWxlc1tmaWxlTmFtZV0udmVyc2lvbi50b1N0cmluZygpLFxuICAgICAgZ2V0U2NyaXB0U25hcHNob3Q6IGZpbGVOYW1lID0+IHtcbiAgICAgICAgaWYgKHRoaXMuZmlsZUNvbnRlbnQuaGFzKGZpbGVOYW1lKSlcbiAgICAgICAgICByZXR1cm4gdHMuU2NyaXB0U25hcHNob3QuZnJvbVN0cmluZyh0aGlzLmZpbGVDb250ZW50LmdldChmaWxlTmFtZSkhKTtcbiAgICAgICAgaWYgKHRzLnN5cy5maWxlRXhpc3RzKGZpbGVOYW1lKSlcbiAgICAgICAgICByZXR1cm4gdHMuU2NyaXB0U25hcHNob3QuZnJvbVN0cmluZyh0cy5zeXMucmVhZEZpbGUoZmlsZU5hbWUpISk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9LFxuICAgICAgZ2V0Q3VycmVudERpcmVjdG9yeTogKCkgPT4gY3dkLFxuICAgICAgZ2V0RGVmYXVsdExpYkZpbGVOYW1lOiAoKSA9PiBjb21waWxlckhvc3QuZ2V0RGVmYXVsdExpYkZpbGVOYW1lXHQoY29tcGlsZXJPcHRpb25zKSxcbiAgICAgIGZpbGVFeGlzdHM6IChmOiBzdHJpbmcpID0+IHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coZik7XG4gICAgICAgIHJldHVybiBjb21waWxlckhvc3QuZmlsZUV4aXN0cyhmKTtcbiAgICAgIH0sXG4gICAgICByZWFkRmlsZShwYXRoOiBzdHJpbmcsIGVuY29kZT86IHN0cmluZykge1xuICAgICAgICBpZiAoc2VsZi5maWxlQ29udGVudC5oYXMocGF0aCkpXG4gICAgICAgICAgcmV0dXJuIHNlbGYuZmlsZUNvbnRlbnQuZ2V0KHBhdGgpO1xuICAgICAgICByZXR1cm4gY29tcGlsZXJIb3N0LnJlYWRGaWxlKHBhdGgpO1xuICAgICAgfSxcbiAgICAgIHJlYWREaXJlY3Rvcnk6IGNvbXBpbGVySG9zdC5yZWFkRGlyZWN0b3J5LFxuICAgICAgZ2V0RGlyZWN0b3JpZXM6IGNvbXBpbGVySG9zdC5nZXREaXJlY3RvcmllcyxcbiAgICAgIGRpcmVjdG9yeUV4aXN0czogdHMuc3lzLmRpcmVjdG9yeUV4aXN0cywgLy8gZGVidWdnYWJsZSgnZGlyZWN0b3J5RXhpc3RzJywgY29tcGlsZXJIb3N0LmRpcmVjdG9yeUV4aXN0cyksXG4gICAgICByZWFscGF0aDogY29tcGlsZXJIb3N0LnJlYWxwYXRoIC8vIGRlYnVnZ2FibGUoJ3JlYWxwYXRoJywgY29tcGlsZXJIb3N0LnJlYWxwYXRoKSxcbiAgICB9O1xuICAgIHRoaXMubGFuZ1NlcnZpY2UgPSB0cy5jcmVhdGVMYW5ndWFnZVNlcnZpY2UoIHNlcnZpY2VIb3N0LCB0cy5jcmVhdGVEb2N1bWVudFJlZ2lzdHJ5KCkpO1xuXG4gIH1cblxuICBjb21waWxlKGZpbGVOYW1lOiBzdHJpbmcsIHNyY0NvZGU6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgZmlsZU5hbWUgPSBQYXRoLnJlc29sdmUoZmlsZU5hbWUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICB0aGlzLmZpbGVDb250ZW50LnNldChmaWxlTmFtZSwgc3JjQ29kZSk7XG4gICAgdGhpcy5maWxlTmFtZXMucHVzaChmaWxlTmFtZSk7XG4gICAgLy8gdGhpcy5jdXJyZW50RmlsZSA9IGZpbGVOYW1lO1xuICAgIHJldHVybiB0aGlzLmVtaXRGaWxlKGZpbGVOYW1lKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBlbWl0RmlsZShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBvdXRwdXQgPSB0aGlzLmxhbmdTZXJ2aWNlLmdldEVtaXRPdXRwdXQoZmlsZU5hbWUpO1xuICAgIHRoaXMubG9nRXJyb3JzKGZpbGVOYW1lKTtcbiAgICBpZiAob3V0cHV0LmVtaXRTa2lwcGVkKSB7XG4gICAgICBjb25zb2xlLmxvZyhyZWQoYHRzLWNvbXBpbGVyIC0gY29tcGlsZSAke2ZpbGVOYW1lfSBmYWlsZWRgKSk7XG4gICAgICB0aGlzLmxvZ0Vycm9ycyhmaWxlTmFtZSwgdHJ1ZSk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBjb21waWxlIFR5cGVzY3JpcHQgJyArIGZpbGVOYW1lKTtcbiAgICB9XG4gICAgaWYgKG91dHB1dC5vdXRwdXRGaWxlcy5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3RzLWNvbXBpbGVyIC0gd2hhdCB0aGUgaGVjaywgdGhlcmUgYXJlIG1vcmUgdGhhbiBvbmUgb3V0cHV0IGZpbGVzPyAnICtcbiAgICAgICAgb3V0cHV0Lm91dHB1dEZpbGVzLm1hcChvID0+IHllbGxvdyhvLm5hbWUpKS5qb2luKCcsICcpKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBvIG9mIG91dHB1dC5vdXRwdXRGaWxlcykge1xuICAgICAgcmV0dXJuIG8udGV4dDtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgbG9nRXJyb3JzKGZpbGVOYW1lOiBzdHJpbmcsIGlzRXJyb3IgPSBmYWxzZSkge1xuICAgIGNvbnN0IGFsbERpYWdub3N0aWNzID0gdGhpcy5sYW5nU2VydmljZVxuICAgICAgLmdldENvbXBpbGVyT3B0aW9uc0RpYWdub3N0aWNzKClcbiAgICAgIC5jb25jYXQodGhpcy5sYW5nU2VydmljZS5nZXRTeW50YWN0aWNEaWFnbm9zdGljcyhmaWxlTmFtZSkpXG4gICAgICAuY29uY2F0KHRoaXMubGFuZ1NlcnZpY2UuZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhmaWxlTmFtZSkpO1xuXG4gICAgYWxsRGlhZ25vc3RpY3MuZm9yRWFjaChkaWFnbm9zdGljID0+IHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0cy5mbGF0dGVuRGlhZ25vc3RpY01lc3NhZ2VUZXh0KGRpYWdub3N0aWMubWVzc2FnZVRleHQsICdcXG4nKTtcbiAgICAgIGlmIChkaWFnbm9zdGljLmZpbGUpIHtcbiAgICAgICAgY29uc3QgeyBsaW5lLCBjaGFyYWN0ZXIgfSA9IGRpYWdub3N0aWMuZmlsZS5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihkaWFnbm9zdGljLnN0YXJ0ISk7XG4gICAgICAgIGNvbnNvbGUubG9nKChpc0Vycm9yID8gcmVkIDogeWVsbG93KShgW3dmaC50cy1jb21waWxlcl0gJHsoaXNFcnJvciA/ICdFcnJvcicgOiAnV2FybmluZycpfSBgICtcbiAgICAgICAgICBgJHtkaWFnbm9zdGljLmZpbGUuZmlsZU5hbWV9ICgke2xpbmUgKyAxfSwke2NoYXJhY3RlciArIDF9KTogJHttZXNzYWdlfWApKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKChpc0Vycm9yID8gcmVkIDogeWVsbG93KShgW3dmaC50cy1jb21waWxlcl0gJHsoaXNFcnJvciA/ICdFcnJvcicgOiAnV2FybmluZycpfTogJHttZXNzYWdlfWApKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5sZXQgc2luZ2xldG9uQ29tcGlsZXI6IFRzQ29tcGlsZXI7XG5leHBvcnQgZnVuY3Rpb24gdHJhbnNwaWxlQW5kQ2hlY2sodHNDb2RlOiBzdHJpbmcsIGZpbGVuYW1lOiBzdHJpbmcsIGNvOiB0cy5Db21waWxlck9wdGlvbnN8c3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgaWYgKHR5cGVvZiBjbyA9PT0gJ3N0cmluZycpIHtcbiAgICBjbyA9IHJlYWRUc0NvbmZpZyhjbyk7XG4gIH1cbiAgY28uZGVjbGFyYXRpb24gPSBmYWxzZTtcbiAgY28uZGVjbGFyYXRpb25NYXAgPSBmYWxzZTtcbiAgLy8gY28uaW5saW5lU291cmNlTWFwID0gdHJ1ZTtcbiAgLy8gY28uc291cmNlTWFwID0gdHJ1ZTtcbiAgaWYgKHNpbmdsZXRvbkNvbXBpbGVyID09IG51bGwpXG4gICAgc2luZ2xldG9uQ29tcGlsZXIgPSBuZXcgVHNDb21waWxlcihjbyk7XG4gIHJldHVybiBzaW5nbGV0b25Db21waWxlci5jb21waWxlKGZpbGVuYW1lLCB0c0NvZGUpO1xufVxuXG4vKipcbiAqIEV4YWN0bHkgbGlrZSB0cy1ub2RlLCBzbyB0aGF0IHdlIGNhbiBgcmVxdWlyZSgpYCBhIHRzIGZpbGUgZGlyZWN0bHkgd2l0aG91dCBgdHNjYFxuICogQHBhcmFtIGV4dCBcbiAqIEBwYXJhbSBjb21waWxlck9wdCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyRXh0ZW5zaW9uKGV4dDogc3RyaW5nLCBjb21waWxlck9wdDogdHMuQ29tcGlsZXJPcHRpb25zKSB7XG4gIGNvbnN0IG9sZCA9IHJlcXVpcmUuZXh0ZW5zaW9uc1tleHRdIHx8IHJlcXVpcmUuZXh0ZW5zaW9uc1snLmpzJ107XG4gIC8vIGNvbXBpbGVyT3B0LmlubGluZVNvdXJjZXMgPSB0cnVlO1xuICBjb21waWxlck9wdC5pbmxpbmVTb3VyY2VNYXAgPSBmYWxzZTtcbiAgY29tcGlsZXJPcHQuaW5saW5lU291cmNlcyA9IGZhbHNlO1xuICByZXF1aXJlLmV4dGVuc2lvbnNbZXh0XSA9IGZ1bmN0aW9uKG06IGFueSwgZmlsZW5hbWUpIHtcbiAgICAvLyAgIGlmIChzaG91bGRJZ25vcmUoZmlsZW5hbWUsIGlnbm9yZSkpIHtcbiAgICAvLyBcdHJldHVybiBvbGQobSwgZmlsZW5hbWUpO1xuICAgIC8vICAgfVxuICAgIGNvbnN0IF9jb21waWxlID0gbS5fY29tcGlsZTtcbiAgICBtLl9jb21waWxlID0gZnVuY3Rpb24oY29kZTogc3RyaW5nLCBmaWxlTmFtZTogc3RyaW5nKSB7XG4gICAgICBjb25zdCBqc2NvZGUgPSB0cmFuc3BpbGVBbmRDaGVjayhjb2RlLCBmaWxlTmFtZSwgY29tcGlsZXJPcHQpO1xuICAgICAgLy8gY29uc29sZS5sb2coanNjb2RlKTtcbiAgICAgIHJldHVybiBfY29tcGlsZS5jYWxsKHRoaXMsIGpzY29kZSwgZmlsZU5hbWUpO1xuICAgIH07XG4gICAgcmV0dXJuIG9sZChtLCBmaWxlbmFtZSk7XG4gIH07XG59XG5cbi8vIGV4cG9ydCBmdW5jdGlvbiB0ZXN0Q29tcGlsZXIoZmlsZTogc3RyaW5nKSB7XG4vLyAgIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbi8vICAgY29uc29sZS5sb2coZmlsZSk7XG4vLyAgIGNvbnN0IGNvbXBpbGVyT3B0ID0ge1xuLy8gICAgIGJhc2VVcmw6ICcuJyxcbi8vICAgICBvdXREaXI6ICcnLFxuLy8gICAgIGRlY2xhcmF0aW9uOiB0cnVlLFxuLy8gICAgIG1vZHVsZTogJ2NvbW1vbmpzJyxcbi8vICAgICB0YXJnZXQ6ICdlczIwMTUnLFxuLy8gICAgIG5vSW1wbGljaXRBbnk6IHRydWUsXG4vLyAgICAgc3VwcHJlc3NJbXBsaWNpdEFueUluZGV4RXJyb3JzOiB0cnVlLFxuLy8gICAgIGFsbG93U3ludGhldGljRGVmYXVsdEltcG9ydHM6IHRydWUsXG4vLyAgICAgZXNNb2R1bGVJbnRlcm9wOiB0cnVlLFxuLy8gICAgIGlubGluZVNvdXJjZU1hcDogZmFsc2UsXG4vLyAgICAgaW5saW5lU291cmNlczogdHJ1ZSxcbi8vICAgICBtb2R1bGVSZXNvbHV0aW9uOiAnbm9kZScsXG4vLyAgICAgZXhwZXJpbWVudGFsRGVjb3JhdG9yczogdHJ1ZSxcbi8vICAgICBlbWl0RGVjb3JhdG9yTWV0YWRhdGE6IHRydWUsXG4vLyAgICAgbm9VbnVzZWRMb2NhbHM6IHRydWUsXG4vLyAgICAgcHJlc2VydmVTeW1saW5rczogZmFsc2UsXG4vLyAgICAgZG93bmxldmVsSXRlcmF0aW9uOiBmYWxzZSxcbi8vICAgICBzdHJpY3ROdWxsQ2hlY2tzOiB0cnVlLFxuLy8gICAgIHJlc29sdmVKc29uTW9kdWxlOiB0cnVlLFxuLy8gICAgIGRpYWdub3N0aWNzOiB0cnVlLFxuLy8gICAgIGxpYjogWyAnZXMyMDE2JywgJ2VzMjAxNScsICdkb20nIF0sXG4vLyAgICAgcHJldHR5OiB0cnVlLFxuLy8gICAgIHJvb3REaXI6ICcuLicsXG4vLyAgICAgaW1wb3J0SGVscGVyczogdHJ1ZSxcbi8vICAgICBza2lwTGliQ2hlY2s6IHRydWUsXG4vLyAgICAgc291cmNlTWFwOiB0cnVlLFxuLy8gICAgIGVtaXREZWNsYXJhdGlvbk9ubHk6IGZhbHNlLFxuLy8gICAgIHBhdGhzOiB7XG4vLyAgICAgICAnKic6IFtcbi8vICAgICAgICAgJy4uL25vZGVfbW9kdWxlcy9AdHlwZXMvKicsXG4vLyAgICAgICAgICdub2RlX21vZHVsZXMvQHR5cGVzLyonLFxuLy8gICAgICAgICAnbm9kZV9tb2R1bGVzLyonLFxuLy8gICAgICAgICAnLi4vbm9kZV9tb2R1bGVzLyonXG4vLyAgICAgICBdXG4vLyAgICAgfSxcbi8vICAgICB0eXBlUm9vdHM6IFtcbi8vICAgICAgICcvVXNlcnMvbGl1amluZy9iay9teXRvb2wvbm9kZV9tb2R1bGVzL0B0eXBlcydcbi8vICAgICAgIC8vJy4vbm9kZV9tb2R1bGVzL0B0eXBlcycsICcuLi9ub2RlX21vZHVsZXMvQHR5cGVzJ1xuLy8gICAgIF1cbi8vICAgfTtcblxuLy8gICBjb25zdCBjbyA9IGpzb25Ub0NvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdCk7XG4vLyAgIHRyYW5zcGlsZUFuZENoZWNrKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlLCBjbyk7XG4vLyB9XG4iXX0=