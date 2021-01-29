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
const config_handler_1 = require("../config-handler");
const bootstrap_process_1 = require("../utils/bootstrap-process");
const misc_1 = require("../utils/misc");
const baseTsconfigFile = path_1.default.resolve(__dirname, '../../tsconfig-tsx.json');
const coJson = typescript_1.default.parseConfigFileTextToJson(baseTsconfigFile, fs_1.default.readFileSync(baseTsconfigFile, 'utf8'))
    .config.compilerOptions;
coJson.allowJs = true;
coJson.resolveJsonModule = true;
bootstrap_process_1.initProcess();
config_handler_1.setTsCompilerOptForNodePath(process.cwd(), './', coJson, { workspaceDir: process.cwd() });
const co = ts_compiler_1.jsonToCompilerOptions(coJson, baseTsconfigFile, process.cwd());
const resCache = typescript_1.default.createModuleResolutionCache(process.cwd(), fileName => fileName, co);
const host = typescript_1.default.createCompilerHost(co);
class Context {
    constructor(commonDir, relativeDepsOutSideDir = new Set(), cyclic = [], canNotResolve = [], externalDeps = new Set()) {
        this.relativeDepsOutSideDir = relativeDepsOutSideDir;
        this.cyclic = cyclic;
        this.canNotResolve = canNotResolve;
        this.externalDeps = externalDeps;
        this.commonDir = commonDir.endsWith(path_1.default.sep) ? commonDir : commonDir + path_1.default.sep;
    }
    toPlainObject() {
        return {
            commonDir: this.commonDir.slice(0, -1),
            relativeDepsOutSideDir: Array.from(this.relativeDepsOutSideDir.values()),
            cyclic: this.cyclic,
            canNotResolve: this.canNotResolve,
            externalDeps: Array.from(this.externalDeps.values())
        };
    }
}
exports.Context = Context;
function dfsTraverseFiles(files) {
    const commonParentDir = misc_1.closestCommonParentDir(files);
    const context = new Context(commonParentDir);
    const dfs = new graph_1.DFS(vertex => {
        const q = new ts_ast_query_1.default(fs_1.default.readFileSync(vertex.data, 'utf8'), vertex.data);
        return parseFile(q, vertex.data, context).map(file => {
            return dfs.vertexOf(file);
        });
    });
    dfs.visit(files.map(file => dfs.vertexOf(file)));
    const cwd = process.cwd();
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
function parseFile(q, file, ctx) {
    const deps = [];
    // tslint:disable-next-line: no-console
    console.log('[cli-analysie-worker] Lookup file', path_1.default.relative(process.cwd(), file));
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
                const dep = resolve(ast.parent.arguments[0].getText(), file, ctx, ast.getStart(), q.src);
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
                    const dep = resolve(node.arguments[0].getText(), file, ctx, ast.getStart(), q.src);
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
    path = path.slice(1, -1);
    if (path.startsWith('.')) {
        const ext = path_1.default.extname(path);
        if (ext === '' || /^\.[jt]sx?$/.test(ext)) {
            let resolved = typescript_1.default.resolveModuleName(path, file, co, host, resCache).resolvedModule;
            if (resolved == null) {
                // tslint:disable-next-line: max-line-length
                for (const tryPath of [path + '/index', path + '.js', path + '.jsx', path + '/index.js', path + '/index.jsx']) {
                    resolved = typescript_1.default.resolveModuleName(tryPath, file, co, host, resCache).resolvedModule;
                    if (resolved != null)
                        return path_1.default.resolve(resolved.resolvedFileName);
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
                const absPath = path_1.default.resolve(resolved.resolvedFileName);
                if (!absPath.startsWith(ctx.commonDir)) {
                    ctx.relativeDepsOutSideDir.add(path_1.default.relative(process.cwd(), absPath));
                }
                return absPath;
            }
        }
        else {
            // skip unknown extension path
        }
    }
    else {
        ctx.externalDeps.add(/^((?:@[^/]+\/)?[^/]+)/.exec(path)[1]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFuYWx5c2Utd29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1hbmFseXNlLXdvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSx1Q0FBcUM7QUFFckMseUVBQTBDO0FBQzFDLDRDQUFvQjtBQUNwQiw0REFBNEI7QUFDNUIsZ0RBQXdCO0FBQ3hCLGlDQUFpQztBQUNqQywwQ0FBbUM7QUFDbkMsZ0RBQXFEO0FBQ3JELHNEQUE4RDtBQUM5RCxrRUFBdUQ7QUFDdkQsd0NBQXFEO0FBR3JELE1BQU0sZ0JBQWdCLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUseUJBQXlCLENBQUMsQ0FBQztBQUM1RSxNQUFNLE1BQU0sR0FBRyxvQkFBRSxDQUFDLHlCQUF5QixDQUFDLGdCQUFnQixFQUFFLFlBQUUsQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUM7S0FDckcsTUFBTSxDQUFDLGVBQWUsQ0FBQztBQUMxQixNQUFNLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztBQUN0QixNQUFNLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO0FBQ2hDLCtCQUFXLEVBQUUsQ0FBQztBQUNkLDRDQUEyQixDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEVBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBQyxDQUFDLENBQUM7QUFDeEYsTUFBTSxFQUFFLEdBQUcsbUNBQXFCLENBQUMsTUFBTSxFQUFFLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0FBSTFFLE1BQU0sUUFBUSxHQUFHLG9CQUFFLENBQUMsMkJBQTJCLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUN2RCxRQUFRLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFDcEIsRUFBRSxDQUFDLENBQUM7QUFDVixNQUFNLElB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QUFDLEVBQUU7b0JBQ3RDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsY0FBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztpQkFDdkU7Z0JBQ0QsT0FBTyxPQUFPLENBQUM7YUFDaEI7U0FDRjthQUFNO1lBQ0wsOEJBQThCO1NBQy9CO0tBQ0Y7U0FBTTtRQUNMLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzlEO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJztcblxuaW1wb3J0IFF1ZXJ5IGZyb20gJy4uL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG4vLyBpbXBvcnQge0VPTCBhcyBlb2x9IGZyb20gJ29zJztcbmltcG9ydCB7REZTfSBmcm9tICcuLi91dGlscy9ncmFwaCc7XG5pbXBvcnQge2pzb25Ub0NvbXBpbGVyT3B0aW9uc30gZnJvbSAnLi4vdHMtY29tcGlsZXInO1xuaW1wb3J0IHtzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGh9IGZyb20gJy4uL2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCB7aW5pdFByb2Nlc3N9IGZyb20gJy4uL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJztcbmltcG9ydCB7Y2xvc2VzdENvbW1vblBhcmVudERpcn0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5cblxuY29uc3QgYmFzZVRzY29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90c2NvbmZpZy10c3guanNvbicpO1xuY29uc3QgY29Kc29uID0gdHMucGFyc2VDb25maWdGaWxlVGV4dFRvSnNvbihiYXNlVHNjb25maWdGaWxlLCBmcy5yZWFkRmlsZVN5bmMoYmFzZVRzY29uZmlnRmlsZSwgJ3V0ZjgnKSlcbiAgLmNvbmZpZy5jb21waWxlck9wdGlvbnM7XG5jb0pzb24uYWxsb3dKcyA9IHRydWU7XG5jb0pzb24ucmVzb2x2ZUpzb25Nb2R1bGUgPSB0cnVlO1xuaW5pdFByb2Nlc3MoKTtcbnNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChwcm9jZXNzLmN3ZCgpLCAnLi8nLCBjb0pzb24sIHt3b3Jrc3BhY2VEaXI6IHByb2Nlc3MuY3dkKCl9KTtcbmNvbnN0IGNvID0ganNvblRvQ29tcGlsZXJPcHRpb25zKGNvSnNvbiwgYmFzZVRzY29uZmlnRmlsZSwgcHJvY2Vzcy5jd2QoKSk7XG5cblxuXG5jb25zdCByZXNDYWNoZSA9IHRzLmNyZWF0ZU1vZHVsZVJlc29sdXRpb25DYWNoZShwcm9jZXNzLmN3ZCgpLFxuICAgICAgZmlsZU5hbWUgPT4gZmlsZU5hbWUsXG4gICAgICBjbyk7XG5jb25zdCBob3N0ID0gdHMuY3JlYXRlQ29tcGlsZXJIb3N0KGNvKTtcblxuZXhwb3J0IGNsYXNzIENvbnRleHQge1xuICBjb21tb25EaXI6IHN0cmluZztcbiAgY29uc3RydWN0b3IoXG4gICAgY29tbW9uRGlyOiBzdHJpbmcsXG4gICAgcHVibGljIHJlbGF0aXZlRGVwc091dFNpZGVEaXI6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpLFxuICAgIHB1YmxpYyBjeWNsaWM6IHN0cmluZ1tdID0gW10sXG4gICAgcHVibGljIGNhbk5vdFJlc29sdmU6IHtcbiAgICAgIHRhcmdldDogc3RyaW5nO1xuICAgICAgZmlsZTogc3RyaW5nO1xuICAgICAgcG9zOiBzdHJpbmc7XG4gICAgICByZWFzb25lOiBzdHJpbmc7XG4gICAgfVtdID0gW10sXG4gICAgcHVibGljIGV4dGVybmFsRGVwczogU2V0PHN0cmluZz4gPSBuZXcgU2V0KClcbiAgKSB7XG4gICAgdGhpcy5jb21tb25EaXIgPSBjb21tb25EaXIuZW5kc1dpdGgoUGF0aC5zZXApID8gY29tbW9uRGlyIDogY29tbW9uRGlyICsgUGF0aC5zZXA7XG4gIH1cblxuICB0b1BsYWluT2JqZWN0KCkge1xuICAgIHJldHVybiB7XG4gICAgICBjb21tb25EaXI6IHRoaXMuY29tbW9uRGlyLnNsaWNlKDAsIC0xKSwgLy8gdHJpbSBsYXN0IFBhdGguc2VwXG4gICAgICByZWxhdGl2ZURlcHNPdXRTaWRlRGlyOiBBcnJheS5mcm9tKHRoaXMucmVsYXRpdmVEZXBzT3V0U2lkZURpci52YWx1ZXMoKSksXG4gICAgICBjeWNsaWM6IHRoaXMuY3ljbGljLFxuICAgICAgY2FuTm90UmVzb2x2ZTogdGhpcy5jYW5Ob3RSZXNvbHZlLFxuICAgICAgZXh0ZXJuYWxEZXBzOiBBcnJheS5mcm9tKHRoaXMuZXh0ZXJuYWxEZXBzLnZhbHVlcygpKVxuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRmc1RyYXZlcnNlRmlsZXMoZmlsZXM6IHN0cmluZ1tdKTogUmV0dXJuVHlwZTxDb250ZXh0Wyd0b1BsYWluT2JqZWN0J10+IHtcbiAgY29uc3QgY29tbW9uUGFyZW50RGlyID0gY2xvc2VzdENvbW1vblBhcmVudERpcihmaWxlcyk7XG4gIGNvbnN0IGNvbnRleHQgPSBuZXcgQ29udGV4dChjb21tb25QYXJlbnREaXIpO1xuXG4gIGNvbnN0IGRmczogREZTPHN0cmluZz4gPSBuZXcgREZTPHN0cmluZz4odmVydGV4ID0+IHtcbiAgICBjb25zdCBxID0gbmV3IFF1ZXJ5KGZzLnJlYWRGaWxlU3luYyh2ZXJ0ZXguZGF0YSwgJ3V0ZjgnKSwgdmVydGV4LmRhdGEpO1xuICAgIHJldHVybiBwYXJzZUZpbGUocSwgdmVydGV4LmRhdGEsIGNvbnRleHQpLm1hcChmaWxlID0+IHtcbiAgICAgIHJldHVybiBkZnMudmVydGV4T2YoZmlsZSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRmcy52aXNpdChmaWxlcy5tYXAoZmlsZSA9PiBkZnMudmVydGV4T2YoZmlsZSkpKTtcbiAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgaWYgKGRmcy5iYWNrRWRnZXMubGVuZ3RoID4gMCkge1xuICAgIGZvciAoY29uc3QgZWRnZXMgb2YgZGZzLmJhY2tFZGdlcykge1xuICAgICAgLy8gLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAvLyBjb25zb2xlLmxvZyhgRm91bmQgY3ljbGljIGZpbGUgZGVwZW5kZW5jeSAke2Rmcy5wcmludEN5Y2xpY0JhY2tFZGdlKGVkZ2VzWzBdLCBlZGdlc1sxXSl9YCk7XG4gICAgICBjb250ZXh0LmN5Y2xpYy5wdXNoKGRmcy5wcmludEN5Y2xpY0JhY2tFZGdlKGVkZ2VzWzBdLCBlZGdlc1sxXSlcbiAgICAgICAgLm1hcChwYXRoID0+IFBhdGgucmVsYXRpdmUoY3dkLCBwYXRoKSkuam9pbignXFxuIC0+ICcpXG4gICAgICApO1xuICAgIH1cbiAgfVxuICByZXR1cm4gY29udGV4dC50b1BsYWluT2JqZWN0KCk7XG59XG5cbmZ1bmN0aW9uIHBhcnNlRmlsZShxOiBRdWVyeSwgZmlsZTogc3RyaW5nLCBjdHg6IENvbnRleHQpIHtcbiAgY29uc3QgZGVwczogc3RyaW5nW10gPSBbXTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCdbY2xpLWFuYWx5c2llLXdvcmtlcl0gTG9va3VwIGZpbGUnLCBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGZpbGUpKTtcbiAgcS53YWxrQXN0KHEuc3JjLCBbXG4gICAge1xuICAgICAgcXVlcnk6ICcubW9kdWxlU3BlY2lmaWVyOlN0cmluZ0xpdGVyYWwnLCAvLyBCb3RoIDpFeHBvcnREZWNsYXJhdGlvbiBvciA6SW1wb3J0RGVjbGFyYXRpb25cbiAgICAgIGNhbGxiYWNrKGFzdCkge1xuICAgICAgICBjb25zdCBkZXAgPSByZXNvbHZlKChhc3QgYXMgdHMuU3RyaW5nTGl0ZXJhbCkuZ2V0VGV4dCgpLCBmaWxlLCBjdHgsIGFzdC5nZXRTdGFydCgpLCBxLnNyYyk7XG4gICAgICAgIGlmIChkZXApXG4gICAgICAgICAgZGVwcy5wdXNoKGRlcCk7XG4gICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICBxdWVyeTogJzpQcm9wZXJ0eUFzc2lnbm1lbnQ+Lm5hbWUnLFxuICAgICAgY2FsbGJhY2soYXN0LCBwYXRoLCBwYXJlbnRzKSB7XG4gICAgICAgIGlmIChhc3QuZ2V0VGV4dCgpID09PSAnbG9hZENoaWxkcmVuJykge1xuICAgICAgICAgIGNvbnN0IHZhbHVlID0gKGFzdC5wYXJlbnQgYXMgdHMuUHJvcGVydHlBc3NpZ25tZW50KS5pbml0aWFsaXplcjtcbiAgICAgICAgICBpZiAodmFsdWUua2luZCA9PT0gdHMuU3ludGF4S2luZC5TdHJpbmdMaXRlcmFsKSB7XG4gICAgICAgICAgICBjb25zdCBsYXp5TW9kdWxlID0gKHZhbHVlIGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQ7XG4gICAgICAgICAgICBjb25zdCBoYXNoVGFnID0gbGF6eU1vZHVsZS5pbmRleE9mKCcjJyk7XG4gICAgICAgICAgICBpZiAoaGFzaFRhZyA+IDApIHtcbiAgICAgICAgICAgICAgLy8gV2UgZm91bmQgbGF6eSByb3V0ZSBtb2R1bGVcbiAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2xhenkgcm91dGUgbW9kdWxlOicsIGxhenlNb2R1bGUpO1xuICAgICAgICAgICAgICBjb25zdCBkZXAgPSByZXNvbHZlKGxhenlNb2R1bGUuc2xpY2UoMCwgaGFzaFRhZyksIGZpbGUsIGN0eCwgYXN0LmdldFN0YXJ0KCksIHEuc3JjKTtcbiAgICAgICAgICAgICAgaWYgKGRlcClcbiAgICAgICAgICAgICAgICBkZXBzLnB1c2goZGVwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgIHF1ZXJ5OiAnOkNhbGxFeHByZXNzaW9uPi5leHByZXNzaW9uOkltcG9ydEtleXdvcmQnLFxuICAgICAgY2FsbGJhY2soYXN0LCBwYXRoKSB7XG4gICAgICAgIGNvbnN0IGRlcCA9IHJlc29sdmUoKChhc3QucGFyZW50IGFzIHRzLkNhbGxFeHByZXNzaW9uKS5hcmd1bWVudHNbMF0gYXMgdHMuU3RyaW5nTGl0ZXJhbCkuZ2V0VGV4dCgpLCBmaWxlLFxuICAgICAgICAgIGN0eCwgYXN0LmdldFN0YXJ0KCksIHEuc3JjKTtcbiAgICAgICAgaWYgKGRlcClcbiAgICAgICAgICBkZXBzLnB1c2goZGVwKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgIHF1ZXJ5OiAnOkNhbGxFeHByZXNzaW9uJyxcbiAgICAgIGNhbGxiYWNrKGFzdCwgcGF0aCkge1xuICAgICAgICBjb25zdCBub2RlID0gYXN0IGFzIHRzLkNhbGxFeHByZXNzaW9uIDtcbiAgICAgICAgaWYgKG5vZGUuZXhwcmVzc2lvbi5raW5kID09PSB0cy5TeW50YXhLaW5kLklkZW50aWZpZXIgJiZcbiAgICAgICAgICAobm9kZS5leHByZXNzaW9uIGFzIHRzLklkZW50aWZpZXIpLnRleHQgPT09ICdyZXF1aXJlJyAmJlxuICAgICAgICAgIG5vZGUuYXJndW1lbnRzWzBdLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU3RyaW5nTGl0ZXJhbCkge1xuICAgICAgICAgIGNvbnN0IGRlcCA9IHJlc29sdmUoKG5vZGUuYXJndW1lbnRzWzBdIGFzIHRzLlN0cmluZ0xpdGVyYWwpLmdldFRleHQoKSwgZmlsZSwgY3R4LCBhc3QuZ2V0U3RhcnQoKSwgcS5zcmMpO1xuICAgICAgICAgIGlmIChkZXApXG4gICAgICAgICAgICBkZXBzLnB1c2goZGVwKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgXSk7XG4gIHJldHVybiBkZXBzO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlKHBhdGg6IHN0cmluZywgZmlsZTogc3RyaW5nLCBjdHg6IENvbnRleHQsIHBvczogbnVtYmVyLCBzcmM6IHRzLlNvdXJjZUZpbGUpIHtcbiAgaWYgKHBhdGguc3RhcnRzV2l0aCgnYCcpKSB7XG4gICAgY29uc3QgbGluZUluZm8gPSB0cy5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihzcmMsIHBvcyk7XG4gICAgY3R4LmNhbk5vdFJlc29sdmUucHVzaCh7XG4gICAgICB0YXJnZXQ6IHBhdGgsXG4gICAgICBmaWxlLFxuICAgICAgcG9zOiBgbGluZToke2xpbmVJbmZvLmxpbmUgKyAxfSwgY29sOiR7bGluZUluZm8uY2hhcmFjdGVyICsgMX1gLFxuICAgICAgcmVhc29uZTogJ2R5bmFtaWMgdmFsdWUnXG4gICAgfSk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBtYXgtbGluZS1sZW5ndGhcbiAgICAvLyBjb25zb2xlLmxvZyhgW2NsaS1hbmFseXNpZS13b3JrZXJdIGNhbiBub3QgcmVzb2x2ZSBkeW5hbWljIHZhbHVlICR7cGF0aH0gaW4gJHtmaWxlfSBAJHtsaW5lSW5mby5saW5lICsgMX06JHtsaW5lSW5mby5jaGFyYWN0ZXIgKyAxfWApO1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHBhdGggPSBwYXRoLnNsaWNlKDEsIC0xKTtcblxuICBpZiAocGF0aC5zdGFydHNXaXRoKCcuJykpIHtcbiAgICBjb25zdCBleHQgPSBQYXRoLmV4dG5hbWUocGF0aCk7XG4gICAgaWYgKGV4dCA9PT0gJycgfHwgL15cXC5banRdc3g/JC8udGVzdChleHQpKSB7XG4gICAgICBsZXQgcmVzb2x2ZWQgPSB0cy5yZXNvbHZlTW9kdWxlTmFtZShwYXRoLCBmaWxlLCBjbywgaG9zdCwgcmVzQ2FjaGUpLnJlc29sdmVkTW9kdWxlO1xuICAgICAgaWYgKHJlc29sdmVkID09IG51bGwpIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBtYXgtbGluZS1sZW5ndGhcbiAgICAgICAgZm9yIChjb25zdCB0cnlQYXRoIG9mIFtwYXRoICsgJy9pbmRleCcsIHBhdGggKyAnLmpzJywgcGF0aCArICcuanN4JywgcGF0aCArICcvaW5kZXguanMnLCBwYXRoICsgJy9pbmRleC5qc3gnXSkge1xuICAgICAgICAgIHJlc29sdmVkID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUodHJ5UGF0aCwgZmlsZSwgY28sIGhvc3QsIHJlc0NhY2hlKS5yZXNvbHZlZE1vZHVsZTtcbiAgICAgICAgICBpZiAocmVzb2x2ZWQgIT0gbnVsbClcbiAgICAgICAgICAgIHJldHVybiBQYXRoLnJlc29sdmUocmVzb2x2ZWQucmVzb2x2ZWRGaWxlTmFtZSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbGluZUluZm8gPSB0cy5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihzcmMsIHBvcyk7XG4gICAgICAgIGN0eC5jYW5Ob3RSZXNvbHZlLnB1c2goe1xuICAgICAgICAgIHRhcmdldDogcGF0aCxcbiAgICAgICAgICBmaWxlLFxuICAgICAgICAgIHBvczogYGxpbmU6JHtsaW5lSW5mby5saW5lICsgMX0sIGNvbDoke2xpbmVJbmZvLmNoYXJhY3RlciArIDF9YCxcbiAgICAgICAgICByZWFzb25lOiAnVHlwZXNjcmlwdCBmYWlsZWQgdG8gcmVzb2x2ZSdcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgYWJzUGF0aCA9IFBhdGgucmVzb2x2ZShyZXNvbHZlZC5yZXNvbHZlZEZpbGVOYW1lKTtcbiAgICAgICAgaWYgKCFhYnNQYXRoLnN0YXJ0c1dpdGgoY3R4LmNvbW1vbkRpcikpIHtcbiAgICAgICAgICBjdHgucmVsYXRpdmVEZXBzT3V0U2lkZURpci5hZGQoUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBhYnNQYXRoKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFic1BhdGg7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHNraXAgdW5rbm93biBleHRlbnNpb24gcGF0aFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBjdHguZXh0ZXJuYWxEZXBzLmFkZCgvXigoPzpAW14vXStcXC8pP1teL10rKS8uZXhlYyhwYXRoKSFbMV0pO1xuICB9XG59XG5cblxuIl19