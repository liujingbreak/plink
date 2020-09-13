import {getCmdOptions} from './utils';
import {findPackage} from './build-target-helper';
import Path from 'path';
import _ from 'lodash';
import type {PlinkEnv} from 'dr-comp-package/wfh/dist/node-path';

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
const {rootDir} = JSON.parse(process.env.__plink!) as PlinkEnv;

export default function paths() {
  const cmdPublicUrl = getCmdOptions().publicUrl;
  if (cmdPublicUrl) {
    process.env.PUBLIC_URL = cmdPublicUrl + '';
  }
  const paths: CraScriptsPaths = require(Path.resolve('node_modules/react-scripts/config/paths'));
  const changedPaths = paths;
  const cmdOption = getCmdOptions();
  const {dir, packageJson} = findPackage(cmdOption.buildTarget);
  // console.log('[debug] ', cmdOption);
  if (cmdOption.buildType === 'lib') {
    changedPaths.appBuild = Path.resolve(dir, 'build');
    changedPaths.appIndexJs = Path.resolve(dir, _.get(packageJson, 'dr.cra-build-entry', 'public_api.ts'));
  } else if (cmdOption.buildType === 'app') {
    changedPaths.appBuild = Path.resolve(rootDir, 'dist/static');
  }
  // tslint:disable-next-line: no-console
  // console.log('[cra-scripts-paths] changed react-scripts paths:\n', changedPaths);
  return changedPaths;
}


