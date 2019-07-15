"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable max-line-length
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy91dGlscy90cy1iZWZvcmUtYW90LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGlDQUFpQztBQUNqQyx1REFBaUM7QUFDakMsMkNBQTRDO0FBQzVDLCtGQUF5RDtBQUV6RCwwREFBbUM7QUFDbkMseUJBQTBCO0FBQzFCLCtCQUFnRDtBQUNoRCwwR0FBbUU7QUFFbkUsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQy9CLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxtQkFBbUIsQ0FBQyxDQUFDO0FBSy9FLFNBQVMsZ0JBQWdCO0lBQ3ZCLE1BQU0sS0FBSyxHQUErQixFQUFFLENBQUM7SUFDN0MsS0FBSyxNQUFNLEVBQUUsSUFBSSxlQUFHLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRTtRQUMzQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUU7WUFDOUIsTUFBTSxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDNUQsTUFBTSxJQUFJLEdBQUcsY0FBTyxDQUFDLEVBQUUsQ0FBQyxlQUFlLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDbkQsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBYyxDQUFDO1lBQ3BELEtBQUssQ0FBQyxJQUFJLENBQUM7Z0JBQ1QsSUFBSSxHQUFHLEdBQUcsR0FBRyxVQUFVO2dCQUN2QixJQUFJO2FBQ0wsQ0FBQyxDQUFDO1NBQ0o7S0FDRjtJQUNELE9BQU8sS0FBSyxDQUFDO0FBQ2YsQ0FBQztBQUVELElBQUksVUFBc0MsQ0FBQztBQUUzQyxN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O0lBQ0wsQ0FBQztJQUVEOztTQUVFO0lBQ1EsbUJBQW1CLENBQUMsTUFBZTtRQUMzQyxJQUFJLFFBQVEsR0FBRyxNQUFNLENBQUM7UUFDdEIsT0FBTSxJQUFJLEVBQUU7WUFDVixNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztZQUNsQyxJQUFJLElBQUksS0FBSyx1QkFBRSxDQUFDLGNBQWMsSUFBSyxRQUFRLENBQUMsTUFBNEIsQ0FBQyxVQUFVLEtBQUssUUFBUTtnQkFDOUYsSUFBSSxLQUFLLHVCQUFFLENBQUMsd0JBQXdCLElBQUssUUFBUSxDQUFDLE1BQXNDLENBQUMsVUFBVSxLQUFLLFFBQVE7Z0JBQ2hILElBQUksS0FBSyx1QkFBRSxDQUFDLHVCQUF1QixJQUFLLFFBQVEsQ0FBQyxNQUFxQyxDQUFDLFVBQVUsS0FBSyxRQUFRLEVBQUU7Z0JBQ2hILFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO2FBQzVCO2lCQUFNO2dCQUNMLE1BQU07YUFDUDtTQUNGO1FBQ0QsT0FBTyxRQUFRLENBQUM7SUFDbEIsQ0FBQztDQUNGO0FBekhELGlDQXlIQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC91dGlscy90cy1iZWZvcmUtYW90LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7U3ludGF4S2luZCBhcyBza30gZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgcmVwbGFjZUNvZGUsICogYXMgdGV4dFBhdGNoZXIgZnJvbSAnLi9wYXRjaC10ZXh0JztcbmltcG9ydCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJy4vcGF0Y2gtdGV4dCc7XG5pbXBvcnQgYXBpLCB7RHJjcEFwaX0gZnJvbSAnX19hcGknO1xuaW1wb3J0IHZtID0gcmVxdWlyZSgndm0nKTtcbmltcG9ydCB7ZGlybmFtZSwgcmVsYXRpdmUsIHJlc29sdmV9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IEltcG9ydENsYXVzZVRyYW5zcGlsZSBmcm9tICcuL2RlZmF1bHQtaW1wb3J0LXRzLXRyYW5zcGlsZXInO1xuXG5jb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5hcGktYW90LWNvbXBpbGVyJyk7XG5cbmV4cG9ydCB7UmVwbGFjZW1lbnRJbmZ9O1xuZXhwb3J0IHR5cGUgVHNIYW5kbGVyID0gKGFzdDogdHMuU291cmNlRmlsZSkgPT4gUmVwbGFjZW1lbnRJbmZbXTtcblxuZnVuY3Rpb24gY3JlYXRlVHNIYW5kbGVycygpOiBBcnJheTxbc3RyaW5nLCBUc0hhbmRsZXJdPiB7XG4gIGNvbnN0IGZ1bmNzOiBBcnJheTxbc3RyaW5nLCBUc0hhbmRsZXJdPiA9IFtdO1xuICBmb3IgKGNvbnN0IHBrIG9mIGFwaS5wYWNrYWdlSW5mby5hbGxNb2R1bGVzKSB7XG4gICAgaWYgKHBrLmRyICYmIHBrLmRyLm5nVHNIYW5kbGVyKSB7XG4gICAgICBjb25zdCBbZmlsZVBhdGgsIGV4cG9ydE5hbWVdID0gcGsuZHIubmdUc0hhbmRsZXIuc3BsaXQoJyMnKTtcbiAgICAgIGNvbnN0IHBhdGggPSByZXNvbHZlKHBrLnJlYWxQYWNrYWdlUGF0aCwgZmlsZVBhdGgpO1xuICAgICAgY29uc3QgZnVuYyA9IHJlcXVpcmUocGF0aClbZXhwb3J0TmFtZV0gYXMgVHNIYW5kbGVyO1xuICAgICAgZnVuY3MucHVzaChbXG4gICAgICAgIHBhdGggKyAnIycgKyBleHBvcnROYW1lLFxuICAgICAgICBmdW5jXG4gICAgICBdKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZ1bmNzO1xufVxuXG5sZXQgdHNIYW5kbGVyczogQXJyYXk8W3N0cmluZywgVHNIYW5kbGVyXT47XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFwaUFvdENvbXBpbGVyIHtcbiAgYXN0OiB0cy5Tb3VyY2VGaWxlO1xuXG4gIHJlcGxhY2VtZW50czogdGV4dFBhdGNoZXIuUmVwbGFjZW1lbnRJbmZbXSA9IFtdO1xuXG4gIGltcG9ydFRyYW5zcGlsZXI6IEltcG9ydENsYXVzZVRyYW5zcGlsZTtcblxuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgZmlsZTogc3RyaW5nLCBwcm90ZWN0ZWQgc3JjOiBzdHJpbmcpIHtcbiAgICBpZiAoYXBpLnNzcikge1xuICAgICAgdGhpcy5pbXBvcnRUcmFuc3BpbGVyID0gbmV3IEltcG9ydENsYXVzZVRyYW5zcGlsZSh7XG4gICAgICAgIGZpbGU6IHRoaXMuZmlsZSxcbiAgICAgICAgbW9kdWxlczogWy9ebG9kYXNoKD86XFwvfCQpL11cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHBhcnNlKHRyYW5zcGlsZUV4cDogKHNvdXJjZTogc3RyaW5nKSA9PiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBrID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKHRoaXMuZmlsZSk7XG4gICAgaWYgKHBrID09IG51bGwpXG4gICAgICByZXR1cm4gdGhpcy5zcmM7XG4gICAgaWYgKCF0c0hhbmRsZXJzKVxuICAgICAgdHNIYW5kbGVycyA9IGNyZWF0ZVRzSGFuZGxlcnMoKTtcblxuICAgIHRoaXMuYXN0ID0gdHMuY3JlYXRlU291cmNlRmlsZSh0aGlzLmZpbGUsIHRoaXMuc3JjLCB0cy5TY3JpcHRUYXJnZXQuRVNOZXh0LFxuICAgICAgdHJ1ZSwgdHMuU2NyaXB0S2luZC5UU1gpO1xuICAgIHRoaXMuX2NhbGxUc0hhbmRsZXJzKHRzSGFuZGxlcnMpO1xuXG4gICAgZm9yKGNvbnN0IHN0bSBvZiB0aGlzLmFzdC5zdGF0ZW1lbnRzKSB7XG4gICAgICB0aGlzLnRyYXZlcnNlVHNBc3Qoc3RtKTtcbiAgICB9XG4gICAgdGV4dFBhdGNoZXIuX3NvcnRBbmRSZW1vdmVPdmVybGFwKHRoaXMucmVwbGFjZW1lbnRzKTtcbiAgICAvLyBSZW1vdmUgb3ZlcmxhcGVkIHJlcGxhY2VtZW50cyB0byBhdm9pZCB0aGVtIGdldHRpbmcgaW50byBsYXRlciBgdm0ucnVuSW5OZXdDb250ZXh0KClgLFxuICAgIC8vIFdlIGRvbid0IHdhbnQgdG8gc2luZ2xlIG91dCBhbmQgZXZhbHVhdGUgbG93ZXIgbGV2ZWwgZXhwcmVzc2lvbiBsaWtlIGBfX2FwaS5wYWNrYWdlTmFtZWAgZnJvbVxuICAgIC8vIGBfX2FwaS5jb25maWcuZ2V0KF9fYXBpLnBhY2thZ2VOYW1lKWAsIHdlIGp1c3QgZXZhbHVhdGUgdGhlIHdob2xlIGxhdHRlciBleHByZXNzaW9uXG5cbiAgICBjb25zdCBub2RlQXBpID0gYXBpLmdldE5vZGVBcGlGb3JQYWNrYWdlPERyY3BBcGk+KHBrKTtcbiAgICBub2RlQXBpLl9fZGlybmFtZSA9IGRpcm5hbWUodGhpcy5maWxlKTtcbiAgICBjb25zdCBjb250ZXh0ID0gdm0uY3JlYXRlQ29udGV4dCh7X19hcGk6IG5vZGVBcGl9KTtcblxuICAgIGZvciAoY29uc3QgcmVwbCBvZiB0aGlzLnJlcGxhY2VtZW50cykge1xuICAgICAgY29uc3Qgb3JpZ1RleHQgPSByZXBsLnRleHQ7XG4gICAgICBsZXQgcmVzO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzID0gdm0ucnVuSW5OZXdDb250ZXh0KHRyYW5zcGlsZUV4cChvcmlnVGV4dCksIGNvbnRleHQpO1xuICAgICAgICByZXBsLnRleHQgPSBKU09OLnN0cmluZ2lmeShyZXMpO1xuICAgICAgICAvLyBUbyBieXBhc3MgVFMgZXJyb3IgXCJVbnJlYWNoYWJsZSBjb2RlIGRldGVjdGVkXCIgaWZcbiAgICAgICAgLy8gY29tcGlsZXIgb3B0aW9uIFwiYWxsb3dVbnJlYWNoYWJsZUNvZGU6IGZhbHNlXCJcbiAgICAgICAgLy8gZS5nLiBpZiAoZmFsc2UpIHsuLi59IC0tPiBpZiAoISFmYWxzZSkgey4uLn1cbiAgICAgICAgaWYgKHJlcGwudGV4dCA9PT0gJ3RydWUnIHx8IHJlcGwudGV4dCA9PT0gJ2ZhbHNlJylcbiAgICAgICAgICByZXBsLnRleHQgPSAnISEnICsgcmVwbC50ZXh0O1xuICAgICAgICBlbHNlIGlmIChyZXBsLnRleHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIEpTT04uc3RyaW5naWZ5KHVuZGVmaW5lZCkgd2lsbCBub3QgcmV0dXJuIHN0cmluZyBvZiBcInVuZGVmaW5lZFwiLCBidXQgYWN0dWFsIHVuZGVmaW5lZFxuICAgICAgICAgIHJlcGwudGV4dCA9ICd1bmRlZmluZWQnO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoKGV4KSB7XG4gICAgICAgIGxvZy5lcnJvcignRXZhbHVhdGUgJXMsIHJlc3VsdDonLCBvcmlnVGV4dCwgcmVzKTtcbiAgICAgICAgdGhyb3cgZXg7XG4gICAgICB9XG4gICAgICBsb2cuaW5mbyhgRXZhbHVhdGUgXCIke2NoYWxrLnllbGxvdyhvcmlnVGV4dCl9XCIgdG86ICR7Y2hhbGsuY3lhbihyZXBsLnRleHQpfSBpblxcblxcdGAgK1xuICAgICAgICByZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCB0aGlzLmZpbGUpKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5pbXBvcnRUcmFuc3BpbGVyKVxuICAgICAgdGhpcy5pbXBvcnRUcmFuc3BpbGVyLnBhcnNlKHRoaXMuYXN0LCB0aGlzLnJlcGxhY2VtZW50cyk7XG5cbiAgICBpZiAodGhpcy5yZXBsYWNlbWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgcmV0dXJuIHRoaXMuc3JjO1xuICAgIHRleHRQYXRjaGVyLl9zb3J0QW5kUmVtb3ZlT3ZlcmxhcCh0aGlzLnJlcGxhY2VtZW50cyk7XG4gICAgcmV0dXJuIHRleHRQYXRjaGVyLl9yZXBsYWNlU29ydGVkKHRoaXMuc3JjLCB0aGlzLnJlcGxhY2VtZW50cyk7XG4gIH1cblxuICBnZXRBcGlGb3JGaWxlKGZpbGU6IHN0cmluZykge1xuICAgIGFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBfY2FsbFRzSGFuZGxlcnModHNIYW5kbGVyczogQXJyYXk8W3N0cmluZywgVHNIYW5kbGVyXT4pOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCBmdW5jXSBvZiB0c0hhbmRsZXJzKSB7XG4gICAgICBjb25zdCBjaGFuZ2UgPSBmdW5jKHRoaXMuYXN0KTtcbiAgICAgIGlmIChjaGFuZ2UgJiYgY2hhbmdlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgbG9nLmluZm8oJyVzIGlzIGNoYW5nZWQgYnkgJXMnLCBjaGFsay5jeWFuKHRoaXMuYXN0LmZpbGVOYW1lKSwgY2hhbGsuYmx1ZShuYW1lKSk7XG4gICAgICAgIHRoaXMuc3JjID0gcmVwbGFjZUNvZGUodGhpcy5zcmMsIGNoYW5nZSk7XG4gICAgICAgIHRoaXMuYXN0ID0gdHMuY3JlYXRlU291cmNlRmlsZSh0aGlzLmZpbGUsIHRoaXMuc3JjLCB0cy5TY3JpcHRUYXJnZXQuRVNOZXh0LFxuICAgICAgICAgIHRydWUsIHRzLlNjcmlwdEtpbmQuVFNYKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgdHJhdmVyc2VUc0FzdChhc3Q6IHRzLk5vZGUsIGxldmVsID0gMCkge1xuICAgIGlmIChhc3Qua2luZCA9PT0gc2suUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uIHx8IGFzdC5raW5kID09PSBzay5FbGVtZW50QWNjZXNzRXhwcmVzc2lvbikge1xuICAgICAgY29uc3Qgbm9kZSA9IGFzdCBhcyAodHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uIHwgdHMuRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24pO1xuICAgICAgaWYgKG5vZGUuZXhwcmVzc2lvbi5raW5kID09PSBzay5JZGVudGlmaWVyICYmIG5vZGUuZXhwcmVzc2lvbi5nZXRUZXh0KHRoaXMuYXN0KSA9PT0gJ19fYXBpJykge1xuICAgICAgICAvLyBrZWVwIGxvb2tpbmcgdXAgZm9yIHBhcmVudHMgdW50aWwgaXQgaXMgbm90IENhbGxFeHByZXNzaW9uLCBFbGVtZW50QWNjZXNzRXhwcmVzc2lvbiBvciBQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb25cbiAgICAgICAgY29uc3QgZXZhbHVhdGVOb2RlID0gdGhpcy5nb1VwVG9QYXJlbnRFeHByZXNzKG5vZGUpO1xuICAgICAgICB0aGlzLnJlcGxhY2VtZW50cy5wdXNoKHtzdGFydDogZXZhbHVhdGVOb2RlLmdldFN0YXJ0KHRoaXMuYXN0KSxcbiAgICAgICAgICBlbmQ6IGV2YWx1YXRlTm9kZS5nZXRFbmQoKSxcbiAgICAgICAgICB0ZXh0OiBldmFsdWF0ZU5vZGUuZ2V0VGV4dCh0aGlzLmFzdCl9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICBhc3QuZm9yRWFjaENoaWxkKChzdWI6IHRzLk5vZGUpID0+IHtcbiAgICAgIHRoaXMudHJhdmVyc2VUc0FzdChzdWIsIGxldmVsICsgMSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcblx0ICoga2VlcCBsb29raW5nIHVwIGZvciBwYXJlbnRzIHVudGlsIGl0IGlzIG5vdCBDYWxsRXhwcmVzc2lvbiwgRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24gb3IgUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uXG5cdCAqL1xuICBwcm90ZWN0ZWQgZ29VcFRvUGFyZW50RXhwcmVzcyh0YXJnZXQ6IHRzLk5vZGUpOiB0cy5Ob2RlIHtcbiAgICBsZXQgY3Vyck5vZGUgPSB0YXJnZXQ7XG4gICAgd2hpbGUodHJ1ZSkge1xuICAgICAgY29uc3Qga2luZCA9IGN1cnJOb2RlLnBhcmVudC5raW5kO1xuICAgICAgaWYgKGtpbmQgPT09IHNrLkNhbGxFeHByZXNzaW9uICYmIChjdXJyTm9kZS5wYXJlbnQgYXMgdHMuQ2FsbEV4cHJlc3Npb24pLmV4cHJlc3Npb24gPT09IGN1cnJOb2RlIHx8XG4gICAgICAgIGtpbmQgPT09IHNrLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiAmJiAoY3Vyck5vZGUucGFyZW50IGFzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikuZXhwcmVzc2lvbiA9PT0gY3Vyck5vZGUgfHxcbiAgICAgICAga2luZCA9PT0gc2suRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24gJiYgKGN1cnJOb2RlLnBhcmVudCBhcyB0cy5FbGVtZW50QWNjZXNzRXhwcmVzc2lvbikuZXhwcmVzc2lvbiA9PT0gY3Vyck5vZGUpIHtcbiAgICAgICAgY3Vyck5vZGUgPSBjdXJyTm9kZS5wYXJlbnQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGN1cnJOb2RlO1xuICB9XG59XG4iXX0=
