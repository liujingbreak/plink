import Path from 'path';
import {getRootDir} from '../utils/misc';
import fs from 'fs';
import {getState, installInDir} from '../package-mgr';

/**
 * 
 * @return a function to write the original package.json file back
 */
export async function reinstallWithLinkedPlink() {
  const rootDir = getRootDir();

  const pkjsonFile = Path.resolve(rootDir, 'package.json');
  const origPkJsonStr = fs.readFileSync(pkjsonFile, 'utf8');
  const pkJson = JSON.parse(origPkJsonStr);

  const linkedPkgs = getState().srcPackages;

  if (pkJson.dependencies) {
    for (const dep of Object.keys(pkJson.dependencies)) {
      if (linkedPkgs.has(dep) || dep === '@wfh/plink') {
        delete pkJson.dependencies[dep];
      }
    }
  }
  if (pkJson.devDependencies) {
    for (const dep of Object.keys(pkJson.devDependencies)) {
      if (linkedPkgs.has(dep) || dep === '@wfh/plink') {
        delete pkJson.devDependencies[dep];
      }
    }
  }
  const str = JSON.stringify(pkJson, null, '  ');
  // tslint:disable-next-line: no-console
  console.log('Install with package.json:', str);
  await installInDir(rootDir, origPkJsonStr, str);
}
