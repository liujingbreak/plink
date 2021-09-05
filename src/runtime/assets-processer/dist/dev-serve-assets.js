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
    const rootPath = lodash_1.default.trimEnd((0, url_1.parse)(deployUrl).pathname || '', '/');
    (0, package_utils_1.findAllPackages)((name, entryPath, parsedName, json, packagePath) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2LXNlcnZlLWFzc2V0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRldi1zZXJ2ZS1hc3NldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsa0RBQXdCO0FBQ3hCLDZCQUEwQjtBQUMxQixvREFBdUI7QUFDdkIsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUNwQixxRUFBa0U7QUFDbEUseURBQXlEO0FBQ3pELGlDQUFpQztBQUVqQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsbUJBQW1CLENBQUMsQ0FBQztBQUUvRSxxREFBcUQ7QUFDckQ7Ozs7R0FJRztBQUNILFNBQWdCLG9CQUFvQixDQUFDLFNBQWlCLEVBQUUsTUFBZ0Q7SUFDdEcsTUFBTSxRQUFRLEdBQUcsZ0JBQUMsQ0FBQyxPQUFPLENBQUMsSUFBQSxXQUFLLEVBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxJQUFJLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNqRSxJQUFBLCtCQUFlLEVBQ2IsQ0FBQyxJQUFZLEVBQUUsU0FBaUIsRUFBRSxVQUEwQixFQUFFLElBQVMsRUFBRSxXQUFtQixFQUFFLEVBQUU7UUFFaEcsSUFBSSxJQUFJLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLEVBQUU7WUFDdkMsTUFBTSxZQUFZLEdBQUcsUUFBUSxHQUFHLFVBQVUsQ0FBQyxJQUFJLEdBQUcsZUFBZSxDQUFDO1lBQ2xFLElBQUksU0FBUyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ3hELElBQUksQ0FBQyxZQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQztnQkFDM0IsT0FBTztZQUNULFNBQVMsR0FBRyxZQUFFLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRXZDLE1BQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQztZQUN2QixJQUFJLFFBQVE7Z0JBQ1YsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUM3QixXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEdBQUcsZUFBZSxDQUFDLENBQUM7WUFFcEQsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7WUFDekMsTUFBTSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN4QixHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLEdBQUcsTUFBTSxHQUFHLFNBQVMsQ0FBQyxDQUFDO1NBQ2xEO2FBQU07WUFDTCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQzVCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7Z0JBQ2hELENBQUMsQ0FBQSxRQUFRLENBQUM7WUFFZCxJQUFJLFNBQVMsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUN4RCxJQUFJLG1CQUFtQixHQUFHLGVBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFM0QsSUFBSSxtQkFBbUIsSUFBSSxJQUFJO2dCQUM3QixtQkFBbUIsR0FBRyxnQkFBQyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsQ0FBQztpQkFDcEQsSUFBSSxJQUFJLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFO2dCQUN4QyxtQkFBbUIsR0FBRyxnQkFBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDeEQsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsNkVBQTZFLG1CQUFtQixHQUFHLENBQUMsQ0FBQzthQUM3SDtZQUNELElBQUksWUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRTtnQkFDNUIsU0FBUyxHQUFHLFlBQUUsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ3ZDLElBQUksV0FBVyxHQUFHLEVBQUUsQ0FBQztnQkFDckIsSUFBSSxRQUFRO29CQUNWLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBRTdCLElBQUksbUJBQW1CLElBQUksSUFBSTtvQkFDN0IsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7cUJBQy9CLElBQUksbUJBQW1CLEtBQUssRUFBRTtvQkFDakMsV0FBVyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO2dCQUV4QyxJQUFJLElBQUksR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNqQyxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQztvQkFDakIsSUFBSSxJQUFJLEdBQUcsQ0FBQztnQkFDZCxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLEdBQUcsTUFBTSxHQUFHLFNBQVMsQ0FBQyxDQUFDO2dCQUNqRCxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQ3pCO1NBQ0Y7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFyREQsb0RBcURDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQge3BhcnNlfSBmcm9tICd1cmwnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7ZmluZEFsbFBhY2thZ2VzfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtdXRpbHMnO1xuLy8gaW1wb3J0IHtjcmVhdGVTdGF0aWNSb3V0ZX0gZnJvbSAnLi9zdGF0aWMtbWlkZGxld2FyZSc7XG4vLyBpbXBvcnQgZXhwcmVzcyBmcm9tICdleHByZXNzJztcblxuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuZGV2LXNlcnZlLWFzc2V0cycpO1xuXG4vLyBjb25zdCBhcGkgPSBfX2FwaSBhcyBFeHByZXNzQXBwQXBpICYgdHlwZW9mIF9fYXBpO1xuLyoqXG4gKiBVc2VkIGJ5IEB3ZmgvbmctYXBwLWJ1aWxkZXJcbiAqIEBwYXJhbSBkZXBsb3lVcmwgXG4gKiBAcGFyYW0gb25FYWNoIFxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFja2FnZUFzc2V0c0ZvbGRlcnMoZGVwbG95VXJsOiBzdHJpbmcsIG9uRWFjaDogKGRpcjogc3RyaW5nLCBvdXRwdXREaXI6IHN0cmluZykgPT4gdm9pZCkge1xuICBjb25zdCByb290UGF0aCA9IF8udHJpbUVuZChwYXJzZShkZXBsb3lVcmwpLnBhdGhuYW1lIHx8ICcnLCAnLycpO1xuICBmaW5kQWxsUGFja2FnZXMoXG4gICAgKG5hbWU6IHN0cmluZywgZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWU6IHtuYW1lOiBzdHJpbmd9LCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpID0+IHtcblxuICAgIGlmIChqc29uLmRyICYmIGpzb24uZHJbJ2NyYS1saWItZW50cnknXSkge1xuICAgICAgY29uc3QgYXNzZXRzRm9sZGVyID0gJ2J1aWxkLycgKyBwYXJzZWROYW1lLm5hbWUgKyAnL3N0YXRpYy9tZWRpYSc7XG4gICAgICBsZXQgYXNzZXRzRGlyID0gUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoLCBhc3NldHNGb2xkZXIpO1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGFzc2V0c0RpcikpXG4gICAgICAgIHJldHVybjtcbiAgICAgIGFzc2V0c0RpciA9IGZzLnJlYWxwYXRoU3luYyhhc3NldHNEaXIpO1xuXG4gICAgICBjb25zdCBwYXRoRWxlbWVudCA9IFtdO1xuICAgICAgaWYgKHJvb3RQYXRoKVxuICAgICAgICBwYXRoRWxlbWVudC5wdXNoKHJvb3RQYXRoKTtcbiAgICAgIHBhdGhFbGVtZW50LnB1c2gocGFyc2VkTmFtZS5uYW1lICsgJy9zdGF0aWMvbWVkaWEnKTtcblxuICAgICAgY29uc3QgcGF0aCA9IHBhdGhFbGVtZW50LmpvaW4oJy8nKSArICcvJztcbiAgICAgIG9uRWFjaChhc3NldHNEaXIsIHBhdGgpO1xuICAgICAgbG9nLmluZm8oJ2Fzc2V0czogJyArIHBhdGggKyAnIC0+ICcgKyBhc3NldHNEaXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBhc3NldHNGb2xkZXIgPSBqc29uLmRyID9cbiAgICAgICAgKGpzb24uZHIuYXNzZXRzRGlyID8ganNvbi5kci5hc3NldHNEaXIgOiAnYXNzZXRzJylcbiAgICAgICAgICA6J2Fzc2V0cyc7XG5cbiAgICAgIGxldCBhc3NldHNEaXIgPSBQYXRoLnJlc29sdmUocGFja2FnZVBhdGgsIGFzc2V0c0ZvbGRlcik7XG4gICAgICBsZXQgYXNzZXRzRGlyQ29uZmlndXJlZCA9IGFwaS5jb25maWcoKS5vdXRwdXRQYXRoTWFwW25hbWVdO1xuXG4gICAgICBpZiAoYXNzZXRzRGlyQ29uZmlndXJlZCAhPSBudWxsKVxuICAgICAgICBhc3NldHNEaXJDb25maWd1cmVkID0gXy50cmltKGFzc2V0c0RpckNvbmZpZ3VyZWQsICcvJyk7XG4gICAgICBlbHNlIGlmIChqc29uLmRyICYmIGpzb24uZHIubmdSb3V0ZXJQYXRoKSB7XG4gICAgICAgIGFzc2V0c0RpckNvbmZpZ3VyZWQgPSBfLnRyaW0oanNvbi5kci5uZ1JvdXRlclBhdGgsICcvJyk7XG4gICAgICAgIGxvZy5pbmZvKHBhY2thZ2VQYXRoICsgYC9wYWNrYWdlLmpzb24gY29udGFpbnMgXCJkci5uZ1JvdXRlclBhdGhcIiwgYXNzZXRzIGRpcmVjdG9yeSBpcyBjaGFuZ2VkIHRvIFwiJHthc3NldHNEaXJDb25maWd1cmVkfVwiYCk7XG4gICAgICB9XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhhc3NldHNEaXIpKSB7XG4gICAgICAgIGFzc2V0c0RpciA9IGZzLnJlYWxwYXRoU3luYyhhc3NldHNEaXIpO1xuICAgICAgICB2YXIgcGF0aEVsZW1lbnQgPSBbXTtcbiAgICAgICAgaWYgKHJvb3RQYXRoKVxuICAgICAgICAgIHBhdGhFbGVtZW50LnB1c2gocm9vdFBhdGgpO1xuXG4gICAgICAgIGlmIChhc3NldHNEaXJDb25maWd1cmVkID09IG51bGwpXG4gICAgICAgICAgcGF0aEVsZW1lbnQucHVzaChwYXJzZWROYW1lLm5hbWUpO1xuICAgICAgICBlbHNlIGlmIChhc3NldHNEaXJDb25maWd1cmVkICE9PSAnJylcbiAgICAgICAgICBwYXRoRWxlbWVudC5wdXNoKGFzc2V0c0RpckNvbmZpZ3VyZWQpO1xuXG4gICAgICAgIGxldCBwYXRoID0gcGF0aEVsZW1lbnQuam9pbignLycpO1xuICAgICAgICBpZiAocGF0aC5sZW5ndGggPiAxKVxuICAgICAgICAgIHBhdGggKz0gJy8nO1xuICAgICAgICBsb2cuaW5mbygnYXNzZXRzOiAnICsgcGF0aCArICcgLT4gJyArIGFzc2V0c0Rpcik7XG4gICAgICAgIG9uRWFjaChhc3NldHNEaXIsIHBhdGgpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59XG4iXX0=