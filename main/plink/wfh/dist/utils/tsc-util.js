"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transpileSingleFile = transpileSingleFile;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const typescript_1 = tslib_1.__importDefault(require("typescript"));
const ts_cmd_util_1 = require("../ts-cmd-util");
function plinkNodeJsCompilerOptionJson(ts, opts = {}) {
    const { jsx = false, inlineSourceMap = false, emitDeclarationOnly = false } = opts;
    let baseCompilerOptions;
    if (jsx) {
        const baseTsconfigFile2 = require.resolve('../../tsconfig-tsx.json');
        const tsxTsconfig = (0, ts_cmd_util_1.parseConfigFileToJson)(ts, baseTsconfigFile2);
        baseCompilerOptions = tsxTsconfig.compilerOptions;
    }
    else {
        const baseTsconfigFile = require.resolve('../../tsconfig-base.json');
        const baseTsconfig = (0, ts_cmd_util_1.parseConfigFileToJson)(ts, baseTsconfigFile);
        baseCompilerOptions = baseTsconfig.compilerOptions;
    }
    const coRootDir = path_1.default.parse(process.cwd()).root;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const compilerOptions = Object.assign(Object.assign({}, baseCompilerOptions), { target: 'ES2017', importHelpers: true, declaration: true, tsBuildInfoFile: opts.tsBuildInfoFile, 
        // diagnostics: true,
        outDir: coRootDir, rootDir: coRootDir, skipLibCheck: true, inlineSourceMap, sourceMap: !inlineSourceMap, inlineSources: true, emitDeclarationOnly, traceResolution: opts.traceResolution, preserveSymlinks: false });
    if (opts.changeCompilerOptions)
        opts.changeCompilerOptions(compilerOptions);
    return compilerOptions;
}
function plinkNodeJsCompilerOption(ts, opts = {}) {
    const json = plinkNodeJsCompilerOptionJson(ts, opts);
    const basePath = (opts.basePath || process.cwd()).replace(/\\/g, '/');
    const { options } = ts.parseJsonConfigFileContent({ compilerOptions: json }, ts.sys, basePath, undefined, path_1.default.resolve(basePath, 'tsconfig-in-memory.json'));
    return options;
}
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
function transpileSingleFile(content, ts = typescript_1.default) {
    const { outputText, diagnostics, sourceMapText } = ts.transpileModule(content, {
        compilerOptions: Object.assign(Object.assign({}, plinkNodeJsCompilerOption(ts)), { isolatedModules: true, inlineSourceMap: false })
    });
    return {
        outputText,
        sourceMapText,
        diagnostics,
        diagnosticsText: diagnostics
    };
}
// export function registerNode() {
//   const compile = createTranspileFileWithTsCheck(_ts, {
//     tscOpts: {
//       inlineSourceMap: true, basePath: plinkEnv.workDir,
//       changeCompilerOptions(co) {
//         co.preserveSymlinks = true;
//         setTsCompilerOptForNodePath(process.cwd(), co, {
//           workspaceDir: plinkEnv.workDir,
//           enableTypeRoots: true,
//           realPackagePaths: true
//         });
//       }
//     }
//   });
//   const ext = '.ts';
//   const old = require.extensions[ext] || require.extensions['.js'];
//   require.extensions[ext] = function(m: any, filename) {
//     // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
//     const _compile = m._compile;
//     // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
//     m._compile = function(code: string, fileName: string) {
//       const {code: jscode} = compile(code, fileName);
//       // console.log(jscode);
//       // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
//       return _compile.call(this, jscode, fileName);
//     };
//     // eslint-disable-next-line @typescript-eslint/no-unsafe-return
//     return old(m, filename);
//   };
// }
//# sourceMappingURL=tsc-util.js.map