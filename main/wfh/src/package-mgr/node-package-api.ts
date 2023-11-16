// eslint-disable  max-len
import {EventEmitter} from 'events';

import _ from 'lodash';
import {Logger, getLogger} from 'log4js';
import Inject from '../../../packages/require-injector';
import PackageInstance from '../packageNodeInstance';
import * as assetsUrl from '../share/assets-url';
import config from '../config';
import {PackageInfo} from './package-info-gathering';

const moduleNameReg = /^(?:@([^/]+)\/)?(\S+)/;

function parseName(longName: string) {
  const ret = {name: longName, scope: ''};
  const match = moduleNameReg.exec(longName);
  if (match) {
    ret.scope = match[1];
    ret.name = match[2];
  }
  return ret;
}
// module.exports = NodeApi;
// module.exports.default = NodeApi; // To be available for ES6/TS import syntax 

// var suppressWarn4Urls = config.get('suppressWarning.assetsUrl', []).map(line => new RegExp(line));

class NodeApi implements assetsUrl.PackageApi, assetsUrl.ExtendedApi {
  eventBus: EventEmitter | undefined;
  packageShortName: string;
  // packageUtils = packageUitls;
  // compileNodePath = [config().nodePath];
  config = config;
  argv: any;
  packageInfo: PackageInfo | undefined;
  default: NodeApi | undefined;
  logger: Logger;

  browserInjector: Inject | undefined;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  findPackageByFile: (file: string) => PackageInstance | undefined;
  getNodeApiForPackage: ((pkInstance: PackageInstance) => NodeApi) | undefined;

  assetsUrl = assetsUrl.assetsUrl;
  serverUrl = assetsUrl.serverUrl;
  /** @deprecated */
  entryPageUrl = assetsUrl.entryPageUrl;

  get contextPath() {
    return this._contextPath();
  }


  constructor(public packageName: string, public packageInstance: PackageInstance) {
    this.packageShortName = parseName(packageName).name;
    // this.contextPath = this._contextPath();
    this.logger = getLogger(this.packageName);
  }

  /**
   * return A log witch catgory name "<package name>.<nameAfterPackageName>"
   * @param nameAfterPackageName 
   */
  getLogger(nameAfterPackageName: string) {
    return getLogger(this.packageName + '.' + nameAfterPackageName);
  }

  isBrowser() {
    return false;
  }

  isNode() {
    return true;
  }

  addBrowserSideConfig(path: string, value: any) {
    this.config.set(path, value);
    this.config().browserSideConfigProp.push(path);
  }

  /**
	 * it is in format of /^(?:assets:\/\/|~|page(?:-([^:]+))?:\/\/)((?:@[^\/]+\/)?[^\/]+)?\/(.*)$/
	 */
  normalizeAssetsUrl(url: string, sourceFile: string) {
    const match = /^(?:assets:\/\/|~|page(?:-([^:]+))?:\/\/)((?:@[^/]+\/)?[^/@][^/]*)?(?:\/([^@].*)?)?$/.exec(url);
    if (match) {
      let packageName = match[2];
      const relPath = match[3] || '';
      if (!packageName || packageName === '') {
        const compPackage = this.findPackageByFile(sourceFile);
        if (compPackage == null)
          throw new Error(`${sourceFile} does not belong to any known package`);
        packageName = compPackage.longName;
      }
      // const injectedPackageName = npmimportCssLoader.getInjectedPackage(packageName, sourceFile, this.browserInjector);
      // if (injectedPackageName)
      //   packageName = injectedPackageName;

      return {
        packageName,
        path: relPath,
        isTilde: url.charAt(0) === '~',
        isPage: match[1] != null || _.startsWith(url, 'page://'),
        locale: match[1]
      };
    } else {
      return url;
    }
  }
  /**
	 * join contextPath
	 */
  joinContextPath(path: string) {
    return (this.contextPath + '/' + path).replace(/\/\//g, '/');
  }

  _contextPath(packageName?: string): string {
    // let packageShortName;
    // if (!packageName) {
    //   packageName = this.packageName;
    //   packageShortName = this.parsePackageName(packageName).name;
    // } else {
    //   packageShortName = this.packageShortName;
    // }
    let path: string = config.get('packageContextPathMapping[' + this.packageShortName + ']') ||
      config.get(['packageContextPathMapping', packageName || this.packageName]);
    path = path != null ? path : '/' + this.packageShortName;
    if (this.config().nodeRoutePath) {
      path = this.config().nodeRoutePath + '/' + path;
    }
    return path.replace(/\/\/+/g, '/');
  }

  parsePackageName(packageName: string) {
    return parseName(packageName);
  }

  /** @deprecated */
  isDefaultLocale() {
    return this.config.get('locales[0]') === this.getBuildLocale();
  }
  /** @deprecated */
  getBuildLocale() {
    return this.argv.locale || this.config.get('locales[0]');
  }
}

NodeApi.prototype.eventBus = new EventEmitter();

// assetsUrl.patchToApi(NodeApi.prototype);

export default NodeApi;
