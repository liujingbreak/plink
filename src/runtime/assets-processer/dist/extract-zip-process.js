"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* eslint-disable no-console */
/**
 * @deprecated
 */
require("source-map-support/register");
const adm_zip_1 = tslib_1.__importDefault(require("adm-zip"));
const os_1 = tslib_1.__importDefault(require("os"));
const util_1 = tslib_1.__importDefault(require("util"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
const pify = require('pify');
process.on('uncaughtException', (err) => {
    // eslint-disable-next-line
    console.log(err);
    process.send && process.send({ error: err });
});
process.on('unhandledRejection', (err) => {
    // eslint-disable-next-line
    console.log(err);
    process.send && process.send({ error: err });
});
if (!process.send) {
    // eslint-disable-next-line
    process.send = console.log.bind(console);
}
const argv = process.argv;
const zipDir = argv[2];
const zipExtractDir = argv[3];
const deleteOption = argv[4];
const readFileAsync = pify(fs_1.default.readFile);
async function start() {
    const fileNames = fs_1.default.readdirSync(zipDir);
    const proms = fileNames.filter(name => path_1.default.extname(name).toLowerCase() === '.zip')
        .map(name => {
        const file = path_1.default.resolve(zipDir, name);
        return async () => {
            console.log(`[pid:${process.pid}] start extracting ${file}`);
            process.send && process.send({ log: `[pid:${process.pid}] start extracting ${file}` });
            await tryExtract(file);
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (deleteOption !== 'keep')
                fs_1.default.unlinkSync(file);
            console.log('done', file);
            process.send && process.send({ done: `[pid:${process.pid}] done extracting ${file}` });
        };
    });
    if (proms.length > 0) {
        for (const prom of proms) {
            try {
                await prom();
            }
            catch (e) {
                // eslint-disable-next-line
                console.log(e);
                process.send && process.send({ error: e });
            }
        }
    }
    else {
        process.send && process.send({ log: `[pid:${process.pid}] no downloaded file found` });
    }
}
async function tryExtract(file) {
    const data = await readFileAsync(file);
    await new Promise((resolve, reject) => {
        const zip = new adm_zip_1.default(data);
        zip.extractAllToAsync(zipExtractDir, true, (err) => {
            if (err) {
                process.send && process.send({ error: util_1.default.inspect(err) });
                if (err.code === 'ENOMEM' || err.toString().indexOf('not enough memory') >= 0) {
                    // eslint-disable-next-line
                    process.send && process.send({ log: `[pid:${process.pid}]${os_1.default.hostname()} ${os_1.default.userInfo().username} [Free mem]: ${Math.round(os_1.default.freemem() / 1048576)}M, [total mem]: ${Math.round(os_1.default.totalmem() / 1048576)}M` });
                }
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
void start();
//# sourceMappingURL=extract-zip-process.js.map