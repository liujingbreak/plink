import 'source-map-support/register';

import Query from '../utils/ts-ast-query';
import fs from 'fs';
import ts from 'typescript';
import Path from 'path';
// import {EOL as eol} from 'os';
import {DFS} from '../utils/graph';
import {jsonToCompilerOptions} from '../ts-compiler';
// import {setTsCompilerOptForNodePath} from '../package-mgr/package-list-helper';
import {initAsChildProcess} from '../utils/bootstrap-process';
import {closestCommonParentDir, plinkEnv} from '../utils/misc';
import {mergeBaseUrlAndPaths, RequiredCompilerOptions} from '../ts-cmd-util';

let coJson: RequiredCompilerOptions;
// setTsCompilerOptForNodePath(plinkEnv.workDir, './', coJson, {workspaceDir: plinkEnv.workDir});
let co: ts.CompilerOptions | undefined;
let resCache: ts.ModuleResolutionCache;
let host: ts.CompilerHost;
initAsChildProcess();
export class Context {
  commonDir: string;
  constructor(
    commonDir: string,
    public alias: [reg: RegExp, replaceTo: string][],
    public relativeDepsOutSideDir: Set<string> = new Set(),
    public cyclic: string[] = [],
    public canNotResolve: {
      target: string;
      file: string;
      pos: string;
      reasone: string;
    }[] = [],
    public externalDeps: Set<string> = new Set(),
    public matchAlias: string[] = []
  ) {
    this.commonDir = commonDir.endsWith(Path.sep) ? commonDir : commonDir + Path.sep;
  }

  toPlainObject() {
    return {
      commonDir: this.commonDir.slice(0, -1), // trim last Path.sep
      relativeDepsOutSideDir: Array.from(this.relativeDepsOutSideDir.values()),
      cyclic: this.cyclic,
      canNotResolve: this.canNotResolve,
      externalDeps: Array.from(this.externalDeps.values()),
      matchAlias: this.matchAlias
    };
  }
}

export function dfsTraverseFiles(files: string[], tsconfigFile: string | null | undefined,
  alias: [reg: string, replaceTo: string][]): ReturnType<Context['toPlainObject']> {
  init(tsconfigFile);
  const commonParentDir = closestCommonParentDir(files);
  const context = new Context(commonParentDir, alias.map(item => [new RegExp(item[0]), item[1]]));

  const dfs: DFS<string> = new DFS<string>(data => {
    const q = new Query(fs.readFileSync(data, 'utf8'), data);
    return parseFile(q, data, context);
  });

  dfs.visit(files);
  const cwd = plinkEnv.workDir;
  if (dfs.backEdges.length > 0) {
    for (const edges of dfs.backEdges) {
      // // tslint:disable-next-line: no-console
      // console.log(`Found cyclic file dependency ${dfs.printCyclicBackEdge(edges[0], edges[1])}`);
      context.cyclic.push(dfs.printCyclicBackEdge(edges[0], edges[1])
        .map(path => Path.relative(cwd, path)).join('\n -> ')
      );
    }
  }
  return context.toPlainObject();
}

/**
 * 
 * @param tsconfigFile all compilerOptions.paths setting will be adopted in resolving files
 */
function init(tsconfigFile?: string | null) {
  if (coJson != null)
    return;
  const baseTsconfigFile = Path.resolve(__dirname, '../../tsconfig-tsx.json');
  const baseTscfg = ts.parseConfigFileTextToJson(baseTsconfigFile, fs.readFileSync(baseTsconfigFile, 'utf8'))
    .config;
  // console.log(baseTscfg);

  coJson = baseTscfg.compilerOptions;
  if (tsconfigFile) {
    mergeBaseUrlAndPaths(ts, tsconfigFile, plinkEnv.workDir, coJson);
  }
  coJson.allowJs = true;
  coJson.resolveJsonModule = true;
  co = jsonToCompilerOptions(coJson, baseTsconfigFile, plinkEnv.workDir);
  resCache = ts.createModuleResolutionCache(plinkEnv.workDir, fileName => fileName, co);
  host = ts.createCompilerHost(co);
}

