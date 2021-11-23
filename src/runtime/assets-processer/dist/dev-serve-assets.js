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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2LXNlcnZlLWFzc2V0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRldi1zZXJ2ZS1hc3NldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsa0RBQXdCO0FBQ3hCLDZCQUEwQjtBQUMxQixvREFBdUI7QUFDdkIsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUNwQixxRUFBa0U7QUFDbEUseURBQXlEO0FBQ3pELGlDQUFpQztBQUVqQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsbUJBQW1CLENBQUMsQ0FBQztBQUUvRSxxREFBcUQ7QUFDckQ7Ozs7R0FJRztBQUNILFNBQWdCLG9CQUFvQixDQUFDLFNBQWlCLEVBQUUsTUFBZ0Q7SUFDdEcsTUFBTSxRQUFRLEdBQUcsZ0JBQUMsQ0FBQyxPQUFPLENBQUMsSUFBQSxXQUFLLEVBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxJQUFJLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNqRSxJQUFBLCtCQUFlLEVBQ2IsQ0FBQyxJQUFZLEVBQUUsU0FBaUIsRUFBRSxVQUEwQixFQUFFLElBQVMsRUFBRSxXQUFtQixFQUFFLEVBQUU7UUFFaEcsb0RBQW9EO1FBQ3BELElBQUksSUFBSSxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxFQUFFO1lBQ3ZDLE1BQU0sWUFBWSxHQUFHLFFBQVEsR0FBRyxVQUFVLENBQUMsSUFBSSxHQUFHLGVBQWUsQ0FBQztZQUNsRSxJQUFJLFNBQVMsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUN4RCxJQUFJLENBQUMsWUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUM7Z0JBQzNCLE9BQU87WUFDVCxTQUFTLEdBQUcsWUFBRSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUV2QyxNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUM7WUFDdkIsSUFBSSxRQUFRO2dCQUNWLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDN0IsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxHQUFHLGVBQWUsQ0FBQyxDQUFDO1lBRXBELE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDO1lBQ3pDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDeEIsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxHQUFHLE1BQU0sR0FBRyxTQUFTLENBQUMsQ0FBQztTQUNsRDthQUFNO1lBQ0wsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO2dCQUNoRCxDQUFDLENBQUEsUUFBUSxDQUFDO1lBRWQsSUFBSSxTQUFTLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDeEQsSUFBSSxtQkFBbUIsR0FBRyxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRTNELElBQUksbUJBQW1CLElBQUksSUFBSTtnQkFDN0IsbUJBQW1CLEdBQUcsZ0JBQUMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLENBQUM7aUJBQ3BELElBQUksSUFBSSxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRTtnQkFDeEMsbUJBQW1CLEdBQUcsZ0JBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ3hELEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLDZFQUE2RSxtQkFBbUIsR0FBRyxDQUFDLENBQUM7YUFDN0g7WUFDRCxJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQzVCLFNBQVMsR0FBRyxZQUFFLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUN2QyxJQUFJLFdBQVcsR0FBRyxFQUFFLENBQUM7Z0JBQ3JCLElBQUksUUFBUTtvQkFDVixXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUU3QixJQUFJLG1CQUFtQixJQUFJLElBQUk7b0JBQzdCLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUMvQixJQUFJLG1CQUFtQixLQUFLLEVBQUU7b0JBQ2pDLFdBQVcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztnQkFFeEMsSUFBSSxJQUFJLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDakMsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUM7b0JBQ2pCLElBQUksSUFBSSxHQUFHLENBQUM7Z0JBQ2QsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxHQUFHLE1BQU0sR0FBRyxTQUFTLENBQUMsQ0FBQztnQkFDakQsTUFBTSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQzthQUN6QjtTQUNGO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBdERELG9EQXNEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHtwYXJzZX0gZnJvbSAndXJsJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQge2ZpbmRBbGxQYWNrYWdlc30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLXV0aWxzJztcbi8vIGltcG9ydCB7Y3JlYXRlU3RhdGljUm91dGV9IGZyb20gJy4vc3RhdGljLW1pZGRsZXdhcmUnO1xuLy8gaW1wb3J0IGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XG5cbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmRldi1zZXJ2ZS1hc3NldHMnKTtcblxuLy8gY29uc3QgYXBpID0gX19hcGkgYXMgRXhwcmVzc0FwcEFwaSAmIHR5cGVvZiBfX2FwaTtcbi8qKlxuICogVXNlZCBieSBAd2ZoL25nLWFwcC1idWlsZGVyXG4gKiBAcGFyYW0gZGVwbG95VXJsIFxuICogQHBhcmFtIG9uRWFjaCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhY2thZ2VBc3NldHNGb2xkZXJzKGRlcGxveVVybDogc3RyaW5nLCBvbkVhY2g6IChkaXI6IHN0cmluZywgb3V0cHV0RGlyOiBzdHJpbmcpID0+IHZvaWQpIHtcbiAgY29uc3Qgcm9vdFBhdGggPSBfLnRyaW1FbmQocGFyc2UoZGVwbG95VXJsKS5wYXRobmFtZSB8fCAnJywgJy8nKTtcbiAgZmluZEFsbFBhY2thZ2VzKFxuICAgIChuYW1lOiBzdHJpbmcsIGVudHJ5UGF0aDogc3RyaW5nLCBwYXJzZWROYW1lOiB7bmFtZTogc3RyaW5nfSwganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSA9PiB7XG5cbiAgICAvLyBUT0RPOiBzaG91bGQgbW92ZSB0aGlzIHBpZWNlIGxvZ2ljIHRvIGNyYS1zY3JpcHRzXG4gICAgaWYgKGpzb24uZHIgJiYganNvbi5kclsnY3JhLWxpYi1lbnRyeSddKSB7XG4gICAgICBjb25zdCBhc3NldHNGb2xkZXIgPSAnYnVpbGQvJyArIHBhcnNlZE5hbWUubmFtZSArICcvc3RhdGljL21lZGlhJztcbiAgICAgIGxldCBhc3NldHNEaXIgPSBQYXRoLnJlc29sdmUocGFja2FnZVBhdGgsIGFzc2V0c0ZvbGRlcik7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoYXNzZXRzRGlyKSlcbiAgICAgICAgcmV0dXJuO1xuICAgICAgYXNzZXRzRGlyID0gZnMucmVhbHBhdGhTeW5jKGFzc2V0c0Rpcik7XG5cbiAgICAgIGNvbnN0IHBhdGhFbGVtZW50ID0gW107XG4gICAgICBpZiAocm9vdFBhdGgpXG4gICAgICAgIHBhdGhFbGVtZW50LnB1c2gocm9vdFBhdGgpO1xuICAgICAgcGF0aEVsZW1lbnQucHVzaChwYXJzZWROYW1lLm5hbWUgKyAnL3N0YXRpYy9tZWRpYScpO1xuXG4gICAgICBjb25zdCBwYXRoID0gcGF0aEVsZW1lbnQuam9pbignLycpICsgJy8nO1xuICAgICAgb25FYWNoKGFzc2V0c0RpciwgcGF0aCk7XG4gICAgICBsb2cuaW5mbygnYXNzZXRzOiAnICsgcGF0aCArICcgLT4gJyArIGFzc2V0c0Rpcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGFzc2V0c0ZvbGRlciA9IGpzb24uZHIgP1xuICAgICAgICAoanNvbi5kci5hc3NldHNEaXIgPyBqc29uLmRyLmFzc2V0c0RpciA6ICdhc3NldHMnKVxuICAgICAgICAgIDonYXNzZXRzJztcblxuICAgICAgbGV0IGFzc2V0c0RpciA9IFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgYXNzZXRzRm9sZGVyKTtcbiAgICAgIGxldCBhc3NldHNEaXJDb25maWd1cmVkID0gYXBpLmNvbmZpZygpLm91dHB1dFBhdGhNYXBbbmFtZV07XG5cbiAgICAgIGlmIChhc3NldHNEaXJDb25maWd1cmVkICE9IG51bGwpXG4gICAgICAgIGFzc2V0c0RpckNvbmZpZ3VyZWQgPSBfLnRyaW0oYXNzZXRzRGlyQ29uZmlndXJlZCwgJy8nKTtcbiAgICAgIGVsc2UgaWYgKGpzb24uZHIgJiYganNvbi5kci5uZ1JvdXRlclBhdGgpIHtcbiAgICAgICAgYXNzZXRzRGlyQ29uZmlndXJlZCA9IF8udHJpbShqc29uLmRyLm5nUm91dGVyUGF0aCwgJy8nKTtcbiAgICAgICAgbG9nLmluZm8ocGFja2FnZVBhdGggKyBgL3BhY2thZ2UuanNvbiBjb250YWlucyBcImRyLm5nUm91dGVyUGF0aFwiLCBhc3NldHMgZGlyZWN0b3J5IGlzIGNoYW5nZWQgdG8gXCIke2Fzc2V0c0RpckNvbmZpZ3VyZWR9XCJgKTtcbiAgICAgIH1cbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKGFzc2V0c0RpcikpIHtcbiAgICAgICAgYXNzZXRzRGlyID0gZnMucmVhbHBhdGhTeW5jKGFzc2V0c0Rpcik7XG4gICAgICAgIHZhciBwYXRoRWxlbWVudCA9IFtdO1xuICAgICAgICBpZiAocm9vdFBhdGgpXG4gICAgICAgICAgcGF0aEVsZW1lbnQucHVzaChyb290UGF0aCk7XG5cbiAgICAgICAgaWYgKGFzc2V0c0RpckNvbmZpZ3VyZWQgPT0gbnVsbClcbiAgICAgICAgICBwYXRoRWxlbWVudC5wdXNoKHBhcnNlZE5hbWUubmFtZSk7XG4gICAgICAgIGVsc2UgaWYgKGFzc2V0c0RpckNvbmZpZ3VyZWQgIT09ICcnKVxuICAgICAgICAgIHBhdGhFbGVtZW50LnB1c2goYXNzZXRzRGlyQ29uZmlndXJlZCk7XG5cbiAgICAgICAgbGV0IHBhdGggPSBwYXRoRWxlbWVudC5qb2luKCcvJyk7XG4gICAgICAgIGlmIChwYXRoLmxlbmd0aCA+IDEpXG4gICAgICAgICAgcGF0aCArPSAnLyc7XG4gICAgICAgIGxvZy5pbmZvKCdhc3NldHM6ICcgKyBwYXRoICsgJyAtPiAnICsgYXNzZXRzRGlyKTtcbiAgICAgICAgb25FYWNoKGFzc2V0c0RpciwgcGF0aCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn1cbiJdfQ==