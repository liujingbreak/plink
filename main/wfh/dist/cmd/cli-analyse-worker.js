"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dfsTraverseFiles = void 0;
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
const baseTsconfigFile = path_1.default.resolve(__dirname, '../../tsconfig-tsx.json');
const tsxTsconfig = typescript_1.default.parseConfigFileTextToJson(baseTsconfigFile, fs_1.default.readFileSync(baseTsconfigFile, 'utf8'));
tsxTsconfig.config.compilerOptions.allowJs = true;
const co = ts_compiler_1.jsonToCompilerOptions(tsxTsconfig.config.compilerOptions);
bootstrap_process_1.initProcess();
config_handler_1.setTsCompilerOptForNodePath(process.cwd(), './', co);
const resCache = typescript_1.default.createModuleResolutionCache(process.cwd(), fileName => fileName, co);
const host = typescript_1.default.createCompilerHost(co);
function dfsTraverseFiles(files) {
    const externalDeps = new Set();
    const dfs = new graph_1.DFS(vertex => {
        const q = new ts_ast_query_1.default(fs_1.default.readFileSync(vertex.data, 'utf8'), vertex.data);
        return parseFile(q, vertex.data, externalDeps).map(file => {
            return dfs.vertexOf(file);
        });
    });
    dfs.visit(files.map(file => new graph_1.Vertex(file)));
    if (dfs.backEdges.length > 0) {
        for (const edges of dfs.backEdges) {
            // tslint:disable-next-line: no-console
            console.log(`Found cyclic file dependency ${dfs.printCyclicBackEdge(edges[0], edges[1])}`);
        }
    }
    return Array.from(externalDeps.values());
}
exports.dfsTraverseFiles = dfsTraverseFiles;
function parseFile(q, file, externalDeps) {
    const deps = [];
    // tslint:disable-next-line: no-console
    console.log('[cli-analysie-worker] Lookup file', file);
    q.walkAst(q.src, [
        {
            query: '.moduleSpecifier:StringLiteral',
            callback(ast) {
                const dep = resolve(ast.getText(), file);
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
                            const dep = resolve(lazyModule.slice(0, hashTag), file);
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
                const dep = resolve(ast.parent.arguments[0].getText(), file);
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
                    const dep = resolve(node.arguments[0].getText(), file);
                    if (dep)
                        deps.push(dep);
                }
            }
        }
    ]);
    // q.printAll();
    function resolve(path, file) {
        if (path.startsWith('`')) {
            // tslint:disable-next-line: no-console
            console.log(`[cli-analysie-worker] can not resolve dynamic value ${path} in ${file}`);
            return null;
        }
        path = path.slice(1, -1);
        // console.log('[cli-analysie-worker] resolve', path);
        if (path.startsWith('.')) {
            const ext = path_1.default.extname(path);
            if (ext === '' || /^\.[jt]sx?$/.test(ext)) {
                let resolved = typescript_1.default.resolveModuleName(path, file, co, host, resCache).resolvedModule;
                if (resolved == null) {
                    // tslint:disable-next-line: max-line-length
                    for (const tryPath of [path + '/index', path + '.js', path + '.jsx', path + '/index.js', path + '/index.jsx']) {
                        resolved = typescript_1.default.resolveModuleName(tryPath, file, co, host, resCache).resolvedModule;
                        if (resolved != null)
                            return resolved.resolvedFileName;
                    }
                    // tslint:disable-next-line: no-console
                    console.log(`[cli-analysie-worker] can not resolve ${path} in ${file}`);
                    return null;
                }
                return resolved.resolvedFileName;
            }
        }
        else {
            externalDeps.add(/^((?:@[^/]+\/)?[^/]+)/.exec(path)[1]);
        }
    }
    // console.log('deps:', deps);
    return deps;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFuYWx5c2Utd29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1hbmFseXNlLXdvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSx1Q0FBcUM7QUFFckMseUVBQTBDO0FBQzFDLDRDQUFvQjtBQUNwQiw0REFBNEI7QUFDNUIsZ0RBQXdCO0FBQ3hCLGlDQUFpQztBQUNqQywwQ0FBMkM7QUFDM0MsZ0RBQXFEO0FBQ3JELHNEQUE4RDtBQUM5RCxrRUFBdUQ7QUFHdkQsTUFBTSxnQkFBZ0IsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO0FBQzVFLE1BQU0sV0FBVyxHQUFHLG9CQUFFLENBQUMseUJBQXlCLENBQUMsZ0JBQWdCLEVBQUUsWUFBRSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQzlHLFdBQVcsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7QUFDbEQsTUFBTSxFQUFFLEdBQUcsbUNBQXFCLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUNyRSwrQkFBVyxFQUFFLENBQUM7QUFFZCw0Q0FBMkIsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ3JELE1BQU0sUUFBUSxHQUFHLG9CQUFFLENBQUMsMkJBQTJCLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUN2RCxRQUFRLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFDcEIsRUFBRSxDQUFDLENBQUM7QUFDVixNQUFNLElBQUksR0FBRyxvQkFBRSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBR3ZDLFNBQWdCLGdCQUFnQixDQUFDLEtBQWU7SUFFOUMsTUFBTSxZQUFZLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztJQUN2QyxNQUFNLEdBQUcsR0FBZ0IsSUFBSSxXQUFHLENBQVMsTUFBTSxDQUFDLEVBQUU7UUFDaEQsTUFBTSxDQUFDLEdBQUcsSUFBSSxzQkFBSyxDQUFDLFlBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkUsT0FBTyxTQUFTLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3hELE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxjQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9DLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQzVCLEtBQUssTUFBTSxLQUFLLElBQUksR0FBRyxDQUFDLFNBQVMsRUFBRTtZQUNqQyx1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDNUY7S0FDRjtJQUNELE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUMzQyxDQUFDO0FBbEJELDRDQWtCQztBQUVELFNBQVMsU0FBUyxDQUFDLENBQVEsRUFBRSxJQUFZLEVBQUUsWUFBeUI7SUFDbEUsTUFBTSxJQUFJLEdBQWEsRUFBRSxDQUFDO0lBQzFCLHVDQUF1QztJQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3ZELENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRTtRQUNmO1lBQ0UsS0FBSyxFQUFFLGdDQUFnQztZQUN2QyxRQUFRLENBQUMsR0FBRztnQkFDVixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUUsR0FBd0IsQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDL0QsSUFBSSxHQUFHO29CQUNMLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbkIsQ0FBQztTQUNGO1FBQ0Q7WUFDRSxLQUFLLEVBQUUsMkJBQTJCO1lBQ2xDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU87Z0JBQ3pCLElBQUksR0FBRyxDQUFDLE9BQU8sRUFBRSxLQUFLLGNBQWMsRUFBRTtvQkFDcEMsTUFBTSxLQUFLLEdBQUksR0FBRyxDQUFDLE1BQWdDLENBQUMsV0FBVyxDQUFDO29CQUNoRSxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssb0JBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUFFO3dCQUM5QyxNQUFNLFVBQVUsR0FBSSxLQUEwQixDQUFDLElBQUksQ0FBQzt3QkFDcEQsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDeEMsSUFBSSxPQUFPLEdBQUcsQ0FBQyxFQUFFOzRCQUNmLDZCQUE2Qjs0QkFDN0Isc0NBQXNDOzRCQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxDQUFDOzRCQUM5QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7NEJBQ3hELElBQUksR0FBRztnQ0FDTCxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3lCQUNsQjtxQkFDRjtpQkFDRjtZQUNILENBQUM7U0FDRjtRQUNEO1lBQ0UsS0FBSyxFQUFFLDJDQUEyQztZQUNsRCxRQUFRLENBQUMsR0FBRyxFQUFFLElBQUk7Z0JBQ2hCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBRyxHQUFHLENBQUMsTUFBNEIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFzQixDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUMxRyxJQUFJLEdBQUc7b0JBQ0wsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNuQixDQUFDO1NBQ0Y7UUFDRDtZQUNFLEtBQUssRUFBRSxpQkFBaUI7WUFDeEIsUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJO2dCQUNoQixNQUFNLElBQUksR0FBRyxHQUF3QixDQUFFO2dCQUN2QyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLG9CQUFFLENBQUMsVUFBVSxDQUFDLFVBQVU7b0JBQ2xELElBQUksQ0FBQyxVQUE0QixDQUFDLElBQUksS0FBSyxTQUFTO29CQUNyRCxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxvQkFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUU7b0JBQ3hELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBc0IsQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDN0UsSUFBSSxHQUFHO3dCQUNMLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ2xCO1lBQ0gsQ0FBQztTQUNGO0tBQ0YsQ0FBQyxDQUFDO0lBRUgsZ0JBQWdCO0lBRWhCLFNBQVMsT0FBTyxDQUFDLElBQVksRUFBRSxJQUFZO1FBQ3pDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN4Qix1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1REFBdUQsSUFBSSxPQUFPLElBQUksRUFBRSxDQUFDLENBQUM7WUFDdEYsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pCLHNEQUFzRDtRQUV0RCxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDeEIsTUFBTSxHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsS0FBSyxFQUFFLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDekMsSUFBSSxRQUFRLEdBQUcsb0JBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUMsY0FBYyxDQUFDO2dCQUNuRixJQUFJLFFBQVEsSUFBSSxJQUFJLEVBQUU7b0JBQ3BCLDRDQUE0QztvQkFDNUMsS0FBSyxNQUFNLE9BQU8sSUFBSSxDQUFDLElBQUksR0FBRyxRQUFRLEVBQUUsSUFBSSxHQUFHLEtBQUssRUFBRSxJQUFJLEdBQUcsTUFBTSxFQUFFLElBQUksR0FBRyxXQUFXLEVBQUUsSUFBSSxHQUFHLFlBQVksQ0FBQyxFQUFFO3dCQUM3RyxRQUFRLEdBQUcsb0JBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUMsY0FBYyxDQUFDO3dCQUNsRixJQUFJLFFBQVEsSUFBSSxJQUFJOzRCQUNsQixPQUFPLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQztxQkFDcEM7b0JBQ0QsdUNBQXVDO29CQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLHlDQUF5QyxJQUFJLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQztvQkFDeEUsT0FBTyxJQUFJLENBQUM7aUJBQ2I7Z0JBQ0QsT0FBTyxRQUFRLENBQUMsZ0JBQWdCLENBQUM7YUFDbEM7U0FDRjthQUFNO1lBQ0wsWUFBWSxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUMxRDtJQUNILENBQUM7SUFDRCw4QkFBOEI7SUFDOUIsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInO1xuXG5pbXBvcnQgUXVlcnkgZnJvbSAnLi4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCB7RU9MIGFzIGVvbH0gZnJvbSAnb3MnO1xuaW1wb3J0IHtERlMsIFZlcnRleH0gZnJvbSAnLi4vdXRpbHMvZ3JhcGgnO1xuaW1wb3J0IHtqc29uVG9Db21waWxlck9wdGlvbnN9IGZyb20gJy4uL3RzLWNvbXBpbGVyJztcbmltcG9ydCB7c2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRofSBmcm9tICcuLi9jb25maWctaGFuZGxlcic7XG5pbXBvcnQge2luaXRQcm9jZXNzfSBmcm9tICcuLi91dGlscy9ib290c3RyYXAtcHJvY2Vzcyc7XG5cblxuY29uc3QgYmFzZVRzY29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90c2NvbmZpZy10c3guanNvbicpO1xuY29uc3QgdHN4VHNjb25maWcgPSB0cy5wYXJzZUNvbmZpZ0ZpbGVUZXh0VG9Kc29uKGJhc2VUc2NvbmZpZ0ZpbGUsIGZzLnJlYWRGaWxlU3luYyhiYXNlVHNjb25maWdGaWxlLCAndXRmOCcpKTtcbnRzeFRzY29uZmlnLmNvbmZpZy5jb21waWxlck9wdGlvbnMuYWxsb3dKcyA9IHRydWU7XG5jb25zdCBjbyA9IGpzb25Ub0NvbXBpbGVyT3B0aW9ucyh0c3hUc2NvbmZpZy5jb25maWcuY29tcGlsZXJPcHRpb25zKTtcbmluaXRQcm9jZXNzKCk7XG5cbnNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChwcm9jZXNzLmN3ZCgpLCAnLi8nLCBjbyk7XG5jb25zdCByZXNDYWNoZSA9IHRzLmNyZWF0ZU1vZHVsZVJlc29sdXRpb25DYWNoZShwcm9jZXNzLmN3ZCgpLFxuICAgICAgZmlsZU5hbWUgPT4gZmlsZU5hbWUsXG4gICAgICBjbyk7XG5jb25zdCBob3N0ID0gdHMuY3JlYXRlQ29tcGlsZXJIb3N0KGNvKTtcblxuXG5leHBvcnQgZnVuY3Rpb24gZGZzVHJhdmVyc2VGaWxlcyhmaWxlczogc3RyaW5nW10pIHtcblxuICBjb25zdCBleHRlcm5hbERlcHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgZGZzOiBERlM8c3RyaW5nPiA9IG5ldyBERlM8c3RyaW5nPih2ZXJ0ZXggPT4ge1xuICAgIGNvbnN0IHEgPSBuZXcgUXVlcnkoZnMucmVhZEZpbGVTeW5jKHZlcnRleC5kYXRhLCAndXRmOCcpLCB2ZXJ0ZXguZGF0YSk7XG4gICAgcmV0dXJuIHBhcnNlRmlsZShxLCB2ZXJ0ZXguZGF0YSwgZXh0ZXJuYWxEZXBzKS5tYXAoZmlsZSA9PiB7XG4gICAgICByZXR1cm4gZGZzLnZlcnRleE9mKGZpbGUpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZnMudmlzaXQoZmlsZXMubWFwKGZpbGUgPT4gbmV3IFZlcnRleChmaWxlKSkpO1xuICBpZiAoZGZzLmJhY2tFZGdlcy5sZW5ndGggPiAwKSB7XG4gICAgZm9yIChjb25zdCBlZGdlcyBvZiBkZnMuYmFja0VkZ2VzKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGBGb3VuZCBjeWNsaWMgZmlsZSBkZXBlbmRlbmN5ICR7ZGZzLnByaW50Q3ljbGljQmFja0VkZ2UoZWRnZXNbMF0sIGVkZ2VzWzFdKX1gKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIEFycmF5LmZyb20oZXh0ZXJuYWxEZXBzLnZhbHVlcygpKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VGaWxlKHE6IFF1ZXJ5LCBmaWxlOiBzdHJpbmcsIGV4dGVybmFsRGVwczogU2V0PHN0cmluZz4pIHtcbiAgY29uc3QgZGVwczogc3RyaW5nW10gPSBbXTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCdbY2xpLWFuYWx5c2llLXdvcmtlcl0gTG9va3VwIGZpbGUnLCBmaWxlKTtcbiAgcS53YWxrQXN0KHEuc3JjLCBbXG4gICAge1xuICAgICAgcXVlcnk6ICcubW9kdWxlU3BlY2lmaWVyOlN0cmluZ0xpdGVyYWwnLCAvLyBCb3RoIDpFeHBvcnREZWNsYXJhdGlvbiBvciA6SW1wb3J0RGVjbGFyYXRpb25cbiAgICAgIGNhbGxiYWNrKGFzdCkge1xuICAgICAgICBjb25zdCBkZXAgPSByZXNvbHZlKChhc3QgYXMgdHMuU3RyaW5nTGl0ZXJhbCkuZ2V0VGV4dCgpLCBmaWxlKTtcbiAgICAgICAgaWYgKGRlcClcbiAgICAgICAgICBkZXBzLnB1c2goZGVwKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgIHF1ZXJ5OiAnOlByb3BlcnR5QXNzaWdubWVudD4ubmFtZScsXG4gICAgICBjYWxsYmFjayhhc3QsIHBhdGgsIHBhcmVudHMpIHtcbiAgICAgICAgaWYgKGFzdC5nZXRUZXh0KCkgPT09ICdsb2FkQ2hpbGRyZW4nKSB7XG4gICAgICAgICAgY29uc3QgdmFsdWUgPSAoYXN0LnBhcmVudCBhcyB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnQpLmluaXRpYWxpemVyO1xuICAgICAgICAgIGlmICh2YWx1ZS5raW5kID09PSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICAgIGNvbnN0IGxhenlNb2R1bGUgPSAodmFsdWUgYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dDtcbiAgICAgICAgICAgIGNvbnN0IGhhc2hUYWcgPSBsYXp5TW9kdWxlLmluZGV4T2YoJyMnKTtcbiAgICAgICAgICAgIGlmIChoYXNoVGFnID4gMCkge1xuICAgICAgICAgICAgICAvLyBXZSBmb3VuZCBsYXp5IHJvdXRlIG1vZHVsZVxuICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tY29uc29sZVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbGF6eSByb3V0ZSBtb2R1bGU6JywgbGF6eU1vZHVsZSk7XG4gICAgICAgICAgICAgIGNvbnN0IGRlcCA9IHJlc29sdmUobGF6eU1vZHVsZS5zbGljZSgwLCBoYXNoVGFnKSwgZmlsZSk7XG4gICAgICAgICAgICAgIGlmIChkZXApXG4gICAgICAgICAgICAgICAgZGVwcy5wdXNoKGRlcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICBxdWVyeTogJzpDYWxsRXhwcmVzc2lvbj4uZXhwcmVzc2lvbjpJbXBvcnRLZXl3b3JkJyxcbiAgICAgIGNhbGxiYWNrKGFzdCwgcGF0aCkge1xuICAgICAgICBjb25zdCBkZXAgPSByZXNvbHZlKCgoYXN0LnBhcmVudCBhcyB0cy5DYWxsRXhwcmVzc2lvbikuYXJndW1lbnRzWzBdIGFzIHRzLlN0cmluZ0xpdGVyYWwpLmdldFRleHQoKSwgZmlsZSk7XG4gICAgICAgIGlmIChkZXApXG4gICAgICAgICAgZGVwcy5wdXNoKGRlcCk7XG4gICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICBxdWVyeTogJzpDYWxsRXhwcmVzc2lvbicsXG4gICAgICBjYWxsYmFjayhhc3QsIHBhdGgpIHtcbiAgICAgICAgY29uc3Qgbm9kZSA9IGFzdCBhcyB0cy5DYWxsRXhwcmVzc2lvbiA7XG4gICAgICAgIGlmIChub2RlLmV4cHJlc3Npb24ua2luZCA9PT0gdHMuU3ludGF4S2luZC5JZGVudGlmaWVyICYmXG4gICAgICAgICAgKG5vZGUuZXhwcmVzc2lvbiBhcyB0cy5JZGVudGlmaWVyKS50ZXh0ID09PSAncmVxdWlyZScgJiZcbiAgICAgICAgICBub2RlLmFyZ3VtZW50c1swXS5raW5kID09PSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICBjb25zdCBkZXAgPSByZXNvbHZlKChub2RlLmFyZ3VtZW50c1swXSBhcyB0cy5TdHJpbmdMaXRlcmFsKS5nZXRUZXh0KCksIGZpbGUpO1xuICAgICAgICAgIGlmIChkZXApXG4gICAgICAgICAgICBkZXBzLnB1c2goZGVwKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgXSk7XG5cbiAgLy8gcS5wcmludEFsbCgpO1xuXG4gIGZ1bmN0aW9uIHJlc29sdmUocGF0aDogc3RyaW5nLCBmaWxlOiBzdHJpbmcpIHtcbiAgICBpZiAocGF0aC5zdGFydHNXaXRoKCdgJykpIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coYFtjbGktYW5hbHlzaWUtd29ya2VyXSBjYW4gbm90IHJlc29sdmUgZHluYW1pYyB2YWx1ZSAke3BhdGh9IGluICR7ZmlsZX1gKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBwYXRoID0gcGF0aC5zbGljZSgxLCAtMSk7XG4gICAgLy8gY29uc29sZS5sb2coJ1tjbGktYW5hbHlzaWUtd29ya2VyXSByZXNvbHZlJywgcGF0aCk7XG5cbiAgICBpZiAocGF0aC5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgIGNvbnN0IGV4dCA9IFBhdGguZXh0bmFtZShwYXRoKTtcbiAgICAgIGlmIChleHQgPT09ICcnIHx8IC9eXFwuW2p0XXN4PyQvLnRlc3QoZXh0KSkge1xuICAgICAgICBsZXQgcmVzb2x2ZWQgPSB0cy5yZXNvbHZlTW9kdWxlTmFtZShwYXRoLCBmaWxlLCBjbywgaG9zdCwgcmVzQ2FjaGUpLnJlc29sdmVkTW9kdWxlO1xuICAgICAgICBpZiAocmVzb2x2ZWQgPT0gbnVsbCkge1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbWF4LWxpbmUtbGVuZ3RoXG4gICAgICAgICAgZm9yIChjb25zdCB0cnlQYXRoIG9mIFtwYXRoICsgJy9pbmRleCcsIHBhdGggKyAnLmpzJywgcGF0aCArICcuanN4JywgcGF0aCArICcvaW5kZXguanMnLCBwYXRoICsgJy9pbmRleC5qc3gnXSkge1xuICAgICAgICAgICAgcmVzb2x2ZWQgPSB0cy5yZXNvbHZlTW9kdWxlTmFtZSh0cnlQYXRoLCBmaWxlLCBjbywgaG9zdCwgcmVzQ2FjaGUpLnJlc29sdmVkTW9kdWxlO1xuICAgICAgICAgICAgaWYgKHJlc29sdmVkICE9IG51bGwpXG4gICAgICAgICAgICAgIHJldHVybiByZXNvbHZlZC5yZXNvbHZlZEZpbGVOYW1lO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmxvZyhgW2NsaS1hbmFseXNpZS13b3JrZXJdIGNhbiBub3QgcmVzb2x2ZSAke3BhdGh9IGluICR7ZmlsZX1gKTtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzb2x2ZWQucmVzb2x2ZWRGaWxlTmFtZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZXh0ZXJuYWxEZXBzLmFkZCgvXigoPzpAW14vXStcXC8pP1teL10rKS8uZXhlYyhwYXRoKSFbMV0pO1xuICAgIH1cbiAgfVxuICAvLyBjb25zb2xlLmxvZygnZGVwczonLCBkZXBzKTtcbiAgcmV0dXJuIGRlcHM7XG59XG5cblxuIl19