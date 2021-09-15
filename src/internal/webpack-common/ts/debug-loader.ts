import * as wp from 'webpack';
import {log4File} from '@wfh/plink';

const log = log4File(__filename);

export type Options = {
};

const loader: wp.loader.Loader = function(source, sourceMap) {
  const file = this.resourcePath;
  // const opts = this.query as Options;
  log.warn('debug loader', file, /\bnode_modules\b/.test(file) ? '' : '\n' + source);
  const cb = this.async();
  cb!(null, source, sourceMap);
};

export default loader;
