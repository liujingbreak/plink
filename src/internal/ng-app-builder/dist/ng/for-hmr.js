"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const patch_text_1 = tslib_1.__importDefault(require("dr-comp-package/wfh/dist/utils/patch-text"));
const ts_ast_query_1 = tslib_1.__importDefault(require("../utils/ts-ast-query"));
const typescript_1 = tslib_1.__importDefault(require("typescript"));
const log4js_1 = tslib_1.__importDefault(require("log4js"));
const log = log4js_1.default.getLogger('@dr-core/ng-app-builder.for-hmr');
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
        `import hmrBootstrap from '@dr-core/ng-app-builder/src/hmr';\n${mainTs}`;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9mb3ItaG1yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHdEQUF3QjtBQUN4QixvREFBb0I7QUFDcEIsbUdBQW9FO0FBQ3BFLGlGQUFrRDtBQUNsRCxvRUFBNEI7QUFDNUIsNERBQTRCO0FBRTVCLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGlDQUFpQyxDQUFDLENBQUM7QUFFaEUsU0FBZ0Isb0JBQW9CLENBQUMsUUFBZ0I7SUFDbkQsTUFBTSxHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNuQyxNQUFNLE9BQU8sR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUNqRCxJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDMUIsT0FBTyxPQUFPLENBQUM7S0FDaEI7SUFDRCxNQUFNLElBQUksR0FBRyxZQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMvQyxPQUFPO0lBQ1AsTUFBTSxPQUFPLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ25ELFlBQUUsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ25DLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxDQUFDO0lBQzdCLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDbEIsT0FBTyxPQUFPLENBQUM7QUFDakIsQ0FBQztBQWJELG9EQWFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixrQkFBa0IsQ0FBQyxNQUFjLEVBQUUsUUFBZ0I7SUFDakUsSUFBSSxPQUFPLEdBQUcscUJBQXFCO1FBQ25DLGdFQUFnRSxNQUFNLEVBQUUsQ0FBQztJQUN6RSxNQUFNLEtBQUssR0FBRyxJQUFJLHNCQUFhLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQ3hELG9CQUFvQjtJQUVwQiw0QkFBNEI7SUFDNUIsNkRBQTZEO0lBQzdELGdEQUFnRDtJQUNoRCxtSUFBbUk7SUFDbkksK0NBQStDO0lBQy9DLHFEQUFxRDtJQUNyRCw0R0FBNEc7SUFDNUcsMEVBQTBFO0lBQzFFLDJDQUEyQztJQUMzQyxVQUFVO0lBQ1YsVUFBVTtJQUNWLG9CQUFvQjtJQUNwQiw4QkFBOEI7SUFDOUIsbUJBQW1CO0lBQ25CLE1BQU07SUFDTixrQkFBa0I7SUFDbEIsTUFBTTtJQUVOLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsaUZBQWlGLEVBQ25ILENBQUMsR0FBa0IsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUU7UUFDcEMsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLHdCQUF3QjtZQUN4QyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQXNDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssaUJBQWlCO1lBQ2hHLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssb0JBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFO1lBQzlELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO1NBQ2pDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFHTCxJQUFJLFdBQVcsSUFBSSxJQUFJO1FBQ3JCLE1BQU0sSUFBSSxLQUFLLENBQUMsR0FBRyxRQUFRLEdBQUc7WUFDOUIscUZBQXFGLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFFbEcscUNBQXFDO0lBQ3JDLElBQUksU0FBUyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUM7SUFDbkMsT0FBTyxTQUFTLENBQUMsSUFBSSxLQUFLLG9CQUFFLENBQUMsVUFBVSxDQUFDLG1CQUFtQixJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUM3RixTQUFTLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQztLQUM5QjtJQUVELE1BQU0saUJBQWlCLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBRTlELE1BQU0sbUJBQW1CLEdBQUcsMkJBQTJCLFdBQVksQ0FBQyxPQUFPLEVBQUU7Ozs7OztNQU16RSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFMUIsT0FBTyxHQUFHLG9CQUFXLENBQUMsT0FBTyxFQUFFO1FBQzdCO1lBQ0UsS0FBSyxFQUFFLGlCQUFpQjtZQUN4QixHQUFHLEVBQUUsaUJBQWlCO1lBQ3RCLElBQUksRUFBRSxtQkFBbUI7U0FDMUI7UUFDRDtZQUNFLEtBQUssRUFBRSxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO1lBQzVDLEdBQUcsRUFBRSxXQUFXLENBQUMsTUFBTSxFQUFFO1lBQ3pCLElBQUksRUFBRSxhQUFhO1NBQ3BCO0tBQ0EsQ0FBQyxDQUFDO0lBQ0wsT0FBTyxPQUFPLENBQUM7QUFDakIsQ0FBQztBQW5FRCxnREFtRUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmcvZm9yLWhtci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCByZXBsYWNlQ29kZSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQgVHNBc3RTZWxlY3RvciBmcm9tICcuLi91dGlscy90cy1hc3QtcXVlcnknO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdAZHItY29yZS9uZy1hcHAtYnVpbGRlci5mb3ItaG1yJyk7XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVNYWluRmlsZUZvckhtcihtYWluRmlsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgZGlyID0gUGF0aC5kaXJuYW1lKG1haW5GaWxlKTtcbiAgY29uc3Qgd3JpdGVUbyA9IFBhdGgucmVzb2x2ZShkaXIsICdtYWluLWhtci50cycpO1xuICBpZiAoZnMuZXhpc3RzU3luYyh3cml0ZVRvKSkge1xuICAgIHJldHVybiB3cml0ZVRvO1xuICB9XG4gIGNvbnN0IG1haW4gPSBmcy5yZWFkRmlsZVN5bmMobWFpbkZpbGUsICd1dGY4Jyk7XG4gIC8vIFRPRE9cbiAgY29uc3QgbWFpbkhtciA9IF9jcmVhdGVNYWluSG1yRmlsZShtYWluLCBtYWluRmlsZSk7XG4gIGZzLndyaXRlRmlsZVN5bmMod3JpdGVUbywgbWFpbkhtcik7XG4gIGxvZy5pbmZvKCdXcml0ZSAnICsgd3JpdGVUbyk7XG4gIGxvZy5pbmZvKG1haW5IbXIpO1xuICByZXR1cm4gd3JpdGVUbztcbn1cblxuLyoqXG4gKiBGb3IgdGVzdCBjb252ZW5pZW5jZVxuICovXG5leHBvcnQgZnVuY3Rpb24gX2NyZWF0ZU1haW5IbXJGaWxlKG1haW5Uczogc3RyaW5nLCBtYWluRmlsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgbGV0IG1haW5IbXIgPSAnLy8gdHNsaW50OmRpc2FibGVcXG4nICtcbiAgYGltcG9ydCBobXJCb290c3RyYXAgZnJvbSAnQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvc3JjL2htcic7XFxuJHttYWluVHN9YDtcbiAgY29uc3QgcXVlcnkgPSBuZXcgVHNBc3RTZWxlY3RvcihtYWluSG1yLCAnbWFpbi1obXIudHMnKTtcbiAgLy8gcXVlcnkucHJpbnRBbGwoKTtcblxuICAvLyBsZXQgYm9vdENhbGxBc3Q6IHRzLk5vZGU7XG4gIC8vIGNvbnN0IHN0YXRlbWVudCA9IHF1ZXJ5LnNyYy5zdGF0ZW1lbnRzLmZpbmQoc3RhdGVtZW50ID0+IHtcbiAgLy8gICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxpbmUtbGVuZ3RoXG4gIC8vICAgY29uc3QgYm9vdENhbGwgPSBxdWVyeS5maW5kTWFwVG8oc3RhdGVtZW50LCAnOlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiA+IC5leHByZXNzaW9uOkNhbGxFeHByZXNzaW9uID4gLmV4cHJlc3Npb246SWRlbnRpZmllcicsXG4gIC8vICAgICAoYXN0OiB0cy5JZGVudGlmaWVyLCBwYXRoLCBwYXJlbnRzKSA9PiB7XG4gIC8vICAgICAgIGlmIChhc3QudGV4dCA9PT0gJ3BsYXRmb3JtQnJvd3NlckR5bmFtaWMnICYmXG4gIC8vICAgICAgIChhc3QucGFyZW50LnBhcmVudCBhcyB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24pLm5hbWUuZ2V0VGV4dChxdWVyeS5zcmMpID09PSAnYm9vdHN0cmFwTW9kdWxlJyAmJlxuICAvLyAgICAgICBhc3QucGFyZW50LnBhcmVudC5wYXJlbnQua2luZCA9PT0gdHMuU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvbikge1xuICAvLyAgICAgICAgIHJldHVybiBhc3QucGFyZW50LnBhcmVudC5wYXJlbnQ7XG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH0pO1xuICAvLyAgIGlmIChib290Q2FsbCkge1xuICAvLyAgICAgYm9vdENhbGxBc3QgPSBib290Q2FsbDtcbiAgLy8gICAgIHJldHVybiB0cnVlO1xuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gZmFsc2U7XG4gIC8vIH0pO1xuXG4gIGNvbnN0IGJvb3RDYWxsQXN0ID0gcXVlcnkuZmluZE1hcFRvKCc6UHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uID4gLmV4cHJlc3Npb246Q2FsbEV4cHJlc3Npb24gPiAuZXhwcmVzc2lvbjpJZGVudGlmaWVyJyxcbiAgICAoYXN0OiB0cy5JZGVudGlmaWVyLCBwYXRoLCBwYXJlbnRzKSA9PiB7XG4gICAgICBpZiAoYXN0LnRleHQgPT09ICdwbGF0Zm9ybUJyb3dzZXJEeW5hbWljJyAmJlxuICAgICAgKGFzdC5wYXJlbnQucGFyZW50IGFzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikubmFtZS5nZXRUZXh0KHF1ZXJ5LnNyYykgPT09ICdib290c3RyYXBNb2R1bGUnICYmXG4gICAgICBhc3QucGFyZW50LnBhcmVudC5wYXJlbnQua2luZCA9PT0gdHMuU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvbikge1xuICAgICAgICByZXR1cm4gYXN0LnBhcmVudC5wYXJlbnQucGFyZW50O1xuICAgICAgfVxuICAgIH0pO1xuXG5cbiAgaWYgKGJvb3RDYWxsQXN0ID09IG51bGwpXG4gICAgdGhyb3cgbmV3IEVycm9yKGAke21haW5GaWxlfSxgICtcbiAgICBgY2FuIG5vdCBmaW5kIHN0YXRlbWVudCBsaWtlOiBwbGF0Zm9ybUJyb3dzZXJEeW5hbWljKCkuYm9vdHN0cmFwTW9kdWxlKEFwcE1vZHVsZSlcXG4ke21haW5IbXJ9YCk7XG5cbiAgLy8gTG9vayBmb3Igcm9vdCBzdGF0ZW1lbnQgZXhwcmVzc2lvblxuICBsZXQgc3RhdGVtZW50ID0gYm9vdENhbGxBc3QucGFyZW50O1xuICB3aGlsZSAoc3RhdGVtZW50LmtpbmQgIT09IHRzLlN5bnRheEtpbmQuRXhwcmVzc2lvblN0YXRlbWVudCB8fCBzdGF0ZW1lbnQucGFyZW50ICE9PSBxdWVyeS5zcmMpIHtcbiAgICBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQucGFyZW50O1xuICB9XG5cbiAgY29uc3Qgc3RhdGVtZW50QmVnaW5Qb3MgPSBzdGF0ZW1lbnQuZ2V0U3RhcnQocXVlcnkuc3JjLCB0cnVlKTtcblxuICBjb25zdCBkZWNsYXJlTmV3Qm9vdHN0cmFwID0gYGNvbnN0IGJvb3RzdHJhcCA9ICgpID0+ICR7Ym9vdENhbGxBc3QhLmdldFRleHQoKX07XFxuXG4gIGlmIChtb2R1bGVbICdob3QnIF0pIHtcbiAgICBobXJCb290c3RyYXAobW9kdWxlLCBib290c3RyYXApO1xuICB9IGVsc2Uge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0hNUiBpcyBub3QgZW5hYmxlZCBmb3Igd2VicGFjay1kZXYtc2VydmVyIScpO1xuICAgIGNvbnNvbGUubG9nKCdBcmUgeW91IHVzaW5nIHRoZSAtLWhtciBmbGFnIGZvciBuZyBzZXJ2ZT8nKTtcbiAgfVxcbmAucmVwbGFjZSgvXlxcdC9nbSwgJycpO1xuXG4gIG1haW5IbXIgPSByZXBsYWNlQ29kZShtYWluSG1yLCBbXG4gICAge1xuICAgICAgc3RhcnQ6IHN0YXRlbWVudEJlZ2luUG9zLFxuICAgICAgZW5kOiBzdGF0ZW1lbnRCZWdpblBvcyxcbiAgICAgIHRleHQ6IGRlY2xhcmVOZXdCb290c3RyYXBcbiAgICB9LFxuICAgIHtcbiAgICAgIHN0YXJ0OiBib290Q2FsbEFzdC5nZXRTdGFydChxdWVyeS5zcmMsIHRydWUpLFxuICAgICAgZW5kOiBib290Q2FsbEFzdC5nZXRFbmQoKSxcbiAgICAgIHRleHQ6ICdib290c3RyYXAoKSdcbiAgICB9XG4gICAgXSk7XG4gIHJldHVybiBtYWluSG1yO1xufVxuIl19
