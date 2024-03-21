import fs from 'fs';
import ts from 'typescript';
import * as rx from 'rxjs';
import {createWorkerControl, setIdleDuring} from '../../../packages/reactivizer/dist/fork-join/node-worker';
import {SingleActionFactory} from '../../../packages/reactivizer';
import Selector from '../utils/ts-ast-query';
import {PropertyMeta} from './config.types';

export interface WorkerInput {
  parseDts(dtsFileBase: string, typeExport: string): SingleActionFactory;
  parseDtsInWorker(dtsFileBase: string, typeExport: string): SingleActionFactory;
  parseDtsDone: WorkerOutput['parseDtsDone'];
}
export interface WorkerOutput {
  parseDtsDone(metas: PropertyMeta[], dfsFile: string): SingleActionFactory;
}

export function createService(debug = false) {
  const service = createWorkerControl<WorkerInput, WorkerOutput>({
    name: 'configViewSliceWorker',
    debug,
    debugExcludeTypes: ['workerInited']
  });
  const {i, o, r} = service;
  r('parseDtsInWorker', i.pt.parseDtsInWorker.pipe(
    rx.mergeMap(async ([m, dtsFileBase, typeExport]) => {
      const done$ = o.ft.fork('parseDts', dtsFileBase, typeExport).do(i.pt.parseDtsDone);
      const [, ...results] = await setIdleDuring.asPromise(service, done$);
      o.ft.parseDtsDone(...results).dp(m);
    })
  ));
  r('parseDts', i.pt.parseDts.pipe(
    rx.concatMap(async ([m, dtsFileBase, typeExport]) => {
      const results = await doParse(dtsFileBase, typeExport);
      o.ft.parseDtsDone(...results).dp(m);
    })
  ));
  return service;
}

async function doParse(dtsFileBase: string, typeExport: string)
  : Promise<[metas: PropertyMeta[], dtsFile: string]> {

  const dtsFile = fs.existsSync(dtsFileBase + 'ts') ? dtsFileBase + '.ts' : dtsFileBase + '.d.ts';

  const content = await fs.promises.readFile(dtsFile, 'utf-8');
  const sel = new Selector(content, dtsFile);
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
