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
const fs_extra_1 = __importDefault(require("fs-extra"));
// import chalk from 'chalk';
const path_1 = __importDefault(require("path"));
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
        const { data: translatbles } = yamljs_1.default.load(metaDataFile);
        for (const item of translatbles) {
            oldTransMap.set(item.key, item);
        }
    }
    const newTranslatebles = [];
    sel.some(null, null, (ast, path, parents, isLeaf, comment) => {
        if (EXCLUDE_SYNTAX.includes(ast.kind))
            return 'SKIP';
        if (INCLUDE_SYNTAX.includes(ast.kind)) {
            if (ts_ast_query_1.typescript.isCallExpression(ast.parent) &&
                (ast.parent.expression.getText() === 'require' || ast.parent.expression.kind === ts_ast_query_1.typescript.SyntaxKind.ImportKeyword) &&
                ast.parent.arguments[0] === ast) {
                return 'SKIP';
            }
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
    if (newTranslatebles.length > 0) {
        fs_extra_1.default.mkdirpSync(path_1.default.dirname(metaDataFile));
        fs_1.default.writeFileSync(metaDataFile, yamljs_1.default.stringify({
            target: path_1.default.relative(path_1.default.dirname(metaDataFile), file).replace(/\\/g, '/'),
            data: newTranslatebles
        }, 3));
    }
    // console.log(file + `: ${chalk.green(info.length)} found.`);
    log.info(metaDataFile + ' is written');
    return info;
}
exports.scanFile = scanFile;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXNjYW4tdHJhbi13b3JrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGktc2Nhbi10cmFuLXdvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsdUZBQWtGO0FBQ2xGLDRDQUFvQjtBQUNwQix3REFBNkI7QUFDN0IsNkJBQTZCO0FBQzdCLGdEQUF3QjtBQUN4QixzQ0FBc0Q7QUFFdEQsb0RBQTRCO0FBQzVCLHVDQUF1QztBQUN2QyxzQ0FBb0M7QUFDcEMsTUFBTSxHQUFHLEdBQUcsY0FBTSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBRXpELDBCQUFrQixFQUFFLENBQUM7QUFDckIsc0NBQXNDO0FBQ3RDLE1BQU0sS0FBSyxHQUFHLHlCQUFFLENBQUMsVUFBVSxDQUFDO0FBQzVCLE1BQU0sY0FBYyxHQUFHLENBQUMsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEtBQUssQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3JGLE1BQU0sY0FBYyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWE7SUFDekMsS0FBSyxDQUFDLGtCQUFrQjtJQUN4QixLQUFLLENBQUMsa0JBQWtCO0lBQ3hCLEtBQUssQ0FBQyxVQUFVO0lBQ2hCLEtBQUssQ0FBQyxpQkFBaUI7Q0FDeEIsQ0FBQztBQUVGLFNBQWdCLFFBQVEsQ0FBQyxJQUFZLEVBQUUsWUFBb0I7SUFDekQsTUFBTSxHQUFHLEdBQUcsSUFBSSxzQkFBUSxDQUFDLFlBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzlELE1BQU0sSUFBSSxHQUFpQixFQUFFLENBQUM7SUFDOUIsTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLEVBQXdCLENBQUM7SUFDcEQsSUFBSSxZQUFFLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxFQUFFO1FBQy9CLE1BQU0s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QUMsS0FBSyxFQUFFLEdBQUcsQ0FBQztZQUMzRSxJQUFJLEVBQUUsZ0JBQWdCO1NBQ3ZCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNSO0lBQ0QsOERBQThEO0lBQzlELEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLGFBQWEsQ0FBQyxDQUFDO0lBRXZDLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQW5ERCw0QkFtREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgU2VsZWN0b3IsIHt0eXBlc2NyaXB0IGFzIHRzfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IGZzZXh0IGZyb20gJ2ZzLWV4dHJhJztcbi8vIGltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7bG9nZ2VyLCBpbml0QXNDaGlsZFByb2Nlc3N9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHtTdHJpbmdJbmZvLCBUcmFuc2xhdGFibGV9IGZyb20gJy4vY2xpLXNjYW4tdHJhbic7XG5pbXBvcnQgeWFtbGpzIGZyb20gJ3lhbWxqcyc7XG4vLyBlbmZvcmNlIGRlZmF1bHQgbG9nNGpzIGNvbmZpZ3VyYXRpb25cbmltcG9ydCAnQHdmaC9wbGluay93ZmgvZGlzdC9jb25maWcnO1xuY29uc3QgbG9nID0gbG9nZ2VyLmdldExvZ2dlcignQHdmaC90cmFuc2xhdGUtZ2VuZXJhdG9yJyk7XG5cbmluaXRBc0NoaWxkUHJvY2VzcygpO1xuLy8gaW5pdENvbmZpZyh7Y29uZmlnOiBbXSwgcHJvcDogW119KTtcbmNvbnN0IGtpbmRzID0gdHMuU3ludGF4S2luZDtcbmNvbnN0IEVYQ0xVREVfU1lOVEFYID0gW2tpbmRzLkltcG9ydERlY2xhcmF0aW9uLCBraW5kcy5MaXRlcmFsVHlwZSwga2luZHMuVW5pb25UeXBlXTtcbmNvbnN0IElOQ0xVREVfU1lOVEFYID0gW2tpbmRzLlN0cmluZ0xpdGVyYWwsXG4gIGtpbmRzLkZpcnN0VGVtcGxhdGVUb2tlbixcbiAga2luZHMuVGVtcGxhdGVFeHByZXNzaW9uLFxuICBraW5kcy5Kc3hFbGVtZW50LFxuICBraW5kcy5MYXN0VGVtcGxhdGVUb2tlblxuXTtcblxuZXhwb3J0IGZ1bmN0aW9uIHNjYW5GaWxlKGZpbGU6IHN0cmluZywgbWV0YURhdGFGaWxlOiBzdHJpbmcpOiBTdHJpbmdJbmZvW10ge1xuICBjb25zdCBzZWwgPSBuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUpO1xuICBjb25zdCBpbmZvOiBTdHJpbmdJbmZvW10gPSBbXTtcbiAgY29uc3Qgb2xkVHJhbnNNYXAgPSBuZXcgTWFwPHN0cmluZywgVHJhbnNsYXRhYmxlPigpO1xuICBpZiAoZnMuZXhpc3RzU3luYyhtZXRhRGF0YUZpbGUpKSB7XG4gICAgY29uc3Qge2RhdGE6IHRyYW5zbGF0Ymxlc30gPSB5YW1sanMubG9hZChtZXRhRGF0YUZpbGUpIGFzIHt0YXJnZXQ6IHN0cmluZywgZGF0YTogVHJhbnNsYXRhYmxlW119O1xuICAgIGZvciAoY29uc3QgaXRlbSBvZiB0cmFuc2xhdGJsZXMpIHtcbiAgICAgIG9sZFRyYW5zTWFwLnNldChpdGVtLmtleSwgaXRlbSk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgbmV3VHJhbnNsYXRlYmxlczogVHJhbnNsYXRhYmxlW10gPSBbXTtcbiAgc2VsLnNvbWUobnVsbCwgbnVsbCwgKGFzdCwgcGF0aCwgcGFyZW50cywgaXNMZWFmLCBjb21tZW50KSA9PiB7XG4gICAgaWYgKEVYQ0xVREVfU1lOVEFYLmluY2x1ZGVzKGFzdC5raW5kKSlcbiAgICAgIHJldHVybiAnU0tJUCc7XG4gICAgaWYgKElOQ0xVREVfU1lOVEFYLmluY2x1ZGVzKGFzdC5raW5kKSkge1xuICAgICAgaWYgKHRzLmlzQ2FsbEV4cHJlc3Npb24oYXN0LnBhcmVudCkgJiZcbiAgICAgICgoYXN0LnBhcmVudCBhcyB0cy5DYWxsRXhwcmVzc2lvbikuZXhwcmVzc2lvbi5nZXRUZXh0KCkgPT09ICdyZXF1aXJlJyB8fCAoYXN0LnBhcmVudCBhcyB0cy5DYWxsRXhwcmVzc2lvbikuZXhwcmVzc2lvbi5raW5kID09PSB0cy5TeW50YXhLaW5kLkltcG9ydEtleXdvcmQpICYmXG4gICAgICAoYXN0LnBhcmVudCBhcyB0cy5DYWxsRXhwcmVzc2lvbikuYXJndW1lbnRzWzBdID09PSBhc3QpIHtcbiAgICAgICAgcmV0dXJuICdTS0lQJztcbiAgICAgIH1cbiAgICAgIGNvbnN0IGxpbmVDb2wgPSB0cy5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihzZWwuc3JjLCBhc3QuZ2V0U3RhcnQoKSk7XG4gICAgICBjb25zdCBzY2FubmVkSW5mb0l0ZW06IFRyYW5zbGF0YWJsZSA9IHtcbiAgICAgICAga2V5OiBhc3QuZ2V0VGV4dCgpLFxuICAgICAgICB0ZXh0OiBudWxsLFxuICAgICAgICBzdGFydDogYXN0LmdldFN0YXJ0KCksXG4gICAgICAgIGVuZDogYXN0LmdldEVuZCgpLFxuICAgICAgICBkZXNjOiBgJHtraW5kc1thc3Qua2luZF19IGxpbmU6JHtsaW5lQ29sLmxpbmUgKyAxfSwgY29sOiR7bGluZUNvbC5jaGFyYWN0ZXIgKyAxfWBcbiAgICAgIH07XG5cbiAgICAgIG5ld1RyYW5zbGF0ZWJsZXMucHVzaChzY2FubmVkSW5mb0l0ZW0pO1xuICAgICAgaWYgKGxvZy5pc0RlYnVnRW5hYmxlZCgpKVxuICAgICAgICBsb2cuZGVidWcoYCR7ZmlsZX0gKCR7bGluZUNvbC5saW5lICsgMX06JHtsaW5lQ29sLmNoYXJhY3RlciArIDF9KTpgLCBhc3QuZ2V0VGV4dCgpKTtcbiAgICAgIGNvbnN0IG9yaWdpblRyYW5zID0gb2xkVHJhbnNNYXAuZ2V0KGFzdC5nZXRUZXh0KCkpO1xuICAgICAgaWYgKG9yaWdpblRyYW5zICE9IG51bGwgJiYgb3JpZ2luVHJhbnMudGV4dCAhPSBudWxsKSB7XG4gICAgICAgIHNjYW5uZWRJbmZvSXRlbS50ZXh0ID0gb3JpZ2luVHJhbnMudGV4dDtcbiAgICAgIH1cbiAgICAgIHJldHVybiAnU0tJUCc7XG4gICAgfVxuICB9KTtcbiAgaWYgKG5ld1RyYW5zbGF0ZWJsZXMubGVuZ3RoID4gMCkge1xuICAgIGZzZXh0Lm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKG1ldGFEYXRhRmlsZSkpO1xuICAgIGZzLndyaXRlRmlsZVN5bmMobWV0YURhdGFGaWxlLCB5YW1sanMuc3RyaW5naWZ5KHtcbiAgICAgIHRhcmdldDogUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUobWV0YURhdGFGaWxlKSwgZmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgICAgZGF0YTogbmV3VHJhbnNsYXRlYmxlc1xuICAgIH0sIDMpKTtcbiAgfVxuICAvLyBjb25zb2xlLmxvZyhmaWxlICsgYDogJHtjaGFsay5ncmVlbihpbmZvLmxlbmd0aCl9IGZvdW5kLmApO1xuICBsb2cuaW5mbyhtZXRhRGF0YUZpbGUgKyAnIGlzIHdyaXR0ZW4nKTtcblxuICByZXR1cm4gaW5mbztcbn1cbiJdfQ==