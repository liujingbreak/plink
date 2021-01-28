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
const ts_ast_query_1 = __importDefault(require("./utils/ts-ast-query"));
const fs_1 = __importDefault(require("fs"));
const typescript_1 = __importStar(require("typescript"));
const path_1 = __importDefault(require("path"));
const os_1 = require("os");
const fs_extra_1 = require("fs-extra");
const cwd = process.cwd();
// import api from '__api';
// const log = require('log4js').getLogger(api.packageName + '.ts-deps');
class TsDependencyGraph {
    constructor(co, fileReplacements = [], packageFileResolver, readFile) {
        this.co = co;
        this.packageFileResolver = packageFileResolver;
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
        reportOut.write('----- loadChildren -----' + os_1.EOL);
        for (const lc of this.loadChildren.values()) {
            reportOut.write('  ' + lc);
            reportOut.write(os_1.EOL);
        }
        reportOut.write('----- ExternalLibraryImport -----' + os_1.EOL);
        for (const lc of this.externals.values()) {
            reportOut.write('  ' + lc);
            reportOut.write(os_1.EOL);
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
            // console.log('resolving', path, file);
            const resolved = typescript_1.default.resolveModuleName(path, file, this.co, this.host, this.resCache).resolvedModule;
            // console.log('     resolve', path, resolved ? resolved.resolvedFileName : resolved);
            if (resolved) {
                const dep = resolved.resolvedFileName;
                if (resolved.extension === typescript_1.Extension.Ts || resolved.extension === typescript_1.Extension.Tsx /*dep.endsWith('.ts') && !dep.endsWith('.d.ts')*/) {
                    if (this.checkResolved(dep, file, !!resolved.isExternalLibraryImport)) {
                        // console.log('dep: ' + Path.relative(rootPath, dep) + ',\n  from ' + Path.relative(rootPath, file));
                        this.toWalk.push(dep);
                        if (cb) {
                            cb(dep);
                        }
                    }
                }
            }
            else {
                if (this.packageFileResolver && !path.startsWith('.')) {
                    const dep = this.packageFileResolver(path);
                    if (dep && this.checkResolved(dep, file, true)) {
                        this.toWalk.push(dep);
                        if (cb) {
                            cb(dep);
                        }
                    }
                }
                // this.unresolved.push({module: path, srcFile: file});
                // TODO: log unresolved
                // console.log(`NOT resolved ${path} in ${file}`);
            }
        };
        while (this.toWalk.length > 0) {
            const file = this.toWalk.shift();
            const replaced = this.replacements.get(file);
            const q = new ts_ast_query_1.default(this.readFile(replaced || file), file);
            // console.log('###### walk', file);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtZGVwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidHMtZGVwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHdFQUF5QztBQUN6Qyw0Q0FBb0I7QUFDcEIseURBQXlDO0FBQ3pDLGdEQUF3QjtBQUN4QiwyQkFBOEI7QUFDOUIsdUNBQTZDO0FBQzdDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUMxQiwyQkFBMkI7QUFDM0IseUVBQXlFO0FBRXpFLE1BQXFCLGlCQUFpQjtJQWlCcEMsWUFBb0IsRUFBc0IsRUFDeEMsbUJBQThGLEVBQUUsRUFDeEYsbUJBQTBELEVBQzFELFFBQW1DO1FBSHpCLE9BQUUsR0FBRixFQUFFLENBQW9CO1FBRWhDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBdUM7UUFDMUQsYUFBUSxHQUFSLFFBQVEsQ0FBMkI7UUFuQjdDLGVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBb0IsQ0FBQyxDQUFDLG9EQUFvRDtRQUM5Rjs7V0FFRztRQUNILGlCQUFZLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUNqQzs7O1lBR0k7UUFDSixjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUM5QixXQUFNLEdBQWEsRUFBRSxDQUFDO1FBSWQsaUJBQVksR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQVEvQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDOUIsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQ25CLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsR0FBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsRUFDM0QsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxZQUFhLENBQUMsQ0FBQyxPQUFPLENBQUMs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QUNyRCxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztvQ0FDbEMsQ0FBQyxDQUFDLENBQUM7aUNBQ0o7NkJBQ0Y7eUJBQ0Y7b0JBQ0gsQ0FBQztpQkFDRjtnQkFDRDtvQkFDRSxLQUFLLEVBQUUsMkNBQTJDO29CQUNsRCxRQUFRLENBQUMsR0FBRyxFQUFFLElBQUk7d0JBQ2hCLE9BQU8sQ0FBRyxHQUFHLENBQUMsTUFBNEIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFzQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDM0YsQ0FBQztpQkFDRjthQUNGLENBQUMsQ0FBQztTQUNKO0lBQ0gsQ0FBQztDQUVGO0FBeExELG9DQXdMQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBRdWVyeSBmcm9tICcuL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHRzLCB7RXh0ZW5zaW9ufSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtFT0wgYXMgZW9sfSBmcm9tICdvcyc7XG5pbXBvcnQgeyBjcmVhdGVXcml0ZVN0cmVhbSB9IGZyb20gJ2ZzLWV4dHJhJztcbmNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4vLyBpbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbi8vIGNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLnRzLWRlcHMnKTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVHNEZXBlbmRlbmN5R3JhcGgge1xuICByZXF1ZXN0TWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZ1tdPigpOyAvLyBrZXkgaXMgZmlsZSB0aGF0IHJlcXVlc3RlZCwgdmFsdWUgaXMgd2hvIHJlcXVlc3RzXG4gIC8qKlxuICAgKiBBbmd1bGFyIHN0eWxlIGxhenkgcm91dGUgbG9hZGluZyBncmFtbWFyIFxuICAgKi9cbiAgbG9hZENoaWxkcmVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIC8qKiBmaWxlcyBhcyB3aGljaCBUUyBjb21waWxlciBjb25zaWRlcnMgZnJvbSBub2RlX21vZHVsZXNcbiAgICogVFMgY29tcGlsZXIgd2lsbCBub3QgY29tcGlsZSB0aGVtIGlmIHRoZXkgYXJlIG5vdCBleHBsaWNpdGx5XG4gICAqIGludm9sdmVkIGluIHRzY29uZmlnXG4gICAgKi9cbiAgZXh0ZXJuYWxzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIHRvV2Fsazogc3RyaW5nW10gPSBbXTtcblxuICBwcml2YXRlIHJlc0NhY2hlOiB0cy5Nb2R1bGVSZXNvbHV0aW9uQ2FjaGU7XG4gIHByaXZhdGUgaG9zdDogdHMuQ29tcGlsZXJIb3N0O1xuICBwcml2YXRlIHJlcGxhY2VtZW50cyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBjbzogdHMuQ29tcGlsZXJPcHRpb25zLFxuICAgIGZpbGVSZXBsYWNlbWVudHM6IHtyZXBsYWNlPzogc3RyaW5nLCBzcmM/OiBzdHJpbmcsICB3aXRoPzogc3RyaW5nLCByZXBsYWNlV2lkdGg/OiBzdHJpbmd9W10gPSBbXSxcbiAgICBwcml2YXRlIHBhY2thZ2VGaWxlUmVzb2x2ZXI/OiAocGF0aDogc3RyaW5nKSA9PiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgcHJpdmF0ZSByZWFkRmlsZT86IChmaWxlOiBzdHJpbmcpID0+IHN0cmluZ1xuICApIHtcblxuICAgIGZpbGVSZXBsYWNlbWVudHMuZm9yRWFjaChwYWlyID0+IHtcbiAgICAgIHRoaXMucmVwbGFjZW1lbnRzLnNldChcbiAgICAgICAgUGF0aC5yZXNvbHZlKHBhaXIucmVwbGFjZSB8fCBwYWlyLnNyYyEpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICAgICAgUGF0aC5yZXNvbHZlKHBhaXIud2l0aCB8fCBwYWlyLnJlcGxhY2VXaWR0aCEpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLnJlc0NhY2hlID0gdHMuY3JlYXRlTW9kdWxlUmVzb2x1dGlvbkNhY2hlKHByb2Nlc3MuY3dkKCksXG4gICAgICBmaWxlTmFtZSA9PiBmaWxlTmFtZSxcbiAgICAgIGNvKTtcbiAgICB0aGlzLmhvc3QgPSB0cy5jcmVhdGVDb21waWxlckhvc3QoY28pO1xuXG4gICAgaWYgKCFyZWFkRmlsZSkge1xuICAgICAgdGhpcy5yZWFkRmlsZSA9IGZpbGUgPT4ge1xuICAgICAgICByZXR1cm4gZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4Jyk7XG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0gZmlsZSBtdXN0IGJlIGFic29sdXRlIHBhdGhcbiAgICovXG4gIHdhbGtGb3JEZXBlbmRlbmNpZXMoZmlsZTogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy50b1dhbGsucHVzaChmaWxlKTtcbiAgICB0aGlzLl93YWxrKCk7XG4gIH1cblxuICByZXBvcnQobG9nRmlsZTogc3RyaW5nKSB7XG5cbiAgICBjb25zdCBnID0gdGhpcztcbiAgICAvLyBjb25zdCBsb2dGaWxlID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ25nLWFwcC1idWlsZGVyLnJlcG9ydCcsICd0cy1kZXBzLnR4dCcpO1xuXG4gICAgY29uc3QgcmVwb3J0T3V0ID0gY3JlYXRlV3JpdGVTdHJlYW0obG9nRmlsZSk7XG4gICAgcmVwb3J0T3V0LndyaXRlKG5ldyBEYXRlKCkudG9Mb2NhbGVTdHJpbmcoKSk7XG4gICAgcmVwb3J0T3V0LndyaXRlKGVvbCk7XG4gICAgLy8gVE9ETzogb3B0aW1pemUgLSB1c2UgYSBfLnNvcnRlZEluZGV4IHRvIG1ha2UgYSBzb3J0ZWQgbWFwLCBvciB1c2UgYSBzZXBhcmF0ZSB3b3JrZXIgcHJvY2Vzc1xuICAgIGNvbnN0IHNvcnRlZEVudHJpZXMgPSBBcnJheS5mcm9tKGcucmVxdWVzdE1hcC5lbnRyaWVzKCkpLnNvcnQoKGVudHJ5MSwgZW50cnkyKSA9PiBlbnRyeTFbMF0gPiBlbnRyeTJbMF0gPyAxIDogLTEpO1xuICAgIGxldCBpID0gMDtcbiAgICBmb3IgKGNvbnN0IFtkZXAsIGJ5XSBvZiBzb3J0ZWRFbnRyaWVzKSB7XG4gICAgICBjb25zdCBwYWQgPSA0IC0gKGkgKyAnJykubGVuZ3RoO1xuICAgICAgcmVwb3J0T3V0LndyaXRlKCcgJy5yZXBlYXQocGFkKSk7XG4gICAgICByZXBvcnRPdXQud3JpdGUoaSsrICsgJy4gJyk7XG4gICAgICByZXBvcnRPdXQud3JpdGUoUGF0aC5yZWxhdGl2ZShjd2QsIGRlcCkpO1xuICAgICAgcmVwb3J0T3V0LndyaXRlKGVvbCk7XG4gICAgICBmb3IgKGNvbnN0IHNpbmdsZUJ5IG9mIGJ5KSB7XG4gICAgICAgIHJlcG9ydE91dC53cml0ZSgnICAgICAgICAtICcgKyBQYXRoLnJlbGF0aXZlKGN3ZCwgc2luZ2xlQnkpKTtcbiAgICAgICAgcmVwb3J0T3V0LndyaXRlKGVvbCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmVwb3J0T3V0LndyaXRlKCctLS0tLSBsb2FkQ2hpbGRyZW4gLS0tLS0nICsgZW9sKTtcbiAgICBmb3IgKGNvbnN0IGxjIG9mIHRoaXMubG9hZENoaWxkcmVuLnZhbHVlcygpKSB7XG4gICAgICByZXBvcnRPdXQud3JpdGUoJyAgJyArIGxjKTtcbiAgICAgIHJlcG9ydE91dC53cml0ZShlb2wpO1xuICAgIH1cbiAgICByZXBvcnRPdXQud3JpdGUoJy0tLS0tIEV4dGVybmFsTGlicmFyeUltcG9ydCAtLS0tLScgKyBlb2wpO1xuICAgIGZvciAoY29uc3QgbGMgb2YgdGhpcy5leHRlcm5hbHMudmFsdWVzKCkpIHtcbiAgICAgIHJlcG9ydE91dC53cml0ZSgnICAnICsgbGMpO1xuICAgICAgcmVwb3J0T3V0LndyaXRlKGVvbCk7XG4gICAgfVxuXG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiByZXBvcnRPdXQuZW5kKHJlc29sdmUpKTtcblxuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKiBAcGFyYW0gcmVxdWVzdERlcCBcbiAgICogQHBhcmFtIGJ5IFxuICAgKiBAcmV0dXJucyB0cnVlIGlmIGl0IGlzIHJlcXVlc3RlZCBhdCBmaXJzdCB0aW1lXG4gICAqL1xuICBwcml2YXRlIGNoZWNrUmVzb2x2ZWQocmVxdWVzdERlcDogc3RyaW5nLCBieTogc3RyaW5nLCBpc0V4dGVybmFsOiBib29sZWFuKTogYm9vbGVhbiB7XG4gICAgY29uc3QgYnlMaXN0ID0gdGhpcy5yZXF1ZXN0TWFwLmdldChyZXF1ZXN0RGVwKTtcbiAgICBpZiAoYnlMaXN0KSB7XG4gICAgICBieUxpc3QucHVzaChieSk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucmVxdWVzdE1hcC5zZXQocmVxdWVzdERlcCwgW2J5XSk7XG4gICAgICBpZiAoaXNFeHRlcm5hbClcbiAgICAgICAgdGhpcy5leHRlcm5hbHMuYWRkKHJlcXVlc3REZXApO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfd2FsaygpIHtcbiAgICBjb25zdCByZXNvbHZlID0gKHBhdGg6IHN0cmluZywgZmlsZTogc3RyaW5nLCBjYj86IChyZXNvbHZlZEZpbGU6IHN0cmluZykgPT4gdm9pZCkgPT4ge1xuICAgICAgLy8gY29uc29sZS5sb2coJ3Jlc29sdmluZycsIHBhdGgsIGZpbGUpO1xuICAgICAgY29uc3QgcmVzb2x2ZWQgPSB0cy5yZXNvbHZlTW9kdWxlTmFtZShwYXRoLCBmaWxlLCB0aGlzLmNvLCB0aGlzLmhvc3QsIHRoaXMucmVzQ2FjaGUpLnJlc29sdmVkTW9kdWxlO1xuICAgICAgLy8gY29uc29sZS5sb2coJyAgICAgcmVzb2x2ZScsIHBhdGgsIHJlc29sdmVkID8gcmVzb2x2ZWQucmVzb2x2ZWRGaWxlTmFtZSA6IHJlc29sdmVkKTtcbiAgICAgIGlmIChyZXNvbHZlZCkge1xuICAgICAgICBjb25zdCBkZXAgPSByZXNvbHZlZC5yZXNvbHZlZEZpbGVOYW1lO1xuICAgICAgICBpZiAocmVzb2x2ZWQuZXh0ZW5zaW9uID09PSBFeHRlbnNpb24uVHMgfHwgcmVzb2x2ZWQuZXh0ZW5zaW9uID09PSBFeHRlbnNpb24uVHN4IC8qZGVwLmVuZHNXaXRoKCcudHMnKSAmJiAhZGVwLmVuZHNXaXRoKCcuZC50cycpKi8pIHtcbiAgICAgICAgICBpZiAodGhpcy5jaGVja1Jlc29sdmVkKGRlcCwgZmlsZSwgISFyZXNvbHZlZC5pc0V4dGVybmFsTGlicmFyeUltcG9ydCkpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdkZXA6ICcgKyBQYXRoLnJlbGF0aXZlKHJvb3RQYXRoLCBkZXApICsgJyxcXG4gIGZyb20gJyArIFBhdGgucmVsYXRpdmUocm9vdFBhdGgsIGZpbGUpKTtcbiAgICAgICAgICAgIHRoaXMudG9XYWxrLnB1c2goZGVwKTtcbiAgICAgICAgICAgIGlmIChjYikge1xuICAgICAgICAgICAgICBjYihkZXApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMucGFja2FnZUZpbGVSZXNvbHZlciAmJiAhcGF0aC5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgICAgICBjb25zdCBkZXAgPSB0aGlzLnBhY2thZ2VGaWxlUmVzb2x2ZXIocGF0aCk7XG4gICAgICAgICAgaWYgKGRlcCAmJiB0aGlzLmNoZWNrUmVzb2x2ZWQoZGVwLCBmaWxlLCB0cnVlKSkge1xuICAgICAgICAgICAgdGhpcy50b1dhbGsucHVzaChkZXApO1xuICAgICAgICAgICAgaWYgKGNiKSB7XG4gICAgICAgICAgICAgIGNiKGRlcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIHRoaXMudW5yZXNvbHZlZC5wdXNoKHttb2R1bGU6IHBhdGgsIHNyY0ZpbGU6IGZpbGV9KTtcbiAgICAgICAgLy8gVE9ETzogbG9nIHVucmVzb2x2ZWRcbiAgICAgICAgLy8gY29uc29sZS5sb2coYE5PVCByZXNvbHZlZCAke3BhdGh9IGluICR7ZmlsZX1gKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgd2hpbGUgKHRoaXMudG9XYWxrLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLnRvV2Fsay5zaGlmdCgpITtcblxuICAgICAgY29uc3QgcmVwbGFjZWQgPSB0aGlzLnJlcGxhY2VtZW50cy5nZXQoZmlsZSk7XG4gICAgICBjb25zdCBxID0gbmV3IFF1ZXJ5KHRoaXMucmVhZEZpbGUhKHJlcGxhY2VkIHx8IGZpbGUpLCBmaWxlKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCcjIyMjIyMgd2FsaycsIGZpbGUpO1xuICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHEud2Fsa0FzdChxLnNyYywgW1xuICAgICAgICB7XG4gICAgICAgICAgcXVlcnk6ICcubW9kdWxlU3BlY2lmaWVyOlN0cmluZ0xpdGVyYWwnLCAvLyBCb3RoIDpFeHBvcnREZWNsYXJhdGlvbiBvciA6SW1wb3J0RGVjbGFyYXRpb25cbiAgICAgICAgICBjYWxsYmFjayhhc3QpIHtcbiAgICAgICAgICAgIHJlc29sdmUoKGFzdCBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0LCBmaWxlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBxdWVyeTogJzpQcm9wZXJ0eUFzc2lnbm1lbnQ+Lm5hbWUnLFxuICAgICAgICAgIGNhbGxiYWNrKGFzdCwgcGF0aCwgcGFyZW50cykge1xuICAgICAgICAgICAgaWYgKGFzdC5nZXRUZXh0KCkgPT09ICdsb2FkQ2hpbGRyZW4nKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gKGFzdC5wYXJlbnQgYXMgdHMuUHJvcGVydHlBc3NpZ25tZW50KS5pbml0aWFsaXplcjtcbiAgICAgICAgICAgICAgaWYgKHZhbHVlLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU3RyaW5nTGl0ZXJhbCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGxhenlNb2R1bGUgPSAodmFsdWUgYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dDtcbiAgICAgICAgICAgICAgICBjb25zdCBoYXNoVGFnID0gbGF6eU1vZHVsZS5pbmRleE9mKCcjJyk7XG4gICAgICAgICAgICAgICAgaWYgKGhhc2hUYWcgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAvLyBXZSBmb3VuZCBsYXp5IHJvdXRlIG1vZHVsZVxuICAgICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdsYXp5IHJvdXRlIG1vZHVsZTonLCBsYXp5TW9kdWxlKTtcbiAgICAgICAgICAgICAgICAgIHJlc29sdmUobGF6eU1vZHVsZS5zbGljZSgwLCBoYXNoVGFnKSwgZmlsZSwgcmVzb2x2ZWQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmxvYWRDaGlsZHJlbi5hZGQocmVzb2x2ZWQpO1xuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgcXVlcnk6ICc6Q2FsbEV4cHJlc3Npb24+LmV4cHJlc3Npb246SW1wb3J0S2V5d29yZCcsXG4gICAgICAgICAgY2FsbGJhY2soYXN0LCBwYXRoKSB7XG4gICAgICAgICAgICByZXNvbHZlKCgoYXN0LnBhcmVudCBhcyB0cy5DYWxsRXhwcmVzc2lvbikuYXJndW1lbnRzWzBdIGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQsIGZpbGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgXSk7XG4gICAgfVxuICB9XG5cbn1cbiJdfQ==