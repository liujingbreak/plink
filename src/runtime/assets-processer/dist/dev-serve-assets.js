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
            var assetsDirMap = __api_1.default.config.get('outputPathMap.' + name);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2LXNlcnZlLWFzc2V0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRldi1zZXJ2ZS1hc3NldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsa0RBQXdCO0FBQ3hCLDZCQUEwQjtBQUMxQixvREFBdUI7QUFDdkIsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUNwQixxRUFBa0U7QUFDbEUseURBQXlEO0FBQ3pELGlDQUFpQztBQUVqQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsbUJBQW1CLENBQUMsQ0FBQztBQUUvRSxxREFBcUQ7QUFFckQsU0FBZ0Isb0JBQW9CLENBQUMsU0FBaUIsRUFBRSxNQUFnRDtJQUN0RyxNQUFNLFFBQVEsR0FBRyxnQkFBQyxDQUFDLE9BQU8sQ0FBQyxXQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxJQUFJLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNqRSwrQkFBZSxDQUNiLENBQUMsSUFBWSxFQUFFLFNBQWlCLEVBQUUsVUFBMEIsRUFBRSxJQUFTLEVBQUUsV0FBbUIsRUFBRSxFQUFFO1FBRWhHLElBQUksSUFBSSxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxFQUFFO1lBQ3ZDLE1BQU0sWUFBWSxHQUFHLFFBQVEsR0FBRyxVQUFVLENBQUMsSUFBSSxHQUFHLGVBQWUsQ0FBQztZQUNsRSxJQUFJLFNBQVMsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUN4RCxJQUFJLENBQUMsWUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUM7Z0JBQzNCLE9BQU87WUFDVCxTQUFTLEdBQUcsWUFBRSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUV2QyxNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUM7WUFDdkIsSUFBSSxRQUFRO2dCQUNWLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDN0IsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxHQUFHLGVBQWUsQ0FBQyxDQUFDO1lBRXBELE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDO1lBQ3pDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDeEIsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxHQUFHLE1BQU0sR0FBRyxTQUFTLENBQUMsQ0FBQztTQUNsRDthQUFNO1lBQ0wsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUMxQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO2dCQUNoRCxDQUFDLENBQUEsUUFBUSxDQUFDO1lBRWQsSUFBSSxTQUFTLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDeEQsSUFBSSxZQUFZLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFFM0QsSUFBSSxZQUFZLElBQUksSUFBSTtnQkFDdEIsWUFBWSxHQUFHLGdCQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQztZQUUzQyxJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQzVCLFNBQVMsR0FBRyxZQUFFLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUN2QyxJQUFJLFdBQVcsR0FBRyxFQUFFLENBQUM7Z0JBQ3JCLElBQUksUUFBUTtvQkFDVixXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUU3QixJQUFJLFlBQVksSUFBSSxJQUFJO29CQUN0QixXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztxQkFDL0IsSUFBSSxZQUFZLEtBQUssRUFBRTtvQkFDMUIsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFFakMsSUFBSSxJQUFJLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDakMsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUM7b0JBQ2pCLElBQUksSUFBSSxHQUFHLENBQUM7Z0JBQ2QsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxHQUFHLE1BQU0sR0FBRyxTQUFTLENBQUMsQ0FBQztnQkFDakQsTUFBTSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQzthQUN6QjtTQUNGO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBbERELG9EQWtEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHtwYXJzZX0gZnJvbSAndXJsJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQge2ZpbmRBbGxQYWNrYWdlc30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLXV0aWxzJztcbi8vIGltcG9ydCB7Y3JlYXRlU3RhdGljUm91dGV9IGZyb20gJy4vc3RhdGljLW1pZGRsZXdhcmUnO1xuLy8gaW1wb3J0IGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XG5cbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmRldi1zZXJ2ZS1hc3NldHMnKTtcblxuLy8gY29uc3QgYXBpID0gX19hcGkgYXMgRXhwcmVzc0FwcEFwaSAmIHR5cGVvZiBfX2FwaTtcblxuZXhwb3J0IGZ1bmN0aW9uIHBhY2thZ2VBc3NldHNGb2xkZXJzKGRlcGxveVVybDogc3RyaW5nLCBvbkVhY2g6IChkaXI6IHN0cmluZywgb3V0cHV0RGlyOiBzdHJpbmcpID0+IHZvaWQpIHtcbiAgY29uc3Qgcm9vdFBhdGggPSBfLnRyaW1FbmQocGFyc2UoZGVwbG95VXJsKS5wYXRobmFtZSB8fCAnJywgJy8nKTtcbiAgZmluZEFsbFBhY2thZ2VzKFxuICAgIChuYW1lOiBzdHJpbmcsIGVudHJ5UGF0aDogc3RyaW5nLCBwYXJzZWROYW1lOiB7bmFtZTogc3RyaW5nfSwganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSA9PiB7XG5cbiAgICBpZiAoanNvbi5kciAmJiBqc29uLmRyWydjcmEtbGliLWVudHJ5J10pIHtcbiAgICAgIGNvbnN0IGFzc2V0c0ZvbGRlciA9ICdidWlsZC8nICsgcGFyc2VkTmFtZS5uYW1lICsgJy9zdGF0aWMvbWVkaWEnO1xuICAgICAgbGV0IGFzc2V0c0RpciA9IFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgYXNzZXRzRm9sZGVyKTtcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhhc3NldHNEaXIpKVxuICAgICAgICByZXR1cm47XG4gICAgICBhc3NldHNEaXIgPSBmcy5yZWFscGF0aFN5bmMoYXNzZXRzRGlyKTtcblxuICAgICAgY29uc3QgcGF0aEVsZW1lbnQgPSBbXTtcbiAgICAgIGlmIChyb290UGF0aClcbiAgICAgICAgcGF0aEVsZW1lbnQucHVzaChyb290UGF0aCk7XG4gICAgICBwYXRoRWxlbWVudC5wdXNoKHBhcnNlZE5hbWUubmFtZSArICcvc3RhdGljL21lZGlhJyk7XG5cbiAgICAgIGNvbnN0IHBhdGggPSBwYXRoRWxlbWVudC5qb2luKCcvJykgKyAnLyc7XG4gICAgICBvbkVhY2goYXNzZXRzRGlyLCBwYXRoKTtcbiAgICAgIGxvZy5pbmZvKCdhc3NldHM6ICcgKyBwYXRoICsgJyAtPiAnICsgYXNzZXRzRGlyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGFzc2V0c0ZvbGRlciA9IGpzb24uZHIgP1xuICAgICAgICAoanNvbi5kci5hc3NldHNEaXIgPyBqc29uLmRyLmFzc2V0c0RpciA6ICdhc3NldHMnKVxuICAgICAgICAgIDonYXNzZXRzJztcblxuICAgICAgbGV0IGFzc2V0c0RpciA9IFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgYXNzZXRzRm9sZGVyKTtcbiAgICAgIHZhciBhc3NldHNEaXJNYXAgPSBhcGkuY29uZmlnLmdldCgnb3V0cHV0UGF0aE1hcC4nICsgbmFtZSk7XG5cbiAgICAgIGlmIChhc3NldHNEaXJNYXAgIT0gbnVsbClcbiAgICAgICAgYXNzZXRzRGlyTWFwID0gXy50cmltKGFzc2V0c0Rpck1hcCwgJy8nKTtcblxuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoYXNzZXRzRGlyKSkge1xuICAgICAgICBhc3NldHNEaXIgPSBmcy5yZWFscGF0aFN5bmMoYXNzZXRzRGlyKTtcbiAgICAgICAgdmFyIHBhdGhFbGVtZW50ID0gW107XG4gICAgICAgIGlmIChyb290UGF0aClcbiAgICAgICAgICBwYXRoRWxlbWVudC5wdXNoKHJvb3RQYXRoKTtcblxuICAgICAgICBpZiAoYXNzZXRzRGlyTWFwID09IG51bGwpXG4gICAgICAgICAgcGF0aEVsZW1lbnQucHVzaChwYXJzZWROYW1lLm5hbWUpO1xuICAgICAgICBlbHNlIGlmIChhc3NldHNEaXJNYXAgIT09ICcnKVxuICAgICAgICAgIHBhdGhFbGVtZW50LnB1c2goYXNzZXRzRGlyTWFwKTtcblxuICAgICAgICB2YXIgcGF0aCA9IHBhdGhFbGVtZW50LmpvaW4oJy8nKTtcbiAgICAgICAgaWYgKHBhdGgubGVuZ3RoID4gMSlcbiAgICAgICAgICBwYXRoICs9ICcvJztcbiAgICAgICAgbG9nLmluZm8oJ2Fzc2V0czogJyArIHBhdGggKyAnIC0+ICcgKyBhc3NldHNEaXIpO1xuICAgICAgICBvbkVhY2goYXNzZXRzRGlyLCBwYXRoKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufVxuIl19