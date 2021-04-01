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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2LXNlcnZlLWFzc2V0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRldi1zZXJ2ZS1hc3NldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsa0RBQXdCO0FBQ3hCLDZCQUEwQjtBQUMxQixvREFBdUI7QUFDdkIsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUNwQixxRUFBa0U7QUFDbEUseURBQXlEO0FBQ3pELGlDQUFpQztBQUVqQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsbUJBQW1CLENBQUMsQ0FBQztBQUUvRSxxREFBcUQ7QUFDckQ7Ozs7R0FJRztBQUNILFNBQWdCLG9CQUFvQixDQUFDLFNBQWlCLEVBQUUsTUFBZ0Q7SUFDdEcsTUFBTSxRQUFRLEdBQUcsZ0JBQUMsQ0FBQyxPQUFPLENBQUMsV0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsSUFBSSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDakUsK0JBQWUsQ0FDYixDQUFDLElBQVksRUFBRSxTQUFpQixFQUFFLFVBQTBCLEVBQUUsSUFBUyxFQUFFLFdBQW1CLEVBQUUsRUFBRTtRQUVoRyxJQUFJLElBQUksQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsRUFBRTtZQUN2QyxNQUFNLFlBQVksR0FBRyxRQUFRLEdBQUcsVUFBVSxDQUFDLElBQUksR0FBRyxlQUFlLENBQUM7WUFDbEUsSUFBSSxTQUFTLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDeEQsSUFBSSxDQUFDLFlBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDO2dCQUMzQixPQUFPO1lBQ1QsU0FBUyxHQUFHLFlBQUUsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7WUFFdkMsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDO1lBQ3ZCLElBQUksUUFBUTtnQkFDVixXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzdCLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksR0FBRyxlQUFlLENBQUMsQ0FBQztZQUVwRCxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztZQUN6QyxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3hCLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksR0FBRyxNQUFNLEdBQUcsU0FBUyxDQUFDLENBQUM7U0FDbEQ7YUFBTTtZQUNMLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDNUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztnQkFDaEQsQ0FBQyxDQUFBLFFBQVEsQ0FBQztZQUVkLElBQUksU0FBUyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ3hELElBQUksbUJBQW1CLEdBQUcsZUFBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUUzRCxJQUFJLG1CQUFtQixJQUFJLElBQUk7Z0JBQzdCLG1CQUFtQixHQUFHLGdCQUFDLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxDQUFDO2lCQUNwRCxJQUFJLElBQUksQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUU7Z0JBQ3hDLG1CQUFtQixHQUFHLGdCQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUN4RCxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyw2RUFBNkUsbUJBQW1CLEdBQUcsQ0FBQyxDQUFDO2FBQzdIO1lBQ0QsSUFBSSxZQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFO2dCQUM1QixTQUFTLEdBQUcsWUFBRSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDdkMsSUFBSSxXQUFXLEdBQUcsRUFBRSxDQUFDO2dCQUNyQixJQUFJLFFBQVE7b0JBQ1YsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFFN0IsSUFBSSxtQkFBbUIsSUFBSSxJQUFJO29CQUM3QixXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztxQkFDL0IsSUFBSSxtQkFBbUIsS0FBSyxFQUFFO29CQUNqQyxXQUFXLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7Z0JBRXhDLElBQUksSUFBSSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2pDLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDO29CQUNqQixJQUFJLElBQUksR0FBRyxDQUFDO2dCQUNkLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksR0FBRyxNQUFNLEdBQUcsU0FBUyxDQUFDLENBQUM7Z0JBQ2pELE1BQU0sQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDekI7U0FDRjtJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQXJERCxvREFxREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7cGFyc2V9IGZyb20gJ3VybCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtmaW5kQWxsUGFja2FnZXN9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS11dGlscyc7XG4vLyBpbXBvcnQge2NyZWF0ZVN0YXRpY1JvdXRlfSBmcm9tICcuL3N0YXRpYy1taWRkbGV3YXJlJztcbi8vIGltcG9ydCBleHByZXNzIGZyb20gJ2V4cHJlc3MnO1xuXG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5kZXYtc2VydmUtYXNzZXRzJyk7XG5cbi8vIGNvbnN0IGFwaSA9IF9fYXBpIGFzIEV4cHJlc3NBcHBBcGkgJiB0eXBlb2YgX19hcGk7XG4vKipcbiAqIFVzZWQgYnkgQHdmaC9uZy1hcHAtYnVpbGRlclxuICogQHBhcmFtIGRlcGxveVVybCBcbiAqIEBwYXJhbSBvbkVhY2ggXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYWNrYWdlQXNzZXRzRm9sZGVycyhkZXBsb3lVcmw6IHN0cmluZywgb25FYWNoOiAoZGlyOiBzdHJpbmcsIG91dHB1dERpcjogc3RyaW5nKSA9PiB2b2lkKSB7XG4gIGNvbnN0IHJvb3RQYXRoID0gXy50cmltRW5kKHBhcnNlKGRlcGxveVVybCkucGF0aG5hbWUgfHwgJycsICcvJyk7XG4gIGZpbmRBbGxQYWNrYWdlcyhcbiAgICAobmFtZTogc3RyaW5nLCBlbnRyeVBhdGg6IHN0cmluZywgcGFyc2VkTmFtZToge25hbWU6IHN0cmluZ30sIGpzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykgPT4ge1xuXG4gICAgaWYgKGpzb24uZHIgJiYganNvbi5kclsnY3JhLWxpYi1lbnRyeSddKSB7XG4gICAgICBjb25zdCBhc3NldHNGb2xkZXIgPSAnYnVpbGQvJyArIHBhcnNlZE5hbWUubmFtZSArICcvc3RhdGljL21lZGlhJztcbiAgICAgIGxldCBhc3NldHNEaXIgPSBQYXRoLnJlc29sdmUocGFja2FnZVBhdGgsIGFzc2V0c0ZvbGRlcik7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoYXNzZXRzRGlyKSlcbiAgICAgICAgcmV0dXJuO1xuICAgICAgYXNzZXRzRGlyID0gZnMucmVhbHBhdGhTeW5jKGFzc2V0c0Rpcik7XG5cbiAgICAgIGNvbnN0IHBhdGhFbGVtZW50ID0gW107XG4gICAgICBpZiAocm9vdFBhdGgpXG4gICAgICAgIHBhdGhFbGVtZW50LnB1c2gocm9vdFBhdGgpO1xuICAgICAgcGF0aEVsZW1lbnQucHVzaChwYXJzZWROYW1lLm5hbWUgKyAnL3N0YXRpYy9tZWRpYScpO1xuXG4gICAgICBjb25zdCBwYXRoID0gcGF0aEVsZW1lbnQuam9pbignLycpICsgJy8nO1xuICAgICAgb25FYWNoKGFzc2V0c0RpciwgcGF0aCk7XG4gICAgICBsb2cuaW5mbygnYXNzZXRzOiAnICsgcGF0aCArICcgLT4gJyArIGFzc2V0c0Rpcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGFzc2V0c0ZvbGRlciA9IGpzb24uZHIgP1xuICAgICAgICAoanNvbi5kci5hc3NldHNEaXIgPyBqc29uLmRyLmFzc2V0c0RpciA6ICdhc3NldHMnKVxuICAgICAgICAgIDonYXNzZXRzJztcblxuICAgICAgbGV0IGFzc2V0c0RpciA9IFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgYXNzZXRzRm9sZGVyKTtcbiAgICAgIGxldCBhc3NldHNEaXJDb25maWd1cmVkID0gYXBpLmNvbmZpZygpLm91dHB1dFBhdGhNYXBbbmFtZV07XG5cbiAgICAgIGlmIChhc3NldHNEaXJDb25maWd1cmVkICE9IG51bGwpXG4gICAgICAgIGFzc2V0c0RpckNvbmZpZ3VyZWQgPSBfLnRyaW0oYXNzZXRzRGlyQ29uZmlndXJlZCwgJy8nKTtcbiAgICAgIGVsc2UgaWYgKGpzb24uZHIgJiYganNvbi5kci5uZ1JvdXRlclBhdGgpIHtcbiAgICAgICAgYXNzZXRzRGlyQ29uZmlndXJlZCA9IF8udHJpbShqc29uLmRyLm5nUm91dGVyUGF0aCwgJy8nKTtcbiAgICAgICAgbG9nLmluZm8ocGFja2FnZVBhdGggKyBgL3BhY2thZ2UuanNvbiBjb250YWlucyBcImRyLm5nUm91dGVyUGF0aFwiLCBhc3NldHMgZGlyZWN0b3J5IGlzIGNoYW5nZWQgdG8gXCIke2Fzc2V0c0RpckNvbmZpZ3VyZWR9XCJgKTtcbiAgICAgIH1cbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKGFzc2V0c0RpcikpIHtcbiAgICAgICAgYXNzZXRzRGlyID0gZnMucmVhbHBhdGhTeW5jKGFzc2V0c0Rpcik7XG4gICAgICAgIHZhciBwYXRoRWxlbWVudCA9IFtdO1xuICAgICAgICBpZiAocm9vdFBhdGgpXG4gICAgICAgICAgcGF0aEVsZW1lbnQucHVzaChyb290UGF0aCk7XG5cbiAgICAgICAgaWYgKGFzc2V0c0RpckNvbmZpZ3VyZWQgPT0gbnVsbClcbiAgICAgICAgICBwYXRoRWxlbWVudC5wdXNoKHBhcnNlZE5hbWUubmFtZSk7XG4gICAgICAgIGVsc2UgaWYgKGFzc2V0c0RpckNvbmZpZ3VyZWQgIT09ICcnKVxuICAgICAgICAgIHBhdGhFbGVtZW50LnB1c2goYXNzZXRzRGlyQ29uZmlndXJlZCk7XG5cbiAgICAgICAgbGV0IHBhdGggPSBwYXRoRWxlbWVudC5qb2luKCcvJyk7XG4gICAgICAgIGlmIChwYXRoLmxlbmd0aCA+IDEpXG4gICAgICAgICAgcGF0aCArPSAnLyc7XG4gICAgICAgIGxvZy5pbmZvKCdhc3NldHM6ICcgKyBwYXRoICsgJyAtPiAnICsgYXNzZXRzRGlyKTtcbiAgICAgICAgb25FYWNoKGFzc2V0c0RpciwgcGF0aCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn1cbiJdfQ==