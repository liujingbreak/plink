"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transform = void 0;
const tslib_1 = require("tslib");
const ts_ast_query_1 = tslib_1.__importDefault(require("./ts-ast-query"));
const typescript_1 = tslib_1.__importDefault(require("typescript"));
const patch_text_1 = tslib_1.__importStar(require("./patch-text"));
const log = require('log4js').getLogger('Modify Ng8 ViewChild arguments');
function transform(content, file) {
    const sel = new ts_ast_query_1.default(content, file);
    // sel.printAll();
    const ObjectLiteralExpressionKind = typescript_1.default.SyntaxKind.ObjectLiteralExpression;
    const replacements = sel.findAll(':ClassDeclaration>.members:PropertyDeclaration>.decorators:Decorator>.expression:CallExpression>.expression:Identifier')
        .filter(id => id.text === 'ViewChild')
        .map(id => id.parent)
        .map((call) => {
        if (call.arguments.length < 2) {
            // sel.printAll(call);
            return new patch_text_1.Replacement(call.arguments[0].getEnd(), call.arguments[0].getEnd(), ', {static: false}');
        }
        else if (call.arguments[1] && call.arguments[1].kind === ObjectLiteralExpressionKind) {
            const obj = call.arguments[1];
            // sel.printAll(obj);
            // console.log(obj.properties.map(p => p.name!.getText(p.getSourceFile())));
            const hasStatic = obj.properties.some(prop => prop.name && (prop.name.getText() === 'static' ||
                prop.name.getText() === '\'static\'' ||
                prop.name.getText() === '"static"'));
            if (!hasStatic) {
                return new patch_text_1.Replacement(obj.getEnd() - 1, obj.getEnd() - 1, ', static: false');
            }
            return null;
        }
        throw new Error('Unsupported @ViewChild argument' + sel.printAll(call.arguments[1]));
    })
        .filter(item => item != null);
    if (replacements.length > 0) {
        log.warn('in', file);
        return patch_text_1.default(content, replacements, true);
    }
    return content;
}
exports.transform = transform;

//# sourceMappingURL=upgrade-viewchild-ng8.js.map
