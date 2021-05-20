"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigFileInPackage = void 0;
const utils_1 = require("./utils");
// import {findPackage} from './build-target-helper';
const path_1 = __importDefault(require("path"));
const lodash_1 = __importDefault(require("lodash"));
const fs_1 = __importDefault(require("fs"));
// import type {PlinkEnv} from '@wfh/plink/wfh/dist/node-path';
const config_1 = __importDefault(require("@wfh/plink/wfh/dist/config"));
const config_handler_1 = require("@wfh/plink/wfh/dist/config-handler");
const types_1 = require("./types");
const fs_extra_1 = __importDefault(require("fs-extra"));
const plink_1 = require("@wfh/plink");
const log = plink_1.log4File(__filename);
let craScriptsPaths;
let configFileInPackage;
function getConfigFileInPackage() {
    if (configFileInPackage) {
        return configFileInPackage;
    }
    else {
        paths();
        return configFileInPackage;
    }
}
exports.getConfigFileInPackage = getConfigFileInPackage;
function paths() {
    if (craScriptsPaths) {
        return craScriptsPaths;
    }
    const cmdOption = utils_1.getCmdOptions();
    const foundPkg = [...plink_1.findPackagesByNames([cmdOption.buildTarget])][0];
    if (foundPkg == null) {
        throw new Error(`Can not find package for name like ${cmdOption.buildTarget}`);
    }
    const { realPath: dir, json: packageJson } = foundPkg;
    const paths = require(path_1.default.resolve('node_modules/react-scripts/config/paths'));
    const changedPaths = paths;
    const plinkProps = packageJson.plink ? packageJson.plink : packageJson.dr;
    if (cmdOption.buildType === 'lib') {
        changedPaths.appBuild = path_1.default.resolve(dir, 'build');
        changedPaths.appIndexJs = path_1.default.resolve(dir, lodash_1.default.get(plinkProps, [types_1.PKG_LIB_ENTRY_PROP], types_1.PKG_LIB_ENTRY_DEFAULT));
    }
    else if (cmdOption.buildType === 'app') {
        changedPaths.appIndexJs = path_1.default.resolve(dir, lodash_1.default.get(plinkProps, [types_1.PKG_APP_ENTRY_PROP], types_1.PKG_APP_ENTRY_DEFAULT));
        changedPaths.appBuild = config_1.default.resolve('staticDir');
    }
    log.debug(changedPaths);
    configFileInPackage = path_1.default.resolve(dir, lodash_1.default.get(plinkProps, ['config-overrides-path'], 'config-overrides.ts'));
    if (fs_1.default.existsSync(configFileInPackage)) {
        const cfgMgr = new config_handler_1.ConfigHandlerMgr([configFileInPackage]);
        cfgMgr.runEachSync((cfgFile, result, handler) => {
            var _a;
            if (handler.changeCraPaths != null) {
                log.info('Execute CRA scripts paths configuration overrides from ', cfgFile);
                handler.changeCraPaths(changedPaths, (_a = plink_1.config().cliOptions) === null || _a === void 0 ? void 0 : _a.env, cmdOption);
            }
        });
    }
    else {
        configFileInPackage = null;
    }
    config_1.default.configHandlerMgrChanged(handler => handler.runEachSync((cfgFile, result, handler) => {
        var _a;
        if (handler.changeCraPaths != null) {
            log.info('Execute CRA scripts paths overrides', cfgFile);
            handler.changeCraPaths(changedPaths, (_a = plink_1.config().cliOptions) === null || _a === void 0 ? void 0 : _a.env, cmdOption);
        }
    }));
    // tslint:disable-next-line: no-console
    // console.log('[cra-scripts-paths] changed react-scripts paths:\n', changedPaths);
    craScriptsPaths = changedPaths;
    fs_extra_1.default.mkdirpSync(changedPaths.appBuild);
    // fork-ts-checker needs this file path
    process.env._plink_cra_scripts_indexJs = changedPaths.appIndexJs;
    process.env._plink_cra_scripts_tsConfig = changedPaths.appTsConfig;
    // log.warn(changedPaths);
    return changedPaths;
}
exports.default = paths;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JhLXNjcmlwdHMtcGF0aHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmEtc2NyaXB0cy1wYXRocy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxtQ0FBc0M7QUFDdEMscURBQXFEO0FBQ3JELGdEQUF3QjtBQUN4QixvREFBdUI7QUFDdkIsNENBQW9CO0FBQ3BCLCtEQUErRDtBQUMvRCx3RUFBOEM7QUFDOUMsdUVBQXNFO0FBQ3RFLG1DQUN3QztBQUN4Qyx3REFBNkI7QUFDN0Isc0NBQWlFO0FBQ2pFLE1BQU0sR0FBRyxHQUFHLGdCQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7QUFFakMsSUFBSSxlQUFnQyxDQUFDO0FBQ3JDLElBQUksbUJBQThDLENBQUM7QUFFbkQsU0FBZ0Isc0JBQXNCO0lBQ3BDLElBQUksbUJBQW1CLEVBQUU7UUFDdkIsT0FBTyxtQkFBbUIsQ0FBQztLQUM1QjtTQUFNO1FBQ0wsS0FBSyxFQUFFLENBQUM7UUFDUixPQUFPLG1CQUFtQixDQUFDO0tBQzVCO0FBQ0gsQ0FBQztBQVBELHdEQU9DO0FBRUQsU0FBd0IsS0FBSztJQUMzQixJQUFJLGVBQWUsRUFBRTtRQUNuQixPQUFPLGVBQWUsQ0FBQztLQUN4QjtJQUNELE1BQU0sU0FBUyxHQUFHLHFCQUFhLEVBQUUsQ0FBQztJQUNsQyxNQUFNLFFBQVEsR0FBRyxDQUFDLEdBQUcsMkJBQW1CLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RFLElBQUksUUFBUSxJQUFJLElBQUksRUFBRTtRQUNwQixNQUFNLElBQUksS0FBSyxDQUFDLHNDQUFzQyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztLQUNoRjtJQUNELE1BQU0sRUFBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUMsR0FBRyxRQUFRLENBQUM7SUFFcEQsTUFBTSxLQUFLLEdBQW9CLE9BQU8sQ0FB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QUFHLFlBQVksQ0FBQyxXQUFXLENBQUM7SUFDbkUsMEJBQTBCO0lBQzFCLE9BQU8sWUFBWSxDQUFDO0FBQ3RCLENBQUM7QUFwREQsd0JBb0RDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtnZXRDbWRPcHRpb25zfSBmcm9tICcuL3V0aWxzJztcbi8vIGltcG9ydCB7ZmluZFBhY2thZ2V9IGZyb20gJy4vYnVpbGQtdGFyZ2V0LWhlbHBlcic7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuLy8gaW1wb3J0IHR5cGUge1BsaW5rRW52fSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L25vZGUtcGF0aCc7XG5pbXBvcnQgcENmZyBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2NvbmZpZyc7XG5pbXBvcnQgeyBDb25maWdIYW5kbGVyTWdyIH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9jb25maWctaGFuZGxlcic7XG5pbXBvcnQge1JlYWN0U2NyaXB0c0hhbmRsZXIsIENyYVNjcmlwdHNQYXRocywgUEtHX0xJQl9FTlRSWV9QUk9QLCBQS0dfTElCX0VOVFJZX0RFRkFVTFQsIFBLR19BUFBfRU5UUllfUFJPUCxcbiAgUEtHX0FQUF9FTlRSWV9ERUZBVUxUfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCBmc2V4dCBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQge2xvZzRGaWxlLCBjb25maWcsIGZpbmRQYWNrYWdlc0J5TmFtZXN9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG5cbmxldCBjcmFTY3JpcHRzUGF0aHM6IENyYVNjcmlwdHNQYXRocztcbmxldCBjb25maWdGaWxlSW5QYWNrYWdlOiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29uZmlnRmlsZUluUGFja2FnZSgpIHtcbiAgaWYgKGNvbmZpZ0ZpbGVJblBhY2thZ2UpIHtcbiAgICByZXR1cm4gY29uZmlnRmlsZUluUGFja2FnZTtcbiAgfSBlbHNlIHtcbiAgICBwYXRocygpO1xuICAgIHJldHVybiBjb25maWdGaWxlSW5QYWNrYWdlO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHBhdGhzKCkge1xuICBpZiAoY3JhU2NyaXB0c1BhdGhzKSB7XG4gICAgcmV0dXJuIGNyYVNjcmlwdHNQYXRocztcbiAgfVxuICBjb25zdCBjbWRPcHRpb24gPSBnZXRDbWRPcHRpb25zKCk7XG4gIGNvbnN0IGZvdW5kUGtnID0gWy4uLmZpbmRQYWNrYWdlc0J5TmFtZXMoW2NtZE9wdGlvbi5idWlsZFRhcmdldF0pXVswXTtcbiAgaWYgKGZvdW5kUGtnID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENhbiBub3QgZmluZCBwYWNrYWdlIGZvciBuYW1lIGxpa2UgJHtjbWRPcHRpb24uYnVpbGRUYXJnZXR9YCk7XG4gIH1cbiAgY29uc3Qge3JlYWxQYXRoOiBkaXIsIGpzb246IHBhY2thZ2VKc29ufSA9IGZvdW5kUGtnO1xuXG4gIGNvbnN0IHBhdGhzOiBDcmFTY3JpcHRzUGF0aHMgPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LXNjcmlwdHMvY29uZmlnL3BhdGhzJykpO1xuICBjb25zdCBjaGFuZ2VkUGF0aHMgPSBwYXRocztcblxuICBjb25zdCBwbGlua1Byb3BzID0gcGFja2FnZUpzb24ucGxpbmsgPyBwYWNrYWdlSnNvbi5wbGluayA6IHBhY2thZ2VKc29uLmRyO1xuICBpZiAoY21kT3B0aW9uLmJ1aWxkVHlwZSA9PT0gJ2xpYicpIHtcbiAgICBjaGFuZ2VkUGF0aHMuYXBwQnVpbGQgPSBQYXRoLnJlc29sdmUoZGlyLCAnYnVpbGQnKTtcbiAgICBjaGFuZ2VkUGF0aHMuYXBwSW5kZXhKcyA9IFBhdGgucmVzb2x2ZShkaXIsIF8uZ2V0KHBsaW5rUHJvcHMsIFtQS0dfTElCX0VOVFJZX1BST1BdLCBQS0dfTElCX0VOVFJZX0RFRkFVTFQpKTtcbiAgfSBlbHNlIGlmIChjbWRPcHRpb24uYnVpbGRUeXBlID09PSAnYXBwJykge1xuICAgIGNoYW5nZWRQYXRocy5hcHBJbmRleEpzID0gUGF0aC5yZXNvbHZlKGRpciwgXy5nZXQocGxpbmtQcm9wcywgW1BLR19BUFBfRU5UUllfUFJPUF0sIFBLR19BUFBfRU5UUllfREVGQVVMVCkpO1xuICAgIGNoYW5nZWRQYXRocy5hcHBCdWlsZCA9IHBDZmcucmVzb2x2ZSgnc3RhdGljRGlyJyk7XG4gIH1cbiAgbG9nLmRlYnVnKGNoYW5nZWRQYXRocyk7XG5cbiAgY29uZmlnRmlsZUluUGFja2FnZSA9IFBhdGgucmVzb2x2ZShkaXIsIF8uZ2V0KHBsaW5rUHJvcHMsIFsnY29uZmlnLW92ZXJyaWRlcy1wYXRoJ10sICdjb25maWctb3ZlcnJpZGVzLnRzJykpO1xuXG4gIGlmIChmcy5leGlzdHNTeW5jKGNvbmZpZ0ZpbGVJblBhY2thZ2UpKSB7XG4gICAgY29uc3QgY2ZnTWdyID0gbmV3IENvbmZpZ0hhbmRsZXJNZ3IoW2NvbmZpZ0ZpbGVJblBhY2thZ2VdKTtcbiAgICBjZmdNZ3IucnVuRWFjaFN5bmM8UmVhY3RTY3JpcHRzSGFuZGxlcj4oKGNmZ0ZpbGUsIHJlc3VsdCwgaGFuZGxlcikgPT4ge1xuICAgICAgaWYgKGhhbmRsZXIuY2hhbmdlQ3JhUGF0aHMgIT0gbnVsbCkge1xuICAgICAgICBsb2cuaW5mbygnRXhlY3V0ZSBDUkEgc2NyaXB0cyBwYXRocyBjb25maWd1cmF0aW9uIG92ZXJyaWRlcyBmcm9tICcsIGNmZ0ZpbGUpO1xuICAgICAgICBoYW5kbGVyLmNoYW5nZUNyYVBhdGhzKGNoYW5nZWRQYXRocywgY29uZmlnKCkuY2xpT3B0aW9ucz8uZW52ISwgY21kT3B0aW9uKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBjb25maWdGaWxlSW5QYWNrYWdlID0gbnVsbDtcbiAgfVxuICBwQ2ZnLmNvbmZpZ0hhbmRsZXJNZ3JDaGFuZ2VkKGhhbmRsZXIgPT4gaGFuZGxlci5ydW5FYWNoU3luYzxSZWFjdFNjcmlwdHNIYW5kbGVyPigoY2ZnRmlsZSwgcmVzdWx0LCBoYW5kbGVyKSA9PiB7XG4gICAgaWYgKGhhbmRsZXIuY2hhbmdlQ3JhUGF0aHMgIT0gbnVsbCkge1xuICAgICAgbG9nLmluZm8oJ0V4ZWN1dGUgQ1JBIHNjcmlwdHMgcGF0aHMgb3ZlcnJpZGVzJywgY2ZnRmlsZSk7XG4gICAgICBoYW5kbGVyLmNoYW5nZUNyYVBhdGhzKGNoYW5nZWRQYXRocywgY29uZmlnKCkuY2xpT3B0aW9ucz8uZW52ISwgY21kT3B0aW9uKTtcbiAgICB9XG4gIH0pKTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIC8vIGNvbnNvbGUubG9nKCdbY3JhLXNjcmlwdHMtcGF0aHNdIGNoYW5nZWQgcmVhY3Qtc2NyaXB0cyBwYXRoczpcXG4nLCBjaGFuZ2VkUGF0aHMpO1xuICBjcmFTY3JpcHRzUGF0aHMgPSBjaGFuZ2VkUGF0aHM7XG4gIGZzZXh0Lm1rZGlycFN5bmMoY2hhbmdlZFBhdGhzLmFwcEJ1aWxkKTtcbiAgLy8gZm9yay10cy1jaGVja2VyIG5lZWRzIHRoaXMgZmlsZSBwYXRoXG4gIHByb2Nlc3MuZW52Ll9wbGlua19jcmFfc2NyaXB0c19pbmRleEpzID0gY2hhbmdlZFBhdGhzLmFwcEluZGV4SnM7XG4gIHByb2Nlc3MuZW52Ll9wbGlua19jcmFfc2NyaXB0c190c0NvbmZpZyA9IGNoYW5nZWRQYXRocy5hcHBUc0NvbmZpZztcbiAgLy8gbG9nLndhcm4oY2hhbmdlZFBhdGhzKTtcbiAgcmV0dXJuIGNoYW5nZWRQYXRocztcbn1cblxuXG4iXX0=