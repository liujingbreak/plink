import __api from '__api';
import {ExpressAppApi} from '@dr-core/express-app';
import {parse} from 'url';
import _ from 'lodash';
import Path from 'path';
import fs from 'fs';
import {findAllPackages} from 'dr-comp-package/wfh/dist/package-utils';
// import {createStaticRoute} from './static-middleware';
// import express from 'express';

const log = require('log4js').getLogger(__api.packageName + '.dev-serve-assets');

const api = __api as ExpressAppApi & typeof __api;

export function packageAssetsFolders(deployUrl: string, onEach: (dir: string, outputDir: string) => void) {
  const rootPath = _.trimEnd(parse(deployUrl).pathname || '', '/');
  findAllPackages(
    (name: string, entryPath: string, parsedName: {name: string}, json: any, packagePath: string) => {

    if (json.dr && json.dr['cra-lib-entry']) {
      const assetsFolder = 'build/' + parsedName.name + '/static/media';
      let assetsDir = Path.resolve(packagePath, assetsFolder);
      if (!fs.existsSync(assetsDir))
        return;
      assetsDir = fs.realpathSync(assetsDir);

      const pathElement = [];
      if (rootPath)
        pathElement.push(rootPath);
      pathElement.push(parsedName.name + '/static/media');

      const path = pathElement.join('/') + '/';
      onEach(assetsDir, path);
      log.info('assets: ' + path + ' -> ' + assetsDir);
    } else {
      var assetsFolder = json.dr ?
        (json.dr.assetsDir ? json.dr.assetsDir : 'assets')
          :'assets';

      let assetsDir = Path.resolve(packagePath, assetsFolder);
      var assetsDirMap = api.config.get('outputPathMap.' + name);

      if (assetsDirMap != null)
        assetsDirMap = _.trim(assetsDirMap, '/');

      if (fs.existsSync(assetsDir)) {
        assetsDir = fs.realpathSync(assetsDir);
        var pathElement = [];
        if (rootPath)
          pathElement.push(rootPath);

        if (assetsDirMap == null)
          pathElement.push(parsedName.name);
        else if (assetsDirMap !== '')
          pathElement.push(assetsDirMap);

        var path = pathElement.join('/');
        if (path.length > 1)
          path += '/';
        log.info('assets: ' + path + ' -> ' + assetsDir);
        onEach(assetsDir, path);
      }
    }
  });
}
