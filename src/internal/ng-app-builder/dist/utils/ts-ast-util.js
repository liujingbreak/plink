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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy91dGlscy90cy1hc3QtdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSwwRUFBc0M7QUFDdEMsbURBQTZCO0FBQzdCLHFFQUFxRTtBQUVyRSxTQUFnQixxQkFBcUIsQ0FBQyxHQUFrQixFQUFFLFVBQWtCLEVBQUUsWUFBb0IsRUFDaEcsU0FBNEQ7SUFFNUQsSUFBSSxrQkFBMEIsQ0FBQztJQUMvQixNQUFNLFFBQVEsR0FBRyxJQUFJLHNCQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbkMsSUFBSSxTQUFTLEVBQUU7UUFDYixrQkFBa0IsR0FBRyxTQUFTLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUMxRDtTQUFNO1FBQ0wsa0JBQWtCLEdBQUcsb0JBQW9CLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUNyRTtJQUNELE1BQU0sYUFBYSxHQUEyQixFQUFFLENBQUM7SUFDakQsUUFBUSxDQUFDLE9BQU8sQ0FBQyx1Q0FBdUMsQ0FBQztTQUN4RCxPQUFPLENBQUMsQ0FBQyxlQUFpQyxFQUFFLEVBQUU7UUFDN0MsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkQsSUFBSSxRQUFnQixDQUFDO1FBQ3JCLElBQUksU0FBUyxFQUFFO1lBQ2IsUUFBUSxHQUFHLFNBQVMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQzFDO2FBQU07WUFDTCxRQUFRLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUNyRDtRQUNELElBQUksUUFBUSxJQUFJLFFBQVEsS0FBSyxrQkFBa0IsRUFBRTtZQUMvQyxhQUFhLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUE4QixDQUFDLENBQUM7U0FDcEU7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxhQUFhLElBQUksYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDO1FBQzlDLE9BQU8sSUFBSSxDQUFDO0lBQ2QsSUFBSSxPQUFlLENBQUM7SUFDcEIsS0FBSyxNQUFNLFlBQVksSUFBSSxhQUFhLEVBQUU7UUFDeEMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLDRDQUE0QyxFQUFFLENBQUMsR0FBdUIsRUFBRSxFQUFFO1lBQ2xILElBQUksR0FBRyxDQUFDLFlBQVksRUFBRTtnQkFDcEIsSUFBSSxHQUFHLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxLQUFLLFlBQVk7b0JBQzdDLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzthQUM3QjtpQkFBTSxJQUFJLEdBQUcsQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxZQUFZLEVBQUU7Z0JBQzFELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzthQUMzQjtRQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxPQUFPO1lBQ1QsTUFBTTtRQUNSLE9BQU8sR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxtRUFBbUUsRUFDM0csQ0FBQyxHQUFrQixFQUFFLEVBQUU7WUFDckIsT0FBTyxHQUFHLENBQUMsT0FBTyxFQUFFLEdBQUcsR0FBRyxHQUFHLFlBQVksQ0FBQztRQUM1QyxDQUFDLENBQUMsQ0FBQztRQUNMLElBQUksT0FBTztZQUNULE1BQU07S0FDVDtJQUNELE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUEvQ0Qsc0RBK0NDO0FBRUQ7Ozs7R0FJRztBQUNILFNBQWdCLG9CQUFvQixDQUFDLFVBQWtCLEVBQUUsUUFBZ0I7SUFDdkUsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFO1FBQy9CLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3JGLE9BQU8sT0FBTyxDQUFDO0tBQ2hCO1NBQU07UUFDTCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLGNBQWMsRUFBRSxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0tBQ3BGO0FBQ0gsQ0FBQztBQVBELG9EQU9DIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3V0aWxzL3RzLWFzdC11dGlsLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBTZWxlY3RvciBmcm9tICcuL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0IHtyZWFkVHNDb25maWd9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC90cy1jb21waWxlcic7XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlSW1wb3J0QmluZE5hbWUoc3JjOiB0cy5Tb3VyY2VGaWxlLCBtb2R1bGVQYXRoOiBzdHJpbmcsIHByb3BlcnR5TmFtZTogc3RyaW5nLFxuICByZXNvbHZlRm4/OiAodGFyZ2V0UGF0aDogc3RyaW5nLCBjdXJyRmlsZTogc3RyaW5nKSA9PiBzdHJpbmcpOiBzdHJpbmcge1xuXG4gIGxldCByZXNvbHZlZE1vZHVsZVBhdGg6IHN0cmluZztcbiAgY29uc3Qgc2VsZWN0b3IgPSBuZXcgU2VsZWN0b3Ioc3JjKTtcbiAgaWYgKHJlc29sdmVGbikge1xuICAgIHJlc29sdmVkTW9kdWxlUGF0aCA9IHJlc29sdmVGbihtb2R1bGVQYXRoLCBzcmMuZmlsZU5hbWUpO1xuICB9IGVsc2Uge1xuICAgIHJlc29sdmVkTW9kdWxlUGF0aCA9IGRlZmF1bHRSZXNvbHZlTW9kdWxlKG1vZHVsZVBhdGgsIHNyYy5maWxlTmFtZSk7XG4gIH1cbiAgY29uc3QgaW1wb3J0RGVjQXN0czogdHMuSW1wb3J0RGVjbGFyYXRpb25bXSA9IFtdO1xuICBzZWxlY3Rvci5maW5kQWxsKCc6SW1wb3J0RGVjbGFyYXRpb24gPiAubW9kdWxlU3BlY2lmaWVyJylcbiAgLmZvckVhY2goKG1vZHVsZVNwZWNpZmllcjogdHMuU3RyaW5nTGl0ZXJhbCkgPT4ge1xuICAgIGNvbnN0IHRleHQgPSBtb2R1bGVTcGVjaWZpZXIuZ2V0VGV4dChzcmMpLnNsaWNlKDEsIC0xKTtcbiAgICBsZXQgcmVzb2x2ZWQ6IHN0cmluZztcbiAgICBpZiAocmVzb2x2ZUZuKSB7XG4gICAgICByZXNvbHZlZCA9IHJlc29sdmVGbih0ZXh0LCBzcmMuZmlsZU5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXNvbHZlZCA9IGRlZmF1bHRSZXNvbHZlTW9kdWxlKHRleHQsIHNyYy5maWxlTmFtZSk7XG4gICAgfVxuICAgIGlmIChyZXNvbHZlZCAmJiByZXNvbHZlZCA9PT0gcmVzb2x2ZWRNb2R1bGVQYXRoKSB7XG4gICAgICBpbXBvcnREZWNBc3RzLnB1c2gobW9kdWxlU3BlY2lmaWVyLnBhcmVudCBhcyB0cy5JbXBvcnREZWNsYXJhdGlvbik7XG4gICAgfVxuICB9KTtcblxuICBpZiAoIWltcG9ydERlY0FzdHMgfHwgaW1wb3J0RGVjQXN0cy5sZW5ndGggPT09IDApXG4gICAgcmV0dXJuIG51bGw7XG4gIGxldCByZWZOYW1lOiBzdHJpbmc7XG4gIGZvciAoY29uc3QgaW1wb3J0RGVjQXN0IG9mIGltcG9ydERlY0FzdHMpIHtcbiAgICByZWZOYW1lID0gc2VsZWN0b3IuZmluZFdpdGgoaW1wb3J0RGVjQXN0LCAnLmltcG9ydENsYXVzZSA+IC5uYW1lZEJpbmRpbmdzID4gLmVsZW1lbnRzJywgKGFzdDogdHMuSW1wb3J0U3BlY2lmaWVyKSA9PiB7XG4gICAgICBpZiAoYXN0LnByb3BlcnR5TmFtZSkge1xuICAgICAgICBpZiAoYXN0LnByb3BlcnR5TmFtZS5nZXRUZXh0KCkgPT09IHByb3BlcnR5TmFtZSlcbiAgICAgICAgICByZXR1cm4gYXN0Lm5hbWUuZ2V0VGV4dCgpO1xuICAgICAgfSBlbHNlIGlmIChhc3QubmFtZSAmJiBhc3QubmFtZS5nZXRUZXh0KCkgPT09IHByb3BlcnR5TmFtZSkge1xuICAgICAgICByZXR1cm4gYXN0Lm5hbWUuZ2V0VGV4dCgpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmIChyZWZOYW1lKVxuICAgICAgYnJlYWs7XG4gICAgcmVmTmFtZSA9IHNlbGVjdG9yLmZpbmRXaXRoKGltcG9ydERlY0FzdCwgJy5pbXBvcnRDbGF1c2UgPiAubmFtZWRCaW5kaW5nczpOYW1lc3BhY2VJbXBvcnQgPiAubmFtZTpJZGVudGlmaWVyJyxcbiAgICAgIChhc3Q6IHRzLklkZW50aWZpZXIpID0+IHtcbiAgICAgICAgcmV0dXJuIGFzdC5nZXRUZXh0KCkgKyAnLicgKyBwcm9wZXJ0eU5hbWU7XG4gICAgICB9KTtcbiAgICBpZiAocmVmTmFtZSlcbiAgICAgIGJyZWFrO1xuICB9XG4gIHJldHVybiByZWZOYW1lO1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gZG9lcyBub3QgaW50ZW50IHRvIGJlIGZ1bGx5IGNvbmZvcm0gdG8gcmVhbCBUUyBvciBKUyBtb2R1bGUgcmVzb2x2ZSBsb2dpY1xuICogQHBhcmFtIHRhcmdldFBhdGggXG4gKiBAcGFyYW0gY3VyckZpbGUgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0UmVzb2x2ZU1vZHVsZSh0YXJnZXRQYXRoOiBzdHJpbmcsIGN1cnJGaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoL15cXC5cXC4/XFwvLy50ZXN0KHRhcmdldFBhdGgpKSB7XG4gICAgY29uc3QgYWJzUGF0aCA9IFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUoY3VyckZpbGUpLCB0YXJnZXRQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgcmV0dXJuIGFic1BhdGg7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnbm9kZV9tb2R1bGVzJywgdGFyZ2V0UGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICB9XG59XG4iXX0=
