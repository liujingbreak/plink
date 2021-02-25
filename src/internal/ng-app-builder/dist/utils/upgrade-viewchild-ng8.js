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
Object.defineProperty(exports, "__esModule", { value: true });
exports.transform = void 0;
const ts_ast_query_1 = __importStar(require("@wfh/plink/wfh/dist/utils/ts-ast-query"));
const patch_text_1 = __importStar(require("./patch-text"));
const log = require('log4js').getLogger('Modify Ng8 ViewChild arguments');
function transform(content, file) {
    const sel = new ts_ast_query_1.default(content, file);
    // sel.printAll();
    const ObjectLiteralExpressionKind = ts_ast_query_1.typescript.SyntaxKind.ObjectLiteralExpression;
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
        sel.printAllNoType();
        throw new Error('Unsupported @ViewChild argument ' + sel.printAll(call.arguments[1]));
    })
        .filter(item => item != null);
    if (replacements.length > 0) {
        log.warn('in', file);
        return patch_text_1.default(content, replacements, true);
    }
    return content;
}
exports.transform = transform;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBncmFkZS12aWV3Y2hpbGQtbmc4LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXBncmFkZS12aWV3Y2hpbGQtbmc4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1RkFBa0Y7QUFFbEYsMkRBQXNEO0FBQ3RELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQUUxRSxTQUFnQixTQUFTLENBQUMsT0FBZSxFQUFFLElBQVk7SUFDckQsTUFBTSxHQUFHLEdBQUcsSUFBSSxzQkFBUSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN4QyxrQkFBa0I7SUFFbEIsTUFBTSwyQkFBMkIsR0FBRyx5QkFBRSxDQUFDLFVBQVUsQ0FBQyx1QkFBdUIsQ0FBQztJQUUxRSxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLHdIQUF3SCxDQUFDO1NBQ3pKLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFFLEVBQW9CLENBQUMsSUFBSSxLQUFLLFdBQVcsQ0FBQztTQUN4RCxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDO1NBQ3BCLEdBQUcsQ0FBQyxDQUFDLElBQXVCLEVBQUUsRUFBRTtRQUMvQixJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUM3QixzQkFBc0I7WUFDdEIsT0FBTyxJQUFJLHdCQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLG1CQUFtQixDQUFDLENBQUM7U0FDckc7YUFBTSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssMkJBQTJCLEVBQUU7WUFDdEYsTUFBTSxHQUFHLEdBQStCLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFRLENBQUM7WUFDakUscUJBQXFCO1lBQ3JCLDRFQUE0RTtZQUM1RSxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLFFBQVE7Z0JBQzFGLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssWUFBWTtnQkFDcEMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxTQUFTLEVBQUU7Z0JBQ2QsT0FBTyxJQUFJLHdCQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUUsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLENBQUM7YUFDOUU7WUFDRCxPQUFPLElBQUksQ0FBQztTQUNiO1FBQ0QsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3JCLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN4RixDQUFDLENBQUM7U0FDRCxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUM7SUFDOUIsSUFBSSxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUMzQixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNyQixPQUFPLG9CQUFXLENBQUMsT0FBTyxFQUFFLFlBQW1CLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDeEQ7SUFDRCxPQUFPLE9BQU8sQ0FBQztBQUNqQixDQUFDO0FBbENELDhCQWtDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBTZWxlY3Rvciwge3R5cGVzY3JpcHQgYXMgdHN9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvdHMtYXN0LXF1ZXJ5JztcblxuaW1wb3J0IHJlcGxhY2VDb2RlLCB7UmVwbGFjZW1lbnR9IGZyb20gJy4vcGF0Y2gtdGV4dCc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ01vZGlmeSBOZzggVmlld0NoaWxkIGFyZ3VtZW50cycpO1xuXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNmb3JtKGNvbnRlbnQ6IHN0cmluZywgZmlsZTogc3RyaW5nKSB7XG4gIGNvbnN0IHNlbCA9IG5ldyBTZWxlY3Rvcihjb250ZW50LCBmaWxlKTtcbiAgLy8gc2VsLnByaW50QWxsKCk7XG5cbiAgY29uc3QgT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb25LaW5kID0gdHMuU3ludGF4S2luZC5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbjtcblxuICBjb25zdCByZXBsYWNlbWVudHMgPSBzZWwuZmluZEFsbCgnOkNsYXNzRGVjbGFyYXRpb24+Lm1lbWJlcnM6UHJvcGVydHlEZWNsYXJhdGlvbj4uZGVjb3JhdG9yczpEZWNvcmF0b3I+LmV4cHJlc3Npb246Q2FsbEV4cHJlc3Npb24+LmV4cHJlc3Npb246SWRlbnRpZmllcicpXG4gIC5maWx0ZXIoaWQgPT4gKGlkIGFzIHRzLklkZW50aWZpZXIpLnRleHQgPT09ICdWaWV3Q2hpbGQnKVxuICAubWFwKGlkID0+IGlkLnBhcmVudClcbiAgLm1hcCgoY2FsbDogdHMuQ2FsbEV4cHJlc3Npb24pID0+IHtcbiAgICBpZiAoY2FsbC5hcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgLy8gc2VsLnByaW50QWxsKGNhbGwpO1xuICAgICAgcmV0dXJuIG5ldyBSZXBsYWNlbWVudChjYWxsLmFyZ3VtZW50c1swXS5nZXRFbmQoKSwgY2FsbC5hcmd1bWVudHNbMF0uZ2V0RW5kKCksICcsIHtzdGF0aWM6IGZhbHNlfScpO1xuICAgIH0gZWxzZSBpZiAoY2FsbC5hcmd1bWVudHNbMV0gJiYgY2FsbC5hcmd1bWVudHNbMV0ua2luZCA9PT0gT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb25LaW5kKSB7XG4gICAgICBjb25zdCBvYmo6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uID0gY2FsbC5hcmd1bWVudHNbMV0gYXMgYW55O1xuICAgICAgLy8gc2VsLnByaW50QWxsKG9iaik7XG4gICAgICAvLyBjb25zb2xlLmxvZyhvYmoucHJvcGVydGllcy5tYXAocCA9PiBwLm5hbWUhLmdldFRleHQocC5nZXRTb3VyY2VGaWxlKCkpKSk7XG4gICAgICBjb25zdCBoYXNTdGF0aWMgPSBvYmoucHJvcGVydGllcy5zb21lKHByb3AgPT4gcHJvcC5uYW1lICYmIChwcm9wLm5hbWUuZ2V0VGV4dCgpID09PSAnc3RhdGljJyB8fFxuICAgICAgICBwcm9wLm5hbWUuZ2V0VGV4dCgpID09PSAnXFwnc3RhdGljXFwnJyB8fFxuICAgICAgICBwcm9wLm5hbWUuZ2V0VGV4dCgpID09PSAnXCJzdGF0aWNcIicpKTtcbiAgICAgIGlmICghaGFzU3RhdGljKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVwbGFjZW1lbnQob2JqLmdldEVuZCgpIC0gMSwgb2JqLmdldEVuZCgpIC0xLCAnLCBzdGF0aWM6IGZhbHNlJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgc2VsLnByaW50QWxsTm9UeXBlKCk7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdVbnN1cHBvcnRlZCBAVmlld0NoaWxkIGFyZ3VtZW50ICcgKyBzZWwucHJpbnRBbGwoY2FsbC5hcmd1bWVudHNbMV0pKTtcbiAgfSlcbiAgLmZpbHRlcihpdGVtID0+IGl0ZW0gIT0gbnVsbCk7XG4gIGlmIChyZXBsYWNlbWVudHMubGVuZ3RoID4gMCkge1xuICAgIGxvZy53YXJuKCdpbicsIGZpbGUpO1xuICAgIHJldHVybiByZXBsYWNlQ29kZShjb250ZW50LCByZXBsYWNlbWVudHMgYXMgYW55LCB0cnVlKTtcbiAgfVxuICByZXR1cm4gY29udGVudDtcbn1cbiJdfQ==