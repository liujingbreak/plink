// import * as wp from 'webpack';
import * as Path from 'path';
import vm from 'vm';
import * as ts from 'typescript';
import {SyntaxKind as sk, CompilerOptions} from 'typescript';
import ImportClauseTranspile from './default-import-ts-transpiler';
import api from '__api';
import BrowserPackage from '@wfh/plink/wfh/dist/package-mgr/package-instance';
import {ReplacementInf} from '@wfh/plink/wfh/dist/utils/patch-text';
import * as textPatcher from '@wfh/plink/wfh/dist/utils/patch-text';
import { readTsConfig, transpileSingleTs } from '@wfh/plink/wfh/dist/ts-compiler';
import log4js from 'log4js';
const log = log4js.getLogger(api.packageName + '.tsjs-replacement');
import chalk from 'chalk';
import {has} from 'lodash';

export {ReplacementInf};
export type TsHandler = (ast: ts.SourceFile) => ReplacementInf[];
export default class TsPreCompiler {
  tsCo: CompilerOptions;


  importTranspiler: ImportClauseTranspile;

  constructor(tsConfigFile: string, isServerSide: boolean,
    private findPackageByFile: (file: string) => BrowserPackage | null | undefined) {
    this.tsCo = readTsConfig(tsConfigFile);
    if (isServerSide) {
      this.importTranspiler = new ImportClauseTranspile({
        modules: [/^lodash(?:\/|$)/]
      });
    }
  }

  /**
   * replaceContext can put any Javascript object which contains properties or memember functions
   * @param file 
   * @param source 
   * @param replaceContext 
   * @param compiledSource 
   * @param astPositionConvert 
   */
  parse(file: string, source: string, replaceContext: {[key: string]: any}, compiledSource?: ts.SourceFile,
    astPositionConvert?: (pos: number) => number): string {
    const pk = this.findPackageByFile(file);
    if (pk == null)
      return source;

    const ast = compiledSource || ts.createSourceFile(file, source, ts.ScriptTarget.ESNext,
      true, ts.ScriptKind.TSX);
    // this._callTsHandlers(tsHandlers);

    const replacements: ReplacementInf[] = [];
    for(const stm of ast.statements) {
      this.traverseTsAst(stm, replaceContext, replacements, astPositionConvert);
    }
    textPatcher._sortAndRemoveOverlap(replacements, true, source);
    // Remove overlaped replacements to avoid them getting into later `vm.runInNewContext()`,
    // We don't want to single out and evaluate lower level expression like `__api.packageName` from
    // `__api.config.get(__api.packageName)`, we just evaluate the whole latter expression


    const context = vm.createContext(replaceContext);

    for (const repl of replacements) {
      const origText = repl.text!;
      let res;
      try {
        res = vm.runInNewContext(transpileSingleTs(origText, this.tsCo), context);
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
        Path.relative(process.cwd(), file));
    }

    if (this.importTranspiler)
      this.importTranspiler.parse(ast, replacements);

    if (replacements.length === 0)
      return source;
    textPatcher._sortAndRemoveOverlap(replacements, true, source);
    return textPatcher._replaceSorted(source, replacements);
  }

  // getApiForFile(file: string) {
  //   api.findPackageByFile(file);
  // }

  protected traverseTsAst(ast: ts.Node,
    replaceContext: {[key: string]: any},
    replacements: ReplacementInf[],
    astPositionConvert?: (pos: number) => number,
    level = 0
    ) {
    try {
      if (ast.kind === sk.PropertyAccessExpression || ast.kind === sk.ElementAccessExpression) {
        const node = ast as (ts.PropertyAccessExpression | ts.ElementAccessExpression);
        if (node.expression.kind === sk.Identifier && has(replaceContext, node.expression.getText())) {
          // keep looking up for parents until it is not CallExpression, ElementAccessExpression or PropertyAccessExpression
          const evaluateNode = this.goUpToParentExp(node);
          let start = evaluateNode.getStart();
          let end = evaluateNode.getEnd();
          const len = end - start;
          if (astPositionConvert) {
            start = astPositionConvert(start);
            end = start + len;
          }
          replacements.push({start, end, text: evaluateNode.getText()});
          return replacements;
        }
      }
    } catch (e) {
      log.error('traverseTsAst failure', e);
      throw e;
    }
    ast.forEachChild((sub: ts.Node) => {
      this.traverseTsAst(sub, replaceContext, replacements, astPositionConvert, level + 1);
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
