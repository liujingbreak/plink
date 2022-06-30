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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWNyYS1nZW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGktY3JhLWdlbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsNkJBQTZCO0FBQzdCLGdFQUEwQjtBQUMxQix3REFBd0I7QUFDeEIsNERBQXVCO0FBQ3ZCLDZCQUE2QjtBQUM3Qix5REFBeUQ7QUFDekQsNEZBQWlFO0FBQ2pFLDhEQUE0QjtBQUVyQixLQUFLLFVBQVUsVUFBVSxDQUFDLElBQVksRUFBRSxRQUFnQixFQUFFLFdBQW1CLEVBQUUsVUFBbUIsRUFDdkcsTUFBTSxHQUFHLEtBQUs7SUFDZCxRQUFRLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hFLDBFQUEwRTtJQUMxRSxNQUFNLGtCQUFrQixHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0RixNQUFNLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVyRixJQUFJLENBQUMsSUFBSSxFQUFFO1FBQ1QsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0tBQ3RDO0lBQ0QsTUFBTSxHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvQixJQUFJLE1BQU0sRUFBRTtRQUNWLHNDQUFzQztRQUN0QyxpQkFBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7S0FDbEM7U0FBTTtRQUNMLGtCQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3BCO0lB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U0FBUyxFQUFFLFVBQVU7Z0JBQ3JCLFNBQVMsRUFBRSxlQUFlO2dCQUMxQixXQUFXLEVBQUUsVUFBVTthQUN4QjtTQUNGLEVBQ0QsRUFBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sRUFBQyxDQUFDLENBQUM7S0FDdkI7QUFDSCxDQUFDO0FBNUJELDRCQTRCQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGVzbGludC1kaXNhYmxlICBuby1jb25zb2xlXG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7Ym94U3RyaW5nfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL21pc2MnO1xuaW1wb3J0IGdlbmVyYXRlU3RydWN0dXJlIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdGVtcGxhdGUtZ2VuJztcbmltcG9ydCBwbGluayBmcm9tICdfX3BsaW5rJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlblBhY2thZ2UocGF0aDogc3RyaW5nLCBjb21wTmFtZTogc3RyaW5nLCBmZWF0dXJlTmFtZTogc3RyaW5nLCBvdXRwdXRQYXRoPzogc3RyaW5nLFxuICBkcnlydW4gPSBmYWxzZSkge1xuICBjb21wTmFtZSA9IGNvbXBOYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgY29tcE5hbWUuc2xpY2UoMSk7XG4gIC8vIGNvbnN0IHNDb21wTmFtZSA9IGNvbXBOYW1lLmNoYXJBdCgwKS50b0xvd2VyQ2FzZSgpICsgY29tcE5hbWUuc2xpY2UoMSk7XG4gIGNvbnN0IGNhcGl0YWxGZWF0dXJlTmFtZSA9IGZlYXR1cmVOYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgZmVhdHVyZU5hbWUuc2xpY2UoMSk7XG4gIGNvbnN0IGxpdHRsZUZlYXR1cmVOYW1lID0gZmVhdHVyZU5hbWUuY2hhckF0KDApLnRvTG93ZXJDYXNlKCkgKyBmZWF0dXJlTmFtZS5zbGljZSgxKTtcblxuICBpZiAoIXBhdGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0xhY2sgb2YgYXJndW1lbnRzJyk7XG4gIH1cbiAgY29uc3QgZGlyID0gUGF0aC5yZXNvbHZlKHBhdGgpO1xuICBpZiAoZHJ5cnVuKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBwbGluay5sb2dnZXIuaW5mbygnZHJ5cnVuIG1vZGUnKTtcbiAgfSBlbHNlIHtcbiAgICBmcy5ta2RpcnBTeW5jKGRpcik7XG4gIH1cbiAgY29uc3QgbWEgPSAvXkBbXi9dXFwvKFteXSopJC8uZXhlYyhwYXRoKTtcbiAgaWYgKG1hKSB7XG4gICAgcGF0aCA9IG1hWzFdO1xuICB9XG4gIGNvbnN0IHBhY2thZ2VOYW1lID0gUGF0aC5iYXNlbmFtZShwYXRoKTtcbiAgY29uc3QgZmVhdHVyZURpciA9IFBhdGgucmVzb2x2ZShkaXIsIGxpdHRsZUZlYXR1cmVOYW1lKTtcbiAgaWYgKCFkcnlydW4pIHtcbiAgICBmcy5ta2RpcnBTeW5jKCBmZWF0dXJlRGlyKTsgLy8gbWtkaXIgZmVhdHVyZSBkaXJlY3RvcnlcbiAgfVxuXG4gIGlmIChvdXRwdXRQYXRoID09IG51bGwpXG4gICAgb3V0cHV0UGF0aCA9IFBhdGguYmFzZW5hbWUocGF0aCk7XG4gIGlmIChvdXRwdXRQYXRoLnN0YXJ0c1dpdGgoJy8nKSlcbiAgICBvdXRwdXRQYXRoID0gXy50cmltU3RhcnQob3V0cHV0UGF0aCwgJy8nKTtcblxuICBhd2FpdCBnZW5lcmF0ZVN0cnVjdHVyZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGUtY3JhLXBrZycpLCBkaXIsIHtcbiAgICAgIGZpbGVNYXBwaW5nOiBbXG4gICAgICAgIFsvXm15LWZlYXR1cmUvLCBsaXR0bGVGZWF0dXJlTmFtZV1cbiAgICAgIF0sXG4gICAgICB0ZXh0TWFwcGluZzoge1xuICAgICAgICBwYWNrYWdlTmFtZSxcbiAgICAgICAgTXlDb21wb25lbnRQYXRoOiBgJHtsaXR0bGVGZWF0dXJlTmFtZX0vJHtjb21wTmFtZX1gLFxuICAgICAgICBhcHBCdWlsZDogJy8nICsgb3V0cHV0UGF0aCxcbiAgICAgICAgcHVibGljVXJsT3JQYXRoOiAnLycgKyAob3V0cHV0UGF0aC5sZW5ndGggPiAwID8gb3V0cHV0UGF0aCArICcvJyA6ICcnKVxuICAgICAgfVxuICAgIH0sXG4gICAge2RyeXJ1bn0pO1xuXG4gIGF3YWl0IGdlbmVyYXRlU3RydWN0dXJlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZS1jcmEtY29ubmVjdGVkLWNvbXAnKSwgIGZlYXR1cmVEaXIsIHtcbiAgICAgIGZpbGVNYXBwaW5nOiBbXG4gICAgICAgIFsvXk15Q29ubmVjdGVkQ29tcC8sIGNvbXBOYW1lXVxuICAgICAgXSxcbiAgICAgIHRleHRNYXBwaW5nOiB7XG4gICAgICAgIE15Q29tcG9uZW50OiBjb21wTmFtZSxcbiAgICAgICAgc2xpY2VfZmlsZTogJy4vJyArIGxpdHRsZUZlYXR1cmVOYW1lICsgJ1NsaWNlJyxcbiAgICAgICAgd2l0aEltYWdlOiB0cnVlLFxuICAgICAgICBpc0VudHJ5OiB0cnVlLFxuICAgICAgICBpc0Nvbm5lY3RlZDogdHJ1ZVxuICAgICAgfVxuICAgIH0sXG4gICAge2RyeXJ1bn0pO1xuXG4gIGF3YWl0IGdlbmVyYXRlU3RydWN0dXJlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZS1jcmEtc2xpY2UnKSwgIGZlYXR1cmVEaXIsIHtcbiAgICAgIGZpbGVNYXBwaW5nOiBbXG4gICAgICAgIFsvXk15RmVhdHVyZVNsaWNlLywgbGl0dGxlRmVhdHVyZU5hbWUgKyAnU2xpY2UnXVxuICAgICAgXSxcbiAgICAgIHRleHRNYXBwaW5nOiB7XG4gICAgICAgIFNsaWNlTmFtZTogY2FwaXRhbEZlYXR1cmVOYW1lLFxuICAgICAgICBzbGljZU5hbWU6IGxpdHRsZUZlYXR1cmVOYW1lXG4gICAgICB9XG4gICAgfSxcbiAgICB7ZHJ5cnVufSk7XG4gIC8vIGNvcHlUZW1wbChkaXIsIFBhdGguYmFzZW5hbWUocGF0aCksIGRyeXJ1bik7XG4gIHBsaW5rLmxvZ2dlci5pbmZvKCdcXG4nICsgYm94U3RyaW5nKFxuICAgIGAxLiBNb2RpZnkgJHtQYXRoLnJlc29sdmUocGF0aCwgJ3BhY2thZ2UuanNvbicpfSB0byBjaGFuZ2UgY3VycmVudCBwYWNrYWdlIG5hbWUgXCJAd2ZoLyR7cGFja2FnZU5hbWV9XCIsYCArXG4gICAgJyBpZiB5b3UgZG9uXFwndCBsaWtlIGl0LlxcbicgK1xuICAgICcyLiBSdW4gY29tbWFuZDogcGxpbmsgc3luY1xcbicgK1xuICAgIGAzLiBBZGQgXCIke3BhY2thZ2VOYW1lfVwiIGFzIGRlcGVuZGVuY3kgaW4gJHtwcm9jZXNzLmN3ZCgpfS9wYWNrYWdlLmpzb24uXFxuYCArXG4gICAgYCAgKFJ1biBjb21tYW5kOiBwbGluayBhZGQgQHdmaC8ke3BhY2thZ2VOYW1lfSlcXG5gKSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZW5Db21wb25lbnRzKGRpcjogc3RyaW5nLCBjb21wTmFtZXM6IHN0cmluZ1tdLCBvcHRzOiB7Y29ubmVjdGVkVG9TbGljZT86IHN0cmluZzsgZHJ5cnVuOiBib29sZWFuO30pIHtcbiAgZGlyID0gUGF0aC5yZXNvbHZlKGRpcik7XG5cbiAgaWYgKG9wdHMuZHJ5cnVuKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBwbGluay5sb2dnZXIuaW5mbygnZHJ5cnVuIG1vZGUnKTtcbiAgfSBlbHNlIHtcbiAgICBmcy5ta2RpcnBTeW5jKGRpcik7XG4gIH1cbiAgZm9yIChsZXQgY29tcE5hbWUgb2YgY29tcE5hbWVzKSB7XG4gICAgY29tcE5hbWUgPSBjb21wTmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGNvbXBOYW1lLnNsaWNlKDEpO1xuXG4gICAgbGV0IHNsaWNlRmlsZVBhdGggPSAnPFlvdXIgUmVkdXggU2xpY2UgUGF0aD4nO1xuICAgIGlmIChvcHRzLmNvbm5lY3RlZFRvU2xpY2UpIHtcbiAgICAgIHNsaWNlRmlsZVBhdGggPSBQYXRoLnJlbGF0aXZlKGRpciwgb3B0cy5jb25uZWN0ZWRUb1NsaWNlKS5yZXBsYWNlKC9cXFxcL2csICcvJykucmVwbGFjZSgvXFwuW14uXSskLywgJycpO1xuICAgICAgaWYgKCFzbGljZUZpbGVQYXRoLnN0YXJ0c1dpdGgoJy4nKSlcbiAgICAgICAgc2xpY2VGaWxlUGF0aCA9ICcuLycgKyBzbGljZUZpbGVQYXRoO1xuICAgIH1cbiAgICBhd2FpdCBnZW5lcmF0ZVN0cnVjdHVyZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGUtY3JhLWNvbm5lY3RlZC1jb21wJyksIGRpcixcbiAgICB7XG4gICAgICBmaWxlTWFwcGluZzogW1xuICAgICAgICBbL15NeUNvbm5lY3RlZENvbXAvLCBjb21wTmFtZV1cbiAgICAgIF0sXG4gICAgICB0ZXh0TWFwcGluZzoge1xuICAgICAgICBNeUNvbXBvbmVudDogY29tcE5hbWUsXG4gICAgICAgIHNsaWNlX2ZpbGU6IHNsaWNlRmlsZVBhdGgsXG4gICAgICAgIHdpdGhJbWFnZTogZmFsc2UsXG4gICAgICAgIGlzRW50cnk6IGZhbHNlLFxuICAgICAgICBpc0Nvbm5lY3RlZDogISFvcHRzLmNvbm5lY3RlZFRvU2xpY2VcbiAgICAgIH1cbiAgICB9LFxuICAgIHtkcnlydW46IG9wdHMuZHJ5cnVufSk7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlblNsaWNlKGRpcjogc3RyaW5nLCB0YXJnZXROYW1lczogc3RyaW5nW10sIG9wdDoge2RyeVJ1bj86IGJvb2xlYW47IHRpbnk6IGJvb2xlYW4sIGludGVybmFsOiBib29sZWFufSkge1xuICBkaXIgPSBQYXRoLnJlc29sdmUoZGlyKTtcblxuICBpZiAob3B0LmRyeVJ1bikge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgcGxpbmsubG9nZ2VyLmluZm8oJ2RyeXJ1biBtb2RlJyk7XG4gIH0gZWxzZSB7XG4gICAgZnMubWtkaXJwU3luYyhkaXIpO1xuICB9XG4gIGZvciAobGV0IHRhcmdldE5hbWUgb2YgdGFyZ2V0TmFtZXMpIHtcbiAgICB0YXJnZXROYW1lID0gdGFyZ2V0TmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHRhcmdldE5hbWUuc2xpY2UoMSk7XG4gICAgY29uc3Qgc21hbGxUYXJnZXROYW1lID0gdGFyZ2V0TmFtZS5jaGFyQXQoMCkudG9Mb3dlckNhc2UoKSArIHRhcmdldE5hbWUuc2xpY2UoMSk7XG4gICAgYXdhaXQgZ2VuZXJhdGVTdHJ1Y3R1cmUoXG4gICAgICBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCBvcHQudGlueSA/ICcuLi8uLi90ZW1wbGF0ZS1jcmEtdGlueS1yZWR1eCcgOiBvcHQuaW50ZXJuYWwgPyAnLi4vLi4vdGVtcGxhdGUtc2xpY2U0Y29tcCcgOiAnLi4vLi4vdGVtcGxhdGUtY3JhLXNsaWNlJyksXG4gICAgICBkaXIsXG4gICAge1xuICAgICAgZmlsZU1hcHBpbmc6IFtcbiAgICAgICAgWy9ebXlGZWF0dXJlL2ksIHNtYWxsVGFyZ2V0TmFtZV0sXG4gICAgICAgIFsvXk15Q29tcC8sIHNtYWxsVGFyZ2V0TmFtZV1cbiAgICAgIF0sXG4gICAgICB0ZXh0TWFwcGluZzoge1xuICAgICAgICBTbGljZU5hbWU6IHRhcmdldE5hbWUsXG4gICAgICAgIHNsaWNlTmFtZTogc21hbGxUYXJnZXROYW1lLFxuICAgICAgICBNeUNvbXBvbmVudDogdGFyZ2V0TmFtZVxuICAgICAgfVxuICAgIH0sXG4gICAge2RyeXJ1bjogb3B0LmRyeVJ1bn0pO1xuICB9XG59XG4iXX0=