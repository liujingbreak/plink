import TsPreCompiler from './tsjs-replacement';
import api from '__api';
import RJ from 'require-injector';
import {sortedIndexBy} from 'lodash';

let tsPreCompiler: TsPreCompiler;

export default function replace(file: string, source: string, injector: RJ, tsConfigFile: string,
  compileExpContex: {[varName: string]: any}) {
  let {replaced, ast, patches} = injector.injectToFileWithPatchInfo(file, source);
  if (tsPreCompiler == null) {
    tsPreCompiler = new TsPreCompiler(tsConfigFile, (api as any).ssr, file => api.findPackageByFile(file));
  }

  let offset = 0;
  const offsets = patches.reduce((offsets, el) => {
    offset += el.replacement.length - (el.end - el.start);
    offsets.push(offset);
    return offsets;
  }, [] as number[]);

  replaced = tsPreCompiler.parse(file, replaced, compileExpContex, ast, pos => {
      const idx = sortedIndexBy(patches, {start: pos, end: pos, replacement: ''}, el => el.start) - 1;
      if (idx >= 0 && idx < offsets.length - 1) {
        return pos + offsets[idx];
      }
      return pos;
  });
  return replaced;
}
