"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_1 = require("typescript");
/**
 * Angular builder has a problem in compile server sider rendering appliaction
 * it uses Webpack to pack TS files, but it does not respect tsconfig.json compiler option:
 *  "allowSyntheticDefaultImports",
 * it can not resolve `import get from 'lodash/get';` like import clause.
 * This module helps to replace `lodash` import statement with `require` statement.
 */
const _ = __importStar(require("lodash"));
const __api_1 = __importDefault(require("__api"));
const log4js_1 = __importDefault(require("log4js"));
const log = log4js_1.default.getLogger(__api_1.default.packageName + '.transpiler');
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
