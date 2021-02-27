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
function scanFile(file, trans) {
    const sel = new ts_ast_query_1.default(fs_1.default.readFileSync(file, 'utf8'), file);
    const info = [];
    const transMap = new Map();
    if (trans) {
        for (const item of trans) {
            transMap.set(item.default, item);
        }
    }
    sel.some(null, null, (ast, path, parents, isLeaf, comment) => {
        if (EXCLUDE_SYNTAX.includes(ast.kind))
            return 'SKIP';
        if (INCLUDE_SYNTAX.includes(ast.kind)) {
            const lineCol = ts_ast_query_1.typescript.getLineAndCharacterOfPosition(sel.src, ast.getStart());
            const scannedInfoItem = [
                ast.getStart(), ast.getEnd(), ast.getText(), lineCol.line + 1, lineCol.character + 1,
                kinds[ast.kind]
            ];
            info.push(scannedInfoItem);
            if (log.isDebugEnabled())
                log.debug(`${file} (${lineCol.line + 1}:${lineCol.character + 1}):`, ast.getText());
            const originTrans = transMap.get(ast.getText());
            if (originTrans != null && originTrans.text != null) {
                scannedInfoItem[2] = originTrans.text;
            }
            return 'SKIP';
        }
    });
    // console.log(file + `: ${chalk.green(info.length)} found.`);
    // log.info(file + `: ${chalk.green(info.length)} found.`);
    return info;
}
exports.scanFile = scanFile;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXNjYW4tdHJhbi13b3JrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGktc2Nhbi10cmFuLXdvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsdUZBQWtGO0FBQ2xGLDRDQUFvQjtBQUNwQiw2QkFBNkI7QUFDN0IsMkJBQTJCO0FBQzNCLHNDQUFzRDtBQUV0RCx1Q0FBdUM7QUFDdkMsc0NBQW9DO0FBQ3BDLE1BQU0sR0FBRyxHQUFHLGNBQU0sQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUV6RCwwQkFBa0IsRUFBRSxDQUFDO0FBQ3JCLHNDQUFzQztBQUN0QyxNQUFNLEtBQUssR0FBRyx5QkFBRSxDQUFDLFVBQVUsQ0FBQztBQUM1QixNQUFNLGNBQWMsR0FBRyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxLQUFLLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNyRixNQUFNLGNBQWMsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhO0lBQ3pDLEtBQUssQ0FBQyxrQkFBa0I7SUFDeEIsS0FBSyxDQUFDLGtCQUFrQjtJQUN4QixLQUFLLENBQUMsVUFBVTtJQUNoQixLQUFLLENBQUMsaUJBQWlCO0NBQ3hCLENBQUM7QUFFRixTQUFnQixRQUFRLENBQUMsSUFBWSxFQUFFLEtBQWtDO0lBQ3ZFLE1BQU0sR0FBRyxHQUFHLElBQUksc0JBQVEsQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUU5RCxNQUFNLElBQUksR0FBaUIsRUFBRSxDQUFDO0lBQzlCLE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxFQUF5QixDQUFDO0lBQ2xELElBQUksS0FBSyxFQUFFO1FBQ1QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7WUFDeEIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQ2xDO0tBQ0Y7SUFFRCxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUU7UUFDM0QsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDbkMsT0FBTyxNQUFNLENBQUM7UUFDaEIsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNyQyxNQUFNLE9BQU8sR0FBRyx5QkFBRSxDQUFDLDZCQUE2QixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDMUUsTUFBTSxlQUFlLEdBQWU7Z0JBQ2xDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxTQUFTLEdBQUcsQ0FBQztnQkFDcEYsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7YUFDaEIsQ0FBQztZQUNGLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDM0IsSUFBSSxHQUFHLENBQUMsY0FBYyxFQUFFO2dCQUN0QixHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxLQUFLLE9BQU8sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxTQUFTLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDdEYsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUNoRCxJQUFJLFdBQVcsSUFBSSxJQUFJLElBQUksV0FBVyxDQUFDLElBQUksSUFBSSxJQUFJLEVBQUU7Z0JBQ25ELGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDO2FBQ3ZDO1lBQ0QsT0FBTyxNQUFNLENBQUM7U0FDZjtJQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0gsOERBQThEO0lBQzlELDJEQUEyRDtJQUUzRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFsQ0QsNEJBa0NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFNlbGVjdG9yLCB7dHlwZXNjcmlwdCBhcyB0c30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy90cy1hc3QtcXVlcnknO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbi8vIGltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG4vLyBpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7bG9nZ2VyLCBpbml0QXNDaGlsZFByb2Nlc3N9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHtTdHJpbmdJbmZvLCBUcmFuc2xhdGFibGVzfSBmcm9tICcuL2NsaS1zY2FuLXRyYW4nO1xuLy8gZW5mb3JjZSBkZWZhdWx0IGxvZzRqcyBjb25maWd1cmF0aW9uXG5pbXBvcnQgJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvY29uZmlnJztcbmNvbnN0IGxvZyA9IGxvZ2dlci5nZXRMb2dnZXIoJ0B3ZmgvdHJhbnNsYXRlLWdlbmVyYXRvcicpO1xuXG5pbml0QXNDaGlsZFByb2Nlc3MoKTtcbi8vIGluaXRDb25maWcoe2NvbmZpZzogW10sIHByb3A6IFtdfSk7XG5jb25zdCBraW5kcyA9IHRzLlN5bnRheEtpbmQ7XG5jb25zdCBFWENMVURFX1NZTlRBWCA9IFtraW5kcy5JbXBvcnREZWNsYXJhdGlvbiwga2luZHMuTGl0ZXJhbFR5cGUsIGtpbmRzLlVuaW9uVHlwZV07XG5jb25zdCBJTkNMVURFX1NZTlRBWCA9IFtraW5kcy5TdHJpbmdMaXRlcmFsLFxuICBraW5kcy5GaXJzdFRlbXBsYXRlVG9rZW4sXG4gIGtpbmRzLlRlbXBsYXRlRXhwcmVzc2lvbixcbiAga2luZHMuSnN4RWxlbWVudCxcbiAga2luZHMuTGFzdFRlbXBsYXRlVG9rZW5cbl07XG5cbmV4cG9ydCBmdW5jdGlvbiBzY2FuRmlsZShmaWxlOiBzdHJpbmcsIHRyYW5zOiBUcmFuc2xhdGFibGVzW10gfCB1bmRlZmluZWQpOiBTdHJpbmdJbmZvW10ge1xuICBjb25zdCBzZWwgPSBuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUpO1xuICBcbiAgY29uc3QgaW5mbzogU3RyaW5nSW5mb1tdID0gW107XG4gIGNvbnN0IHRyYW5zTWFwID0gbmV3IE1hcDxzdHJpbmcsIFRyYW5zbGF0YWJsZXM+KCk7XG4gIGlmICh0cmFucykge1xuICAgIGZvciAoY29uc3QgaXRlbSBvZiB0cmFucykge1xuICAgICAgdHJhbnNNYXAuc2V0KGl0ZW0uZGVmYXVsdCwgaXRlbSk7XG4gICAgfVxuICB9XG5cbiAgc2VsLnNvbWUobnVsbCwgbnVsbCwgKGFzdCwgcGF0aCwgcGFyZW50cywgaXNMZWFmLCBjb21tZW50KSA9PiB7XG4gICAgaWYgKEVYQ0xVREVfU1lOVEFYLmluY2x1ZGVzKGFzdC5raW5kKSlcbiAgICAgIHJldHVybiAnU0tJUCc7XG4gICAgaWYgKElOQ0xVREVfU1lOVEFYLmluY2x1ZGVzKGFzdC5raW5kKSkge1xuICAgICAgY29uc3QgbGluZUNvbCA9IHRzLmdldExpbmVBbmRDaGFyYWN0ZXJPZlBvc2l0aW9uKHNlbC5zcmMsIGFzdC5nZXRTdGFydCgpKTtcbiAgICAgIGNvbnN0IHNjYW5uZWRJbmZvSXRlbTogU3RyaW5nSW5mbyA9IFtcbiAgICAgICAgYXN0LmdldFN0YXJ0KCksIGFzdC5nZXRFbmQoKSwgYXN0LmdldFRleHQoKSwgbGluZUNvbC5saW5lICsgMSwgbGluZUNvbC5jaGFyYWN0ZXIgKyAxLFxuICAgICAgICBraW5kc1thc3Qua2luZF1cbiAgICAgIF07XG4gICAgICBpbmZvLnB1c2goc2Nhbm5lZEluZm9JdGVtKTtcbiAgICAgIGlmIChsb2cuaXNEZWJ1Z0VuYWJsZWQoKSlcbiAgICAgICAgbG9nLmRlYnVnKGAke2ZpbGV9ICgke2xpbmVDb2wubGluZSArIDF9OiR7bGluZUNvbC5jaGFyYWN0ZXIgKyAxfSk6YCwgYXN0LmdldFRleHQoKSk7XG4gICAgICBjb25zdCBvcmlnaW5UcmFucyA9IHRyYW5zTWFwLmdldChhc3QuZ2V0VGV4dCgpKTtcbiAgICAgIGlmIChvcmlnaW5UcmFucyAhPSBudWxsICYmIG9yaWdpblRyYW5zLnRleHQgIT0gbnVsbCkge1xuICAgICAgICBzY2FubmVkSW5mb0l0ZW1bMl0gPSBvcmlnaW5UcmFucy50ZXh0O1xuICAgICAgfVxuICAgICAgcmV0dXJuICdTS0lQJztcbiAgICB9XG4gIH0pO1xuICAvLyBjb25zb2xlLmxvZyhmaWxlICsgYDogJHtjaGFsay5ncmVlbihpbmZvLmxlbmd0aCl9IGZvdW5kLmApO1xuICAvLyBsb2cuaW5mbyhmaWxlICsgYDogJHtjaGFsay5ncmVlbihpbmZvLmxlbmd0aCl9IGZvdW5kLmApO1xuXG4gIHJldHVybiBpbmZvO1xufVxuIl19