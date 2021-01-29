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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWdlbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsaS1nZW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLHdEQUEwQjtBQUMxQixnREFBd0I7QUFFeEIsa0RBQTBCO0FBQzFCLHlEQUF5RDtBQUN6RCxvRkFBaUU7QUFDakUsc0RBQTRCO0FBRTVCLFNBQXNCLFVBQVUsQ0FBQyxJQUFZLEVBQUUsUUFBUSxHQUFHLFFBQVEsRUFBRSxNQUFNLEdBQUcsS0FBSzs7UUFDaEYsUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoRSxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkUsSUFBSSxDQUFDLElBQUksRUFBRTtZQUNULE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQztTQUN0QztRQUNELE1BQU0sR0FBRyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0IsSUFBSSxNQUFNLEVBQUU7WUFDVix1Q0FBdUM7WUFDdkMsaUJBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1NBQ2xDO2FBQU07WUFDTCxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNwQjtRQUNELE1BQU0sRUFBRSxHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4QyxJQUFJLEVBQUUsRUFBRTtZQUNOLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDZDtRQUNELE1BQU0sV0FBVyxHQUFHLGNBQUksQ0FB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S0FBSyxJQUFJLFVBQVUsSUFBSSxXQUFXLEVBQUU7WUFDbEMsVUFBVSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0RSxNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakYsTUFBTSxzQkFBaUIsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLEdBQUcsRUFDNUU7Z0JBQ0UsV0FBVyxFQUFFO29CQUNYLENBQUMsWUFBWSxFQUFFLGVBQWUsQ0FBQztpQkFDaEM7Z0JBQ0QsV0FBVyxFQUFFO29CQUNYLFNBQVMsRUFBRSxVQUFVO29CQUNyQixTQUFTLEVBQUUsZUFBZTtpQkFDM0I7YUFDRixFQUNELEVBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQztTQUNYO0lBQ0gsQ0FBQztDQUFBO0FBeEJELDRCQXdCQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGVcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtib3hTdHJpbmd9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvbWlzYyc7XG5pbXBvcnQgZ2VuZXJhdGVTdHJ1Y3R1cmUgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC90ZW1wbGF0ZS1nZW4nO1xuaW1wb3J0IHBsaW5rIGZyb20gJ19fcGxpbmsnO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2VuUGFja2FnZShwYXRoOiBzdHJpbmcsIGNvbXBOYW1lID0gJ1NhbXBsZScsIGRyeXJ1biA9IGZhbHNlKSB7XG4gIGNvbXBOYW1lID0gY29tcE5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBjb21wTmFtZS5zbGljZSgxKTtcbiAgY29uc3Qgc0NvbXBOYW1lID0gY29tcE5hbWUuY2hhckF0KDApLnRvTG93ZXJDYXNlKCkgKyBjb21wTmFtZS5zbGljZSgxKTtcbiAgaWYgKCFwYXRoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdMYWNrIG9mIGFyZ3VtZW50cycpO1xuICB9XG4gIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShwYXRoKTtcbiAgaWYgKGRyeXJ1bikge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIHBsaW5rLmxvZ2dlci5pbmZvKCdkcnlydW4gbW9kZScpO1xuICB9IGVsc2Uge1xuICAgIGZzLm1rZGlycFN5bmMoZGlyKTtcbiAgfVxuICBjb25zdCBtYSA9IC9eQFteL11cXC8oW15dKikkLy5leGVjKHBhdGgpO1xuICBpZiAobWEpIHtcbiAgICBwYXRoID0gbWFbMV07XG4gIH1cbiAgY29uc3QgcGFja2FnZU5hbWUgPSBQYXRoLmJhc2VuYW1lKHBhdGgpO1xuICBhd2FpdCBnZW5lcmF0ZVN0cnVjdHVyZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGUnKSwgZGlyLFxuICAgIHtcbiAgICAgIGZpbGVNYXBwaW5nOiBbXG4gICAgICAgIFsvXm15XFwtZmVhdHVyZS8sICdzYW1wbGUnXSxcbiAgICAgICAgWy9eTXlGZWF0dXJlLywgc0NvbXBOYW1lXSxcbiAgICAgICAgWy9eTXlDb21wb25lbnQvLCBjb21wTmFtZSArICdDb21wJ11cbiAgICAgIF0sXG4gICAgICB0ZXh0TWFwcGluZzoge1xuICAgICAgICBwYWNrYWdlTmFtZSxcbiAgICAgICAgTXlDb21wb25lbnQ6IGNvbXBOYW1lICsgJ0NvbXAnLFxuICAgICAgICBTbGljZU5hbWU6IGNvbXBOYW1lLFxuICAgICAgICBzbGljZU5hbWU6IHNDb21wTmFtZSxcbiAgICAgICAgTXlDb21wb25lbnRQYXRoOiBgJHtzQ29tcE5hbWV9LyR7Y29tcE5hbWV9Q29tcGBcbiAgICAgIH1cbiAgICB9LFxuICAgIHtkcnlydW59KTtcblxuICAvLyBjb3B5VGVtcGwoZGlyLCBQYXRoLmJhc2VuYW1lKHBhdGgpLCBkcnlydW4pO1xuICBwbGluay5sb2dnZXIuaW5mbygnXFxuJyArIGJveFN0cmluZyhcbiAgICBgMS4gTW9kaWZ5ICR7UGF0aC5yZXNvbHZlKHBhdGgsICdwYWNrYWdlLmpzb24nKX0gdG8gY2hhbmdlIGN1cnJlbnQgcGFja2FnZSBuYW1lIFwiJHtwYWNrYWdlTmFtZX1cIixgICtcbiAgICAnIGlmIHlvdSBkb25cXCd0IGxpa2UgaXQuXFxuJyArXG4gICAgYDIuIEFkZCBcIiR7cGFja2FnZU5hbWV9XCIgYXMgZGVwZW5kZW5jeSBpbiAke3Byb2Nlc3MuY3dkKCl9L3BhY2thZ2UuanNvbi5cXG5gICtcbiAgICBgMy4gUnVuIGNvbW1hbmQ6XFxuICAke2NoYWxrLmN5YW4oJ3BsaW5rIGluaXQgLicpfWApKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlbkNvbXBvbmVudHMoZGlyOiBzdHJpbmcsIGNvbXBOYW1lczogc3RyaW5nW10sIGRyeXJ1biA9IGZhbHNlKSB7XG4gIGRpciA9IFBhdGgucmVzb2x2ZShkaXIpO1xuXG4gIGlmIChkcnlydW4pIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBwbGluay5sb2dnZXIuaW5mbygnZHJ5cnVuIG1vZGUnKTtcbiAgfSBlbHNlIHtcbiAgICBmcy5ta2RpcnBTeW5jKGRpcik7XG4gIH1cbiAgZm9yIChsZXQgY29tcE5hbWUgb2YgY29tcE5hbWVzKSB7XG4gICAgY29tcE5hbWUgPSBjb21wTmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGNvbXBOYW1lLnNsaWNlKDEpO1xuICAgIGNvbnN0IHNDb21wTmFtZSA9IGNvbXBOYW1lLmNoYXJBdCgwKS50b0xvd2VyQ2FzZSgpICsgY29tcE5hbWUuc2xpY2UoMSk7XG4gICAgYXdhaXQgZ2VuZXJhdGVTdHJ1Y3R1cmUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlLWNvbXAnKSwgZGlyLFxuICAgIHtcbiAgICAgIGZpbGVNYXBwaW5nOiBbXG4gICAgICAgIFsvXm15XFwtZmVhdHVyZS8sICdzYW1wbGUnXSxcbiAgICAgICAgWy9eTXlDb21wb25lbnQvLCBjb21wTmFtZSArICdDb21wJ11cbiAgICAgIF0sXG4gICAgICB0ZXh0TWFwcGluZzoge1xuICAgICAgICBNeUNvbXBvbmVudDogY29tcE5hbWUgKyAnQ29tcCcsXG4gICAgICAgIFNsaWNlTmFtZTogY29tcE5hbWUsXG4gICAgICAgIHNsaWNlTmFtZTogc0NvbXBOYW1lXG4gICAgICB9XG4gICAgfSxcbiAgICB7ZHJ5cnVufSk7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlblNsaWNlKGRpcjogc3RyaW5nLCB0YXJnZXROYW1lczogc3RyaW5nW10sIGRyeXJ1biA9IGZhbHNlKSB7XG4gIGRpciA9IFBhdGgucmVzb2x2ZShkaXIpO1xuXG4gIGlmIChkcnlydW4pIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBwbGluay5sb2dnZXIuaW5mbygnZHJ5cnVuIG1vZGUnKTtcbiAgfSBlbHNlIHtcbiAgICBmcy5ta2RpcnBTeW5jKGRpcik7XG4gIH1cbiAgZm9yIChsZXQgdGFyZ2V0TmFtZSBvZiB0YXJnZXROYW1lcykge1xuICAgIHRhcmdldE5hbWUgPSB0YXJnZXROYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdGFyZ2V0TmFtZS5zbGljZSgxKTtcbiAgICBjb25zdCBzbWFsbFRhcmdldE5hbWUgPSB0YXJnZXROYW1lLmNoYXJBdCgwKS50b0xvd2VyQ2FzZSgpICsgdGFyZ2V0TmFtZS5zbGljZSgxKTtcbiAgICBhd2FpdCBnZW5lcmF0ZVN0cnVjdHVyZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGUtc2xpY2UnKSwgZGlyLFxuICAgIHtcbiAgICAgIGZpbGVNYXBwaW5nOiBbXG4gICAgICAgIFsvXk15RmVhdHVyZS8sIHNtYWxsVGFyZ2V0TmFtZV1cbiAgICAgIF0sXG4gICAgICB0ZXh0TWFwcGluZzoge1xuICAgICAgICBTbGljZU5hbWU6IHRhcmdldE5hbWUsXG4gICAgICAgIHNsaWNlTmFtZTogc21hbGxUYXJnZXROYW1lXG4gICAgICB9XG4gICAgfSxcbiAgICB7ZHJ5cnVufSk7XG4gIH1cbn1cbiJdfQ==