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

//# sourceMappingURL=_send-patch.js.map
