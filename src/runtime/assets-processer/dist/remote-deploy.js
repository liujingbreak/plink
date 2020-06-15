"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable: no-console
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
const log = require('log4js').getLogger(__api_1.default.packageName + '.remote-deploy');
function main() {
    rxjs_1.defer(() => rxjs_1.from(mailDeployStaticRes())).pipe(operators_1.catchError(err => {
        log.warn(err);
        return rxjs_1.timer(1000).pipe(operators_1.map(() => {
            throw err;
        }));
    }), operators_1.retry(3)).subscribe();
}
exports.main = main;
function mailDeployStaticRes() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        console.log('Remote deploy (mail)...');
        let { env, src } = __api_1.default.argv;
        let appName;
        if (__api_1.default.argv.appName) {
            appName = __api_1.default.argv.appName;
        }
        if (env == null) {
            // tslint:disable-next-line: no-console
            console.log('missing command arguments,', __api_1.default.argv);
            process.exit(1);
            return;
        }
        const installDir = path_1.resolve('install-' + env);
        if (!fs_extra_1.default.existsSync(installDir))
            fs_extra_1.default.mkdirpSync(installDir);
        const imap = new fetch_remote_imap_1.ImapManager(env, installDir);
        if (appName) {
            yield checkZipFile(src, installDir, appName);
            yield imap.fetchUpdateCheckSum(appName);
        }
        else {
            yield imap.fetchChecksum();
        }
    });
}
/**
 * Pack directory into zip file
 * @param zipFileOrDir
 * @param installDir
 * @param appName
 */
function checkZipFile(zipFileOrDir, installDir, appName, excludePat) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        zipFileOrDir = zipFileOrDir ? path_1.resolve(zipFileOrDir) : path_1.resolve(installDir, `${appName}.zip`);
        if (!fs_extra_1.default.existsSync(zipFileOrDir)) {
            console.error('\n%s not exist, quit!', zipFileOrDir);
            throw new Error(`${zipFileOrDir} not exist`);
        }
        if (fs_extra_1.default.statSync(zipFileOrDir).isDirectory()) {
            const destZip = path_1.resolve(installDir, `${appName}.zip`);
            fs_extra_1.default.mkdirpSync(path_2.default.dirname(destZip));
            log.info(`${zipFileOrDir} is a directory, zipping into ${destZip}`);
            const zipFile = new yazl_1.ZipFile();
            const zipDone = new Promise(resolve => {
                zipFile.outputStream.pipe(fs_extra_1.default.createWriteStream(destZip))
                    .on('close', resolve);
            });
            if (excludePat && typeof excludePat === 'string') {
                excludePat = new RegExp(excludePat);
            }
            glob_1.default(zipFileOrDir.replace(/[\\/]/, '/') + '/**/*', { nodir: true }, (err, matches) => {
                for (let item of matches) {
                    // item = item.replace(/[/\\]/, '/');
                    if (excludePat == null || !excludePat.test(item)) {
                        log.info(`- zip content: ${item}`);
                        zipFile.addFile(item, path_2.default.relative(zipFileOrDir, item).replace(/[\\/]/, '/'));
                    }
                }
                zipFile.end({ forceZip64Format: false });
            });
            yield zipDone;
            log.info(destZip + ' is zipped: ' + fs_extra_1.default.existsSync(destZip));
            zipFileOrDir = destZip;
        }
        return zipFileOrDir;
    });
}
exports.checkZipFile = checkZipFile;
/**
 * drcp run assets-processer/ts/remote-deploy.ts#fetchAllZips --env test -c conf/remote-deploy-test.yaml
 */
function fetchAllZips() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const env = __api_1.default.argv.env;
        if (env == null) {
            throw new Error('Missing arguments "--env <environment>"');
        }
        const installDir = path_1.resolve('install-' + env);
        if (!fs_extra_1.default.existsSync(installDir))
            fs_extra_1.default.mkdirpSync(installDir);
        const imap = new fetch_remote_imap_1.ImapManager(env, installDir);
        yield imap.fetchChecksum();
        yield imap.fetchOtherZips('');
    });
}
exports.fetchAllZips = fetchAllZips;
/**
 * Call this file to generate checksum files in build process
 */
