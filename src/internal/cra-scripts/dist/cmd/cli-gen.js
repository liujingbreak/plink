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
const chalk_1 = __importDefault(require("chalk"));
const misc_1 = require("@wfh/plink/wfh/dist/utils/misc");
const template_gen_1 = __importDefault(require("@wfh/plink/wfh/dist/template-gen"));
function genPackage(path, compName = 'Sample', dryrun = false) {
    return __awaiter(this, void 0, void 0, function* () {
        compName = compName.charAt(0).toUpperCase() + compName.slice(1);
        const sCompName = compName.charAt(0).toLowerCase() + compName.slice(1);
        if (!path) {
            throw new Error('Lack of arguments');
        }
        const dir = path_1.default.resolve(path);
        if (dryrun) {
            // tslint:disable-next-line: no-console
            console.log('[cra-scripts cmd] dryrun mode');
        }
        else {
            fs_extra_1.default.mkdirpSync(dir);
        }
        const ma = /^@[^/]\/([^]*)$/.exec(path);
        if (ma) {
            path = ma[1];
        }
        yield template_gen_1.default(path_1.default.resolve(__dirname, '../../template'), dir, {
            fileMapping: [
                [/^my\-feature/, 'sample'],
                [/^MyFeature/, compName],
                [/^MyComponent/, compName + 'Comp']
            ],
            textMapping: {
                packageName: path_1.default.basename(path),
                MyComponent: compName + 'Comp',
                SliceName: compName,
                sliceName: sCompName,
                MyComponentPath: `${sCompName}/${compName}Comp`
            }
        }, { dryrun });
        // copyTempl(dir, Path.basename(path), dryrun);
        console.log('[cra-scripts cmd]\n' + misc_1.boxString(`Please modify ${path_1.default.resolve(path, 'package.json')} to change package name,\n` +
            `and run command:\n  ${chalk_1.default.cyan('plink init')}`));
    });
}
exports.genPackage = genPackage;
function genComponents(dir, compNames, dryrun = false) {
    return __awaiter(this, void 0, void 0, function* () {
        dir = path_1.default.resolve(dir);
        if (dryrun) {
            // tslint:disable-next-line: no-console
            console.log('[cra-scripts cmd] dryrun mode');
        }
        else {
            fs_extra_1.default.mkdirpSync(dir);
        }
        for (let compName of compNames) {
            compName = compName.charAt(0).toUpperCase() + compName.slice(1);
            const sCompName = compName.charAt(0).toLowerCase() + compName.slice(1);
            yield template_gen_1.default(path_1.default.resolve(__dirname, '../../template-comp'), dir, {
                fileMapping: [
                    [/^my\-feature/, 'sample'],
                    [/^MyComponent/, compName + 'Comp']
                ],
                textMapping: {
                    MyComponent: compName + 'Comp',
                    SliceName: compName,
                    sliceName: sCompName
                }
            }, { dryrun });
        }
    });
}
exports.genComponents = genComponents;
function genSlice(dir, targetNames, dryrun = false) {
    return __awaiter(this, void 0, void 0, function* () {
        dir = path_1.default.resolve(dir);
        if (dryrun) {
            // tslint:disable-next-line: no-console
            console.log('[cra-scripts cmd] dryrun mode');
        }
        else {
            fs_extra_1.default.mkdirpSync(dir);
        }
        for (let targetName of targetNames) {
            targetName = targetName.charAt(0).toUpperCase() + targetName.slice(1);
            const smallTargetName = targetName.charAt(0).toLowerCase() + targetName.slice(1);
            yield template_gen_1.default(path_1.default.resolve(__dirname, '../../template-slice'), dir, {
                fileMapping: [
                    [/^MyFeature/, smallTargetName]
                ],
                textMapping: {
                    SliceName: targetName,
                    sliceName: smallTargetName
                }
            }, { dryrun });
        }
    });
}
exports.genSlice = genSlice;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWdlbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsaS1nZW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLHdEQUEwQjtBQUMxQixnREFBd0I7QUFFeEIsa0RBQTBCO0FBQzFCLHlEQUF5RDtBQUN6RCxvRkFBaUU7QUFFakUsU0FBc0IsVUFBVSxDQUFDLElBQVksRUFBRSxRQUFRLEdBQUcsUUFBUSxFQUFFLE1BQU0sR0FBRyxLQUFLOztRQUNoRixRQUFRLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hFLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2RSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ1QsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1NBQ3RDO1FBQ0QsTUFBTSxHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQixJQUFJLE1BQU0sRUFBRTtZQUNWLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLCtCQUErQixDQUFDLENBQUM7U0FDOUM7YUFBTTtZQUNMLGtCQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3BCO1FBQ0QsTUFBTSxFQUFFLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hDLElBQUksRUFBRSxFQUFFO1lBQ04sSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNkO1FBQ0QsTUFBTSxzQkFBaUIsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLEdBQUcsRUFDcEU7WUFDRSxXQUFXLEVBQUU7Z0JBQ1gsQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDO2dCQUMxQixDQUFDLFlBQVksRUFBRSxRQUFRLENBQUM7Z0JBQ3hCLENBQUMsY0FBYyxFQUFFLFFBQVEsR0FBRyxNQUFNLENBQUM7YUFDcEM7WUFDRCxXQUFXLEVBQUU7Z0JBQ1gsV0FBVyxFQUFFLGNBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO2dCQUNoQyxXQUFXLEVBQUUsUUFBUSxHQUFHLE1BQU07Z0JBQzlCLFNBQVMsRUFBRSxRQUFRO2dCQUNuQixTQUFTLEVBQUUsU0FBUztnQkFDcEIsZUFBZSxFQUFFLEdBQUcsU0FBUyxJQUFJLFFBQVEsTUFBTTthQUNoRDtTQUNGLEVBQ0QsRUFBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDO1FBRVosK0NBQStDO1FBQy9DLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEdBQUcsZ0JBQVMsQ0FDM0MsaUJBQWlCLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyw0QkFBNEI7WUFFL0UsdUJBQXVCLGVBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDeEQsQ0FBQztDQUFBO0FBdkNELGdDQXVDQztBQUVELFNBQXNCLGFBQWEsQ0FBQyxHQUFXLEVBQUUsU0FBbUIsRUFBRSxNQUFNLEdBQUcsS0FBSzs7UUFDbEYsR0FBRyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFeEIsSUFBSSxNQUFNLEVBQUU7WUFDVix1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1NBQzlDO2FBQU07WUFDTCxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNwQjtRQUNELEtBQUssSUFBSSxRQUFRLElBQUksU0FBUyxFQUFFO1lBQzlCLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEUsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZFLE1BQU0sc0JBQWlCLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUscUJBQXFCLENBQUMsRUFBRSxHQUFHLEVBQzNFO2dCQUNFLFdBQVcsRUFBRTtvQkFDWCxDQUFDLGNBQWMsRUFBRSxRQUFRLENBQUM7b0JBQzFCLENBQUMsY0FBYyxFQUFFLFFBQVEsR0FBRyxNQUFNLENBQUM7aUJBQ3BDO2dCQUNELFdBQVcsRUFBRTtvQkFDWCxXQUFXLEVBQUUsUUFBUSxHQUFHLE1BQU07b0JBQzlCLFNBQVMsRUFBRSxRQUFRO29CQUNuQixTQUFTLEVBQUUsU0FBUztpQkFDckI7YUFDRixFQUNELEVBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQztTQUNYO0lBQ0gsQ0FBQztDQUFBO0FBMUJELHNDQTBCQztBQUVELFNBQXNCLFFBQVEsQ0FBQyxHQUFXLEVBQUUsV0FBcUIsRUFBRSxNQUFNLEdBQUcsS0FBSzs7UUFDL0UsR0FBRyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFeEIsSUFBSSxNQUFNLEVBQUU7WUFDVix1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1NBQzlDO2FBQU07WUFDTCxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNwQjtRQUNELEtBQUssSUFBSSxVQUFVLElBQUksV0FBVyxFQUFFO1lBQ2xDLFVBQVUsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdEUsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pGLE1BQU0sc0JBQWlCLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxHQUFHLEVBQzVFO2dCQUNFLFdBQVcsRUFBRTtvQkFDWCxDQUFDLFlBQVksRUFBRSxlQUFlLENBQUM7aUJBQ2hDO2dCQUNELFdBQVcsRUFBRTtvQkFDWCxTQUFTLEVBQUUsVUFBVTtvQkFDckIsU0FBUyxFQUFFLGVBQWU7aUJBQzNCO2FBQ0YsRUFDRCxFQUFDLE1BQU0sRUFBQyxDQUFDLENBQUM7U0FDWDtJQUNILENBQUM7Q0FBQTtBQXhCRCw0QkF3QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlXG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7Ym94U3RyaW5nfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL21pc2MnO1xuaW1wb3J0IGdlbmVyYXRlU3RydWN0dXJlIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdGVtcGxhdGUtZ2VuJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlblBhY2thZ2UocGF0aDogc3RyaW5nLCBjb21wTmFtZSA9ICdTYW1wbGUnLCBkcnlydW4gPSBmYWxzZSkge1xuICBjb21wTmFtZSA9IGNvbXBOYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgY29tcE5hbWUuc2xpY2UoMSk7XG4gIGNvbnN0IHNDb21wTmFtZSA9IGNvbXBOYW1lLmNoYXJBdCgwKS50b0xvd2VyQ2FzZSgpICsgY29tcE5hbWUuc2xpY2UoMSk7XG4gIGlmICghcGF0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTGFjayBvZiBhcmd1bWVudHMnKTtcbiAgfVxuICBjb25zdCBkaXIgPSBQYXRoLnJlc29sdmUocGF0aCk7XG4gIGlmIChkcnlydW4pIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnW2NyYS1zY3JpcHRzIGNtZF0gZHJ5cnVuIG1vZGUnKTtcbiAgfSBlbHNlIHtcbiAgICBmcy5ta2RpcnBTeW5jKGRpcik7XG4gIH1cbiAgY29uc3QgbWEgPSAvXkBbXi9dXFwvKFteXSopJC8uZXhlYyhwYXRoKTtcbiAgaWYgKG1hKSB7XG4gICAgcGF0aCA9IG1hWzFdO1xuICB9XG4gIGF3YWl0IGdlbmVyYXRlU3RydWN0dXJlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZScpLCBkaXIsXG4gICAge1xuICAgICAgZmlsZU1hcHBpbmc6IFtcbiAgICAgICAgWy9ebXlcXC1mZWF0dXJlLywgJ3NhbXBsZSddLFxuICAgICAgICBbL15NeUZlYXR1cmUvLCBjb21wTmFtZV0sXG4gICAgICAgIFsvXk15Q29tcG9uZW50LywgY29tcE5hbWUgKyAnQ29tcCddXG4gICAgICBdLFxuICAgICAgdGV4dE1hcHBpbmc6IHtcbiAgICAgICAgcGFja2FnZU5hbWU6IFBhdGguYmFzZW5hbWUocGF0aCksXG4gICAgICAgIE15Q29tcG9uZW50OiBjb21wTmFtZSArICdDb21wJyxcbiAgICAgICAgU2xpY2VOYW1lOiBjb21wTmFtZSxcbiAgICAgICAgc2xpY2VOYW1lOiBzQ29tcE5hbWUsXG4gICAgICAgIE15Q29tcG9uZW50UGF0aDogYCR7c0NvbXBOYW1lfS8ke2NvbXBOYW1lfUNvbXBgXG4gICAgICB9XG4gICAgfSxcbiAgICB7ZHJ5cnVufSk7XG5cbiAgLy8gY29weVRlbXBsKGRpciwgUGF0aC5iYXNlbmFtZShwYXRoKSwgZHJ5cnVuKTtcbiAgY29uc29sZS5sb2coJ1tjcmEtc2NyaXB0cyBjbWRdXFxuJyArIGJveFN0cmluZyhcbiAgICBgUGxlYXNlIG1vZGlmeSAke1BhdGgucmVzb2x2ZShwYXRoLCAncGFja2FnZS5qc29uJyl9IHRvIGNoYW5nZSBwYWNrYWdlIG5hbWUsXFxuYCArXG5cbiAgICBgYW5kIHJ1biBjb21tYW5kOlxcbiAgJHtjaGFsay5jeWFuKCdwbGluayBpbml0Jyl9YCkpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2VuQ29tcG9uZW50cyhkaXI6IHN0cmluZywgY29tcE5hbWVzOiBzdHJpbmdbXSwgZHJ5cnVuID0gZmFsc2UpIHtcbiAgZGlyID0gUGF0aC5yZXNvbHZlKGRpcik7XG5cbiAgaWYgKGRyeXJ1bikge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdbY3JhLXNjcmlwdHMgY21kXSBkcnlydW4gbW9kZScpO1xuICB9IGVsc2Uge1xuICAgIGZzLm1rZGlycFN5bmMoZGlyKTtcbiAgfVxuICBmb3IgKGxldCBjb21wTmFtZSBvZiBjb21wTmFtZXMpIHtcbiAgICBjb21wTmFtZSA9IGNvbXBOYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgY29tcE5hbWUuc2xpY2UoMSk7XG4gICAgY29uc3Qgc0NvbXBOYW1lID0gY29tcE5hbWUuY2hhckF0KDApLnRvTG93ZXJDYXNlKCkgKyBjb21wTmFtZS5zbGljZSgxKTtcbiAgICBhd2FpdCBnZW5lcmF0ZVN0cnVjdHVyZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGUtY29tcCcpLCBkaXIsXG4gICAge1xuICAgICAgZmlsZU1hcHBpbmc6IFtcbiAgICAgICAgWy9ebXlcXC1mZWF0dXJlLywgJ3NhbXBsZSddLFxuICAgICAgICBbL15NeUNvbXBvbmVudC8sIGNvbXBOYW1lICsgJ0NvbXAnXVxuICAgICAgXSxcbiAgICAgIHRleHRNYXBwaW5nOiB7XG4gICAgICAgIE15Q29tcG9uZW50OiBjb21wTmFtZSArICdDb21wJyxcbiAgICAgICAgU2xpY2VOYW1lOiBjb21wTmFtZSxcbiAgICAgICAgc2xpY2VOYW1lOiBzQ29tcE5hbWVcbiAgICAgIH1cbiAgICB9LFxuICAgIHtkcnlydW59KTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2VuU2xpY2UoZGlyOiBzdHJpbmcsIHRhcmdldE5hbWVzOiBzdHJpbmdbXSwgZHJ5cnVuID0gZmFsc2UpIHtcbiAgZGlyID0gUGF0aC5yZXNvbHZlKGRpcik7XG5cbiAgaWYgKGRyeXJ1bikge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdbY3JhLXNjcmlwdHMgY21kXSBkcnlydW4gbW9kZScpO1xuICB9IGVsc2Uge1xuICAgIGZzLm1rZGlycFN5bmMoZGlyKTtcbiAgfVxuICBmb3IgKGxldCB0YXJnZXROYW1lIG9mIHRhcmdldE5hbWVzKSB7XG4gICAgdGFyZ2V0TmFtZSA9IHRhcmdldE5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB0YXJnZXROYW1lLnNsaWNlKDEpO1xuICAgIGNvbnN0IHNtYWxsVGFyZ2V0TmFtZSA9IHRhcmdldE5hbWUuY2hhckF0KDApLnRvTG93ZXJDYXNlKCkgKyB0YXJnZXROYW1lLnNsaWNlKDEpO1xuICAgIGF3YWl0IGdlbmVyYXRlU3RydWN0dXJlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZS1zbGljZScpLCBkaXIsXG4gICAge1xuICAgICAgZmlsZU1hcHBpbmc6IFtcbiAgICAgICAgWy9eTXlGZWF0dXJlLywgc21hbGxUYXJnZXROYW1lXVxuICAgICAgXSxcbiAgICAgIHRleHRNYXBwaW5nOiB7XG4gICAgICAgIFNsaWNlTmFtZTogdGFyZ2V0TmFtZSxcbiAgICAgICAgc2xpY2VOYW1lOiBzbWFsbFRhcmdldE5hbWVcbiAgICAgIH1cbiAgICB9LFxuICAgIHtkcnlydW59KTtcbiAgfVxufVxuIl19