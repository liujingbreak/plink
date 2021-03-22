import {loader} from 'webpack';
import {logger, config} from '@wfh/plink';
import plink from '__plink';
// import path from 'path';

const log = logger.getLogger('@wfh/doc-ui-common.sass-theme-loader');

let themeName: string;

const loader: loader.Loader = function(source, sourceMap) {
  const cb = this.async()!;
  // log.info(source);
  const file = this.resourcePath;
  const pkg = plink.findPackageByFile(file);
  if (themeName == null) {
    themeName = config()['@wfh/doc-ui-common'].materialTheme;
    themeName = themeName === 'default' ? '' : '-' + themeName;
    log.info('Use Material theme sass file: theme' + themeName);
  }
  if (pkg && pkg.name === '@wfh/doc-ui-common') {
    source = (source as string).replace(/@use\s+['"'](?:[^'"/]*?\/)*theme['"']/m, `@use "theme${themeName}"`);
  }
  cb(null, source, sourceMap);
};

export default loader;
