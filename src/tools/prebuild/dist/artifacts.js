"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeMockZip = exports.stringifyListAllVersions = exports.stringifyListVersions = exports.listAllVersions = exports.listVersions = void 0;
const tslib_1 = require("tslib");
const adm_zip_1 = tslib_1.__importDefault(require("adm-zip"));
const fs = tslib_1.__importStar(require("fs"));
const Path = tslib_1.__importStar(require("path"));
const _ = tslib_1.__importStar(require("lodash"));
// import boxen, {BorderStyle} from 'boxen';
const yazl_1 = require("yazl");
const moment_1 = tslib_1.__importDefault(require("moment"));
function listVersions(env) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const done = [];
        const dir = Path.resolve(`install-${env}`);
        const versions = new Map();
        for (const zipName of fs.readdirSync(dir)) {
            if (zipName.endsWith('.zip')) {
                const zip = new adm_zip_1.default(Path.join(dir, zipName));
                const app = _.trimEnd(zipName, '.zip');
                done.push(new Promise(resolve => {
                    zip.readAsTextAsync(app + '.githash-webui.txt', data => {
                        versions.set(app, data);
                        resolve();
                    });
                }));
            }
        }
        yield Promise.all(done);
        return versions;
    });
}
exports.listVersions = listVersions;
function listAllVersions() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const map = new Map();
        const done = fs.readdirSync(Path.resolve())
            .filter(dir => {
            return dir.startsWith('install-') && fs.statSync(Path.resolve(dir)).isDirectory();
        })
            .reduce((promises, dir) => {
            const env = /^install-([^]*)$/.exec(dir)[1];
            promises.push(listVersions(env).then(res => {
                map.set(env, res);
            }));
            return promises;
        }, []);
        yield Promise.all(done);
        return map;
    });
}
exports.listAllVersions = listAllVersions;
function stringifyListVersions(env) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const res = yield listVersions(env);
        let buf = '';
        for (const [app, githash] of res.entries()) {
            buf += ` ${env} - ${app}\n${githash}\n`;
            buf += '\n';
        }
        return buf;
    });
}
exports.stringifyListVersions = stringifyListVersions;
function stringifyListAllVersions() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const envMap = yield listAllVersions();
        let buf = '';
        for (const [env, appHash] of envMap.entries()) {
            for (const [app, githash] of appHash.entries()) {
                buf += `  ${env} - ${app}\n${githash}\n`;
                buf += '\n';
            }
        }
        return buf;
    });
}
exports.stringifyListAllVersions = stringifyListAllVersions;
function writeMockZip(writeTo, content) {
    const zipFile = new yazl_1.ZipFile();
    const prom = new Promise(resolve => {
        zipFile.outputStream.pipe(fs.createWriteStream(writeTo))
            .on('close', resolve);
    });
    const current = moment_1.default();
    const fileName = `fake-${current.format('YYMMDD')}-${current.format('HHmmss')}.txt`;
    zipFile.addBuffer(Buffer.from(content), fileName);
    zipFile.end({ forceZip64Format: false });
    return prom;
}
exports.writeMockZip = writeMockZip;

//# sourceMappingURL=artifacts.js.map
