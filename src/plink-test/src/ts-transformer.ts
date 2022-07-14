// import * as op from 'rxjs/operators';
// import * as rx from 'rxjs';
// import inspector from 'inspector';
import {TransformerCreator, SyncTransformer} from '@jest/transform';
import {createTranspileFileWithTsCheck} from '@wfh/plink/wfh/dist/utils/tsc-util';
// import logConfig from '@wfh/plink/wfh/dist/log-config';
import ts from 'typescript';
// inspector.open(9222, 'localhost', true);

const transformerWithTsCheck = createTranspileFileWithTsCheck(ts, {});

const createTransformer: TransformerCreator<SyncTransformer<Record<string, unknown>>, Record<string, unknown>> = (_config) => {
  const transformer: SyncTransformer<Record<string, unknown>> = {
    process(sourceText, sourcePath, _options) {
      return transformerWithTsCheck(sourceText, sourcePath);
      // const compiled = transpileSingleFile(sourceText, ts);
      // if (compiled.diagnosticsText) {
      //   console.error(compiled.diagnosticsText);
      // }
      // return {
      //   code: compiled.outputText,
      //   map: compiled.sourceMapText
      // };
    }
  };

  return transformer;
};

export default {createTransformer};
