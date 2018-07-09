"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const typescript_1 = require("typescript");
const patch_text_1 = require("./patch-text");
const lodash_1 = require("lodash");
const __api_1 = require("__api");
const vm = require("vm");
const default_import_ts_transpiler_1 = require("./default-import-ts-transpiler");
const chalk = require('chalk');
// import chalk from 'chalk';
const log = require('log4js').getLogger(__api_1.default.packageName + '.api-aot-compiler');
class ApiAotCompiler {
    constructor(file, src) {
        this.file = file;
        this.src = src;
        this.replacements = [];
        if (__api_1.default.ssr) {
            this.importTranspiler = new default_import_ts_transpiler_1.default({
                file: this.file,
                modules: [/^lodash(?:\/|$)/]
            });
        }
    }
    static idText(node) {
        return node.text;
    }
    parse(transpileExp) {
        const pk = __api_1.default.findPackageByFile(this.file);
        if (pk == null)
            return this.src;
        this.ast = ts.createSourceFile(this.file, this.src, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
        for (const stm of this.ast.statements) {
            this.traverseTsAst(stm);
        }
        const context = vm.createContext({ __api: __api_1.default.getNodeApiForPackage(pk) });
        for (const repl of this.replacements) {
            const origText = repl.text;
            let res;
            try {
                res = vm.runInNewContext(transpileExp(origText), context);
                repl.text = JSON.stringify(res);
                // To bypass TS error "Unreachable code detected" if
                // compiler option "allowUnreachableCode: false"
                // e.g. if (false) {...} --> if (!!false) {...}
                if (repl.text === 'true' || repl.text === 'false')
                    repl.text = '!!' + repl.text;
            }
            catch (ex) {
                log.warn('Evaluate %s, result:', origText, res);
                throw ex;
            }
            log.info(`Evaluate "${chalk.yellow(origText)}" to: ${chalk.cyan(repl.text)}`);
        }
        if (this.importTranspiler)
            this.importTranspiler.parse(this.ast, this.replacements);
        if (this.replacements.length === 0)
            return this.src;
        log.debug(this.replacements);
        return patch_text_1.default(this.src, this.replacements);
    }
    getApiForFile(file) {
        __api_1.default.findPackageByFile(file);
    }
    traverseTsAst(ast, level = 0) {
        if (ast.kind === typescript_1.SyntaxKind.PropertyAccessExpression || ast.kind === typescript_1.SyntaxKind.ElementAccessExpression) {
            const node = ast;
            if (node.expression.kind === typescript_1.SyntaxKind.Identifier && ApiAotCompiler.idText(node.expression) === '__api') {
                // keep looking up for parents until it is not CallExpression, ElementAccessExpression or PropertyAccessExpression
                let evaluateNode = this.goUpToParentExpress(node);
                this.replacements.push({ start: evaluateNode.pos, end: evaluateNode.end, text: this.nodeText(evaluateNode) });
            }
        }
        ast.forEachChild((sub) => {
            this.traverseTsAst(sub, level + 1);
        });
    }
    /**
     * keep looking up for parents until it is not CallExpression, ElementAccessExpression or PropertyAccessExpression
     */
    goUpToParentExpress(currNode) {
        while (true) {
            let kind = currNode.parent.kind;
            if (kind === typescript_1.SyntaxKind.CallExpression && currNode.parent.expression === currNode ||
                kind === typescript_1.SyntaxKind.PropertyAccessExpression && currNode.parent.expression === currNode ||
                kind === typescript_1.SyntaxKind.ElementAccessExpression && currNode.parent.expression === currNode) {
                currNode = currNode.parent;
            }
            else {
                break;
            }
        }
        return currNode;
    }
    nodeText(ast) {
        return lodash_1.trim(this.src.substring(ast.pos, ast.end));
    }
}
exports.default = ApiAotCompiler;

//# sourceMappingURL=ts-before-aot.js.map
