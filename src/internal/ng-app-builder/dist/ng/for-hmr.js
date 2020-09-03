"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._createMainHmrFile = exports.createMainFileForHmr = void 0;
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

//# sourceMappingURL=for-hmr.js.map
