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
exports.digestInstallingFiles = exports.fetchAllZips = exports.zipDir = exports.checkZipFile = exports.main = void 0;
// tslint:disable: no-console
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
    rxjs_1.defer(() => rxjs_1.from(mailDeployStaticRes())).pipe(operators_1.catchError(err => {
        log.warn(err);
        return rxjs_1.timer(1000).pipe(operators_1.map(() => {
            throw err;
        }));
    }), operators_1.retry(3)).subscribe();
}
exports.main = main;
function mailDeployStaticRes() {
    return __awaiter(this, void 0, void 0, function* () {
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
        const installDir = path_1.resolve(dist_1.getRootDir(), 'install-' + env);
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
    return __awaiter(this, void 0, void 0, function* () {
        zipFileOrDir = zipFileOrDir ? path_1.resolve(zipFileOrDir) : path_1.resolve(installDir, `${appName}.zip`);
        if (!fs_extra_1.default.existsSync(zipFileOrDir)) {
            console.error('\n%s not exist, quit!', zipFileOrDir);
            throw new Error(`${zipFileOrDir} not exist`);
        }
        if (fs_extra_1.default.statSync(zipFileOrDir).isDirectory()) {
            const destZip = path_1.resolve(installDir, `${appName}.zip`);
            yield zipDir(zipFileOrDir, destZip, excludePat);
            log.info(destZip + ' is zipped: ' + fs_extra_1.default.existsSync(destZip));
            zipFileOrDir = destZip;
        }
        return zipFileOrDir;
    });
}
exports.checkZipFile = checkZipFile;
function zipDir(srcDir, destZip, excludePat) {
    return __awaiter(this, void 0, void 0, function* () {
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
        glob_1.default(srcDir.replace(/[\\/]/, '/') + '/**/*', { nodir: true }, (err, matches) => {
            for (let item of matches) {
                // item = item.replace(/[/\\]/, '/');
                if (excludePat == null || !excludePat.test(item)) {
                    log.info(`- zip content: ${item}`);
                    zipFile.addFile(item, path_2.default.relative(srcDir, item).replace(/[\\/]/, '/'));
                }
            }
            zipFile.end({ forceZip64Format: false });
        });
        yield zipDone;
    });
}
exports.zipDir = zipDir;
/**
 * drcp run assets-processer/ts/remote-deploy.ts#fetchAllZips --env test -c conf/remote-deploy-test.yaml
 */
function fetchAllZips() {
    return __awaiter(this, void 0, void 0, function* () {
        const env = __api_1.default.argv.env;
        if (env == null) {
            throw new Error('Missing arguments "--env <environment>"');
        }
        const installDir = path_1.resolve(dist_1.getRootDir(), 'install-' + env);
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
    return __awaiter(this, void 0, void 0, function* () {
        if (rootDir == null) {
            rootDir = dist_1.getRootDir();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlLWRlcGxveS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJlbW90ZS1kZXBsb3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLHdEQUEwQjtBQUUxQiwrQkFBNkI7QUFDN0IsZ0RBQXdCO0FBQ3hCLCtCQUErQjtBQUMvQiwrQkFBMEM7QUFDMUMsOENBQXdEO0FBQ3hELGtEQUF3QjtBQUN4QiwyREFBa0Q7QUFFbEQsZ0RBQXdCO0FBQ3hCLG9EQUE0QjtBQUM1Qiw4Q0FBK0M7QUFFL0MsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGdCQUFnQixDQUFDLENBQUM7QUFFNUUsU0FBZ0IsSUFBSTtJQUNoQixZQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsV0FBSSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDN0Msc0JBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNmLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDZCxPQUFPLFlBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBRyxDQUFDLEdBQUcsRUFBRTtZQUMvQixNQUFNLEdBQUcsQ0FBQztRQUNaLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTixDQUFDLENBQUMsRUFDRixpQkFBSyxDQUFDLENBQUMsQ0FBQyxDQUNQLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDbEIsQ0FBQztBQVZELG9CQVVDO0FBRUQsU0FBZSxtQkFBbUI7O1FBQ2hDLE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUN2QyxJQUFJLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBQyxHQUFHLGVBQUcsQ0FBQyxJQUFJLENBQUM7UUFDMUIsSUFBSSxPQUEyQixDQUFDO1FBQ2hDLElBQUksZUFBRyxDQUFDLElB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LEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzFELE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxHQUFHLFVBQVUsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUNyRCxrQkFBRSxDQUFDLGFBQWEsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxZQUFZLEdBQUcsT0FBTyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7U0FDL0U7SUFDSCxDQUFDO0NBQUE7QUE1Q0Qsc0RBNENDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG5vLWNvbnNvbGVcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgX2d1bHAgZnJvbSAnZ3VscCc7XG5pbXBvcnQge1ppcEZpbGV9IGZyb20gJ3lhemwnO1xuaW1wb3J0IGdsb2IgZnJvbSAnZ2xvYic7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBkZWZlciwgZnJvbSwgdGltZXIgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGNhdGNoRXJyb3IsIG1hcCwgcmV0cnkgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7IEltYXBNYW5hZ2VyIH0gZnJvbSAnLi9mZXRjaC1yZW1vdGUtaW1hcCc7XG5pbXBvcnQge0NoZWNrc3VtfSBmcm9tICcuL2ZldGNoLXR5cGVzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNyeXB0byBmcm9tICdjcnlwdG8nO1xuaW1wb3J0IHtnZXRSb290RGlyfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0JztcblxuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcucmVtb3RlLWRlcGxveScpO1xuXG5leHBvcnQgZnVuY3Rpb24gbWFpbigpIHtcbiAgICBkZWZlcigoKSA9PiBmcm9tKG1haWxEZXBsb3lTdGF0aWNSZXMoKSkpLnBpcGUoXG4gICAgY2F0Y2hFcnJvcihlcnIgPT4ge1xuICAgICAgbG9nLndhcm4oZXJyKTtcbiAgICAgIHJldHVybiB0aW1lcigxMDAwKS5waXBlKG1hcCgoKSA9PiB7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH0pKTtcbiAgICB9KSxcbiAgICByZXRyeSgzKVxuICAgICkuc3Vic2NyaWJlKCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIG1haWxEZXBsb3lTdGF0aWNSZXMoKSB7XG4gIGNvbnNvbGUubG9nKCdSZW1vdGUgZGVwbG95IChtYWlsKS4uLicpO1xuICBsZXQge2Vudiwgc3JjfSA9IGFwaS5hcmd2O1xuICBsZXQgYXBwTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBpZiAoYXBpLmFyZ3YuYXBwTmFtZSkge1xuICAgIGFwcE5hbWUgPSBhcGkuYXJndi5hcHBOYW1lO1xuICB9XG5cbiAgaWYgKGVudiA9PSBudWxsKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ21pc3NpbmcgY29tbWFuZCBhcmd1bWVudHMsJywgYXBpLmFyZ3YpO1xuICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgaW5zdGFsbERpciA9IHJlc29sdmUoZ2V0Um9vdERpcigpLCAnaW5zdGFsbC0nICsgZW52KTtcblxuICBpZiAoIWZzLmV4aXN0c1N5bmMoaW5zdGFsbERpcikpXG4gICAgZnMubWtkaXJwU3luYyhpbnN0YWxsRGlyKTtcbiAgY29uc3QgaW1hcCA9IG5ldyBJbWFwTWFuYWdlcihlbnYsIGluc3RhbGxEaXIpO1xuXG4gIGlmIChhcHBOYW1lKSB7XG4gICAgYXdhaXQgY2hlY2taaXBGaWxlKHNyYywgaW5zdGFsbERpciwgYXBwTmFtZSk7XG4gICAgYXdhaXQgaW1hcC5mZXRjaFVwZGF0ZUNoZWNrU3VtKGFwcE5hbWUpO1xuICB9IGVsc2Uge1xuICAgIGF3YWl0IGltYXAuZmV0Y2hDaGVja3N1bSgpO1xuICB9XG59XG5cbi8qKlxuICogUGFjayBkaXJlY3RvcnkgaW50byB6aXAgZmlsZVxuICogQHBhcmFtIHppcEZpbGVPckRpciBcbiAqIEBwYXJhbSBpbnN0YWxsRGlyIFxuICogQHBhcmFtIGFwcE5hbWUgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja1ppcEZpbGUoemlwRmlsZU9yRGlyOiBzdHJpbmcsIGluc3RhbGxEaXI6IHN0cmluZywgYXBwTmFtZTogc3RyaW5nLCBleGNsdWRlUGF0PzogUmVnRXhwIHwgc3RyaW5nKSB7XG5cbiAgemlwRmlsZU9yRGlyID0gemlwRmlsZU9yRGlyID8gcmVzb2x2ZSh6aXBGaWxlT3JEaXIpIDogcmVzb2x2ZShpbnN0YWxsRGlyLCBgJHthcHBOYW1lfS56aXBgKTtcblxuICBpZiAoIWZzLmV4aXN0c1N5bmMoemlwRmlsZU9yRGlyKSkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1xcbiVzIG5vdCBleGlzdCwgcXVpdCEnLCB6aXBGaWxlT3JEaXIpO1xuICAgIHRocm93IG5ldyBFcnJvcihgJHt6aXBGaWxlT3JEaXJ9IG5vdCBleGlzdGApO1xuICB9XG4gIGlmIChmcy5zdGF0U3luYyh6aXBGaWxlT3JEaXIpLmlzRGlyZWN0b3J5KCkpIHtcbiAgICBjb25zdCBkZXN0WmlwID0gcmVzb2x2ZShpbnN0YWxsRGlyLCBgJHthcHBOYW1lfS56aXBgKTtcbiAgICBhd2FpdCB6aXBEaXIoemlwRmlsZU9yRGlyLCBkZXN0WmlwLCBleGNsdWRlUGF0KTtcblxuICAgIGxvZy5pbmZvKGRlc3RaaXAgKyAnIGlzIHppcHBlZDogJyArIGZzLmV4aXN0c1N5bmMoZGVzdFppcCkpO1xuICAgIHppcEZpbGVPckRpciA9IGRlc3RaaXA7XG4gIH1cbiAgcmV0dXJuIHppcEZpbGVPckRpcjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHppcERpcihzcmNEaXI6IHN0cmluZywgZGVzdFppcDogc3RyaW5nLCBleGNsdWRlUGF0PzogUmVnRXhwIHwgc3RyaW5nKSB7XG4gIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKGRlc3RaaXApKTtcbiAgbG9nLmluZm8oYCR7c3JjRGlyfSBpcyBhIGRpcmVjdG9yeSwgemlwcGluZyBpbnRvICR7ZGVzdFppcH1gKTtcblxuICBjb25zdCB6aXBGaWxlID0gbmV3IFppcEZpbGUoKTtcbiAgY29uc3QgemlwRG9uZSA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgIHppcEZpbGUub3V0cHV0U3RyZWFtLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0oZGVzdFppcCkpXG4gICAgLm9uKCdjbG9zZScsIHJlc29sdmUpO1xuICB9KTtcblxuICBpZiAoZXhjbHVkZVBhdCAmJiB0eXBlb2YgZXhjbHVkZVBhdCA9PT0gJ3N0cmluZycpIHtcbiAgICBleGNsdWRlUGF0ID0gbmV3IFJlZ0V4cChleGNsdWRlUGF0KTtcbiAgfVxuXG4gIGdsb2Ioc3JjRGlyLnJlcGxhY2UoL1tcXFxcL10vLCAnLycpICsgJy8qKi8qJywge25vZGlyOiB0cnVlfSwgKGVyciwgbWF0Y2hlcykgPT4ge1xuICAgIGZvciAobGV0IGl0ZW0gb2YgbWF0Y2hlcykge1xuICAgICAgLy8gaXRlbSA9IGl0ZW0ucmVwbGFjZSgvWy9cXFxcXS8sICcvJyk7XG4gICAgICBpZiAoZXhjbHVkZVBhdCA9PSBudWxsIHx8ICEoZXhjbHVkZVBhdCBhcyBSZWdFeHApLnRlc3QoaXRlbSkpIHtcbiAgICAgICAgbG9nLmluZm8oYC0gemlwIGNvbnRlbnQ6ICR7aXRlbX1gKTtcbiAgICAgICAgemlwRmlsZS5hZGRGaWxlKGl0ZW0sIFBhdGgucmVsYXRpdmUoc3JjRGlyLCBpdGVtKS5yZXBsYWNlKC9bXFxcXC9dLywgJy8nKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHppcEZpbGUuZW5kKHtmb3JjZVppcDY0Rm9ybWF0OiBmYWxzZX0pO1xuICB9KTtcblxuICBhd2FpdCB6aXBEb25lO1xufVxuXG4vKipcbiAqIGRyY3AgcnVuIGFzc2V0cy1wcm9jZXNzZXIvdHMvcmVtb3RlLWRlcGxveS50cyNmZXRjaEFsbFppcHMgLS1lbnYgdGVzdCAtYyBjb25mL3JlbW90ZS1kZXBsb3ktdGVzdC55YW1sXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaEFsbFppcHMoKSB7XG4gIGNvbnN0IGVudiA9IGFwaS5hcmd2LmVudjtcbiAgaWYgKGVudiA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGFyZ3VtZW50cyBcIi0tZW52IDxlbnZpcm9ubWVudD5cIicpO1xuICB9XG4gIGNvbnN0IGluc3RhbGxEaXIgPSByZXNvbHZlKGdldFJvb3REaXIoKSwgJ2luc3RhbGwtJyArIGVudik7XG5cbiAgaWYgKCFmcy5leGlzdHNTeW5jKGluc3RhbGxEaXIpKVxuICAgIGZzLm1rZGlycFN5bmMoaW5zdGFsbERpcik7XG4gIGNvbnN0IGltYXAgPSBuZXcgSW1hcE1hbmFnZXIoZW52LCBpbnN0YWxsRGlyKTtcbiAgYXdhaXQgaW1hcC5mZXRjaENoZWNrc3VtKCk7XG4gIGF3YWl0IGltYXAuZmV0Y2hPdGhlclppcHMoJycpO1xufVxuXG50eXBlIENoZWNrc3VtSXRlbSA9IENoZWNrc3VtIGV4dGVuZHMgQXJyYXk8aW5mZXIgST4gPyBJIDogdW5rbm93bjtcbi8qKlxuICogQ2FsbCB0aGlzIGZpbGUgdG8gZ2VuZXJhdGUgY2hlY2tzdW0gZmlsZXMgaW4gYnVpbGQgcHJvY2Vzc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZGlnZXN0SW5zdGFsbGluZ0ZpbGVzKHJvb3REaXI/OiBzdHJpbmcpIHtcbiAgaWYgKHJvb3REaXIgPT0gbnVsbCkge1xuICAgIHJvb3REaXIgPSBnZXRSb290RGlyKCk7XG4gIH1cbiAgY29uc3QgbGlzdCA9IGZzLnJlYWRkaXJTeW5jKHJvb3REaXIpO1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgbGlzdCkge1xuICAgIGNvbnN0IG1hdGNoID0gL15pbnN0YWxsLShbXl0rKSQvLmV4ZWMobmFtZSk7XG4gICAgaWYgKG1hdGNoID09IG51bGwgfHwgIWZzLnN0YXRTeW5jKFBhdGgucmVzb2x2ZShyb290RGlyLCBuYW1lKSkuaXNEaXJlY3RvcnkoKSlcbiAgICAgIGNvbnRpbnVlO1xuICAgIGNvbnN0IGVudiA9IG1hdGNoWzFdO1xuICAgIGNvbnN0IGZpbGVzID0gZnMucmVhZGRpclN5bmMoUGF0aC5yZXNvbHZlKHJvb3REaXIsIG5hbWUpKTtcblxuICAgIGNvbnN0IGNoZWNrc3VtRG9uZXM6IFByb21pc2U8Q2hlY2tzdW1JdGVtPltdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICAgIGlmICghZmlsZS5lbmRzV2l0aCgnLnppcCcpKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIGNvbnN0IGhhc2ggPSBjcnlwdG8uY3JlYXRlSGFzaCgnc2hhMjU2Jyk7XG4gICAgICBjb25zdCB6aXAgPSBQYXRoLnJlc29sdmUocm9vdERpciwgbmFtZSwgZmlsZSk7XG4gICAgICBjb25zdCBpbnB1dCA9IGZzLmNyZWF0ZVJlYWRTdHJlYW0oemlwKTtcbiAgICAgIGNvbnN0IGRvbmUgPSBuZXcgUHJvbWlzZTxDaGVja3N1bUl0ZW0+KHJlc29sdmUgPT4ge1xuICAgICAgICBjb25zdCBzdHJlYW0gPSBpbnB1dC5waXBlKGhhc2gpO1xuICAgICAgICBzdHJlYW0ub24oJ3JlYWRhYmxlJywgKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGJ1ZiA9IHN0cmVhbS5yZWFkKCkgYXMgQnVmZmVyO1xuICAgICAgICAgIGlmIChidWYpIHtcbiAgICAgICAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgc2hhMjU2OiBidWYudG9TdHJpbmcoJ2hleCcpLFxuICAgICAgICAgICAgICBmaWxlOiAobmFtZSArICcvJyArIGZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICAgICAgICAgICAgY3JlYXRlZDogbm93LnRvTG9jYWxlU3RyaW5nKCksXG4gICAgICAgICAgICAgIGNyZWF0ZWRUaW1lOiBub3cuZ2V0VGltZSgpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHN0cmVhbS5yZXN1bWUoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgICBjaGVja3N1bURvbmVzLnB1c2goZG9uZSk7XG4gICAgfVxuXG4gICAgY29uc3QgY2hlY2tzdW0gPSBhd2FpdCBQcm9taXNlLmFsbChjaGVja3N1bURvbmVzKTtcbiAgICBjb25zdCBjaGVja3N1bVRleHQgPSBKU09OLnN0cmluZ2lmeShjaGVja3N1bSwgbnVsbCwgJyAgJyk7XG4gICAgY29uc29sZS5sb2coYGNoZWNrc3VtLiR7ZW52fS5qc29uOlxcbmAsIGNoZWNrc3VtVGV4dCk7XG4gICAgZnMud3JpdGVGaWxlU3luYyhQYXRoLnJlc29sdmUocm9vdERpciwgYGNoZWNrc3VtLiR7ZW52fS5qc29uYCksIGNoZWNrc3VtVGV4dCk7XG4gIH1cbn1cbiJdfQ==