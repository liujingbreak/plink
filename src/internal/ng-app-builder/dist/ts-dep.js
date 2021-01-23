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
            const resolved = typescript_1.default.resolveModuleName(path, file, this.co, this.host, this.resCache).resolvedModule;
            // console.log('     resolve', path, resolved ? resolved.resolvedFileName : resolved);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtZGVwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidHMtZGVwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHdFQUF5QztBQUN6Qyw0Q0FBb0I7QUFDcEIseURBQXlDO0FBQ3pDLGdEQUF3QjtBQUN4QiwyQkFBOEI7QUFDOUIsdUNBQTZDO0FBQzdDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUMxQiwyQkFBMkI7QUFDM0IseUVBQXlFO0FBRXpFLE1BQXFCLGlCQUFpQjtJQWlCcEMsWUFBb0IsRUFBc0IsRUFDeEMsbUJBQThGLEVBQUUsRUFDeEYsbUJBQTBELEVBQzFELFFBQW1DO1FBSHpCLE9BQUUsR0FBRixFQUFFLENBQW9CO1FBRWhDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBdUM7UUFDMUQsYUFBUSxHQUFSLFFBQVEsQ0FBMkI7UUFuQjdDLGVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBb0IsQ0FBQyxDQUFDLG9EQUFvRDtRQUM5Rjs7V0FFRztRQUNILGlCQUFZLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUNqQzs7O1lBR0k7UUFDSixjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUM5QixXQUFNLEdBQWEsRUFBRSxDQUFDO1FBSWQsaUJBQVksR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQVEvQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDOUIsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQ25CLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsR0FBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsRUFDM0QsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxZQUFhLENBQUMsQ0FBQyxPQUFPLENBQUMs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QyxZQUFZLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29DQUNsQyxDQUFDLENBQUMsQ0FBQztpQ0FDSjs2QkFDRjt5QkFDRjtvQkFDSCxDQUFDO2lCQUNGO2dCQUNEO29CQUNFLEtBQUssRUFBRSwyQ0FBMkM7b0JBQ2xELFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSTt3QkFDaEIsT0FBTyxDQUFHLEdBQUcsQ0FBQyxNQUE0QixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQXNCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUMzRixDQUFDO2lCQUNGO2FBQ0YsQ0FBQyxDQUFDO1NBQ0o7SUFDSCxDQUFDO0NBRUY7QUF2TEQsb0NBdUxDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFF1ZXJ5IGZyb20gJy4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgdHMsIHtFeHRlbnNpb259IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge0VPTCBhcyBlb2x9IGZyb20gJ29zJztcbmltcG9ydCB7IGNyZWF0ZVdyaXRlU3RyZWFtIH0gZnJvbSAnZnMtZXh0cmEnO1xuY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbi8vIGltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuLy8gY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcudHMtZGVwcycpO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUc0RlcGVuZGVuY3lHcmFwaCB7XG4gIHJlcXVlc3RNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nW10+KCk7IC8vIGtleSBpcyBmaWxlIHRoYXQgcmVxdWVzdGVkLCB2YWx1ZSBpcyB3aG8gcmVxdWVzdHNcbiAgLyoqXG4gICAqIEFuZ3VsYXIgc3R5bGUgbGF6eSByb3V0ZSBsb2FkaW5nIGdyYW1tYXIgXG4gICAqL1xuICBsb2FkQ2hpbGRyZW4gPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgLyoqIGZpbGVzIGFzIHdoaWNoIFRTIGNvbXBpbGVyIGNvbnNpZGVycyBmcm9tIG5vZGVfbW9kdWxlc1xuICAgKiBUUyBjb21waWxlciB3aWxsIG5vdCBjb21waWxlIHRoZW0gaWYgdGhleSBhcmUgbm90IGV4cGxpY2l0bHlcbiAgICogaW52b2x2ZWQgaW4gdHNjb25maWdcbiAgICAqL1xuICBleHRlcm5hbHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgdG9XYWxrOiBzdHJpbmdbXSA9IFtdO1xuXG4gIHByaXZhdGUgcmVzQ2FjaGU6IHRzLk1vZHVsZVJlc29sdXRpb25DYWNoZTtcbiAgcHJpdmF0ZSBob3N0OiB0cy5Db21waWxlckhvc3Q7XG4gIHByaXZhdGUgcmVwbGFjZW1lbnRzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGNvOiB0cy5Db21waWxlck9wdGlvbnMsXG4gICAgZmlsZVJlcGxhY2VtZW50czoge3JlcGxhY2U/OiBzdHJpbmcsIHNyYz86IHN0cmluZywgIHdpdGg/OiBzdHJpbmcsIHJlcGxhY2VXaWR0aD86IHN0cmluZ31bXSA9IFtdLFxuICAgIHByaXZhdGUgcGFja2FnZUZpbGVSZXNvbHZlcj86IChwYXRoOiBzdHJpbmcpID0+IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICBwcml2YXRlIHJlYWRGaWxlPzogKGZpbGU6IHN0cmluZykgPT4gc3RyaW5nXG4gICkge1xuXG4gICAgZmlsZVJlcGxhY2VtZW50cy5mb3JFYWNoKHBhaXIgPT4ge1xuICAgICAgdGhpcy5yZXBsYWNlbWVudHMuc2V0KFxuICAgICAgICBQYXRoLnJlc29sdmUocGFpci5yZXBsYWNlIHx8IHBhaXIuc3JjISkucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgICAgICBQYXRoLnJlc29sdmUocGFpci53aXRoIHx8IHBhaXIucmVwbGFjZVdpZHRoISkucmVwbGFjZSgvXFxcXC9nLCAnLycpKTtcbiAgICB9KTtcblxuICAgIHRoaXMucmVzQ2FjaGUgPSB0cy5jcmVhdGVNb2R1bGVSZXNvbHV0aW9uQ2FjaGUocHJvY2Vzcy5jd2QoKSxcbiAgICAgIGZpbGVOYW1lID0+IGZpbGVOYW1lLFxuICAgICAgY28pO1xuICAgIHRoaXMuaG9zdCA9IHRzLmNyZWF0ZUNvbXBpbGVySG9zdChjbyk7XG5cbiAgICBpZiAoIXJlYWRGaWxlKSB7XG4gICAgICB0aGlzLnJlYWRGaWxlID0gZmlsZSA9PiB7XG4gICAgICAgIHJldHVybiBmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKTtcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSBmaWxlIG11c3QgYmUgYWJzb2x1dGUgcGF0aFxuICAgKi9cbiAgd2Fsa0ZvckRlcGVuZGVuY2llcyhmaWxlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLnRvV2Fsay5wdXNoKGZpbGUpO1xuICAgIHRoaXMuX3dhbGsoKTtcbiAgfVxuXG4gIHJlcG9ydChsb2dGaWxlOiBzdHJpbmcpIHtcblxuICAgIGNvbnN0IGcgPSB0aGlzO1xuICAgIC8vIGNvbnN0IGxvZ0ZpbGUgPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnbmctYXBwLWJ1aWxkZXIucmVwb3J0JywgJ3RzLWRlcHMudHh0Jyk7XG5cbiAgICBjb25zdCByZXBvcnRPdXQgPSBjcmVhdGVXcml0ZVN0cmVhbShsb2dGaWxlKTtcbiAgICByZXBvcnRPdXQud3JpdGUobmV3IERhdGUoKS50b0xvY2FsZVN0cmluZygpKTtcbiAgICByZXBvcnRPdXQud3JpdGUoZW9sKTtcbiAgICAvLyBUT0RPOiBvcHRpbWl6ZSAtIHVzZSBhIF8uc29ydGVkSW5kZXggdG8gbWFrZSBhIHNvcnRlZCBtYXAsIG9yIHVzZSBhIHNlcGFyYXRlIHdvcmtlciBwcm9jZXNzXG4gICAgY29uc3Qgc29ydGVkRW50cmllcyA9IEFycmF5LmZyb20oZy5yZXF1ZXN0TWFwLmVudHJpZXMoKSkuc29ydCgoZW50cnkxLCBlbnRyeTIpID0+IGVudHJ5MVswXSA+IGVudHJ5MlswXSA/IDEgOiAtMSk7XG4gICAgbGV0IGkgPSAwO1xuICAgIGZvciAoY29uc3QgW2RlcCwgYnldIG9mIHNvcnRlZEVudHJpZXMpIHtcbiAgICAgIGNvbnN0IHBhZCA9IDQgLSAoaSArICcnKS5sZW5ndGg7XG4gICAgICByZXBvcnRPdXQud3JpdGUoJyAnLnJlcGVhdChwYWQpKTtcbiAgICAgIHJlcG9ydE91dC53cml0ZShpKysgKyAnLiAnKTtcbiAgICAgIHJlcG9ydE91dC53cml0ZShQYXRoLnJlbGF0aXZlKGN3ZCwgZGVwKSk7XG4gICAgICByZXBvcnRPdXQud3JpdGUoZW9sKTtcbiAgICAgIGZvciAoY29uc3Qgc2luZ2xlQnkgb2YgYnkpIHtcbiAgICAgICAgcmVwb3J0T3V0LndyaXRlKCcgICAgICAgIC0gJyArIFBhdGgucmVsYXRpdmUoY3dkLCBzaW5nbGVCeSkpO1xuICAgICAgICByZXBvcnRPdXQud3JpdGUoZW9sKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXBvcnRPdXQud3JpdGUoJy0tLS0tIGxvYWRDaGlsZHJlbiAtLS0tLScgKyBlb2wpO1xuICAgIGZvciAoY29uc3QgbGMgb2YgdGhpcy5sb2FkQ2hpbGRyZW4udmFsdWVzKCkpIHtcbiAgICAgIHJlcG9ydE91dC53cml0ZSgnICAnICsgbGMpO1xuICAgICAgcmVwb3J0T3V0LndyaXRlKGVvbCk7XG4gICAgfVxuICAgIHJlcG9ydE91dC53cml0ZSgnLS0tLS0gRXh0ZXJuYWxMaWJyYXJ5SW1wb3J0IC0tLS0tJyArIGVvbCk7XG4gICAgZm9yIChjb25zdCBsYyBvZiB0aGlzLmV4dGVybmFscy52YWx1ZXMoKSkge1xuICAgICAgcmVwb3J0T3V0LndyaXRlKCcgICcgKyBsYyk7XG4gICAgICByZXBvcnRPdXQud3JpdGUoZW9sKTtcbiAgICB9XG5cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHJlcG9ydE91dC5lbmQocmVzb2x2ZSkpO1xuXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqIEBwYXJhbSByZXF1ZXN0RGVwIFxuICAgKiBAcGFyYW0gYnkgXG4gICAqIEByZXR1cm5zIHRydWUgaWYgaXQgaXMgcmVxdWVzdGVkIGF0IGZpcnN0IHRpbWVcbiAgICovXG4gIHByaXZhdGUgY2hlY2tSZXNvbHZlZChyZXF1ZXN0RGVwOiBzdHJpbmcsIGJ5OiBzdHJpbmcsIGlzRXh0ZXJuYWw6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICBjb25zdCBieUxpc3QgPSB0aGlzLnJlcXVlc3RNYXAuZ2V0KHJlcXVlc3REZXApO1xuICAgIGlmIChieUxpc3QpIHtcbiAgICAgIGJ5TGlzdC5wdXNoKGJ5KTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yZXF1ZXN0TWFwLnNldChyZXF1ZXN0RGVwLCBbYnldKTtcbiAgICAgIGlmIChpc0V4dGVybmFsKVxuICAgICAgICB0aGlzLmV4dGVybmFscy5hZGQocmVxdWVzdERlcCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF93YWxrKCkge1xuICAgIGNvbnN0IHJlc29sdmUgPSAocGF0aDogc3RyaW5nLCBmaWxlOiBzdHJpbmcsIGNiPzogKHJlc29sdmVkRmlsZTogc3RyaW5nKSA9PiB2b2lkKSA9PiB7XG4gICAgICBjb25zdCByZXNvbHZlZCA9IHRzLnJlc29sdmVNb2R1bGVOYW1lKHBhdGgsIGZpbGUsIHRoaXMuY28sIHRoaXMuaG9zdCwgdGhpcy5yZXNDYWNoZSkucmVzb2x2ZWRNb2R1bGU7XG4gICAgICAvLyBjb25zb2xlLmxvZygnICAgICByZXNvbHZlJywgcGF0aCwgcmVzb2x2ZWQgPyByZXNvbHZlZC5yZXNvbHZlZEZpbGVOYW1lIDogcmVzb2x2ZWQpO1xuICAgICAgaWYgKHJlc29sdmVkKSB7XG4gICAgICAgIGNvbnN0IGRlcCA9IHJlc29sdmVkLnJlc29sdmVkRmlsZU5hbWU7XG4gICAgICAgIGlmIChyZXNvbHZlZC5leHRlbnNpb24gPT09IEV4dGVuc2lvbi5UcyB8fCByZXNvbHZlZC5leHRlbnNpb24gPT09IEV4dGVuc2lvbi5Uc3ggLypkZXAuZW5kc1dpdGgoJy50cycpICYmICFkZXAuZW5kc1dpdGgoJy5kLnRzJykqLykge1xuICAgICAgICAgIGlmICh0aGlzLmNoZWNrUmVzb2x2ZWQoZGVwLCBmaWxlLCAhIXJlc29sdmVkLmlzRXh0ZXJuYWxMaWJyYXJ5SW1wb3J0KSkge1xuICAgICAgICAgIC8vIGxvZy5kZWJ1ZygnZGVwOiAnICsgUGF0aC5yZWxhdGl2ZShyb290UGF0aCwgZGVwKSArICcsXFxuICBmcm9tICcgKyBQYXRoLnJlbGF0aXZlKHJvb3RQYXRoLCBmaWxlKSk7XG4gICAgICAgICAgICB0aGlzLnRvV2Fsay5wdXNoKGRlcCk7XG4gICAgICAgICAgICBpZiAoY2IpIHtcbiAgICAgICAgICAgICAgY2IoZGVwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0aGlzLnBhY2thZ2VGaWxlUmVzb2x2ZXIgJiYgIXBhdGguc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgICAgICAgY29uc3QgZGVwID0gdGhpcy5wYWNrYWdlRmlsZVJlc29sdmVyKHBhdGgpO1xuICAgICAgICAgIGlmIChkZXAgJiYgdGhpcy5jaGVja1Jlc29sdmVkKGRlcCwgZmlsZSwgdHJ1ZSkpIHtcbiAgICAgICAgICAgIHRoaXMudG9XYWxrLnB1c2goZGVwKTtcbiAgICAgICAgICAgIGlmIChjYikge1xuICAgICAgICAgICAgICBjYihkZXApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyB0aGlzLnVucmVzb2x2ZWQucHVzaCh7bW9kdWxlOiBwYXRoLCBzcmNGaWxlOiBmaWxlfSk7XG4gICAgICAgIC8vIFRPRE86IGxvZyB1bnJlc29sdmVkXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGBOT1QgcmVzb2x2ZWQgJHtwYXRofSBpbiAke2ZpbGV9YCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHdoaWxlICh0aGlzLnRvV2Fsay5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBmaWxlID0gdGhpcy50b1dhbGsuc2hpZnQoKSE7XG5cbiAgICAgIGNvbnN0IHJlcGxhY2VkID0gdGhpcy5yZXBsYWNlbWVudHMuZ2V0KGZpbGUpO1xuICAgICAgY29uc3QgcSA9IG5ldyBRdWVyeSh0aGlzLnJlYWRGaWxlIShyZXBsYWNlZCB8fCBmaWxlKSwgZmlsZSk7XG4gICAgICAvLyBjb25zb2xlLmxvZygnIyMjIyMjIHdhbGsnLCBmaWxlKTtcbiAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuXG4gICAgICBxLndhbGtBc3QocS5zcmMsIFtcbiAgICAgICAge1xuICAgICAgICAgIHF1ZXJ5OiAnLm1vZHVsZVNwZWNpZmllcjpTdHJpbmdMaXRlcmFsJywgLy8gQm90aCA6RXhwb3J0RGVjbGFyYXRpb24gb3IgOkltcG9ydERlY2xhcmF0aW9uXG4gICAgICAgICAgY2FsbGJhY2soYXN0KSB7XG4gICAgICAgICAgICByZXNvbHZlKChhc3QgYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dCwgZmlsZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgcXVlcnk6ICc6UHJvcGVydHlBc3NpZ25tZW50Pi5uYW1lJyxcbiAgICAgICAgICBjYWxsYmFjayhhc3QsIHBhdGgsIHBhcmVudHMpIHtcbiAgICAgICAgICAgIGlmIChhc3QuZ2V0VGV4dCgpID09PSAnbG9hZENoaWxkcmVuJykge1xuICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IChhc3QucGFyZW50IGFzIHRzLlByb3BlcnR5QXNzaWdubWVudCkuaW5pdGlhbGl6ZXI7XG4gICAgICAgICAgICAgIGlmICh2YWx1ZS5raW5kID09PSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBsYXp5TW9kdWxlID0gKHZhbHVlIGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQ7XG4gICAgICAgICAgICAgICAgY29uc3QgaGFzaFRhZyA9IGxhenlNb2R1bGUuaW5kZXhPZignIycpO1xuICAgICAgICAgICAgICAgIGlmIChoYXNoVGFnID4gMCkge1xuICAgICAgICAgICAgICAgICAgLy8gV2UgZm91bmQgbGF6eSByb3V0ZSBtb2R1bGVcbiAgICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1jb25zb2xlXG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbGF6eSByb3V0ZSBtb2R1bGU6JywgbGF6eU1vZHVsZSk7XG4gICAgICAgICAgICAgICAgICByZXNvbHZlKGxhenlNb2R1bGUuc2xpY2UoMCwgaGFzaFRhZyksIGZpbGUsIHJlc29sdmVkID0+IHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5sb2FkQ2hpbGRyZW4uYWRkKHJlc29sdmVkKTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHF1ZXJ5OiAnOkNhbGxFeHByZXNzaW9uPi5leHByZXNzaW9uOkltcG9ydEtleXdvcmQnLFxuICAgICAgICAgIGNhbGxiYWNrKGFzdCwgcGF0aCkge1xuICAgICAgICAgICAgcmVzb2x2ZSgoKGFzdC5wYXJlbnQgYXMgdHMuQ2FsbEV4cHJlc3Npb24pLmFyZ3VtZW50c1swXSBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0LCBmaWxlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIF0pO1xuICAgIH1cbiAgfVxuXG59XG4iXX0=