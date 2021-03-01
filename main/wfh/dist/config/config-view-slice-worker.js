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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXZpZXctc2xpY2Utd29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY29uZmlnL2NvbmZpZy12aWV3LXNsaWNlLXdvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLHlFQUE2QztBQUM3Qyw0Q0FBb0I7QUFHcEIsd0RBQXdEO0FBRXhELDBDQUEwQztBQUUxQyxtQkFBOEIsV0FBbUIsRUFBRSxVQUFrQixFQUFFLGdCQUFxQjs7UUFHMUYsTUFBTSxPQUFPLEdBQUcsWUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUM7UUFFaEcsTUFBTSxPQUFPLEdBQUcsTUFBTSxZQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDN0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxzQkFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMzQyxrQkFBa0I7UUFDbEIsdUVBQXVFO1FBQ3ZFLGtFQUFrRTtRQUNsRSxpQ0FBaUM7UUFDakMsc0NBQXNDO1FBQ3RDLDBDQUEwQztRQUMxQyxJQUFJLFNBQThDLENBQUM7UUFDbkQsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDL0UsSUFBSyxHQUErQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxVQUFVLEVBQUU7Z0JBQ2xFLDZHQUE2RztnQkFDN0csdUJBQXVCO2dCQUN2QixTQUFTLEdBQUcsR0FBOEIsQ0FBQztnQkFDM0MsT0FBTyxJQUFJLENBQUM7YUFDYjtRQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxLQUFLLEdBQW1CLEVBQUUsQ0FBQztRQUNqQyxJQUFJLFNBQVMsRUFBRTtZQUNiLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLDZCQUE2QixFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFFOztnQkFFekYsTUFBTSxJQUFJLEdBQUcsR0FBMkIsQ0FBQztnQkFDekMsMERBQTBEO2dCQUMxRCw0Q0FBNEM7Z0JBQzVDLGdCQUFnQjtnQkFDaEIsbUZBQW1GO2dCQUNuRixJQUFJO2dCQUNKLEtBQUssQ0FBQyxJQUFJLENBQUM7b0JBQ1QsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFO29CQUM3QixJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLHVCQUF1QixFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQ3pGLElBQUksRUFBRSxPQUFBLElBQUksQ0FBQyxJQUFJLDBDQUFFLE9BQU8sT0FBTSxFQUFFO29CQUNoQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhO2lCQUMvQixDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztTQUNKO1FBQ0QsT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMxQixDQUFDO0NBQUE7QUF6Q0QsNEJBeUNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFNlbGVjdG9yIGZyb20gJy4uL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtQcm9wZXJ0eU1ldGF9IGZyb20gJy4vY29uZmlnLnR5cGVzJztcbi8vIGltcG9ydCB7anNvblRvQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuLi90cy1jb21waWxlcic7XG5cbi8vIGxldCBjbzogdHMuQ29tcGlsZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihkdHNGaWxlQmFzZTogc3RyaW5nLCB0eXBlRXhwb3J0OiBzdHJpbmcsIF9jb21waWxlck9wdGlvbnM6IGFueSlcbjogUHJvbWlzZTxbbWV0YXM6IFByb3BlcnR5TWV0YVtdLCBkdHNGaWxlOiBzdHJpbmddPiB7XG5cbiAgY29uc3QgZHRzRmlsZSA9IGZzLmV4aXN0c1N5bmMoZHRzRmlsZUJhc2UgKyAndHMnKSA/IGR0c0ZpbGVCYXNlICsgJy50cycgOiBkdHNGaWxlQmFzZSArICcuZC50cyc7XG5cbiAgY29uc3QgY29udGVudCA9IGF3YWl0IGZzLnByb21pc2VzLnJlYWRGaWxlKGR0c0ZpbGUsICd1dGYtOCcpO1xuICBjb25zdCBzZWwgPSBuZXcgU2VsZWN0b3IoY29udGVudCwgZHRzRmlsZSk7XG4gIC8vIGlmIChjbyA9PSBudWxsKVxuICAvLyAgIGNvID0ganNvblRvQ29tcGlsZXJPcHRpb25zKGNvbXBpbGVyT3B0aW9ucywgJ3RzY29uZmlnLWJhc2UuanNvbicpO1xuICAvLyBjb25zdCB0c1BnbSA9IHRzLmNyZWF0ZVByb2dyYW0oW2R0c0ZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpXSwge1xuICAvLyAgIHRhcmdldDogdHMuU2NyaXB0VGFyZ2V0LkVTNSxcbiAgLy8gICBtb2R1bGU6IHRzLk1vZHVsZUtpbmQuQ29tbW9uSlN9KTtcbiAgLy8gY29uc3QgY2hlY2tlciA9IHRzUGdtLmdldFR5cGVDaGVja2VyKCk7XG4gIGxldCBpbnRlcmZBc3Q6IHRzLkludGVyZmFjZURlY2xhcmF0aW9uIHwgdW5kZWZpbmVkO1xuICBzZWwuc29tZShudWxsLCAnXjpJbnRlcmZhY2VEZWNsYXJhdGlvbicsIChhc3QsIHBhdGgsIHBhcmVudHMsIGlzTGVhZiwgY29tbWVudCkgPT4ge1xuICAgIGlmICgoYXN0IGFzIHRzLkludGVyZmFjZURlY2xhcmF0aW9uKS5uYW1lLmdldFRleHQoKSA9PT0gdHlwZUV4cG9ydCkge1xuICAgICAgLy8gY29uc3Qgc3ltYm9sID0gY2hlY2tlci5nZXRTeW1ib2xzSW5TY29wZSgoYXN0IGFzIHRzLkludGVyZmFjZURlY2xhcmF0aW9uKS5uYW1lLCB0cy5TeW1ib2xGbGFncy5JbnRlcmZhY2UpO1xuICAgICAgLy8gY29uc29sZS5sb2coc3ltYm9sKTtcbiAgICAgIGludGVyZkFzdCA9IGFzdCBhcyB0cy5JbnRlcmZhY2VEZWNsYXJhdGlvbjtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSk7XG4gIGNvbnN0IG1ldGFzOiBQcm9wZXJ0eU1ldGFbXSA9IFtdO1xuICBpZiAoaW50ZXJmQXN0KSB7XG4gICAgc2VsLnNvbWUoaW50ZXJmQXN0LCAnXi5tZW1iZXJzOlByb3BlcnR5U2lnbmF0dXJlJywgKGFzdCwgcGF0aCwgcGFyZW50cywgaXNMZWFmLCBjb21tZW50KSA9PiB7XG5cbiAgICAgIGNvbnN0IG5vZGUgPSBhc3QgYXMgdHMuUHJvcGVydHlTaWduYXR1cmU7XG4gICAgICAvLyBjb25zdCBzeW1ib2wgPSBjaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24obm9kZS50eXBlISk7XG4gICAgICAvLyBjb25zb2xlLmxvZyhub2RlLm5hbWUuZ2V0VGV4dCgpLCBzeW1ib2wpO1xuICAgICAgLy8gaWYgKHN5bWJvbCkge1xuICAgICAgLy8gICBjb25zb2xlLmxvZyh0cy5kaXNwbGF5UGFydHNUb1N0cmluZyhzeW1ib2wuZ2V0RG9jdW1lbnRhdGlvbkNvbW1lbnQoY2hlY2tlcikpKTtcbiAgICAgIC8vIH1cbiAgICAgIG1ldGFzLnB1c2goe1xuICAgICAgICBwcm9wZXJ0eTogbm9kZS5uYW1lLmdldFRleHQoKSxcbiAgICAgICAgZGVzYzogY29tbWVudCA/IGNvbW1lbnQucmVwbGFjZSgvKD86XlxcL1xcKlxcKlxccyp8XFwqXFwvJCkvZywgJycpLnJlcGxhY2UoL15cXHMqXFwqL21nLCAnJykgOiAnJyxcbiAgICAgICAgdHlwZTogbm9kZS50eXBlPy5nZXRUZXh0KCkgfHwgJycsXG4gICAgICAgIG9wdGlvbmFsOiAhIW5vZGUucXVlc3Rpb25Ub2tlblxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIFttZXRhcywgZHRzRmlsZV07XG59XG4iXX0=