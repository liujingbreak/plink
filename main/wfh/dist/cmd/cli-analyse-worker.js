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
    constructor(commonDir, alias, ignorePattern, relativeDepsOutSideDir = new Set(), cyclic = [], canNotResolve = [], externalDeps = new Set(), matchAlias = []) {
        this.alias = alias;
        this.ignorePattern = ignorePattern;
        this.relativeDepsOutSideDir = relativeDepsOutSideDir;
        this.cyclic = cyclic;
        this.canNotResolve = canNotResolve;
        this.externalDeps = externalDeps;
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
            matchAlias: this.matchAlias,
            files: this.topSortedFiles
        };
    }
}
exports.Context = Context;
function dfsTraverseFiles(files, tsconfigFile, alias, ignore) {
    init(tsconfigFile);
    const commonParentDir = (files.length === 1) ? path_1.default.dirname(files[0]) : misc_1.closestCommonParentDir(files);
    const context = new Context(commonParentDir, alias.map(item => [new RegExp(item[0]), item[1]]), ignore ? new RegExp(ignore) : undefined);
    const dfs = new graph_1.DFS(file => {
        const content = injector_factory_1.webInjector.injectToFile(file, fs_1.default.readFileSync(file, 'utf8'));
        const q = new ts_ast_query_1.default(content, file);
        return parseFile(q, file, context);
    }, vertex => {
        context.topSortedFiles.push(vertex.data);
    });
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
    const baseTscfg = typescript_1.default.parseConfigFileTextToJson(baseTsconfigFile, fs_1.default.readFileSync(baseTsconfigFile, 'utf8'))
        .config;
    coJson = baseTscfg.compilerOptions;
    if (tsconfigFile) {
        ts_cmd_util_1.mergeBaseUrlAndPaths(typescript_1.default, tsconfigFile, misc_1.plinkEnv.workDir, coJson);
    }
    coJson.allowJs = true;
    coJson.resolveJsonModule = true;
    co = ts_compiler_1.jsonToCompilerOptions(coJson, baseTsconfigFile, misc_1.plinkEnv.workDir);
    resCache = typescript_1.default.createModuleResolutionCache(misc_1.plinkEnv.workDir, fileName => fileName, co);
    host = typescript_1.default.createCompilerHost(co);
}
function parseFile(q, file, ctx) {
    const deps = [];
    log.debug('[cli-analysie-worker] Lookup file', path_1.default.relative(misc_1.plinkEnv.workDir, file));
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
                            // tslint:disable-next-line:no-console
                            log.info('lazy route module:', lazyModule);
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
function resolve(path, file, ctx, pos, src) {
    if (path.startsWith('`')) {
        const lineInfo = typescript_1.default.getLineAndCharacterOfPosition(src, pos);
        ctx.canNotResolve.push({
            target: path,
            file,
            pos: `line:${lineInfo.line + 1}, col:${lineInfo.character + 1}`,
            reasone: 'dynamic value'
        });
        // tslint:disable-next-line: max-line-length
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
    let resolved = typescript_1.default.resolveModuleName(path, file, co, host, resCache).resolvedModule;
    if (resolved == null) {
        [path + '/index', path + '.js', path + '.jsx', path + '/index.js', path + '/index.jsx'].some(tryPath => {
            resolved = typescript_1.default.resolveModuleName(tryPath, file, co, host, resCache).resolvedModule;
            return resolved != null;
        });
    }
    // if (path.startsWith('.') || Path.isAbsolute(path)) {
    if (resolved == null) {
        if (!path.startsWith('.') && !path_1.default.isAbsolute(path)) {
            const m = /^(?:@[^/]+\/)?[^/]+/.exec(path);
            ctx.externalDeps.add(m ? m[0] : path);
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
    if (resolved === null || resolved === void 0 ? void 0 : resolved.packageId) {
        // resolved.packageId.name always return @type/xxxx instead of real package
        // ctx.externalDeps.add(resolved.packageId.name);
        const m = /^(?:@[^/]+\/)?[^/]+/.exec(path);
        if (m) {
            ctx.externalDeps.add(m[0]);
        }
        else {
            ctx.externalDeps.add(resolved.packageId.name);
        }
    }
    else if (resolved) {
        const absPath = path_1.default.resolve(resolved.resolvedFileName);
        if (!absPath.startsWith(ctx.commonDir)) {
            ctx.relativeDepsOutSideDir.add(path_1.default.relative(misc_1.plinkEnv.workDir, absPath));
        }
        return absPath;
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFuYWx5c2Utd29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1hbmFseXNlLXdvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSx1Q0FBcUM7QUFFckMseUVBQTBDO0FBQzFDLDRDQUFvQjtBQUNwQiw0REFBNEI7QUFDNUIsZ0RBQXdCO0FBQ3hCLGlDQUFpQztBQUNqQywwQ0FBbUM7QUFDbkMsZ0RBQXFEO0FBQ3JELGtGQUFrRjtBQUNsRixrRUFBMEU7QUFDMUUsc0RBQThEO0FBQzlELDBEQUFnRDtBQUNoRCx3Q0FBK0Q7QUFDL0QsZ0RBQTZFO0FBQzdFLHNDQUFtQztBQUduQyxJQUFJLE1BQStCLENBQUM7QUFDcEMsaUdBQWlHO0FBQ2pHLElBQUksRUFBa0MsQ0FBQztBQUN2QyxJQUFJLFFBQWtDLENBQUM7QUFDdkMsSUFBSSxJQUFxQixDQUFDO0FBQzFCLHNDQUFrQixFQUFFLENBQUM7QUFDckIsOEJBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBZSxDQUFDLENBQUMsQ0FBQztBQUNwRCw0Q0FBMkIsRUFBRSxDQUFDO0FBQzlCLE1BQU0sR0FBRyxHQUFHLGlCQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDakMsTUFBYSxPQUFPO0lBS2xCLFlBQ0UsU0FBaUIsRUFDVixLQUF5QyxFQUN6QyxhQUFzQixFQUN0Qix5QkFBc0MsSUFBSSxHQUFHLEVBQUUsRUFDL0MsU0FBbUIsRUFBRSxFQUNyQixnQkFLRCxFQUFFLEVBQ0QsZUFBNEIsSUFBSSxHQUFHLEVBQUUsRUFDckMsYUFBdUIsRUFBRTtRQVh6QixVQUFLLEdBQUwsS0FBSyxDQUFvQztRQUN6QyxrQkFBYSxHQUFiLGFBQWEsQ0FBUztRQUN0QiwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXlCO1FBQy9DLFdBQU0sR0FBTixNQUFNLENBQWU7UUFDckIsa0JBQWEsR0FBYixhQUFhLENB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USxDQUFDLGVBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUMxRTtRQUNELE9BQU8sT0FBTyxDQUFDO0tBQ2hCO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInO1xuXG5pbXBvcnQgUXVlcnkgZnJvbSAnLi4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCB7RU9MIGFzIGVvbH0gZnJvbSAnb3MnO1xuaW1wb3J0IHtERlN9IGZyb20gJy4uL3V0aWxzL2dyYXBoJztcbmltcG9ydCB7anNvblRvQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuLi90cy1jb21waWxlcic7XG4vLyBpbXBvcnQge3NldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aH0gZnJvbSAnLi4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQge2luaXRBc0NoaWxkUHJvY2VzcywgaW5pdENvbmZpZ30gZnJvbSAnLi4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnO1xuaW1wb3J0IHtpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXN9IGZyb20gJy4uL3BhY2thZ2UtcnVubmVyJztcbmltcG9ydCB7d2ViSW5qZWN0b3J9IGZyb20gJy4uL2luamVjdG9yLWZhY3RvcnknO1xuaW1wb3J0IHtjbG9zZXN0Q29tbW9uUGFyZW50RGlyLCBwbGlua0Vudn0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge21lcmdlQmFzZVVybEFuZFBhdGhzLCBSZXF1aXJlZENvbXBpbGVyT3B0aW9uc30gZnJvbSAnLi4vdHMtY21kLXV0aWwnO1xuaW1wb3J0IHtsb2c0RmlsZX0gZnJvbSAnLi4vbG9nZ2VyJztcblxuXG5sZXQgY29Kc29uOiBSZXF1aXJlZENvbXBpbGVyT3B0aW9ucztcbi8vIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChwbGlua0Vudi53b3JrRGlyLCAnLi8nLCBjb0pzb24sIHt3b3Jrc3BhY2VEaXI6IHBsaW5rRW52LndvcmtEaXJ9KTtcbmxldCBjbzogdHMuQ29tcGlsZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xubGV0IHJlc0NhY2hlOiB0cy5Nb2R1bGVSZXNvbHV0aW9uQ2FjaGU7XG5sZXQgaG9zdDogdHMuQ29tcGlsZXJIb3N0O1xuaW5pdEFzQ2hpbGRQcm9jZXNzKCk7XG5pbml0Q29uZmlnKEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuUExJTktfQ0xJX09QVFMhKSk7XG5pbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoKTtcbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuZXhwb3J0IGNsYXNzIENvbnRleHQge1xuICBjb21tb25EaXI6IHN0cmluZztcbiAgLyoqIHRyYXZlcnNlZCBmaWxlcyAqL1xuICB0b3BTb3J0ZWRGaWxlczogc3RyaW5nW10gPSBbXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBjb21tb25EaXI6IHN0cmluZyxcbiAgICBwdWJsaWMgYWxpYXM6IFtyZWc6IFJlZ0V4cCwgcmVwbGFjZVRvOiBzdHJpbmddW10sXG4gICAgcHVibGljIGlnbm9yZVBhdHRlcm4/OiBSZWdFeHAsXG4gICAgcHVibGljIHJlbGF0aXZlRGVwc091dFNpZGVEaXI6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpLFxuICAgIHB1YmxpYyBjeWNsaWM6IHN0cmluZ1tdID0gW10sXG4gICAgcHVibGljIGNhbk5vdFJlc29sdmU6IHtcbiAgICAgIHRhcmdldDogc3RyaW5nO1xuICAgICAgZmlsZTogc3RyaW5nO1xuICAgICAgcG9zOiBzdHJpbmc7XG4gICAgICByZWFzb25lOiBzdHJpbmc7XG4gICAgfVtdID0gW10sXG4gICAgcHVibGljIGV4dGVybmFsRGVwczogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCksXG4gICAgcHVibGljIG1hdGNoQWxpYXM6IHN0cmluZ1tdID0gW11cbiAgKSB7XG4gICAgdGhpcy5jb21tb25EaXIgPSBjb21tb25EaXIuZW5kc1dpdGgoUGF0aC5zZXApID8gY29tbW9uRGlyIDogY29tbW9uRGlyICsgUGF0aC5zZXA7XG4gIH1cblxuICB0b1BsYWluT2JqZWN0KCkge1xuICAgIHJldHVybiB7XG4gICAgICBjb21tb25EaXI6IHRoaXMuY29tbW9uRGlyLnNsaWNlKDAsIC0xKSwgLy8gdHJpbSBsYXN0IFBhdGguc2VwXG4gICAgICByZWxhdGl2ZURlcHNPdXRTaWRlRGlyOiBBcnJheS5mcm9tKHRoaXMucmVsYXRpdmVEZXBzT3V0U2lkZURpci52YWx1ZXMoKSksXG4gICAgICBjeWNsaWM6IHRoaXMuY3ljbGljLFxuICAgICAgY2FuTm90UmVzb2x2ZTogdGhpcy5jYW5Ob3RSZXNvbHZlLFxuICAgICAgZXh0ZXJuYWxEZXBzOiBBcnJheS5mcm9tKHRoaXMuZXh0ZXJuYWxEZXBzLnZhbHVlcygpKSxcbiAgICAgIG1hdGNoQWxpYXM6IHRoaXMubWF0Y2hBbGlhcyxcbiAgICAgIGZpbGVzOiB0aGlzLnRvcFNvcnRlZEZpbGVzXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGZzVHJhdmVyc2VGaWxlcyhmaWxlczogc3RyaW5nW10sIHRzY29uZmlnRmlsZTogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCxcbiAgYWxpYXM6IFtyZWc6IHN0cmluZywgcmVwbGFjZVRvOiBzdHJpbmddW10sIGlnbm9yZT86IHN0cmluZyk6IFJldHVyblR5cGU8Q29udGV4dFsndG9QbGFpbk9iamVjdCddPiB7XG4gIGluaXQodHNjb25maWdGaWxlKTtcbiAgY29uc3QgY29tbW9uUGFyZW50RGlyID0gKGZpbGVzLmxlbmd0aCA9PT0gMSkgPyBQYXRoLmRpcm5hbWUoZmlsZXNbMF0pIDogY2xvc2VzdENvbW1vblBhcmVudERpcihmaWxlcyk7XG4gIGNvbnN0IGNvbnRleHQgPSBuZXcgQ29udGV4dChjb21tb25QYXJlbnREaXIsIGFsaWFzLm1hcChpdGVtID0+IFtuZXcgUmVnRXhwKGl0ZW1bMF0pLCBpdGVtWzFdXSksXG4gICAgaWdub3JlID8gbmV3IFJlZ0V4cChpZ25vcmUpIDogdW5kZWZpbmVkKTtcblxuICBjb25zdCBkZnM6IERGUzxzdHJpbmc+ID0gbmV3IERGUzxzdHJpbmc+KGZpbGUgPT4ge1xuICAgIGNvbnN0IGNvbnRlbnQgPSB3ZWJJbmplY3Rvci5pbmplY3RUb0ZpbGUoZmlsZSwgZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JykpO1xuICAgIGNvbnN0IHEgPSBuZXcgUXVlcnkoY29udGVudCwgZmlsZSk7XG4gICAgcmV0dXJuIHBhcnNlRmlsZShxLCBmaWxlLCBjb250ZXh0KTtcbiAgfSwgdmVydGV4ID0+IHtcbiAgICBjb250ZXh0LnRvcFNvcnRlZEZpbGVzLnB1c2godmVydGV4LmRhdGEpO1xuICB9KTtcblxuICBkZnMudmlzaXQoZmlsZXMpO1xuICBjb25zdCBjd2QgPSBwbGlua0Vudi53b3JrRGlyO1xuICBpZiAoZGZzLmJhY2tFZGdlcy5sZW5ndGggPiAwKSB7XG4gICAgZm9yIChjb25zdCBlZGdlcyBvZiBkZnMuYmFja0VkZ2VzKSB7XG4gICAgICAvLyBsb2cuaW5mbyhgRm91bmQgY3ljbGljIGZpbGUgZGVwZW5kZW5jeSAke2Rmcy5wcmludEN5Y2xpY0JhY2tFZGdlKGVkZ2VzWzBdLCBlZGdlc1sxXSl9YCk7XG4gICAgICBjb250ZXh0LmN5Y2xpYy5wdXNoKGRmcy5wcmludEN5Y2xpY0JhY2tFZGdlKGVkZ2VzWzBdLCBlZGdlc1sxXSlcbiAgICAgICAgLm1hcChwYXRoID0+IFBhdGgucmVsYXRpdmUoY3dkLCBwYXRoKSkuam9pbignXFxuIC0+ICcpXG4gICAgICApO1xuICAgIH1cbiAgfVxuICByZXR1cm4gY29udGV4dC50b1BsYWluT2JqZWN0KCk7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gdHNjb25maWdGaWxlIGFsbCBjb21waWxlck9wdGlvbnMucGF0aHMgc2V0dGluZyB3aWxsIGJlIGFkb3B0ZWQgaW4gcmVzb2x2aW5nIGZpbGVzXG4gKi9cbmZ1bmN0aW9uIGluaXQodHNjb25maWdGaWxlPzogc3RyaW5nIHwgbnVsbCkge1xuICBpZiAoY29Kc29uICE9IG51bGwpXG4gICAgcmV0dXJuO1xuICBjb25zdCBiYXNlVHNjb25maWdGaWxlID0gUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzY29uZmlnLXRzeC5qc29uJyk7XG4gIGNvbnN0IGJhc2VUc2NmZyA9IHRzLnBhcnNlQ29uZmlnRmlsZVRleHRUb0pzb24oYmFzZVRzY29uZmlnRmlsZSwgZnMucmVhZEZpbGVTeW5jKGJhc2VUc2NvbmZpZ0ZpbGUsICd1dGY4JykpXG4gICAgLmNvbmZpZztcblxuICBjb0pzb24gPSBiYXNlVHNjZmcuY29tcGlsZXJPcHRpb25zO1xuICBpZiAodHNjb25maWdGaWxlKSB7XG4gICAgbWVyZ2VCYXNlVXJsQW5kUGF0aHModHMsIHRzY29uZmlnRmlsZSwgcGxpbmtFbnYud29ya0RpciwgY29Kc29uKTtcbiAgfVxuICBjb0pzb24uYWxsb3dKcyA9IHRydWU7XG4gIGNvSnNvbi5yZXNvbHZlSnNvbk1vZHVsZSA9IHRydWU7XG4gIGNvID0ganNvblRvQ29tcGlsZXJPcHRpb25zKGNvSnNvbiwgYmFzZVRzY29uZmlnRmlsZSwgcGxpbmtFbnYud29ya0Rpcik7XG4gIHJlc0NhY2hlID0gdHMuY3JlYXRlTW9kdWxlUmVzb2x1dGlvbkNhY2hlKHBsaW5rRW52LndvcmtEaXIsIGZpbGVOYW1lID0+IGZpbGVOYW1lLCBjbyk7XG4gIGhvc3QgPSB0cy5jcmVhdGVDb21waWxlckhvc3QoY28pO1xufVxuXG5mdW5jdGlvbiBwYXJzZUZpbGUocTogUXVlcnksIGZpbGU6IHN0cmluZywgY3R4OiBDb250ZXh0KSB7XG4gIGNvbnN0IGRlcHM6IHN0cmluZ1tdID0gW107XG4gIGxvZy5kZWJ1ZygnW2NsaS1hbmFseXNpZS13b3JrZXJdIExvb2t1cCBmaWxlJywgUGF0aC5yZWxhdGl2ZShwbGlua0Vudi53b3JrRGlyLCBmaWxlKSk7XG4gIHEud2Fsa0FzdChxLnNyYywgW1xuICAgIHtcbiAgICAgIHF1ZXJ5OiAnLm1vZHVsZVNwZWNpZmllcjpTdHJpbmdMaXRlcmFsJywgLy8gQm90aCA6RXhwb3J0RGVjbGFyYXRpb24gb3IgOkltcG9ydERlY2xhcmF0aW9uXG4gICAgICBjYWxsYmFjayhhc3QpIHtcbiAgICAgICAgY29uc3QgZGVwID0gcmVzb2x2ZSgoYXN0IGFzIHRzLlN0cmluZ0xpdGVyYWwpLmdldFRleHQoKSwgZmlsZSwgY3R4LCBhc3QuZ2V0U3RhcnQoKSwgcS5zcmMpO1xuICAgICAgICBpZiAoZGVwKVxuICAgICAgICAgIGRlcHMucHVzaChkZXApO1xuICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgcXVlcnk6ICc6UHJvcGVydHlBc3NpZ25tZW50Pi5uYW1lJyxcbiAgICAgIGNhbGxiYWNrKGFzdCwgcGF0aCwgcGFyZW50cykge1xuICAgICAgICBpZiAoYXN0LmdldFRleHQoKSA9PT0gJ2xvYWRDaGlsZHJlbicpIHtcbiAgICAgICAgICBjb25zdCB2YWx1ZSA9IChhc3QucGFyZW50IGFzIHRzLlByb3BlcnR5QXNzaWdubWVudCkuaW5pdGlhbGl6ZXI7XG4gICAgICAgICAgaWYgKHZhbHVlLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU3RyaW5nTGl0ZXJhbCkge1xuICAgICAgICAgICAgY29uc3QgbGF6eU1vZHVsZSA9ICh2YWx1ZSBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0O1xuICAgICAgICAgICAgY29uc3QgaGFzaFRhZyA9IGxhenlNb2R1bGUuaW5kZXhPZignIycpO1xuICAgICAgICAgICAgaWYgKGhhc2hUYWcgPiAwKSB7XG4gICAgICAgICAgICAgIC8vIFdlIGZvdW5kIGxhenkgcm91dGUgbW9kdWxlXG4gICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1jb25zb2xlXG4gICAgICAgICAgICAgIGxvZy5pbmZvKCdsYXp5IHJvdXRlIG1vZHVsZTonLCBsYXp5TW9kdWxlKTtcbiAgICAgICAgICAgICAgY29uc3QgZGVwID0gcmVzb2x2ZShsYXp5TW9kdWxlLnNsaWNlKDAsIGhhc2hUYWcpLCBmaWxlLCBjdHgsIGFzdC5nZXRTdGFydCgpLCBxLnNyYyk7XG4gICAgICAgICAgICAgIGlmIChkZXApXG4gICAgICAgICAgICAgICAgZGVwcy5wdXNoKGRlcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICBxdWVyeTogJzpDYWxsRXhwcmVzc2lvbj4uZXhwcmVzc2lvbjpJbXBvcnRLZXl3b3JkJyxcbiAgICAgIGNhbGxiYWNrKGFzdCwgcGF0aCkge1xuICAgICAgICBjb25zdCBkZXAgPSByZXNvbHZlKCgoYXN0LnBhcmVudCBhcyB0cy5DYWxsRXhwcmVzc2lvbikuYXJndW1lbnRzWzBdIGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQsIGZpbGUsXG4gICAgICAgICAgY3R4LCBhc3QuZ2V0U3RhcnQoKSwgcS5zcmMpO1xuICAgICAgICBpZiAoZGVwKVxuICAgICAgICAgIGRlcHMucHVzaChkZXApO1xuICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgcXVlcnk6ICc6Q2FsbEV4cHJlc3Npb24nLFxuICAgICAgY2FsbGJhY2soYXN0LCBwYXRoKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSBhc3QgYXMgdHMuQ2FsbEV4cHJlc3Npb24gO1xuICAgICAgICBpZiAobm9kZS5leHByZXNzaW9uLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuSWRlbnRpZmllciAmJlxuICAgICAgICAgIChub2RlLmV4cHJlc3Npb24gYXMgdHMuSWRlbnRpZmllcikudGV4dCA9PT0gJ3JlcXVpcmUnICYmXG4gICAgICAgICAgbm9kZS5hcmd1bWVudHNbMF0ua2luZCA9PT0gdHMuU3ludGF4S2luZC5TdHJpbmdMaXRlcmFsKSB7XG4gICAgICAgICAgY29uc3QgZGVwID0gcmVzb2x2ZSgobm9kZS5hcmd1bWVudHNbMF0gYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dCwgZmlsZSwgY3R4LCBhc3QuZ2V0U3RhcnQoKSwgcS5zcmMpO1xuICAgICAgICAgIGlmIChkZXApXG4gICAgICAgICAgICBkZXBzLnB1c2goZGVwKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgXSk7XG4gIHJldHVybiBkZXBzO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlKHBhdGg6IHN0cmluZywgZmlsZTogc3RyaW5nLCBjdHg6IENvbnRleHQsIHBvczogbnVtYmVyLCBzcmM6IHRzLlNvdXJjZUZpbGUpOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHBhdGguc3RhcnRzV2l0aCgnYCcpKSB7XG4gICAgY29uc3QgbGluZUluZm8gPSB0cy5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihzcmMsIHBvcyk7XG4gICAgY3R4LmNhbk5vdFJlc29sdmUucHVzaCh7XG4gICAgICB0YXJnZXQ6IHBhdGgsXG4gICAgICBmaWxlLFxuICAgICAgcG9zOiBgbGluZToke2xpbmVJbmZvLmxpbmUgKyAxfSwgY29sOiR7bGluZUluZm8uY2hhcmFjdGVyICsgMX1gLFxuICAgICAgcmVhc29uZTogJ2R5bmFtaWMgdmFsdWUnXG4gICAgfSk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBtYXgtbGluZS1sZW5ndGhcbiAgICAvLyBsb2cuaW5mbyhgW2NsaS1hbmFseXNpZS13b3JrZXJdIGNhbiBub3QgcmVzb2x2ZSBkeW5hbWljIHZhbHVlICR7cGF0aH0gaW4gJHtmaWxlfSBAJHtsaW5lSW5mby5saW5lICsgMX06JHtsaW5lSW5mby5jaGFyYWN0ZXIgKyAxfWApO1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGlmIChwYXRoLnN0YXJ0c1dpdGgoJ1wiJykgfHwgcGF0aC5zdGFydHNXaXRoKCdcXCcnKSlcbiAgICBwYXRoID0gcGF0aC5zbGljZSgxLCAtMSk7XG5cbiAgaWYgKGN0eC5pZ25vcmVQYXR0ZXJuICYmIGN0eC5pZ25vcmVQYXR0ZXJuLnRlc3QocGF0aCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGZvciAoY29uc3QgW3JlZywgcmVwbGFjZVRvXSBvZiBjdHguYWxpYXMpIHtcbiAgICBjb25zdCByZXBsYWNlZCA9IHBhdGgucmVwbGFjZShyZWcsIHJlcGxhY2VUbyk7XG4gICAgaWYgKHBhdGggIT09IHJlcGxhY2VkKSB7XG4gICAgICBjdHgubWF0Y2hBbGlhcy5wdXNoKHBhdGgpO1xuICAgICAgcGF0aCA9IHJlcGxhY2VkO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgbGV0IHJlc29sdmVkID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUocGF0aCwgZmlsZSwgY28hLCBob3N0LCByZXNDYWNoZSkucmVzb2x2ZWRNb2R1bGU7XG4gIGlmIChyZXNvbHZlZCA9PSBudWxsKSB7XG4gICAgW3BhdGggKyAnL2luZGV4JywgcGF0aCArICcuanMnLCBwYXRoICsgJy5qc3gnLCBwYXRoICsgJy9pbmRleC5qcycsIHBhdGggKyAnL2luZGV4LmpzeCddLnNvbWUodHJ5UGF0aCA9PiB7XG4gICAgICByZXNvbHZlZCA9IHRzLnJlc29sdmVNb2R1bGVOYW1lKHRyeVBhdGgsIGZpbGUsIGNvISwgaG9zdCwgcmVzQ2FjaGUpLnJlc29sdmVkTW9kdWxlO1xuICAgICAgcmV0dXJuIHJlc29sdmVkICE9IG51bGw7XG4gICAgfSk7XG4gIH1cblxuICAvLyBpZiAocGF0aC5zdGFydHNXaXRoKCcuJykgfHwgUGF0aC5pc0Fic29sdXRlKHBhdGgpKSB7XG4gIGlmIChyZXNvbHZlZCA9PSBudWxsKSB7XG4gICAgaWYgKCFwYXRoLnN0YXJ0c1dpdGgoJy4nKSAmJiAhUGF0aC5pc0Fic29sdXRlKHBhdGgpKSB7XG4gICAgICBjb25zdCBtID0gL14oPzpAW14vXStcXC8pP1teL10rLy5leGVjKHBhdGgpO1xuICAgICAgY3R4LmV4dGVybmFsRGVwcy5hZGQobSA/IG1bMF0gOiBwYXRoKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBsaW5lSW5mbyA9IHRzLmdldExpbmVBbmRDaGFyYWN0ZXJPZlBvc2l0aW9uKHNyYywgcG9zKTtcbiAgICBjdHguY2FuTm90UmVzb2x2ZS5wdXNoKHtcbiAgICAgIHRhcmdldDogcGF0aCxcbiAgICAgIGZpbGUsXG4gICAgICBwb3M6IGBsaW5lOiR7bGluZUluZm8ubGluZSArIDF9LCBjb2w6JHtsaW5lSW5mby5jaGFyYWN0ZXIgKyAxfWAsXG4gICAgICByZWFzb25lOiAnVHlwZXNjcmlwdCBmYWlsZWQgdG8gcmVzb2x2ZSdcbiAgICB9KTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBpZiAocmVzb2x2ZWQ/LnBhY2thZ2VJZCkge1xuICAgIC8vIHJlc29sdmVkLnBhY2thZ2VJZC5uYW1lIGFsd2F5cyByZXR1cm4gQHR5cGUveHh4eCBpbnN0ZWFkIG9mIHJlYWwgcGFja2FnZVxuICAgIC8vIGN0eC5leHRlcm5hbERlcHMuYWRkKHJlc29sdmVkLnBhY2thZ2VJZC5uYW1lKTtcbiAgICBjb25zdCBtID0gL14oPzpAW14vXStcXC8pP1teL10rLy5leGVjKHBhdGgpO1xuICAgIGlmIChtKSB7XG4gICAgICBjdHguZXh0ZXJuYWxEZXBzLmFkZChtWzBdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY3R4LmV4dGVybmFsRGVwcy5hZGQocmVzb2x2ZWQucGFja2FnZUlkLm5hbWUpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChyZXNvbHZlZCkge1xuICAgIGNvbnN0IGFic1BhdGggPSBQYXRoLnJlc29sdmUocmVzb2x2ZWQucmVzb2x2ZWRGaWxlTmFtZSk7XG4gICAgaWYgKCFhYnNQYXRoLnN0YXJ0c1dpdGgoY3R4LmNvbW1vbkRpcikpIHtcbiAgICAgIGN0eC5yZWxhdGl2ZURlcHNPdXRTaWRlRGlyLmFkZChQYXRoLnJlbGF0aXZlKHBsaW5rRW52LndvcmtEaXIsIGFic1BhdGgpKTtcbiAgICB9XG4gICAgcmV0dXJuIGFic1BhdGg7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cblxuIl19