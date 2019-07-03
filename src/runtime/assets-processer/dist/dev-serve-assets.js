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
            log.info('route /' + path + ' -> ' + assetsDir);
            routeUse('/' + path, static_middleware_1.createStaticRoute(assetsDir));
        }
    });
}
exports.default = setupAssets;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2Rldi1zZXJ2ZS1hc3NldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMERBQTBCO0FBRTFCLDZCQUEwQjtBQUMxQiw0REFBdUI7QUFDdkIsd0RBQXdCO0FBQ3hCLG9EQUFvQjtBQUNwQiwyREFBc0Q7QUFHdEQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFLLENBQUMsV0FBVyxHQUFHLG1CQUFtQixDQUFDLENBQUM7QUFFakYsTUFBTSxHQUFHLEdBQUcsZUFBcUMsQ0FBQztBQUVsRCxTQUF3QixXQUFXLENBQUMsU0FBaUIsRUFDbkQsUUFBK0I7SUFDL0IsTUFBTSxRQUFRLEdBQUcsZ0JBQUMsQ0FBQyxPQUFPLENBQUMsV0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUMzRCxHQUFHLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FDOUIsQ0FBQyxJQUFZLEVBQUUsU0FBaUIsRUFBRSxVQUEwQixFQUFFLElBQVMsRUFBRSxXQUFtQixFQUFFLEVBQUU7UUFDaEcsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFDM0YsSUFBSSxTQUFTLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDckQsSUFBSSxZQUFZLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFFM0QsSUFBSSxZQUFZLElBQUksSUFBSTtZQUN0QixZQUFZLEdBQUcsZ0JBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRTNDLElBQUksWUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUM1QixJQUFJLFdBQVcsR0FBRyxFQUFFLENBQUM7WUFDckIsSUFBSSxRQUFRO2dCQUNWLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFN0IsSUFBSSxZQUFZLElBQUksSUFBSTtnQkFDdEIsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQy9CLElBQUksWUFBWSxLQUFLLEVBQUU7Z0JBQzFCLFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFFakMsSUFBSSxJQUFJLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNqQyxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQztnQkFDakIsSUFBSSxJQUFJLEdBQUcsQ0FBQztZQUNkLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksR0FBRyxNQUFNLEdBQUcsU0FBUyxDQUFDLENBQUM7WUFFaEQsUUFBUSxDQUFDLEdBQUcsR0FBRyxJQUFJLEVBQUUscUNBQWlCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztTQUNwRDtJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQTlCRCw4QkE4QkMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9kZXYtc2VydmUtYXNzZXRzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IF9fYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7RXhwcmVzc0FwcEFwaX0gZnJvbSAnQGRyLWNvcmUvZXhwcmVzcy1hcHAnO1xuaW1wb3J0IHtwYXJzZX0gZnJvbSAndXJsJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQge2NyZWF0ZVN0YXRpY1JvdXRlfSBmcm9tICcuL3N0YXRpYy1taWRkbGV3YXJlJztcbmltcG9ydCBleHByZXNzIGZyb20gJ2V4cHJlc3MnO1xuXG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoX19hcGkucGFja2FnZU5hbWUgKyAnLmRldi1zZXJ2ZS1hc3NldHMnKTtcblxuY29uc3QgYXBpID0gX19hcGkgYXMgRXhwcmVzc0FwcEFwaSAmIHR5cGVvZiBfX2FwaTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc2V0dXBBc3NldHMoZGVwbG95VXJsOiBzdHJpbmcsXG4gIHJvdXRlVXNlOiBleHByZXNzLlJvdXRlclsndXNlJ10pIHtcbiAgY29uc3Qgcm9vdFBhdGggPSBfLnRyaW1FbmQocGFyc2UoZGVwbG95VXJsKS5wYXRobmFtZSwgJy8nKTtcbiAgYXBpLnBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMoXG4gICAgKG5hbWU6IHN0cmluZywgZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWU6IHtuYW1lOiBzdHJpbmd9LCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpID0+IHtcbiAgICB2YXIgYXNzZXRzRm9sZGVyID0ganNvbi5kciA/IChqc29uLmRyLmFzc2V0c0RpciA/IGpzb24uZHIuYXNzZXRzRGlyIDogJ2Fzc2V0cycpIDogJ2Fzc2V0cyc7XG4gICAgdmFyIGFzc2V0c0RpciA9IFBhdGguam9pbihwYWNrYWdlUGF0aCwgYXNzZXRzRm9sZGVyKTtcbiAgICB2YXIgYXNzZXRzRGlyTWFwID0gYXBpLmNvbmZpZy5nZXQoJ291dHB1dFBhdGhNYXAuJyArIG5hbWUpO1xuXG4gICAgaWYgKGFzc2V0c0Rpck1hcCAhPSBudWxsKVxuICAgICAgYXNzZXRzRGlyTWFwID0gXy50cmltKGFzc2V0c0Rpck1hcCwgJy8nKTtcblxuICAgIGlmIChmcy5leGlzdHNTeW5jKGFzc2V0c0RpcikpIHtcbiAgICAgIHZhciBwYXRoRWxlbWVudCA9IFtdO1xuICAgICAgaWYgKHJvb3RQYXRoKVxuICAgICAgICBwYXRoRWxlbWVudC5wdXNoKHJvb3RQYXRoKTtcblxuICAgICAgaWYgKGFzc2V0c0Rpck1hcCA9PSBudWxsKVxuICAgICAgICBwYXRoRWxlbWVudC5wdXNoKHBhcnNlZE5hbWUubmFtZSk7XG4gICAgICBlbHNlIGlmIChhc3NldHNEaXJNYXAgIT09ICcnKVxuICAgICAgICBwYXRoRWxlbWVudC5wdXNoKGFzc2V0c0Rpck1hcCk7XG5cbiAgICAgIHZhciBwYXRoID0gcGF0aEVsZW1lbnQuam9pbignLycpO1xuICAgICAgaWYgKHBhdGgubGVuZ3RoID4gMSlcbiAgICAgICAgcGF0aCArPSAnLyc7XG4gICAgICBsb2cuaW5mbygncm91dGUgLycgKyBwYXRoICsgJyAtPiAnICsgYXNzZXRzRGlyKTtcblxuICAgICAgcm91dGVVc2UoJy8nICsgcGF0aCwgY3JlYXRlU3RhdGljUm91dGUoYXNzZXRzRGlyKSk7XG4gICAgfVxuICB9KTtcbn1cbiJdfQ==
