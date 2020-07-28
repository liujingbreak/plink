"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.send = void 0;
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

//# sourceMappingURL=_send-patch.js.map
