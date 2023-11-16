import * as wp from 'webpack';
import RJ from '@wfh/plink/packages/require-injector';
import replaceAndInject from './tsjs/replace-and-inject';

export interface Options {
  tsConfigFile: string;
  injector: RJ;
  compileExpContext?: (sourceFile: string) => {[varName: string]: any};
}

const loader: wp.LoaderDefinitionFunction<Options> = function(source, sourceMap) {
  const file = this.resourcePath;
  const opts = this.query as Options;
  // console.log(file);
  const cb = this.async();
  try {
    const replaced = replaceAndInject(file, source, opts.injector, opts.tsConfigFile,
      opts.compileExpContext ? opts.compileExpContext(file) : {});
    cb(null, replaced, sourceMap);
  } catch (e) {
    this.getLogger('@wfh/webpack-common.ts-loader').error(file, e);
    return cb(e as Error);
  }
};

export default loader;
