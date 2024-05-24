import Path from 'path';
import ts from 'typescript';
import {TransformerCreator, SyncTransformer} from '@jest/transform';
import {languageServices, createTranspileFileWithTsCheck} from '@wfh/plink/wfh/dist/plink2/sub-cmds/tsc-language-service';
import {tsconfigFile, tsconfigJson} from './init-plink';

const service = languageServices(ts);

const transpile = createTranspileFileWithTsCheck(ts, {...tsconfigJson, compilerOptions: {
  ...tsconfigJson.compilerOptions,
  declaration: false,
  strict: false
}}, Path.basename(tsconfigFile));

const createTransformer: TransformerCreator<SyncTransformer<Record<string, unknown>>, Record<string, unknown>> = (_config) => {
  const transformer: SyncTransformer<Record<string, unknown>> = {
    process(sourceText, sourcePath, _options) {
      const [compiled, sourceMap] = transpile(sourceText, sourcePath);
      let basename = Path.basename(sourcePath);
      basename = basename.slice(0, basename.lastIndexOf('.'));
      service.i.ft.addSourceFile(sourcePath, true, sourceText).dp();
      // eslint-disable-next-line no-console
      console.log('[ts-transformer] transpile', sourcePath);
      return {code: compiled, map: sourceMap};
    }
  };

  return transformer;
};

export default {createTransformer};
