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
const ts_ast_query_1 = __importStar(require("@wfh/plink/wfh/dist/utils/ts-ast-query"));
const fs_1 = __importDefault(require("fs"));
// import ts, {Extension} from 'typescript';
const path_1 = __importDefault(require("path"));
const os_1 = require("os");
const fs_extra_1 = require("fs-extra");
const cwd = process.cwd();
const { Extension } = ts_ast_query_1.typescript;
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
        this.resCache = ts_ast_query_1.typescript.createModuleResolutionCache(process.cwd(), fileName => fileName, co);
        this.host = ts_ast_query_1.typescript.createCompilerHost(co);
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
            const resolved = ts_ast_query_1.typescript.resolveModuleName(path, file, this.co, this.host, this.resCache).resolvedModule;
            // console.log('     resolve', path, resolved ? resolved.resolvedFileName : resolved);
            if (resolved) {
                const dep = resolved.resolvedFileName;
                if (resolved.extension === Extension.Ts || resolved.extension === Extension.Tsx /*dep.endsWith('.ts') && !dep.endsWith('.d.ts')*/) {
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
                            if (value.kind === ts_ast_query_1.typescript.SyntaxKind.StringLiteral) {
                                const lazyModule = value.text;
                                const hashTag = lazyModule.indexOf('#');
                                if (hashTag > 0) {
                                    // We found lazy route module
                                    // eslint-disable-next-line no-console
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtZGVwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidHMtZGVwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHVGQUErRTtBQUMvRSw0Q0FBb0I7QUFDcEIsNENBQTRDO0FBQzVDLGdEQUF3QjtBQUN4QiwyQkFBOEI7QUFDOUIsdUNBQTZDO0FBQzdDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUMxQixNQUFNLEVBQUMsU0FBUyxFQUFDLEdBQUcseUJBQUUsQ0FBQztBQUN2QiwyQkFBMkI7QUFDM0IseUVBQXlFO0FBRXpFLE1BQXFCLGlCQUFpQjtJQWlCcEMsWUFBb0IsRUFBc0IsRUFDeEMsbUJBQThGLEVBQUUsRUFDeEYsbUJBQTBELEVBQzFELFFBQW1DO1FBSHpCLE9BQUUsR0FBRixFQUFFLENBQW9CO1FBRWhDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBdUM7UUFDMUQsYUFBUSxHQUFSLFFBQVEsQ0FBMkI7UUFuQjdDLGVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBb0IsQ0FBQyxDQUFDLG9EQUFvRDtRQUM5Rjs7V0FFRztRQUNILGlCQUFZLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUNqQzs7O1lBR0k7UUFDSixjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUM5QixXQUFNLEdBQWEsRUFBRSxDQUFDO1FBSWQsaUJBQVksR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQVEvQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDOUIsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQ25CLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsR0FBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsRUFDM0QsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFB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QU8sQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsRUFBRTt3Q0FDckQsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7b0NBQ2xDLENBQUMsQ0FBQyxDQUFDO2lDQUNKOzZCQUNGO3lCQUNGO29CQUNILENBQUM7aUJBQ0Y7Z0JBQ0Q7b0JBQ0UsS0FBSyxFQUFFLDJDQUEyQztvQkFDbEQsUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJO3dCQUNoQixPQUFPLENBQUcsR0FBRyxDQUFDLE1BQTRCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBc0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQzNGLENBQUM7aUJBQ0Y7YUFDRixDQUFDLENBQUM7U0FDSjtJQUNILENBQUM7Q0FFRjtBQXhMRCxvQ0F3TEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUXVlcnksIHt0eXBlc2NyaXB0IGFzIHRzfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuLy8gaW1wb3J0IHRzLCB7RXh0ZW5zaW9ufSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtFT0wgYXMgZW9sfSBmcm9tICdvcyc7XG5pbXBvcnQgeyBjcmVhdGVXcml0ZVN0cmVhbSB9IGZyb20gJ2ZzLWV4dHJhJztcbmNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG5jb25zdCB7RXh0ZW5zaW9ufSA9IHRzO1xuLy8gaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG4vLyBjb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy50cy1kZXBzJyk7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRzRGVwZW5kZW5jeUdyYXBoIHtcbiAgcmVxdWVzdE1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmdbXT4oKTsgLy8ga2V5IGlzIGZpbGUgdGhhdCByZXF1ZXN0ZWQsIHZhbHVlIGlzIHdobyByZXF1ZXN0c1xuICAvKipcbiAgICogQW5ndWxhciBzdHlsZSBsYXp5IHJvdXRlIGxvYWRpbmcgZ3JhbW1hciBcbiAgICovXG4gIGxvYWRDaGlsZHJlbiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAvKiogZmlsZXMgYXMgd2hpY2ggVFMgY29tcGlsZXIgY29uc2lkZXJzIGZyb20gbm9kZV9tb2R1bGVzXG4gICAqIFRTIGNvbXBpbGVyIHdpbGwgbm90IGNvbXBpbGUgdGhlbSBpZiB0aGV5IGFyZSBub3QgZXhwbGljaXRseVxuICAgKiBpbnZvbHZlZCBpbiB0c2NvbmZpZ1xuICAgICovXG4gIGV4dGVybmFscyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICB0b1dhbGs6IHN0cmluZ1tdID0gW107XG5cbiAgcHJpdmF0ZSByZXNDYWNoZTogdHMuTW9kdWxlUmVzb2x1dGlvbkNhY2hlO1xuICBwcml2YXRlIGhvc3Q6IHRzLkNvbXBpbGVySG9zdDtcbiAgcHJpdmF0ZSByZXBsYWNlbWVudHMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgY286IHRzLkNvbXBpbGVyT3B0aW9ucyxcbiAgICBmaWxlUmVwbGFjZW1lbnRzOiB7cmVwbGFjZT86IHN0cmluZywgc3JjPzogc3RyaW5nLCAgd2l0aD86IHN0cmluZywgcmVwbGFjZVdpZHRoPzogc3RyaW5nfVtdID0gW10sXG4gICAgcHJpdmF0ZSBwYWNrYWdlRmlsZVJlc29sdmVyPzogKHBhdGg6IHN0cmluZykgPT4gc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgIHByaXZhdGUgcmVhZEZpbGU/OiAoZmlsZTogc3RyaW5nKSA9PiBzdHJpbmdcbiAgKSB7XG5cbiAgICBmaWxlUmVwbGFjZW1lbnRzLmZvckVhY2gocGFpciA9PiB7XG4gICAgICB0aGlzLnJlcGxhY2VtZW50cy5zZXQoXG4gICAgICAgIFBhdGgucmVzb2x2ZShwYWlyLnJlcGxhY2UgfHwgcGFpci5zcmMhKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgICAgIFBhdGgucmVzb2x2ZShwYWlyLndpdGggfHwgcGFpci5yZXBsYWNlV2lkdGghKS5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5yZXNDYWNoZSA9IHRzLmNyZWF0ZU1vZHVsZVJlc29sdXRpb25DYWNoZShwcm9jZXNzLmN3ZCgpLFxuICAgICAgZmlsZU5hbWUgPT4gZmlsZU5hbWUsXG4gICAgICBjbyk7XG4gICAgdGhpcy5ob3N0ID0gdHMuY3JlYXRlQ29tcGlsZXJIb3N0KGNvKTtcblxuICAgIGlmICghcmVhZEZpbGUpIHtcbiAgICAgIHRoaXMucmVhZEZpbGUgPSBmaWxlID0+IHtcbiAgICAgICAgcmV0dXJuIGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpO1xuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIGZpbGUgbXVzdCBiZSBhYnNvbHV0ZSBwYXRoXG4gICAqL1xuICB3YWxrRm9yRGVwZW5kZW5jaWVzKGZpbGU6IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMudG9XYWxrLnB1c2goZmlsZSk7XG4gICAgdGhpcy5fd2FsaygpO1xuICB9XG5cbiAgcmVwb3J0KGxvZ0ZpbGU6IHN0cmluZykge1xuXG4gICAgY29uc3QgZyA9IHRoaXM7XG4gICAgLy8gY29uc3QgbG9nRmlsZSA9IGFwaS5jb25maWcucmVzb2x2ZSgnZGVzdERpcicsICduZy1hcHAtYnVpbGRlci5yZXBvcnQnLCAndHMtZGVwcy50eHQnKTtcblxuICAgIGNvbnN0IHJlcG9ydE91dCA9IGNyZWF0ZVdyaXRlU3RyZWFtKGxvZ0ZpbGUpO1xuICAgIHJlcG9ydE91dC53cml0ZShuZXcgRGF0ZSgpLnRvTG9jYWxlU3RyaW5nKCkpO1xuICAgIHJlcG9ydE91dC53cml0ZShlb2wpO1xuICAgIC8vIFRPRE86IG9wdGltaXplIC0gdXNlIGEgXy5zb3J0ZWRJbmRleCB0byBtYWtlIGEgc29ydGVkIG1hcCwgb3IgdXNlIGEgc2VwYXJhdGUgd29ya2VyIHByb2Nlc3NcbiAgICBjb25zdCBzb3J0ZWRFbnRyaWVzID0gQXJyYXkuZnJvbShnLnJlcXVlc3RNYXAuZW50cmllcygpKS5zb3J0KChlbnRyeTEsIGVudHJ5MikgPT4gZW50cnkxWzBdID4gZW50cnkyWzBdID8gMSA6IC0xKTtcbiAgICBsZXQgaSA9IDA7XG4gICAgZm9yIChjb25zdCBbZGVwLCBieV0gb2Ygc29ydGVkRW50cmllcykge1xuICAgICAgY29uc3QgcGFkID0gNCAtIChpICsgJycpLmxlbmd0aDtcbiAgICAgIHJlcG9ydE91dC53cml0ZSgnICcucmVwZWF0KHBhZCkpO1xuICAgICAgcmVwb3J0T3V0LndyaXRlKGkrKyArICcuICcpO1xuICAgICAgcmVwb3J0T3V0LndyaXRlKFBhdGgucmVsYXRpdmUoY3dkLCBkZXApKTtcbiAgICAgIHJlcG9ydE91dC53cml0ZShlb2wpO1xuICAgICAgZm9yIChjb25zdCBzaW5nbGVCeSBvZiBieSkge1xuICAgICAgICByZXBvcnRPdXQud3JpdGUoJyAgICAgICAgLSAnICsgUGF0aC5yZWxhdGl2ZShjd2QsIHNpbmdsZUJ5KSk7XG4gICAgICAgIHJlcG9ydE91dC53cml0ZShlb2wpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJlcG9ydE91dC53cml0ZSgnLS0tLS0gbG9hZENoaWxkcmVuIC0tLS0tJyArIGVvbCk7XG4gICAgZm9yIChjb25zdCBsYyBvZiB0aGlzLmxvYWRDaGlsZHJlbi52YWx1ZXMoKSkge1xuICAgICAgcmVwb3J0T3V0LndyaXRlKCcgICcgKyBsYyk7XG4gICAgICByZXBvcnRPdXQud3JpdGUoZW9sKTtcbiAgICB9XG4gICAgcmVwb3J0T3V0LndyaXRlKCctLS0tLSBFeHRlcm5hbExpYnJhcnlJbXBvcnQgLS0tLS0nICsgZW9sKTtcbiAgICBmb3IgKGNvbnN0IGxjIG9mIHRoaXMuZXh0ZXJuYWxzLnZhbHVlcygpKSB7XG4gICAgICByZXBvcnRPdXQud3JpdGUoJyAgJyArIGxjKTtcbiAgICAgIHJlcG9ydE91dC53cml0ZShlb2wpO1xuICAgIH1cblxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gcmVwb3J0T3V0LmVuZChyZXNvbHZlKSk7XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICogQHBhcmFtIHJlcXVlc3REZXAgXG4gICAqIEBwYXJhbSBieSBcbiAgICogQHJldHVybnMgdHJ1ZSBpZiBpdCBpcyByZXF1ZXN0ZWQgYXQgZmlyc3QgdGltZVxuICAgKi9cbiAgcHJpdmF0ZSBjaGVja1Jlc29sdmVkKHJlcXVlc3REZXA6IHN0cmluZywgYnk6IHN0cmluZywgaXNFeHRlcm5hbDogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGJ5TGlzdCA9IHRoaXMucmVxdWVzdE1hcC5nZXQocmVxdWVzdERlcCk7XG4gICAgaWYgKGJ5TGlzdCkge1xuICAgICAgYnlMaXN0LnB1c2goYnkpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJlcXVlc3RNYXAuc2V0KHJlcXVlc3REZXAsIFtieV0pO1xuICAgICAgaWYgKGlzRXh0ZXJuYWwpXG4gICAgICAgIHRoaXMuZXh0ZXJuYWxzLmFkZChyZXF1ZXN0RGVwKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX3dhbGsoKSB7XG4gICAgY29uc3QgcmVzb2x2ZSA9IChwYXRoOiBzdHJpbmcsIGZpbGU6IHN0cmluZywgY2I/OiAocmVzb2x2ZWRGaWxlOiBzdHJpbmcpID0+IHZvaWQpID0+IHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdyZXNvbHZpbmcnLCBwYXRoLCBmaWxlKTtcbiAgICAgIGNvbnN0IHJlc29sdmVkID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUocGF0aCwgZmlsZSwgdGhpcy5jbywgdGhpcy5ob3N0LCB0aGlzLnJlc0NhY2hlKS5yZXNvbHZlZE1vZHVsZTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCcgICAgIHJlc29sdmUnLCBwYXRoLCByZXNvbHZlZCA/IHJlc29sdmVkLnJlc29sdmVkRmlsZU5hbWUgOiByZXNvbHZlZCk7XG4gICAgICBpZiAocmVzb2x2ZWQpIHtcbiAgICAgICAgY29uc3QgZGVwID0gcmVzb2x2ZWQucmVzb2x2ZWRGaWxlTmFtZTtcbiAgICAgICAgaWYgKHJlc29sdmVkLmV4dGVuc2lvbiA9PT0gRXh0ZW5zaW9uLlRzIHx8IHJlc29sdmVkLmV4dGVuc2lvbiA9PT0gRXh0ZW5zaW9uLlRzeCAvKmRlcC5lbmRzV2l0aCgnLnRzJykgJiYgIWRlcC5lbmRzV2l0aCgnLmQudHMnKSovKSB7XG4gICAgICAgICAgaWYgKHRoaXMuY2hlY2tSZXNvbHZlZChkZXAsIGZpbGUsICEhcmVzb2x2ZWQuaXNFeHRlcm5hbExpYnJhcnlJbXBvcnQpKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnZGVwOiAnICsgUGF0aC5yZWxhdGl2ZShyb290UGF0aCwgZGVwKSArICcsXFxuICBmcm9tICcgKyBQYXRoLnJlbGF0aXZlKHJvb3RQYXRoLCBmaWxlKSk7XG4gICAgICAgICAgICB0aGlzLnRvV2Fsay5wdXNoKGRlcCk7XG4gICAgICAgICAgICBpZiAoY2IpIHtcbiAgICAgICAgICAgICAgY2IoZGVwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0aGlzLnBhY2thZ2VGaWxlUmVzb2x2ZXIgJiYgIXBhdGguc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgICAgICAgY29uc3QgZGVwID0gdGhpcy5wYWNrYWdlRmlsZVJlc29sdmVyKHBhdGgpO1xuICAgICAgICAgIGlmIChkZXAgJiYgdGhpcy5jaGVja1Jlc29sdmVkKGRlcCwgZmlsZSwgdHJ1ZSkpIHtcbiAgICAgICAgICAgIHRoaXMudG9XYWxrLnB1c2goZGVwKTtcbiAgICAgICAgICAgIGlmIChjYikge1xuICAgICAgICAgICAgICBjYihkZXApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyB0aGlzLnVucmVzb2x2ZWQucHVzaCh7bW9kdWxlOiBwYXRoLCBzcmNGaWxlOiBmaWxlfSk7XG4gICAgICAgIC8vIFRPRE86IGxvZyB1bnJlc29sdmVkXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGBOT1QgcmVzb2x2ZWQgJHtwYXRofSBpbiAke2ZpbGV9YCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHdoaWxlICh0aGlzLnRvV2Fsay5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBmaWxlID0gdGhpcy50b1dhbGsuc2hpZnQoKSE7XG5cbiAgICAgIGNvbnN0IHJlcGxhY2VkID0gdGhpcy5yZXBsYWNlbWVudHMuZ2V0KGZpbGUpO1xuICAgICAgY29uc3QgcSA9IG5ldyBRdWVyeSh0aGlzLnJlYWRGaWxlIShyZXBsYWNlZCB8fCBmaWxlKSwgZmlsZSk7XG4gICAgICAvLyBjb25zb2xlLmxvZygnIyMjIyMjIHdhbGsnLCBmaWxlKTtcbiAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuXG4gICAgICBxLndhbGtBc3QocS5zcmMsIFtcbiAgICAgICAge1xuICAgICAgICAgIHF1ZXJ5OiAnLm1vZHVsZVNwZWNpZmllcjpTdHJpbmdMaXRlcmFsJywgLy8gQm90aCA6RXhwb3J0RGVjbGFyYXRpb24gb3IgOkltcG9ydERlY2xhcmF0aW9uXG4gICAgICAgICAgY2FsbGJhY2soYXN0KSB7XG4gICAgICAgICAgICByZXNvbHZlKChhc3QgYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dCwgZmlsZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgcXVlcnk6ICc6UHJvcGVydHlBc3NpZ25tZW50Pi5uYW1lJyxcbiAgICAgICAgICBjYWxsYmFjayhhc3QsIHBhdGgsIHBhcmVudHMpIHtcbiAgICAgICAgICAgIGlmIChhc3QuZ2V0VGV4dCgpID09PSAnbG9hZENoaWxkcmVuJykge1xuICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IChhc3QucGFyZW50IGFzIHRzLlByb3BlcnR5QXNzaWdubWVudCkuaW5pdGlhbGl6ZXI7XG4gICAgICAgICAgICAgIGlmICh2YWx1ZS5raW5kID09PSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBsYXp5TW9kdWxlID0gKHZhbHVlIGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQ7XG4gICAgICAgICAgICAgICAgY29uc3QgaGFzaFRhZyA9IGxhenlNb2R1bGUuaW5kZXhPZignIycpO1xuICAgICAgICAgICAgICAgIGlmIChoYXNoVGFnID4gMCkge1xuICAgICAgICAgICAgICAgICAgLy8gV2UgZm91bmQgbGF6eSByb3V0ZSBtb2R1bGVcbiAgICAgICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbGF6eSByb3V0ZSBtb2R1bGU6JywgbGF6eU1vZHVsZSk7XG4gICAgICAgICAgICAgICAgICByZXNvbHZlKGxhenlNb2R1bGUuc2xpY2UoMCwgaGFzaFRhZyksIGZpbGUsIHJlc29sdmVkID0+IHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5sb2FkQ2hpbGRyZW4uYWRkKHJlc29sdmVkKTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHF1ZXJ5OiAnOkNhbGxFeHByZXNzaW9uPi5leHByZXNzaW9uOkltcG9ydEtleXdvcmQnLFxuICAgICAgICAgIGNhbGxiYWNrKGFzdCwgcGF0aCkge1xuICAgICAgICAgICAgcmVzb2x2ZSgoKGFzdC5wYXJlbnQgYXMgdHMuQ2FsbEV4cHJlc3Npb24pLmFyZ3VtZW50c1swXSBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0LCBmaWxlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIF0pO1xuICAgIH1cbiAgfVxuXG59XG4iXX0=