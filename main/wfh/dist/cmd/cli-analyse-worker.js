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
    constructor(commonDir, alias, relativeDepsOutSideDir = new Set(), cyclic = [], canNotResolve = [], externalDeps = new Set(), matchAlias = []) {
        this.alias = alias;
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
function dfsTraverseFiles(files, tsconfigFile, alias) {
    init(tsconfigFile);
    const commonParentDir = (files.length === 1) ? path_1.default.dirname(files[0]) : misc_1.closestCommonParentDir(files);
    const context = new Context(commonParentDir, alias.map(item => [new RegExp(item[0]), item[1]]));
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
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFuYWx5c2Utd29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1hbmFseXNlLXdvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSx1Q0FBcUM7QUFFckMseUVBQTBDO0FBQzFDLDRDQUFvQjtBQUNwQiw0REFBNEI7QUFDNUIsZ0RBQXdCO0FBQ3hCLGlDQUFpQztBQUNqQywwQ0FBbUM7QUFDbkMsZ0RBQXFEO0FBQ3JELGtGQUFrRjtBQUNsRixrRUFBMEU7QUFDMUUsc0RBQThEO0FBQzlELDBEQUFnRDtBQUNoRCx3Q0FBK0Q7QUFDL0QsZ0RBQTZFO0FBQzdFLHNDQUFtQztBQUduQyxJQUFJLE1BQStCLENBQUM7QUFDcEMsaUdBQWlHO0FBQ2pHLElBQUksRUFBa0MsQ0FBQztBQUN2QyxJQUFJLFFBQWtDLENBQUM7QUFDdkMsSUFBSSxJQUFxQixDQUFDO0FBQzFCLHNDQUFrQixFQUFFLENBQUM7QUFDckIsOEJBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBZSxDQUFDLENBQUMsQ0FBQztBQUNwRCw0Q0FBMkIsRUFBRSxDQUFDO0FBQzlCLE1BQU0sR0FBRyxHQUFHLGlCQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDakMsTUFBYSxPQUFPO0lBS2xCLFlBQ0UsU0FBaUIsRUFDVixLQUF5QyxFQUN6Qyx5QkFBc0MsSUFBSSxHQUFHLEVBQUUsRUFDL0MsU0FBbUIsRUFBRSxFQUNyQixnQkFLRCxFQUFFLEVBQ0QsZUFBNEIsSUFBSSxHQUFHLEVBQUUsRUFDckMsYUFBdUIsRUFBRTtRQVZ6QixVQUFLLEdBQUwsS0FBSyxDQUFvQztRQUN6QywyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXlCO1FBQy9DLFdBQU0sR0FBTixNQUFNLENBQWU7UUFDckIsa0JBQWEsR0FBYixhQUFhLENBS1o7UUFDRCxpQkFBWSxHQUFaLFlBQVksQ0FBeUI7UUFDckMsZUFBVSxHQUFWLFVBQVUsQ0FBZTtRQWZsQyxzQkFBc0I7UUFDdEIsbUJBQWMsR0FBYSxFQUFFLENBQUM7UUFnQjVCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxjQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFHLGNBQUksQ0FBQyxHQUFHLENBQUM7SUFDbkYsQ0FBQztJQUVELGFBQWE7UUFDWCxPQUFPO1lBQ0wsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN0QyxzQkFBc0IsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN4RSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07WUFDbkIsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO1lBQ2pDLFlBQVksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDcEQsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO1lBQzNCLEtBQUssRUFBRSxJQUFJLENBQUMsY0FBYztTQUMzQixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBakNELDBCQWlDQztBQUVELFNBQWdCLGdCQUFnQixDQUFDLEtBQWUsRUFBRSxZQUF1QyxFQUN2RixLQUF5QztJQUN6QyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDbkIsTUFBTSxlQUFlLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyw2QkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN0RyxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRWhHLE1BQU0sR0FBRyxHQUFnQixJQUFJLFdBQUcsQ0FBUyxJQUFJLENBQUMsRUFBRTtRQUM5QyxNQUFNLE9BQU8sR0FBRyw4QkFBVyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsWUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUM5RSxNQUFNLENBQUMsR0FBRyxJQUFJLHNCQUFLLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25DLE9BQU8sU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDckMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxFQUFFO1FBQ1YsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzNDLENBQUMsQ0FBQyxDQUFDO0lBRUgsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNqQixNQUFNLEdBQUcsR0FBRyxlQUFRLENBQUMsT0FBTyxDQUFDO0lBQzdCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQzVCLEtBQUssTUFBTSxLQUFLLElBQUksR0FBRyxDQUFDLFNBQVMsRUFBRTtZQUNqQywyRkFBMkY7WUFDM0YsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQzVELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGNBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUN0RCxDQUFDO1NBQ0g7S0FDRjtJQUNELE9BQU8sT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDO0FBQ2pDLENBQUM7QUF6QkQsNENBeUJDO0FBRUQ7OztHQUdHO0FBQ0gsU0FBUyxJQUFJLENBQUMsWUFBNEI7SUFDeEMsSUFBSSxNQUFNLElBQUksSUFBSTtRQUNoQixPQUFPO0lBQ1QsTUFBTSxnQkFBZ0IsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVFLE1BQU0sU0FBUyxHQUFHLG9CQUFFLENBQUMseUJBQXlCLENBQUMsZ0JBQWdCLEVBQUUsWUFBRSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQztTQUN4RyxNQUFNLENBQUM7SUFFVixNQUFNLEdBQUcsU0FBUyxDQUFDLGVBQWUsQ0FBQztJQUNuQyxJQUFJLFlBQVksRUFBRTtRQUNoQixrQ0FBb0IsQ0FBQyxvQkFBRSxFQUFFLFlBQVksRUFBRSxlQUFRLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0tBQ2xFO0lBQ0QsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7SUFDdEIsTUFBTSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQztJQUNoQyxFQUFFLEdBQUcsbUNBQXFCLENBQUMsTUFBTSxFQUFFLGdCQUFnQixFQUFFLGVBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN2RSxRQUFRLEdBQUcsb0JBQUUsQ0FBQywyQkFBMkIsQ0FBQyxlQUFRLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3RGLElBQUksR0FBRyxvQkFBRSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ25DLENBQUM7QUFFRCxTQUFTLFNBQVMsQ0FBQyxDQUFRLEVBQUUsSUFBWSxFQUFFLEdBQVk7SUFDckQsTUFBTSxJQUFJLEdBQWEsRUFBRSxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxLQUFLLENBQUMsbUNBQW1DLEVBQUUsY0FBSSxDQUFDLFFBQVEsQ0FBQyxlQUFRLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDdEYsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFO1FBQ2Y7WUFDRSxLQUFLLEVBQUUsZ0NBQWdDO1lBQ3ZDLFFBQVEsQ0FBQyxHQUFHO2dCQUNWLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBRSxHQUF3QixDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDM0YsSUFBSSxHQUFHO29CQUNMLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbkIsQ0FBQztTQUNGO1FBQ0Q7WUFDRSxLQUFLLEVBQUUsMkJBQTJCO1lBQ2xDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU87Z0JBQ3pCLElBQUksR0FBRyxDQUFDLE9BQU8sRUFBRSxLQUFLLGNBQWMsRUFBRTtvQkFDcEMsTUFBTSxLQUFLLEdBQUksR0FBRyxDQUFDLE1BQWdDLENBQUMsV0FBVyxDQUFDO29CQUNoRSxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssb0JBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUFFO3dCQUM5QyxNQUFNLFVBQVUsR0FBSSxLQUEwQixDQUFDLElBQUksQ0FBQzt3QkFDcEQsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDeEMsSUFBSSxPQUFPLEdBQUcsQ0FBQyxFQUFFOzRCQUNmLDZCQUE2Qjs0QkFDN0Isc0NBQXNDOzRCQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxDQUFDOzRCQUMzQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDOzRCQUNwRixJQUFJLEdBQUc7Z0NBQ0wsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQzt5QkFDbEI7cUJBQ0Y7aUJBQ0Y7WUFDSCxDQUFDO1NBQ0Y7UUFDRDtZQUNFLEtBQUssRUFBRSwyQ0FBMkM7WUFDbEQsUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJO2dCQUNoQixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUcsR0FBRyxDQUFDLE1BQTRCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBc0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUNqRyxHQUFHLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDOUIsSUFBSSxHQUFHO29CQUNMLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbkIsQ0FBQztTQUNGO1FBQ0Q7WUFDRSxLQUFLLEVBQUUsaUJBQWlCO1lBQ3hCLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSTtnQkFDaEIsTUFBTSxJQUFJLEdBQUcsR0FBd0IsQ0FBRTtnQkFDdkMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxvQkFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVO29CQUNsRCxJQUFJLENBQUMsVUFBNEIsQ0FBQyxJQUFJLEtBQUssU0FBUztvQkFDckQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssb0JBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUFFO29CQUN4RCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQXNCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDcEcsSUFBSSxHQUFHO3dCQUNMLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ2xCO1lBQ0gsQ0FBQztTQUNGO0tBQ0YsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQsU0FBUyxPQUFPLENBQUMsSUFBWSxFQUFFLElBQVksRUFBRSxHQUFZLEVBQUUsR0FBVyxFQUFFLEdBQWtCO0lBQ3hGLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUN4QixNQUFNLFFBQVEsR0FBRyxvQkFBRSxDQUFDLDZCQUE2QixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM1RCxHQUFHLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQztZQUNyQixNQUFNLEVBQUUsSUFBSTtZQUNaLElBQUk7WUFDSixHQUFHLEVBQUUsUUFBUSxRQUFRLENBQUMsSUFBSSxHQUFHLENBQUMsU0FBUyxRQUFRLENBQUMsU0FBUyxHQUFHLENBQUMsRUFBRTtZQUMvRCxPQUFPLEVBQUUsZUFBZTtTQUN6QixDQUFDLENBQUM7UUFDSCw0Q0FBNEM7UUFDNUMsc0lBQXNJO1FBQ3RJLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFDRCxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7UUFDL0MsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFM0IsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxLQUFLLEVBQUU7UUFDeEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDOUMsSUFBSSxJQUFJLEtBQUssUUFBUSxFQUFFO1lBQ3JCLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFCLElBQUksR0FBRyxRQUFRLENBQUM7WUFDaEIsTUFBTTtTQUNQO0tBQ0Y7SUFFRCxJQUFJLFFBQVEsR0FBRyxvQkFBRSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQyxjQUFjLENBQUM7SUFDcEYsSUFBSSxRQUFRLElBQUksSUFBSSxFQUFFO1FBQ3BCLENBQUMsSUFBSSxHQUFHLFFBQVEsRUFBRSxJQUFJLEdBQUcsS0FBSyxFQUFFLElBQUksR0FBRyxNQUFNLEVBQUUsSUFBSSxHQUFHLFdBQVcsRUFBRSxJQUFJLEdBQUcsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ3JHLFFBQVEsR0FBRyxvQkFBRSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQyxjQUFjLENBQUM7WUFDbkYsT0FBTyxRQUFRLElBQUksSUFBSSxDQUFDO1FBQzFCLENBQUMsQ0FBQyxDQUFDO0tBQ0o7SUFFRCx1REFBdUQ7SUFDdkQsSUFBSSxRQUFRLElBQUksSUFBSSxFQUFFO1FBQ3BCLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNuRCxNQUFNLENBQUMsR0FBRyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDM0MsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3RDLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxNQUFNLFFBQVEsR0FBRyxvQkFBRSxDQUFDLDZCQUE2QixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM1RCxHQUFHLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQztZQUNyQixNQUFNLEVBQUUsSUFBSTtZQUNaLElBQUk7WUFDSixHQUFHLEVBQUUsUUFBUSxRQUFRLENBQUMsSUFBSSxHQUFHLENBQUMsU0FBUyxRQUFRLENBQUMsU0FBUyxHQUFHLENBQUMsRUFBRTtZQUMvRCxPQUFPLEVBQUUsOEJBQThCO1NBQ3hDLENBQUMsQ0FBQztRQUNILE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFDRCxJQUFJLFFBQVEsYUFBUixRQUFRLHVCQUFSLFFBQVEsQ0FBRSxTQUFTLEVBQUU7UUFDdkIsMkVBQTJFO1FBQzNFLGlEQUFpRDtRQUNqRCxNQUFNLENBQUMsR0FBRyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLEVBQUU7WUFDTCxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUM1QjthQUFNO1lBQ0wsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUMvQztLQUNGO1NBQU0sSUFBSSxRQUFRLEVBQUU7UUFDbkIsTUFBTSxPQUFPLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUN4RCxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDdEMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLGVBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUMxRTtRQUNELE9BQU8sT0FBTyxDQUFDO0tBQ2hCO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJztcblxuaW1wb3J0IFF1ZXJ5IGZyb20gJy4uL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG4vLyBpbXBvcnQge0VPTCBhcyBlb2x9IGZyb20gJ29zJztcbmltcG9ydCB7REZTfSBmcm9tICcuLi91dGlscy9ncmFwaCc7XG5pbXBvcnQge2pzb25Ub0NvbXBpbGVyT3B0aW9uc30gZnJvbSAnLi4vdHMtY29tcGlsZXInO1xuLy8gaW1wb3J0IHtzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGh9IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHtpbml0QXNDaGlsZFByb2Nlc3MsIGluaXRDb25maWd9IGZyb20gJy4uL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJztcbmltcG9ydCB7aW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzfSBmcm9tICcuLi9wYWNrYWdlLXJ1bm5lcic7XG5pbXBvcnQge3dlYkluamVjdG9yfSBmcm9tICcuLi9pbmplY3Rvci1mYWN0b3J5JztcbmltcG9ydCB7Y2xvc2VzdENvbW1vblBhcmVudERpciwgcGxpbmtFbnZ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IHttZXJnZUJhc2VVcmxBbmRQYXRocywgUmVxdWlyZWRDb21waWxlck9wdGlvbnN9IGZyb20gJy4uL3RzLWNtZC11dGlsJztcbmltcG9ydCB7bG9nNEZpbGV9IGZyb20gJy4uL2xvZ2dlcic7XG5cblxubGV0IGNvSnNvbjogUmVxdWlyZWRDb21waWxlck9wdGlvbnM7XG4vLyBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgocGxpbmtFbnYud29ya0RpciwgJy4vJywgY29Kc29uLCB7d29ya3NwYWNlRGlyOiBwbGlua0Vudi53b3JrRGlyfSk7XG5sZXQgY286IHRzLkNvbXBpbGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbmxldCByZXNDYWNoZTogdHMuTW9kdWxlUmVzb2x1dGlvbkNhY2hlO1xubGV0IGhvc3Q6IHRzLkNvbXBpbGVySG9zdDtcbmluaXRBc0NoaWxkUHJvY2VzcygpO1xuaW5pdENvbmZpZyhKU09OLnBhcnNlKHByb2Nlc3MuZW52LlBMSU5LX0NMSV9PUFRTISkpO1xuaW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzKCk7XG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcbmV4cG9ydCBjbGFzcyBDb250ZXh0IHtcbiAgY29tbW9uRGlyOiBzdHJpbmc7XG4gIC8qKiB0cmF2ZXJzZWQgZmlsZXMgKi9cbiAgdG9wU29ydGVkRmlsZXM6IHN0cmluZ1tdID0gW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgY29tbW9uRGlyOiBzdHJpbmcsXG4gICAgcHVibGljIGFsaWFzOiBbcmVnOiBSZWdFeHAsIHJlcGxhY2VUbzogc3RyaW5nXVtdLFxuICAgIHB1YmxpYyByZWxhdGl2ZURlcHNPdXRTaWRlRGlyOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoKSxcbiAgICBwdWJsaWMgY3ljbGljOiBzdHJpbmdbXSA9IFtdLFxuICAgIHB1YmxpYyBjYW5Ob3RSZXNvbHZlOiB7XG4gICAgICB0YXJnZXQ6IHN0cmluZztcbiAgICAgIGZpbGU6IHN0cmluZztcbiAgICAgIHBvczogc3RyaW5nO1xuICAgICAgcmVhc29uZTogc3RyaW5nO1xuICAgIH1bXSA9IFtdLFxuICAgIHB1YmxpYyBleHRlcm5hbERlcHM6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpLFxuICAgIHB1YmxpYyBtYXRjaEFsaWFzOiBzdHJpbmdbXSA9IFtdXG4gICkge1xuICAgIHRoaXMuY29tbW9uRGlyID0gY29tbW9uRGlyLmVuZHNXaXRoKFBhdGguc2VwKSA/IGNvbW1vbkRpciA6IGNvbW1vbkRpciArIFBhdGguc2VwO1xuICB9XG5cbiAgdG9QbGFpbk9iamVjdCgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgY29tbW9uRGlyOiB0aGlzLmNvbW1vbkRpci5zbGljZSgwLCAtMSksIC8vIHRyaW0gbGFzdCBQYXRoLnNlcFxuICAgICAgcmVsYXRpdmVEZXBzT3V0U2lkZURpcjogQXJyYXkuZnJvbSh0aGlzLnJlbGF0aXZlRGVwc091dFNpZGVEaXIudmFsdWVzKCkpLFxuICAgICAgY3ljbGljOiB0aGlzLmN5Y2xpYyxcbiAgICAgIGNhbk5vdFJlc29sdmU6IHRoaXMuY2FuTm90UmVzb2x2ZSxcbiAgICAgIGV4dGVybmFsRGVwczogQXJyYXkuZnJvbSh0aGlzLmV4dGVybmFsRGVwcy52YWx1ZXMoKSksXG4gICAgICBtYXRjaEFsaWFzOiB0aGlzLm1hdGNoQWxpYXMsXG4gICAgICBmaWxlczogdGhpcy50b3BTb3J0ZWRGaWxlc1xuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRmc1RyYXZlcnNlRmlsZXMoZmlsZXM6IHN0cmluZ1tdLCB0c2NvbmZpZ0ZpbGU6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQsXG4gIGFsaWFzOiBbcmVnOiBzdHJpbmcsIHJlcGxhY2VUbzogc3RyaW5nXVtdKTogUmV0dXJuVHlwZTxDb250ZXh0Wyd0b1BsYWluT2JqZWN0J10+IHtcbiAgaW5pdCh0c2NvbmZpZ0ZpbGUpO1xuICBjb25zdCBjb21tb25QYXJlbnREaXIgPSAoZmlsZXMubGVuZ3RoID09PSAxKSA/IFBhdGguZGlybmFtZShmaWxlc1swXSkgOiBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKGZpbGVzKTtcbiAgY29uc3QgY29udGV4dCA9IG5ldyBDb250ZXh0KGNvbW1vblBhcmVudERpciwgYWxpYXMubWFwKGl0ZW0gPT4gW25ldyBSZWdFeHAoaXRlbVswXSksIGl0ZW1bMV1dKSk7XG5cbiAgY29uc3QgZGZzOiBERlM8c3RyaW5nPiA9IG5ldyBERlM8c3RyaW5nPihmaWxlID0+IHtcbiAgICBjb25zdCBjb250ZW50ID0gd2ViSW5qZWN0b3IuaW5qZWN0VG9GaWxlKGZpbGUsIGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpKTtcbiAgICBjb25zdCBxID0gbmV3IFF1ZXJ5KGNvbnRlbnQsIGZpbGUpO1xuICAgIHJldHVybiBwYXJzZUZpbGUocSwgZmlsZSwgY29udGV4dCk7XG4gIH0sIHZlcnRleCA9PiB7XG4gICAgY29udGV4dC50b3BTb3J0ZWRGaWxlcy5wdXNoKHZlcnRleC5kYXRhKTtcbiAgfSk7XG5cbiAgZGZzLnZpc2l0KGZpbGVzKTtcbiAgY29uc3QgY3dkID0gcGxpbmtFbnYud29ya0RpcjtcbiAgaWYgKGRmcy5iYWNrRWRnZXMubGVuZ3RoID4gMCkge1xuICAgIGZvciAoY29uc3QgZWRnZXMgb2YgZGZzLmJhY2tFZGdlcykge1xuICAgICAgLy8gbG9nLmluZm8oYEZvdW5kIGN5Y2xpYyBmaWxlIGRlcGVuZGVuY3kgJHtkZnMucHJpbnRDeWNsaWNCYWNrRWRnZShlZGdlc1swXSwgZWRnZXNbMV0pfWApO1xuICAgICAgY29udGV4dC5jeWNsaWMucHVzaChkZnMucHJpbnRDeWNsaWNCYWNrRWRnZShlZGdlc1swXSwgZWRnZXNbMV0pXG4gICAgICAgIC5tYXAocGF0aCA9PiBQYXRoLnJlbGF0aXZlKGN3ZCwgcGF0aCkpLmpvaW4oJ1xcbiAtPiAnKVxuICAgICAgKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGNvbnRleHQudG9QbGFpbk9iamVjdCgpO1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHRzY29uZmlnRmlsZSBhbGwgY29tcGlsZXJPcHRpb25zLnBhdGhzIHNldHRpbmcgd2lsbCBiZSBhZG9wdGVkIGluIHJlc29sdmluZyBmaWxlc1xuICovXG5mdW5jdGlvbiBpbml0KHRzY29uZmlnRmlsZT86IHN0cmluZyB8IG51bGwpIHtcbiAgaWYgKGNvSnNvbiAhPSBudWxsKVxuICAgIHJldHVybjtcbiAgY29uc3QgYmFzZVRzY29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90c2NvbmZpZy10c3guanNvbicpO1xuICBjb25zdCBiYXNlVHNjZmcgPSB0cy5wYXJzZUNvbmZpZ0ZpbGVUZXh0VG9Kc29uKGJhc2VUc2NvbmZpZ0ZpbGUsIGZzLnJlYWRGaWxlU3luYyhiYXNlVHNjb25maWdGaWxlLCAndXRmOCcpKVxuICAgIC5jb25maWc7XG5cbiAgY29Kc29uID0gYmFzZVRzY2ZnLmNvbXBpbGVyT3B0aW9ucztcbiAgaWYgKHRzY29uZmlnRmlsZSkge1xuICAgIG1lcmdlQmFzZVVybEFuZFBhdGhzKHRzLCB0c2NvbmZpZ0ZpbGUsIHBsaW5rRW52LndvcmtEaXIsIGNvSnNvbik7XG4gIH1cbiAgY29Kc29uLmFsbG93SnMgPSB0cnVlO1xuICBjb0pzb24ucmVzb2x2ZUpzb25Nb2R1bGUgPSB0cnVlO1xuICBjbyA9IGpzb25Ub0NvbXBpbGVyT3B0aW9ucyhjb0pzb24sIGJhc2VUc2NvbmZpZ0ZpbGUsIHBsaW5rRW52LndvcmtEaXIpO1xuICByZXNDYWNoZSA9IHRzLmNyZWF0ZU1vZHVsZVJlc29sdXRpb25DYWNoZShwbGlua0Vudi53b3JrRGlyLCBmaWxlTmFtZSA9PiBmaWxlTmFtZSwgY28pO1xuICBob3N0ID0gdHMuY3JlYXRlQ29tcGlsZXJIb3N0KGNvKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VGaWxlKHE6IFF1ZXJ5LCBmaWxlOiBzdHJpbmcsIGN0eDogQ29udGV4dCkge1xuICBjb25zdCBkZXBzOiBzdHJpbmdbXSA9IFtdO1xuICBsb2cuZGVidWcoJ1tjbGktYW5hbHlzaWUtd29ya2VyXSBMb29rdXAgZmlsZScsIFBhdGgucmVsYXRpdmUocGxpbmtFbnYud29ya0RpciwgZmlsZSkpO1xuICBxLndhbGtBc3QocS5zcmMsIFtcbiAgICB7XG4gICAgICBxdWVyeTogJy5tb2R1bGVTcGVjaWZpZXI6U3RyaW5nTGl0ZXJhbCcsIC8vIEJvdGggOkV4cG9ydERlY2xhcmF0aW9uIG9yIDpJbXBvcnREZWNsYXJhdGlvblxuICAgICAgY2FsbGJhY2soYXN0KSB7XG4gICAgICAgIGNvbnN0IGRlcCA9IHJlc29sdmUoKGFzdCBhcyB0cy5TdHJpbmdMaXRlcmFsKS5nZXRUZXh0KCksIGZpbGUsIGN0eCwgYXN0LmdldFN0YXJ0KCksIHEuc3JjKTtcbiAgICAgICAgaWYgKGRlcClcbiAgICAgICAgICBkZXBzLnB1c2goZGVwKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgIHF1ZXJ5OiAnOlByb3BlcnR5QXNzaWdubWVudD4ubmFtZScsXG4gICAgICBjYWxsYmFjayhhc3QsIHBhdGgsIHBhcmVudHMpIHtcbiAgICAgICAgaWYgKGFzdC5nZXRUZXh0KCkgPT09ICdsb2FkQ2hpbGRyZW4nKSB7XG4gICAgICAgICAgY29uc3QgdmFsdWUgPSAoYXN0LnBhcmVudCBhcyB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnQpLmluaXRpYWxpemVyO1xuICAgICAgICAgIGlmICh2YWx1ZS5raW5kID09PSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICAgIGNvbnN0IGxhenlNb2R1bGUgPSAodmFsdWUgYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dDtcbiAgICAgICAgICAgIGNvbnN0IGhhc2hUYWcgPSBsYXp5TW9kdWxlLmluZGV4T2YoJyMnKTtcbiAgICAgICAgICAgIGlmIChoYXNoVGFnID4gMCkge1xuICAgICAgICAgICAgICAvLyBXZSBmb3VuZCBsYXp5IHJvdXRlIG1vZHVsZVxuICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tY29uc29sZVxuICAgICAgICAgICAgICBsb2cuaW5mbygnbGF6eSByb3V0ZSBtb2R1bGU6JywgbGF6eU1vZHVsZSk7XG4gICAgICAgICAgICAgIGNvbnN0IGRlcCA9IHJlc29sdmUobGF6eU1vZHVsZS5zbGljZSgwLCBoYXNoVGFnKSwgZmlsZSwgY3R4LCBhc3QuZ2V0U3RhcnQoKSwgcS5zcmMpO1xuICAgICAgICAgICAgICBpZiAoZGVwKVxuICAgICAgICAgICAgICAgIGRlcHMucHVzaChkZXApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgcXVlcnk6ICc6Q2FsbEV4cHJlc3Npb24+LmV4cHJlc3Npb246SW1wb3J0S2V5d29yZCcsXG4gICAgICBjYWxsYmFjayhhc3QsIHBhdGgpIHtcbiAgICAgICAgY29uc3QgZGVwID0gcmVzb2x2ZSgoKGFzdC5wYXJlbnQgYXMgdHMuQ2FsbEV4cHJlc3Npb24pLmFyZ3VtZW50c1swXSBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0LCBmaWxlLFxuICAgICAgICAgIGN0eCwgYXN0LmdldFN0YXJ0KCksIHEuc3JjKTtcbiAgICAgICAgaWYgKGRlcClcbiAgICAgICAgICBkZXBzLnB1c2goZGVwKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgIHF1ZXJ5OiAnOkNhbGxFeHByZXNzaW9uJyxcbiAgICAgIGNhbGxiYWNrKGFzdCwgcGF0aCkge1xuICAgICAgICBjb25zdCBub2RlID0gYXN0IGFzIHRzLkNhbGxFeHByZXNzaW9uIDtcbiAgICAgICAgaWYgKG5vZGUuZXhwcmVzc2lvbi5raW5kID09PSB0cy5TeW50YXhLaW5kLklkZW50aWZpZXIgJiZcbiAgICAgICAgICAobm9kZS5leHByZXNzaW9uIGFzIHRzLklkZW50aWZpZXIpLnRleHQgPT09ICdyZXF1aXJlJyAmJlxuICAgICAgICAgIG5vZGUuYXJndW1lbnRzWzBdLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU3RyaW5nTGl0ZXJhbCkge1xuICAgICAgICAgIGNvbnN0IGRlcCA9IHJlc29sdmUoKG5vZGUuYXJndW1lbnRzWzBdIGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQsIGZpbGUsIGN0eCwgYXN0LmdldFN0YXJ0KCksIHEuc3JjKTtcbiAgICAgICAgICBpZiAoZGVwKVxuICAgICAgICAgICAgZGVwcy5wdXNoKGRlcCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIF0pO1xuICByZXR1cm4gZGVwcztcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZShwYXRoOiBzdHJpbmcsIGZpbGU6IHN0cmluZywgY3R4OiBDb250ZXh0LCBwb3M6IG51bWJlciwgc3JjOiB0cy5Tb3VyY2VGaWxlKSB7XG4gIGlmIChwYXRoLnN0YXJ0c1dpdGgoJ2AnKSkge1xuICAgIGNvbnN0IGxpbmVJbmZvID0gdHMuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24oc3JjLCBwb3MpO1xuICAgIGN0eC5jYW5Ob3RSZXNvbHZlLnB1c2goe1xuICAgICAgdGFyZ2V0OiBwYXRoLFxuICAgICAgZmlsZSxcbiAgICAgIHBvczogYGxpbmU6JHtsaW5lSW5mby5saW5lICsgMX0sIGNvbDoke2xpbmVJbmZvLmNoYXJhY3RlciArIDF9YCxcbiAgICAgIHJlYXNvbmU6ICdkeW5hbWljIHZhbHVlJ1xuICAgIH0pO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbWF4LWxpbmUtbGVuZ3RoXG4gICAgLy8gbG9nLmluZm8oYFtjbGktYW5hbHlzaWUtd29ya2VyXSBjYW4gbm90IHJlc29sdmUgZHluYW1pYyB2YWx1ZSAke3BhdGh9IGluICR7ZmlsZX0gQCR7bGluZUluZm8ubGluZSArIDF9OiR7bGluZUluZm8uY2hhcmFjdGVyICsgMX1gKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBpZiAocGF0aC5zdGFydHNXaXRoKCdcIicpIHx8IHBhdGguc3RhcnRzV2l0aCgnXFwnJykpXG4gICAgcGF0aCA9IHBhdGguc2xpY2UoMSwgLTEpO1xuXG4gIGZvciAoY29uc3QgW3JlZywgcmVwbGFjZVRvXSBvZiBjdHguYWxpYXMpIHtcbiAgICBjb25zdCByZXBsYWNlZCA9IHBhdGgucmVwbGFjZShyZWcsIHJlcGxhY2VUbyk7XG4gICAgaWYgKHBhdGggIT09IHJlcGxhY2VkKSB7XG4gICAgICBjdHgubWF0Y2hBbGlhcy5wdXNoKHBhdGgpO1xuICAgICAgcGF0aCA9IHJlcGxhY2VkO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgbGV0IHJlc29sdmVkID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUocGF0aCwgZmlsZSwgY28hLCBob3N0LCByZXNDYWNoZSkucmVzb2x2ZWRNb2R1bGU7XG4gIGlmIChyZXNvbHZlZCA9PSBudWxsKSB7XG4gICAgW3BhdGggKyAnL2luZGV4JywgcGF0aCArICcuanMnLCBwYXRoICsgJy5qc3gnLCBwYXRoICsgJy9pbmRleC5qcycsIHBhdGggKyAnL2luZGV4LmpzeCddLnNvbWUodHJ5UGF0aCA9PiB7XG4gICAgICByZXNvbHZlZCA9IHRzLnJlc29sdmVNb2R1bGVOYW1lKHRyeVBhdGgsIGZpbGUsIGNvISwgaG9zdCwgcmVzQ2FjaGUpLnJlc29sdmVkTW9kdWxlO1xuICAgICAgcmV0dXJuIHJlc29sdmVkICE9IG51bGw7XG4gICAgfSk7XG4gIH1cblxuICAvLyBpZiAocGF0aC5zdGFydHNXaXRoKCcuJykgfHwgUGF0aC5pc0Fic29sdXRlKHBhdGgpKSB7XG4gIGlmIChyZXNvbHZlZCA9PSBudWxsKSB7XG4gICAgaWYgKCFwYXRoLnN0YXJ0c1dpdGgoJy4nKSAmJiAhUGF0aC5pc0Fic29sdXRlKHBhdGgpKSB7XG4gICAgICBjb25zdCBtID0gL14oPzpAW14vXStcXC8pP1teL10rLy5leGVjKHBhdGgpO1xuICAgICAgY3R4LmV4dGVybmFsRGVwcy5hZGQobSA/IG1bMF0gOiBwYXRoKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBsaW5lSW5mbyA9IHRzLmdldExpbmVBbmRDaGFyYWN0ZXJPZlBvc2l0aW9uKHNyYywgcG9zKTtcbiAgICBjdHguY2FuTm90UmVzb2x2ZS5wdXNoKHtcbiAgICAgIHRhcmdldDogcGF0aCxcbiAgICAgIGZpbGUsXG4gICAgICBwb3M6IGBsaW5lOiR7bGluZUluZm8ubGluZSArIDF9LCBjb2w6JHtsaW5lSW5mby5jaGFyYWN0ZXIgKyAxfWAsXG4gICAgICByZWFzb25lOiAnVHlwZXNjcmlwdCBmYWlsZWQgdG8gcmVzb2x2ZSdcbiAgICB9KTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBpZiAocmVzb2x2ZWQ/LnBhY2thZ2VJZCkge1xuICAgIC8vIHJlc29sdmVkLnBhY2thZ2VJZC5uYW1lIGFsd2F5cyByZXR1cm4gQHR5cGUveHh4eCBpbnN0ZWFkIG9mIHJlYWwgcGFja2FnZVxuICAgIC8vIGN0eC5leHRlcm5hbERlcHMuYWRkKHJlc29sdmVkLnBhY2thZ2VJZC5uYW1lKTtcbiAgICBjb25zdCBtID0gL14oPzpAW14vXStcXC8pP1teL10rLy5leGVjKHBhdGgpO1xuICAgIGlmIChtKSB7XG4gICAgICBjdHguZXh0ZXJuYWxEZXBzLmFkZChtWzBdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY3R4LmV4dGVybmFsRGVwcy5hZGQocmVzb2x2ZWQucGFja2FnZUlkLm5hbWUpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChyZXNvbHZlZCkge1xuICAgIGNvbnN0IGFic1BhdGggPSBQYXRoLnJlc29sdmUocmVzb2x2ZWQucmVzb2x2ZWRGaWxlTmFtZSk7XG4gICAgaWYgKCFhYnNQYXRoLnN0YXJ0c1dpdGgoY3R4LmNvbW1vbkRpcikpIHtcbiAgICAgIGN0eC5yZWxhdGl2ZURlcHNPdXRTaWRlRGlyLmFkZChQYXRoLnJlbGF0aXZlKHBsaW5rRW52LndvcmtEaXIsIGFic1BhdGgpKTtcbiAgICB9XG4gICAgcmV0dXJuIGFic1BhdGg7XG4gIH1cbn1cblxuXG4iXX0=