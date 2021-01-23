import 'source-map-support/register';

import Query from '../utils/ts-ast-query';
import fs from 'fs';
import ts from 'typescript';
import Path from 'path';
// import {EOL as eol} from 'os';
import {DFS, Vertex} from '../utils/graph';
import {jsonToCompilerOptions} from '../ts-compiler';
import {setTsCompilerOptForNodePath} from '../config-handler';
import {initProcess} from '../utils/bootstrap-process';


const baseTsconfigFile = Path.resolve(__dirname, '../../tsconfig-tsx.json');
const tsxTsconfig = ts.parseConfigFileTextToJson(baseTsconfigFile, fs.readFileSync(baseTsconfigFile, 'utf8'));
tsxTsconfig.config.compilerOptions.allowJs = true;
const co = jsonToCompilerOptions(tsxTsconfig.config.compilerOptions);
initProcess();

setTsCompilerOptForNodePath(process.cwd(), './', co);
const resCache = ts.createModuleResolutionCache(process.cwd(),
      fileName => fileName,
      co);
const host = ts.createCompilerHost(co);


export function dfsTraverseFiles(files: string[]) {

  const externalDeps = new Set<string>();
  const dfs: DFS<string> = new DFS<string>(vertex => {
    const q = new Query(fs.readFileSync(vertex.data, 'utf8'), vertex.data);
    return parseFile(q, vertex.data, externalDeps).map(file => {
      return dfs.vertexOf(file);
    });
  });
  // tslint:disable-next-line: no-console
  console.log('[cli-analysie-worker] visit', files);
  dfs.visit(files.map(file => new Vertex(file)));
  if (dfs.backEdges.length > 0) {
    for (const edges of dfs.backEdges) {
      // tslint:disable-next-line: no-console
      console.log(`Found cyclic file dependency ${dfs.printCyclicBackEdge(edges[0], edges[1])}`);
    }
  }
  return Array.from(externalDeps.values());
}

function parseFile(q: Query, file: string, externalDeps: Set<string>) {
  const deps: string[] = [];
  // tslint:disable-next-line: no-console
  console.log('[cli-analysie-worker] Lookup file', file);
  q.walkAst(q.src, [
    {
      query: '.moduleSpecifier:StringLiteral', // Both :ExportDeclaration or :ImportDeclaration
      callback(ast) {
        const dep = resolve((ast as ts.StringLiteral).getText(), file);
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
              const dep = resolve(lazyModule.slice(0, hashTag), file);
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
        const dep = resolve(((ast.parent as ts.CallExpression).arguments[0] as ts.StringLiteral).getText(), file);
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
          const dep = resolve((node.arguments[0] as ts.StringLiteral).getText(), file);
          if (dep)
            deps.push(dep);
        }
      }
    }
  ]);

  // q.printAll();

  function resolve(path: string, file: string) {
    if (path.startsWith('`')) {
      // tslint:disable-next-line: no-console
      console.log(`[cli-analysie-worker] can not resolve dynamic value ${path} in ${file}`);
      return null;
    }
    path = path.slice(1, -1);
    // console.log('[cli-analysie-worker] resolve', path);

    if (path.startsWith('.')) {
      const ext = Path.extname(path);
      if (ext === '' || /^\.[jt]sx?$/.test(ext)) {
        let resolved = ts.resolveModuleName(path, file, co, host, resCache).resolvedModule;
        if (resolved == null) {
          // tslint:disable-next-line: max-line-length
          for (const tryPath of [path + '/index', path + '.js', path + '.jsx', path + '/index.js', path + '/index.jsx']) {
            resolved = ts.resolveModuleName(tryPath, file, co, host, resCache).resolvedModule;
            if (resolved != null)
              return resolved.resolvedFileName;
          }
          // tslint:disable-next-line: no-console
          console.log(`[cli-analysie-worker] can not resolve ${path} in ${file}`);
          return null;
        }
        return resolved.resolvedFileName;
      }
    } else {
      externalDeps.add(/^((?:@[^/]+\/)?[^/]+)/.exec(path)![1]);
    }
  }
  // console.log('deps:', deps);
  return deps;
}


