/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import Path from 'path';
import fs from 'fs';
import {getRootDir} from '../utils/misc';
import {getState, installInDir} from '../package-mgr';
import {NpmCliOption} from './types';
/**
 * 
 * @return a function to write the original package.json file back
 */
export async function reinstallWithLinkedPlink(opt: NpmCliOption) {
  const rootDir = getRootDir();

  const pkjsonFile = Path.resolve(rootDir, 'package.json');
  const origPkJsonStr = fs.readFileSync(pkjsonFile, 'utf8');
  const pkJson = JSON.parse(origPkJsonStr) as {dependencies: any; devDependencies: any};
  const isPlinkLinked = getState().linkedDrcp != null;

  const linkedPkgs = getState().srcPackages;

  if (pkJson.dependencies) {
    for (const dep of Object.keys(pkJson.dependencies)) {
      if (linkedPkgs.has(dep)) {
        delete pkJson.dependencies[dep];
      }
    }
    if (isPlinkLinked)
      delete pkJson.dependencies['@wfh/plink'];
  }
  if (pkJson.devDependencies) {
    for (const dep of Object.keys(pkJson.devDependencies)) {
      if (linkedPkgs.has(dep)) {
        delete pkJson.devDependencies[dep];
      }
    }
    if (isPlinkLinked)
      delete pkJson.devDependencies['@wfh/plink'];
  }
  const str = JSON.stringify(pkJson, null, '  ');
  // eslint-disable-next-line no-console
  console.log('Install with package.json:', str);
  await installInDir(rootDir, {isForce: false, cache: opt.cache,
    useYarn: opt.useYarn, useNpmCi: opt.useCi, offline: opt.offline}, origPkJsonStr, str);
}
