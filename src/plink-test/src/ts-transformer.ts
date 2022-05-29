// import * as op from 'rxjs/operators';
// import * as rx from 'rxjs';
// import inspector from 'inspector';
import {TransformerCreator, SyncTransformer} from '@jest/transform';
import {transpileSingleFile} from '@wfh/plink/wfh/dist/utils/tsc-util';
import ts from 'typescript';
// inspector.open(9222, 'localhost', true);

type TransformerConfig = {
  rootFiles: string[];
};

const createTransformer: TransformerCreator<SyncTransformer<TransformerConfig>, TransformerConfig> = (config) => {
  // const events = wath(config!.rootFiles);
  // rx.merge(
  //   events.onWriteFile.pipe( op.map(({payload: [fileName, data, onError, sources]}) => {
  //       debugger;
  //     })
  //   ),
  //   events.onDiagnosticString.pipe(
  //     // eslint-disable-next-line no-console
  //     op.map(info => console.log(info))
  //   )
  // ).subscribe();

  const transformer: SyncTransformer<TransformerConfig> = {
    process(sourceText, sourcePath, options) {
      const compiled = transpileSingleFile(sourceText, ts);
      if (compiled.diagnosticsText) {
        console.error(compiled.diagnosticsText);
      }
      return {
        code: compiled.outputText,
        map: compiled.sourceMapText
      };
    }
  };

  return transformer;
};

export default {createTransformer};
