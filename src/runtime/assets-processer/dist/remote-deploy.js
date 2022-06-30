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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlLWRlcGxveS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJlbW90ZS1kZXBsb3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLCtCQUErQjtBQUMvQixnRUFBMEI7QUFDMUIsK0JBQTZCO0FBQzdCLHdEQUF3QjtBQUN4QiwrQkFBK0I7QUFDL0IsK0JBQTBDO0FBQzFDLDhDQUF3RDtBQUN4RCwwREFBd0I7QUFDeEIsMkRBQWtEO0FBRWxELHdEQUF3QjtBQUN4Qiw0REFBNEI7QUFDNUIsOENBQStDO0FBRS9DLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDO0FBRTVFLFNBQWdCLElBQUk7SUFDaEIsSUFBQSxZQUFLLEVBQUMsR0FBRyxFQUFFLENBQUMsSUFBQSxXQUFJLEVBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUM3QyxJQUFBLHNCQUFVLEVBQUMsR0FBRyxDQUFDLEVBQUU7UUFDZixHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsT0FBTyxJQUFBLFlBQUssRUFBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBQSxlQUFHLEVBQUMsR0FBRyxFQUFFO1lBQy9CLE1BQU0sR0FBRyxDQUFDO1FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNOLENBQUMsQ0FBQyxFQUNGLElBQUEsaUJBQUssRUFBQyxDQUFDLENBQUMsQ0FDUCxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ2xCLENBQUM7QUFWRCxvQkFVQztBQUVELEtBQUssVUFBVSxtQkFBbUI7SUFDaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQ3ZDLElBQUksRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLEdBQUcsZUFBRyxDQUFDLElBQUksQ0FBQztJQUMxQixJQUFJLE9BQTJCLENBQUM7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QUM7UUFDbEQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzFELHdEQUF3RDtRQUN4RCxrQkFBRSxDQUFDLGFBQWEsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxZQUFZLEdBQUcsT0FBTyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7S0FDL0U7QUFDSCxDQUFDO0FBNUNELHNEQTRDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQge1ppcEZpbGV9IGZyb20gJ3lhemwnO1xuaW1wb3J0IGdsb2IgZnJvbSAnZ2xvYic7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBkZWZlciwgZnJvbSwgdGltZXIgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGNhdGNoRXJyb3IsIG1hcCwgcmV0cnkgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7IEltYXBNYW5hZ2VyIH0gZnJvbSAnLi9mZXRjaC1yZW1vdGUtaW1hcCc7XG5pbXBvcnQge0NoZWNrc3VtfSBmcm9tICcuL2ZldGNoLXR5cGVzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNyeXB0byBmcm9tICdjcnlwdG8nO1xuaW1wb3J0IHtnZXRSb290RGlyfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0JztcblxuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcucmVtb3RlLWRlcGxveScpO1xuXG5leHBvcnQgZnVuY3Rpb24gbWFpbigpIHtcbiAgICBkZWZlcigoKSA9PiBmcm9tKG1haWxEZXBsb3lTdGF0aWNSZXMoKSkpLnBpcGUoXG4gICAgY2F0Y2hFcnJvcihlcnIgPT4ge1xuICAgICAgbG9nLndhcm4oZXJyKTtcbiAgICAgIHJldHVybiB0aW1lcigxMDAwKS5waXBlKG1hcCgoKSA9PiB7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH0pKTtcbiAgICB9KSxcbiAgICByZXRyeSgzKVxuICAgICkuc3Vic2NyaWJlKCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIG1haWxEZXBsb3lTdGF0aWNSZXMoKSB7XG4gIGNvbnNvbGUubG9nKCdSZW1vdGUgZGVwbG95IChtYWlsKS4uLicpO1xuICBsZXQge2Vudiwgc3JjfSA9IGFwaS5hcmd2O1xuICBsZXQgYXBwTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBpZiAoYXBpLmFyZ3YuYXBwTmFtZSkge1xuICAgIGFwcE5hbWUgPSBhcGkuYXJndi5hcHBOYW1lO1xuICB9XG5cbiAgaWYgKGVudiA9PSBudWxsKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnbWlzc2luZyBjb21tYW5kIGFyZ3VtZW50cywnLCBhcGkuYXJndik7XG4gICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBpbnN0YWxsRGlyID0gcmVzb2x2ZShnZXRSb290RGlyKCksICdpbnN0YWxsLScgKyBlbnYpO1xuXG4gIGlmICghZnMuZXhpc3RzU3luYyhpbnN0YWxsRGlyKSlcbiAgICBmcy5ta2RpcnBTeW5jKGluc3RhbGxEaXIpO1xuICBjb25zdCBpbWFwID0gbmV3IEltYXBNYW5hZ2VyKGVudiwgaW5zdGFsbERpcik7XG5cbiAgaWYgKGFwcE5hbWUpIHtcbiAgICBhd2FpdCBjaGVja1ppcEZpbGUoc3JjLCBpbnN0YWxsRGlyLCBhcHBOYW1lKTtcbiAgICBhd2FpdCBpbWFwLmZldGNoVXBkYXRlQ2hlY2tTdW0oYXBwTmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgYXdhaXQgaW1hcC5mZXRjaENoZWNrc3VtKCk7XG4gIH1cbn1cblxuLyoqXG4gKiBQYWNrIGRpcmVjdG9yeSBpbnRvIHppcCBmaWxlXG4gKiBAcGFyYW0gemlwRmlsZU9yRGlyIFxuICogQHBhcmFtIGluc3RhbGxEaXIgXG4gKiBAcGFyYW0gYXBwTmFtZSBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoZWNrWmlwRmlsZSh6aXBGaWxlT3JEaXI6IHN0cmluZywgaW5zdGFsbERpcjogc3RyaW5nLCBhcHBOYW1lOiBzdHJpbmcsIGV4Y2x1ZGVQYXQ/OiBSZWdFeHAgfCBzdHJpbmcpIHtcblxuICB6aXBGaWxlT3JEaXIgPSB6aXBGaWxlT3JEaXIgPyByZXNvbHZlKHppcEZpbGVPckRpcikgOiByZXNvbHZlKGluc3RhbGxEaXIsIGAke2FwcE5hbWV9LnppcGApO1xuXG4gIGlmICghZnMuZXhpc3RzU3luYyh6aXBGaWxlT3JEaXIpKSB7XG4gICAgY29uc29sZS5lcnJvcignXFxuJXMgbm90IGV4aXN0LCBxdWl0IScsIHppcEZpbGVPckRpcik7XG4gICAgdGhyb3cgbmV3IEVycm9yKGAke3ppcEZpbGVPckRpcn0gbm90IGV4aXN0YCk7XG4gIH1cbiAgaWYgKGZzLnN0YXRTeW5jKHppcEZpbGVPckRpcikuaXNEaXJlY3RvcnkoKSkge1xuICAgIGNvbnN0IGRlc3RaaXAgPSByZXNvbHZlKGluc3RhbGxEaXIsIGAke2FwcE5hbWV9LnppcGApO1xuICAgIGF3YWl0IHppcERpcih6aXBGaWxlT3JEaXIsIGRlc3RaaXAsIGV4Y2x1ZGVQYXQpO1xuXG4gICAgbG9nLmluZm8oZGVzdFppcCArICcgaXMgemlwcGVkOiAnICsgZnMuZXhpc3RzU3luYyhkZXN0WmlwKSk7XG4gICAgemlwRmlsZU9yRGlyID0gZGVzdFppcDtcbiAgfVxuICByZXR1cm4gemlwRmlsZU9yRGlyO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gemlwRGlyKHNyY0Rpcjogc3RyaW5nLCBkZXN0WmlwOiBzdHJpbmcsIGV4Y2x1ZGVQYXQ/OiBSZWdFeHAgfCBzdHJpbmcpIHtcbiAgZnMubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUoZGVzdFppcCkpO1xuICBsb2cuaW5mbyhgJHtzcmNEaXJ9IGlzIGEgZGlyZWN0b3J5LCB6aXBwaW5nIGludG8gJHtkZXN0WmlwfWApO1xuXG4gIGNvbnN0IHppcEZpbGUgPSBuZXcgWmlwRmlsZSgpO1xuICBjb25zdCB6aXBEb25lID0gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgemlwRmlsZS5vdXRwdXRTdHJlYW0ucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShkZXN0WmlwKSlcbiAgICAub24oJ2Nsb3NlJywgcmVzb2x2ZSk7XG4gIH0pO1xuXG4gIGlmIChleGNsdWRlUGF0ICYmIHR5cGVvZiBleGNsdWRlUGF0ID09PSAnc3RyaW5nJykge1xuICAgIGV4Y2x1ZGVQYXQgPSBuZXcgUmVnRXhwKGV4Y2x1ZGVQYXQpO1xuICB9XG5cbiAgZ2xvYihzcmNEaXIucmVwbGFjZSgvW1xcXFwvXS8sICcvJykgKyAnLyoqLyonLCB7bm9kaXI6IHRydWV9LCAoZXJyLCBtYXRjaGVzKSA9PiB7XG4gICAgZm9yIChsZXQgaXRlbSBvZiBtYXRjaGVzKSB7XG4gICAgICAvLyBpdGVtID0gaXRlbS5yZXBsYWNlKC9bL1xcXFxdLywgJy8nKTtcbiAgICAgIGlmIChleGNsdWRlUGF0ID09IG51bGwgfHwgIShleGNsdWRlUGF0IGFzIFJlZ0V4cCkudGVzdChpdGVtKSkge1xuICAgICAgICBsb2cuaW5mbyhgLSB6aXAgY29udGVudDogJHtpdGVtfWApO1xuICAgICAgICB6aXBGaWxlLmFkZEZpbGUoaXRlbSwgUGF0aC5yZWxhdGl2ZShzcmNEaXIsIGl0ZW0pLnJlcGxhY2UoL1tcXFxcL10vLCAnLycpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgemlwRmlsZS5lbmQoe2ZvcmNlWmlwNjRGb3JtYXQ6IGZhbHNlfSk7XG4gIH0pO1xuXG4gIGF3YWl0IHppcERvbmU7XG59XG5cbi8qKlxuICogZHJjcCBydW4gYXNzZXRzLXByb2Nlc3Nlci90cy9yZW1vdGUtZGVwbG95LnRzI2ZldGNoQWxsWmlwcyAtLWVudiB0ZXN0IC1jIGNvbmYvcmVtb3RlLWRlcGxveS10ZXN0LnlhbWxcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZldGNoQWxsWmlwcygpIHtcbiAgY29uc3QgZW52ID0gYXBpLmFyZ3YuZW52O1xuICBpZiAoZW52ID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgYXJndW1lbnRzIFwiLS1lbnYgPGVudmlyb25tZW50PlwiJyk7XG4gIH1cbiAgY29uc3QgaW5zdGFsbERpciA9IHJlc29sdmUoZ2V0Um9vdERpcigpLCAnaW5zdGFsbC0nICsgZW52KTtcblxuICBpZiAoIWZzLmV4aXN0c1N5bmMoaW5zdGFsbERpcikpXG4gICAgZnMubWtkaXJwU3luYyhpbnN0YWxsRGlyKTtcbiAgY29uc3QgaW1hcCA9IG5ldyBJbWFwTWFuYWdlcihlbnYsIGluc3RhbGxEaXIpO1xuICBhd2FpdCBpbWFwLmZldGNoQ2hlY2tzdW0oKTtcbiAgYXdhaXQgaW1hcC5mZXRjaE90aGVyWmlwcygnJyk7XG59XG5cbnR5cGUgQ2hlY2tzdW1JdGVtID0gQ2hlY2tzdW0gZXh0ZW5kcyBBcnJheTxpbmZlciBJPiA/IEkgOiB1bmtub3duO1xuLyoqXG4gKiBDYWxsIHRoaXMgZmlsZSB0byBnZW5lcmF0ZSBjaGVja3N1bSBmaWxlcyBpbiBidWlsZCBwcm9jZXNzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkaWdlc3RJbnN0YWxsaW5nRmlsZXMocm9vdERpcj86IHN0cmluZykge1xuICBpZiAocm9vdERpciA9PSBudWxsKSB7XG4gICAgcm9vdERpciA9IGdldFJvb3REaXIoKTtcbiAgfVxuICBjb25zdCBsaXN0ID0gZnMucmVhZGRpclN5bmMocm9vdERpcik7XG4gIGZvciAoY29uc3QgbmFtZSBvZiBsaXN0KSB7XG4gICAgY29uc3QgbWF0Y2ggPSAvXmluc3RhbGwtKFteXSspJC8uZXhlYyhuYW1lKTtcbiAgICBpZiAobWF0Y2ggPT0gbnVsbCB8fCAhZnMuc3RhdFN5bmMoUGF0aC5yZXNvbHZlKHJvb3REaXIsIG5hbWUpKS5pc0RpcmVjdG9yeSgpKVxuICAgICAgY29udGludWU7XG4gICAgY29uc3QgZW52ID0gbWF0Y2hbMV07XG4gICAgY29uc3QgZmlsZXMgPSBmcy5yZWFkZGlyU3luYyhQYXRoLnJlc29sdmUocm9vdERpciwgbmFtZSkpO1xuXG4gICAgY29uc3QgY2hlY2tzdW1Eb25lczogUHJvbWlzZTxDaGVja3N1bUl0ZW0+W10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgICAgaWYgKCFmaWxlLmVuZHNXaXRoKCcuemlwJykpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaGFzaCA9IGNyeXB0by5jcmVhdGVIYXNoKCdzaGEyNTYnKTtcbiAgICAgIGNvbnN0IHppcCA9IFBhdGgucmVzb2x2ZShyb290RGlyLCBuYW1lLCBmaWxlKTtcbiAgICAgIGNvbnN0IGlucHV0ID0gZnMuY3JlYXRlUmVhZFN0cmVhbSh6aXApO1xuICAgICAgY29uc3QgZG9uZSA9IG5ldyBQcm9taXNlPENoZWNrc3VtSXRlbT4ocmVzb2x2ZSA9PiB7XG4gICAgICAgIGNvbnN0IHN0cmVhbSA9IGlucHV0LnBpcGUoaGFzaCk7XG4gICAgICAgIHN0cmVhbS5vbigncmVhZGFibGUnLCAoKSA9PiB7XG4gICAgICAgICAgY29uc3QgYnVmID0gc3RyZWFtLnJlYWQoKSBhcyBCdWZmZXI7XG4gICAgICAgICAgaWYgKGJ1Zikge1xuICAgICAgICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICBzaGEyNTY6IGJ1Zi50b1N0cmluZygnaGV4JyksXG4gICAgICAgICAgICAgIGZpbGU6IChuYW1lICsgJy8nICsgZmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgICAgICAgICAgICBjcmVhdGVkOiBub3cudG9Mb2NhbGVTdHJpbmcoKSxcbiAgICAgICAgICAgICAgY3JlYXRlZFRpbWU6IG5vdy5nZXRUaW1lKClcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc3RyZWFtLnJlc3VtZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIGNoZWNrc3VtRG9uZXMucHVzaChkb25lKTtcbiAgICB9XG5cbiAgICBjb25zdCBjaGVja3N1bSA9IGF3YWl0IFByb21pc2UuYWxsKGNoZWNrc3VtRG9uZXMpO1xuICAgIGNvbnN0IGNoZWNrc3VtVGV4dCA9IEpTT04uc3RyaW5naWZ5KGNoZWNrc3VtLCBudWxsLCAnICAnKTtcbiAgICAvLyBjb25zb2xlLmxvZyhgY2hlY2tzdW0uJHtlbnZ9Lmpzb246XFxuYCwgY2hlY2tzdW1UZXh0KTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKFBhdGgucmVzb2x2ZShyb290RGlyLCBgY2hlY2tzdW0uJHtlbnZ9Lmpzb25gKSwgY2hlY2tzdW1UZXh0KTtcbiAgfVxufVxuIl19