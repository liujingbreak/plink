"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const ts_ast_query_1 = tslib_1.__importDefault(require("./ts-ast-query"));
const Path = tslib_1.__importStar(require("path"));
// import {readTsConfig} from 'dr-comp-package/wfh/dist/ts-compiler';
function resolveImportBindName(src, modulePath, propertyName, resolveFn) {
    let resolvedModulePath;
    const selector = new ts_ast_query_1.default(src);
    if (resolveFn) {
        resolvedModulePath = resolveFn(modulePath, src.fileName);
    }
    else {
        resolvedModulePath = defaultResolveModule(modulePath, src.fileName);
    }
    const importDecAsts = [];
    selector.findAll(':ImportDeclaration > .moduleSpecifier')
        .forEach((moduleSpecifier) => {
        const text = moduleSpecifier.getText(src).slice(1, -1);
        let resolved;
        if (resolveFn) {
            resolved = resolveFn(text, src.fileName);
        }
        else {
            resolved = defaultResolveModule(text, src.fileName);
        }
        if (resolved && resolved === resolvedModulePath) {
            importDecAsts.push(moduleSpecifier.parent);
        }
    });
    if (!importDecAsts || importDecAsts.length === 0)
        return undefined;
    let refName;
    for (const importDecAst of importDecAsts) {
        refName = selector.findWith(importDecAst, '.importClause > .namedBindings > .elements', (ast) => {
            if (ast.propertyName) {
                if (ast.propertyName.getText() === propertyName)
                    return ast.name.getText();
            }
            else if (ast.name && ast.name.getText() === propertyName) {
                return ast.name.getText();
            }
        });
        if (refName)
            break;
        refName = selector.findWith(importDecAst, '.importClause > .namedBindings:NamespaceImport > .name:Identifier', (ast) => {
            return ast.getText() + '.' + propertyName;
        });
        if (refName)
            break;
    }
    return refName;
}
exports.resolveImportBindName = resolveImportBindName;
/**
 * This function does not intent to be fully conform to real TS or JS module resolve logic
 * @param targetPath
 * @param currFile
 */
