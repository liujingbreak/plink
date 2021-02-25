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
const ts_ast_query_1 = __importStar(require("@wfh/plink/wfh/dist/utils/ts-ast-query"));
const fs_1 = __importDefault(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
const { SyntaxKind } = ts_ast_query_1.typescript;
/**
 * List exported public functions and its parameters
 */
function listExportedFunction(file) {
    return __awaiter(this, void 0, void 0, function* () {
        const sel = new ts_ast_query_1.default(fs_1.default.readFileSync(file, 'utf8'), file);
        const founds = sel.findAll(' ^ :FunctionDeclaration > .modifiers:ExportKeyword').map(ast => {
            const fnAst = ast.parent;
            let name = '?';
            if (fnAst.modifiers.find(modifier => modifier.kind === SyntaxKind.DefaultKeyword)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXRzLWFzdC11dGlsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLXRzLWFzdC11dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1RkFBa0Y7QUFDbEYsNENBQW9CO0FBQ3BCLGtEQUEwQjtBQUUxQixNQUFNLEVBQUMsVUFBVSxFQUFDLEdBQUcseUJBQUUsQ0FBQztBQUN4Qjs7R0FFRztBQUNILFNBQXNCLG9CQUFvQixDQUFDLElBQVk7O1FBQ3JELE1BQU0sR0FBRyxHQUFHLElBQUksc0JBQVEsQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUU5RCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLG9EQUFvRCxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3pGLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxNQUFnQyxDQUFDO1lBQ25ELElBQUksSUFBSSxHQUFXLEdBQUcsQ0FBQztZQUV2QixJQUFJLEtBQUssQ0FBQyxTQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsY0FBYyxDQUFDLEVBQUU7Z0JBQ2xGLElBQUksR0FBRyxTQUFTLENBQUM7YUFDbEI7aUJBQU0sSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFO2dCQUNyQixJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzthQUM3QjtZQUNELHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzFGLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLHNCQUFzQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBb0IsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDekcsT0FBTyxlQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQ3pELENBQUMsQ0FBQyxDQUFDO1FBRUgsdUNBQXVDO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ2pDLENBQUM7Q0FBQTtBQXBCRCxvREFvQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgU2VsZWN0b3IsIHt0eXBlc2NyaXB0IGFzIHRzfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcblxuY29uc3Qge1N5bnRheEtpbmR9ID0gdHM7XG4vKipcbiAqIExpc3QgZXhwb3J0ZWQgcHVibGljIGZ1bmN0aW9ucyBhbmQgaXRzIHBhcmFtZXRlcnNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxpc3RFeHBvcnRlZEZ1bmN0aW9uKGZpbGU6IHN0cmluZykge1xuICBjb25zdCBzZWwgPSBuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUpO1xuXG4gIGNvbnN0IGZvdW5kcyA9IHNlbC5maW5kQWxsKCcgXiA6RnVuY3Rpb25EZWNsYXJhdGlvbiA+IC5tb2RpZmllcnM6RXhwb3J0S2V5d29yZCcpLm1hcChhc3QgPT4ge1xuICAgIGNvbnN0IGZuQXN0ID0gYXN0LnBhcmVudCBhcyB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uO1xuICAgIGxldCBuYW1lOiBzdHJpbmcgPSAnPyc7XG5cbiAgICBpZiAoZm5Bc3QubW9kaWZpZXJzIS5maW5kKG1vZGlmaWVyID0+IG1vZGlmaWVyLmtpbmQgPT09IFN5bnRheEtpbmQuRGVmYXVsdEtleXdvcmQpKSB7XG4gICAgICBuYW1lID0gJ2RlZmF1bHQnO1xuICAgIH0gZWxzZSBpZiAoZm5Bc3QubmFtZSkge1xuICAgICAgbmFtZSA9IGZuQXN0Lm5hbWUuZ2V0VGV4dCgpO1xuICAgIH1cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhzZWwuc3JjLmdldEZ1bGxUZXh0KCkuc2xpY2UoZm5Bc3QuZ2V0U3RhcnQoc2VsLnNyYywgdHJ1ZSksIGZuQXN0LmdldFN0YXJ0KCkpKTtcbiAgICBjb25zdCBwYXJhbXMgPSBzZWwuZmluZEFsbChmbkFzdCwgJ14gLnBhcmFtZXRlcnMgPi5uYW1lJykubWFwKChwYXJhbTogdHMuSWRlbnRpZmllcikgPT4gcGFyYW0uZ2V0VGV4dCgpKTtcbiAgICByZXR1cm4gY2hhbGsuY3lhbihuYW1lKSArIGAgKCAke3BhcmFtcy5qb2luKCcsICcpfSApIGA7XG4gIH0pO1xuXG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhmb3VuZHMuam9pbignXFxuJykpO1xufVxuIl19