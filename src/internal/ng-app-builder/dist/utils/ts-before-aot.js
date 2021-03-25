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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
const __plink_1 = __importDefault(require("__plink"));
const vm = require("vm");
const path_1 = require("path");
const default_import_ts_transpiler_1 = __importDefault(require("./default-import-ts-transpiler"));
const chalk = require('chalk');
const log = require('log4js').getLogger(__plink_1.default.packageName + '.api-aot-compiler');
function createTsHandlers() {
    const funcs = [];
    for (const pk of __plink_1.default.packageInfo.allModules) {
        if (pk.json.dr && pk.json.dr.ngTsHandler) {
            const [filePath, exportName] = pk.json.dr.ngTsHandler.split('#');
            const path = path_1.resolve(pk.realPath, filePath);
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
        if (__plink_1.default.ssr) {
            this.importTranspiler = new default_import_ts_transpiler_1.default({
                file: this.file,
                modules: [/^lodash(?:\/|$)/]
            });
        }
    }
    parse(transpileExp) {
        const pk = __plink_1.default.findPackageByFile(this.file);
        // log.warn('parse', this.file, pk == null ? '' : 'yes');
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
        const nodeApi = __plink_1.default.getNodeApiForPackage(pk);
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
            log.debug(`Evaluate "${chalk.yellow(origText)}" to: ${chalk.cyan(repl.text)} in\n\t` +
                path_1.relative(process.cwd(), this.file));
        }
        if (this.importTranspiler)
            this.importTranspiler.parse(this.ast, this.replacements);
        if (this.replacements.length === 0)
            return this.src;
        textPatcher._sortAndRemoveOverlap(this.replacements, true, this.src);
        return textPatcher._replaceSorted(this.src, this.replacements);
    }
    // getApiForFile(file: string) {
    //   api.findPackageByFile(file);
    // }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtYmVmb3JlLWFvdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRzLWJlZm9yZS1hb3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0NBQWlDO0FBQ2pDLDJDQUE0QztBQUM1Qyx1RkFBeUQ7QUFFekQsc0RBQTBCO0FBQzFCLHlCQUEwQjtBQUMxQiwrQkFBZ0Q7QUFDaEQsa0dBQW1FO0FBRW5FLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMvQixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGlCQUFHLENBQUMsV0FBVyxHQUFHLG1CQUFtQixDQUFDLENBQUM7QUFLL0UsU0FBUyxnQkFBZ0I7SUFDdkIsTUFBTSxLQUFLLEdBQStCLEVBQUUsQ0FBQztJQUM3QyxLQUFLLE1BQU0sRUFBRSxJQUFJLGlCQUFHLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRTtRQUMzQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRTtZQUN4QyxNQUFNLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDakUsTUFBTSxJQUFJLEdBQUcsY0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDNUMsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBYyxDQUFDO1lBQ3BELEtBQUssQ0FBQyxJQUFJLENBQUM7Z0JBQ1QsSUFBSSxHQUFHLEdBQUcsR0FBRyxVQUFVO2dCQUN2QixJQUFJO2FBQ0wsQ0FBQyxDQUFDO1NBQ0o7S0FDRjtJQUNELE9BQU8sS0FBSyxDQUFDO0FBQ2YsQ0FBQztBQUVELElBQUksVUFBc0MsQ0FBQztBQUUzQyxNQUFxQixjQUFjO0lBT2pDLFlBQXNCLElBQVksRUFBWSxHQUFXO1FBQW5DLFNBQUksR0FBSixJQUFJLENBQVE7UUFBWSxRQUFHLEdBQUgsR0FBRyxDQUFRO1FBSnpELGlCQUFZLEdBQXFCLEVBQUUsQ0FBQztRQUtsQyxJQUFJLGlCQUFHLENBQUMsR0FBRyxFQUFFO1lBQ1gsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksc0NBQXFCLENBQUM7Z0JBQ2hELElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtnQkFDZixPQUFPLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQzthQUM3QixDQUFDLENBQUM7U0FDSjtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsWUFBd0M7UUFDNUMsTUFBTSxFQUFFLEdBQUcsaUJBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUMseURBQXlEO1FBQ3pELElBQUksRUFBRSxJQUFJLElBQUk7WUFDWixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDbEIsSUFBSSxDQUFDLFVBQVU7WUFDYixVQUFVLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQztRQUVsQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQ3hFLElBQUksRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzNCLElBQUksQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFakMsS0FBSSxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRTtZQUNwQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3pCO1FBQ0QsV0FBVyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNyRSx5RkFBeUY7UUFDekYsZ0dBQWdHO1FBQ2hHLHNGQUFzRjtRQUV0RixNQUFNLE9BQU8sR0FBRyxpQkFBRyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzdDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsY0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2QyxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBQyxDQUFDLENBQUM7UUFFbkQsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ3BDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFLLENBQUM7WUFDNUIsSUFBSSxHQUFHLENBQUM7WUFDUixJQUFJO2dCQUNGLEdBQUcsR0FBRyxFQUFFLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDMUQsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNoQyxvREFBb0Q7Z0JBQ3BELGdEQUFnRDtnQkFDaEQsK0NBQStDO2dCQUMvQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssTUFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssT0FBTztvQkFDL0MsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztxQkFDMUIsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRTtvQkFDaEMsd0ZBQXdGO29CQUN4RixJQUFJLENBQUMsSUFBSSxHQUFHLFdBQVcsQ0FBQztpQkFDekI7YUFDRjtZQUFDLE9BQU0sRUFBRSxFQUFFO2dCQUNWLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNqRCxNQUFNLEVBQUUsQ0FBQzthQUNWO1lBQ0QsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVM7Z0JBQ2xGLGVBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7U0FDdkM7UUFFRCxJQUFJLElBQUksQ0FBQyxnQkFBZ0I7WUFDdkIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUUzRCxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUM7WUFDaEMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ2xCLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDckUsT0FBTyxXQUFXLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ2pFLENBQUM7SUFFRCxnQ0FBZ0M7SUFDaEMsaUNBQWlDO0lBQ2pDLElBQUk7SUFFTSxlQUFlLENBQUMsVUFBc0M7UUFDOUQsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLFVBQVUsRUFBRTtZQUNyQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzlCLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUMvQixHQUFHLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsb0JBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUN6QyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQ3hFLElBQUksRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQzVCO1NBQ0Y7SUFDSCxDQUFDO0lBRVMsYUFBYSxDQUFDLEdBQVksRUFBRSxLQUFLLEdBQUcsQ0FBQztRQUM3QyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssdUJBQUUsQ0FBQyx3QkFBd0IsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLHVCQUFFLENBQUMsdUJBQXVCLEVBQUU7WUFDdkYsTUFBTSxJQUFJLEdBQUcsR0FBaUUsQ0FBQztZQUMvRSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLHVCQUFFLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxPQUFPLEVBQUU7Z0JBQzNGLGtIQUFrSDtnQkFDbEgsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNwRCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxZQUFZLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7b0JBQzVELEdBQUcsRUFBRSxZQUFZLENBQUMsTUFBTSxFQUFFO29CQUMxQixJQUFJLEVBQUUsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUMsQ0FBQyxDQUFDO2dCQUN6QyxPQUFPO2FBQ1I7U0FDRjtRQUNELHNFQUFzRTtRQUN0RSx5RkFBeUY7UUFDekYsSUFBSTtRQUNKLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFZLEVBQUUsRUFBRTtZQUNoQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDckMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7O1NBRUU7SUFDUSxtQkFBbUIsQ0FBQyxNQUFlO1FBQzNDLElBQUksUUFBUSxHQUFHLE1BQU0sQ0FBQztRQUN0QixPQUFNLElBQUksRUFBRTtZQUNWLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1lBQ2xDLElBQUksSUFBSSxLQUFLLHVCQUFFLENBQUMsY0FBYyxJQUFLLFFBQVEsQ0FBQyxNQUE0QixDQUFDLFVBQVUsS0FBSyxRQUFRO2dCQUM5RixJQUFJLEtBQUssdUJBQUUsQ0FBQyx3QkFBd0IsSUFBSyxRQUFRLENBQUMsTUFBc0MsQ0FBQyxVQUFVLEtBQUssUUFBUTtnQkFDaEgsSUFBSSxLQUFLLHVCQUFFLENBQUMsdUJBQXVCLElBQUssUUFBUSxDQUFDLE1BQXFDLENBQUMsVUFBVSxLQUFLLFFBQVEsRUFBRTtnQkFDaEgsUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7YUFDNUI7aUJBQU07Z0JBQ0wsTUFBTTthQUNQO1NBQ0Y7UUFDRCxPQUFPLFFBQVEsQ0FBQztJQUNsQixDQUFDO0NBQ0Y7QUE3SEQsaUNBNkhDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge1N5bnRheEtpbmQgYXMgc2t9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHJlcGxhY2VDb2RlLCAqIGFzIHRleHRQYXRjaGVyIGZyb20gJy4vcGF0Y2gtdGV4dCc7XG5pbXBvcnQge1JlcGxhY2VtZW50SW5mfSBmcm9tICcuL3BhdGNoLXRleHQnO1xuaW1wb3J0IGFwaSBmcm9tICdfX3BsaW5rJztcbmltcG9ydCB2bSA9IHJlcXVpcmUoJ3ZtJyk7XG5pbXBvcnQge2Rpcm5hbWUsIHJlbGF0aXZlLCByZXNvbHZlfSBmcm9tICdwYXRoJztcbmltcG9ydCBJbXBvcnRDbGF1c2VUcmFuc3BpbGUgZnJvbSAnLi9kZWZhdWx0LWltcG9ydC10cy10cmFuc3BpbGVyJztcblxuY29uc3QgY2hhbGsgPSByZXF1aXJlKCdjaGFsaycpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuYXBpLWFvdC1jb21waWxlcicpO1xuXG5leHBvcnQge1JlcGxhY2VtZW50SW5mfTtcbmV4cG9ydCB0eXBlIFRzSGFuZGxlciA9IChhc3Q6IHRzLlNvdXJjZUZpbGUpID0+IFJlcGxhY2VtZW50SW5mW107XG5cbmZ1bmN0aW9uIGNyZWF0ZVRzSGFuZGxlcnMoKTogQXJyYXk8W3N0cmluZywgVHNIYW5kbGVyXT4ge1xuICBjb25zdCBmdW5jczogQXJyYXk8W3N0cmluZywgVHNIYW5kbGVyXT4gPSBbXTtcbiAgZm9yIChjb25zdCBwayBvZiBhcGkucGFja2FnZUluZm8uYWxsTW9kdWxlcykge1xuICAgIGlmIChway5qc29uLmRyICYmIHBrLmpzb24uZHIubmdUc0hhbmRsZXIpIHtcbiAgICAgIGNvbnN0IFtmaWxlUGF0aCwgZXhwb3J0TmFtZV0gPSBway5qc29uLmRyLm5nVHNIYW5kbGVyLnNwbGl0KCcjJyk7XG4gICAgICBjb25zdCBwYXRoID0gcmVzb2x2ZShway5yZWFsUGF0aCwgZmlsZVBhdGgpO1xuICAgICAgY29uc3QgZnVuYyA9IHJlcXVpcmUocGF0aClbZXhwb3J0TmFtZV0gYXMgVHNIYW5kbGVyO1xuICAgICAgZnVuY3MucHVzaChbXG4gICAgICAgIHBhdGggKyAnIycgKyBleHBvcnROYW1lLFxuICAgICAgICBmdW5jXG4gICAgICBdKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZ1bmNzO1xufVxuXG5sZXQgdHNIYW5kbGVyczogQXJyYXk8W3N0cmluZywgVHNIYW5kbGVyXT47XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFwaUFvdENvbXBpbGVyIHtcbiAgYXN0OiB0cy5Tb3VyY2VGaWxlO1xuXG4gIHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSA9IFtdO1xuXG4gIGltcG9ydFRyYW5zcGlsZXI6IEltcG9ydENsYXVzZVRyYW5zcGlsZTtcblxuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgZmlsZTogc3RyaW5nLCBwcm90ZWN0ZWQgc3JjOiBzdHJpbmcpIHtcbiAgICBpZiAoYXBpLnNzcikge1xuICAgICAgdGhpcy5pbXBvcnRUcmFuc3BpbGVyID0gbmV3IEltcG9ydENsYXVzZVRyYW5zcGlsZSh7XG4gICAgICAgIGZpbGU6IHRoaXMuZmlsZSxcbiAgICAgICAgbW9kdWxlczogWy9ebG9kYXNoKD86XFwvfCQpL11cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHBhcnNlKHRyYW5zcGlsZUV4cDogKHNvdXJjZTogc3RyaW5nKSA9PiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBrID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKHRoaXMuZmlsZSk7XG4gICAgLy8gbG9nLndhcm4oJ3BhcnNlJywgdGhpcy5maWxlLCBwayA9PSBudWxsID8gJycgOiAneWVzJyk7XG4gICAgaWYgKHBrID09IG51bGwpXG4gICAgICByZXR1cm4gdGhpcy5zcmM7XG4gICAgaWYgKCF0c0hhbmRsZXJzKVxuICAgICAgdHNIYW5kbGVycyA9IGNyZWF0ZVRzSGFuZGxlcnMoKTtcblxuICAgIHRoaXMuYXN0ID0gdHMuY3JlYXRlU291cmNlRmlsZSh0aGlzLmZpbGUsIHRoaXMuc3JjLCB0cy5TY3JpcHRUYXJnZXQuRVNOZXh0LFxuICAgICAgdHJ1ZSwgdHMuU2NyaXB0S2luZC5UU1gpO1xuICAgIHRoaXMuX2NhbGxUc0hhbmRsZXJzKHRzSGFuZGxlcnMpO1xuXG4gICAgZm9yKGNvbnN0IHN0bSBvZiB0aGlzLmFzdC5zdGF0ZW1lbnRzKSB7XG4gICAgICB0aGlzLnRyYXZlcnNlVHNBc3Qoc3RtKTtcbiAgICB9XG4gICAgdGV4dFBhdGNoZXIuX3NvcnRBbmRSZW1vdmVPdmVybGFwKHRoaXMucmVwbGFjZW1lbnRzLCB0cnVlLCB0aGlzLnNyYyk7XG4gICAgLy8gUmVtb3ZlIG92ZXJsYXBlZCByZXBsYWNlbWVudHMgdG8gYXZvaWQgdGhlbSBnZXR0aW5nIGludG8gbGF0ZXIgYHZtLnJ1bkluTmV3Q29udGV4dCgpYCxcbiAgICAvLyBXZSBkb24ndCB3YW50IHRvIHNpbmdsZSBvdXQgYW5kIGV2YWx1YXRlIGxvd2VyIGxldmVsIGV4cHJlc3Npb24gbGlrZSBgX19hcGkucGFja2FnZU5hbWVgIGZyb21cbiAgICAvLyBgX19hcGkuY29uZmlnLmdldChfX2FwaS5wYWNrYWdlTmFtZSlgLCB3ZSBqdXN0IGV2YWx1YXRlIHRoZSB3aG9sZSBsYXR0ZXIgZXhwcmVzc2lvblxuXG4gICAgY29uc3Qgbm9kZUFwaSA9IGFwaS5nZXROb2RlQXBpRm9yUGFja2FnZShwayk7XG4gICAgbm9kZUFwaS5fX2Rpcm5hbWUgPSBkaXJuYW1lKHRoaXMuZmlsZSk7XG4gICAgY29uc3QgY29udGV4dCA9IHZtLmNyZWF0ZUNvbnRleHQoe19fYXBpOiBub2RlQXBpfSk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGwgb2YgdGhpcy5yZXBsYWNlbWVudHMpIHtcbiAgICAgIGNvbnN0IG9yaWdUZXh0ID0gcmVwbC50ZXh0ITtcbiAgICAgIGxldCByZXM7XG4gICAgICB0cnkge1xuICAgICAgICByZXMgPSB2bS5ydW5Jbk5ld0NvbnRleHQodHJhbnNwaWxlRXhwKG9yaWdUZXh0KSwgY29udGV4dCk7XG4gICAgICAgIHJlcGwudGV4dCA9IEpTT04uc3RyaW5naWZ5KHJlcyk7XG4gICAgICAgIC8vIFRvIGJ5cGFzcyBUUyBlcnJvciBcIlVucmVhY2hhYmxlIGNvZGUgZGV0ZWN0ZWRcIiBpZlxuICAgICAgICAvLyBjb21waWxlciBvcHRpb24gXCJhbGxvd1VucmVhY2hhYmxlQ29kZTogZmFsc2VcIlxuICAgICAgICAvLyBlLmcuIGlmIChmYWxzZSkgey4uLn0gLS0+IGlmICghIWZhbHNlKSB7Li4ufVxuICAgICAgICBpZiAocmVwbC50ZXh0ID09PSAndHJ1ZScgfHwgcmVwbC50ZXh0ID09PSAnZmFsc2UnKVxuICAgICAgICAgIHJlcGwudGV4dCA9ICchIScgKyByZXBsLnRleHQ7XG4gICAgICAgIGVsc2UgaWYgKHJlcGwudGV4dCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gSlNPTi5zdHJpbmdpZnkodW5kZWZpbmVkKSB3aWxsIG5vdCByZXR1cm4gc3RyaW5nIG9mIFwidW5kZWZpbmVkXCIsIGJ1dCBhY3R1YWwgdW5kZWZpbmVkXG4gICAgICAgICAgcmVwbC50ZXh0ID0gJ3VuZGVmaW5lZCc7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2goZXgpIHtcbiAgICAgICAgbG9nLmVycm9yKCdFdmFsdWF0ZSAlcywgcmVzdWx0OicsIG9yaWdUZXh0LCByZXMpO1xuICAgICAgICB0aHJvdyBleDtcbiAgICAgIH1cbiAgICAgIGxvZy5kZWJ1ZyhgRXZhbHVhdGUgXCIke2NoYWxrLnllbGxvdyhvcmlnVGV4dCl9XCIgdG86ICR7Y2hhbGsuY3lhbihyZXBsLnRleHQpfSBpblxcblxcdGAgK1xuICAgICAgICByZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCB0aGlzLmZpbGUpKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5pbXBvcnRUcmFuc3BpbGVyKVxuICAgICAgdGhpcy5pbXBvcnRUcmFuc3BpbGVyLnBhcnNlKHRoaXMuYXN0LCB0aGlzLnJlcGxhY2VtZW50cyk7XG5cbiAgICBpZiAodGhpcy5yZXBsYWNlbWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgcmV0dXJuIHRoaXMuc3JjO1xuICAgIHRleHRQYXRjaGVyLl9zb3J0QW5kUmVtb3ZlT3ZlcmxhcCh0aGlzLnJlcGxhY2VtZW50cywgdHJ1ZSwgdGhpcy5zcmMpO1xuICAgIHJldHVybiB0ZXh0UGF0Y2hlci5fcmVwbGFjZVNvcnRlZCh0aGlzLnNyYywgdGhpcy5yZXBsYWNlbWVudHMpO1xuICB9XG5cbiAgLy8gZ2V0QXBpRm9yRmlsZShmaWxlOiBzdHJpbmcpIHtcbiAgLy8gICBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG4gIC8vIH1cblxuICBwcm90ZWN0ZWQgX2NhbGxUc0hhbmRsZXJzKHRzSGFuZGxlcnM6IEFycmF5PFtzdHJpbmcsIFRzSGFuZGxlcl0+KTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgZnVuY10gb2YgdHNIYW5kbGVycykge1xuICAgICAgY29uc3QgY2hhbmdlID0gZnVuYyh0aGlzLmFzdCk7XG4gICAgICBpZiAoY2hhbmdlICYmIGNoYW5nZS5sZW5ndGggPiAwKSB7XG4gICAgICAgIGxvZy5pbmZvKCclcyBpcyBjaGFuZ2VkIGJ5ICVzJywgY2hhbGsuY3lhbih0aGlzLmFzdC5maWxlTmFtZSksIGNoYWxrLmJsdWUobmFtZSkpO1xuICAgICAgICB0aGlzLnNyYyA9IHJlcGxhY2VDb2RlKHRoaXMuc3JjLCBjaGFuZ2UpO1xuICAgICAgICB0aGlzLmFzdCA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUodGhpcy5maWxlLCB0aGlzLnNyYywgdHMuU2NyaXB0VGFyZ2V0LkVTTmV4dCxcbiAgICAgICAgICB0cnVlLCB0cy5TY3JpcHRLaW5kLlRTWCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIHRyYXZlcnNlVHNBc3QoYXN0OiB0cy5Ob2RlLCBsZXZlbCA9IDApIHtcbiAgICBpZiAoYXN0LmtpbmQgPT09IHNrLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiB8fCBhc3Qua2luZCA9PT0gc2suRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24pIHtcbiAgICAgIGNvbnN0IG5vZGUgPSBhc3QgYXMgKHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiB8IHRzLkVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uKTtcbiAgICAgIGlmIChub2RlLmV4cHJlc3Npb24ua2luZCA9PT0gc2suSWRlbnRpZmllciAmJiBub2RlLmV4cHJlc3Npb24uZ2V0VGV4dCh0aGlzLmFzdCkgPT09ICdfX2FwaScpIHtcbiAgICAgICAgLy8ga2VlcCBsb29raW5nIHVwIGZvciBwYXJlbnRzIHVudGlsIGl0IGlzIG5vdCBDYWxsRXhwcmVzc2lvbiwgRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24gb3IgUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uXG4gICAgICAgIGNvbnN0IGV2YWx1YXRlTm9kZSA9IHRoaXMuZ29VcFRvUGFyZW50RXhwcmVzcyhub2RlKTtcbiAgICAgICAgdGhpcy5yZXBsYWNlbWVudHMucHVzaCh7c3RhcnQ6IGV2YWx1YXRlTm9kZS5nZXRTdGFydCh0aGlzLmFzdCksXG4gICAgICAgICAgZW5kOiBldmFsdWF0ZU5vZGUuZ2V0RW5kKCksXG4gICAgICAgICAgdGV4dDogZXZhbHVhdGVOb2RlLmdldFRleHQodGhpcy5hc3QpfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gZWxzZSBpZiAoYXN0LmtpbmQgPT09IHNrLklkZW50aWZpZXIgJiYgYXN0LmdldFRleHQoKSA9PT0gJ19fYXBpJykge1xuICAgIC8vICAgdGhpcy5yZXBsYWNlbWVudHMucHVzaCh7c3RhcnQ6IGFzdC5nZXRTdGFydCgpLCBlbmQ6IGFzdC5nZXRFbmQoKSwgdGV4dDogJ1wiX19hcGlcIid9KTtcbiAgICAvLyB9XG4gICAgYXN0LmZvckVhY2hDaGlsZCgoc3ViOiB0cy5Ob2RlKSA9PiB7XG4gICAgICB0aGlzLnRyYXZlcnNlVHNBc3Qoc3ViLCBsZXZlbCArIDEpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG5cdCAqIGtlZXAgbG9va2luZyB1cCBmb3IgcGFyZW50cyB1bnRpbCBpdCBpcyBub3QgQ2FsbEV4cHJlc3Npb24sIEVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uIG9yIFByb3BlcnR5QWNjZXNzRXhwcmVzc2lvblxuXHQgKi9cbiAgcHJvdGVjdGVkIGdvVXBUb1BhcmVudEV4cHJlc3ModGFyZ2V0OiB0cy5Ob2RlKTogdHMuTm9kZSB7XG4gICAgbGV0IGN1cnJOb2RlID0gdGFyZ2V0O1xuICAgIHdoaWxlKHRydWUpIHtcbiAgICAgIGNvbnN0IGtpbmQgPSBjdXJyTm9kZS5wYXJlbnQua2luZDtcbiAgICAgIGlmIChraW5kID09PSBzay5DYWxsRXhwcmVzc2lvbiAmJiAoY3Vyck5vZGUucGFyZW50IGFzIHRzLkNhbGxFeHByZXNzaW9uKS5leHByZXNzaW9uID09PSBjdXJyTm9kZSB8fFxuICAgICAgICBraW5kID09PSBzay5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24gJiYgKGN1cnJOb2RlLnBhcmVudCBhcyB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24pLmV4cHJlc3Npb24gPT09IGN1cnJOb2RlIHx8XG4gICAgICAgIGtpbmQgPT09IHNrLkVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uICYmIChjdXJyTm9kZS5wYXJlbnQgYXMgdHMuRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24pLmV4cHJlc3Npb24gPT09IGN1cnJOb2RlKSB7XG4gICAgICAgIGN1cnJOb2RlID0gY3Vyck5vZGUucGFyZW50O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjdXJyTm9kZTtcbiAgfVxufVxuIl19