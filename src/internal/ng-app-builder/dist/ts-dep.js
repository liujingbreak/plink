"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const ts_ast_query_1 = tslib_1.__importDefault(require("./utils/ts-ast-query"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const typescript_1 = tslib_1.__importDefault(require("typescript"));
const path_1 = tslib_1.__importDefault(require("path"));
const __api_1 = tslib_1.__importDefault(require("__api"));
const log = require('log4js').getLogger(__api_1.default.packageName + '.ts-deps');
const rootPath = path_1.default.resolve();
class TsDependencyGraph {
    constructor(co, fileReplacements = [], readFile) {
        this.co = co;
        this.readFile = readFile;
        // unresolved: Array<{module: string, srcFile: string}> = [];
        this.walked = new Set();
        this.toWalk = [];
        this.replacements = new Map();
        fileReplacements.forEach(pair => {
            this.replacements.set(path_1.default.resolve(pair.replace || pair.src).replace(/\\/g, '/'), path_1.default.resolve(pair.with || pair.replaceWidth).replace(/\\/g, '/'));
        });
        this.resCache = typescript_1.default.createModuleResolutionCache(process.cwd(), fileName => fileName, co);
        this.host = typescript_1.default.createCompilerHost(co);
        if (!readFile) {
            this.readFile = file => {
                return fs_1.default.readFileSync(file, 'utf8');
            };
        }
    }
    /**
     * @param file must be absolute path
     */
    walkForDependencies(file) {
        this.toWalk.push(file);
        this._walk();
    }
    _walk() {
        const resolve = (path, file) => {
            const resolved = typescript_1.default.resolveModuleName(path, file, this.co, this.host, this.resCache).resolvedModule;
            if (resolved) {
                const dep = resolved.resolvedFileName;
                if (dep.endsWith('.ts') && !dep.endsWith('.d.ts') && !this.walked.has(dep)) {
                    log.debug('dep: ' + path_1.default.relative(rootPath, dep) + ',\n  from ' + path_1.default.relative(rootPath, file));
                    this.walked.add(dep);
                    this.toWalk.push(dep);
                }
            }
            else {
                // this.unresolved.push({module: path, srcFile: file});
                // TODO: log unresolved
            }
        };
        while (this.toWalk.length > 0) {
            const file = this.toWalk.shift();
            const replaced = this.replacements.get(file);
            const q = new ts_ast_query_1.default(this.readFile(replaced || file), file);
            q.walkAst(q.src, [
                {
                    query: '.moduleSpecifier:StringLiteral',
                    callback(ast) {
                        resolve(ast.text, file);
                    }
                },
                {
                    query: ':PropertyAssignment>.name',
                    callback(ast, path, parents) {
                        if (ast.getText() === 'loadChildren') {
                            const value = ast.parent.initializer;
                            if (value.kind === typescript_1.default.SyntaxKind.StringLiteral) {
                                const lazyModule = value.text;
                                const hashTag = lazyModule.indexOf('#');
                                if (hashTag > 0) {
                                    // We found lazy route module
                                    // tslint:disable-next-line:no-console
                                    console.log('lazy route module:', lazyModule);
                                    resolve(lazyModule.slice(0, hashTag), file);
                                }
                            }
                        }
                    }
                },
                {
                    query: ':CallExpression>.expression:ImportKeyword',
                    callback(ast, path) {
                        resolve(ast.parent.arguments[0].text, file);
                    }
                }
            ]);
        }
    }
}
exports.default = TsDependencyGraph;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy90cy1kZXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsZ0ZBQXlDO0FBQ3pDLG9EQUFvQjtBQUNwQixvRUFBNEI7QUFDNUIsd0RBQXdCO0FBQ3hCLDBEQUF3QjtBQUN4QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDLENBQUM7QUFFdEUsTUFBTSxRQUFRLEdBQUcsY0FBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ2hDLE1BQXFCLGlCQUFpQjtJQVFwQyxZQUFvQixFQUFzQixFQUN4QyxtQkFBOEYsRUFBRSxFQUN4RixRQUFtQztRQUZ6QixPQUFFLEdBQUYsRUFBRSxDQUFvQjtRQUVoQyxhQUFRLEdBQVIsUUFBUSxDQUEyQjtRQVQ3Qyw2REFBNkQ7UUFDN0QsV0FBTSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFDM0IsV0FBTSxHQUFhLEVBQUUsQ0FBQztRQUdkLGlCQUFZLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFNL0MsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzlCLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUNuQixjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLEdBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQzNELGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsWUFBYSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3ZFLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFFBQVEsR0FBRyxvQkFBRSxDQUFDLDJCQUEyQixDQUFDLE9BQU8sQ0FB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VUFBVSxHQUFJLEtBQTBCLENBQUMsSUFBSSxDQUFDO2dDQUNwRCxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dDQUN4QyxJQUFJLE9BQU8sR0FBRyxDQUFDLEVBQUU7b0NBQ2YsNkJBQTZCO29DQUM3QixzQ0FBc0M7b0NBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLENBQUM7b0NBQzlDLE9BQU8sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztpQ0FDN0M7NkJBQ0Y7eUJBQ0Y7b0JBQ0gsQ0FBQztpQkFDRjtnQkFDRDtvQkFDRSxLQUFLLEVBQUUsMkNBQTJDO29CQUNsRCxRQUFRLENBQUMsR0FBRyxFQUFFLElBQUk7d0JBQ2hCLE9BQU8sQ0FBRyxHQUFHLENBQUMsTUFBNEIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFzQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDM0YsQ0FBQztpQkFDRjthQUNGLENBQUMsQ0FBQztTQUNKO0lBQ0gsQ0FBQztDQUVGO0FBL0ZELG9DQStGQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC90cy1kZXAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUXVlcnkgZnJvbSAnLi91dGlscy90cy1hc3QtcXVlcnknO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy50cy1kZXBzJyk7XG5cbmNvbnN0IHJvb3RQYXRoID0gUGF0aC5yZXNvbHZlKCk7XG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUc0RlcGVuZGVuY3lHcmFwaCB7XG4gIC8vIHVucmVzb2x2ZWQ6IEFycmF5PHttb2R1bGU6IHN0cmluZywgc3JjRmlsZTogc3RyaW5nfT4gPSBbXTtcbiAgd2Fsa2VkID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIHRvV2Fsazogc3RyaW5nW10gPSBbXTtcbiAgcHJpdmF0ZSByZXNDYWNoZTogdHMuTW9kdWxlUmVzb2x1dGlvbkNhY2hlO1xuICBwcml2YXRlIGhvc3Q6IHRzLkNvbXBpbGVySG9zdDtcbiAgcHJpdmF0ZSByZXBsYWNlbWVudHMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgY286IHRzLkNvbXBpbGVyT3B0aW9ucyxcbiAgICBmaWxlUmVwbGFjZW1lbnRzOiB7cmVwbGFjZT86IHN0cmluZywgc3JjPzogc3RyaW5nLCAgd2l0aD86IHN0cmluZywgcmVwbGFjZVdpZHRoPzogc3RyaW5nfVtdID0gW10sXG4gICAgcHJpdmF0ZSByZWFkRmlsZT86IChmaWxlOiBzdHJpbmcpID0+IHN0cmluZykge1xuXG4gICAgZmlsZVJlcGxhY2VtZW50cy5mb3JFYWNoKHBhaXIgPT4ge1xuICAgICAgdGhpcy5yZXBsYWNlbWVudHMuc2V0KFxuICAgICAgICBQYXRoLnJlc29sdmUocGFpci5yZXBsYWNlIHx8IHBhaXIuc3JjISkucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgICAgICBQYXRoLnJlc29sdmUocGFpci53aXRoIHx8IHBhaXIucmVwbGFjZVdpZHRoISkucmVwbGFjZSgvXFxcXC9nLCAnLycpKTtcbiAgICB9KTtcblxuICAgIHRoaXMucmVzQ2FjaGUgPSB0cy5jcmVhdGVNb2R1bGVSZXNvbHV0aW9uQ2FjaGUocHJvY2Vzcy5jd2QoKSxcbiAgICAgIGZpbGVOYW1lID0+IGZpbGVOYW1lLFxuICAgICAgY28pO1xuICAgIHRoaXMuaG9zdCA9IHRzLmNyZWF0ZUNvbXBpbGVySG9zdChjbyk7XG5cbiAgICBpZiAoIXJlYWRGaWxlKSB7XG4gICAgICB0aGlzLnJlYWRGaWxlID0gZmlsZSA9PiB7XG4gICAgICAgIHJldHVybiBmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKTtcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSBmaWxlIG11c3QgYmUgYWJzb2x1dGUgcGF0aFxuICAgKi9cbiAgd2Fsa0ZvckRlcGVuZGVuY2llcyhmaWxlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLnRvV2Fsay5wdXNoKGZpbGUpO1xuICAgIHRoaXMuX3dhbGsoKTtcbiAgfVxuXG4gIHByaXZhdGUgX3dhbGsoKSB7XG4gICAgY29uc3QgcmVzb2x2ZSA9IChwYXRoOiBzdHJpbmcsIGZpbGU6IHN0cmluZykgPT4ge1xuICAgICAgY29uc3QgcmVzb2x2ZWQgPSB0cy5yZXNvbHZlTW9kdWxlTmFtZShwYXRoLCBmaWxlLCB0aGlzLmNvLCB0aGlzLmhvc3QsIHRoaXMucmVzQ2FjaGUpLnJlc29sdmVkTW9kdWxlO1xuICAgICAgaWYgKHJlc29sdmVkKSB7XG4gICAgICAgIGNvbnN0IGRlcCA9IHJlc29sdmVkLnJlc29sdmVkRmlsZU5hbWU7XG4gICAgICAgIGlmIChkZXAuZW5kc1dpdGgoJy50cycpICYmICFkZXAuZW5kc1dpdGgoJy5kLnRzJykgJiYgIXRoaXMud2Fsa2VkLmhhcyhkZXApKSB7XG4gICAgICAgICAgbG9nLmRlYnVnKCdkZXA6ICcgKyBQYXRoLnJlbGF0aXZlKHJvb3RQYXRoLCBkZXApICsgJyxcXG4gIGZyb20gJyArIFBhdGgucmVsYXRpdmUocm9vdFBhdGgsIGZpbGUpKTtcbiAgICAgICAgICB0aGlzLndhbGtlZC5hZGQoZGVwKTtcbiAgICAgICAgICB0aGlzLnRvV2Fsay5wdXNoKGRlcCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHRoaXMudW5yZXNvbHZlZC5wdXNoKHttb2R1bGU6IHBhdGgsIHNyY0ZpbGU6IGZpbGV9KTtcbiAgICAgICAgLy8gVE9ETzogbG9nIHVucmVzb2x2ZWRcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgd2hpbGUgKHRoaXMudG9XYWxrLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLnRvV2Fsay5zaGlmdCgpITtcblxuICAgICAgY29uc3QgcmVwbGFjZWQgPSB0aGlzLnJlcGxhY2VtZW50cy5nZXQoZmlsZSk7XG4gICAgICBjb25zdCBxID0gbmV3IFF1ZXJ5KHRoaXMucmVhZEZpbGUhKHJlcGxhY2VkIHx8IGZpbGUpLCBmaWxlKTtcblxuICAgICAgcS53YWxrQXN0KHEuc3JjLCBbXG4gICAgICAgIHtcbiAgICAgICAgICBxdWVyeTogJy5tb2R1bGVTcGVjaWZpZXI6U3RyaW5nTGl0ZXJhbCcsIC8vIEJvdGggOkV4cG9ydERlY2xhcmF0aW9uIG9yIDpJbXBvcnREZWNsYXJhdGlvblxuICAgICAgICAgIGNhbGxiYWNrKGFzdCkge1xuICAgICAgICAgICAgcmVzb2x2ZSgoYXN0IGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQsIGZpbGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHF1ZXJ5OiAnOlByb3BlcnR5QXNzaWdubWVudD4ubmFtZScsXG4gICAgICAgICAgY2FsbGJhY2soYXN0LCBwYXRoLCBwYXJlbnRzKSB7XG4gICAgICAgICAgICBpZiAoYXN0LmdldFRleHQoKSA9PT0gJ2xvYWRDaGlsZHJlbicpIHtcbiAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAoYXN0LnBhcmVudCBhcyB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnQpLmluaXRpYWxpemVyO1xuICAgICAgICAgICAgICBpZiAodmFsdWUua2luZCA9PT0gdHMuU3ludGF4S2luZC5TdHJpbmdMaXRlcmFsKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGF6eU1vZHVsZSA9ICh2YWx1ZSBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0O1xuICAgICAgICAgICAgICAgIGNvbnN0IGhhc2hUYWcgPSBsYXp5TW9kdWxlLmluZGV4T2YoJyMnKTtcbiAgICAgICAgICAgICAgICBpZiAoaGFzaFRhZyA+IDApIHtcbiAgICAgICAgICAgICAgICAgIC8vIFdlIGZvdW5kIGxhenkgcm91dGUgbW9kdWxlXG4gICAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tY29uc29sZVxuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2xhenkgcm91dGUgbW9kdWxlOicsIGxhenlNb2R1bGUpO1xuICAgICAgICAgICAgICAgICAgcmVzb2x2ZShsYXp5TW9kdWxlLnNsaWNlKDAsIGhhc2hUYWcpLCBmaWxlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBxdWVyeTogJzpDYWxsRXhwcmVzc2lvbj4uZXhwcmVzc2lvbjpJbXBvcnRLZXl3b3JkJyxcbiAgICAgICAgICBjYWxsYmFjayhhc3QsIHBhdGgpIHtcbiAgICAgICAgICAgIHJlc29sdmUoKChhc3QucGFyZW50IGFzIHRzLkNhbGxFeHByZXNzaW9uKS5hcmd1bWVudHNbMF0gYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dCwgZmlsZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBdKTtcbiAgICB9XG4gIH1cblxufVxuIl19
