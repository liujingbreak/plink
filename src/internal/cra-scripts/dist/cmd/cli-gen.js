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
const __plink_1 = __importDefault(require("__plink"));
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
        yield template_gen_1.default(path_1.default.resolve(__dirname, '../../template'), dir, {
            fileMapping: [
                [/^my\-feature/, 'sample'],
                [/^MyFeature/, sCompName],
                [/^MyComponent/, compName]
            ],
            textMapping: {
                packageName,
                MyComponent: compName,
                SliceName: compName,
                sliceName: sCompName,
                MyComponentPath: `${sCompName}/${compName}`
            }
        }, { dryrun });
        // copyTempl(dir, Path.basename(path), dryrun);
        __plink_1.default.logger.info('\n' + misc_1.boxString(`1. Modify ${path_1.default.resolve(path, 'package.json')} to change current package name "${packageName}",` +
            ' if you don\'t like it.\n' +
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
            __plink_1.default.logger.info('dryrun mode');
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
                    [/^MyComponent/, compName]
                ],
                textMapping: {
                    MyComponent: compName,
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
            __plink_1.default.logger.info('dryrun mode');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWdlbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsaS1nZW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLHdEQUEwQjtBQUMxQixnREFBd0I7QUFFeEIsa0RBQTBCO0FBQzFCLHlEQUF5RDtBQUN6RCxvRkFBaUU7QUFDakUsc0RBQTRCO0FBRTVCLFNBQXNCLFVBQVUsQ0FBQyxJQUFZLEVBQUUsUUFBUSxHQUFHLFFBQVEsRUFBRSxNQUFNLEdBQUcsS0FBSzs7UUFDaEYsUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoRSxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkUsSUFBSSxDQUFDLElBQUksRUFBRTtZQUNULE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQztTQUN0QztRQUNELE1BQU0sR0FBRyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0IsSUFBSSxNQUFNLEVBQUU7WUFDVix1Q0FBdUM7WUFDdkMsaUJBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1NBQ2xDO2FBQU07WUFDTCxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNwQjtRQUNELE1BQU0sRUFBRSxHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4QyxJQUFJLEVBQUUsRUFBRTtZQUNOLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDZDtRQUNELE1BQU0sV0FBVyxHQUFHLGNBQUksQ0FB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LEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RFLE1BQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqRixNQUFNLHNCQUFpQixDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLHNCQUFzQixDQUFDLEVBQUUsR0FBRyxFQUM1RTtnQkFDRSxXQUFXLEVBQUU7b0JBQ1gsQ0FBQyxZQUFZLEVBQUUsZUFBZSxDQUFDO2lCQUNoQztnQkFDRCxXQUFXLEVBQUU7b0JBQ1gsU0FBUyxFQUFFLFVBQVU7b0JBQ3JCLFNBQVMsRUFBRSxlQUFlO2lCQUMzQjthQUNGLEVBQ0QsRUFBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDO1NBQ1g7SUFDSCxDQUFDO0NBQUE7QUF4QkQsNEJBd0JDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbm8tY29uc29sZVxuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge2JveFN0cmluZ30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9taXNjJztcbmltcG9ydCBnZW5lcmF0ZVN0cnVjdHVyZSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RlbXBsYXRlLWdlbic7XG5pbXBvcnQgcGxpbmsgZnJvbSAnX19wbGluayc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZW5QYWNrYWdlKHBhdGg6IHN0cmluZywgY29tcE5hbWUgPSAnU2FtcGxlJywgZHJ5cnVuID0gZmFsc2UpIHtcbiAgY29tcE5hbWUgPSBjb21wTmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGNvbXBOYW1lLnNsaWNlKDEpO1xuICBjb25zdCBzQ29tcE5hbWUgPSBjb21wTmFtZS5jaGFyQXQoMCkudG9Mb3dlckNhc2UoKSArIGNvbXBOYW1lLnNsaWNlKDEpO1xuICBpZiAoIXBhdGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0xhY2sgb2YgYXJndW1lbnRzJyk7XG4gIH1cbiAgY29uc3QgZGlyID0gUGF0aC5yZXNvbHZlKHBhdGgpO1xuICBpZiAoZHJ5cnVuKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgcGxpbmsubG9nZ2VyLmluZm8oJ2RyeXJ1biBtb2RlJyk7XG4gIH0gZWxzZSB7XG4gICAgZnMubWtkaXJwU3luYyhkaXIpO1xuICB9XG4gIGNvbnN0IG1hID0gL15AW14vXVxcLyhbXl0qKSQvLmV4ZWMocGF0aCk7XG4gIGlmIChtYSkge1xuICAgIHBhdGggPSBtYVsxXTtcbiAgfVxuICBjb25zdCBwYWNrYWdlTmFtZSA9IFBhdGguYmFzZW5hbWUocGF0aCk7XG4gIGF3YWl0IGdlbmVyYXRlU3RydWN0dXJlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZScpLCBkaXIsXG4gICAge1xuICAgICAgZmlsZU1hcHBpbmc6IFtcbiAgICAgICAgWy9ebXlcXC1mZWF0dXJlLywgJ3NhbXBsZSddLFxuICAgICAgICBbL15NeUZlYXR1cmUvLCBzQ29tcE5hbWVdLFxuICAgICAgICBbL15NeUNvbXBvbmVudC8sIGNvbXBOYW1lXVxuICAgICAgXSxcbiAgICAgIHRleHRNYXBwaW5nOiB7XG4gICAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgICBNeUNvbXBvbmVudDogY29tcE5hbWUsXG4gICAgICAgIFNsaWNlTmFtZTogY29tcE5hbWUsXG4gICAgICAgIHNsaWNlTmFtZTogc0NvbXBOYW1lLFxuICAgICAgICBNeUNvbXBvbmVudFBhdGg6IGAke3NDb21wTmFtZX0vJHtjb21wTmFtZX1gXG4gICAgICB9XG4gICAgfSxcbiAgICB7ZHJ5cnVufSk7XG5cbiAgLy8gY29weVRlbXBsKGRpciwgUGF0aC5iYXNlbmFtZShwYXRoKSwgZHJ5cnVuKTtcbiAgcGxpbmsubG9nZ2VyLmluZm8oJ1xcbicgKyBib3hTdHJpbmcoXG4gICAgYDEuIE1vZGlmeSAke1BhdGgucmVzb2x2ZShwYXRoLCAncGFja2FnZS5qc29uJyl9IHRvIGNoYW5nZSBjdXJyZW50IHBhY2thZ2UgbmFtZSBcIiR7cGFja2FnZU5hbWV9XCIsYCArXG4gICAgJyBpZiB5b3UgZG9uXFwndCBsaWtlIGl0LlxcbicgK1xuICAgIGAyLiBBZGQgXCIke3BhY2thZ2VOYW1lfVwiIGFzIGRlcGVuZGVuY3kgaW4gJHtwcm9jZXNzLmN3ZCgpfS9wYWNrYWdlLmpzb24uXFxuYCArXG4gICAgYDMuIFJ1biBjb21tYW5kOlxcbiAgJHtjaGFsay5jeWFuKCdwbGluayBpbml0IC4nKX1gKSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZW5Db21wb25lbnRzKGRpcjogc3RyaW5nLCBjb21wTmFtZXM6IHN0cmluZ1tdLCBkcnlydW4gPSBmYWxzZSkge1xuICBkaXIgPSBQYXRoLnJlc29sdmUoZGlyKTtcblxuICBpZiAoZHJ5cnVuKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgcGxpbmsubG9nZ2VyLmluZm8oJ2RyeXJ1biBtb2RlJyk7XG4gIH0gZWxzZSB7XG4gICAgZnMubWtkaXJwU3luYyhkaXIpO1xuICB9XG4gIGZvciAobGV0IGNvbXBOYW1lIG9mIGNvbXBOYW1lcykge1xuICAgIGNvbXBOYW1lID0gY29tcE5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBjb21wTmFtZS5zbGljZSgxKTtcbiAgICBjb25zdCBzQ29tcE5hbWUgPSBjb21wTmFtZS5jaGFyQXQoMCkudG9Mb3dlckNhc2UoKSArIGNvbXBOYW1lLnNsaWNlKDEpO1xuICAgIGF3YWl0IGdlbmVyYXRlU3RydWN0dXJlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZS1jb21wJyksIGRpcixcbiAgICB7XG4gICAgICBmaWxlTWFwcGluZzogW1xuICAgICAgICBbL15teVxcLWZlYXR1cmUvLCAnc2FtcGxlJ10sXG4gICAgICAgIFsvXk15Q29tcG9uZW50LywgY29tcE5hbWVdXG4gICAgICBdLFxuICAgICAgdGV4dE1hcHBpbmc6IHtcbiAgICAgICAgTXlDb21wb25lbnQ6IGNvbXBOYW1lLFxuICAgICAgICBTbGljZU5hbWU6IGNvbXBOYW1lLFxuICAgICAgICBzbGljZU5hbWU6IHNDb21wTmFtZVxuICAgICAgfVxuICAgIH0sXG4gICAge2RyeXJ1bn0pO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZW5TbGljZShkaXI6IHN0cmluZywgdGFyZ2V0TmFtZXM6IHN0cmluZ1tdLCBkcnlydW4gPSBmYWxzZSkge1xuICBkaXIgPSBQYXRoLnJlc29sdmUoZGlyKTtcblxuICBpZiAoZHJ5cnVuKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgcGxpbmsubG9nZ2VyLmluZm8oJ2RyeXJ1biBtb2RlJyk7XG4gIH0gZWxzZSB7XG4gICAgZnMubWtkaXJwU3luYyhkaXIpO1xuICB9XG4gIGZvciAobGV0IHRhcmdldE5hbWUgb2YgdGFyZ2V0TmFtZXMpIHtcbiAgICB0YXJnZXROYW1lID0gdGFyZ2V0TmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHRhcmdldE5hbWUuc2xpY2UoMSk7XG4gICAgY29uc3Qgc21hbGxUYXJnZXROYW1lID0gdGFyZ2V0TmFtZS5jaGFyQXQoMCkudG9Mb3dlckNhc2UoKSArIHRhcmdldE5hbWUuc2xpY2UoMSk7XG4gICAgYXdhaXQgZ2VuZXJhdGVTdHJ1Y3R1cmUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlLXNsaWNlJyksIGRpcixcbiAgICB7XG4gICAgICBmaWxlTWFwcGluZzogW1xuICAgICAgICBbL15NeUZlYXR1cmUvLCBzbWFsbFRhcmdldE5hbWVdXG4gICAgICBdLFxuICAgICAgdGV4dE1hcHBpbmc6IHtcbiAgICAgICAgU2xpY2VOYW1lOiB0YXJnZXROYW1lLFxuICAgICAgICBzbGljZU5hbWU6IHNtYWxsVGFyZ2V0TmFtZVxuICAgICAgfVxuICAgIH0sXG4gICAge2RyeXJ1bn0pO1xuICB9XG59XG4iXX0=