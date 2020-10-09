/* tslint:disable max-classes-per-file */
import * as _ from 'lodash';

export default class PackageBrowserInstance {
  // bundle: string;
  longName: string;
  shortName: string;
  /** @deprecated */
  // file?: string;
  parsedName: {scope?: string, name: string};
  scopeName?: string;
  // entryPages?: string[];
  i18n: string;
  packagePath: string;
  realPackagePath: string;
  // main: string;
  // style?: string | null;
  // entryViews?: string[];
  browserifyNoParse?: any[];
  // isEntryServerTemplate: boolean;
  translatable: string;
  dr: any;
  json: any;
  // browser: string;
  isVendor: boolean;
  appType: string;
  // compiler?: any;

  constructor(attrs: {[key in keyof PackageBrowserInstance]?: PackageBrowserInstance[key]}) {
    if (!(this instanceof PackageBrowserInstance)) {
      return new PackageBrowserInstance(attrs);
    }
    if (attrs) {
      this.init(attrs);
    }
  }
  init(attrs: {[key in keyof PackageBrowserInstance]?: PackageBrowserInstance[key]}) {
    _.assign(this, attrs);
    const parsedName = this.parsedName;
    if (parsedName) {
      this.shortName = parsedName.name;
      this.scopeName = parsedName.scope;
    }
  }
  toString() {
    return 'Package: ' + this.longName;
  }
}