function defaultResolveModule(targetPath, currFile) {
    if (/^\.\.?\//.test(targetPath)) {
        const absPath = Path.resolve(Path.dirname(currFile), targetPath).replace(/\\/g, '/');
        return absPath;
    }
    else {
        return Path.resolve(process.cwd(), 'node_modules', targetPath).replace(/\\/g, '/');
    }
}
exports.defaultResolveModule = defaultResolveModule;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy91dGlscy90cy1hc3QtdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSwwRUFBc0M7QUFDdEMsbURBQTZCO0FBQzdCLHFFQUFxRTtBQUVyRSxTQUFnQixxQkFBcUIsQ0FBQyxHQUFrQixFQUFFLFVBQWtCLEVBQUUsWUFBb0IsRUFDakcsU0FBNEQ7SUFFNUQsSUFBSSxrQkFBMEIsQ0FBQztJQUMvQixNQUFNLFFBQVEsR0FBRyxJQUFJLHNCQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbkMsSUFBSSxTQUFTLEVBQUU7UUFDZCxrQkFBa0IsR0FBRyxTQUFTLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUN6RDtTQUFNO1FBQ04sa0JBQWtCLEdBQUcsb0JBQW9CLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUNwRTtJQUNELE1BQU0sYUFBYSxHQUEyQixFQUFFLENBQUM7SUFDakQsUUFBUSxDQUFDLE9BQU8sQ0FBQyx1Q0FBdUMsQ0FBQztTQUN4RCxPQUFPLENBQUMsQ0FBQyxlQUFpQyxFQUFFLEVBQUU7UUFDOUMsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkQsSUFBSSxRQUFnQixDQUFDO1FBQ3JCLElBQUksU0FBUyxFQUFFO1lBQ2QsUUFBUSxHQUFHLFNBQVMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ3pDO2FBQU07WUFDTixRQUFRLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUNwRDtRQUNELElBQUksUUFBUSxJQUFJLFFBQVEsS0FBSyxrQkFBa0IsRUFBRTtZQUNoRCxhQUFhLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUE4QixDQUFDLENBQUM7U0FDbkU7SUFDRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxhQUFhLElBQUksYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDO1FBQy9DLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLElBQUksT0FBa0MsQ0FBQztJQUN2QyxLQUFLLE1BQU0sWUFBWSxJQUFJLGFBQWEsRUFBRTtRQUN6QyxPQUFPLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsNENBQTRDLEVBQUUsQ0FBQyxHQUF1QixFQUFFLEVBQUU7WUFDbkgsSUFBSSxHQUFHLENBQUMsWUFBWSxFQUFFO2dCQUNyQixJQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLEtBQUssWUFBWTtvQkFDOUMsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2FBQzNCO2lCQUFNLElBQUksR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLFlBQVksRUFBRTtnQkFDM0QsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2FBQzFCO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLE9BQU87WUFDVixNQUFNO1FBQ1AsT0FBTyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLG1FQUFtRSxFQUM1RyxDQUFDLEdBQWtCLEVBQUUsRUFBRTtZQUN0QixPQUFPLEdBQUcsQ0FBQyxPQUFPLEVBQUUsR0FBRyxHQUFHLEdBQUcsWUFBWSxDQUFDO1FBQzNDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxPQUFPO1lBQ1YsTUFBTTtLQUNQO0lBQ0QsT0FBTyxPQUFPLENBQUM7QUFDaEIsQ0FBQztBQS9DRCxzREErQ0M7QUFFRDs7OztHQUlHO0FBQ0gsU0FBZ0Isb0JBQW9CLENBQUMsVUFBa0IsRUFBRSxRQUFnQjtJQUN4RSxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDaEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDckYsT0FBTyxPQUFPLENBQUM7S0FDZjtTQUFNO1FBQ04sT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxjQUFjLEVBQUUsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztLQUNuRjtBQUNGLENBQUM7QUFQRCxvREFPQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC91dGlscy90cy1hc3QtdXRpbC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IFNlbGVjdG9yIGZyb20gJy4vdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG4vLyBpbXBvcnQge3JlYWRUc0NvbmZpZ30gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3RzLWNvbXBpbGVyJztcblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVJbXBvcnRCaW5kTmFtZShzcmM6IHRzLlNvdXJjZUZpbGUsIG1vZHVsZVBhdGg6IHN0cmluZywgcHJvcGVydHlOYW1lOiBzdHJpbmcsXG5cdHJlc29sdmVGbj86ICh0YXJnZXRQYXRoOiBzdHJpbmcsIGN1cnJGaWxlOiBzdHJpbmcpID0+IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB8IG51bGwge1xuXG5cdGxldCByZXNvbHZlZE1vZHVsZVBhdGg6IHN0cmluZztcblx0Y29uc3Qgc2VsZWN0b3IgPSBuZXcgU2VsZWN0b3Ioc3JjKTtcblx0aWYgKHJlc29sdmVGbikge1xuXHRcdHJlc29sdmVkTW9kdWxlUGF0aCA9IHJlc29sdmVGbihtb2R1bGVQYXRoLCBzcmMuZmlsZU5hbWUpO1xuXHR9IGVsc2Uge1xuXHRcdHJlc29sdmVkTW9kdWxlUGF0aCA9IGRlZmF1bHRSZXNvbHZlTW9kdWxlKG1vZHVsZVBhdGgsIHNyYy5maWxlTmFtZSk7XG5cdH1cblx0Y29uc3QgaW1wb3J0RGVjQXN0czogdHMuSW1wb3J0RGVjbGFyYXRpb25bXSA9IFtdO1xuXHRzZWxlY3Rvci5maW5kQWxsKCc6SW1wb3J0RGVjbGFyYXRpb24gPiAubW9kdWxlU3BlY2lmaWVyJylcblx0LmZvckVhY2goKG1vZHVsZVNwZWNpZmllcjogdHMuU3RyaW5nTGl0ZXJhbCkgPT4ge1xuXHRcdGNvbnN0IHRleHQgPSBtb2R1bGVTcGVjaWZpZXIuZ2V0VGV4dChzcmMpLnNsaWNlKDEsIC0xKTtcblx0XHRsZXQgcmVzb2x2ZWQ6IHN0cmluZztcblx0XHRpZiAocmVzb2x2ZUZuKSB7XG5cdFx0XHRyZXNvbHZlZCA9IHJlc29sdmVGbih0ZXh0LCBzcmMuZmlsZU5hbWUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXNvbHZlZCA9IGRlZmF1bHRSZXNvbHZlTW9kdWxlKHRleHQsIHNyYy5maWxlTmFtZSk7XG5cdFx0fVxuXHRcdGlmIChyZXNvbHZlZCAmJiByZXNvbHZlZCA9PT0gcmVzb2x2ZWRNb2R1bGVQYXRoKSB7XG5cdFx0XHRpbXBvcnREZWNBc3RzLnB1c2gobW9kdWxlU3BlY2lmaWVyLnBhcmVudCBhcyB0cy5JbXBvcnREZWNsYXJhdGlvbik7XG5cdFx0fVxuXHR9KTtcblxuXHRpZiAoIWltcG9ydERlY0FzdHMgfHwgaW1wb3J0RGVjQXN0cy5sZW5ndGggPT09IDApXG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0bGV0IHJlZk5hbWU6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQ7XG5cdGZvciAoY29uc3QgaW1wb3J0RGVjQXN0IG9mIGltcG9ydERlY0FzdHMpIHtcblx0XHRyZWZOYW1lID0gc2VsZWN0b3IuZmluZFdpdGgoaW1wb3J0RGVjQXN0LCAnLmltcG9ydENsYXVzZSA+IC5uYW1lZEJpbmRpbmdzID4gLmVsZW1lbnRzJywgKGFzdDogdHMuSW1wb3J0U3BlY2lmaWVyKSA9PiB7XG5cdFx0XHRpZiAoYXN0LnByb3BlcnR5TmFtZSkge1xuXHRcdFx0XHRpZiAoYXN0LnByb3BlcnR5TmFtZS5nZXRUZXh0KCkgPT09IHByb3BlcnR5TmFtZSlcblx0XHRcdFx0XHRyZXR1cm4gYXN0Lm5hbWUuZ2V0VGV4dCgpO1xuXHRcdFx0fSBlbHNlIGlmIChhc3QubmFtZSAmJiBhc3QubmFtZS5nZXRUZXh0KCkgPT09IHByb3BlcnR5TmFtZSkge1xuXHRcdFx0XHRyZXR1cm4gYXN0Lm5hbWUuZ2V0VGV4dCgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGlmIChyZWZOYW1lKVxuXHRcdFx0YnJlYWs7XG5cdFx0cmVmTmFtZSA9IHNlbGVjdG9yLmZpbmRXaXRoKGltcG9ydERlY0FzdCwgJy5pbXBvcnRDbGF1c2UgPiAubmFtZWRCaW5kaW5nczpOYW1lc3BhY2VJbXBvcnQgPiAubmFtZTpJZGVudGlmaWVyJyxcblx0XHRcdChhc3Q6IHRzLklkZW50aWZpZXIpID0+IHtcblx0XHRcdFx0cmV0dXJuIGFzdC5nZXRUZXh0KCkgKyAnLicgKyBwcm9wZXJ0eU5hbWU7XG5cdFx0XHR9KTtcblx0XHRpZiAocmVmTmFtZSlcblx0XHRcdGJyZWFrO1xuXHR9XG5cdHJldHVybiByZWZOYW1lO1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gZG9lcyBub3QgaW50ZW50IHRvIGJlIGZ1bGx5IGNvbmZvcm0gdG8gcmVhbCBUUyBvciBKUyBtb2R1bGUgcmVzb2x2ZSBsb2dpY1xuICogQHBhcmFtIHRhcmdldFBhdGggXG4gKiBAcGFyYW0gY3VyckZpbGUgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0UmVzb2x2ZU1vZHVsZSh0YXJnZXRQYXRoOiBzdHJpbmcsIGN1cnJGaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRpZiAoL15cXC5cXC4/XFwvLy50ZXN0KHRhcmdldFBhdGgpKSB7XG5cdFx0Y29uc3QgYWJzUGF0aCA9IFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUoY3VyckZpbGUpLCB0YXJnZXRQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdFx0cmV0dXJuIGFic1BhdGg7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIFBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnbm9kZV9tb2R1bGVzJywgdGFyZ2V0UGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXHR9XG59XG4iXX0=
