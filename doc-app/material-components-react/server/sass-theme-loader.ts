import {loader} from 'webpack';
import {config, log4File, packageOfFileFactory} from '@wfh/plink';
// import path from 'path';

const log = log4File(__filename);

let themeName: string;

const theLoader: loader.Loader = function(source, sourceMap) {
  const cb = this.async()!;
  // log.info(source);
  const file = this.resourcePath;
  const pkg = packageOfFileFactory().getPkgOfFile(file);
  if (themeName == null) {
    themeName = config()['@wfh/material-components-react'].materialTheme;
    themeName = themeName === 'default' ? '' : '-' + themeName;
    log.info('Use Material theme sass file: theme' + themeName);
  }
  if (pkg && pkg.name === '@wfh/material-components-react') {
    source = (source as string).replace(/@use\s+['"'](?:[^'"/]*?\/)*theme['"'](\s+as\s+\S+\s*)?\s*;/m,
      `@use "theme${themeName}" as theme;`);
  } else if (pkg) {
    // log.info(file);
    source = (source as string).replace(/@use\s+['"']@wfh\/material-components-react\/client\/theme['"']\s*;/m,
      `@use "@wfh/material-components-react/client/theme${themeName}" as theme;`);
  }
  cb(null, source, sourceMap);
};

export default theLoader;
