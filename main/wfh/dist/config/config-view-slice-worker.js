"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ts_ast_query_1 = __importDefault(require("../utils/ts-ast-query"));
const fs_1 = __importDefault(require("fs"));
// import {jsonToCompilerOptions} from '../ts-compiler';
// let co: ts.CompilerOptions | undefined;
function default_1(dtsFileBase, typeExport, _compilerOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        const dtsFile = fs_1.default.existsSync(dtsFileBase + 'ts') ? dtsFileBase + '.ts' : dtsFileBase + '.d.ts';
        const content = yield fs_1.default.promises.readFile(dtsFile, 'utf-8');
        const sel = new ts_ast_query_1.default(content, dtsFile);
        // if (co == null)
        //   co = jsonToCompilerOptions(compilerOptions, 'tsconfig-base.json');
        // const tsPgm = ts.createProgram([dtsFile.replace(/\\/g, '/')], {
        //   target: ts.ScriptTarget.ES5,
        //   module: ts.ModuleKind.CommonJS});
        // const checker = tsPgm.getTypeChecker();
        let interfAst;
        sel.some(null, '^:InterfaceDeclaration', (ast, path, parents, isLeaf, comment) => {
            if (ast.name.getText() === typeExport) {
                // const symbol = checker.getSymbolsInScope((ast as ts.InterfaceDeclaration).name, ts.SymbolFlags.Interface);
                // console.log(symbol);
                interfAst = ast;
                return true;
            }
        });
        const metas = [];
        if (interfAst) {
            sel.some(interfAst, '^.members:PropertySignature', (ast, path, parents, isLeaf, comment) => {
                var _a;
                const node = ast;
                // const symbol = checker.getSymbolAtLocation(node.type!);
                // console.log(node.name.getText(), symbol);
                // if (symbol) {
                //   console.log(ts.displayPartsToString(symbol.getDocumentationComment(checker)));
                // }
                metas.push({
                    property: node.name.getText(),
                    desc: comment ? comment.replace(/(?:^\/\*\*\s*|\*\/$)/g, '').replace(/^\s*\*/mg, '') : '',
                    type: ((_a = node.type) === null || _a === void 0 ? void 0 : _a.getText()) || '',
                    optional: !!node.questionToken
                });
            });
        }
        return [metas, dtsFile];
    });
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXZpZXctc2xpY2Utd29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY29uZmlnL2NvbmZpZy12aWV3LXNsaWNlLXdvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLHlFQUE2QztBQUM3Qyw0Q0FBb0I7QUFHcEIsd0RBQXdEO0FBRXhELDBDQUEwQztBQUUxQyxtQkFBOEIsV0FBbUIsRUFBRSxVQUFrQixFQUFFLGdCQUFxQjs7UUFHMUYsTUFBTSxPQUFPLEdBQUcsWUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUM7UUFFaEcsTUFBTSxPQUFPLEdBQUcsTUFBTSxZQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDN0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxzQkFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMzQyxrQkFBa0I7UUFDbEIsdUVBQXVFO1FBQ3ZFLGtFQUFrRTtRQUNsRSxpQ0FBaUM7UUFDakMsc0NBQXNDO1FBQ3RDLDBDQUEwQztRQUMxQyxJQUFJLFNBQThDLENBQUM7UUFDbkQsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDL0UsSUFBSyxHQUErQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxVQUFVLEVBQUU7Z0JBQ2xFLDZHQUE2RztnQkFDN0csdUJBQXVCO2dCQUN2QixTQUFTLEdBQUcsR0FBOEIsQ0FBQztnQkFDM0MsT0FBTyxJQUFJLENBQUM7YUFDYjtRQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxLQUFLLEdBQW1CLEVBQUUsQ0FBQztRQUNqQyxJQUFJLFNBQVMsRUFBRTtZQUNiLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLDZCQUE2QixFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFFOztnQkFFekYsTUFBTSxJQUFJLEdBQUcsR0FBMkIsQ0FBQztnQkFDekMsMERBQTBEO2dCQUMxRCw0Q0FBNEM7Z0JBQzVDLGdCQUFnQjtnQkFDaEIsbUZBQW1GO2dCQUNuRixJQUFJO2dCQUNKLEtBQUssQ0FBQyxJQUFJLENBQUM7b0JBQ1QsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFO29CQUM3QixJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLHVCQUF1QixFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQ3pGLElBQUksRUFBRSxDQUFBLE1BQUEsSUFBSSxDQUFDLElBQUksMENBQUUsT0FBTyxFQUFFLEtBQUksRUFBRTtvQkFDaEMsUUFBUSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYTtpQkFDL0IsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7U0FDSjtRQUNELE9BQU8sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDMUIsQ0FBQztDQUFBO0FBekNELDRCQXlDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBTZWxlY3RvciBmcm9tICcuLi91dGlscy90cy1hc3QtcXVlcnknO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7UHJvcGVydHlNZXRhfSBmcm9tICcuL2NvbmZpZy50eXBlcyc7XG4vLyBpbXBvcnQge2pzb25Ub0NvbXBpbGVyT3B0aW9uc30gZnJvbSAnLi4vdHMtY29tcGlsZXInO1xuXG4vLyBsZXQgY286IHRzLkNvbXBpbGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24oZHRzRmlsZUJhc2U6IHN0cmluZywgdHlwZUV4cG9ydDogc3RyaW5nLCBfY29tcGlsZXJPcHRpb25zOiBhbnkpXG46IFByb21pc2U8W21ldGFzOiBQcm9wZXJ0eU1ldGFbXSwgZHRzRmlsZTogc3RyaW5nXT4ge1xuXG4gIGNvbnN0IGR0c0ZpbGUgPSBmcy5leGlzdHNTeW5jKGR0c0ZpbGVCYXNlICsgJ3RzJykgPyBkdHNGaWxlQmFzZSArICcudHMnIDogZHRzRmlsZUJhc2UgKyAnLmQudHMnO1xuXG4gIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZShkdHNGaWxlLCAndXRmLTgnKTtcbiAgY29uc3Qgc2VsID0gbmV3IFNlbGVjdG9yKGNvbnRlbnQsIGR0c0ZpbGUpO1xuICAvLyBpZiAoY28gPT0gbnVsbClcbiAgLy8gICBjbyA9IGpzb25Ub0NvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMsICd0c2NvbmZpZy1iYXNlLmpzb24nKTtcbiAgLy8gY29uc3QgdHNQZ20gPSB0cy5jcmVhdGVQcm9ncmFtKFtkdHNGaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKV0sIHtcbiAgLy8gICB0YXJnZXQ6IHRzLlNjcmlwdFRhcmdldC5FUzUsXG4gIC8vICAgbW9kdWxlOiB0cy5Nb2R1bGVLaW5kLkNvbW1vbkpTfSk7XG4gIC8vIGNvbnN0IGNoZWNrZXIgPSB0c1BnbS5nZXRUeXBlQ2hlY2tlcigpO1xuICBsZXQgaW50ZXJmQXN0OiB0cy5JbnRlcmZhY2VEZWNsYXJhdGlvbiB8IHVuZGVmaW5lZDtcbiAgc2VsLnNvbWUobnVsbCwgJ146SW50ZXJmYWNlRGVjbGFyYXRpb24nLCAoYXN0LCBwYXRoLCBwYXJlbnRzLCBpc0xlYWYsIGNvbW1lbnQpID0+IHtcbiAgICBpZiAoKGFzdCBhcyB0cy5JbnRlcmZhY2VEZWNsYXJhdGlvbikubmFtZS5nZXRUZXh0KCkgPT09IHR5cGVFeHBvcnQpIHtcbiAgICAgIC8vIGNvbnN0IHN5bWJvbCA9IGNoZWNrZXIuZ2V0U3ltYm9sc0luU2NvcGUoKGFzdCBhcyB0cy5JbnRlcmZhY2VEZWNsYXJhdGlvbikubmFtZSwgdHMuU3ltYm9sRmxhZ3MuSW50ZXJmYWNlKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKHN5bWJvbCk7XG4gICAgICBpbnRlcmZBc3QgPSBhc3QgYXMgdHMuSW50ZXJmYWNlRGVjbGFyYXRpb247XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH0pO1xuICBjb25zdCBtZXRhczogUHJvcGVydHlNZXRhW10gPSBbXTtcbiAgaWYgKGludGVyZkFzdCkge1xuICAgIHNlbC5zb21lKGludGVyZkFzdCwgJ14ubWVtYmVyczpQcm9wZXJ0eVNpZ25hdHVyZScsIChhc3QsIHBhdGgsIHBhcmVudHMsIGlzTGVhZiwgY29tbWVudCkgPT4ge1xuXG4gICAgICBjb25zdCBub2RlID0gYXN0IGFzIHRzLlByb3BlcnR5U2lnbmF0dXJlO1xuICAgICAgLy8gY29uc3Qgc3ltYm9sID0gY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUudHlwZSEpO1xuICAgICAgLy8gY29uc29sZS5sb2cobm9kZS5uYW1lLmdldFRleHQoKSwgc3ltYm9sKTtcbiAgICAgIC8vIGlmIChzeW1ib2wpIHtcbiAgICAgIC8vICAgY29uc29sZS5sb2codHMuZGlzcGxheVBhcnRzVG9TdHJpbmcoc3ltYm9sLmdldERvY3VtZW50YXRpb25Db21tZW50KGNoZWNrZXIpKSk7XG4gICAgICAvLyB9XG4gICAgICBtZXRhcy5wdXNoKHtcbiAgICAgICAgcHJvcGVydHk6IG5vZGUubmFtZS5nZXRUZXh0KCksXG4gICAgICAgIGRlc2M6IGNvbW1lbnQgPyBjb21tZW50LnJlcGxhY2UoLyg/Ol5cXC9cXCpcXCpcXHMqfFxcKlxcLyQpL2csICcnKS5yZXBsYWNlKC9eXFxzKlxcKi9tZywgJycpIDogJycsXG4gICAgICAgIHR5cGU6IG5vZGUudHlwZT8uZ2V0VGV4dCgpIHx8ICcnLFxuICAgICAgICBvcHRpb25hbDogISFub2RlLnF1ZXN0aW9uVG9rZW5cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG4gIHJldHVybiBbbWV0YXMsIGR0c0ZpbGVdO1xufVxuIl19