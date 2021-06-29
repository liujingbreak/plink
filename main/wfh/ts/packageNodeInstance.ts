import {PackageInfo} from './package-mgr/index';

export default class Package implements NodePackageAttr {
  moduleName: string;
  shortName: string;
  name: string;
  longName: string;
  scope: string;
  /** If this property is not same as "realPath", then it is a symlink */
  path: string;
  json: any;
  realPath: string;

  constructor(attrs: Partial<NodePackageAttr>) {
    Object.assign(this, attrs);
  }
}

export interface NodePackageAttr {
  moduleName: string;
  shortName: string;
  name: string;
  longName: string;
  scope: string;
  path: string;
  json: PackageInfo['json'];
  realPath: string;
}
