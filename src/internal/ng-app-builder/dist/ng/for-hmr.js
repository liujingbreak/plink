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
exports._createMainHmrFile = exports.createMainFileForHmr = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const patch_text_1 = __importDefault(require("@wfh/plink/wfh/dist/utils/patch-text"));
const ts_ast_query_1 = __importStar(require("@wfh/plink/wfh/dist/utils/ts-ast-query"));
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
            ast.parent.parent.parent.kind === ts_ast_query_1.typescript.SyntaxKind.CallExpression) {
            return ast.parent.parent.parent;
        }
    });
    if (bootCallAst == null)
        throw new Error(`${mainFile},` +
            `can not find statement like: platformBrowserDynamic().bootstrapModule(AppModule)\n${mainHmr}`);
    // Look for root statement expression
    let statement = bootCallAst.parent;
    while (statement.kind !== ts_ast_query_1.typescript.SyntaxKind.ExpressionStatement || statement.parent !== query.src) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9yLWhtci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZvci1obXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdEQUF3QjtBQUN4Qiw0Q0FBb0I7QUFDcEIsc0ZBQStEO0FBQy9ELHVGQUF1RjtBQUN2RixvREFBNEI7QUFFNUIsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsNkJBQTZCLENBQUMsQ0FBQztBQUU1RCxTQUFnQixvQkFBb0IsQ0FBQyxRQUFnQjtJQUNuRCxNQUFNLEdBQUcsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ25DLE1BQU0sT0FBTyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQ2pELElBQUksWUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUMxQixPQUFPLE9BQU8sQ0FBQztLQUNoQjtJQUNELE1BQU0sSUFBSSxHQUFHLFlBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQy9DLE9BQU87SUFDUCxNQUFNLE9BQU8sR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDbkQsWUFBRSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDbkMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLENBQUM7SUFDN0IsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNsQixPQUFPLE9BQU8sQ0FBQztBQUNqQixDQUFDO0FBYkQsb0RBYUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLGtCQUFrQixDQUFDLE1BQWMsRUFBRSxRQUFnQjtJQUNqRSxJQUFJLE9BQU8sR0FBRyxxQkFBcUI7UUFDbkMsNERBQTRELE1BQU0sRUFBRSxDQUFDO0lBQ3JFLE1BQU0sS0FBSyxHQUFHLElBQUksc0JBQWEsQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDeEQsb0JBQW9CO0lBRXBCLDRCQUE0QjtJQUM1Qiw2REFBNkQ7SUFDN0QsZ0RBQWdEO0lBQ2hELG1JQUFtSTtJQUNuSSwrQ0FBK0M7SUFDL0MscURBQXFEO0lBQ3JELDRHQUE0RztJQUM1RywwRUFBMEU7SUFDMUUsMkNBQTJDO0lBQzNDLFVBQVU7SUFDVixVQUFVO0lBQ1Ysb0JBQW9CO0lBQ3BCLDhCQUE4QjtJQUM5QixtQkFBbUI7SUFDbkIsTUFBTTtJQUNOLGtCQUFrQjtJQUNsQixNQUFNO0lBRU4sTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxpRkFBaUYsRUFDbkgsQ0FBQyxHQUFrQixFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUNwQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssd0JBQXdCO1lBQ3hDLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBc0MsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxpQkFBaUI7WUFDaEcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyx5QkFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUU7WUFDOUQsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7U0FDakM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUdMLElBQUksV0FBVyxJQUFJLElBQUk7UUFDckIsTUFBTSxJQUFJLEtBQUssQ0FBQyxHQUFHLFFBQVEsR0FBRztZQUM5QixxRkFBcUYsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUVsRyxxQ0FBcUM7SUFDckMsSUFBSSxTQUFTLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQztJQUNuQyxPQUFPLFNBQVMsQ0FBQyxJQUFJLEtBQUsseUJBQUUsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQzdGLFNBQVMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDO0tBQzlCO0lBRUQsTUFBTSxpQkFBaUIsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFOUQsTUFBTSxtQkFBbUIsR0FBRywyQkFBMkIsV0FBWSxDQUFDLE9BQU8sRUFBRTs7Ozs7O01BTXpFLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztJQUUxQixPQUFPLEdBQUcsb0JBQVcsQ0FBQyxPQUFPLEVBQUU7UUFDN0I7WUFDRSxLQUFLLEVBQUUsaUJBQWlCO1lBQ3hCLEdBQUcsRUFBRSxpQkFBaUI7WUFDdEIsSUFBSSxFQUFFLG1CQUFtQjtTQUMxQjtRQUNEO1lBQ0UsS0FBSyxFQUFFLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7WUFDNUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxNQUFNLEVBQUU7WUFDekIsSUFBSSxFQUFFLGFBQWE7U0FDcEI7S0FDQSxDQUFDLENBQUM7SUFDTCxPQUFPLE9BQU8sQ0FBQztBQUNqQixDQUFDO0FBbkVELGdEQW1FQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCByZXBsYWNlQ29kZSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IFRzQXN0U2VsZWN0b3IsIHt0eXBlc2NyaXB0IGFzIHRzfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ0B3ZmgvbmctYXBwLWJ1aWxkZXIuZm9yLWhtcicpO1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTWFpbkZpbGVGb3JIbXIobWFpbkZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGRpciA9IFBhdGguZGlybmFtZShtYWluRmlsZSk7XG4gIGNvbnN0IHdyaXRlVG8gPSBQYXRoLnJlc29sdmUoZGlyLCAnbWFpbi1obXIudHMnKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMod3JpdGVUbykpIHtcbiAgICByZXR1cm4gd3JpdGVUbztcbiAgfVxuICBjb25zdCBtYWluID0gZnMucmVhZEZpbGVTeW5jKG1haW5GaWxlLCAndXRmOCcpO1xuICAvLyBUT0RPXG4gIGNvbnN0IG1haW5IbXIgPSBfY3JlYXRlTWFpbkhtckZpbGUobWFpbiwgbWFpbkZpbGUpO1xuICBmcy53cml0ZUZpbGVTeW5jKHdyaXRlVG8sIG1haW5IbXIpO1xuICBsb2cuaW5mbygnV3JpdGUgJyArIHdyaXRlVG8pO1xuICBsb2cuaW5mbyhtYWluSG1yKTtcbiAgcmV0dXJuIHdyaXRlVG87XG59XG5cbi8qKlxuICogRm9yIHRlc3QgY29udmVuaWVuY2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIF9jcmVhdGVNYWluSG1yRmlsZShtYWluVHM6IHN0cmluZywgbWFpbkZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGxldCBtYWluSG1yID0gJy8vIHRzbGludDpkaXNhYmxlXFxuJyArXG4gIGBpbXBvcnQgaG1yQm9vdHN0cmFwIGZyb20gJ0B3ZmgvbmctYXBwLWJ1aWxkZXIvc3JjL2htcic7XFxuJHttYWluVHN9YDtcbiAgY29uc3QgcXVlcnkgPSBuZXcgVHNBc3RTZWxlY3RvcihtYWluSG1yLCAnbWFpbi1obXIudHMnKTtcbiAgLy8gcXVlcnkucHJpbnRBbGwoKTtcblxuICAvLyBsZXQgYm9vdENhbGxBc3Q6IHRzLk5vZGU7XG4gIC8vIGNvbnN0IHN0YXRlbWVudCA9IHF1ZXJ5LnNyYy5zdGF0ZW1lbnRzLmZpbmQoc3RhdGVtZW50ID0+IHtcbiAgLy8gICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxpbmUtbGVuZ3RoXG4gIC8vICAgY29uc3QgYm9vdENhbGwgPSBxdWVyeS5maW5kTWFwVG8oc3RhdGVtZW50LCAnOlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiA+IC5leHByZXNzaW9uOkNhbGxFeHByZXNzaW9uID4gLmV4cHJlc3Npb246SWRlbnRpZmllcicsXG4gIC8vICAgICAoYXN0OiB0cy5JZGVudGlmaWVyLCBwYXRoLCBwYXJlbnRzKSA9PiB7XG4gIC8vICAgICAgIGlmIChhc3QudGV4dCA9PT0gJ3BsYXRmb3JtQnJvd3NlckR5bmFtaWMnICYmXG4gIC8vICAgICAgIChhc3QucGFyZW50LnBhcmVudCBhcyB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24pLm5hbWUuZ2V0VGV4dChxdWVyeS5zcmMpID09PSAnYm9vdHN0cmFwTW9kdWxlJyAmJlxuICAvLyAgICAgICBhc3QucGFyZW50LnBhcmVudC5wYXJlbnQua2luZCA9PT0gdHMuU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvbikge1xuICAvLyAgICAgICAgIHJldHVybiBhc3QucGFyZW50LnBhcmVudC5wYXJlbnQ7XG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH0pO1xuICAvLyAgIGlmIChib290Q2FsbCkge1xuICAvLyAgICAgYm9vdENhbGxBc3QgPSBib290Q2FsbDtcbiAgLy8gICAgIHJldHVybiB0cnVlO1xuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gZmFsc2U7XG4gIC8vIH0pO1xuXG4gIGNvbnN0IGJvb3RDYWxsQXN0ID0gcXVlcnkuZmluZE1hcFRvKCc6UHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uID4gLmV4cHJlc3Npb246Q2FsbEV4cHJlc3Npb24gPiAuZXhwcmVzc2lvbjpJZGVudGlmaWVyJyxcbiAgICAoYXN0OiB0cy5JZGVudGlmaWVyLCBwYXRoLCBwYXJlbnRzKSA9PiB7XG4gICAgICBpZiAoYXN0LnRleHQgPT09ICdwbGF0Zm9ybUJyb3dzZXJEeW5hbWljJyAmJlxuICAgICAgKGFzdC5wYXJlbnQucGFyZW50IGFzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikubmFtZS5nZXRUZXh0KHF1ZXJ5LnNyYykgPT09ICdib290c3RyYXBNb2R1bGUnICYmXG4gICAgICBhc3QucGFyZW50LnBhcmVudC5wYXJlbnQua2luZCA9PT0gdHMuU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvbikge1xuICAgICAgICByZXR1cm4gYXN0LnBhcmVudC5wYXJlbnQucGFyZW50O1xuICAgICAgfVxuICAgIH0pO1xuXG5cbiAgaWYgKGJvb3RDYWxsQXN0ID09IG51bGwpXG4gICAgdGhyb3cgbmV3IEVycm9yKGAke21haW5GaWxlfSxgICtcbiAgICBgY2FuIG5vdCBmaW5kIHN0YXRlbWVudCBsaWtlOiBwbGF0Zm9ybUJyb3dzZXJEeW5hbWljKCkuYm9vdHN0cmFwTW9kdWxlKEFwcE1vZHVsZSlcXG4ke21haW5IbXJ9YCk7XG5cbiAgLy8gTG9vayBmb3Igcm9vdCBzdGF0ZW1lbnQgZXhwcmVzc2lvblxuICBsZXQgc3RhdGVtZW50ID0gYm9vdENhbGxBc3QucGFyZW50O1xuICB3aGlsZSAoc3RhdGVtZW50LmtpbmQgIT09IHRzLlN5bnRheEtpbmQuRXhwcmVzc2lvblN0YXRlbWVudCB8fCBzdGF0ZW1lbnQucGFyZW50ICE9PSBxdWVyeS5zcmMpIHtcbiAgICBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQucGFyZW50O1xuICB9XG5cbiAgY29uc3Qgc3RhdGVtZW50QmVnaW5Qb3MgPSBzdGF0ZW1lbnQuZ2V0U3RhcnQocXVlcnkuc3JjLCB0cnVlKTtcblxuICBjb25zdCBkZWNsYXJlTmV3Qm9vdHN0cmFwID0gYGNvbnN0IGJvb3RzdHJhcCA9ICgpID0+ICR7Ym9vdENhbGxBc3QhLmdldFRleHQoKX07XFxuXG4gIGlmIChtb2R1bGVbICdob3QnIF0pIHtcbiAgICBobXJCb290c3RyYXAobW9kdWxlLCBib290c3RyYXApO1xuICB9IGVsc2Uge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0hNUiBpcyBub3QgZW5hYmxlZCBmb3Igd2VicGFjay1kZXYtc2VydmVyIScpO1xuICAgIGNvbnNvbGUubG9nKCdBcmUgeW91IHVzaW5nIHRoZSAtLWhtciBmbGFnIGZvciBuZyBzZXJ2ZT8nKTtcbiAgfVxcbmAucmVwbGFjZSgvXlxcdC9nbSwgJycpO1xuXG4gIG1haW5IbXIgPSByZXBsYWNlQ29kZShtYWluSG1yLCBbXG4gICAge1xuICAgICAgc3RhcnQ6IHN0YXRlbWVudEJlZ2luUG9zLFxuICAgICAgZW5kOiBzdGF0ZW1lbnRCZWdpblBvcyxcbiAgICAgIHRleHQ6IGRlY2xhcmVOZXdCb290c3RyYXBcbiAgICB9LFxuICAgIHtcbiAgICAgIHN0YXJ0OiBib290Q2FsbEFzdC5nZXRTdGFydChxdWVyeS5zcmMsIHRydWUpLFxuICAgICAgZW5kOiBib290Q2FsbEFzdC5nZXRFbmQoKSxcbiAgICAgIHRleHQ6ICdib290c3RyYXAoKSdcbiAgICB9XG4gICAgXSk7XG4gIHJldHVybiBtYWluSG1yO1xufVxuIl19