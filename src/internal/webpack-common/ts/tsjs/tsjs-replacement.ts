// import * as wp from 'webpack';
import * as Path from 'path';
import vm from 'vm';
import * as ts from 'typescript';
import {SyntaxKind as sk} from 'typescript';
import ImportClauseTranspile from './tsjs/default-import-ts-transpiler';
import api, {DrcpApi} from '__api';
import BrowserPackage from 'dr-comp-package/wfh/dist/build-util/ts/package-instance';
import {ReplacementInf} from 'dr-comp-package/wfh/dist/utils/patch-text';
import * as textPatcher from 'dr-comp-package/wfh/dist/utils/patch-text';
import log4js from 'log4js';
const log = log4js.getLogger(api.packageName + '.api-aot-compiler');
import chalk from 'chalk';

export {ReplacementInf};
export type TsHandler = (ast: ts.SourceFile) => ReplacementInf[];
export default class ApiAotCompiler {
  ast: ts.SourceFile;

  replacements: ReplacementInf[] = [];

  importTranspiler: ImportClauseTranspile;

  constructor(protected file: string, protected src: string, isServerSide: boolean,
    private findPackageByFile: (file: string) => BrowserPackage
    ) {
    if (isServerSide) {
      this.importTranspiler = new ImportClauseTranspile({
        file: this.file,
        modules: [/^lodash(?:\/|$)/]
      });
    }
  }

  parse(transpileExp: (source: string) => string): string {
    const pk = this.findPackageByFile(this.file);
    // console.log('parse', this.file, pk == null ? '' : 'yes');
    if (pk == null)
      return this.src;
    // if (!tsHandlers)
    //   tsHandlers = createTsHandlers();

    this.ast = ts.createSourceFile(this.file, this.src, ts.ScriptTarget.ESNext,
      true, ts.ScriptKind.TSX);
    // this._callTsHandlers(tsHandlers);

    for(const stm of this.ast.statements) {
      this.traverseTsAst(stm);
    }
    textPatcher._sortAndRemoveOverlap(this.replacements, true, this.src);
    // Remove overlaped replacements to avoid them getting into later `vm.runInNewContext()`,
    // We don't want to single out and evaluate lower level expression like `__api.packageName` from
    // `__api.config.get(__api.packageName)`, we just evaluate the whole latter expression

    const nodeApi = api.getNodeApiForPackage<DrcpApi>(pk);
    nodeApi.__dirname = Path.dirname(this.file);
    const context = vm.createContext({__api: nodeApi});

    for (const repl of this.replacements) {
      const origText = repl.text!;
      let res;
      try {
        res = vm.runInNewContext(transpileExp(origText), context);
        repl.text = JSON.stringify(res);
        // To bypass TS error "Unreachable code detected" if
        // compiler option "allowUnreachableCode: false"
        // e.g. if (false) {...} --> if (!!false) {...}
        if (repl.text === 'true' || repl.text === 'false')
          repl.text = '!!' + repl.text;
        else if (repl.text === undefined) {
          // JSON.stringify(undefined) will not return string of "undefined", but actual undefined
          repl.text = 'undefined';
        }
      } catch(ex) {
        log.error('Evaluate %s, result:', origText, res);
        throw ex;
      }
      log.info(`Evaluate "${chalk.yellow(origText)}" to: ${chalk.cyan(repl.text)} in\n\t` +
        Path.relative(process.cwd(), this.file));
    }

    if (this.importTranspiler)
      this.importTranspiler.parse(this.ast, this.replacements);

    if (this.replacements.length === 0)
      return this.src;
    textPatcher._sortAndRemoveOverlap(this.replacements, true, this.src);
    return textPatcher._replaceSorted(this.src, this.replacements);
  }

  getApiForFile(file: string) {
    api.findPackageByFile(file);
  }

  protected traverseTsAst(ast: ts.Node, level = 0) {
    if (ast.kind === sk.PropertyAccessExpression || ast.kind === sk.ElementAccessExpression) {
      const node = ast as (ts.PropertyAccessExpression | ts.ElementAccessExpression);
      if (node.expression.kind === sk.Identifier && node.expression.getText(this.ast) === '__api') {
        // keep looking up for parents until it is not CallExpression, ElementAccessExpression or PropertyAccessExpression
        const evaluateNode = this.goUpToParentExp(node);
        this.replacements.push({start: evaluateNode.getStart(this.ast),
          end: evaluateNode.getEnd(),
          text: evaluateNode.getText(this.ast)});
        return;
      }
    }
    // else if (ast.kind === sk.Identifier && ast.getText() === '__api') {
    //   this.replacements.push({start: ast.getStart(), end: ast.getEnd(), text: '"__api"'});
    // }
    ast.forEachChild((sub: ts.Node) => {
      this.traverseTsAst(sub, level + 1);
    });
  }

  /**
	 * keep looking up for parents until it is not CallExpression, ElementAccessExpression or PropertyAccessExpression
	 */
  protected goUpToParentExp(target: ts.Node): ts.Node {
    let currNode = target;
    while(true) {
      const kind = currNode.parent.kind;
      if (kind === sk.CallExpression && (currNode.parent as ts.CallExpression).expression === currNode ||
        kind === sk.PropertyAccessExpression && (currNode.parent as ts.PropertyAccessExpression).expression === currNode ||
        kind === sk.ElementAccessExpression && (currNode.parent as ts.ElementAccessExpression).expression === currNode) {
        currNode = currNode.parent;
      } else {
        break;
      }
    }
    return currNode;
  }
}
