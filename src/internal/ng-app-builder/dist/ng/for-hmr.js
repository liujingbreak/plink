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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9yLWhtci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZvci1obXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUNwQixzRkFBK0Q7QUFDL0QseUVBQWtEO0FBQ2xELDREQUE0QjtBQUM1QixvREFBNEI7QUFFNUIsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsNkJBQTZCLENBQUMsQ0FBQztBQUU1RCxTQUFnQixvQkFBb0IsQ0FBQyxRQUFnQjtJQUNuRCxNQUFNLEdBQUcsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ25DLE1BQU0sT0FBTyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQ2pELElBQUksWUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUMxQixPQUFPLE9BQU8sQ0FBQztLQUNoQjtJQUNELE1BQU0sSUFBSSxHQUFHLFlBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQy9DLE9BQU87SUFDUCxNQUFNLE9BQU8sR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDbkQsWUFBRSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDbkMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLENBQUM7SUFDN0IsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNsQixPQUFPLE9BQU8sQ0FBQztBQUNqQixDQUFDO0FBYkQsb0RBYUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLGtCQUFrQixDQUFDLE1BQWMsRUFBRSxRQUFnQjtJQUNqRSxJQUFJLE9BQU8sR0FBRyxxQkFBcUI7UUFDbkMsNERBQTRELE1BQU0sRUFBRSxDQUFDO0lBQ3JFLE1BQU0sS0FBSyxHQUFHLElBQUksc0JBQWEsQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDeEQsb0JBQW9CO0lBRXBCLDRCQUE0QjtJQUM1Qiw2REFBNkQ7SUFDN0QsZ0RBQWdEO0lBQ2hELG1JQUFtSTtJQUNuSSwrQ0FBK0M7SUFDL0MscURBQXFEO0lBQ3JELDRHQUE0RztJQUM1RywwRUFBMEU7SUFDMUUsMkNBQTJDO0lBQzNDLFVBQVU7SUFDVixVQUFVO0lBQ1Ysb0JBQW9CO0lBQ3BCLDhCQUE4QjtJQUM5QixtQkFBbUI7SUFDbkIsTUFBTTtJQUNOLGtCQUFrQjtJQUNsQixNQUFNO0lBRU4sTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxpRkFBaUYsRUFDbkgsQ0FBQyxHQUFrQixFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUNwQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssd0JBQXdCO1lBQ3hDLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBc0MsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxpQkFBaUI7WUFDaEcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxvQkFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUU7WUFDOUQsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7U0FDakM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUdMLElBQUksV0FBVyxJQUFJLElBQUk7UUFDckIsTUFBTSxJQUFJLEtBQUssQ0FBQyxHQUFHLFFBQVEsR0FBRztZQUM5QixxRkFBcUYsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUVsRyxxQ0FBcUM7SUFDckMsSUFBSSxTQUFTLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQztJQUNuQyxPQUFPLFNBQVMsQ0FBQyxJQUFJLEtBQUssb0JBQUUsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQzdGLFNBQVMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDO0tBQzlCO0lBRUQsTUFBTSxpQkFBaUIsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFOUQsTUFBTSxtQkFBbUIsR0FBRywyQkFBMkIsV0FBWSxDQUFDLE9BQU8sRUFBRTs7Ozs7O01BTXpFLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztJQUUxQixPQUFPLEdBQUcsb0JBQVcsQ0FBQyxPQUFPLEVBQUU7UUFDN0I7WUFDRSxLQUFLLEVBQUUsaUJBQWlCO1lBQ3hCLEdBQUcsRUFBRSxpQkFBaUI7WUFDdEIsSUFBSSxFQUFFLG1CQUFtQjtTQUMxQjtRQUNEO1lBQ0UsS0FBSyxFQUFFLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7WUFDNUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxNQUFNLEVBQUU7WUFDekIsSUFBSSxFQUFFLGFBQWE7U0FDcEI7S0FDQSxDQUFDLENBQUM7SUFDTCxPQUFPLE9BQU8sQ0FBQztBQUNqQixDQUFDO0FBbkVELGdEQW1FQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCByZXBsYWNlQ29kZSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IFRzQXN0U2VsZWN0b3IgZnJvbSAnLi4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignQHdmaC9uZy1hcHAtYnVpbGRlci5mb3ItaG1yJyk7XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVNYWluRmlsZUZvckhtcihtYWluRmlsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgZGlyID0gUGF0aC5kaXJuYW1lKG1haW5GaWxlKTtcbiAgY29uc3Qgd3JpdGVUbyA9IFBhdGgucmVzb2x2ZShkaXIsICdtYWluLWhtci50cycpO1xuICBpZiAoZnMuZXhpc3RzU3luYyh3cml0ZVRvKSkge1xuICAgIHJldHVybiB3cml0ZVRvO1xuICB9XG4gIGNvbnN0IG1haW4gPSBmcy5yZWFkRmlsZVN5bmMobWFpbkZpbGUsICd1dGY4Jyk7XG4gIC8vIFRPRE9cbiAgY29uc3QgbWFpbkhtciA9IF9jcmVhdGVNYWluSG1yRmlsZShtYWluLCBtYWluRmlsZSk7XG4gIGZzLndyaXRlRmlsZVN5bmMod3JpdGVUbywgbWFpbkhtcik7XG4gIGxvZy5pbmZvKCdXcml0ZSAnICsgd3JpdGVUbyk7XG4gIGxvZy5pbmZvKG1haW5IbXIpO1xuICByZXR1cm4gd3JpdGVUbztcbn1cblxuLyoqXG4gKiBGb3IgdGVzdCBjb252ZW5pZW5jZVxuICovXG5leHBvcnQgZnVuY3Rpb24gX2NyZWF0ZU1haW5IbXJGaWxlKG1haW5Uczogc3RyaW5nLCBtYWluRmlsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgbGV0IG1haW5IbXIgPSAnLy8gdHNsaW50OmRpc2FibGVcXG4nICtcbiAgYGltcG9ydCBobXJCb290c3RyYXAgZnJvbSAnQHdmaC9uZy1hcHAtYnVpbGRlci9zcmMvaG1yJztcXG4ke21haW5Uc31gO1xuICBjb25zdCBxdWVyeSA9IG5ldyBUc0FzdFNlbGVjdG9yKG1haW5IbXIsICdtYWluLWhtci50cycpO1xuICAvLyBxdWVyeS5wcmludEFsbCgpO1xuXG4gIC8vIGxldCBib290Q2FsbEFzdDogdHMuTm9kZTtcbiAgLy8gY29uc3Qgc3RhdGVtZW50ID0gcXVlcnkuc3JjLnN0YXRlbWVudHMuZmluZChzdGF0ZW1lbnQgPT4ge1xuICAvLyAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZSBtYXgtbGluZS1sZW5ndGhcbiAgLy8gICBjb25zdCBib290Q2FsbCA9IHF1ZXJ5LmZpbmRNYXBUbyhzdGF0ZW1lbnQsICc6UHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uID4gLmV4cHJlc3Npb246Q2FsbEV4cHJlc3Npb24gPiAuZXhwcmVzc2lvbjpJZGVudGlmaWVyJyxcbiAgLy8gICAgIChhc3Q6IHRzLklkZW50aWZpZXIsIHBhdGgsIHBhcmVudHMpID0+IHtcbiAgLy8gICAgICAgaWYgKGFzdC50ZXh0ID09PSAncGxhdGZvcm1Ccm93c2VyRHluYW1pYycgJiZcbiAgLy8gICAgICAgKGFzdC5wYXJlbnQucGFyZW50IGFzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikubmFtZS5nZXRUZXh0KHF1ZXJ5LnNyYykgPT09ICdib290c3RyYXBNb2R1bGUnICYmXG4gIC8vICAgICAgIGFzdC5wYXJlbnQucGFyZW50LnBhcmVudC5raW5kID09PSB0cy5TeW50YXhLaW5kLkNhbGxFeHByZXNzaW9uKSB7XG4gIC8vICAgICAgICAgcmV0dXJuIGFzdC5wYXJlbnQucGFyZW50LnBhcmVudDtcbiAgLy8gICAgICAgfVxuICAvLyAgICAgfSk7XG4gIC8vICAgaWYgKGJvb3RDYWxsKSB7XG4gIC8vICAgICBib290Q2FsbEFzdCA9IGJvb3RDYWxsO1xuICAvLyAgICAgcmV0dXJuIHRydWU7XG4gIC8vICAgfVxuICAvLyAgIHJldHVybiBmYWxzZTtcbiAgLy8gfSk7XG5cbiAgY29uc3QgYm9vdENhbGxBc3QgPSBxdWVyeS5maW5kTWFwVG8oJzpQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24gPiAuZXhwcmVzc2lvbjpDYWxsRXhwcmVzc2lvbiA+IC5leHByZXNzaW9uOklkZW50aWZpZXInLFxuICAgIChhc3Q6IHRzLklkZW50aWZpZXIsIHBhdGgsIHBhcmVudHMpID0+IHtcbiAgICAgIGlmIChhc3QudGV4dCA9PT0gJ3BsYXRmb3JtQnJvd3NlckR5bmFtaWMnICYmXG4gICAgICAoYXN0LnBhcmVudC5wYXJlbnQgYXMgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKS5uYW1lLmdldFRleHQocXVlcnkuc3JjKSA9PT0gJ2Jvb3RzdHJhcE1vZHVsZScgJiZcbiAgICAgIGFzdC5wYXJlbnQucGFyZW50LnBhcmVudC5raW5kID09PSB0cy5TeW50YXhLaW5kLkNhbGxFeHByZXNzaW9uKSB7XG4gICAgICAgIHJldHVybiBhc3QucGFyZW50LnBhcmVudC5wYXJlbnQ7XG4gICAgICB9XG4gICAgfSk7XG5cblxuICBpZiAoYm9vdENhbGxBc3QgPT0gbnVsbClcbiAgICB0aHJvdyBuZXcgRXJyb3IoYCR7bWFpbkZpbGV9LGAgK1xuICAgIGBjYW4gbm90IGZpbmQgc3RhdGVtZW50IGxpa2U6IHBsYXRmb3JtQnJvd3NlckR5bmFtaWMoKS5ib290c3RyYXBNb2R1bGUoQXBwTW9kdWxlKVxcbiR7bWFpbkhtcn1gKTtcblxuICAvLyBMb29rIGZvciByb290IHN0YXRlbWVudCBleHByZXNzaW9uXG4gIGxldCBzdGF0ZW1lbnQgPSBib290Q2FsbEFzdC5wYXJlbnQ7XG4gIHdoaWxlIChzdGF0ZW1lbnQua2luZCAhPT0gdHMuU3ludGF4S2luZC5FeHByZXNzaW9uU3RhdGVtZW50IHx8IHN0YXRlbWVudC5wYXJlbnQgIT09IHF1ZXJ5LnNyYykge1xuICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5wYXJlbnQ7XG4gIH1cblxuICBjb25zdCBzdGF0ZW1lbnRCZWdpblBvcyA9IHN0YXRlbWVudC5nZXRTdGFydChxdWVyeS5zcmMsIHRydWUpO1xuXG4gIGNvbnN0IGRlY2xhcmVOZXdCb290c3RyYXAgPSBgY29uc3QgYm9vdHN0cmFwID0gKCkgPT4gJHtib290Q2FsbEFzdCEuZ2V0VGV4dCgpfTtcXG5cbiAgaWYgKG1vZHVsZVsgJ2hvdCcgXSkge1xuICAgIGhtckJvb3RzdHJhcChtb2R1bGUsIGJvb3RzdHJhcCk7XG4gIH0gZWxzZSB7XG4gICAgY29uc29sZS5lcnJvcignSE1SIGlzIG5vdCBlbmFibGVkIGZvciB3ZWJwYWNrLWRldi1zZXJ2ZXIhJyk7XG4gICAgY29uc29sZS5sb2coJ0FyZSB5b3UgdXNpbmcgdGhlIC0taG1yIGZsYWcgZm9yIG5nIHNlcnZlPycpO1xuICB9XFxuYC5yZXBsYWNlKC9eXFx0L2dtLCAnJyk7XG5cbiAgbWFpbkhtciA9IHJlcGxhY2VDb2RlKG1haW5IbXIsIFtcbiAgICB7XG4gICAgICBzdGFydDogc3RhdGVtZW50QmVnaW5Qb3MsXG4gICAgICBlbmQ6IHN0YXRlbWVudEJlZ2luUG9zLFxuICAgICAgdGV4dDogZGVjbGFyZU5ld0Jvb3RzdHJhcFxuICAgIH0sXG4gICAge1xuICAgICAgc3RhcnQ6IGJvb3RDYWxsQXN0LmdldFN0YXJ0KHF1ZXJ5LnNyYywgdHJ1ZSksXG4gICAgICBlbmQ6IGJvb3RDYWxsQXN0LmdldEVuZCgpLFxuICAgICAgdGV4dDogJ2Jvb3RzdHJhcCgpJ1xuICAgIH1cbiAgICBdKTtcbiAgcmV0dXJuIG1haW5IbXI7XG59XG4iXX0=