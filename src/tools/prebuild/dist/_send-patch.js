"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const log4js_1 = tslib_1.__importDefault(require("log4js"));
const __api_1 = tslib_1.__importDefault(require("__api"));
const log = log4js_1.default.getLogger(__api_1.default.packageName + '.send-patch');
const installUrlMap = __api_1.default.config.get(__api_1.default.packageName + '.installEndpoint');
function send(env, configName, zipFile, secret) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const url = installUrlMap[env];
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvX3NlbmQtcGF0Y2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsNERBQTRCO0FBQzVCLDBEQUF3QjtBQUV4QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGFBQWEsQ0FBQyxDQUFDO0FBQzlELE1BQU0sYUFBYSxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsa0JBQWtCLENBQTRCLENBQUM7QUFFdEcsU0FBc0IsSUFBSSxDQUFDLEdBQVcsRUFBRSxVQUFrQixFQUFFLE9BQWUsRUFBRSxNQUFlOztRQUMxRixNQUFNLEdBQUcsR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFL0IsTUFBTSxVQUFVLEdBQXVCLE9BQU8sQ0FBQywyREFBMkQsQ0FBQyxDQUFDLFVBQVUsQ0FBQztRQUV2SCxzQ0FBc0M7UUFDdEMsR0FBRyxDQUFDLElBQUksQ0FBQywrQkFBK0IsRUFBRSxVQUFVLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDM0QsSUFBSTtZQUNGLE1BQU0sVUFBVSxDQUFDO2dCQUNmLElBQUksRUFBRSxXQUFXLEdBQUcsSUFBSSxVQUFVLE1BQU07Z0JBQ3hDLEdBQUc7Z0JBQ0gsU0FBUyxFQUFFLEdBQUcsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakMsU0FBUyxFQUFFLEdBQUcsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakMsTUFBTTthQUNQLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDYjtRQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ1gsNEJBQTRCO1lBQzVCLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxNQUFNLEVBQUUsQ0FBQztTQUNWO0lBQ0gsQ0FBQztDQUFBO0FBcEJELG9CQW9CQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGJrL3ByZWJ1aWxkL2Rpc3QvX3NlbmQtcGF0Y2guanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzZW5kQXBwWmlwIGFzIF9zZW5kQXBwWmlwIH0gZnJvbSAnQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2NvbnRlbnQtZGVwbG95ZXIvY2QtY2xpZW50JztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuc2VuZC1wYXRjaCcpO1xuY29uc3QgaW5zdGFsbFVybE1hcCA9IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSArICcuaW5zdGFsbEVuZHBvaW50JykgYXMge1tlbnY6IHN0cmluZ106IHN0cmluZ307XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZW5kKGVudjogc3RyaW5nLCBjb25maWdOYW1lOiBzdHJpbmcsIHppcEZpbGU6IHN0cmluZywgc2VjcmV0Pzogc3RyaW5nKSB7XG4gIGNvbnN0IHVybCA9IGluc3RhbGxVcmxNYXBbZW52XTtcblxuICBjb25zdCBzZW5kQXBwWmlwOiB0eXBlb2YgX3NlbmRBcHBaaXAgPSByZXF1aXJlKCdAZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvY29udGVudC1kZXBsb3llci9jZC1jbGllbnQnKS5zZW5kQXBwWmlwO1xuXG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1jb25zb2xlXG4gIGxvZy5pbmZvKCdQdXNoaW5nIEFwcCBcIiVzXCIgdG8gcmVtb3RlICVzJywgY29uZmlnTmFtZSwgdXJsKTtcbiAgdHJ5IHtcbiAgICBhd2FpdCBzZW5kQXBwWmlwKHtcbiAgICAgIGZpbGU6IGBpbnN0YWxsLSR7ZW52fS8ke2NvbmZpZ05hbWV9LnppcGAsXG4gICAgICB1cmwsXG4gICAgICBudW1PZkNvbmM6IGVudiA9PT0gJ3Byb2QnID8gMiA6IDEsXG4gICAgICBudW1PZk5vZGU6IGVudiA9PT0gJ3Byb2QnID8gMiA6IDEsXG4gICAgICBzZWNyZXRcbiAgICB9LCB6aXBGaWxlKTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG4gICAgbG9nLmVycm9yKGV4KTtcbiAgICB0aHJvdyBleDtcbiAgfVxufVxuXG4iXX0=
