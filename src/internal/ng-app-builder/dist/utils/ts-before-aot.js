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
const ts = __importStar(require("typescript"));
const typescript_1 = require("typescript");
const patch_text_1 = __importStar(require("./patch-text")), textPatcher = patch_text_1;
const __api_1 = __importDefault(require("__api"));
const vm = require("vm");
const path_1 = require("path");
const default_import_ts_transpiler_1 = __importDefault(require("./default-import-ts-transpiler"));
const chalk = require('chalk');
const log = require('log4js').getLogger(__api_1.default.packageName + '.api-aot-compiler');
function createTsHandlers() {
    const funcs = [];
    for (const pk of __api_1.default.packageInfo.allModules) {
        if (pk.dr && pk.dr.ngTsHandler) {
            const [filePath, exportName] = pk.dr.ngTsHandler.split('#');
            const path = path_1.resolve(pk.realPackagePath, filePath);
            const func = require(path)[exportName];
            funcs.push([
                path + '#' + exportName,
                func
            ]);
        }
    }
    return funcs;
}
let tsHandlers;
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
    parse(transpileExp) {
        const pk = __api_1.default.findPackageByFile(this.file);
        // console.log('parse', this.file, pk == null ? '' : 'yes');
        if (pk == null)
            return this.src;
        if (!tsHandlers)
            tsHandlers = createTsHandlers();
        this.ast = ts.createSourceFile(this.file, this.src, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
        this._callTsHandlers(tsHandlers);
        for (const stm of this.ast.statements) {
            this.traverseTsAst(stm);
        }
        textPatcher._sortAndRemoveOverlap(this.replacements, true, this.src);
        // Remove overlaped replacements to avoid them getting into later `vm.runInNewContext()`,
        // We don't want to single out and evaluate lower level expression like `__api.packageName` from
        // `__api.config.get(__api.packageName)`, we just evaluate the whole latter expression
        const nodeApi = __api_1.default.getNodeApiForPackage(pk);
        nodeApi.__dirname = path_1.dirname(this.file);
        const context = vm.createContext({ __api: nodeApi });
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
                else if (repl.text === undefined) {
                    // JSON.stringify(undefined) will not return string of "undefined", but actual undefined
                    repl.text = 'undefined';
                }
            }
            catch (ex) {
                log.error('Evaluate %s, result:', origText, res);
                throw ex;
            }
            log.info(`Evaluate "${chalk.yellow(origText)}" to: ${chalk.cyan(repl.text)} in\n\t` +
                path_1.relative(process.cwd(), this.file));
        }
        if (this.importTranspiler)
            this.importTranspiler.parse(this.ast, this.replacements);
        if (this.replacements.length === 0)
            return this.src;
        textPatcher._sortAndRemoveOverlap(this.replacements, true, this.src);
        return textPatcher._replaceSorted(this.src, this.replacements);
    }
    getApiForFile(file) {
        __api_1.default.findPackageByFile(file);
    }
    _callTsHandlers(tsHandlers) {
        for (const [name, func] of tsHandlers) {
            const change = func(this.ast);
            if (change && change.length > 0) {
                log.info('%s is changed by %s', chalk.cyan(this.ast.fileName), chalk.blue(name));
                this.src = patch_text_1.default(this.src, change);
                this.ast = ts.createSourceFile(this.file, this.src, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
            }
        }
    }
    traverseTsAst(ast, level = 0) {
        if (ast.kind === typescript_1.SyntaxKind.PropertyAccessExpression || ast.kind === typescript_1.SyntaxKind.ElementAccessExpression) {
            const node = ast;
            if (node.expression.kind === typescript_1.SyntaxKind.Identifier && node.expression.getText(this.ast) === '__api') {
                // keep looking up for parents until it is not CallExpression, ElementAccessExpression or PropertyAccessExpression
                const evaluateNode = this.goUpToParentExpress(node);
                this.replacements.push({ start: evaluateNode.getStart(this.ast),
                    end: evaluateNode.getEnd(),
                    text: evaluateNode.getText(this.ast) });
                return;
            }
        }
        // else if (ast.kind === sk.Identifier && ast.getText() === '__api') {
        //   this.replacements.push({start: ast.getStart(), end: ast.getEnd(), text: '"__api"'});
        // }
        ast.forEachChild((sub) => {
            this.traverseTsAst(sub, level + 1);
        });
    }
    /**
       * keep looking up for parents until it is not CallExpression, ElementAccessExpression or PropertyAccessExpression
       */
    goUpToParentExpress(target) {
        let currNode = target;
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
exports.default = ApiAotCompiler;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy91dGlscy90cy1iZWZvcmUtYW90LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtDQUFpQztBQUNqQywyQ0FBNEM7QUFDNUMsdUZBQXlEO0FBRXpELGtEQUFtQztBQUNuQyx5QkFBMEI7QUFDMUIsK0JBQWdEO0FBQ2hELGtHQUFtRTtBQUVuRSxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDL0IsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLG1CQUFtQixDQUFDLENBQUM7QUFLL0UsU0FBUyxnQkFBZ0I7SUFDdkIsTUFBTSxLQUFLLEdBQStCLEVBQUUsQ0FBQztJQUM3QyxLQUFLLE1BQU0sRUFBRSxJQUFJLGVBQUcsQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFO1FBQzNDLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRTtZQUM5QixNQUFNLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM1RCxNQUFNLElBQUksR0FBRyxjQUFPLENBQUMsRUFBRSxDQUFDLGVBQWUsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUNuRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFjLENBQUM7WUFDcEQsS0FBSyxDQUFDLElBQUksQ0FBQztnQkFDVCxJQUFJLEdBQUcsR0FBRyxHQUFHLFVBQVU7Z0JBQ3ZCLElBQUk7YUFDTCxDQUFDLENBQUM7U0FDSjtLQUNGO0lBQ0QsT0FBTyxLQUFLLENBQUM7QUFDZixDQUFD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O1FBQ3pGLElBQUk7UUFDSixHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBWSxFQUFFLEVBQUU7WUFDaEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOztTQUVFO0lBQ1EsbUJBQW1CLENBQUMsTUFBZTtRQUMzQyxJQUFJLFFBQVEsR0FBRyxNQUFNLENBQUM7UUFDdEIsT0FBTSxJQUFJLEVBQUU7WUFDVixNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztZQUNsQyxJQUFJLElBQUksS0FBSyx1QkFBRSxDQUFDLGNBQWMsSUFBSyxRQUFRLENBQUMsTUFBNEIsQ0FBQyxVQUFVLEtBQUssUUFBUTtnQkFDOUYsSUFBSSxLQUFLLHVCQUFFLENBQUMsd0JBQXdCLElBQUssUUFBUSxDQUFDLE1BQXNDLENBQUMsVUFBVSxLQUFLLFFBQVE7Z0JBQ2hILElBQUksS0FBSyx1QkFBRSxDQUFDLHVCQUF1QixJQUFLLFFBQVEsQ0FBQyxNQUFxQyxDQUFDLFVBQVUsS0FBSyxRQUFRLEVBQUU7Z0JBQ2hILFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO2FBQzVCO2lCQUFNO2dCQUNMLE1BQU07YUFDUDtTQUNGO1FBQ0QsT0FBTyxRQUFRLENBQUM7SUFDbEIsQ0FBQztDQUNGO0FBN0hELGlDQTZIQyIsImZpbGUiOiJkaXN0L3V0aWxzL3RzLWJlZm9yZS1hb3QuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdfQ==
