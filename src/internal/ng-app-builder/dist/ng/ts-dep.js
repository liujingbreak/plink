"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const ts_ast_query_1 = tslib_1.__importDefault(require("../utils/ts-ast-query"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const typescript_1 = tslib_1.__importDefault(require("typescript"));
const path_1 = tslib_1.__importDefault(require("path"));
class TsDependencyGraph {
    constructor(co, fileReplacements = []) {
        this.co = co;
        // unresolved: Array<{module: string, srcFile: string}> = [];
        this.walked = new Set();
        this.toWalk = [];
        this.replacements = new Map();
        fileReplacements.forEach(pair => {
            this.replacements.set(path_1.default.resolve(pair.replace || pair.src).replace(/\\/g, '/'), path_1.default.resolve(pair.with || pair.replaceWidth).replace(/\\/g, '/'));
        });
        this.resCache = typescript_1.default.createModuleResolutionCache(process.cwd(), fileName => fileName, co);
        this.host = typescript_1.default.createCompilerHost(co);
    }
    /**
     * @param file must be absolute path
     */
    walkForDependencies(file) {
        this.toWalk.push(file);
        this._walk();
    }
    _walk() {
        const resolve = (path, file) => {
            const resolved = typescript_1.default.resolveModuleName(path, file, this.co, this.host, this.resCache).resolvedModule;
            if (resolved) {
                const dep = resolved.resolvedFileName;
                if (dep.endsWith('.ts') && !dep.endsWith('.d.ts') && !this.walked.has(dep)) {
                    this.walked.add(dep);
                    this.toWalk.push(dep);
                }
            }
            else {
                // this.unresolved.push({module: path, srcFile: file});
                // TODO: log unresolved
            }
        };
        while (this.toWalk.length > 0) {
            const file = this.toWalk.shift();
            const replaced = this.replacements.get(file);
            const q = new ts_ast_query_1.default(fs_1.default.readFileSync(replaced || file, 'utf8'), file);
            q.walkAst(q.src, [
                {
                    query: '.moduleSpecifier:StringLiteral',
                    callback(ast) {
                        resolve(ast.text, file);
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
                                    resolve(lazyModule.slice(0, hashTag), file);
                                }
                            }
                        }
                    }
                }
            ]);
        }
    }
}
exports.default = TsDependencyGraph;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy90cy1kZXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsaUZBQTBDO0FBQzFDLG9EQUFvQjtBQUNwQixvRUFBNEI7QUFDNUIsd0RBQXdCO0FBRXhCLE1BQXFCLGlCQUFpQjtJQVFwQyxZQUFvQixFQUFzQixFQUN4QyxtQkFBOEYsRUFBRTtRQUQ5RSxPQUFFLEdBQUYsRUFBRSxDQUFvQjtRQVAxQyw2REFBNkQ7UUFDN0QsV0FBTSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFDM0IsV0FBTSxHQUFhLEVBQUUsQ0FBQztRQUdkLGlCQUFZLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFLN0MsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzlCLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUNuQixjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLEdBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQzNELGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsWUFBYSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3ZFLENBQUMsQ0FBQyxDQUFDO1FBQ0wsSUFBSSxDQUFDLFFBQVEsR0FBRyxvQkFBRSxDQUFDLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFDMUQsUUFBUSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQ3BCLEVBQUUsQ0FBQyxDQUFDO1FBQ04sSUFBSSxDQUFDLElBQUksR0FBRyxvQkFBRSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRDs7T0FFRztJQUNILG1CQUFtQixDQUFDLElBQVk7UUFDOUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkIsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ2YsQ0FBQztJQUVPLEtBQUs7UUFDWCxNQUFNLE9BQU8sR0FBRyxDQUFDLElBQVksRUFBRSxJQUFZLEVBQUUsRUFBRTtZQUM3QyxNQUFNLFFBQVEsR0FBRyxvQkFBRSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxjQUFjLENBQUM7WUFDcEcsSUFBSSxRQUFRLEVBQUU7Z0JBQ1osTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixDQUFDO2dCQUN0QyxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQzFFLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNyQixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDdkI7YUFDRjtpQkFBTTtnQkFDTCx1REFBdUQ7Z0JBQ3ZELHVCQUF1QjthQUN4QjtRQUNILENBQUMsQ0FBQztRQUVGLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQzdCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFHLENBQUM7WUFDbEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0MsTUFBTSxDQUFDLEdBQUcsSUFBSSxzQkFBSyxDQUFDLFlBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxJQUFJLElBQUksRUFBRyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUV0RSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUU7Z0JBQ2Y7b0JBQ0UsS0FBSyxFQUFFLGdDQUFnQztvQkFDdkMsUUFBUSxDQUFDLEdBQUc7d0JBQ1YsT0FBTyxDQUFFLEdBQXdCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUNoRCxDQUFDO2lCQUNGO2dCQUNEO29CQUNFLEtBQUssRUFBRSwyQkFBMkI7b0JBQ2xDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU87d0JBQ3pCLElBQUksR0FBRyxDQUFDLE9BQU8sRUFBRSxLQUFLLGNBQWMsRUFBRTs0QkFDcEMsTUFBTSxLQUFLLEdBQUksR0FBRyxDQUFDLE1BQWdDLENBQUMsV0FBVyxDQUFDOzRCQUNoRSxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssb0JBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUFFO2dDQUM5QyxNQUFNLFVBQVUsR0FBSSxLQUEwQixDQUFDLElBQUksQ0FBQztnQ0FDcEQsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQ0FDeEMsSUFBSSxPQUFPLEdBQUcsQ0FBQyxFQUFFO29DQUNmLDZCQUE2QjtvQ0FDN0Isc0NBQXNDO29DQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxDQUFDO29DQUM5QyxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7aUNBQzdDOzZCQUNGO3lCQUNGO29CQUNILENBQUM7aUJBQ0Y7YUFDRixDQUFDLENBQUM7U0FDSjtJQUNILENBQUM7Q0FFRjtBQS9FRCxvQ0ErRUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmcvdHMtZGVwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFF1ZXJ5IGZyb20gJy4uL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRzRGVwZW5kZW5jeUdyYXBoIHtcbiAgLy8gdW5yZXNvbHZlZDogQXJyYXk8e21vZHVsZTogc3RyaW5nLCBzcmNGaWxlOiBzdHJpbmd9PiA9IFtdO1xuICB3YWxrZWQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgdG9XYWxrOiBzdHJpbmdbXSA9IFtdO1xuICBwcml2YXRlIHJlc0NhY2hlOiB0cy5Nb2R1bGVSZXNvbHV0aW9uQ2FjaGU7XG4gIHByaXZhdGUgaG9zdDogdHMuQ29tcGlsZXJIb3N0O1xuICBwcml2YXRlIHJlcGxhY2VtZW50cyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBjbzogdHMuQ29tcGlsZXJPcHRpb25zLFxuICAgIGZpbGVSZXBsYWNlbWVudHM6IHtyZXBsYWNlPzogc3RyaW5nLCBzcmM/OiBzdHJpbmcsICB3aXRoPzogc3RyaW5nLCByZXBsYWNlV2lkdGg/OiBzdHJpbmd9W10gPSBbXSkge1xuXG4gICAgICBmaWxlUmVwbGFjZW1lbnRzLmZvckVhY2gocGFpciA9PiB7XG4gICAgICAgIHRoaXMucmVwbGFjZW1lbnRzLnNldChcbiAgICAgICAgICBQYXRoLnJlc29sdmUocGFpci5yZXBsYWNlIHx8IHBhaXIuc3JjISkucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgICAgICAgIFBhdGgucmVzb2x2ZShwYWlyLndpdGggfHwgcGFpci5yZXBsYWNlV2lkdGghKS5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuICAgICAgfSk7XG4gICAgdGhpcy5yZXNDYWNoZSA9IHRzLmNyZWF0ZU1vZHVsZVJlc29sdXRpb25DYWNoZShwcm9jZXNzLmN3ZCgpLFxuICAgICAgZmlsZU5hbWUgPT4gZmlsZU5hbWUsXG4gICAgICBjbyk7XG4gICAgdGhpcy5ob3N0ID0gdHMuY3JlYXRlQ29tcGlsZXJIb3N0KGNvKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0gZmlsZSBtdXN0IGJlIGFic29sdXRlIHBhdGhcbiAgICovXG4gIHdhbGtGb3JEZXBlbmRlbmNpZXMoZmlsZTogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy50b1dhbGsucHVzaChmaWxlKTtcbiAgICB0aGlzLl93YWxrKCk7XG4gIH1cblxuICBwcml2YXRlIF93YWxrKCkge1xuICAgIGNvbnN0IHJlc29sdmUgPSAocGF0aDogc3RyaW5nLCBmaWxlOiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IHJlc29sdmVkID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUocGF0aCwgZmlsZSwgdGhpcy5jbywgdGhpcy5ob3N0LCB0aGlzLnJlc0NhY2hlKS5yZXNvbHZlZE1vZHVsZTtcbiAgICAgIGlmIChyZXNvbHZlZCkge1xuICAgICAgICBjb25zdCBkZXAgPSByZXNvbHZlZC5yZXNvbHZlZEZpbGVOYW1lO1xuICAgICAgICBpZiAoZGVwLmVuZHNXaXRoKCcudHMnKSAmJiAhZGVwLmVuZHNXaXRoKCcuZC50cycpICYmICF0aGlzLndhbGtlZC5oYXMoZGVwKSkge1xuICAgICAgICAgIHRoaXMud2Fsa2VkLmFkZChkZXApO1xuICAgICAgICAgIHRoaXMudG9XYWxrLnB1c2goZGVwKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gdGhpcy51bnJlc29sdmVkLnB1c2goe21vZHVsZTogcGF0aCwgc3JjRmlsZTogZmlsZX0pO1xuICAgICAgICAvLyBUT0RPOiBsb2cgdW5yZXNvbHZlZFxuICAgICAgfVxuICAgIH07XG5cbiAgICB3aGlsZSAodGhpcy50b1dhbGsubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgZmlsZSA9IHRoaXMudG9XYWxrLnNoaWZ0KCkhO1xuICAgICAgY29uc3QgcmVwbGFjZWQgPSB0aGlzLnJlcGxhY2VtZW50cy5nZXQoZmlsZSk7XG4gICAgICBjb25zdCBxID0gbmV3IFF1ZXJ5KGZzLnJlYWRGaWxlU3luYyhyZXBsYWNlZCB8fCBmaWxlICwgJ3V0ZjgnKSwgZmlsZSk7XG5cbiAgICAgIHEud2Fsa0FzdChxLnNyYywgW1xuICAgICAgICB7XG4gICAgICAgICAgcXVlcnk6ICcubW9kdWxlU3BlY2lmaWVyOlN0cmluZ0xpdGVyYWwnLCAvLyBCb3RoIDpFeHBvcnREZWNsYXJhdGlvbiBvciA6SW1wb3J0RGVjbGFyYXRpb25cbiAgICAgICAgICBjYWxsYmFjayhhc3QpIHtcbiAgICAgICAgICAgIHJlc29sdmUoKGFzdCBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0LCBmaWxlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBxdWVyeTogJzpQcm9wZXJ0eUFzc2lnbm1lbnQ+Lm5hbWUnLFxuICAgICAgICAgIGNhbGxiYWNrKGFzdCwgcGF0aCwgcGFyZW50cykge1xuICAgICAgICAgICAgaWYgKGFzdC5nZXRUZXh0KCkgPT09ICdsb2FkQ2hpbGRyZW4nKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gKGFzdC5wYXJlbnQgYXMgdHMuUHJvcGVydHlBc3NpZ25tZW50KS5pbml0aWFsaXplcjtcbiAgICAgICAgICAgICAgaWYgKHZhbHVlLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU3RyaW5nTGl0ZXJhbCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGxhenlNb2R1bGUgPSAodmFsdWUgYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dDtcbiAgICAgICAgICAgICAgICBjb25zdCBoYXNoVGFnID0gbGF6eU1vZHVsZS5pbmRleE9mKCcjJyk7XG4gICAgICAgICAgICAgICAgaWYgKGhhc2hUYWcgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAvLyBXZSBmb3VuZCBsYXp5IHJvdXRlIG1vZHVsZVxuICAgICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdsYXp5IHJvdXRlIG1vZHVsZTonLCBsYXp5TW9kdWxlKTtcbiAgICAgICAgICAgICAgICAgIHJlc29sdmUobGF6eU1vZHVsZS5zbGljZSgwLCBoYXNoVGFnKSwgZmlsZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBdKTtcbiAgICB9XG4gIH1cblxufVxuIl19
