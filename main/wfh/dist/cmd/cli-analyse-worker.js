"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dfsTraverseFiles = exports.Context = void 0;
require("source-map-support/register");
const ts_ast_query_1 = __importDefault(require("../utils/ts-ast-query"));
const fs_1 = __importDefault(require("fs"));
const typescript_1 = __importDefault(require("typescript"));
const path_1 = __importDefault(require("path"));
// import {EOL as eol} from 'os';
const graph_1 = require("../utils/graph");
const ts_compiler_1 = require("../ts-compiler");
// import {setTsCompilerOptForNodePath} from '../package-mgr/package-list-helper';
const bootstrap_process_1 = require("../utils/bootstrap-process");
const package_runner_1 = require("../package-runner");
const injector_factory_1 = require("../injector-factory");
const misc_1 = require("../utils/misc");
const ts_cmd_util_1 = require("../ts-cmd-util");
const logger_1 = require("../logger");
const NODE_MODULE_SET = new Set('child_process cluster http https http2 crypto fs path os net v8 util url tty trace_events tls stream vm domain'
    .split(/\s+/));
let coJson;
// setTsCompilerOptForNodePath(plinkEnv.workDir, './', coJson, {workspaceDir: plinkEnv.workDir});
let co;
let resCache;
let host;
bootstrap_process_1.initAsChildProcess();
bootstrap_process_1.initConfig(JSON.parse(process.env.PLINK_CLI_OPTS));
package_runner_1.initInjectorForNodePackages();
const log = logger_1.log4File(__filename);
class Context {
    constructor(commonDir, alias, ignorePattern, relativeDepsOutSideDir = new Set(), cyclic = [], canNotResolve = [], externalDeps = new Set(), nodeModuleDeps = new Set(), matchAlias = []) {
        this.alias = alias;
        this.ignorePattern = ignorePattern;
        this.relativeDepsOutSideDir = relativeDepsOutSideDir;
        this.cyclic = cyclic;
        this.canNotResolve = canNotResolve;
        this.externalDeps = externalDeps;
        this.nodeModuleDeps = nodeModuleDeps;
        this.matchAlias = matchAlias;
        /** traversed files */
        this.topSortedFiles = [];
        this.commonDir = commonDir.endsWith(path_1.default.sep) ? commonDir : commonDir + path_1.default.sep;
    }
    toPlainObject() {
        return {
            commonDir: this.commonDir.slice(0, -1),
            relativeDepsOutSideDir: Array.from(this.relativeDepsOutSideDir.values()),
            cyclic: this.cyclic,
            canNotResolve: this.canNotResolve,
            externalDeps: Array.from(this.externalDeps.values()),
            nodeModuleDeps: Array.from(this.nodeModuleDeps.values()),
            matchAlias: this.matchAlias,
            files: this.topSortedFiles
        };
    }
}
exports.Context = Context;
function dfsTraverseFiles(files, tsconfigFile, alias, ignore) {
    var _a;
    init(tsconfigFile);
    const commonParentDir = (files.length === 1) ? path_1.default.dirname(files[0]) : misc_1.closestCommonParentDir(files);
    const context = new Context(commonParentDir, alias.map(item => [new RegExp(item[0]), item[1]]), ignore ? new RegExp(ignore) : undefined);
    // in case the file is in under directory node_modules, all relative path will be resolved to packageId,
    let resolved = typescript_1.default.resolveModuleName('./' + path_1.default.parse(files[0]).name, files[0], co, host, resCache).resolvedModule;
    context.ignorePkgName = (_a = resolved === null || resolved === void 0 ? void 0 : resolved.packageId) === null || _a === void 0 ? void 0 : _a.name;
    const dfs = new graph_1.DFS(file => {
        const content = injector_factory_1.webInjector.injectToFile(file, fs_1.default.readFileSync(file, 'utf8'));
        const q = new ts_ast_query_1.default(content, file);
        log.debug('Lookup file', path_1.default.relative(misc_1.plinkEnv.workDir, file));
        return parseFile(q, file, context);
    }, vertex => {
        log.debug('Finished file', path_1.default.relative(misc_1.plinkEnv.workDir, vertex.data));
        context.topSortedFiles.push(vertex.data);
    });
    log.info('scan files\n', files);
    dfs.visit(files);
    const cwd = misc_1.plinkEnv.workDir;
    if (dfs.backEdges.length > 0) {
        for (const edges of dfs.backEdges) {
            // log.info(`Found cyclic file dependency ${dfs.printCyclicBackEdge(edges[0], edges[1])}`);
            context.cyclic.push(dfs.printCyclicBackEdge(edges[0], edges[1])
                .map(path => path_1.default.relative(cwd, path)).join('\n -> '));
        }
    }
    return context.toPlainObject();
}
exports.dfsTraverseFiles = dfsTraverseFiles;
/**
 *
 * @param tsconfigFile all compilerOptions.paths setting will be adopted in resolving files
 */
