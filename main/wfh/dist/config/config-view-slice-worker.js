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
//# sourceMappingURL=config-view-slice-worker.js.map