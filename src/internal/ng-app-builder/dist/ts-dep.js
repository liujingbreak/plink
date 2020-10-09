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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy90cy1kZXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsd0VBQXlDO0FBQ3pDLDRDQUFvQjtBQUNwQix5REFBeUM7QUFDekMsZ0RBQXdCO0FBQ3hCLDJCQUE4QjtBQUM5Qix1Q0FBNkM7QUFDN0MsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQzFCLDJCQUEyQjtBQUMzQix5RUFBeUU7QUFFekUsTUFBcUIsaUJBQWlCO0lBaUJwQyxZQUFvQixFQUFzQixFQUN4QyxtQkFBOEYsRUFBRSxFQUN4RixRQUFtQztRQUZ6QixPQUFFLEdBQUYsRUFBRSxDQUFvQjtRQUVoQyxhQUFRLEdBQVIsUUFBUSxDQUEyQjtRQWxCN0MsZUFBVSxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDLENBQUMsb0RBQW9EO1FBQzlGOztXQUVHO1FBQ0gsaUJBQVksR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQ2pDOzs7WUFHSTtRQUNKLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQzlCLFdBQU0sR0FBYSxFQUFFLENBQUM7UUFJZCxpQkFBWSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBTS9DLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUM5QixJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FDbkIsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxHQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUMzRCxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFlBQWEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFD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
