"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._createMainHmrFile = exports.createMainFileForHmr = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const patch_text_1 = __importDefault(require("@wfh/plink/wfh/dist/utils/patch-text"));
const ts_ast_query_1 = __importDefault(require("../utils/ts-ast-query"));
const typescript_1 = __importDefault(require("typescript"));
const log4js_1 = __importDefault(require("log4js"));
const log = log4js_1.default.getLogger('@wfh/ng-app-builder.for-hmr');
function createMainFileForHmr(mainFile) {
    const dir = path_1.default.dirname(mainFile);
    const writeTo = path_1.default.resolve(dir, 'main-hmr.ts');
    if (fs_1.default.existsSync(writeTo)) {
        return writeTo;
    }
    const main = fs_1.default.readFileSync(mainFile, 'utf8');
    // TODO
    const mainHmr = _createMainHmrFile(main, mainFile);
    fs_1.default.writeFileSync(writeTo, mainHmr);
    log.info('Write ' + writeTo);
    log.info(mainHmr);
    return writeTo;
}
exports.createMainFileForHmr = createMainFileForHmr;
/**
 * For test convenience
 */
function _createMainHmrFile(mainTs, mainFile) {
    let mainHmr = '// tslint:disable\n' +
        `import hmrBootstrap from '@wfh/ng-app-builder/src/hmr';\n${mainTs}`;
    const query = new ts_ast_query_1.default(mainHmr, 'main-hmr.ts');
    // query.printAll();
    // let bootCallAst: ts.Node;
    // const statement = query.src.statements.find(statement => {
    //   // tslint:disable-next-line max-line-length
    //   const bootCall = query.findMapTo(statement, ':PropertyAccessExpression > .expression:CallExpression > .expression:Identifier',
    //     (ast: ts.Identifier, path, parents) => {
    //       if (ast.text === 'platformBrowserDynamic' &&
    //       (ast.parent.parent as ts.PropertyAccessExpression).name.getText(query.src) === 'bootstrapModule' &&
    //       ast.parent.parent.parent.kind === ts.SyntaxKind.CallExpression) {
    //         return ast.parent.parent.parent;
    //       }
    //     });
    //   if (bootCall) {
    //     bootCallAst = bootCall;
    //     return true;
    //   }
    //   return false;
    // });
    const bootCallAst = query.findMapTo(':PropertyAccessExpression > .expression:CallExpression > .expression:Identifier', (ast, path, parents) => {
        if (ast.text === 'platformBrowserDynamic' &&
            ast.parent.parent.name.getText(query.src) === 'bootstrapModule' &&
            ast.parent.parent.parent.kind === typescript_1.default.SyntaxKind.CallExpression) {
            return ast.parent.parent.parent;
        }
    });
    if (bootCallAst == null)
        throw new Error(`${mainFile},` +
            `can not find statement like: platformBrowserDynamic().bootstrapModule(AppModule)\n${mainHmr}`);
    // Look for root statement expression
    let statement = bootCallAst.parent;
    while (statement.kind !== typescript_1.default.SyntaxKind.ExpressionStatement || statement.parent !== query.src) {
        statement = statement.parent;
    }
    const statementBeginPos = statement.getStart(query.src, true);
    const declareNewBootstrap = `const bootstrap = () => ${bootCallAst.getText()};\n
  if (module[ 'hot' ]) {
    hmrBootstrap(module, bootstrap);
  } else {
    console.error('HMR is not enabled for webpack-dev-server!');
    console.log('Are you using the --hmr flag for ng serve?');
  }\n`.replace(/^\t/gm, '');
    mainHmr = patch_text_1.default(mainHmr, [
        {
            start: statementBeginPos,
            end: statementBeginPos,
            text: declareNewBootstrap
        },
        {
            start: bootCallAst.getStart(query.src, true),
            end: bootCallAst.getEnd(),
            text: 'bootstrap()'
        }
    ]);
    return mainHmr;
}
exports._createMainHmrFile = _createMainHmrFile;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9uZy9mb3ItaG1yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLGdEQUF3QjtBQUN4Qiw0Q0FBb0I7QUFDcEIsc0ZBQStEO0FBQy9ELHlFQUFrRDtBQUNsRCw0REFBNEI7QUFDNUIsb0RBQTRCO0FBRTVCLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLDZCQUE2QixDQUFDLENBQUM7QUFFNUQsU0FBZ0Isb0JBQW9CLENBQUMsUUFBZ0I7SUFDbkQsTUFBTSxHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNuQyxNQUFNLE9BQU8sR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUNqRCxJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDMUIsT0FBTyxPQUFPLENBQUM7S0FDaEI7SUFDRCxNQUFNLElBQUksR0FBRyxZQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMvQyxPQUFPO0lBQ1AsTUFBTSxPQUFPLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ25ELFlBQUUsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ25DLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxDQUFDO0lBQzdCLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDbEIsT0FBTyxPQUFPLENBQUM7QUFDakIsQ0FBQztBQWJELG9EQWFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixrQkFBa0IsQ0FBQyxNQUFjLEVBQUUsUUFBZ0I7SUFDakUsSUFBSSxPQUFPLEdBQUcscUJBQXFCO1FBQ25DLDREQUE0RCxNQUFNLEVBQUUsQ0FBQztJQUNyRSxNQUFNLEtBQUssR0FBRyxJQUFJLHNCQUFhLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQ3hELG9CQUFvQjtJQUVwQiw0QkFBNEI7SUFDNUIsNkRBQTZEO0lBQzdELGdEQUFnRDtJQUNoRCxtSUFBbUk7SUFDbkksK0NBQStDO0lBQy9DLHFEQUFxRDtJQUNyRCw0R0FBNEc7SUFDNUcsMEVBQTBFO0lBQzFFLDJDQUEyQztJQUMzQyxVQUFVO0lBQ1YsVUFBVTtJQUNWLG9CQUFvQjtJQUNwQiw4QkFBOEI7SUFDOUIsbUJBQW1CO0lBQ25CLE1BQU07SUFDTixrQkFBa0I7SUFDbEIsTUFBTTtJQUVOLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsaUZBQWlGLEVBQ25ILENBQUMsR0FBa0IsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUU7UUFDcEMsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLHdCQUF3QjtZQUN4QyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQXNDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssaUJBQWlCO1lBQ2hHLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssb0JBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFO1lBQzlELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO1NBQ2pDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFHTCxJQUFJLFdBQVcsSUFBSSxJQUFJO1FBQ3JCLE1BQU0sSUFBSSxLQUFLLENBQUMsR0FBRyxRQUFRLEdBQUc7WUFDOUIscUZBQXFGLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFFbEcscUNBQXFDO0lBQ3JDLElBQUksU0FBUyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUM7SUFDbkMsT0FBTyxTQUFTLENBQUMsSUFBSSxLQUFLLG9CQUFFLENBQUMsVUFBVSxDQUFDLG1CQUFtQixJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUM3RixTQUFTLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQztLQUM5QjtJQUVELE1BQU0saUJBQWlCLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBRTlELE1BQU0sbUJBQW1CLEdBQUcsMkJBQTJCLFdBQVksQ0FBQyxPQUFPLEVBQUU7Ozs7OztNQU16RSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFMUIsT0FBTyxHQUFHLG9CQUFXLENBQUMsT0FBTyxFQUFFO1FBQzdCO1lBQ0UsS0FBSyxFQUFFLGlCQUFpQjtZQUN4QixHQUFHLEVBQUUsaUJBQWlCO1lBQ3RCLElBQUksRUFBRSxtQkFBbUI7U0FDMUI7UUFDRDtZQUNFLEtBQUssRUFBRSxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO1lBQzVDLEdBQUcsRUFBRSxXQUFXLENBQUMsTUFBTSxFQUFFO1lBQ3pCLElBQUksRUFBRSxhQUFhO1NBQ3BCO0tBQ0EsQ0FBQyxDQUFDO0lBQ0wsT0FBTyxPQUFPLENBQUM7QUFDakIsQ0FBQztBQW5FRCxnREFtRUMiLCJmaWxlIjoiZGlzdC9uZy9mb3ItaG1yLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXX0=
