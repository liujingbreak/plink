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
        refName = selector.findMapTo(importDecAst, '.importClause > .namedBindings > .elements', (ast) => {
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
        refName = selector.findMapTo(importDecAst, '.importClause > .namedBindings:NamespaceImport > .name:Identifier', (ast) => {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy91dGlscy90cy1hc3QtdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSwwRUFBc0M7QUFDdEMsbURBQTZCO0FBQzdCLHFFQUFxRTtBQUVyRSxTQUFnQixxQkFBcUIsQ0FBQyxHQUFrQixFQUFFLFVBQWtCLEVBQUUsWUFBb0IsRUFDaEcsU0FBNEQ7SUFFNUQsSUFBSSxrQkFBMEIsQ0FBQztJQUMvQixNQUFNLFFBQVEsR0FBRyxJQUFJLHNCQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbkMsSUFBSSxTQUFTLEVBQUU7UUFDYixrQkFBa0IsR0FBRyxTQUFTLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUMxRDtTQUFNO1FBQ0wsa0JBQWtCLEdBQUcsb0JBQW9CLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUNyRTtJQUNELE1BQU0sYUFBYSxHQUEyQixFQUFFLENBQUM7SUFDakQsUUFBUSxDQUFDLE9BQU8sQ0FBQyx1Q0FBdUMsQ0FBQztTQUN4RCxPQUFPLENBQUMsQ0FBQyxlQUFpQyxFQUFFLEVBQUU7UUFDN0MsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkQsSUFBSSxRQUFnQixDQUFDO1FBQ3JCLElBQUksU0FBUyxFQUFFO1lBQ2IsUUFBUSxHQUFHLFNBQVMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQzFDO2FBQU07WUFDTCxRQUFRLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUNyRDtRQUNELElBQUksUUFBUSxJQUFJLFFBQVEsS0FBSyxrQkFBa0IsRUFBRTtZQUMvQyxhQUFhLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUE4QixDQUFDLENBQUM7U0FDcEU7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxhQUFhLElBQUksYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDO1FBQzlDLE9BQU8sU0FBUyxDQUFDO0lBQ25CLElBQUksT0FBa0MsQ0FBQztJQUN2QyxLQUFLLE1BQU0sWUFBWSxJQUFJLGFBQWEsRUFBRTtRQUN4QyxPQUFPLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsNENBQTRDLEVBQUUsQ0FBQyxHQUF1QixFQUFFLEVBQUU7WUFDbkgsSUFBSSxHQUFHLENBQUMsWUFBWSxFQUFFO2dCQUNwQixJQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLEtBQUssWUFBWTtvQkFDN0MsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2FBQzdCO2lCQUFNLElBQUksR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLFlBQVksRUFBRTtnQkFDMUQsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2FBQzNCO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLE9BQU87WUFDVCxNQUFNO1FBQ1IsT0FBTyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLG1FQUFtRSxFQUM1RyxDQUFDLEdBQWtCLEVBQUUsRUFBRTtZQUNyQixPQUFPLEdBQUcsQ0FBQyxPQUFPLEVBQUUsR0FBRyxHQUFHLEdBQUcsWUFBWSxDQUFDO1FBQzVDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsSUFBSSxPQUFPO1lBQ1QsTUFBTTtLQUNUO0lBQ0QsT0FBTyxPQUFPLENBQUM7QUFDakIsQ0FBQztBQS9DRCxzREErQ0M7QUFFRDs7OztHQUlHO0FBQ0gsU0FBZ0Isb0JBQW9CLENBQUMsVUFBa0IsRUFBRSxRQUFnQjtJQUN2RSxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDL0IsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDckYsT0FBTyxPQUFPLENBQUM7S0FDaEI7U0FBTTtRQUNMLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsY0FBYyxFQUFFLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7S0FDcEY7QUFDSCxDQUFDO0FBUEQsb0RBT0MiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvdXRpbHMvdHMtYXN0LXV0aWwuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBTZWxlY3RvciBmcm9tICcuL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0IHtyZWFkVHNDb25maWd9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC90cy1jb21waWxlcic7XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlSW1wb3J0QmluZE5hbWUoc3JjOiB0cy5Tb3VyY2VGaWxlLCBtb2R1bGVQYXRoOiBzdHJpbmcsIHByb3BlcnR5TmFtZTogc3RyaW5nLFxuICByZXNvbHZlRm4/OiAodGFyZ2V0UGF0aDogc3RyaW5nLCBjdXJyRmlsZTogc3RyaW5nKSA9PiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsIHtcblxuICBsZXQgcmVzb2x2ZWRNb2R1bGVQYXRoOiBzdHJpbmc7XG4gIGNvbnN0IHNlbGVjdG9yID0gbmV3IFNlbGVjdG9yKHNyYyk7XG4gIGlmIChyZXNvbHZlRm4pIHtcbiAgICByZXNvbHZlZE1vZHVsZVBhdGggPSByZXNvbHZlRm4obW9kdWxlUGF0aCwgc3JjLmZpbGVOYW1lKTtcbiAgfSBlbHNlIHtcbiAgICByZXNvbHZlZE1vZHVsZVBhdGggPSBkZWZhdWx0UmVzb2x2ZU1vZHVsZShtb2R1bGVQYXRoLCBzcmMuZmlsZU5hbWUpO1xuICB9XG4gIGNvbnN0IGltcG9ydERlY0FzdHM6IHRzLkltcG9ydERlY2xhcmF0aW9uW10gPSBbXTtcbiAgc2VsZWN0b3IuZmluZEFsbCgnOkltcG9ydERlY2xhcmF0aW9uID4gLm1vZHVsZVNwZWNpZmllcicpXG4gIC5mb3JFYWNoKChtb2R1bGVTcGVjaWZpZXI6IHRzLlN0cmluZ0xpdGVyYWwpID0+IHtcbiAgICBjb25zdCB0ZXh0ID0gbW9kdWxlU3BlY2lmaWVyLmdldFRleHQoc3JjKS5zbGljZSgxLCAtMSk7XG4gICAgbGV0IHJlc29sdmVkOiBzdHJpbmc7XG4gICAgaWYgKHJlc29sdmVGbikge1xuICAgICAgcmVzb2x2ZWQgPSByZXNvbHZlRm4odGV4dCwgc3JjLmZpbGVOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzb2x2ZWQgPSBkZWZhdWx0UmVzb2x2ZU1vZHVsZSh0ZXh0LCBzcmMuZmlsZU5hbWUpO1xuICAgIH1cbiAgICBpZiAocmVzb2x2ZWQgJiYgcmVzb2x2ZWQgPT09IHJlc29sdmVkTW9kdWxlUGF0aCkge1xuICAgICAgaW1wb3J0RGVjQXN0cy5wdXNoKG1vZHVsZVNwZWNpZmllci5wYXJlbnQgYXMgdHMuSW1wb3J0RGVjbGFyYXRpb24pO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKCFpbXBvcnREZWNBc3RzIHx8IGltcG9ydERlY0FzdHMubGVuZ3RoID09PSAwKVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIGxldCByZWZOYW1lOiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkO1xuICBmb3IgKGNvbnN0IGltcG9ydERlY0FzdCBvZiBpbXBvcnREZWNBc3RzKSB7XG4gICAgcmVmTmFtZSA9IHNlbGVjdG9yLmZpbmRNYXBUbyhpbXBvcnREZWNBc3QsICcuaW1wb3J0Q2xhdXNlID4gLm5hbWVkQmluZGluZ3MgPiAuZWxlbWVudHMnLCAoYXN0OiB0cy5JbXBvcnRTcGVjaWZpZXIpID0+IHtcbiAgICAgIGlmIChhc3QucHJvcGVydHlOYW1lKSB7XG4gICAgICAgIGlmIChhc3QucHJvcGVydHlOYW1lLmdldFRleHQoKSA9PT0gcHJvcGVydHlOYW1lKVxuICAgICAgICAgIHJldHVybiBhc3QubmFtZS5nZXRUZXh0KCk7XG4gICAgICB9IGVsc2UgaWYgKGFzdC5uYW1lICYmIGFzdC5uYW1lLmdldFRleHQoKSA9PT0gcHJvcGVydHlOYW1lKSB7XG4gICAgICAgIHJldHVybiBhc3QubmFtZS5nZXRUZXh0KCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKHJlZk5hbWUpXG4gICAgICBicmVhaztcbiAgICByZWZOYW1lID0gc2VsZWN0b3IuZmluZE1hcFRvKGltcG9ydERlY0FzdCwgJy5pbXBvcnRDbGF1c2UgPiAubmFtZWRCaW5kaW5nczpOYW1lc3BhY2VJbXBvcnQgPiAubmFtZTpJZGVudGlmaWVyJyxcbiAgICAgIChhc3Q6IHRzLklkZW50aWZpZXIpID0+IHtcbiAgICAgICAgcmV0dXJuIGFzdC5nZXRUZXh0KCkgKyAnLicgKyBwcm9wZXJ0eU5hbWU7XG4gICAgICB9KTtcbiAgICBpZiAocmVmTmFtZSlcbiAgICAgIGJyZWFrO1xuICB9XG4gIHJldHVybiByZWZOYW1lO1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gZG9lcyBub3QgaW50ZW50IHRvIGJlIGZ1bGx5IGNvbmZvcm0gdG8gcmVhbCBUUyBvciBKUyBtb2R1bGUgcmVzb2x2ZSBsb2dpY1xuICogQHBhcmFtIHRhcmdldFBhdGggXG4gKiBAcGFyYW0gY3VyckZpbGUgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0UmVzb2x2ZU1vZHVsZSh0YXJnZXRQYXRoOiBzdHJpbmcsIGN1cnJGaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoL15cXC5cXC4/XFwvLy50ZXN0KHRhcmdldFBhdGgpKSB7XG4gICAgY29uc3QgYWJzUGF0aCA9IFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUoY3VyckZpbGUpLCB0YXJnZXRQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgcmV0dXJuIGFic1BhdGg7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnbm9kZV9tb2R1bGVzJywgdGFyZ2V0UGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICB9XG59XG4iXX0=
