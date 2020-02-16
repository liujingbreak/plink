import {getCmdOptions} from './utils';
import {findPackage} from './build-target-helper';
import Path from 'path';
const paths: CraScriptsPaths = require('react-scripts/config/paths');

export interface CraScriptsPaths {
  dotenv: string; // resolveApp('.env'),
  appPath: string; // resolveApp('.'),
  appBuild: string; // resolveApp('build'),
  appPublic: string; // resolveApp('public'),
  appHtml: string; // resolveApp('public/index.html'),
  appIndexJs: string; // resolveModule(resolveApp, 'src/index'),
  appPackageJson: string; // resolveApp('package.json'),
  appSrc: string; // resolveApp('src'),
  appTsConfig: string; // resolveApp('tsconfig.json'),
  appJsConfig: string; // resolveApp('jsconfig.json'),
  yarnLockFile: string; // resolveApp('yarn.lock'),
  testsSetup: string; // resolveModule(resolveApp, 'src/setupTests'),
  proxySetup: string; // resolveApp('src/setupProxy.js'),
  appNodeModules: string; // resolveApp('node_modules'),
  publicUrl: string; // string;
  servedPath: string; // getServedPath(resolveApp('package.json')),
}

export default function factory() {
  let changedPaths: CraScriptsPaths | undefined;
  return function() {
    if (changedPaths == null) {
      changedPaths = paths;
      const cmdOption = getCmdOptions();
      // console.log('[debug] ', cmdOption);
      if (cmdOption.buildType === 'lib') {
        const {dir} = findPackage(cmdOption.buildTarget);
        changedPaths.appBuild = Path.resolve(dir, 'build');
        changedPaths.appIndexJs = Path.resolve(dir, 'public_api.ts');
        // tslint:disable-next-line: no-console
        console.log('[cra-scripts-paths] changed react-scripts paths:\n', changedPaths);
      }
    }
    return changedPaths;
  };
}
