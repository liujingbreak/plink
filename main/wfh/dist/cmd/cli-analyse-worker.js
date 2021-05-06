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
// setTsCompilerOptForNodePath(plinkEnv.workDir, './', coJson, {workspaceDir: plinkEnv.workDir});
const co = ts_compiler_1.jsonToCompilerOptions(coJson, baseTsconfigFile, misc_1.plinkEnv.workDir);
const resCache = typescript_1.default.createModuleResolutionCache(misc_1.plinkEnv.workDir, fileName => fileName, co);
const host = typescript_1.default.createCompilerHost(co);
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
            externalDeps: Array.from(this.externalDeps.values())
        };
    }
}
exports.Context = Context;
function dfsTraverseFiles(files, alias) {
    const commonParentDir = misc_1.closestCommonParentDir(files);
    const context = new Context(commonParentDir, alias);
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
        path = path.replace(reg, replaceTo);
        if (path !== path) {
            ctx.matchAlias.push(path);
            break;
        }
    }
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
                    ctx.relativeDepsOutSideDir.add(path_1.default.relative(misc_1.plinkEnv.workDir, absPath));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFuYWx5c2Utd29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1hbmFseXNlLXdvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSx1Q0FBcUM7QUFFckMseUVBQTBDO0FBQzFDLDRDQUFvQjtBQUNwQiw0REFBNEI7QUFDNUIsZ0RBQXdCO0FBQ3hCLGlDQUFpQztBQUNqQywwQ0FBbUM7QUFDbkMsZ0RBQXFEO0FBQ3JELGtGQUFrRjtBQUNsRixrRUFBOEQ7QUFDOUQsd0NBQStEO0FBRy9ELE1BQU0sZ0JBQWdCLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUseUJBQXlCLENBQUMsQ0FBQztBQUM1RSxNQUFNLE1BQU0sR0FBRyxvQkFBRSxDQUFDLHlCQUF5QixDQUFDLGdCQUFnQixFQUFFLFlBQUUsQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUM7S0FDckcsTUFBTSxDQUFDLGVBQWUsQ0FBQztBQUMxQixNQUFNLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztBQUN0QixNQUFNLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO0FBQ2hDLHNDQUFrQixFQUFFLENBQUM7QUFDckIsaUdBQWlHO0FBQ2pHLE1BQU0sRUFBRSxHQUFHLG1DQUFxQixDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSxlQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7QUFJN0UsTUFBTSxRQUFRLEdBQUcsb0JBQUUsQ0FBQywyQkFBMkIsQ0FBQyxlQUFRLENBQUMsT0FBTyxFQUMxRCxRQUFRLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFDcEIsRUFBRSxDQUFDLENBQUM7QUFDVixNQUFNLElBQUksR0FBRyxvQkFBRSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBRXZDLE1BQWEsT0FBTztJQUVsQixZQUNFLFNBQWlCLEVBQ1YsS0FBeUMsRUFDekMseUJBQXNDLElBQUksR0FBRyxFQUFFLEVBQy9DLFNBQW1CLEVBQUUsRUFDckIsZ0JBS0QsRUFBRSxFQUNELGVBQTRCLElBQUksR0FBRyxFQUFFLEVBQ3JDLGFBQXVCLEVBQUU7UUFWekIsVUFBSyxHQUFMLEtBQUssQ0FBb0M7UUFDekMsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF5QjtRQUMvQyxXQUFNLEdBQU4sTUFBTSxDQUFlO1FBQ3JCLGtCQUFhLEdBQWIsYUFBYSxDQUtaO1FBQ0QsaUJBQVksR0FBWixZQUFZLENBQXlCO1FBQ3JDLGVBQVUsR0FBVixVQUFVLENBQWU7UUFFaEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLGNBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUcsY0FBSSxDQUFDLEdBQUcsQ0FBQztJQUNuRixDQUFDO0lBRUQsYUFBYTtRQUNYLE9BQU87WUFDTCxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3RDLHNCQUFzQixFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3hFLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNuQixhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWE7WUFDakMsWUFBWSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztTQUNyRCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBNUJELDBCQTRCQztBQUVELFNBQWdCLGdCQUFnQixDQUFDLEtBQWUsRUFBRSxLQUF5QztJQUN6RixNQUFNLGVBQWUsR0FBRyw2QkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN0RCxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFFcEQsTUFBTSxHQUFHLEdBQWdCLElBQUksV0FBRyxDQUFTLElBQUksQ0FBQyxFQUFFO1FBQzlDLE1BQU0sQ0FBQyxHQUFHLElBQUksc0JBQUssQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN6RCxPQUFPLFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3JDLENBQUMsQ0FBQyxDQUFDO0lBRUgsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNqQixNQUFNLEdBQUcsR0FBRyxlQUFRLENBQUMsT0FBTyxDQUFDO0lBQzdCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQzVCLEtBQUssTUFBTSxLQUFLLElBQUksR0FBRyxDQUFDLFNBQVMsRUFBRTtZQUNqQywwQ0FBMEM7WUFDMUMsOEZBQThGO1lBQzlGLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUM1RCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FDdEQsQ0FBQztTQUNIO0tBQ0Y7SUFDRCxPQUFPLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQztBQUNqQyxDQUFDO0FBckJELDRDQXFCQztBQUVELFNBQVMsU0FBUyxDQUFDLENBQVEsRUFBRSxJQUFZLEVBQUUsR0FBWTtJQUNyRCxNQUFNLElBQUksR0FBYSxFQUFFLENBQUM7SUFDMUIsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQW1DLEVBQUUsY0FBSSxDQUFDLFFBQVEsQ0FBQyxlQUFRLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDeEYsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFO1FBQ2Y7WUFDRSxLQUFLLEVBQUUsZ0NBQWdDO1lBQ3ZDLFFBQVEsQ0FBQyxHQUFHO2dCQUNWLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBRSxHQUF3QixDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDM0YsSUFBSSxHQUFHO29CQUNMLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbkIsQ0FBQztTQUNGO1FBQ0Q7WUFDRSxLQUFLLEVBQUUsMkJBQTJCO1lBQ2xDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU87Z0JBQ3pCLElBQUksR0FBRyxDQUFDLE9BQU8sRUFBRSxLQUFLLGNBQWMsRUFBRTtvQkFDcEMsTUFBTSxLQUFLLEdBQUksR0FBRyxDQUFDLE1BQWdDLENBQUMsV0FBVyxDQUFDO29CQUNoRSxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssb0JBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUFFO3dCQUM5QyxNQUFNLFVBQVUsR0FBSSxLQUEwQixDQUFDLElBQUksQ0FBQzt3QkFDcEQsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDeEMsSUFBSSxPQUFPLEdBQUcsQ0FBQyxFQUFFOzRCQUNmLDZCQUE2Qjs0QkFDN0Isc0NBQXNDOzRCQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxDQUFDOzRCQUM5QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDOzRCQUNwRixJQUFJLEdBQUc7Z0NBQ0wsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQzt5QkFDbEI7cUJBQ0Y7aUJBQ0Y7WUFDSCxDQUFDO1NBQ0Y7UUFDRDtZQUNFLEtBQUssRUFBRSwyQ0FBMkM7WUFDbEQsUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJO2dCQUNoQixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUcsR0FBRyxDQUFDLE1BQTRCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBc0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUNqRyxHQUFHLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDOUIsSUFBSSxHQUFHO29CQUNMLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbkIsQ0FBQztTQUNGO1FBQ0Q7WUFDRSxLQUFLLEVBQUUsaUJBQWlCO1lBQ3hCLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSTtnQkFDaEIsTUFBTSxJQUFJLEdBQUcsR0FBd0IsQ0FBRTtnQkFDdkMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxvQkFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVO29CQUNsRCxJQUFJLENBQUMsVUFBNEIsQ0FBQyxJQUFJLEtBQUssU0FBUztvQkFDckQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssb0JBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUFFO29CQUN4RCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQXNCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDcEcsSUFBSSxHQUFHO3dCQUNMLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ2xCO1lBQ0gsQ0FBQztTQUNGO0tBQ0YsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQsU0FBUyxPQUFPLENBQUMsSUFBWSxFQUFFLElBQVksRUFBRSxHQUFZLEVBQUUsR0FBVyxFQUFFLEdBQWtCO0lBQ3hGLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUN4QixNQUFNLFFBQVEsR0FBRyxvQkFBRSxDQUFDLDZCQUE2QixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM1RCxHQUFHLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQztZQUNyQixNQUFNLEVBQUUsSUFBSTtZQUNaLElBQUk7WUFDSixHQUFHLEVBQUUsUUFBUSxRQUFRLENBQUMsSUFBSSxHQUFHLENBQUMsU0FBUyxRQUFRLENBQUMsU0FBUyxHQUFHLENBQUMsRUFBRTtZQUMvRCxPQUFPLEVBQUUsZUFBZTtTQUN6QixDQUFDLENBQUM7UUFDSCx1Q0FBdUM7UUFDdkMsNENBQTRDO1FBQzVDLHlJQUF5STtRQUN6SSxPQUFPLElBQUksQ0FBQztLQUNiO0lBQ0QsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1FBQy9DLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRTNCLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsSUFBSSxHQUFHLENBQUMsS0FBSyxFQUFFO1FBQ3hDLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNwQyxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7WUFDakIsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUIsTUFBTTtTQUNQO0tBQ0Y7SUFFRCxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDeEIsTUFBTSxHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQixJQUFJLEdBQUcsS0FBSyxFQUFFLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN6QyxJQUFJLFFBQVEsR0FBRyxvQkFBRSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQyxjQUFjLENBQUM7WUFDbkYsSUFBSSxRQUFRLElBQUksSUFBSSxFQUFFO2dCQUNwQiw0Q0FBNEM7Z0JBQzVDLEtBQUssTUFBTSxPQUFPLElBQUksQ0FBQyxJQUFJLEdBQUcsUUFBUSxFQUFFLElBQUksR0FBRyxLQUFLLEVBQUUsSUFBSSxHQUFHLE1BQU0sRUFBRSxJQUFJLEdBQUcsV0FBVyxFQUFFLElBQUksR0FBRyxZQUFZLENBQUMsRUFBRTtvQkFDN0csUUFBUSxHQUFHLG9CQUFFLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLGNBQWMsQ0FBQztvQkFDbEYsSUFBSSxRQUFRLElBQUksSUFBSTt3QkFDbEIsT0FBTyxjQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2lCQUNsRDtnQkFDRCxNQUFNLFFBQVEsR0FBRyxvQkFBRSxDQUFDLDZCQUE2QixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDNUQsR0FBRyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUM7b0JBQ3JCLE1BQU0sRUFBRSxJQUFJO29CQUNaLElBQUk7b0JBQ0osR0FBRyxFQUFFLFFBQVEsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLFNBQVMsUUFBUSxDQUFDLFNBQVMsR0FBRyxDQUFDLEVBQUU7b0JBQy9ELE9BQU8sRUFBRSw4QkFBOEI7aUJBQ3hDLENBQUMsQ0FBQztnQkFDSCxPQUFPLElBQUksQ0FBQzthQUNiO2lCQUFNO2dCQUNMLE1BQU0sT0FBTyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUM7Z0JBQ3hELElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRTtvQkFDdEMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLGVBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztpQkFDMUU7Z0JBQ0QsT0FBTyxPQUFPLENBQUM7YUFDaEI7U0FDRjthQUFNO1lBQ0wsOEJBQThCO1NBQy9CO0tBQ0Y7U0FBTTtRQUNMLE1BQU0sQ0FBQyxHQUFHLHVCQUF1QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QyxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDdkM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInO1xuXG5pbXBvcnQgUXVlcnkgZnJvbSAnLi4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCB7RU9MIGFzIGVvbH0gZnJvbSAnb3MnO1xuaW1wb3J0IHtERlN9IGZyb20gJy4uL3V0aWxzL2dyYXBoJztcbmltcG9ydCB7anNvblRvQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuLi90cy1jb21waWxlcic7XG4vLyBpbXBvcnQge3NldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aH0gZnJvbSAnLi4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQge2luaXRBc0NoaWxkUHJvY2Vzc30gZnJvbSAnLi4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnO1xuaW1wb3J0IHtjbG9zZXN0Q29tbW9uUGFyZW50RGlyLCBwbGlua0Vudn0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5cblxuY29uc3QgYmFzZVRzY29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90c2NvbmZpZy10c3guanNvbicpO1xuY29uc3QgY29Kc29uID0gdHMucGFyc2VDb25maWdGaWxlVGV4dFRvSnNvbihiYXNlVHNjb25maWdGaWxlLCBmcy5yZWFkRmlsZVN5bmMoYmFzZVRzY29uZmlnRmlsZSwgJ3V0ZjgnKSlcbiAgLmNvbmZpZy5jb21waWxlck9wdGlvbnM7XG5jb0pzb24uYWxsb3dKcyA9IHRydWU7XG5jb0pzb24ucmVzb2x2ZUpzb25Nb2R1bGUgPSB0cnVlO1xuaW5pdEFzQ2hpbGRQcm9jZXNzKCk7XG4vLyBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgocGxpbmtFbnYud29ya0RpciwgJy4vJywgY29Kc29uLCB7d29ya3NwYWNlRGlyOiBwbGlua0Vudi53b3JrRGlyfSk7XG5jb25zdCBjbyA9IGpzb25Ub0NvbXBpbGVyT3B0aW9ucyhjb0pzb24sIGJhc2VUc2NvbmZpZ0ZpbGUsIHBsaW5rRW52LndvcmtEaXIpO1xuXG5cblxuY29uc3QgcmVzQ2FjaGUgPSB0cy5jcmVhdGVNb2R1bGVSZXNvbHV0aW9uQ2FjaGUocGxpbmtFbnYud29ya0RpcixcbiAgICAgIGZpbGVOYW1lID0+IGZpbGVOYW1lLFxuICAgICAgY28pO1xuY29uc3QgaG9zdCA9IHRzLmNyZWF0ZUNvbXBpbGVySG9zdChjbyk7XG5cbmV4cG9ydCBjbGFzcyBDb250ZXh0IHtcbiAgY29tbW9uRGlyOiBzdHJpbmc7XG4gIGNvbnN0cnVjdG9yKFxuICAgIGNvbW1vbkRpcjogc3RyaW5nLFxuICAgIHB1YmxpYyBhbGlhczogW3JlZzogUmVnRXhwLCByZXBsYWNlVG86IHN0cmluZ11bXSxcbiAgICBwdWJsaWMgcmVsYXRpdmVEZXBzT3V0U2lkZURpcjogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCksXG4gICAgcHVibGljIGN5Y2xpYzogc3RyaW5nW10gPSBbXSxcbiAgICBwdWJsaWMgY2FuTm90UmVzb2x2ZToge1xuICAgICAgdGFyZ2V0OiBzdHJpbmc7XG4gICAgICBmaWxlOiBzdHJpbmc7XG4gICAgICBwb3M6IHN0cmluZztcbiAgICAgIHJlYXNvbmU6IHN0cmluZztcbiAgICB9W10gPSBbXSxcbiAgICBwdWJsaWMgZXh0ZXJuYWxEZXBzOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoKSxcbiAgICBwdWJsaWMgbWF0Y2hBbGlhczogc3RyaW5nW10gPSBbXVxuICApIHtcbiAgICB0aGlzLmNvbW1vbkRpciA9IGNvbW1vbkRpci5lbmRzV2l0aChQYXRoLnNlcCkgPyBjb21tb25EaXIgOiBjb21tb25EaXIgKyBQYXRoLnNlcDtcbiAgfVxuXG4gIHRvUGxhaW5PYmplY3QoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGNvbW1vbkRpcjogdGhpcy5jb21tb25EaXIuc2xpY2UoMCwgLTEpLCAvLyB0cmltIGxhc3QgUGF0aC5zZXBcbiAgICAgIHJlbGF0aXZlRGVwc091dFNpZGVEaXI6IEFycmF5LmZyb20odGhpcy5yZWxhdGl2ZURlcHNPdXRTaWRlRGlyLnZhbHVlcygpKSxcbiAgICAgIGN5Y2xpYzogdGhpcy5jeWNsaWMsXG4gICAgICBjYW5Ob3RSZXNvbHZlOiB0aGlzLmNhbk5vdFJlc29sdmUsXG4gICAgICBleHRlcm5hbERlcHM6IEFycmF5LmZyb20odGhpcy5leHRlcm5hbERlcHMudmFsdWVzKCkpXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGZzVHJhdmVyc2VGaWxlcyhmaWxlczogc3RyaW5nW10sIGFsaWFzOiBbcmVnOiBSZWdFeHAsIHJlcGxhY2VUbzogc3RyaW5nXVtdKTogUmV0dXJuVHlwZTxDb250ZXh0Wyd0b1BsYWluT2JqZWN0J10+IHtcbiAgY29uc3QgY29tbW9uUGFyZW50RGlyID0gY2xvc2VzdENvbW1vblBhcmVudERpcihmaWxlcyk7XG4gIGNvbnN0IGNvbnRleHQgPSBuZXcgQ29udGV4dChjb21tb25QYXJlbnREaXIsIGFsaWFzKTtcblxuICBjb25zdCBkZnM6IERGUzxzdHJpbmc+ID0gbmV3IERGUzxzdHJpbmc+KGRhdGEgPT4ge1xuICAgIGNvbnN0IHEgPSBuZXcgUXVlcnkoZnMucmVhZEZpbGVTeW5jKGRhdGEsICd1dGY4JyksIGRhdGEpO1xuICAgIHJldHVybiBwYXJzZUZpbGUocSwgZGF0YSwgY29udGV4dCk7XG4gIH0pO1xuXG4gIGRmcy52aXNpdChmaWxlcyk7XG4gIGNvbnN0IGN3ZCA9IHBsaW5rRW52LndvcmtEaXI7XG4gIGlmIChkZnMuYmFja0VkZ2VzLmxlbmd0aCA+IDApIHtcbiAgICBmb3IgKGNvbnN0IGVkZ2VzIG9mIGRmcy5iYWNrRWRnZXMpIHtcbiAgICAgIC8vIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgLy8gY29uc29sZS5sb2coYEZvdW5kIGN5Y2xpYyBmaWxlIGRlcGVuZGVuY3kgJHtkZnMucHJpbnRDeWNsaWNCYWNrRWRnZShlZGdlc1swXSwgZWRnZXNbMV0pfWApO1xuICAgICAgY29udGV4dC5jeWNsaWMucHVzaChkZnMucHJpbnRDeWNsaWNCYWNrRWRnZShlZGdlc1swXSwgZWRnZXNbMV0pXG4gICAgICAgIC5tYXAocGF0aCA9PiBQYXRoLnJlbGF0aXZlKGN3ZCwgcGF0aCkpLmpvaW4oJ1xcbiAtPiAnKVxuICAgICAgKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGNvbnRleHQudG9QbGFpbk9iamVjdCgpO1xufVxuXG5mdW5jdGlvbiBwYXJzZUZpbGUocTogUXVlcnksIGZpbGU6IHN0cmluZywgY3R4OiBDb250ZXh0KSB7XG4gIGNvbnN0IGRlcHM6IHN0cmluZ1tdID0gW107XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZygnW2NsaS1hbmFseXNpZS13b3JrZXJdIExvb2t1cCBmaWxlJywgUGF0aC5yZWxhdGl2ZShwbGlua0Vudi53b3JrRGlyLCBmaWxlKSk7XG4gIHEud2Fsa0FzdChxLnNyYywgW1xuICAgIHtcbiAgICAgIHF1ZXJ5OiAnLm1vZHVsZVNwZWNpZmllcjpTdHJpbmdMaXRlcmFsJywgLy8gQm90aCA6RXhwb3J0RGVjbGFyYXRpb24gb3IgOkltcG9ydERlY2xhcmF0aW9uXG4gICAgICBjYWxsYmFjayhhc3QpIHtcbiAgICAgICAgY29uc3QgZGVwID0gcmVzb2x2ZSgoYXN0IGFzIHRzLlN0cmluZ0xpdGVyYWwpLmdldFRleHQoKSwgZmlsZSwgY3R4LCBhc3QuZ2V0U3RhcnQoKSwgcS5zcmMpO1xuICAgICAgICBpZiAoZGVwKVxuICAgICAgICAgIGRlcHMucHVzaChkZXApO1xuICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgcXVlcnk6ICc6UHJvcGVydHlBc3NpZ25tZW50Pi5uYW1lJyxcbiAgICAgIGNhbGxiYWNrKGFzdCwgcGF0aCwgcGFyZW50cykge1xuICAgICAgICBpZiAoYXN0LmdldFRleHQoKSA9PT0gJ2xvYWRDaGlsZHJlbicpIHtcbiAgICAgICAgICBjb25zdCB2YWx1ZSA9IChhc3QucGFyZW50IGFzIHRzLlByb3BlcnR5QXNzaWdubWVudCkuaW5pdGlhbGl6ZXI7XG4gICAgICAgICAgaWYgKHZhbHVlLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU3RyaW5nTGl0ZXJhbCkge1xuICAgICAgICAgICAgY29uc3QgbGF6eU1vZHVsZSA9ICh2YWx1ZSBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0O1xuICAgICAgICAgICAgY29uc3QgaGFzaFRhZyA9IGxhenlNb2R1bGUuaW5kZXhPZignIycpO1xuICAgICAgICAgICAgaWYgKGhhc2hUYWcgPiAwKSB7XG4gICAgICAgICAgICAgIC8vIFdlIGZvdW5kIGxhenkgcm91dGUgbW9kdWxlXG4gICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1jb25zb2xlXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdsYXp5IHJvdXRlIG1vZHVsZTonLCBsYXp5TW9kdWxlKTtcbiAgICAgICAgICAgICAgY29uc3QgZGVwID0gcmVzb2x2ZShsYXp5TW9kdWxlLnNsaWNlKDAsIGhhc2hUYWcpLCBmaWxlLCBjdHgsIGFzdC5nZXRTdGFydCgpLCBxLnNyYyk7XG4gICAgICAgICAgICAgIGlmIChkZXApXG4gICAgICAgICAgICAgICAgZGVwcy5wdXNoKGRlcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICBxdWVyeTogJzpDYWxsRXhwcmVzc2lvbj4uZXhwcmVzc2lvbjpJbXBvcnRLZXl3b3JkJyxcbiAgICAgIGNhbGxiYWNrKGFzdCwgcGF0aCkge1xuICAgICAgICBjb25zdCBkZXAgPSByZXNvbHZlKCgoYXN0LnBhcmVudCBhcyB0cy5DYWxsRXhwcmVzc2lvbikuYXJndW1lbnRzWzBdIGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQsIGZpbGUsXG4gICAgICAgICAgY3R4LCBhc3QuZ2V0U3RhcnQoKSwgcS5zcmMpO1xuICAgICAgICBpZiAoZGVwKVxuICAgICAgICAgIGRlcHMucHVzaChkZXApO1xuICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgcXVlcnk6ICc6Q2FsbEV4cHJlc3Npb24nLFxuICAgICAgY2FsbGJhY2soYXN0LCBwYXRoKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSBhc3QgYXMgdHMuQ2FsbEV4cHJlc3Npb24gO1xuICAgICAgICBpZiAobm9kZS5leHByZXNzaW9uLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuSWRlbnRpZmllciAmJlxuICAgICAgICAgIChub2RlLmV4cHJlc3Npb24gYXMgdHMuSWRlbnRpZmllcikudGV4dCA9PT0gJ3JlcXVpcmUnICYmXG4gICAgICAgICAgbm9kZS5hcmd1bWVudHNbMF0ua2luZCA9PT0gdHMuU3ludGF4S2luZC5TdHJpbmdMaXRlcmFsKSB7XG4gICAgICAgICAgY29uc3QgZGVwID0gcmVzb2x2ZSgobm9kZS5hcmd1bWVudHNbMF0gYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dCwgZmlsZSwgY3R4LCBhc3QuZ2V0U3RhcnQoKSwgcS5zcmMpO1xuICAgICAgICAgIGlmIChkZXApXG4gICAgICAgICAgICBkZXBzLnB1c2goZGVwKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgXSk7XG4gIHJldHVybiBkZXBzO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlKHBhdGg6IHN0cmluZywgZmlsZTogc3RyaW5nLCBjdHg6IENvbnRleHQsIHBvczogbnVtYmVyLCBzcmM6IHRzLlNvdXJjZUZpbGUpIHtcbiAgaWYgKHBhdGguc3RhcnRzV2l0aCgnYCcpKSB7XG4gICAgY29uc3QgbGluZUluZm8gPSB0cy5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihzcmMsIHBvcyk7XG4gICAgY3R4LmNhbk5vdFJlc29sdmUucHVzaCh7XG4gICAgICB0YXJnZXQ6IHBhdGgsXG4gICAgICBmaWxlLFxuICAgICAgcG9zOiBgbGluZToke2xpbmVJbmZvLmxpbmUgKyAxfSwgY29sOiR7bGluZUluZm8uY2hhcmFjdGVyICsgMX1gLFxuICAgICAgcmVhc29uZTogJ2R5bmFtaWMgdmFsdWUnXG4gICAgfSk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBtYXgtbGluZS1sZW5ndGhcbiAgICAvLyBjb25zb2xlLmxvZyhgW2NsaS1hbmFseXNpZS13b3JrZXJdIGNhbiBub3QgcmVzb2x2ZSBkeW5hbWljIHZhbHVlICR7cGF0aH0gaW4gJHtmaWxlfSBAJHtsaW5lSW5mby5saW5lICsgMX06JHtsaW5lSW5mby5jaGFyYWN0ZXIgKyAxfWApO1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGlmIChwYXRoLnN0YXJ0c1dpdGgoJ1wiJykgfHwgcGF0aC5zdGFydHNXaXRoKCdcXCcnKSlcbiAgICBwYXRoID0gcGF0aC5zbGljZSgxLCAtMSk7XG5cbiAgZm9yIChjb25zdCBbcmVnLCByZXBsYWNlVG9dIG9mIGN0eC5hbGlhcykge1xuICAgIHBhdGggPSBwYXRoLnJlcGxhY2UocmVnLCByZXBsYWNlVG8pO1xuICAgIGlmIChwYXRoICE9PSBwYXRoKSB7XG4gICAgICBjdHgubWF0Y2hBbGlhcy5wdXNoKHBhdGgpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKHBhdGguc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgY29uc3QgZXh0ID0gUGF0aC5leHRuYW1lKHBhdGgpO1xuICAgIGlmIChleHQgPT09ICcnIHx8IC9eXFwuW2p0XXN4PyQvLnRlc3QoZXh0KSkge1xuICAgICAgbGV0IHJlc29sdmVkID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUocGF0aCwgZmlsZSwgY28sIGhvc3QsIHJlc0NhY2hlKS5yZXNvbHZlZE1vZHVsZTtcbiAgICAgIGlmIChyZXNvbHZlZCA9PSBudWxsKSB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbWF4LWxpbmUtbGVuZ3RoXG4gICAgICAgIGZvciAoY29uc3QgdHJ5UGF0aCBvZiBbcGF0aCArICcvaW5kZXgnLCBwYXRoICsgJy5qcycsIHBhdGggKyAnLmpzeCcsIHBhdGggKyAnL2luZGV4LmpzJywgcGF0aCArICcvaW5kZXguanN4J10pIHtcbiAgICAgICAgICByZXNvbHZlZCA9IHRzLnJlc29sdmVNb2R1bGVOYW1lKHRyeVBhdGgsIGZpbGUsIGNvLCBob3N0LCByZXNDYWNoZSkucmVzb2x2ZWRNb2R1bGU7XG4gICAgICAgICAgaWYgKHJlc29sdmVkICE9IG51bGwpXG4gICAgICAgICAgICByZXR1cm4gUGF0aC5yZXNvbHZlKHJlc29sdmVkLnJlc29sdmVkRmlsZU5hbWUpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGxpbmVJbmZvID0gdHMuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24oc3JjLCBwb3MpO1xuICAgICAgICBjdHguY2FuTm90UmVzb2x2ZS5wdXNoKHtcbiAgICAgICAgICB0YXJnZXQ6IHBhdGgsXG4gICAgICAgICAgZmlsZSxcbiAgICAgICAgICBwb3M6IGBsaW5lOiR7bGluZUluZm8ubGluZSArIDF9LCBjb2w6JHtsaW5lSW5mby5jaGFyYWN0ZXIgKyAxfWAsXG4gICAgICAgICAgcmVhc29uZTogJ1R5cGVzY3JpcHQgZmFpbGVkIHRvIHJlc29sdmUnXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGFic1BhdGggPSBQYXRoLnJlc29sdmUocmVzb2x2ZWQucmVzb2x2ZWRGaWxlTmFtZSk7XG4gICAgICAgIGlmICghYWJzUGF0aC5zdGFydHNXaXRoKGN0eC5jb21tb25EaXIpKSB7XG4gICAgICAgICAgY3R4LnJlbGF0aXZlRGVwc091dFNpZGVEaXIuYWRkKFBhdGgucmVsYXRpdmUocGxpbmtFbnYud29ya0RpciwgYWJzUGF0aCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhYnNQYXRoO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBza2lwIHVua25vd24gZXh0ZW5zaW9uIHBhdGhcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgbSA9IC9eKCg/OkBbXi9dK1xcLyk/W14vXSspLy5leGVjKHBhdGgpO1xuICAgIGN0eC5leHRlcm5hbERlcHMuYWRkKG0gPyBtWzFdIDogcGF0aCk7XG4gIH1cbn1cblxuXG4iXX0=