"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unZip = exports.listZip = void 0;
const tslib_1 = require("tslib");
const yauzl_1 = tslib_1.__importDefault(require("yauzl"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const fs_1 = require("fs");
const fs_extra_1 = require("fs-extra");
const path_1 = tslib_1.__importDefault(require("path"));
async function listZip(fileName) {
    const zip = await new Promise((resolve, rej) => {
        yauzl_1.default.open(fileName, { lazyEntries: true }, (err, zip) => {
            if (err) {
                return rej(err);
            }
            resolve(zip);
        });
    });
    const list = [];
    if (zip == null) {
        throw new Error(`yauzl can not list zip file ${fileName}`);
    }
    zip.on('entry', (entry) => {
        list.push(entry.fileName);
        // eslint-disable-next-line no-console
        console.log(entry.fileName + chalk_1.default.green(` (size: ${entry.uncompressedSize >> 10} Kb)`));
        zip.readEntry();
    });
    zip.readEntry();
    return new Promise(resolve => {
        zip.on('end', () => resolve(list));
    });
}
exports.listZip = listZip;
async function unZip(fileName, toDir = process.cwd()) {
    const zip = await new Promise((resolve, rej) => {
        yauzl_1.default.open(fileName, { lazyEntries: true }, (err, zip) => {
            if (err) {
                return rej(err);
            }
            resolve(zip);
        });
    });
    if (zip == null) {
        throw new Error(`yauzl can not unzip zip file ${fileName}`);
    }
    zip.on('entry', (entry) => {
        if (entry.fileName.endsWith('/')) {
            // some zip format contains directory
            zip.readEntry();
            return;
        }
        // eslint-disable-next-line no-console
        console.log(entry.fileName + chalk_1.default.gray(` (size: ${entry.uncompressedSize >> 10} Kb)`));
        zip.openReadStream(entry, (err, readStream) => {
            if (err) {
                console.error(`yauzl is unable to extract file ${entry.fileName}`, err);
                zip.readEntry();
                return;
            }
            readStream.on('end', () => { zip.readEntry(); });
            const target = path_1.default.resolve(toDir, entry.fileName);
            // eslint-disable-next-line no-console
            console.log(`write ${target} ` + chalk_1.default.gray(` (size: ${entry.uncompressedSize >> 10} Kb)`));
            const dir = path_1.default.dirname(target);
            if (!(0, fs_1.existsSync)(dir))
                (0, fs_extra_1.mkdirpSync)(dir);
            readStream.pipe((0, fs_1.createWriteStream)(target));
        });
    });
    zip.readEntry();
    return new Promise(resolve => {
        zip.on('end', () => resolve());
    });
}
exports.unZip = unZip;
//# sourceMappingURL=cli-unzip.js.map