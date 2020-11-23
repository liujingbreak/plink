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
exports.genPackage = void 0;
// tslint:disable no-console
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const misc_1 = require("@wfh/plink/wfh/dist/utils/misc");
const template_gen_1 = __importDefault(require("@wfh/plink/wfh/dist/template-gen"));
function genPackage(path, dryrun = false) {
    return __awaiter(this, void 0, void 0, function* () {
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
                [/^MyFeature/, 'Sample'],
                [/^MyComponent/, 'SampleComponent']
            ],
            textMapping: {
                packageName: path_1.default.basename(path),
                MyComponent: 'SampleComponent',
                SliceName: 'Sample',
                sliceName: 'sample',
                MyComponentPath: 'sample/SampleComponent'
            }
        }, { dryrun });
        // copyTempl(dir, Path.basename(path), dryrun);
        console.log('[cra-scripts cmd]\n' + misc_1.boxString(`Please modify ${path_1.default.resolve(path, 'package.json')} to change package name,\n` +
            `and run command:\n  ${chalk_1.default.cyan('plink init')}`));
    });
}
exports.genPackage = genPackage;
// function copyTempl(to: string, pkName: string, dryrun: boolean) {
//   const templDir = Path.resolve(__dirname, '../../template');
//   const files = fs.readdirSync(templDir);
//   for (const sub of files) {
//     const file = Path.resolve(templDir, sub);
//     if (fs.statSync(file).isDirectory()) {
//       if (!dryrun)
//         fs.mkdirpSync(Path.resolve(to, sub));
//       const relative = Path.relative(templDir, file);
//       files.push(...fs.readdirSync(file).map(child => Path.join(relative, child)));
//       continue;
//     }
//     const newFile = Path.resolve(to, sub.slice(0, sub.lastIndexOf('.')).replace(/\.([^./\\]+)$/, '.$1'));
//     if (!fs.existsSync(newFile)) {
//       if (sub === 'package.json.json') {
//         const pkJsonStr = fs.readFileSync(Path.resolve(templDir, sub), 'utf8');
//         const newFile = Path.resolve(to, 'package.json');
//         if (!dryrun)
//           fs.writeFile(newFile, _.template(pkJsonStr)({name: '@bk/' + Path.basename(pkName)}));
//         console.log(`[cra-scripts cmd] ${chalk.green(Path.relative(Path.resolve(), newFile))} is created`);
//         continue;
//       }
//       if (!dryrun)
//         fs.copyFile(Path.resolve(templDir, sub), newFile, () => {});
//       console.log(`[cra-scripts cmd] ${chalk.green(Path.relative(Path.resolve(), newFile))} is created`);
//     } else {
//       console.log('[cra-scripts cmd] target file already exists:', Path.relative(Path.resolve(), newFile));
//     }
//   }
// }

//# sourceMappingURL=cli-gen.js.map
