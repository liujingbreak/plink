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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transform = void 0;
const ts_ast_query_1 = __importDefault(require("./ts-ast-query"));
const typescript_1 = __importDefault(require("typescript"));
const patch_text_1 = __importStar(require("./patch-text"));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy91dGlscy91cGdyYWRlLXZpZXdjaGlsZC1uZzgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGtFQUFzQztBQUN0Qyw0REFBNEI7QUFDNUIsMkRBQXNEO0FBQ3RELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQUUxRSxTQUFnQixTQUFTLENBQUMsT0FBZSxFQUFFLElBQVk7SUFDckQsTUFBTSxHQUFHLEdBQUcsSUFBSSxzQkFBUSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN4QyxrQkFBa0I7SUFFbEIsTUFBTSwyQkFBMkIsR0FBRyxvQkFBRSxDQUFDLFVBQVUsQ0FBQyx1QkFBdUIsQ0FBQztJQUUxRSxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLHdIQUF3SCxDQUFDO1NBQ3pKLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFFLEVBQW9CLENBQUMsSUFBSSxLQUFLLFdBQVcsQ0FBQztTQUN4RCxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDO1NBQ3BCLEdBQUcsQ0FBQyxDQUFDLElBQXVCLEVBQUUsRUFBRTtRQUMvQixJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUM3QixzQkFBc0I7WUFDdEIsT0FBTyxJQUFJLHdCQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLG1CQUFtQixDQUFDLENBQUM7U0FDckc7YUFBTSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssMkJBQTJCLEVBQUU7WUFDdEYsTUFBTSxHQUFHLEdBQStCLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFRLENBQUM7WUFDakUscUJBQXFCO1lBQ3JCLDRFQUE0RTtZQUM1RSxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLFFBQVE7Z0JBQzFGLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssWUFBWTtnQkFDcEMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxTQUFTLEVBQUU7Z0JBQ2QsT0FBTyxJQUFJLHdCQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUUsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLENBQUM7YUFDOUU7WUFDRCxPQUFPLElBQUksQ0FBQztTQUNiO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQ0FBaUMsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZGLENBQUMsQ0FBQztTQUNELE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQztJQUM5QixJQUFJLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQzNCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3JCLE9BQU8sb0JBQVcsQ0FBQyxPQUFPLEVBQUUsWUFBbUIsRUFBRSxJQUFJLENBQUMsQ0FBQztLQUN4RDtJQUNELE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUFqQ0QsOEJBaUNDIiwiZmlsZSI6ImRpc3QvdXRpbHMvdXBncmFkZS12aWV3Y2hpbGQtbmc4LmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXX0=
