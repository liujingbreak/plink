
import * as ts from 'typescript';
import {SyntaxKind as sk} from 'typescript';
import {ReplacementInf} from './patch-text';
import * as _ from 'lodash';
import api from '__api';
const log = require('log4js').getLogger(api.packageName + '.transpiler');

export interface ImportClauseTranspileOptions {
  // defaultImport2require?: boolean;
  file: string;
  modules: Array<RegExp|string>;
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
            const defaultName = node.importClause.name.text;
            log.info(`Replace: "import ${defaultName} from ${from}" in ` + this.options.file);
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
