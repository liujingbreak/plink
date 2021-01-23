"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listExportedFunction = void 0;
const ts_ast_query_1 = __importDefault(require("./ts-ast-query"));
const fs_1 = __importDefault(require("fs"));
const typescript_1 = require("typescript");
const chalk_1 = __importDefault(require("chalk"));
/**
 * List exported public functions and its parameters
 */
function listExportedFunction(file) {
    return __awaiter(this, void 0, void 0, function* () {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXRzLWFzdC11dGlsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLXRzLWFzdC11dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGtFQUFzQztBQUN0Qyw0Q0FBb0I7QUFDcEIsMkNBQTBDO0FBQzFDLGtEQUEwQjtBQUUxQjs7R0FFRztBQUNILFNBQXNCLG9CQUFvQixDQUFDLElBQVk7O1FBQ3JELE1BQU0sR0FBRyxHQUFHLElBQUksc0JBQVEsQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUU5RCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLG9EQUFvRCxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3pGLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxNQUFnQyxDQUFDO1lBQ25ELElBQUksSUFBSSxHQUFXLEdBQUcsQ0FBQztZQUV2QixJQUFJLEtBQUssQ0FBQyxTQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyx1QkFBVSxDQUFDLGNBQWMsQ0FBQyxFQUFFO2dCQUNsRixJQUFJLEdBQUcsU0FBUyxDQUFDO2FBQ2xCO2lCQUFNLElBQUksS0FBSyxDQUFDLElBQUksRUFBRTtnQkFDckIsSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7YUFDN0I7WUFDRCx1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMxRixNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxzQkFBc0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQW9CLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQ3pHLE9BQU8sZUFBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUN6RCxDQUFDLENBQUMsQ0FBQztRQUVILHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNqQyxDQUFDO0NBQUE7QUFwQkQsb0RBb0JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFNlbGVjdG9yIGZyb20gJy4vdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgdHMsIHtTeW50YXhLaW5kfSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5cbi8qKlxuICogTGlzdCBleHBvcnRlZCBwdWJsaWMgZnVuY3Rpb25zIGFuZCBpdHMgcGFyYW1ldGVyc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbGlzdEV4cG9ydGVkRnVuY3Rpb24oZmlsZTogc3RyaW5nKSB7XG4gIGNvbnN0IHNlbCA9IG5ldyBTZWxlY3Rvcihmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSwgZmlsZSk7XG5cbiAgY29uc3QgZm91bmRzID0gc2VsLmZpbmRBbGwoJyBeIDpGdW5jdGlvbkRlY2xhcmF0aW9uID4gLm1vZGlmaWVyczpFeHBvcnRLZXl3b3JkJykubWFwKGFzdCA9PiB7XG4gICAgY29uc3QgZm5Bc3QgPSBhc3QucGFyZW50IGFzIHRzLkZ1bmN0aW9uRGVjbGFyYXRpb247XG4gICAgbGV0IG5hbWU6IHN0cmluZyA9ICc/JztcblxuICAgIGlmIChmbkFzdC5tb2RpZmllcnMhLmZpbmQobW9kaWZpZXIgPT4gbW9kaWZpZXIua2luZCA9PT0gU3ludGF4S2luZC5EZWZhdWx0S2V5d29yZCkpIHtcbiAgICAgIG5hbWUgPSAnZGVmYXVsdCc7XG4gICAgfSBlbHNlIGlmIChmbkFzdC5uYW1lKSB7XG4gICAgICBuYW1lID0gZm5Bc3QubmFtZS5nZXRUZXh0KCk7XG4gICAgfVxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKHNlbC5zcmMuZ2V0RnVsbFRleHQoKS5zbGljZShmbkFzdC5nZXRTdGFydChzZWwuc3JjLCB0cnVlKSwgZm5Bc3QuZ2V0U3RhcnQoKSkpO1xuICAgIGNvbnN0IHBhcmFtcyA9IHNlbC5maW5kQWxsKGZuQXN0LCAnXiAucGFyYW1ldGVycyA+Lm5hbWUnKS5tYXAoKHBhcmFtOiB0cy5JZGVudGlmaWVyKSA9PiBwYXJhbS5nZXRUZXh0KCkpO1xuICAgIHJldHVybiBjaGFsay5jeWFuKG5hbWUpICsgYCAoICR7cGFyYW1zLmpvaW4oJywgJyl9ICkgYDtcbiAgfSk7XG5cbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKGZvdW5kcy5qb2luKCdcXG4nKSk7XG59XG4iXX0=