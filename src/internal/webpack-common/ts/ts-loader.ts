import * as wp from 'webpack';
import replaceAndInject from './tsjs/replace-and-inject';
import RJ from 'require-injector';

export interface Options {
  tsConfigFile: string;
  injector: RJ;
  compileExpContex?: (sourceFile: string) => {[varName: string]: any};
}

const loader: wp.loader.Loader = function(source, sourceMap) {
  const file = this.resourcePath;
  const opts = this.query as Options;
  // console.log(file);
  const cb = this.async();
  try {
    const replaced = replaceAndInject(file, source as string, opts.injector, opts.tsConfigFile,
      opts.compileExpContex ? opts.compileExpContex(file) : {});
    cb!(null, replaced, sourceMap);
  } catch (e) {
    console.error('[webpack-common.ts-loader]processing: ' + file, e);
    return cb!(e);
  }
};

export default loader;
