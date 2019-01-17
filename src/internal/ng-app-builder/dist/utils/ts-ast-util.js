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
        return null;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy91dGlscy90cy1hc3QtdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSwwRUFBc0M7QUFDdEMsbURBQTZCO0FBQzdCLHFFQUFxRTtBQUVyRSxTQUFnQixxQkFBcUIsQ0FBQyxHQUFrQixFQUFFLFVBQWtCLEVBQUUsWUFBb0IsRUFDakcsU0FBNEQ7SUFFNUQsSUFBSSxrQkFBMEIsQ0FBQztJQUMvQixNQUFNLFFBQVEsR0FBRyxJQUFJLHNCQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbkMsSUFBSSxTQUFTLEVBQUU7UUFDZCxrQkFBa0IsR0FBRyxTQUFTLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUN6RDtTQUFNO1FBQ04sa0JBQWtCLEdBQUcsb0JBQW9CLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUNwRTtJQUNELE1BQU0sYUFBYSxHQUEyQixFQUFFLENBQUM7SUFDakQsUUFBUSxDQUFDLE9BQU8sQ0FBQyx1Q0FBdUMsQ0FBQztTQUN4RCxPQUFPLENBQUMsQ0FBQyxlQUFpQyxFQUFFLEVBQUU7UUFDOUMsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkQsSUFBSSxRQUFnQixDQUFDO1FBQ3JCLElBQUksU0FBUyxFQUFFO1lBQ2QsUUFBUSxHQUFHLFNBQVMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ3pDO2FBQU07WUFDTixRQUFRLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUNwRDtRQUNELElBQUksUUFBUSxJQUFJLFFBQVEsS0FBSyxrQkFBa0IsRUFBRTtZQUNoRCxhQUFhLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUE4QixDQUFDLENBQUM7U0FDbkU7SUFDRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxhQUFhLElBQUksYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDO1FBQy9DLE9BQU8sSUFBSSxDQUFDO0lBQ2IsSUFBSSxPQUFlLENBQUM7SUFDcEIsS0FBSyxNQUFNLFlBQVksSUFBSSxhQUFhLEVBQUU7UUFDekMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLDRDQUE0QyxFQUFFLENBQUMsR0FBdUIsRUFBRSxFQUFFO1lBQ25ILElBQUksR0FBRyxDQUFDLFlBQVksRUFBRTtnQkFDckIsSUFBSSxHQUFHLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxLQUFLLFlBQVk7b0JBQzlDLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzthQUMzQjtpQkFBTSxJQUFJLEdBQUcsQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxZQUFZLEVBQUU7Z0JBQzNELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzthQUMxQjtRQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxPQUFPO1lBQ1YsTUFBTTtRQUNQLE9BQU8sR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxtRUFBbUUsRUFDNUcsQ0FBQyxHQUFrQixFQUFFLEVBQUU7WUFDdEIsT0FBTyxHQUFHLENBQUMsT0FBTyxFQUFFLEdBQUcsR0FBRyxHQUFHLFlBQVksQ0FBQztRQUMzQyxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksT0FBTztZQUNWLE1BQU07S0FDUDtJQUNELE9BQU8sT0FBTyxDQUFDO0FBQ2hCLENBQUM7QUEvQ0Qsc0RBK0NDO0FBRUQ7Ozs7R0FJRztBQUNILFNBQWdCLG9CQUFvQixDQUFDLFVBQWtCLEVBQUUsUUFBZ0I7SUFDeEUsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFO1FBQ2hDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3JGLE9BQU8sT0FBTyxDQUFDO0tBQ2Y7U0FBTTtRQUNOLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsY0FBYyxFQUFFLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7S0FDbkY7QUFDRixDQUFDO0FBUEQsb0RBT0MiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvdXRpbHMvdHMtYXN0LXV0aWwuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBTZWxlY3RvciBmcm9tICcuL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0IHtyZWFkVHNDb25maWd9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC90cy1jb21waWxlcic7XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlSW1wb3J0QmluZE5hbWUoc3JjOiB0cy5Tb3VyY2VGaWxlLCBtb2R1bGVQYXRoOiBzdHJpbmcsIHByb3BlcnR5TmFtZTogc3RyaW5nLFxuXHRyZXNvbHZlRm4/OiAodGFyZ2V0UGF0aDogc3RyaW5nLCBjdXJyRmlsZTogc3RyaW5nKSA9PiBzdHJpbmcpOiBzdHJpbmcge1xuXG5cdGxldCByZXNvbHZlZE1vZHVsZVBhdGg6IHN0cmluZztcblx0Y29uc3Qgc2VsZWN0b3IgPSBuZXcgU2VsZWN0b3Ioc3JjKTtcblx0aWYgKHJlc29sdmVGbikge1xuXHRcdHJlc29sdmVkTW9kdWxlUGF0aCA9IHJlc29sdmVGbihtb2R1bGVQYXRoLCBzcmMuZmlsZU5hbWUpO1xuXHR9IGVsc2Uge1xuXHRcdHJlc29sdmVkTW9kdWxlUGF0aCA9IGRlZmF1bHRSZXNvbHZlTW9kdWxlKG1vZHVsZVBhdGgsIHNyYy5maWxlTmFtZSk7XG5cdH1cblx0Y29uc3QgaW1wb3J0RGVjQXN0czogdHMuSW1wb3J0RGVjbGFyYXRpb25bXSA9IFtdO1xuXHRzZWxlY3Rvci5maW5kQWxsKCc6SW1wb3J0RGVjbGFyYXRpb24gPiAubW9kdWxlU3BlY2lmaWVyJylcblx0LmZvckVhY2goKG1vZHVsZVNwZWNpZmllcjogdHMuU3RyaW5nTGl0ZXJhbCkgPT4ge1xuXHRcdGNvbnN0IHRleHQgPSBtb2R1bGVTcGVjaWZpZXIuZ2V0VGV4dChzcmMpLnNsaWNlKDEsIC0xKTtcblx0XHRsZXQgcmVzb2x2ZWQ6IHN0cmluZztcblx0XHRpZiAocmVzb2x2ZUZuKSB7XG5cdFx0XHRyZXNvbHZlZCA9IHJlc29sdmVGbih0ZXh0LCBzcmMuZmlsZU5hbWUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXNvbHZlZCA9IGRlZmF1bHRSZXNvbHZlTW9kdWxlKHRleHQsIHNyYy5maWxlTmFtZSk7XG5cdFx0fVxuXHRcdGlmIChyZXNvbHZlZCAmJiByZXNvbHZlZCA9PT0gcmVzb2x2ZWRNb2R1bGVQYXRoKSB7XG5cdFx0XHRpbXBvcnREZWNBc3RzLnB1c2gobW9kdWxlU3BlY2lmaWVyLnBhcmVudCBhcyB0cy5JbXBvcnREZWNsYXJhdGlvbik7XG5cdFx0fVxuXHR9KTtcblxuXHRpZiAoIWltcG9ydERlY0FzdHMgfHwgaW1wb3J0RGVjQXN0cy5sZW5ndGggPT09IDApXG5cdFx0cmV0dXJuIG51bGw7XG5cdGxldCByZWZOYW1lOiBzdHJpbmc7XG5cdGZvciAoY29uc3QgaW1wb3J0RGVjQXN0IG9mIGltcG9ydERlY0FzdHMpIHtcblx0XHRyZWZOYW1lID0gc2VsZWN0b3IuZmluZFdpdGgoaW1wb3J0RGVjQXN0LCAnLmltcG9ydENsYXVzZSA+IC5uYW1lZEJpbmRpbmdzID4gLmVsZW1lbnRzJywgKGFzdDogdHMuSW1wb3J0U3BlY2lmaWVyKSA9PiB7XG5cdFx0XHRpZiAoYXN0LnByb3BlcnR5TmFtZSkge1xuXHRcdFx0XHRpZiAoYXN0LnByb3BlcnR5TmFtZS5nZXRUZXh0KCkgPT09IHByb3BlcnR5TmFtZSlcblx0XHRcdFx0XHRyZXR1cm4gYXN0Lm5hbWUuZ2V0VGV4dCgpO1xuXHRcdFx0fSBlbHNlIGlmIChhc3QubmFtZSAmJiBhc3QubmFtZS5nZXRUZXh0KCkgPT09IHByb3BlcnR5TmFtZSkge1xuXHRcdFx0XHRyZXR1cm4gYXN0Lm5hbWUuZ2V0VGV4dCgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGlmIChyZWZOYW1lKVxuXHRcdFx0YnJlYWs7XG5cdFx0cmVmTmFtZSA9IHNlbGVjdG9yLmZpbmRXaXRoKGltcG9ydERlY0FzdCwgJy5pbXBvcnRDbGF1c2UgPiAubmFtZWRCaW5kaW5nczpOYW1lc3BhY2VJbXBvcnQgPiAubmFtZTpJZGVudGlmaWVyJyxcblx0XHRcdChhc3Q6IHRzLklkZW50aWZpZXIpID0+IHtcblx0XHRcdFx0cmV0dXJuIGFzdC5nZXRUZXh0KCkgKyAnLicgKyBwcm9wZXJ0eU5hbWU7XG5cdFx0XHR9KTtcblx0XHRpZiAocmVmTmFtZSlcblx0XHRcdGJyZWFrO1xuXHR9XG5cdHJldHVybiByZWZOYW1lO1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gZG9lcyBub3QgaW50ZW50IHRvIGJlIGZ1bGx5IGNvbmZvcm0gdG8gcmVhbCBUUyBvciBKUyBtb2R1bGUgcmVzb2x2ZSBsb2dpY1xuICogQHBhcmFtIHRhcmdldFBhdGggXG4gKiBAcGFyYW0gY3VyckZpbGUgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0UmVzb2x2ZU1vZHVsZSh0YXJnZXRQYXRoOiBzdHJpbmcsIGN1cnJGaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRpZiAoL15cXC5cXC4/XFwvLy50ZXN0KHRhcmdldFBhdGgpKSB7XG5cdFx0Y29uc3QgYWJzUGF0aCA9IFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUoY3VyckZpbGUpLCB0YXJnZXRQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdFx0cmV0dXJuIGFic1BhdGg7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIFBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnbm9kZV9tb2R1bGVzJywgdGFyZ2V0UGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXHR9XG59XG4iXX0=
