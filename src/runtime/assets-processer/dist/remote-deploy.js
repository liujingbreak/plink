"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.digestInstallingFiles = exports.fetchAllZips = exports.zipDir = exports.checkZipFile = exports.main = void 0;
const tslib_1 = require("tslib");
/* eslint-disable no-console */
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const yazl_1 = require("yazl");
const glob_1 = tslib_1.__importDefault(require("glob"));
const path_1 = require("path");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const __api_1 = tslib_1.__importDefault(require("__api"));
const fetch_remote_imap_1 = require("./fetch-remote-imap");
const path_2 = tslib_1.__importDefault(require("path"));
const crypto_1 = tslib_1.__importDefault(require("crypto"));
const dist_1 = require("@wfh/plink/wfh/dist");
const log = require('log4js').getLogger(__api_1.default.packageName + '.remote-deploy');
function main() {
    (0, rxjs_1.defer)(() => (0, rxjs_1.from)(mailDeployStaticRes())).pipe((0, operators_1.catchError)(err => {
        log.warn(err);
        return (0, rxjs_1.timer)(1000).pipe((0, operators_1.map)(() => {
            throw err;
        }));
    }), (0, operators_1.retry)(3)).subscribe();
}
exports.main = main;
async function mailDeployStaticRes() {
    console.log('Remote deploy (mail)...');
    let { env, src } = __api_1.default.argv;
    let appName;
    if (__api_1.default.argv.appName) {
        appName = __api_1.default.argv.appName;
    }
    if (env == null) {
        // eslint-disable-next-line no-console
        console.log('missing command arguments,', __api_1.default.argv);
        process.exit(1);
        return;
    }
    const installDir = (0, path_1.resolve)((0, dist_1.getRootDir)(), 'install-' + env);
    if (!fs_extra_1.default.existsSync(installDir))
        fs_extra_1.default.mkdirpSync(installDir);
    const imap = new fetch_remote_imap_1.ImapManager(env, installDir);
    if (appName) {
        await checkZipFile(src, installDir, appName);
        await imap.fetchUpdateCheckSum(appName);
    }
    else {
        await imap.fetchChecksum();
    }
}
/**
 * Pack directory into zip file
 * @param zipFileOrDir
 * @param installDir
 * @param appName
 */
async function checkZipFile(zipFileOrDir, installDir, appName, excludePat) {
    zipFileOrDir = zipFileOrDir ? (0, path_1.resolve)(zipFileOrDir) : (0, path_1.resolve)(installDir, `${appName}.zip`);
    if (!fs_extra_1.default.existsSync(zipFileOrDir)) {
        console.error('\n%s not exist, quit!', zipFileOrDir);
        throw new Error(`${zipFileOrDir} not exist`);
    }
    if (fs_extra_1.default.statSync(zipFileOrDir).isDirectory()) {
        const destZip = (0, path_1.resolve)(installDir, `${appName}.zip`);
        await zipDir(zipFileOrDir, destZip, excludePat);
        log.info(destZip + ' is zipped: ' + fs_extra_1.default.existsSync(destZip));
        zipFileOrDir = destZip;
    }
    return zipFileOrDir;
}
exports.checkZipFile = checkZipFile;
async function zipDir(srcDir, destZip, excludePat) {
    fs_extra_1.default.mkdirpSync(path_2.default.dirname(destZip));
    log.info(`${srcDir} is a directory, zipping into ${destZip}`);
    const zipFile = new yazl_1.ZipFile();
    const zipDone = new Promise(resolve => {
        zipFile.outputStream.pipe(fs_extra_1.default.createWriteStream(destZip))
            .on('close', resolve);
    });
    if (excludePat && typeof excludePat === 'string') {
        excludePat = new RegExp(excludePat);
    }
    (0, glob_1.default)(srcDir.replace(/[\\/]/, '/') + '/**/*', { nodir: true }, (err, matches) => {
        for (let item of matches) {
            // item = item.replace(/[/\\]/, '/');
            if (excludePat == null || !excludePat.test(item)) {
                log.info(`- zip content: ${item}`);
                zipFile.addFile(item, path_2.default.relative(srcDir, item).replace(/[\\/]/, '/'));
            }
        }
        zipFile.end({ forceZip64Format: false });
    });
    await zipDone;
}
exports.zipDir = zipDir;
/**
 * drcp run assets-processer/ts/remote-deploy.ts#fetchAllZips --env test -c conf/remote-deploy-test.yaml
 */
async function fetchAllZips() {
    const env = __api_1.default.argv.env;
    if (env == null) {
        throw new Error('Missing arguments "--env <environment>"');
    }
    const installDir = (0, path_1.resolve)((0, dist_1.getRootDir)(), 'install-' + env);
    if (!fs_extra_1.default.existsSync(installDir))
        fs_extra_1.default.mkdirpSync(installDir);
    const imap = new fetch_remote_imap_1.ImapManager(env, installDir);
    await imap.fetchChecksum();
    await imap.fetchOtherZips('');
}
exports.fetchAllZips = fetchAllZips;
/**
 * Call this file to generate checksum files in build process
 */
async function digestInstallingFiles(rootDir) {
    if (rootDir == null) {
        rootDir = (0, dist_1.getRootDir)();
    }
    const list = fs_extra_1.default.readdirSync(rootDir);
    for (const name of list) {
        const match = /^install-([^]+)$/.exec(name);
        if (match == null || !fs_extra_1.default.statSync(path_2.default.resolve(rootDir, name)).isDirectory())
            continue;
        const env = match[1];
        const files = fs_extra_1.default.readdirSync(path_2.default.resolve(rootDir, name));
        const checksumDones = [];
        for (const file of files) {
            if (!file.endsWith('.zip'))
                continue;
            const hash = crypto_1.default.createHash('sha256');
            const zip = path_2.default.resolve(rootDir, name, file);
            const input = fs_extra_1.default.createReadStream(zip);
            const done = new Promise(resolve => {
                const stream = input.pipe(hash);
                stream.on('readable', () => {
                    const buf = stream.read();
                    if (buf) {
                        const now = new Date();
                        resolve({
                            sha256: buf.toString('hex'),
                            file: (name + '/' + file).replace(/\\/g, '/'),
                            created: now.toLocaleString(),
                            createdTime: now.getTime()
                        });
                        stream.resume();
                    }
                });
            });
            checksumDones.push(done);
        }
        const checksum = await Promise.all(checksumDones);
        const checksumText = JSON.stringify(checksum, null, '  ');
        // console.log(`checksum.${env}.json:\n`, checksumText);
        fs_extra_1.default.writeFileSync(path_2.default.resolve(rootDir, `checksum.${env}.json`), checksumText);
    }
}
exports.digestInstallingFiles = digestInstallingFiles;
//# sourceMappingURL=remote-deploy.js.map