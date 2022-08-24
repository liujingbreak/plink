"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateConfig = void 0;
const tslib_1 = require("tslib");
const template_gen_1 = tslib_1.__importDefault(require("@wfh/plink/wfh/dist/template-gen"));
// import fsex from 'fs-extra';
const path_1 = tslib_1.__importDefault(require("path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
// import chalk from 'chalk';
const __plink_1 = tslib_1.__importDefault(require("__plink"));
const util_1 = require("util");
const recipe_manager_1 = require("@wfh/plink/wfh/dist/recipe-manager");
const package_mgr_1 = require("@wfh/plink/wfh/dist/package-mgr");
const json_sync_parser_1 = tslib_1.__importStar(require("@wfh/plink/wfh/dist/utils/json-sync-parser"));
const patch_text_1 = tslib_1.__importDefault(require("@wfh/plink/wfh/dist/utils/patch-text"));
require("@wfh/plink/wfh/dist/editor-helper");
// TODO: support file type other than "ts"
async function generateConfig(file, opt) {
    file = path_1.default.resolve(file);
    if (opt.dryRun) {
        __plink_1.default.logger.info('Dryrun mode');
    }
    const suffix = path_1.default.extname(file);
    if (suffix === '')
        file = file + '.ts';
    else if (suffix !== '.ts') {
        file = file.replace(/\.[^./\\]$/, '.ts');
        __plink_1.default.logger.warn('We recommend using Typescript file as configuration, which can provide type check in Visual Code editor.');
    }
    // if (!opt.dryRun) {
    //   fsex.mkdirpSync(Path.dirname(file));
    // }
    let isUnderSrcDir = false;
    const srcDirs = Array.from((0, recipe_manager_1.allSrcDirs)()).map(item => item.srcDir);
    for (const { srcDir } of (0, recipe_manager_1.allSrcDirs)()) {
        if (file.startsWith(srcDir + path_1.default.sep)) {
            isUnderSrcDir = true;
            break;
        }
    }
    if (!isUnderSrcDir) {
        const projDir = (0, package_mgr_1.getProjectList)().find(prj => file.startsWith(path_1.default.resolve(prj) + path_1.default.sep));
        if (projDir) {
            let output;
            const projJsonFile = path_1.default.resolve(projDir, 'package.json');
            const jsonStr = fs_1.default.readFileSync(projJsonFile, 'utf8');
            const ast = (0, json_sync_parser_1.default)(jsonStr);
            const packagesAst = ast.properties.find(item => item.name.text === '"packages"');
            if (packagesAst) {
                if (!(0, json_sync_parser_1.isArrayAst)(packagesAst.value)) {
                    throw new Error(`Invalid ${projJsonFile}, property "packages" must be Array type`);
                }
                const end = packagesAst.value.items[packagesAst.value.items.length - 1].end;
                output = (0, patch_text_1.default)(jsonStr, [
                    {
                        start: end, end,
                        text: `,\n    ${JSON.stringify(path_1.default.relative(projDir, path_1.default.dirname(file)).replace(/\\/g, '/'))}`
                    }
                ]);
            }
            else {
                const end = ast.properties[ast.properties.length - 1].value.end;
                output = (0, patch_text_1.default)(jsonStr, [
                    {
                        start: end, end,
                        text: `,\n  "packages": [${JSON.stringify(path_1.default.relative(projDir, path_1.default.dirname(file)).replace(/\\/g, '/'))}]`
                    }
                ]);
                // plink.logger.info(projJsonFile + ` is changed, you need to run command "${chalk.green('plink sync')}" to create a tsconfig file Editor`);
            }
            if (!opt.dryRun) {
                fs_1.default.writeFileSync(projJsonFile, output);
                await new Promise(resolve => setImmediate(resolve));
                // updateTsconfigFileForProjects(workspaceKey(process.cwd()), projDir);
                package_mgr_1.actionDispatcher.scanAndSyncPackages({});
                __plink_1.default.logger.info(projJsonFile + ' is updated.');
            }
        }
        else {
            __plink_1.default.logger.error(`The target file ${file} is not under any of associated project directories:\n`
                + srcDirs.join('\n')
                + '\n  A Typescript file will not get proper type checked in Editor without tsconfig file, Plink "sync" command can ' +
                ' help to generate an Editor friendly tsconfig file, but it must be one of associated project directory');
            return;
        }
    }
    await (0, template_gen_1.default)(path_1.default.resolve(__dirname, '../../template-gcfg'), path_1.default.dirname(file), {
        fileMapping: [[/foobar\.ts/, path_1.default.basename(file)]],
        textMapping: {
            settingValue: (0, util_1.inspect)(__plink_1.default.config(), false, 5).replace(/(\r?\n)([^])/mg, (match, p1, p2) => p1 + '    // ' + p2)
        }
    }, { dryrun: opt.dryRun });
}
exports.generateConfig = generateConfig;
//# sourceMappingURL=cli-gcfg.js.map