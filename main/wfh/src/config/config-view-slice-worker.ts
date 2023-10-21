import fs from 'fs';
import ts from 'typescript';
import Selector from '../utils/ts-ast-query';
import {PropertyMeta} from './config.types';
// import {jsonToCompilerOptions} from '../ts-compiler';

// let co: ts.CompilerOptions | undefined;

export default async function(dtsFileBase: string, typeExport: string, _compilerOptions: any)
: Promise<[metas: PropertyMeta[], dtsFile: string]> {

  const dtsFile = fs.existsSync(dtsFileBase + 'ts') ? dtsFileBase + '.ts' : dtsFileBase + '.d.ts';

  const content = await fs.promises.readFile(dtsFile, 'utf-8');
  const sel = new Selector(content, dtsFile);
  // if (co == null)
  //   co = jsonToCompilerOptions(compilerOptions, 'tsconfig-base.json');
  // const tsPgm = ts.createProgram([dtsFile.replace(/\\/g, '/')], {
  //   target: ts.ScriptTarget.ES5,
  //   module: ts.ModuleKind.CommonJS});
  // const checker = tsPgm.getTypeChecker();
  let interfAst: ts.InterfaceDeclaration | undefined;
  sel.some(null, '^:InterfaceDeclaration', (ast, path, parents, isLeaf, comment) => {
    if ((ast as ts.InterfaceDeclaration).name.getText() === typeExport) {
      // const symbol = checker.getSymbolsInScope((ast as ts.InterfaceDeclaration).name, ts.SymbolFlags.Interface);
      // console.log(symbol);
      interfAst = ast as ts.InterfaceDeclaration;
      return true;
    }
  });
  const metas: PropertyMeta[] = [];
  if (interfAst) {
    sel.some(interfAst, '^.members:PropertySignature', (ast, path, parents, isLeaf, comment) => {

      const node = ast as ts.PropertySignature;
      // const symbol = checker.getSymbolAtLocation(node.type!);
      // console.log(node.name.getText(), symbol);
      // if (symbol) {
      //   console.log(ts.displayPartsToString(symbol.getDocumentationComment(checker)));
      // }
      metas.push({
        property: node.name.getText(),
        desc: comment ? comment.replace(/(?:^\/\*\*\s*|\*\/$)/g, '').replace(/^\s*\*/mg, '') : '',
        type: node.type?.getText() || '',
        optional: !!node.questionToken
      });
    });
  }
  return [metas, dtsFile];
}
