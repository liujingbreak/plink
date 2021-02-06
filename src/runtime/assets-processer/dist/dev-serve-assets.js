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
            var assetsDirMap = __api_1.default.config().outputPathMap[name];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2LXNlcnZlLWFzc2V0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRldi1zZXJ2ZS1hc3NldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsa0RBQXdCO0FBQ3hCLDZCQUEwQjtBQUMxQixvREFBdUI7QUFDdkIsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUNwQixxRUFBa0U7QUFDbEUseURBQXlEO0FBQ3pELGlDQUFpQztBQUVqQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsbUJBQW1CLENBQUMsQ0FBQztBQUUvRSxxREFBcUQ7QUFFckQsU0FBZ0Isb0JBQW9CLENBQUMsU0FBaUIsRUFBRSxNQUFnRDtJQUN0RyxNQUFNLFFBQVEsR0FBRyxnQkFBQyxDQUFDLE9BQU8sQ0FBQyxXQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxJQUFJLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNqRSwrQkFBZSxDQUNiLENBQUMsSUFBWSxFQUFFLFNBQWlCLEVBQUUsVUFBMEIsRUFBRSxJQUFTLEVBQUUsV0FBbUIsRUFBRSxFQUFFO1FBRWhHLElBQUksSUFBSSxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxFQUFFO1lBQ3ZDLE1BQU0sWUFBWSxHQUFHLFFBQVEsR0FBRyxVQUFVLENBQUMsSUFBSSxHQUFHLGVBQWUsQ0FBQztZQUNsRSxJQUFJLFNBQVMsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUN4RCxJQUFJLENBQUMsWUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUM7Z0JBQzNCLE9BQU87WUFDVCxTQUFTLEdBQUcsWUFBRSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUV2QyxNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUM7WUFDdkIsSUFBSSxRQUFRO2dCQUNWLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDN0IsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxHQUFHLGVBQWUsQ0FBQyxDQUFDO1lBRXBELE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDO1lBQ3pDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDeEIsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxHQUFHLE1BQU0sR0FBRyxTQUFTLENBQUMsQ0FBQztTQUNsRDthQUFNO1lBQ0wsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUMxQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO2dCQUNoRCxDQUFDLENBQUEsUUFBUSxDQUFDO1lBRWQsSUFBSSxTQUFTLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDeEQsSUFBSSxZQUFZLEdBQUcsZUFBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUVwRCxJQUFJLFlBQVksSUFBSSxJQUFJO2dCQUN0QixZQUFZLEdBQUcsZ0JBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBRTNDLElBQUksWUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRTtnQkFDNUIsU0FBUyxHQUFHLFlBQUUsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ3ZDLElBQUksV0FBVyxHQUFHLEVBQUUsQ0FBQztnQkFDckIsSUFBSSxRQUFRO29CQUNWLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBRTdCLElBQUksWUFBWSxJQUFJLElBQUk7b0JBQ3RCLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUMvQixJQUFJLFlBQVksS0FBSyxFQUFFO29CQUMxQixXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUVqQyxJQUFJLElBQUksR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNqQyxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQztvQkFDakIsSUFBSSxJQUFJLEdBQUcsQ0FBQztnQkFDZCxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLEdBQUcsTUFBTSxHQUFHLFNBQVMsQ0FBQyxDQUFDO2dCQUNqRCxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQ3pCO1NBQ0Y7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFsREQsb0RBa0RDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQge3BhcnNlfSBmcm9tICd1cmwnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7ZmluZEFsbFBhY2thZ2VzfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtdXRpbHMnO1xuLy8gaW1wb3J0IHtjcmVhdGVTdGF0aWNSb3V0ZX0gZnJvbSAnLi9zdGF0aWMtbWlkZGxld2FyZSc7XG4vLyBpbXBvcnQgZXhwcmVzcyBmcm9tICdleHByZXNzJztcblxuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuZGV2LXNlcnZlLWFzc2V0cycpO1xuXG4vLyBjb25zdCBhcGkgPSBfX2FwaSBhcyBFeHByZXNzQXBwQXBpICYgdHlwZW9mIF9fYXBpO1xuXG5leHBvcnQgZnVuY3Rpb24gcGFja2FnZUFzc2V0c0ZvbGRlcnMoZGVwbG95VXJsOiBzdHJpbmcsIG9uRWFjaDogKGRpcjogc3RyaW5nLCBvdXRwdXREaXI6IHN0cmluZykgPT4gdm9pZCkge1xuICBjb25zdCByb290UGF0aCA9IF8udHJpbUVuZChwYXJzZShkZXBsb3lVcmwpLnBhdGhuYW1lIHx8ICcnLCAnLycpO1xuICBmaW5kQWxsUGFja2FnZXMoXG4gICAgKG5hbWU6IHN0cmluZywgZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWU6IHtuYW1lOiBzdHJpbmd9LCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpID0+IHtcblxuICAgIGlmIChqc29uLmRyICYmIGpzb24uZHJbJ2NyYS1saWItZW50cnknXSkge1xuICAgICAgY29uc3QgYXNzZXRzRm9sZGVyID0gJ2J1aWxkLycgKyBwYXJzZWROYW1lLm5hbWUgKyAnL3N0YXRpYy9tZWRpYSc7XG4gICAgICBsZXQgYXNzZXRzRGlyID0gUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoLCBhc3NldHNGb2xkZXIpO1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGFzc2V0c0RpcikpXG4gICAgICAgIHJldHVybjtcbiAgICAgIGFzc2V0c0RpciA9IGZzLnJlYWxwYXRoU3luYyhhc3NldHNEaXIpO1xuXG4gICAgICBjb25zdCBwYXRoRWxlbWVudCA9IFtdO1xuICAgICAgaWYgKHJvb3RQYXRoKVxuICAgICAgICBwYXRoRWxlbWVudC5wdXNoKHJvb3RQYXRoKTtcbiAgICAgIHBhdGhFbGVtZW50LnB1c2gocGFyc2VkTmFtZS5uYW1lICsgJy9zdGF0aWMvbWVkaWEnKTtcblxuICAgICAgY29uc3QgcGF0aCA9IHBhdGhFbGVtZW50LmpvaW4oJy8nKSArICcvJztcbiAgICAgIG9uRWFjaChhc3NldHNEaXIsIHBhdGgpO1xuICAgICAgbG9nLmluZm8oJ2Fzc2V0czogJyArIHBhdGggKyAnIC0+ICcgKyBhc3NldHNEaXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYXNzZXRzRm9sZGVyID0ganNvbi5kciA/XG4gICAgICAgIChqc29uLmRyLmFzc2V0c0RpciA/IGpzb24uZHIuYXNzZXRzRGlyIDogJ2Fzc2V0cycpXG4gICAgICAgICAgOidhc3NldHMnO1xuXG4gICAgICBsZXQgYXNzZXRzRGlyID0gUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoLCBhc3NldHNGb2xkZXIpO1xuICAgICAgdmFyIGFzc2V0c0Rpck1hcCA9IGFwaS5jb25maWcoKS5vdXRwdXRQYXRoTWFwW25hbWVdO1xuXG4gICAgICBpZiAoYXNzZXRzRGlyTWFwICE9IG51bGwpXG4gICAgICAgIGFzc2V0c0Rpck1hcCA9IF8udHJpbShhc3NldHNEaXJNYXAsICcvJyk7XG5cbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKGFzc2V0c0RpcikpIHtcbiAgICAgICAgYXNzZXRzRGlyID0gZnMucmVhbHBhdGhTeW5jKGFzc2V0c0Rpcik7XG4gICAgICAgIHZhciBwYXRoRWxlbWVudCA9IFtdO1xuICAgICAgICBpZiAocm9vdFBhdGgpXG4gICAgICAgICAgcGF0aEVsZW1lbnQucHVzaChyb290UGF0aCk7XG5cbiAgICAgICAgaWYgKGFzc2V0c0Rpck1hcCA9PSBudWxsKVxuICAgICAgICAgIHBhdGhFbGVtZW50LnB1c2gocGFyc2VkTmFtZS5uYW1lKTtcbiAgICAgICAgZWxzZSBpZiAoYXNzZXRzRGlyTWFwICE9PSAnJylcbiAgICAgICAgICBwYXRoRWxlbWVudC5wdXNoKGFzc2V0c0Rpck1hcCk7XG5cbiAgICAgICAgdmFyIHBhdGggPSBwYXRoRWxlbWVudC5qb2luKCcvJyk7XG4gICAgICAgIGlmIChwYXRoLmxlbmd0aCA+IDEpXG4gICAgICAgICAgcGF0aCArPSAnLyc7XG4gICAgICAgIGxvZy5pbmZvKCdhc3NldHM6ICcgKyBwYXRoICsgJyAtPiAnICsgYXNzZXRzRGlyKTtcbiAgICAgICAgb25FYWNoKGFzc2V0c0RpciwgcGF0aCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn1cbiJdfQ==