import Path from 'path';
import ts from 'typescript';
import {TransformerCreator, SyncTransformer} from '@jest/transform';
import {createTranspileFileWithTsCheck} from '@wfh/plink/wfh/dist/utils/tsc-util';
import {tsconfigFile, tsconfigJson} from './init-plink';
// inspector.open(9222, 'localhost', true);

const transformerWithTsCheck = createTranspileFileWithTsCheck(ts, {tscOpts: () => {
  // Typescript will take effort in parseJsonConfigFileContent() to traverse all "include" files names, or report error on not found any file
  // tsconfigJson.include = ['no-exist-file.ts'];
  delete tsconfigJson.include;
  tsconfigJson.compilerOptions.incremental = false;
  tsconfigJson.compilerOptions.inlineSourceMap = true;
  const parsed = ts.parseJsonConfigFileContent(tsconfigJson, ts.sys, Path.dirname(tsconfigFile));
  const {options} = parsed;
  // if (errors.length > 0) {
  //   console.error('jest-transformer error', errors);
  //   console.error('complete information:', parsed);
  // }
  return options;
}});

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