function parseFile(q: Query, file: string, ctx: Context) {
  const deps: string[] = [];
  // tslint:disable-next-line: no-console
  console.log('[cli-analysie-worker] Lookup file', Path.relative(plinkEnv.workDir, file));
  q.walkAst(q.src, [
    {
      query: '.moduleSpecifier:StringLiteral', // Both :ExportDeclaration or :ImportDeclaration
      callback(ast) {
        const dep = resolve((ast as ts.StringLiteral).getText(), file, ctx, ast.getStart(), q.src);
        if (dep)
          deps.push(dep);
      }
    },
    {
      query: ':PropertyAssignment>.name',
      callback(ast, path, parents) {
        if (ast.getText() === 'loadChildren') {
          const value = (ast.parent as ts.PropertyAssignment).initializer;
          if (value.kind === ts.SyntaxKind.StringLiteral) {
            const lazyModule = (value as ts.StringLiteral).text;
            const hashTag = lazyModule.indexOf('#');
            if (hashTag > 0) {
              // We found lazy route module
              // tslint:disable-next-line:no-console
              console.log('lazy route module:', lazyModule);
              const dep = resolve(lazyModule.slice(0, hashTag), file, ctx, ast.getStart(), q.src);
              if (dep)
                deps.push(dep);
            }
          }
        }
      }
    },
    {
      query: ':CallExpression>.expression:ImportKeyword',
      callback(ast, path) {
        const dep = resolve(((ast.parent as ts.CallExpression).arguments[0] as ts.StringLiteral).text, file,
          ctx, ast.getStart(), q.src);
        if (dep)
          deps.push(dep);
      }
    },
    {
      query: ':CallExpression',
      callback(ast, path) {
        const node = ast as ts.CallExpression ;
        if (node.expression.kind === ts.SyntaxKind.Identifier &&
          (node.expression as ts.Identifier).text === 'require' &&
          node.arguments[0].kind === ts.SyntaxKind.StringLiteral) {
          const dep = resolve((node.arguments[0] as ts.StringLiteral).text, file, ctx, ast.getStart(), q.src);
          if (dep)
            deps.push(dep);
        }
      }
    }
  ]);
  return deps;
}

function resolve(path: string, file: string, ctx: Context, pos: number, src: ts.SourceFile) {
  if (path.startsWith('`')) {
    const lineInfo = ts.getLineAndCharacterOfPosition(src, pos);
    ctx.canNotResolve.push({
      target: path,
      file,
      pos: `line:${lineInfo.line + 1}, col:${lineInfo.character + 1}`,
      reasone: 'dynamic value'
    });
    // tslint:disable-next-line: no-console
    // tslint:disable-next-line: max-line-length
    // console.log(`[cli-analysie-worker] can not resolve dynamic value ${path} in ${file} @${lineInfo.line + 1}:${lineInfo.character + 1}`);
    return null;
  }
  if (path.startsWith('"') || path.startsWith('\''))
    path = path.slice(1, -1);

  for (const [reg, replaceTo] of ctx.alias) {
    const replaced = path.replace(reg, replaceTo);
    if (path !== replaced) {
      // console.log(replaced);
      ctx.matchAlias.push(path);
      // console.log(`resolve alias ${path} to `, replaced);
      path = replaced;
      break;
    }
  }

  const suffix = Path.extname(path);
  if (suffix && !/^\.[tj]sx?$/.test(path)) {
    return null;
  }

  let resolved = ts.resolveModuleName(path, file, co!, host, resCache).resolvedModule;
  if (resolved == null) {
    [path + '/index', path + '.js', path + '.jsx', path + '/index.js', path + '/index.jsx'].some(tryPath => {
      resolved = ts.resolveModuleName(tryPath, file, co!, host, resCache).resolvedModule;
      return resolved != null;
    });
  }
  // if (path.startsWith('.') || Path.isAbsolute(path)) {
  if (resolved == null) {
    if (!path.startsWith('.') && !Path.isAbsolute(path)) {
      const m = /^(?:@[^/]+\/)?[^/]+/.exec(path);
      ctx.externalDeps.add(m ? m[0] : path);
      return null;
    }
    const lineInfo = ts.getLineAndCharacterOfPosition(src, pos);
    ctx.canNotResolve.push({
      target: path,
      file,
      pos: `line:${lineInfo.line + 1}, col:${lineInfo.character + 1}`,
      reasone: 'Typescript failed to resolve'
    });
    return null;
  }
  if (resolved?.packageId) {
    // resolved.packageId.name always return @type/xxxx instead of real package
    // ctx.externalDeps.add(resolved.packageId.name);
    const m = /^(?:@[^/]+\/)?[^/]+/.exec(path);
    if (m) {
      ctx.externalDeps.add(m[0]);
    } else {
      ctx.externalDeps.add(resolved.packageId.name);
    }
  } else if (resolved) {
    const absPath = Path.resolve(resolved.resolvedFileName);
    if (!absPath.startsWith(ctx.commonDir)) {
      ctx.relativeDepsOutSideDir.add(Path.relative(plinkEnv.workDir, absPath));
    }
    return absPath;
  }
}


