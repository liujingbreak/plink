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
exports.genSlice = exports.genComponents = exports.genPackage = void 0;
// eslint-disable  no-console
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const lodash_1 = __importDefault(require("lodash"));
// import chalk from 'chalk';
const misc_1 = require("@wfh/plink/wfh/dist/utils/misc");
const template_gen_1 = __importDefault(require("@wfh/plink/wfh/dist/template-gen"));
const __plink_1 = __importDefault(require("__plink"));
function genPackage(path, compName, featureName, outputPath, dryrun = false) {
    return __awaiter(this, void 0, void 0, function* () {
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
        yield (0, template_gen_1.default)(path_1.default.resolve(__dirname, '../../template-cra-pkg'), dir, {
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
        yield (0, template_gen_1.default)(path_1.default.resolve(__dirname, '../../template-cra-connected-comp'), featureDir, {
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
        yield (0, template_gen_1.default)(path_1.default.resolve(__dirname, '../../template-cra-slice'), featureDir, {
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
    });
}
exports.genPackage = genPackage;
function genComponents(dir, compNames, opts) {
    return __awaiter(this, void 0, void 0, function* () {
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
            yield (0, template_gen_1.default)(path_1.default.resolve(__dirname, '../../template-cra-connected-comp'), dir, {
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
    });
}
exports.genComponents = genComponents;
function genSlice(dir, targetNames, opt) {
    return __awaiter(this, void 0, void 0, function* () {
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
            yield (0, template_gen_1.default)(path_1.default.resolve(__dirname, opt.tiny ? '../../template-cra-tiny-redux' : opt.internal ? '../../template-slice4comp' : '../../template-cra-slice'), dir, {
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
    });
}
exports.genSlice = genSlice;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWNyYS1nZW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGktY3JhLWdlbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2QkFBNkI7QUFDN0Isd0RBQTBCO0FBQzFCLGdEQUF3QjtBQUN4QixvREFBdUI7QUFDdkIsNkJBQTZCO0FBQzdCLHlEQUF5RDtBQUN6RCxvRkFBaUU7QUFDakUsc0RBQTRCO0FBRTVCLFNBQXNCLFVBQVUsQ0FBQyxJQUFZLEVBQUUsUUFBZ0IsRUFBRSxXQUFtQixFQUFFLFVBQW1CLEVBQ3ZHLE1BQU0sR0FBRyxLQUFLOztRQUNkLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEUsMEVBQTBFO1FBQzFFLE1BQU0sa0JBQWtCLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0saUJBQWlCLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXJGLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDVCxNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUM7U0FDdEM7UUFDRCxNQUFNLEdBQUcsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9CLElBQUksTUFBTSxFQUFFO1lBQ1Ysc0NBQXNDO1lBQ3RDLGlCQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztTQUNsQzthQUFNO1lBQ0wsa0JBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7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LENBQUM7aUJBQzdCO2dCQUNELFdBQVcsRUFBRTtvQkFDWCxTQUFTLEVBQUUsVUFBVTtvQkFDckIsU0FBUyxFQUFFLGVBQWU7b0JBQzFCLFdBQVcsRUFBRSxVQUFVO2lCQUN4QjthQUNGLEVBQ0QsRUFBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sRUFBQyxDQUFDLENBQUM7U0FDdkI7SUFDSCxDQUFDO0NBQUE7QUE1QkQsNEJBNEJDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gZXNsaW50LWRpc2FibGUgIG5vLWNvbnNvbGVcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG4vLyBpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtib3hTdHJpbmd9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvbWlzYyc7XG5pbXBvcnQgZ2VuZXJhdGVTdHJ1Y3R1cmUgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC90ZW1wbGF0ZS1nZW4nO1xuaW1wb3J0IHBsaW5rIGZyb20gJ19fcGxpbmsnO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2VuUGFja2FnZShwYXRoOiBzdHJpbmcsIGNvbXBOYW1lOiBzdHJpbmcsIGZlYXR1cmVOYW1lOiBzdHJpbmcsIG91dHB1dFBhdGg/OiBzdHJpbmcsXG4gIGRyeXJ1biA9IGZhbHNlKSB7XG4gIGNvbXBOYW1lID0gY29tcE5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBjb21wTmFtZS5zbGljZSgxKTtcbiAgLy8gY29uc3Qgc0NvbXBOYW1lID0gY29tcE5hbWUuY2hhckF0KDApLnRvTG93ZXJDYXNlKCkgKyBjb21wTmFtZS5zbGljZSgxKTtcbiAgY29uc3QgY2FwaXRhbEZlYXR1cmVOYW1lID0gZmVhdHVyZU5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBmZWF0dXJlTmFtZS5zbGljZSgxKTtcbiAgY29uc3QgbGl0dGxlRmVhdHVyZU5hbWUgPSBmZWF0dXJlTmFtZS5jaGFyQXQoMCkudG9Mb3dlckNhc2UoKSArIGZlYXR1cmVOYW1lLnNsaWNlKDEpO1xuXG4gIGlmICghcGF0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTGFjayBvZiBhcmd1bWVudHMnKTtcbiAgfVxuICBjb25zdCBkaXIgPSBQYXRoLnJlc29sdmUocGF0aCk7XG4gIGlmIChkcnlydW4pIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIHBsaW5rLmxvZ2dlci5pbmZvKCdkcnlydW4gbW9kZScpO1xuICB9IGVsc2Uge1xuICAgIGZzLm1rZGlycFN5bmMoZGlyKTtcbiAgfVxuICBjb25zdCBtYSA9IC9eQFteL11cXC8oW15dKikkLy5leGVjKHBhdGgpO1xuICBpZiAobWEpIHtcbiAgICBwYXRoID0gbWFbMV07XG4gIH1cbiAgY29uc3QgcGFja2FnZU5hbWUgPSBQYXRoLmJhc2VuYW1lKHBhdGgpO1xuICBjb25zdCBmZWF0dXJlRGlyID0gUGF0aC5yZXNvbHZlKGRpciwgbGl0dGxlRmVhdHVyZU5hbWUpO1xuICBpZiAoIWRyeXJ1bikge1xuICAgIGZzLm1rZGlycFN5bmMoIGZlYXR1cmVEaXIpOyAvLyBta2RpciBmZWF0dXJlIGRpcmVjdG9yeVxuICB9XG5cbiAgaWYgKG91dHB1dFBhdGggPT0gbnVsbClcbiAgICBvdXRwdXRQYXRoID0gUGF0aC5iYXNlbmFtZShwYXRoKTtcbiAgaWYgKG91dHB1dFBhdGguc3RhcnRzV2l0aCgnLycpKVxuICAgIG91dHB1dFBhdGggPSBfLnRyaW1TdGFydChvdXRwdXRQYXRoLCAnLycpO1xuXG4gIGF3YWl0IGdlbmVyYXRlU3RydWN0dXJlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZS1jcmEtcGtnJyksIGRpciwge1xuICAgICAgZmlsZU1hcHBpbmc6IFtcbiAgICAgICAgWy9ebXktZmVhdHVyZS8sIGxpdHRsZUZlYXR1cmVOYW1lXVxuICAgICAgXSxcbiAgICAgIHRleHRNYXBwaW5nOiB7XG4gICAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgICBNeUNvbXBvbmVudFBhdGg6IGAke2xpdHRsZUZlYXR1cmVOYW1lfS8ke2NvbXBOYW1lfWAsXG4gICAgICAgIGFwcEJ1aWxkOiAnLycgKyBvdXRwdXRQYXRoLFxuICAgICAgICBwdWJsaWNVcmxPclBhdGg6ICcvJyArIChvdXRwdXRQYXRoLmxlbmd0aCA+IDAgPyBvdXRwdXRQYXRoICsgJy8nIDogJycpXG4gICAgICB9XG4gICAgfSxcbiAgICB7ZHJ5cnVufSk7XG5cbiAgYXdhaXQgZ2VuZXJhdGVTdHJ1Y3R1cmUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlLWNyYS1jb25uZWN0ZWQtY29tcCcpLCAgZmVhdHVyZURpciwge1xuICAgICAgZmlsZU1hcHBpbmc6IFtcbiAgICAgICAgWy9eTXlDb25uZWN0ZWRDb21wLywgY29tcE5hbWVdXG4gICAgICBdLFxuICAgICAgdGV4dE1hcHBpbmc6IHtcbiAgICAgICAgTXlDb21wb25lbnQ6IGNvbXBOYW1lLFxuICAgICAgICBzbGljZV9maWxlOiAnLi8nICsgbGl0dGxlRmVhdHVyZU5hbWUgKyAnU2xpY2UnLFxuICAgICAgICB3aXRoSW1hZ2U6IHRydWUsXG4gICAgICAgIGlzRW50cnk6IHRydWUsXG4gICAgICAgIGlzQ29ubmVjdGVkOiB0cnVlXG4gICAgICB9XG4gICAgfSxcbiAgICB7ZHJ5cnVufSk7XG5cbiAgYXdhaXQgZ2VuZXJhdGVTdHJ1Y3R1cmUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlLWNyYS1zbGljZScpLCAgZmVhdHVyZURpciwge1xuICAgICAgZmlsZU1hcHBpbmc6IFtcbiAgICAgICAgWy9eTXlGZWF0dXJlU2xpY2UvLCBsaXR0bGVGZWF0dXJlTmFtZSArICdTbGljZSddXG4gICAgICBdLFxuICAgICAgdGV4dE1hcHBpbmc6IHtcbiAgICAgICAgU2xpY2VOYW1lOiBjYXBpdGFsRmVhdHVyZU5hbWUsXG4gICAgICAgIHNsaWNlTmFtZTogbGl0dGxlRmVhdHVyZU5hbWVcbiAgICAgIH1cbiAgICB9LFxuICAgIHtkcnlydW59KTtcbiAgLy8gY29weVRlbXBsKGRpciwgUGF0aC5iYXNlbmFtZShwYXRoKSwgZHJ5cnVuKTtcbiAgcGxpbmsubG9nZ2VyLmluZm8oJ1xcbicgKyBib3hTdHJpbmcoXG4gICAgYDEuIE1vZGlmeSAke1BhdGgucmVzb2x2ZShwYXRoLCAncGFja2FnZS5qc29uJyl9IHRvIGNoYW5nZSBjdXJyZW50IHBhY2thZ2UgbmFtZSBcIkB3ZmgvJHtwYWNrYWdlTmFtZX1cIixgICtcbiAgICAnIGlmIHlvdSBkb25cXCd0IGxpa2UgaXQuXFxuJyArXG4gICAgJzIuIFJ1biBjb21tYW5kOiBwbGluayBzeW5jXFxuJyArXG4gICAgYDMuIEFkZCBcIiR7cGFja2FnZU5hbWV9XCIgYXMgZGVwZW5kZW5jeSBpbiAke3Byb2Nlc3MuY3dkKCl9L3BhY2thZ2UuanNvbi5cXG5gICtcbiAgICBgICAoUnVuIGNvbW1hbmQ6IHBsaW5rIGFkZCBAd2ZoLyR7cGFja2FnZU5hbWV9KVxcbmApKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlbkNvbXBvbmVudHMoZGlyOiBzdHJpbmcsIGNvbXBOYW1lczogc3RyaW5nW10sIG9wdHM6IHtjb25uZWN0ZWRUb1NsaWNlPzogc3RyaW5nOyBkcnlydW46IGJvb2xlYW47fSkge1xuICBkaXIgPSBQYXRoLnJlc29sdmUoZGlyKTtcblxuICBpZiAob3B0cy5kcnlydW4pIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIHBsaW5rLmxvZ2dlci5pbmZvKCdkcnlydW4gbW9kZScpO1xuICB9IGVsc2Uge1xuICAgIGZzLm1rZGlycFN5bmMoZGlyKTtcbiAgfVxuICBmb3IgKGxldCBjb21wTmFtZSBvZiBjb21wTmFtZXMpIHtcbiAgICBjb21wTmFtZSA9IGNvbXBOYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgY29tcE5hbWUuc2xpY2UoMSk7XG5cbiAgICBsZXQgc2xpY2VGaWxlUGF0aCA9ICc8WW91ciBSZWR1eCBTbGljZSBQYXRoPic7XG4gICAgaWYgKG9wdHMuY29ubmVjdGVkVG9TbGljZSkge1xuICAgICAgc2xpY2VGaWxlUGF0aCA9IFBhdGgucmVsYXRpdmUoZGlyLCBvcHRzLmNvbm5lY3RlZFRvU2xpY2UpLnJlcGxhY2UoL1xcXFwvZywgJy8nKS5yZXBsYWNlKC9cXC5bXi5dKyQvLCAnJyk7XG4gICAgICBpZiAoIXNsaWNlRmlsZVBhdGguc3RhcnRzV2l0aCgnLicpKVxuICAgICAgICBzbGljZUZpbGVQYXRoID0gJy4vJyArIHNsaWNlRmlsZVBhdGg7XG4gICAgfVxuICAgIGF3YWl0IGdlbmVyYXRlU3RydWN0dXJlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZS1jcmEtY29ubmVjdGVkLWNvbXAnKSwgZGlyLFxuICAgIHtcbiAgICAgIGZpbGVNYXBwaW5nOiBbXG4gICAgICAgIFsvXk15Q29ubmVjdGVkQ29tcC8sIGNvbXBOYW1lXVxuICAgICAgXSxcbiAgICAgIHRleHRNYXBwaW5nOiB7XG4gICAgICAgIE15Q29tcG9uZW50OiBjb21wTmFtZSxcbiAgICAgICAgc2xpY2VfZmlsZTogc2xpY2VGaWxlUGF0aCxcbiAgICAgICAgd2l0aEltYWdlOiBmYWxzZSxcbiAgICAgICAgaXNFbnRyeTogZmFsc2UsXG4gICAgICAgIGlzQ29ubmVjdGVkOiAhIW9wdHMuY29ubmVjdGVkVG9TbGljZVxuICAgICAgfVxuICAgIH0sXG4gICAge2RyeXJ1bjogb3B0cy5kcnlydW59KTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2VuU2xpY2UoZGlyOiBzdHJpbmcsIHRhcmdldE5hbWVzOiBzdHJpbmdbXSwgb3B0OiB7ZHJ5UnVuPzogYm9vbGVhbjsgdGlueTogYm9vbGVhbiwgaW50ZXJuYWw6IGJvb2xlYW59KSB7XG4gIGRpciA9IFBhdGgucmVzb2x2ZShkaXIpO1xuXG4gIGlmIChvcHQuZHJ5UnVuKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBwbGluay5sb2dnZXIuaW5mbygnZHJ5cnVuIG1vZGUnKTtcbiAgfSBlbHNlIHtcbiAgICBmcy5ta2RpcnBTeW5jKGRpcik7XG4gIH1cbiAgZm9yIChsZXQgdGFyZ2V0TmFtZSBvZiB0YXJnZXROYW1lcykge1xuICAgIHRhcmdldE5hbWUgPSB0YXJnZXROYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdGFyZ2V0TmFtZS5zbGljZSgxKTtcbiAgICBjb25zdCBzbWFsbFRhcmdldE5hbWUgPSB0YXJnZXROYW1lLmNoYXJBdCgwKS50b0xvd2VyQ2FzZSgpICsgdGFyZ2V0TmFtZS5zbGljZSgxKTtcbiAgICBhd2FpdCBnZW5lcmF0ZVN0cnVjdHVyZShcbiAgICAgIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIG9wdC50aW55ID8gJy4uLy4uL3RlbXBsYXRlLWNyYS10aW55LXJlZHV4JyA6IG9wdC5pbnRlcm5hbCA/ICcuLi8uLi90ZW1wbGF0ZS1zbGljZTRjb21wJyA6ICcuLi8uLi90ZW1wbGF0ZS1jcmEtc2xpY2UnKSxcbiAgICAgIGRpcixcbiAgICB7XG4gICAgICBmaWxlTWFwcGluZzogW1xuICAgICAgICBbL15teUZlYXR1cmUvaSwgc21hbGxUYXJnZXROYW1lXSxcbiAgICAgICAgWy9eTXlDb21wLywgc21hbGxUYXJnZXROYW1lXVxuICAgICAgXSxcbiAgICAgIHRleHRNYXBwaW5nOiB7XG4gICAgICAgIFNsaWNlTmFtZTogdGFyZ2V0TmFtZSxcbiAgICAgICAgc2xpY2VOYW1lOiBzbWFsbFRhcmdldE5hbWUsXG4gICAgICAgIE15Q29tcG9uZW50OiB0YXJnZXROYW1lXG4gICAgICB9XG4gICAgfSxcbiAgICB7ZHJ5cnVuOiBvcHQuZHJ5UnVufSk7XG4gIH1cbn1cbiJdfQ==