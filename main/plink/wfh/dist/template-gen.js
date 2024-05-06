"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_1 = require("fs");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const log4js_1 = require("log4js");
const log = (0, log4js_1.getLogger)('plink.template-gen');
const lodashTemplateSetting = {
    interpolate: /\$__([\s\S]+?)__\$/g,
    evaluate: /\/\*<%([\s\S]+?)%>\*\//g,
    escape: /<%-([\s\S]+?)%>/g
    // evaluate: /<%([\s\S]+?)%>/g,
    // interpolate: /<%=([\s\S]+?)%>/g,
    // variable: '',
    // imports: {_: lodash}
};
/**
 * The template file name and directory name is replaced by regular expression,
 * file name suffix is removed, therefor you should use a double suffix as a template
 * file name (like 'hellow.ts.txt' will become 'hellow.ts').
 *
 * lodash template setting:
 * - interpolate: /\$__([\s\S]+?)__\$/g,
 * - evaluate: /\/\*<%([\s\S]+?)%>\*\//g,
 *
 * The template file content is replace by lodash template function
 * @param templDir
 * @param targetDir
 * @param replacement
 * @param opt
 */
function generateStructure(templDir, targetDir, replacement, opt = { dryrun: false }) {
    if (replacement.includeTextType == null) {
        replacement.includeTextType = /(?:[tj]sx?|s?css|json|yaml|yml|html|svg)$/;
    }
    if (!opt.dryrun)
        fs_extra_1.default.mkdirpSync(targetDir);
    return _recurseDir(templDir, targetDir, replacement, opt).toPromise();
}
exports.default = generateStructure;
function _recurseDir(templDir, targetDir, replacement, opt = { dryrun: false }, targetIsEmpty = false) {
    const dryrun = !!opt.dryrun;
    return (0, rxjs_1.from)(fs_1.promises.readdir(templDir)).pipe((0, operators_1.mergeMap)(files => (0, rxjs_1.from)(files)), (0, operators_1.mergeMap)(sub => {
        const absSub = path_1.default.resolve(templDir, sub);
        return (0, rxjs_1.from)(fs_1.promises.stat(absSub)).pipe((0, operators_1.mergeMap)(state => {
            if (state.isDirectory()) {
                let newDir = sub;
                for (const [reg, repl] of replacement.fileMapping || []) {
                    newDir = newDir.replace(reg, repl);
                }
                newDir = path_1.default.resolve(targetDir, newDir);
                // console.log(newDir, absSub);
                const done$ = dryrun ? (0, rxjs_1.of)(undefined) :
                    (0, rxjs_1.from)(fs_extra_1.default.mkdirp(path_1.default.resolve(targetDir, newDir)));
                return done$.pipe((0, operators_1.mergeMap)(() => _recurseDir(absSub, newDir, replacement, opt, true)));
            }
            else {
                let newFile = sub;
                for (const [reg, repl] of replacement.fileMapping || []) {
                    newFile = newFile.replace(reg, repl);
                }
                newFile = path_1.default.resolve(targetDir, opt.keepFileSuffix ? newFile : newFile.replace(/\.([^./\\]+)$/, ''));
                return (async () => {
                    if (targetIsEmpty || !(0, fs_1.existsSync)(newFile)) {
                        if (!dryrun) {
                            if (!replacement.includeTextType.test(newFile)) {
                                await fs_1.promises.copyFile(absSub, newFile);
                                // eslint-disable-next-line no-console
                                log.info(`${chalk_1.default.cyan(path_1.default.relative(path_1.default.resolve(), newFile))} is copied`);
                            }
                            else {
                                let content = await fs_1.promises.readFile(absSub, 'utf-8');
                                try {
                                    content = lodash_1.default.template(content, lodashTemplateSetting)(replacement.textMapping);
                                }
                                catch (e) {
                                    console.error(`In file ${absSub}`);
                                    console.error(e);
                                }
                                await fs_1.promises.writeFile(newFile, content);
                                // eslint-disable-next-line no-console
                                log.info(`${chalk_1.default.cyan(path_1.default.relative(path_1.default.resolve(), newFile))} is written`);
                            }
                        }
                        else {
                            // eslint-disable-next-line no-console
                            log.info(`${chalk_1.default.cyan(path_1.default.relative(path_1.default.resolve(), newFile))} is created`);
                        }
                    }
                    else {
                        // eslint-disable-next-line no-console
                        log.info('target file already exists:', path_1.default.relative(path_1.default.resolve(), newFile));
                    }
                })();
            }
        }));
    }));
}
//# sourceMappingURL=template-gen.js.map