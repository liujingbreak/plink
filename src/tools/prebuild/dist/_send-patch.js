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
const prebuild_setting_1 = require("../isom/prebuild-setting");
const log = log4js_1.default.getLogger(__api_1.default.packageName + '.send-patch');
const installUrlMap = prebuild_setting_1.getSetting();
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
        // eslint-disable-next-line no-console
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
            /* eslint-disable no-console */
            log.error(ex);
            throw ex;
        }
    });
}
exports.send = send;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiX3NlbmQtcGF0Y2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJfc2VuZC1wYXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFDQSw0RUFBd0U7QUFDeEUsb0RBQTRCO0FBQzVCLGtEQUF3QjtBQUN4Qiw4Q0FBc0I7QUFDdEIsd0RBQTBCO0FBQzFCLGdEQUF3QjtBQUN4QiwrREFBb0Q7QUFFcEQsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxhQUFhLENBQUMsQ0FBQztBQUM5RCxNQUFNLGFBQWEsR0FBRyw2QkFBVSxFQUFFLENBQUM7QUFFbkMsU0FBc0IsSUFBSSxDQUFDLEdBQVcsRUFBRSxPQUFlLEVBQUUsT0FBZSxFQUN0RSxTQUFrQixFQUFFLFNBQWtCLEVBQUUsS0FBSyxHQUFHLEtBQUssRUFBRSxNQUFlOztRQUN0RSxJQUFJLEdBQUcsR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLGVBQWUsQ0FBQztRQUNuRCxNQUFNLE9BQU8sR0FBRyxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDO1FBQ3RDLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLGFBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRWxGLElBQUksa0JBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUU7WUFDdEMsTUFBTSxVQUFVLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQzNELElBQUksQ0FBQyxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDOUIsa0JBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDM0I7WUFDRCxPQUFPLEdBQUcsTUFBTSw0QkFBWSxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLCtCQUErQixDQUFDLENBQUM7U0FDN0Y7UUFFRCxNQUFNLFVBQVUsR0FBdUIsT0FBTyxDQUFDLHVEQUF1RCxDQUFDLENBQUMsVUFBVSxDQUFDO1FBRW5ILHNDQUFzQztRQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLCtCQUErQixFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN4RCxJQUFJO1lBQ0YsTUFBTSxVQUFVLENBQUM7Z0JBQ2YsVUFBVSxFQUFFLFdBQVcsR0FBRyxJQUFJLE9BQU8sTUFBTTtnQkFDM0MsR0FBRztnQkFDSCxTQUFTLEVBQUUsU0FBUyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pFLFNBQVMsRUFBRSxTQUFTLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakUsTUFBTTthQUNQLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDYjtRQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ1gsK0JBQStCO1lBQy9CLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxNQUFNLEVBQUUsQ0FBQztTQUNWO0lBQ0gsQ0FBQztDQUFBO0FBL0JELG9CQStCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNlbmRBcHBaaXAgYXMgX3NlbmRBcHBaaXAgfSBmcm9tICdAd2ZoL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9jb250ZW50LWRlcGxveWVyL2NkLWNsaWVudCc7XG5pbXBvcnQgeyBjaGVja1ppcEZpbGUgfSBmcm9tICdAd2ZoL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9yZW1vdGUtZGVwbG95JztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtnZXRTZXR0aW5nfSBmcm9tICcuLi9pc29tL3ByZWJ1aWxkLXNldHRpbmcnO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuc2VuZC1wYXRjaCcpO1xuY29uc3QgaW5zdGFsbFVybE1hcCA9IGdldFNldHRpbmcoKTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlbmQoZW52OiBzdHJpbmcsIGFwcE5hbWU6IHN0cmluZywgemlwRmlsZTogc3RyaW5nLFxuICBudW1PZkNvbmM/OiBudW1iZXIsIG51bU9mTm9kZT86IG51bWJlciwgZm9yY2UgPSBmYWxzZSwgc2VjcmV0Pzogc3RyaW5nKSB7XG4gIGxldCB1cmwgPSBpbnN0YWxsVXJsTWFwLmJ5RW52W2Vudl0uaW5zdGFsbEVuZHBvaW50O1xuICBjb25zdCByb290RGlyID0gYXBpLmNvbmZpZygpLnJvb3RQYXRoO1xuICB1cmwgPSBmb3JjZSA/IFVybC5yZXNvbHZlKHVybCwgJy9faW5zdGFsbF9mb3JjZScpIDogVXJsLnJlc29sdmUodXJsLCAnL19pbnN0YWxsJyk7XG5cbiAgaWYgKGZzLnN0YXRTeW5jKHppcEZpbGUpLmlzRGlyZWN0b3J5KCkpIHtcbiAgICBjb25zdCBpbnN0YWxsRGlyID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsICdpbnN0YWxsLScgKyBlbnYpO1xuICAgIGlmICghZnMuZXhpc3RzU3luYyhpbnN0YWxsRGlyKSkge1xuICAgICAgZnMubWtkaXJwU3luYyhpbnN0YWxsRGlyKTtcbiAgICB9XG4gICAgemlwRmlsZSA9IGF3YWl0IGNoZWNrWmlwRmlsZSh6aXBGaWxlLCBpbnN0YWxsRGlyLCBhcHBOYW1lLCAvKFtcXFxcL11zdGF0c1teXSpcXC5qc29ufFxcLm1hcCkkLyk7XG4gIH1cblxuICBjb25zdCBzZW5kQXBwWmlwOiB0eXBlb2YgX3NlbmRBcHBaaXAgPSByZXF1aXJlKCdAd2ZoL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9jb250ZW50LWRlcGxveWVyL2NkLWNsaWVudCcpLnNlbmRBcHBaaXA7XG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgbG9nLmluZm8oJ1B1c2hpbmcgQXBwIFwiJXNcIiB0byByZW1vdGUgJXMnLCBhcHBOYW1lLCB1cmwpO1xuICB0cnkge1xuICAgIGF3YWl0IHNlbmRBcHBaaXAoe1xuICAgICAgcmVtb3RlRmlsZTogYGluc3RhbGwtJHtlbnZ9LyR7YXBwTmFtZX0uemlwYCxcbiAgICAgIHVybCxcbiAgICAgIG51bU9mQ29uYzogbnVtT2ZDb25jICE9IG51bGwgPyBudW1PZkNvbmMgOiBlbnYgPT09ICdwcm9kJyA/IDQgOiAyLFxuICAgICAgbnVtT2ZOb2RlOiBudW1PZk5vZGUgIT0gbnVsbCA/IG51bU9mTm9kZSA6IGVudiA9PT0gJ3Byb2QnID8gMiA6IDEsXG4gICAgICBzZWNyZXRcbiAgICB9LCB6aXBGaWxlKTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG4gICAgbG9nLmVycm9yKGV4KTtcbiAgICB0aHJvdyBleDtcbiAgfVxufVxuXG4iXX0=