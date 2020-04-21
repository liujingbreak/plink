"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const log4js_1 = tslib_1.__importDefault(require("log4js"));
const __api_1 = tslib_1.__importDefault(require("__api"));
const log = log4js_1.default.getLogger(__api_1.default.packageName + '.send-patch');
function send(env, configName, zipFile, secret) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let url;
        switch (env) {
            case 'prod':
                url = 'https://credit-service.bkjk.com/_install';
                break;
            case 'local':
                url = 'http://localhost:14333/_install';
                break;
            case 'dev':
            case 'test':
            default:
                url = `https://credit-service.${env}.bkjk.com/_install`;
                break;
        }
        const sendAppZip = require('@dr-core/assets-processer/dist/content-deployer/cd-client').sendAppZip;
        // tslint:disable-next-line:no-console
        log.info('Pushing App "%s" to remote %s', configName, url);
        try {
            yield sendAppZip({
                file: `install-${env}/${configName}.zip`,
                url,
                numOfConc: env === 'prod' ? 2 : 1,
                numOfNode: env === 'prod' ? 2 : 1,
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
function test() {
    log.info('test');
}
exports.test = test;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvX3NlbmQtcGF0Y2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsNERBQTRCO0FBQzVCLDBEQUF3QjtBQUV4QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGFBQWEsQ0FBQyxDQUFDO0FBRTlELFNBQXNCLElBQUksQ0FBQyxHQUFXLEVBQUUsVUFBa0IsRUFBRSxPQUFlLEVBQUUsTUFBZTs7UUFDMUYsSUFBSSxHQUFXLENBQUM7UUFDaEIsUUFBUSxHQUFHLEVBQUU7WUFDWCxLQUFLLE1BQU07Z0JBQ1QsR0FBRyxHQUFHLDBDQUEwQyxDQUFDO2dCQUNqRCxNQUFNO1lBQ1IsS0FBSyxPQUFPO2dCQUNWLEdBQUcsR0FBRyxpQ0FBaUMsQ0FBQztnQkFDeEMsTUFBTTtZQUNSLEtBQUssS0FBSyxDQUFDO1lBQ1gsS0FBSyxNQUFNLENBQUM7WUFDWjtnQkFDRSxHQUFHLEdBQUcsMEJBQTBCLEdBQUcsb0JBQW9CLENBQUM7Z0JBQ3hELE1BQU07U0FDVDtRQUVELE1BQU0sVUFBVSxHQUF1QixPQUFPLENBQUMsMkRBQTJELENBQUMsQ0FBQyxVQUFVLENBQUM7UUFFdkgsc0NBQXNDO1FBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsK0JBQStCLEVBQUUsVUFBVSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzNELElBQUk7WUFDRixNQUFNLFVBQVUsQ0FBQztnQkFDZixJQUFJLEVBQUUsV0FBVyxHQUFHLElBQUksVUFBVSxNQUFNO2dCQUN4QyxHQUFHO2dCQUNILFNBQVMsRUFBRSxHQUFHLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pDLFNBQVMsRUFBRSxHQUFHLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pDLE1BQU07YUFDUCxFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQ2I7UUFBQyxPQUFPLEVBQUUsRUFBRTtZQUNYLDRCQUE0QjtZQUM1QixHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsTUFBTSxFQUFFLENBQUM7U0FDVjtJQUNILENBQUM7Q0FBQTtBQWpDRCxvQkFpQ0M7QUFFRCxTQUFnQixJQUFJO0lBQ2xCLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDbkIsQ0FBQztBQUZELG9CQUVDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvZGlzdC9fc2VuZC1wYXRjaC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNlbmRBcHBaaXAgYXMgX3NlbmRBcHBaaXAgfSBmcm9tICdAZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvY29udGVudC1kZXBsb3llci9jZC1jbGllbnQnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5zZW5kLXBhdGNoJyk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZW5kKGVudjogc3RyaW5nLCBjb25maWdOYW1lOiBzdHJpbmcsIHppcEZpbGU6IHN0cmluZywgc2VjcmV0Pzogc3RyaW5nKSB7XG4gIGxldCB1cmw6IHN0cmluZztcbiAgc3dpdGNoIChlbnYpIHtcbiAgICBjYXNlICdwcm9kJzpcbiAgICAgIHVybCA9ICdodHRwczovL2NyZWRpdC1zZXJ2aWNlLmJramsuY29tL19pbnN0YWxsJztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2xvY2FsJzpcbiAgICAgIHVybCA9ICdodHRwOi8vbG9jYWxob3N0OjE0MzMzL19pbnN0YWxsJztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2Rldic6XG4gICAgY2FzZSAndGVzdCc6XG4gICAgZGVmYXVsdDpcbiAgICAgIHVybCA9IGBodHRwczovL2NyZWRpdC1zZXJ2aWNlLiR7ZW52fS5ia2prLmNvbS9faW5zdGFsbGA7XG4gICAgICBicmVhaztcbiAgfVxuXG4gIGNvbnN0IHNlbmRBcHBaaXA6IHR5cGVvZiBfc2VuZEFwcFppcCA9IHJlcXVpcmUoJ0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9jb250ZW50LWRlcGxveWVyL2NkLWNsaWVudCcpLnNlbmRBcHBaaXA7XG5cbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWNvbnNvbGVcbiAgbG9nLmluZm8oJ1B1c2hpbmcgQXBwIFwiJXNcIiB0byByZW1vdGUgJXMnLCBjb25maWdOYW1lLCB1cmwpO1xuICB0cnkge1xuICAgIGF3YWl0IHNlbmRBcHBaaXAoe1xuICAgICAgZmlsZTogYGluc3RhbGwtJHtlbnZ9LyR7Y29uZmlnTmFtZX0uemlwYCxcbiAgICAgIHVybCxcbiAgICAgIG51bU9mQ29uYzogZW52ID09PSAncHJvZCcgPyAyIDogMSxcbiAgICAgIG51bU9mTm9kZTogZW52ID09PSAncHJvZCcgPyAyIDogMSxcbiAgICAgIHNlY3JldFxuICAgIH0sIHppcEZpbGUpO1xuICB9IGNhdGNoIChleCkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcbiAgICBsb2cuZXJyb3IoZXgpO1xuICAgIHRocm93IGV4O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0ZXN0KCkge1xuICBsb2cuaW5mbygndGVzdCcpO1xufVxuXG4iXX0=
