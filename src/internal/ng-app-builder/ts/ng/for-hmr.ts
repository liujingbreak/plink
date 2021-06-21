import Path from 'path';
import fs from 'fs';
import replaceCode from '@wfh/plink/wfh/dist/utils/patch-text';
import TsAstSelector, {typescript as ts} from '@wfh/plink/wfh/dist/utils/ts-ast-query';
import log4js from 'log4js';

const log = log4js.getLogger('@wfh/ng-app-builder.for-hmr');

export function createMainFileForHmr(mainFile: string): string {
  const dir = Path.dirname(mainFile);
  const writeTo = Path.resolve(dir, 'main-hmr.ts');
  if (fs.existsSync(writeTo)) {
    return writeTo;
  }
  const main = fs.readFileSync(mainFile, 'utf8');
  // TODO
  const mainHmr = _createMainHmrFile(main, mainFile);
  fs.writeFileSync(writeTo, mainHmr);
  log.info('Write ' + writeTo);
  log.info(mainHmr);
  return writeTo;
}

/**
 * For test convenience
 */
export function _createMainHmrFile(mainTs: string, mainFile: string): string {
  let mainHmr = '// tslint:disable\n' +
  `import hmrBootstrap from '@wfh/ng-app-builder/src/hmr';\n${mainTs}`;
  const query = new TsAstSelector(mainHmr, 'main-hmr.ts');
  // query.printAll();

  // let bootCallAst: ts.Node;
  // const statement = query.src.statements.find(statement => {
  // eslint-disable-next-line  max-len
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

  const bootCallAst = query.findMapTo(':PropertyAccessExpression > .expression:CallExpression > .expression:Identifier',
    (ast: ts.Identifier, path, parents) => {
      if (ast.text === 'platformBrowserDynamic' &&
      (ast.parent.parent as ts.PropertyAccessExpression).name.getText(query.src) === 'bootstrapModule' &&
      ast.parent.parent.parent.kind === ts.SyntaxKind.CallExpression) {
        return ast.parent.parent.parent;
      }
    });


  if (bootCallAst == null)
    throw new Error(`${mainFile},` +
    `can not find statement like: platformBrowserDynamic().bootstrapModule(AppModule)\n${mainHmr}`);

  // Look for root statement expression
  let statement = bootCallAst.parent;
  while (statement.kind !== ts.SyntaxKind.ExpressionStatement || statement.parent !== query.src) {
    statement = statement.parent;
  }

  const statementBeginPos = statement.getStart(query.src, true);

  const declareNewBootstrap = `const bootstrap = () => ${bootCallAst!.getText()};\n
  if (module[ 'hot' ]) {
    hmrBootstrap(module, bootstrap);
  } else {
    console.error('HMR is not enabled for webpack-dev-server!');
    console.log('Are you using the --hmr flag for ng serve?');
  }\n`.replace(/^\t/gm, '');

  mainHmr = replaceCode(mainHmr, [
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
