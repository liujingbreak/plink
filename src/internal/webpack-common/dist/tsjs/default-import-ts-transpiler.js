"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const typescript_1 = require("typescript");
/**
 * Angular builder has a problem in compile server sider rendering appliaction
 * it uses Webpack to pack TS files, but it does not respect tsconfig.json compiler option:
 *  "allowSyntheticDefaultImports",
 * it can not resolve `import get from 'lodash/get';` like import clause.
 * This module helps to replace `lodash` import statement with `require` statement.
 */
const _ = tslib_1.__importStar(require("lodash"));
const plink_1 = require("@wfh/plink");
const log = (0, plink_1.log4File)(__filename);
class ImportClauseTranspile {
    constructor(opts = {}) {
        this.moduleSet = new Set();
        this.moduleRegs = [];
        this.options = Object.assign({}, opts);
        if (this.options.modules) {
            this.options.modules.forEach(name => {
                if (name instanceof RegExp)
                    this.moduleRegs.push(name);
                else
                    this.moduleSet.add(name);
            });
        }
    }
    parse(ast, replacements) {
        for (const stm of ast.statements) {
            if (stm.kind === typescript_1.SyntaxKind.ImportDeclaration) {
                const node = stm;
                const from = node.moduleSpecifier.text;
                if (this.moduleSet.has(from) || this.moduleRegs.some(reg => reg.test(from))) {
                    if (_.get(node, 'importClause.name')) {
                        const defaultName = node.importClause.name.text;
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
exports.default = ImportClauseTranspile;
//# sourceMappingURL=default-import-ts-transpiler.js.map