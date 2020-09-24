import * as wp from 'webpack';
import replaceAndInject from './tsjs/replace-and-inject';
import RJ from 'require-injector';

export interface Options {
  tsConfigFile: string;
  injector: RJ;
  compileExpContex: {[varName: string]: any};
}

const loader: wp.loader.Loader = function(source, sourceMap) {
  const file = this.resourcePath;
  const opts = this.query as Options;
  // console.log(file);
  const cb = this.async();
  const replaced = replaceAndInject(file, source as string, opts.injector, opts.tsConfigFile, opts.compileExpContex);
  cb!(null, replaced, sourceMap);
};

export default loader;
