"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unlinkAsync = exports.lstatAsync = exports.isWin32 = void 0;
exports.default = scanNodeModules;
exports.listModuleSymlinks = listModuleSymlinks;
exports.symlinkAsync = symlinkAsync;
exports.validateLink = validateLink;
exports.recreateSymlink = recreateSymlink;
const tslib_1 = require("tslib");
const fs = tslib_1.__importStar(require("fs"));
// import {removeSync} from 'fs-extra';
const path_1 = tslib_1.__importDefault(require("path"));
const util_1 = tslib_1.__importDefault(require("util"));
const os_1 = tslib_1.__importDefault(require("os"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const rx = tslib_1.__importStar(require("rxjs"));
const op = tslib_1.__importStar(require("rxjs/operators"));
exports.isWin32 = os_1.default.platform().indexOf('win32') >= 0;
exports.lstatAsync = util_1.default.promisify(fs.lstat);
exports.unlinkAsync = util_1.default.promisify(fs.unlink);
/**
 * Return all deleted symlinks
 * @param deleteOption
 */
async function scanNodeModules(dir = process.cwd(), deleteOption = 'invalid') {
    const deleteAll = deleteOption === 'all';
    const deletedList = [];
    await listModuleSymlinks(path_1.default.join(dir, 'node_modules'), async (link) => {
        if (await validateLink(link, deleteAll)) {
            deletedList.push(link);
        }
    });
    return deletedList;
}
function listModuleSymlinks(parentDir, onFound) {
    return rx.firstValueFrom(rx.from(fs.promises.readdir(parentDir)).pipe(op.concatMap(level1Dirs => level1Dirs), op.mergeMap(dirname => {
        const dir = path_1.default.resolve(parentDir, dirname);
        if (dirname.startsWith('@') && fs.statSync(dir).isDirectory()) {
            // it is a scope package
            return rx.from(fs.promises.readdir(dir))
                .pipe(op.mergeMap(subdirs => subdirs), op.mergeMap(file => onEachFile(path_1.default.resolve(dir, file))));
        }
        else {
            return onEachFile(dir);
        }
    })));
    // await Promise.all(level1Dirs.map(async dir => {
    //   if (dir.startsWith('@')) {
    //     // it is a scope package
    //     const subdirs = await readdirAsync(Path.resolve(parentDir, dir));
    //     await Promise.all(subdirs.map(file => onEachFile(Path.resolve(parentDir, dir, file))));
    //   } else {
    //     await onEachFile(Path.resolve(parentDir, dir));
    //   }
    // }));
    async function onEachFile(file) {
        let isSymlink = false;
        try {
            isSymlink = fs.lstatSync(file).isSymbolicLink();
            // eslint-disable-next-line no-empty
        }
        catch (e) { }
        if (isSymlink) {
            await Promise.resolve(onFound(file));
        }
    }
}
/**
 * Do check existing symlink, recreate a new one if existing one is invalid symlink
 * @param linkTarget
 * @param link
 * @return false if symlink is not created, probably due to there is existing symlink
 */
async function symlinkAsync(linkTarget, link) {
    try {
        const linkValue = (await fs.promises.lstat(link)).isSymbolicLink() ? await fs.promises.readlink(link) : null;
        const existingLink = linkValue ? lodash_1.default.trimEnd(path_1.default.resolve(path_1.default.dirname(link), linkValue), path_1.default.sep) : null;
        // console.log('existing symlink', existingLink, ' compare to', linkTarget);
        if (existingLink === path_1.default.resolve(linkTarget)) {
            // console.log('exits', link);
            return false;
        }
        // eslint-disable-next-line no-console
        console.log(`remove ${link}`);
        fs.unlinkSync(link);
    }
    catch (ex) {
        // link does not exist
        // console.log(ex);
    }
    try {
        await fs.promises.mkdir(path_1.default.dirname(link));
    }
    catch (e) { /* empty */ }
    // eslint-disable-next-line no-console
    console.log(`create symlink ${link} --> ${linkTarget}`);
    await fs.promises.symlink(path_1.default.relative(path_1.default.dirname(link), path_1.default.resolve(linkTarget)), link, exports.isWin32 ? 'junction' : 'dir');
    return true;
}
async function validateLink(link, deleteAll = false) {
    try {
        if ((await (0, exports.lstatAsync)(link)).isSymbolicLink() &&
            (deleteAll || !fs.existsSync(path_1.default.resolve(path_1.default.dirname(link), fs.readlinkSync(link))))) {
            // eslint-disable-next-line no-console
            console.log(`[symlink check] Remove ${deleteAll ? '' : 'invalid'} symlink ${path_1.default.relative('.', link)}`);
            await (0, exports.unlinkAsync)(link);
            return false;
        }
        return true;
    }
    catch (ex) {
        return false;
    }
}
/**
 * Delete symlink or file/directory if it is invalid symlink or pointing to nonexisting target
 * @param link the symlink
 * @param target
 * @returns true if needs to create a new symlink
 */
async function recreateSymlink(link, target) {
    try {
        if ((await (0, exports.lstatAsync)(link)).isSymbolicLink() &&
            !fs.existsSync(path_1.default.resolve(path_1.default.dirname(link), fs.readlinkSync(link)))) {
            await (0, exports.unlinkAsync)(link);
            return false;
        }
        return true;
    }
    catch (ex) {
        return false;
    }
}
//# sourceMappingURL=symlinks.js.map