/* tslint:disable max-classes-per-file */
import * as _ from 'lodash';

export default class PackageBrowserInstance {
  bundle: string;
  longName: string;
  shortName: string;
  file: string;
  parsedName: {scope: string, name: string};
  scopeName: string;
  entryPages: string[];
  i18n: string;
  packagePath: string;
  realPackagePath: string;
  main: string;
  style: string;
  entryViews: string[];
  browserifyNoParse: any[];
  isEntryServerTemplate: boolean;
  translatable: string;
  dr: any;
  json: any;
  browser: string;
  isVendor: boolean;
  appType: string;

  constructor(attrs: any) {
    if (!(this instanceof PackageBrowserInstance)) {
      return new PackageBrowserInstance(attrs);
    }
    if (attrs) {
      this.init(attrs);
    }
  }
  init(attrs: any) {
    _.assign(this, attrs);
    var parsedName = this.parsedName;
    if (parsedName) {
      this.shortName = parsedName.name;
      this.scopeName = parsedName.scope;
    }
  }
  toString() {
    return 'Package: ' + this.longName;
  }
}
import * as Path from 'path';
import * as fs from 'fs';
import {DirTree} from 'require-injector/dist/dir-tree';
const packageUtils = require('dr-comp-package/wfh/lib/packageMgr/packageUtils');
export class LazyPackageFactory {
  packagePathMap = new DirTree<PackageBrowserInstance>();

  getPackageByPath(file: string): PackageBrowserInstance {
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

function createPackage(packagePath: string, pkJson: any) {
  const name: string = pkJson.name;
  const instance = new PackageBrowserInstance({
    isVendor: false,
    bundle: null,
    longName: pkJson.name,
    shortName: packageUtils.parseName(pkJson.name).name,
    packagePath,
    realPackagePath: fs.realpathSync(packagePath)
  });
  let entryViews: string[], entryPages: string[];
  let isEntryServerTemplate = true;
  let noParseFiles: string[];
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
    file: mainFile ? fs.realpathSync(Path.resolve(packagePath, mainFile)) : null, // package.json "browser"
    main: pkJson.main, // package.json "main"
    // style: pkJson.style ? resolveStyle(name, nodePaths) : null,
    parsedName: packageUtils.parseName(name),
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
