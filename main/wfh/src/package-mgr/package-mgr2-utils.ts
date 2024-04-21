import Path from 'node:path';
import fs from 'node:fs';
import {PackageInfo} from '../index';

export interface PackageJsonInterf {
  version: string;
  name: string;
  devDependencies?: {[nm: string]: string};
  peerDependencies?: {[nm: string]: string};
  dependencies?: {[nm: string]: string};
}

export function createPackageInfo(pkJsonFile: string, isInstalled = false): PackageInfo {
  const json = JSON.parse(fs.readFileSync(pkJsonFile, 'utf8')) as PackageInfo['json'];
  return createPackageInfoWithJson(pkJsonFile, json, isInstalled);
}

const moduleNameReg = /^(?:@([^/]+)\/)?(\S+)/;

function createPackageInfoWithJson(pkJsonFile: string, json: PackageInfo['json'], isInstalled = false): PackageInfo {
  const m = moduleNameReg.exec(json.name);
  const path = fs.realpathSync(Path.dirname(pkJsonFile));
  const pkInfo: PackageInfo = {
    shortName: m![2],
    name: json.name,
    scope: m![1],
    path,
    json,
    realPath: fs.realpathSync(Path.dirname(pkJsonFile)),
    isInstalled
  };
  return pkInfo;
}