function digestInstallingFiles(rootDir) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (rootDir == null) {
            rootDir = path_2.default.resolve();
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
            const checksum = yield Promise.all(checksumDones);
            const checksumText = JSON.stringify(checksum, null, '  ');
            console.log(`checksum.${env}.json:\n`, checksumText);
            fs_extra_1.default.writeFileSync(path_2.default.resolve(rootDir, `checksum.${env}.json`), checksumText);
        }
    });
}
exports.digestInstallingFiles = digestInstallingFiles;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL3JlbW90ZS1kZXBsb3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkJBQTZCO0FBQzdCLGdFQUEwQjtBQUUxQiwrQkFBNkI7QUFDN0Isd0RBQXdCO0FBQ3hCLCtCQUErQjtBQUMvQiwrQkFBMEM7QUFDMUMsOENBQXdEO0FBQ3hELDBEQUF3QjtBQUN4QiwyREFBa0Q7QUFFbEQsd0RBQXdCO0FBQ3hCLDREQUE0QjtBQUM1QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQztBQUU1RSxTQUFnQixJQUFJO0lBQ2hCLFlBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUM3QyxzQkFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2YsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNkLE9BQU8sWUFBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFHLENBQUMsR0FBRyxFQUFFO1lBQy9CLE1BQU0sR0FBRyxDQUFDO1FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNOLENBQUMsQ0FBQyxFQUNGLGlCQUFLLENBQUMsQ0FBQyxDQUFDLENBQ1AsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUNsQixDQUFDO0FBVkQsb0JBVUM7QUFFRCxTQUFlLG1CQUFtQjs7UUFDaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQ3ZDLElBQUksRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLEdBQUcsZUFBRyxDQUFDLElBQUksQ0FBQztRQUMxQixJQUFJLE9BQTJCLENBQUM7UUFDaEMsSUFBSSxlQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNwQixP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WSxDQUFDLENBQUM7U0FDL0U7SUFDSCxDQUFDO0NBQUE7QUE1Q0Qsc0RBNENDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvcmVtb3RlLWRlcGxveS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlXG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF9ndWxwIGZyb20gJ2d1bHAnO1xuaW1wb3J0IHtaaXBGaWxlfSBmcm9tICd5YXpsJztcbmltcG9ydCBnbG9iIGZyb20gJ2dsb2InO1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZGVmZXIsIGZyb20sIHRpbWVyIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBjYXRjaEVycm9yLCBtYXAsIHJldHJ5IH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyBJbWFwTWFuYWdlciB9IGZyb20gJy4vZmV0Y2gtcmVtb3RlLWltYXAnO1xuaW1wb3J0IHtDaGVja3N1bX0gZnJvbSAnLi9mZXRjaC10eXBlcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjcnlwdG8gZnJvbSAnY3J5cHRvJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLnJlbW90ZS1kZXBsb3knKTtcblxuZXhwb3J0IGZ1bmN0aW9uIG1haW4oKSB7XG4gICAgZGVmZXIoKCkgPT4gZnJvbShtYWlsRGVwbG95U3RhdGljUmVzKCkpKS5waXBlKFxuICAgIGNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgIGxvZy53YXJuKGVycik7XG4gICAgICByZXR1cm4gdGltZXIoMTAwMCkucGlwZShtYXAoKCkgPT4ge1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9KSk7XG4gICAgfSksXG4gICAgcmV0cnkoMylcbiAgICApLnN1YnNjcmliZSgpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBtYWlsRGVwbG95U3RhdGljUmVzKCkge1xuICBjb25zb2xlLmxvZygnUmVtb3RlIGRlcGxveSAobWFpbCkuLi4nKTtcbiAgbGV0IHtlbnYsIHNyY30gPSBhcGkuYXJndjtcbiAgbGV0IGFwcE5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgaWYgKGFwaS5hcmd2LmFwcE5hbWUpIHtcbiAgICBhcHBOYW1lID0gYXBpLmFyZ3YuYXBwTmFtZTtcbiAgfVxuXG4gIGlmIChlbnYgPT0gbnVsbCkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdtaXNzaW5nIGNvbW1hbmQgYXJndW1lbnRzLCcsIGFwaS5hcmd2KTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGluc3RhbGxEaXIgPSByZXNvbHZlKCdpbnN0YWxsLScgKyBlbnYpO1xuXG4gIGlmICghZnMuZXhpc3RzU3luYyhpbnN0YWxsRGlyKSlcbiAgICBmcy5ta2RpcnBTeW5jKGluc3RhbGxEaXIpO1xuICBjb25zdCBpbWFwID0gbmV3IEltYXBNYW5hZ2VyKGVudiwgaW5zdGFsbERpcik7XG5cbiAgaWYgKGFwcE5hbWUpIHtcbiAgICBhd2FpdCBjaGVja1ppcEZpbGUoc3JjLCBpbnN0YWxsRGlyLCBhcHBOYW1lKTtcbiAgICBhd2FpdCBpbWFwLmZldGNoVXBkYXRlQ2hlY2tTdW0oYXBwTmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgYXdhaXQgaW1hcC5mZXRjaENoZWNrc3VtKCk7XG4gIH1cbn1cblxuLyoqXG4gKiBQYWNrIGRpcmVjdG9yeSBpbnRvIHppcCBmaWxlXG4gKiBAcGFyYW0gemlwRmlsZU9yRGlyIFxuICogQHBhcmFtIGluc3RhbGxEaXIgXG4gKiBAcGFyYW0gYXBwTmFtZSBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoZWNrWmlwRmlsZSh6aXBGaWxlT3JEaXI6IHN0cmluZywgaW5zdGFsbERpcjogc3RyaW5nLCBhcHBOYW1lOiBzdHJpbmcsIGV4Y2x1ZGVQYXQ/OiBSZWdFeHAgfCBzdHJpbmcpIHtcblxuICB6aXBGaWxlT3JEaXIgPSB6aXBGaWxlT3JEaXIgPyByZXNvbHZlKHppcEZpbGVPckRpcikgOiByZXNvbHZlKGluc3RhbGxEaXIsIGAke2FwcE5hbWV9LnppcGApO1xuXG4gIGlmICghZnMuZXhpc3RzU3luYyh6aXBGaWxlT3JEaXIpKSB7XG4gICAgY29uc29sZS5lcnJvcignXFxuJXMgbm90IGV4aXN0LCBxdWl0IScsIHppcEZpbGVPckRpcik7XG4gICAgdGhyb3cgbmV3IEVycm9yKGAke3ppcEZpbGVPckRpcn0gbm90IGV4aXN0YCk7XG4gIH1cbiAgaWYgKGZzLnN0YXRTeW5jKHppcEZpbGVPckRpcikuaXNEaXJlY3RvcnkoKSkge1xuICAgIGNvbnN0IGRlc3RaaXAgPSByZXNvbHZlKGluc3RhbGxEaXIsIGAke2FwcE5hbWV9LnppcGApO1xuICAgIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKGRlc3RaaXApKTtcbiAgICBsb2cuaW5mbyhgJHt6aXBGaWxlT3JEaXJ9IGlzIGEgZGlyZWN0b3J5LCB6aXBwaW5nIGludG8gJHtkZXN0WmlwfWApO1xuXG4gICAgY29uc3QgemlwRmlsZSA9IG5ldyBaaXBGaWxlKCk7XG4gICAgY29uc3QgemlwRG9uZSA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgemlwRmlsZS5vdXRwdXRTdHJlYW0ucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShkZXN0WmlwKSlcbiAgICAgIC5vbignY2xvc2UnLCByZXNvbHZlKTtcbiAgICB9KTtcblxuICAgIGlmIChleGNsdWRlUGF0ICYmIHR5cGVvZiBleGNsdWRlUGF0ID09PSAnc3RyaW5nJykge1xuICAgICAgZXhjbHVkZVBhdCA9IG5ldyBSZWdFeHAoZXhjbHVkZVBhdCk7XG4gICAgfVxuXG4gICAgZ2xvYih6aXBGaWxlT3JEaXIucmVwbGFjZSgvW1xcXFwvXS8sICcvJykgKyAnLyoqLyonLCB7bm9kaXI6IHRydWV9LCAoZXJyLCBtYXRjaGVzKSA9PiB7XG4gICAgICBmb3IgKGxldCBpdGVtIG9mIG1hdGNoZXMpIHtcbiAgICAgICAgLy8gaXRlbSA9IGl0ZW0ucmVwbGFjZSgvWy9cXFxcXS8sICcvJyk7XG4gICAgICAgIGlmIChleGNsdWRlUGF0ID09IG51bGwgfHwgIShleGNsdWRlUGF0IGFzIFJlZ0V4cCkudGVzdChpdGVtKSkge1xuICAgICAgICAgIGxvZy5pbmZvKGAtIHppcCBjb250ZW50OiAke2l0ZW19YCk7XG4gICAgICAgICAgemlwRmlsZS5hZGRGaWxlKGl0ZW0sIFBhdGgucmVsYXRpdmUoemlwRmlsZU9yRGlyLCBpdGVtKS5yZXBsYWNlKC9bXFxcXC9dLywgJy8nKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHppcEZpbGUuZW5kKHtmb3JjZVppcDY0Rm9ybWF0OiBmYWxzZX0pO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgemlwRG9uZTtcblxuICAgIGxvZy5pbmZvKGRlc3RaaXAgKyAnIGlzIHppcHBlZDogJyArIGZzLmV4aXN0c1N5bmMoZGVzdFppcCkpO1xuICAgIHppcEZpbGVPckRpciA9IGRlc3RaaXA7XG4gIH1cbiAgcmV0dXJuIHppcEZpbGVPckRpcjtcbn1cblxuLyoqXG4gKiBkcmNwIHJ1biBhc3NldHMtcHJvY2Vzc2VyL3RzL3JlbW90ZS1kZXBsb3kudHMjZmV0Y2hBbGxaaXBzIC0tZW52IHRlc3QgLWMgY29uZi9yZW1vdGUtZGVwbG95LXRlc3QueWFtbFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmV0Y2hBbGxaaXBzKCkge1xuICBjb25zdCBlbnYgPSBhcGkuYXJndi5lbnY7XG4gIGlmIChlbnYgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBhcmd1bWVudHMgXCItLWVudiA8ZW52aXJvbm1lbnQ+XCInKTtcbiAgfVxuICBjb25zdCBpbnN0YWxsRGlyID0gcmVzb2x2ZSgnaW5zdGFsbC0nICsgZW52KTtcblxuICBpZiAoIWZzLmV4aXN0c1N5bmMoaW5zdGFsbERpcikpXG4gICAgZnMubWtkaXJwU3luYyhpbnN0YWxsRGlyKTtcbiAgY29uc3QgaW1hcCA9IG5ldyBJbWFwTWFuYWdlcihlbnYsIGluc3RhbGxEaXIpO1xuICBhd2FpdCBpbWFwLmZldGNoQ2hlY2tzdW0oKTtcbiAgYXdhaXQgaW1hcC5mZXRjaE90aGVyWmlwcygnJyk7XG59XG5cbnR5cGUgQ2hlY2tzdW1JdGVtID0gQ2hlY2tzdW0gZXh0ZW5kcyBBcnJheTxpbmZlciBJPiA/IEkgOiB1bmtub3duO1xuLyoqXG4gKiBDYWxsIHRoaXMgZmlsZSB0byBnZW5lcmF0ZSBjaGVja3N1bSBmaWxlcyBpbiBidWlsZCBwcm9jZXNzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkaWdlc3RJbnN0YWxsaW5nRmlsZXMocm9vdERpcj86IHN0cmluZykge1xuICBpZiAocm9vdERpciA9PSBudWxsKSB7XG4gICAgcm9vdERpciA9IFBhdGgucmVzb2x2ZSgpO1xuICB9XG4gIGNvbnN0IGxpc3QgPSBmcy5yZWFkZGlyU3luYyhyb290RGlyKTtcbiAgZm9yIChjb25zdCBuYW1lIG9mIGxpc3QpIHtcbiAgICBjb25zdCBtYXRjaCA9IC9eaW5zdGFsbC0oW15dKykkLy5leGVjKG5hbWUpO1xuICAgIGlmIChtYXRjaCA9PSBudWxsIHx8ICFmcy5zdGF0U3luYyhQYXRoLnJlc29sdmUocm9vdERpciwgbmFtZSkpLmlzRGlyZWN0b3J5KCkpXG4gICAgICBjb250aW51ZTtcbiAgICBjb25zdCBlbnYgPSBtYXRjaFsxXTtcbiAgICBjb25zdCBmaWxlcyA9IGZzLnJlYWRkaXJTeW5jKFBhdGgucmVzb2x2ZShyb290RGlyLCBuYW1lKSk7XG5cbiAgICBjb25zdCBjaGVja3N1bURvbmVzOiBQcm9taXNlPENoZWNrc3VtSXRlbT5bXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgICBpZiAoIWZpbGUuZW5kc1dpdGgoJy56aXAnKSlcbiAgICAgICAgY29udGludWU7XG4gICAgICBjb25zdCBoYXNoID0gY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTI1NicpO1xuICAgICAgY29uc3QgemlwID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIG5hbWUsIGZpbGUpO1xuICAgICAgY29uc3QgaW5wdXQgPSBmcy5jcmVhdGVSZWFkU3RyZWFtKHppcCk7XG4gICAgICBjb25zdCBkb25lID0gbmV3IFByb21pc2U8Q2hlY2tzdW1JdGVtPihyZXNvbHZlID0+IHtcbiAgICAgICAgY29uc3Qgc3RyZWFtID0gaW5wdXQucGlwZShoYXNoKTtcbiAgICAgICAgc3RyZWFtLm9uKCdyZWFkYWJsZScsICgpID0+IHtcbiAgICAgICAgICBjb25zdCBidWYgPSBzdHJlYW0ucmVhZCgpIGFzIEJ1ZmZlcjtcbiAgICAgICAgICBpZiAoYnVmKSB7XG4gICAgICAgICAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgIHNoYTI1NjogYnVmLnRvU3RyaW5nKCdoZXgnKSxcbiAgICAgICAgICAgICAgZmlsZTogKG5hbWUgKyAnLycgKyBmaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgICAgICAgICAgIGNyZWF0ZWQ6IG5vdy50b0xvY2FsZVN0cmluZygpLFxuICAgICAgICAgICAgICBjcmVhdGVkVGltZTogbm93LmdldFRpbWUoKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzdHJlYW0ucmVzdW1lKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgICAgY2hlY2tzdW1Eb25lcy5wdXNoKGRvbmUpO1xuICAgIH1cblxuICAgIGNvbnN0IGNoZWNrc3VtID0gYXdhaXQgUHJvbWlzZS5hbGwoY2hlY2tzdW1Eb25lcyk7XG4gICAgY29uc3QgY2hlY2tzdW1UZXh0ID0gSlNPTi5zdHJpbmdpZnkoY2hlY2tzdW0sIG51bGwsICcgICcpO1xuICAgIGNvbnNvbGUubG9nKGBjaGVja3N1bS4ke2Vudn0uanNvbjpcXG5gLCBjaGVja3N1bVRleHQpO1xuICAgIGZzLndyaXRlRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHJvb3REaXIsIGBjaGVja3N1bS4ke2Vudn0uanNvbmApLCBjaGVja3N1bVRleHQpO1xuICB9XG59XG4iXX0=
