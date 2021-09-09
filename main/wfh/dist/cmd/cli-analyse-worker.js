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
const module_1 = __importDefault(require("module"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFuYWx5c2Utd29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1hbmFseXNlLXdvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSx1Q0FBcUM7QUFFckMseUVBQTBDO0FBQzFDLDRDQUFvQjtBQUNwQiw0REFBNEI7QUFDNUIsZ0RBQXdCO0FBQ3hCLGlDQUFpQztBQUNqQywwQ0FBbUM7QUFDbkMsZ0RBQXFEO0FBQ3JELGtGQUFrRjtBQUNsRixrRUFBMEU7QUFDMUUsc0RBQThEO0FBQzlELDBEQUFnRDtBQUNoRCx3Q0FBK0Q7QUFDL0QsZ0RBQW9HO0FBQ3BHLHNDQUFtQztBQUNuQyxvREFBNEI7QUFFNUIsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLENBQUMsZ0JBQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUV2RCxJQUFJLE1BQStCLENBQUM7QUFDcEMsaUdBQWlHO0FBQ2pHLElBQUksRUFBa0MsQ0FBQztBQUN2QyxJQUFJLFFBQWtDLENBQUM7QUFDdkMsSUFBSSxJQUFxQixDQUFDO0FBQzFCLElBQUEsc0NBQWtCLEdBQUUsQ0FBQztBQUNyQixJQUFBLDhCQUFVLEVBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWUsQ0FBQyxDQUFDLENBQUM7QUFDcEQsSUFBQSw0Q0FBMkIsR0FBRSxDQUFDO0FBQzlCLE1BQU0sR0FBRyxHQUFHLElBQUEsaUJBQVEsRUFBQyxVQUFVLENBQUMsQ0FBQztBQUNqQyxNQUFhLE9BQU87SUFNbEIsWUFDRSxTQUFpQixFQUNWLEtBQXlDLEVBQ3pDLGFBQXNCLEVBQ3RCLHlCQUFzQyxJQUFJLEdBQUcsRUFBRSxFQUMvQyxTQUFtQixFQUFFLEVBQ3JCLGdCQUtELEVBQUUsRUFDRCxlQUE0QixJQUFJLEdBQUcsRUFBRSxFQUNyQyxpQkFBOEIsSUFBSSxHQUFHLEVBQUUsRUFDdkMsYUFBdUIsRUFBRTtRQVp6QixVQUFLLEdB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RCxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDdEMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLGVBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUMxRTtRQUNELEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sT0FBTyxDQUFDO0tBQ2hCO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJztcblxuaW1wb3J0IFF1ZXJ5IGZyb20gJy4uL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG4vLyBpbXBvcnQge0VPTCBhcyBlb2x9IGZyb20gJ29zJztcbmltcG9ydCB7REZTfSBmcm9tICcuLi91dGlscy9ncmFwaCc7XG5pbXBvcnQge2pzb25Ub0NvbXBpbGVyT3B0aW9uc30gZnJvbSAnLi4vdHMtY29tcGlsZXInO1xuLy8gaW1wb3J0IHtzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGh9IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHtpbml0QXNDaGlsZFByb2Nlc3MsIGluaXRDb25maWd9IGZyb20gJy4uL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJztcbmltcG9ydCB7aW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzfSBmcm9tICcuLi9wYWNrYWdlLXJ1bm5lcic7XG5pbXBvcnQge3dlYkluamVjdG9yfSBmcm9tICcuLi9pbmplY3Rvci1mYWN0b3J5JztcbmltcG9ydCB7Y2xvc2VzdENvbW1vblBhcmVudERpciwgcGxpbmtFbnZ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IHttZXJnZUJhc2VVcmxBbmRQYXRocywgUmVxdWlyZWRDb21waWxlck9wdGlvbnMsIHBhcnNlQ29uZmlnRmlsZVRvSnNvbn0gZnJvbSAnLi4vdHMtY21kLXV0aWwnO1xuaW1wb3J0IHtsb2c0RmlsZX0gZnJvbSAnLi4vbG9nZ2VyJztcbmltcG9ydCBNb2R1bGUgZnJvbSAnbW9kdWxlJztcblxuY29uc3QgTk9ERV9NT0RVTEVfU0VUID0gbmV3IFNldChNb2R1bGUuYnVpbHRpbk1vZHVsZXMpO1xuXG5sZXQgY29Kc29uOiBSZXF1aXJlZENvbXBpbGVyT3B0aW9ucztcbi8vIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChwbGlua0Vudi53b3JrRGlyLCAnLi8nLCBjb0pzb24sIHt3b3Jrc3BhY2VEaXI6IHBsaW5rRW52LndvcmtEaXJ9KTtcbmxldCBjbzogdHMuQ29tcGlsZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xubGV0IHJlc0NhY2hlOiB0cy5Nb2R1bGVSZXNvbHV0aW9uQ2FjaGU7XG5sZXQgaG9zdDogdHMuQ29tcGlsZXJIb3N0O1xuaW5pdEFzQ2hpbGRQcm9jZXNzKCk7XG5pbml0Q29uZmlnKEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuUExJTktfQ0xJX09QVFMhKSk7XG5pbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoKTtcbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuZXhwb3J0IGNsYXNzIENvbnRleHQge1xuICBjb21tb25EaXI6IHN0cmluZztcbiAgLyoqIHRyYXZlcnNlZCBmaWxlcyAqL1xuICB0b3BTb3J0ZWRGaWxlczogc3RyaW5nW10gPSBbXTtcbiAgaWdub3JlUGtnTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGNvbW1vbkRpcjogc3RyaW5nLFxuICAgIHB1YmxpYyBhbGlhczogW3JlZzogUmVnRXhwLCByZXBsYWNlVG86IHN0cmluZ11bXSxcbiAgICBwdWJsaWMgaWdub3JlUGF0dGVybj86IFJlZ0V4cCxcbiAgICBwdWJsaWMgcmVsYXRpdmVEZXBzT3V0U2lkZURpcjogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCksXG4gICAgcHVibGljIGN5Y2xpYzogc3RyaW5nW10gPSBbXSxcbiAgICBwdWJsaWMgY2FuTm90UmVzb2x2ZToge1xuICAgICAgdGFyZ2V0OiBzdHJpbmc7XG4gICAgICBmaWxlOiBzdHJpbmc7XG4gICAgICBwb3M6IHN0cmluZztcbiAgICAgIHJlYXNvbmU6IHN0cmluZztcbiAgICB9W10gPSBbXSxcbiAgICBwdWJsaWMgZXh0ZXJuYWxEZXBzOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoKSxcbiAgICBwdWJsaWMgbm9kZU1vZHVsZURlcHM6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpLFxuICAgIHB1YmxpYyBtYXRjaEFsaWFzOiBzdHJpbmdbXSA9IFtdXG4gICkge1xuICAgIHRoaXMuY29tbW9uRGlyID0gY29tbW9uRGlyLmVuZHNXaXRoKFBhdGguc2VwKSA/IGNvbW1vbkRpciA6IGNvbW1vbkRpciArIFBhdGguc2VwO1xuICB9XG5cbiAgdG9QbGFpbk9iamVjdCgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgY29tbW9uRGlyOiB0aGlzLmNvbW1vbkRpci5zbGljZSgwLCAtMSksIC8vIHRyaW0gbGFzdCBQYXRoLnNlcFxuICAgICAgcmVsYXRpdmVEZXBzT3V0U2lkZURpcjogQXJyYXkuZnJvbSh0aGlzLnJlbGF0aXZlRGVwc091dFNpZGVEaXIudmFsdWVzKCkpLFxuICAgICAgY3ljbGljOiB0aGlzLmN5Y2xpYyxcbiAgICAgIGNhbk5vdFJlc29sdmU6IHRoaXMuY2FuTm90UmVzb2x2ZSxcbiAgICAgIGV4dGVybmFsRGVwczogQXJyYXkuZnJvbSh0aGlzLmV4dGVybmFsRGVwcy52YWx1ZXMoKSksXG4gICAgICBub2RlTW9kdWxlRGVwczogQXJyYXkuZnJvbSh0aGlzLm5vZGVNb2R1bGVEZXBzLnZhbHVlcygpKSxcbiAgICAgIG1hdGNoQWxpYXM6IHRoaXMubWF0Y2hBbGlhcyxcbiAgICAgIGZpbGVzOiB0aGlzLnRvcFNvcnRlZEZpbGVzXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGZzVHJhdmVyc2VGaWxlcyhmaWxlczogc3RyaW5nW10sIHRzY29uZmlnRmlsZTogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCxcbiAgYWxpYXM6IFtyZWc6IHN0cmluZywgcmVwbGFjZVRvOiBzdHJpbmddW10sIGlnbm9yZT86IHN0cmluZyk6IFJldHVyblR5cGU8Q29udGV4dFsndG9QbGFpbk9iamVjdCddPiB7XG4gIGluaXQodHNjb25maWdGaWxlKTtcbiAgY29uc3QgY29tbW9uUGFyZW50RGlyID0gKGZpbGVzLmxlbmd0aCA9PT0gMSkgPyBQYXRoLmRpcm5hbWUoZmlsZXNbMF0pIDogY2xvc2VzdENvbW1vblBhcmVudERpcihmaWxlcyk7XG4gIGNvbnN0IGNvbnRleHQgPSBuZXcgQ29udGV4dChjb21tb25QYXJlbnREaXIsIGFsaWFzLm1hcChpdGVtID0+IFtuZXcgUmVnRXhwKGl0ZW1bMF0pLCBpdGVtWzFdXSksXG4gICAgaWdub3JlID8gbmV3IFJlZ0V4cChpZ25vcmUpIDogdW5kZWZpbmVkKTtcblxuICAvLyBpbiBjYXNlIHRoZSBmaWxlIGlzIGluIHVuZGVyIGRpcmVjdG9yeSBub2RlX21vZHVsZXMsIGFsbCByZWxhdGl2ZSBwYXRoIHdpbGwgYmUgcmVzb2x2ZWQgdG8gcGFja2FnZUlkLFxuICBsZXQgcmVzb2x2ZWQgPSB0cy5yZXNvbHZlTW9kdWxlTmFtZSgnLi8nICsgUGF0aC5wYXJzZShmaWxlc1swXSkubmFtZSwgZmlsZXNbMF0sIGNvISwgaG9zdCwgcmVzQ2FjaGUpLnJlc29sdmVkTW9kdWxlO1xuICBjb250ZXh0Lmlnbm9yZVBrZ05hbWUgPSByZXNvbHZlZD8ucGFja2FnZUlkPy5uYW1lO1xuXG4gIGNvbnN0IGRmczogREZTPHN0cmluZz4gPSBuZXcgREZTPHN0cmluZz4oZmlsZSA9PiB7XG4gICAgY29uc3QgY29udGVudCA9IHdlYkluamVjdG9yLmluamVjdFRvRmlsZShmaWxlLCBmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSk7XG4gICAgY29uc3QgcSA9IG5ldyBRdWVyeShjb250ZW50LCBmaWxlKTtcbiAgICBsb2cuZGVidWcoJ0xvb2t1cCBmaWxlJywgUGF0aC5yZWxhdGl2ZShwbGlua0Vudi53b3JrRGlyLCBmaWxlKSk7XG4gICAgcmV0dXJuIHBhcnNlRmlsZShxLCBmaWxlLCBjb250ZXh0KTtcbiAgfSwgdmVydGV4ID0+IHtcbiAgICBsb2cuZGVidWcoJ0ZpbmlzaGVkIGZpbGUnLCBQYXRoLnJlbGF0aXZlKHBsaW5rRW52LndvcmtEaXIsIHZlcnRleC5kYXRhKSk7XG4gICAgY29udGV4dC50b3BTb3J0ZWRGaWxlcy5wdXNoKHZlcnRleC5kYXRhKTtcbiAgfSk7XG4gIGxvZy5pbmZvKCdzY2FuIGZpbGVzXFxuJywgZmlsZXMpO1xuICBkZnMudmlzaXQoZmlsZXMpO1xuICBjb25zdCBjd2QgPSBwbGlua0Vudi53b3JrRGlyO1xuICBpZiAoZGZzLmJhY2tFZGdlcy5sZW5ndGggPiAwKSB7XG4gICAgZm9yIChjb25zdCBlZGdlcyBvZiBkZnMuYmFja0VkZ2VzKSB7XG4gICAgICAvLyBsb2cuaW5mbyhgRm91bmQgY3ljbGljIGZpbGUgZGVwZW5kZW5jeSAke2Rmcy5wcmludEN5Y2xpY0JhY2tFZGdlKGVkZ2VzWzBdLCBlZGdlc1sxXSl9YCk7XG4gICAgICBjb250ZXh0LmN5Y2xpYy5wdXNoKGRmcy5wcmludEN5Y2xpY0JhY2tFZGdlKGVkZ2VzWzBdLCBlZGdlc1sxXSlcbiAgICAgICAgLm1hcChwYXRoID0+IFBhdGgucmVsYXRpdmUoY3dkLCBwYXRoKSkuam9pbignXFxuIC0+ICcpXG4gICAgICApO1xuICAgIH1cbiAgfVxuICByZXR1cm4gY29udGV4dC50b1BsYWluT2JqZWN0KCk7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gdHNjb25maWdGaWxlIGFsbCBjb21waWxlck9wdGlvbnMucGF0aHMgc2V0dGluZyB3aWxsIGJlIGFkb3B0ZWQgaW4gcmVzb2x2aW5nIGZpbGVzXG4gKi9cbmZ1bmN0aW9uIGluaXQodHNjb25maWdGaWxlPzogc3RyaW5nIHwgbnVsbCkge1xuICBpZiAoY29Kc29uICE9IG51bGwpXG4gICAgcmV0dXJuO1xuXG4gIGNvbnN0IGJhc2VUc2NvbmZpZ0ZpbGUgPSBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHNjb25maWctdHN4Lmpzb24nKTtcblxuICBjb25zdCBiYXNlVHNjZmcgPSBwYXJzZUNvbmZpZ0ZpbGVUb0pzb24odHMsIGJhc2VUc2NvbmZpZ0ZpbGUpO1xuXG4gIGNvSnNvbiA9IGJhc2VUc2NmZy5jb21waWxlck9wdGlvbnM7XG4gIGlmICh0c2NvbmZpZ0ZpbGUpIHtcbiAgICBtZXJnZUJhc2VVcmxBbmRQYXRocyh0cywgdHNjb25maWdGaWxlLCBwbGlua0Vudi53b3JrRGlyLCBjb0pzb24pO1xuICB9XG4gIGNvSnNvbi5hbGxvd0pzID0gdHJ1ZTtcbiAgY29Kc29uLnJlc29sdmVKc29uTW9kdWxlID0gdHJ1ZTtcbiAgbG9nLmRlYnVnKCd0c2NvbmZpZycsIGJhc2VUc2NmZyk7XG4gIGNvID0ganNvblRvQ29tcGlsZXJPcHRpb25zKGNvSnNvbiwgYmFzZVRzY29uZmlnRmlsZSwgcGxpbmtFbnYud29ya0Rpcik7XG4gIHJlc0NhY2hlID0gdHMuY3JlYXRlTW9kdWxlUmVzb2x1dGlvbkNhY2hlKHBsaW5rRW52LndvcmtEaXIsIGZpbGVOYW1lID0+IGZpbGVOYW1lLCBjbyk7XG4gIGhvc3QgPSB0cy5jcmVhdGVDb21waWxlckhvc3QoY28pO1xufVxuXG5mdW5jdGlvbiBwYXJzZUZpbGUocTogUXVlcnksIGZpbGU6IHN0cmluZywgY3R4OiBDb250ZXh0KSB7XG4gIGNvbnN0IGRlcHM6IHN0cmluZ1tdID0gW107XG5cbiAgcS53YWxrQXN0KHEuc3JjLCBbXG4gICAge1xuICAgICAgcXVlcnk6ICcubW9kdWxlU3BlY2lmaWVyOlN0cmluZ0xpdGVyYWwnLCAvLyBCb3RoIDpFeHBvcnREZWNsYXJhdGlvbiBvciA6SW1wb3J0RGVjbGFyYXRpb25cbiAgICAgIGNhbGxiYWNrKGFzdCkge1xuICAgICAgICBjb25zdCBkZXAgPSByZXNvbHZlKChhc3QgYXMgdHMuU3RyaW5nTGl0ZXJhbCkuZ2V0VGV4dCgpLCBmaWxlLCBjdHgsIGFzdC5nZXRTdGFydCgpLCBxLnNyYyk7XG4gICAgICAgIGlmIChkZXApXG4gICAgICAgICAgZGVwcy5wdXNoKGRlcCk7XG4gICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICBxdWVyeTogJzpQcm9wZXJ0eUFzc2lnbm1lbnQ+Lm5hbWUnLFxuICAgICAgY2FsbGJhY2soYXN0LCBwYXRoLCBwYXJlbnRzKSB7XG4gICAgICAgIGlmIChhc3QuZ2V0VGV4dCgpID09PSAnbG9hZENoaWxkcmVuJykge1xuICAgICAgICAgIGNvbnN0IHZhbHVlID0gKGFzdC5wYXJlbnQgYXMgdHMuUHJvcGVydHlBc3NpZ25tZW50KS5pbml0aWFsaXplcjtcbiAgICAgICAgICBpZiAodmFsdWUua2luZCA9PT0gdHMuU3ludGF4S2luZC5TdHJpbmdMaXRlcmFsKSB7XG4gICAgICAgICAgICBjb25zdCBsYXp5TW9kdWxlID0gKHZhbHVlIGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQ7XG4gICAgICAgICAgICBjb25zdCBoYXNoVGFnID0gbGF6eU1vZHVsZS5pbmRleE9mKCcjJyk7XG4gICAgICAgICAgICBpZiAoaGFzaFRhZyA+IDApIHtcbiAgICAgICAgICAgICAgLy8gV2UgZm91bmQgbGF6eSByb3V0ZSBtb2R1bGVcbiAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgbG9nLmRlYnVnKCdsYXp5IHJvdXRlIG1vZHVsZTonLCBsYXp5TW9kdWxlKTtcbiAgICAgICAgICAgICAgY29uc3QgZGVwID0gcmVzb2x2ZShsYXp5TW9kdWxlLnNsaWNlKDAsIGhhc2hUYWcpLCBmaWxlLCBjdHgsIGFzdC5nZXRTdGFydCgpLCBxLnNyYyk7XG4gICAgICAgICAgICAgIGlmIChkZXApXG4gICAgICAgICAgICAgICAgZGVwcy5wdXNoKGRlcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICBxdWVyeTogJzpDYWxsRXhwcmVzc2lvbj4uZXhwcmVzc2lvbjpJbXBvcnRLZXl3b3JkJyxcbiAgICAgIGNhbGxiYWNrKGFzdCwgcGF0aCkge1xuICAgICAgICBjb25zdCBkZXAgPSByZXNvbHZlKCgoYXN0LnBhcmVudCBhcyB0cy5DYWxsRXhwcmVzc2lvbikuYXJndW1lbnRzWzBdIGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQsIGZpbGUsXG4gICAgICAgICAgY3R4LCBhc3QuZ2V0U3RhcnQoKSwgcS5zcmMpO1xuICAgICAgICBpZiAoZGVwKVxuICAgICAgICAgIGRlcHMucHVzaChkZXApO1xuICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgcXVlcnk6ICc6Q2FsbEV4cHJlc3Npb24nLFxuICAgICAgY2FsbGJhY2soYXN0LCBwYXRoKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSBhc3QgYXMgdHMuQ2FsbEV4cHJlc3Npb24gO1xuICAgICAgICBpZiAobm9kZS5leHByZXNzaW9uLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuSWRlbnRpZmllciAmJlxuICAgICAgICAgIChub2RlLmV4cHJlc3Npb24gYXMgdHMuSWRlbnRpZmllcikudGV4dCA9PT0gJ3JlcXVpcmUnICYmXG4gICAgICAgICAgbm9kZS5hcmd1bWVudHNbMF0ua2luZCA9PT0gdHMuU3ludGF4S2luZC5TdHJpbmdMaXRlcmFsKSB7XG4gICAgICAgICAgY29uc3QgZGVwID0gcmVzb2x2ZSgobm9kZS5hcmd1bWVudHNbMF0gYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dCwgZmlsZSwgY3R4LCBhc3QuZ2V0U3RhcnQoKSwgcS5zcmMpO1xuICAgICAgICAgIGlmIChkZXApXG4gICAgICAgICAgICBkZXBzLnB1c2goZGVwKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgXSk7XG4gIHJldHVybiBkZXBzO1xufVxuXG5jb25zdCBQS0dfTkFNRV9QQVQgPSAvXig/OkBbXi9dK1xcLyk/W14vXSsvO1xuXG5mdW5jdGlvbiByZXNvbHZlKHBhdGg6IHN0cmluZywgZmlsZTogc3RyaW5nLCBjdHg6IENvbnRleHQsIHBvczogbnVtYmVyLCBzcmM6IHRzLlNvdXJjZUZpbGUpOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHBhdGguc3RhcnRzV2l0aCgnYCcpKSB7XG4gICAgY29uc3QgbGluZUluZm8gPSB0cy5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihzcmMsIHBvcyk7XG4gICAgY3R4LmNhbk5vdFJlc29sdmUucHVzaCh7XG4gICAgICB0YXJnZXQ6IHBhdGgsXG4gICAgICBmaWxlLFxuICAgICAgcG9zOiBgbGluZToke2xpbmVJbmZvLmxpbmUgKyAxfSwgY29sOiR7bGluZUluZm8uY2hhcmFjdGVyICsgMX1gLFxuICAgICAgcmVhc29uZTogJ2R5bmFtaWMgdmFsdWUnXG4gICAgfSk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1sZW5cbiAgICAvLyBsb2cuaW5mbyhgW2NsaS1hbmFseXNpZS13b3JrZXJdIGNhbiBub3QgcmVzb2x2ZSBkeW5hbWljIHZhbHVlICR7cGF0aH0gaW4gJHtmaWxlfSBAJHtsaW5lSW5mby5saW5lICsgMX06JHtsaW5lSW5mby5jaGFyYWN0ZXIgKyAxfWApO1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGlmIChwYXRoLnN0YXJ0c1dpdGgoJ1wiJykgfHwgcGF0aC5zdGFydHNXaXRoKCdcXCcnKSlcbiAgICBwYXRoID0gcGF0aC5zbGljZSgxLCAtMSk7XG5cbiAgaWYgKGN0eC5pZ25vcmVQYXR0ZXJuICYmIGN0eC5pZ25vcmVQYXR0ZXJuLnRlc3QocGF0aCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGZvciAoY29uc3QgW3JlZywgcmVwbGFjZVRvXSBvZiBjdHguYWxpYXMpIHtcbiAgICBjb25zdCByZXBsYWNlZCA9IHBhdGgucmVwbGFjZShyZWcsIHJlcGxhY2VUbyk7XG4gICAgaWYgKHBhdGggIT09IHJlcGxhY2VkKSB7XG4gICAgICBjdHgubWF0Y2hBbGlhcy5wdXNoKHBhdGgpO1xuICAgICAgcGF0aCA9IHJlcGxhY2VkO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKE5PREVfTU9EVUxFX1NFVC5oYXMocGF0aCkpIHtcbiAgICBjdHgubm9kZU1vZHVsZURlcHMuYWRkKHBhdGgpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgbGV0IHJlc29sdmVkID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUocGF0aCwgZmlsZSwgY28hLCBob3N0LCByZXNDYWNoZSkucmVzb2x2ZWRNb2R1bGU7XG4gIGlmIChyZXNvbHZlZCA9PSBudWxsKSB7XG4gICAgW3BhdGggKyAnL2luZGV4JywgcGF0aCArICcuanMnLCBwYXRoICsgJy5qc3gnLCBwYXRoICsgJy9pbmRleC5qcycsIHBhdGggKyAnL2luZGV4LmpzeCddXG4gICAgLnNvbWUodHJ5UGF0aCA9PiB7XG4gICAgICBsb2cuZGVidWcoYEZvciBwYXRoIFwiJHtwYXRofVwiLCB0cnkgcGF0aDpgLCB0cnlQYXRoKTtcbiAgICAgIHJlc29sdmVkID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUodHJ5UGF0aCwgZmlsZSwgY28hLCBob3N0LCByZXNDYWNoZSkucmVzb2x2ZWRNb2R1bGU7XG4gICAgICByZXR1cm4gcmVzb2x2ZWQgIT0gbnVsbDtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIGlmIChwYXRoLnN0YXJ0c1dpdGgoJy4nKSB8fCBQYXRoLmlzQWJzb2x1dGUocGF0aCkpIHtcbiAgaWYgKHJlc29sdmVkID09IG51bGwpIHtcbiAgICBpZiAoIXBhdGguc3RhcnRzV2l0aCgnLicpICYmICFQYXRoLmlzQWJzb2x1dGUocGF0aCkpIHtcbiAgICAgIGNvbnN0IG0gPSBQS0dfTkFNRV9QQVQuZXhlYyhwYXRoKTtcbiAgICAgIGNvbnN0IHBrZ05hbWUgPSBtID8gbVswXSA6IHBhdGg7XG4gICAgICBpZiAoTk9ERV9NT0RVTEVfU0VULmhhcyhwa2dOYW1lKSlcbiAgICAgICAgY3R4Lm5vZGVNb2R1bGVEZXBzLmFkZChwa2dOYW1lKTtcbiAgICAgIGVsc2VcbiAgICAgICAgY3R4LmV4dGVybmFsRGVwcy5hZGQocGtnTmFtZSk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgbGluZUluZm8gPSB0cy5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihzcmMsIHBvcyk7XG4gICAgY3R4LmNhbk5vdFJlc29sdmUucHVzaCh7XG4gICAgICB0YXJnZXQ6IHBhdGgsXG4gICAgICBmaWxlLFxuICAgICAgcG9zOiBgbGluZToke2xpbmVJbmZvLmxpbmUgKyAxfSwgY29sOiR7bGluZUluZm8uY2hhcmFjdGVyICsgMX1gLFxuICAgICAgcmVhc29uZTogJ1R5cGVzY3JpcHQgZmFpbGVkIHRvIHJlc29sdmUnXG4gICAgfSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0gZWxzZSB7XG4gICAgaWYgKHJlc29sdmVkLmlzRXh0ZXJuYWxMaWJyYXJ5SW1wb3J0ICYmIHJlc29sdmVkLnBhY2thZ2VJZCAmJiByZXNvbHZlZC5wYWNrYWdlSWQubmFtZSAhPT0gY3R4Lmlnbm9yZVBrZ05hbWUpIHtcbiAgICAgIGNvbnN0IHBrZ05hbWUgPSByZXNvbHZlZC5wYWNrYWdlSWQubmFtZTtcbiAgICAgIGlmIChOT0RFX01PRFVMRV9TRVQuaGFzKHBrZ05hbWUpKVxuICAgICAgICBjdHgubm9kZU1vZHVsZURlcHMuYWRkKHBrZ05hbWUpO1xuICAgICAgZWxzZVxuICAgICAgICBjdHguZXh0ZXJuYWxEZXBzLmFkZChwa2dOYW1lKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBhYnNQYXRoID0gUGF0aC5yZXNvbHZlKHJlc29sdmVkLnJlc29sdmVkRmlsZU5hbWUpO1xuICAgIGlmICghYWJzUGF0aC5zdGFydHNXaXRoKGN0eC5jb21tb25EaXIpKSB7XG4gICAgICBjdHgucmVsYXRpdmVEZXBzT3V0U2lkZURpci5hZGQoUGF0aC5yZWxhdGl2ZShwbGlua0Vudi53b3JrRGlyLCBhYnNQYXRoKSk7XG4gICAgfVxuICAgIGxvZy5kZWJ1ZygncmVzb2x2ZWQgdG8nLCBhYnNQYXRoKTtcbiAgICByZXR1cm4gYWJzUGF0aDtcbiAgfVxufVxuXG5cbiJdfQ==