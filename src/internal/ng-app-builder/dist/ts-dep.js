"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const ts_ast_query_1 = tslib_1.__importDefault(require("./utils/ts-ast-query"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const typescript_1 = tslib_1.__importStar(require("typescript"));
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
        /** files as which TS compiler considers from node_modules
         * TS compiler will not compile them if they are not explicitly
         * involved in tsconfig
          */
        this.externals = new Set();
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
    checkResolved(requestDep, by, isExternal) {
        const byList = this.requestMap.get(requestDep);
        if (byList) {
            byList.push(by);
            return false;
        }
        else {
            this.requestMap.set(requestDep, [by]);
            if (isExternal)
                this.externals.add(requestDep);
            return true;
        }
    }
    _walk() {
        const resolve = (path, file, cb) => {
            const resolved = typescript_1.default.resolveModuleName(path, file, this.co, this.host, this.resCache).resolvedModule;
            if (resolved) {
                const dep = resolved.resolvedFileName;
                if (resolved.extension === typescript_1.Extension.Ts || resolved.extension === typescript_1.Extension.Tsx /*dep.endsWith('.ts') && !dep.endsWith('.d.ts')*/) {
                    if (this.checkResolved(dep, file, !!resolved.isExternalLibraryImport)) {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy90cy1kZXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsZ0ZBQXlDO0FBQ3pDLG9EQUFvQjtBQUNwQixpRUFBeUM7QUFDekMsd0RBQXdCO0FBQ3hCLDJCQUE4QjtBQUM5Qix1Q0FBNkM7QUFDN0MsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQzFCLDJCQUEyQjtBQUMzQix5RUFBeUU7QUFFekUsTUFBcUIsaUJBQWlCO0lBaUJwQyxZQUFvQixFQUFzQixFQUN4QyxtQkFBOEYsRUFBRSxFQUN4RixRQUFtQztRQUZ6QixPQUFFLEdBQUYsRUFBRSxDQUFvQjtRQUVoQyxhQUFRLEdBQVIsUUFBUSxDQUEyQjtRQWxCN0MsZUFBVSxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDLENBQUMsb0RBQW9EO1FBQzlGOztXQUVHO1FBQ0gsaUJBQVksR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQ2pDOzs7WUFHSTtRQUNKLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQzlCLFdBQU0sR0FBYSxFQUFFLENBQUM7UUFJZCxpQkFBWSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBTS9DLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUM5QixJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FDbkIsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxHQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUMzRCxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFlBQWEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN2RSxDQUFDLENBQUMsQ0FBQztRQUVILElBQUks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RUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLEVBQUU7d0NBQ3JELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29DQUNsQyxDQUFDLENBQUMsQ0FBQztpQ0FDSjs2QkFDRjt5QkFDRjtvQkFDSCxDQUFDO2lCQUNGO2dCQUNEO29CQUNFLEtBQUssRUFBRSwyQ0FBMkM7b0JBQ2xELFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSTt3QkFDaEIsT0FBTyxDQUFHLEdBQUcsQ0FBQyxNQUE0QixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQXNCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUMzRixDQUFDO2lCQUNGO2FBQ0YsQ0FBQyxDQUFDO1NBQ0o7SUFDSCxDQUFDO0NBRUY7QUE5SkQsb0NBOEpDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3RzLWRlcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBRdWVyeSBmcm9tICcuL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHRzLCB7RXh0ZW5zaW9ufSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtFT0wgYXMgZW9sfSBmcm9tICdvcyc7XG5pbXBvcnQgeyBjcmVhdGVXcml0ZVN0cmVhbSB9IGZyb20gJ2ZzLWV4dHJhJztcbmNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4vLyBpbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbi8vIGNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLnRzLWRlcHMnKTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVHNEZXBlbmRlbmN5R3JhcGgge1xuICByZXF1ZXN0TWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZ1tdPigpOyAvLyBrZXkgaXMgZmlsZSB0aGF0IHJlcXVlc3RlZCwgdmFsdWUgaXMgd2hvIHJlcXVlc3RzXG4gIC8qKlxuICAgKiBBbmd1bGFyIHN0eWxlIGxhenkgcm91dGUgbG9hZGluZyBncmFtbWFyIFxuICAgKi9cbiAgbG9hZENoaWxkcmVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIC8qKiBmaWxlcyBhcyB3aGljaCBUUyBjb21waWxlciBjb25zaWRlcnMgZnJvbSBub2RlX21vZHVsZXNcbiAgICogVFMgY29tcGlsZXIgd2lsbCBub3QgY29tcGlsZSB0aGVtIGlmIHRoZXkgYXJlIG5vdCBleHBsaWNpdGx5XG4gICAqIGludm9sdmVkIGluIHRzY29uZmlnXG4gICAgKi9cbiAgZXh0ZXJuYWxzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIHRvV2Fsazogc3RyaW5nW10gPSBbXTtcblxuICBwcml2YXRlIHJlc0NhY2hlOiB0cy5Nb2R1bGVSZXNvbHV0aW9uQ2FjaGU7XG4gIHByaXZhdGUgaG9zdDogdHMuQ29tcGlsZXJIb3N0O1xuICBwcml2YXRlIHJlcGxhY2VtZW50cyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBjbzogdHMuQ29tcGlsZXJPcHRpb25zLFxuICAgIGZpbGVSZXBsYWNlbWVudHM6IHtyZXBsYWNlPzogc3RyaW5nLCBzcmM/OiBzdHJpbmcsICB3aXRoPzogc3RyaW5nLCByZXBsYWNlV2lkdGg/OiBzdHJpbmd9W10gPSBbXSxcbiAgICBwcml2YXRlIHJlYWRGaWxlPzogKGZpbGU6IHN0cmluZykgPT4gc3RyaW5nKSB7XG5cbiAgICBmaWxlUmVwbGFjZW1lbnRzLmZvckVhY2gocGFpciA9PiB7XG4gICAgICB0aGlzLnJlcGxhY2VtZW50cy5zZXQoXG4gICAgICAgIFBhdGgucmVzb2x2ZShwYWlyLnJlcGxhY2UgfHwgcGFpci5zcmMhKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgICAgIFBhdGgucmVzb2x2ZShwYWlyLndpdGggfHwgcGFpci5yZXBsYWNlV2lkdGghKS5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5yZXNDYWNoZSA9IHRzLmNyZWF0ZU1vZHVsZVJlc29sdXRpb25DYWNoZShwcm9jZXNzLmN3ZCgpLFxuICAgICAgZmlsZU5hbWUgPT4gZmlsZU5hbWUsXG4gICAgICBjbyk7XG4gICAgdGhpcy5ob3N0ID0gdHMuY3JlYXRlQ29tcGlsZXJIb3N0KGNvKTtcblxuICAgIGlmICghcmVhZEZpbGUpIHtcbiAgICAgIHRoaXMucmVhZEZpbGUgPSBmaWxlID0+IHtcbiAgICAgICAgcmV0dXJuIGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpO1xuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIGZpbGUgbXVzdCBiZSBhYnNvbHV0ZSBwYXRoXG4gICAqL1xuICB3YWxrRm9yRGVwZW5kZW5jaWVzKGZpbGU6IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMudG9XYWxrLnB1c2goZmlsZSk7XG4gICAgdGhpcy5fd2FsaygpO1xuICB9XG5cbiAgcmVwb3J0KGxvZ0ZpbGU6IHN0cmluZykge1xuXG4gICAgY29uc3QgZyA9IHRoaXM7XG4gICAgLy8gY29uc3QgbG9nRmlsZSA9IGFwaS5jb25maWcucmVzb2x2ZSgnZGVzdERpcicsICduZy1hcHAtYnVpbGRlci5yZXBvcnQnLCAndHMtZGVwcy50eHQnKTtcblxuICAgIGNvbnN0IHJlcG9ydE91dCA9IGNyZWF0ZVdyaXRlU3RyZWFtKGxvZ0ZpbGUpO1xuICAgIHJlcG9ydE91dC53cml0ZShuZXcgRGF0ZSgpLnRvTG9jYWxlU3RyaW5nKCkpO1xuICAgIHJlcG9ydE91dC53cml0ZShlb2wpO1xuICAgIC8vIFRPRE86IG9wdGltaXplIC0gdXNlIGEgXy5zb3J0ZWRJbmRleCB0byBtYWtlIGEgc29ydGVkIG1hcCwgb3IgdXNlIGEgc2VwYXJhdGUgd29ya2VyIHByb2Nlc3NcbiAgICBjb25zdCBzb3J0ZWRFbnRyaWVzID0gQXJyYXkuZnJvbShnLnJlcXVlc3RNYXAuZW50cmllcygpKS5zb3J0KChlbnRyeTEsIGVudHJ5MikgPT4gZW50cnkxWzBdID4gZW50cnkyWzBdID8gMSA6IC0xKTtcbiAgICBsZXQgaSA9IDA7XG4gICAgZm9yIChjb25zdCBbZGVwLCBieV0gb2Ygc29ydGVkRW50cmllcykge1xuICAgICAgY29uc3QgcGFkID0gNCAtIChpICsgJycpLmxlbmd0aDtcbiAgICAgIHJlcG9ydE91dC53cml0ZSgnICcucmVwZWF0KHBhZCkpO1xuICAgICAgcmVwb3J0T3V0LndyaXRlKGkrKyArICcuICcpO1xuICAgICAgcmVwb3J0T3V0LndyaXRlKFBhdGgucmVsYXRpdmUoY3dkLCBkZXApKTtcbiAgICAgIHJlcG9ydE91dC53cml0ZShlb2wpO1xuICAgICAgZm9yIChjb25zdCBzaW5nbGVCeSBvZiBieSkge1xuICAgICAgICByZXBvcnRPdXQud3JpdGUoJyAgICAgICAgLSAnICsgUGF0aC5yZWxhdGl2ZShjd2QsIHNpbmdsZUJ5KSk7XG4gICAgICAgIHJlcG9ydE91dC53cml0ZShlb2wpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHJlcG9ydE91dC5lbmQocmVzb2x2ZSkpO1xuXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqIEBwYXJhbSByZXF1ZXN0RGVwIFxuICAgKiBAcGFyYW0gYnkgXG4gICAqIEByZXR1cm5zIHRydWUgaWYgaXQgaXMgcmVxdWVzdGVkIGF0IGZpcnN0IHRpbWVcbiAgICovXG4gIHByaXZhdGUgY2hlY2tSZXNvbHZlZChyZXF1ZXN0RGVwOiBzdHJpbmcsIGJ5OiBzdHJpbmcsIGlzRXh0ZXJuYWw6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICBjb25zdCBieUxpc3QgPSB0aGlzLnJlcXVlc3RNYXAuZ2V0KHJlcXVlc3REZXApO1xuICAgIGlmIChieUxpc3QpIHtcbiAgICAgIGJ5TGlzdC5wdXNoKGJ5KTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yZXF1ZXN0TWFwLnNldChyZXF1ZXN0RGVwLCBbYnldKTtcbiAgICAgIGlmIChpc0V4dGVybmFsKVxuICAgICAgICB0aGlzLmV4dGVybmFscy5hZGQocmVxdWVzdERlcCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF93YWxrKCkge1xuICAgIGNvbnN0IHJlc29sdmUgPSAocGF0aDogc3RyaW5nLCBmaWxlOiBzdHJpbmcsIGNiPzogKHJlc29sdmVkRmlsZTogc3RyaW5nKSA9PiB2b2lkKSA9PiB7XG4gICAgICBjb25zdCByZXNvbHZlZCA9IHRzLnJlc29sdmVNb2R1bGVOYW1lKHBhdGgsIGZpbGUsIHRoaXMuY28sIHRoaXMuaG9zdCwgdGhpcy5yZXNDYWNoZSkucmVzb2x2ZWRNb2R1bGU7XG4gICAgICBpZiAocmVzb2x2ZWQpIHtcbiAgICAgICAgY29uc3QgZGVwID0gcmVzb2x2ZWQucmVzb2x2ZWRGaWxlTmFtZTtcbiAgICAgICAgaWYgKHJlc29sdmVkLmV4dGVuc2lvbiA9PT0gRXh0ZW5zaW9uLlRzIHx8IHJlc29sdmVkLmV4dGVuc2lvbiA9PT0gRXh0ZW5zaW9uLlRzeCAvKmRlcC5lbmRzV2l0aCgnLnRzJykgJiYgIWRlcC5lbmRzV2l0aCgnLmQudHMnKSovKSB7XG4gICAgICAgICAgaWYgKHRoaXMuY2hlY2tSZXNvbHZlZChkZXAsIGZpbGUsICEhcmVzb2x2ZWQuaXNFeHRlcm5hbExpYnJhcnlJbXBvcnQpKSB7XG4gICAgICAgICAgLy8gbG9nLmRlYnVnKCdkZXA6ICcgKyBQYXRoLnJlbGF0aXZlKHJvb3RQYXRoLCBkZXApICsgJyxcXG4gIGZyb20gJyArIFBhdGgucmVsYXRpdmUocm9vdFBhdGgsIGZpbGUpKTtcbiAgICAgICAgICAgIHRoaXMudG9XYWxrLnB1c2goZGVwKTtcbiAgICAgICAgICAgIGlmIChjYikge1xuICAgICAgICAgICAgICBjYihkZXApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gdGhpcy51bnJlc29sdmVkLnB1c2goe21vZHVsZTogcGF0aCwgc3JjRmlsZTogZmlsZX0pO1xuICAgICAgICAvLyBUT0RPOiBsb2cgdW5yZXNvbHZlZFxuICAgICAgfVxuICAgIH07XG5cbiAgICB3aGlsZSAodGhpcy50b1dhbGsubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgZmlsZSA9IHRoaXMudG9XYWxrLnNoaWZ0KCkhO1xuXG4gICAgICBjb25zdCByZXBsYWNlZCA9IHRoaXMucmVwbGFjZW1lbnRzLmdldChmaWxlKTtcbiAgICAgIGNvbnN0IHEgPSBuZXcgUXVlcnkodGhpcy5yZWFkRmlsZSEocmVwbGFjZWQgfHwgZmlsZSksIGZpbGUpO1xuXG4gICAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgICAgcS53YWxrQXN0KHEuc3JjLCBbXG4gICAgICAgIHtcbiAgICAgICAgICBxdWVyeTogJy5tb2R1bGVTcGVjaWZpZXI6U3RyaW5nTGl0ZXJhbCcsIC8vIEJvdGggOkV4cG9ydERlY2xhcmF0aW9uIG9yIDpJbXBvcnREZWNsYXJhdGlvblxuICAgICAgICAgIGNhbGxiYWNrKGFzdCkge1xuICAgICAgICAgICAgcmVzb2x2ZSgoYXN0IGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQsIGZpbGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHF1ZXJ5OiAnOlByb3BlcnR5QXNzaWdubWVudD4ubmFtZScsXG4gICAgICAgICAgY2FsbGJhY2soYXN0LCBwYXRoLCBwYXJlbnRzKSB7XG4gICAgICAgICAgICBpZiAoYXN0LmdldFRleHQoKSA9PT0gJ2xvYWRDaGlsZHJlbicpIHtcbiAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAoYXN0LnBhcmVudCBhcyB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnQpLmluaXRpYWxpemVyO1xuICAgICAgICAgICAgICBpZiAodmFsdWUua2luZCA9PT0gdHMuU3ludGF4S2luZC5TdHJpbmdMaXRlcmFsKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGF6eU1vZHVsZSA9ICh2YWx1ZSBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0O1xuICAgICAgICAgICAgICAgIGNvbnN0IGhhc2hUYWcgPSBsYXp5TW9kdWxlLmluZGV4T2YoJyMnKTtcbiAgICAgICAgICAgICAgICBpZiAoaGFzaFRhZyA+IDApIHtcbiAgICAgICAgICAgICAgICAgIC8vIFdlIGZvdW5kIGxhenkgcm91dGUgbW9kdWxlXG4gICAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tY29uc29sZVxuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2xhenkgcm91dGUgbW9kdWxlOicsIGxhenlNb2R1bGUpO1xuICAgICAgICAgICAgICAgICAgcmVzb2x2ZShsYXp5TW9kdWxlLnNsaWNlKDAsIGhhc2hUYWcpLCBmaWxlLCByZXNvbHZlZCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYubG9hZENoaWxkcmVuLmFkZChyZXNvbHZlZCk7XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBxdWVyeTogJzpDYWxsRXhwcmVzc2lvbj4uZXhwcmVzc2lvbjpJbXBvcnRLZXl3b3JkJyxcbiAgICAgICAgICBjYWxsYmFjayhhc3QsIHBhdGgpIHtcbiAgICAgICAgICAgIHJlc29sdmUoKChhc3QucGFyZW50IGFzIHRzLkNhbGxFeHByZXNzaW9uKS5hcmd1bWVudHNbMF0gYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dCwgZmlsZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBdKTtcbiAgICB9XG4gIH1cblxufVxuIl19
