"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable:no-console
/**
 * @deprecated
 */
const adm_zip_1 = tslib_1.__importDefault(require("adm-zip"));
const os_1 = tslib_1.__importDefault(require("os"));
const util_1 = tslib_1.__importDefault(require("util"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
const pify = require('pify');
process.on('uncaughtException', (err) => {
    // tslint:disable-next-line
    console.log(err);
    process.send && process.send({ error: err });
});
process.on('unhandledRejection', (err) => {
    // tslint:disable-next-line
    console.log(err);
    process.send && process.send({ error: err });
});
if (!process.send) {
    // tslint:disable-next-line
    process.send = console.log.bind(console);
}
const argv = process.argv;
const zipDir = argv[2];
const zipExtractDir = argv[3];
const deleteOption = argv[4];
const readFileAsync = pify(fs_1.default.readFile);
function start() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const fileNames = fs_1.default.readdirSync(zipDir);
        const proms = fileNames.filter(name => path_1.default.extname(name).toLowerCase() === '.zip')
            .map(name => {
            const file = path_1.default.resolve(zipDir, name);
            return () => tslib_1.__awaiter(this, void 0, void 0, function* () {
                console.log(`[pid:${process.pid}] start extracting ${file}`);
                process.send && process.send({ log: `[pid:${process.pid}] start extracting ${file}` });
                yield tryExtract(file);
                yield new Promise(resolve => setTimeout(resolve, 1000));
                if (deleteOption !== 'keep')
                    fs_1.default.unlinkSync(file);
                console.log('done', file);
                process.send && process.send({ done: `[pid:${process.pid}] done extracting ${file}` });
            });
        });
        if (proms.length > 0) {
            for (const prom of proms) {
                try {
                    yield prom();
                }
                catch (e) {
                    // tslint:disable-next-line
                    console.log(e);
                    process.send && process.send({ error: e });
                }
            }
        }
        else {
            process.send && process.send({ log: `[pid:${process.pid}] no downloaded file found` });
        }
    });
}
function tryExtract(file) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const data = yield readFileAsync(file);
        yield new Promise((resolve, reject) => {
            const zip = new adm_zip_1.default(data);
            zip.extractAllToAsync(zipExtractDir, true, (err) => {
                if (err) {
                    process.send && process.send({ error: util_1.default.inspect(err) });
                    if (err.code === 'ENOMEM' || err.toString().indexOf('not enough memory') >= 0) {
                        // tslint:disable-next-line
                        process.send && process.send({ log: `[pid:${process.pid}]${os_1.default.hostname()} ${os_1.default.userInfo().username} [Free mem]: ${Math.round(os_1.default.freemem() / 1048576)}M, [total mem]: ${Math.round(os_1.default.totalmem() / 1048576)}M` });
                    }
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    });
}
start();

//# sourceMappingURL=extract-zip-process.js.map
