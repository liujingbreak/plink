import Path from 'path';
import ts from 'typescript';
// import * as rx from 'rxjs';
import {TransformerCreator, AsyncTransformer} from '@jest/transform';
import {createTranspileFileWithTsCheck} from '@wfh/plink/wfh/dist/plink2/sub-cmds/tsc-language-service';
import {tsconfigFile, tsconfigJson} from './init-plink';

const transpile = createTranspileFileWithTsCheck(ts, {
  ...tsconfigJson,
  compilerOptions: {
    ...tsconfigJson.compilerOptions,
    declaration: false,
    inlineSourceMap: true,
    strict: false,
    noEmit: false,
    allowImportingTsExtensions: false
  }
}, Path.dirname(tsconfigFile));

function procecc(sourceText: string, sourcePath: string) {
  const [compiled, sourceMap] = transpile(sourceText, sourcePath);
  // let basename = Path.basename(sourcePath);
  // basename = basename.slice(0, basename.lastIndexOf('.'));
  // service.i.ft.addSourceFile(sourcePath, true, sourceText).dp();
  // eslint-disable-next-line no-console
  console.log('[ts-transformer] transpile', sourcePath);
  return {code: compiled, map: sourceMap};
}

const createTransformer: TransformerCreator<AsyncTransformer<Record<string, unknown>>, Record<string, unknown>> = () => {
  const transformer: AsyncTransformer<Record<string, unknown>> = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    process(sourceText, sourcePath, _options) {
      return procecc(sourceText, sourcePath);
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    processAsync(sourceText, sourcePath, _options) {
      return Promise.resolve(procecc(sourceText, sourcePath));
    }
  };

  return transformer;
};

export default {createTransformer};
