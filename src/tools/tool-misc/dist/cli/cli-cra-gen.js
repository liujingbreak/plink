"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genSlice = exports.genComponents = exports.genPackage = void 0;
const tslib_1 = require("tslib");
// eslint-disable  no-console
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
// import chalk from 'chalk';
const misc_1 = require("@wfh/plink/wfh/dist/utils/misc");
const template_gen_1 = tslib_1.__importDefault(require("@wfh/plink/wfh/dist/template-gen"));
const __plink_1 = tslib_1.__importDefault(require("__plink"));
async function genPackage(path, compName, featureName, outputPath, dryrun = false) {
    compName = compName.charAt(0).toUpperCase() + compName.slice(1);
    // const sCompName = compName.charAt(0).toLowerCase() + compName.slice(1);
    const capitalFeatureName = featureName.charAt(0).toUpperCase() + featureName.slice(1);
    const littleFeatureName = featureName.charAt(0).toLowerCase() + featureName.slice(1);
    if (!path) {
        throw new Error('Lack of arguments');
    }
    const dir = path_1.default.resolve(path);
    if (dryrun) {
        // eslint-disable-next-line no-console
        __plink_1.default.logger.info('dryrun mode');
    }
    else {
        fs_extra_1.default.mkdirpSync(dir);
    }
    const ma = /^@[^/]\/([^]*)$/.exec(path);
    if (ma) {
        path = ma[1];
    }
    const packageName = path_1.default.basename(path);
    const featureDir = path_1.default.resolve(dir, littleFeatureName);
    if (!dryrun) {
        fs_extra_1.default.mkdirpSync(featureDir); // mkdir feature directory
    }
    if (outputPath == null)
        outputPath = path_1.default.basename(path);
    if (outputPath.startsWith('/'))
        outputPath = lodash_1.default.trimStart(outputPath, '/');
    await (0, template_gen_1.default)(path_1.default.resolve(__dirname, '../../template-cra-pkg'), dir, {
        fileMapping: [
            [/^my-feature/, littleFeatureName]
        ],
        textMapping: {
            packageName,
            MyComponentPath: `${littleFeatureName}/${compName}`,
            appBuild: '/' + outputPath,
            publicUrlOrPath: '/' + (outputPath.length > 0 ? outputPath + '/' : '')
        }
    }, { dryrun });
    await (0, template_gen_1.default)(path_1.default.resolve(__dirname, '../../template-cra-connected-comp'), featureDir, {
        fileMapping: [
            [/^MyConnectedComp/, compName]
        ],
        textMapping: {
            MyComponent: compName,
            slice_file: './' + littleFeatureName + 'Slice',
            withImage: true,
            isEntry: true,
            isConnected: true
        }
    }, { dryrun });
    await (0, template_gen_1.default)(path_1.default.resolve(__dirname, '../../template-cra-slice'), featureDir, {
        fileMapping: [
            [/^MyFeatureSlice/, littleFeatureName + 'Slice']
        ],
        textMapping: {
            SliceName: capitalFeatureName,
            sliceName: littleFeatureName
        }
    }, { dryrun });
    // copyTempl(dir, Path.basename(path), dryrun);
    __plink_1.default.logger.info('\n' + (0, misc_1.boxString)(`1. Modify ${path_1.default.resolve(path, 'package.json')} to change current package name "@wfh/${packageName}",` +
        ' if you don\'t like it.\n' +
        '2. Run command: plink sync\n' +
        `3. Add "${packageName}" as dependency in ${process.cwd()}/package.json.\n` +
        `  (Run command: plink add @wfh/${packageName})\n`));
}
exports.genPackage = genPackage;
async function genComponents(dir, compNames, opts) {
    dir = path_1.default.resolve(dir);
    if (opts.dryrun) {
        // eslint-disable-next-line no-console
        __plink_1.default.logger.info('dryrun mode');
    }
    else {
        fs_extra_1.default.mkdirpSync(dir);
    }
    for (let compName of compNames) {
        compName = compName.charAt(0).toUpperCase() + compName.slice(1);
        let sliceFilePath = '<Your Redux Slice Path>';
        if (opts.connectedToSlice) {
            sliceFilePath = path_1.default.relative(dir, opts.connectedToSlice).replace(/\\/g, '/').replace(/\.[^.]+$/, '');
            if (!sliceFilePath.startsWith('.'))
                sliceFilePath = './' + sliceFilePath;
        }
        await (0, template_gen_1.default)(path_1.default.resolve(__dirname, '../../template-cra-connected-comp'), dir, {
            fileMapping: [
                [/^MyConnectedComp/, compName]
            ],
            textMapping: {
                MyComponent: compName,
                slice_file: sliceFilePath,
                withImage: false,
                isEntry: false,
                isConnected: !!opts.connectedToSlice
            }
        }, { dryrun: opts.dryrun });
    }
}
exports.genComponents = genComponents;
async function genSlice(dir, targetNames, opt) {
    dir = path_1.default.resolve(dir);
    if (opt.dryRun) {
        // eslint-disable-next-line no-console
        __plink_1.default.logger.info('dryrun mode');
    }
    else {
        fs_extra_1.default.mkdirpSync(dir);
    }
    for (let targetName of targetNames) {
        targetName = targetName.charAt(0).toUpperCase() + targetName.slice(1);
        const smallTargetName = targetName.charAt(0).toLowerCase() + targetName.slice(1);
        await (0, template_gen_1.default)(path_1.default.resolve(__dirname, opt.tiny ? '../../template-cra-tiny-redux' : opt.internal ? '../../template-slice4comp' : '../../template-cra-slice'), dir, {
            fileMapping: [
                [/^myFeature/i, smallTargetName],
                [/^MyComp/, smallTargetName]
            ],
            textMapping: {
                SliceName: targetName,
                sliceName: smallTargetName,
                MyComponent: targetName
            }
        }, { dryrun: opt.dryRun });
    }
}
exports.genSlice = genSlice;
//# sourceMappingURL=cli-cra-gen.js.map