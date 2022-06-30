"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.packageAssetsFolders = void 0;
const tslib_1 = require("tslib");
const __api_1 = tslib_1.__importDefault(require("__api"));
const url_1 = require("url");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const path_1 = tslib_1.__importDefault(require("path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2LXNlcnZlLWFzc2V0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRldi1zZXJ2ZS1hc3NldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLDBEQUF3QjtBQUN4Qiw2QkFBMEI7QUFDMUIsNERBQXVCO0FBQ3ZCLHdEQUF3QjtBQUN4QixvREFBb0I7QUFDcEIscUVBQWtFO0FBQ2xFLHlEQUF5RDtBQUN6RCxpQ0FBaUM7QUFFakMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLG1CQUFtQixDQUFDLENBQUM7QUFFL0UscURBQXFEO0FBQ3JEOzs7O0dBSUc7QUFDSCxTQUFnQixvQkFBb0IsQ0FBQyxTQUFpQixFQUFFLE1BQWdEO0lBQ3RHLE1BQU0sUUFBUSxHQUFHLGdCQUFDLENBQUMsT0FBTyxDQUFDLElBQUEsV0FBSyxFQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsSUFBSSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDakUsSUFBQSwrQkFBZSxFQUNiLENBQUMsSUFBWSxFQUFFLFNBQWlCLEVBQUUsVUFBMEIsRUFBRSxJQUFTLEVBQUUsV0FBbUIsRUFBRSxFQUFFO1FBRWhHLG9EQUFvRDtRQUNwRCxJQUFJLElBQUksQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsRUFBRTtZQUN2QyxNQUFNLFlBQVksR0FBRyxRQUFRLEdBQUcsVUFBVSxDQUFDLElBQUksR0FBRyxlQUFlLENBQUM7WUFDbEUsSUFBSSxTQUFTLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDeEQsSUFBSSxDQUFDLFlBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDO2dCQUMzQixPQUFPO1lBQ1QsU0FBUyxHQUFHLFlBQUUsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7WUFFdkMsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDO1lBQ3ZCLElBQUksUUFBUTtnQkFDVixXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzdCLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksR0FBRyxlQUFlLENBQUMsQ0FBQztZQUVwRCxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztZQUN6QyxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3hCLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksR0FBRyxNQUFNLEdBQUcsU0FBUyxDQUFDLENBQUM7U0FDbEQ7YUFBTTtZQUNMLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDNUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztnQkFDaEQsQ0FBQyxDQUFBLFFBQVEsQ0FBQztZQUVkLElBQUksU0FBUyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ3hELElBQUksbUJBQW1CLEdBQUcsZUFBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUUzRCxJQUFJLG1CQUFtQixJQUFJLElBQUk7Z0JBQzdCLG1CQUFtQixHQUFHLGdCQUFDLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxDQUFDO2lCQUNwRCxJQUFJLElBQUksQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUU7Z0JBQ3hDLG1CQUFtQixHQUFHLGdCQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUN4RCxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyw2RUFBNkUsbUJBQW1CLEdBQUcsQ0FBQyxDQUFDO2FBQzdIO1lBQ0QsSUFBSSxZQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFO2dCQUM1QixTQUFTLEdBQUcsWUFBRSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDdkMsSUFBSSxXQUFXLEdBQUcsRUFBRSxDQUFDO2dCQUNyQixJQUFJLFFBQVE7b0JBQ1YsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFFN0IsSUFBSSxtQkFBbUIsSUFBSSxJQUFJO29CQUM3QixXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztxQkFDL0IsSUFBSSxtQkFBbUIsS0FBSyxFQUFFO29CQUNqQyxXQUFXLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7Z0JBRXhDLElBQUksSUFBSSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2pDLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDO29CQUNqQixJQUFJLElBQUksR0FBRyxDQUFDO2dCQUNkLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksR0FBRyxNQUFNLEdBQUcsU0FBUyxDQUFDLENBQUM7Z0JBQ2pELE1BQU0sQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDekI7U0FDRjtJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQXRERCxvREFzREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7cGFyc2V9IGZyb20gJ3VybCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtmaW5kQWxsUGFja2FnZXN9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS11dGlscyc7XG4vLyBpbXBvcnQge2NyZWF0ZVN0YXRpY1JvdXRlfSBmcm9tICcuL3N0YXRpYy1taWRkbGV3YXJlJztcbi8vIGltcG9ydCBleHByZXNzIGZyb20gJ2V4cHJlc3MnO1xuXG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5kZXYtc2VydmUtYXNzZXRzJyk7XG5cbi8vIGNvbnN0IGFwaSA9IF9fYXBpIGFzIEV4cHJlc3NBcHBBcGkgJiB0eXBlb2YgX19hcGk7XG4vKipcbiAqIFVzZWQgYnkgQHdmaC9uZy1hcHAtYnVpbGRlclxuICogQHBhcmFtIGRlcGxveVVybCBcbiAqIEBwYXJhbSBvbkVhY2ggXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYWNrYWdlQXNzZXRzRm9sZGVycyhkZXBsb3lVcmw6IHN0cmluZywgb25FYWNoOiAoZGlyOiBzdHJpbmcsIG91dHB1dERpcjogc3RyaW5nKSA9PiB2b2lkKSB7XG4gIGNvbnN0IHJvb3RQYXRoID0gXy50cmltRW5kKHBhcnNlKGRlcGxveVVybCkucGF0aG5hbWUgfHwgJycsICcvJyk7XG4gIGZpbmRBbGxQYWNrYWdlcyhcbiAgICAobmFtZTogc3RyaW5nLCBlbnRyeVBhdGg6IHN0cmluZywgcGFyc2VkTmFtZToge25hbWU6IHN0cmluZ30sIGpzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykgPT4ge1xuXG4gICAgLy8gVE9ETzogc2hvdWxkIG1vdmUgdGhpcyBwaWVjZSBsb2dpYyB0byBjcmEtc2NyaXB0c1xuICAgIGlmIChqc29uLmRyICYmIGpzb24uZHJbJ2NyYS1saWItZW50cnknXSkge1xuICAgICAgY29uc3QgYXNzZXRzRm9sZGVyID0gJ2J1aWxkLycgKyBwYXJzZWROYW1lLm5hbWUgKyAnL3N0YXRpYy9tZWRpYSc7XG4gICAgICBsZXQgYXNzZXRzRGlyID0gUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoLCBhc3NldHNGb2xkZXIpO1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGFzc2V0c0RpcikpXG4gICAgICAgIHJldHVybjtcbiAgICAgIGFzc2V0c0RpciA9IGZzLnJlYWxwYXRoU3luYyhhc3NldHNEaXIpO1xuXG4gICAgICBjb25zdCBwYXRoRWxlbWVudCA9IFtdO1xuICAgICAgaWYgKHJvb3RQYXRoKVxuICAgICAgICBwYXRoRWxlbWVudC5wdXNoKHJvb3RQYXRoKTtcbiAgICAgIHBhdGhFbGVtZW50LnB1c2gocGFyc2VkTmFtZS5uYW1lICsgJy9zdGF0aWMvbWVkaWEnKTtcblxuICAgICAgY29uc3QgcGF0aCA9IHBhdGhFbGVtZW50LmpvaW4oJy8nKSArICcvJztcbiAgICAgIG9uRWFjaChhc3NldHNEaXIsIHBhdGgpO1xuICAgICAgbG9nLmluZm8oJ2Fzc2V0czogJyArIHBhdGggKyAnIC0+ICcgKyBhc3NldHNEaXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBhc3NldHNGb2xkZXIgPSBqc29uLmRyID9cbiAgICAgICAgKGpzb24uZHIuYXNzZXRzRGlyID8ganNvbi5kci5hc3NldHNEaXIgOiAnYXNzZXRzJylcbiAgICAgICAgICA6J2Fzc2V0cyc7XG5cbiAgICAgIGxldCBhc3NldHNEaXIgPSBQYXRoLnJlc29sdmUocGFja2FnZVBhdGgsIGFzc2V0c0ZvbGRlcik7XG4gICAgICBsZXQgYXNzZXRzRGlyQ29uZmlndXJlZCA9IGFwaS5jb25maWcoKS5vdXRwdXRQYXRoTWFwW25hbWVdO1xuXG4gICAgICBpZiAoYXNzZXRzRGlyQ29uZmlndXJlZCAhPSBudWxsKVxuICAgICAgICBhc3NldHNEaXJDb25maWd1cmVkID0gXy50cmltKGFzc2V0c0RpckNvbmZpZ3VyZWQsICcvJyk7XG4gICAgICBlbHNlIGlmIChqc29uLmRyICYmIGpzb24uZHIubmdSb3V0ZXJQYXRoKSB7XG4gICAgICAgIGFzc2V0c0RpckNvbmZpZ3VyZWQgPSBfLnRyaW0oanNvbi5kci5uZ1JvdXRlclBhdGgsICcvJyk7XG4gICAgICAgIGxvZy5pbmZvKHBhY2thZ2VQYXRoICsgYC9wYWNrYWdlLmpzb24gY29udGFpbnMgXCJkci5uZ1JvdXRlclBhdGhcIiwgYXNzZXRzIGRpcmVjdG9yeSBpcyBjaGFuZ2VkIHRvIFwiJHthc3NldHNEaXJDb25maWd1cmVkfVwiYCk7XG4gICAgICB9XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhhc3NldHNEaXIpKSB7XG4gICAgICAgIGFzc2V0c0RpciA9IGZzLnJlYWxwYXRoU3luYyhhc3NldHNEaXIpO1xuICAgICAgICB2YXIgcGF0aEVsZW1lbnQgPSBbXTtcbiAgICAgICAgaWYgKHJvb3RQYXRoKVxuICAgICAgICAgIHBhdGhFbGVtZW50LnB1c2gocm9vdFBhdGgpO1xuXG4gICAgICAgIGlmIChhc3NldHNEaXJDb25maWd1cmVkID09IG51bGwpXG4gICAgICAgICAgcGF0aEVsZW1lbnQucHVzaChwYXJzZWROYW1lLm5hbWUpO1xuICAgICAgICBlbHNlIGlmIChhc3NldHNEaXJDb25maWd1cmVkICE9PSAnJylcbiAgICAgICAgICBwYXRoRWxlbWVudC5wdXNoKGFzc2V0c0RpckNvbmZpZ3VyZWQpO1xuXG4gICAgICAgIGxldCBwYXRoID0gcGF0aEVsZW1lbnQuam9pbignLycpO1xuICAgICAgICBpZiAocGF0aC5sZW5ndGggPiAxKVxuICAgICAgICAgIHBhdGggKz0gJy8nO1xuICAgICAgICBsb2cuaW5mbygnYXNzZXRzOiAnICsgcGF0aCArICcgLT4gJyArIGFzc2V0c0Rpcik7XG4gICAgICAgIG9uRWFjaChhc3NldHNEaXIsIHBhdGgpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59XG4iXX0=