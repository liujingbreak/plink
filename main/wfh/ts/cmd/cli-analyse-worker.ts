import 'source-map-support/register';

import Query from '../utils/ts-ast-query';
import fs from 'fs';
import ts from 'typescript';
import Path from 'path';
// import {EOL as eol} from 'os';
import {DFS} from '../utils/graph';
import {jsonToCompilerOptions} from '../ts-compiler';
import {setTsCompilerOptForNodePath} from '../config-handler';
import {initProcess} from '../utils/bootstrap-process';
import {closestCommonParentDir} from '../utils/misc';


const baseTsconfigFile = Path.resolve(__dirname, '../../tsconfig-tsx.json');
const coJson = ts.parseConfigFileTextToJson(baseTsconfigFile, fs.readFileSync(baseTsconfigFile, 'utf8'))
  .config.compilerOptions;
coJson.allowJs = true;
coJson.resolveJsonModule = true;
initProcess();
setTsCompilerOptForNodePath(process.cwd(), './', coJson, {workspaceDir: process.cwd()});
const co = jsonToCompilerOptions(coJson, baseTsconfigFile, process.cwd());



const resCache = ts.createModuleResolutionCache(process.cwd(),
      fileName => fileName,
      co);
const host = ts.createCompilerHost(co);

export class Context {
  commonDir: string;
  constructor(
    commonDir: string,
    public relativeDepsOutSideDir: Set<string> = new Set(),
    public cyclic: string[] = [],
    public canNotResolve: {
      target: string;
      file: string;
      pos: string;
      reasone: string;
    }[] = [],
    public externalDeps: Set<string> = new Set()
  ) {
    this.commonDir = commonDir.endsWith(Path.sep) ? commonDir : commonDir + Path.sep;
  }

  toPlainObject() {
    return {
      commonDir: this.commonDir.slice(0, -1), // trim last Path.sep
      relativeDepsOutSideDir: Array.from(this.relativeDepsOutSideDir.values()),
      cyclic: this.cyclic,
      canNotResolve: this.canNotResolve,
      externalDeps: Array.from(this.externalDeps.values())
    };
  }
}

export function dfsTraverseFiles(files: string[]): ReturnType<Context['toPlainObject']> {
  const commonParentDir = closestCommonParentDir(files);
  const context = new Context(commonParentDir);

  const dfs: DFS<string> = new DFS<string>(vertex => {
    const q = new Query(fs.readFileSync(vertex.data, 'utf8'), vertex.data);
    return parseFile(q, vertex.data, context).map(file => {
      return dfs.vertexOf(file);
    });
  });

  dfs.visit(files.map(file => dfs.vertexOf(file)));
  const cwd = process.cwd();
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

function parseFile(q: Query, file: string, ctx: Context) {
  const deps: string[] = [];
  // tslint:disable-next-line: no-console
  console.log('[cli-analysie-worker] Lookup file', Path.relative(process.cwd(), file));
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
        const dep = resolve(((ast.parent as ts.CallExpression).arguments[0] as ts.StringLiteral).getText(), file,
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
          const dep = resolve((node.arguments[0] as ts.StringLiteral).getText(), file, ctx, ast.getStart(), q.src);
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
  path = path.slice(1, -1);

  if (path.startsWith('.')) {
    const ext = Path.extname(path);
    if (ext === '' || /^\.[jt]sx?$/.test(ext)) {
      let resolved = ts.resolveModuleName(path, file, co, host, resCache).resolvedModule;
      if (resolved == null) {
        // tslint:disable-next-line: max-line-length
        for (const tryPath of [path + '/index', path + '.js', path + '.jsx', path + '/index.js', path + '/index.jsx']) {
          resolved = ts.resolveModuleName(tryPath, file, co, host, resCache).resolvedModule;
          if (resolved != null)
            return Path.resolve(resolved.resolvedFileName);
        }
        const lineInfo = ts.getLineAndCharacterOfPosition(src, pos);
        ctx.canNotResolve.push({
          target: path,
          file,
          pos: `line:${lineInfo.line + 1}, col:${lineInfo.character + 1}`,
          reasone: 'Typescript failed to resolve'
        });
        return null;
      } else {
        const absPath = Path.resolve(resolved.resolvedFileName);
        if (!absPath.startsWith(ctx.commonDir)) {
          ctx.relativeDepsOutSideDir.add(Path.relative(process.cwd(), absPath));
        }
        return absPath;
      }
    } else {
      // skip unknown extension path
    }
  } else {
    ctx.externalDeps.add(/^((?:@[^/]+\/)?[^/]+)/.exec(path)![1]);
  }
}


