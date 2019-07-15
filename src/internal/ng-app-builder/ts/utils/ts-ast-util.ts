// tslint:disable max-line-length
import * as ts from 'typescript';
import Selector from './ts-ast-query';
import * as Path from 'path';
// import {readTsConfig} from 'dr-comp-package/wfh/dist/ts-compiler';

export function resolveImportBindName(src: ts.SourceFile, modulePath: string, propertyName: string,
  resolveFn?: (targetPath: string, currFile: string) => string): string {

  let resolvedModulePath: string;
  const selector = new Selector(src);
  if (resolveFn) {
    resolvedModulePath = resolveFn(modulePath, src.fileName);
  } else {
    resolvedModulePath = defaultResolveModule(modulePath, src.fileName);
  }
  const importDecAsts: ts.ImportDeclaration[] = [];
  selector.findAll(':ImportDeclaration > .moduleSpecifier')
  .forEach((moduleSpecifier: ts.StringLiteral) => {
    const text = moduleSpecifier.getText(src).slice(1, -1);
    let resolved: string;
    if (resolveFn) {
      resolved = resolveFn(text, src.fileName);
    } else {
      resolved = defaultResolveModule(text, src.fileName);
    }
    if (resolved && resolved === resolvedModulePath) {
      importDecAsts.push(moduleSpecifier.parent as ts.ImportDeclaration);
    }
  });

  if (!importDecAsts || importDecAsts.length === 0)
    return null;
  let refName: string;
  for (const importDecAst of importDecAsts) {
    refName = selector.findWith(importDecAst, '.importClause > .namedBindings > .elements', (ast: ts.ImportSpecifier) => {
      if (ast.propertyName) {
        if (ast.propertyName.getText() === propertyName)
          return ast.name.getText();
      } else if (ast.name && ast.name.getText() === propertyName) {
        return ast.name.getText();
      }
    });
    if (refName)
      break;
    refName = selector.findWith(importDecAst, '.importClause > .namedBindings:NamespaceImport > .name:Identifier',
      (ast: ts.Identifier) => {
        return ast.getText() + '.' + propertyName;
      });
    if (refName)
      break;
  }
  return refName;
}

/**
 * This function does not intent to be fully conform to real TS or JS module resolve logic
 * @param targetPath 
 * @param currFile 
 */
export function defaultResolveModule(targetPath: string, currFile: string): string {
  if (/^\.\.?\//.test(targetPath)) {
    const absPath = Path.resolve(Path.dirname(currFile), targetPath).replace(/\\/g, '/');
    return absPath;
  } else {
    return Path.resolve(process.cwd(), 'node_modules', targetPath).replace(/\\/g, '/');
  }
}
