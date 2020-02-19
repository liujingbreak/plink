"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const __api_1 = tslib_1.__importDefault(require("__api"));
const url_1 = require("url");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const path_1 = tslib_1.__importDefault(require("path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
// import {createStaticRoute} from './static-middleware';
// import express from 'express';
const log = require('log4js').getLogger(__api_1.default.packageName + '.dev-serve-assets');
const api = __api_1.default;
function packageAssetsFolders(deployUrl, onEach) {
    const rootPath = lodash_1.default.trimEnd(url_1.parse(deployUrl).pathname || '', '/');
    api.packageUtils.findAllPackages((name, entryPath, parsedName, json, packagePath) => {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2Rldi1zZXJ2ZS1hc3NldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMERBQTBCO0FBRTFCLDZCQUEwQjtBQUMxQiw0REFBdUI7QUFDdkIsd0RBQXdCO0FBQ3hCLG9EQUFvQjtBQUNwQix5REFBeUQ7QUFDekQsaUNBQWlDO0FBRWpDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBSyxDQUFDLFdBQVcsR0FBRyxtQkFBbUIsQ0FBQyxDQUFDO0FBRWpGLE1BQU0sR0FBRyxHQUFHLGVBQXFDLENBQUM7QUFFbEQsU0FBZ0Isb0JBQW9CLENBQUMsU0FBaUIsRUFBRSxNQUFnRDtJQUN0RyxNQUFNLFFBQVEsR0FBRyxnQkFBQyxDQUFDLE9BQU8sQ0FBQyxXQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxJQUFJLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNqRSxHQUFHLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FDOUIsQ0FBQyxJQUFZLEVBQUUsU0FBaUIsRUFBRSxVQUEwQixFQUFFLElBQVMsRUFBRSxXQUFtQixFQUFFLEVBQUU7UUFFaEcsSUFBSSxJQUFJLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLEVBQUU7WUFDdkMsTUFBTSxZQUFZLEdBQUcsUUFBUSxHQUFHLFVBQVUsQ0FBQyxJQUFJLEdBQUcsZUFBZSxDQUFDO1lBQ2xFLElBQUksU0FBUyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ3hELElBQUksQ0FBQyxZQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQztnQkFDM0IsT0FBTztZQUNULFNBQVMsR0FBRyxZQUFFLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRXZDLE1BQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQztZQUN2QixJQUFJLFFBQVE7Z0JBQ1YsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUM3QixXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEdBQUcsZUFBZSxDQUFDLENBQUM7WUFFcEQsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7WUFDekMsTUFBTSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN4QixHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLEdBQUcsTUFBTSxHQUFHLFNBQVMsQ0FBQyxDQUFDO1NBQ2xEO2FBQU07WUFDTCxJQUFJLFlBQVksR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQzFCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7Z0JBQ2hELENBQUMsQ0FBQSxRQUFRLENBQUM7WUFFZCxJQUFJLFNBQVMsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUN4RCxJQUFJLFlBQVksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsQ0FBQztZQUUzRCxJQUFJLFlBQVksSUFBSSxJQUFJO2dCQUN0QixZQUFZLEdBQUcsZ0JBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBRTNDLElBQUksWUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRTtnQkFDNUIsU0FBUyxHQUFHLFlBQUUsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ3ZDLElBQUksV0FBVyxHQUFHLEVBQUUsQ0FBQztnQkFDckIsSUFBSSxRQUFRO29CQUNWLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBRTdCLElBQUksWUFBWSxJQUFJLElBQUk7b0JBQ3RCLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUMvQixJQUFJLFlBQVksS0FBSyxFQUFFO29CQUMxQixXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUVqQyxJQUFJLElBQUksR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNqQyxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQztvQkFDakIsSUFBSSxJQUFJLEdBQUcsQ0FBQztnQkFDZCxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLEdBQUcsTUFBTSxHQUFHLFNBQVMsQ0FBQyxDQUFDO2dCQUNqRCxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQ3pCO1NBQ0Y7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFsREQsb0RBa0RDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvZGV2LXNlcnZlLWFzc2V0cy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBfX2FwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQge0V4cHJlc3NBcHBBcGl9IGZyb20gJ0Bkci1jb3JlL2V4cHJlc3MtYXBwJztcbmltcG9ydCB7cGFyc2V9IGZyb20gJ3VybCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuLy8gaW1wb3J0IHtjcmVhdGVTdGF0aWNSb3V0ZX0gZnJvbSAnLi9zdGF0aWMtbWlkZGxld2FyZSc7XG4vLyBpbXBvcnQgZXhwcmVzcyBmcm9tICdleHByZXNzJztcblxuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKF9fYXBpLnBhY2thZ2VOYW1lICsgJy5kZXYtc2VydmUtYXNzZXRzJyk7XG5cbmNvbnN0IGFwaSA9IF9fYXBpIGFzIEV4cHJlc3NBcHBBcGkgJiB0eXBlb2YgX19hcGk7XG5cbmV4cG9ydCBmdW5jdGlvbiBwYWNrYWdlQXNzZXRzRm9sZGVycyhkZXBsb3lVcmw6IHN0cmluZywgb25FYWNoOiAoZGlyOiBzdHJpbmcsIG91dHB1dERpcjogc3RyaW5nKSA9PiB2b2lkKSB7XG4gIGNvbnN0IHJvb3RQYXRoID0gXy50cmltRW5kKHBhcnNlKGRlcGxveVVybCkucGF0aG5hbWUgfHwgJycsICcvJyk7XG4gIGFwaS5wYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKFxuICAgIChuYW1lOiBzdHJpbmcsIGVudHJ5UGF0aDogc3RyaW5nLCBwYXJzZWROYW1lOiB7bmFtZTogc3RyaW5nfSwganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSA9PiB7XG5cbiAgICBpZiAoanNvbi5kciAmJiBqc29uLmRyWydjcmEtbGliLWVudHJ5J10pIHtcbiAgICAgIGNvbnN0IGFzc2V0c0ZvbGRlciA9ICdidWlsZC8nICsgcGFyc2VkTmFtZS5uYW1lICsgJy9zdGF0aWMvbWVkaWEnO1xuICAgICAgbGV0IGFzc2V0c0RpciA9IFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgYXNzZXRzRm9sZGVyKTtcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhhc3NldHNEaXIpKVxuICAgICAgICByZXR1cm47XG4gICAgICBhc3NldHNEaXIgPSBmcy5yZWFscGF0aFN5bmMoYXNzZXRzRGlyKTtcblxuICAgICAgY29uc3QgcGF0aEVsZW1lbnQgPSBbXTtcbiAgICAgIGlmIChyb290UGF0aClcbiAgICAgICAgcGF0aEVsZW1lbnQucHVzaChyb290UGF0aCk7XG4gICAgICBwYXRoRWxlbWVudC5wdXNoKHBhcnNlZE5hbWUubmFtZSArICcvc3RhdGljL21lZGlhJyk7XG5cbiAgICAgIGNvbnN0IHBhdGggPSBwYXRoRWxlbWVudC5qb2luKCcvJykgKyAnLyc7XG4gICAgICBvbkVhY2goYXNzZXRzRGlyLCBwYXRoKTtcbiAgICAgIGxvZy5pbmZvKCdhc3NldHM6ICcgKyBwYXRoICsgJyAtPiAnICsgYXNzZXRzRGlyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGFzc2V0c0ZvbGRlciA9IGpzb24uZHIgP1xuICAgICAgICAoanNvbi5kci5hc3NldHNEaXIgPyBqc29uLmRyLmFzc2V0c0RpciA6ICdhc3NldHMnKVxuICAgICAgICAgIDonYXNzZXRzJztcblxuICAgICAgbGV0IGFzc2V0c0RpciA9IFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgYXNzZXRzRm9sZGVyKTtcbiAgICAgIHZhciBhc3NldHNEaXJNYXAgPSBhcGkuY29uZmlnLmdldCgnb3V0cHV0UGF0aE1hcC4nICsgbmFtZSk7XG5cbiAgICAgIGlmIChhc3NldHNEaXJNYXAgIT0gbnVsbClcbiAgICAgICAgYXNzZXRzRGlyTWFwID0gXy50cmltKGFzc2V0c0Rpck1hcCwgJy8nKTtcblxuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoYXNzZXRzRGlyKSkge1xuICAgICAgICBhc3NldHNEaXIgPSBmcy5yZWFscGF0aFN5bmMoYXNzZXRzRGlyKTtcbiAgICAgICAgdmFyIHBhdGhFbGVtZW50ID0gW107XG4gICAgICAgIGlmIChyb290UGF0aClcbiAgICAgICAgICBwYXRoRWxlbWVudC5wdXNoKHJvb3RQYXRoKTtcblxuICAgICAgICBpZiAoYXNzZXRzRGlyTWFwID09IG51bGwpXG4gICAgICAgICAgcGF0aEVsZW1lbnQucHVzaChwYXJzZWROYW1lLm5hbWUpO1xuICAgICAgICBlbHNlIGlmIChhc3NldHNEaXJNYXAgIT09ICcnKVxuICAgICAgICAgIHBhdGhFbGVtZW50LnB1c2goYXNzZXRzRGlyTWFwKTtcblxuICAgICAgICB2YXIgcGF0aCA9IHBhdGhFbGVtZW50LmpvaW4oJy8nKTtcbiAgICAgICAgaWYgKHBhdGgubGVuZ3RoID4gMSlcbiAgICAgICAgICBwYXRoICs9ICcvJztcbiAgICAgICAgbG9nLmluZm8oJ2Fzc2V0czogJyArIHBhdGggKyAnIC0+ICcgKyBhc3NldHNEaXIpO1xuICAgICAgICBvbkVhY2goYXNzZXRzRGlyLCBwYXRoKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufVxuIl19
