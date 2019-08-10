/**
 * Unlike file-loader, it loads assets resource from "DRCP" package relative directory, not from current
 * process.cwd() directory 
 */

import * as path from 'path';
import api from '__api';
import * as _ from 'lodash';
import LRU from 'lru-cache';
import {loader as wl} from 'webpack';
import {RawSourceMap} from 'source-map';
import * as loaderUtils from 'loader-utils';
import fs from 'fs';
var log = require('log4js').getLogger(api.packageName + '.dr-file-loader');

const realpathCache = new LRU<string, string>({max: 100, maxAge: 30000});

function loader(this: wl.LoaderContext, content: string | Buffer, sourceMap?: RawSourceMap):
  string | Buffer | void | undefined {
  if (!this.emitFile)
    throw new Error('File Loader\n\nemitFile is required from module system');
  if (this.cacheable)
    this.cacheable();
  // var callback = this.async();

  if (!this.emitFile) throw new Error('emitFile is required from module system');

  var options = loaderUtils.getOptions(this) || {};

  options = Object.assign(options, {publicPath: false,
    useRelativePath: false,
    name: '[name].[md5:hash:hex:8].[ext]'
  });

  const context =
    options.context ||
    this.rootContext ||
    ((this as any).options && (this as any).options.context);

  var url = loaderUtils.interpolateName(this, options.name, {
    context,
    content,
    regExp: options.regExp
  });

  let outputPath = url;
  if (options.outputPath) {
    if (typeof options.outputPath === 'function') {
      outputPath = options.outputPath(url);
    } else {
      outputPath = path.posix.join(options.outputPath, url);
    }
  }
  const drcpOutputDir = drPackageOutputPath(this);
  outputPath = drcpOutputDir + '/' + _.trimStart(outputPath, '/');
  outputPath = _.trimStart(outputPath, '/');

  let publicPath = `__webpack_public_path__ + ${JSON.stringify(outputPath)}`;

  if (options.publicPath) {
    if (typeof options.publicPath === 'function') {
      publicPath = options.publicPath(url);
    } else if (options.publicPath.endsWith('/')) {
      publicPath = options.publicPath + url;
    } else {
      publicPath = `${options.publicPath}/${url}`;
    }

    publicPath = JSON.stringify(publicPath);
  }

  // eslint-disable-next-line no-undefined
  if (options.emitFile === undefined || options.emitFile) {
    this.emitFile(outputPath, content, null);
  }

  // TODO revert to ES2015 Module export, when new CSS Pipeline is in place
  log.debug('resource URL:', publicPath);
  return `module.exports = ${publicPath};`;
}

namespace loader {
  export const raw = true;
}
export = loader;

/**
 * return propert paths of a resource from DRCP package, including emit() path and source URL
 * @param this null
 * @param loaderCtx Webpack loader context instance
 * @return [<> , <emit >]
 */
function drPackageOutputPath(this: unknown, loaderCtx: wl.LoaderContext) {
  const dir = loaderCtx.context;
  let realpathDir = realpathCache.get(dir);
  if (!realpathDir) {
    realpathDir = fs.realpathSync(dir);
    realpathCache.set(dir, realpathDir);
  }
  var browserPackage = api.findPackageByFile(dir);

  // debug
  log.debug(`context: ${realpathDir}, browserPackage: ${browserPackage && browserPackage.longName}`);

  if (browserPackage) {
    let outDir = _.trimStart(api.config.get(['outputPathMap', browserPackage.longName]), '/');
    let sourcePkgDir = browserPackage.realPackagePath;
    let relativeInPkg = path.relative(sourcePkgDir, realpathDir).replace(/\\/g, '/');
    return outDir + '/' + relativeInPkg;
  } else {
    return path.relative(loaderCtx.rootContext, dir).replace(/\\/g, '/')
      .replace(/\.\./g, '_')
      .replace(/(^|\/)node_modules(\/|$)/g, '$1vendor$2')
      .replace(/@/g, 'a_');
  }
}
