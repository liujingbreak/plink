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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy91dGlscy90cy1hc3QtdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esa0VBQXNDO0FBQ3RDLDJDQUE2QjtBQUM3QixnRUFBZ0U7QUFFaEUsU0FBZ0IscUJBQXFCLENBQUMsR0FBa0IsRUFBRSxVQUFrQixFQUFFLFlBQW9CLEVBQ2hHLFNBQTREO0lBRTVELElBQUksa0JBQTBCLENBQUM7SUFDL0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxzQkFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ25DLElBQUksU0FBUyxFQUFFO1FBQ2Isa0JBQWtCLEdBQUcsU0FBUyxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDMUQ7U0FBTTtRQUNMLGtCQUFrQixHQUFHLG9CQUFvQixDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDckU7SUFDRCxNQUFNLGFBQWEsR0FBMkIsRUFBRSxDQUFDO0lBQ2pELFFBQVEsQ0FBQyxPQUFPLENBQUMsdUNBQXVDLENBQUM7U0FDeEQsT0FBTyxDQUFDLENBQUMsZUFBaUMsRUFBRSxFQUFFO1FBQzdDLE1BQU0sSUFBSSxHQUFHLGVBQWUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZELElBQUksUUFBZ0IsQ0FBQztRQUNyQixJQUFJLFNBQVMsRUFBRTtZQUNiLFFBQVEsR0FBRyxTQUFTLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUMxQzthQUFNO1lBQ0wsUUFBUSxHQUFHLG9CQUFvQixDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDckQ7UUFDRCxJQUFJLFFBQVEsSUFBSSxRQUFRLEtBQUssa0JBQWtCLEVBQUU7WUFDL0MsYUFBYSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBOEIsQ0FBQyxDQUFDO1NBQ3BFO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsYUFBYSxJQUFJLGFBQWEsQ0FBQyxNQUFNLEtBQUssQ0FBQztRQUM5QyxPQUFPLFNBQVMsQ0FBQztJQUNuQixJQUFJLE9BQWtDLENBQUM7SUFDdkMsS0FBSyxNQUFNLFlBQVksSUFBSSxhQUFhLEVBQUU7UUFDeEMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLDRDQUE0QyxFQUFFLENBQUMsR0FBdUIsRUFBRSxFQUFFO1lBQ25ILElBQUksR0FBRyxDQUFDLFlBQVksRUFBRTtnQkFDcEIsSUFBSSxHQUFHLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxLQUFLLFlBQVk7b0JBQzdDLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzthQUM3QjtpQkFBTSxJQUFJLEdBQUcsQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxZQUFZLEVBQUU7Z0JBQzFELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzthQUMzQjtRQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxPQUFPO1lBQ1QsTUFBTTtRQUNSLE9BQU8sR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxtRUFBbUUsRUFDNUcsQ0FBQyxHQUFrQixFQUFFLEVBQUU7WUFDckIsT0FBTyxHQUFHLENBQUMsT0FBTyxFQUFFLEdBQUcsR0FBRyxHQUFHLFlBQVksQ0FBQztRQUM1QyxDQUFDLENBQUMsQ0FBQztRQUNMLElBQUksT0FBTztZQUNULE1BQU07S0FDVDtJQUNELE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUEvQ0Qsc0RBK0NDO0FBRUQ7Ozs7R0FJRztBQUNILFNBQWdCLG9CQUFvQixDQUFDLFVBQWtCLEVBQUUsUUFBZ0I7SUFDdkUsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFO1FBQy9CLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3JGLE9BQU8sT0FBTyxDQUFDO0tBQ2hCO1NBQU07UUFDTCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLGNBQWMsRUFBRSxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0tBQ3BGO0FBQ0gsQ0FBQztBQVBELG9EQU9DIiwiZmlsZSI6ImRpc3QvdXRpbHMvdHMtYXN0LXV0aWwuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdfQ==
