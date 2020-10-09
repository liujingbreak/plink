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
// import * as wp from 'webpack';
const Path = __importStar(require("path"));
const vm_1 = __importDefault(require("vm"));
const ts = __importStar(require("typescript"));
const typescript_1 = require("typescript");
const default_import_ts_transpiler_1 = __importDefault(require("./default-import-ts-transpiler"));
const __api_1 = __importDefault(require("__api"));
const textPatcher = __importStar(require("@wfh/plink/wfh/dist/utils/patch-text"));
const ts_compiler_1 = require("@wfh/plink/wfh/dist/ts-compiler");
const log4js_1 = __importDefault(require("log4js"));
const log = log4js_1.default.getLogger(__api_1.default.packageName + '.tsjs-replacement');
const chalk_1 = __importDefault(require("chalk"));
const lodash_1 = require("lodash");
class TsPreCompiler {
    constructor(tsConfigFile, isServerSide, findPackageByFile) {
        this.findPackageByFile = findPackageByFile;
        this.tsCo = ts_compiler_1.readTsConfig(tsConfigFile);
        if (isServerSide) {
            this.importTranspiler = new default_import_ts_transpiler_1.default({
                modules: [/^lodash(?:\/|$)/]
            });
        }
    }
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
                res = vm_1.default.runInNewContext(ts_compiler_1.transpileSingleTs(origText, this.tsCo), context);
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
            log.info(`Evaluate "${chalk_1.default.yellow(origText)}" to: ${chalk_1.default.cyan(repl.text)} in\n\t` +
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
        if (ast.kind === typescript_1.SyntaxKind.PropertyAccessExpression || ast.kind === typescript_1.SyntaxKind.ElementAccessExpression) {
            const node = ast;
            if (node.expression.kind === typescript_1.SyntaxKind.Identifier && lodash_1.has(replaceContext, node.expression.getText())) {
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
        ast.forEachChild((sub) => {
            this.traverseTsAst(sub, replaceContext, replacements, astPositionConvert, level + 1);
        });
    }
    /**
       * keep looking up for parents until it is not CallExpression, ElementAccessExpression or PropertyAccessExpression
       */
    goUpToParentExp(target) {
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
exports.default = TsPreCompiler;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL2ludGVybmFsL3dlYnBhY2stY29tbW9uL3RzL3RzanMvdHNqcy1yZXBsYWNlbWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpQ0FBaUM7QUFDakMsMkNBQTZCO0FBQzdCLDRDQUFvQjtBQUNwQiwrQ0FBaUM7QUFDakMsMkNBQTZEO0FBQzdELGtHQUFtRTtBQUNuRSxrREFBd0I7QUFHeEIsa0ZBQW9FO0FBQ3BFLGlFQUFrRjtBQUNsRixvREFBNEI7QUFDNUIsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxtQkFBbUIsQ0FBQyxDQUFDO0FBQ3BFLGtEQUEwQjtBQUMxQixtQ0FBMkI7QUFJM0IsTUFBcUIsYUFBYTtJQU1oQyxZQUFZLFlBQW9CLEVBQUUsWUFBcUIsRUFDN0MsaUJBQXNFO1FBQXRFLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBcUQ7UUFDOUUsSUFBSSxDQUFDLElBQUksR0FBRywwQkFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3ZDLElBQUksWUFBWSxFQUFFO1lBQ2hCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLHNDQUFxQixDQUFDO2dCQUNoRCxPQUFPLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQzthQUM3QixDQUFDLENBQUM7U0FDSjtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsSUFBWSxFQUFFLE1BQWMsRUFBRSxjQUFvQyxFQUFFLGNBQThCLEVBQ3RHLGtCQUE0QztRQUM1QyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFeEMsSUFBSSxFQUFFLElBQUksSUFBSTtZQUNaLE9BQU8sTUFBTSxDQUFDO1FBRWhCLE1BQU0sR0FBRyxHQUFHLGNBQWMsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxFQUFF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RSxDQUFDLFVBQVUsSUFBSSxZQUFHLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRTtnQkFDNUYsa0hBQWtIO2dCQUNsSCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNoRCxJQUFJLEtBQUssR0FBRyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3BDLElBQUksR0FBRyxHQUFHLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDaEMsTUFBTSxHQUFHLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQztnQkFDeEIsSUFBSSxrQkFBa0IsRUFBRTtvQkFDdEIsS0FBSyxHQUFHLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUNsQyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQztpQkFDbkI7Z0JBQ0QsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFlBQVksQ0FBQyxPQUFPLEVBQUUsRUFBQyxDQUFDLENBQUM7Z0JBQzlELE9BQU8sWUFBWSxDQUFDO2FBQ3JCO1NBQ0Y7UUFDRCxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBWSxFQUFFLEVBQUU7WUFDaEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxrQkFBa0IsRUFBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDdkYsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7O1NBRUU7SUFDUSxlQUFlLENBQUMsTUFBZTtRQUN2QyxJQUFJLFFBQVEsR0FBRyxNQUFNLENBQUM7UUFDdEIsT0FBTSxJQUFJLEVBQUU7WUFDVixNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztZQUNsQyxJQUFJLElBQUksS0FBSyx1QkFBRSxDQUFDLGNBQWMsSUFBSyxRQUFRLENBQUMsTUFBNEIsQ0FBQyxVQUFVLEtBQUssUUFBUTtnQkFDOUYsSUFBSSxLQUFLLHVCQUFFLENBQUMsd0JBQXdCLElBQUssUUFBUSxDQUFDLE1BQXNDLENBQUMsVUFBVSxLQUFLLFFBQVE7Z0JBQ2hILElBQUksS0FBSyx1QkFBRSxDQUFDLHVCQUF1QixJQUFLLFFBQVEsQ0FBQyxNQUFxQyxDQUFDLFVBQVUsS0FBSyxRQUFRLEVBQUU7Z0JBQ2hILFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO2FBQzVCO2lCQUFNO2dCQUNMLE1BQU07YUFDUDtTQUNGO1FBQ0QsT0FBTyxRQUFRLENBQUM7SUFDbEIsQ0FBQztDQUNGO0FBdkhELGdDQXVIQyIsImZpbGUiOiJpbnRlcm5hbC93ZWJwYWNrLWNvbW1vbi9kaXN0L3RzanMvdHNqcy1yZXBsYWNlbWVudC5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF19
