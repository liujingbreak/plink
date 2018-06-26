"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const typescript_1 = require("typescript");
const patch_text_1 = require("./patch-text");
const lodash_1 = require("lodash");
const __api_1 = require("__api");
const vm = require("vm");
const log = require('log4js').getLogger(__api_1.default.packageName + '.api-aot-compiler');
class ApiAotCompiler {
    constructor(file, src) {
        this.file = file;
        this.src = src;
        this.replacements = [];
        this.ast = ts.createSourceFile(file, src, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
    }
    static idText(node) {
        return node.text;
    }
    parse() {
        for (let stm of this.ast.statements) {
            this.traverseTsAst(stm);
        }
        let pk = __api_1.default.findPackageByFile(this.file);
        if (this.replacements.length > 0)
            log.info('Compile API call in ', this.file);
        let context = vm.createContext({ __api: pk.api });
        for (let repl of this.replacements) {
            let origText = repl.text;
            let res = vm.runInNewContext(origText, context);
            repl.text = JSON.stringify(res);
            log.info(`Evaluate "${origText}" to: ${res}`);
        }
        log.debug(this.replacements);
        return patch_text_1.default(this.src, this.replacements);
    }
    getApiForFile(file) {
        __api_1.default.findPackageByFile(file);
    }
    traverseTsAst(ast, level = 0) {
        if (ast.kind === typescript_1.SyntaxKind.PropertyAccessExpression || ast.kind === typescript_1.SyntaxKind.ElementAccessExpression) {
            let node = ast;
            if (node.expression.kind === typescript_1.SyntaxKind.Identifier && ApiAotCompiler.idText(node.expression) === '__api') {
                if (node.parent.kind === typescript_1.SyntaxKind.CallExpression && node.parent.expression === node) {
                    // It is a function call __api.xxx()
                    this.replacements.push({ start: node.parent.pos, end: node.parent.end,
                        text: this.nodeText(node.parent) });
                }
                else {
                    this.replacements.push({ start: node.pos, end: node.end, text: this.nodeText(node) });
                }
            }
        }
        ast.forEachChild((sub) => {
            this.traverseTsAst(sub, level + 1);
        });
    }
    nodeText(ast) {
        return lodash_1.trim(this.src.substring(ast.pos, ast.end));
    }
}
exports.default = ApiAotCompiler;

//# sourceMappingURL=api-aot.js.map
