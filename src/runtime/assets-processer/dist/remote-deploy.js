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
            log.info(`${zipFileOrDir} is a directory, zipping into ${destZip}`);
            const zipFile = new yazl_1.ZipFile();
            const zipDone = new Promise(resolve => {
                zipFile.outputStream.pipe(fs_extra_1.default.createWriteStream(destZip))
                    .on('close', resolve);
            });
            if (excludePat && typeof excludePat === 'string') {
                excludePat = new RegExp(excludePat);
            }
            glob_1.default(zipFileOrDir + '/**/*', { nodir: true }, (err, matches) => {
                for (let item of matches) {
                    item = item.replace(/[/\\]/, '/');
                    if (excludePat == null || !excludePat.test(item)) {
                        log.info(`- zip content: ${item}`);
                        zipFile.addFile(item, path_2.default.posix.relative(zipFileOrDir, item));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL3JlbW90ZS1kZXBsb3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkJBQTZCO0FBQzdCLGdFQUEwQjtBQUUxQiwrQkFBNkI7QUFDN0Isd0RBQXdCO0FBQ3hCLCtCQUErQjtBQUMvQiwrQkFBMEM7QUFDMUMsOENBQXdEO0FBQ3hELDBEQUF3QjtBQUN4QiwyREFBa0Q7QUFFbEQsd0RBQXdCO0FBQ3hCLDREQUE0QjtBQUM1QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQztBQUU1RSxTQUFnQixJQUFJO0lBQ2hCLFlBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUM3QyxzQkFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2YsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNkLE9BQU8sWUFBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFHLENBQUMsR0FBRyxFQUFFO1lBQy9CLE1BQU0sR0FBRyxDQUFDO1FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNOLENBQUMsQ0FBQyxFQUNGLGlCQUFLLENBQUMsQ0FBQyxDQUFDLENBQ1AsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUNsQixDQUFDO0FBVkQsb0JBVUM7QUFFRCxTQUFlLG1CQUFtQjs7UUFDaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQ3ZDLElBQUksRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLEdBQUcsZUFBRyxDQUFDLElBQUksQ0FBQztRQUMxQixJQUFJLE9BQTJCLENBQUM7UUFDaEMsSUFBSSxlQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNwQixP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c2V0cy1wcm9jZXNzZXIvZGlzdC9yZW1vdGUtZGVwbG95LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG5vLWNvbnNvbGVcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgX2d1bHAgZnJvbSAnZ3VscCc7XG5pbXBvcnQge1ppcEZpbGV9IGZyb20gJ3lhemwnO1xuaW1wb3J0IGdsb2IgZnJvbSAnZ2xvYic7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBkZWZlciwgZnJvbSwgdGltZXIgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGNhdGNoRXJyb3IsIG1hcCwgcmV0cnkgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7IEltYXBNYW5hZ2VyIH0gZnJvbSAnLi9mZXRjaC1yZW1vdGUtaW1hcCc7XG5pbXBvcnQge0NoZWNrc3VtfSBmcm9tICcuL2ZldGNoLXR5cGVzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNyeXB0byBmcm9tICdjcnlwdG8nO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcucmVtb3RlLWRlcGxveScpO1xuXG5leHBvcnQgZnVuY3Rpb24gbWFpbigpIHtcbiAgICBkZWZlcigoKSA9PiBmcm9tKG1haWxEZXBsb3lTdGF0aWNSZXMoKSkpLnBpcGUoXG4gICAgY2F0Y2hFcnJvcihlcnIgPT4ge1xuICAgICAgbG9nLndhcm4oZXJyKTtcbiAgICAgIHJldHVybiB0aW1lcigxMDAwKS5waXBlKG1hcCgoKSA9PiB7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH0pKTtcbiAgICB9KSxcbiAgICByZXRyeSgzKVxuICAgICkuc3Vic2NyaWJlKCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIG1haWxEZXBsb3lTdGF0aWNSZXMoKSB7XG4gIGNvbnNvbGUubG9nKCdSZW1vdGUgZGVwbG95IChtYWlsKS4uLicpO1xuICBsZXQge2Vudiwgc3JjfSA9IGFwaS5hcmd2O1xuICBsZXQgYXBwTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBpZiAoYXBpLmFyZ3YuYXBwTmFtZSkge1xuICAgIGFwcE5hbWUgPSBhcGkuYXJndi5hcHBOYW1lO1xuICB9XG5cbiAgaWYgKGVudiA9PSBudWxsKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ21pc3NpbmcgY29tbWFuZCBhcmd1bWVudHMsJywgYXBpLmFyZ3YpO1xuICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgaW5zdGFsbERpciA9IHJlc29sdmUoJ2luc3RhbGwtJyArIGVudik7XG5cbiAgaWYgKCFmcy5leGlzdHNTeW5jKGluc3RhbGxEaXIpKVxuICAgIGZzLm1rZGlycFN5bmMoaW5zdGFsbERpcik7XG4gIGNvbnN0IGltYXAgPSBuZXcgSW1hcE1hbmFnZXIoZW52LCBpbnN0YWxsRGlyKTtcblxuICBpZiAoYXBwTmFtZSkge1xuICAgIGF3YWl0IGNoZWNrWmlwRmlsZShzcmMsIGluc3RhbGxEaXIsIGFwcE5hbWUpO1xuICAgIGF3YWl0IGltYXAuZmV0Y2hVcGRhdGVDaGVja1N1bShhcHBOYW1lKTtcbiAgfSBlbHNlIHtcbiAgICBhd2FpdCBpbWFwLmZldGNoQ2hlY2tzdW0oKTtcbiAgfVxufVxuXG4vKipcbiAqIFBhY2sgZGlyZWN0b3J5IGludG8gemlwIGZpbGVcbiAqIEBwYXJhbSB6aXBGaWxlT3JEaXIgXG4gKiBAcGFyYW0gaW5zdGFsbERpciBcbiAqIEBwYXJhbSBhcHBOYW1lIFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hlY2taaXBGaWxlKHppcEZpbGVPckRpcjogc3RyaW5nLCBpbnN0YWxsRGlyOiBzdHJpbmcsIGFwcE5hbWU6IHN0cmluZywgZXhjbHVkZVBhdD86IFJlZ0V4cCB8IHN0cmluZykge1xuXG4gIHppcEZpbGVPckRpciA9IHppcEZpbGVPckRpciA/IHJlc29sdmUoemlwRmlsZU9yRGlyKSA6IHJlc29sdmUoaW5zdGFsbERpciwgYCR7YXBwTmFtZX0uemlwYCk7XG5cbiAgaWYgKCFmcy5leGlzdHNTeW5jKHppcEZpbGVPckRpcikpIHtcbiAgICBjb25zb2xlLmVycm9yKCdcXG4lcyBub3QgZXhpc3QsIHF1aXQhJywgemlwRmlsZU9yRGlyKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYCR7emlwRmlsZU9yRGlyfSBub3QgZXhpc3RgKTtcbiAgfVxuICBpZiAoZnMuc3RhdFN5bmMoemlwRmlsZU9yRGlyKS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgY29uc3QgZGVzdFppcCA9IHJlc29sdmUoaW5zdGFsbERpciwgYCR7YXBwTmFtZX0uemlwYCk7XG4gICAgbG9nLmluZm8oYCR7emlwRmlsZU9yRGlyfSBpcyBhIGRpcmVjdG9yeSwgemlwcGluZyBpbnRvICR7ZGVzdFppcH1gKTtcblxuICAgIGNvbnN0IHppcEZpbGUgPSBuZXcgWmlwRmlsZSgpO1xuICAgIGNvbnN0IHppcERvbmUgPSBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgIHppcEZpbGUub3V0cHV0U3RyZWFtLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0oZGVzdFppcCkpXG4gICAgICAub24oJ2Nsb3NlJywgcmVzb2x2ZSk7XG4gICAgfSk7XG5cbiAgICBpZiAoZXhjbHVkZVBhdCAmJiB0eXBlb2YgZXhjbHVkZVBhdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGV4Y2x1ZGVQYXQgPSBuZXcgUmVnRXhwKGV4Y2x1ZGVQYXQpO1xuICAgIH1cblxuICAgIGdsb2IoemlwRmlsZU9yRGlyICsgJy8qKi8qJywge25vZGlyOiB0cnVlfSwgKGVyciwgbWF0Y2hlcykgPT4ge1xuICAgICAgZm9yIChsZXQgaXRlbSBvZiBtYXRjaGVzKSB7XG4gICAgICAgIGl0ZW0gPSBpdGVtLnJlcGxhY2UoL1svXFxcXF0vLCAnLycpO1xuICAgICAgICBpZiAoZXhjbHVkZVBhdCA9PSBudWxsIHx8ICEoZXhjbHVkZVBhdCBhcyBSZWdFeHApLnRlc3QoaXRlbSkpIHtcbiAgICAgICAgICBsb2cuaW5mbyhgLSB6aXAgY29udGVudDogJHtpdGVtfWApO1xuICAgICAgICAgIHppcEZpbGUuYWRkRmlsZShpdGVtLCBQYXRoLnBvc2l4LnJlbGF0aXZlKHppcEZpbGVPckRpciwgaXRlbSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB6aXBGaWxlLmVuZCh7Zm9yY2VaaXA2NEZvcm1hdDogZmFsc2V9KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IHppcERvbmU7XG5cbiAgICBsb2cuaW5mbyhkZXN0WmlwICsgJyBpcyB6aXBwZWQ6ICcgKyBmcy5leGlzdHNTeW5jKGRlc3RaaXApKTtcbiAgICB6aXBGaWxlT3JEaXIgPSBkZXN0WmlwO1xuICB9XG4gIHJldHVybiB6aXBGaWxlT3JEaXI7XG59XG5cbi8qKlxuICogZHJjcCBydW4gYXNzZXRzLXByb2Nlc3Nlci90cy9yZW1vdGUtZGVwbG95LnRzI2ZldGNoQWxsWmlwcyAtLWVudiB0ZXN0IC1jIGNvbmYvcmVtb3RlLWRlcGxveS10ZXN0LnlhbWxcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZldGNoQWxsWmlwcygpIHtcbiAgY29uc3QgZW52ID0gYXBpLmFyZ3YuZW52O1xuICBpZiAoZW52ID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgYXJndW1lbnRzIFwiLS1lbnYgPGVudmlyb25tZW50PlwiJyk7XG4gIH1cbiAgY29uc3QgaW5zdGFsbERpciA9IHJlc29sdmUoJ2luc3RhbGwtJyArIGVudik7XG5cbiAgaWYgKCFmcy5leGlzdHNTeW5jKGluc3RhbGxEaXIpKVxuICAgIGZzLm1rZGlycFN5bmMoaW5zdGFsbERpcik7XG4gIGNvbnN0IGltYXAgPSBuZXcgSW1hcE1hbmFnZXIoZW52LCBpbnN0YWxsRGlyKTtcbiAgYXdhaXQgaW1hcC5mZXRjaENoZWNrc3VtKCk7XG4gIGF3YWl0IGltYXAuZmV0Y2hPdGhlclppcHMoJycpO1xufVxuXG50eXBlIENoZWNrc3VtSXRlbSA9IENoZWNrc3VtIGV4dGVuZHMgQXJyYXk8aW5mZXIgST4gPyBJIDogdW5rbm93bjtcbi8qKlxuICogQ2FsbCB0aGlzIGZpbGUgdG8gZ2VuZXJhdGUgY2hlY2tzdW0gZmlsZXMgaW4gYnVpbGQgcHJvY2Vzc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZGlnZXN0SW5zdGFsbGluZ0ZpbGVzKHJvb3REaXI/OiBzdHJpbmcpIHtcbiAgaWYgKHJvb3REaXIgPT0gbnVsbCkge1xuICAgIHJvb3REaXIgPSBQYXRoLnJlc29sdmUoKTtcbiAgfVxuICBjb25zdCBsaXN0ID0gZnMucmVhZGRpclN5bmMocm9vdERpcik7XG4gIGZvciAoY29uc3QgbmFtZSBvZiBsaXN0KSB7XG4gICAgY29uc3QgbWF0Y2ggPSAvXmluc3RhbGwtKFteXSspJC8uZXhlYyhuYW1lKTtcbiAgICBpZiAobWF0Y2ggPT0gbnVsbCB8fCAhZnMuc3RhdFN5bmMoUGF0aC5yZXNvbHZlKHJvb3REaXIsIG5hbWUpKS5pc0RpcmVjdG9yeSgpKVxuICAgICAgY29udGludWU7XG4gICAgY29uc3QgZW52ID0gbWF0Y2hbMV07XG4gICAgY29uc3QgZmlsZXMgPSBmcy5yZWFkZGlyU3luYyhQYXRoLnJlc29sdmUocm9vdERpciwgbmFtZSkpO1xuXG4gICAgY29uc3QgY2hlY2tzdW1Eb25lczogUHJvbWlzZTxDaGVja3N1bUl0ZW0+W10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgICAgaWYgKCFmaWxlLmVuZHNXaXRoKCcuemlwJykpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaGFzaCA9IGNyeXB0by5jcmVhdGVIYXNoKCdzaGEyNTYnKTtcbiAgICAgIGNvbnN0IHppcCA9IFBhdGgucmVzb2x2ZShyb290RGlyLCBuYW1lLCBmaWxlKTtcbiAgICAgIGNvbnN0IGlucHV0ID0gZnMuY3JlYXRlUmVhZFN0cmVhbSh6aXApO1xuICAgICAgY29uc3QgZG9uZSA9IG5ldyBQcm9taXNlPENoZWNrc3VtSXRlbT4ocmVzb2x2ZSA9PiB7XG4gICAgICAgIGNvbnN0IHN0cmVhbSA9IGlucHV0LnBpcGUoaGFzaCk7XG4gICAgICAgIHN0cmVhbS5vbigncmVhZGFibGUnLCAoKSA9PiB7XG4gICAgICAgICAgY29uc3QgYnVmID0gc3RyZWFtLnJlYWQoKSBhcyBCdWZmZXI7XG4gICAgICAgICAgaWYgKGJ1Zikge1xuICAgICAgICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICBzaGEyNTY6IGJ1Zi50b1N0cmluZygnaGV4JyksXG4gICAgICAgICAgICAgIGZpbGU6IChuYW1lICsgJy8nICsgZmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgICAgICAgICAgICBjcmVhdGVkOiBub3cudG9Mb2NhbGVTdHJpbmcoKSxcbiAgICAgICAgICAgICAgY3JlYXRlZFRpbWU6IG5vdy5nZXRUaW1lKClcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc3RyZWFtLnJlc3VtZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIGNoZWNrc3VtRG9uZXMucHVzaChkb25lKTtcbiAgICB9XG5cbiAgICBjb25zdCBjaGVja3N1bSA9IGF3YWl0IFByb21pc2UuYWxsKGNoZWNrc3VtRG9uZXMpO1xuICAgIGNvbnN0IGNoZWNrc3VtVGV4dCA9IEpTT04uc3RyaW5naWZ5KGNoZWNrc3VtLCBudWxsLCAnICAnKTtcbiAgICBjb25zb2xlLmxvZyhgY2hlY2tzdW0uJHtlbnZ9Lmpzb246XFxuYCwgY2hlY2tzdW1UZXh0KTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKFBhdGgucmVzb2x2ZShyb290RGlyLCBgY2hlY2tzdW0uJHtlbnZ9Lmpzb25gKSwgY2hlY2tzdW1UZXh0KTtcbiAgfVxufVxuIl19
