"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const __api_1 = tslib_1.__importDefault(require("__api"));
const url_1 = require("url");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const path_1 = tslib_1.__importDefault(require("path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const static_middleware_1 = require("./static-middleware");
const log = require('log4js').getLogger(__api_1.default.packageName + '.dev-serve-assets');
const api = __api_1.default;
function setupAssets(deployUrl, routeUse) {
    const rootPath = lodash_1.default.trimEnd(url_1.parse(deployUrl).pathname, '/');
    api.packageUtils.findAllPackages((name, entryPath, parsedName, json, packagePath) => {
        var assetsFolder = json.dr ? (json.dr.assetsDir ? json.dr.assetsDir : 'assets') : 'assets';
        var assetsDir = path_1.default.join(packagePath, assetsFolder);
        var assetsDirMap = api.config.get('outputPathMap.' + name);
        if (assetsDirMap != null)
            assetsDirMap = lodash_1.default.trim(assetsDirMap, '/');
        if (fs_1.default.existsSync(assetsDir)) {
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
            log.info('route ' + path + ' -> ' + assetsDir);
            routeUse(path, static_middleware_1.createStaticRoute(assetsDir));
        }
    });
}
exports.default = setupAssets;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2Rldi1zZXJ2ZS1hc3NldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMERBQTBCO0FBRTFCLDZCQUEwQjtBQUMxQiw0REFBdUI7QUFDdkIsd0RBQXdCO0FBQ3hCLG9EQUFvQjtBQUNwQiwyREFBc0Q7QUFHdEQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFLLENBQUMsV0FBVyxHQUFHLG1CQUFtQixDQUFDLENBQUM7QUFFakYsTUFBTSxHQUFHLEdBQUcsZUFBcUMsQ0FBQztBQUVsRCxTQUF3QixXQUFXLENBQUMsU0FBaUIsRUFDcEQsUUFBK0I7SUFDL0IsTUFBTSxRQUFRLEdBQUcsZ0JBQUMsQ0FBQyxPQUFPLENBQUMsV0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUMzRCxHQUFHLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FDL0IsQ0FBQyxJQUFZLEVBQUUsU0FBaUIsRUFBRSxVQUEwQixFQUFFLElBQVMsRUFBRSxXQUFtQixFQUFFLEVBQUU7UUFDaEcsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFDM0YsSUFBSSxTQUFTLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDckQsSUFBSSxZQUFZLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFFM0QsSUFBSSxZQUFZLElBQUksSUFBSTtZQUN2QixZQUFZLEdBQUcsZ0JBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRTFDLElBQUksWUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUM3QixJQUFJLFdBQVcsR0FBRyxFQUFFLENBQUM7WUFDckIsSUFBSSxRQUFRO2dCQUNYLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFNUIsSUFBSSxZQUFZLElBQUksSUFBSTtnQkFDdkIsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQzlCLElBQUksWUFBWSxLQUFLLEVBQUU7Z0JBQzNCLFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFFaEMsSUFBSSxJQUFJLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNqQyxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQztnQkFDbEIsSUFBSSxJQUFJLEdBQUcsQ0FBQztZQUNiLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksR0FBRyxNQUFNLEdBQUcsU0FBUyxDQUFDLENBQUM7WUFFL0MsUUFBUSxDQUFDLElBQUksRUFBRSxxQ0FBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1NBQzdDO0lBQ0YsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBOUJELDhCQThCQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2Rldi1zZXJ2ZS1hc3NldHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgX19hcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHtFeHByZXNzQXBwQXBpfSBmcm9tICdAZHItY29yZS9leHByZXNzLWFwcCc7XG5pbXBvcnQge3BhcnNlfSBmcm9tICd1cmwnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7Y3JlYXRlU3RhdGljUm91dGV9IGZyb20gJy4vc3RhdGljLW1pZGRsZXdhcmUnO1xuaW1wb3J0IGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XG5cbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihfX2FwaS5wYWNrYWdlTmFtZSArICcuZGV2LXNlcnZlLWFzc2V0cycpO1xuXG5jb25zdCBhcGkgPSBfX2FwaSBhcyBFeHByZXNzQXBwQXBpICYgdHlwZW9mIF9fYXBpO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBzZXR1cEFzc2V0cyhkZXBsb3lVcmw6IHN0cmluZyxcblx0cm91dGVVc2U6IGV4cHJlc3MuUm91dGVyWyd1c2UnXSkge1xuXHRjb25zdCByb290UGF0aCA9IF8udHJpbUVuZChwYXJzZShkZXBsb3lVcmwpLnBhdGhuYW1lLCAnLycpO1xuXHRhcGkucGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcyhcblx0XHQobmFtZTogc3RyaW5nLCBlbnRyeVBhdGg6IHN0cmluZywgcGFyc2VkTmFtZToge25hbWU6IHN0cmluZ30sIGpzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykgPT4ge1xuXHRcdHZhciBhc3NldHNGb2xkZXIgPSBqc29uLmRyID8gKGpzb24uZHIuYXNzZXRzRGlyID8ganNvbi5kci5hc3NldHNEaXIgOiAnYXNzZXRzJykgOiAnYXNzZXRzJztcblx0XHR2YXIgYXNzZXRzRGlyID0gUGF0aC5qb2luKHBhY2thZ2VQYXRoLCBhc3NldHNGb2xkZXIpO1xuXHRcdHZhciBhc3NldHNEaXJNYXAgPSBhcGkuY29uZmlnLmdldCgnb3V0cHV0UGF0aE1hcC4nICsgbmFtZSk7XG5cblx0XHRpZiAoYXNzZXRzRGlyTWFwICE9IG51bGwpXG5cdFx0XHRhc3NldHNEaXJNYXAgPSBfLnRyaW0oYXNzZXRzRGlyTWFwLCAnLycpO1xuXG5cdFx0aWYgKGZzLmV4aXN0c1N5bmMoYXNzZXRzRGlyKSkge1xuXHRcdFx0dmFyIHBhdGhFbGVtZW50ID0gW107XG5cdFx0XHRpZiAocm9vdFBhdGgpXG5cdFx0XHRcdHBhdGhFbGVtZW50LnB1c2gocm9vdFBhdGgpO1xuXG5cdFx0XHRpZiAoYXNzZXRzRGlyTWFwID09IG51bGwpXG5cdFx0XHRcdHBhdGhFbGVtZW50LnB1c2gocGFyc2VkTmFtZS5uYW1lKTtcblx0XHRcdGVsc2UgaWYgKGFzc2V0c0Rpck1hcCAhPT0gJycpXG5cdFx0XHRcdHBhdGhFbGVtZW50LnB1c2goYXNzZXRzRGlyTWFwKTtcblxuXHRcdFx0dmFyIHBhdGggPSBwYXRoRWxlbWVudC5qb2luKCcvJyk7XG5cdFx0XHRpZiAocGF0aC5sZW5ndGggPiAxKVxuXHRcdFx0XHRwYXRoICs9ICcvJztcblx0XHRcdGxvZy5pbmZvKCdyb3V0ZSAnICsgcGF0aCArICcgLT4gJyArIGFzc2V0c0Rpcik7XG5cblx0XHRcdHJvdXRlVXNlKHBhdGgsIGNyZWF0ZVN0YXRpY1JvdXRlKGFzc2V0c0RpcikpO1xuXHRcdH1cblx0fSk7XG59XG4iXX0=
