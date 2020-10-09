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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL3Rvb2xzL3ByZWJ1aWxkL3RzL2NsaS10cy1hc3QtdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxrRUFBc0M7QUFDdEMsNENBQW9CO0FBQ3BCLDJDQUEwQztBQUMxQyxrREFBMEI7QUFFMUI7O0dBRUc7QUFDSCxTQUFzQixvQkFBb0IsQ0FBQyxJQUFZOztRQUNyRCxNQUFNLEdBQUcsR0FBRyxJQUFJLHNCQUFRLENBQUMsWUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFOUQsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxvREFBb0QsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN6RixNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsTUFBZ0MsQ0FBQztZQUNuRCxJQUFJLElBQUksR0FBVyxHQUFHLENBQUM7WUFFdkIsSUFBSSxLQUFLLENBQUMsU0FBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssdUJBQVUsQ0FBQyxjQUFjLENBQUMsRUFBRTtnQkFDbEYsSUFBSSxHQUFHLFNBQVMsQ0FBQzthQUNsQjtpQkFBTSxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUU7Z0JBQ3JCLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2FBQzdCO1lBQ0QsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDMUYsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsc0JBQXNCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFvQixFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUN6RyxPQUFPLGVBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDekQsQ0FBQyxDQUFDLENBQUM7UUFFSCx1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDakMsQ0FBQztDQUFBO0FBcEJELG9EQW9CQyIsImZpbGUiOiJ0b29scy9wcmVidWlsZC9kaXN0L2NsaS10cy1hc3QtdXRpbC5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF19
