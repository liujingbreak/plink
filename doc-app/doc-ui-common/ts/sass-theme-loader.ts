import {loader} from 'webpack';
import {config, log4File} from '@wfh/plink';
import plink from '__plink';
// import path from 'path';

const log = log4File(__filename);

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
    source = (source as string).replace(/@use\s+['"'](?:[^'"/]*?\/)*theme['"'](\s+as\s+\S+\s*)?\s*;/m, `@use "theme${themeName}" as theme;`);
  } else if (pkg) {
    // log.info(file);
    source = (source as string).replace(/@use\s+['"']@wfh\/doc-ui-common\/client\/material\/theme['"']\s*;/m, `@use "@wfh/doc-ui-common/client/material/theme${themeName}" as theme;`);
    // if (file.indexOf('Main.module') >=0 ) {
    //   // log.warn(file, source);
    // }
  }
  cb(null, source, sourceMap);
};

export default loader;
