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
exports.scan = void 0;
// import api from '__api';
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const util_1 = require("util");
const log = require('log4js').getLogger('tool-misc.' + path_1.default.basename(__filename));
function scan(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        // let globExcludes: string[] = ['node_modules'];
        if (!dir)
            dir = path_1.default.resolve();
        const result = {};
        yield globDirs(dir, result);
        log.info(result);
    });
}
exports.scan = scan;
const readdir = util_1.promisify(fs_1.default.readdir);
const statAsync = util_1.promisify(fs_1.default.stat);
function globDirs(dir, collection) {
    return __awaiter(this, void 0, void 0, function* () {
        const baseDirName = path_1.default.basename(dir);
        if (baseDirName === 'node_modules' || baseDirName.startsWith('.'))
            return Promise.resolve(collection);
        log.info('scan', dir);
        const subDirDone = readdir(dir)
            .then((dirs) => __awaiter(this, void 0, void 0, function* () {
            const subDirs = yield Promise.all(dirs.map((baseSubDir) => __awaiter(this, void 0, void 0, function* () {
                const subDir = path_1.default.resolve(dir, baseSubDir);
                const stat = yield statAsync(subDir);
                if (stat.isFile() && subDir.endsWith('.md')) {
                    let col = collection[dir];
                    if (!col)
                        col = collection[dir] = [];
                    col.push(baseSubDir);
                }
                return stat.isDirectory() ? subDir : null;
            })));
            return Promise.all(subDirs.filter(subDir => subDir).map(subDir => {
                return globDirs(subDir, collection);
            }));
        }));
        yield subDirDone;
        return collection;
    });
}

//# sourceMappingURL=scan-markdown.js.map
