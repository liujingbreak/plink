"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy91dGlscy91cGdyYWRlLXZpZXdjaGlsZC1uZzgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMEVBQXNDO0FBQ3RDLG9FQUE0QjtBQUM1QixtRUFBc0Q7QUFDdEQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBRTFFLFNBQWdCLFNBQVMsQ0FBQyxPQUFlLEVBQUUsSUFBWTtJQUNyRCxNQUFNLEdBQUcsR0FBRyxJQUFJLHNCQUFRLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3hDLGtCQUFrQjtJQUVsQixNQUFNLDJCQUEyQixHQUFHLG9CQUFFLENBQUMsVUFBVSxDQUFDLHVCQUF1QixDQUFDO0lBRTFFLE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsd0hBQXdILENBQUM7U0FDekosTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUUsRUFBb0IsQ0FBQyxJQUFJLEtBQUssV0FBVyxDQUFDO1NBQ3hELEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUM7U0FDcEIsR0FBRyxDQUFDLENBQUMsSUFBdUIsRUFBRSxFQUFFO1FBQy9CLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQzdCLHNCQUFzQjtZQUN0QixPQUFPLElBQUksd0JBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztTQUNyRzthQUFNLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSywyQkFBMkIsRUFBRTtZQUN0RixNQUFNLEdBQUcsR0FBK0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQVEsQ0FBQztZQUNqRSxxQkFBcUI7WUFDckIsNEVBQTRFO1lBQzVFLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssUUFBUTtnQkFDMUYsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxZQUFZO2dCQUNwQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDdkMsSUFBSSxDQUFDLFNBQVMsRUFBRTtnQkFDZCxPQUFPLElBQUksd0JBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRSxDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQzthQUM5RTtZQUNELE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLGlDQUFpQyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkYsQ0FBQyxDQUFDO1NBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDO0lBQzlCLElBQUksWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDM0IsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDckIsT0FBTyxvQkFBVyxDQUFDLE9BQU8sRUFBRSxZQUFtQixFQUFFLElBQUksQ0FBQyxDQUFDO0tBQ3hEO0lBQ0QsT0FBTyxPQUFPLENBQUM7QUFDakIsQ0FBQztBQWpDRCw4QkFpQ0MiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvdXRpbHMvdXBncmFkZS12aWV3Y2hpbGQtbmc4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFNlbGVjdG9yIGZyb20gJy4vdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCByZXBsYWNlQ29kZSwge1JlcGxhY2VtZW50fSBmcm9tICcuL3BhdGNoLXRleHQnO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdNb2RpZnkgTmc4IFZpZXdDaGlsZCBhcmd1bWVudHMnKTtcblxuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zZm9ybShjb250ZW50OiBzdHJpbmcsIGZpbGU6IHN0cmluZykge1xuICBjb25zdCBzZWwgPSBuZXcgU2VsZWN0b3IoY29udGVudCwgZmlsZSk7XG4gIC8vIHNlbC5wcmludEFsbCgpO1xuXG4gIGNvbnN0IE9iamVjdExpdGVyYWxFeHByZXNzaW9uS2luZCA9IHRzLlN5bnRheEtpbmQuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb247XG5cbiAgY29uc3QgcmVwbGFjZW1lbnRzID0gc2VsLmZpbmRBbGwoJzpDbGFzc0RlY2xhcmF0aW9uPi5tZW1iZXJzOlByb3BlcnR5RGVjbGFyYXRpb24+LmRlY29yYXRvcnM6RGVjb3JhdG9yPi5leHByZXNzaW9uOkNhbGxFeHByZXNzaW9uPi5leHByZXNzaW9uOklkZW50aWZpZXInKVxuICAuZmlsdGVyKGlkID0+IChpZCBhcyB0cy5JZGVudGlmaWVyKS50ZXh0ID09PSAnVmlld0NoaWxkJylcbiAgLm1hcChpZCA9PiBpZC5wYXJlbnQpXG4gIC5tYXAoKGNhbGw6IHRzLkNhbGxFeHByZXNzaW9uKSA9PiB7XG4gICAgaWYgKGNhbGwuYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICAgIC8vIHNlbC5wcmludEFsbChjYWxsKTtcbiAgICAgIHJldHVybiBuZXcgUmVwbGFjZW1lbnQoY2FsbC5hcmd1bWVudHNbMF0uZ2V0RW5kKCksIGNhbGwuYXJndW1lbnRzWzBdLmdldEVuZCgpLCAnLCB7c3RhdGljOiBmYWxzZX0nKTtcbiAgICB9IGVsc2UgaWYgKGNhbGwuYXJndW1lbnRzWzFdICYmIGNhbGwuYXJndW1lbnRzWzFdLmtpbmQgPT09IE9iamVjdExpdGVyYWxFeHByZXNzaW9uS2luZCkge1xuICAgICAgY29uc3Qgb2JqOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbiA9IGNhbGwuYXJndW1lbnRzWzFdIGFzIGFueTtcbiAgICAgIC8vIHNlbC5wcmludEFsbChvYmopO1xuICAgICAgLy8gY29uc29sZS5sb2cob2JqLnByb3BlcnRpZXMubWFwKHAgPT4gcC5uYW1lIS5nZXRUZXh0KHAuZ2V0U291cmNlRmlsZSgpKSkpO1xuICAgICAgY29uc3QgaGFzU3RhdGljID0gb2JqLnByb3BlcnRpZXMuc29tZShwcm9wID0+IHByb3AubmFtZSAmJiAocHJvcC5uYW1lLmdldFRleHQoKSA9PT0gJ3N0YXRpYycgfHxcbiAgICAgICAgcHJvcC5uYW1lLmdldFRleHQoKSA9PT0gJ1xcJ3N0YXRpY1xcJycgfHxcbiAgICAgICAgcHJvcC5uYW1lLmdldFRleHQoKSA9PT0gJ1wic3RhdGljXCInKSk7XG4gICAgICBpZiAoIWhhc1N0YXRpYykge1xuICAgICAgICByZXR1cm4gbmV3IFJlcGxhY2VtZW50KG9iai5nZXRFbmQoKSAtIDEsIG9iai5nZXRFbmQoKSAtMSwgJywgc3RhdGljOiBmYWxzZScpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcignVW5zdXBwb3J0ZWQgQFZpZXdDaGlsZCBhcmd1bWVudCcgKyBzZWwucHJpbnRBbGwoY2FsbC5hcmd1bWVudHNbMV0pKTtcbiAgfSlcbiAgLmZpbHRlcihpdGVtID0+IGl0ZW0gIT0gbnVsbCk7XG4gIGlmIChyZXBsYWNlbWVudHMubGVuZ3RoID4gMCkge1xuICAgIGxvZy53YXJuKCdpbicsIGZpbGUpO1xuICAgIHJldHVybiByZXBsYWNlQ29kZShjb250ZW50LCByZXBsYWNlbWVudHMgYXMgYW55LCB0cnVlKTtcbiAgfVxuICByZXR1cm4gY29udGVudDtcbn1cbiJdfQ==
