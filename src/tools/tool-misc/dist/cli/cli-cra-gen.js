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
// tslint:disable no-console
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
            // tslint:disable-next-line: no-console
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
        yield template_gen_1.default(path_1.default.resolve(__dirname, '../../template-cra-pkg'), dir, {
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
        yield template_gen_1.default(path_1.default.resolve(__dirname, '../../template-cra-connected-comp'), featureDir, {
            fileMapping: [
                [/^MyConnectedComp/, compName]
            ],
            textMapping: {
                MyComponent: compName,
                slice_file: './' + featureName + 'Slice',
                withImage: true,
                isEntry: true,
                isConnected: true
            }
        }, { dryrun });
        yield template_gen_1.default(path_1.default.resolve(__dirname, '../../template-cra-slice'), featureDir, {
            fileMapping: [
                [/^MyFeatureSlice/, littleFeatureName + 'Slice']
            ],
            textMapping: {
                SliceName: capitalFeatureName,
                sliceName: littleFeatureName
            }
        }, { dryrun });
        // copyTempl(dir, Path.basename(path), dryrun);
        __plink_1.default.logger.info('\n' + misc_1.boxString(`1. Modify ${path_1.default.resolve(path, 'package.json')} to change current package name "@wfh/${packageName}",` +
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
            // tslint:disable-next-line: no-console
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
            yield template_gen_1.default(path_1.default.resolve(__dirname, '../../template-cra-connected-comp'), dir, {
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
            // tslint:disable-next-line: no-console
            __plink_1.default.logger.info('dryrun mode');
        }
        else {
            fs_extra_1.default.mkdirpSync(dir);
        }
        for (let targetName of targetNames) {
            targetName = targetName.charAt(0).toUpperCase() + targetName.slice(1);
            const smallTargetName = targetName.charAt(0).toLowerCase() + targetName.slice(1);
            yield template_gen_1.default(path_1.default.resolve(__dirname, opt.tiny ? '../../template-cra-tiny-redux' : opt.internal ? '../../template-slice4comp' : '../../template-cra-slice'), dir, {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWNyYS1nZW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGktY3JhLWdlbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIsd0RBQTBCO0FBQzFCLGdEQUF3QjtBQUN4QixvREFBdUI7QUFDdkIsNkJBQTZCO0FBQzdCLHlEQUF5RDtBQUN6RCxvRkFBaUU7QUFDakUsc0RBQTRCO0FBRTVCLFNBQXNCLFVBQVUsQ0FBQyxJQUFZLEVBQUUsUUFBZ0IsRUFBRSxXQUFtQixFQUFFLFVBQW1CLEVBQ3ZHLE1BQU0sR0FBRyxLQUFLOztRQUNkLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEUsMEVBQTBFO1FBQzFFLE1BQU0sa0JBQWtCLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0saUJBQWlCLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXJGLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDVCxNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUM7U0FDdEM7UUFDRCxNQUFNLEdBQUcsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9CLElBQUksTUFBTSxFQUFFO1lBQ1YsdUNBQXVDO1lBQ3ZDLGlCQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztTQUNsQzthQUFNO1lBQ0wsa0JBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7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Q1gsU0FBUyxFQUFFLFVBQVU7b0JBQ3JCLFNBQVMsRUFBRSxlQUFlO29CQUMxQixXQUFXLEVBQUUsVUFBVTtpQkFDeEI7YUFDRixFQUNELEVBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDO1NBQ3ZCO0lBQ0gsQ0FBQztDQUFBO0FBNUJELDRCQTRCQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGVcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG4vLyBpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtib3hTdHJpbmd9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvbWlzYyc7XG5pbXBvcnQgZ2VuZXJhdGVTdHJ1Y3R1cmUgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC90ZW1wbGF0ZS1nZW4nO1xuaW1wb3J0IHBsaW5rIGZyb20gJ19fcGxpbmsnO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2VuUGFja2FnZShwYXRoOiBzdHJpbmcsIGNvbXBOYW1lOiBzdHJpbmcsIGZlYXR1cmVOYW1lOiBzdHJpbmcsIG91dHB1dFBhdGg/OiBzdHJpbmcsXG4gIGRyeXJ1biA9IGZhbHNlKSB7XG4gIGNvbXBOYW1lID0gY29tcE5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBjb21wTmFtZS5zbGljZSgxKTtcbiAgLy8gY29uc3Qgc0NvbXBOYW1lID0gY29tcE5hbWUuY2hhckF0KDApLnRvTG93ZXJDYXNlKCkgKyBjb21wTmFtZS5zbGljZSgxKTtcbiAgY29uc3QgY2FwaXRhbEZlYXR1cmVOYW1lID0gZmVhdHVyZU5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBmZWF0dXJlTmFtZS5zbGljZSgxKTtcbiAgY29uc3QgbGl0dGxlRmVhdHVyZU5hbWUgPSBmZWF0dXJlTmFtZS5jaGFyQXQoMCkudG9Mb3dlckNhc2UoKSArIGZlYXR1cmVOYW1lLnNsaWNlKDEpO1xuXG4gIGlmICghcGF0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTGFjayBvZiBhcmd1bWVudHMnKTtcbiAgfVxuICBjb25zdCBkaXIgPSBQYXRoLnJlc29sdmUocGF0aCk7XG4gIGlmIChkcnlydW4pIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBwbGluay5sb2dnZXIuaW5mbygnZHJ5cnVuIG1vZGUnKTtcbiAgfSBlbHNlIHtcbiAgICBmcy5ta2RpcnBTeW5jKGRpcik7XG4gIH1cbiAgY29uc3QgbWEgPSAvXkBbXi9dXFwvKFteXSopJC8uZXhlYyhwYXRoKTtcbiAgaWYgKG1hKSB7XG4gICAgcGF0aCA9IG1hWzFdO1xuICB9XG4gIGNvbnN0IHBhY2thZ2VOYW1lID0gUGF0aC5iYXNlbmFtZShwYXRoKTtcbiAgY29uc3QgZmVhdHVyZURpciA9IFBhdGgucmVzb2x2ZShkaXIsIGxpdHRsZUZlYXR1cmVOYW1lKTtcbiAgaWYgKCFkcnlydW4pIHtcbiAgICBmcy5ta2RpcnBTeW5jKCBmZWF0dXJlRGlyKTsgLy8gbWtkaXIgZmVhdHVyZSBkaXJlY3RvcnlcbiAgfVxuXG4gIGlmIChvdXRwdXRQYXRoID09IG51bGwpXG4gICAgb3V0cHV0UGF0aCA9IFBhdGguYmFzZW5hbWUocGF0aCk7XG4gIGlmIChvdXRwdXRQYXRoLnN0YXJ0c1dpdGgoJy8nKSlcbiAgICBvdXRwdXRQYXRoID0gXy50cmltU3RhcnQob3V0cHV0UGF0aCwgJy8nKTtcblxuICBhd2FpdCBnZW5lcmF0ZVN0cnVjdHVyZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGUtY3JhLXBrZycpLCBkaXIsIHtcbiAgICAgIGZpbGVNYXBwaW5nOiBbXG4gICAgICAgIFsvXm15LWZlYXR1cmUvLCBsaXR0bGVGZWF0dXJlTmFtZV1cbiAgICAgIF0sXG4gICAgICB0ZXh0TWFwcGluZzoge1xuICAgICAgICBwYWNrYWdlTmFtZSxcbiAgICAgICAgTXlDb21wb25lbnRQYXRoOiBgJHtsaXR0bGVGZWF0dXJlTmFtZX0vJHtjb21wTmFtZX1gLFxuICAgICAgICBhcHBCdWlsZDogJy8nICsgb3V0cHV0UGF0aCxcbiAgICAgICAgcHVibGljVXJsT3JQYXRoOiAnLycgKyAob3V0cHV0UGF0aC5sZW5ndGggPiAwID8gb3V0cHV0UGF0aCArICcvJyA6ICcnKVxuICAgICAgfVxuICAgIH0sXG4gICAge2RyeXJ1bn0pO1xuXG4gIGF3YWl0IGdlbmVyYXRlU3RydWN0dXJlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZS1jcmEtY29ubmVjdGVkLWNvbXAnKSwgIGZlYXR1cmVEaXIsIHtcbiAgICAgIGZpbGVNYXBwaW5nOiBbXG4gICAgICAgIFsvXk15Q29ubmVjdGVkQ29tcC8sIGNvbXBOYW1lXVxuICAgICAgXSxcbiAgICAgIHRleHRNYXBwaW5nOiB7XG4gICAgICAgIE15Q29tcG9uZW50OiBjb21wTmFtZSxcbiAgICAgICAgc2xpY2VfZmlsZTogJy4vJyArIGZlYXR1cmVOYW1lICsgJ1NsaWNlJyxcbiAgICAgICAgd2l0aEltYWdlOiB0cnVlLFxuICAgICAgICBpc0VudHJ5OiB0cnVlLFxuICAgICAgICBpc0Nvbm5lY3RlZDogdHJ1ZVxuICAgICAgfVxuICAgIH0sXG4gICAge2RyeXJ1bn0pO1xuXG4gIGF3YWl0IGdlbmVyYXRlU3RydWN0dXJlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZS1jcmEtc2xpY2UnKSwgIGZlYXR1cmVEaXIsIHtcbiAgICAgIGZpbGVNYXBwaW5nOiBbXG4gICAgICAgIFsvXk15RmVhdHVyZVNsaWNlLywgbGl0dGxlRmVhdHVyZU5hbWUgKyAnU2xpY2UnXVxuICAgICAgXSxcbiAgICAgIHRleHRNYXBwaW5nOiB7XG4gICAgICAgIFNsaWNlTmFtZTogY2FwaXRhbEZlYXR1cmVOYW1lLFxuICAgICAgICBzbGljZU5hbWU6IGxpdHRsZUZlYXR1cmVOYW1lXG4gICAgICB9XG4gICAgfSxcbiAgICB7ZHJ5cnVufSk7XG4gIC8vIGNvcHlUZW1wbChkaXIsIFBhdGguYmFzZW5hbWUocGF0aCksIGRyeXJ1bik7XG4gIHBsaW5rLmxvZ2dlci5pbmZvKCdcXG4nICsgYm94U3RyaW5nKFxuICAgIGAxLiBNb2RpZnkgJHtQYXRoLnJlc29sdmUocGF0aCwgJ3BhY2thZ2UuanNvbicpfSB0byBjaGFuZ2UgY3VycmVudCBwYWNrYWdlIG5hbWUgXCJAd2ZoLyR7cGFja2FnZU5hbWV9XCIsYCArXG4gICAgJyBpZiB5b3UgZG9uXFwndCBsaWtlIGl0LlxcbicgK1xuICAgICcyLiBSdW4gY29tbWFuZDogcGxpbmsgc3luY1xcbicgK1xuICAgIGAzLiBBZGQgXCIke3BhY2thZ2VOYW1lfVwiIGFzIGRlcGVuZGVuY3kgaW4gJHtwcm9jZXNzLmN3ZCgpfS9wYWNrYWdlLmpzb24uXFxuYCArXG4gICAgYCAgKFJ1biBjb21tYW5kOiBwbGluayBhZGQgQHdmaC8ke3BhY2thZ2VOYW1lfSlcXG5gKSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZW5Db21wb25lbnRzKGRpcjogc3RyaW5nLCBjb21wTmFtZXM6IHN0cmluZ1tdLCBvcHRzOiB7Y29ubmVjdGVkVG9TbGljZT86IHN0cmluZzsgZHJ5cnVuOiBib29sZWFuOyB1c2VJbnRlcm5hbFNsaWNlPzogYm9vbGVhbn0pIHtcbiAgZGlyID0gUGF0aC5yZXNvbHZlKGRpcik7XG5cbiAgaWYgKG9wdHMuZHJ5cnVuKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgcGxpbmsubG9nZ2VyLmluZm8oJ2RyeXJ1biBtb2RlJyk7XG4gIH0gZWxzZSB7XG4gICAgZnMubWtkaXJwU3luYyhkaXIpO1xuICB9XG4gIGZvciAobGV0IGNvbXBOYW1lIG9mIGNvbXBOYW1lcykge1xuICAgIGNvbXBOYW1lID0gY29tcE5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBjb21wTmFtZS5zbGljZSgxKTtcblxuICAgIGxldCBzbGljZUZpbGVQYXRoID0gJzxZb3VyIFJlZHV4IFNsaWNlIFBhdGg+JztcbiAgICBpZiAob3B0cy5jb25uZWN0ZWRUb1NsaWNlKSB7XG4gICAgICBzbGljZUZpbGVQYXRoID0gUGF0aC5yZWxhdGl2ZShkaXIsIG9wdHMuY29ubmVjdGVkVG9TbGljZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpLnJlcGxhY2UoL1xcLlteLl0rJC8sICcnKTtcbiAgICAgIGlmICghc2xpY2VGaWxlUGF0aC5zdGFydHNXaXRoKCcuJykpXG4gICAgICAgIHNsaWNlRmlsZVBhdGggPSAnLi8nICsgc2xpY2VGaWxlUGF0aDtcbiAgICB9XG4gICAgYXdhaXQgZ2VuZXJhdGVTdHJ1Y3R1cmUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlLWNyYS1jb25uZWN0ZWQtY29tcCcpLCBkaXIsXG4gICAge1xuICAgICAgZmlsZU1hcHBpbmc6IFtcbiAgICAgICAgWy9eTXlDb25uZWN0ZWRDb21wLywgY29tcE5hbWVdXG4gICAgICBdLFxuICAgICAgdGV4dE1hcHBpbmc6IHtcbiAgICAgICAgTXlDb21wb25lbnQ6IGNvbXBOYW1lLFxuICAgICAgICBzbGljZV9maWxlOiBzbGljZUZpbGVQYXRoLFxuICAgICAgICB3aXRoSW1hZ2U6IGZhbHNlLFxuICAgICAgICBpc0VudHJ5OiBmYWxzZSxcbiAgICAgICAgaXNDb25uZWN0ZWQ6ICEhb3B0cy5jb25uZWN0ZWRUb1NsaWNlXG4gICAgICB9XG4gICAgfSxcbiAgICB7ZHJ5cnVuOiBvcHRzLmRyeXJ1bn0pO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZW5TbGljZShkaXI6IHN0cmluZywgdGFyZ2V0TmFtZXM6IHN0cmluZ1tdLCBvcHQ6IHtkcnlSdW4/OiBib29sZWFuOyB0aW55OiBib29sZWFuLCBpbnRlcm5hbDogYm9vbGVhbn0pIHtcbiAgZGlyID0gUGF0aC5yZXNvbHZlKGRpcik7XG5cbiAgaWYgKG9wdC5kcnlSdW4pIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBwbGluay5sb2dnZXIuaW5mbygnZHJ5cnVuIG1vZGUnKTtcbiAgfSBlbHNlIHtcbiAgICBmcy5ta2RpcnBTeW5jKGRpcik7XG4gIH1cbiAgZm9yIChsZXQgdGFyZ2V0TmFtZSBvZiB0YXJnZXROYW1lcykge1xuICAgIHRhcmdldE5hbWUgPSB0YXJnZXROYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdGFyZ2V0TmFtZS5zbGljZSgxKTtcbiAgICBjb25zdCBzbWFsbFRhcmdldE5hbWUgPSB0YXJnZXROYW1lLmNoYXJBdCgwKS50b0xvd2VyQ2FzZSgpICsgdGFyZ2V0TmFtZS5zbGljZSgxKTtcbiAgICBhd2FpdCBnZW5lcmF0ZVN0cnVjdHVyZShcbiAgICAgIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIG9wdC50aW55ID8gJy4uLy4uL3RlbXBsYXRlLWNyYS10aW55LXJlZHV4JyA6IG9wdC5pbnRlcm5hbCA/ICcuLi8uLi90ZW1wbGF0ZS1zbGljZTRjb21wJyA6ICcuLi8uLi90ZW1wbGF0ZS1jcmEtc2xpY2UnKSxcbiAgICAgIGRpcixcbiAgICB7XG4gICAgICBmaWxlTWFwcGluZzogW1xuICAgICAgICBbL15teUZlYXR1cmUvaSwgc21hbGxUYXJnZXROYW1lXSxcbiAgICAgICAgWy9eTXlDb21wLywgc21hbGxUYXJnZXROYW1lXVxuICAgICAgXSxcbiAgICAgIHRleHRNYXBwaW5nOiB7XG4gICAgICAgIFNsaWNlTmFtZTogdGFyZ2V0TmFtZSxcbiAgICAgICAgc2xpY2VOYW1lOiBzbWFsbFRhcmdldE5hbWUsXG4gICAgICAgIE15Q29tcG9uZW50OiB0YXJnZXROYW1lXG4gICAgICB9XG4gICAgfSxcbiAgICB7ZHJ5cnVuOiBvcHQuZHJ5UnVufSk7XG4gIH1cbn1cbiJdfQ==