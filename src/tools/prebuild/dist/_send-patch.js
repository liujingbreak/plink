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
const log4js_1 = __importDefault(require("log4js"));
const __api_1 = __importDefault(require("__api"));
const log = log4js_1.default.getLogger(__api_1.default.packageName + '.send-patch');
const installUrlMap = __api_1.default.config.get(__api_1.default.packageName + '.installEndpoint');
function send(env, configName, zipFile, secret) {
    return __awaiter(this, void 0, void 0, function* () {
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
