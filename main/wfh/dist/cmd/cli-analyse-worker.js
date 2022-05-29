"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dfsTraverseFiles = exports.Context = void 0;
require("source-map-support/register");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const module_1 = __importDefault(require("module"));
const typescript_1 = __importDefault(require("typescript"));
const ts_ast_query_1 = __importDefault(require("../utils/ts-ast-query"));
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
const NODE_MODULE_SET = new Set(module_1.default.builtinModules);
let coJson;
// setTsCompilerOptForNodePath(plinkEnv.workDir, './', coJson, {workspaceDir: plinkEnv.workDir});
let co;
let resCache;
let host;
(0, bootstrap_process_1.initAsChildProcess)();
(0, bootstrap_process_1.initConfig)(JSON.parse(process.env.PLINK_CLI_OPTS));
(0, package_runner_1.initInjectorForNodePackages)();
const log = (0, logger_1.log4File)(__filename);
class Context {
    constructor(commonDir, alias, ignorePattern, relativeDepsOutSideDir = new Set(), cyclic = [], canNotResolve = [], externalDeps = new Set(), nodeModuleDeps = new Set(), matchAlias = new Set()) {
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
            matchAlias: Array.from(this.matchAlias.values()),
            files: this.topSortedFiles
        };
    }
}
exports.Context = Context;
function dfsTraverseFiles(files, tsconfigFile, alias, ignore) {
    var _a;
    init(tsconfigFile);
    const commonParentDir = (files.length === 1) ? path_1.default.dirname(files[0]) : (0, misc_1.closestCommonParentDir)(files);
    const context = new Context(commonParentDir, alias.map(item => [new RegExp(item[0]), item[1]]), ignore ? new RegExp(ignore) : undefined);
    // in case the file is in under directory node_modules, all relative path will be resolved to packageId,
    const resolved = typescript_1.default.resolveModuleName('./' + path_1.default.parse(files[0]).name, files[0], co, host, resCache).resolvedModule;
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
    const baseTscfg = (0, ts_cmd_util_1.parseConfigFileToJson)(typescript_1.default, baseTsconfigFile);
    coJson = baseTscfg.compilerOptions;
    if (tsconfigFile) {
        (0, ts_cmd_util_1.mergeBaseUrlAndPaths)(typescript_1.default, tsconfigFile, misc_1.plinkEnv.workDir, coJson);
    }
    coJson.allowJs = true;
    coJson.resolveJsonModule = true;
    log.debug('tsconfig', baseTscfg);
    co = (0, ts_compiler_1.jsonToCompilerOptions)(coJson, baseTsconfigFile, misc_1.plinkEnv.workDir);
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
            callback(ast, _path, _parents) {
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
            callback(ast, _path) {
                const dep = resolve(ast.parent.arguments[0].text, file, ctx, ast.getStart(), q.src);
                if (dep)
                    deps.push(dep);
            }
        },
        {
            query: ':CallExpression',
            callback(ast, _path) {
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
const PKG_NAME_PAT = /^(?:@[^/]+\/)?[^/]+/;
function resolve(path, file, ctx, pos, src) {
    var _a;
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
    if ((_a = ctx.ignorePattern) === null || _a === void 0 ? void 0 : _a.test(path)) {
        return null;
    }
    for (const [reg, replaceTo] of ctx.alias) {
        const replaced = path.replace(reg, replaceTo);
        if (path !== replaced) {
            ctx.matchAlias.add(path);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFuYWx5c2Utd29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1hbmFseXNlLXdvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSx1Q0FBcUM7QUFFckMsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUNwQixvREFBNEI7QUFDNUIsNERBQTRCO0FBQzVCLHlFQUEwQztBQUMxQyxpQ0FBaUM7QUFDakMsMENBQW1DO0FBQ25DLGdEQUFxRDtBQUNyRCxrRkFBa0Y7QUFDbEYsa0VBQTBFO0FBQzFFLHNEQUE4RDtBQUM5RCwwREFBZ0Q7QUFDaEQsd0NBQStEO0FBQy9ELGdEQUFvRztBQUNwRyxzQ0FBbUM7QUFFbkMsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLENBQUMsZ0JBQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUV2RCxJQUFJLE1BQStCLENBQUM7QUFDcEMsaUdBQWlHO0FBQ2pHLElBQUksRUFBa0MsQ0FBQztBQUN2QyxJQUFJLFFBQWtDLENBQUM7QUFDdkMsSUFBSSxJQUFxQixDQUFDO0FBQzFCLElBQUEsc0NBQWtCLEdBQUUsQ0FBQztBQUNyQixJQUFBLDhCQUFVLEVBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWUsQ0FBQyxDQUFDLENBQUM7QUFDcEQsSUFBQSw0Q0FBMkIsR0FBRSxDQUFDO0FBQzlCLE1BQU0sR0FBRyxHQUFHLElBQUEsaUJBQVEsRUFBQyxVQUFVLENBQUMsQ0FBQztBQUNqQyxNQUFhLE9BQU87SUFNbEIsWUFDRSxTQUFpQixFQUNWLEtBQXlDLEVBQ3pDLGFBQXNCLEVBQ3RCLHlCQUFzQyxJQUFJLEdBQUcsRUFBRSxFQUMvQyxTQUFtQixFQUFFLEVBQ3JCLGdCQUtELEVBQUUsRUFDRCxlQUE0QixJQUFJLEdBQUcsRUFBRSxFQUNyQyxpQkFBOEIsSUFBSSxHQUFHLEVBQUUsRUFDdkMsYUFBMEIsSUFBSSxHQUFHLEVBQUU7UUFa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TyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3hELElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUN0QyxHQUFHLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLGNBQUksQ0FBQyxRQUFRLENBQUMsZUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1NBQzFFO1FBQ0QsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDbEMsT0FBTyxPQUFPLENBQUM7S0FDaEI7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInO1xuXG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgTW9kdWxlIGZyb20gJ21vZHVsZSc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgUXVlcnkgZnJvbSAnLi4vdXRpbHMvdHMtYXN0LXF1ZXJ5Jztcbi8vIGltcG9ydCB7RU9MIGFzIGVvbH0gZnJvbSAnb3MnO1xuaW1wb3J0IHtERlN9IGZyb20gJy4uL3V0aWxzL2dyYXBoJztcbmltcG9ydCB7anNvblRvQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuLi90cy1jb21waWxlcic7XG4vLyBpbXBvcnQge3NldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aH0gZnJvbSAnLi4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQge2luaXRBc0NoaWxkUHJvY2VzcywgaW5pdENvbmZpZ30gZnJvbSAnLi4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnO1xuaW1wb3J0IHtpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXN9IGZyb20gJy4uL3BhY2thZ2UtcnVubmVyJztcbmltcG9ydCB7d2ViSW5qZWN0b3J9IGZyb20gJy4uL2luamVjdG9yLWZhY3RvcnknO1xuaW1wb3J0IHtjbG9zZXN0Q29tbW9uUGFyZW50RGlyLCBwbGlua0Vudn0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge21lcmdlQmFzZVVybEFuZFBhdGhzLCBSZXF1aXJlZENvbXBpbGVyT3B0aW9ucywgcGFyc2VDb25maWdGaWxlVG9Kc29ufSBmcm9tICcuLi90cy1jbWQtdXRpbCc7XG5pbXBvcnQge2xvZzRGaWxlfSBmcm9tICcuLi9sb2dnZXInO1xuXG5jb25zdCBOT0RFX01PRFVMRV9TRVQgPSBuZXcgU2V0KE1vZHVsZS5idWlsdGluTW9kdWxlcyk7XG5cbmxldCBjb0pzb246IFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zO1xuLy8gc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKHBsaW5rRW52LndvcmtEaXIsICcuLycsIGNvSnNvbiwge3dvcmtzcGFjZURpcjogcGxpbmtFbnYud29ya0Rpcn0pO1xubGV0IGNvOiB0cy5Db21waWxlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG5sZXQgcmVzQ2FjaGU6IHRzLk1vZHVsZVJlc29sdXRpb25DYWNoZTtcbmxldCBob3N0OiB0cy5Db21waWxlckhvc3Q7XG5pbml0QXNDaGlsZFByb2Nlc3MoKTtcbmluaXRDb25maWcoSlNPTi5wYXJzZShwcm9jZXNzLmVudi5QTElOS19DTElfT1BUUyEpKTtcbmluaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcygpO1xuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG5leHBvcnQgY2xhc3MgQ29udGV4dCB7XG4gIGNvbW1vbkRpcjogc3RyaW5nO1xuICAvKiogdHJhdmVyc2VkIGZpbGVzICovXG4gIHRvcFNvcnRlZEZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBpZ25vcmVQa2dOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgY29tbW9uRGlyOiBzdHJpbmcsXG4gICAgcHVibGljIGFsaWFzOiBbcmVnOiBSZWdFeHAsIHJlcGxhY2VUbzogc3RyaW5nXVtdLFxuICAgIHB1YmxpYyBpZ25vcmVQYXR0ZXJuPzogUmVnRXhwLFxuICAgIHB1YmxpYyByZWxhdGl2ZURlcHNPdXRTaWRlRGlyOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoKSxcbiAgICBwdWJsaWMgY3ljbGljOiBzdHJpbmdbXSA9IFtdLFxuICAgIHB1YmxpYyBjYW5Ob3RSZXNvbHZlOiB7XG4gICAgICB0YXJnZXQ6IHN0cmluZztcbiAgICAgIGZpbGU6IHN0cmluZztcbiAgICAgIHBvczogc3RyaW5nO1xuICAgICAgcmVhc29uZTogc3RyaW5nO1xuICAgIH1bXSA9IFtdLFxuICAgIHB1YmxpYyBleHRlcm5hbERlcHM6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpLFxuICAgIHB1YmxpYyBub2RlTW9kdWxlRGVwczogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCksXG4gICAgcHVibGljIG1hdGNoQWxpYXM6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpXG4gICkge1xuICAgIHRoaXMuY29tbW9uRGlyID0gY29tbW9uRGlyLmVuZHNXaXRoKFBhdGguc2VwKSA/IGNvbW1vbkRpciA6IGNvbW1vbkRpciArIFBhdGguc2VwO1xuICB9XG5cbiAgdG9QbGFpbk9iamVjdCgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgY29tbW9uRGlyOiB0aGlzLmNvbW1vbkRpci5zbGljZSgwLCAtMSksIC8vIHRyaW0gbGFzdCBQYXRoLnNlcFxuICAgICAgcmVsYXRpdmVEZXBzT3V0U2lkZURpcjogQXJyYXkuZnJvbSh0aGlzLnJlbGF0aXZlRGVwc091dFNpZGVEaXIudmFsdWVzKCkpLFxuICAgICAgY3ljbGljOiB0aGlzLmN5Y2xpYyxcbiAgICAgIGNhbk5vdFJlc29sdmU6IHRoaXMuY2FuTm90UmVzb2x2ZSxcbiAgICAgIGV4dGVybmFsRGVwczogQXJyYXkuZnJvbSh0aGlzLmV4dGVybmFsRGVwcy52YWx1ZXMoKSksXG4gICAgICBub2RlTW9kdWxlRGVwczogQXJyYXkuZnJvbSh0aGlzLm5vZGVNb2R1bGVEZXBzLnZhbHVlcygpKSxcbiAgICAgIG1hdGNoQWxpYXM6IEFycmF5LmZyb20odGhpcy5tYXRjaEFsaWFzLnZhbHVlcygpKSxcbiAgICAgIGZpbGVzOiB0aGlzLnRvcFNvcnRlZEZpbGVzXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGZzVHJhdmVyc2VGaWxlcyhmaWxlczogc3RyaW5nW10sIHRzY29uZmlnRmlsZTogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCxcbiAgYWxpYXM6IFtyZWc6IHN0cmluZywgcmVwbGFjZVRvOiBzdHJpbmddW10sIGlnbm9yZT86IHN0cmluZyk6IFJldHVyblR5cGU8Q29udGV4dFsndG9QbGFpbk9iamVjdCddPiB7XG4gIGluaXQodHNjb25maWdGaWxlKTtcbiAgY29uc3QgY29tbW9uUGFyZW50RGlyID0gKGZpbGVzLmxlbmd0aCA9PT0gMSkgPyBQYXRoLmRpcm5hbWUoZmlsZXNbMF0pIDogY2xvc2VzdENvbW1vblBhcmVudERpcihmaWxlcyk7XG4gIGNvbnN0IGNvbnRleHQgPSBuZXcgQ29udGV4dChjb21tb25QYXJlbnREaXIsIGFsaWFzLm1hcChpdGVtID0+IFtuZXcgUmVnRXhwKGl0ZW1bMF0pLCBpdGVtWzFdXSksXG4gICAgaWdub3JlID8gbmV3IFJlZ0V4cChpZ25vcmUpIDogdW5kZWZpbmVkKTtcblxuICAvLyBpbiBjYXNlIHRoZSBmaWxlIGlzIGluIHVuZGVyIGRpcmVjdG9yeSBub2RlX21vZHVsZXMsIGFsbCByZWxhdGl2ZSBwYXRoIHdpbGwgYmUgcmVzb2x2ZWQgdG8gcGFja2FnZUlkLFxuICBjb25zdCByZXNvbHZlZCA9IHRzLnJlc29sdmVNb2R1bGVOYW1lKCcuLycgKyBQYXRoLnBhcnNlKGZpbGVzWzBdKS5uYW1lLCBmaWxlc1swXSwgY28hLCBob3N0LCByZXNDYWNoZSkucmVzb2x2ZWRNb2R1bGU7XG4gIGNvbnRleHQuaWdub3JlUGtnTmFtZSA9IHJlc29sdmVkPy5wYWNrYWdlSWQ/Lm5hbWU7XG5cbiAgY29uc3QgZGZzOiBERlM8c3RyaW5nPiA9IG5ldyBERlM8c3RyaW5nPihmaWxlID0+IHtcbiAgICBjb25zdCBjb250ZW50ID0gd2ViSW5qZWN0b3IuaW5qZWN0VG9GaWxlKGZpbGUsIGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpKTtcbiAgICBjb25zdCBxID0gbmV3IFF1ZXJ5KGNvbnRlbnQsIGZpbGUpO1xuICAgIGxvZy5kZWJ1ZygnTG9va3VwIGZpbGUnLCBQYXRoLnJlbGF0aXZlKHBsaW5rRW52LndvcmtEaXIsIGZpbGUpKTtcbiAgICByZXR1cm4gcGFyc2VGaWxlKHEsIGZpbGUsIGNvbnRleHQpO1xuICB9LCB2ZXJ0ZXggPT4ge1xuICAgIGxvZy5kZWJ1ZygnRmluaXNoZWQgZmlsZScsIFBhdGgucmVsYXRpdmUocGxpbmtFbnYud29ya0RpciwgdmVydGV4LmRhdGEpKTtcbiAgICBjb250ZXh0LnRvcFNvcnRlZEZpbGVzLnB1c2godmVydGV4LmRhdGEpO1xuICB9KTtcbiAgbG9nLmluZm8oJ3NjYW4gZmlsZXNcXG4nLCBmaWxlcyk7XG4gIGRmcy52aXNpdChmaWxlcyk7XG4gIGNvbnN0IGN3ZCA9IHBsaW5rRW52LndvcmtEaXI7XG4gIGlmIChkZnMuYmFja0VkZ2VzLmxlbmd0aCA+IDApIHtcbiAgICBmb3IgKGNvbnN0IGVkZ2VzIG9mIGRmcy5iYWNrRWRnZXMpIHtcbiAgICAgIC8vIGxvZy5pbmZvKGBGb3VuZCBjeWNsaWMgZmlsZSBkZXBlbmRlbmN5ICR7ZGZzLnByaW50Q3ljbGljQmFja0VkZ2UoZWRnZXNbMF0sIGVkZ2VzWzFdKX1gKTtcbiAgICAgIGNvbnRleHQuY3ljbGljLnB1c2goZGZzLnByaW50Q3ljbGljQmFja0VkZ2UoZWRnZXNbMF0sIGVkZ2VzWzFdKVxuICAgICAgICAubWFwKHBhdGggPT4gUGF0aC5yZWxhdGl2ZShjd2QsIHBhdGgpKS5qb2luKCdcXG4gLT4gJylcbiAgICAgICk7XG4gICAgfVxuICB9XG4gIHJldHVybiBjb250ZXh0LnRvUGxhaW5PYmplY3QoKTtcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSB0c2NvbmZpZ0ZpbGUgYWxsIGNvbXBpbGVyT3B0aW9ucy5wYXRocyBzZXR0aW5nIHdpbGwgYmUgYWRvcHRlZCBpbiByZXNvbHZpbmcgZmlsZXNcbiAqL1xuZnVuY3Rpb24gaW5pdCh0c2NvbmZpZ0ZpbGU/OiBzdHJpbmcgfCBudWxsKSB7XG4gIGlmIChjb0pzb24gIT0gbnVsbClcbiAgICByZXR1cm47XG5cbiAgY29uc3QgYmFzZVRzY29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90c2NvbmZpZy10c3guanNvbicpO1xuXG4gIGNvbnN0IGJhc2VUc2NmZyA9IHBhcnNlQ29uZmlnRmlsZVRvSnNvbih0cywgYmFzZVRzY29uZmlnRmlsZSk7XG5cbiAgY29Kc29uID0gYmFzZVRzY2ZnLmNvbXBpbGVyT3B0aW9ucztcbiAgaWYgKHRzY29uZmlnRmlsZSkge1xuICAgIG1lcmdlQmFzZVVybEFuZFBhdGhzKHRzLCB0c2NvbmZpZ0ZpbGUsIHBsaW5rRW52LndvcmtEaXIsIGNvSnNvbik7XG4gIH1cbiAgY29Kc29uLmFsbG93SnMgPSB0cnVlO1xuICBjb0pzb24ucmVzb2x2ZUpzb25Nb2R1bGUgPSB0cnVlO1xuICBsb2cuZGVidWcoJ3RzY29uZmlnJywgYmFzZVRzY2ZnKTtcbiAgY28gPSBqc29uVG9Db21waWxlck9wdGlvbnMoY29Kc29uLCBiYXNlVHNjb25maWdGaWxlLCBwbGlua0Vudi53b3JrRGlyKTtcbiAgcmVzQ2FjaGUgPSB0cy5jcmVhdGVNb2R1bGVSZXNvbHV0aW9uQ2FjaGUocGxpbmtFbnYud29ya0RpciwgZmlsZU5hbWUgPT4gZmlsZU5hbWUsIGNvKTtcbiAgaG9zdCA9IHRzLmNyZWF0ZUNvbXBpbGVySG9zdChjbyk7XG59XG5cbmZ1bmN0aW9uIHBhcnNlRmlsZShxOiBRdWVyeSwgZmlsZTogc3RyaW5nLCBjdHg6IENvbnRleHQpIHtcbiAgY29uc3QgZGVwczogc3RyaW5nW10gPSBbXTtcblxuICBxLndhbGtBc3QocS5zcmMsIFtcbiAgICB7XG4gICAgICBxdWVyeTogJy5tb2R1bGVTcGVjaWZpZXI6U3RyaW5nTGl0ZXJhbCcsIC8vIEJvdGggOkV4cG9ydERlY2xhcmF0aW9uIG9yIDpJbXBvcnREZWNsYXJhdGlvblxuICAgICAgY2FsbGJhY2soYXN0KSB7XG4gICAgICAgIGNvbnN0IGRlcCA9IHJlc29sdmUoKGFzdCBhcyB0cy5TdHJpbmdMaXRlcmFsKS5nZXRUZXh0KCksIGZpbGUsIGN0eCwgYXN0LmdldFN0YXJ0KCksIHEuc3JjKTtcbiAgICAgICAgaWYgKGRlcClcbiAgICAgICAgICBkZXBzLnB1c2goZGVwKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgIHF1ZXJ5OiAnOlByb3BlcnR5QXNzaWdubWVudD4ubmFtZScsXG4gICAgICBjYWxsYmFjayhhc3QsIF9wYXRoLCBfcGFyZW50cykge1xuICAgICAgICBpZiAoYXN0LmdldFRleHQoKSA9PT0gJ2xvYWRDaGlsZHJlbicpIHtcbiAgICAgICAgICBjb25zdCB2YWx1ZSA9IChhc3QucGFyZW50IGFzIHRzLlByb3BlcnR5QXNzaWdubWVudCkuaW5pdGlhbGl6ZXI7XG4gICAgICAgICAgaWYgKHZhbHVlLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU3RyaW5nTGl0ZXJhbCkge1xuICAgICAgICAgICAgY29uc3QgbGF6eU1vZHVsZSA9ICh2YWx1ZSBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0O1xuICAgICAgICAgICAgY29uc3QgaGFzaFRhZyA9IGxhenlNb2R1bGUuaW5kZXhPZignIycpO1xuICAgICAgICAgICAgaWYgKGhhc2hUYWcgPiAwKSB7XG4gICAgICAgICAgICAgIC8vIFdlIGZvdW5kIGxhenkgcm91dGUgbW9kdWxlXG4gICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgICAgIGxvZy5kZWJ1ZygnbGF6eSByb3V0ZSBtb2R1bGU6JywgbGF6eU1vZHVsZSk7XG4gICAgICAgICAgICAgIGNvbnN0IGRlcCA9IHJlc29sdmUobGF6eU1vZHVsZS5zbGljZSgwLCBoYXNoVGFnKSwgZmlsZSwgY3R4LCBhc3QuZ2V0U3RhcnQoKSwgcS5zcmMpO1xuICAgICAgICAgICAgICBpZiAoZGVwKVxuICAgICAgICAgICAgICAgIGRlcHMucHVzaChkZXApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgcXVlcnk6ICc6Q2FsbEV4cHJlc3Npb24+LmV4cHJlc3Npb246SW1wb3J0S2V5d29yZCcsXG4gICAgICBjYWxsYmFjayhhc3QsIF9wYXRoKSB7XG4gICAgICAgIGNvbnN0IGRlcCA9IHJlc29sdmUoKChhc3QucGFyZW50IGFzIHRzLkNhbGxFeHByZXNzaW9uKS5hcmd1bWVudHNbMF0gYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dCwgZmlsZSxcbiAgICAgICAgICBjdHgsIGFzdC5nZXRTdGFydCgpLCBxLnNyYyk7XG4gICAgICAgIGlmIChkZXApXG4gICAgICAgICAgZGVwcy5wdXNoKGRlcCk7XG4gICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICBxdWVyeTogJzpDYWxsRXhwcmVzc2lvbicsXG4gICAgICBjYWxsYmFjayhhc3QsIF9wYXRoKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSBhc3QgYXMgdHMuQ2FsbEV4cHJlc3Npb24gO1xuICAgICAgICBpZiAobm9kZS5leHByZXNzaW9uLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuSWRlbnRpZmllciAmJlxuICAgICAgICAgIChub2RlLmV4cHJlc3Npb24gYXMgdHMuSWRlbnRpZmllcikudGV4dCA9PT0gJ3JlcXVpcmUnICYmXG4gICAgICAgICAgbm9kZS5hcmd1bWVudHNbMF0ua2luZCA9PT0gdHMuU3ludGF4S2luZC5TdHJpbmdMaXRlcmFsKSB7XG4gICAgICAgICAgY29uc3QgZGVwID0gcmVzb2x2ZSgobm9kZS5hcmd1bWVudHNbMF0gYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dCwgZmlsZSwgY3R4LCBhc3QuZ2V0U3RhcnQoKSwgcS5zcmMpO1xuICAgICAgICAgIGlmIChkZXApXG4gICAgICAgICAgICBkZXBzLnB1c2goZGVwKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgXSk7XG4gIHJldHVybiBkZXBzO1xufVxuXG5jb25zdCBQS0dfTkFNRV9QQVQgPSAvXig/OkBbXi9dK1xcLyk/W14vXSsvO1xuXG5mdW5jdGlvbiByZXNvbHZlKHBhdGg6IHN0cmluZywgZmlsZTogc3RyaW5nLCBjdHg6IENvbnRleHQsIHBvczogbnVtYmVyLCBzcmM6IHRzLlNvdXJjZUZpbGUpOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHBhdGguc3RhcnRzV2l0aCgnYCcpKSB7XG4gICAgY29uc3QgbGluZUluZm8gPSB0cy5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihzcmMsIHBvcyk7XG4gICAgY3R4LmNhbk5vdFJlc29sdmUucHVzaCh7XG4gICAgICB0YXJnZXQ6IHBhdGgsXG4gICAgICBmaWxlLFxuICAgICAgcG9zOiBgbGluZToke2xpbmVJbmZvLmxpbmUgKyAxfSwgY29sOiR7bGluZUluZm8uY2hhcmFjdGVyICsgMX1gLFxuICAgICAgcmVhc29uZTogJ2R5bmFtaWMgdmFsdWUnXG4gICAgfSk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1sZW5cbiAgICAvLyBsb2cuaW5mbyhgW2NsaS1hbmFseXNpZS13b3JrZXJdIGNhbiBub3QgcmVzb2x2ZSBkeW5hbWljIHZhbHVlICR7cGF0aH0gaW4gJHtmaWxlfSBAJHtsaW5lSW5mby5saW5lICsgMX06JHtsaW5lSW5mby5jaGFyYWN0ZXIgKyAxfWApO1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGlmIChwYXRoLnN0YXJ0c1dpdGgoJ1wiJykgfHwgcGF0aC5zdGFydHNXaXRoKCdcXCcnKSlcbiAgICBwYXRoID0gcGF0aC5zbGljZSgxLCAtMSk7XG5cbiAgaWYgKGN0eC5pZ25vcmVQYXR0ZXJuPy50ZXN0KHBhdGgpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBmb3IgKGNvbnN0IFtyZWcsIHJlcGxhY2VUb10gb2YgY3R4LmFsaWFzKSB7XG4gICAgY29uc3QgcmVwbGFjZWQgPSBwYXRoLnJlcGxhY2UocmVnLCByZXBsYWNlVG8pO1xuICAgIGlmIChwYXRoICE9PSByZXBsYWNlZCkge1xuICAgICAgY3R4Lm1hdGNoQWxpYXMuYWRkKHBhdGgpO1xuICAgICAgcGF0aCA9IHJlcGxhY2VkO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKE5PREVfTU9EVUxFX1NFVC5oYXMocGF0aCkpIHtcbiAgICBjdHgubm9kZU1vZHVsZURlcHMuYWRkKHBhdGgpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgbGV0IHJlc29sdmVkID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUocGF0aCwgZmlsZSwgY28hLCBob3N0LCByZXNDYWNoZSkucmVzb2x2ZWRNb2R1bGU7XG4gIGlmIChyZXNvbHZlZCA9PSBudWxsKSB7XG4gICAgW3BhdGggKyAnL2luZGV4JywgcGF0aCArICcuanMnLCBwYXRoICsgJy5qc3gnLCBwYXRoICsgJy9pbmRleC5qcycsIHBhdGggKyAnL2luZGV4LmpzeCddXG4gICAgICAuc29tZSh0cnlQYXRoID0+IHtcbiAgICAgICAgbG9nLmRlYnVnKGBGb3IgcGF0aCBcIiR7cGF0aH1cIiwgdHJ5IHBhdGg6YCwgdHJ5UGF0aCk7XG4gICAgICAgIHJlc29sdmVkID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUodHJ5UGF0aCwgZmlsZSwgY28hLCBob3N0LCByZXNDYWNoZSkucmVzb2x2ZWRNb2R1bGU7XG4gICAgICAgIHJldHVybiByZXNvbHZlZCAhPSBudWxsO1xuICAgICAgfSk7XG4gIH1cblxuICAvLyBpZiAocGF0aC5zdGFydHNXaXRoKCcuJykgfHwgUGF0aC5pc0Fic29sdXRlKHBhdGgpKSB7XG4gIGlmIChyZXNvbHZlZCA9PSBudWxsKSB7XG4gICAgaWYgKCFwYXRoLnN0YXJ0c1dpdGgoJy4nKSAmJiAhUGF0aC5pc0Fic29sdXRlKHBhdGgpKSB7XG4gICAgICBjb25zdCBtID0gUEtHX05BTUVfUEFULmV4ZWMocGF0aCk7XG4gICAgICBjb25zdCBwa2dOYW1lID0gbSA/IG1bMF0gOiBwYXRoO1xuICAgICAgaWYgKE5PREVfTU9EVUxFX1NFVC5oYXMocGtnTmFtZSkpXG4gICAgICAgIGN0eC5ub2RlTW9kdWxlRGVwcy5hZGQocGtnTmFtZSk7XG4gICAgICBlbHNlXG4gICAgICAgIGN0eC5leHRlcm5hbERlcHMuYWRkKHBrZ05hbWUpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGxpbmVJbmZvID0gdHMuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24oc3JjLCBwb3MpO1xuICAgIGN0eC5jYW5Ob3RSZXNvbHZlLnB1c2goe1xuICAgICAgdGFyZ2V0OiBwYXRoLFxuICAgICAgZmlsZSxcbiAgICAgIHBvczogYGxpbmU6JHtsaW5lSW5mby5saW5lICsgMX0sIGNvbDoke2xpbmVJbmZvLmNoYXJhY3RlciArIDF9YCxcbiAgICAgIHJlYXNvbmU6ICdUeXBlc2NyaXB0IGZhaWxlZCB0byByZXNvbHZlJ1xuICAgIH0pO1xuICAgIHJldHVybiBudWxsO1xuICB9IGVsc2Uge1xuICAgIGlmIChyZXNvbHZlZC5pc0V4dGVybmFsTGlicmFyeUltcG9ydCAmJiByZXNvbHZlZC5wYWNrYWdlSWQgJiYgcmVzb2x2ZWQucGFja2FnZUlkLm5hbWUgIT09IGN0eC5pZ25vcmVQa2dOYW1lKSB7XG4gICAgICBjb25zdCBwa2dOYW1lID0gcmVzb2x2ZWQucGFja2FnZUlkLm5hbWU7XG4gICAgICBpZiAoTk9ERV9NT0RVTEVfU0VULmhhcyhwa2dOYW1lKSlcbiAgICAgICAgY3R4Lm5vZGVNb2R1bGVEZXBzLmFkZChwa2dOYW1lKTtcbiAgICAgIGVsc2VcbiAgICAgICAgY3R4LmV4dGVybmFsRGVwcy5hZGQocGtnTmFtZSk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgYWJzUGF0aCA9IFBhdGgucmVzb2x2ZShyZXNvbHZlZC5yZXNvbHZlZEZpbGVOYW1lKTtcbiAgICBpZiAoIWFic1BhdGguc3RhcnRzV2l0aChjdHguY29tbW9uRGlyKSkge1xuICAgICAgY3R4LnJlbGF0aXZlRGVwc091dFNpZGVEaXIuYWRkKFBhdGgucmVsYXRpdmUocGxpbmtFbnYud29ya0RpciwgYWJzUGF0aCkpO1xuICAgIH1cbiAgICBsb2cuZGVidWcoJ3Jlc29sdmVkIHRvJywgYWJzUGF0aCk7XG4gICAgcmV0dXJuIGFic1BhdGg7XG4gIH1cbn1cblxuXG4iXX0=