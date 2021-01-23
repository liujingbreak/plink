"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.send = void 0;
const remote_deploy_1 = require("@wfh/assets-processer/dist/remote-deploy");
const log4js_1 = __importDefault(require("log4js"));
const __api_1 = __importDefault(require("__api"));
const url_1 = __importDefault(require("url"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const log = log4js_1.default.getLogger(__api_1.default.packageName + '.send-patch');
const installUrlMap = __api_1.default.config.get(__api_1.default.packageName);
function send(env, appName, zipFile, numOfConc, numOfNode, force = false, secret) {
    return __awaiter(this, void 0, void 0, function* () {
        let url = installUrlMap.byEnv[env].installEndpoint;
        const rootDir = __api_1.default.config().rootPath;
        url = force ? url_1.default.resolve(url, '/_install_force') : url_1.default.resolve(url, '/_install');
        if (fs_extra_1.default.statSync(zipFile).isDirectory()) {
            const installDir = path_1.default.resolve(rootDir, 'install-' + env);
            if (!fs_extra_1.default.existsSync(installDir)) {
                fs_extra_1.default.mkdirpSync(installDir);
            }
            zipFile = yield remote_deploy_1.checkZipFile(zipFile, installDir, appName, /([\\/]stats[^]*\.json|\.map)$/);
        }
        const sendAppZip = require('@wfh/assets-processer/dist/content-deployer/cd-client').sendAppZip;
        // tslint:disable-next-line:no-console
        log.info('Pushing App "%s" to remote %s', appName, url);
        try {
            yield sendAppZip({
                remoteFile: `install-${env}/${appName}.zip`,
                url,
                numOfConc: numOfConc != null ? numOfConc : env === 'prod' ? 4 : 2,
                numOfNode: numOfNode != null ? numOfNode : env === 'prod' ? 2 : 1,
                secret
            }, zipFile);
        }
        catch (ex) {
            // tslint:disable:no-console
            log.error(ex);
            throw ex;
        }
    });
}
exports.send = send;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiX3NlbmQtcGF0Y2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJfc2VuZC1wYXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFDQSw0RUFBd0U7QUFDeEUsb0RBQTRCO0FBQzVCLGtEQUF3QjtBQUN4Qiw4Q0FBc0I7QUFDdEIsd0RBQTBCO0FBQzFCLGdEQUF3QjtBQUd4QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGFBQWEsQ0FBQyxDQUFDO0FBQzlELE1BQU0sYUFBYSxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQWtCLENBQUM7QUFFdkUsU0FBc0IsSUFBSSxDQUFDLEdBQVcsRUFBRSxPQUFlLEVBQUUsT0FBZSxFQUN0RSxTQUFrQixFQUFFLFNBQWtCLEVBQUUsS0FBSyxHQUFHLEtBQUssRUFBRSxNQUFlOztRQUN0RSxJQUFJLEdBQUcsR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLGVBQWUsQ0FBQztRQUNuRCxNQUFNLE9BQU8sR0FBRyxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDO1FBQ3RDLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLGFBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRWxGLElBQUksa0JBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUU7WUFDdEMsTUFBTSxVQUFVLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQzNELElBQUksQ0FBQyxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDOUIsa0JBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDM0I7WUFDRCxPQUFPLEdBQUcsTUFBTSw0QkFBWSxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLCtCQUErQixDQUFDLENBQUM7U0FDN0Y7UUFFRCxNQUFNLFVBQVUsR0FBdUIsT0FBTyxDQUFDLHVEQUF1RCxDQUFDLENBQUMsVUFBVSxDQUFDO1FBRW5ILHNDQUFzQztRQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLCtCQUErQixFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN4RCxJQUFJO1lBQ0YsTUFBTSxVQUFVLENBQUM7Z0JBQ2YsVUFBVSxFQUFFLFdBQVcsR0FBRyxJQUFJLE9BQU8sTUFBTTtnQkFDM0MsR0FBRztnQkFDSCxTQUFTLEVBQUUsU0FBUyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pFLFNBQVMsRUFBRSxTQUFTLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakUsTUFBTTthQUNQLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDYjtRQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ1gsNEJBQTRCO1lBQzVCLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxNQUFNLEVBQUUsQ0FBQztTQUNWO0lBQ0gsQ0FBQztDQUFBO0FBL0JELG9CQStCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNlbmRBcHBaaXAgYXMgX3NlbmRBcHBaaXAgfSBmcm9tICdAd2ZoL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9jb250ZW50LWRlcGxveWVyL2NkLWNsaWVudCc7XG5pbXBvcnQgeyBjaGVja1ppcEZpbGUgfSBmcm9tICdAd2ZoL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9yZW1vdGUtZGVwbG95JztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtDb25maWd1cmF0aW9ufSBmcm9tICcuL3R5cGVzJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLnNlbmQtcGF0Y2gnKTtcbmNvbnN0IGluc3RhbGxVcmxNYXAgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpIGFzIENvbmZpZ3VyYXRpb247XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZW5kKGVudjogc3RyaW5nLCBhcHBOYW1lOiBzdHJpbmcsIHppcEZpbGU6IHN0cmluZyxcbiAgbnVtT2ZDb25jPzogbnVtYmVyLCBudW1PZk5vZGU/OiBudW1iZXIsIGZvcmNlID0gZmFsc2UsIHNlY3JldD86IHN0cmluZykge1xuICBsZXQgdXJsID0gaW5zdGFsbFVybE1hcC5ieUVudltlbnZdLmluc3RhbGxFbmRwb2ludDtcbiAgY29uc3Qgcm9vdERpciA9IGFwaS5jb25maWcoKS5yb290UGF0aDtcbiAgdXJsID0gZm9yY2UgPyBVcmwucmVzb2x2ZSh1cmwsICcvX2luc3RhbGxfZm9yY2UnKSA6IFVybC5yZXNvbHZlKHVybCwgJy9faW5zdGFsbCcpO1xuXG4gIGlmIChmcy5zdGF0U3luYyh6aXBGaWxlKS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgY29uc3QgaW5zdGFsbERpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCAnaW5zdGFsbC0nICsgZW52KTtcbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMoaW5zdGFsbERpcikpIHtcbiAgICAgIGZzLm1rZGlycFN5bmMoaW5zdGFsbERpcik7XG4gICAgfVxuICAgIHppcEZpbGUgPSBhd2FpdCBjaGVja1ppcEZpbGUoemlwRmlsZSwgaW5zdGFsbERpciwgYXBwTmFtZSwgLyhbXFxcXC9dc3RhdHNbXl0qXFwuanNvbnxcXC5tYXApJC8pO1xuICB9XG5cbiAgY29uc3Qgc2VuZEFwcFppcDogdHlwZW9mIF9zZW5kQXBwWmlwID0gcmVxdWlyZSgnQHdmaC9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvY29udGVudC1kZXBsb3llci9jZC1jbGllbnQnKS5zZW5kQXBwWmlwO1xuXG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1jb25zb2xlXG4gIGxvZy5pbmZvKCdQdXNoaW5nIEFwcCBcIiVzXCIgdG8gcmVtb3RlICVzJywgYXBwTmFtZSwgdXJsKTtcbiAgdHJ5IHtcbiAgICBhd2FpdCBzZW5kQXBwWmlwKHtcbiAgICAgIHJlbW90ZUZpbGU6IGBpbnN0YWxsLSR7ZW52fS8ke2FwcE5hbWV9LnppcGAsXG4gICAgICB1cmwsXG4gICAgICBudW1PZkNvbmM6IG51bU9mQ29uYyAhPSBudWxsID8gbnVtT2ZDb25jIDogZW52ID09PSAncHJvZCcgPyA0IDogMixcbiAgICAgIG51bU9mTm9kZTogbnVtT2ZOb2RlICE9IG51bGwgPyBudW1PZk5vZGUgOiBlbnYgPT09ICdwcm9kJyA/IDIgOiAxLFxuICAgICAgc2VjcmV0XG4gICAgfSwgemlwRmlsZSk7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuICAgIGxvZy5lcnJvcihleCk7XG4gICAgdGhyb3cgZXg7XG4gIH1cbn1cblxuIl19