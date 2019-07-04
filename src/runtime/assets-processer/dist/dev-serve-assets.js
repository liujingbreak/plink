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
// export default function setupAssets(deployUrl: string,
//   routeUse: express.Router['use']) {
//   const rootPath = _.trimEnd(parse(deployUrl).pathname, '/');
//   api.packageUtils.findAllPackages(
//     (name: string, entryPath: string, parsedName: {name: string}, json: any, packagePath: string) => {
//     var assetsFolder = json.dr ? (json.dr.assetsDir ? json.dr.assetsDir : 'assets') : 'assets';
//     var assetsDir = Path.join(packagePath, assetsFolder);
//     var assetsDirMap = api.config.get('outputPathMap.' + name);
//     if (assetsDirMap != null)
//       assetsDirMap = _.trim(assetsDirMap, '/');
//     if (fs.existsSync(assetsDir)) {
//       var pathElement = [];
//       if (rootPath)
//         pathElement.push(rootPath);
//       if (assetsDirMap == null)
//         pathElement.push(parsedName.name);
//       else if (assetsDirMap !== '')
//         pathElement.push(assetsDirMap);
//       var path = pathElement.join('/');
//       if (path.length > 1)
//         path += '/';
//       log.info('route /' + path + ' -> ' + assetsDir);
//       routeUse('/' + path, createStaticRoute(assetsDir));
//     }
//   });
// }
function packageAssetsFolders(deployUrl, onEach) {
    const rootPath = lodash_1.default.trimEnd(url_1.parse(deployUrl).pathname, '/');
    api.packageUtils.findAllPackages((name, entryPath, parsedName, json, packagePath) => {
        var assetsFolder = json.dr ? (json.dr.assetsDir ? json.dr.assetsDir : 'assets') : 'assets';
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
    });
}
exports.packageAssetsFolders = packageAssetsFolders;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2Rldi1zZXJ2ZS1hc3NldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMERBQTBCO0FBRTFCLDZCQUEwQjtBQUMxQiw0REFBdUI7QUFDdkIsd0RBQXdCO0FBQ3hCLG9EQUFvQjtBQUNwQix5REFBeUQ7QUFDekQsaUNBQWlDO0FBRWpDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBSyxDQUFDLFdBQVcsR0FBRyxtQkFBbUIsQ0FBQyxDQUFDO0FBRWpGLE1BQU0sR0FBRyxHQUFHLGVBQXFDLENBQUM7QUFFbEQseURBQXlEO0FBQ3pELHVDQUF1QztBQUN2QyxnRUFBZ0U7QUFDaEUsc0NBQXNDO0FBQ3RDLHlHQUF5RztBQUN6RyxrR0FBa0c7QUFDbEcsNERBQTREO0FBQzVELGtFQUFrRTtBQUVsRSxnQ0FBZ0M7QUFDaEMsa0RBQWtEO0FBRWxELHNDQUFzQztBQUN0Qyw4QkFBOEI7QUFDOUIsc0JBQXNCO0FBQ3RCLHNDQUFzQztBQUV0QyxrQ0FBa0M7QUFDbEMsNkNBQTZDO0FBQzdDLHNDQUFzQztBQUN0QywwQ0FBMEM7QUFFMUMsMENBQTBDO0FBQzFDLDZCQUE2QjtBQUM3Qix1QkFBdUI7QUFDdkIseURBQXlEO0FBRXpELDREQUE0RDtBQUM1RCxRQUFRO0FBQ1IsUUFBUTtBQUNSLElBQUk7QUFFSixTQUFnQixvQkFBb0IsQ0FBQyxTQUFpQixFQUFFLE1BQWdEO0lBQ3RHLE1BQU0sUUFBUSxHQUFHLGdCQUFDLENBQUMsT0FBTyxDQUFDLFdBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDM0QsR0FBRyxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQzlCLENBQUMsSUFBWSxFQUFFLFNBQWlCLEVBQUUsVUFBMEIsRUFBRSxJQUFTLEVBQUUsV0FBbUIsRUFBRSxFQUFFO1FBQ2hHLElBQUksWUFBWSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO1FBQzNGLElBQUksU0FBUyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3hELElBQUksWUFBWSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxDQUFDO1FBRTNELElBQUksWUFBWSxJQUFJLElBQUk7WUFDdEIsWUFBWSxHQUFHLGdCQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUUzQyxJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDNUIsU0FBUyxHQUFHLFlBQUUsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDdkMsSUFBSSxXQUFXLEdBQUcsRUFBRSxDQUFDO1lBQ3JCLElBQUksUUFBUTtnQkFDVixXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRTdCLElBQUksWUFBWSxJQUFJLElBQUk7Z0JBQ3RCLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUMvQixJQUFJLFlBQVksS0FBSyxFQUFFO2dCQUMxQixXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBRWpDLElBQUksSUFBSSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDakMsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUM7Z0JBQ2pCLElBQUksSUFBSSxHQUFHLENBQUM7WUFDZCxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLEdBQUcsTUFBTSxHQUFHLFNBQVMsQ0FBQyxDQUFDO1lBQ2pELE1BQU0sQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDekI7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUE3QkQsb0RBNkJDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvZGV2LXNlcnZlLWFzc2V0cy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBfX2FwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQge0V4cHJlc3NBcHBBcGl9IGZyb20gJ0Bkci1jb3JlL2V4cHJlc3MtYXBwJztcbmltcG9ydCB7cGFyc2V9IGZyb20gJ3VybCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuLy8gaW1wb3J0IHtjcmVhdGVTdGF0aWNSb3V0ZX0gZnJvbSAnLi9zdGF0aWMtbWlkZGxld2FyZSc7XG4vLyBpbXBvcnQgZXhwcmVzcyBmcm9tICdleHByZXNzJztcblxuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKF9fYXBpLnBhY2thZ2VOYW1lICsgJy5kZXYtc2VydmUtYXNzZXRzJyk7XG5cbmNvbnN0IGFwaSA9IF9fYXBpIGFzIEV4cHJlc3NBcHBBcGkgJiB0eXBlb2YgX19hcGk7XG5cbi8vIGV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHNldHVwQXNzZXRzKGRlcGxveVVybDogc3RyaW5nLFxuLy8gICByb3V0ZVVzZTogZXhwcmVzcy5Sb3V0ZXJbJ3VzZSddKSB7XG4vLyAgIGNvbnN0IHJvb3RQYXRoID0gXy50cmltRW5kKHBhcnNlKGRlcGxveVVybCkucGF0aG5hbWUsICcvJyk7XG4vLyAgIGFwaS5wYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKFxuLy8gICAgIChuYW1lOiBzdHJpbmcsIGVudHJ5UGF0aDogc3RyaW5nLCBwYXJzZWROYW1lOiB7bmFtZTogc3RyaW5nfSwganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSA9PiB7XG4vLyAgICAgdmFyIGFzc2V0c0ZvbGRlciA9IGpzb24uZHIgPyAoanNvbi5kci5hc3NldHNEaXIgPyBqc29uLmRyLmFzc2V0c0RpciA6ICdhc3NldHMnKSA6ICdhc3NldHMnO1xuLy8gICAgIHZhciBhc3NldHNEaXIgPSBQYXRoLmpvaW4ocGFja2FnZVBhdGgsIGFzc2V0c0ZvbGRlcik7XG4vLyAgICAgdmFyIGFzc2V0c0Rpck1hcCA9IGFwaS5jb25maWcuZ2V0KCdvdXRwdXRQYXRoTWFwLicgKyBuYW1lKTtcblxuLy8gICAgIGlmIChhc3NldHNEaXJNYXAgIT0gbnVsbClcbi8vICAgICAgIGFzc2V0c0Rpck1hcCA9IF8udHJpbShhc3NldHNEaXJNYXAsICcvJyk7XG5cbi8vICAgICBpZiAoZnMuZXhpc3RzU3luYyhhc3NldHNEaXIpKSB7XG4vLyAgICAgICB2YXIgcGF0aEVsZW1lbnQgPSBbXTtcbi8vICAgICAgIGlmIChyb290UGF0aClcbi8vICAgICAgICAgcGF0aEVsZW1lbnQucHVzaChyb290UGF0aCk7XG5cbi8vICAgICAgIGlmIChhc3NldHNEaXJNYXAgPT0gbnVsbClcbi8vICAgICAgICAgcGF0aEVsZW1lbnQucHVzaChwYXJzZWROYW1lLm5hbWUpO1xuLy8gICAgICAgZWxzZSBpZiAoYXNzZXRzRGlyTWFwICE9PSAnJylcbi8vICAgICAgICAgcGF0aEVsZW1lbnQucHVzaChhc3NldHNEaXJNYXApO1xuXG4vLyAgICAgICB2YXIgcGF0aCA9IHBhdGhFbGVtZW50LmpvaW4oJy8nKTtcbi8vICAgICAgIGlmIChwYXRoLmxlbmd0aCA+IDEpXG4vLyAgICAgICAgIHBhdGggKz0gJy8nO1xuLy8gICAgICAgbG9nLmluZm8oJ3JvdXRlIC8nICsgcGF0aCArICcgLT4gJyArIGFzc2V0c0Rpcik7XG5cbi8vICAgICAgIHJvdXRlVXNlKCcvJyArIHBhdGgsIGNyZWF0ZVN0YXRpY1JvdXRlKGFzc2V0c0RpcikpO1xuLy8gICAgIH1cbi8vICAgfSk7XG4vLyB9XG5cbmV4cG9ydCBmdW5jdGlvbiBwYWNrYWdlQXNzZXRzRm9sZGVycyhkZXBsb3lVcmw6IHN0cmluZywgb25FYWNoOiAoZGlyOiBzdHJpbmcsIG91dHB1dERpcjogc3RyaW5nKSA9PiB2b2lkKSB7XG4gIGNvbnN0IHJvb3RQYXRoID0gXy50cmltRW5kKHBhcnNlKGRlcGxveVVybCkucGF0aG5hbWUsICcvJyk7XG4gIGFwaS5wYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKFxuICAgIChuYW1lOiBzdHJpbmcsIGVudHJ5UGF0aDogc3RyaW5nLCBwYXJzZWROYW1lOiB7bmFtZTogc3RyaW5nfSwganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSA9PiB7XG4gICAgdmFyIGFzc2V0c0ZvbGRlciA9IGpzb24uZHIgPyAoanNvbi5kci5hc3NldHNEaXIgPyBqc29uLmRyLmFzc2V0c0RpciA6ICdhc3NldHMnKSA6ICdhc3NldHMnO1xuICAgIGxldCBhc3NldHNEaXIgPSBQYXRoLnJlc29sdmUocGFja2FnZVBhdGgsIGFzc2V0c0ZvbGRlcik7XG4gICAgdmFyIGFzc2V0c0Rpck1hcCA9IGFwaS5jb25maWcuZ2V0KCdvdXRwdXRQYXRoTWFwLicgKyBuYW1lKTtcblxuICAgIGlmIChhc3NldHNEaXJNYXAgIT0gbnVsbClcbiAgICAgIGFzc2V0c0Rpck1hcCA9IF8udHJpbShhc3NldHNEaXJNYXAsICcvJyk7XG5cbiAgICBpZiAoZnMuZXhpc3RzU3luYyhhc3NldHNEaXIpKSB7XG4gICAgICBhc3NldHNEaXIgPSBmcy5yZWFscGF0aFN5bmMoYXNzZXRzRGlyKTtcbiAgICAgIHZhciBwYXRoRWxlbWVudCA9IFtdO1xuICAgICAgaWYgKHJvb3RQYXRoKVxuICAgICAgICBwYXRoRWxlbWVudC5wdXNoKHJvb3RQYXRoKTtcblxuICAgICAgaWYgKGFzc2V0c0Rpck1hcCA9PSBudWxsKVxuICAgICAgICBwYXRoRWxlbWVudC5wdXNoKHBhcnNlZE5hbWUubmFtZSk7XG4gICAgICBlbHNlIGlmIChhc3NldHNEaXJNYXAgIT09ICcnKVxuICAgICAgICBwYXRoRWxlbWVudC5wdXNoKGFzc2V0c0Rpck1hcCk7XG5cbiAgICAgIHZhciBwYXRoID0gcGF0aEVsZW1lbnQuam9pbignLycpO1xuICAgICAgaWYgKHBhdGgubGVuZ3RoID4gMSlcbiAgICAgICAgcGF0aCArPSAnLyc7XG4gICAgICBsb2cuaW5mbygnYXNzZXRzOiAnICsgcGF0aCArICcgLT4gJyArIGFzc2V0c0Rpcik7XG4gICAgICBvbkVhY2goYXNzZXRzRGlyLCBwYXRoKTtcbiAgICB9XG4gIH0pO1xufVxuIl19
