"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const ts = tslib_1.__importStar(require("typescript"));
const typescript_1 = require("typescript");
const patch_text_1 = tslib_1.__importStar(require("./patch-text")), textPatcher = patch_text_1;
const __api_1 = tslib_1.__importDefault(require("__api"));
const vm = require("vm");
const path_1 = require("path");
const default_import_ts_transpiler_1 = tslib_1.__importDefault(require("./default-import-ts-transpiler"));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy91dGlscy90cy1iZWZvcmUtYW90LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHVEQUFpQztBQUNqQywyQ0FBNEM7QUFDNUMsK0ZBQXlEO0FBRXpELDBEQUFtQztBQUNuQyx5QkFBMEI7QUFDMUIsK0JBQWdEO0FBQ2hELDBHQUFtRTtBQUVuRSxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDL0IsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLG1CQUFtQixDQUFDLENBQUM7QUFLL0UsU0FBUyxnQkFBZ0I7SUFDdkIsTUFBTSxLQUFLLEdBQStCLEVBQUUsQ0FBQztJQUM3QyxLQUFLLE1BQU0sRUFBRSxJQUFJLGVBQUcsQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFO1FBQzNDLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRTtZQUM5QixNQUFNLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM1RCxNQUFNLElBQUksR0FBRyxjQUFPLENBQUMsRUFBRSxDQUFDLGVBQWUsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUNuRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFjLENBQUM7WUFDcEQsS0FBSyxDQUFDLElBQUksQ0FBQztnQkFDVCxJQUFJLEdBQUcsR0FBRyxHQUFHLFVBQVU7Z0JBQ3ZCLElBQUk7YUFDTCxDQUFDLENBQUM7U0FDSjtLQUNGO0lBQ0QsT0FBTyxLQUFLLENBQUM7QUFDZixDQUFDO0FBRUQsSUFBSSxVQUFzQyxDQUFDO0FBRTNDLE1BQXFCLGNBQWM7SUFP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RSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDckMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7O1NBRUU7SUFDUSxtQkFBbUIsQ0FBQyxNQUFlO1FBQzNDLElBQUksUUFBUSxHQUFHLE1BQU0sQ0FBQztRQUN0QixPQUFNLElBQUksRUFBRTtZQUNWLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1lBQ2xDLElBQUksSUFBSSxLQUFLLHVCQUFFLENBQUMsY0FBYyxJQUFLLFFBQVEsQ0FBQyxNQUE0QixDQUFDLFVBQVUsS0FBSyxRQUFRO2dCQUM5RixJQUFJLEtBQUssdUJBQUUsQ0FBQyx3QkFBd0IsSUFBSyxRQUFRLENBQUMsTUFBc0MsQ0FBQyxVQUFVLEtBQUssUUFBUTtnQkFDaEgsSUFBSSxLQUFLLHVCQUFFLENBQUMsdUJBQXVCLElBQUssUUFBUSxDQUFDLE1BQXFDLENBQUMsVUFBVSxLQUFLLFFBQVEsRUFBRTtnQkFDaEgsUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7YUFDNUI7aUJBQU07Z0JBQ0wsTUFBTTthQUNQO1NBQ0Y7UUFDRCxPQUFPLFFBQVEsQ0FBQztJQUNsQixDQUFDO0NBQ0Y7QUF6SEQsaUNBeUhDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3V0aWxzL3RzLWJlZm9yZS1hb3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7U3ludGF4S2luZCBhcyBza30gZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgcmVwbGFjZUNvZGUsICogYXMgdGV4dFBhdGNoZXIgZnJvbSAnLi9wYXRjaC10ZXh0JztcbmltcG9ydCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJy4vcGF0Y2gtdGV4dCc7XG5pbXBvcnQgYXBpLCB7RHJjcEFwaX0gZnJvbSAnX19hcGknO1xuaW1wb3J0IHZtID0gcmVxdWlyZSgndm0nKTtcbmltcG9ydCB7ZGlybmFtZSwgcmVsYXRpdmUsIHJlc29sdmV9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IEltcG9ydENsYXVzZVRyYW5zcGlsZSBmcm9tICcuL2RlZmF1bHQtaW1wb3J0LXRzLXRyYW5zcGlsZXInO1xuXG5jb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5hcGktYW90LWNvbXBpbGVyJyk7XG5cbmV4cG9ydCB7UmVwbGFjZW1lbnRJbmZ9O1xuZXhwb3J0IHR5cGUgVHNIYW5kbGVyID0gKGFzdDogdHMuU291cmNlRmlsZSkgPT4gUmVwbGFjZW1lbnRJbmZbXTtcblxuZnVuY3Rpb24gY3JlYXRlVHNIYW5kbGVycygpOiBBcnJheTxbc3RyaW5nLCBUc0hhbmRsZXJdPiB7XG4gIGNvbnN0IGZ1bmNzOiBBcnJheTxbc3RyaW5nLCBUc0hhbmRsZXJdPiA9IFtdO1xuICBmb3IgKGNvbnN0IHBrIG9mIGFwaS5wYWNrYWdlSW5mby5hbGxNb2R1bGVzKSB7XG4gICAgaWYgKHBrLmRyICYmIHBrLmRyLm5nVHNIYW5kbGVyKSB7XG4gICAgICBjb25zdCBbZmlsZVBhdGgsIGV4cG9ydE5hbWVdID0gcGsuZHIubmdUc0hhbmRsZXIuc3BsaXQoJyMnKTtcbiAgICAgIGNvbnN0IHBhdGggPSByZXNvbHZlKHBrLnJlYWxQYWNrYWdlUGF0aCwgZmlsZVBhdGgpO1xuICAgICAgY29uc3QgZnVuYyA9IHJlcXVpcmUocGF0aClbZXhwb3J0TmFtZV0gYXMgVHNIYW5kbGVyO1xuICAgICAgZnVuY3MucHVzaChbXG4gICAgICAgIHBhdGggKyAnIycgKyBleHBvcnROYW1lLFxuICAgICAgICBmdW5jXG4gICAgICBdKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZ1bmNzO1xufVxuXG5sZXQgdHNIYW5kbGVyczogQXJyYXk8W3N0cmluZywgVHNIYW5kbGVyXT47XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFwaUFvdENvbXBpbGVyIHtcbiAgYXN0OiB0cy5Tb3VyY2VGaWxlO1xuXG4gIHJlcGxhY2VtZW50czogdGV4dFBhdGNoZXIuUmVwbGFjZW1lbnRJbmZbXSA9IFtdO1xuXG4gIGltcG9ydFRyYW5zcGlsZXI6IEltcG9ydENsYXVzZVRyYW5zcGlsZTtcblxuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgZmlsZTogc3RyaW5nLCBwcm90ZWN0ZWQgc3JjOiBzdHJpbmcpIHtcbiAgICBpZiAoYXBpLnNzcikge1xuICAgICAgdGhpcy5pbXBvcnRUcmFuc3BpbGVyID0gbmV3IEltcG9ydENsYXVzZVRyYW5zcGlsZSh7XG4gICAgICAgIGZpbGU6IHRoaXMuZmlsZSxcbiAgICAgICAgbW9kdWxlczogWy9ebG9kYXNoKD86XFwvfCQpL11cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHBhcnNlKHRyYW5zcGlsZUV4cDogKHNvdXJjZTogc3RyaW5nKSA9PiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBrID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKHRoaXMuZmlsZSk7XG4gICAgaWYgKHBrID09IG51bGwpXG4gICAgICByZXR1cm4gdGhpcy5zcmM7XG4gICAgaWYgKCF0c0hhbmRsZXJzKVxuICAgICAgdHNIYW5kbGVycyA9IGNyZWF0ZVRzSGFuZGxlcnMoKTtcblxuICAgIHRoaXMuYXN0ID0gdHMuY3JlYXRlU291cmNlRmlsZSh0aGlzLmZpbGUsIHRoaXMuc3JjLCB0cy5TY3JpcHRUYXJnZXQuRVNOZXh0LFxuICAgICAgdHJ1ZSwgdHMuU2NyaXB0S2luZC5UU1gpO1xuICAgIHRoaXMuX2NhbGxUc0hhbmRsZXJzKHRzSGFuZGxlcnMpO1xuXG4gICAgZm9yKGNvbnN0IHN0bSBvZiB0aGlzLmFzdC5zdGF0ZW1lbnRzKSB7XG4gICAgICB0aGlzLnRyYXZlcnNlVHNBc3Qoc3RtKTtcbiAgICB9XG4gICAgdGV4dFBhdGNoZXIuX3NvcnRBbmRSZW1vdmVPdmVybGFwKHRoaXMucmVwbGFjZW1lbnRzLCB0cnVlLCB0aGlzLnNyYyk7XG4gICAgLy8gUmVtb3ZlIG92ZXJsYXBlZCByZXBsYWNlbWVudHMgdG8gYXZvaWQgdGhlbSBnZXR0aW5nIGludG8gbGF0ZXIgYHZtLnJ1bkluTmV3Q29udGV4dCgpYCxcbiAgICAvLyBXZSBkb24ndCB3YW50IHRvIHNpbmdsZSBvdXQgYW5kIGV2YWx1YXRlIGxvd2VyIGxldmVsIGV4cHJlc3Npb24gbGlrZSBgX19hcGkucGFja2FnZU5hbWVgIGZyb21cbiAgICAvLyBgX19hcGkuY29uZmlnLmdldChfX2FwaS5wYWNrYWdlTmFtZSlgLCB3ZSBqdXN0IGV2YWx1YXRlIHRoZSB3aG9sZSBsYXR0ZXIgZXhwcmVzc2lvblxuXG4gICAgY29uc3Qgbm9kZUFwaSA9IGFwaS5nZXROb2RlQXBpRm9yUGFja2FnZTxEcmNwQXBpPihwayk7XG4gICAgbm9kZUFwaS5fX2Rpcm5hbWUgPSBkaXJuYW1lKHRoaXMuZmlsZSk7XG4gICAgY29uc3QgY29udGV4dCA9IHZtLmNyZWF0ZUNvbnRleHQoe19fYXBpOiBub2RlQXBpfSk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGwgb2YgdGhpcy5yZXBsYWNlbWVudHMpIHtcbiAgICAgIGNvbnN0IG9yaWdUZXh0ID0gcmVwbC50ZXh0ITtcbiAgICAgIGxldCByZXM7XG4gICAgICB0cnkge1xuICAgICAgICByZXMgPSB2bS5ydW5Jbk5ld0NvbnRleHQodHJhbnNwaWxlRXhwKG9yaWdUZXh0KSwgY29udGV4dCk7XG4gICAgICAgIHJlcGwudGV4dCA9IEpTT04uc3RyaW5naWZ5KHJlcyk7XG4gICAgICAgIC8vIFRvIGJ5cGFzcyBUUyBlcnJvciBcIlVucmVhY2hhYmxlIGNvZGUgZGV0ZWN0ZWRcIiBpZlxuICAgICAgICAvLyBjb21waWxlciBvcHRpb24gXCJhbGxvd1VucmVhY2hhYmxlQ29kZTogZmFsc2VcIlxuICAgICAgICAvLyBlLmcuIGlmIChmYWxzZSkgey4uLn0gLS0+IGlmICghIWZhbHNlKSB7Li4ufVxuICAgICAgICBpZiAocmVwbC50ZXh0ID09PSAndHJ1ZScgfHwgcmVwbC50ZXh0ID09PSAnZmFsc2UnKVxuICAgICAgICAgIHJlcGwudGV4dCA9ICchIScgKyByZXBsLnRleHQ7XG4gICAgICAgIGVsc2UgaWYgKHJlcGwudGV4dCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gSlNPTi5zdHJpbmdpZnkodW5kZWZpbmVkKSB3aWxsIG5vdCByZXR1cm4gc3RyaW5nIG9mIFwidW5kZWZpbmVkXCIsIGJ1dCBhY3R1YWwgdW5kZWZpbmVkXG4gICAgICAgICAgcmVwbC50ZXh0ID0gJ3VuZGVmaW5lZCc7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2goZXgpIHtcbiAgICAgICAgbG9nLmVycm9yKCdFdmFsdWF0ZSAlcywgcmVzdWx0OicsIG9yaWdUZXh0LCByZXMpO1xuICAgICAgICB0aHJvdyBleDtcbiAgICAgIH1cbiAgICAgIGxvZy5pbmZvKGBFdmFsdWF0ZSBcIiR7Y2hhbGsueWVsbG93KG9yaWdUZXh0KX1cIiB0bzogJHtjaGFsay5jeWFuKHJlcGwudGV4dCl9IGluXFxuXFx0YCArXG4gICAgICAgIHJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHRoaXMuZmlsZSkpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmltcG9ydFRyYW5zcGlsZXIpXG4gICAgICB0aGlzLmltcG9ydFRyYW5zcGlsZXIucGFyc2UodGhpcy5hc3QsIHRoaXMucmVwbGFjZW1lbnRzKTtcblxuICAgIGlmICh0aGlzLnJlcGxhY2VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICByZXR1cm4gdGhpcy5zcmM7XG4gICAgdGV4dFBhdGNoZXIuX3NvcnRBbmRSZW1vdmVPdmVybGFwKHRoaXMucmVwbGFjZW1lbnRzLCB0cnVlLCB0aGlzLnNyYyk7XG4gICAgcmV0dXJuIHRleHRQYXRjaGVyLl9yZXBsYWNlU29ydGVkKHRoaXMuc3JjLCB0aGlzLnJlcGxhY2VtZW50cyk7XG4gIH1cblxuICBnZXRBcGlGb3JGaWxlKGZpbGU6IHN0cmluZykge1xuICAgIGFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBfY2FsbFRzSGFuZGxlcnModHNIYW5kbGVyczogQXJyYXk8W3N0cmluZywgVHNIYW5kbGVyXT4pOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCBmdW5jXSBvZiB0c0hhbmRsZXJzKSB7XG4gICAgICBjb25zdCBjaGFuZ2UgPSBmdW5jKHRoaXMuYXN0KTtcbiAgICAgIGlmIChjaGFuZ2UgJiYgY2hhbmdlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgbG9nLmluZm8oJyVzIGlzIGNoYW5nZWQgYnkgJXMnLCBjaGFsay5jeWFuKHRoaXMuYXN0LmZpbGVOYW1lKSwgY2hhbGsuYmx1ZShuYW1lKSk7XG4gICAgICAgIHRoaXMuc3JjID0gcmVwbGFjZUNvZGUodGhpcy5zcmMsIGNoYW5nZSk7XG4gICAgICAgIHRoaXMuYXN0ID0gdHMuY3JlYXRlU291cmNlRmlsZSh0aGlzLmZpbGUsIHRoaXMuc3JjLCB0cy5TY3JpcHRUYXJnZXQuRVNOZXh0LFxuICAgICAgICAgIHRydWUsIHRzLlNjcmlwdEtpbmQuVFNYKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgdHJhdmVyc2VUc0FzdChhc3Q6IHRzLk5vZGUsIGxldmVsID0gMCkge1xuICAgIGlmIChhc3Qua2luZCA9PT0gc2suUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uIHx8IGFzdC5raW5kID09PSBzay5FbGVtZW50QWNjZXNzRXhwcmVzc2lvbikge1xuICAgICAgY29uc3Qgbm9kZSA9IGFzdCBhcyAodHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uIHwgdHMuRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24pO1xuICAgICAgaWYgKG5vZGUuZXhwcmVzc2lvbi5raW5kID09PSBzay5JZGVudGlmaWVyICYmIG5vZGUuZXhwcmVzc2lvbi5nZXRUZXh0KHRoaXMuYXN0KSA9PT0gJ19fYXBpJykge1xuICAgICAgICAvLyBrZWVwIGxvb2tpbmcgdXAgZm9yIHBhcmVudHMgdW50aWwgaXQgaXMgbm90IENhbGxFeHByZXNzaW9uLCBFbGVtZW50QWNjZXNzRXhwcmVzc2lvbiBvciBQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb25cbiAgICAgICAgY29uc3QgZXZhbHVhdGVOb2RlID0gdGhpcy5nb1VwVG9QYXJlbnRFeHByZXNzKG5vZGUpO1xuICAgICAgICB0aGlzLnJlcGxhY2VtZW50cy5wdXNoKHtzdGFydDogZXZhbHVhdGVOb2RlLmdldFN0YXJ0KHRoaXMuYXN0KSxcbiAgICAgICAgICBlbmQ6IGV2YWx1YXRlTm9kZS5nZXRFbmQoKSxcbiAgICAgICAgICB0ZXh0OiBldmFsdWF0ZU5vZGUuZ2V0VGV4dCh0aGlzLmFzdCl9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICBhc3QuZm9yRWFjaENoaWxkKChzdWI6IHRzLk5vZGUpID0+IHtcbiAgICAgIHRoaXMudHJhdmVyc2VUc0FzdChzdWIsIGxldmVsICsgMSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcblx0ICoga2VlcCBsb29raW5nIHVwIGZvciBwYXJlbnRzIHVudGlsIGl0IGlzIG5vdCBDYWxsRXhwcmVzc2lvbiwgRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24gb3IgUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uXG5cdCAqL1xuICBwcm90ZWN0ZWQgZ29VcFRvUGFyZW50RXhwcmVzcyh0YXJnZXQ6IHRzLk5vZGUpOiB0cy5Ob2RlIHtcbiAgICBsZXQgY3Vyck5vZGUgPSB0YXJnZXQ7XG4gICAgd2hpbGUodHJ1ZSkge1xuICAgICAgY29uc3Qga2luZCA9IGN1cnJOb2RlLnBhcmVudC5raW5kO1xuICAgICAgaWYgKGtpbmQgPT09IHNrLkNhbGxFeHByZXNzaW9uICYmIChjdXJyTm9kZS5wYXJlbnQgYXMgdHMuQ2FsbEV4cHJlc3Npb24pLmV4cHJlc3Npb24gPT09IGN1cnJOb2RlIHx8XG4gICAgICAgIGtpbmQgPT09IHNrLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiAmJiAoY3Vyck5vZGUucGFyZW50IGFzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikuZXhwcmVzc2lvbiA9PT0gY3Vyck5vZGUgfHxcbiAgICAgICAga2luZCA9PT0gc2suRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24gJiYgKGN1cnJOb2RlLnBhcmVudCBhcyB0cy5FbGVtZW50QWNjZXNzRXhwcmVzc2lvbikuZXhwcmVzc2lvbiA9PT0gY3Vyck5vZGUpIHtcbiAgICAgICAgY3Vyck5vZGUgPSBjdXJyTm9kZS5wYXJlbnQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGN1cnJOb2RlO1xuICB9XG59XG4iXX0=
