import api from '__api';
import {parse} from 'url';
import _ from 'lodash';
import Path from 'path';
import fs from 'fs';
import {findAllPackages} from '@wfh/plink/wfh/dist/package-utils';
// import {createStaticRoute} from './static-middleware';
// import express from 'express';

const log = require('log4js').getLogger(api.packageName + '.dev-serve-assets');

// const api = __api as ExpressAppApi & typeof __api;
/**
 * Used by @wfh/ng-app-builder
 * @param deployUrl 
 * @param onEach 
 */
export function packageAssetsFolders(deployUrl: string, onEach: (dir: string, outputDir: string) => void) {
  const rootPath = _.trimEnd(parse(deployUrl).pathname || '', '/');
  findAllPackages(
    (name: string, entryPath: string, parsedName: {name: string}, json: any, packagePath: string) => {

    // TODO: should move this piece logic to cra-scripts
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
      const assetsFolder = json.dr ?
        (json.dr.assetsDir ? json.dr.assetsDir : 'assets')
          :'assets';

      let assetsDir = Path.resolve(packagePath, assetsFolder);
      let assetsDirConfigured = api.config().outputPathMap[name];

      if (assetsDirConfigured != null)
        assetsDirConfigured = _.trim(assetsDirConfigured, '/');
      else if (json.dr && json.dr.ngRouterPath) {
        assetsDirConfigured = _.trim(json.dr.ngRouterPath, '/');
        log.info(packagePath + `/package.json contains "dr.ngRouterPath", assets directory is changed to "${assetsDirConfigured}"`);
      }
      if (fs.existsSync(assetsDir)) {
        assetsDir = fs.realpathSync(assetsDir);
        var pathElement = [];
        if (rootPath)
          pathElement.push(rootPath);

        if (assetsDirConfigured == null)
          pathElement.push(parsedName.name);
        else if (assetsDirConfigured !== '')
          pathElement.push(assetsDirConfigured);

        let path = pathElement.join('/');
        if (path.length > 1)
          path += '/';
        log.info('assets: ' + path + ' -> ' + assetsDir);
        onEach(assetsDir, path);
      }
    }
  });
}
