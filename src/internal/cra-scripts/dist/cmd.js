"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.genPackage = void 0;
// tslint:disable no-console
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const lodash_1 = __importDefault(require("lodash"));
const chalk_1 = __importDefault(require("chalk"));
function genPackage(path, dryrun = false) {
    if (!path) {
        throw new Error('Lack of arguments');
    }
    if (dryrun) {
        // tslint:disable-next-line: no-console
        console.log('[cra-scripts cmd] dryrun mode');
    }
    const ma = /^@[^/]\/([^]*)$/.exec(path);
    if (ma) {
        path = ma[1];
    }
    const dir = path_1.default.resolve(path);
    fs_extra_1.default.mkdirpSync(dir);
    copyTempl(dir, path_1.default.basename(path), dryrun);
    console.log(`[cra-scripts cmd] ${chalk_1.default.redBright('You need to run')} \`drcp init\``);
}
exports.genPackage = genPackage;
function copyTempl(to, pkName, dryrun) {
    const templDir = path_1.default.resolve(__dirname, '..', 'template');
    const files = fs_extra_1.default.readdirSync(templDir);
    for (const sub of files) {
        const file = path_1.default.resolve(templDir, sub);
        if (fs_extra_1.default.statSync(file).isDirectory()) {
            if (!dryrun)
                fs_extra_1.default.mkdirpSync(path_1.default.resolve(to, sub));
            const relative = path_1.default.relative(templDir, file);
            files.push(...fs_extra_1.default.readdirSync(file).map(child => path_1.default.join(relative, child)));
            continue;
        }
        const newFile = path_1.default.resolve(to, sub.slice(0, sub.lastIndexOf('.')).replace(/-([^-/\\]+)$/, '.$1'));
        if (!fs_extra_1.default.existsSync(newFile)) {
            if (sub === 'package-json.json') {
                const pkJsonStr = fs_extra_1.default.readFileSync(path_1.default.resolve(templDir, sub), 'utf8');
                const newFile = path_1.default.resolve(to, 'package.json');
                if (!dryrun)
                    fs_extra_1.default.writeFile(newFile, lodash_1.default.template(pkJsonStr)({ name: '@bk/' + path_1.default.basename(pkName) }));
                console.log(`[cra-scripts cmd] ${chalk_1.default.green(path_1.default.relative(path_1.default.resolve(), newFile))} is created`);
                continue;
            }
            if (!dryrun)
                fs_extra_1.default.copyFile(path_1.default.resolve(templDir, sub), newFile, () => { });
            console.log(`[cra-scripts cmd] ${chalk_1.default.green(path_1.default.relative(path_1.default.resolve(), newFile))} is created`);
        }
        else {
            console.log('[cra-scripts cmd] target file already exists:', path_1.default.relative(path_1.default.resolve(), newFile));
        }
    }
}

//# sourceMappingURL=cmd.js.map
