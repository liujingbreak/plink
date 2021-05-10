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
const misc_1 = require("../utils/misc");
const ts_cmd_util_1 = require("../ts-cmd-util");
let coJson;
// setTsCompilerOptForNodePath(plinkEnv.workDir, './', coJson, {workspaceDir: plinkEnv.workDir});
let co;
let resCache;
let host;
bootstrap_process_1.initAsChildProcess();
class Context {
    constructor(commonDir, alias, relativeDepsOutSideDir = new Set(), cyclic = [], canNotResolve = [], externalDeps = new Set(), matchAlias = []) {
        this.alias = alias;
        this.relativeDepsOutSideDir = relativeDepsOutSideDir;
        this.cyclic = cyclic;
        this.canNotResolve = canNotResolve;
        this.externalDeps = externalDeps;
        this.matchAlias = matchAlias;
        this.commonDir = commonDir.endsWith(path_1.default.sep) ? commonDir : commonDir + path_1.default.sep;
    }
    toPlainObject() {
        return {
            commonDir: this.commonDir.slice(0, -1),
            relativeDepsOutSideDir: Array.from(this.relativeDepsOutSideDir.values()),
            cyclic: this.cyclic,
            canNotResolve: this.canNotResolve,
            externalDeps: Array.from(this.externalDeps.values()),
            matchAlias: this.matchAlias
        };
    }
}
exports.Context = Context;
function dfsTraverseFiles(files, tsconfigFile, alias) {
    init(tsconfigFile);
    const commonParentDir = misc_1.closestCommonParentDir(files);
    const context = new Context(commonParentDir, alias.map(item => [new RegExp(item[0]), item[1]]));
    const dfs = new graph_1.DFS(data => {
        const q = new ts_ast_query_1.default(fs_1.default.readFileSync(data, 'utf8'), data);
        return parseFile(q, data, context);
    });
    dfs.visit(files);
    const cwd = misc_1.plinkEnv.workDir;
    if (dfs.backEdges.length > 0) {
        for (const edges of dfs.backEdges) {
            // // tslint:disable-next-line: no-console
            // console.log(`Found cyclic file dependency ${dfs.printCyclicBackEdge(edges[0], edges[1])}`);
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
    // console.log(baseTscfg);
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
    // tslint:disable-next-line: no-console
    console.log('[cli-analysie-worker] Lookup file', path_1.default.relative(misc_1.plinkEnv.workDir, file));
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
                            console.log('lazy route module:', lazyModule);
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
        // tslint:disable-next-line: no-console
        // tslint:disable-next-line: max-line-length
        // console.log(`[cli-analysie-worker] can not resolve dynamic value ${path} in ${file} @${lineInfo.line + 1}:${lineInfo.character + 1}`);
        return null;
    }
    if (path.startsWith('"') || path.startsWith('\''))
        path = path.slice(1, -1);
    for (const [reg, replaceTo] of ctx.alias) {
        const replaced = path.replace(reg, replaceTo);
        if (path !== replaced) {
            // console.log(replaced);
            ctx.matchAlias.push(path);
            // console.log(`resolve alias ${path} to `, replaced);
            path = replaced;
            break;
        }
    }
    const suffix = path_1.default.extname(path);
    if (suffix && !/^\.[tj]sx?$/.test(path)) {
        return null;
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
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFuYWx5c2Utd29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1hbmFseXNlLXdvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSx1Q0FBcUM7QUFFckMseUVBQTBDO0FBQzFDLDRDQUFvQjtBQUNwQiw0REFBNEI7QUFDNUIsZ0RBQXdCO0FBQ3hCLGlDQUFpQztBQUNqQywwQ0FBbUM7QUFDbkMsZ0RBQXFEO0FBQ3JELGtGQUFrRjtBQUNsRixrRUFBOEQ7QUFDOUQsd0NBQStEO0FBQy9ELGdEQUE2RTtBQUU3RSxJQUFJLE1BQStCLENBQUM7QUFDcEMsaUdBQWlHO0FBQ2pHLElBQUksRUFBa0MsQ0FBQztBQUN2QyxJQUFJLFFBQWtDLENBQUM7QUFDdkMsSUFBSSxJQUFxQixDQUFDO0FBQzFCLHNDQUFrQixFQUFFLENBQUM7QUFDckIsTUFBYSxPQUFPO0lBRWxCLFlBQ0UsU0FBaUIsRUFDVixLQUF5QyxFQUN6Qyx5QkFBc0MsSUFBSSxHQUFHLEVBQUUsRUFDL0MsU0FBbUIsRUFBRSxFQUNyQixnQkFLRCxFQUFFLEVBQ0QsZUFBNEIsSUFBSSxHQUFHLEVBQUUsRUFDckMsYUFBdUIsRUFBRTtRQVZ6QixVQUFLLEdBQUwsS0FBSyxDQUFvQztRQUN6QywyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXlCO1FBQy9DLFdBQU0sR0FBTixNQUFNLENBQWU7UUFDckIsa0JBQWEsR0FBYixhQUFhLENBS1o7UUFDRCxpQkFBWSxHQUFaLFlBQVksQ0FBeUI7UUFDckMsZUFBVSxHQUFWLFVBQVUsQ0FBZTtRQUVoQyxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsY0FBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBRyxjQUFJLENBQUMsR0FBRyxDQUFDO0lBQ25GLENBQUM7SUFFRCxhQUFhO1FBQ1gsT0FBTztZQUNMLFNB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SUFBSSxDQUFDLEVBQUU7WUFDTCxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUM1QjthQUFNO1lBQ0wsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUMvQztLQUNGO1NBQU0sSUFBSSxRQUFRLEVBQUU7UUFDbkIsTUFBTSxPQUFPLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUN4RCxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDdEMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLGVBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUMxRTtRQUNELE9BQU8sT0FBTyxDQUFDO0tBQ2hCO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJztcblxuaW1wb3J0IFF1ZXJ5IGZyb20gJy4uL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG4vLyBpbXBvcnQge0VPTCBhcyBlb2x9IGZyb20gJ29zJztcbmltcG9ydCB7REZTfSBmcm9tICcuLi91dGlscy9ncmFwaCc7XG5pbXBvcnQge2pzb25Ub0NvbXBpbGVyT3B0aW9uc30gZnJvbSAnLi4vdHMtY29tcGlsZXInO1xuLy8gaW1wb3J0IHtzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGh9IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHtpbml0QXNDaGlsZFByb2Nlc3N9IGZyb20gJy4uL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJztcbmltcG9ydCB7Y2xvc2VzdENvbW1vblBhcmVudERpciwgcGxpbmtFbnZ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IHttZXJnZUJhc2VVcmxBbmRQYXRocywgUmVxdWlyZWRDb21waWxlck9wdGlvbnN9IGZyb20gJy4uL3RzLWNtZC11dGlsJztcblxubGV0IGNvSnNvbjogUmVxdWlyZWRDb21waWxlck9wdGlvbnM7XG4vLyBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgocGxpbmtFbnYud29ya0RpciwgJy4vJywgY29Kc29uLCB7d29ya3NwYWNlRGlyOiBwbGlua0Vudi53b3JrRGlyfSk7XG5sZXQgY286IHRzLkNvbXBpbGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbmxldCByZXNDYWNoZTogdHMuTW9kdWxlUmVzb2x1dGlvbkNhY2hlO1xubGV0IGhvc3Q6IHRzLkNvbXBpbGVySG9zdDtcbmluaXRBc0NoaWxkUHJvY2VzcygpO1xuZXhwb3J0IGNsYXNzIENvbnRleHQge1xuICBjb21tb25EaXI6IHN0cmluZztcbiAgY29uc3RydWN0b3IoXG4gICAgY29tbW9uRGlyOiBzdHJpbmcsXG4gICAgcHVibGljIGFsaWFzOiBbcmVnOiBSZWdFeHAsIHJlcGxhY2VUbzogc3RyaW5nXVtdLFxuICAgIHB1YmxpYyByZWxhdGl2ZURlcHNPdXRTaWRlRGlyOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoKSxcbiAgICBwdWJsaWMgY3ljbGljOiBzdHJpbmdbXSA9IFtdLFxuICAgIHB1YmxpYyBjYW5Ob3RSZXNvbHZlOiB7XG4gICAgICB0YXJnZXQ6IHN0cmluZztcbiAgICAgIGZpbGU6IHN0cmluZztcbiAgICAgIHBvczogc3RyaW5nO1xuICAgICAgcmVhc29uZTogc3RyaW5nO1xuICAgIH1bXSA9IFtdLFxuICAgIHB1YmxpYyBleHRlcm5hbERlcHM6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpLFxuICAgIHB1YmxpYyBtYXRjaEFsaWFzOiBzdHJpbmdbXSA9IFtdXG4gICkge1xuICAgIHRoaXMuY29tbW9uRGlyID0gY29tbW9uRGlyLmVuZHNXaXRoKFBhdGguc2VwKSA/IGNvbW1vbkRpciA6IGNvbW1vbkRpciArIFBhdGguc2VwO1xuICB9XG5cbiAgdG9QbGFpbk9iamVjdCgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgY29tbW9uRGlyOiB0aGlzLmNvbW1vbkRpci5zbGljZSgwLCAtMSksIC8vIHRyaW0gbGFzdCBQYXRoLnNlcFxuICAgICAgcmVsYXRpdmVEZXBzT3V0U2lkZURpcjogQXJyYXkuZnJvbSh0aGlzLnJlbGF0aXZlRGVwc091dFNpZGVEaXIudmFsdWVzKCkpLFxuICAgICAgY3ljbGljOiB0aGlzLmN5Y2xpYyxcbiAgICAgIGNhbk5vdFJlc29sdmU6IHRoaXMuY2FuTm90UmVzb2x2ZSxcbiAgICAgIGV4dGVybmFsRGVwczogQXJyYXkuZnJvbSh0aGlzLmV4dGVybmFsRGVwcy52YWx1ZXMoKSksXG4gICAgICBtYXRjaEFsaWFzOiB0aGlzLm1hdGNoQWxpYXNcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZnNUcmF2ZXJzZUZpbGVzKGZpbGVzOiBzdHJpbmdbXSwgdHNjb25maWdGaWxlOiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkLFxuICBhbGlhczogW3JlZzogc3RyaW5nLCByZXBsYWNlVG86IHN0cmluZ11bXSk6IFJldHVyblR5cGU8Q29udGV4dFsndG9QbGFpbk9iamVjdCddPiB7XG4gIGluaXQodHNjb25maWdGaWxlKTtcbiAgY29uc3QgY29tbW9uUGFyZW50RGlyID0gY2xvc2VzdENvbW1vblBhcmVudERpcihmaWxlcyk7XG4gIGNvbnN0IGNvbnRleHQgPSBuZXcgQ29udGV4dChjb21tb25QYXJlbnREaXIsIGFsaWFzLm1hcChpdGVtID0+IFtuZXcgUmVnRXhwKGl0ZW1bMF0pLCBpdGVtWzFdXSkpO1xuXG4gIGNvbnN0IGRmczogREZTPHN0cmluZz4gPSBuZXcgREZTPHN0cmluZz4oZGF0YSA9PiB7XG4gICAgY29uc3QgcSA9IG5ldyBRdWVyeShmcy5yZWFkRmlsZVN5bmMoZGF0YSwgJ3V0ZjgnKSwgZGF0YSk7XG4gICAgcmV0dXJuIHBhcnNlRmlsZShxLCBkYXRhLCBjb250ZXh0KTtcbiAgfSk7XG5cbiAgZGZzLnZpc2l0KGZpbGVzKTtcbiAgY29uc3QgY3dkID0gcGxpbmtFbnYud29ya0RpcjtcbiAgaWYgKGRmcy5iYWNrRWRnZXMubGVuZ3RoID4gMCkge1xuICAgIGZvciAoY29uc3QgZWRnZXMgb2YgZGZzLmJhY2tFZGdlcykge1xuICAgICAgLy8gLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAvLyBjb25zb2xlLmxvZyhgRm91bmQgY3ljbGljIGZpbGUgZGVwZW5kZW5jeSAke2Rmcy5wcmludEN5Y2xpY0JhY2tFZGdlKGVkZ2VzWzBdLCBlZGdlc1sxXSl9YCk7XG4gICAgICBjb250ZXh0LmN5Y2xpYy5wdXNoKGRmcy5wcmludEN5Y2xpY0JhY2tFZGdlKGVkZ2VzWzBdLCBlZGdlc1sxXSlcbiAgICAgICAgLm1hcChwYXRoID0+IFBhdGgucmVsYXRpdmUoY3dkLCBwYXRoKSkuam9pbignXFxuIC0+ICcpXG4gICAgICApO1xuICAgIH1cbiAgfVxuICByZXR1cm4gY29udGV4dC50b1BsYWluT2JqZWN0KCk7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gdHNjb25maWdGaWxlIGFsbCBjb21waWxlck9wdGlvbnMucGF0aHMgc2V0dGluZyB3aWxsIGJlIGFkb3B0ZWQgaW4gcmVzb2x2aW5nIGZpbGVzXG4gKi9cbmZ1bmN0aW9uIGluaXQodHNjb25maWdGaWxlPzogc3RyaW5nIHwgbnVsbCkge1xuICBpZiAoY29Kc29uICE9IG51bGwpXG4gICAgcmV0dXJuO1xuICBjb25zdCBiYXNlVHNjb25maWdGaWxlID0gUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzY29uZmlnLXRzeC5qc29uJyk7XG4gIGNvbnN0IGJhc2VUc2NmZyA9IHRzLnBhcnNlQ29uZmlnRmlsZVRleHRUb0pzb24oYmFzZVRzY29uZmlnRmlsZSwgZnMucmVhZEZpbGVTeW5jKGJhc2VUc2NvbmZpZ0ZpbGUsICd1dGY4JykpXG4gICAgLmNvbmZpZztcbiAgLy8gY29uc29sZS5sb2coYmFzZVRzY2ZnKTtcblxuICBjb0pzb24gPSBiYXNlVHNjZmcuY29tcGlsZXJPcHRpb25zO1xuICBpZiAodHNjb25maWdGaWxlKSB7XG4gICAgbWVyZ2VCYXNlVXJsQW5kUGF0aHModHMsIHRzY29uZmlnRmlsZSwgcGxpbmtFbnYud29ya0RpciwgY29Kc29uKTtcbiAgfVxuICBjb0pzb24uYWxsb3dKcyA9IHRydWU7XG4gIGNvSnNvbi5yZXNvbHZlSnNvbk1vZHVsZSA9IHRydWU7XG4gIGNvID0ganNvblRvQ29tcGlsZXJPcHRpb25zKGNvSnNvbiwgYmFzZVRzY29uZmlnRmlsZSwgcGxpbmtFbnYud29ya0Rpcik7XG4gIHJlc0NhY2hlID0gdHMuY3JlYXRlTW9kdWxlUmVzb2x1dGlvbkNhY2hlKHBsaW5rRW52LndvcmtEaXIsIGZpbGVOYW1lID0+IGZpbGVOYW1lLCBjbyk7XG4gIGhvc3QgPSB0cy5jcmVhdGVDb21waWxlckhvc3QoY28pO1xufVxuXG5mdW5jdGlvbiBwYXJzZUZpbGUocTogUXVlcnksIGZpbGU6IHN0cmluZywgY3R4OiBDb250ZXh0KSB7XG4gIGNvbnN0IGRlcHM6IHN0cmluZ1tdID0gW107XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZygnW2NsaS1hbmFseXNpZS13b3JrZXJdIExvb2t1cCBmaWxlJywgUGF0aC5yZWxhdGl2ZShwbGlua0Vudi53b3JrRGlyLCBmaWxlKSk7XG4gIHEud2Fsa0FzdChxLnNyYywgW1xuICAgIHtcbiAgICAgIHF1ZXJ5OiAnLm1vZHVsZVNwZWNpZmllcjpTdHJpbmdMaXRlcmFsJywgLy8gQm90aCA6RXhwb3J0RGVjbGFyYXRpb24gb3IgOkltcG9ydERlY2xhcmF0aW9uXG4gICAgICBjYWxsYmFjayhhc3QpIHtcbiAgICAgICAgY29uc3QgZGVwID0gcmVzb2x2ZSgoYXN0IGFzIHRzLlN0cmluZ0xpdGVyYWwpLmdldFRleHQoKSwgZmlsZSwgY3R4LCBhc3QuZ2V0U3RhcnQoKSwgcS5zcmMpO1xuICAgICAgICBpZiAoZGVwKVxuICAgICAgICAgIGRlcHMucHVzaChkZXApO1xuICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgcXVlcnk6ICc6UHJvcGVydHlBc3NpZ25tZW50Pi5uYW1lJyxcbiAgICAgIGNhbGxiYWNrKGFzdCwgcGF0aCwgcGFyZW50cykge1xuICAgICAgICBpZiAoYXN0LmdldFRleHQoKSA9PT0gJ2xvYWRDaGlsZHJlbicpIHtcbiAgICAgICAgICBjb25zdCB2YWx1ZSA9IChhc3QucGFyZW50IGFzIHRzLlByb3BlcnR5QXNzaWdubWVudCkuaW5pdGlhbGl6ZXI7XG4gICAgICAgICAgaWYgKHZhbHVlLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU3RyaW5nTGl0ZXJhbCkge1xuICAgICAgICAgICAgY29uc3QgbGF6eU1vZHVsZSA9ICh2YWx1ZSBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0O1xuICAgICAgICAgICAgY29uc3QgaGFzaFRhZyA9IGxhenlNb2R1bGUuaW5kZXhPZignIycpO1xuICAgICAgICAgICAgaWYgKGhhc2hUYWcgPiAwKSB7XG4gICAgICAgICAgICAgIC8vIFdlIGZvdW5kIGxhenkgcm91dGUgbW9kdWxlXG4gICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1jb25zb2xlXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdsYXp5IHJvdXRlIG1vZHVsZTonLCBsYXp5TW9kdWxlKTtcbiAgICAgICAgICAgICAgY29uc3QgZGVwID0gcmVzb2x2ZShsYXp5TW9kdWxlLnNsaWNlKDAsIGhhc2hUYWcpLCBmaWxlLCBjdHgsIGFzdC5nZXRTdGFydCgpLCBxLnNyYyk7XG4gICAgICAgICAgICAgIGlmIChkZXApXG4gICAgICAgICAgICAgICAgZGVwcy5wdXNoKGRlcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICBxdWVyeTogJzpDYWxsRXhwcmVzc2lvbj4uZXhwcmVzc2lvbjpJbXBvcnRLZXl3b3JkJyxcbiAgICAgIGNhbGxiYWNrKGFzdCwgcGF0aCkge1xuICAgICAgICBjb25zdCBkZXAgPSByZXNvbHZlKCgoYXN0LnBhcmVudCBhcyB0cy5DYWxsRXhwcmVzc2lvbikuYXJndW1lbnRzWzBdIGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQsIGZpbGUsXG4gICAgICAgICAgY3R4LCBhc3QuZ2V0U3RhcnQoKSwgcS5zcmMpO1xuICAgICAgICBpZiAoZGVwKVxuICAgICAgICAgIGRlcHMucHVzaChkZXApO1xuICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgcXVlcnk6ICc6Q2FsbEV4cHJlc3Npb24nLFxuICAgICAgY2FsbGJhY2soYXN0LCBwYXRoKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSBhc3QgYXMgdHMuQ2FsbEV4cHJlc3Npb24gO1xuICAgICAgICBpZiAobm9kZS5leHByZXNzaW9uLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuSWRlbnRpZmllciAmJlxuICAgICAgICAgIChub2RlLmV4cHJlc3Npb24gYXMgdHMuSWRlbnRpZmllcikudGV4dCA9PT0gJ3JlcXVpcmUnICYmXG4gICAgICAgICAgbm9kZS5hcmd1bWVudHNbMF0ua2luZCA9PT0gdHMuU3ludGF4S2luZC5TdHJpbmdMaXRlcmFsKSB7XG4gICAgICAgICAgY29uc3QgZGVwID0gcmVzb2x2ZSgobm9kZS5hcmd1bWVudHNbMF0gYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dCwgZmlsZSwgY3R4LCBhc3QuZ2V0U3RhcnQoKSwgcS5zcmMpO1xuICAgICAgICAgIGlmIChkZXApXG4gICAgICAgICAgICBkZXBzLnB1c2goZGVwKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgXSk7XG4gIHJldHVybiBkZXBzO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlKHBhdGg6IHN0cmluZywgZmlsZTogc3RyaW5nLCBjdHg6IENvbnRleHQsIHBvczogbnVtYmVyLCBzcmM6IHRzLlNvdXJjZUZpbGUpIHtcbiAgaWYgKHBhdGguc3RhcnRzV2l0aCgnYCcpKSB7XG4gICAgY29uc3QgbGluZUluZm8gPSB0cy5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihzcmMsIHBvcyk7XG4gICAgY3R4LmNhbk5vdFJlc29sdmUucHVzaCh7XG4gICAgICB0YXJnZXQ6IHBhdGgsXG4gICAgICBmaWxlLFxuICAgICAgcG9zOiBgbGluZToke2xpbmVJbmZvLmxpbmUgKyAxfSwgY29sOiR7bGluZUluZm8uY2hhcmFjdGVyICsgMX1gLFxuICAgICAgcmVhc29uZTogJ2R5bmFtaWMgdmFsdWUnXG4gICAgfSk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBtYXgtbGluZS1sZW5ndGhcbiAgICAvLyBjb25zb2xlLmxvZyhgW2NsaS1hbmFseXNpZS13b3JrZXJdIGNhbiBub3QgcmVzb2x2ZSBkeW5hbWljIHZhbHVlICR7cGF0aH0gaW4gJHtmaWxlfSBAJHtsaW5lSW5mby5saW5lICsgMX06JHtsaW5lSW5mby5jaGFyYWN0ZXIgKyAxfWApO1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGlmIChwYXRoLnN0YXJ0c1dpdGgoJ1wiJykgfHwgcGF0aC5zdGFydHNXaXRoKCdcXCcnKSlcbiAgICBwYXRoID0gcGF0aC5zbGljZSgxLCAtMSk7XG5cbiAgZm9yIChjb25zdCBbcmVnLCByZXBsYWNlVG9dIG9mIGN0eC5hbGlhcykge1xuICAgIGNvbnN0IHJlcGxhY2VkID0gcGF0aC5yZXBsYWNlKHJlZywgcmVwbGFjZVRvKTtcbiAgICBpZiAocGF0aCAhPT0gcmVwbGFjZWQpIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKHJlcGxhY2VkKTtcbiAgICAgIGN0eC5tYXRjaEFsaWFzLnB1c2gocGF0aCk7XG4gICAgICAvLyBjb25zb2xlLmxvZyhgcmVzb2x2ZSBhbGlhcyAke3BhdGh9IHRvIGAsIHJlcGxhY2VkKTtcbiAgICAgIHBhdGggPSByZXBsYWNlZDtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHN1ZmZpeCA9IFBhdGguZXh0bmFtZShwYXRoKTtcbiAgaWYgKHN1ZmZpeCAmJiAhL15cXC5bdGpdc3g/JC8udGVzdChwYXRoKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgbGV0IHJlc29sdmVkID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUocGF0aCwgZmlsZSwgY28hLCBob3N0LCByZXNDYWNoZSkucmVzb2x2ZWRNb2R1bGU7XG4gIGlmIChyZXNvbHZlZCA9PSBudWxsKSB7XG4gICAgW3BhdGggKyAnL2luZGV4JywgcGF0aCArICcuanMnLCBwYXRoICsgJy5qc3gnLCBwYXRoICsgJy9pbmRleC5qcycsIHBhdGggKyAnL2luZGV4LmpzeCddLnNvbWUodHJ5UGF0aCA9PiB7XG4gICAgICByZXNvbHZlZCA9IHRzLnJlc29sdmVNb2R1bGVOYW1lKHRyeVBhdGgsIGZpbGUsIGNvISwgaG9zdCwgcmVzQ2FjaGUpLnJlc29sdmVkTW9kdWxlO1xuICAgICAgcmV0dXJuIHJlc29sdmVkICE9IG51bGw7XG4gICAgfSk7XG4gIH1cbiAgLy8gaWYgKHBhdGguc3RhcnRzV2l0aCgnLicpIHx8IFBhdGguaXNBYnNvbHV0ZShwYXRoKSkge1xuICBpZiAocmVzb2x2ZWQgPT0gbnVsbCkge1xuICAgIGlmICghcGF0aC5zdGFydHNXaXRoKCcuJykgJiYgIVBhdGguaXNBYnNvbHV0ZShwYXRoKSkge1xuICAgICAgY29uc3QgbSA9IC9eKD86QFteL10rXFwvKT9bXi9dKy8uZXhlYyhwYXRoKTtcbiAgICAgIGN0eC5leHRlcm5hbERlcHMuYWRkKG0gPyBtWzBdIDogcGF0aCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgbGluZUluZm8gPSB0cy5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihzcmMsIHBvcyk7XG4gICAgY3R4LmNhbk5vdFJlc29sdmUucHVzaCh7XG4gICAgICB0YXJnZXQ6IHBhdGgsXG4gICAgICBmaWxlLFxuICAgICAgcG9zOiBgbGluZToke2xpbmVJbmZvLmxpbmUgKyAxfSwgY29sOiR7bGluZUluZm8uY2hhcmFjdGVyICsgMX1gLFxuICAgICAgcmVhc29uZTogJ1R5cGVzY3JpcHQgZmFpbGVkIHRvIHJlc29sdmUnXG4gICAgfSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgaWYgKHJlc29sdmVkPy5wYWNrYWdlSWQpIHtcbiAgICAvLyByZXNvbHZlZC5wYWNrYWdlSWQubmFtZSBhbHdheXMgcmV0dXJuIEB0eXBlL3h4eHggaW5zdGVhZCBvZiByZWFsIHBhY2thZ2VcbiAgICAvLyBjdHguZXh0ZXJuYWxEZXBzLmFkZChyZXNvbHZlZC5wYWNrYWdlSWQubmFtZSk7XG4gICAgY29uc3QgbSA9IC9eKD86QFteL10rXFwvKT9bXi9dKy8uZXhlYyhwYXRoKTtcbiAgICBpZiAobSkge1xuICAgICAgY3R4LmV4dGVybmFsRGVwcy5hZGQobVswXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGN0eC5leHRlcm5hbERlcHMuYWRkKHJlc29sdmVkLnBhY2thZ2VJZC5uYW1lKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAocmVzb2x2ZWQpIHtcbiAgICBjb25zdCBhYnNQYXRoID0gUGF0aC5yZXNvbHZlKHJlc29sdmVkLnJlc29sdmVkRmlsZU5hbWUpO1xuICAgIGlmICghYWJzUGF0aC5zdGFydHNXaXRoKGN0eC5jb21tb25EaXIpKSB7XG4gICAgICBjdHgucmVsYXRpdmVEZXBzT3V0U2lkZURpci5hZGQoUGF0aC5yZWxhdGl2ZShwbGlua0Vudi53b3JrRGlyLCBhYnNQYXRoKSk7XG4gICAgfVxuICAgIHJldHVybiBhYnNQYXRoO1xuICB9XG59XG5cblxuIl19