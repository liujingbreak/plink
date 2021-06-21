import Selector, {typescript as ts} from '@wfh/plink/wfh/dist/utils/ts-ast-query';
import fs from 'fs';
import chalk from 'chalk';

const {SyntaxKind} = ts;
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
    // eslint-disable-next-line no-console
    console.log(sel.src.getFullText().slice(fnAst.getStart(sel.src, true), fnAst.getStart()));
    const params = sel.findAll(fnAst, '^ .parameters >.name').map((param: ts.Identifier) => param.getText());
    return chalk.cyan(name) + ` ( ${params.join(', ')} ) `;
  });

  // eslint-disable-next-line no-console
  console.log(founds.join('\n'));
}
