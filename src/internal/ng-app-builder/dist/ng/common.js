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
exports.newContext = exports.initCli = void 0;
// import type api from '__api';
const fs_extra_1 = __importDefault(require("fs-extra"));
const node_version_check_1 = __importDefault(require("@wfh/plink/wfh/dist/utils/node-version-check"));
const config_1 = __importDefault(require("@wfh/plink/wfh/dist/config"));
const dist_1 = require("@wfh/plink/wfh/dist");
const lodash_1 = __importDefault(require("lodash"));
// export type DrcpConfig = typeof api.config;
function initCli(options) {
    return __awaiter(this, void 0, void 0, function* () {
        yield node_version_check_1.default();
        const drcpConfigFiles = options.drcpConfig ? options.drcpConfig.split(/\s*[,;:]\s*/) : [];
        const config = yield initDrcp(options.drcpArgs, drcpConfigFiles);
        fs_extra_1.default.mkdirpSync(config.resolve('destDir', 'ng-app-builder.report'));
        return config;
    });
}
exports.initCli = initCli;
function initDrcp(drcpArgs, drcpConfigFiles) {
    return __awaiter(this, void 0, void 0, function* () {
        if (drcpArgs.c == null)
            drcpArgs.c = [];
        const unfreezedPlinkArgs = lodash_1.default.cloneDeep(drcpArgs);
        unfreezedPlinkArgs.c.push(...drcpConfigFiles);
        // console.log('~~~~~~~~~~~~~~~~~~~~~');
        dist_1.initProcess();
        // await import ('@wfh/plink/wfh/dist/package-mgr/index');
        const cmdOptions = { config: unfreezedPlinkArgs.c, prop: unfreezedPlinkArgs.p || unfreezedPlinkArgs.prop || [] };
        dist_1.initConfig(cmdOptions);
        // for forked tscheck process of @ngtool/webpack
        process.env._ngcli_plink_arg = JSON.stringify(cmdOptions);
        return config_1.default;
    });
}
function newContext(ngBuildOption, options) {
    const constructor = require('./builder-context').BuilderContext;
    return new constructor(ngBuildOption, options);
}
exports.newContext = newContext;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29tbW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQU1BLGdDQUFnQztBQUNoQyx3REFBMEI7QUFDMUIsc0dBQXFFO0FBQ3JFLHdFQUFnRDtBQUVoRCw4Q0FBNEQ7QUFDNUQsb0RBQXVCO0FBQ3ZCLDhDQUE4QztBQUU5QyxTQUFzQixPQUFPLENBQUMsT0FBMkI7O1FBQ3ZELE1BQU0sNEJBQVMsRUFBRSxDQUFDO1FBQ2xCLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFFLE9BQU8sQ0FBQyxVQUFxQixDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3RHLE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDakUsa0JBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsdUJBQXVCLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7Q0FBQTtBQU5ELDBCQU1DO0FBQ0QsU0FBZSxRQUFRLENBQUMsUUFBYSxFQUFFLGVBQXlCOztRQUM5RCxJQUFJLFFBQVEsQ0FBQyxDQUFDLElBQUksSUFBSTtZQUNwQixRQUFRLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNsQixNQUFNLGtCQUFrQixHQUFHLGdCQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2pELGtCQUFrQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxlQUFlLENBQUMsQ0FBQztRQUM5Qyx3Q0FBd0M7UUFDeEMsa0JBQVcsRUFBRSxDQUFDO1FBQ2QsMERBQTBEO1FBQzFELE1BQU0sVUFBVSxHQUFHLEVBQUMsTUFBTSxFQUFFLGtCQUFrQixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLElBQUksSUFBSSxFQUFFLEVBQUMsQ0FBQztRQUMvRyxpQkFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3ZCLGdEQUFnRDtRQUNoRCxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDMUQsT0FBTyxnQkFBTSxDQUFDO0lBQ2hCLENBQUM7Q0FBQTtBQTRCRCxTQUFnQixVQUFVLENBQUMsYUFBOEIsRUFBRSxPQUErQjtJQUN4RixNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxjQUF1QyxDQUFDO0lBQ3pGLE9BQU8sSUFBSSxXQUFXLENBQUMsYUFBYSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ2pELENBQUM7QUFIRCxnQ0FHQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlICBuby1jb25zb2xlLCBtYXgtbGVuICovXG5pbXBvcnQgeyBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucyAgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic7XG5pbXBvcnQgeyBTY2hlbWEgYXMgTm9ybWFsaXplZEJyb3dzZXJCdWlsZGVyU2NoZW1hIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL2Jyb3dzZXIvc2NoZW1hJztcbmltcG9ydCB7IFNjaGVtYSBhcyBOb3JtYWxpemVkU2VydmVyQnVpbGRlclNlcnZlclNjaGVtYSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy9zZXJ2ZXIvc2NoZW1hJztcbmltcG9ydCB7anNvbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IF9fY2hhbmdlV2VicGFja0NvbmZpZywge3RyYW5zZm9ybUluZGV4SHRtbCBhcyBfdHJhbnNmb3JtSW5kZXhIdG1sfSBmcm9tICcuLi9jb25maWctd2VicGFjayc7XG4vLyBpbXBvcnQgdHlwZSBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBub2RlQ2hlY2sgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9ub2RlLXZlcnNpb24tY2hlY2snO1xuaW1wb3J0IGNvbmZpZyBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2NvbmZpZyc7XG5pbXBvcnQgdHlwZSB7RHJjcENvbmZpZ30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdCc7XG5pbXBvcnQge2luaXRQcm9jZXNzLCBpbml0Q29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0JztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG4vLyBleHBvcnQgdHlwZSBEcmNwQ29uZmlnID0gdHlwZW9mIGFwaS5jb25maWc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbml0Q2xpKG9wdGlvbnM6IERyY3BCdWlsZGVyT3B0aW9ucyk6IFByb21pc2U8RHJjcENvbmZpZz4ge1xuICBhd2FpdCBub2RlQ2hlY2soKTtcbiAgY29uc3QgZHJjcENvbmZpZ0ZpbGVzID0gb3B0aW9ucy5kcmNwQ29uZmlnID8gKG9wdGlvbnMuZHJjcENvbmZpZyBhcyBzdHJpbmcpLnNwbGl0KC9cXHMqWyw7Ol1cXHMqLykgOiBbXTtcbiAgY29uc3QgY29uZmlnID0gYXdhaXQgaW5pdERyY3Aob3B0aW9ucy5kcmNwQXJncywgZHJjcENvbmZpZ0ZpbGVzKTtcbiAgZnMubWtkaXJwU3luYyhjb25maWcucmVzb2x2ZSgnZGVzdERpcicsICduZy1hcHAtYnVpbGRlci5yZXBvcnQnKSk7XG4gIHJldHVybiBjb25maWc7XG59XG5hc3luYyBmdW5jdGlvbiBpbml0RHJjcChkcmNwQXJnczogYW55LCBkcmNwQ29uZmlnRmlsZXM6IHN0cmluZ1tdKTogUHJvbWlzZTxEcmNwQ29uZmlnPiB7XG4gIGlmIChkcmNwQXJncy5jID09IG51bGwpXG4gICAgZHJjcEFyZ3MuYyA9IFtdO1xuICBjb25zdCB1bmZyZWV6ZWRQbGlua0FyZ3MgPSBfLmNsb25lRGVlcChkcmNwQXJncyk7XG4gIHVuZnJlZXplZFBsaW5rQXJncy5jLnB1c2goLi4uZHJjcENvbmZpZ0ZpbGVzKTtcbiAgLy8gY29uc29sZS5sb2coJ35+fn5+fn5+fn5+fn5+fn5+fn5+ficpO1xuICBpbml0UHJvY2VzcygpO1xuICAvLyBhd2FpdCBpbXBvcnQgKCdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtbWdyL2luZGV4Jyk7XG4gIGNvbnN0IGNtZE9wdGlvbnMgPSB7Y29uZmlnOiB1bmZyZWV6ZWRQbGlua0FyZ3MuYywgcHJvcDogdW5mcmVlemVkUGxpbmtBcmdzLnAgfHwgdW5mcmVlemVkUGxpbmtBcmdzLnByb3AgfHwgW119O1xuICBpbml0Q29uZmlnKGNtZE9wdGlvbnMpO1xuICAvLyBmb3IgZm9ya2VkIHRzY2hlY2sgcHJvY2VzcyBvZiBAbmd0b29sL3dlYnBhY2tcbiAgcHJvY2Vzcy5lbnYuX25nY2xpX3BsaW5rX2FyZyA9IEpTT04uc3RyaW5naWZ5KGNtZE9wdGlvbnMpO1xuICByZXR1cm4gY29uZmlnO1xufVxuXG5leHBvcnQgdHlwZSBidWlsZFdlYnBhY2tDb25maWdGdW5jID0gKGJyb3dzZXJPcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMpID0+IGFueTtcblxuZXhwb3J0IGludGVyZmFjZSBBbmd1bGFyQ2xpUGFyYW0ge1xuICBidWlsZGVyQ29uZmlnPzogRGV2U2VydmVyQnVpbGRlck9wdGlvbnM7XG4gIGJyb3dzZXJPcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnM7XG4gIHNzcjogYm9vbGVhbjsgLy8gSXMgc2VydmVyIHNpZGUgLyBwcmVyZW5kZXJcbiAgLy8gd2VicGFja0NvbmZpZzogYW55O1xuICAvLyBwcm9qZWN0Um9vdDogc3RyaW5nO1xuICAvLyBhcmd2OiBhbnk7XG59XG5cbmV4cG9ydCB0eXBlIE5vcm1hbGl6ZWRBbmd1bGFyQnVpbGRTY2hlbWEgPSBOb3JtYWxpemVkQnJvd3NlckJ1aWxkZXJTY2hlbWEgfCBOb3JtYWxpemVkU2VydmVyQnVpbGRlclNlcnZlclNjaGVtYTtcbi8vIE5vcm1hbGl6ZWRLYXJtYUJ1aWxkZXJTY2hlbWE7XG5cbmV4cG9ydCB0eXBlIEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyA9XG4gIE5vcm1hbGl6ZWRCcm93c2VyQnVpbGRlclNjaGVtYSAmIE5vcm1hbGl6ZWRTZXJ2ZXJCdWlsZGVyU2VydmVyU2NoZW1hICZcbiAgLy8gTm9ybWFsaXplZEthcm1hQnVpbGRlclNjaGVtYSAmXG4gIERyY3BCdWlsZGVyT3B0aW9ucyAmIGpzb24uSnNvbk9iamVjdDtcblxuZXhwb3J0IGludGVyZmFjZSBEcmNwQnVpbGRlck9wdGlvbnMge1xuICBkcmNwQXJnczogYW55O1xuICBkcmNwQ29uZmlnOiBzdHJpbmc7XG59XG5cbmltcG9ydCB7QnVpbGRlckNvbnRleHQsIEJ1aWxkZXJDb250ZXh0T3B0aW9uc30gZnJvbSAnLi9idWlsZGVyLWNvbnRleHQnO1xuXG5leHBvcnQgZnVuY3Rpb24gbmV3Q29udGV4dChuZ0J1aWxkT3B0aW9uOiBBbmd1bGFyQ2xpUGFyYW0sIG9wdGlvbnM/OiBCdWlsZGVyQ29udGV4dE9wdGlvbnMpIHtcbiAgY29uc3QgY29uc3RydWN0b3IgPSByZXF1aXJlKCcuL2J1aWxkZXItY29udGV4dCcpLkJ1aWxkZXJDb250ZXh0IGFzIHR5cGVvZiBCdWlsZGVyQ29udGV4dDtcbiAgcmV0dXJuIG5ldyBjb25zdHJ1Y3RvcihuZ0J1aWxkT3B0aW9uLCBvcHRpb25zKTtcbn1cbiJdfQ==