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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSetting = void 0;
const plink_1 = require("@wfh/plink");
const template_gen_1 = __importDefault(require("@wfh/plink/wfh/dist/template-gen"));
const package_mgr_1 = require("@wfh/plink/wfh/dist/package-mgr");
const ts_cmd_1 = require("@wfh/plink/wfh/dist/ts-cmd");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const __plink_1 = __importDefault(require("__plink"));
const lodash_1 = __importDefault(require("lodash"));
async function generateSetting(pkgs, opt) {
    if (opt.dryRun) {
        __plink_1.default.logger.info('Dryrun mode');
    }
    const pkgsInfo = Array.from((0, plink_1.findPackagesByNames)(pkgs));
    let i = 0;
    const pkgInfoWithJsonFiles = await Promise.all(pkgsInfo.map(async (pkgInfo) => {
        if (pkgInfo == null) {
            __plink_1.default.logger.error(`Package not found: ${pkgs[i]}`);
            return null;
        }
        let camelCased = pkgInfo.shortName.replace(/-([^])/g, (match, g1) => g1.toUpperCase());
        const upperCaseFirstName = camelCased.charAt(0).toUpperCase() + camelCased.slice(1) + 'Setting';
        const json = lodash_1.default.cloneDeep(pkgInfo.json);
        const pkgjsonProp = json.dr || json.plink;
        if (pkgjsonProp.setting) {
            __plink_1.default.logger.warn(`There has been an existing "${pkgInfo.json.dr ? 'dr' : 'plink'}.setting" in ${pkgInfo.realPath}/package.json file`);
            return null;
        }
        pkgjsonProp.setting = {
            value: `isom/${pkgInfo.shortName}-setting.js#defaultSetting`,
            type: `isom/${pkgInfo.shortName}-setting#` + upperCaseFirstName
        };
        const pkgjsonStr = JSON.stringify(json, null, '  ');
        const pkgjsonFile = path_1.default.resolve(pkgInfo.realPath, 'package.json');
        let jsonDone;
        if (opt.dryRun) {
            __plink_1.default.logger.info(`Will write file ${pkgjsonFile}:\n` + pkgjsonStr);
            jsonDone = Promise.resolve();
        }
        else {
            jsonDone = fs_1.default.promises.writeFile(pkgjsonFile, pkgjsonStr);
            __plink_1.default.logger.info(`Write file ${pkgjsonFile}`);
        }
        const filesDone = (0, template_gen_1.default)(path_1.default.resolve(__dirname, '../../template-gsetting'), path_1.default.resolve(pkgInfo.realPath, 'isom'), {
            fileMapping: [
                [/foobar/g, pkgInfo.shortName]
            ],
            textMapping: {
                foobarPackage: pkgInfo.name,
                foobar: camelCased,
                Foobar: camelCased.charAt(0).toUpperCase() + camelCased.slice(1)
            }
        }, { dryrun: opt.dryRun });
        await Promise.all([jsonDone, filesDone]);
        return [pkgInfo, pkgjsonFile];
    }));
    if (!opt.dryRun) {
        const meta = pkgInfoWithJsonFiles.filter(item => item != null);
        if (meta.length === 0)
            return;
        await (0, ts_cmd_1.tsc)({
            package: meta.map(item => item[0].name)
        });
        await new Promise(resolve => setImmediate(resolve));
        await Promise.resolve().then(() => __importStar(require('@wfh/plink/wfh/dist/editor-helper')));
        package_mgr_1.actionDispatcher.scanAndSyncPackages({ packageJsonFiles: meta.map(item => item[1])
        });
    }
}
exports.generateSetting = generateSetting;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWdzZXR0aW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLWdzZXR0aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxzQ0FBaUQ7QUFDakQsb0ZBQWlFO0FBQ2pFLGlFQUE4RTtBQUM5RSx1REFBK0M7QUFDL0MsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixzREFBNEI7QUFDNUIsb0RBQXVCO0FBRWhCLEtBQUssVUFBVSxlQUFlLENBQUMsSUFBYyxFQUFFLEdBQXNCO0lBQzFFLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRTtRQUNkLGlCQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztLQUNsQztJQUNELE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBQSwyQkFBbUIsRUFBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNWLE1BQU0sb0JBQW9CLEdBQ3hCLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBQyxPQUFPLEVBQUMsRUFBRTtRQUM3QyxJQUFJLE9BQU8sSUFBSSxJQUFJLEVBQUU7WUFDbkIsaUJBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLHNCQUFzQixJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3BELE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN2RixNQUFNLGtCQUFrQixHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcs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QUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7U0FDekMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3BELHdEQUFhLG1DQUFtQyxHQUFDLENBQUM7UUFDbEQsOEJBQWdCLENBQUMsbUJBQW1CLENBQUMsRUFBQyxnQkFBZ0IsRUFDcEQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUMzQixDQUFDLENBQUM7S0FDSjtBQUNILENBQUM7QUFwRUQsMENBb0VDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZmluZFBhY2thZ2VzQnlOYW1lcyB9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IGdlbmVyYXRlU3RydWN0dXJlIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdGVtcGxhdGUtZ2VuJztcbmltcG9ydCB7YWN0aW9uRGlzcGF0Y2hlciwgUGFja2FnZUluZm99IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1tZ3InO1xuaW1wb3J0IHt0c2N9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdHMtY21kJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBwbGluayBmcm9tICdfX3BsaW5rJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZW5lcmF0ZVNldHRpbmcocGtnczogc3RyaW5nW10sIG9wdDoge2RyeVJ1bjogYm9vbGVhbn0pIHtcbiAgaWYgKG9wdC5kcnlSdW4pIHtcbiAgICBwbGluay5sb2dnZXIuaW5mbygnRHJ5cnVuIG1vZGUnKTtcbiAgfVxuICBjb25zdCBwa2dzSW5mbyA9IEFycmF5LmZyb20oZmluZFBhY2thZ2VzQnlOYW1lcyhwa2dzKSk7XG4gIGxldCBpID0gMDtcbiAgY29uc3QgcGtnSW5mb1dpdGhKc29uRmlsZXM6IEFycmF5PFtwa2c6IFBhY2thZ2VJbmZvLCBqc29uRmlsZTogc3RyaW5nXSB8IG51bGw+ID1cbiAgICBhd2FpdCBQcm9taXNlLmFsbChwa2dzSW5mby5tYXAoYXN5bmMgcGtnSW5mbyA9PiB7XG4gICAgICBpZiAocGtnSW5mbyA9PSBudWxsKSB7XG4gICAgICAgIHBsaW5rLmxvZ2dlci5lcnJvcihgUGFja2FnZSBub3QgZm91bmQ6ICR7cGtnc1tpXX1gKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGxldCBjYW1lbENhc2VkID0gcGtnSW5mby5zaG9ydE5hbWUucmVwbGFjZSgvLShbXl0pL2csIChtYXRjaCwgZzEpID0+IGcxLnRvVXBwZXJDYXNlKCkpO1xuICAgICAgY29uc3QgdXBwZXJDYXNlRmlyc3ROYW1lID0gY2FtZWxDYXNlZC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGNhbWVsQ2FzZWQuc2xpY2UoMSkgKyAnU2V0dGluZyc7XG5cbiAgICAgIGNvbnN0IGpzb24gPSBfLmNsb25lRGVlcChwa2dJbmZvLmpzb24pO1xuICAgICAgY29uc3QgcGtnanNvblByb3AgPSBqc29uLmRyIHx8IGpzb24ucGxpbmshO1xuICAgICAgaWYgKHBrZ2pzb25Qcm9wLnNldHRpbmcpIHtcbiAgICAgICAgcGxpbmsubG9nZ2VyLndhcm4oYFRoZXJlIGhhcyBiZWVuIGFuIGV4aXN0aW5nIFwiJHtwa2dJbmZvLmpzb24uZHIgPyAnZHInIDogJ3BsaW5rJ30uc2V0dGluZ1wiIGluICR7cGtnSW5mby5yZWFsUGF0aH0vcGFja2FnZS5qc29uIGZpbGVgKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHBrZ2pzb25Qcm9wLnNldHRpbmcgPSB7XG4gICAgICAgIHZhbHVlOiBgaXNvbS8ke3BrZ0luZm8uc2hvcnROYW1lfS1zZXR0aW5nLmpzI2RlZmF1bHRTZXR0aW5nYCxcbiAgICAgICAgdHlwZTogYGlzb20vJHtwa2dJbmZvLnNob3J0TmFtZX0tc2V0dGluZyNgICsgdXBwZXJDYXNlRmlyc3ROYW1lXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBwa2dqc29uU3RyID0gSlNPTi5zdHJpbmdpZnkoanNvbiwgbnVsbCwgJyAgJyk7XG4gICAgICBjb25zdCBwa2dqc29uRmlsZSA9IFBhdGgucmVzb2x2ZShwa2dJbmZvLnJlYWxQYXRoLCAncGFja2FnZS5qc29uJyk7XG5cbiAgICAgIGxldCBqc29uRG9uZTogUHJvbWlzZTxhbnk+O1xuICAgICAgaWYgKG9wdC5kcnlSdW4pIHtcbiAgICAgICAgcGxpbmsubG9nZ2VyLmluZm8oYFdpbGwgd3JpdGUgZmlsZSAke3BrZ2pzb25GaWxlfTpcXG5gICsgcGtnanNvblN0cik7XG4gICAgICAgIGpzb25Eb25lID0gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBqc29uRG9uZSA9IGZzLnByb21pc2VzLndyaXRlRmlsZShwa2dqc29uRmlsZSwgcGtnanNvblN0cik7XG4gICAgICAgIHBsaW5rLmxvZ2dlci5pbmZvKGBXcml0ZSBmaWxlICR7cGtnanNvbkZpbGV9YCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGZpbGVzRG9uZSA9IGdlbmVyYXRlU3RydWN0dXJlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZS1nc2V0dGluZycpLFxuICAgICAgICBQYXRoLnJlc29sdmUocGtnSW5mby5yZWFsUGF0aCwgJ2lzb20nKSwge1xuICAgICAgICAgIGZpbGVNYXBwaW5nOiBbXG4gICAgICAgICAgICBbL2Zvb2Jhci9nLCBwa2dJbmZvLnNob3J0TmFtZV1cbiAgICAgICAgICBdLFxuICAgICAgICAgIHRleHRNYXBwaW5nOiB7XG4gICAgICAgICAgICBmb29iYXJQYWNrYWdlOiBwa2dJbmZvLm5hbWUsXG4gICAgICAgICAgICBmb29iYXI6IGNhbWVsQ2FzZWQsXG4gICAgICAgICAgICBGb29iYXI6IGNhbWVsQ2FzZWQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBjYW1lbENhc2VkLnNsaWNlKDEpXG4gICAgICAgICAgfVxuICAgICAgICB9LCB7ZHJ5cnVuOiBvcHQuZHJ5UnVufSk7XG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChbanNvbkRvbmUsIGZpbGVzRG9uZV0pO1xuICAgICAgcmV0dXJuIFtwa2dJbmZvLCBwa2dqc29uRmlsZV0gYXMgW3BrZzogUGFja2FnZUluZm8sIGpzb25GaWxlOiBzdHJpbmddO1xuICAgIH0pKTtcblxuICBpZiAoIW9wdC5kcnlSdW4pIHtcbiAgICBjb25zdCBtZXRhID0gcGtnSW5mb1dpdGhKc29uRmlsZXMuZmlsdGVyKGl0ZW0gPT4gaXRlbSAhPSBudWxsKTtcbiAgICBpZiAobWV0YS5sZW5ndGggPT09IDApXG4gICAgICByZXR1cm47XG4gICAgYXdhaXQgdHNjKHtcbiAgICAgIHBhY2thZ2U6IG1ldGEubWFwKGl0ZW0gPT4gaXRlbSFbMF0ubmFtZSlcbiAgICB9KTtcbiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldEltbWVkaWF0ZShyZXNvbHZlKSk7XG4gICAgYXdhaXQgaW1wb3J0KCdAd2ZoL3BsaW5rL3dmaC9kaXN0L2VkaXRvci1oZWxwZXInKTtcbiAgICBhY3Rpb25EaXNwYXRjaGVyLnNjYW5BbmRTeW5jUGFja2FnZXMoe3BhY2thZ2VKc29uRmlsZXM6XG4gICAgICBtZXRhLm1hcChpdGVtID0+IGl0ZW0hWzFdKVxuICAgIH0pO1xuICB9XG59XG4iXX0=