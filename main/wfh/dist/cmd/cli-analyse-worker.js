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
const baseTsconfigFile = path_1.default.resolve(__dirname, '../../tsconfig-tsx.json');
const tsxTsconfig = typescript_1.default.parseConfigFileTextToJson(baseTsconfigFile, fs_1.default.readFileSync(baseTsconfigFile, 'utf8'));
tsxTsconfig.config.compilerOptions.allowJs = true;
const co = ts_compiler_1.jsonToCompilerOptions(tsxTsconfig.config.compilerOptions);
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
    // tslint:disable-next-line: no-console
    console.log('[cli-analysie-worker] visit', files);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFuYWx5c2Utd29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1hbmFseXNlLXdvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSx1Q0FBcUM7QUFFckMseUVBQTBDO0FBQzFDLDRDQUFvQjtBQUNwQiw0REFBNEI7QUFDNUIsZ0RBQXdCO0FBQ3hCLGlDQUFpQztBQUNqQywwQ0FBMkM7QUFDM0MsZ0RBQXFEO0FBQ3JELHNEQUE4RDtBQUc5RCxNQUFNLGdCQUFnQixHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLHlCQUF5QixDQUFDLENBQUM7QUFDNUUsTUFBTSxXQUFXLEdBQUcsb0JBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxnQkFBZ0IsRUFBRSxZQUFFLENBQUMsWUFBWSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDOUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztBQUNsRCxNQUFNLEVBQUUsR0FBRyxtQ0FBcUIsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBRXJFLDRDQUEyQixDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDckQsTUFBTSxRQUFRLEdBQUcsb0JBQUUsQ0FBQywyQkFBMkIsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQ3ZELFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUNwQixFQUFFLENBQUMsQ0FBQztBQUNWLE1BQU0sSUFBSSxHQUFHLG9CQUFFLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLENBQUM7QUFHdkMsU0FBZ0IsZ0JBQWdCLENBQUMsS0FBZTtJQUU5QyxNQUFNLFlBQVksR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO0lBQ3ZDLE1BQU0sR0FBRyxHQUFnQixJQUFJLFdBQUcsQ0FBUyxNQUFNLENBQUMsRUFBRTtRQUNoRCxNQUFNLENBQUMsR0FBRyxJQUFJLHNCQUFLLENBQUMsWUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2RSxPQUFPLFNBQVMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDeEQsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDSCx1Q0FBdUM7SUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNsRCxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLGNBQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0MsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDNUIsS0FBSyxNQUFNLEtBQUssSUFBSSxHQUFHLENBQUMsU0FBUyxFQUFFO1lBQ2pDLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGdDQUFnQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUM1RjtLQUNGO0lBQ0QsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQzNDLENBQUM7QUFuQkQsNENBbUJDO0FBRUQsU0FBUyxTQUFTLENBQUMsQ0FBUSxFQUFFLElBQVksRUFBRSxZQUF5QjtJQUNsRSxNQUFNLElBQUksR0FBYSxFQUFFLENBQUM7SUFDMUIsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQW1DLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdkQsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFO1FBQ2Y7WUFDRSxLQUFLLEVBQUUsZ0NBQWdDO1lBQ3ZDLFFBQVEsQ0FBQyxHQUFHO2dCQUNWLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBRSxHQUF3QixDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUMvRCxJQUFJLEdBQUc7b0JBQ0wsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNuQixDQUFDO1NBQ0Y7UUFDRDtZQUNFLEtBQUssRUFBRSwyQkFBMkI7WUFDbEMsUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsT0FBTztnQkFDekIsSUFBSSxHQUFHLENBQUMsT0FBTyxFQUFFLEtBQUssY0FBYyxFQUFFO29CQUNwQyxNQUFNLEtBQUssR0FBSSxHQUFHLENBQUMsTUFBZ0MsQ0FBQyxXQUFXLENBQUM7b0JBQ2hFLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxvQkFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUU7d0JBQzlDLE1BQU0sVUFBVSxHQUFJLEtBQTBCLENBQUMsSUFBSSxDQUFDO3dCQUNwRCxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUN4QyxJQUFJLE9BQU8sR0FBRyxDQUFDLEVBQUU7NEJBQ2YsNkJBQTZCOzRCQUM3QixzQ0FBc0M7NEJBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLENBQUM7NEJBQzlDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQzs0QkFDeEQsSUFBSSxHQUFHO2dDQUNMLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7eUJBQ2xCO3FCQUNGO2lCQUNGO1lBQ0gsQ0FBQztTQUNGO1FBQ0Q7WUFDRSxLQUFLLEVBQUUsMkNBQTJDO1lBQ2xELFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSTtnQkFDaEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFHLEdBQUcsQ0FBQyxNQUE0QixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQXNCLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQzFHLElBQUksR0FBRztvQkFDTCxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ25CLENBQUM7U0FDRjtRQUNEO1lBQ0UsS0FBSyxFQUFFLGlCQUFpQjtZQUN4QixRQUFRLENBQUMsR0FBRyxFQUFFLElBQUk7Z0JBQ2hCLE1BQU0sSUFBSSxHQUFHLEdBQXdCLENBQUU7Z0JBQ3ZDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUssb0JBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVTtvQkFDbEQsSUFBSSxDQUFDLFVBQTRCLENBQUMsSUFBSSxLQUFLLFNBQVM7b0JBQ3JELElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLG9CQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBRTtvQkFDeEQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFzQixDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUM3RSxJQUFJLEdBQUc7d0JBQ0wsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDbEI7WUFDSCxDQUFDO1NBQ0Y7S0FDRixDQUFDLENBQUM7SUFFSCxnQkFBZ0I7SUFFaEIsU0FBUyxPQUFPLENBQUMsSUFBWSxFQUFFLElBQVk7UUFDekMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3hCLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLHVEQUF1RCxJQUFJLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQztZQUN0RixPQUFPLElBQUksQ0FBQztTQUNiO1FBQ0QsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekIsc0RBQXNEO1FBRXRELElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN4QixNQUFNLEdBQUcsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQy9CLElBQUksR0FBRyxLQUFLLEVBQUUsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUN6QyxJQUFJLFFBQVEsR0FBRyxvQkFBRSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQyxjQUFjLENBQUM7Z0JBQ25GLElBQUksUUFBUSxJQUFJLElBQUksRUFBRTtvQkFDcEIsNENBQTRDO29CQUM1QyxLQUFLLE1BQU0sT0FBTyxJQUFJLENBQUMsSUFBSSxHQUFHLFFBQVEsRUFBRSxJQUFJLEdBQUcsS0FBSyxFQUFFLElBQUksR0FBRyxNQUFNLEVBQUUsSUFBSSxHQUFHLFdBQVcsRUFBRSxJQUFJLEdBQUcsWUFBWSxDQUFDLEVBQUU7d0JBQzdHLFFBQVEsR0FBRyxvQkFBRSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQyxjQUFjLENBQUM7d0JBQ2xGLElBQUksUUFBUSxJQUFJLElBQUk7NEJBQ2xCLE9BQU8sUUFBUSxDQUFDLGdCQUFnQixDQUFDO3FCQUNwQztvQkFDRCx1Q0FBdUM7b0JBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMseUNBQXlDLElBQUksT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDO29CQUN4RSxPQUFPLElBQUksQ0FBQztpQkFDYjtnQkFDRCxPQUFPLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQzthQUNsQztTQUNGO2FBQU07WUFDTCxZQUFZLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzFEO0lBQ0gsQ0FBQztJQUNELDhCQUE4QjtJQUM5QixPQUFPLElBQUksQ0FBQztBQUNkLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3Rlcic7XG5cbmltcG9ydCBRdWVyeSBmcm9tICcuLi91dGlscy90cy1hc3QtcXVlcnknO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0IHtFT0wgYXMgZW9sfSBmcm9tICdvcyc7XG5pbXBvcnQge0RGUywgVmVydGV4fSBmcm9tICcuLi91dGlscy9ncmFwaCc7XG5pbXBvcnQge2pzb25Ub0NvbXBpbGVyT3B0aW9uc30gZnJvbSAnLi4vdHMtY29tcGlsZXInO1xuaW1wb3J0IHtzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGh9IGZyb20gJy4uL2NvbmZpZy1oYW5kbGVyJztcblxuXG5jb25zdCBiYXNlVHNjb25maWdGaWxlID0gUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzY29uZmlnLXRzeC5qc29uJyk7XG5jb25zdCB0c3hUc2NvbmZpZyA9IHRzLnBhcnNlQ29uZmlnRmlsZVRleHRUb0pzb24oYmFzZVRzY29uZmlnRmlsZSwgZnMucmVhZEZpbGVTeW5jKGJhc2VUc2NvbmZpZ0ZpbGUsICd1dGY4JykpO1xudHN4VHNjb25maWcuY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5hbGxvd0pzID0gdHJ1ZTtcbmNvbnN0IGNvID0ganNvblRvQ29tcGlsZXJPcHRpb25zKHRzeFRzY29uZmlnLmNvbmZpZy5jb21waWxlck9wdGlvbnMpO1xuXG5zZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgocHJvY2Vzcy5jd2QoKSwgJy4vJywgY28pO1xuY29uc3QgcmVzQ2FjaGUgPSB0cy5jcmVhdGVNb2R1bGVSZXNvbHV0aW9uQ2FjaGUocHJvY2Vzcy5jd2QoKSxcbiAgICAgIGZpbGVOYW1lID0+IGZpbGVOYW1lLFxuICAgICAgY28pO1xuY29uc3QgaG9zdCA9IHRzLmNyZWF0ZUNvbXBpbGVySG9zdChjbyk7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGRmc1RyYXZlcnNlRmlsZXMoZmlsZXM6IHN0cmluZ1tdKSB7XG5cbiAgY29uc3QgZXh0ZXJuYWxEZXBzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IGRmczogREZTPHN0cmluZz4gPSBuZXcgREZTPHN0cmluZz4odmVydGV4ID0+IHtcbiAgICBjb25zdCBxID0gbmV3IFF1ZXJ5KGZzLnJlYWRGaWxlU3luYyh2ZXJ0ZXguZGF0YSwgJ3V0ZjgnKSwgdmVydGV4LmRhdGEpO1xuICAgIHJldHVybiBwYXJzZUZpbGUocSwgdmVydGV4LmRhdGEsIGV4dGVybmFsRGVwcykubWFwKGZpbGUgPT4ge1xuICAgICAgcmV0dXJuIGRmcy52ZXJ0ZXhPZihmaWxlKTtcbiAgICB9KTtcbiAgfSk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZygnW2NsaS1hbmFseXNpZS13b3JrZXJdIHZpc2l0JywgZmlsZXMpO1xuICBkZnMudmlzaXQoZmlsZXMubWFwKGZpbGUgPT4gbmV3IFZlcnRleChmaWxlKSkpO1xuICBpZiAoZGZzLmJhY2tFZGdlcy5sZW5ndGggPiAwKSB7XG4gICAgZm9yIChjb25zdCBlZGdlcyBvZiBkZnMuYmFja0VkZ2VzKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGBGb3VuZCBjeWNsaWMgZmlsZSBkZXBlbmRlbmN5ICR7ZGZzLnByaW50Q3ljbGljQmFja0VkZ2UoZWRnZXNbMF0sIGVkZ2VzWzFdKX1gKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIEFycmF5LmZyb20oZXh0ZXJuYWxEZXBzLnZhbHVlcygpKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VGaWxlKHE6IFF1ZXJ5LCBmaWxlOiBzdHJpbmcsIGV4dGVybmFsRGVwczogU2V0PHN0cmluZz4pIHtcbiAgY29uc3QgZGVwczogc3RyaW5nW10gPSBbXTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCdbY2xpLWFuYWx5c2llLXdvcmtlcl0gTG9va3VwIGZpbGUnLCBmaWxlKTtcbiAgcS53YWxrQXN0KHEuc3JjLCBbXG4gICAge1xuICAgICAgcXVlcnk6ICcubW9kdWxlU3BlY2lmaWVyOlN0cmluZ0xpdGVyYWwnLCAvLyBCb3RoIDpFeHBvcnREZWNsYXJhdGlvbiBvciA6SW1wb3J0RGVjbGFyYXRpb25cbiAgICAgIGNhbGxiYWNrKGFzdCkge1xuICAgICAgICBjb25zdCBkZXAgPSByZXNvbHZlKChhc3QgYXMgdHMuU3RyaW5nTGl0ZXJhbCkuZ2V0VGV4dCgpLCBmaWxlKTtcbiAgICAgICAgaWYgKGRlcClcbiAgICAgICAgICBkZXBzLnB1c2goZGVwKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgIHF1ZXJ5OiAnOlByb3BlcnR5QXNzaWdubWVudD4ubmFtZScsXG4gICAgICBjYWxsYmFjayhhc3QsIHBhdGgsIHBhcmVudHMpIHtcbiAgICAgICAgaWYgKGFzdC5nZXRUZXh0KCkgPT09ICdsb2FkQ2hpbGRyZW4nKSB7XG4gICAgICAgICAgY29uc3QgdmFsdWUgPSAoYXN0LnBhcmVudCBhcyB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnQpLmluaXRpYWxpemVyO1xuICAgICAgICAgIGlmICh2YWx1ZS5raW5kID09PSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICAgIGNvbnN0IGxhenlNb2R1bGUgPSAodmFsdWUgYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dDtcbiAgICAgICAgICAgIGNvbnN0IGhhc2hUYWcgPSBsYXp5TW9kdWxlLmluZGV4T2YoJyMnKTtcbiAgICAgICAgICAgIGlmIChoYXNoVGFnID4gMCkge1xuICAgICAgICAgICAgICAvLyBXZSBmb3VuZCBsYXp5IHJvdXRlIG1vZHVsZVxuICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tY29uc29sZVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbGF6eSByb3V0ZSBtb2R1bGU6JywgbGF6eU1vZHVsZSk7XG4gICAgICAgICAgICAgIGNvbnN0IGRlcCA9IHJlc29sdmUobGF6eU1vZHVsZS5zbGljZSgwLCBoYXNoVGFnKSwgZmlsZSk7XG4gICAgICAgICAgICAgIGlmIChkZXApXG4gICAgICAgICAgICAgICAgZGVwcy5wdXNoKGRlcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICBxdWVyeTogJzpDYWxsRXhwcmVzc2lvbj4uZXhwcmVzc2lvbjpJbXBvcnRLZXl3b3JkJyxcbiAgICAgIGNhbGxiYWNrKGFzdCwgcGF0aCkge1xuICAgICAgICBjb25zdCBkZXAgPSByZXNvbHZlKCgoYXN0LnBhcmVudCBhcyB0cy5DYWxsRXhwcmVzc2lvbikuYXJndW1lbnRzWzBdIGFzIHRzLlN0cmluZ0xpdGVyYWwpLmdldFRleHQoKSwgZmlsZSk7XG4gICAgICAgIGlmIChkZXApXG4gICAgICAgICAgZGVwcy5wdXNoKGRlcCk7XG4gICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICBxdWVyeTogJzpDYWxsRXhwcmVzc2lvbicsXG4gICAgICBjYWxsYmFjayhhc3QsIHBhdGgpIHtcbiAgICAgICAgY29uc3Qgbm9kZSA9IGFzdCBhcyB0cy5DYWxsRXhwcmVzc2lvbiA7XG4gICAgICAgIGlmIChub2RlLmV4cHJlc3Npb24ua2luZCA9PT0gdHMuU3ludGF4S2luZC5JZGVudGlmaWVyICYmXG4gICAgICAgICAgKG5vZGUuZXhwcmVzc2lvbiBhcyB0cy5JZGVudGlmaWVyKS50ZXh0ID09PSAncmVxdWlyZScgJiZcbiAgICAgICAgICBub2RlLmFyZ3VtZW50c1swXS5raW5kID09PSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICBjb25zdCBkZXAgPSByZXNvbHZlKChub2RlLmFyZ3VtZW50c1swXSBhcyB0cy5TdHJpbmdMaXRlcmFsKS5nZXRUZXh0KCksIGZpbGUpO1xuICAgICAgICAgIGlmIChkZXApXG4gICAgICAgICAgICBkZXBzLnB1c2goZGVwKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgXSk7XG5cbiAgLy8gcS5wcmludEFsbCgpO1xuXG4gIGZ1bmN0aW9uIHJlc29sdmUocGF0aDogc3RyaW5nLCBmaWxlOiBzdHJpbmcpIHtcbiAgICBpZiAocGF0aC5zdGFydHNXaXRoKCdgJykpIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coYFtjbGktYW5hbHlzaWUtd29ya2VyXSBjYW4gbm90IHJlc29sdmUgZHluYW1pYyB2YWx1ZSAke3BhdGh9IGluICR7ZmlsZX1gKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBwYXRoID0gcGF0aC5zbGljZSgxLCAtMSk7XG4gICAgLy8gY29uc29sZS5sb2coJ1tjbGktYW5hbHlzaWUtd29ya2VyXSByZXNvbHZlJywgcGF0aCk7XG5cbiAgICBpZiAocGF0aC5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgIGNvbnN0IGV4dCA9IFBhdGguZXh0bmFtZShwYXRoKTtcbiAgICAgIGlmIChleHQgPT09ICcnIHx8IC9eXFwuW2p0XXN4PyQvLnRlc3QoZXh0KSkge1xuICAgICAgICBsZXQgcmVzb2x2ZWQgPSB0cy5yZXNvbHZlTW9kdWxlTmFtZShwYXRoLCBmaWxlLCBjbywgaG9zdCwgcmVzQ2FjaGUpLnJlc29sdmVkTW9kdWxlO1xuICAgICAgICBpZiAocmVzb2x2ZWQgPT0gbnVsbCkge1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbWF4LWxpbmUtbGVuZ3RoXG4gICAgICAgICAgZm9yIChjb25zdCB0cnlQYXRoIG9mIFtwYXRoICsgJy9pbmRleCcsIHBhdGggKyAnLmpzJywgcGF0aCArICcuanN4JywgcGF0aCArICcvaW5kZXguanMnLCBwYXRoICsgJy9pbmRleC5qc3gnXSkge1xuICAgICAgICAgICAgcmVzb2x2ZWQgPSB0cy5yZXNvbHZlTW9kdWxlTmFtZSh0cnlQYXRoLCBmaWxlLCBjbywgaG9zdCwgcmVzQ2FjaGUpLnJlc29sdmVkTW9kdWxlO1xuICAgICAgICAgICAgaWYgKHJlc29sdmVkICE9IG51bGwpXG4gICAgICAgICAgICAgIHJldHVybiByZXNvbHZlZC5yZXNvbHZlZEZpbGVOYW1lO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmxvZyhgW2NsaS1hbmFseXNpZS13b3JrZXJdIGNhbiBub3QgcmVzb2x2ZSAke3BhdGh9IGluICR7ZmlsZX1gKTtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzb2x2ZWQucmVzb2x2ZWRGaWxlTmFtZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZXh0ZXJuYWxEZXBzLmFkZCgvXigoPzpAW14vXStcXC8pP1teL10rKS8uZXhlYyhwYXRoKSFbMV0pO1xuICAgIH1cbiAgfVxuICAvLyBjb25zb2xlLmxvZygnZGVwczonLCBkZXBzKTtcbiAgcmV0dXJuIGRlcHM7XG59XG5cblxuIl19