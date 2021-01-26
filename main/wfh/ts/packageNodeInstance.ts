import Api from './package-mgr/node-package-api';
export default class Package implements NodePackageAttr {
  moduleName: string;
  shortName: string;
  name: string;
  longName: string;
  scope: string;
  path: string;
  json: any;
  api: Api;
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
  json: any;
  api: Api;
  realPath: string;
}
