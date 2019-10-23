// tslint:disable max-line-length
import EventEmitter from 'events';

const config = require('../../lib/config');
const packageUitls = require('../../lib/packageMgr/packageUtils');

import npmimportCssLoader from 'require-injector/dist/css-loader';
import Inject from 'require-injector';
import * as assetsUrl from '../../dist/assets-url';
import {PackageInfo, packageInstance as PackageInstance} from '../build-util/ts';
// import PackageInstance from '../packageNodeInstance';
import _ from 'lodash';

// module.exports = NodeApi;
// module.exports.default = NodeApi; // To be available for ES6/TS import syntax 

// var suppressWarn4Urls = config.get('suppressWarning.assetsUrl', []).map(line => new RegExp(line));

class NodeApi implements assetsUrl.PackageApi {
  packageShortName: string;
  contextPath: string;
  buildUtils = require('../../lib/gulp/buildUtils');
  packageUtils = packageUitls;
  compileNodePath = [config().nodePath];
  eventBus: EventEmitter;
  config = config;
  argv: any;
  packageInfo: PackageInfo;
  default: NodeApi;

  browserInjector: Inject;
  findPackageByFile: (file: string) => PackageInstance | undefined;
  getNodeApiForPackage: (pkInstance: any, NodeApi: any) => any;

  constructor(public packageName: string, public packageInstance: PackageInstance) {
    this.packageShortName = packageUitls.parseName(packageName).name;
    this.contextPath = this._contextPath();
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

  getProjectDirs() {
    return this.config().projectList;
  }
  /**
	 * @param {string} url
	 * @param {string} sourceFile
	 * @return {string} | {packageName: string, path: string, isTilde: boolean, isPage: boolean}, returns string if it is a relative path, or object if
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
      const injectedPackageName = npmimportCssLoader.getInjectedPackage(packageName, sourceFile, this.browserInjector);
      if (injectedPackageName)
        packageName = injectedPackageName;

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
	 * @param {string} path
	 * @return {[type]} [description]
	 */
  joinContextPath(path: string) {
    return (this.contextPath + '/' + path).replace(/\/\//g, '/');
  }

  _contextPath(packageName?: string) {
    let packageShortName;
    if (!packageName) {
      packageName = this.packageName;
      packageShortName = this.parsePackageName(packageName).name;
    } else {
      packageShortName = this.packageShortName;
    }
    var path = config.get('packageContextPathMapping[' + packageShortName + ']') ||
      config.get(['packageContextPathMapping', packageName]);
    path = path != null ? path : '/' + packageShortName;
    if (this.config().nodeRoutePath) {
      path = this.config().nodeRoutePath + '/' + path;
    }
    return path.replace(/\/\/+/g, '/');
  }

  parsePackageName(packageName: string) {
    return this.packageUtils.parseName(packageName);
  }

  isDefaultLocale() {
    return this.config.get('locales[0]') === this.getBuildLocale();
  }
  getBuildLocale() {
    return this.argv.locale || this.config.get('locales[0]');
  }

//   getBuildLocale() {
//     return this.argv.locale || this.config.get('locales[0]');
//   }

//   localeBundleFolder() {
//     return this.isDefaultLocale() ? '' : this.getBuildLocale() + '/';
//   }

//   isDefaultLocale() {
//     return this.config.get('locales[0]') === this.getBuildLocale();
//   }
}
NodeApi.prototype.eventBus = new EventEmitter();
assetsUrl.patchToApi(NodeApi.prototype);
export = NodeApi;
