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
const PKG_NAME_PAT = /^(?:@[^/]+\/)?[^/]+/;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFuYWx5c2Utd29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1hbmFseXNlLXdvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSx1Q0FBcUM7QUFFckMsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUNwQixvREFBNEI7QUFDNUIsNERBQTRCO0FBQzVCLHlFQUEwQztBQUMxQyxpQ0FBaUM7QUFDakMsMENBQW1DO0FBQ25DLGdEQUFxRDtBQUNyRCxrRkFBa0Y7QUFDbEYsa0VBQTBFO0FBQzFFLHNEQUE4RDtBQUM5RCwwREFBZ0Q7QUFDaEQsd0NBQStEO0FBQy9ELGdEQUFvRztBQUNwRyxzQ0FBbUM7QUFFbkMsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLENBQUMsZ0JBQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUV2RCxJQUFJLE1BQStCLENBQUM7QUFDcEMsaUdBQWlHO0FBQ2pHLElBQUksRUFBa0MsQ0FBQztBQUN2QyxJQUFJLFFBQWtDLENBQUM7QUFDdkMsSUFBSSxJQUFxQixDQUFDO0FBQzFCLElBQUEsc0NBQWtCLEdBQUUsQ0FBQztBQUNyQixJQUFBLDhCQUFVLEVBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWUsQ0FBQyxDQUFDLENBQUM7QUFDcEQsSUFBQSw0Q0FBMkIsR0FBRSxDQUFDO0FBQzlCLE1BQU0sR0FBRyxHQUFHLElBQUEsaUJBQVEsRUFBQyxVQUFVLENBQUMsQ0FBQztBQUNqQyxNQUFhLE9BQU87SUFNbEIsWUFDRSxTQUFpQixFQUNWLEtBQXlDLEVBQ3pDLGFBQXNCLEVBQ3RCLHlCQUFzQyxJQUFJLEdBQUcsRUFBRSxFQUMvQyxTQUFtQixFQUFFLEVBQ3JCLGdCQUtELEVBQUUsRUFDRCxlQUE0QixJQUFJLEdBQUcsRUFBRSxFQUNyQyxpQkFBOEIsSUFBSSxHQUFHLEVBQUUsRUFDdkMsYUFBMEIsSUFBSSxHQUFHLEVBQUU7UUFa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Y0FBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUN4RCxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDdEMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLGVBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUMxRTtRQUNELEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sT0FBTyxDQUFDO0tBQ2hCO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJztcblxuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IE1vZHVsZSBmcm9tICdtb2R1bGUnO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IFF1ZXJ5IGZyb20gJy4uL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG4vLyBpbXBvcnQge0VPTCBhcyBlb2x9IGZyb20gJ29zJztcbmltcG9ydCB7REZTfSBmcm9tICcuLi91dGlscy9ncmFwaCc7XG5pbXBvcnQge2pzb25Ub0NvbXBpbGVyT3B0aW9uc30gZnJvbSAnLi4vdHMtY29tcGlsZXInO1xuLy8gaW1wb3J0IHtzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGh9IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHtpbml0QXNDaGlsZFByb2Nlc3MsIGluaXRDb25maWd9IGZyb20gJy4uL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJztcbmltcG9ydCB7aW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzfSBmcm9tICcuLi9wYWNrYWdlLXJ1bm5lcic7XG5pbXBvcnQge3dlYkluamVjdG9yfSBmcm9tICcuLi9pbmplY3Rvci1mYWN0b3J5JztcbmltcG9ydCB7Y2xvc2VzdENvbW1vblBhcmVudERpciwgcGxpbmtFbnZ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IHttZXJnZUJhc2VVcmxBbmRQYXRocywgUmVxdWlyZWRDb21waWxlck9wdGlvbnMsIHBhcnNlQ29uZmlnRmlsZVRvSnNvbn0gZnJvbSAnLi4vdHMtY21kLXV0aWwnO1xuaW1wb3J0IHtsb2c0RmlsZX0gZnJvbSAnLi4vbG9nZ2VyJztcblxuY29uc3QgTk9ERV9NT0RVTEVfU0VUID0gbmV3IFNldChNb2R1bGUuYnVpbHRpbk1vZHVsZXMpO1xuXG5sZXQgY29Kc29uOiBSZXF1aXJlZENvbXBpbGVyT3B0aW9ucztcbi8vIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChwbGlua0Vudi53b3JrRGlyLCAnLi8nLCBjb0pzb24sIHt3b3Jrc3BhY2VEaXI6IHBsaW5rRW52LndvcmtEaXJ9KTtcbmxldCBjbzogdHMuQ29tcGlsZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xubGV0IHJlc0NhY2hlOiB0cy5Nb2R1bGVSZXNvbHV0aW9uQ2FjaGU7XG5sZXQgaG9zdDogdHMuQ29tcGlsZXJIb3N0O1xuaW5pdEFzQ2hpbGRQcm9jZXNzKCk7XG5pbml0Q29uZmlnKEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuUExJTktfQ0xJX09QVFMhKSk7XG5pbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoKTtcbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuZXhwb3J0IGNsYXNzIENvbnRleHQge1xuICBjb21tb25EaXI6IHN0cmluZztcbiAgLyoqIHRyYXZlcnNlZCBmaWxlcyAqL1xuICB0b3BTb3J0ZWRGaWxlczogc3RyaW5nW10gPSBbXTtcbiAgaWdub3JlUGtnTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGNvbW1vbkRpcjogc3RyaW5nLFxuICAgIHB1YmxpYyBhbGlhczogW3JlZzogUmVnRXhwLCByZXBsYWNlVG86IHN0cmluZ11bXSxcbiAgICBwdWJsaWMgaWdub3JlUGF0dGVybj86IFJlZ0V4cCxcbiAgICBwdWJsaWMgcmVsYXRpdmVEZXBzT3V0U2lkZURpcjogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCksXG4gICAgcHVibGljIGN5Y2xpYzogc3RyaW5nW10gPSBbXSxcbiAgICBwdWJsaWMgY2FuTm90UmVzb2x2ZToge1xuICAgICAgdGFyZ2V0OiBzdHJpbmc7XG4gICAgICBmaWxlOiBzdHJpbmc7XG4gICAgICBwb3M6IHN0cmluZztcbiAgICAgIHJlYXNvbmU6IHN0cmluZztcbiAgICB9W10gPSBbXSxcbiAgICBwdWJsaWMgZXh0ZXJuYWxEZXBzOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoKSxcbiAgICBwdWJsaWMgbm9kZU1vZHVsZURlcHM6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpLFxuICAgIHB1YmxpYyBtYXRjaEFsaWFzOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoKVxuICApIHtcbiAgICB0aGlzLmNvbW1vbkRpciA9IGNvbW1vbkRpci5lbmRzV2l0aChQYXRoLnNlcCkgPyBjb21tb25EaXIgOiBjb21tb25EaXIgKyBQYXRoLnNlcDtcbiAgfVxuXG4gIHRvUGxhaW5PYmplY3QoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGNvbW1vbkRpcjogdGhpcy5jb21tb25EaXIuc2xpY2UoMCwgLTEpLCAvLyB0cmltIGxhc3QgUGF0aC5zZXBcbiAgICAgIHJlbGF0aXZlRGVwc091dFNpZGVEaXI6IEFycmF5LmZyb20odGhpcy5yZWxhdGl2ZURlcHNPdXRTaWRlRGlyLnZhbHVlcygpKSxcbiAgICAgIGN5Y2xpYzogdGhpcy5jeWNsaWMsXG4gICAgICBjYW5Ob3RSZXNvbHZlOiB0aGlzLmNhbk5vdFJlc29sdmUsXG4gICAgICBleHRlcm5hbERlcHM6IEFycmF5LmZyb20odGhpcy5leHRlcm5hbERlcHMudmFsdWVzKCkpLFxuICAgICAgbm9kZU1vZHVsZURlcHM6IEFycmF5LmZyb20odGhpcy5ub2RlTW9kdWxlRGVwcy52YWx1ZXMoKSksXG4gICAgICBtYXRjaEFsaWFzOiBBcnJheS5mcm9tKHRoaXMubWF0Y2hBbGlhcy52YWx1ZXMoKSksXG4gICAgICBmaWxlczogdGhpcy50b3BTb3J0ZWRGaWxlc1xuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRmc1RyYXZlcnNlRmlsZXMoZmlsZXM6IHN0cmluZ1tdLCB0c2NvbmZpZ0ZpbGU6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQsXG4gIGFsaWFzOiBbcmVnOiBzdHJpbmcsIHJlcGxhY2VUbzogc3RyaW5nXVtdLCBpZ25vcmU/OiBzdHJpbmcpOiBSZXR1cm5UeXBlPENvbnRleHRbJ3RvUGxhaW5PYmplY3QnXT4ge1xuICBpbml0KHRzY29uZmlnRmlsZSk7XG4gIGNvbnN0IGNvbW1vblBhcmVudERpciA9IChmaWxlcy5sZW5ndGggPT09IDEpID8gUGF0aC5kaXJuYW1lKGZpbGVzWzBdKSA6IGNsb3Nlc3RDb21tb25QYXJlbnREaXIoZmlsZXMpO1xuICBjb25zdCBjb250ZXh0ID0gbmV3IENvbnRleHQoY29tbW9uUGFyZW50RGlyLCBhbGlhcy5tYXAoaXRlbSA9PiBbbmV3IFJlZ0V4cChpdGVtWzBdKSwgaXRlbVsxXV0pLFxuICAgIGlnbm9yZSA/IG5ldyBSZWdFeHAoaWdub3JlKSA6IHVuZGVmaW5lZCk7XG5cbiAgLy8gaW4gY2FzZSB0aGUgZmlsZSBpcyBpbiB1bmRlciBkaXJlY3Rvcnkgbm9kZV9tb2R1bGVzLCBhbGwgcmVsYXRpdmUgcGF0aCB3aWxsIGJlIHJlc29sdmVkIHRvIHBhY2thZ2VJZCxcbiAgbGV0IHJlc29sdmVkID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUoJy4vJyArIFBhdGgucGFyc2UoZmlsZXNbMF0pLm5hbWUsIGZpbGVzWzBdLCBjbyEsIGhvc3QsIHJlc0NhY2hlKS5yZXNvbHZlZE1vZHVsZTtcbiAgY29udGV4dC5pZ25vcmVQa2dOYW1lID0gcmVzb2x2ZWQ/LnBhY2thZ2VJZD8ubmFtZTtcblxuICBjb25zdCBkZnM6IERGUzxzdHJpbmc+ID0gbmV3IERGUzxzdHJpbmc+KGZpbGUgPT4ge1xuICAgIGNvbnN0IGNvbnRlbnQgPSB3ZWJJbmplY3Rvci5pbmplY3RUb0ZpbGUoZmlsZSwgZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JykpO1xuICAgIGNvbnN0IHEgPSBuZXcgUXVlcnkoY29udGVudCwgZmlsZSk7XG4gICAgbG9nLmRlYnVnKCdMb29rdXAgZmlsZScsIFBhdGgucmVsYXRpdmUocGxpbmtFbnYud29ya0RpciwgZmlsZSkpO1xuICAgIHJldHVybiBwYXJzZUZpbGUocSwgZmlsZSwgY29udGV4dCk7XG4gIH0sIHZlcnRleCA9PiB7XG4gICAgbG9nLmRlYnVnKCdGaW5pc2hlZCBmaWxlJywgUGF0aC5yZWxhdGl2ZShwbGlua0Vudi53b3JrRGlyLCB2ZXJ0ZXguZGF0YSkpO1xuICAgIGNvbnRleHQudG9wU29ydGVkRmlsZXMucHVzaCh2ZXJ0ZXguZGF0YSk7XG4gIH0pO1xuICBsb2cuaW5mbygnc2NhbiBmaWxlc1xcbicsIGZpbGVzKTtcbiAgZGZzLnZpc2l0KGZpbGVzKTtcbiAgY29uc3QgY3dkID0gcGxpbmtFbnYud29ya0RpcjtcbiAgaWYgKGRmcy5iYWNrRWRnZXMubGVuZ3RoID4gMCkge1xuICAgIGZvciAoY29uc3QgZWRnZXMgb2YgZGZzLmJhY2tFZGdlcykge1xuICAgICAgLy8gbG9nLmluZm8oYEZvdW5kIGN5Y2xpYyBmaWxlIGRlcGVuZGVuY3kgJHtkZnMucHJpbnRDeWNsaWNCYWNrRWRnZShlZGdlc1swXSwgZWRnZXNbMV0pfWApO1xuICAgICAgY29udGV4dC5jeWNsaWMucHVzaChkZnMucHJpbnRDeWNsaWNCYWNrRWRnZShlZGdlc1swXSwgZWRnZXNbMV0pXG4gICAgICAgIC5tYXAocGF0aCA9PiBQYXRoLnJlbGF0aXZlKGN3ZCwgcGF0aCkpLmpvaW4oJ1xcbiAtPiAnKVxuICAgICAgKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGNvbnRleHQudG9QbGFpbk9iamVjdCgpO1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHRzY29uZmlnRmlsZSBhbGwgY29tcGlsZXJPcHRpb25zLnBhdGhzIHNldHRpbmcgd2lsbCBiZSBhZG9wdGVkIGluIHJlc29sdmluZyBmaWxlc1xuICovXG5mdW5jdGlvbiBpbml0KHRzY29uZmlnRmlsZT86IHN0cmluZyB8IG51bGwpIHtcbiAgaWYgKGNvSnNvbiAhPSBudWxsKVxuICAgIHJldHVybjtcblxuICBjb25zdCBiYXNlVHNjb25maWdGaWxlID0gUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzY29uZmlnLXRzeC5qc29uJyk7XG5cbiAgY29uc3QgYmFzZVRzY2ZnID0gcGFyc2VDb25maWdGaWxlVG9Kc29uKHRzLCBiYXNlVHNjb25maWdGaWxlKTtcblxuICBjb0pzb24gPSBiYXNlVHNjZmcuY29tcGlsZXJPcHRpb25zO1xuICBpZiAodHNjb25maWdGaWxlKSB7XG4gICAgbWVyZ2VCYXNlVXJsQW5kUGF0aHModHMsIHRzY29uZmlnRmlsZSwgcGxpbmtFbnYud29ya0RpciwgY29Kc29uKTtcbiAgfVxuICBjb0pzb24uYWxsb3dKcyA9IHRydWU7XG4gIGNvSnNvbi5yZXNvbHZlSnNvbk1vZHVsZSA9IHRydWU7XG4gIGxvZy5kZWJ1ZygndHNjb25maWcnLCBiYXNlVHNjZmcpO1xuICBjbyA9IGpzb25Ub0NvbXBpbGVyT3B0aW9ucyhjb0pzb24sIGJhc2VUc2NvbmZpZ0ZpbGUsIHBsaW5rRW52LndvcmtEaXIpO1xuICByZXNDYWNoZSA9IHRzLmNyZWF0ZU1vZHVsZVJlc29sdXRpb25DYWNoZShwbGlua0Vudi53b3JrRGlyLCBmaWxlTmFtZSA9PiBmaWxlTmFtZSwgY28pO1xuICBob3N0ID0gdHMuY3JlYXRlQ29tcGlsZXJIb3N0KGNvKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VGaWxlKHE6IFF1ZXJ5LCBmaWxlOiBzdHJpbmcsIGN0eDogQ29udGV4dCkge1xuICBjb25zdCBkZXBzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIHEud2Fsa0FzdChxLnNyYywgW1xuICAgIHtcbiAgICAgIHF1ZXJ5OiAnLm1vZHVsZVNwZWNpZmllcjpTdHJpbmdMaXRlcmFsJywgLy8gQm90aCA6RXhwb3J0RGVjbGFyYXRpb24gb3IgOkltcG9ydERlY2xhcmF0aW9uXG4gICAgICBjYWxsYmFjayhhc3QpIHtcbiAgICAgICAgY29uc3QgZGVwID0gcmVzb2x2ZSgoYXN0IGFzIHRzLlN0cmluZ0xpdGVyYWwpLmdldFRleHQoKSwgZmlsZSwgY3R4LCBhc3QuZ2V0U3RhcnQoKSwgcS5zcmMpO1xuICAgICAgICBpZiAoZGVwKVxuICAgICAgICAgIGRlcHMucHVzaChkZXApO1xuICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgcXVlcnk6ICc6UHJvcGVydHlBc3NpZ25tZW50Pi5uYW1lJyxcbiAgICAgIGNhbGxiYWNrKGFzdCwgcGF0aCwgcGFyZW50cykge1xuICAgICAgICBpZiAoYXN0LmdldFRleHQoKSA9PT0gJ2xvYWRDaGlsZHJlbicpIHtcbiAgICAgICAgICBjb25zdCB2YWx1ZSA9IChhc3QucGFyZW50IGFzIHRzLlByb3BlcnR5QXNzaWdubWVudCkuaW5pdGlhbGl6ZXI7XG4gICAgICAgICAgaWYgKHZhbHVlLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU3RyaW5nTGl0ZXJhbCkge1xuICAgICAgICAgICAgY29uc3QgbGF6eU1vZHVsZSA9ICh2YWx1ZSBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0O1xuICAgICAgICAgICAgY29uc3QgaGFzaFRhZyA9IGxhenlNb2R1bGUuaW5kZXhPZignIycpO1xuICAgICAgICAgICAgaWYgKGhhc2hUYWcgPiAwKSB7XG4gICAgICAgICAgICAgIC8vIFdlIGZvdW5kIGxhenkgcm91dGUgbW9kdWxlXG4gICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgICAgIGxvZy5kZWJ1ZygnbGF6eSByb3V0ZSBtb2R1bGU6JywgbGF6eU1vZHVsZSk7XG4gICAgICAgICAgICAgIGNvbnN0IGRlcCA9IHJlc29sdmUobGF6eU1vZHVsZS5zbGljZSgwLCBoYXNoVGFnKSwgZmlsZSwgY3R4LCBhc3QuZ2V0U3RhcnQoKSwgcS5zcmMpO1xuICAgICAgICAgICAgICBpZiAoZGVwKVxuICAgICAgICAgICAgICAgIGRlcHMucHVzaChkZXApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgcXVlcnk6ICc6Q2FsbEV4cHJlc3Npb24+LmV4cHJlc3Npb246SW1wb3J0S2V5d29yZCcsXG4gICAgICBjYWxsYmFjayhhc3QsIHBhdGgpIHtcbiAgICAgICAgY29uc3QgZGVwID0gcmVzb2x2ZSgoKGFzdC5wYXJlbnQgYXMgdHMuQ2FsbEV4cHJlc3Npb24pLmFyZ3VtZW50c1swXSBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0LCBmaWxlLFxuICAgICAgICAgIGN0eCwgYXN0LmdldFN0YXJ0KCksIHEuc3JjKTtcbiAgICAgICAgaWYgKGRlcClcbiAgICAgICAgICBkZXBzLnB1c2goZGVwKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgIHF1ZXJ5OiAnOkNhbGxFeHByZXNzaW9uJyxcbiAgICAgIGNhbGxiYWNrKGFzdCwgcGF0aCkge1xuICAgICAgICBjb25zdCBub2RlID0gYXN0IGFzIHRzLkNhbGxFeHByZXNzaW9uIDtcbiAgICAgICAgaWYgKG5vZGUuZXhwcmVzc2lvbi5raW5kID09PSB0cy5TeW50YXhLaW5kLklkZW50aWZpZXIgJiZcbiAgICAgICAgICAobm9kZS5leHByZXNzaW9uIGFzIHRzLklkZW50aWZpZXIpLnRleHQgPT09ICdyZXF1aXJlJyAmJlxuICAgICAgICAgIG5vZGUuYXJndW1lbnRzWzBdLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU3RyaW5nTGl0ZXJhbCkge1xuICAgICAgICAgIGNvbnN0IGRlcCA9IHJlc29sdmUoKG5vZGUuYXJndW1lbnRzWzBdIGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQsIGZpbGUsIGN0eCwgYXN0LmdldFN0YXJ0KCksIHEuc3JjKTtcbiAgICAgICAgICBpZiAoZGVwKVxuICAgICAgICAgICAgZGVwcy5wdXNoKGRlcCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIF0pO1xuICByZXR1cm4gZGVwcztcbn1cblxuY29uc3QgUEtHX05BTUVfUEFUID0gL14oPzpAW14vXStcXC8pP1teL10rLztcblxuZnVuY3Rpb24gcmVzb2x2ZShwYXRoOiBzdHJpbmcsIGZpbGU6IHN0cmluZywgY3R4OiBDb250ZXh0LCBwb3M6IG51bWJlciwgc3JjOiB0cy5Tb3VyY2VGaWxlKTogc3RyaW5nIHwgbnVsbCB7XG4gIGlmIChwYXRoLnN0YXJ0c1dpdGgoJ2AnKSkge1xuICAgIGNvbnN0IGxpbmVJbmZvID0gdHMuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24oc3JjLCBwb3MpO1xuICAgIGN0eC5jYW5Ob3RSZXNvbHZlLnB1c2goe1xuICAgICAgdGFyZ2V0OiBwYXRoLFxuICAgICAgZmlsZSxcbiAgICAgIHBvczogYGxpbmU6JHtsaW5lSW5mby5saW5lICsgMX0sIGNvbDoke2xpbmVJbmZvLmNoYXJhY3RlciArIDF9YCxcbiAgICAgIHJlYXNvbmU6ICdkeW5hbWljIHZhbHVlJ1xuICAgIH0pO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBtYXgtbGVuXG4gICAgLy8gbG9nLmluZm8oYFtjbGktYW5hbHlzaWUtd29ya2VyXSBjYW4gbm90IHJlc29sdmUgZHluYW1pYyB2YWx1ZSAke3BhdGh9IGluICR7ZmlsZX0gQCR7bGluZUluZm8ubGluZSArIDF9OiR7bGluZUluZm8uY2hhcmFjdGVyICsgMX1gKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBpZiAocGF0aC5zdGFydHNXaXRoKCdcIicpIHx8IHBhdGguc3RhcnRzV2l0aCgnXFwnJykpXG4gICAgcGF0aCA9IHBhdGguc2xpY2UoMSwgLTEpO1xuXG4gIGlmIChjdHguaWdub3JlUGF0dGVybiAmJiBjdHguaWdub3JlUGF0dGVybi50ZXN0KHBhdGgpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBmb3IgKGNvbnN0IFtyZWcsIHJlcGxhY2VUb10gb2YgY3R4LmFsaWFzKSB7XG4gICAgY29uc3QgcmVwbGFjZWQgPSBwYXRoLnJlcGxhY2UocmVnLCByZXBsYWNlVG8pO1xuICAgIGlmIChwYXRoICE9PSByZXBsYWNlZCkge1xuICAgICAgY3R4Lm1hdGNoQWxpYXMuYWRkKHBhdGgpO1xuICAgICAgcGF0aCA9IHJlcGxhY2VkO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKE5PREVfTU9EVUxFX1NFVC5oYXMocGF0aCkpIHtcbiAgICBjdHgubm9kZU1vZHVsZURlcHMuYWRkKHBhdGgpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgbGV0IHJlc29sdmVkID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUocGF0aCwgZmlsZSwgY28hLCBob3N0LCByZXNDYWNoZSkucmVzb2x2ZWRNb2R1bGU7XG4gIGlmIChyZXNvbHZlZCA9PSBudWxsKSB7XG4gICAgW3BhdGggKyAnL2luZGV4JywgcGF0aCArICcuanMnLCBwYXRoICsgJy5qc3gnLCBwYXRoICsgJy9pbmRleC5qcycsIHBhdGggKyAnL2luZGV4LmpzeCddXG4gICAgLnNvbWUodHJ5UGF0aCA9PiB7XG4gICAgICBsb2cuZGVidWcoYEZvciBwYXRoIFwiJHtwYXRofVwiLCB0cnkgcGF0aDpgLCB0cnlQYXRoKTtcbiAgICAgIHJlc29sdmVkID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUodHJ5UGF0aCwgZmlsZSwgY28hLCBob3N0LCByZXNDYWNoZSkucmVzb2x2ZWRNb2R1bGU7XG4gICAgICByZXR1cm4gcmVzb2x2ZWQgIT0gbnVsbDtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIGlmIChwYXRoLnN0YXJ0c1dpdGgoJy4nKSB8fCBQYXRoLmlzQWJzb2x1dGUocGF0aCkpIHtcbiAgaWYgKHJlc29sdmVkID09IG51bGwpIHtcbiAgICBpZiAoIXBhdGguc3RhcnRzV2l0aCgnLicpICYmICFQYXRoLmlzQWJzb2x1dGUocGF0aCkpIHtcbiAgICAgIGNvbnN0IG0gPSBQS0dfTkFNRV9QQVQuZXhlYyhwYXRoKTtcbiAgICAgIGNvbnN0IHBrZ05hbWUgPSBtID8gbVswXSA6IHBhdGg7XG4gICAgICBpZiAoTk9ERV9NT0RVTEVfU0VULmhhcyhwa2dOYW1lKSlcbiAgICAgICAgY3R4Lm5vZGVNb2R1bGVEZXBzLmFkZChwa2dOYW1lKTtcbiAgICAgIGVsc2VcbiAgICAgICAgY3R4LmV4dGVybmFsRGVwcy5hZGQocGtnTmFtZSk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgbGluZUluZm8gPSB0cy5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihzcmMsIHBvcyk7XG4gICAgY3R4LmNhbk5vdFJlc29sdmUucHVzaCh7XG4gICAgICB0YXJnZXQ6IHBhdGgsXG4gICAgICBmaWxlLFxuICAgICAgcG9zOiBgbGluZToke2xpbmVJbmZvLmxpbmUgKyAxfSwgY29sOiR7bGluZUluZm8uY2hhcmFjdGVyICsgMX1gLFxuICAgICAgcmVhc29uZTogJ1R5cGVzY3JpcHQgZmFpbGVkIHRvIHJlc29sdmUnXG4gICAgfSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0gZWxzZSB7XG4gICAgaWYgKHJlc29sdmVkLmlzRXh0ZXJuYWxMaWJyYXJ5SW1wb3J0ICYmIHJlc29sdmVkLnBhY2thZ2VJZCAmJiByZXNvbHZlZC5wYWNrYWdlSWQubmFtZSAhPT0gY3R4Lmlnbm9yZVBrZ05hbWUpIHtcbiAgICAgIGNvbnN0IHBrZ05hbWUgPSByZXNvbHZlZC5wYWNrYWdlSWQubmFtZTtcbiAgICAgIGlmIChOT0RFX01PRFVMRV9TRVQuaGFzKHBrZ05hbWUpKVxuICAgICAgICBjdHgubm9kZU1vZHVsZURlcHMuYWRkKHBrZ05hbWUpO1xuICAgICAgZWxzZVxuICAgICAgICBjdHguZXh0ZXJuYWxEZXBzLmFkZChwa2dOYW1lKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBhYnNQYXRoID0gUGF0aC5yZXNvbHZlKHJlc29sdmVkLnJlc29sdmVkRmlsZU5hbWUpO1xuICAgIGlmICghYWJzUGF0aC5zdGFydHNXaXRoKGN0eC5jb21tb25EaXIpKSB7XG4gICAgICBjdHgucmVsYXRpdmVEZXBzT3V0U2lkZURpci5hZGQoUGF0aC5yZWxhdGl2ZShwbGlua0Vudi53b3JrRGlyLCBhYnNQYXRoKSk7XG4gICAgfVxuICAgIGxvZy5kZWJ1ZygncmVzb2x2ZWQgdG8nLCBhYnNQYXRoKTtcbiAgICByZXR1cm4gYWJzUGF0aDtcbiAgfVxufVxuXG5cbiJdfQ==