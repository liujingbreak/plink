"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scan = void 0;
const tslib_1 = require("tslib");
// import api from '__api';
const path_1 = tslib_1.__importDefault(require("path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const util_1 = require("util");
const log = require('log4js').getLogger('tool-misc.' + path_1.default.basename(__filename));
async function scan(dir) {
    // let globExcludes: string[] = ['node_modules'];
    if (!dir)
        dir = path_1.default.resolve();
    const result = {};
    await globDirs(dir, result);
    log.info(result);
}
exports.scan = scan;
const readdir = (0, util_1.promisify)(fs_1.default.readdir);
const statAsync = (0, util_1.promisify)(fs_1.default.stat);
async function globDirs(dir, collection) {
    const baseDirName = path_1.default.basename(dir);
    if (baseDirName === 'node_modules' || baseDirName.startsWith('.'))
        return Promise.resolve(collection);
    log.info('scan', dir);
    const subDirDone = readdir(dir)
        .then(async (dirs) => {
        const subDirs = await Promise.all(dirs.map(async (baseSubDir) => {
            const subDir = path_1.default.resolve(dir, baseSubDir);
            const stat = await statAsync(subDir);
            if (stat.isFile() && subDir.endsWith('.md')) {
                let col = collection[dir];
                if (!col)
                    col = collection[dir] = [];
                col.push(baseSubDir);
            }
            return stat.isDirectory() ? subDir : null;
        }));
        return Promise.all(subDirs.filter(subDir => subDir).map(subDir => {
            return globDirs(subDir, collection);
        }));
    });
    await subDirDone;
    return collection;
}
//# sourceMappingURL=scan-markdown.js.map