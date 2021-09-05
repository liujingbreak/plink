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
// import * as wp from 'webpack';
const Path = __importStar(require("path"));
const vm_1 = __importDefault(require("vm"));
const ts = __importStar(require("typescript"));
const typescript_1 = require("typescript");
const default_import_ts_transpiler_1 = __importDefault(require("./default-import-ts-transpiler"));
const textPatcher = __importStar(require("@wfh/plink/wfh/dist/utils/patch-text"));
const ts_compiler_1 = require("@wfh/plink/wfh/dist/ts-compiler");
const plink_1 = require("@wfh/plink");
const chalk_1 = __importDefault(require("chalk"));
const lodash_1 = require("lodash");
const log = (0, plink_1.log4File)(__filename);
class TsPreCompiler {
    constructor(tsConfigFile, isServerSide, findPackageByFile) {
        this.findPackageByFile = findPackageByFile;
        this.tsCo = (0, ts_compiler_1.readTsConfig)(tsConfigFile);
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
                res = vm_1.default.runInNewContext((0, ts_compiler_1.transpileSingleTs)(origText, this.tsCo), context);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNqcy1yZXBsYWNlbWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRzanMtcmVwbGFjZW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaUNBQWlDO0FBQ2pDLDJDQUE2QjtBQUM3Qiw0Q0FBb0I7QUFDcEIsK0NBQWlDO0FBQ2pDLDJDQUE2RDtBQUM3RCxrR0FBbUU7QUFHbkUsa0ZBQW9FO0FBQ3BFLGlFQUFrRjtBQUNsRixzQ0FBb0M7QUFDcEMsa0RBQTBCO0FBQzFCLG1DQUEyQjtBQUUzQixNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFHakMsTUFBcUIsYUFBYTtJQU1oQyxZQUFZLFlBQW9CLEVBQUUsWUFBcUIsRUFDN0MsaUJBQXNFO1FBQXRFLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBcUQ7UUFDOUUsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFBLDBCQUFZLEVBQUMsWUFBWSxDQUFDLENBQUM7UUFDdkMsSUFBSSxZQUFZLEVBQUU7WUFDaEIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksc0NBQXFCLENBQUM7Z0JBQ2hELE9BQU8sRUFBRSxDQUFDLGlCQUFpQixDQUFDO2FBQzdCLENBQUMsQ0FBQztTQUNKO0lBQ0gsQ0FBQztJQUVEOzs7Ozs7O09BT0c7SUFDSCxLQUFLLENBQUMsSUFBWSxFQUFFLE1BQWMsRUFBRSxjQUFvQyxFQUFFLGNBQThCLEVBQ3RHLGtCQUE0QztRQUM1QyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDeEMsSUFBSSxFQUFFLElBQUksSUFBSTtZQUNaLE9BQU8sTUFBTSxDQUFDO1FBRWhCLE1BQU0sR0FBRyxHQUFHLGNBQWMsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFDcEYs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LENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztZQUNsQyxJQUFJLElBQUksS0FBSyx1QkFBRSxDQUFDLGNBQWMsSUFBSyxRQUFRLENBQUMsTUFBNEIsQ0FBQyxVQUFVLEtBQUssUUFBUTtnQkFDOUYsSUFBSSxLQUFLLHVCQUFFLENBQUMsd0JBQXdCLElBQUssUUFBUSxDQUFDLE1BQXNDLENBQUMsVUFBVSxLQUFLLFFBQVE7Z0JBQ2hILElBQUksS0FBSyx1QkFBRSxDQUFDLHVCQUF1QixJQUFLLFFBQVEsQ0FBQyxNQUFxQyxDQUFDLFVBQVUsS0FBSyxRQUFRLEVBQUU7Z0JBQ2hILFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO2FBQzVCO2lCQUFNO2dCQUNMLE1BQU07YUFDUDtTQUNGO1FBQ0QsT0FBTyxRQUFRLENBQUM7SUFDbEIsQ0FBQztDQUNGO0FBbklELGdDQW1JQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGltcG9ydCAqIGFzIHdwIGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB2bSBmcm9tICd2bSc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7U3ludGF4S2luZCBhcyBzaywgQ29tcGlsZXJPcHRpb25zfSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBJbXBvcnRDbGF1c2VUcmFuc3BpbGUgZnJvbSAnLi9kZWZhdWx0LWltcG9ydC10cy10cmFuc3BpbGVyJztcbmltcG9ydCBCcm93c2VyUGFja2FnZSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2VOb2RlSW5zdGFuY2UnO1xuaW1wb3J0IHtSZXBsYWNlbWVudEluZn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCAqIGFzIHRleHRQYXRjaGVyIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQgeyByZWFkVHNDb25maWcsIHRyYW5zcGlsZVNpbmdsZVRzIH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC90cy1jb21waWxlcic7XG5pbXBvcnQge2xvZzRGaWxlfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge2hhc30gZnJvbSAnbG9kYXNoJztcblxuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG5leHBvcnQge1JlcGxhY2VtZW50SW5mfTtcbmV4cG9ydCB0eXBlIFRzSGFuZGxlciA9IChhc3Q6IHRzLlNvdXJjZUZpbGUpID0+IFJlcGxhY2VtZW50SW5mW107XG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUc1ByZUNvbXBpbGVyIHtcbiAgdHNDbzogQ29tcGlsZXJPcHRpb25zO1xuXG5cbiAgaW1wb3J0VHJhbnNwaWxlcjogSW1wb3J0Q2xhdXNlVHJhbnNwaWxlIHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKHRzQ29uZmlnRmlsZTogc3RyaW5nLCBpc1NlcnZlclNpZGU6IGJvb2xlYW4sXG4gICAgcHJpdmF0ZSBmaW5kUGFja2FnZUJ5RmlsZTogKGZpbGU6IHN0cmluZykgPT4gQnJvd3NlclBhY2thZ2UgfCBudWxsIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy50c0NvID0gcmVhZFRzQ29uZmlnKHRzQ29uZmlnRmlsZSk7XG4gICAgaWYgKGlzU2VydmVyU2lkZSkge1xuICAgICAgdGhpcy5pbXBvcnRUcmFuc3BpbGVyID0gbmV3IEltcG9ydENsYXVzZVRyYW5zcGlsZSh7XG4gICAgICAgIG1vZHVsZXM6IFsvXmxvZGFzaCg/OlxcL3wkKS9dXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogcmVwbGFjZUNvbnRleHQgY2FuIHB1dCBhbnkgSmF2YXNjcmlwdCBvYmplY3Qgd2hpY2ggY29udGFpbnMgcHJvcGVydGllcyBvciBtZW1lbWJlciBmdW5jdGlvbnNcbiAgICogQHBhcmFtIGZpbGUgXG4gICAqIEBwYXJhbSBzb3VyY2UgXG4gICAqIEBwYXJhbSByZXBsYWNlQ29udGV4dCBcbiAgICogQHBhcmFtIGNvbXBpbGVkU291cmNlIFxuICAgKiBAcGFyYW0gYXN0UG9zaXRpb25Db252ZXJ0IFxuICAgKi9cbiAgcGFyc2UoZmlsZTogc3RyaW5nLCBzb3VyY2U6IHN0cmluZywgcmVwbGFjZUNvbnRleHQ6IHtba2V5OiBzdHJpbmddOiBhbnl9LCBjb21waWxlZFNvdXJjZT86IHRzLlNvdXJjZUZpbGUsXG4gICAgYXN0UG9zaXRpb25Db252ZXJ0PzogKHBvczogbnVtYmVyKSA9PiBudW1iZXIpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBrID0gdGhpcy5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcbiAgICBpZiAocGsgPT0gbnVsbClcbiAgICAgIHJldHVybiBzb3VyY2U7XG5cbiAgICBjb25zdCBhc3QgPSBjb21waWxlZFNvdXJjZSB8fCB0cy5jcmVhdGVTb3VyY2VGaWxlKGZpbGUsIHNvdXJjZSwgdHMuU2NyaXB0VGFyZ2V0LkVTTmV4dCxcbiAgICAgIHRydWUsIHRzLlNjcmlwdEtpbmQuVFNYKTtcbiAgICAvLyB0aGlzLl9jYWxsVHNIYW5kbGVycyh0c0hhbmRsZXJzKTtcblxuICAgIGNvbnN0IHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSA9IFtdO1xuICAgIGZvcihjb25zdCBzdG0gb2YgYXN0LnN0YXRlbWVudHMpIHtcbiAgICAgIHRoaXMudHJhdmVyc2VUc0FzdChzdG0sIHJlcGxhY2VDb250ZXh0LCByZXBsYWNlbWVudHMsIGFzdFBvc2l0aW9uQ29udmVydCk7XG4gICAgfVxuICAgIHRleHRQYXRjaGVyLl9zb3J0QW5kUmVtb3ZlT3ZlcmxhcChyZXBsYWNlbWVudHMsIHRydWUsIHNvdXJjZSk7XG4gICAgLy8gUmVtb3ZlIG92ZXJsYXBlZCByZXBsYWNlbWVudHMgdG8gYXZvaWQgdGhlbSBnZXR0aW5nIGludG8gbGF0ZXIgYHZtLnJ1bkluTmV3Q29udGV4dCgpYCxcbiAgICAvLyBXZSBkb24ndCB3YW50IHRvIHNpbmdsZSBvdXQgYW5kIGV2YWx1YXRlIGxvd2VyIGxldmVsIGV4cHJlc3Npb24gbGlrZSBgX19hcGkucGFja2FnZU5hbWVgIGZyb21cbiAgICAvLyBgX19hcGkuY29uZmlnLmdldChfX2FwaS5wYWNrYWdlTmFtZSlgLCB3ZSBqdXN0IGV2YWx1YXRlIHRoZSB3aG9sZSBsYXR0ZXIgZXhwcmVzc2lvblxuXG5cbiAgICBjb25zdCBjb250ZXh0ID0gdm0uY3JlYXRlQ29udGV4dChyZXBsYWNlQ29udGV4dCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGwgb2YgcmVwbGFjZW1lbnRzKSB7XG4gICAgICBjb25zdCBvcmlnVGV4dCA9IHJlcGwudGV4dCE7XG4gICAgICBsZXQgcmVzO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzID0gdm0ucnVuSW5OZXdDb250ZXh0KHRyYW5zcGlsZVNpbmdsZVRzKG9yaWdUZXh0LCB0aGlzLnRzQ28pLCBjb250ZXh0KTtcbiAgICAgICAgcmVwbC50ZXh0ID0gSlNPTi5zdHJpbmdpZnkocmVzKTtcbiAgICAgICAgLy8gVG8gYnlwYXNzIFRTIGVycm9yIFwiVW5yZWFjaGFibGUgY29kZSBkZXRlY3RlZFwiIGlmXG4gICAgICAgIC8vIGNvbXBpbGVyIG9wdGlvbiBcImFsbG93VW5yZWFjaGFibGVDb2RlOiBmYWxzZVwiXG4gICAgICAgIC8vIGUuZy4gaWYgKGZhbHNlKSB7Li4ufSAtLT4gaWYgKCEhZmFsc2UpIHsuLi59XG4gICAgICAgIGlmIChyZXBsLnRleHQgPT09ICd0cnVlJyB8fCByZXBsLnRleHQgPT09ICdmYWxzZScpXG4gICAgICAgICAgcmVwbC50ZXh0ID0gJyEhJyArIHJlcGwudGV4dDtcbiAgICAgICAgZWxzZSBpZiAocmVwbC50ZXh0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBKU09OLnN0cmluZ2lmeSh1bmRlZmluZWQpIHdpbGwgbm90IHJldHVybiBzdHJpbmcgb2YgXCJ1bmRlZmluZWRcIiwgYnV0IGFjdHVhbCB1bmRlZmluZWRcbiAgICAgICAgICByZXBsLnRleHQgPSAndW5kZWZpbmVkJztcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaChleCkge1xuICAgICAgICBsb2cuZXJyb3IoJ0V2YWx1YXRlICVzLCByZXN1bHQ6Jywgb3JpZ1RleHQsIHJlcyk7XG4gICAgICAgIHRocm93IGV4O1xuICAgICAgfVxuICAgICAgbG9nLmRlYnVnKGBFdmFsdWF0ZSBcIiR7Y2hhbGsueWVsbG93KG9yaWdUZXh0KX1cIiB0bzogJHtjaGFsay5jeWFuKHJlcGwudGV4dCl9IGluXFxuXFx0YCArXG4gICAgICAgIFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZmlsZSkpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmltcG9ydFRyYW5zcGlsZXIpXG4gICAgICB0aGlzLmltcG9ydFRyYW5zcGlsZXIucGFyc2UoYXN0LCByZXBsYWNlbWVudHMpO1xuXG4gICAgaWYgKHJlcGxhY2VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICByZXR1cm4gc291cmNlO1xuICAgIHRleHRQYXRjaGVyLl9zb3J0QW5kUmVtb3ZlT3ZlcmxhcChyZXBsYWNlbWVudHMsIHRydWUsIHNvdXJjZSk7XG4gICAgcmV0dXJuIHRleHRQYXRjaGVyLl9yZXBsYWNlU29ydGVkKHNvdXJjZSwgcmVwbGFjZW1lbnRzKTtcbiAgfVxuXG4gIC8vIGdldEFwaUZvckZpbGUoZmlsZTogc3RyaW5nKSB7XG4gIC8vICAgYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuICAvLyB9XG5cbiAgcHJvdGVjdGVkIHRyYXZlcnNlVHNBc3QoYXN0OiB0cy5Ob2RlLFxuICAgIHJlcGxhY2VDb250ZXh0OiB7W2tleTogc3RyaW5nXTogYW55fSxcbiAgICByZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW10sXG4gICAgYXN0UG9zaXRpb25Db252ZXJ0PzogKHBvczogbnVtYmVyKSA9PiBudW1iZXIsXG4gICAgbGV2ZWwgPSAwXG4gICAgKSB7XG4gICAgdHJ5IHtcbiAgICAgIGlmIChhc3Qua2luZCA9PT0gc2suUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uIHx8IGFzdC5raW5kID09PSBzay5FbGVtZW50QWNjZXNzRXhwcmVzc2lvbikge1xuICAgICAgICBjb25zdCBub2RlID0gYXN0IGFzICh0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24gfCB0cy5FbGVtZW50QWNjZXNzRXhwcmVzc2lvbik7XG4gICAgICAgIGlmIChub2RlLmV4cHJlc3Npb24ua2luZCA9PT0gc2suSWRlbnRpZmllciAmJiBoYXMocmVwbGFjZUNvbnRleHQsIG5vZGUuZXhwcmVzc2lvbi5nZXRUZXh0KCkpKSB7XG4gICAgICAgICAgLy8ga2VlcCBsb29raW5nIHVwIGZvciBwYXJlbnRzIHVudGlsIGl0IGlzIG5vdCBDYWxsRXhwcmVzc2lvbiwgRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24gb3IgUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uXG4gICAgICAgICAgY29uc3QgZXZhbHVhdGVOb2RlID0gdGhpcy5nb1VwVG9QYXJlbnRFeHAobm9kZSk7XG4gICAgICAgICAgbGV0IHN0YXJ0ID0gZXZhbHVhdGVOb2RlLmdldFN0YXJ0KCk7XG4gICAgICAgICAgbGV0IGVuZCA9IGV2YWx1YXRlTm9kZS5nZXRFbmQoKTtcbiAgICAgICAgICBjb25zdCBsZW4gPSBlbmQgLSBzdGFydDtcbiAgICAgICAgICBpZiAoYXN0UG9zaXRpb25Db252ZXJ0KSB7XG4gICAgICAgICAgICBzdGFydCA9IGFzdFBvc2l0aW9uQ29udmVydChzdGFydCk7XG4gICAgICAgICAgICBlbmQgPSBzdGFydCArIGxlbjtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVwbGFjZW1lbnRzLnB1c2goe3N0YXJ0LCBlbmQsIHRleHQ6IGV2YWx1YXRlTm9kZS5nZXRUZXh0KCl9KTtcbiAgICAgICAgICByZXR1cm4gcmVwbGFjZW1lbnRzO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nLmVycm9yKCd0cmF2ZXJzZVRzQXN0IGZhaWx1cmUnLCBlKTtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuICAgIGFzdC5mb3JFYWNoQ2hpbGQoKHN1YjogdHMuTm9kZSkgPT4ge1xuICAgICAgdGhpcy50cmF2ZXJzZVRzQXN0KHN1YiwgcmVwbGFjZUNvbnRleHQsIHJlcGxhY2VtZW50cywgYXN0UG9zaXRpb25Db252ZXJ0LCBsZXZlbCArIDEpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG5cdCAqIGtlZXAgbG9va2luZyB1cCBmb3IgcGFyZW50cyB1bnRpbCBpdCBpcyBub3QgQ2FsbEV4cHJlc3Npb24sIEVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uIG9yIFByb3BlcnR5QWNjZXNzRXhwcmVzc2lvblxuXHQgKi9cbiAgcHJvdGVjdGVkIGdvVXBUb1BhcmVudEV4cCh0YXJnZXQ6IHRzLk5vZGUpOiB0cy5Ob2RlIHtcbiAgICBsZXQgY3Vyck5vZGUgPSB0YXJnZXQ7XG4gICAgd2hpbGUodHJ1ZSkge1xuICAgICAgY29uc3Qga2luZCA9IGN1cnJOb2RlLnBhcmVudC5raW5kO1xuICAgICAgaWYgKGtpbmQgPT09IHNrLkNhbGxFeHByZXNzaW9uICYmIChjdXJyTm9kZS5wYXJlbnQgYXMgdHMuQ2FsbEV4cHJlc3Npb24pLmV4cHJlc3Npb24gPT09IGN1cnJOb2RlIHx8XG4gICAgICAgIGtpbmQgPT09IHNrLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiAmJiAoY3Vyck5vZGUucGFyZW50IGFzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikuZXhwcmVzc2lvbiA9PT0gY3Vyck5vZGUgfHxcbiAgICAgICAga2luZCA9PT0gc2suRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24gJiYgKGN1cnJOb2RlLnBhcmVudCBhcyB0cy5FbGVtZW50QWNjZXNzRXhwcmVzc2lvbikuZXhwcmVzc2lvbiA9PT0gY3Vyck5vZGUpIHtcbiAgICAgICAgY3Vyck5vZGUgPSBjdXJyTm9kZS5wYXJlbnQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGN1cnJOb2RlO1xuICB9XG59XG4iXX0=