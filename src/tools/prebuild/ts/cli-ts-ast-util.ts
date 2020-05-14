import Selector from './ts-ast-query';
import fs from 'fs';
import ts, {SyntaxKind} from 'typescript';
import chalk from 'chalk';

/**
 * List exported public functions and its parameters
 */
export async function listExportedFunction(file: string) {
  const sel = new Selector(fs.readFileSync(file, 'utf8'), file);

  const founds = sel.findAll(' ^ :FunctionDeclaration > .modifiers:ExportKeyword').map(ast => {
    const fnAst = ast.parent as ts.FunctionDeclaration;
    let name: string = '?';

    if (fnAst.modifiers!.find(modifier => modifier.kind === SyntaxKind.DefaultKeyword)) {
      name = 'default';
    } else if (fnAst.name) {
      name = fnAst.name.getText();
    }
    // tslint:disable-next-line: no-console
    console.log(fnAst.getChildren().map(ast => SyntaxKind[ast.kind]));
    // tslint:disable-next-line: no-console
    console.log(sel.src.getFullText().slice(fnAst.getStart(sel.src, true), fnAst.getStart()));
    const params = sel.findAll(fnAst, '^ .parameters >.name').map((param: ts.Identifier) => param.getText());
    return chalk.cyan(name) + ` ( ${params.join(', ')} ) `;
  });

  // tslint:disable-next-line: no-console
  console.log(founds.join('\n'));
}
