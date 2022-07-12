"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recreateSymlink = exports.validateLink = exports.symlinkAsync = exports.listModuleSymlinks = exports.unlinkAsync = exports.lstatAsync = exports.isWin32 = void 0;
const fs = __importStar(require("fs"));
// import {removeSync} from 'fs-extra';
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("util"));
const os_1 = __importDefault(require("os"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
// import {getWorkDir} from './misc';
exports.isWin32 = os_1.default.platform().indexOf('win32') >= 0;
// export const readdirAsync = util.promisify(fs.readdir);
exports.lstatAsync = util_1.default.promisify(fs.lstat);
// export const _symlinkAsync = util.promisify(fs.symlink);
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
exports.default = scanNodeModules;
function listModuleSymlinks(parentDir, onFound) {
    // const level1Dirs = await readdirAsync(parentDir);
    return rx.from(fs.promises.readdir(parentDir)).pipe(op.concatMap(level1Dirs => level1Dirs), op.mergeMap(dirname => {
        const dir = path_1.default.resolve(parentDir, dirname);
        if (dirname.startsWith('@') && fs.statSync(dir).isDirectory()) {
            // it is a scope package
            return rx.from(fs.promises.readdir(dir))
                .pipe(op.mergeMap(subdirs => subdirs), op.mergeMap(file => onEachFile(path_1.default.resolve(dir, file))));
        }
        else {
            return onEachFile(dir);
        }
    })).toPromise();
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
        }
        catch (e) { }
        if (isSymlink) {
            await Promise.resolve(onFound(file));
        }
    }
}
exports.listModuleSymlinks = listModuleSymlinks;
/**
 * Do check existing symlink, recreate a new one if existing one is invalid symlink
 * @param linkTarget
 * @param link
 */
async function symlinkAsync(linkTarget, link) {
    try {
        if (fs.lstatSync(link).isSymbolicLink() && path_1.default.resolve(path_1.default.dirname(link), fs.readlinkSync(link)) === linkTarget) {
            // console.log('exits', link);
            return;
        }
        // eslint-disable-next-line no-console
        console.log(`remove ${link}`);
        fs.unlinkSync(link);
    }
    catch (ex) {
        // link does not exist
        // console.log(ex);
    }
    // eslint-disable-next-line no-console
    console.log(`create symlink ${link} --> ${linkTarget}`);
    return fs.promises.symlink(path_1.default.relative(path_1.default.dirname(link), linkTarget), link, exports.isWin32 ? 'junction' : 'dir');
}
exports.symlinkAsync = symlinkAsync;
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
exports.validateLink = validateLink;
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
exports.recreateSymlink = recreateSymlink;
//# sourceMappingURL=symlinks.js.map