function init(tsconfigFile) {
    if (coJson != null)
        return;
    const baseTsconfigFile = path_1.default.resolve(__dirname, '../../tsconfig-tsx.json');
    const baseTscfg = ts_cmd_util_1.parseConfigFileToJson(typescript_1.default, baseTsconfigFile);
    coJson = baseTscfg.compilerOptions;
    if (tsconfigFile) {
        ts_cmd_util_1.mergeBaseUrlAndPaths(typescript_1.default, tsconfigFile, misc_1.plinkEnv.workDir, coJson);
    }
    coJson.allowJs = true;
    coJson.resolveJsonModule = true;
    log.debug('tsconfig', baseTscfg);
    co = ts_compiler_1.jsonToCompilerOptions(coJson, baseTsconfigFile, misc_1.plinkEnv.workDir);
    resCache = typescript_1.default.createModuleResolutionCache(misc_1.plinkEnv.workDir, fileName => fileName, co);
    host = typescript_1.default.createCompilerHost(co);
}
function parseFile(q, file, ctx) {
    const deps = [];
    q.walkAst(q.src, [
        {
            query: '.moduleSpecifier:StringLiteral',
            callback(ast) {
                const dep = resolve(ast.getText(), file, ctx, ast.getStart(), q.src);
                if (dep)
                    deps.push(dep);
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
                            // eslint-disable-next-line no-console
                            log.debug('lazy route module:', lazyModule);
                            const dep = resolve(lazyModule.slice(0, hashTag), file, ctx, ast.getStart(), q.src);
                            if (dep)
                                deps.push(dep);
                        }
                    }
                }
            }
        },
        {
            query: ':CallExpression>.expression:ImportKeyword',
            callback(ast, path) {
                const dep = resolve(ast.parent.arguments[0].text, file, ctx, ast.getStart(), q.src);
                if (dep)
                    deps.push(dep);
            }
        },
        {
            query: ':CallExpression',
            callback(ast, path) {
                const node = ast;
                if (node.expression.kind === typescript_1.default.SyntaxKind.Identifier &&
                    node.expression.text === 'require' &&
                    node.arguments[0].kind === typescript_1.default.SyntaxKind.StringLiteral) {
                    const dep = resolve(node.arguments[0].text, file, ctx, ast.getStart(), q.src);
                    if (dep)
                        deps.push(dep);
                }
            }
        }
    ]);
    return deps;
}
const PKG_NAME_PAT = /^(?:@[^/]+\/)?[^/.]+/;
function resolve(path, file, ctx, pos, src) {
    if (path.startsWith('`')) {
        const lineInfo = typescript_1.default.getLineAndCharacterOfPosition(src, pos);
        ctx.canNotResolve.push({
            target: path,
            file,
            pos: `line:${lineInfo.line + 1}, col:${lineInfo.character + 1}`,
            reasone: 'dynamic value'
        });
        // eslint-disable-next-line max-len
        // log.info(`[cli-analysie-worker] can not resolve dynamic value ${path} in ${file} @${lineInfo.line + 1}:${lineInfo.character + 1}`);
        return null;
    }
    if (path.startsWith('"') || path.startsWith('\''))
        path = path.slice(1, -1);
    if (ctx.ignorePattern && ctx.ignorePattern.test(path)) {
        return null;
    }
    for (const [reg, replaceTo] of ctx.alias) {
        const replaced = path.replace(reg, replaceTo);
        if (path !== replaced) {
            ctx.matchAlias.push(path);
            path = replaced;
            break;
        }
    }
    if (NODE_MODULE_SET.has(path)) {
        ctx.nodeModuleDeps.add(path);
        return null;
    }
    let resolved = typescript_1.default.resolveModuleName(path, file, co, host, resCache).resolvedModule;
    if (resolved == null) {
        [path + '/index', path + '.js', path + '.jsx', path + '/index.js', path + '/index.jsx']
            .some(tryPath => {
            log.debug(`For path "${path}", try path:`, tryPath);
            resolved = typescript_1.default.resolveModuleName(tryPath, file, co, host, resCache).resolvedModule;
            return resolved != null;
        });
    }
    // if (path.startsWith('.') || Path.isAbsolute(path)) {
    if (resolved == null) {
        if (!path.startsWith('.') && !path_1.default.isAbsolute(path)) {
            const m = PKG_NAME_PAT.exec(path);
            const pkgName = m ? m[0] : path;
            if (NODE_MODULE_SET.has(pkgName))
                ctx.nodeModuleDeps.add(pkgName);
            else
                ctx.externalDeps.add(pkgName);
            return null;
        }
        const lineInfo = typescript_1.default.getLineAndCharacterOfPosition(src, pos);
        ctx.canNotResolve.push({
            target: path,
            file,
            pos: `line:${lineInfo.line + 1}, col:${lineInfo.character + 1}`,
            reasone: 'Typescript failed to resolve'
        });
        return null;
    }
    else {
        if (resolved.isExternalLibraryImport && resolved.packageId && resolved.packageId.name !== ctx.ignorePkgName) {
            const pkgName = resolved.packageId.name;
            if (NODE_MODULE_SET.has(pkgName))
                ctx.nodeModuleDeps.add(pkgName);
            else
                ctx.externalDeps.add(pkgName);
            return null;
        }
        const absPath = path_1.default.resolve(resolved.resolvedFileName);
        if (!absPath.startsWith(ctx.commonDir)) {
            ctx.relativeDepsOutSideDir.add(path_1.default.relative(misc_1.plinkEnv.workDir, absPath));
        }
        log.debug('resolved to', absPath);
        return absPath;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFuYWx5c2Utd29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1hbmFseXNlLXdvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSx1Q0FBcUM7QUFFckMseUVBQTBDO0FBQzFDLDRDQUFvQjtBQUNwQiw0REFBNEI7QUFDNUIsZ0RBQXdCO0FBQ3hCLGlDQUFpQztBQUNqQywwQ0FBbUM7QUFDbkMsZ0RBQXFEO0FBQ3JELGtGQUFrRjtBQUNsRixrRUFBMEU7QUFDMUUsc0RBQThEO0FBQzlELDBEQUFnRDtBQUNoRCx3Q0FBK0Q7QUFDL0QsZ0RBQW9HO0FBQ3BHLHNDQUFtQztBQUVuQyxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxnSEFBZ0g7S0FDN0ksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFFakIsSUFBSSxNQUErQixDQUFDO0FBQ3BDLGlHQUFpRztBQUNqRyxJQUFJLEVBQWtDLENBQUM7QUFDdkMsSUFBSSxRQUFrQyxDQUFDO0FBQ3ZDLElBQUksSUFBcUIsQ0FBQztBQUMxQixzQ0FBa0IsRUFBRSxDQUFDO0FBQ3JCLDhCQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWUsQ0FBQyxDQUFDLENBQUM7QUFDcEQsNENBQTJCLEVBQUUsQ0FBQztBQUM5QixNQUFNLEdBQUcsR0FBRyxpQkFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDLE1BQWEsT0FBTztJQU1sQixZQUNFLFNBQWlCLEVBQ1YsS0FBeUMsRUFDekMsYUFBc0IsRUFDdEIseUJBQXNDLElBQUksR0FBRyxFQUFFLEVBQy9DLFNBQW1CLEVBQUUsRUFDckIsZ0JBS0QsRUFBRSxFQUNELGVBQTRCLElBQUksR0FBRyxFQUFFLEVBQ3JDLGlCQUE4QixJQUFJLEdBQUcsRUFBRSxFQUN2QyxhQUF1QixFQUFFO1FBWnpCLFVBQUssR0FBTCxLQUFLLENBQW9DO1FB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LFNBQVMsQ0FBQyxFQUFFO1lBQ3RDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsY0FBSSxDQUFDLFFBQVEsQ0FBQyxlQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7U0FDMUU7UUFDRCxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNsQyxPQUFPLE9BQU8sQ0FBQztLQUNoQjtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3Rlcic7XG5cbmltcG9ydCBRdWVyeSBmcm9tICcuLi91dGlscy90cy1hc3QtcXVlcnknO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0IHtFT0wgYXMgZW9sfSBmcm9tICdvcyc7XG5pbXBvcnQge0RGU30gZnJvbSAnLi4vdXRpbHMvZ3JhcGgnO1xuaW1wb3J0IHtqc29uVG9Db21waWxlck9wdGlvbnN9IGZyb20gJy4uL3RzLWNvbXBpbGVyJztcbi8vIGltcG9ydCB7c2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRofSBmcm9tICcuLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCB7aW5pdEFzQ2hpbGRQcm9jZXNzLCBpbml0Q29uZmlnfSBmcm9tICcuLi91dGlscy9ib290c3RyYXAtcHJvY2Vzcyc7XG5pbXBvcnQge2luaXRJbmplY3RvckZvck5vZGVQYWNrYWdlc30gZnJvbSAnLi4vcGFja2FnZS1ydW5uZXInO1xuaW1wb3J0IHt3ZWJJbmplY3Rvcn0gZnJvbSAnLi4vaW5qZWN0b3ItZmFjdG9yeSc7XG5pbXBvcnQge2Nsb3Nlc3RDb21tb25QYXJlbnREaXIsIHBsaW5rRW52fSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCB7bWVyZ2VCYXNlVXJsQW5kUGF0aHMsIFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zLCBwYXJzZUNvbmZpZ0ZpbGVUb0pzb259IGZyb20gJy4uL3RzLWNtZC11dGlsJztcbmltcG9ydCB7bG9nNEZpbGV9IGZyb20gJy4uL2xvZ2dlcic7XG5cbmNvbnN0IE5PREVfTU9EVUxFX1NFVCA9IG5ldyBTZXQoJ2NoaWxkX3Byb2Nlc3MgY2x1c3RlciBodHRwIGh0dHBzIGh0dHAyIGNyeXB0byBmcyBwYXRoIG9zIG5ldCB2OCB1dGlsIHVybCB0dHkgdHJhY2VfZXZlbnRzIHRscyBzdHJlYW0gdm0gZG9tYWluJ1xuICAuc3BsaXQoL1xccysvKSk7XG5cbmxldCBjb0pzb246IFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zO1xuLy8gc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKHBsaW5rRW52LndvcmtEaXIsICcuLycsIGNvSnNvbiwge3dvcmtzcGFjZURpcjogcGxpbmtFbnYud29ya0Rpcn0pO1xubGV0IGNvOiB0cy5Db21waWxlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG5sZXQgcmVzQ2FjaGU6IHRzLk1vZHVsZVJlc29sdXRpb25DYWNoZTtcbmxldCBob3N0OiB0cy5Db21waWxlckhvc3Q7XG5pbml0QXNDaGlsZFByb2Nlc3MoKTtcbmluaXRDb25maWcoSlNPTi5wYXJzZShwcm9jZXNzLmVudi5QTElOS19DTElfT1BUUyEpKTtcbmluaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcygpO1xuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG5leHBvcnQgY2xhc3MgQ29udGV4dCB7XG4gIGNvbW1vbkRpcjogc3RyaW5nO1xuICAvKiogdHJhdmVyc2VkIGZpbGVzICovXG4gIHRvcFNvcnRlZEZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBpZ25vcmVQa2dOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgY29tbW9uRGlyOiBzdHJpbmcsXG4gICAgcHVibGljIGFsaWFzOiBbcmVnOiBSZWdFeHAsIHJlcGxhY2VUbzogc3RyaW5nXVtdLFxuICAgIHB1YmxpYyBpZ25vcmVQYXR0ZXJuPzogUmVnRXhwLFxuICAgIHB1YmxpYyByZWxhdGl2ZURlcHNPdXRTaWRlRGlyOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoKSxcbiAgICBwdWJsaWMgY3ljbGljOiBzdHJpbmdbXSA9IFtdLFxuICAgIHB1YmxpYyBjYW5Ob3RSZXNvbHZlOiB7XG4gICAgICB0YXJnZXQ6IHN0cmluZztcbiAgICAgIGZpbGU6IHN0cmluZztcbiAgICAgIHBvczogc3RyaW5nO1xuICAgICAgcmVhc29uZTogc3RyaW5nO1xuICAgIH1bXSA9IFtdLFxuICAgIHB1YmxpYyBleHRlcm5hbERlcHM6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpLFxuICAgIHB1YmxpYyBub2RlTW9kdWxlRGVwczogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCksXG4gICAgcHVibGljIG1hdGNoQWxpYXM6IHN0cmluZ1tdID0gW11cbiAgKSB7XG4gICAgdGhpcy5jb21tb25EaXIgPSBjb21tb25EaXIuZW5kc1dpdGgoUGF0aC5zZXApID8gY29tbW9uRGlyIDogY29tbW9uRGlyICsgUGF0aC5zZXA7XG4gIH1cblxuICB0b1BsYWluT2JqZWN0KCkge1xuICAgIHJldHVybiB7XG4gICAgICBjb21tb25EaXI6IHRoaXMuY29tbW9uRGlyLnNsaWNlKDAsIC0xKSwgLy8gdHJpbSBsYXN0IFBhdGguc2VwXG4gICAgICByZWxhdGl2ZURlcHNPdXRTaWRlRGlyOiBBcnJheS5mcm9tKHRoaXMucmVsYXRpdmVEZXBzT3V0U2lkZURpci52YWx1ZXMoKSksXG4gICAgICBjeWNsaWM6IHRoaXMuY3ljbGljLFxuICAgICAgY2FuTm90UmVzb2x2ZTogdGhpcy5jYW5Ob3RSZXNvbHZlLFxuICAgICAgZXh0ZXJuYWxEZXBzOiBBcnJheS5mcm9tKHRoaXMuZXh0ZXJuYWxEZXBzLnZhbHVlcygpKSxcbiAgICAgIG5vZGVNb2R1bGVEZXBzOiBBcnJheS5mcm9tKHRoaXMubm9kZU1vZHVsZURlcHMudmFsdWVzKCkpLFxuICAgICAgbWF0Y2hBbGlhczogdGhpcy5tYXRjaEFsaWFzLFxuICAgICAgZmlsZXM6IHRoaXMudG9wU29ydGVkRmlsZXNcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZnNUcmF2ZXJzZUZpbGVzKGZpbGVzOiBzdHJpbmdbXSwgdHNjb25maWdGaWxlOiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkLFxuICBhbGlhczogW3JlZzogc3RyaW5nLCByZXBsYWNlVG86IHN0cmluZ11bXSwgaWdub3JlPzogc3RyaW5nKTogUmV0dXJuVHlwZTxDb250ZXh0Wyd0b1BsYWluT2JqZWN0J10+IHtcbiAgaW5pdCh0c2NvbmZpZ0ZpbGUpO1xuICBjb25zdCBjb21tb25QYXJlbnREaXIgPSAoZmlsZXMubGVuZ3RoID09PSAxKSA/IFBhdGguZGlybmFtZShmaWxlc1swXSkgOiBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKGZpbGVzKTtcbiAgY29uc3QgY29udGV4dCA9IG5ldyBDb250ZXh0KGNvbW1vblBhcmVudERpciwgYWxpYXMubWFwKGl0ZW0gPT4gW25ldyBSZWdFeHAoaXRlbVswXSksIGl0ZW1bMV1dKSxcbiAgICBpZ25vcmUgPyBuZXcgUmVnRXhwKGlnbm9yZSkgOiB1bmRlZmluZWQpO1xuXG4gIC8vIGluIGNhc2UgdGhlIGZpbGUgaXMgaW4gdW5kZXIgZGlyZWN0b3J5IG5vZGVfbW9kdWxlcywgYWxsIHJlbGF0aXZlIHBhdGggd2lsbCBiZSByZXNvbHZlZCB0byBwYWNrYWdlSWQsXG4gIGxldCByZXNvbHZlZCA9IHRzLnJlc29sdmVNb2R1bGVOYW1lKCcuLycgKyBQYXRoLnBhcnNlKGZpbGVzWzBdKS5uYW1lLCBmaWxlc1swXSwgY28hLCBob3N0LCByZXNDYWNoZSkucmVzb2x2ZWRNb2R1bGU7XG4gIGNvbnRleHQuaWdub3JlUGtnTmFtZSA9IHJlc29sdmVkPy5wYWNrYWdlSWQ/Lm5hbWU7XG5cbiAgY29uc3QgZGZzOiBERlM8c3RyaW5nPiA9IG5ldyBERlM8c3RyaW5nPihmaWxlID0+IHtcbiAgICBjb25zdCBjb250ZW50ID0gd2ViSW5qZWN0b3IuaW5qZWN0VG9GaWxlKGZpbGUsIGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpKTtcbiAgICBjb25zdCBxID0gbmV3IFF1ZXJ5KGNvbnRlbnQsIGZpbGUpO1xuICAgIGxvZy5kZWJ1ZygnTG9va3VwIGZpbGUnLCBQYXRoLnJlbGF0aXZlKHBsaW5rRW52LndvcmtEaXIsIGZpbGUpKTtcbiAgICByZXR1cm4gcGFyc2VGaWxlKHEsIGZpbGUsIGNvbnRleHQpO1xuICB9LCB2ZXJ0ZXggPT4ge1xuICAgIGxvZy5kZWJ1ZygnRmluaXNoZWQgZmlsZScsIFBhdGgucmVsYXRpdmUocGxpbmtFbnYud29ya0RpciwgdmVydGV4LmRhdGEpKTtcbiAgICBjb250ZXh0LnRvcFNvcnRlZEZpbGVzLnB1c2godmVydGV4LmRhdGEpO1xuICB9KTtcbiAgbG9nLmluZm8oJ3NjYW4gZmlsZXNcXG4nLCBmaWxlcyk7XG4gIGRmcy52aXNpdChmaWxlcyk7XG4gIGNvbnN0IGN3ZCA9IHBsaW5rRW52LndvcmtEaXI7XG4gIGlmIChkZnMuYmFja0VkZ2VzLmxlbmd0aCA+IDApIHtcbiAgICBmb3IgKGNvbnN0IGVkZ2VzIG9mIGRmcy5iYWNrRWRnZXMpIHtcbiAgICAgIC8vIGxvZy5pbmZvKGBGb3VuZCBjeWNsaWMgZmlsZSBkZXBlbmRlbmN5ICR7ZGZzLnByaW50Q3ljbGljQmFja0VkZ2UoZWRnZXNbMF0sIGVkZ2VzWzFdKX1gKTtcbiAgICAgIGNvbnRleHQuY3ljbGljLnB1c2goZGZzLnByaW50Q3ljbGljQmFja0VkZ2UoZWRnZXNbMF0sIGVkZ2VzWzFdKVxuICAgICAgICAubWFwKHBhdGggPT4gUGF0aC5yZWxhdGl2ZShjd2QsIHBhdGgpKS5qb2luKCdcXG4gLT4gJylcbiAgICAgICk7XG4gICAgfVxuICB9XG4gIHJldHVybiBjb250ZXh0LnRvUGxhaW5PYmplY3QoKTtcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSB0c2NvbmZpZ0ZpbGUgYWxsIGNvbXBpbGVyT3B0aW9ucy5wYXRocyBzZXR0aW5nIHdpbGwgYmUgYWRvcHRlZCBpbiByZXNvbHZpbmcgZmlsZXNcbiAqL1xuZnVuY3Rpb24gaW5pdCh0c2NvbmZpZ0ZpbGU/OiBzdHJpbmcgfCBudWxsKSB7XG4gIGlmIChjb0pzb24gIT0gbnVsbClcbiAgICByZXR1cm47XG5cbiAgY29uc3QgYmFzZVRzY29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90c2NvbmZpZy10c3guanNvbicpO1xuXG4gIGNvbnN0IGJhc2VUc2NmZyA9IHBhcnNlQ29uZmlnRmlsZVRvSnNvbih0cywgYmFzZVRzY29uZmlnRmlsZSk7XG5cbiAgY29Kc29uID0gYmFzZVRzY2ZnLmNvbXBpbGVyT3B0aW9ucztcbiAgaWYgKHRzY29uZmlnRmlsZSkge1xuICAgIG1lcmdlQmFzZVVybEFuZFBhdGhzKHRzLCB0c2NvbmZpZ0ZpbGUsIHBsaW5rRW52LndvcmtEaXIsIGNvSnNvbik7XG4gIH1cbiAgY29Kc29uLmFsbG93SnMgPSB0cnVlO1xuICBjb0pzb24ucmVzb2x2ZUpzb25Nb2R1bGUgPSB0cnVlO1xuICBsb2cuZGVidWcoJ3RzY29uZmlnJywgYmFzZVRzY2ZnKTtcbiAgY28gPSBqc29uVG9Db21waWxlck9wdGlvbnMoY29Kc29uLCBiYXNlVHNjb25maWdGaWxlLCBwbGlua0Vudi53b3JrRGlyKTtcbiAgcmVzQ2FjaGUgPSB0cy5jcmVhdGVNb2R1bGVSZXNvbHV0aW9uQ2FjaGUocGxpbmtFbnYud29ya0RpciwgZmlsZU5hbWUgPT4gZmlsZU5hbWUsIGNvKTtcbiAgaG9zdCA9IHRzLmNyZWF0ZUNvbXBpbGVySG9zdChjbyk7XG59XG5cbmZ1bmN0aW9uIHBhcnNlRmlsZShxOiBRdWVyeSwgZmlsZTogc3RyaW5nLCBjdHg6IENvbnRleHQpIHtcbiAgY29uc3QgZGVwczogc3RyaW5nW10gPSBbXTtcblxuICBxLndhbGtBc3QocS5zcmMsIFtcbiAgICB7XG4gICAgICBxdWVyeTogJy5tb2R1bGVTcGVjaWZpZXI6U3RyaW5nTGl0ZXJhbCcsIC8vIEJvdGggOkV4cG9ydERlY2xhcmF0aW9uIG9yIDpJbXBvcnREZWNsYXJhdGlvblxuICAgICAgY2FsbGJhY2soYXN0KSB7XG4gICAgICAgIGNvbnN0IGRlcCA9IHJlc29sdmUoKGFzdCBhcyB0cy5TdHJpbmdMaXRlcmFsKS5nZXRUZXh0KCksIGZpbGUsIGN0eCwgYXN0LmdldFN0YXJ0KCksIHEuc3JjKTtcbiAgICAgICAgaWYgKGRlcClcbiAgICAgICAgICBkZXBzLnB1c2goZGVwKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgIHF1ZXJ5OiAnOlByb3BlcnR5QXNzaWdubWVudD4ubmFtZScsXG4gICAgICBjYWxsYmFjayhhc3QsIHBhdGgsIHBhcmVudHMpIHtcbiAgICAgICAgaWYgKGFzdC5nZXRUZXh0KCkgPT09ICdsb2FkQ2hpbGRyZW4nKSB7XG4gICAgICAgICAgY29uc3QgdmFsdWUgPSAoYXN0LnBhcmVudCBhcyB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnQpLmluaXRpYWxpemVyO1xuICAgICAgICAgIGlmICh2YWx1ZS5raW5kID09PSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICAgIGNvbnN0IGxhenlNb2R1bGUgPSAodmFsdWUgYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dDtcbiAgICAgICAgICAgIGNvbnN0IGhhc2hUYWcgPSBsYXp5TW9kdWxlLmluZGV4T2YoJyMnKTtcbiAgICAgICAgICAgIGlmIChoYXNoVGFnID4gMCkge1xuICAgICAgICAgICAgICAvLyBXZSBmb3VuZCBsYXp5IHJvdXRlIG1vZHVsZVxuICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgICAgICBsb2cuZGVidWcoJ2xhenkgcm91dGUgbW9kdWxlOicsIGxhenlNb2R1bGUpO1xuICAgICAgICAgICAgICBjb25zdCBkZXAgPSByZXNvbHZlKGxhenlNb2R1bGUuc2xpY2UoMCwgaGFzaFRhZyksIGZpbGUsIGN0eCwgYXN0LmdldFN0YXJ0KCksIHEuc3JjKTtcbiAgICAgICAgICAgICAgaWYgKGRlcClcbiAgICAgICAgICAgICAgICBkZXBzLnB1c2goZGVwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgIHF1ZXJ5OiAnOkNhbGxFeHByZXNzaW9uPi5leHByZXNzaW9uOkltcG9ydEtleXdvcmQnLFxuICAgICAgY2FsbGJhY2soYXN0LCBwYXRoKSB7XG4gICAgICAgIGNvbnN0IGRlcCA9IHJlc29sdmUoKChhc3QucGFyZW50IGFzIHRzLkNhbGxFeHByZXNzaW9uKS5hcmd1bWVudHNbMF0gYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dCwgZmlsZSxcbiAgICAgICAgICBjdHgsIGFzdC5nZXRTdGFydCgpLCBxLnNyYyk7XG4gICAgICAgIGlmIChkZXApXG4gICAgICAgICAgZGVwcy5wdXNoKGRlcCk7XG4gICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICBxdWVyeTogJzpDYWxsRXhwcmVzc2lvbicsXG4gICAgICBjYWxsYmFjayhhc3QsIHBhdGgpIHtcbiAgICAgICAgY29uc3Qgbm9kZSA9IGFzdCBhcyB0cy5DYWxsRXhwcmVzc2lvbiA7XG4gICAgICAgIGlmIChub2RlLmV4cHJlc3Npb24ua2luZCA9PT0gdHMuU3ludGF4S2luZC5JZGVudGlmaWVyICYmXG4gICAgICAgICAgKG5vZGUuZXhwcmVzc2lvbiBhcyB0cy5JZGVudGlmaWVyKS50ZXh0ID09PSAncmVxdWlyZScgJiZcbiAgICAgICAgICBub2RlLmFyZ3VtZW50c1swXS5raW5kID09PSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICBjb25zdCBkZXAgPSByZXNvbHZlKChub2RlLmFyZ3VtZW50c1swXSBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0LCBmaWxlLCBjdHgsIGFzdC5nZXRTdGFydCgpLCBxLnNyYyk7XG4gICAgICAgICAgaWYgKGRlcClcbiAgICAgICAgICAgIGRlcHMucHVzaChkZXApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICBdKTtcbiAgcmV0dXJuIGRlcHM7XG59XG5cbmNvbnN0IFBLR19OQU1FX1BBVCA9IC9eKD86QFteL10rXFwvKT9bXi8uXSsvO1xuXG5mdW5jdGlvbiByZXNvbHZlKHBhdGg6IHN0cmluZywgZmlsZTogc3RyaW5nLCBjdHg6IENvbnRleHQsIHBvczogbnVtYmVyLCBzcmM6IHRzLlNvdXJjZUZpbGUpOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHBhdGguc3RhcnRzV2l0aCgnYCcpKSB7XG4gICAgY29uc3QgbGluZUluZm8gPSB0cy5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihzcmMsIHBvcyk7XG4gICAgY3R4LmNhbk5vdFJlc29sdmUucHVzaCh7XG4gICAgICB0YXJnZXQ6IHBhdGgsXG4gICAgICBmaWxlLFxuICAgICAgcG9zOiBgbGluZToke2xpbmVJbmZvLmxpbmUgKyAxfSwgY29sOiR7bGluZUluZm8uY2hhcmFjdGVyICsgMX1gLFxuICAgICAgcmVhc29uZTogJ2R5bmFtaWMgdmFsdWUnXG4gICAgfSk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1sZW5cbiAgICAvLyBsb2cuaW5mbyhgW2NsaS1hbmFseXNpZS13b3JrZXJdIGNhbiBub3QgcmVzb2x2ZSBkeW5hbWljIHZhbHVlICR7cGF0aH0gaW4gJHtmaWxlfSBAJHtsaW5lSW5mby5saW5lICsgMX06JHtsaW5lSW5mby5jaGFyYWN0ZXIgKyAxfWApO1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGlmIChwYXRoLnN0YXJ0c1dpdGgoJ1wiJykgfHwgcGF0aC5zdGFydHNXaXRoKCdcXCcnKSlcbiAgICBwYXRoID0gcGF0aC5zbGljZSgxLCAtMSk7XG5cbiAgaWYgKGN0eC5pZ25vcmVQYXR0ZXJuICYmIGN0eC5pZ25vcmVQYXR0ZXJuLnRlc3QocGF0aCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGZvciAoY29uc3QgW3JlZywgcmVwbGFjZVRvXSBvZiBjdHguYWxpYXMpIHtcbiAgICBjb25zdCByZXBsYWNlZCA9IHBhdGgucmVwbGFjZShyZWcsIHJlcGxhY2VUbyk7XG4gICAgaWYgKHBhdGggIT09IHJlcGxhY2VkKSB7XG4gICAgICBjdHgubWF0Y2hBbGlhcy5wdXNoKHBhdGgpO1xuICAgICAgcGF0aCA9IHJlcGxhY2VkO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKE5PREVfTU9EVUxFX1NFVC5oYXMocGF0aCkpIHtcbiAgICBjdHgubm9kZU1vZHVsZURlcHMuYWRkKHBhdGgpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgbGV0IHJlc29sdmVkID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUocGF0aCwgZmlsZSwgY28hLCBob3N0LCByZXNDYWNoZSkucmVzb2x2ZWRNb2R1bGU7XG4gIGlmIChyZXNvbHZlZCA9PSBudWxsKSB7XG4gICAgW3BhdGggKyAnL2luZGV4JywgcGF0aCArICcuanMnLCBwYXRoICsgJy5qc3gnLCBwYXRoICsgJy9pbmRleC5qcycsIHBhdGggKyAnL2luZGV4LmpzeCddXG4gICAgLnNvbWUodHJ5UGF0aCA9PiB7XG4gICAgICBsb2cuZGVidWcoYEZvciBwYXRoIFwiJHtwYXRofVwiLCB0cnkgcGF0aDpgLCB0cnlQYXRoKTtcbiAgICAgIHJlc29sdmVkID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUodHJ5UGF0aCwgZmlsZSwgY28hLCBob3N0LCByZXNDYWNoZSkucmVzb2x2ZWRNb2R1bGU7XG4gICAgICByZXR1cm4gcmVzb2x2ZWQgIT0gbnVsbDtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIGlmIChwYXRoLnN0YXJ0c1dpdGgoJy4nKSB8fCBQYXRoLmlzQWJzb2x1dGUocGF0aCkpIHtcbiAgaWYgKHJlc29sdmVkID09IG51bGwpIHtcbiAgICBpZiAoIXBhdGguc3RhcnRzV2l0aCgnLicpICYmICFQYXRoLmlzQWJzb2x1dGUocGF0aCkpIHtcbiAgICAgIGNvbnN0IG0gPSBQS0dfTkFNRV9QQVQuZXhlYyhwYXRoKTtcbiAgICAgIGNvbnN0IHBrZ05hbWUgPSBtID8gbVswXSA6IHBhdGg7XG4gICAgICBpZiAoTk9ERV9NT0RVTEVfU0VULmhhcyhwa2dOYW1lKSlcbiAgICAgICAgY3R4Lm5vZGVNb2R1bGVEZXBzLmFkZChwa2dOYW1lKTtcbiAgICAgIGVsc2VcbiAgICAgICAgY3R4LmV4dGVybmFsRGVwcy5hZGQocGtnTmFtZSk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgbGluZUluZm8gPSB0cy5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihzcmMsIHBvcyk7XG4gICAgY3R4LmNhbk5vdFJlc29sdmUucHVzaCh7XG4gICAgICB0YXJnZXQ6IHBhdGgsXG4gICAgICBmaWxlLFxuICAgICAgcG9zOiBgbGluZToke2xpbmVJbmZvLmxpbmUgKyAxfSwgY29sOiR7bGluZUluZm8uY2hhcmFjdGVyICsgMX1gLFxuICAgICAgcmVhc29uZTogJ1R5cGVzY3JpcHQgZmFpbGVkIHRvIHJlc29sdmUnXG4gICAgfSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0gZWxzZSB7XG4gICAgaWYgKHJlc29sdmVkLmlzRXh0ZXJuYWxMaWJyYXJ5SW1wb3J0ICYmIHJlc29sdmVkLnBhY2thZ2VJZCAmJiByZXNvbHZlZC5wYWNrYWdlSWQubmFtZSAhPT0gY3R4Lmlnbm9yZVBrZ05hbWUpIHtcbiAgICAgIGNvbnN0IHBrZ05hbWUgPSByZXNvbHZlZC5wYWNrYWdlSWQubmFtZTtcbiAgICAgIGlmIChOT0RFX01PRFVMRV9TRVQuaGFzKHBrZ05hbWUpKVxuICAgICAgICBjdHgubm9kZU1vZHVsZURlcHMuYWRkKHBrZ05hbWUpO1xuICAgICAgZWxzZVxuICAgICAgICBjdHguZXh0ZXJuYWxEZXBzLmFkZChwa2dOYW1lKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBhYnNQYXRoID0gUGF0aC5yZXNvbHZlKHJlc29sdmVkLnJlc29sdmVkRmlsZU5hbWUpO1xuICAgIGlmICghYWJzUGF0aC5zdGFydHNXaXRoKGN0eC5jb21tb25EaXIpKSB7XG4gICAgICBjdHgucmVsYXRpdmVEZXBzT3V0U2lkZURpci5hZGQoUGF0aC5yZWxhdGl2ZShwbGlua0Vudi53b3JrRGlyLCBhYnNQYXRoKSk7XG4gICAgfVxuICAgIGxvZy5kZWJ1ZygncmVzb2x2ZWQgdG8nLCBhYnNQYXRoKTtcbiAgICByZXR1cm4gYWJzUGF0aDtcbiAgfVxufVxuXG5cbiJdfQ==