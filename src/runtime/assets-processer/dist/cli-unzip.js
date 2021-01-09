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
exports.unZip = exports.listZip = void 0;
const yauzl_1 = __importDefault(require("yauzl"));
const chalk_1 = __importDefault(require("chalk"));
const fs_1 = require("fs");
const fs_extra_1 = require("fs-extra");
const path_1 = __importDefault(require("path"));
function listZip(fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        const zip = yield new Promise((resolve, rej) => {
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
function unZip(fileName, toDir = process.cwd()) {
    return __awaiter(this, void 0, void 0, function* () {
        const zip = yield new Promise((resolve, rej) => {
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
            // tslint:disable-next-line: no-console
            console.log(entry.fileName + chalk_1.default.gray(` (size: ${entry.uncompressedSize >> 10} Kb)`));
            zip.openReadStream(entry, (err, readStream) => {
                if (err) {
                    console.error(`yauzl is unable to extract file ${entry.fileName}`, err);
                    zip.readEntry();
                    return;
                }
                readStream.on('end', () => { zip.readEntry(); });
                const target = path_1.default.resolve(toDir, entry.fileName);
                // tslint:disable-next-line: no-console
                console.log(`write ${target} ` + chalk_1.default.gray(` (size: ${entry.uncompressedSize >> 10} Kb)`));
                const dir = path_1.default.dirname(target);
                if (!fs_1.existsSync(dir))
                    fs_extra_1.mkdirpSync(dir);
                readStream.pipe(fs_1.createWriteStream(target));
            });
        });
        zip.readEntry();
        return new Promise(resolve => {
            zip.on('end', () => resolve());
        });
    });
}
exports.unZip = unZip;

//# sourceMappingURL=cli-unzip.js.map
