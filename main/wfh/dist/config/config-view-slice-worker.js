"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ts_ast_query_1 = __importDefault(require("../utils/ts-ast-query"));
const fs_1 = __importDefault(require("fs"));
// import {jsonToCompilerOptions} from '../ts-compiler';
// let co: ts.CompilerOptions | undefined;
async function default_1(dtsFileBase, typeExport, _compilerOptions) {
    const dtsFile = fs_1.default.existsSync(dtsFileBase + 'ts') ? dtsFileBase + '.ts' : dtsFileBase + '.d.ts';
    const content = await fs_1.default.promises.readFile(dtsFile, 'utf-8');
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
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXZpZXctc2xpY2Utd29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY29uZmlnL2NvbmZpZy12aWV3LXNsaWNlLXdvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLHlFQUE2QztBQUM3Qyw0Q0FBb0I7QUFHcEIsd0RBQXdEO0FBRXhELDBDQUEwQztBQUUzQixLQUFLLG9CQUFVLFdBQW1CLEVBQUUsVUFBa0IsRUFBRSxnQkFBcUI7SUFHMUYsTUFBTSxPQUFPLEdBQUcsWUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUM7SUFFaEcsTUFBTSxPQUFPLEdBQUcsTUFBTSxZQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDN0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxzQkFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMzQyxrQkFBa0I7SUFDbEIsdUVBQXVFO0lBQ3ZFLGtFQUFrRTtJQUNsRSxpQ0FBaUM7SUFDakMsc0NBQXNDO0lBQ3RDLDBDQUEwQztJQUMxQyxJQUFJLFNBQThDLENBQUM7SUFDbkQsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUU7UUFDL0UsSUFBSyxHQUErQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxVQUFVLEVBQUU7WUFDbEUsNkdBQTZHO1lBQzdHLHVCQUF1QjtZQUN2QixTQUFTLEdBQUcsR0FBOEIsQ0FBQztZQUMzQyxPQUFPLElBQUksQ0FBQztTQUNiO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSCxNQUFNLEtBQUssR0FBbUIsRUFBRSxDQUFDO0lBQ2pDLElBQUksU0FBUyxFQUFFO1FBQ2IsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsNkJBQTZCLEVBQUUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUU7O1lBRXpGLE1BQU0sSUFBSSxHQUFHLEdBQTJCLENBQUM7WUFDekMsMERBQTBEO1lBQzFELDRDQUE0QztZQUM1QyxnQkFBZ0I7WUFDaEIsbUZBQW1GO1lBQ25GLElBQUk7WUFDSixLQUFLLENBQUMsSUFBSSxDQUFDO2dCQUNULFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtnQkFDN0IsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUN6RixJQUFJLEVBQUUsQ0FBQSxNQUFBLElBQUksQ0FBQyxJQUFJLDBDQUFFLE9BQU8sRUFBRSxLQUFJLEVBQUU7Z0JBQ2hDLFFBQVEsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWE7YUFDL0IsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7S0FDSjtJQUNELE9BQU8sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDMUIsQ0FBQztBQXpDRCw0QkF5Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgU2VsZWN0b3IgZnJvbSAnLi4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge1Byb3BlcnR5TWV0YX0gZnJvbSAnLi9jb25maWcudHlwZXMnO1xuLy8gaW1wb3J0IHtqc29uVG9Db21waWxlck9wdGlvbnN9IGZyb20gJy4uL3RzLWNvbXBpbGVyJztcblxuLy8gbGV0IGNvOiB0cy5Db21waWxlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uKGR0c0ZpbGVCYXNlOiBzdHJpbmcsIHR5cGVFeHBvcnQ6IHN0cmluZywgX2NvbXBpbGVyT3B0aW9uczogYW55KVxuOiBQcm9taXNlPFttZXRhczogUHJvcGVydHlNZXRhW10sIGR0c0ZpbGU6IHN0cmluZ10+IHtcblxuICBjb25zdCBkdHNGaWxlID0gZnMuZXhpc3RzU3luYyhkdHNGaWxlQmFzZSArICd0cycpID8gZHRzRmlsZUJhc2UgKyAnLnRzJyA6IGR0c0ZpbGVCYXNlICsgJy5kLnRzJztcblxuICBjb25zdCBjb250ZW50ID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZEZpbGUoZHRzRmlsZSwgJ3V0Zi04Jyk7XG4gIGNvbnN0IHNlbCA9IG5ldyBTZWxlY3Rvcihjb250ZW50LCBkdHNGaWxlKTtcbiAgLy8gaWYgKGNvID09IG51bGwpXG4gIC8vICAgY28gPSBqc29uVG9Db21waWxlck9wdGlvbnMoY29tcGlsZXJPcHRpb25zLCAndHNjb25maWctYmFzZS5qc29uJyk7XG4gIC8vIGNvbnN0IHRzUGdtID0gdHMuY3JlYXRlUHJvZ3JhbShbZHRzRmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJyldLCB7XG4gIC8vICAgdGFyZ2V0OiB0cy5TY3JpcHRUYXJnZXQuRVM1LFxuICAvLyAgIG1vZHVsZTogdHMuTW9kdWxlS2luZC5Db21tb25KU30pO1xuICAvLyBjb25zdCBjaGVja2VyID0gdHNQZ20uZ2V0VHlwZUNoZWNrZXIoKTtcbiAgbGV0IGludGVyZkFzdDogdHMuSW50ZXJmYWNlRGVjbGFyYXRpb24gfCB1bmRlZmluZWQ7XG4gIHNlbC5zb21lKG51bGwsICdeOkludGVyZmFjZURlY2xhcmF0aW9uJywgKGFzdCwgcGF0aCwgcGFyZW50cywgaXNMZWFmLCBjb21tZW50KSA9PiB7XG4gICAgaWYgKChhc3QgYXMgdHMuSW50ZXJmYWNlRGVjbGFyYXRpb24pLm5hbWUuZ2V0VGV4dCgpID09PSB0eXBlRXhwb3J0KSB7XG4gICAgICAvLyBjb25zdCBzeW1ib2wgPSBjaGVja2VyLmdldFN5bWJvbHNJblNjb3BlKChhc3QgYXMgdHMuSW50ZXJmYWNlRGVjbGFyYXRpb24pLm5hbWUsIHRzLlN5bWJvbEZsYWdzLkludGVyZmFjZSk7XG4gICAgICAvLyBjb25zb2xlLmxvZyhzeW1ib2wpO1xuICAgICAgaW50ZXJmQXN0ID0gYXN0IGFzIHRzLkludGVyZmFjZURlY2xhcmF0aW9uO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9KTtcbiAgY29uc3QgbWV0YXM6IFByb3BlcnR5TWV0YVtdID0gW107XG4gIGlmIChpbnRlcmZBc3QpIHtcbiAgICBzZWwuc29tZShpbnRlcmZBc3QsICdeLm1lbWJlcnM6UHJvcGVydHlTaWduYXR1cmUnLCAoYXN0LCBwYXRoLCBwYXJlbnRzLCBpc0xlYWYsIGNvbW1lbnQpID0+IHtcblxuICAgICAgY29uc3Qgbm9kZSA9IGFzdCBhcyB0cy5Qcm9wZXJ0eVNpZ25hdHVyZTtcbiAgICAgIC8vIGNvbnN0IHN5bWJvbCA9IGNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlLnR5cGUhKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKG5vZGUubmFtZS5nZXRUZXh0KCksIHN5bWJvbCk7XG4gICAgICAvLyBpZiAoc3ltYm9sKSB7XG4gICAgICAvLyAgIGNvbnNvbGUubG9nKHRzLmRpc3BsYXlQYXJ0c1RvU3RyaW5nKHN5bWJvbC5nZXREb2N1bWVudGF0aW9uQ29tbWVudChjaGVja2VyKSkpO1xuICAgICAgLy8gfVxuICAgICAgbWV0YXMucHVzaCh7XG4gICAgICAgIHByb3BlcnR5OiBub2RlLm5hbWUuZ2V0VGV4dCgpLFxuICAgICAgICBkZXNjOiBjb21tZW50ID8gY29tbWVudC5yZXBsYWNlKC8oPzpeXFwvXFwqXFwqXFxzKnxcXCpcXC8kKS9nLCAnJykucmVwbGFjZSgvXlxccypcXCovbWcsICcnKSA6ICcnLFxuICAgICAgICB0eXBlOiBub2RlLnR5cGU/LmdldFRleHQoKSB8fCAnJyxcbiAgICAgICAgb3B0aW9uYWw6ICEhbm9kZS5xdWVzdGlvblRva2VuXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gW21ldGFzLCBkdHNGaWxlXTtcbn1cbiJdfQ==