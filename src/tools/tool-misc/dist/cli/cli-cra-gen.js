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
function genComponents(dir, compNames, connectedToSlice, dryrun = false) {
    return __awaiter(this, void 0, void 0, function* () {
        dir = path_1.default.resolve(dir);
        if (dryrun) {
            // tslint:disable-next-line: no-console
            __plink_1.default.logger.info('dryrun mode');
        }
        else {
            fs_extra_1.default.mkdirpSync(dir);
        }
        for (let compName of compNames) {
            compName = compName.charAt(0).toUpperCase() + compName.slice(1);
            let sliceFilePath = '<Your Redux Slice Path>';
            if (connectedToSlice) {
                sliceFilePath = path_1.default.relative(dir, connectedToSlice).replace(/\\/g, '/').replace(/\.[^.]+$/, '');
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
                    isConnected: !!connectedToSlice
                }
            }, { dryrun });
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
            yield template_gen_1.default(path_1.default.resolve(__dirname, opt.internal ? '../../template-cra-tiny-redux' : '../../template-cra-slice'), dir, {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWNyYS1nZW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGktY3JhLWdlbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIsd0RBQTBCO0FBQzFCLGdEQUF3QjtBQUN4QixvREFBdUI7QUFDdkIsNkJBQTZCO0FBQzdCLHlEQUF5RDtBQUN6RCxvRkFBaUU7QUFDakUsc0RBQTRCO0FBRTVCLFNBQXNCLFVBQVUsQ0FBQyxJQUFZLEVBQUUsUUFBZ0IsRUFBRSxXQUFtQixFQUFFLFVBQW1CLEVBQ3ZHLE1BQU0sR0FBRyxLQUFLOztRQUNkLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEUsMEVBQTBFO1FBQzFFLE1BQU0sa0JBQWtCLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0saUJBQWlCLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXJGLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDVCxNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUM7U0FDdEM7UUFDRCxNQUFNLEdBQUcsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9CLElBQUksTUFBTSxFQUFFO1lBQ1YsdUNBQXVDO1lBQ3ZDLGlCQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztTQUNsQzthQUFNO1lBQ0wsa0JBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7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RSxHQUFHLENBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQztTQUN2QjtJQUNILENBQUM7Q0FBQTtBQTVCRCw0QkE0QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlXG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7Ym94U3RyaW5nfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL21pc2MnO1xuaW1wb3J0IGdlbmVyYXRlU3RydWN0dXJlIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdGVtcGxhdGUtZ2VuJztcbmltcG9ydCBwbGluayBmcm9tICdfX3BsaW5rJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlblBhY2thZ2UocGF0aDogc3RyaW5nLCBjb21wTmFtZTogc3RyaW5nLCBmZWF0dXJlTmFtZTogc3RyaW5nLCBvdXRwdXRQYXRoPzogc3RyaW5nLFxuICBkcnlydW4gPSBmYWxzZSkge1xuICBjb21wTmFtZSA9IGNvbXBOYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgY29tcE5hbWUuc2xpY2UoMSk7XG4gIC8vIGNvbnN0IHNDb21wTmFtZSA9IGNvbXBOYW1lLmNoYXJBdCgwKS50b0xvd2VyQ2FzZSgpICsgY29tcE5hbWUuc2xpY2UoMSk7XG4gIGNvbnN0IGNhcGl0YWxGZWF0dXJlTmFtZSA9IGZlYXR1cmVOYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgZmVhdHVyZU5hbWUuc2xpY2UoMSk7XG4gIGNvbnN0IGxpdHRsZUZlYXR1cmVOYW1lID0gZmVhdHVyZU5hbWUuY2hhckF0KDApLnRvTG93ZXJDYXNlKCkgKyBmZWF0dXJlTmFtZS5zbGljZSgxKTtcblxuICBpZiAoIXBhdGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0xhY2sgb2YgYXJndW1lbnRzJyk7XG4gIH1cbiAgY29uc3QgZGlyID0gUGF0aC5yZXNvbHZlKHBhdGgpO1xuICBpZiAoZHJ5cnVuKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgcGxpbmsubG9nZ2VyLmluZm8oJ2RyeXJ1biBtb2RlJyk7XG4gIH0gZWxzZSB7XG4gICAgZnMubWtkaXJwU3luYyhkaXIpO1xuICB9XG4gIGNvbnN0IG1hID0gL15AW14vXVxcLyhbXl0qKSQvLmV4ZWMocGF0aCk7XG4gIGlmIChtYSkge1xuICAgIHBhdGggPSBtYVsxXTtcbiAgfVxuICBjb25zdCBwYWNrYWdlTmFtZSA9IFBhdGguYmFzZW5hbWUocGF0aCk7XG4gIGNvbnN0IGZlYXR1cmVEaXIgPSBQYXRoLnJlc29sdmUoZGlyLCBsaXR0bGVGZWF0dXJlTmFtZSk7XG4gIGlmICghZHJ5cnVuKSB7XG4gICAgZnMubWtkaXJwU3luYyggZmVhdHVyZURpcik7IC8vIG1rZGlyIGZlYXR1cmUgZGlyZWN0b3J5XG4gIH1cblxuICBpZiAob3V0cHV0UGF0aCA9PSBudWxsKVxuICAgIG91dHB1dFBhdGggPSBQYXRoLmJhc2VuYW1lKHBhdGgpO1xuICBpZiAob3V0cHV0UGF0aC5zdGFydHNXaXRoKCcvJykpXG4gICAgb3V0cHV0UGF0aCA9IF8udHJpbVN0YXJ0KG91dHB1dFBhdGgsICcvJyk7XG5cbiAgYXdhaXQgZ2VuZXJhdGVTdHJ1Y3R1cmUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlLWNyYS1wa2cnKSwgZGlyLCB7XG4gICAgICBmaWxlTWFwcGluZzogW1xuICAgICAgICBbL15teS1mZWF0dXJlLywgbGl0dGxlRmVhdHVyZU5hbWVdXG4gICAgICBdLFxuICAgICAgdGV4dE1hcHBpbmc6IHtcbiAgICAgICAgcGFja2FnZU5hbWUsXG4gICAgICAgIE15Q29tcG9uZW50UGF0aDogYCR7bGl0dGxlRmVhdHVyZU5hbWV9LyR7Y29tcE5hbWV9YCxcbiAgICAgICAgYXBwQnVpbGQ6ICcvJyArIG91dHB1dFBhdGgsXG4gICAgICAgIHB1YmxpY1VybE9yUGF0aDogJy8nICsgKG91dHB1dFBhdGgubGVuZ3RoID4gMCA/IG91dHB1dFBhdGggKyAnLycgOiAnJylcbiAgICAgIH1cbiAgICB9LFxuICAgIHtkcnlydW59KTtcblxuICBhd2FpdCBnZW5lcmF0ZVN0cnVjdHVyZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGUtY3JhLWNvbm5lY3RlZC1jb21wJyksICBmZWF0dXJlRGlyLCB7XG4gICAgICBmaWxlTWFwcGluZzogW1xuICAgICAgICBbL15NeUNvbm5lY3RlZENvbXAvLCBjb21wTmFtZV1cbiAgICAgIF0sXG4gICAgICB0ZXh0TWFwcGluZzoge1xuICAgICAgICBNeUNvbXBvbmVudDogY29tcE5hbWUsXG4gICAgICAgIHNsaWNlX2ZpbGU6ICcuLycgKyBmZWF0dXJlTmFtZSArICdTbGljZScsXG4gICAgICAgIHdpdGhJbWFnZTogdHJ1ZSxcbiAgICAgICAgaXNFbnRyeTogdHJ1ZSxcbiAgICAgICAgaXNDb25uZWN0ZWQ6IHRydWVcbiAgICAgIH1cbiAgICB9LFxuICAgIHtkcnlydW59KTtcblxuICBhd2FpdCBnZW5lcmF0ZVN0cnVjdHVyZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGUtY3JhLXNsaWNlJyksICBmZWF0dXJlRGlyLCB7XG4gICAgICBmaWxlTWFwcGluZzogW1xuICAgICAgICBbL15NeUZlYXR1cmVTbGljZS8sIGxpdHRsZUZlYXR1cmVOYW1lICsgJ1NsaWNlJ11cbiAgICAgIF0sXG4gICAgICB0ZXh0TWFwcGluZzoge1xuICAgICAgICBTbGljZU5hbWU6IGNhcGl0YWxGZWF0dXJlTmFtZSxcbiAgICAgICAgc2xpY2VOYW1lOiBsaXR0bGVGZWF0dXJlTmFtZVxuICAgICAgfVxuICAgIH0sXG4gICAge2RyeXJ1bn0pO1xuICAvLyBjb3B5VGVtcGwoZGlyLCBQYXRoLmJhc2VuYW1lKHBhdGgpLCBkcnlydW4pO1xuICBwbGluay5sb2dnZXIuaW5mbygnXFxuJyArIGJveFN0cmluZyhcbiAgICBgMS4gTW9kaWZ5ICR7UGF0aC5yZXNvbHZlKHBhdGgsICdwYWNrYWdlLmpzb24nKX0gdG8gY2hhbmdlIGN1cnJlbnQgcGFja2FnZSBuYW1lIFwiQHdmaC8ke3BhY2thZ2VOYW1lfVwiLGAgK1xuICAgICcgaWYgeW91IGRvblxcJ3QgbGlrZSBpdC5cXG4nICtcbiAgICAnMi4gUnVuIGNvbW1hbmQ6IHBsaW5rIHN5bmNcXG4nICtcbiAgICBgMy4gQWRkIFwiJHtwYWNrYWdlTmFtZX1cIiBhcyBkZXBlbmRlbmN5IGluICR7cHJvY2Vzcy5jd2QoKX0vcGFja2FnZS5qc29uLlxcbmAgK1xuICAgIGAgIChSdW4gY29tbWFuZDogcGxpbmsgYWRkIEB3ZmgvJHtwYWNrYWdlTmFtZX0pXFxuYCkpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2VuQ29tcG9uZW50cyhkaXI6IHN0cmluZywgY29tcE5hbWVzOiBzdHJpbmdbXSwgY29ubmVjdGVkVG9TbGljZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBkcnlydW4gPSBmYWxzZSkge1xuICBkaXIgPSBQYXRoLnJlc29sdmUoZGlyKTtcblxuICBpZiAoZHJ5cnVuKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgcGxpbmsubG9nZ2VyLmluZm8oJ2RyeXJ1biBtb2RlJyk7XG4gIH0gZWxzZSB7XG4gICAgZnMubWtkaXJwU3luYyhkaXIpO1xuICB9XG4gIGZvciAobGV0IGNvbXBOYW1lIG9mIGNvbXBOYW1lcykge1xuICAgIGNvbXBOYW1lID0gY29tcE5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBjb21wTmFtZS5zbGljZSgxKTtcblxuICAgIGxldCBzbGljZUZpbGVQYXRoID0gJzxZb3VyIFJlZHV4IFNsaWNlIFBhdGg+JztcbiAgICBpZiAoY29ubmVjdGVkVG9TbGljZSkge1xuICAgICAgc2xpY2VGaWxlUGF0aCA9IFBhdGgucmVsYXRpdmUoZGlyLCBjb25uZWN0ZWRUb1NsaWNlKS5yZXBsYWNlKC9cXFxcL2csICcvJykucmVwbGFjZSgvXFwuW14uXSskLywgJycpO1xuICAgICAgaWYgKCFzbGljZUZpbGVQYXRoLnN0YXJ0c1dpdGgoJy4nKSlcbiAgICAgICAgc2xpY2VGaWxlUGF0aCA9ICcuLycgKyBzbGljZUZpbGVQYXRoO1xuICAgIH1cbiAgICBhd2FpdCBnZW5lcmF0ZVN0cnVjdHVyZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGUtY3JhLWNvbm5lY3RlZC1jb21wJyksIGRpcixcbiAgICB7XG4gICAgICBmaWxlTWFwcGluZzogW1xuICAgICAgICBbL15NeUNvbm5lY3RlZENvbXAvLCBjb21wTmFtZV1cbiAgICAgIF0sXG4gICAgICB0ZXh0TWFwcGluZzoge1xuICAgICAgICBNeUNvbXBvbmVudDogY29tcE5hbWUsXG4gICAgICAgIHNsaWNlX2ZpbGU6IHNsaWNlRmlsZVBhdGgsXG4gICAgICAgIHdpdGhJbWFnZTogZmFsc2UsXG4gICAgICAgIGlzRW50cnk6IGZhbHNlLFxuICAgICAgICBpc0Nvbm5lY3RlZDogISFjb25uZWN0ZWRUb1NsaWNlXG4gICAgICB9XG4gICAgfSxcbiAgICB7ZHJ5cnVufSk7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlblNsaWNlKGRpcjogc3RyaW5nLCB0YXJnZXROYW1lczogc3RyaW5nW10sIG9wdDoge2RyeVJ1bj86IGJvb2xlYW47IGludGVybmFsOiBib29sZWFufSkge1xuICBkaXIgPSBQYXRoLnJlc29sdmUoZGlyKTtcblxuICBpZiAob3B0LmRyeVJ1bikge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIHBsaW5rLmxvZ2dlci5pbmZvKCdkcnlydW4gbW9kZScpO1xuICB9IGVsc2Uge1xuICAgIGZzLm1rZGlycFN5bmMoZGlyKTtcbiAgfVxuICBmb3IgKGxldCB0YXJnZXROYW1lIG9mIHRhcmdldE5hbWVzKSB7XG4gICAgdGFyZ2V0TmFtZSA9IHRhcmdldE5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB0YXJnZXROYW1lLnNsaWNlKDEpO1xuICAgIGNvbnN0IHNtYWxsVGFyZ2V0TmFtZSA9IHRhcmdldE5hbWUuY2hhckF0KDApLnRvTG93ZXJDYXNlKCkgKyB0YXJnZXROYW1lLnNsaWNlKDEpO1xuICAgIGF3YWl0IGdlbmVyYXRlU3RydWN0dXJlKFxuICAgICAgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgb3B0LmludGVybmFsID8gJy4uLy4uL3RlbXBsYXRlLWNyYS10aW55LXJlZHV4JyA6ICcuLi8uLi90ZW1wbGF0ZS1jcmEtc2xpY2UnKSxcbiAgICAgIGRpcixcbiAgICB7XG4gICAgICBmaWxlTWFwcGluZzogW1xuICAgICAgICBbL15teUZlYXR1cmUvaSwgc21hbGxUYXJnZXROYW1lXSxcbiAgICAgICAgWy9eTXlDb21wLywgc21hbGxUYXJnZXROYW1lXVxuICAgICAgXSxcbiAgICAgIHRleHRNYXBwaW5nOiB7XG4gICAgICAgIFNsaWNlTmFtZTogdGFyZ2V0TmFtZSxcbiAgICAgICAgc2xpY2VOYW1lOiBzbWFsbFRhcmdldE5hbWUsXG4gICAgICAgIE15Q29tcG9uZW50OiB0YXJnZXROYW1lXG4gICAgICB9XG4gICAgfSxcbiAgICB7ZHJ5cnVuOiBvcHQuZHJ5UnVufSk7XG4gIH1cbn1cbiJdfQ==