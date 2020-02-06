"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const ts_ast_query_1 = tslib_1.__importDefault(require("./utils/ts-ast-query"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const typescript_1 = tslib_1.__importDefault(require("typescript"));
const path_1 = tslib_1.__importDefault(require("path"));
const os_1 = require("os");
const fs_extra_1 = require("fs-extra");
const cwd = process.cwd();
// import api from '__api';
// const log = require('log4js').getLogger(api.packageName + '.ts-deps');
class TsDependencyGraph {
    constructor(co, fileReplacements = [], readFile) {
        this.co = co;
        this.readFile = readFile;
        this.requestMap = new Map(); // key is file that requested, value is who requests
        /**
         * Angular style lazy route loading grammar
         */
        this.loadChildren = new Set();
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
    report(logFile) {
        const g = this;
        // const logFile = api.config.resolve('destDir', 'ng-app-builder.report', 'ts-deps.txt');
        const reportOut = fs_extra_1.createWriteStream(logFile);
        reportOut.write(new Date().toLocaleString());
        reportOut.write(os_1.EOL);
        // TODO: optimize - use a _.sortedIndex to make a sorted map, or use a separate worker process
        const sortedEntries = Array.from(g.requestMap.entries()).sort((entry1, entry2) => entry1[0] > entry2[0] ? 1 : -1);
        let i = 0;
        for (const [dep, by] of sortedEntries) {
            const pad = 4 - (i + '').length;
            reportOut.write(' '.repeat(pad));
            reportOut.write(i++ + '. ');
            reportOut.write(path_1.default.relative(cwd, dep));
            reportOut.write(os_1.EOL);
            for (const singleBy of by) {
                reportOut.write('        - ' + path_1.default.relative(cwd, singleBy));
                reportOut.write(os_1.EOL);
            }
        }
        return new Promise(resolve => reportOut.end(resolve));
    }
    /**
     *
     * @param requestDep
     * @param by
     * @returns true if it is requested at first time
     */
    checkResolved(requestDep, by) {
        const byList = this.requestMap.get(requestDep);
        if (byList) {
            byList.push(by);
            return false;
        }
        else {
            this.requestMap.set(requestDep, [by]);
            return true;
        }
    }
    _walk() {
        const resolve = (path, file, cb) => {
            const resolved = typescript_1.default.resolveModuleName(path, file, this.co, this.host, this.resCache).resolvedModule;
            if (resolved) {
                const dep = resolved.resolvedFileName;
                if (dep.endsWith('.ts') && !dep.endsWith('.d.ts')) {
                    if (this.checkResolved(dep, file)) {
                        // log.debug('dep: ' + Path.relative(rootPath, dep) + ',\n  from ' + Path.relative(rootPath, file));
                        this.toWalk.push(dep);
                        if (cb) {
                            cb(dep);
                        }
                    }
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
            const self = this;
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
                                    resolve(lazyModule.slice(0, hashTag), file, resolved => {
                                        self.loadChildren.add(resolved);
                                    });
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy90cy1kZXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsZ0ZBQXlDO0FBQ3pDLG9EQUFvQjtBQUNwQixvRUFBNEI7QUFDNUIsd0RBQXdCO0FBQ3hCLDJCQUE4QjtBQUM5Qix1Q0FBNkM7QUFDN0MsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQzFCLDJCQUEyQjtBQUMzQix5RUFBeUU7QUFFekUsTUFBcUIsaUJBQWlCO0lBWXBDLFlBQW9CLEVBQXNCLEVBQ3hDLG1CQUE4RixFQUFFLEVBQ3hGLFFBQW1DO1FBRnpCLE9BQUUsR0FBRixFQUFFLENBQW9CO1FBRWhDLGFBQVEsR0FBUixRQUFRLENBQTJCO1FBYjdDLGVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBb0IsQ0FBQyxDQUFDLG9EQUFvRDtRQUM5Rjs7V0FFRztRQUNILGlCQUFZLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUNqQyxXQUFNLEdBQWEsRUFBRSxDQUFDO1FBSWQsaUJBQVksR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQU0vQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDOUIsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQ25CLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsR0FBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsRUFDM0QsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxZQUFhLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDdkUsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsUUFBUSxHQUFHLG9CQUFFLENBQUMsMkJBQTJCLENBQUMsT0FBTyxDQUFDLEdB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LENBQUMsR0FBRyxFQUFFLElBQUk7d0JBQ2hCLE9BQU8sQ0FBRyxHQUFHLENBQUMsTUFBNEIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFzQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDM0YsQ0FBQztpQkFDRjthQUNGLENBQUMsQ0FBQztTQUNKO0lBQ0gsQ0FBQztDQUVGO0FBdkpELG9DQXVKQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC90cy1kZXAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUXVlcnkgZnJvbSAnLi91dGlscy90cy1hc3QtcXVlcnknO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtFT0wgYXMgZW9sfSBmcm9tICdvcyc7XG5pbXBvcnQgeyBjcmVhdGVXcml0ZVN0cmVhbSB9IGZyb20gJ2ZzLWV4dHJhJztcbmNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4vLyBpbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbi8vIGNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLnRzLWRlcHMnKTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVHNEZXBlbmRlbmN5R3JhcGgge1xuICByZXF1ZXN0TWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZ1tdPigpOyAvLyBrZXkgaXMgZmlsZSB0aGF0IHJlcXVlc3RlZCwgdmFsdWUgaXMgd2hvIHJlcXVlc3RzXG4gIC8qKlxuICAgKiBBbmd1bGFyIHN0eWxlIGxhenkgcm91dGUgbG9hZGluZyBncmFtbWFyIFxuICAgKi9cbiAgbG9hZENoaWxkcmVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIHRvV2Fsazogc3RyaW5nW10gPSBbXTtcblxuICBwcml2YXRlIHJlc0NhY2hlOiB0cy5Nb2R1bGVSZXNvbHV0aW9uQ2FjaGU7XG4gIHByaXZhdGUgaG9zdDogdHMuQ29tcGlsZXJIb3N0O1xuICBwcml2YXRlIHJlcGxhY2VtZW50cyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBjbzogdHMuQ29tcGlsZXJPcHRpb25zLFxuICAgIGZpbGVSZXBsYWNlbWVudHM6IHtyZXBsYWNlPzogc3RyaW5nLCBzcmM/OiBzdHJpbmcsICB3aXRoPzogc3RyaW5nLCByZXBsYWNlV2lkdGg/OiBzdHJpbmd9W10gPSBbXSxcbiAgICBwcml2YXRlIHJlYWRGaWxlPzogKGZpbGU6IHN0cmluZykgPT4gc3RyaW5nKSB7XG5cbiAgICBmaWxlUmVwbGFjZW1lbnRzLmZvckVhY2gocGFpciA9PiB7XG4gICAgICB0aGlzLnJlcGxhY2VtZW50cy5zZXQoXG4gICAgICAgIFBhdGgucmVzb2x2ZShwYWlyLnJlcGxhY2UgfHwgcGFpci5zcmMhKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgICAgIFBhdGgucmVzb2x2ZShwYWlyLndpdGggfHwgcGFpci5yZXBsYWNlV2lkdGghKS5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5yZXNDYWNoZSA9IHRzLmNyZWF0ZU1vZHVsZVJlc29sdXRpb25DYWNoZShwcm9jZXNzLmN3ZCgpLFxuICAgICAgZmlsZU5hbWUgPT4gZmlsZU5hbWUsXG4gICAgICBjbyk7XG4gICAgdGhpcy5ob3N0ID0gdHMuY3JlYXRlQ29tcGlsZXJIb3N0KGNvKTtcblxuICAgIGlmICghcmVhZEZpbGUpIHtcbiAgICAgIHRoaXMucmVhZEZpbGUgPSBmaWxlID0+IHtcbiAgICAgICAgcmV0dXJuIGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpO1xuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIGZpbGUgbXVzdCBiZSBhYnNvbHV0ZSBwYXRoXG4gICAqL1xuICB3YWxrRm9yRGVwZW5kZW5jaWVzKGZpbGU6IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMudG9XYWxrLnB1c2goZmlsZSk7XG4gICAgdGhpcy5fd2FsaygpO1xuICB9XG5cbiAgcmVwb3J0KGxvZ0ZpbGU6IHN0cmluZykge1xuXG4gICAgY29uc3QgZyA9IHRoaXM7XG4gICAgLy8gY29uc3QgbG9nRmlsZSA9IGFwaS5jb25maWcucmVzb2x2ZSgnZGVzdERpcicsICduZy1hcHAtYnVpbGRlci5yZXBvcnQnLCAndHMtZGVwcy50eHQnKTtcblxuICAgIGNvbnN0IHJlcG9ydE91dCA9IGNyZWF0ZVdyaXRlU3RyZWFtKGxvZ0ZpbGUpO1xuICAgIHJlcG9ydE91dC53cml0ZShuZXcgRGF0ZSgpLnRvTG9jYWxlU3RyaW5nKCkpO1xuICAgIHJlcG9ydE91dC53cml0ZShlb2wpO1xuICAgIC8vIFRPRE86IG9wdGltaXplIC0gdXNlIGEgXy5zb3J0ZWRJbmRleCB0byBtYWtlIGEgc29ydGVkIG1hcCwgb3IgdXNlIGEgc2VwYXJhdGUgd29ya2VyIHByb2Nlc3NcbiAgICBjb25zdCBzb3J0ZWRFbnRyaWVzID0gQXJyYXkuZnJvbShnLnJlcXVlc3RNYXAuZW50cmllcygpKS5zb3J0KChlbnRyeTEsIGVudHJ5MikgPT4gZW50cnkxWzBdID4gZW50cnkyWzBdID8gMSA6IC0xKTtcbiAgICBsZXQgaSA9IDA7XG4gICAgZm9yIChjb25zdCBbZGVwLCBieV0gb2Ygc29ydGVkRW50cmllcykge1xuICAgICAgY29uc3QgcGFkID0gNCAtIChpICsgJycpLmxlbmd0aDtcbiAgICAgIHJlcG9ydE91dC53cml0ZSgnICcucmVwZWF0KHBhZCkpO1xuICAgICAgcmVwb3J0T3V0LndyaXRlKGkrKyArICcuICcpO1xuICAgICAgcmVwb3J0T3V0LndyaXRlKFBhdGgucmVsYXRpdmUoY3dkLCBkZXApKTtcbiAgICAgIHJlcG9ydE91dC53cml0ZShlb2wpO1xuICAgICAgZm9yIChjb25zdCBzaW5nbGVCeSBvZiBieSkge1xuICAgICAgICByZXBvcnRPdXQud3JpdGUoJyAgICAgICAgLSAnICsgUGF0aC5yZWxhdGl2ZShjd2QsIHNpbmdsZUJ5KSk7XG4gICAgICAgIHJlcG9ydE91dC53cml0ZShlb2wpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHJlcG9ydE91dC5lbmQocmVzb2x2ZSkpO1xuXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqIEBwYXJhbSByZXF1ZXN0RGVwIFxuICAgKiBAcGFyYW0gYnkgXG4gICAqIEByZXR1cm5zIHRydWUgaWYgaXQgaXMgcmVxdWVzdGVkIGF0IGZpcnN0IHRpbWVcbiAgICovXG4gIHByaXZhdGUgY2hlY2tSZXNvbHZlZChyZXF1ZXN0RGVwOiBzdHJpbmcsIGJ5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCBieUxpc3QgPSB0aGlzLnJlcXVlc3RNYXAuZ2V0KHJlcXVlc3REZXApO1xuICAgIGlmIChieUxpc3QpIHtcbiAgICAgIGJ5TGlzdC5wdXNoKGJ5KTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yZXF1ZXN0TWFwLnNldChyZXF1ZXN0RGVwLCBbYnldKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX3dhbGsoKSB7XG4gICAgY29uc3QgcmVzb2x2ZSA9IChwYXRoOiBzdHJpbmcsIGZpbGU6IHN0cmluZywgY2I/OiAocmVzb2x2ZWRGaWxlOiBzdHJpbmcpID0+IHZvaWQpID0+IHtcbiAgICAgIGNvbnN0IHJlc29sdmVkID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUocGF0aCwgZmlsZSwgdGhpcy5jbywgdGhpcy5ob3N0LCB0aGlzLnJlc0NhY2hlKS5yZXNvbHZlZE1vZHVsZTtcbiAgICAgIGlmIChyZXNvbHZlZCkge1xuICAgICAgICBjb25zdCBkZXAgPSByZXNvbHZlZC5yZXNvbHZlZEZpbGVOYW1lO1xuICAgICAgICBpZiAoZGVwLmVuZHNXaXRoKCcudHMnKSAmJiAhZGVwLmVuZHNXaXRoKCcuZC50cycpKSB7XG4gICAgICAgICAgaWYgKHRoaXMuY2hlY2tSZXNvbHZlZChkZXAsIGZpbGUpKSB7XG4gICAgICAgICAgLy8gbG9nLmRlYnVnKCdkZXA6ICcgKyBQYXRoLnJlbGF0aXZlKHJvb3RQYXRoLCBkZXApICsgJyxcXG4gIGZyb20gJyArIFBhdGgucmVsYXRpdmUocm9vdFBhdGgsIGZpbGUpKTtcbiAgICAgICAgICAgIHRoaXMudG9XYWxrLnB1c2goZGVwKTtcbiAgICAgICAgICAgIGlmIChjYikge1xuICAgICAgICAgICAgICBjYihkZXApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gdGhpcy51bnJlc29sdmVkLnB1c2goe21vZHVsZTogcGF0aCwgc3JjRmlsZTogZmlsZX0pO1xuICAgICAgICAvLyBUT0RPOiBsb2cgdW5yZXNvbHZlZFxuICAgICAgfVxuICAgIH07XG5cbiAgICB3aGlsZSAodGhpcy50b1dhbGsubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgZmlsZSA9IHRoaXMudG9XYWxrLnNoaWZ0KCkhO1xuXG4gICAgICBjb25zdCByZXBsYWNlZCA9IHRoaXMucmVwbGFjZW1lbnRzLmdldChmaWxlKTtcbiAgICAgIGNvbnN0IHEgPSBuZXcgUXVlcnkodGhpcy5yZWFkRmlsZSEocmVwbGFjZWQgfHwgZmlsZSksIGZpbGUpO1xuXG4gICAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgICAgcS53YWxrQXN0KHEuc3JjLCBbXG4gICAgICAgIHtcbiAgICAgICAgICBxdWVyeTogJy5tb2R1bGVTcGVjaWZpZXI6U3RyaW5nTGl0ZXJhbCcsIC8vIEJvdGggOkV4cG9ydERlY2xhcmF0aW9uIG9yIDpJbXBvcnREZWNsYXJhdGlvblxuICAgICAgICAgIGNhbGxiYWNrKGFzdCkge1xuICAgICAgICAgICAgcmVzb2x2ZSgoYXN0IGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQsIGZpbGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHF1ZXJ5OiAnOlByb3BlcnR5QXNzaWdubWVudD4ubmFtZScsXG4gICAgICAgICAgY2FsbGJhY2soYXN0LCBwYXRoLCBwYXJlbnRzKSB7XG4gICAgICAgICAgICBpZiAoYXN0LmdldFRleHQoKSA9PT0gJ2xvYWRDaGlsZHJlbicpIHtcbiAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAoYXN0LnBhcmVudCBhcyB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnQpLmluaXRpYWxpemVyO1xuICAgICAgICAgICAgICBpZiAodmFsdWUua2luZCA9PT0gdHMuU3ludGF4S2luZC5TdHJpbmdMaXRlcmFsKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGF6eU1vZHVsZSA9ICh2YWx1ZSBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0O1xuICAgICAgICAgICAgICAgIGNvbnN0IGhhc2hUYWcgPSBsYXp5TW9kdWxlLmluZGV4T2YoJyMnKTtcbiAgICAgICAgICAgICAgICBpZiAoaGFzaFRhZyA+IDApIHtcbiAgICAgICAgICAgICAgICAgIC8vIFdlIGZvdW5kIGxhenkgcm91dGUgbW9kdWxlXG4gICAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tY29uc29sZVxuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2xhenkgcm91dGUgbW9kdWxlOicsIGxhenlNb2R1bGUpO1xuICAgICAgICAgICAgICAgICAgcmVzb2x2ZShsYXp5TW9kdWxlLnNsaWNlKDAsIGhhc2hUYWcpLCBmaWxlLCByZXNvbHZlZCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYubG9hZENoaWxkcmVuLmFkZChyZXNvbHZlZCk7XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBxdWVyeTogJzpDYWxsRXhwcmVzc2lvbj4uZXhwcmVzc2lvbjpJbXBvcnRLZXl3b3JkJyxcbiAgICAgICAgICBjYWxsYmFjayhhc3QsIHBhdGgpIHtcbiAgICAgICAgICAgIHJlc29sdmUoKChhc3QucGFyZW50IGFzIHRzLkNhbGxFeHByZXNzaW9uKS5hcmd1bWVudHNbMF0gYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dCwgZmlsZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBdKTtcbiAgICB9XG4gIH1cblxufVxuIl19
