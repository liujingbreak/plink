"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const ts_ast_query_1 = tslib_1.__importDefault(require("./utils/ts-ast-query"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const typescript_1 = tslib_1.__importDefault(require("typescript"));
const path_1 = tslib_1.__importDefault(require("path"));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy90cy1kZXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsZ0ZBQXlDO0FBQ3pDLG9EQUFvQjtBQUNwQixvRUFBNEI7QUFDNUIsd0RBQXdCO0FBRXhCLE1BQXFCLGlCQUFpQjtJQVFwQyxZQUFvQixFQUFzQixFQUN4QyxtQkFBOEYsRUFBRSxFQUN4RixRQUFtQztRQUZ6QixPQUFFLEdBQUYsRUFBRSxDQUFvQjtRQUVoQyxhQUFRLEdBQVIsUUFBUSxDQUEyQjtRQVQ3Qyw2REFBNkQ7UUFDN0QsV0FBTSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFDM0IsV0FBTSxHQUFhLEVBQUUsQ0FBQztRQUdkLGlCQUFZLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFNL0MsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzlCLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUNuQixjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLEdBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQzNELGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsWUFBYSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3ZFLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFFBQVEsR0FBRyxvQkFBRSxDQUFDLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFDMUQsUUFBUSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQ3BCLEVBQUUsQ0FBQyxDQUFDO1FBQ04sSUFBSSxDQUFDLElBQUksR0FBRyxvQkFBRSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRXRDLElBQUksQ0FBQyxRQUFRLEVB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QkFDRjtvQkFDSCxDQUFDO2lCQUNGO2dCQUNEO29CQUNFLEtBQUssRUFBRSwyQ0FBMkM7b0JBQ2xELFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSTt3QkFDaEIsT0FBTyxDQUFHLEdBQUcsQ0FBQyxNQUE0QixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQXNCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUMzRixDQUFDO2lCQUNGO2FBQ0YsQ0FBQyxDQUFDO1NBQ0o7SUFDSCxDQUFDO0NBRUY7QUE5RkQsb0NBOEZDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3RzLWRlcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBRdWVyeSBmcm9tICcuL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRzRGVwZW5kZW5jeUdyYXBoIHtcbiAgLy8gdW5yZXNvbHZlZDogQXJyYXk8e21vZHVsZTogc3RyaW5nLCBzcmNGaWxlOiBzdHJpbmd9PiA9IFtdO1xuICB3YWxrZWQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgdG9XYWxrOiBzdHJpbmdbXSA9IFtdO1xuICBwcml2YXRlIHJlc0NhY2hlOiB0cy5Nb2R1bGVSZXNvbHV0aW9uQ2FjaGU7XG4gIHByaXZhdGUgaG9zdDogdHMuQ29tcGlsZXJIb3N0O1xuICBwcml2YXRlIHJlcGxhY2VtZW50cyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBjbzogdHMuQ29tcGlsZXJPcHRpb25zLFxuICAgIGZpbGVSZXBsYWNlbWVudHM6IHtyZXBsYWNlPzogc3RyaW5nLCBzcmM/OiBzdHJpbmcsICB3aXRoPzogc3RyaW5nLCByZXBsYWNlV2lkdGg/OiBzdHJpbmd9W10gPSBbXSxcbiAgICBwcml2YXRlIHJlYWRGaWxlPzogKGZpbGU6IHN0cmluZykgPT4gc3RyaW5nKSB7XG5cbiAgICBmaWxlUmVwbGFjZW1lbnRzLmZvckVhY2gocGFpciA9PiB7XG4gICAgICB0aGlzLnJlcGxhY2VtZW50cy5zZXQoXG4gICAgICAgIFBhdGgucmVzb2x2ZShwYWlyLnJlcGxhY2UgfHwgcGFpci5zcmMhKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgICAgIFBhdGgucmVzb2x2ZShwYWlyLndpdGggfHwgcGFpci5yZXBsYWNlV2lkdGghKS5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5yZXNDYWNoZSA9IHRzLmNyZWF0ZU1vZHVsZVJlc29sdXRpb25DYWNoZShwcm9jZXNzLmN3ZCgpLFxuICAgICAgZmlsZU5hbWUgPT4gZmlsZU5hbWUsXG4gICAgICBjbyk7XG4gICAgdGhpcy5ob3N0ID0gdHMuY3JlYXRlQ29tcGlsZXJIb3N0KGNvKTtcblxuICAgIGlmICghcmVhZEZpbGUpIHtcbiAgICAgIHRoaXMucmVhZEZpbGUgPSBmaWxlID0+IHtcbiAgICAgICAgcmV0dXJuIGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpO1xuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIGZpbGUgbXVzdCBiZSBhYnNvbHV0ZSBwYXRoXG4gICAqL1xuICB3YWxrRm9yRGVwZW5kZW5jaWVzKGZpbGU6IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMudG9XYWxrLnB1c2goZmlsZSk7XG4gICAgdGhpcy5fd2FsaygpO1xuICB9XG5cbiAgcHJpdmF0ZSBfd2FsaygpIHtcbiAgICBjb25zdCByZXNvbHZlID0gKHBhdGg6IHN0cmluZywgZmlsZTogc3RyaW5nKSA9PiB7XG4gICAgICBjb25zdCByZXNvbHZlZCA9IHRzLnJlc29sdmVNb2R1bGVOYW1lKHBhdGgsIGZpbGUsIHRoaXMuY28sIHRoaXMuaG9zdCwgdGhpcy5yZXNDYWNoZSkucmVzb2x2ZWRNb2R1bGU7XG4gICAgICBpZiAocmVzb2x2ZWQpIHtcbiAgICAgICAgY29uc3QgZGVwID0gcmVzb2x2ZWQucmVzb2x2ZWRGaWxlTmFtZTtcbiAgICAgICAgaWYgKGRlcC5lbmRzV2l0aCgnLnRzJykgJiYgIWRlcC5lbmRzV2l0aCgnLmQudHMnKSAmJiAhdGhpcy53YWxrZWQuaGFzKGRlcCkpIHtcbiAgICAgICAgICB0aGlzLndhbGtlZC5hZGQoZGVwKTtcbiAgICAgICAgICB0aGlzLnRvV2Fsay5wdXNoKGRlcCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHRoaXMudW5yZXNvbHZlZC5wdXNoKHttb2R1bGU6IHBhdGgsIHNyY0ZpbGU6IGZpbGV9KTtcbiAgICAgICAgLy8gVE9ETzogbG9nIHVucmVzb2x2ZWRcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgd2hpbGUgKHRoaXMudG9XYWxrLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLnRvV2Fsay5zaGlmdCgpITtcblxuICAgICAgY29uc3QgcmVwbGFjZWQgPSB0aGlzLnJlcGxhY2VtZW50cy5nZXQoZmlsZSk7XG4gICAgICBjb25zdCBxID0gbmV3IFF1ZXJ5KHRoaXMucmVhZEZpbGUhKHJlcGxhY2VkIHx8IGZpbGUpLCBmaWxlKTtcblxuICAgICAgcS53YWxrQXN0KHEuc3JjLCBbXG4gICAgICAgIHtcbiAgICAgICAgICBxdWVyeTogJy5tb2R1bGVTcGVjaWZpZXI6U3RyaW5nTGl0ZXJhbCcsIC8vIEJvdGggOkV4cG9ydERlY2xhcmF0aW9uIG9yIDpJbXBvcnREZWNsYXJhdGlvblxuICAgICAgICAgIGNhbGxiYWNrKGFzdCkge1xuICAgICAgICAgICAgcmVzb2x2ZSgoYXN0IGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQsIGZpbGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHF1ZXJ5OiAnOlByb3BlcnR5QXNzaWdubWVudD4ubmFtZScsXG4gICAgICAgICAgY2FsbGJhY2soYXN0LCBwYXRoLCBwYXJlbnRzKSB7XG4gICAgICAgICAgICBpZiAoYXN0LmdldFRleHQoKSA9PT0gJ2xvYWRDaGlsZHJlbicpIHtcbiAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAoYXN0LnBhcmVudCBhcyB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnQpLmluaXRpYWxpemVyO1xuICAgICAgICAgICAgICBpZiAodmFsdWUua2luZCA9PT0gdHMuU3ludGF4S2luZC5TdHJpbmdMaXRlcmFsKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGF6eU1vZHVsZSA9ICh2YWx1ZSBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0O1xuICAgICAgICAgICAgICAgIGNvbnN0IGhhc2hUYWcgPSBsYXp5TW9kdWxlLmluZGV4T2YoJyMnKTtcbiAgICAgICAgICAgICAgICBpZiAoaGFzaFRhZyA+IDApIHtcbiAgICAgICAgICAgICAgICAgIC8vIFdlIGZvdW5kIGxhenkgcm91dGUgbW9kdWxlXG4gICAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tY29uc29sZVxuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2xhenkgcm91dGUgbW9kdWxlOicsIGxhenlNb2R1bGUpO1xuICAgICAgICAgICAgICAgICAgcmVzb2x2ZShsYXp5TW9kdWxlLnNsaWNlKDAsIGhhc2hUYWcpLCBmaWxlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBxdWVyeTogJzpDYWxsRXhwcmVzc2lvbj4uZXhwcmVzc2lvbjpJbXBvcnRLZXl3b3JkJyxcbiAgICAgICAgICBjYWxsYmFjayhhc3QsIHBhdGgpIHtcbiAgICAgICAgICAgIHJlc29sdmUoKChhc3QucGFyZW50IGFzIHRzLkNhbGxFeHByZXNzaW9uKS5hcmd1bWVudHNbMF0gYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dCwgZmlsZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBdKTtcbiAgICB9XG4gIH1cblxufVxuIl19
