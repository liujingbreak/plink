"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.packageAssetsFolders = void 0;
const tslib_1 = require("tslib");
const __api_1 = tslib_1.__importDefault(require("__api"));
const url_1 = require("url");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const path_1 = tslib_1.__importDefault(require("path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const package_utils_1 = require("@wfh/plink/wfh/dist/package-utils");
// import {createStaticRoute} from './static-middleware';
// import express from 'express';
const log = require('log4js').getLogger(__api_1.default.packageName + '.dev-serve-assets');
// const api = __api as ExpressAppApi & typeof __api;
/**
 * Used by @wfh/ng-app-builder
 * @param deployUrl
 * @param onEach
 */
function packageAssetsFolders(deployUrl, onEach) {
    const rootPath = lodash_1.default.trimEnd((0, url_1.parse)(deployUrl).pathname || '', '/');
    (0, package_utils_1.findAllPackages)((name, entryPath, parsedName, json, packagePath) => {
        // TODO: should move this piece logic to cra-scripts
        if (json.dr && json.dr['cra-lib-entry']) {
            const assetsFolder = 'build/' + parsedName.name + '/static/media';
            let assetsDir = path_1.default.resolve(packagePath, assetsFolder);
            if (!fs_1.default.existsSync(assetsDir))
                return;
            assetsDir = fs_1.default.realpathSync(assetsDir);
            const pathElement = [];
            if (rootPath)
                pathElement.push(rootPath);
            pathElement.push(parsedName.name + '/static/media');
            const path = pathElement.join('/') + '/';
            onEach(assetsDir, path);
            log.info('assets: ' + path + ' -> ' + assetsDir);
        }
        else {
            const assetsFolder = json.dr ?
                (json.dr.assetsDir ? json.dr.assetsDir : 'assets')
                : 'assets';
            let assetsDir = path_1.default.resolve(packagePath, assetsFolder);
            let assetsDirConfigured = __api_1.default.config().outputPathMap[name];
            if (assetsDirConfigured != null)
                assetsDirConfigured = lodash_1.default.trim(assetsDirConfigured, '/');
            else if (json.dr && json.dr.ngRouterPath) {
                assetsDirConfigured = lodash_1.default.trim(json.dr.ngRouterPath, '/');
                log.info(packagePath + `/package.json contains "dr.ngRouterPath", assets directory is changed to "${assetsDirConfigured}"`);
            }
            if (fs_1.default.existsSync(assetsDir)) {
                assetsDir = fs_1.default.realpathSync(assetsDir);
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
exports.packageAssetsFolders = packageAssetsFolders;
//# sourceMappingURL=dev-serve-assets.js.map