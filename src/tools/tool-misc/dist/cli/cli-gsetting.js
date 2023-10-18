"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSetting = void 0;
const tslib_1 = require("tslib");
const plink_1 = require("@wfh/plink");
const template_gen_1 = tslib_1.__importDefault(require("@wfh/plink/wfh/dist/template-gen"));
const package_mgr_1 = require("@wfh/plink/wfh/dist/package-mgr");
const ts_cmd_1 = require("@wfh/plink/wfh/dist/ts-cmd");
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
const __plink_1 = tslib_1.__importDefault(require("__plink"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
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
        await Promise.resolve().then(() => tslib_1.__importStar(require('@wfh/plink/wfh/dist/editor-helper')));
        package_mgr_1.actionDispatcher.scanAndSyncPackages({ packageJsonFiles: meta.map(item => item[1])
        });
    }
}
exports.generateSetting = generateSetting;
//# sourceMappingURL=cli-gsetting.js.map