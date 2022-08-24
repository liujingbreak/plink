"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generate = void 0;
const tslib_1 = require("tslib");
const template_gen_1 = tslib_1.__importDefault(require("@wfh/plink/wfh/dist/template-gen"));
const patch_text_1 = tslib_1.__importDefault(require("@wfh/plink/wfh/dist/utils/patch-text"));
const utils_1 = require("@wfh/plink/wfh/dist/cmd/utils");
const package_mgr_1 = require("@wfh/plink/wfh/dist/package-mgr");
const json_sync_parser_1 = tslib_1.__importDefault(require("@wfh/plink/wfh/dist/utils/json-sync-parser"));
const path_1 = tslib_1.__importDefault(require("path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const op = tslib_1.__importStar(require("rxjs/operators"));
const plink_1 = require("@wfh/plink");
const misc_1 = require("@wfh/plink/wfh/dist/utils/misc");
const log = (0, plink_1.log4File)(__filename);
async function generate(packageName, cmdName, opts) {
    const targetPkgs = Array.from((0, utils_1.findPackagesByNames)((0, package_mgr_1.getState)(), [packageName]));
    if (targetPkgs.length === 0) {
        throw new Error(`Can not find package ${packageName}`);
    }
    const targetPkg = targetPkgs[0];
    const pkgTsDirInfo = (0, misc_1.getTscConfigOfPkg)(targetPkg.json);
    const lowerCaseCmdName = cmdName.toLowerCase();
    const cmdFileName = lowerCaseCmdName.replace(/:/g, '-');
    const camelCaseCmd = lowerCaseCmdName.replace(/[-:]([a-zA-Z])/g, (match, $1) => $1.toUpperCase());
    if (opts.dryRun) {
        log.warn('Dryrun mode...');
    }
    await (0, template_gen_1.default)(path_1.default.resolve(__dirname, '../../template-cligen'), path_1.default.resolve(targetPkg.realPath, pkgTsDirInfo.srcDir), {
        fileMapping: [[/foobar/g, cmdFileName]],
        textMapping: {
            foobar: lowerCaseCmdName,
            foobarId: camelCaseCmd,
            foobarFile: cmdFileName
        }
    }, { dryrun: opts.dryRun });
    const pkJsonFile = path_1.default.resolve(targetPkg.realPath, 'package.json');
    if (opts.dryRun) {
        log.info(chalk_1.default.cyan(pkJsonFile) + ' will be changed.');
    }
    else {
        let text = fs_1.default.readFileSync(pkJsonFile, 'utf8');
        const objAst = (0, json_sync_parser_1.default)(text);
        const plinkProp = objAst.properties.find(prop => prop.name.text === '"dr"')
            || objAst.properties.find(prop => prop.name.text === '"plink"');
        if (plinkProp) {
            const drProp = plinkProp.value;
            if (drProp.properties.map(item => item.name.text).includes('"cli"')) {
                throw new Error(`${pkJsonFile} has already defined a "cli" property as executable entry`);
            }
            const pkjsonText = (0, patch_text_1.default)(text, [{
                    text: `\n    "cli": "${pkgTsDirInfo.destDir}/cli/cli.js#default"` + (drProp.properties.length > 0 ? ',' : '\n  '),
                    start: drProp.start + 1,
                    end: drProp.start + 1
                }]);
            fs_1.default.writeFileSync(pkJsonFile, pkjsonText);
            log.info(chalk_1.default.cyan(pkJsonFile) + 'is changed.');
            if ((0, package_mgr_1.isCwdWorkspace)()) {
                package_mgr_1.actionDispatcher.updateWorkspace({ dir: process.cwd(), isForce: false, packageJsonFiles: [pkJsonFile] });
                await (0, package_mgr_1.getStore)().pipe(op.map(s => s.workspaceUpdateChecksum), op.distinctUntilChanged(), op.skip(1), op.take(1)).toPromise();
                const { tsc } = require('@wfh/plink/wfh/dist/ts-cmd');
                await tsc({ package: [packageName], pathsJsons: [] });
            }
        }
        else {
            throw new Error(`${pkJsonFile} has no "dr" or "plink" property, is it an valid Plink package?`);
        }
    }
}
exports.generate = generate;
//# sourceMappingURL=cli-gcmd.js.map