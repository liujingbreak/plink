"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.packageAssetsFolders = void 0;
const __api_1 = __importDefault(require("__api"));
const url_1 = require("url");
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const package_utils_1 = require("dr-comp-package/wfh/dist/package-utils");
// import {createStaticRoute} from './static-middleware';
// import express from 'express';
const log = require('log4js').getLogger(__api_1.default.packageName + '.dev-serve-assets');
const api = __api_1.default;
function packageAssetsFolders(deployUrl, onEach) {
    const rootPath = lodash_1.default.trimEnd(url_1.parse(deployUrl).pathname || '', '/');
    package_utils_1.findAllPackages((name, entryPath, parsedName, json, packagePath) => {
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
            var assetsFolder = json.dr ?
                (json.dr.assetsDir ? json.dr.assetsDir : 'assets')
                : 'assets';
            let assetsDir = path_1.default.resolve(packagePath, assetsFolder);
            var assetsDirMap = api.config.get('outputPathMap.' + name);
            if (assetsDirMap != null)
                assetsDirMap = lodash_1.default.trim(assetsDirMap, '/');
            if (fs_1.default.existsSync(assetsDir)) {
                assetsDir = fs_1.default.realpathSync(assetsDir);
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
exports.packageAssetsFolders = packageAssetsFolders;

//# sourceMappingURL=dev-serve-assets.js.map
