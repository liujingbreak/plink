import * as Url from 'url';

interface ConfigSetting {
  staticAssetsURL: string;
  outputPathMap: {[name: string]: string};
}

export interface PackageApi {
  packageName: string;
  config(): ConfigSetting;
  isDefaultLocale(): boolean;
  getBuildLocale(): string;
  isNode(): boolean;
  _contextPath(packageName?: string): string;
}

export interface ExtendedApi {
  assetsUrl: typeof assetsUrl;
  entryPageUrl: typeof entryPageUrl;
  serverUrl: typeof serverUrl;
}

export function patchToApi(apiPrototype: any) {
  
  apiPrototype.assetsUrl = assetsUrl;

  apiPrototype.entryPageUrl = entryPageUrl;

  apiPrototype.serverUrl = serverUrl;
}

export function entryPageUrl(this: PackageApi, packageName: string, path: string, locale: string): string {
  if (arguments.length === 1) {
    path = arguments[0];
    packageName = this.packageName;
  }
  path = path.replace(/([^./\\]+\.)[^?./\\]+(\?.*)?$/, '$1html$2');
  return publicUrl(this.config().staticAssetsURL, this.config().outputPathMap,
    locale ? locale : (this.isDefaultLocale() ? null : this.getBuildLocale()), packageName, path);
}

// export function assetsUrl(this: PackageApi, path: string): string;
export function assetsUrl(this: PackageApi, packageName: string | null, path?: string): string {
  if (path === undefined) {
    path = arguments[0];
    packageName = this.packageName;
  }
  return publicUrl(this.config().staticAssetsURL, this.config().outputPathMap, null,
    packageName, path!);
}
/**
 * Helper for dealing with url like "npm://<package>/<path>", "assets://<package>/<path>"
 * @param {string} staticAssetsURL, like Webpack's output.publicPath
 * @param {object} outputPathMap
 * @param {string} useLocale the final URL will includes locale path (for entry page URL) "zh" or "us",
 * use `null` or "" denotes default locale
 * @param {string} packageName if null, the package name will be extracted from url
 * @param {string} path
 * @return {string}
 */
export function publicUrl(staticAssetsURL: string, outputPathMap: {[name: string]: string},
  useLocale: string | null, packageName: string | null, path: string) {
  var m = /^(assets:\/\/|~|npm:\/\/|page(?:-([^:]+))?:\/\/)((?:@[^/]+\/)?[^/@][^/]*)?(?:\/([^@].*)?)?$/.exec(path);
  if (m) {
    if (m[1] && !m[3]) {
      throw new Error(`Can not resolve package name from "${path}"`);
    }
    if (m[3])
      packageName = m[3];
    path = m[4];
  }
  // if (packageName == null) {
  //   throw new Error(`Can not resolve package name from "${path}"`);
  // }
  let finalUrl: string;
  if (packageName) {
    let outputPath = outputPathMap[packageName];
    if (outputPath != null) {
      outputPath = /^\/*(.*?)\/*$/.exec(outputPath)![1];// _.trim(outputPath, '/');
    } else {
      m = /(?:@([^/]+)\/)?(\S+)/.exec(packageName);
      outputPath = m ? m[2] : packageName;
    }
    finalUrl = joinUrl(staticAssetsURL, useLocale || '', outputPath, path);
  } else {
    finalUrl = joinUrl(staticAssetsURL, useLocale || '', path);
  }

  if (!/^https?:\/\//.test(finalUrl) && finalUrl.charAt(0) !== '/')
    finalUrl = '/' + finalUrl;
  return finalUrl;
}

function joinUrl(...pathEls: string[]) {
  pathEls = pathEls.map(el => {
    // Trim last '/'
    if (el && el.charAt(el.length - 1) === '/' && el.length > 1)
      return el.substring(0, el.length - 1);
    return el;
  });
  var joined = pathEls[0];
  for (var i = 1, l = pathEls.length; i < l; i++) {
    if (pathEls[i] == null || pathEls[i].length === 0)
      continue;
    if (joined.length > 0 && joined.charAt(joined.length - 1) !== '/' &&
      pathEls[i] && pathEls[i].charAt(0) !== '/')
      joined += '/';
    joined += pathEls[i];
  }
  return joined;
}

export function serverUrl(this: PackageApi, packageNameOrPath: string, path?: string): string {
  if (!this.isNode()) {
    // tslint:disable-next-line
		throw new Error(`api.serverUrl() only available at server side during compile-time and runtime, use "__api.serverUrl('${packageNameOrPath}', '${path}')" instead` );
  }
  if (path == null) {
    path = packageNameOrPath;
    packageNameOrPath = this.packageName;
  }
  return Url.resolve('/', this._contextPath(packageNameOrPath) + '/' + path);
}
