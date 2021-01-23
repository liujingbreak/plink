"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultResolveModule = exports.resolveImportBindName = void 0;
const ts_ast_query_1 = __importDefault(require("./ts-ast-query"));
const Path = __importStar(require("path"));
// import {readTsConfig} from '@wfh/plink/wfh/dist/ts-compiler';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtYXN0LXV0aWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0cy1hc3QtdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esa0VBQXNDO0FBQ3RDLDJDQUE2QjtBQUM3QixnRUFBZ0U7QUFFaEUsU0FBZ0IscUJBQXFCLENBQUMsR0FBa0IsRUFBRSxVQUFrQixFQUFFLFlBQW9CLEVBQ2hHLFNBQTREO0lBRTVELElBQUksa0JBQTBCLENBQUM7SUFDL0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxzQkFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ25DLElBQUksU0FBUyxFQUFFO1FBQ2Isa0JBQWtCLEdBQUcsU0FBUyxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDMUQ7U0FBTTtRQUNMLGtCQUFrQixHQUFHLG9CQUFvQixDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDckU7SUFDRCxNQUFNLGFBQWEsR0FBMkIsRUFBRSxDQUFDO0lBQ2pELFFBQVEsQ0FBQyxPQUFPLENBQUMsdUNBQXVDLENBQUM7U0FDeEQsT0FBTyxDQUFDLENBQUMsZUFBaUMsRUFBRSxFQUFFO1FBQzdDLE1BQU0sSUFBSSxHQUFHLGVBQWUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZELElBQUksUUFBZ0IsQ0FBQztRQUNyQixJQUFJLFNBQVMsRUFBRTtZQUNiLFFBQVEsR0FBRyxTQUFTLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUMxQzthQUFNO1lBQ0wsUUFBUSxHQUFHLG9CQUFvQixDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDckQ7UUFDRCxJQUFJLFFBQVEsSUFBSSxRQUFRLEtBQUssa0JBQWtCLEVBQUU7WUFDL0MsYUFBYSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBOEIsQ0FBQyxDQUFDO1NBQ3BFO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsYUFBYSxJQUFJLGFBQWEsQ0FBQyxNQUFNLEtBQUssQ0FBQztRQUM5QyxPQUFPLFNBQVMsQ0FBQztJQUNuQixJQUFJLE9BQWtDLENBQUM7SUFDdkMsS0FBSyxNQUFNLFlBQVksSUFBSSxhQUFhLEVBQUU7UUFDeEMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLDRDQUE0QyxFQUFFLENBQUMsR0FBdUIsRUFBRSxFQUFFO1lBQ25ILElBQUksR0FBRyxDQUFDLFlBQVksRUFBRTtnQkFDcEIsSUFBSSxHQUFHLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxLQUFLLFlBQVk7b0JBQzdDLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzthQUM3QjtpQkFBTSxJQUFJLEdBQUcsQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxZQUFZLEVBQUU7Z0JBQzFELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzthQUMzQjtRQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxPQUFPO1lBQ1QsTUFBTTtRQUNSLE9BQU8sR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxtRUFBbUUsRUFDNUcsQ0FBQyxHQUFrQixFQUFFLEVBQUU7WUFDckIsT0FBTyxHQUFHLENBQUMsT0FBTyxFQUFFLEdBQUcsR0FBRyxHQUFHLFlBQVksQ0FBQztRQUM1QyxDQUFDLENBQUMsQ0FBQztRQUNMLElBQUksT0FBTztZQUNULE1BQU07S0FDVDtJQUNELE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUEvQ0Qsc0RBK0NDO0FBRUQ7Ozs7R0FJRztBQUNILFNBQWdCLG9CQUFvQixDQUFDLFVBQWtCLEVBQUUsUUFBZ0I7SUFDdkUsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFO1FBQy9CLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3JGLE9BQU8sT0FBTyxDQUFDO0tBQ2hCO1NBQU07UUFDTCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLGNBQWMsRUFBRSxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0tBQ3BGO0FBQ0gsQ0FBQztBQVBELG9EQU9DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgU2VsZWN0b3IgZnJvbSAnLi90cy1hc3QtcXVlcnknO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCB7cmVhZFRzQ29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RzLWNvbXBpbGVyJztcblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVJbXBvcnRCaW5kTmFtZShzcmM6IHRzLlNvdXJjZUZpbGUsIG1vZHVsZVBhdGg6IHN0cmluZywgcHJvcGVydHlOYW1lOiBzdHJpbmcsXG4gIHJlc29sdmVGbj86ICh0YXJnZXRQYXRoOiBzdHJpbmcsIGN1cnJGaWxlOiBzdHJpbmcpID0+IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB8IG51bGwge1xuXG4gIGxldCByZXNvbHZlZE1vZHVsZVBhdGg6IHN0cmluZztcbiAgY29uc3Qgc2VsZWN0b3IgPSBuZXcgU2VsZWN0b3Ioc3JjKTtcbiAgaWYgKHJlc29sdmVGbikge1xuICAgIHJlc29sdmVkTW9kdWxlUGF0aCA9IHJlc29sdmVGbihtb2R1bGVQYXRoLCBzcmMuZmlsZU5hbWUpO1xuICB9IGVsc2Uge1xuICAgIHJlc29sdmVkTW9kdWxlUGF0aCA9IGRlZmF1bHRSZXNvbHZlTW9kdWxlKG1vZHVsZVBhdGgsIHNyYy5maWxlTmFtZSk7XG4gIH1cbiAgY29uc3QgaW1wb3J0RGVjQXN0czogdHMuSW1wb3J0RGVjbGFyYXRpb25bXSA9IFtdO1xuICBzZWxlY3Rvci5maW5kQWxsKCc6SW1wb3J0RGVjbGFyYXRpb24gPiAubW9kdWxlU3BlY2lmaWVyJylcbiAgLmZvckVhY2goKG1vZHVsZVNwZWNpZmllcjogdHMuU3RyaW5nTGl0ZXJhbCkgPT4ge1xuICAgIGNvbnN0IHRleHQgPSBtb2R1bGVTcGVjaWZpZXIuZ2V0VGV4dChzcmMpLnNsaWNlKDEsIC0xKTtcbiAgICBsZXQgcmVzb2x2ZWQ6IHN0cmluZztcbiAgICBpZiAocmVzb2x2ZUZuKSB7XG4gICAgICByZXNvbHZlZCA9IHJlc29sdmVGbih0ZXh0LCBzcmMuZmlsZU5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXNvbHZlZCA9IGRlZmF1bHRSZXNvbHZlTW9kdWxlKHRleHQsIHNyYy5maWxlTmFtZSk7XG4gICAgfVxuICAgIGlmIChyZXNvbHZlZCAmJiByZXNvbHZlZCA9PT0gcmVzb2x2ZWRNb2R1bGVQYXRoKSB7XG4gICAgICBpbXBvcnREZWNBc3RzLnB1c2gobW9kdWxlU3BlY2lmaWVyLnBhcmVudCBhcyB0cy5JbXBvcnREZWNsYXJhdGlvbik7XG4gICAgfVxuICB9KTtcblxuICBpZiAoIWltcG9ydERlY0FzdHMgfHwgaW1wb3J0RGVjQXN0cy5sZW5ndGggPT09IDApXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgbGV0IHJlZk5hbWU6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQ7XG4gIGZvciAoY29uc3QgaW1wb3J0RGVjQXN0IG9mIGltcG9ydERlY0FzdHMpIHtcbiAgICByZWZOYW1lID0gc2VsZWN0b3IuZmluZE1hcFRvKGltcG9ydERlY0FzdCwgJy5pbXBvcnRDbGF1c2UgPiAubmFtZWRCaW5kaW5ncyA+IC5lbGVtZW50cycsIChhc3Q6IHRzLkltcG9ydFNwZWNpZmllcikgPT4ge1xuICAgICAgaWYgKGFzdC5wcm9wZXJ0eU5hbWUpIHtcbiAgICAgICAgaWYgKGFzdC5wcm9wZXJ0eU5hbWUuZ2V0VGV4dCgpID09PSBwcm9wZXJ0eU5hbWUpXG4gICAgICAgICAgcmV0dXJuIGFzdC5uYW1lLmdldFRleHQoKTtcbiAgICAgIH0gZWxzZSBpZiAoYXN0Lm5hbWUgJiYgYXN0Lm5hbWUuZ2V0VGV4dCgpID09PSBwcm9wZXJ0eU5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGFzdC5uYW1lLmdldFRleHQoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAocmVmTmFtZSlcbiAgICAgIGJyZWFrO1xuICAgIHJlZk5hbWUgPSBzZWxlY3Rvci5maW5kTWFwVG8oaW1wb3J0RGVjQXN0LCAnLmltcG9ydENsYXVzZSA+IC5uYW1lZEJpbmRpbmdzOk5hbWVzcGFjZUltcG9ydCA+IC5uYW1lOklkZW50aWZpZXInLFxuICAgICAgKGFzdDogdHMuSWRlbnRpZmllcikgPT4ge1xuICAgICAgICByZXR1cm4gYXN0LmdldFRleHQoKSArICcuJyArIHByb3BlcnR5TmFtZTtcbiAgICAgIH0pO1xuICAgIGlmIChyZWZOYW1lKVxuICAgICAgYnJlYWs7XG4gIH1cbiAgcmV0dXJuIHJlZk5hbWU7XG59XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBkb2VzIG5vdCBpbnRlbnQgdG8gYmUgZnVsbHkgY29uZm9ybSB0byByZWFsIFRTIG9yIEpTIG1vZHVsZSByZXNvbHZlIGxvZ2ljXG4gKiBAcGFyYW0gdGFyZ2V0UGF0aCBcbiAqIEBwYXJhbSBjdXJyRmlsZSBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRSZXNvbHZlTW9kdWxlKHRhcmdldFBhdGg6IHN0cmluZywgY3VyckZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICgvXlxcLlxcLj9cXC8vLnRlc3QodGFyZ2V0UGF0aCkpIHtcbiAgICBjb25zdCBhYnNQYXRoID0gUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShjdXJyRmlsZSksIHRhcmdldFBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICByZXR1cm4gYWJzUGF0aDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gUGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICdub2RlX21vZHVsZXMnLCB0YXJnZXRQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIH1cbn1cbiJdfQ==