import Selector, {typescript as ts} from '@wfh/plink/wfh/dist/utils/ts-ast-query';
import fs from 'fs';
import fsext from 'fs-extra';
// import chalk from 'chalk';
import Path from 'path';
import {logger, initAsChildProcess} from '@wfh/plink';
import {StringInfo, Translatable} from './cli-scan-tran';
import yamljs from 'yamljs';
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

export function scanFile(file: string, metaDataFile: string): StringInfo[] {
  const sel = new Selector(fs.readFileSync(file, 'utf8'), file);
  const info: StringInfo[] = [];
  const oldTransMap = new Map<string, Translatable>();
  if (fs.existsSync(metaDataFile)) {
    const {data: translatbles} = yamljs.load(metaDataFile) as {target: string, data: Translatable[]};
    for (const item of translatbles) {
      oldTransMap.set(item.key, item);
    }
  }

  const newTranslatebles: Translatable[] = [];
  sel.some(null, null, (ast, path, parents, isLeaf, comment) => {
    if (EXCLUDE_SYNTAX.includes(ast.kind))
      return 'SKIP';
    if (INCLUDE_SYNTAX.includes(ast.kind)) {
      if (ts.isCallExpression(ast.parent) &&
      ((ast.parent as ts.CallExpression).expression.getText() === 'require' || (ast.parent as ts.CallExpression).expression.kind === ts.SyntaxKind.ImportKeyword) &&
      (ast.parent as ts.CallExpression).arguments[0] === ast) {
        return 'SKIP';
      }
      const lineCol = ts.getLineAndCharacterOfPosition(sel.src, ast.getStart());
      const scannedInfoItem: Translatable = {
        key: ast.getText(),
        text: null,
        start: ast.getStart(),
        end: ast.getEnd(),
        desc: `${kinds[ast.kind]} line:${lineCol.line + 1}, col:${lineCol.character + 1}`
      };

      newTranslatebles.push(scannedInfoItem);
      if (log.isDebugEnabled())
        log.debug(`${file} (${lineCol.line + 1}:${lineCol.character + 1}):`, ast.getText());
      const originTrans = oldTransMap.get(ast.getText());
      if (originTrans != null && originTrans.text != null) {
        scannedInfoItem.text = originTrans.text;
      }
      return 'SKIP';
    }
  });
  if (newTranslatebles.length > 0) {
    fsext.mkdirpSync(Path.dirname(metaDataFile));
    fs.writeFileSync(metaDataFile, yamljs.stringify({
      target: Path.relative(Path.dirname(metaDataFile), file).replace(/\\/g, '/'),
      data: newTranslatebles
    }, 3));
  }
  // console.log(file + `: ${chalk.green(info.length)} found.`);
  log.info(metaDataFile + ' is written');

  return info;
}
