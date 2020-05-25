"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvY2xpLXRzLWFzdC11dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDBFQUFzQztBQUN0QyxvREFBb0I7QUFDcEIsMkNBQTBDO0FBQzFDLDBEQUEwQjtBQUUxQjs7R0FFRztBQUNILFNBQXNCLG9CQUFvQixDQUFDLElBQVk7O1FBQ3JELE1BQU0sR0FBRyxHQUFHLElBQUksc0JBQVEsQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUU5RCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLG9EQUFvRCxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3pGLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxNQUFnQyxDQUFDO1lBQ25ELElBQUksSUFBSSxHQUFXLEdBQUcsQ0FBQztZQUV2QixJQUFJLEtBQUssQ0FBQyxTQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyx1QkFBVSxDQUFDLGNBQWMsQ0FBQyxFQUFFO2dCQUNsRixJQUFJLEdBQUcsU0FBUyxDQUFDO2FBQ2xCO2lCQUFNLElBQUksS0FBSyxDQUFDLElBQUksRUFBRTtnQkFDckIsSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7YUFDN0I7WUFDRCx1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMxRixNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxzQkFBc0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQW9CLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQ3pHLE9BQU8sZUFBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUN6RCxDQUFDLENBQUMsQ0FBQztRQUVILHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNqQyxDQUFDO0NBQUE7QUFwQkQsb0RBb0JDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvZGlzdC9jbGktdHMtYXN0LXV0aWwuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgU2VsZWN0b3IgZnJvbSAnLi90cy1hc3QtcXVlcnknO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB0cywge1N5bnRheEtpbmR9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcblxuLyoqXG4gKiBMaXN0IGV4cG9ydGVkIHB1YmxpYyBmdW5jdGlvbnMgYW5kIGl0cyBwYXJhbWV0ZXJzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsaXN0RXhwb3J0ZWRGdW5jdGlvbihmaWxlOiBzdHJpbmcpIHtcbiAgY29uc3Qgc2VsID0gbmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlKTtcblxuICBjb25zdCBmb3VuZHMgPSBzZWwuZmluZEFsbCgnIF4gOkZ1bmN0aW9uRGVjbGFyYXRpb24gPiAubW9kaWZpZXJzOkV4cG9ydEtleXdvcmQnKS5tYXAoYXN0ID0+IHtcbiAgICBjb25zdCBmbkFzdCA9IGFzdC5wYXJlbnQgYXMgdHMuRnVuY3Rpb25EZWNsYXJhdGlvbjtcbiAgICBsZXQgbmFtZTogc3RyaW5nID0gJz8nO1xuXG4gICAgaWYgKGZuQXN0Lm1vZGlmaWVycyEuZmluZChtb2RpZmllciA9PiBtb2RpZmllci5raW5kID09PSBTeW50YXhLaW5kLkRlZmF1bHRLZXl3b3JkKSkge1xuICAgICAgbmFtZSA9ICdkZWZhdWx0JztcbiAgICB9IGVsc2UgaWYgKGZuQXN0Lm5hbWUpIHtcbiAgICAgIG5hbWUgPSBmbkFzdC5uYW1lLmdldFRleHQoKTtcbiAgICB9XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coc2VsLnNyYy5nZXRGdWxsVGV4dCgpLnNsaWNlKGZuQXN0LmdldFN0YXJ0KHNlbC5zcmMsIHRydWUpLCBmbkFzdC5nZXRTdGFydCgpKSk7XG4gICAgY29uc3QgcGFyYW1zID0gc2VsLmZpbmRBbGwoZm5Bc3QsICdeIC5wYXJhbWV0ZXJzID4ubmFtZScpLm1hcCgocGFyYW06IHRzLklkZW50aWZpZXIpID0+IHBhcmFtLmdldFRleHQoKSk7XG4gICAgcmV0dXJuIGNoYWxrLmN5YW4obmFtZSkgKyBgICggJHtwYXJhbXMuam9pbignLCAnKX0gKSBgO1xuICB9KTtcblxuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coZm91bmRzLmpvaW4oJ1xcbicpKTtcbn1cbiJdfQ==
