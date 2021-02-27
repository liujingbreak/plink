import Selector, {typescript as ts} from '@wfh/plink/wfh/dist/utils/ts-ast-query';
import fs from 'fs';
// import chalk from 'chalk';
// import Path from 'path';
import {logger, initAsChildProcess} from '@wfh/plink';
import {StringInfo, Translatables} from './cli-scan-tran';
// enforce default log4js configuration
import '@wfh/plink/wfh/dist/config';
const log = logger.getLogger('@wfh/translate-generator');

initAsChildProcess();
// initConfig({config: [], prop: []});
const kinds = ts.SyntaxKind;
const EXCLUDE_SYNTAX = [kinds.ImportDeclaration, kinds.LiteralType, kinds.UnionType];
const INCLUDE_SYNTAX = [kinds.StringLiteral,
  kinds.FirstTemplateToken,
  kinds.TemplateExpression,
  kinds.JsxElement,
  kinds.LastTemplateToken
];

export function scanFile(file: string, trans: Translatables[] | undefined): StringInfo[] {
  const sel = new Selector(fs.readFileSync(file, 'utf8'), file);
  
  const info: StringInfo[] = [];
  const transMap = new Map<string, Translatables>();
  if (trans) {
    for (const item of trans) {
      transMap.set(item.default, item);
    }
  }

  sel.some(null, null, (ast, path, parents, isLeaf, comment) => {
    if (EXCLUDE_SYNTAX.includes(ast.kind))
      return 'SKIP';
    if (INCLUDE_SYNTAX.includes(ast.kind)) {
      const lineCol = ts.getLineAndCharacterOfPosition(sel.src, ast.getStart());
      const scannedInfoItem: StringInfo = [
        ast.getStart(), ast.getEnd(), ast.getText(), lineCol.line + 1, lineCol.character + 1,
        kinds[ast.kind]
      ];
      info.push(scannedInfoItem);
      if (log.isDebugEnabled())
        log.debug(`${file} (${lineCol.line + 1}:${lineCol.character + 1}):`, ast.getText());
      const originTrans = transMap.get(ast.getText());
      if (originTrans != null && originTrans.text != null) {
        scannedInfoItem[2] = originTrans.text;
      }
      return 'SKIP';
    }
  });
  // console.log(file + `: ${chalk.green(info.length)} found.`);
  // log.info(file + `: ${chalk.green(info.length)} found.`);

  return info;
}
