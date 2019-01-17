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
        textPatcher._sortAndRemoveOverlap(this.replacements);
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
        textPatcher._sortAndRemoveOverlap(this.replacements);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy91dGlscy90cy1iZWZvcmUtYW90LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHVEQUFpQztBQUNqQywyQ0FBNEM7QUFDNUMsK0ZBQXlEO0FBRXpELDBEQUFtQztBQUNuQyx5QkFBMEI7QUFDMUIsK0JBQWdEO0FBQ2hELDBHQUFtRTtBQUVuRSxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDL0IsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLG1CQUFtQixDQUFDLENBQUM7QUFLL0UsU0FBUyxnQkFBZ0I7SUFDeEIsTUFBTSxLQUFLLEdBQStCLEVBQUUsQ0FBQztJQUM3QyxLQUFLLE1BQU0sRUFBRSxJQUFJLGVBQUcsQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFO1FBQzVDLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRTtZQUMvQixNQUFNLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM1RCxNQUFNLElBQUksR0FBRyxjQUFPLENBQUMsRUFBRSxDQUFDLGVBQWUsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUNuRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFjLENBQUM7WUFDcEQsS0FBSyxDQUFDLElBQUksQ0FBQztnQkFDVixJQUFJLEdBQUcsR0FBRyxHQUFHLFVBQVU7Z0JBQ3ZCLElBQUk7YUFDSixDQUFDLENBQUM7U0FDSDtLQUNEO0lBQ0QsT0FBTyxLQUFLLENBQUM7QUFDZCxDQUFDO0FBRUQsSUFBSSxVQUFzQyxDQUFDO0FBRTNDLE1BQXFCLGNBQWM7SUFP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RUQ7O09BRUc7SUFDTyxtQkFBbUIsQ0FBQyxNQUFlO1FBQzVDLElBQUksUUFBUSxHQUFHLE1BQU0sQ0FBQztRQUN0QixPQUFNLElBQUksRUFBRTtZQUNYLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1lBQ2xDLElBQUksSUFBSSxLQUFLLHVCQUFFLENBQUMsY0FBYyxJQUFLLFFBQVEsQ0FBQyxNQUE0QixDQUFDLFVBQVUsS0FBSyxRQUFRO2dCQUMvRixJQUFJLEtBQUssdUJBQUUsQ0FBQyx3QkFBd0IsSUFBSyxRQUFRLENBQUMsTUFBc0MsQ0FBQyxVQUFVLEtBQUssUUFBUTtnQkFDaEgsSUFBSSxLQUFLLHVCQUFFLENBQUMsdUJBQXVCLElBQUssUUFBUSxDQUFDLE1BQXFDLENBQUMsVUFBVSxLQUFLLFFBQVEsRUFBRTtnQkFDaEgsUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7YUFDM0I7aUJBQU07Z0JBQ04sTUFBTTthQUNOO1NBQ0Q7UUFDRCxPQUFPLFFBQVEsQ0FBQztJQUNqQixDQUFDO0NBQ0Q7QUF6SEQsaUNBeUhDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3V0aWxzL3RzLWJlZm9yZS1hb3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7U3ludGF4S2luZCBhcyBza30gZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgcmVwbGFjZUNvZGUsICogYXMgdGV4dFBhdGNoZXIgZnJvbSAnLi9wYXRjaC10ZXh0JztcbmltcG9ydCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJy4vcGF0Y2gtdGV4dCc7XG5pbXBvcnQgYXBpLCB7RHJjcEFwaX0gZnJvbSAnX19hcGknO1xuaW1wb3J0IHZtID0gcmVxdWlyZSgndm0nKTtcbmltcG9ydCB7ZGlybmFtZSwgcmVsYXRpdmUsIHJlc29sdmV9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IEltcG9ydENsYXVzZVRyYW5zcGlsZSBmcm9tICcuL2RlZmF1bHQtaW1wb3J0LXRzLXRyYW5zcGlsZXInO1xuXG5jb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5hcGktYW90LWNvbXBpbGVyJyk7XG5cbmV4cG9ydCB7UmVwbGFjZW1lbnRJbmZ9O1xuZXhwb3J0IHR5cGUgVHNIYW5kbGVyID0gKGFzdDogdHMuU291cmNlRmlsZSkgPT4gUmVwbGFjZW1lbnRJbmZbXTtcblxuZnVuY3Rpb24gY3JlYXRlVHNIYW5kbGVycygpOiBBcnJheTxbc3RyaW5nLCBUc0hhbmRsZXJdPiB7XG5cdGNvbnN0IGZ1bmNzOiBBcnJheTxbc3RyaW5nLCBUc0hhbmRsZXJdPiA9IFtdO1xuXHRmb3IgKGNvbnN0IHBrIG9mIGFwaS5wYWNrYWdlSW5mby5hbGxNb2R1bGVzKSB7XG5cdFx0aWYgKHBrLmRyICYmIHBrLmRyLm5nVHNIYW5kbGVyKSB7XG5cdFx0XHRjb25zdCBbZmlsZVBhdGgsIGV4cG9ydE5hbWVdID0gcGsuZHIubmdUc0hhbmRsZXIuc3BsaXQoJyMnKTtcblx0XHRcdGNvbnN0IHBhdGggPSByZXNvbHZlKHBrLnJlYWxQYWNrYWdlUGF0aCwgZmlsZVBhdGgpO1xuXHRcdFx0Y29uc3QgZnVuYyA9IHJlcXVpcmUocGF0aClbZXhwb3J0TmFtZV0gYXMgVHNIYW5kbGVyO1xuXHRcdFx0ZnVuY3MucHVzaChbXG5cdFx0XHRcdHBhdGggKyAnIycgKyBleHBvcnROYW1lLFxuXHRcdFx0XHRmdW5jXG5cdFx0XHRdKTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIGZ1bmNzO1xufVxuXG5sZXQgdHNIYW5kbGVyczogQXJyYXk8W3N0cmluZywgVHNIYW5kbGVyXT47XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFwaUFvdENvbXBpbGVyIHtcblx0YXN0OiB0cy5Tb3VyY2VGaWxlO1xuXG5cdHJlcGxhY2VtZW50czogdGV4dFBhdGNoZXIuUmVwbGFjZW1lbnRJbmZbXSA9IFtdO1xuXG5cdGltcG9ydFRyYW5zcGlsZXI6IEltcG9ydENsYXVzZVRyYW5zcGlsZTtcblxuXHRjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgZmlsZTogc3RyaW5nLCBwcm90ZWN0ZWQgc3JjOiBzdHJpbmcpIHtcblx0XHRpZiAoYXBpLnNzcikge1xuXHRcdFx0dGhpcy5pbXBvcnRUcmFuc3BpbGVyID0gbmV3IEltcG9ydENsYXVzZVRyYW5zcGlsZSh7XG5cdFx0XHRcdGZpbGU6IHRoaXMuZmlsZSxcblx0XHRcdFx0bW9kdWxlczogWy9ebG9kYXNoKD86XFwvfCQpL11cblx0XHRcdH0pO1xuXHRcdH1cblx0fVxuXG5cdHBhcnNlKHRyYW5zcGlsZUV4cDogKHNvdXJjZTogc3RyaW5nKSA9PiBzdHJpbmcpOiBzdHJpbmcge1xuXHRcdGNvbnN0IHBrID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKHRoaXMuZmlsZSk7XG5cdFx0aWYgKHBrID09IG51bGwpXG5cdFx0XHRyZXR1cm4gdGhpcy5zcmM7XG5cdFx0aWYgKCF0c0hhbmRsZXJzKVxuXHRcdFx0dHNIYW5kbGVycyA9IGNyZWF0ZVRzSGFuZGxlcnMoKTtcblxuXHRcdHRoaXMuYXN0ID0gdHMuY3JlYXRlU291cmNlRmlsZSh0aGlzLmZpbGUsIHRoaXMuc3JjLCB0cy5TY3JpcHRUYXJnZXQuRVNOZXh0LFxuXHRcdFx0dHJ1ZSwgdHMuU2NyaXB0S2luZC5UU1gpO1xuXHRcdHRoaXMuX2NhbGxUc0hhbmRsZXJzKHRzSGFuZGxlcnMpO1xuXG5cdFx0Zm9yKGNvbnN0IHN0bSBvZiB0aGlzLmFzdC5zdGF0ZW1lbnRzKSB7XG5cdFx0XHR0aGlzLnRyYXZlcnNlVHNBc3Qoc3RtKTtcblx0XHR9XG5cdFx0dGV4dFBhdGNoZXIuX3NvcnRBbmRSZW1vdmVPdmVybGFwKHRoaXMucmVwbGFjZW1lbnRzKTtcblx0XHQvLyBSZW1vdmUgb3ZlcmxhcGVkIHJlcGxhY2VtZW50cyB0byBhdm9pZCB0aGVtIGdldHRpbmcgaW50byBsYXRlciBgdm0ucnVuSW5OZXdDb250ZXh0KClgLFxuXHRcdC8vIFdlIGRvbid0IHdhbnQgdG8gc2luZ2xlIG91dCBhbmQgZXZhbHVhdGUgbG93ZXIgbGV2ZWwgZXhwcmVzc2lvbiBsaWtlIGBfX2FwaS5wYWNrYWdlTmFtZWAgZnJvbVxuXHRcdC8vIGBfX2FwaS5jb25maWcuZ2V0KF9fYXBpLnBhY2thZ2VOYW1lKWAsIHdlIGp1c3QgZXZhbHVhdGUgdGhlIHdob2xlIGxhdHRlciBleHByZXNzaW9uXG5cblx0XHRjb25zdCBub2RlQXBpID0gYXBpLmdldE5vZGVBcGlGb3JQYWNrYWdlPERyY3BBcGk+KHBrKTtcblx0XHRub2RlQXBpLl9fZGlybmFtZSA9IGRpcm5hbWUodGhpcy5maWxlKTtcblx0XHRjb25zdCBjb250ZXh0ID0gdm0uY3JlYXRlQ29udGV4dCh7X19hcGk6IG5vZGVBcGl9KTtcblxuXHRcdGZvciAoY29uc3QgcmVwbCBvZiB0aGlzLnJlcGxhY2VtZW50cykge1xuXHRcdFx0Y29uc3Qgb3JpZ1RleHQgPSByZXBsLnRleHQ7XG5cdFx0XHRsZXQgcmVzO1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0cmVzID0gdm0ucnVuSW5OZXdDb250ZXh0KHRyYW5zcGlsZUV4cChvcmlnVGV4dCksIGNvbnRleHQpO1xuXHRcdFx0XHRyZXBsLnRleHQgPSBKU09OLnN0cmluZ2lmeShyZXMpO1xuXHRcdFx0XHQvLyBUbyBieXBhc3MgVFMgZXJyb3IgXCJVbnJlYWNoYWJsZSBjb2RlIGRldGVjdGVkXCIgaWZcblx0XHRcdFx0Ly8gY29tcGlsZXIgb3B0aW9uIFwiYWxsb3dVbnJlYWNoYWJsZUNvZGU6IGZhbHNlXCJcblx0XHRcdFx0Ly8gZS5nLiBpZiAoZmFsc2UpIHsuLi59IC0tPiBpZiAoISFmYWxzZSkgey4uLn1cblx0XHRcdFx0aWYgKHJlcGwudGV4dCA9PT0gJ3RydWUnIHx8IHJlcGwudGV4dCA9PT0gJ2ZhbHNlJylcblx0XHRcdFx0XHRyZXBsLnRleHQgPSAnISEnICsgcmVwbC50ZXh0O1xuXHRcdFx0XHRlbHNlIGlmIChyZXBsLnRleHQgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdC8vIEpTT04uc3RyaW5naWZ5KHVuZGVmaW5lZCkgd2lsbCBub3QgcmV0dXJuIHN0cmluZyBvZiBcInVuZGVmaW5lZFwiLCBidXQgYWN0dWFsIHVuZGVmaW5lZFxuXHRcdFx0XHRcdHJlcGwudGV4dCA9ICd1bmRlZmluZWQnO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGNhdGNoKGV4KSB7XG5cdFx0XHRcdGxvZy5lcnJvcignRXZhbHVhdGUgJXMsIHJlc3VsdDonLCBvcmlnVGV4dCwgcmVzKTtcblx0XHRcdFx0dGhyb3cgZXg7XG5cdFx0XHR9XG5cdFx0XHRsb2cuaW5mbyhgRXZhbHVhdGUgXCIke2NoYWxrLnllbGxvdyhvcmlnVGV4dCl9XCIgdG86ICR7Y2hhbGsuY3lhbihyZXBsLnRleHQpfSBpblxcblxcdGAgK1xuXHRcdFx0XHRyZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCB0aGlzLmZpbGUpKTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5pbXBvcnRUcmFuc3BpbGVyKVxuXHRcdFx0dGhpcy5pbXBvcnRUcmFuc3BpbGVyLnBhcnNlKHRoaXMuYXN0LCB0aGlzLnJlcGxhY2VtZW50cyk7XG5cblx0XHRpZiAodGhpcy5yZXBsYWNlbWVudHMubGVuZ3RoID09PSAwKVxuXHRcdFx0cmV0dXJuIHRoaXMuc3JjO1xuXHRcdHRleHRQYXRjaGVyLl9zb3J0QW5kUmVtb3ZlT3ZlcmxhcCh0aGlzLnJlcGxhY2VtZW50cyk7XG5cdFx0cmV0dXJuIHRleHRQYXRjaGVyLl9yZXBsYWNlU29ydGVkKHRoaXMuc3JjLCB0aGlzLnJlcGxhY2VtZW50cyk7XG5cdH1cblxuXHRnZXRBcGlGb3JGaWxlKGZpbGU6IHN0cmluZykge1xuXHRcdGFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcblx0fVxuXG5cdHByb3RlY3RlZCBfY2FsbFRzSGFuZGxlcnModHNIYW5kbGVyczogQXJyYXk8W3N0cmluZywgVHNIYW5kbGVyXT4pOiB2b2lkIHtcblx0XHRmb3IgKGNvbnN0IFtuYW1lLCBmdW5jXSBvZiB0c0hhbmRsZXJzKSB7XG5cdFx0XHRjb25zdCBjaGFuZ2UgPSBmdW5jKHRoaXMuYXN0KTtcblx0XHRcdGlmIChjaGFuZ2UgJiYgY2hhbmdlLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0bG9nLmluZm8oJyVzIGlzIGNoYW5nZWQgYnkgJXMnLCBjaGFsay5jeWFuKHRoaXMuYXN0LmZpbGVOYW1lKSwgY2hhbGsuYmx1ZShuYW1lKSk7XG5cdFx0XHRcdHRoaXMuc3JjID0gcmVwbGFjZUNvZGUodGhpcy5zcmMsIGNoYW5nZSk7XG5cdFx0XHRcdHRoaXMuYXN0ID0gdHMuY3JlYXRlU291cmNlRmlsZSh0aGlzLmZpbGUsIHRoaXMuc3JjLCB0cy5TY3JpcHRUYXJnZXQuRVNOZXh0LFxuXHRcdFx0XHRcdHRydWUsIHRzLlNjcmlwdEtpbmQuVFNYKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRwcm90ZWN0ZWQgdHJhdmVyc2VUc0FzdChhc3Q6IHRzLk5vZGUsIGxldmVsID0gMCkge1xuXHRcdGlmIChhc3Qua2luZCA9PT0gc2suUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uIHx8IGFzdC5raW5kID09PSBzay5FbGVtZW50QWNjZXNzRXhwcmVzc2lvbikge1xuXHRcdFx0Y29uc3Qgbm9kZSA9IGFzdCBhcyAodHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uIHwgdHMuRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24pO1xuXHRcdFx0aWYgKG5vZGUuZXhwcmVzc2lvbi5raW5kID09PSBzay5JZGVudGlmaWVyICYmIG5vZGUuZXhwcmVzc2lvbi5nZXRUZXh0KHRoaXMuYXN0KSA9PT0gJ19fYXBpJykge1xuXHRcdFx0XHQvLyBrZWVwIGxvb2tpbmcgdXAgZm9yIHBhcmVudHMgdW50aWwgaXQgaXMgbm90IENhbGxFeHByZXNzaW9uLCBFbGVtZW50QWNjZXNzRXhwcmVzc2lvbiBvciBQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb25cblx0XHRcdFx0Y29uc3QgZXZhbHVhdGVOb2RlID0gdGhpcy5nb1VwVG9QYXJlbnRFeHByZXNzKG5vZGUpO1xuXHRcdFx0XHR0aGlzLnJlcGxhY2VtZW50cy5wdXNoKHtzdGFydDogZXZhbHVhdGVOb2RlLmdldFN0YXJ0KHRoaXMuYXN0KSxcblx0XHRcdFx0XHRlbmQ6IGV2YWx1YXRlTm9kZS5nZXRFbmQoKSxcblx0XHRcdFx0XHR0ZXh0OiBldmFsdWF0ZU5vZGUuZ2V0VGV4dCh0aGlzLmFzdCl9KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRhc3QuZm9yRWFjaENoaWxkKChzdWI6IHRzLk5vZGUpID0+IHtcblx0XHRcdHRoaXMudHJhdmVyc2VUc0FzdChzdWIsIGxldmVsICsgMSk7XG5cdFx0fSk7XG5cdH1cblxuXHQvKipcblx0ICoga2VlcCBsb29raW5nIHVwIGZvciBwYXJlbnRzIHVudGlsIGl0IGlzIG5vdCBDYWxsRXhwcmVzc2lvbiwgRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24gb3IgUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uXG5cdCAqL1xuXHRwcm90ZWN0ZWQgZ29VcFRvUGFyZW50RXhwcmVzcyh0YXJnZXQ6IHRzLk5vZGUpOiB0cy5Ob2RlIHtcblx0XHRsZXQgY3Vyck5vZGUgPSB0YXJnZXQ7XG5cdFx0d2hpbGUodHJ1ZSkge1xuXHRcdFx0Y29uc3Qga2luZCA9IGN1cnJOb2RlLnBhcmVudC5raW5kO1xuXHRcdFx0aWYgKGtpbmQgPT09IHNrLkNhbGxFeHByZXNzaW9uICYmIChjdXJyTm9kZS5wYXJlbnQgYXMgdHMuQ2FsbEV4cHJlc3Npb24pLmV4cHJlc3Npb24gPT09IGN1cnJOb2RlIHx8XG5cdFx0XHRcdGtpbmQgPT09IHNrLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiAmJiAoY3Vyck5vZGUucGFyZW50IGFzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikuZXhwcmVzc2lvbiA9PT0gY3Vyck5vZGUgfHxcblx0XHRcdFx0a2luZCA9PT0gc2suRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24gJiYgKGN1cnJOb2RlLnBhcmVudCBhcyB0cy5FbGVtZW50QWNjZXNzRXhwcmVzc2lvbikuZXhwcmVzc2lvbiA9PT0gY3Vyck5vZGUpIHtcblx0XHRcdFx0Y3Vyck5vZGUgPSBjdXJyTm9kZS5wYXJlbnQ7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGN1cnJOb2RlO1xuXHR9XG59XG4iXX0=
