import Path from 'path';
import _ts from 'typescript';
import {parseConfigFileToJson} from '../ts-cmd-util';
// require('inspector').open(9229, '0.0.0.0', true);

type TscOptions = {
  jsx?: boolean;
  inlineSourceMap?: boolean;
  emitDeclarationOnly?: boolean;
  changeCompilerOptions?: (co: Record<string, any>) => void;
  traceResolution?: boolean;
  tsBuildInfoFile?: string;
};
function plinkNodeJsCompilerOptionJson(ts: typeof _ts, opts: TscOptions = {}) {
  const {
    jsx = false,
    inlineSourceMap = false,
    emitDeclarationOnly = false
  } = opts;
  let baseCompilerOptions: any;
  if (jsx) {
    const baseTsconfigFile2 = require.resolve('../../tsconfig-tsx.json');
    const tsxTsconfig = parseConfigFileToJson(ts, baseTsconfigFile2);
    baseCompilerOptions = tsxTsconfig.compilerOptions;
  } else {
    const baseTsconfigFile = require.resolve('../../tsconfig-base.json');
    const baseTsconfig = parseConfigFileToJson(ts, baseTsconfigFile);
    baseCompilerOptions = baseTsconfig.compilerOptions;
  }

  const coRootDir = Path.parse(process.cwd()).root;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const compilerOptions = {
    ...baseCompilerOptions,
    target: 'ES2017',
    importHelpers: true,
    declaration: true,
    tsBuildInfoFile: opts.tsBuildInfoFile,
    // diagnostics: true,
    outDir: coRootDir, // must be same as rootDir
    rootDir: coRootDir,
    skipLibCheck: true,
    inlineSourceMap,
    sourceMap: !inlineSourceMap,
    inlineSources: true,
    emitDeclarationOnly,
    traceResolution: opts.traceResolution,
    preserveSymlinks: false
  } as Record<keyof _ts.CompilerOptions, any>;
  if (opts.changeCompilerOptions) opts.changeCompilerOptions(compilerOptions);

  return compilerOptions;
}

function plinkNodeJsCompilerOption(
  ts: typeof _ts,
  opts: TscOptions & {basePath?: string} = {}
) {
  const json = plinkNodeJsCompilerOptionJson(ts, opts);
  const basePath = (opts.basePath || process.cwd()).replace(/\\/g, '/');
  const {options} = ts.parseJsonConfigFileContent(
    {compilerOptions: json},
    ts.sys,
    basePath,
    undefined,
    Path.resolve(basePath, 'tsconfig-in-memory.json')
  );
  return options;
}
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
export function transpileSingleFile(content: string, ts: any = _ts) {
  const {outputText, diagnostics, sourceMapText} = (
    ts as typeof _ts
  ).transpileModule(content, {
    compilerOptions: {
      ...plinkNodeJsCompilerOption(ts),
      isolatedModules: true,
      inlineSourceMap: false
    }
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
