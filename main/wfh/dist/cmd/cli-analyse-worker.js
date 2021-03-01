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
const baseTsconfigFile = path_1.default.resolve(__dirname, '../../tsconfig-tsx.json');
const coJson = typescript_1.default.parseConfigFileTextToJson(baseTsconfigFile, fs_1.default.readFileSync(baseTsconfigFile, 'utf8'))
    .config.compilerOptions;
coJson.allowJs = true;
coJson.resolveJsonModule = true;
bootstrap_process_1.initAsChildProcess();
// setTsCompilerOptForNodePath(process.cwd(), './', coJson, {workspaceDir: process.cwd()});
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
    const dfs = new graph_1.DFS(data => {
        const q = new ts_ast_query_1.default(fs_1.default.readFileSync(data, 'utf8'), data);
        return parseFile(q, data, context);
    });
    dfs.visit(files);
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
        const m = /^((?:@[^/]+\/)?[^/]+)/.exec(path);
        ctx.externalDeps.add(m ? m[1] : path);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFuYWx5c2Utd29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1hbmFseXNlLXdvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSx1Q0FBcUM7QUFFckMseUVBQTBDO0FBQzFDLDRDQUFvQjtBQUNwQiw0REFBNEI7QUFDNUIsZ0RBQXdCO0FBQ3hCLGlDQUFpQztBQUNqQywwQ0FBbUM7QUFDbkMsZ0RBQXFEO0FBQ3JELGtGQUFrRjtBQUNsRixrRUFBOEQ7QUFDOUQsd0NBQXFEO0FBR3JELE1BQU0sZ0JBQWdCLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUseUJBQXlCLENBQUMsQ0FBQztBQUM1RSxNQUFNLE1BQU0sR0FBRyxvQkFBRSxDQUFDLHlCQUF5QixDQUFDLGdCQUFnQixFQUFFLFlBQUUsQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUM7S0FDckcsTUFBTSxDQUFDLGVBQWUsQ0FBQztBQUMxQixNQUFNLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztBQUN0QixNQUFNLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO0FBQ2hDLHNDQUFrQixFQUFFLENBQUM7QUFDckIsMkZBQTJGO0FBQzNGLE1BQU0sRUFBRSxHQUFHLG1DQUFxQixDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztBQUkxRSxNQUFNLFFBQVEsR0FBRyxvQkFBRSxDQUFDLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFDdkQsUUFBUSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQ3BCLEVBQUUsQ0FBQyxDQUFDO0FBQ1YsTUFBTSxJQUFJLEdBQUcsb0JBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUV2QyxNQUFhLE9BQU87SUFFbEIsWUFDRSxTQUFpQixFQUNWLHlCQUFzQyxJQUFJLEdB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QUFDLElBQUksQ0FBQyxDQUFDO1FBQzdDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUN2QztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3Rlcic7XG5cbmltcG9ydCBRdWVyeSBmcm9tICcuLi91dGlscy90cy1hc3QtcXVlcnknO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0IHtFT0wgYXMgZW9sfSBmcm9tICdvcyc7XG5pbXBvcnQge0RGU30gZnJvbSAnLi4vdXRpbHMvZ3JhcGgnO1xuaW1wb3J0IHtqc29uVG9Db21waWxlck9wdGlvbnN9IGZyb20gJy4uL3RzLWNvbXBpbGVyJztcbi8vIGltcG9ydCB7c2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRofSBmcm9tICcuLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCB7aW5pdEFzQ2hpbGRQcm9jZXNzfSBmcm9tICcuLi91dGlscy9ib290c3RyYXAtcHJvY2Vzcyc7XG5pbXBvcnQge2Nsb3Nlc3RDb21tb25QYXJlbnREaXJ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuXG5cbmNvbnN0IGJhc2VUc2NvbmZpZ0ZpbGUgPSBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHNjb25maWctdHN4Lmpzb24nKTtcbmNvbnN0IGNvSnNvbiA9IHRzLnBhcnNlQ29uZmlnRmlsZVRleHRUb0pzb24oYmFzZVRzY29uZmlnRmlsZSwgZnMucmVhZEZpbGVTeW5jKGJhc2VUc2NvbmZpZ0ZpbGUsICd1dGY4JykpXG4gIC5jb25maWcuY29tcGlsZXJPcHRpb25zO1xuY29Kc29uLmFsbG93SnMgPSB0cnVlO1xuY29Kc29uLnJlc29sdmVKc29uTW9kdWxlID0gdHJ1ZTtcbmluaXRBc0NoaWxkUHJvY2VzcygpO1xuLy8gc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKHByb2Nlc3MuY3dkKCksICcuLycsIGNvSnNvbiwge3dvcmtzcGFjZURpcjogcHJvY2Vzcy5jd2QoKX0pO1xuY29uc3QgY28gPSBqc29uVG9Db21waWxlck9wdGlvbnMoY29Kc29uLCBiYXNlVHNjb25maWdGaWxlLCBwcm9jZXNzLmN3ZCgpKTtcblxuXG5cbmNvbnN0IHJlc0NhY2hlID0gdHMuY3JlYXRlTW9kdWxlUmVzb2x1dGlvbkNhY2hlKHByb2Nlc3MuY3dkKCksXG4gICAgICBmaWxlTmFtZSA9PiBmaWxlTmFtZSxcbiAgICAgIGNvKTtcbmNvbnN0IGhvc3QgPSB0cy5jcmVhdGVDb21waWxlckhvc3QoY28pO1xuXG5leHBvcnQgY2xhc3MgQ29udGV4dCB7XG4gIGNvbW1vbkRpcjogc3RyaW5nO1xuICBjb25zdHJ1Y3RvcihcbiAgICBjb21tb25EaXI6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVsYXRpdmVEZXBzT3V0U2lkZURpcjogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCksXG4gICAgcHVibGljIGN5Y2xpYzogc3RyaW5nW10gPSBbXSxcbiAgICBwdWJsaWMgY2FuTm90UmVzb2x2ZToge1xuICAgICAgdGFyZ2V0OiBzdHJpbmc7XG4gICAgICBmaWxlOiBzdHJpbmc7XG4gICAgICBwb3M6IHN0cmluZztcbiAgICAgIHJlYXNvbmU6IHN0cmluZztcbiAgICB9W10gPSBbXSxcbiAgICBwdWJsaWMgZXh0ZXJuYWxEZXBzOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoKVxuICApIHtcbiAgICB0aGlzLmNvbW1vbkRpciA9IGNvbW1vbkRpci5lbmRzV2l0aChQYXRoLnNlcCkgPyBjb21tb25EaXIgOiBjb21tb25EaXIgKyBQYXRoLnNlcDtcbiAgfVxuXG4gIHRvUGxhaW5PYmplY3QoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGNvbW1vbkRpcjogdGhpcy5jb21tb25EaXIuc2xpY2UoMCwgLTEpLCAvLyB0cmltIGxhc3QgUGF0aC5zZXBcbiAgICAgIHJlbGF0aXZlRGVwc091dFNpZGVEaXI6IEFycmF5LmZyb20odGhpcy5yZWxhdGl2ZURlcHNPdXRTaWRlRGlyLnZhbHVlcygpKSxcbiAgICAgIGN5Y2xpYzogdGhpcy5jeWNsaWMsXG4gICAgICBjYW5Ob3RSZXNvbHZlOiB0aGlzLmNhbk5vdFJlc29sdmUsXG4gICAgICBleHRlcm5hbERlcHM6IEFycmF5LmZyb20odGhpcy5leHRlcm5hbERlcHMudmFsdWVzKCkpXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGZzVHJhdmVyc2VGaWxlcyhmaWxlczogc3RyaW5nW10pOiBSZXR1cm5UeXBlPENvbnRleHRbJ3RvUGxhaW5PYmplY3QnXT4ge1xuICBjb25zdCBjb21tb25QYXJlbnREaXIgPSBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKGZpbGVzKTtcbiAgY29uc3QgY29udGV4dCA9IG5ldyBDb250ZXh0KGNvbW1vblBhcmVudERpcik7XG5cbiAgY29uc3QgZGZzOiBERlM8c3RyaW5nPiA9IG5ldyBERlM8c3RyaW5nPihkYXRhID0+IHtcbiAgICBjb25zdCBxID0gbmV3IFF1ZXJ5KGZzLnJlYWRGaWxlU3luYyhkYXRhLCAndXRmOCcpLCBkYXRhKTtcbiAgICByZXR1cm4gcGFyc2VGaWxlKHEsIGRhdGEsIGNvbnRleHQpO1xuICB9KTtcblxuICBkZnMudmlzaXQoZmlsZXMpO1xuICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICBpZiAoZGZzLmJhY2tFZGdlcy5sZW5ndGggPiAwKSB7XG4gICAgZm9yIChjb25zdCBlZGdlcyBvZiBkZnMuYmFja0VkZ2VzKSB7XG4gICAgICAvLyAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIC8vIGNvbnNvbGUubG9nKGBGb3VuZCBjeWNsaWMgZmlsZSBkZXBlbmRlbmN5ICR7ZGZzLnByaW50Q3ljbGljQmFja0VkZ2UoZWRnZXNbMF0sIGVkZ2VzWzFdKX1gKTtcbiAgICAgIGNvbnRleHQuY3ljbGljLnB1c2goZGZzLnByaW50Q3ljbGljQmFja0VkZ2UoZWRnZXNbMF0sIGVkZ2VzWzFdKVxuICAgICAgICAubWFwKHBhdGggPT4gUGF0aC5yZWxhdGl2ZShjd2QsIHBhdGgpKS5qb2luKCdcXG4gLT4gJylcbiAgICAgICk7XG4gICAgfVxuICB9XG4gIHJldHVybiBjb250ZXh0LnRvUGxhaW5PYmplY3QoKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VGaWxlKHE6IFF1ZXJ5LCBmaWxlOiBzdHJpbmcsIGN0eDogQ29udGV4dCkge1xuICBjb25zdCBkZXBzOiBzdHJpbmdbXSA9IFtdO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJ1tjbGktYW5hbHlzaWUtd29ya2VyXSBMb29rdXAgZmlsZScsIFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZmlsZSkpO1xuICBxLndhbGtBc3QocS5zcmMsIFtcbiAgICB7XG4gICAgICBxdWVyeTogJy5tb2R1bGVTcGVjaWZpZXI6U3RyaW5nTGl0ZXJhbCcsIC8vIEJvdGggOkV4cG9ydERlY2xhcmF0aW9uIG9yIDpJbXBvcnREZWNsYXJhdGlvblxuICAgICAgY2FsbGJhY2soYXN0KSB7XG4gICAgICAgIGNvbnN0IGRlcCA9IHJlc29sdmUoKGFzdCBhcyB0cy5TdHJpbmdMaXRlcmFsKS5nZXRUZXh0KCksIGZpbGUsIGN0eCwgYXN0LmdldFN0YXJ0KCksIHEuc3JjKTtcbiAgICAgICAgaWYgKGRlcClcbiAgICAgICAgICBkZXBzLnB1c2goZGVwKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgIHF1ZXJ5OiAnOlByb3BlcnR5QXNzaWdubWVudD4ubmFtZScsXG4gICAgICBjYWxsYmFjayhhc3QsIHBhdGgsIHBhcmVudHMpIHtcbiAgICAgICAgaWYgKGFzdC5nZXRUZXh0KCkgPT09ICdsb2FkQ2hpbGRyZW4nKSB7XG4gICAgICAgICAgY29uc3QgdmFsdWUgPSAoYXN0LnBhcmVudCBhcyB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnQpLmluaXRpYWxpemVyO1xuICAgICAgICAgIGlmICh2YWx1ZS5raW5kID09PSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICAgIGNvbnN0IGxhenlNb2R1bGUgPSAodmFsdWUgYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dDtcbiAgICAgICAgICAgIGNvbnN0IGhhc2hUYWcgPSBsYXp5TW9kdWxlLmluZGV4T2YoJyMnKTtcbiAgICAgICAgICAgIGlmIChoYXNoVGFnID4gMCkge1xuICAgICAgICAgICAgICAvLyBXZSBmb3VuZCBsYXp5IHJvdXRlIG1vZHVsZVxuICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tY29uc29sZVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbGF6eSByb3V0ZSBtb2R1bGU6JywgbGF6eU1vZHVsZSk7XG4gICAgICAgICAgICAgIGNvbnN0IGRlcCA9IHJlc29sdmUobGF6eU1vZHVsZS5zbGljZSgwLCBoYXNoVGFnKSwgZmlsZSwgY3R4LCBhc3QuZ2V0U3RhcnQoKSwgcS5zcmMpO1xuICAgICAgICAgICAgICBpZiAoZGVwKVxuICAgICAgICAgICAgICAgIGRlcHMucHVzaChkZXApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgcXVlcnk6ICc6Q2FsbEV4cHJlc3Npb24+LmV4cHJlc3Npb246SW1wb3J0S2V5d29yZCcsXG4gICAgICBjYWxsYmFjayhhc3QsIHBhdGgpIHtcbiAgICAgICAgY29uc3QgZGVwID0gcmVzb2x2ZSgoKGFzdC5wYXJlbnQgYXMgdHMuQ2FsbEV4cHJlc3Npb24pLmFyZ3VtZW50c1swXSBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0LCBmaWxlLFxuICAgICAgICAgIGN0eCwgYXN0LmdldFN0YXJ0KCksIHEuc3JjKTtcbiAgICAgICAgaWYgKGRlcClcbiAgICAgICAgICBkZXBzLnB1c2goZGVwKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgIHF1ZXJ5OiAnOkNhbGxFeHByZXNzaW9uJyxcbiAgICAgIGNhbGxiYWNrKGFzdCwgcGF0aCkge1xuICAgICAgICBjb25zdCBub2RlID0gYXN0IGFzIHRzLkNhbGxFeHByZXNzaW9uIDtcbiAgICAgICAgaWYgKG5vZGUuZXhwcmVzc2lvbi5raW5kID09PSB0cy5TeW50YXhLaW5kLklkZW50aWZpZXIgJiZcbiAgICAgICAgICAobm9kZS5leHByZXNzaW9uIGFzIHRzLklkZW50aWZpZXIpLnRleHQgPT09ICdyZXF1aXJlJyAmJlxuICAgICAgICAgIG5vZGUuYXJndW1lbnRzWzBdLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU3RyaW5nTGl0ZXJhbCkge1xuICAgICAgICAgIGNvbnN0IGRlcCA9IHJlc29sdmUoKG5vZGUuYXJndW1lbnRzWzBdIGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQsIGZpbGUsIGN0eCwgYXN0LmdldFN0YXJ0KCksIHEuc3JjKTtcbiAgICAgICAgICBpZiAoZGVwKVxuICAgICAgICAgICAgZGVwcy5wdXNoKGRlcCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIF0pO1xuICByZXR1cm4gZGVwcztcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZShwYXRoOiBzdHJpbmcsIGZpbGU6IHN0cmluZywgY3R4OiBDb250ZXh0LCBwb3M6IG51bWJlciwgc3JjOiB0cy5Tb3VyY2VGaWxlKSB7XG4gIGlmIChwYXRoLnN0YXJ0c1dpdGgoJ2AnKSkge1xuICAgIGNvbnN0IGxpbmVJbmZvID0gdHMuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24oc3JjLCBwb3MpO1xuICAgIGN0eC5jYW5Ob3RSZXNvbHZlLnB1c2goe1xuICAgICAgdGFyZ2V0OiBwYXRoLFxuICAgICAgZmlsZSxcbiAgICAgIHBvczogYGxpbmU6JHtsaW5lSW5mby5saW5lICsgMX0sIGNvbDoke2xpbmVJbmZvLmNoYXJhY3RlciArIDF9YCxcbiAgICAgIHJlYXNvbmU6ICdkeW5hbWljIHZhbHVlJ1xuICAgIH0pO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbWF4LWxpbmUtbGVuZ3RoXG4gICAgLy8gY29uc29sZS5sb2coYFtjbGktYW5hbHlzaWUtd29ya2VyXSBjYW4gbm90IHJlc29sdmUgZHluYW1pYyB2YWx1ZSAke3BhdGh9IGluICR7ZmlsZX0gQCR7bGluZUluZm8ubGluZSArIDF9OiR7bGluZUluZm8uY2hhcmFjdGVyICsgMX1gKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBpZiAocGF0aC5zdGFydHNXaXRoKCdcIicpIHx8IHBhdGguc3RhcnRzV2l0aCgnXFwnJykpXG4gICAgcGF0aCA9IHBhdGguc2xpY2UoMSwgLTEpO1xuXG4gIGlmIChwYXRoLnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgIGNvbnN0IGV4dCA9IFBhdGguZXh0bmFtZShwYXRoKTtcbiAgICBpZiAoZXh0ID09PSAnJyB8fCAvXlxcLltqdF1zeD8kLy50ZXN0KGV4dCkpIHtcbiAgICAgIGxldCByZXNvbHZlZCA9IHRzLnJlc29sdmVNb2R1bGVOYW1lKHBhdGgsIGZpbGUsIGNvLCBob3N0LCByZXNDYWNoZSkucmVzb2x2ZWRNb2R1bGU7XG4gICAgICBpZiAocmVzb2x2ZWQgPT0gbnVsbCkge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG1heC1saW5lLWxlbmd0aFxuICAgICAgICBmb3IgKGNvbnN0IHRyeVBhdGggb2YgW3BhdGggKyAnL2luZGV4JywgcGF0aCArICcuanMnLCBwYXRoICsgJy5qc3gnLCBwYXRoICsgJy9pbmRleC5qcycsIHBhdGggKyAnL2luZGV4LmpzeCddKSB7XG4gICAgICAgICAgcmVzb2x2ZWQgPSB0cy5yZXNvbHZlTW9kdWxlTmFtZSh0cnlQYXRoLCBmaWxlLCBjbywgaG9zdCwgcmVzQ2FjaGUpLnJlc29sdmVkTW9kdWxlO1xuICAgICAgICAgIGlmIChyZXNvbHZlZCAhPSBudWxsKVxuICAgICAgICAgICAgcmV0dXJuIFBhdGgucmVzb2x2ZShyZXNvbHZlZC5yZXNvbHZlZEZpbGVOYW1lKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBsaW5lSW5mbyA9IHRzLmdldExpbmVBbmRDaGFyYWN0ZXJPZlBvc2l0aW9uKHNyYywgcG9zKTtcbiAgICAgICAgY3R4LmNhbk5vdFJlc29sdmUucHVzaCh7XG4gICAgICAgICAgdGFyZ2V0OiBwYXRoLFxuICAgICAgICAgIGZpbGUsXG4gICAgICAgICAgcG9zOiBgbGluZToke2xpbmVJbmZvLmxpbmUgKyAxfSwgY29sOiR7bGluZUluZm8uY2hhcmFjdGVyICsgMX1gLFxuICAgICAgICAgIHJlYXNvbmU6ICdUeXBlc2NyaXB0IGZhaWxlZCB0byByZXNvbHZlJ1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBhYnNQYXRoID0gUGF0aC5yZXNvbHZlKHJlc29sdmVkLnJlc29sdmVkRmlsZU5hbWUpO1xuICAgICAgICBpZiAoIWFic1BhdGguc3RhcnRzV2l0aChjdHguY29tbW9uRGlyKSkge1xuICAgICAgICAgIGN0eC5yZWxhdGl2ZURlcHNPdXRTaWRlRGlyLmFkZChQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGFic1BhdGgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYWJzUGF0aDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gc2tpcCB1bmtub3duIGV4dGVuc2lvbiBwYXRoXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGNvbnN0IG0gPSAvXigoPzpAW14vXStcXC8pP1teL10rKS8uZXhlYyhwYXRoKTtcbiAgICBjdHguZXh0ZXJuYWxEZXBzLmFkZChtID8gbVsxXSA6IHBhdGgpO1xuICB9XG59XG5cblxuIl19