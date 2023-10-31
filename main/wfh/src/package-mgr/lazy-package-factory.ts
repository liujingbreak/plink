// import * as Path from 'path';
import {resolve} from 'path';
import * as _ from 'lodash';
import {DirTree} from '../../../packages/require-injector/dist/dir-tree';
import PackageInstance from '../packageNodeInstance';
import {plinkEnv} from '../utils/misc';
import {PackageInfo} from '.';
/**
 * @deprecated
 */
export default class LazyPackageFactory {
  packagePathMap: DirTree<PackageInstance> | undefined;

  constructor(private packagesIterable: Iterable<PackageInfo>) {
  }

  getPackageByPath(file: string): PackageInstance | null {
    if (this.packagePathMap == null) {
      this.packagePathMap = new DirTree<PackageInstance>();
      for (const info of this.packagesIterable) {
        const pk = createPackage(info);
        this.packagePathMap.putData(info.realPath, pk);
        this.packagePathMap.putData(resolve(plinkEnv.workDir, info.path), pk);
      }
    }
    const found = this.packagePathMap.getAllData(file);
    if (found.length > 0)
      return found[found.length - 1];
    return null;
  }
}

export function parseName(longName: string): {name: string; scope?: string} {

  const match = /^(?:@([^/]+)\/)?(\S+)/.exec(longName);
  if (match) {
    return {
      scope: match[1],
      name: match[2]
    };
  }
  return {name: longName};
}

function createPackage(info: PackageInfo) {
  const instance = new PackageInstance({
    longName: info.name,
    shortName: parseName(info.name).name,
    path: resolve(plinkEnv.workDir, info.path),
    realPath: info.realPath,
    json: info.json
  });
  // let noParseFiles: string[] | undefined;
  // if (info.json.dr) {
  //   if (info.json.dr.noParse) {
  //     noParseFiles = [].concat(info.json.dr.noParse).map(trimNoParseSetting);
  //   }
  //   if (info.json.dr.browserifyNoParse) {
  //     noParseFiles = [].concat(info.json.dr.browserifyNoParse).map(trimNoParseSetting);
  //   }
  // }

  return instance;
}

// function trimNoParseSetting(p: string) {
//   p = p.replace(/\\/g, '/');
//   if (p.startsWith('./')) {
//     p = p.substring(2);
//   }
//   return p;
// }
