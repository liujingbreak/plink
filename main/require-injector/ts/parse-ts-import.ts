// tslint:disable:max-line-length
import * as _ts from 'typescript';
import * as fs from 'fs';
import * as Path from 'path';
import * as _ from 'lodash';
import {ParseInfo} from './parse-esnext-import';
import {FactoryMap, ReplaceType, ReplacedResult} from './factory-map';
import patchText from './patch-text';
import ReplaceRequire from './replace-require';

export function parseTs(file: string) {
  // let source = fs.readFileSync(Path.resolve(__dirname, '../../ts/spec/test-ts.txt'), 'utf8');
  let source = fs.readFileSync(Path.resolve(file), 'utf8');
  let sFile = _ts.createSourceFile('test-ts.ts', source,
    _ts.ScriptTarget.ES2015);
  traverse(sFile);
  function traverse(ast: _ts.Node, level = 0) {
    // tslint:disable-next-line:no-console
    console.log(_.repeat(' |- ', level) + _ts.SyntaxKind[ast.kind]);
    if (ast.kind === _ts.SyntaxKind.ImportDeclaration) {
      // tslint:disable-next-line:no-console
      console.log('found import statement', ast.getText(sFile));
    }
    // let count = 0;
    ast.forEachChild((sub: _ts.Node) => {
      traverse(sub, level + 1);
      // count++;
    });
    // if (count === 0) {
    // tslint:disable-next-line:no-console
    console.log(_.repeat(' |- ', level + 1), `"${ast.getText(sFile)}"`);
    // }
  }
}

export class TypescriptParser {
  srcfile: _ts.SourceFile;

  private _addPatch: (start: number, end: number, moduleName: string, replaceType: ReplaceType) => void;
  private _addPatch4Import: (allStart: number, allEnd: number, start: number, end: number,
    moduleName: string, info: ParseInfo) => void;

  constructor(public esReplacer: ReplaceRequire | null = null, public ts = _ts) {}

  replace(code: string, factoryMaps: FactoryMap[] | FactoryMap, filePath: string, ast?: _ts.SourceFile):
    {replaced: string | null, patches: Array<{start: number, end: number, replacement: string}>} {

    let patches: Array<{start: number, end: number, replacement: string}> = [];
    let self = this;
    const _factoryMaps = ([] as FactoryMap[]).concat(factoryMaps);
    this._addPatch = function(this: TypescriptParser, start: number, end: number, moduleName: string, replaceType: ReplaceType) {
      if (! this.esReplacer)
        return;
      this.esReplacer.addPatch(patches, start, end, moduleName, replaceType, _factoryMaps, filePath);
    };
    this._addPatch4Import = function(allStart: number, allEnd: number, start: number, end: number,
      moduleName: string, info: ParseInfo) {
        _factoryMaps.some((factoryMap: FactoryMap) => {
        var setting = factoryMap.matchRequire(info.from);
        if (setting) {
          var replacement = factoryMap.getReplacement(setting, ReplaceType.imp, filePath, info) as ReplacedResult;
          if (replacement != null) {
            patches.push({
              start: replacement.replaceAll ? allStart : start,
              end: replacement.replaceAll ? allEnd : end,
              replacement: replacement.code
            });
            if (self.esReplacer)
              self.esReplacer.emit('replace', info.from, replacement.code);
          }
          return true;
        }
        return false;
      });
    };

    this.parseTsSource(code, filePath, ast);
    return {
      replaced: patches.length > 0 ? patchText(code, patches) : null,
      patches
    };
  }

  parseTsSource(source: string, file: string, ast?: _ts.SourceFile): void {
    this.srcfile = ast || this.ts.createSourceFile(file, source, this.ts.ScriptTarget.ESNext,
      true, this.ts.ScriptKind.TSX);
    const asts: _ts.Node[] = [...this.srcfile.statements];
    let node = asts.shift();
    while (node != null) {
      this.traverseTsAst(node, this.srcfile, asts);
      node = asts.shift();
    }
  }

