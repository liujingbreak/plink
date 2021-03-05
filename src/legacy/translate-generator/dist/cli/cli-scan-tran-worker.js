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
exports.scanFile = void 0;
const ts_ast_query_1 = __importStar(require("@wfh/plink/wfh/dist/utils/ts-ast-query"));
const fs_1 = __importDefault(require("fs"));
// import chalk from 'chalk';
// import Path from 'path';
const plink_1 = require("@wfh/plink");
const yamljs_1 = __importDefault(require("yamljs"));
// enforce default log4js configuration
require("@wfh/plink/wfh/dist/config");
const log = plink_1.logger.getLogger('@wfh/translate-generator');
plink_1.initAsChildProcess();
// initConfig({config: [], prop: []});
const kinds = ts_ast_query_1.typescript.SyntaxKind;
const EXCLUDE_SYNTAX = [kinds.ImportDeclaration, kinds.LiteralType, kinds.UnionType];
const INCLUDE_SYNTAX = [kinds.StringLiteral,
    kinds.FirstTemplateToken,
    kinds.TemplateExpression,
    kinds.JsxElement,
    kinds.LastTemplateToken
];
function scanFile(file, metaDataFile) {
    const sel = new ts_ast_query_1.default(fs_1.default.readFileSync(file, 'utf8'), file);
    const info = [];
    const oldTransMap = new Map();
    if (fs_1.default.existsSync(metaDataFile)) {
        const translatbles = yamljs_1.default.load(metaDataFile);
        for (const item of translatbles) {
            oldTransMap.set(item.key, item);
        }
    }
    const newTranslatebles = [];
    sel.some(null, null, (ast, path, parents, isLeaf, comment) => {
        if (EXCLUDE_SYNTAX.includes(ast.kind))
            return 'SKIP';
        if (INCLUDE_SYNTAX.includes(ast.kind)) {
            const lineCol = ts_ast_query_1.typescript.getLineAndCharacterOfPosition(sel.src, ast.getStart());
            const scannedInfoItem = {
                key: ast.getText(),
                text: null,
                start: ast.getStart(),
                end: ast.getEnd(),
                desc: `${kinds[ast.kind]} line:${lineCol.line + 1}, col:${lineCol.character + 1}`
            };
            newTranslatebles.push(scannedInfoItem);
            if (log.isDebugEnabled())
                log.debug(`${file} (${lineCol.line + 1}:${lineCol.character + 1}):`, ast.getText());
            const originTrans = oldTransMap.get(ast.getText());
            if (originTrans != null && originTrans.text != null) {
                scannedInfoItem.text = originTrans.text;
            }
            return 'SKIP';
        }
    });
    fs_1.default.writeFileSync(metaDataFile, yamljs_1.default.stringify(newTranslatebles, 3));
    // console.log(file + `: ${chalk.green(info.length)} found.`);
    log.info(metaDataFile + ' is written');
    return info;
}
exports.scanFile = scanFile;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXNjYW4tdHJhbi13b3JrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGktc2Nhbi10cmFuLXdvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsdUZBQWtGO0FBQ2xGLDRDQUFvQjtBQUNwQiw2QkFBNkI7QUFDN0IsMkJBQTJCO0FBQzNCLHNDQUFzRDtBQUV0RCxvREFBNEI7QUFDNUIsdUNBQXVDO0FBQ3ZDLHNDQUFvQztBQUNwQyxNQUFNLEdBQUcsR0FBRyxjQUFNLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUFDLENBQUM7QUFFekQsMEJBQWtCLEVBQUUsQ0FBQztBQUNyQixzQ0FBc0M7QUFDdEMsTUFBTSxLQUFLLEdBQUcseUJBQUUsQ0FBQyxVQUFVLENBQUM7QUFDNUIsTUFBTSxjQUFjLEdBQUcsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDckYsTUFBTSxjQUFjLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYTtJQUN6QyxLQUFLLENBQUMsa0JBQWtCO0lBQ3hCLEtBQUssQ0FBQyxrQkFBa0I7SUFDeEIsS0FBSyxDQUFDLFVBQVU7SUFDaEIsS0FBSyxDQUFDLGlCQUFpQjtDQUN4QixDQUFDO0FBRUYsU0FBZ0IsUUFBUSxDQUFDLElBQVksRUFBRSxZQUFvQjtJQUN6RCxNQUFNLEdBQUcsR0FBRyxJQUFJLHNCQUFRLENBQUMsWUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDOUQsTUFBTSxJQUFJLEdBQWlCLEVBQUUsQ0FBQztJQUM5QixNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBd0IsQ0FBQztJQUNwRCxJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUU7UUFDL0IsTUFBTSxZQUFZLEdBQUcsZ0JBQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFtQixDQUFDO1FBQ2pFLEtBQUssTUFBTSxJQUFJLElBQUksWUFBWSxFQUFFO1lBQy9CLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztTQUNqQztLQUNGO0lBRUQsTUFBTSxnQkFBZ0IsR0FBbUIsRUFBRSxDQUFDO0lBQzVDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUMzRCxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztZQUNuQyxPQUFPLE1BQU0sQ0FBQztRQUNoQixJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3JDLE1BQU0sT0FBTyxHQUFHLHlCQUFFLENBQUMsNkJBQTZCLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUMxRSxNQUFNLGVBQWUsR0FBaUI7Z0JBQ3BDLEdBQUcsRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFO2dCQUNsQixJQUFJLEVBQUUsSUFBSTtnQkFDVixLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRTtnQkFDckIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxNQUFNLEVBQUU7Z0JBQ2pCLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLFNBQVMsT0FBTyxDQUFDLFNBQVMsR0FBRyxDQUFDLEVBQUU7YUFDbEYsQ0FBQztZQUVGLGdCQUFnQixDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUN2QyxJQUFJLEdBQUcsQ0FBQyxjQUFjLEVBQUU7Z0JBQ3RCLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLEtBQUssT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksT0FBTyxDQUFDLFNBQVMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUN0RixNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQ25ELElBQUksV0FBVyxJQUFJLElBQUksSUFBSSxXQUFXLENBQUMsSUFBSSxJQUFJLElBQUksRUFBRTtnQkFDbkQsZUFBZSxDQUFDLElBQUksR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDO2FBQ3pDO1lBQ0QsT0FBTyxNQUFNLENBQUM7U0FDZjtJQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0gsWUFBRSxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0RSw4REFBOEQ7SUFDOUQsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsYUFBYSxDQUFDLENBQUM7SUFFdkMsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBeENELDRCQXdDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBTZWxlY3Rvciwge3R5cGVzY3JpcHQgYXMgdHN9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG4vLyBpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuLy8gaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2xvZ2dlciwgaW5pdEFzQ2hpbGRQcm9jZXNzfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCB7U3RyaW5nSW5mbywgVHJhbnNsYXRhYmxlfSBmcm9tICcuL2NsaS1zY2FuLXRyYW4nO1xuaW1wb3J0IHlhbWxqcyBmcm9tICd5YW1sanMnO1xuLy8gZW5mb3JjZSBkZWZhdWx0IGxvZzRqcyBjb25maWd1cmF0aW9uXG5pbXBvcnQgJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvY29uZmlnJztcbmNvbnN0IGxvZyA9IGxvZ2dlci5nZXRMb2dnZXIoJ0B3ZmgvdHJhbnNsYXRlLWdlbmVyYXRvcicpO1xuXG5pbml0QXNDaGlsZFByb2Nlc3MoKTtcbi8vIGluaXRDb25maWcoe2NvbmZpZzogW10sIHByb3A6IFtdfSk7XG5jb25zdCBraW5kcyA9IHRzLlN5bnRheEtpbmQ7XG5jb25zdCBFWENMVURFX1NZTlRBWCA9IFtraW5kcy5JbXBvcnREZWNsYXJhdGlvbiwga2luZHMuTGl0ZXJhbFR5cGUsIGtpbmRzLlVuaW9uVHlwZV07XG5jb25zdCBJTkNMVURFX1NZTlRBWCA9IFtraW5kcy5TdHJpbmdMaXRlcmFsLFxuICBraW5kcy5GaXJzdFRlbXBsYXRlVG9rZW4sXG4gIGtpbmRzLlRlbXBsYXRlRXhwcmVzc2lvbixcbiAga2luZHMuSnN4RWxlbWVudCxcbiAga2luZHMuTGFzdFRlbXBsYXRlVG9rZW5cbl07XG5cbmV4cG9ydCBmdW5jdGlvbiBzY2FuRmlsZShmaWxlOiBzdHJpbmcsIG1ldGFEYXRhRmlsZTogc3RyaW5nKTogU3RyaW5nSW5mb1tdIHtcbiAgY29uc3Qgc2VsID0gbmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlKTtcbiAgY29uc3QgaW5mbzogU3RyaW5nSW5mb1tdID0gW107XG4gIGNvbnN0IG9sZFRyYW5zTWFwID0gbmV3IE1hcDxzdHJpbmcsIFRyYW5zbGF0YWJsZT4oKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMobWV0YURhdGFGaWxlKSkge1xuICAgIGNvbnN0IHRyYW5zbGF0YmxlcyA9IHlhbWxqcy5sb2FkKG1ldGFEYXRhRmlsZSkgYXMgVHJhbnNsYXRhYmxlW107XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIHRyYW5zbGF0Ymxlcykge1xuICAgICAgb2xkVHJhbnNNYXAuc2V0KGl0ZW0ua2V5LCBpdGVtKTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBuZXdUcmFuc2xhdGVibGVzOiBUcmFuc2xhdGFibGVbXSA9IFtdO1xuICBzZWwuc29tZShudWxsLCBudWxsLCAoYXN0LCBwYXRoLCBwYXJlbnRzLCBpc0xlYWYsIGNvbW1lbnQpID0+IHtcbiAgICBpZiAoRVhDTFVERV9TWU5UQVguaW5jbHVkZXMoYXN0LmtpbmQpKVxuICAgICAgcmV0dXJuICdTS0lQJztcbiAgICBpZiAoSU5DTFVERV9TWU5UQVguaW5jbHVkZXMoYXN0LmtpbmQpKSB7XG4gICAgICBjb25zdCBsaW5lQ29sID0gdHMuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24oc2VsLnNyYywgYXN0LmdldFN0YXJ0KCkpO1xuICAgICAgY29uc3Qgc2Nhbm5lZEluZm9JdGVtOiBUcmFuc2xhdGFibGUgPSB7XG4gICAgICAgIGtleTogYXN0LmdldFRleHQoKSxcbiAgICAgICAgdGV4dDogbnVsbCxcbiAgICAgICAgc3RhcnQ6IGFzdC5nZXRTdGFydCgpLFxuICAgICAgICBlbmQ6IGFzdC5nZXRFbmQoKSxcbiAgICAgICAgZGVzYzogYCR7a2luZHNbYXN0LmtpbmRdfSBsaW5lOiR7bGluZUNvbC5saW5lICsgMX0sIGNvbDoke2xpbmVDb2wuY2hhcmFjdGVyICsgMX1gXG4gICAgICB9O1xuXG4gICAgICBuZXdUcmFuc2xhdGVibGVzLnB1c2goc2Nhbm5lZEluZm9JdGVtKTtcbiAgICAgIGlmIChsb2cuaXNEZWJ1Z0VuYWJsZWQoKSlcbiAgICAgICAgbG9nLmRlYnVnKGAke2ZpbGV9ICgke2xpbmVDb2wubGluZSArIDF9OiR7bGluZUNvbC5jaGFyYWN0ZXIgKyAxfSk6YCwgYXN0LmdldFRleHQoKSk7XG4gICAgICBjb25zdCBvcmlnaW5UcmFucyA9IG9sZFRyYW5zTWFwLmdldChhc3QuZ2V0VGV4dCgpKTtcbiAgICAgIGlmIChvcmlnaW5UcmFucyAhPSBudWxsICYmIG9yaWdpblRyYW5zLnRleHQgIT0gbnVsbCkge1xuICAgICAgICBzY2FubmVkSW5mb0l0ZW0udGV4dCA9IG9yaWdpblRyYW5zLnRleHQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gJ1NLSVAnO1xuICAgIH1cbiAgfSk7XG4gIGZzLndyaXRlRmlsZVN5bmMobWV0YURhdGFGaWxlLCB5YW1sanMuc3RyaW5naWZ5KG5ld1RyYW5zbGF0ZWJsZXMsIDMpKTtcbiAgLy8gY29uc29sZS5sb2coZmlsZSArIGA6ICR7Y2hhbGsuZ3JlZW4oaW5mby5sZW5ndGgpfSBmb3VuZC5gKTtcbiAgbG9nLmluZm8obWV0YURhdGFGaWxlICsgJyBpcyB3cml0dGVuJyk7XG5cbiAgcmV0dXJuIGluZm87XG59XG4iXX0=