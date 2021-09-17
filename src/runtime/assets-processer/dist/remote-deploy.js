"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.digestInstallingFiles = exports.fetchAllZips = exports.zipDir = exports.checkZipFile = exports.main = void 0;
/* eslint-disable no-console */
const fs_extra_1 = __importDefault(require("fs-extra"));
const yazl_1 = require("yazl");
const glob_1 = __importDefault(require("glob"));
const path_1 = require("path");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const __api_1 = __importDefault(require("__api"));
const fetch_remote_imap_1 = require("./fetch-remote-imap");
const path_2 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlLWRlcGxveS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJlbW90ZS1kZXBsb3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsK0JBQStCO0FBQy9CLHdEQUEwQjtBQUMxQiwrQkFBNkI7QUFDN0IsZ0RBQXdCO0FBQ3hCLCtCQUErQjtBQUMvQiwrQkFBMEM7QUFDMUMsOENBQXdEO0FBQ3hELGtEQUF3QjtBQUN4QiwyREFBa0Q7QUFFbEQsZ0RBQXdCO0FBQ3hCLG9EQUE0QjtBQUM1Qiw4Q0FBK0M7QUFFL0MsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGdCQUFnQixDQUFDLENBQUM7QUFFNUUsU0FBZ0IsSUFBSTtJQUNoQixJQUFBLFlBQUssRUFBQyxHQUFHLEVBQUUsQ0FBQyxJQUFBLFdBQUksRUFBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQzdDLElBQUEsc0JBQVUsRUFBQyxHQUFHLENBQUMsRUFBRTtRQUNmLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDZCxPQUFPLElBQUEsWUFBSyxFQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFBLGVBQUcsRUFBQyxHQUFHLEVBQUU7WUFDL0IsTUFBTSxHQUFHLENBQUM7UUFDWixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ04sQ0FBQyxDQUFDLEVBQ0YsSUFBQSxpQkFBSyxFQUFDLENBQUMsQ0FBQyxDQUNQLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDbEIsQ0FBQztBQVZELG9CQVVDO0FBRUQsS0FBSyxVQUFVLG1CQUFtQjtJQUNoQyxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDdkMsSUFBSSxFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUMsR0FBRyxlQUFHLENBQUMsSUFBSSxDQUFDO0lBQzFCLElBQUksT0FBMkIsQ0FB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Q0FBQztRQUNsRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDMUQsd0RBQXdEO1FBQ3hELGtCQUFFLENBQUMsYUFBYSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFlBQVksR0FBRyxPQUFPLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQztLQUMvRTtBQUNILENBQUM7QUE1Q0Qsc0RBNENDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7WmlwRmlsZX0gZnJvbSAneWF6bCc7XG5pbXBvcnQgZ2xvYiBmcm9tICdnbG9iJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IGRlZmVyLCBmcm9tLCB0aW1lciB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgY2F0Y2hFcnJvciwgbWFwLCByZXRyeSB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHsgSW1hcE1hbmFnZXIgfSBmcm9tICcuL2ZldGNoLXJlbW90ZS1pbWFwJztcbmltcG9ydCB7Q2hlY2tzdW19IGZyb20gJy4vZmV0Y2gtdHlwZXMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY3J5cHRvIGZyb20gJ2NyeXB0byc7XG5pbXBvcnQge2dldFJvb3REaXJ9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QnO1xuXG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5yZW1vdGUtZGVwbG95Jyk7XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWluKCkge1xuICAgIGRlZmVyKCgpID0+IGZyb20obWFpbERlcGxveVN0YXRpY1JlcygpKSkucGlwZShcbiAgICBjYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICBsb2cud2FybihlcnIpO1xuICAgICAgcmV0dXJuIHRpbWVyKDEwMDApLnBpcGUobWFwKCgpID0+IHtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfSkpO1xuICAgIH0pLFxuICAgIHJldHJ5KDMpXG4gICAgKS5zdWJzY3JpYmUoKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gbWFpbERlcGxveVN0YXRpY1JlcygpIHtcbiAgY29uc29sZS5sb2coJ1JlbW90ZSBkZXBsb3kgKG1haWwpLi4uJyk7XG4gIGxldCB7ZW52LCBzcmN9ID0gYXBpLmFyZ3Y7XG4gIGxldCBhcHBOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGlmIChhcGkuYXJndi5hcHBOYW1lKSB7XG4gICAgYXBwTmFtZSA9IGFwaS5hcmd2LmFwcE5hbWU7XG4gIH1cblxuICBpZiAoZW52ID09IG51bGwpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdtaXNzaW5nIGNvbW1hbmQgYXJndW1lbnRzLCcsIGFwaS5hcmd2KTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGluc3RhbGxEaXIgPSByZXNvbHZlKGdldFJvb3REaXIoKSwgJ2luc3RhbGwtJyArIGVudik7XG5cbiAgaWYgKCFmcy5leGlzdHNTeW5jKGluc3RhbGxEaXIpKVxuICAgIGZzLm1rZGlycFN5bmMoaW5zdGFsbERpcik7XG4gIGNvbnN0IGltYXAgPSBuZXcgSW1hcE1hbmFnZXIoZW52LCBpbnN0YWxsRGlyKTtcblxuICBpZiAoYXBwTmFtZSkge1xuICAgIGF3YWl0IGNoZWNrWmlwRmlsZShzcmMsIGluc3RhbGxEaXIsIGFwcE5hbWUpO1xuICAgIGF3YWl0IGltYXAuZmV0Y2hVcGRhdGVDaGVja1N1bShhcHBOYW1lKTtcbiAgfSBlbHNlIHtcbiAgICBhd2FpdCBpbWFwLmZldGNoQ2hlY2tzdW0oKTtcbiAgfVxufVxuXG4vKipcbiAqIFBhY2sgZGlyZWN0b3J5IGludG8gemlwIGZpbGVcbiAqIEBwYXJhbSB6aXBGaWxlT3JEaXIgXG4gKiBAcGFyYW0gaW5zdGFsbERpciBcbiAqIEBwYXJhbSBhcHBOYW1lIFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hlY2taaXBGaWxlKHppcEZpbGVPckRpcjogc3RyaW5nLCBpbnN0YWxsRGlyOiBzdHJpbmcsIGFwcE5hbWU6IHN0cmluZywgZXhjbHVkZVBhdD86IFJlZ0V4cCB8IHN0cmluZykge1xuXG4gIHppcEZpbGVPckRpciA9IHppcEZpbGVPckRpciA/IHJlc29sdmUoemlwRmlsZU9yRGlyKSA6IHJlc29sdmUoaW5zdGFsbERpciwgYCR7YXBwTmFtZX0uemlwYCk7XG5cbiAgaWYgKCFmcy5leGlzdHNTeW5jKHppcEZpbGVPckRpcikpIHtcbiAgICBjb25zb2xlLmVycm9yKCdcXG4lcyBub3QgZXhpc3QsIHF1aXQhJywgemlwRmlsZU9yRGlyKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYCR7emlwRmlsZU9yRGlyfSBub3QgZXhpc3RgKTtcbiAgfVxuICBpZiAoZnMuc3RhdFN5bmMoemlwRmlsZU9yRGlyKS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgY29uc3QgZGVzdFppcCA9IHJlc29sdmUoaW5zdGFsbERpciwgYCR7YXBwTmFtZX0uemlwYCk7XG4gICAgYXdhaXQgemlwRGlyKHppcEZpbGVPckRpciwgZGVzdFppcCwgZXhjbHVkZVBhdCk7XG5cbiAgICBsb2cuaW5mbyhkZXN0WmlwICsgJyBpcyB6aXBwZWQ6ICcgKyBmcy5leGlzdHNTeW5jKGRlc3RaaXApKTtcbiAgICB6aXBGaWxlT3JEaXIgPSBkZXN0WmlwO1xuICB9XG4gIHJldHVybiB6aXBGaWxlT3JEaXI7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB6aXBEaXIoc3JjRGlyOiBzdHJpbmcsIGRlc3RaaXA6IHN0cmluZywgZXhjbHVkZVBhdD86IFJlZ0V4cCB8IHN0cmluZykge1xuICBmcy5ta2RpcnBTeW5jKFBhdGguZGlybmFtZShkZXN0WmlwKSk7XG4gIGxvZy5pbmZvKGAke3NyY0Rpcn0gaXMgYSBkaXJlY3RvcnksIHppcHBpbmcgaW50byAke2Rlc3RaaXB9YCk7XG5cbiAgY29uc3QgemlwRmlsZSA9IG5ldyBaaXBGaWxlKCk7XG4gIGNvbnN0IHppcERvbmUgPSBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICB6aXBGaWxlLm91dHB1dFN0cmVhbS5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKGRlc3RaaXApKVxuICAgIC5vbignY2xvc2UnLCByZXNvbHZlKTtcbiAgfSk7XG5cbiAgaWYgKGV4Y2x1ZGVQYXQgJiYgdHlwZW9mIGV4Y2x1ZGVQYXQgPT09ICdzdHJpbmcnKSB7XG4gICAgZXhjbHVkZVBhdCA9IG5ldyBSZWdFeHAoZXhjbHVkZVBhdCk7XG4gIH1cblxuICBnbG9iKHNyY0Rpci5yZXBsYWNlKC9bXFxcXC9dLywgJy8nKSArICcvKiovKicsIHtub2RpcjogdHJ1ZX0sIChlcnIsIG1hdGNoZXMpID0+IHtcbiAgICBmb3IgKGxldCBpdGVtIG9mIG1hdGNoZXMpIHtcbiAgICAgIC8vIGl0ZW0gPSBpdGVtLnJlcGxhY2UoL1svXFxcXF0vLCAnLycpO1xuICAgICAgaWYgKGV4Y2x1ZGVQYXQgPT0gbnVsbCB8fCAhKGV4Y2x1ZGVQYXQgYXMgUmVnRXhwKS50ZXN0KGl0ZW0pKSB7XG4gICAgICAgIGxvZy5pbmZvKGAtIHppcCBjb250ZW50OiAke2l0ZW19YCk7XG4gICAgICAgIHppcEZpbGUuYWRkRmlsZShpdGVtLCBQYXRoLnJlbGF0aXZlKHNyY0RpciwgaXRlbSkucmVwbGFjZSgvW1xcXFwvXS8sICcvJykpO1xuICAgICAgfVxuICAgIH1cbiAgICB6aXBGaWxlLmVuZCh7Zm9yY2VaaXA2NEZvcm1hdDogZmFsc2V9KTtcbiAgfSk7XG5cbiAgYXdhaXQgemlwRG9uZTtcbn1cblxuLyoqXG4gKiBkcmNwIHJ1biBhc3NldHMtcHJvY2Vzc2VyL3RzL3JlbW90ZS1kZXBsb3kudHMjZmV0Y2hBbGxaaXBzIC0tZW52IHRlc3QgLWMgY29uZi9yZW1vdGUtZGVwbG95LXRlc3QueWFtbFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmV0Y2hBbGxaaXBzKCkge1xuICBjb25zdCBlbnYgPSBhcGkuYXJndi5lbnY7XG4gIGlmIChlbnYgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBhcmd1bWVudHMgXCItLWVudiA8ZW52aXJvbm1lbnQ+XCInKTtcbiAgfVxuICBjb25zdCBpbnN0YWxsRGlyID0gcmVzb2x2ZShnZXRSb290RGlyKCksICdpbnN0YWxsLScgKyBlbnYpO1xuXG4gIGlmICghZnMuZXhpc3RzU3luYyhpbnN0YWxsRGlyKSlcbiAgICBmcy5ta2RpcnBTeW5jKGluc3RhbGxEaXIpO1xuICBjb25zdCBpbWFwID0gbmV3IEltYXBNYW5hZ2VyKGVudiwgaW5zdGFsbERpcik7XG4gIGF3YWl0IGltYXAuZmV0Y2hDaGVja3N1bSgpO1xuICBhd2FpdCBpbWFwLmZldGNoT3RoZXJaaXBzKCcnKTtcbn1cblxudHlwZSBDaGVja3N1bUl0ZW0gPSBDaGVja3N1bSBleHRlbmRzIEFycmF5PGluZmVyIEk+ID8gSSA6IHVua25vd247XG4vKipcbiAqIENhbGwgdGhpcyBmaWxlIHRvIGdlbmVyYXRlIGNoZWNrc3VtIGZpbGVzIGluIGJ1aWxkIHByb2Nlc3NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRpZ2VzdEluc3RhbGxpbmdGaWxlcyhyb290RGlyPzogc3RyaW5nKSB7XG4gIGlmIChyb290RGlyID09IG51bGwpIHtcbiAgICByb290RGlyID0gZ2V0Um9vdERpcigpO1xuICB9XG4gIGNvbnN0IGxpc3QgPSBmcy5yZWFkZGlyU3luYyhyb290RGlyKTtcbiAgZm9yIChjb25zdCBuYW1lIG9mIGxpc3QpIHtcbiAgICBjb25zdCBtYXRjaCA9IC9eaW5zdGFsbC0oW15dKykkLy5leGVjKG5hbWUpO1xuICAgIGlmIChtYXRjaCA9PSBudWxsIHx8ICFmcy5zdGF0U3luYyhQYXRoLnJlc29sdmUocm9vdERpciwgbmFtZSkpLmlzRGlyZWN0b3J5KCkpXG4gICAgICBjb250aW51ZTtcbiAgICBjb25zdCBlbnYgPSBtYXRjaFsxXTtcbiAgICBjb25zdCBmaWxlcyA9IGZzLnJlYWRkaXJTeW5jKFBhdGgucmVzb2x2ZShyb290RGlyLCBuYW1lKSk7XG5cbiAgICBjb25zdCBjaGVja3N1bURvbmVzOiBQcm9taXNlPENoZWNrc3VtSXRlbT5bXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgICBpZiAoIWZpbGUuZW5kc1dpdGgoJy56aXAnKSlcbiAgICAgICAgY29udGludWU7XG4gICAgICBjb25zdCBoYXNoID0gY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTI1NicpO1xuICAgICAgY29uc3QgemlwID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIG5hbWUsIGZpbGUpO1xuICAgICAgY29uc3QgaW5wdXQgPSBmcy5jcmVhdGVSZWFkU3RyZWFtKHppcCk7XG4gICAgICBjb25zdCBkb25lID0gbmV3IFByb21pc2U8Q2hlY2tzdW1JdGVtPihyZXNvbHZlID0+IHtcbiAgICAgICAgY29uc3Qgc3RyZWFtID0gaW5wdXQucGlwZShoYXNoKTtcbiAgICAgICAgc3RyZWFtLm9uKCdyZWFkYWJsZScsICgpID0+IHtcbiAgICAgICAgICBjb25zdCBidWYgPSBzdHJlYW0ucmVhZCgpIGFzIEJ1ZmZlcjtcbiAgICAgICAgICBpZiAoYnVmKSB7XG4gICAgICAgICAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgIHNoYTI1NjogYnVmLnRvU3RyaW5nKCdoZXgnKSxcbiAgICAgICAgICAgICAgZmlsZTogKG5hbWUgKyAnLycgKyBmaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgICAgICAgICAgIGNyZWF0ZWQ6IG5vdy50b0xvY2FsZVN0cmluZygpLFxuICAgICAgICAgICAgICBjcmVhdGVkVGltZTogbm93LmdldFRpbWUoKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzdHJlYW0ucmVzdW1lKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgICAgY2hlY2tzdW1Eb25lcy5wdXNoKGRvbmUpO1xuICAgIH1cblxuICAgIGNvbnN0IGNoZWNrc3VtID0gYXdhaXQgUHJvbWlzZS5hbGwoY2hlY2tzdW1Eb25lcyk7XG4gICAgY29uc3QgY2hlY2tzdW1UZXh0ID0gSlNPTi5zdHJpbmdpZnkoY2hlY2tzdW0sIG51bGwsICcgICcpO1xuICAgIC8vIGNvbnNvbGUubG9nKGBjaGVja3N1bS4ke2Vudn0uanNvbjpcXG5gLCBjaGVja3N1bVRleHQpO1xuICAgIGZzLndyaXRlRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHJvb3REaXIsIGBjaGVja3N1bS4ke2Vudn0uanNvbmApLCBjaGVja3N1bVRleHQpO1xuICB9XG59XG4iXX0=