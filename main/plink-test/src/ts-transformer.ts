import Path from 'path';
import fs from 'fs';
import ts from 'typescript';
import {TransformerCreator, SyncTransformer} from '@jest/transform';
import {createTranspileFileWithTsCheck} from '@wfh/plink/wfh/dist/utils/tsc-util';
import {lookupPlinkRoot} from '@wfh/plink/wfh/dist/plink2/process-common';
// inspector.open(9222, 'localhost', true);

type TsconfigType = {
  extends?: string;
  include?: string[];
  exclude?: string[];
  compilerOptions: Record<string, any>;
};

const transformerWithTsCheck = createTranspileFileWithTsCheck(ts, {tscOpts: () => {
  const tsconfigFile = Path.resolve(lookupPlinkRoot(process.cwd())!, 'tsconfig.json');
  const json = JSON.parse(fs.readFileSync(tsconfigFile, 'utf8')) as TsconfigType;
  // Typescript will take effort in parseJsonConfigFileContent() to traverse all "include" files names, or report error on not found any file
  json.include = ['no-exist-file.ts'];
  json.compilerOptions.inlineSourceMap = true;
  const {options} = ts.parseJsonConfigFileContent(json, ts.sys, Path.dirname(tsconfigFile));
  // setupCompilerOptionsWithPackages(co as RequiredCompilerOptions, plinkEnv.workDir, {}, ts);
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
