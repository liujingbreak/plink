"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_1 = require("typescript");
const __api_1 = require("__api");
const log = require('log4js').getLogger(__api_1.default.packageName + '.default-import-ts-transpiler');
class ImportClauseTranspile {
    constructor(opts = {}) {
        this.options = Object.assign({ defaultImport2require: true }, opts);
    }
    parse(ast, replacements) {
        for (const stm of ast.statements) {
            if (stm.kind === typescript_1.SyntaxKind.ImportDeclaration) {
                const node = stm;
                const from = node.moduleSpecifier.text;
            }
        }
    }
}
exports.default = ImportClauseTranspile;

//# sourceMappingURL=default-import-ts-transpile.js.map
