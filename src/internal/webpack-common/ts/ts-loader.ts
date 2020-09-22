import * as wp from 'webpack';
import TsPreCompiler from './tsjs/tsjs-replacement';
import api from '__api';
import RJ from 'require-injector';
import {sortedIndexBy} from 'lodash';

export interface Options {
  tsConfigFile: string;
  injector: RJ;
  compileExpContex: {[varName: string]: any};
}

let tsPreCompiler: TsPreCompiler;

const loader: wp.loader.Loader = function(source, sourceMap) {
  const file = this.resourcePath;
  const opts = this.query as Options;
  // console.log(file);
  const cb = this.async();

  let {replaced, ast, patches} = opts.injector.injectToFileWithPatchInfo(file, source as string);
  if (tsPreCompiler == null) {
    tsPreCompiler = new TsPreCompiler(opts.tsConfigFile, api.ssr, file => api.findPackageByFile(file));
  }

  let offset = 0;
  const offsets = patches.reduce((offsets, el) => {
    offset += el.replacement.length - (el.end - el.start);
    return offsets;
  }, [] as number[]);

  replaced = tsPreCompiler.parse(file, replaced, opts.compileExpContex, ast, pos => {
      const idx = sortedIndexBy(patches, {start: pos, end: pos, replacement: ''}, el => el.start) - 1;
      if (idx >= 0 && idx < offsets.length - 1) {
        return offsets[idx] + pos;
      }
      return pos;
  });
  cb!(null, replaced, sourceMap);
};

export default loader;
