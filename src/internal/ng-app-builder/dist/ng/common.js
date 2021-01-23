"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
        drcpArgs.c.push(...drcpConfigFiles);
        // console.log('~~~~~~~~~~~~~~~~~~~~~');
        dist_1.initProcess();
        yield Promise.resolve().then(() => __importStar(require('@wfh/plink/wfh/dist/package-mgr/index')));
        const cmdOptions = { config: drcpArgs.c, prop: drcpArgs.p || drcpArgs.prop || [] };
        yield dist_1.initConfigAsync(cmdOptions);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29tbW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFNQSxnQ0FBZ0M7QUFDaEMsd0RBQTBCO0FBQzFCLHNHQUFxRTtBQUNyRSx3RUFBZ0Q7QUFFaEQsOENBQWlFO0FBRWpFLDhDQUE4QztBQUU5QyxTQUFzQixPQUFPLENBQUMsT0FBMkI7O1FBQ3ZELE1BQU0sNEJBQVMsRUFBRSxDQUFDO1FBQ2xCLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFFLE9BQU8sQ0FBQyxVQUFxQixDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3RHLE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDakUsa0JBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsdUJBQXVCLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7Q0FBQTtBQU5ELDBCQU1DO0FBQ0QsU0FBZSxRQUFRLENBQUMsUUFBYSxFQUFFLGVBQXlCOztRQUM5RCxJQUFJLFFBQVEsQ0FBQyxDQUFDLElBQUksSUFBSTtZQUNwQixRQUFRLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNsQixRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLGVBQWUsQ0FBQyxDQUFDO1FBQ3BDLHdDQUF3QztRQUN4QyxrQkFBVyxFQUFFLENBQUM7UUFDZCx3REFBYyx1Q0FBdUMsR0FBQyxDQUFDO1FBQ3ZELE1BQU0sVUFBVSxHQUFHLEVBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLElBQUksSUFBSSxFQUFFLEVBQUMsQ0FBQztRQUNqRixNQUFNLHNCQUFlLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDbEMsZ0RBQWdEO1FBQ2hELE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUMxRCxPQUFPLGdCQUFNLENBQUM7SUFDaEIsQ0FBQztDQUFBO0FBNEJELFNBQWdCLFVBQVUsQ0FBQyxhQUE4QixFQUFFLE9BQStCO0lBQ3hGLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLGNBQXVDLENBQUM7SUFDekYsT0FBTyxJQUFJLFdBQVcsQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDakQsQ0FBQztBQUhELGdDQUdDIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSBtYXgtbGluZS1sZW5ndGggKi9cbmltcG9ydCB7IERldlNlcnZlckJ1aWxkZXJPcHRpb25zICB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJztcbmltcG9ydCB7IFNjaGVtYSBhcyBOb3JtYWxpemVkQnJvd3NlckJ1aWxkZXJTY2hlbWEgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9zcmMvYnJvd3Nlci9zY2hlbWEnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIE5vcm1hbGl6ZWRTZXJ2ZXJCdWlsZGVyU2VydmVyU2NoZW1hIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL3NlcnZlci9zY2hlbWEnO1xuaW1wb3J0IHtqc29ufSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgX19jaGFuZ2VXZWJwYWNrQ29uZmlnLCB7dHJhbnNmb3JtSW5kZXhIdG1sIGFzIF90cmFuc2Zvcm1JbmRleEh0bWx9IGZyb20gJy4uL2NvbmZpZy13ZWJwYWNrJztcbi8vIGltcG9ydCB0eXBlIGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IG5vZGVDaGVjayBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL25vZGUtdmVyc2lvbi1jaGVjayc7XG5pbXBvcnQgY29uZmlnIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvY29uZmlnJztcbmltcG9ydCB0eXBlIHtEcmNwQ29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0JztcbmltcG9ydCB7aW5pdFByb2Nlc3MsIGluaXRDb25maWdBc3luY30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdCc7XG5cbi8vIGV4cG9ydCB0eXBlIERyY3BDb25maWcgPSB0eXBlb2YgYXBpLmNvbmZpZztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluaXRDbGkob3B0aW9uczogRHJjcEJ1aWxkZXJPcHRpb25zKTogUHJvbWlzZTxEcmNwQ29uZmlnPiB7XG4gIGF3YWl0IG5vZGVDaGVjaygpO1xuICBjb25zdCBkcmNwQ29uZmlnRmlsZXMgPSBvcHRpb25zLmRyY3BDb25maWcgPyAob3B0aW9ucy5kcmNwQ29uZmlnIGFzIHN0cmluZykuc3BsaXQoL1xccypbLDs6XVxccyovKSA6IFtdO1xuICBjb25zdCBjb25maWcgPSBhd2FpdCBpbml0RHJjcChvcHRpb25zLmRyY3BBcmdzLCBkcmNwQ29uZmlnRmlsZXMpO1xuICBmcy5ta2RpcnBTeW5jKGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ25nLWFwcC1idWlsZGVyLnJlcG9ydCcpKTtcbiAgcmV0dXJuIGNvbmZpZztcbn1cbmFzeW5jIGZ1bmN0aW9uIGluaXREcmNwKGRyY3BBcmdzOiBhbnksIGRyY3BDb25maWdGaWxlczogc3RyaW5nW10pOiBQcm9taXNlPERyY3BDb25maWc+IHtcbiAgaWYgKGRyY3BBcmdzLmMgPT0gbnVsbClcbiAgICBkcmNwQXJncy5jID0gW107XG4gIGRyY3BBcmdzLmMucHVzaCguLi5kcmNwQ29uZmlnRmlsZXMpO1xuICAvLyBjb25zb2xlLmxvZygnfn5+fn5+fn5+fn5+fn5+fn5+fn5+Jyk7XG4gIGluaXRQcm9jZXNzKCk7XG4gIGF3YWl0IGltcG9ydCAoJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1tZ3IvaW5kZXgnKTtcbiAgY29uc3QgY21kT3B0aW9ucyA9IHtjb25maWc6IGRyY3BBcmdzLmMsIHByb3A6IGRyY3BBcmdzLnAgfHwgZHJjcEFyZ3MucHJvcCB8fCBbXX07XG4gIGF3YWl0IGluaXRDb25maWdBc3luYyhjbWRPcHRpb25zKTtcbiAgLy8gZm9yIGZvcmtlZCB0c2NoZWNrIHByb2Nlc3Mgb2YgQG5ndG9vbC93ZWJwYWNrXG4gIHByb2Nlc3MuZW52Ll9uZ2NsaV9wbGlua19hcmcgPSBKU09OLnN0cmluZ2lmeShjbWRPcHRpb25zKTtcbiAgcmV0dXJuIGNvbmZpZztcbn1cblxuZXhwb3J0IHR5cGUgYnVpbGRXZWJwYWNrQ29uZmlnRnVuYyA9IChicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zKSA9PiBhbnk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5ndWxhckNsaVBhcmFtIHtcbiAgYnVpbGRlckNvbmZpZz86IERldlNlcnZlckJ1aWxkZXJPcHRpb25zO1xuICBicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zO1xuICBzc3I6IGJvb2xlYW47IC8vIElzIHNlcnZlciBzaWRlIC8gcHJlcmVuZGVyXG4gIC8vIHdlYnBhY2tDb25maWc6IGFueTtcbiAgLy8gcHJvamVjdFJvb3Q6IHN0cmluZztcbiAgLy8gYXJndjogYW55O1xufVxuXG5leHBvcnQgdHlwZSBOb3JtYWxpemVkQW5ndWxhckJ1aWxkU2NoZW1hID0gTm9ybWFsaXplZEJyb3dzZXJCdWlsZGVyU2NoZW1hIHwgTm9ybWFsaXplZFNlcnZlckJ1aWxkZXJTZXJ2ZXJTY2hlbWE7XG4vLyBOb3JtYWxpemVkS2FybWFCdWlsZGVyU2NoZW1hO1xuXG5leHBvcnQgdHlwZSBBbmd1bGFyQnVpbGRlck9wdGlvbnMgPVxuICBOb3JtYWxpemVkQnJvd3NlckJ1aWxkZXJTY2hlbWEgJiBOb3JtYWxpemVkU2VydmVyQnVpbGRlclNlcnZlclNjaGVtYSAmXG4gIC8vIE5vcm1hbGl6ZWRLYXJtYUJ1aWxkZXJTY2hlbWEgJlxuICBEcmNwQnVpbGRlck9wdGlvbnMgJiBqc29uLkpzb25PYmplY3Q7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRHJjcEJ1aWxkZXJPcHRpb25zIHtcbiAgZHJjcEFyZ3M6IGFueTtcbiAgZHJjcENvbmZpZzogc3RyaW5nO1xufVxuXG5pbXBvcnQge0J1aWxkZXJDb250ZXh0LCBCdWlsZGVyQ29udGV4dE9wdGlvbnN9IGZyb20gJy4vYnVpbGRlci1jb250ZXh0JztcblxuZXhwb3J0IGZ1bmN0aW9uIG5ld0NvbnRleHQobmdCdWlsZE9wdGlvbjogQW5ndWxhckNsaVBhcmFtLCBvcHRpb25zPzogQnVpbGRlckNvbnRleHRPcHRpb25zKSB7XG4gIGNvbnN0IGNvbnN0cnVjdG9yID0gcmVxdWlyZSgnLi9idWlsZGVyLWNvbnRleHQnKS5CdWlsZGVyQ29udGV4dCBhcyB0eXBlb2YgQnVpbGRlckNvbnRleHQ7XG4gIHJldHVybiBuZXcgY29uc3RydWN0b3IobmdCdWlsZE9wdGlvbiwgb3B0aW9ucyk7XG59XG4iXX0=