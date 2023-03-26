"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// import * as wp from 'webpack';
const Path = tslib_1.__importStar(require("path"));
const vm_1 = tslib_1.__importDefault(require("vm"));
const ts = tslib_1.__importStar(require("typescript"));
const typescript_1 = require("typescript");
const textPatcher = tslib_1.__importStar(require("@wfh/plink/wfh/dist/utils/patch-text"));
const ts_compiler_1 = require("@wfh/plink/wfh/dist/ts-compiler");
const plink_1 = require("@wfh/plink");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const lodash_1 = require("lodash");
const default_import_ts_transpiler_1 = tslib_1.__importDefault(require("./default-import-ts-transpiler"));
const log = (0, plink_1.log4File)(__filename);
class TsPreCompiler {
    constructor(tsConfigFile, isServerSide, findPackageByFile) {
        this.findPackageByFile = findPackageByFile;
        this.tsCo = (0, ts_compiler_1.readTsConfig)(tsConfigFile, ts);
        if (isServerSide) {
            this.importTranspiler = new default_import_ts_transpiler_1.default({
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
    parse(file, source, replaceContext, compiledSource, astPositionConvert) {
        const pk = this.findPackageByFile(file);
        if (pk == null)
            return source;
        const ast = compiledSource || ts.createSourceFile(file, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
        // this._callTsHandlers(tsHandlers);
        const replacements = [];
        for (const stm of ast.statements) {
            this.traverseTsAst(stm, replaceContext, replacements, astPositionConvert);
        }
        textPatcher._sortAndRemoveOverlap(replacements, true, source);
        // Remove overlaped replacements to avoid them getting into later `vm.runInNewContext()`,
        // We don't want to single out and evaluate lower level expression like `__api.packageName` from
        // `__api.config.get(__api.packageName)`, we just evaluate the whole latter expression
        const context = vm_1.default.createContext(replaceContext);
        for (const repl of replacements) {
            const origText = repl.text;
            let res;
            try {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                res = vm_1.default.runInNewContext((0, ts_compiler_1.transpileSingleTs)(origText, this.tsCo, ts), context);
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
            }
            catch (ex) {
                log.error('Evaluate %s, result:', origText, res);
                throw ex;
            }
            log.debug(`Evaluate "${chalk_1.default.yellow(origText)}" to: ${chalk_1.default.cyan(repl.text)} in\n\t` +
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
    traverseTsAst(ast, replaceContext, replacements, astPositionConvert, level = 0) {
        try {
            if (ast.kind === typescript_1.SyntaxKind.PropertyAccessExpression || ast.kind === typescript_1.SyntaxKind.ElementAccessExpression) {
                const node = ast;
                if (node.expression.kind === typescript_1.SyntaxKind.Identifier && (0, lodash_1.has)(replaceContext, node.expression.getText())) {
                    // keep looking up for parents until it is not CallExpression, ElementAccessExpression or PropertyAccessExpression
                    const evaluateNode = this.goUpToParentExp(node);
                    let start = evaluateNode.getStart();
                    let end = evaluateNode.getEnd();
                    const len = end - start;
                    if (astPositionConvert) {
                        start = astPositionConvert(start);
                        end = start + len;
                    }
                    replacements.push({ start, end, text: evaluateNode.getText() });
                    return replacements;
                }
            }
        }
        catch (e) {
            log.error('traverseTsAst failure', e);
            throw e;
        }
        ast.forEachChild((sub) => {
            this.traverseTsAst(sub, replaceContext, replacements, astPositionConvert, level + 1);
        });
    }
    /**
       * keep looking up for parents until it is not CallExpression, ElementAccessExpression or PropertyAccessExpression
       */
    goUpToParentExp(target) {
        let currNode = target;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const kind = currNode.parent.kind;
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
}
exports.default = TsPreCompiler;
//# sourceMappingURL=tsjs-replacement.js.map