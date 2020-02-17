import {getCmdOptions} from './utils';
import {findPackage} from './build-target-helper';
import Path from 'path';
import _ from 'lodash';
const paths: CraScriptsPaths = require('react-scripts/config/paths');

export interface CraScriptsPaths {
  dotenv: string;
  appPath: string;
  appBuild: string;
  appPublic: string;
  appHtml: string;
  appIndexJs: string;
  appPackageJson: string;
  appSrc: string;
  appTsConfig: string;
  appJsConfig: string;
  yarnLockFile: string;
  testsSetup: string;
  proxySetup: string;
  appNodeModules: string;
  publicUrlOrPath: string;
  // These properties only exist before ejecting:
  ownPath: string;
  ownNodeModules: string; // This is empty on npm 3
  appTypeDeclarations: string;
  ownTypeDeclarations: string;
}

export default function factory() {
  let changedPaths: CraScriptsPaths | undefined;
  return (): CraScriptsPaths => {
    if (changedPaths == null) {
      changedPaths = paths;
      const cmdOption = getCmdOptions();
      const {dir, packageJson} = findPackage(cmdOption.buildTarget);
      // console.log('[debug] ', cmdOption);
      if (cmdOption.buildType === 'lib') {
        changedPaths.appBuild = Path.resolve(dir, 'build');
        changedPaths.appIndexJs = Path.resolve(dir, _.get(packageJson, 'dr.cra-build-entry', 'public_api.ts'));
      } else if (cmdOption.buildType === 'app') {
        // const {dir} = findPackage(cmdOption.buildTarget);
        // changedPaths.appBuild = Path.resolve(dir, 'build');
        // changedPaths.appIndexJs = Path.resolve(dir, _.get(packageJson, 'dr.cra-serve-entry', 'serve_index.ts'));
      }
      // tslint:disable-next-line: no-console
      console.log('[cra-scripts-paths] changed react-scripts paths:\n', changedPaths);
    }

    if (changedPaths == null) {
      changedPaths = paths;
    }
    // console.log(changedPaths);
    return changedPaths;
  };
}
