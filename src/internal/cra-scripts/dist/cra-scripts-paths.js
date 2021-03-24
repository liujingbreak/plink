"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configFileInPackage = void 0;
const utils_1 = require("./utils");
const build_target_helper_1 = require("./build-target-helper");
const path_1 = __importDefault(require("path"));
const lodash_1 = __importDefault(require("lodash"));
const fs_1 = __importDefault(require("fs"));
// import type {PlinkEnv} from '@wfh/plink/wfh/dist/node-path';
const config_1 = __importDefault(require("@wfh/plink/wfh/dist/config"));
const config_handler_1 = require("@wfh/plink/wfh/dist/config-handler");
const fs_extra_1 = __importDefault(require("fs-extra"));
const __plink_1 = __importDefault(require("__plink"));
const log = __plink_1.default.logger;
let craScriptsPaths;
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
    if (cmdOption.buildType === 'lib') {
        changedPaths.appBuild = path_1.default.resolve(dir, 'build');
        changedPaths.appIndexJs = path_1.default.resolve(dir, lodash_1.default.get(packageJson, 'dr.cra-lib-entry', 'public_api.ts'));
    }
    else if (cmdOption.buildType === 'app') {
        changedPaths.appIndexJs = path_1.default.resolve(dir, lodash_1.default.get(packageJson, 'dr.cra-app-entry', 'start.tsx'));
        changedPaths.appBuild = config_1.default.resolve('staticDir');
    }
    log.debug(changedPaths);
    config_1.default.configHandlerMgrChanged(handler => handler.runEachSync((cfgFile, result, handler) => {
        var _a;
        if (handler.changeCraPaths != null) {
            log.info('Execute CRA scripts paths overrides', cfgFile);
            handler.changeCraPaths(changedPaths, (_a = __plink_1.default.config().cliOptions) === null || _a === void 0 ? void 0 : _a.env, cmdOption);
        }
    }));
    exports.configFileInPackage = path_1.default.resolve(dir, lodash_1.default.get(packageJson, ['dr', 'config-overrides-path'], 'config-overrides.ts'));
    if (fs_1.default.existsSync(exports.configFileInPackage)) {
        const cfgMgr = new config_handler_1.ConfigHandlerMgr([exports.configFileInPackage]);
        cfgMgr.runEachSync((cfgFile, result, handler) => {
            var _a;
            if (handler.changeCraPaths != null) {
                log.info('Execute CRA scripts paths configuration overrides from ', cfgFile);
                handler.changeCraPaths(changedPaths, (_a = __plink_1.default.config().cliOptions) === null || _a === void 0 ? void 0 : _a.env, cmdOption);
            }
        });
    }
    else {
        exports.configFileInPackage = null;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JhLXNjcmlwdHMtcGF0aHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmEtc2NyaXB0cy1wYXRocy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxtQ0FBc0M7QUFDdEMsK0RBQWtEO0FBQ2xELGdEQUF3QjtBQUN4QixvREFBdUI7QUFDdkIsNENBQW9CO0FBQ3BCLCtEQUErRDtBQUMvRCx3RUFBOEM7QUFDOUMsdUVBQXNFO0FBRXRFLHdEQUE2QjtBQUM3QixzREFBNEI7QUFDNUIsTUFBTSxHQUFHLEdBQUcsaUJBQUssQ0FBQyxNQUFNLENBQUM7QUFJekIsSUFBSSxlQUFnQyxDQUFDO0FBR3JDLFNBQXdCLEtBQUs7SUFDM0IsSUFBSSxlQUFlLEVBQUU7UUFDbkIsT0FBTyxlQUFlLENBQUM7S0FDeEI7SUFDRCxNQUFNLFNBQVMsR0FBRyxxQkFBYSxFQUFFLENBQUM7SUFDbEMsTUFBTSxRQUFRLEdBQUcsaUNBQVcsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDcEQsSUFBSSxRQUFRLElBQUksSUFBSSxFQUFFO1FBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMsc0NBQXNDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO0tBQ2hGO0lBQ0QsTUFBTSxFQUFDLEdBQUcsRUFBRSxXQUFXLEVBQUMsR0FBRyxRQUFRLENBQUM7SUFFcEMsTUFBTSxLQUFLLEdBQW9CLE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLHlDQUF5QyxDQUFDLENBQUMsQ0FBQztJQUNoRyxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUM7SUFFM0IsSUFBSSxTQUFTLENBQUMsU0FBUyxLQUFLLEtBQUssRUFBRTtRQUNqQyxZQUFZLENBQUMsUUFBUSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ25ELFlBQVksQ0FBQyxVQUFVLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsZ0JBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLGtCQUFrQixFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUM7S0FDdEc7U0FBTSxJQUFJLFNBQVMsQ0FBQyxTQUFTLEtBQUssS0FBSyxFQUFFO1FBQ3hDLFlBQVksQ0FBQyxVQUFVLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsZ0JBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLGtCQUFrQixFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDakcsWUFBWSxDQUFDLFFBQVEsR0FBRyxnQkFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztLQUNuRDtJQUNELEdBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7SUFFeEIsZ0JBQUksQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQXNCLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsRUFBRTs7UUFDNUcsSUFBSSxPQUFPLENBQUMsY0FBYyxJQUFJLElBQUksRUFBRTtZQUNsQyxHQUFHLENBQUMsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3pELE9BQU8sQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLE1BQUEsaUJBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxVQUFVLDBDQUFFLEdBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztTQUNsRjtJQUNILENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFSiwyQkFBbUIsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxnQkFBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLENBQUMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7SUFFcEgsSUFBSSxZQUFFLENBQUMsVUFBVSxDQUFDLDJCQUFtQixDQUFDLEVBQUU7UUFDdEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxpQ0FBZ0IsQ0FBQyxDQUFDLDJCQUFtQixDQUFDLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFzQixDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUU7O1lBQ25FLElBQUksT0FBTyxDQUFDLGNBQWMsSUFBSSxJQUFJLEVBQUU7Z0JBQ2xDLEdBQUcsQ0FBQyxJQUFJLENBQUMseURBQXlELEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQzdFLE9BQU8sQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLE1BQUEsaUJBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxVQUFVLDBDQUFFLEdBQUksRUFBRSxTQUFTLENBQUMsQ0FBQzthQUNsRjtRQUNILENBQUMsQ0FBQyxDQUFDO0tBQ0o7U0FBTTtRQUNMLDJCQUFtQixHQUFHLElBQUksQ0FBQztLQUM1QjtJQUNELHVDQUF1QztJQUN2QyxtRkFBbUY7SUFDbkYsZUFBZSxHQUFHLFlBQVksQ0FBQztJQUMvQixrQkFBSyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDeEMsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEdBQUcsWUFBWSxDQUFDLFVBQVUsQ0FBQztJQUNqRSxPQUFPLENBQUMsR0FBRyxDQUFDLDJCQUEyQixHQUFHLFlBQVksQ0FBQyxXQUFXLENBQUM7SUFDbkUsMEJBQTBCO0lBQzFCLE9BQU8sWUFBWSxDQUFDO0FBQ3RCLENBQUM7QUFwREQsd0JBb0RDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtnZXRDbWRPcHRpb25zfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7ZmluZFBhY2thZ2V9IGZyb20gJy4vYnVpbGQtdGFyZ2V0LWhlbHBlcic7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuLy8gaW1wb3J0IHR5cGUge1BsaW5rRW52fSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L25vZGUtcGF0aCc7XG5pbXBvcnQgcENmZyBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2NvbmZpZyc7XG5pbXBvcnQgeyBDb25maWdIYW5kbGVyTWdyIH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9jb25maWctaGFuZGxlcic7XG5pbXBvcnQge1JlYWN0U2NyaXB0c0hhbmRsZXIsIENyYVNjcmlwdHNQYXRoc30gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgZnNleHQgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHBsaW5rIGZyb20gJ19fcGxpbmsnO1xuY29uc3QgbG9nID0gcGxpbmsubG9nZ2VyO1xuXG5cblxubGV0IGNyYVNjcmlwdHNQYXRoczogQ3JhU2NyaXB0c1BhdGhzO1xuZXhwb3J0IGxldCBjb25maWdGaWxlSW5QYWNrYWdlOiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBwYXRocygpIHtcbiAgaWYgKGNyYVNjcmlwdHNQYXRocykge1xuICAgIHJldHVybiBjcmFTY3JpcHRzUGF0aHM7XG4gIH1cbiAgY29uc3QgY21kT3B0aW9uID0gZ2V0Q21kT3B0aW9ucygpO1xuICBjb25zdCBmb3VuZFBrZyA9IGZpbmRQYWNrYWdlKGNtZE9wdGlvbi5idWlsZFRhcmdldCk7XG4gIGlmIChmb3VuZFBrZyA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDYW4gbm90IGZpbmQgcGFja2FnZSBmb3IgbmFtZSBsaWtlICR7Y21kT3B0aW9uLmJ1aWxkVGFyZ2V0fWApO1xuICB9XG4gIGNvbnN0IHtkaXIsIHBhY2thZ2VKc29ufSA9IGZvdW5kUGtnO1xuXG4gIGNvbnN0IHBhdGhzOiBDcmFTY3JpcHRzUGF0aHMgPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LXNjcmlwdHMvY29uZmlnL3BhdGhzJykpO1xuICBjb25zdCBjaGFuZ2VkUGF0aHMgPSBwYXRocztcblxuICBpZiAoY21kT3B0aW9uLmJ1aWxkVHlwZSA9PT0gJ2xpYicpIHtcbiAgICBjaGFuZ2VkUGF0aHMuYXBwQnVpbGQgPSBQYXRoLnJlc29sdmUoZGlyLCAnYnVpbGQnKTtcbiAgICBjaGFuZ2VkUGF0aHMuYXBwSW5kZXhKcyA9IFBhdGgucmVzb2x2ZShkaXIsIF8uZ2V0KHBhY2thZ2VKc29uLCAnZHIuY3JhLWxpYi1lbnRyeScsICdwdWJsaWNfYXBpLnRzJykpO1xuICB9IGVsc2UgaWYgKGNtZE9wdGlvbi5idWlsZFR5cGUgPT09ICdhcHAnKSB7XG4gICAgY2hhbmdlZFBhdGhzLmFwcEluZGV4SnMgPSBQYXRoLnJlc29sdmUoZGlyLCBfLmdldChwYWNrYWdlSnNvbiwgJ2RyLmNyYS1hcHAtZW50cnknLCAnc3RhcnQudHN4JykpO1xuICAgIGNoYW5nZWRQYXRocy5hcHBCdWlsZCA9IHBDZmcucmVzb2x2ZSgnc3RhdGljRGlyJyk7XG4gIH1cbiAgbG9nLmRlYnVnKGNoYW5nZWRQYXRocyk7XG5cbiAgcENmZy5jb25maWdIYW5kbGVyTWdyQ2hhbmdlZChoYW5kbGVyID0+IGhhbmRsZXIucnVuRWFjaFN5bmM8UmVhY3RTY3JpcHRzSGFuZGxlcj4oKGNmZ0ZpbGUsIHJlc3VsdCwgaGFuZGxlcikgPT4ge1xuICAgIGlmIChoYW5kbGVyLmNoYW5nZUNyYVBhdGhzICE9IG51bGwpIHtcbiAgICAgIGxvZy5pbmZvKCdFeGVjdXRlIENSQSBzY3JpcHRzIHBhdGhzIG92ZXJyaWRlcycsIGNmZ0ZpbGUpO1xuICAgICAgaGFuZGxlci5jaGFuZ2VDcmFQYXRocyhjaGFuZ2VkUGF0aHMsIHBsaW5rLmNvbmZpZygpLmNsaU9wdGlvbnM/LmVudiEsIGNtZE9wdGlvbik7XG4gICAgfVxuICB9KSk7XG5cbiAgY29uZmlnRmlsZUluUGFja2FnZSA9IFBhdGgucmVzb2x2ZShkaXIsIF8uZ2V0KHBhY2thZ2VKc29uLCBbJ2RyJywgJ2NvbmZpZy1vdmVycmlkZXMtcGF0aCddLCAnY29uZmlnLW92ZXJyaWRlcy50cycpKTtcblxuICBpZiAoZnMuZXhpc3RzU3luYyhjb25maWdGaWxlSW5QYWNrYWdlKSkge1xuICAgIGNvbnN0IGNmZ01nciA9IG5ldyBDb25maWdIYW5kbGVyTWdyKFtjb25maWdGaWxlSW5QYWNrYWdlXSk7XG4gICAgY2ZnTWdyLnJ1bkVhY2hTeW5jPFJlYWN0U2NyaXB0c0hhbmRsZXI+KChjZmdGaWxlLCByZXN1bHQsIGhhbmRsZXIpID0+IHtcbiAgICAgIGlmIChoYW5kbGVyLmNoYW5nZUNyYVBhdGhzICE9IG51bGwpIHtcbiAgICAgICAgbG9nLmluZm8oJ0V4ZWN1dGUgQ1JBIHNjcmlwdHMgcGF0aHMgY29uZmlndXJhdGlvbiBvdmVycmlkZXMgZnJvbSAnLCBjZmdGaWxlKTtcbiAgICAgICAgaGFuZGxlci5jaGFuZ2VDcmFQYXRocyhjaGFuZ2VkUGF0aHMsIHBsaW5rLmNvbmZpZygpLmNsaU9wdGlvbnM/LmVudiEsIGNtZE9wdGlvbik7XG4gICAgICB9XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgY29uZmlnRmlsZUluUGFja2FnZSA9IG51bGw7XG4gIH1cbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIC8vIGNvbnNvbGUubG9nKCdbY3JhLXNjcmlwdHMtcGF0aHNdIGNoYW5nZWQgcmVhY3Qtc2NyaXB0cyBwYXRoczpcXG4nLCBjaGFuZ2VkUGF0aHMpO1xuICBjcmFTY3JpcHRzUGF0aHMgPSBjaGFuZ2VkUGF0aHM7XG4gIGZzZXh0Lm1rZGlycFN5bmMoY2hhbmdlZFBhdGhzLmFwcEJ1aWxkKTtcbiAgLy8gZm9yay10cy1jaGVja2VyIG5lZWRzIHRoaXMgZmlsZSBwYXRoXG4gIHByb2Nlc3MuZW52Ll9wbGlua19jcmFfc2NyaXB0c19pbmRleEpzID0gY2hhbmdlZFBhdGhzLmFwcEluZGV4SnM7XG4gIHByb2Nlc3MuZW52Ll9wbGlua19jcmFfc2NyaXB0c190c0NvbmZpZyA9IGNoYW5nZWRQYXRocy5hcHBUc0NvbmZpZztcbiAgLy8gbG9nLndhcm4oY2hhbmdlZFBhdGhzKTtcbiAgcmV0dXJuIGNoYW5nZWRQYXRocztcbn1cblxuXG4iXX0=