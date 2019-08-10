import Query from './utils/ts-ast-query';
import fs from 'fs';
import ts from 'typescript';
import Path from 'path';

export default class TsDependencyGraph {
  // unresolved: Array<{module: string, srcFile: string}> = [];
  walked = new Set<string>();
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

  private _walk() {
    const resolve = (path: string, file: string) => {
      const resolved = ts.resolveModuleName(path, file, this.co, this.host, this.resCache).resolvedModule;
      if (resolved) {
        const dep = resolved.resolvedFileName;
        if (dep.endsWith('.ts') && !dep.endsWith('.d.ts') && !this.walked.has(dep)) {
          this.walked.add(dep);
          this.toWalk.push(dep);
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
                  resolve(lazyModule.slice(0, hashTag), file);
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
