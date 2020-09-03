import {getCmdOptions} from './utils';
import {findPackage} from './build-target-helper';
import Path from 'path';
import _ from 'lodash';
import fs from 'fs';

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

const drcpWorkdir = findDrcpWorkdir();

export default function paths() {
  const cmdPublicUrl = getCmdOptions().argv.get('publicUrl') || getCmdOptions().argv.get('public-url');
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
    changedPaths.appBuild = Path.resolve(drcpWorkdir, 'dist/static');
    // const {dir} = findPackage(cmdOption.buildTarget);
    // changedPaths.appBuild = Path.resolve(dir, 'build');
    // changedPaths.appIndexJs = Path.resolve(dir, _.get(packageJson, 'dr.cra-serve-entry', 'serve_index.ts'));
  }
    // tslint:disable-next-line: no-console
    console.log('[cra-scripts-paths] changed react-scripts paths:\n', changedPaths);
  return changedPaths;
}

function findDrcpWorkdir() {
  let dir = Path.resolve();
  let parent = null;
  while (true) {
    const testDir = Path.resolve(dir, 'node_modules', 'dr-comp-package');
    if (fs.existsSync(testDir)) {
      return dir;
    }
    parent = Path.dirname(dir);
    if (parent === dir || parent == null)
      throw new Error('Can not find DRCP workspace');
    dir = parent;
  }
}

