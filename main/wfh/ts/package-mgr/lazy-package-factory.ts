// import * as Path from 'path';
import * as fs from 'fs';
import * as _ from 'lodash';
import {DirTree} from 'require-injector/dist/dir-tree';
import PackageBrowserInstance from './package-instance';
import {PackageInfo} from '.';

/**
 * @deprecated
 */
export default class LazyPackageFactory {
  packagePathMap: DirTree<PackageBrowserInstance>;

  constructor(private packagesIterable: Iterable<PackageInfo>) {
  }

  getPackageByPath(file: string): PackageBrowserInstance | null {
    if (this.packagePathMap == null) {
      this.packagePathMap = new DirTree<PackageBrowserInstance>();
      for (const info of this.packagesIterable) {
        const pk = createPackage(info.path, info.json);
        this.packagePathMap.putData(info.path, pk);
        if (info.realPath !== info.path)
          this.packagePathMap.putData(info.realPath, pk);
      }
    }
    let found: PackageBrowserInstance[];
    found = this.packagePathMap.getAllData(file);
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

function createPackage(packagePath: string, pkJson: any) {
  const name: string = pkJson.name;
  const instance = new PackageBrowserInstance({
    isVendor: false,
    longName: pkJson.name,
    shortName: parseName(pkJson.name).name,
    packagePath,
    realPackagePath: fs.realpathSync(packagePath)
  });
  let noParseFiles: string[] | undefined;
  if (pkJson.dr) {
    if (pkJson.dr.noParse) {
      noParseFiles = [].concat(pkJson.dr.noParse).map(trimNoParseSetting);
    }
    if (pkJson.dr.browserifyNoParse) {
      noParseFiles = [].concat(pkJson.dr.browserifyNoParse).map(trimNoParseSetting);
    }
  }
  // const mainFile: string = pkJson.browser || pkJson.main;
  instance.init({
    // file: mainFile ? Path.resolve(instance.realPackagePath, mainFile) : undefined, // package.json "browser"
    // style: pkJson.style ? resolveStyle(name, nodePaths) : null,
    parsedName: parseName(name),
    browserifyNoParse: noParseFiles,
    translatable: !_.has(pkJson, 'dr.translatable') || _.get(pkJson, 'dr.translatable'),
    dr: pkJson.dr,
    json: pkJson,
    i18n: pkJson.dr && pkJson.dr.i18n ? pkJson.dr.i18n : null,
    appType: _.get(pkJson, 'dr.appType')
  });
  return instance;
}

function trimNoParseSetting(p: string) {
  p = p.replace(/\\/g, '/');
  if (p.startsWith('./')) {
    p = p.substring(2);
  }
  return p;
}
