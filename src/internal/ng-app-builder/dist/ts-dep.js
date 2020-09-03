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

//# sourceMappingURL=ts-dep.js.map
