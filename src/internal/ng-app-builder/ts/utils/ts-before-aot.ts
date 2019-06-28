import * as ts from 'typescript';
import {SyntaxKind as sk} from 'typescript';
import replaceCode, * as textPatcher from './patch-text';
import {ReplacementInf} from './patch-text';
import api, {DrcpApi} from '__api';
import vm = require('vm');
import {dirname, relative, resolve} from 'path';
import ImportClauseTranspile from './default-import-ts-transpiler';

const chalk = require('chalk');
const log = require('log4js').getLogger(api.packageName + '.api-aot-compiler');

export {ReplacementInf};
export type TsHandler = (ast: ts.SourceFile) => ReplacementInf[];

function createTsHandlers(): Array<[string, TsHandler]> {
  const funcs: Array<[string, TsHandler]> = [];
  for (const pk of api.packageInfo.allModules) {
    if (pk.dr && pk.dr.ngTsHandler) {
      const [filePath, exportName] = pk.dr.ngTsHandler.split('#');
      const path = resolve(pk.realPackagePath, filePath);
      const func = require(path)[exportName] as TsHandler;
      funcs.push([
        path + '#' + exportName,
        func
      ]);
    }
  }
  return funcs;
}

let tsHandlers: Array<[string, TsHandler]>;

export default class ApiAotCompiler {
  ast: ts.SourceFile;

  replacements: textPatcher.ReplacementInf[] = [];

  importTranspiler: ImportClauseTranspile;

  constructor(protected file: string, protected src: string) {
    if (api.ssr) {
      this.importTranspiler = new ImportClauseTranspile({
        file: this.file,
        modules: [/^lodash(?:\/|$)/]
      });
    }
  }

  parse(transpileExp: (source: string) => string): string {
    const pk = api.findPackageByFile(this.file);
    if (pk == null)
      return this.src;
    if (!tsHandlers)
      tsHandlers = createTsHandlers();

    this.ast = ts.createSourceFile(this.file, this.src, ts.ScriptTarget.ESNext,
      true, ts.ScriptKind.TSX);
    this._callTsHandlers(tsHandlers);

    for(const stm of this.ast.statements) {
      this.traverseTsAst(stm);
    }
    textPatcher._sortAndRemoveOverlap(this.replacements, true, this.src);
    // Remove overlaped replacements to avoid them getting into later `vm.runInNewContext()`,
    // We don't want to single out and evaluate lower level expression like `__api.packageName` from
    // `__api.config.get(__api.packageName)`, we just evaluate the whole latter expression

    const nodeApi = api.getNodeApiForPackage<DrcpApi>(pk);
    nodeApi.__dirname = dirname(this.file);
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
        relative(process.cwd(), this.file));
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

  protected _callTsHandlers(tsHandlers: Array<[string, TsHandler]>): void {
    for (const [name, func] of tsHandlers) {
      const change = func(this.ast);
      if (change && change.length > 0) {
        log.info('%s is changed by %s', chalk.cyan(this.ast.fileName), chalk.blue(name));
        this.src = replaceCode(this.src, change);
        this.ast = ts.createSourceFile(this.file, this.src, ts.ScriptTarget.ESNext,
          true, ts.ScriptKind.TSX);
      }
    }
  }

  protected traverseTsAst(ast: ts.Node, level = 0) {
    if (ast.kind === sk.PropertyAccessExpression || ast.kind === sk.ElementAccessExpression) {
      const node = ast as (ts.PropertyAccessExpression | ts.ElementAccessExpression);
      if (node.expression.kind === sk.Identifier && node.expression.getText(this.ast) === '__api') {
        // keep looking up for parents until it is not CallExpression, ElementAccessExpression or PropertyAccessExpression
        const evaluateNode = this.goUpToParentExpress(node);
        this.replacements.push({start: evaluateNode.getStart(this.ast),
          end: evaluateNode.getEnd(),
          text: evaluateNode.getText(this.ast)});
        return;
      }
    }
    ast.forEachChild((sub: ts.Node) => {
      this.traverseTsAst(sub, level + 1);
    });
  }

  /**
	 * keep looking up for parents until it is not CallExpression, ElementAccessExpression or PropertyAccessExpression
	 */
  protected goUpToParentExpress(target: ts.Node): ts.Node {
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
