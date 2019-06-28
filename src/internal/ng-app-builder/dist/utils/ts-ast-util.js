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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy91dGlscy90cy1hc3QtdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSwwRUFBc0M7QUFDdEMsbURBQTZCO0FBQzdCLHFFQUFxRTtBQUVyRSxTQUFnQixxQkFBcUIsQ0FBQyxHQUFrQixFQUFFLFVBQWtCLEVBQUUsWUFBb0IsRUFDaEcsU0FBNEQ7SUFFNUQsSUFBSSxrQkFBMEIsQ0FBQztJQUMvQixNQUFNLFFBQVEsR0FBRyxJQUFJLHNCQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbkMsSUFBSSxTQUFTLEVBQUU7UUFDYixrQkFBa0IsR0FBRyxTQUFTLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUMxRDtTQUFNO1FBQ0wsa0JBQWtCLEdBQUcsb0JBQW9CLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUNyRTtJQUNELE1BQU0sYUFBYSxHQUEyQixFQUFFLENBQUM7SUFDakQsUUFBUSxDQUFDLE9BQU8sQ0FBQyx1Q0FBdUMsQ0FBQztTQUN4RCxPQUFPLENBQUMsQ0FBQyxlQUFpQyxFQUFFLEVBQUU7UUFDN0MsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkQsSUFBSSxRQUFnQixDQUFDO1FBQ3JCLElBQUksU0FBUyxFQUFFO1lBQ2IsUUFBUSxHQUFHLFNBQVMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQzFDO2FBQU07WUFDTCxRQUFRLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUNyRDtRQUNELElBQUksUUFBUSxJQUFJLFFBQVEsS0FBSyxrQkFBa0IsRUFBRTtZQUMvQyxhQUFhLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUE4QixDQUFDLENBQUM7U0FDcEU7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxhQUFhLElBQUksYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDO1FBQzlDLE9BQU8sU0FBUyxDQUFDO0lBQ25CLElBQUksT0FBa0MsQ0FBQztJQUN2QyxLQUFLLE1BQU0sWUFBWSxJQUFJLGFBQWEsRUFBRTtRQUN4QyxPQUFPLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsNENBQTRDLEVBQUUsQ0FBQyxHQUF1QixFQUFFLEVBQUU7WUFDbEgsSUFBSSxHQUFHLENBQUMsWUFBWSxFQUFFO2dCQUNwQixJQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLEtBQUssWUFBWTtvQkFDN0MsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2FBQzdCO2lCQUFNLElBQUksR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLFlBQVksRUFBRTtnQkFDMUQsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2FBQzNCO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLE9BQU87WUFDVCxNQUFNO1FBQ1IsT0FBTyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLG1FQUFtRSxFQUMzRyxDQUFDLEdBQWtCLEVBQUUsRUFBRTtZQUNyQixPQUFPLEdBQUcsQ0FBQyxPQUFPLEVBQUUsR0FBRyxHQUFHLEdBQUcsWUFBWSxDQUFDO1FBQzVDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsSUFBSSxPQUFPO1lBQ1QsTUFBTTtLQUNUO0lBQ0QsT0FBTyxPQUFPLENBQUM7QUFDakIsQ0FBQztBQS9DRCxzREErQ0M7QUFFRDs7OztHQUlHO0FBQ0gsU0FBZ0Isb0JBQW9CLENBQUMsVUFBa0IsRUFBRSxRQUFnQjtJQUN2RSxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDL0IsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDckYsT0FBTyxPQUFPLENBQUM7S0FDaEI7U0FBTTtRQUNMLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsY0FBYyxFQUFFLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7S0FDcEY7QUFDSCxDQUFDO0FBUEQsb0RBT0MiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvdXRpbHMvdHMtYXN0LXV0aWwuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBTZWxlY3RvciBmcm9tICcuL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0IHtyZWFkVHNDb25maWd9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC90cy1jb21waWxlcic7XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlSW1wb3J0QmluZE5hbWUoc3JjOiB0cy5Tb3VyY2VGaWxlLCBtb2R1bGVQYXRoOiBzdHJpbmcsIHByb3BlcnR5TmFtZTogc3RyaW5nLFxuICByZXNvbHZlRm4/OiAodGFyZ2V0UGF0aDogc3RyaW5nLCBjdXJyRmlsZTogc3RyaW5nKSA9PiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsIHtcblxuICBsZXQgcmVzb2x2ZWRNb2R1bGVQYXRoOiBzdHJpbmc7XG4gIGNvbnN0IHNlbGVjdG9yID0gbmV3IFNlbGVjdG9yKHNyYyk7XG4gIGlmIChyZXNvbHZlRm4pIHtcbiAgICByZXNvbHZlZE1vZHVsZVBhdGggPSByZXNvbHZlRm4obW9kdWxlUGF0aCwgc3JjLmZpbGVOYW1lKTtcbiAgfSBlbHNlIHtcbiAgICByZXNvbHZlZE1vZHVsZVBhdGggPSBkZWZhdWx0UmVzb2x2ZU1vZHVsZShtb2R1bGVQYXRoLCBzcmMuZmlsZU5hbWUpO1xuICB9XG4gIGNvbnN0IGltcG9ydERlY0FzdHM6IHRzLkltcG9ydERlY2xhcmF0aW9uW10gPSBbXTtcbiAgc2VsZWN0b3IuZmluZEFsbCgnOkltcG9ydERlY2xhcmF0aW9uID4gLm1vZHVsZVNwZWNpZmllcicpXG4gIC5mb3JFYWNoKChtb2R1bGVTcGVjaWZpZXI6IHRzLlN0cmluZ0xpdGVyYWwpID0+IHtcbiAgICBjb25zdCB0ZXh0ID0gbW9kdWxlU3BlY2lmaWVyLmdldFRleHQoc3JjKS5zbGljZSgxLCAtMSk7XG4gICAgbGV0IHJlc29sdmVkOiBzdHJpbmc7XG4gICAgaWYgKHJlc29sdmVGbikge1xuICAgICAgcmVzb2x2ZWQgPSByZXNvbHZlRm4odGV4dCwgc3JjLmZpbGVOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzb2x2ZWQgPSBkZWZhdWx0UmVzb2x2ZU1vZHVsZSh0ZXh0LCBzcmMuZmlsZU5hbWUpO1xuICAgIH1cbiAgICBpZiAocmVzb2x2ZWQgJiYgcmVzb2x2ZWQgPT09IHJlc29sdmVkTW9kdWxlUGF0aCkge1xuICAgICAgaW1wb3J0RGVjQXN0cy5wdXNoKG1vZHVsZVNwZWNpZmllci5wYXJlbnQgYXMgdHMuSW1wb3J0RGVjbGFyYXRpb24pO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKCFpbXBvcnREZWNBc3RzIHx8IGltcG9ydERlY0FzdHMubGVuZ3RoID09PSAwKVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIGxldCByZWZOYW1lOiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkO1xuICBmb3IgKGNvbnN0IGltcG9ydERlY0FzdCBvZiBpbXBvcnREZWNBc3RzKSB7XG4gICAgcmVmTmFtZSA9IHNlbGVjdG9yLmZpbmRXaXRoKGltcG9ydERlY0FzdCwgJy5pbXBvcnRDbGF1c2UgPiAubmFtZWRCaW5kaW5ncyA+IC5lbGVtZW50cycsIChhc3Q6IHRzLkltcG9ydFNwZWNpZmllcikgPT4ge1xuICAgICAgaWYgKGFzdC5wcm9wZXJ0eU5hbWUpIHtcbiAgICAgICAgaWYgKGFzdC5wcm9wZXJ0eU5hbWUuZ2V0VGV4dCgpID09PSBwcm9wZXJ0eU5hbWUpXG4gICAgICAgICAgcmV0dXJuIGFzdC5uYW1lLmdldFRleHQoKTtcbiAgICAgIH0gZWxzZSBpZiAoYXN0Lm5hbWUgJiYgYXN0Lm5hbWUuZ2V0VGV4dCgpID09PSBwcm9wZXJ0eU5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGFzdC5uYW1lLmdldFRleHQoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAocmVmTmFtZSlcbiAgICAgIGJyZWFrO1xuICAgIHJlZk5hbWUgPSBzZWxlY3Rvci5maW5kV2l0aChpbXBvcnREZWNBc3QsICcuaW1wb3J0Q2xhdXNlID4gLm5hbWVkQmluZGluZ3M6TmFtZXNwYWNlSW1wb3J0ID4gLm5hbWU6SWRlbnRpZmllcicsXG4gICAgICAoYXN0OiB0cy5JZGVudGlmaWVyKSA9PiB7XG4gICAgICAgIHJldHVybiBhc3QuZ2V0VGV4dCgpICsgJy4nICsgcHJvcGVydHlOYW1lO1xuICAgICAgfSk7XG4gICAgaWYgKHJlZk5hbWUpXG4gICAgICBicmVhaztcbiAgfVxuICByZXR1cm4gcmVmTmFtZTtcbn1cblxuLyoqXG4gKiBUaGlzIGZ1bmN0aW9uIGRvZXMgbm90IGludGVudCB0byBiZSBmdWxseSBjb25mb3JtIHRvIHJlYWwgVFMgb3IgSlMgbW9kdWxlIHJlc29sdmUgbG9naWNcbiAqIEBwYXJhbSB0YXJnZXRQYXRoIFxuICogQHBhcmFtIGN1cnJGaWxlIFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdFJlc29sdmVNb2R1bGUodGFyZ2V0UGF0aDogc3RyaW5nLCBjdXJyRmlsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKC9eXFwuXFwuP1xcLy8udGVzdCh0YXJnZXRQYXRoKSkge1xuICAgIGNvbnN0IGFic1BhdGggPSBQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGN1cnJGaWxlKSwgdGFyZ2V0UGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHJldHVybiBhYnNQYXRoO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBQYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ25vZGVfbW9kdWxlcycsIHRhcmdldFBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgfVxufVxuIl19
