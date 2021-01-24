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
        const packageName = path_1.default.basename(path);
        yield template_gen_1.default(path_1.default.resolve(__dirname, '../../template'), dir, {
            fileMapping: [
                [/^my\-feature/, 'sample'],
                [/^MyFeature/, sCompName],
                [/^MyComponent/, compName + 'Comp']
            ],
            textMapping: {
                packageName,
                MyComponent: compName + 'Comp',
                SliceName: compName,
                sliceName: sCompName,
                MyComponentPath: `${sCompName}/${compName}Comp`
            }
        }, { dryrun });
        // copyTempl(dir, Path.basename(path), dryrun);
        console.log('[cra-scripts cmd]\n' + misc_1.boxString(`1. Modify ${path_1.default.resolve(path, 'package.json')} to change current package name "${packageName}",` +
            ` if you don't like it.\n` +
            `2. Add "${packageName}" as dependency in ${process.cwd()}/package.json.\n` +
            `3. Run command:\n  ${chalk_1.default.cyan('plink init .')}`));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWdlbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsaS1nZW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLHdEQUEwQjtBQUMxQixnREFBd0I7QUFFeEIsa0RBQTBCO0FBQzFCLHlEQUF5RDtBQUN6RCxvRkFBaUU7QUFFakUsU0FBc0IsVUFBVSxDQUFDLElBQVksRUFBRSxRQUFRLEdBQUcsUUFBUSxFQUFFLE1BQU0sR0FBRyxLQUFLOztRQUNoRixRQUFRLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hFLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2RSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ1QsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1NBQ3RDO1FBQ0QsTUFBTSxHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQixJQUFJLE1BQU0sRUFBRTtZQUNWLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLCtCQUErQixDQUFDLENBQUM7U0FDOUM7YUFBTTtZQUNMLGtCQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3BCO1FBQ0QsTUFBTSxFQUFFLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hDLElBQUksRUFBRSxFQUFFO1lBQ04sSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNkO1FBQ0QsTUFBTSxXQUFXLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMs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VSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RFLE1BQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqRixNQUFNLHNCQUFpQixDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLHNCQUFzQixDQUFDLEVBQUUsR0FBRyxFQUM1RTtnQkFDRSxXQUFXLEVBQUU7b0JBQ1gsQ0FBQyxZQUFZLEVBQUUsZUFBZSxDQUFDO2lCQUNoQztnQkFDRCxXQUFXLEVBQUU7b0JBQ1gsU0FBUyxFQUFFLFVBQVU7b0JBQ3JCLFNBQVMsRUFBRSxlQUFlO2lCQUMzQjthQUNGLEVBQ0QsRUFBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDO1NBQ1g7SUFDSCxDQUFDO0NBQUE7QUF4QkQsNEJBd0JDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbm8tY29uc29sZVxuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge2JveFN0cmluZ30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9taXNjJztcbmltcG9ydCBnZW5lcmF0ZVN0cnVjdHVyZSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RlbXBsYXRlLWdlbic7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZW5QYWNrYWdlKHBhdGg6IHN0cmluZywgY29tcE5hbWUgPSAnU2FtcGxlJywgZHJ5cnVuID0gZmFsc2UpIHtcbiAgY29tcE5hbWUgPSBjb21wTmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGNvbXBOYW1lLnNsaWNlKDEpO1xuICBjb25zdCBzQ29tcE5hbWUgPSBjb21wTmFtZS5jaGFyQXQoMCkudG9Mb3dlckNhc2UoKSArIGNvbXBOYW1lLnNsaWNlKDEpO1xuICBpZiAoIXBhdGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0xhY2sgb2YgYXJndW1lbnRzJyk7XG4gIH1cbiAgY29uc3QgZGlyID0gUGF0aC5yZXNvbHZlKHBhdGgpO1xuICBpZiAoZHJ5cnVuKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1tjcmEtc2NyaXB0cyBjbWRdIGRyeXJ1biBtb2RlJyk7XG4gIH0gZWxzZSB7XG4gICAgZnMubWtkaXJwU3luYyhkaXIpO1xuICB9XG4gIGNvbnN0IG1hID0gL15AW14vXVxcLyhbXl0qKSQvLmV4ZWMocGF0aCk7XG4gIGlmIChtYSkge1xuICAgIHBhdGggPSBtYVsxXTtcbiAgfVxuICBjb25zdCBwYWNrYWdlTmFtZSA9IFBhdGguYmFzZW5hbWUocGF0aCk7XG4gIGF3YWl0IGdlbmVyYXRlU3RydWN0dXJlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZScpLCBkaXIsXG4gICAge1xuICAgICAgZmlsZU1hcHBpbmc6IFtcbiAgICAgICAgWy9ebXlcXC1mZWF0dXJlLywgJ3NhbXBsZSddLFxuICAgICAgICBbL15NeUZlYXR1cmUvLCBzQ29tcE5hbWVdLFxuICAgICAgICBbL15NeUNvbXBvbmVudC8sIGNvbXBOYW1lICsgJ0NvbXAnXVxuICAgICAgXSxcbiAgICAgIHRleHRNYXBwaW5nOiB7XG4gICAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgICBNeUNvbXBvbmVudDogY29tcE5hbWUgKyAnQ29tcCcsXG4gICAgICAgIFNsaWNlTmFtZTogY29tcE5hbWUsXG4gICAgICAgIHNsaWNlTmFtZTogc0NvbXBOYW1lLFxuICAgICAgICBNeUNvbXBvbmVudFBhdGg6IGAke3NDb21wTmFtZX0vJHtjb21wTmFtZX1Db21wYFxuICAgICAgfVxuICAgIH0sXG4gICAge2RyeXJ1bn0pO1xuXG4gIC8vIGNvcHlUZW1wbChkaXIsIFBhdGguYmFzZW5hbWUocGF0aCksIGRyeXJ1bik7XG4gIGNvbnNvbGUubG9nKCdbY3JhLXNjcmlwdHMgY21kXVxcbicgKyBib3hTdHJpbmcoXG4gICAgYDEuIE1vZGlmeSAke1BhdGgucmVzb2x2ZShwYXRoLCAncGFja2FnZS5qc29uJyl9IHRvIGNoYW5nZSBjdXJyZW50IHBhY2thZ2UgbmFtZSBcIiR7cGFja2FnZU5hbWV9XCIsYCArXG4gICAgYCBpZiB5b3UgZG9uJ3QgbGlrZSBpdC5cXG5gICtcbiAgICBgMi4gQWRkIFwiJHtwYWNrYWdlTmFtZX1cIiBhcyBkZXBlbmRlbmN5IGluICR7cHJvY2Vzcy5jd2QoKX0vcGFja2FnZS5qc29uLlxcbmAgK1xuICAgIGAzLiBSdW4gY29tbWFuZDpcXG4gICR7Y2hhbGsuY3lhbigncGxpbmsgaW5pdCAuJyl9YCkpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2VuQ29tcG9uZW50cyhkaXI6IHN0cmluZywgY29tcE5hbWVzOiBzdHJpbmdbXSwgZHJ5cnVuID0gZmFsc2UpIHtcbiAgZGlyID0gUGF0aC5yZXNvbHZlKGRpcik7XG5cbiAgaWYgKGRyeXJ1bikge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdbY3JhLXNjcmlwdHMgY21kXSBkcnlydW4gbW9kZScpO1xuICB9IGVsc2Uge1xuICAgIGZzLm1rZGlycFN5bmMoZGlyKTtcbiAgfVxuICBmb3IgKGxldCBjb21wTmFtZSBvZiBjb21wTmFtZXMpIHtcbiAgICBjb21wTmFtZSA9IGNvbXBOYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgY29tcE5hbWUuc2xpY2UoMSk7XG4gICAgY29uc3Qgc0NvbXBOYW1lID0gY29tcE5hbWUuY2hhckF0KDApLnRvTG93ZXJDYXNlKCkgKyBjb21wTmFtZS5zbGljZSgxKTtcbiAgICBhd2FpdCBnZW5lcmF0ZVN0cnVjdHVyZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGUtY29tcCcpLCBkaXIsXG4gICAge1xuICAgICAgZmlsZU1hcHBpbmc6IFtcbiAgICAgICAgWy9ebXlcXC1mZWF0dXJlLywgJ3NhbXBsZSddLFxuICAgICAgICBbL15NeUNvbXBvbmVudC8sIGNvbXBOYW1lICsgJ0NvbXAnXVxuICAgICAgXSxcbiAgICAgIHRleHRNYXBwaW5nOiB7XG4gICAgICAgIE15Q29tcG9uZW50OiBjb21wTmFtZSArICdDb21wJyxcbiAgICAgICAgU2xpY2VOYW1lOiBjb21wTmFtZSxcbiAgICAgICAgc2xpY2VOYW1lOiBzQ29tcE5hbWVcbiAgICAgIH1cbiAgICB9LFxuICAgIHtkcnlydW59KTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2VuU2xpY2UoZGlyOiBzdHJpbmcsIHRhcmdldE5hbWVzOiBzdHJpbmdbXSwgZHJ5cnVuID0gZmFsc2UpIHtcbiAgZGlyID0gUGF0aC5yZXNvbHZlKGRpcik7XG5cbiAgaWYgKGRyeXJ1bikge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdbY3JhLXNjcmlwdHMgY21kXSBkcnlydW4gbW9kZScpO1xuICB9IGVsc2Uge1xuICAgIGZzLm1rZGlycFN5bmMoZGlyKTtcbiAgfVxuICBmb3IgKGxldCB0YXJnZXROYW1lIG9mIHRhcmdldE5hbWVzKSB7XG4gICAgdGFyZ2V0TmFtZSA9IHRhcmdldE5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB0YXJnZXROYW1lLnNsaWNlKDEpO1xuICAgIGNvbnN0IHNtYWxsVGFyZ2V0TmFtZSA9IHRhcmdldE5hbWUuY2hhckF0KDApLnRvTG93ZXJDYXNlKCkgKyB0YXJnZXROYW1lLnNsaWNlKDEpO1xuICAgIGF3YWl0IGdlbmVyYXRlU3RydWN0dXJlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZS1zbGljZScpLCBkaXIsXG4gICAge1xuICAgICAgZmlsZU1hcHBpbmc6IFtcbiAgICAgICAgWy9eTXlGZWF0dXJlLywgc21hbGxUYXJnZXROYW1lXVxuICAgICAgXSxcbiAgICAgIHRleHRNYXBwaW5nOiB7XG4gICAgICAgIFNsaWNlTmFtZTogdGFyZ2V0TmFtZSxcbiAgICAgICAgc2xpY2VOYW1lOiBzbWFsbFRhcmdldE5hbWVcbiAgICAgIH1cbiAgICB9LFxuICAgIHtkcnlydW59KTtcbiAgfVxufVxuIl19