"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listExportedFunction = void 0;
const tslib_1 = require("tslib");
const ts_ast_query_1 = tslib_1.__importDefault(require("./ts-ast-query"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const typescript_1 = require("typescript");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
/**
 * List exported public functions and its parameters
 */
function listExportedFunction(file) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const sel = new ts_ast_query_1.default(fs_1.default.readFileSync(file, 'utf8'), file);
        const founds = sel.findAll(' ^ :FunctionDeclaration > .modifiers:ExportKeyword').map(ast => {
            const fnAst = ast.parent;
            let name = '?';
            if (fnAst.modifiers.find(modifier => modifier.kind === typescript_1.SyntaxKind.DefaultKeyword)) {
                name = 'default';
            }
            else if (fnAst.name) {
                name = fnAst.name.getText();
            }
            // tslint:disable-next-line: no-console
            console.log(sel.src.getFullText().slice(fnAst.getStart(sel.src, true), fnAst.getStart()));
            const params = sel.findAll(fnAst, '^ .parameters >.name').map((param) => param.getText());
            return chalk_1.default.cyan(name) + ` ( ${params.join(', ')} ) `;
        });
        // tslint:disable-next-line: no-console
        console.log(founds.join('\n'));
    });
}
exports.listExportedFunction = listExportedFunction;

//# sourceMappingURL=cli-ts-ast-util.js.map
