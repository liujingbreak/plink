"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable:no-console
// import {ZipResourceMiddleware} from 'serve-static-zip';
const request_1 = tslib_1.__importDefault(require("request"));
const fs_1 = tslib_1.__importDefault(require("fs"));
// import Path from 'path';
const argv = process.argv;
const fetchUrl = argv[2];
const fileName = argv[3];
const retryTimes = parseInt(argv[4], 10);
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
function downloadZip(fetchUrl) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line
        // log.info(`${os.hostname()} ${os.userInfo().username} download zip[Free mem]: ${Math.round(os.freemem() / 1048576)}M, [total mem]: ${Math.round(os.totalmem() / 1048576)}M`);
        const resource = fetchUrl + '?' + Math.random();
        // const downloadTo = api.config.resolve('destDir', `remote-${Math.random()}-${path.split('/').pop()}`);
        // log.info('fetch', resource);
        process.send && process.send({ log: `[pid:${process.pid}] fetch ` + resource });
        yield retry(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield new Promise((resolve, rej) => {
                const writeStream = fs_1.default.createWriteStream(fileName);
                writeStream.on('finish', () => {
                    process.send && process.send({ log: 'zip file is written: ' + fileName });
                    resolve();
                });
                request_1.default({
                    uri: resource, method: 'GET', encoding: null
                })
                    .on('response', res => {
                    if (res.statusCode > 299 || res.statusCode < 200)
                        return rej(new Error(res.statusCode + ' ' + res.statusMessage));
                })
                    .on('error', err => {
                    return rej(err);
                })
                    .pipe(writeStream);
            });
            // fs.writeFileSync(Path.resolve(distDir, fileName),
            // 	buf);
            process.send && process.send({ log: `${fileName} is written.` });
            // const zip = new AdmZip(buf);
            // await tryExtract(zip);
        }));
    });
}
function retry(func, ...args) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        for (let cnt = 0;;) {
            try {
                return yield func(...args);
            }
            catch (err) {
                cnt++;
                if (cnt >= retryTimes) {
                    throw err;
                }
                console.log(err);
                process.send && process.send({ log: 'Encounter error, will retry ' + err.stack ? err.stack : err });
            }
            yield new Promise(res => setTimeout(res, cnt * 5000));
        }
    });
}
downloadZip(fetchUrl)
    .catch(err => {
    process.send && process.send({ error: err });
    process.exit(1);
});

//# sourceMappingURL=download-zip-process.js.map
