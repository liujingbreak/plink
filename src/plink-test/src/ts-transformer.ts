import {TransformerCreator, SyncTransformer} from '@jest/transform';
import {createTranspileFileWithTsCheck} from '@wfh/plink/wfh/dist/utils/tsc-util';
// import logConfig from '@wfh/plink/wfh/dist/log-config';
import ts from 'typescript';
// inspector.open(9222, 'localhost', true);

const transformerWithTsCheck = createTranspileFileWithTsCheck(ts, {tscOpts: {inlineSourceMap: true}});

const createTransformer: TransformerCreator<SyncTransformer<Record<string, unknown>>, Record<string, unknown>> = (_config) => {
  const transformer: SyncTransformer<Record<string, unknown>> = {
    process(sourceText, sourcePath, _options) {
      const done = transformerWithTsCheck(sourceText, sourcePath);
      // eslint-disable-next-line no-console
      console.log('[ts-transformer] transpile', sourcePath);
      return done;
    }
  };

  return transformer;
};

export default {createTransformer};
