import * as ts from 'typescript';
import {SyntaxKind as sk} from 'typescript';
import {ReplacementInf} from '@wfh/plink/wfh/dist/utils/patch-text';
/**
 * Angular builder has a problem in compile server sider rendering appliaction
 * it uses Webpack to pack TS files, but it does not respect tsconfig.json compiler option:
 *  "allowSyntheticDefaultImports",
 * it can not resolve `import get from 'lodash/get';` like import clause.
 * This module helps to replace `lodash` import statement with `require` statement.
 */
import * as _ from 'lodash';
import {log4File} from '@wfh/plink';
const log = log4File(__filename);

export interface ImportClauseTranspileOptions {
  // defaultImport2require?: boolean;
  // file: string;
  modules: Array<RegExp | string>;
}

export default class ImportClauseTranspile {
  options: ImportClauseTranspileOptions;
  moduleSet: Set<string> = new Set();
  moduleRegs: RegExp[] = [];

  constructor(opts = {} as ImportClauseTranspileOptions) {
    this.options = {
      // defaultImport2require: true,
      ...opts
    };
    if (this.options.modules) {
      this.options.modules.forEach(name => {
        if (name instanceof RegExp)
          this.moduleRegs.push(name);
        else
          this.moduleSet.add(name);
      });
    }
  }

  parse(ast: ts.SourceFile, replacements: ReplacementInf[]) {
    for(const stm of ast.statements) {
      if (stm.kind === sk.ImportDeclaration) {
        const node = stm as ts.ImportDeclaration;
        const from = (node.moduleSpecifier as ts.StringLiteral).text;
        if (this.moduleSet.has(from) || this.moduleRegs.some(reg => reg.test(from))) {
          if (_.get(node, 'importClause.name')) {
            const defaultName = node.importClause!.name!.text;
            log.info(`Replace: "import ${defaultName} from ${from}" in ` + ast.fileName);
            replacements.push({
              start: stm.getStart(ast),
              end: stm.getEnd(),
              text: `const ${defaultName} = require('${from}');`
            });
          }
        }
      }
    }
  }
}
