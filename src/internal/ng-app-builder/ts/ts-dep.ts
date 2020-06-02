import Query from './utils/ts-ast-query';
import fs from 'fs';
import ts, {Extension} from 'typescript';
import Path from 'path';
import {EOL as eol} from 'os';
import { createWriteStream } from 'fs-extra';
const cwd = process.cwd();
// import api from '__api';
// const log = require('log4js').getLogger(api.packageName + '.ts-deps');

export default class TsDependencyGraph {
  requestMap = new Map<string, string[]>(); // key is file that requested, value is who requests
  /**
   * Angular style lazy route loading grammar 
   */
  loadChildren = new Set<string>();
  /** files as which TS compiler considers from node_modules
   * TS compiler will not compile them if they are not explicitly
   * involved in tsconfig
    */
  externals = new Set<string>();
  toWalk: string[] = [];

  private resCache: ts.ModuleResolutionCache;
  private host: ts.CompilerHost;
  private replacements = new Map<string, string>();

  constructor(private co: ts.CompilerOptions,
    fileReplacements: {replace?: string, src?: string,  with?: string, replaceWidth?: string}[] = [],
    private readFile?: (file: string) => string) {

    fileReplacements.forEach(pair => {
      this.replacements.set(
        Path.resolve(pair.replace || pair.src!).replace(/\\/g, '/'),
        Path.resolve(pair.with || pair.replaceWidth!).replace(/\\/g, '/'));
    });

    this.resCache = ts.createModuleResolutionCache(process.cwd(),
      fileName => fileName,
      co);
    this.host = ts.createCompilerHost(co);

    if (!readFile) {
      this.readFile = file => {
        return fs.readFileSync(file, 'utf8');
      };
    }
  }

  /**
   * @param file must be absolute path
   */
  walkForDependencies(file: string): void {
    this.toWalk.push(file);
    this._walk();
  }

  report(logFile: string) {

    const g = this;
    // const logFile = api.config.resolve('destDir', 'ng-app-builder.report', 'ts-deps.txt');

    const reportOut = createWriteStream(logFile);
    reportOut.write(new Date().toLocaleString());
    reportOut.write(eol);
    // TODO: optimize - use a _.sortedIndex to make a sorted map, or use a separate worker process
    const sortedEntries = Array.from(g.requestMap.entries()).sort((entry1, entry2) => entry1[0] > entry2[0] ? 1 : -1);
    let i = 0;
    for (const [dep, by] of sortedEntries) {
      const pad = 4 - (i + '').length;
      reportOut.write(' '.repeat(pad));
      reportOut.write(i++ + '. ');
      reportOut.write(Path.relative(cwd, dep));
      reportOut.write(eol);
      for (const singleBy of by) {
        reportOut.write('        - ' + Path.relative(cwd, singleBy));
        reportOut.write(eol);
      }
    }

    return new Promise(resolve => reportOut.end(resolve));

  }

  /**
   * 
   * @param requestDep 
   * @param by 
   * @returns true if it is requested at first time
   */
  private checkResolved(requestDep: string, by: string, isExternal: boolean): boolean {
    const byList = this.requestMap.get(requestDep);
    if (byList) {
      byList.push(by);
      return false;
    } else {
      this.requestMap.set(requestDep, [by]);
      if (isExternal)
        this.externals.add(requestDep);
      return true;
    }
  }

  private _walk() {
    const resolve = (path: string, file: string, cb?: (resolvedFile: string) => void) => {
      const resolved = ts.resolveModuleName(path, file, this.co, this.host, this.resCache).resolvedModule;
      if (resolved) {
        const dep = resolved.resolvedFileName;
        if (resolved.extension === Extension.Ts || resolved.extension === Extension.Tsx /*dep.endsWith('.ts') && !dep.endsWith('.d.ts')*/) {
          if (this.checkResolved(dep, file, !!resolved.isExternalLibraryImport)) {
          // log.debug('dep: ' + Path.relative(rootPath, dep) + ',\n  from ' + Path.relative(rootPath, file));
            this.toWalk.push(dep);
            if (cb) {
              cb(dep);
            }
          }
        }
      } else {
        // this.unresolved.push({module: path, srcFile: file});
        // TODO: log unresolved
      }
    };

    while (this.toWalk.length > 0) {
      const file = this.toWalk.shift()!;

      const replaced = this.replacements.get(file);
      const q = new Query(this.readFile!(replaced || file), file);

      const self = this;

      q.walkAst(q.src, [
        {
          query: '.moduleSpecifier:StringLiteral', // Both :ExportDeclaration or :ImportDeclaration
          callback(ast) {
            resolve((ast as ts.StringLiteral).text, file);
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
                  resolve(lazyModule.slice(0, hashTag), file, resolved => {
                    self.loadChildren.add(resolved);
                  });
                }
              }
            }
          }
        },
        {
          query: ':CallExpression>.expression:ImportKeyword',
          callback(ast, path) {
            resolve(((ast.parent as ts.CallExpression).arguments[0] as ts.StringLiteral).text, file);
          }
        }
      ]);
    }
  }

}