  private traverseTsAst(ast: _ts.Node, srcfile: _ts.SourceFile, visitLater: _ts.Node[]) {
    let SyntaxKind = this.ts.SyntaxKind;
    if (ast.kind === SyntaxKind.ImportDeclaration || ast.kind === SyntaxKind.ExportDeclaration) {
      let node = ast as _ts.ImportDeclaration;
      // console.log('found import statement:', ast.getText(srcfile));
      let parseInfo = new ParseInfo();
      if (!node.moduleSpecifier && ast.kind === SyntaxKind.ExportDeclaration) {
        return;
      }
      parseInfo.from = (node.moduleSpecifier as _ts.StringLiteral).text;

      // parseInfo.from = /^[ '"]*([^'"]+)[ '"]*$/.exec(srcfile.text.substring(node.moduleSpecifier.getStart(this.srcfile, false), node.moduleSpecifier.getEnd()))[1];
      if (_.get(node, 'importClause.name')) {
        parseInfo.defaultVar = node.importClause!.name!.text;
      }
      if (_.get(node, 'importClause.namedBindings')) {
        let nb = node.importClause!.namedBindings!;
        if (nb.kind === SyntaxKind.NamespaceImport) {
          parseInfo.namespaceVar = nb.name.text;
        } else {
          nb.elements.forEach(element => {
            parseInfo.vars[element.name.text] = element.propertyName ? element.propertyName.text : element.name.text;
          });
        }
      }
      this._addPatch4Import(node.getStart(this.srcfile, false), node.getEnd(), node.moduleSpecifier.getStart(this.srcfile, false),
        node.moduleSpecifier.getEnd(), parseInfo.from, parseInfo);
      // console.log(getTextOf(node.moduleSpecifier, srcfile));
      return;
    } else if (ast.kind === SyntaxKind.CallExpression) {
      let node = ast as _ts.CallExpression;
      if (node.expression.kind === SyntaxKind.Identifier &&
        (node.expression as _ts.Identifier).text === 'require' &&
        node.arguments[0].kind === SyntaxKind.StringLiteral) {
        // console.log('Found', getTextOf(node, srcfile));
        this._addPatch(node.getStart(this.srcfile, false), node.getEnd(), (node.arguments[0] as _ts.StringLiteral).text, ReplaceType.rq);
        return;
      } else if (node.expression.kind === SyntaxKind.ImportKeyword) {
        // console.log('Found import() ', node.arguments.map(arg => (arg as any).text));
        this._addPatch(node.getStart(this.srcfile, false), node.getEnd(), (node.arguments[0] as _ts.StringLiteral).text, ReplaceType.ima);
        return;
      } else if (node.expression.kind === SyntaxKind.PropertyAccessExpression) {
        let left = (node.expression as _ts.PropertyAccessExpression).expression;
        let right = (node.expression as _ts.PropertyAccessExpression).name;
        if (left.kind === SyntaxKind.Identifier && (left as _ts.Identifier).text === 'require' &&
        right.kind === SyntaxKind.Identifier && (right as _ts.Identifier).text === 'ensure') {
          node.arguments.forEach((arg) => {
            if (arg.kind === SyntaxKind.StringLiteral) {
              this._addPatch(arg.getStart(this.srcfile, false), arg.getEnd(), (arg as _ts.StringLiteral).text, ReplaceType.rs);
              // console.log(`replace require.ensure(${(arg as ts.StringLiteral).text})`);
            } else if (arg.kind === SyntaxKind.ArrayLiteralExpression) {
              const arrArg = arg as _ts.ArrayLiteralExpression;
              for (const moduleNameAst of arrArg.elements) {
                if (moduleNameAst.kind !== SyntaxKind.StringLiteral) {
                  // tslint:disable-next-line:no-console
                  console.log('[require-injector] parse %s failed, only support arguments of `require.ensure()` as StringLiteral', this.srcfile.fileName);
                  continue;
                }
                this._addPatch(moduleNameAst.getStart(this.srcfile, false),
                  moduleNameAst.getEnd(), (moduleNameAst as _ts.StringLiteral).text, ReplaceType.rs);
              }
            }
          });
          // console.log('Found require.ensure()', node.arguments.map(arg => (arg as any).text));
        }
      }
    }
    visitLater.push(...ast.getChildren());
  }
}
