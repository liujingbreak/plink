import * as Path from 'path';
import * as fs from 'fs';
import * as _ from 'lodash';
import {DirTree} from 'require-injector/dist/dir-tree';
import PackageBrowserInstance from './package-instance';


export default class LazyPackageFactory {
  packagePathMap = new DirTree<PackageBrowserInstance>();

  getPackageByPath(file: string): PackageBrowserInstance | null {
    let currPath = file;
    let found: PackageBrowserInstance[];
    found = this.packagePathMap.getAllData(file);
    if (found.length > 0)
      return found[found.length - 1];
    while (true) {
      const dir = Path.dirname(currPath);
      if (dir === currPath)
        break; // Has reached root
      if (fs.existsSync(Path.join(dir, 'package.json'))) {
        const pkjson = require(Path.join(dir, 'package.json'));
        const pk = createPackage(dir, pkjson);
        this.packagePathMap.putData(dir, pk);
        return pk;
      }
      currPath = dir;
    }
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
    bundle: null,
    longName: pkJson.name,
    shortName: parseName(pkJson.name).name,
    packagePath,
    realPackagePath: fs.realpathSync(packagePath)
  });
  let entryViews: string[] | undefined, entryPages: string[] | undefined;
  let isEntryServerTemplate = true;
  let noParseFiles: string[] | undefined;
  if (pkJson.dr) {
    if (pkJson.dr.entryPage) {
      isEntryServerTemplate = false;
      entryPages = [].concat(pkJson.dr.entryPage);
    } else if (pkJson.dr.entryView) {
      isEntryServerTemplate = true;
      entryViews = [].concat(pkJson.dr.entryView);
    }
    if (pkJson.dr.noParse) {
      noParseFiles = [].concat(pkJson.dr.noParse).map(trimNoParseSetting);
    }
    if (pkJson.dr.browserifyNoParse) {
      noParseFiles = [].concat(pkJson.dr.browserifyNoParse).map(trimNoParseSetting);
    }
  }
  const mainFile: string = pkJson.browser || pkJson.main;
  instance.init({
    file: mainFile ? fs.realpathSync(Path.resolve(packagePath, mainFile)) : undefined, // package.json "browser"
    main: pkJson.main, // package.json "main"
    // style: pkJson.style ? resolveStyle(name, nodePaths) : null,
    parsedName: parseName(name),
    entryPages,
    entryViews,
    browserifyNoParse: noParseFiles,
    isEntryServerTemplate,
    translatable: !_.has(pkJson, 'dr.translatable') || _.get(pkJson, 'dr.translatable'),
    dr: pkJson.dr,
    json: pkJson,
    compiler: _.get(pkJson, 'dr.compiler'),
    browser: pkJson.browser,
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
