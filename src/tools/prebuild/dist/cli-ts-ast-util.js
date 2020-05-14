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
            console.log(fnAst.getChildren().map(ast => typescript_1.SyntaxKind[ast.kind]));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvY2xpLXRzLWFzdC11dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDBFQUFzQztBQUN0QyxvREFBb0I7QUFDcEIsMkNBQTBDO0FBQzFDLDBEQUEwQjtBQUUxQjs7R0FFRztBQUNILFNBQXNCLG9CQUFvQixDQUFDLElBQVk7O1FBQ3JELE1BQU0sR0FBRyxHQUFHLElBQUksc0JBQVEsQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUU5RCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLG9EQUFvRCxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3pGLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxNQUFnQyxDQUFDO1lBQ25ELElBQUksSUFBSSxHQUFXLEdBQUcsQ0FBQztZQUV2QixJQUFJLEtBQUssQ0FBQyxTQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyx1QkFBVSxDQUFDLGNBQWMsQ0FBQyxFQUFFO2dCQUNsRixJQUFJLEdBQUcsU0FBUyxDQUFDO2FBQ2xCO2lCQUFNLElBQUksS0FBSyxDQUFDLElBQUksRUFBRTtnQkFDckIsSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7YUFDN0I7WUFDRCx1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsdUJBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2xFLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzFGLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLHNCQUFzQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBb0IsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDekcsT0FBTyxlQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQ3pELENBQUMsQ0FBQyxDQUFDO1FBRUgsdUNBQXVDO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ2pDLENBQUM7Q0FBQTtBQXRCRCxvREFzQkMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Biay9wcmVidWlsZC9kaXN0L2NsaS10cy1hc3QtdXRpbC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBTZWxlY3RvciBmcm9tICcuL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHRzLCB7U3ludGF4S2luZH0gZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuXG4vKipcbiAqIExpc3QgZXhwb3J0ZWQgcHVibGljIGZ1bmN0aW9ucyBhbmQgaXRzIHBhcmFtZXRlcnNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxpc3RFeHBvcnRlZEZ1bmN0aW9uKGZpbGU6IHN0cmluZykge1xuICBjb25zdCBzZWwgPSBuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUpO1xuXG4gIGNvbnN0IGZvdW5kcyA9IHNlbC5maW5kQWxsKCcgXiA6RnVuY3Rpb25EZWNsYXJhdGlvbiA+IC5tb2RpZmllcnM6RXhwb3J0S2V5d29yZCcpLm1hcChhc3QgPT4ge1xuICAgIGNvbnN0IGZuQXN0ID0gYXN0LnBhcmVudCBhcyB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uO1xuICAgIGxldCBuYW1lOiBzdHJpbmcgPSAnPyc7XG5cbiAgICBpZiAoZm5Bc3QubW9kaWZpZXJzIS5maW5kKG1vZGlmaWVyID0+IG1vZGlmaWVyLmtpbmQgPT09IFN5bnRheEtpbmQuRGVmYXVsdEtleXdvcmQpKSB7XG4gICAgICBuYW1lID0gJ2RlZmF1bHQnO1xuICAgIH0gZWxzZSBpZiAoZm5Bc3QubmFtZSkge1xuICAgICAgbmFtZSA9IGZuQXN0Lm5hbWUuZ2V0VGV4dCgpO1xuICAgIH1cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhmbkFzdC5nZXRDaGlsZHJlbigpLm1hcChhc3QgPT4gU3ludGF4S2luZFthc3Qua2luZF0pKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhzZWwuc3JjLmdldEZ1bGxUZXh0KCkuc2xpY2UoZm5Bc3QuZ2V0U3RhcnQoc2VsLnNyYywgdHJ1ZSksIGZuQXN0LmdldFN0YXJ0KCkpKTtcbiAgICBjb25zdCBwYXJhbXMgPSBzZWwuZmluZEFsbChmbkFzdCwgJ14gLnBhcmFtZXRlcnMgPi5uYW1lJykubWFwKChwYXJhbTogdHMuSWRlbnRpZmllcikgPT4gcGFyYW0uZ2V0VGV4dCgpKTtcbiAgICByZXR1cm4gY2hhbGsuY3lhbihuYW1lKSArIGAgKCAke3BhcmFtcy5qb2luKCcsICcpfSApIGA7XG4gIH0pO1xuXG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhmb3VuZHMuam9pbignXFxuJykpO1xufVxuIl19
