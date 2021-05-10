"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigFileInPackage = exports.PKG_APP_ENTRY_DEFAULT = exports.PKG_APP_ENTRY_PROP = exports.PKG_LIB_ENTRY_DEFAULT = exports.PKG_LIB_ENTRY_PROP = void 0;
const utils_1 = require("./utils");
const build_target_helper_1 = require("./build-target-helper");
const path_1 = __importDefault(require("path"));
const lodash_1 = __importDefault(require("lodash"));
const fs_1 = __importDefault(require("fs"));
// import type {PlinkEnv} from '@wfh/plink/wfh/dist/node-path';
const config_1 = __importDefault(require("@wfh/plink/wfh/dist/config"));
const config_handler_1 = require("@wfh/plink/wfh/dist/config-handler");
const fs_extra_1 = __importDefault(require("fs-extra"));
const plink_1 = require("@wfh/plink");
const log = plink_1.log4File(__filename);
exports.PKG_LIB_ENTRY_PROP = 'cra-lib-entry';
exports.PKG_LIB_ENTRY_DEFAULT = 'public_api.ts';
exports.PKG_APP_ENTRY_PROP = 'cra-app-entry';
exports.PKG_APP_ENTRY_DEFAULT = 'start.tsx';
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
    const foundPkg = build_target_helper_1.findPackage(cmdOption.buildTarget);
    if (foundPkg == null) {
        throw new Error(`Can not find package for name like ${cmdOption.buildTarget}`);
    }
    const { dir, packageJson } = foundPkg;
    const paths = require(path_1.default.resolve('node_modules/react-scripts/config/paths'));
    const changedPaths = paths;
    const plinkProps = packageJson.plink ? packageJson.plink : packageJson.dr;
    if (cmdOption.buildType === 'lib') {
        changedPaths.appBuild = path_1.default.resolve(dir, 'build');
        changedPaths.appIndexJs = path_1.default.resolve(dir, lodash_1.default.get(plinkProps, [exports.PKG_LIB_ENTRY_PROP], exports.PKG_LIB_ENTRY_DEFAULT));
    }
    else if (cmdOption.buildType === 'app') {
        changedPaths.appIndexJs = path_1.default.resolve(dir, lodash_1.default.get(plinkProps, [exports.PKG_APP_ENTRY_PROP], exports.PKG_APP_ENTRY_DEFAULT));
        changedPaths.appBuild = config_1.default.resolve('staticDir');
    }
    log.debug(changedPaths);
    config_1.default.configHandlerMgrChanged(handler => handler.runEachSync((cfgFile, result, handler) => {
        var _a;
        if (handler.changeCraPaths != null) {
            log.info('Execute CRA scripts paths overrides', cfgFile);
            handler.changeCraPaths(changedPaths, (_a = plink_1.config().cliOptions) === null || _a === void 0 ? void 0 : _a.env, cmdOption);
        }
    }));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JhLXNjcmlwdHMtcGF0aHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmEtc2NyaXB0cy1wYXRocy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxtQ0FBc0M7QUFDdEMsK0RBQWtEO0FBQ2xELGdEQUF3QjtBQUN4QixvREFBdUI7QUFDdkIsNENBQW9CO0FBQ3BCLCtEQUErRDtBQUMvRCx3RUFBOEM7QUFDOUMsdUVBQXNFO0FBRXRFLHdEQUE2QjtBQUM3QixzQ0FBNEM7QUFDNUMsTUFBTSxHQUFHLEdBQUcsZ0JBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUVwQixRQUFBLGtCQUFrQixHQUFHLGVBQWUsQ0FBQztBQUNyQyxRQUFBLHFCQUFxQixHQUFHLGVBQWUsQ0FBQztBQUN4QyxRQUFBLGtCQUFrQixHQUFHLGVBQWUsQ0FBQztBQUNyQyxRQUFBLHFCQUFxQixHQUFHLFdBQVcsQ0FBQztBQUVqRCxJQUFJLGVBQWdDLENBQUM7QUFDckMsSUFBSSxtQkFBOEMsQ0FBQztBQUVuRCxTQUFnQixzQkFBc0I7SUFDcEMsSUFBSSxtQkFBbUIsRUFBRTtRQUN2QixPQUFPLG1CQUFtQixDQUFDO0tBQzVCO1NBQU07UUFDTCxLQUFLLEVBQUUsQ0FBQztRQUNSLE9BQU8sbUJBQW1CLENBQUM7S0FDNUI7QUFDSCxDQUFDO0FBUEQsd0RBT0M7QUFFRCxTQUF3QixLQUFLO0lBQzNCLElBQUksZUFBZSxFQUFFO1FBQ25CLE9BQU8sZUFBZSxDQUFDO0tBQ3hCO0lBQ0QsTUFBTSxTQUFTLEdBQUcscUJBQWEsRUFBRSxDQUFDO0lBQ2xDLE1BQU0sUUFBUSxHQUFHLGlDQUFXLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3BELElBQUksUUFBUSxJQUFJLElBQUksRUFBRTtRQUNwQixNQUFNLElBQUksS0FBSyxDQUFDLHNDQUFzQyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztLQUNoRjtJQUNELE1BQU0sRUFBQyxHQUFHLEVB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QUFHLFlBQVksQ0FBQyxVQUFVLENBQUM7SUFDakUsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUFDO0lBQ25FLDBCQUEwQjtJQUMxQixPQUFPLFlBQVksQ0FBQztBQUN0QixDQUFDO0FBckRELHdCQXFEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Z2V0Q21kT3B0aW9uc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge2ZpbmRQYWNrYWdlfSBmcm9tICcuL2J1aWxkLXRhcmdldC1oZWxwZXInO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbi8vIGltcG9ydCB0eXBlIHtQbGlua0Vudn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9ub2RlLXBhdGgnO1xuaW1wb3J0IHBDZmcgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9jb25maWcnO1xuaW1wb3J0IHsgQ29uZmlnSGFuZGxlck1nciB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHtSZWFjdFNjcmlwdHNIYW5kbGVyLCBDcmFTY3JpcHRzUGF0aHN9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IGZzZXh0IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7bG9nNEZpbGUsIGNvbmZpZ30gZnJvbSAnQHdmaC9wbGluayc7XG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcblxuZXhwb3J0IGNvbnN0IFBLR19MSUJfRU5UUllfUFJPUCA9ICdjcmEtbGliLWVudHJ5JztcbmV4cG9ydCBjb25zdCBQS0dfTElCX0VOVFJZX0RFRkFVTFQgPSAncHVibGljX2FwaS50cyc7XG5leHBvcnQgY29uc3QgUEtHX0FQUF9FTlRSWV9QUk9QID0gJ2NyYS1hcHAtZW50cnknO1xuZXhwb3J0IGNvbnN0IFBLR19BUFBfRU5UUllfREVGQVVMVCA9ICdzdGFydC50c3gnO1xuXG5sZXQgY3JhU2NyaXB0c1BhdGhzOiBDcmFTY3JpcHRzUGF0aHM7XG5sZXQgY29uZmlnRmlsZUluUGFja2FnZTogc3RyaW5nIHwgdW5kZWZpbmVkIHwgbnVsbDtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldENvbmZpZ0ZpbGVJblBhY2thZ2UoKSB7XG4gIGlmIChjb25maWdGaWxlSW5QYWNrYWdlKSB7XG4gICAgcmV0dXJuIGNvbmZpZ0ZpbGVJblBhY2thZ2U7XG4gIH0gZWxzZSB7XG4gICAgcGF0aHMoKTtcbiAgICByZXR1cm4gY29uZmlnRmlsZUluUGFja2FnZTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBwYXRocygpIHtcbiAgaWYgKGNyYVNjcmlwdHNQYXRocykge1xuICAgIHJldHVybiBjcmFTY3JpcHRzUGF0aHM7XG4gIH1cbiAgY29uc3QgY21kT3B0aW9uID0gZ2V0Q21kT3B0aW9ucygpO1xuICBjb25zdCBmb3VuZFBrZyA9IGZpbmRQYWNrYWdlKGNtZE9wdGlvbi5idWlsZFRhcmdldCk7XG4gIGlmIChmb3VuZFBrZyA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDYW4gbm90IGZpbmQgcGFja2FnZSBmb3IgbmFtZSBsaWtlICR7Y21kT3B0aW9uLmJ1aWxkVGFyZ2V0fWApO1xuICB9XG4gIGNvbnN0IHtkaXIsIHBhY2thZ2VKc29ufSA9IGZvdW5kUGtnO1xuXG4gIGNvbnN0IHBhdGhzOiBDcmFTY3JpcHRzUGF0aHMgPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LXNjcmlwdHMvY29uZmlnL3BhdGhzJykpO1xuICBjb25zdCBjaGFuZ2VkUGF0aHMgPSBwYXRocztcblxuICBjb25zdCBwbGlua1Byb3BzID0gcGFja2FnZUpzb24ucGxpbmsgPyBwYWNrYWdlSnNvbi5wbGluayA6IHBhY2thZ2VKc29uLmRyO1xuICBpZiAoY21kT3B0aW9uLmJ1aWxkVHlwZSA9PT0gJ2xpYicpIHtcbiAgICBjaGFuZ2VkUGF0aHMuYXBwQnVpbGQgPSBQYXRoLnJlc29sdmUoZGlyLCAnYnVpbGQnKTtcbiAgICBjaGFuZ2VkUGF0aHMuYXBwSW5kZXhKcyA9IFBhdGgucmVzb2x2ZShkaXIsIF8uZ2V0KHBsaW5rUHJvcHMsIFtQS0dfTElCX0VOVFJZX1BST1BdLCBQS0dfTElCX0VOVFJZX0RFRkFVTFQpKTtcbiAgfSBlbHNlIGlmIChjbWRPcHRpb24uYnVpbGRUeXBlID09PSAnYXBwJykge1xuICAgIGNoYW5nZWRQYXRocy5hcHBJbmRleEpzID0gUGF0aC5yZXNvbHZlKGRpciwgXy5nZXQocGxpbmtQcm9wcywgW1BLR19BUFBfRU5UUllfUFJPUF0sIFBLR19BUFBfRU5UUllfREVGQVVMVCkpO1xuICAgIGNoYW5nZWRQYXRocy5hcHBCdWlsZCA9IHBDZmcucmVzb2x2ZSgnc3RhdGljRGlyJyk7XG4gIH1cbiAgbG9nLmRlYnVnKGNoYW5nZWRQYXRocyk7XG5cbiAgcENmZy5jb25maWdIYW5kbGVyTWdyQ2hhbmdlZChoYW5kbGVyID0+IGhhbmRsZXIucnVuRWFjaFN5bmM8UmVhY3RTY3JpcHRzSGFuZGxlcj4oKGNmZ0ZpbGUsIHJlc3VsdCwgaGFuZGxlcikgPT4ge1xuICAgIGlmIChoYW5kbGVyLmNoYW5nZUNyYVBhdGhzICE9IG51bGwpIHtcbiAgICAgIGxvZy5pbmZvKCdFeGVjdXRlIENSQSBzY3JpcHRzIHBhdGhzIG92ZXJyaWRlcycsIGNmZ0ZpbGUpO1xuICAgICAgaGFuZGxlci5jaGFuZ2VDcmFQYXRocyhjaGFuZ2VkUGF0aHMsIGNvbmZpZygpLmNsaU9wdGlvbnM/LmVudiEsIGNtZE9wdGlvbik7XG4gICAgfVxuICB9KSk7XG5cbiAgY29uZmlnRmlsZUluUGFja2FnZSA9IFBhdGgucmVzb2x2ZShkaXIsIF8uZ2V0KHBsaW5rUHJvcHMsIFsnY29uZmlnLW92ZXJyaWRlcy1wYXRoJ10sICdjb25maWctb3ZlcnJpZGVzLnRzJykpO1xuXG4gIGlmIChmcy5leGlzdHNTeW5jKGNvbmZpZ0ZpbGVJblBhY2thZ2UpKSB7XG4gICAgY29uc3QgY2ZnTWdyID0gbmV3IENvbmZpZ0hhbmRsZXJNZ3IoW2NvbmZpZ0ZpbGVJblBhY2thZ2VdKTtcbiAgICBjZmdNZ3IucnVuRWFjaFN5bmM8UmVhY3RTY3JpcHRzSGFuZGxlcj4oKGNmZ0ZpbGUsIHJlc3VsdCwgaGFuZGxlcikgPT4ge1xuICAgICAgaWYgKGhhbmRsZXIuY2hhbmdlQ3JhUGF0aHMgIT0gbnVsbCkge1xuICAgICAgICBsb2cuaW5mbygnRXhlY3V0ZSBDUkEgc2NyaXB0cyBwYXRocyBjb25maWd1cmF0aW9uIG92ZXJyaWRlcyBmcm9tICcsIGNmZ0ZpbGUpO1xuICAgICAgICBoYW5kbGVyLmNoYW5nZUNyYVBhdGhzKGNoYW5nZWRQYXRocywgY29uZmlnKCkuY2xpT3B0aW9ucz8uZW52ISwgY21kT3B0aW9uKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBjb25maWdGaWxlSW5QYWNrYWdlID0gbnVsbDtcbiAgfVxuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgLy8gY29uc29sZS5sb2coJ1tjcmEtc2NyaXB0cy1wYXRoc10gY2hhbmdlZCByZWFjdC1zY3JpcHRzIHBhdGhzOlxcbicsIGNoYW5nZWRQYXRocyk7XG4gIGNyYVNjcmlwdHNQYXRocyA9IGNoYW5nZWRQYXRocztcbiAgZnNleHQubWtkaXJwU3luYyhjaGFuZ2VkUGF0aHMuYXBwQnVpbGQpO1xuICAvLyBmb3JrLXRzLWNoZWNrZXIgbmVlZHMgdGhpcyBmaWxlIHBhdGhcbiAgcHJvY2Vzcy5lbnYuX3BsaW5rX2NyYV9zY3JpcHRzX2luZGV4SnMgPSBjaGFuZ2VkUGF0aHMuYXBwSW5kZXhKcztcbiAgcHJvY2Vzcy5lbnYuX3BsaW5rX2NyYV9zY3JpcHRzX3RzQ29uZmlnID0gY2hhbmdlZFBhdGhzLmFwcFRzQ29uZmlnO1xuICAvLyBsb2cud2FybihjaGFuZ2VkUGF0aHMpO1xuICByZXR1cm4gY2hhbmdlZFBhdGhzO1xufVxuXG5cbiJdfQ==