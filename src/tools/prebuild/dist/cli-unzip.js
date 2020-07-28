"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listZip = void 0;
const tslib_1 = require("tslib");
const yauzl_1 = tslib_1.__importDefault(require("yauzl"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
function listZip(fileName) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const zip = yield new Promise((resolve, rej) => {
            yauzl_1.default.open(fileName, { lazyEntries: true }, (err, zip) => {
                if (err) {
                    return rej(err);
                }
                resolve(zip);
            });
        });
        const list = [];
        zip.on('entry', (entry) => {
            list.push(entry.fileName);
            // tslint:disable-next-line: no-console
            console.log(entry.fileName + chalk_1.default.green(` (size: ${entry.uncompressedSize >> 10} Kb)`));
            zip.readEntry();
        });
        zip.readEntry();
        return new Promise(resolve => {
            zip.on('end', () => resolve(list));
        });
    });
}
exports.listZip = listZip;

//# sourceMappingURL=cli-unzip.js.map
