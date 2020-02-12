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
    const rootPath = lodash_1.default.trimEnd(url_1.parse(deployUrl).pathname || '', '/');
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2Rldi1zZXJ2ZS1hc3NldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMERBQTBCO0FBRTFCLDZCQUEwQjtBQUMxQiw0REFBdUI7QUFDdkIsd0RBQXdCO0FBQ3hCLG9EQUFvQjtBQUNwQix5REFBeUQ7QUFDekQsaUNBQWlDO0FBRWpDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBSyxDQUFDLFdBQVcsR0FBRyxtQkFBbUIsQ0FBQyxDQUFDO0FBRWpGLE1BQU0sR0FBRyxHQUFHLGVBQXFDLENBQUM7QUFFbEQseURBQXlEO0FBQ3pELHVDQUF1QztBQUN2QyxnRUFBZ0U7QUFDaEUsc0NBQXNDO0FBQ3RDLHlHQUF5RztBQUN6RyxrR0FBa0c7QUFDbEcsNERBQTREO0FBQzVELGtFQUFrRTtBQUVsRSxnQ0FBZ0M7QUFDaEMsa0RBQWtEO0FBRWxELHNDQUFzQztBQUN0Qyw4QkFBOEI7QUFDOUIsc0JBQXNCO0FBQ3RCLHNDQUFzQztBQUV0QyxrQ0FBa0M7QUFDbEMsNkNBQTZDO0FBQzdDLHNDQUFzQztBQUN0QywwQ0FBMEM7QUFFMUMsMENBQTBDO0FBQzFDLDZCQUE2QjtBQUM3Qix1QkFBdUI7QUFDdkIseURBQXlEO0FBRXpELDREQUE0RDtBQUM1RCxRQUFRO0FBQ1IsUUFBUTtBQUNSLElBQUk7QUFFSixTQUFnQixvQkFBb0IsQ0FBQyxTQUFpQixFQUFFLE1BQWdEO0lBQ3RHLE1BQU0sUUFBUSxHQUFHLGdCQUFDLENBQUMsT0FBTyxDQUFDLFdBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFRLElBQUksRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ2pFLEdBQUcsQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUM5QixDQUFDLElBQVksRUFBRSxTQUFpQixFQUFFLFVBQTBCLEVBQUUsSUFBUyxFQUFFLFdBQW1CLEVBQUUsRUFBRTtRQUNoRyxJQUFJLFlBQVksR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztRQUMzRixJQUFJLFNBQVMsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUN4RCxJQUFJLFlBQVksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUUzRCxJQUFJLFlBQVksSUFBSSxJQUFJO1lBQ3RCLFlBQVksR0FBRyxnQkFBQyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFFM0MsSUFBSSxZQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQzVCLFNBQVMsR0FBRyxZQUFFLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3ZDLElBQUksV0FBVyxHQUFHLEVBQUUsQ0FBQztZQUNyQixJQUFJLFFBQVE7Z0JBQ1YsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUU3QixJQUFJLFlBQVksSUFBSSxJQUFJO2dCQUN0QixXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDL0IsSUFBSSxZQUFZLEtBQUssRUFBRTtnQkFDMUIsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUVqQyxJQUFJLElBQUksR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2pDLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDO2dCQUNqQixJQUFJLElBQUksR0FBRyxDQUFDO1lBQ2QsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxHQUFHLE1BQU0sR0FBRyxTQUFTLENBQUMsQ0FBQztZQUNqRCxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQ3pCO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBN0JELG9EQTZCQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2Rldi1zZXJ2ZS1hc3NldHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgX19hcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHtFeHByZXNzQXBwQXBpfSBmcm9tICdAZHItY29yZS9leHByZXNzLWFwcCc7XG5pbXBvcnQge3BhcnNlfSBmcm9tICd1cmwnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbi8vIGltcG9ydCB7Y3JlYXRlU3RhdGljUm91dGV9IGZyb20gJy4vc3RhdGljLW1pZGRsZXdhcmUnO1xuLy8gaW1wb3J0IGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XG5cbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihfX2FwaS5wYWNrYWdlTmFtZSArICcuZGV2LXNlcnZlLWFzc2V0cycpO1xuXG5jb25zdCBhcGkgPSBfX2FwaSBhcyBFeHByZXNzQXBwQXBpICYgdHlwZW9mIF9fYXBpO1xuXG4vLyBleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBzZXR1cEFzc2V0cyhkZXBsb3lVcmw6IHN0cmluZyxcbi8vICAgcm91dGVVc2U6IGV4cHJlc3MuUm91dGVyWyd1c2UnXSkge1xuLy8gICBjb25zdCByb290UGF0aCA9IF8udHJpbUVuZChwYXJzZShkZXBsb3lVcmwpLnBhdGhuYW1lLCAnLycpO1xuLy8gICBhcGkucGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcyhcbi8vICAgICAobmFtZTogc3RyaW5nLCBlbnRyeVBhdGg6IHN0cmluZywgcGFyc2VkTmFtZToge25hbWU6IHN0cmluZ30sIGpzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykgPT4ge1xuLy8gICAgIHZhciBhc3NldHNGb2xkZXIgPSBqc29uLmRyID8gKGpzb24uZHIuYXNzZXRzRGlyID8ganNvbi5kci5hc3NldHNEaXIgOiAnYXNzZXRzJykgOiAnYXNzZXRzJztcbi8vICAgICB2YXIgYXNzZXRzRGlyID0gUGF0aC5qb2luKHBhY2thZ2VQYXRoLCBhc3NldHNGb2xkZXIpO1xuLy8gICAgIHZhciBhc3NldHNEaXJNYXAgPSBhcGkuY29uZmlnLmdldCgnb3V0cHV0UGF0aE1hcC4nICsgbmFtZSk7XG5cbi8vICAgICBpZiAoYXNzZXRzRGlyTWFwICE9IG51bGwpXG4vLyAgICAgICBhc3NldHNEaXJNYXAgPSBfLnRyaW0oYXNzZXRzRGlyTWFwLCAnLycpO1xuXG4vLyAgICAgaWYgKGZzLmV4aXN0c1N5bmMoYXNzZXRzRGlyKSkge1xuLy8gICAgICAgdmFyIHBhdGhFbGVtZW50ID0gW107XG4vLyAgICAgICBpZiAocm9vdFBhdGgpXG4vLyAgICAgICAgIHBhdGhFbGVtZW50LnB1c2gocm9vdFBhdGgpO1xuXG4vLyAgICAgICBpZiAoYXNzZXRzRGlyTWFwID09IG51bGwpXG4vLyAgICAgICAgIHBhdGhFbGVtZW50LnB1c2gocGFyc2VkTmFtZS5uYW1lKTtcbi8vICAgICAgIGVsc2UgaWYgKGFzc2V0c0Rpck1hcCAhPT0gJycpXG4vLyAgICAgICAgIHBhdGhFbGVtZW50LnB1c2goYXNzZXRzRGlyTWFwKTtcblxuLy8gICAgICAgdmFyIHBhdGggPSBwYXRoRWxlbWVudC5qb2luKCcvJyk7XG4vLyAgICAgICBpZiAocGF0aC5sZW5ndGggPiAxKVxuLy8gICAgICAgICBwYXRoICs9ICcvJztcbi8vICAgICAgIGxvZy5pbmZvKCdyb3V0ZSAvJyArIHBhdGggKyAnIC0+ICcgKyBhc3NldHNEaXIpO1xuXG4vLyAgICAgICByb3V0ZVVzZSgnLycgKyBwYXRoLCBjcmVhdGVTdGF0aWNSb3V0ZShhc3NldHNEaXIpKTtcbi8vICAgICB9XG4vLyAgIH0pO1xuLy8gfVxuXG5leHBvcnQgZnVuY3Rpb24gcGFja2FnZUFzc2V0c0ZvbGRlcnMoZGVwbG95VXJsOiBzdHJpbmcsIG9uRWFjaDogKGRpcjogc3RyaW5nLCBvdXRwdXREaXI6IHN0cmluZykgPT4gdm9pZCkge1xuICBjb25zdCByb290UGF0aCA9IF8udHJpbUVuZChwYXJzZShkZXBsb3lVcmwpLnBhdGhuYW1lIHx8ICcnLCAnLycpO1xuICBhcGkucGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcyhcbiAgICAobmFtZTogc3RyaW5nLCBlbnRyeVBhdGg6IHN0cmluZywgcGFyc2VkTmFtZToge25hbWU6IHN0cmluZ30sIGpzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykgPT4ge1xuICAgIHZhciBhc3NldHNGb2xkZXIgPSBqc29uLmRyID8gKGpzb24uZHIuYXNzZXRzRGlyID8ganNvbi5kci5hc3NldHNEaXIgOiAnYXNzZXRzJykgOiAnYXNzZXRzJztcbiAgICBsZXQgYXNzZXRzRGlyID0gUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoLCBhc3NldHNGb2xkZXIpO1xuICAgIHZhciBhc3NldHNEaXJNYXAgPSBhcGkuY29uZmlnLmdldCgnb3V0cHV0UGF0aE1hcC4nICsgbmFtZSk7XG5cbiAgICBpZiAoYXNzZXRzRGlyTWFwICE9IG51bGwpXG4gICAgICBhc3NldHNEaXJNYXAgPSBfLnRyaW0oYXNzZXRzRGlyTWFwLCAnLycpO1xuXG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoYXNzZXRzRGlyKSkge1xuICAgICAgYXNzZXRzRGlyID0gZnMucmVhbHBhdGhTeW5jKGFzc2V0c0Rpcik7XG4gICAgICB2YXIgcGF0aEVsZW1lbnQgPSBbXTtcbiAgICAgIGlmIChyb290UGF0aClcbiAgICAgICAgcGF0aEVsZW1lbnQucHVzaChyb290UGF0aCk7XG5cbiAgICAgIGlmIChhc3NldHNEaXJNYXAgPT0gbnVsbClcbiAgICAgICAgcGF0aEVsZW1lbnQucHVzaChwYXJzZWROYW1lLm5hbWUpO1xuICAgICAgZWxzZSBpZiAoYXNzZXRzRGlyTWFwICE9PSAnJylcbiAgICAgICAgcGF0aEVsZW1lbnQucHVzaChhc3NldHNEaXJNYXApO1xuXG4gICAgICB2YXIgcGF0aCA9IHBhdGhFbGVtZW50LmpvaW4oJy8nKTtcbiAgICAgIGlmIChwYXRoLmxlbmd0aCA+IDEpXG4gICAgICAgIHBhdGggKz0gJy8nO1xuICAgICAgbG9nLmluZm8oJ2Fzc2V0czogJyArIHBhdGggKyAnIC0+ICcgKyBhc3NldHNEaXIpO1xuICAgICAgb25FYWNoKGFzc2V0c0RpciwgcGF0aCk7XG4gICAgfVxuICB9KTtcbn1cbiJdfQ==
