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

//# sourceMappingURL=../../../../../../../web-fun-house/src/internal/cra-scripts/dist/cmd/cli-gen.js.map
