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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBncmFkZS12aWV3Y2hpbGQtbmc4LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXBncmFkZS12aWV3Y2hpbGQtbmc4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxrRUFBc0M7QUFDdEMsNERBQTRCO0FBQzVCLDJEQUFzRDtBQUN0RCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFFMUUsU0FBZ0IsU0FBUyxDQUFDLE9BQWUsRUFBRSxJQUFZO0lBQ3JELE1BQU0sR0FBRyxHQUFHLElBQUksc0JBQVEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDeEMsa0JBQWtCO0lBRWxCLE1BQU0sMkJBQTJCLEdBQUcsb0JBQUUsQ0FBQyxVQUFVLENBQUMsdUJBQXVCLENBQUM7SUFFMUUsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyx3SEFBd0gsQ0FBQztTQUN6SixNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBRSxFQUFvQixDQUFDLElBQUksS0FBSyxXQUFXLENBQUM7U0FDeEQsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQztTQUNwQixHQUFHLENBQUMsQ0FBQyxJQUF1QixFQUFFLEVBQUU7UUFDL0IsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDN0Isc0JBQXNCO1lBQ3RCLE9BQU8sSUFBSSx3QkFBVyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1NBQ3JHO2FBQU0sSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLDJCQUEyQixFQUFFO1lBQ3RGLE1BQU0sR0FBRyxHQUErQixJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBUSxDQUFDO1lBQ2pFLHFCQUFxQjtZQUNyQiw0RUFBNEU7WUFDNUUsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxRQUFRO2dCQUMxRixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLFlBQVk7Z0JBQ3BDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQztZQUN2QyxJQUFJLENBQUMsU0FBUyxFQUFFO2dCQUNkLE9BQU8sSUFBSSx3QkFBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFFLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO2FBQzlFO1lBQ0QsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsaUNBQWlDLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2RixDQUFDLENBQUM7U0FDRCxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUM7SUFDOUIsSUFBSSxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUMzQixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNyQixPQUFPLG9CQUFXLENBQUMsT0FBTyxFQUFFLFlBQW1CLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDeEQ7SUFDRCxPQUFPLE9BQU8sQ0FBQztBQUNqQixDQUFDO0FBakNELDhCQWlDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBTZWxlY3RvciBmcm9tICcuL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgcmVwbGFjZUNvZGUsIHtSZXBsYWNlbWVudH0gZnJvbSAnLi9wYXRjaC10ZXh0JztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignTW9kaWZ5IE5nOCBWaWV3Q2hpbGQgYXJndW1lbnRzJyk7XG5cbmV4cG9ydCBmdW5jdGlvbiB0cmFuc2Zvcm0oY29udGVudDogc3RyaW5nLCBmaWxlOiBzdHJpbmcpIHtcbiAgY29uc3Qgc2VsID0gbmV3IFNlbGVjdG9yKGNvbnRlbnQsIGZpbGUpO1xuICAvLyBzZWwucHJpbnRBbGwoKTtcblxuICBjb25zdCBPYmplY3RMaXRlcmFsRXhwcmVzc2lvbktpbmQgPSB0cy5TeW50YXhLaW5kLk9iamVjdExpdGVyYWxFeHByZXNzaW9uO1xuXG4gIGNvbnN0IHJlcGxhY2VtZW50cyA9IHNlbC5maW5kQWxsKCc6Q2xhc3NEZWNsYXJhdGlvbj4ubWVtYmVyczpQcm9wZXJ0eURlY2xhcmF0aW9uPi5kZWNvcmF0b3JzOkRlY29yYXRvcj4uZXhwcmVzc2lvbjpDYWxsRXhwcmVzc2lvbj4uZXhwcmVzc2lvbjpJZGVudGlmaWVyJylcbiAgLmZpbHRlcihpZCA9PiAoaWQgYXMgdHMuSWRlbnRpZmllcikudGV4dCA9PT0gJ1ZpZXdDaGlsZCcpXG4gIC5tYXAoaWQgPT4gaWQucGFyZW50KVxuICAubWFwKChjYWxsOiB0cy5DYWxsRXhwcmVzc2lvbikgPT4ge1xuICAgIGlmIChjYWxsLmFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgICAvLyBzZWwucHJpbnRBbGwoY2FsbCk7XG4gICAgICByZXR1cm4gbmV3IFJlcGxhY2VtZW50KGNhbGwuYXJndW1lbnRzWzBdLmdldEVuZCgpLCBjYWxsLmFyZ3VtZW50c1swXS5nZXRFbmQoKSwgJywge3N0YXRpYzogZmFsc2V9Jyk7XG4gICAgfSBlbHNlIGlmIChjYWxsLmFyZ3VtZW50c1sxXSAmJiBjYWxsLmFyZ3VtZW50c1sxXS5raW5kID09PSBPYmplY3RMaXRlcmFsRXhwcmVzc2lvbktpbmQpIHtcbiAgICAgIGNvbnN0IG9iajogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24gPSBjYWxsLmFyZ3VtZW50c1sxXSBhcyBhbnk7XG4gICAgICAvLyBzZWwucHJpbnRBbGwob2JqKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKG9iai5wcm9wZXJ0aWVzLm1hcChwID0+IHAubmFtZSEuZ2V0VGV4dChwLmdldFNvdXJjZUZpbGUoKSkpKTtcbiAgICAgIGNvbnN0IGhhc1N0YXRpYyA9IG9iai5wcm9wZXJ0aWVzLnNvbWUocHJvcCA9PiBwcm9wLm5hbWUgJiYgKHByb3AubmFtZS5nZXRUZXh0KCkgPT09ICdzdGF0aWMnIHx8XG4gICAgICAgIHByb3AubmFtZS5nZXRUZXh0KCkgPT09ICdcXCdzdGF0aWNcXCcnIHx8XG4gICAgICAgIHByb3AubmFtZS5nZXRUZXh0KCkgPT09ICdcInN0YXRpY1wiJykpO1xuICAgICAgaWYgKCFoYXNTdGF0aWMpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZXBsYWNlbWVudChvYmouZ2V0RW5kKCkgLSAxLCBvYmouZ2V0RW5kKCkgLTEsICcsIHN0YXRpYzogZmFsc2UnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vuc3VwcG9ydGVkIEBWaWV3Q2hpbGQgYXJndW1lbnQnICsgc2VsLnByaW50QWxsKGNhbGwuYXJndW1lbnRzWzFdKSk7XG4gIH0pXG4gIC5maWx0ZXIoaXRlbSA9PiBpdGVtICE9IG51bGwpO1xuICBpZiAocmVwbGFjZW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICBsb2cud2FybignaW4nLCBmaWxlKTtcbiAgICByZXR1cm4gcmVwbGFjZUNvZGUoY29udGVudCwgcmVwbGFjZW1lbnRzIGFzIGFueSwgdHJ1ZSk7XG4gIH1cbiAgcmV0dXJuIGNvbnRlbnQ7XG59XG4iXX0=