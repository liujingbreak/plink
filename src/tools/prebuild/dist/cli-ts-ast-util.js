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
exports.listExportedFunction = void 0;
const ts_ast_query_1 = __importStar(require("@wfh/plink/wfh/dist/utils/ts-ast-query"));
const fs_1 = __importDefault(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
const { SyntaxKind } = ts_ast_query_1.typescript;
/**
 * List exported public functions and its parameters
 */
function listExportedFunction(file) {
    const sel = new ts_ast_query_1.default(fs_1.default.readFileSync(file, 'utf8'), file);
    const founds = sel.findAll(' ^ :FunctionDeclaration > .modifiers:ExportKeyword').map(ast => {
        const fnAst = ast.parent;
        let name = '?';
        if (fnAst.modifiers.find(modifier => modifier.kind === SyntaxKind.DefaultKeyword)) {
            name = 'default';
        }
        else if (fnAst.name) {
            name = fnAst.name.getText();
        }
        // eslint-disable-next-line no-console
        console.log(sel.src.getFullText().slice(fnAst.getStart(sel.src, true), fnAst.getStart()));
        const params = sel.findAll(fnAst, '^ .parameters >.name').map((param) => param.getText());
        return chalk_1.default.cyan(name) + ` ( ${params.join(', ')} ) `;
    });
    // eslint-disable-next-line no-console
    console.log(founds.join('\n'));
}
exports.listExportedFunction = listExportedFunction;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXRzLWFzdC11dGlsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLXRzLWFzdC11dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1RkFBa0Y7QUFDbEYsNENBQW9CO0FBQ3BCLGtEQUEwQjtBQUUxQixNQUFNLEVBQUMsVUFBVSxFQUFDLEdBQUcseUJBQUUsQ0FBQztBQUN4Qjs7R0FFRztBQUNILFNBQWdCLG9CQUFvQixDQUFDLElBQVk7SUFDL0MsTUFBTSxHQUFHLEdBQUcsSUFBSSxzQkFBUSxDQUFDLFlBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBRTlELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsb0RBQW9ELENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDekYsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQWdDLENBQUM7UUFDbkQsSUFBSSxJQUFJLEdBQUcsR0FBRyxDQUFDO1FBRWYsSUFBSSxLQUFLLENBQUMsU0FBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFDLGNBQWMsQ0FBQyxFQUFFO1lBQ2xGLElBQUksR0FBRyxTQUFTLENBQUM7U0FDbEI7YUFBTSxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUU7WUFDckIsSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7U0FDN0I7UUFDRCxzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxRixNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxzQkFBc0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDMUYsT0FBTyxlQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQ3pELENBQUMsQ0FBQyxDQUFDO0lBRUgsc0NBQXNDO0lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLENBQUM7QUFwQkQsb0RBb0JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFNlbGVjdG9yLCB7dHlwZXNjcmlwdCBhcyB0c30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy90cy1hc3QtcXVlcnknO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5cbmNvbnN0IHtTeW50YXhLaW5kfSA9IHRzO1xuLyoqXG4gKiBMaXN0IGV4cG9ydGVkIHB1YmxpYyBmdW5jdGlvbnMgYW5kIGl0cyBwYXJhbWV0ZXJzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsaXN0RXhwb3J0ZWRGdW5jdGlvbihmaWxlOiBzdHJpbmcpIHtcbiAgY29uc3Qgc2VsID0gbmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlKTtcblxuICBjb25zdCBmb3VuZHMgPSBzZWwuZmluZEFsbCgnIF4gOkZ1bmN0aW9uRGVjbGFyYXRpb24gPiAubW9kaWZpZXJzOkV4cG9ydEtleXdvcmQnKS5tYXAoYXN0ID0+IHtcbiAgICBjb25zdCBmbkFzdCA9IGFzdC5wYXJlbnQgYXMgdHMuRnVuY3Rpb25EZWNsYXJhdGlvbjtcbiAgICBsZXQgbmFtZSA9ICc/JztcblxuICAgIGlmIChmbkFzdC5tb2RpZmllcnMhLmZpbmQobW9kaWZpZXIgPT4gbW9kaWZpZXIua2luZCA9PT0gU3ludGF4S2luZC5EZWZhdWx0S2V5d29yZCkpIHtcbiAgICAgIG5hbWUgPSAnZGVmYXVsdCc7XG4gICAgfSBlbHNlIGlmIChmbkFzdC5uYW1lKSB7XG4gICAgICBuYW1lID0gZm5Bc3QubmFtZS5nZXRUZXh0KCk7XG4gICAgfVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coc2VsLnNyYy5nZXRGdWxsVGV4dCgpLnNsaWNlKGZuQXN0LmdldFN0YXJ0KHNlbC5zcmMsIHRydWUpLCBmbkFzdC5nZXRTdGFydCgpKSk7XG4gICAgY29uc3QgcGFyYW1zID0gc2VsLmZpbmRBbGwoZm5Bc3QsICdeIC5wYXJhbWV0ZXJzID4ubmFtZScpLm1hcCgocGFyYW0pID0+IHBhcmFtLmdldFRleHQoKSk7XG4gICAgcmV0dXJuIGNoYWxrLmN5YW4obmFtZSkgKyBgICggJHtwYXJhbXMuam9pbignLCAnKX0gKSBgO1xuICB9KTtcblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhmb3VuZHMuam9pbignXFxuJykpO1xufVxuIl19