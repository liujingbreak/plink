"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable: no-console
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = require("path");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const __api_1 = tslib_1.__importDefault(require("__api"));
const fetch_remote_imap_1 = require("./fetch-remote-imap");
const path_2 = tslib_1.__importDefault(require("path"));
const crypto_1 = tslib_1.__importDefault(require("crypto"));
const log = require('log4js').getLogger(__api_1.default.packageName + '.remote-deploy');
// process.on('uncaughtException', err => {
//   // tslint:disable-next-line: no-console
//   console.error('uncaughtException', err);
//   process.exit(1);
// });
// process.on('unhandledRejection', err => {
//   // tslint:disable-next-line: no-console
//   console.error('unhandledRejection', err);
//   process.exit(1);
// });
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
function checkZipFile(zipFileOrDir, installDir, appName) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        zipFileOrDir = zipFileOrDir ? path_1.resolve(zipFileOrDir) : path_1.resolve(installDir, `${appName}.zip`);
        if (!fs_extra_1.default.existsSync(zipFileOrDir)) {
            console.error('\n%s not exist, quit!', zipFileOrDir);
            throw new Error(`${zipFileOrDir} not exist`);
        }
        if (fs_extra_1.default.statSync(zipFileOrDir).isDirectory()) {
            const destZip = path_1.resolve(installDir, `${appName}.zip`);
            console.log(`${zipFileOrDir} is a directory, zipping into ${destZip}`);
            const gulp = require('gulp');
            const through2 = require('through2');
            const zip = require('gulp-zip');
            yield new Promise((resolve, reject) => {
                gulp.src(zipFileOrDir + '/**/*')
                    .pipe(through2.obj(function (file, encoding, cb) {
                    console.log('- zip content:', file.path);
                    cb(null, file);
                }, function flush(callback) {
                    callback();
                }))
                    .pipe(zip(path_1.basename(destZip)))
                    .pipe(gulp.dest(path_1.dirname(destZip)))
                    .on('end', () => resolve())
                    .on('error', err => reject(err));
            });
            console.log('zipped');
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL3JlbW90ZS1kZXBsb3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkJBQTZCO0FBQzdCLGdFQUEwQjtBQUUxQiwrQkFBa0Q7QUFDbEQsK0JBQTBDO0FBQzFDLDhDQUF3RDtBQUN4RCwwREFBd0I7QUFDeEIsMkRBQWtEO0FBRWxELHdEQUF3QjtBQUN4Qiw0REFBNEI7QUFDNUIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGdCQUFnQixDQUFDLENBQUM7QUFDNUUsMkNBQTJDO0FBQzNDLDRDQUE0QztBQUM1Qyw2Q0FBNkM7QUFDN0MscUJBQXFCO0FBQ3JCLE1BQU07QUFFTiw0Q0FBNEM7QUFDNUMsNENBQTRDO0FBQzVDLDhDQUE4QztBQUM5QyxxQkFBcUI7QUFDckIsTUFBTTtBQUVOLFNBQWdCLElBQUk7SUFDaEIsWUFBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLFdBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQzdDLHNCQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDZixHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsT0FBTyxZQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQUcsQ0FBQyxHQUFHLEVBQUU7WUFDL0IsTUFBTSxHQUFHLENBQUM7UUFDWixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ04sQ0FBQyxDQUFDLEVBQ0YsaUJBQUssQ0FBQyxDQUFDLENBQUMsQ0FDUCxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ2xCLENBQUM7QUFWRCxvQkFVQztBQUVELFNBQWUsbUJBQW1COztRQUNoQyxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDdkMsSUFBSSxFQUFDLEdBQUcsRUFBRSxHQUFHLEVB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LEVBQUUsR0FBRyxFQUFFO3dCQUN6QixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsSUFBSSxFQUFZLENBQUM7d0JBQ3BDLElBQUksR0FBRyxFQUFFOzRCQUNQLE1BQU0sR0FBRyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7NEJBQ3ZCLE9BQU8sQ0FBQztnQ0FDTixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7Z0NBQzNCLElBQUksRUFBRSxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUM7Z0NBQzdDLE9BQU8sRUFBRSxHQUFHLENBQUMsY0FBYyxFQUFFO2dDQUM3QixXQUFXLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRTs2QkFDM0IsQ0FBQyxDQUFDOzRCQUNILE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQzt5QkFDakI7b0JBQ0gsQ0FBQyxDQUFDLENBQUM7Z0JBQ0wsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUMxQjtZQUVELE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUNsRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDMUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEdBQUcsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ3JELGtCQUFFLENBQUMsYUFBYSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFlBQVksR0FBRyxPQUFPLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQztTQUMvRTtJQUNILENBQUM7Q0FBQTtBQTVDRCxzREE0Q0MiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9yZW1vdGUtZGVwbG95LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG5vLWNvbnNvbGVcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgX2d1bHAgZnJvbSAnZ3VscCc7XG5pbXBvcnQgeyBiYXNlbmFtZSwgZGlybmFtZSwgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZGVmZXIsIGZyb20sIHRpbWVyIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBjYXRjaEVycm9yLCBtYXAsIHJldHJ5IH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyBJbWFwTWFuYWdlciB9IGZyb20gJy4vZmV0Y2gtcmVtb3RlLWltYXAnO1xuaW1wb3J0IHtDaGVja3N1bX0gZnJvbSAnLi9mZXRjaC10eXBlcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjcnlwdG8gZnJvbSAnY3J5cHRvJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLnJlbW90ZS1kZXBsb3knKTtcbi8vIHByb2Nlc3Mub24oJ3VuY2F1Z2h0RXhjZXB0aW9uJywgZXJyID0+IHtcbi8vICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4vLyAgIGNvbnNvbGUuZXJyb3IoJ3VuY2F1Z2h0RXhjZXB0aW9uJywgZXJyKTtcbi8vICAgcHJvY2Vzcy5leGl0KDEpO1xuLy8gfSk7XG5cbi8vIHByb2Nlc3Mub24oJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVyciA9PiB7XG4vLyAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuLy8gICBjb25zb2xlLmVycm9yKCd1bmhhbmRsZWRSZWplY3Rpb24nLCBlcnIpO1xuLy8gICBwcm9jZXNzLmV4aXQoMSk7XG4vLyB9KTtcblxuZXhwb3J0IGZ1bmN0aW9uIG1haW4oKSB7XG4gICAgZGVmZXIoKCkgPT4gZnJvbShtYWlsRGVwbG95U3RhdGljUmVzKCkpKS5waXBlKFxuICAgIGNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgIGxvZy53YXJuKGVycik7XG4gICAgICByZXR1cm4gdGltZXIoMTAwMCkucGlwZShtYXAoKCkgPT4ge1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9KSk7XG4gICAgfSksXG4gICAgcmV0cnkoMylcbiAgICApLnN1YnNjcmliZSgpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBtYWlsRGVwbG95U3RhdGljUmVzKCkge1xuICBjb25zb2xlLmxvZygnUmVtb3RlIGRlcGxveSAobWFpbCkuLi4nKTtcbiAgbGV0IHtlbnYsIHNyY30gPSBhcGkuYXJndjtcbiAgbGV0IGFwcE5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgaWYgKGFwaS5hcmd2LmFwcE5hbWUpIHtcbiAgICBhcHBOYW1lID0gYXBpLmFyZ3YuYXBwTmFtZTtcbiAgfVxuXG4gIGlmIChlbnYgPT0gbnVsbCkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdtaXNzaW5nIGNvbW1hbmQgYXJndW1lbnRzLCcsIGFwaS5hcmd2KTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGluc3RhbGxEaXIgPSByZXNvbHZlKCdpbnN0YWxsLScgKyBlbnYpO1xuXG4gIGlmICghZnMuZXhpc3RzU3luYyhpbnN0YWxsRGlyKSlcbiAgICBmcy5ta2RpcnBTeW5jKGluc3RhbGxEaXIpO1xuICBjb25zdCBpbWFwID0gbmV3IEltYXBNYW5hZ2VyKGVudiwgaW5zdGFsbERpcik7XG5cbiAgaWYgKGFwcE5hbWUpIHtcbiAgICBhd2FpdCBjaGVja1ppcEZpbGUoc3JjLCBpbnN0YWxsRGlyLCBhcHBOYW1lKTtcbiAgICBhd2FpdCBpbWFwLmZldGNoVXBkYXRlQ2hlY2tTdW0oYXBwTmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgYXdhaXQgaW1hcC5mZXRjaENoZWNrc3VtKCk7XG4gIH1cbn1cblxuLyoqXG4gKiBQYWNrIGRpcmVjdG9yeSBpbnRvIHppcCBmaWxlXG4gKiBAcGFyYW0gemlwRmlsZU9yRGlyIFxuICogQHBhcmFtIGluc3RhbGxEaXIgXG4gKiBAcGFyYW0gYXBwTmFtZSBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoZWNrWmlwRmlsZSh6aXBGaWxlT3JEaXI6IHN0cmluZywgaW5zdGFsbERpcjogc3RyaW5nLCBhcHBOYW1lOiBzdHJpbmcpIHtcblxuICB6aXBGaWxlT3JEaXIgPSB6aXBGaWxlT3JEaXIgPyByZXNvbHZlKHppcEZpbGVPckRpcikgOiByZXNvbHZlKGluc3RhbGxEaXIsIGAke2FwcE5hbWV9LnppcGApO1xuXG4gIGlmICghZnMuZXhpc3RzU3luYyh6aXBGaWxlT3JEaXIpKSB7XG4gICAgY29uc29sZS5lcnJvcignXFxuJXMgbm90IGV4aXN0LCBxdWl0IScsIHppcEZpbGVPckRpcik7XG4gICAgdGhyb3cgbmV3IEVycm9yKGAke3ppcEZpbGVPckRpcn0gbm90IGV4aXN0YCk7XG4gIH1cbiAgaWYgKGZzLnN0YXRTeW5jKHppcEZpbGVPckRpcikuaXNEaXJlY3RvcnkoKSkge1xuICAgIGNvbnN0IGRlc3RaaXAgPSByZXNvbHZlKGluc3RhbGxEaXIsIGAke2FwcE5hbWV9LnppcGApO1xuICAgIGNvbnNvbGUubG9nKGAke3ppcEZpbGVPckRpcn0gaXMgYSBkaXJlY3RvcnksIHppcHBpbmcgaW50byAke2Rlc3RaaXB9YCk7XG4gICAgY29uc3QgZ3VscDogdHlwZW9mIF9ndWxwID0gcmVxdWlyZSgnZ3VscCcpO1xuICAgIGNvbnN0IHRocm91Z2gyID0gcmVxdWlyZSgndGhyb3VnaDInKTtcbiAgICBjb25zdCB6aXAgPSByZXF1aXJlKCdndWxwLXppcCcpO1xuXG4gICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgZ3VscC5zcmMoemlwRmlsZU9yRGlyICsgJy8qKi8qJylcbiAgICAgIC5waXBlPE5vZGVKUy5SZWFkV3JpdGVTdHJlYW0+KFxuICAgICAgICB0aHJvdWdoMi5vYmooZnVuY3Rpb24oZmlsZTogYW55LCBlbmNvZGluZzogc3RyaW5nLCBjYjogKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJy0gemlwIGNvbnRlbnQ6JywgZmlsZS5wYXRoKTtcbiAgICAgICAgICBjYihudWxsLCBmaWxlKTtcbiAgICAgIH0sIGZ1bmN0aW9uIGZsdXNoKGNhbGxiYWNrOiAoKSA9PiB2b2lkKSB7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB9KSlcbiAgICAgIC5waXBlPE5vZGVKUy5SZWFkV3JpdGVTdHJlYW0+KHppcChiYXNlbmFtZShkZXN0WmlwKSkpXG4gICAgICAucGlwZShndWxwLmRlc3QoZGlybmFtZShkZXN0WmlwKSkpXG4gICAgICAub24oJ2VuZCcsICgpID0+IHJlc29sdmUoKSlcbiAgICAgIC5vbignZXJyb3InLCBlcnIgPT4gcmVqZWN0KGVycikpO1xuICAgIH0pO1xuICAgIGNvbnNvbGUubG9nKCd6aXBwZWQnKTtcbiAgICB6aXBGaWxlT3JEaXIgPSBkZXN0WmlwO1xuICB9XG4gIHJldHVybiB6aXBGaWxlT3JEaXI7XG59XG5cbi8qKlxuICogZHJjcCBydW4gYXNzZXRzLXByb2Nlc3Nlci90cy9yZW1vdGUtZGVwbG95LnRzI2ZldGNoQWxsWmlwcyAtLWVudiB0ZXN0IC1jIGNvbmYvcmVtb3RlLWRlcGxveS10ZXN0LnlhbWxcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZldGNoQWxsWmlwcygpIHtcbiAgY29uc3QgZW52ID0gYXBpLmFyZ3YuZW52O1xuICBpZiAoZW52ID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgYXJndW1lbnRzIFwiLS1lbnYgPGVudmlyb25tZW50PlwiJyk7XG4gIH1cbiAgY29uc3QgaW5zdGFsbERpciA9IHJlc29sdmUoJ2luc3RhbGwtJyArIGVudik7XG5cbiAgaWYgKCFmcy5leGlzdHNTeW5jKGluc3RhbGxEaXIpKVxuICAgIGZzLm1rZGlycFN5bmMoaW5zdGFsbERpcik7XG4gIGNvbnN0IGltYXAgPSBuZXcgSW1hcE1hbmFnZXIoZW52LCBpbnN0YWxsRGlyKTtcbiAgYXdhaXQgaW1hcC5mZXRjaENoZWNrc3VtKCk7XG4gIGF3YWl0IGltYXAuZmV0Y2hPdGhlclppcHMoJycpO1xufVxuXG50eXBlIENoZWNrc3VtSXRlbSA9IENoZWNrc3VtIGV4dGVuZHMgQXJyYXk8aW5mZXIgST4gPyBJIDogdW5rbm93bjtcbi8qKlxuICogQ2FsbCB0aGlzIGZpbGUgdG8gZ2VuZXJhdGUgY2hlY2tzdW0gZmlsZXMgaW4gYnVpbGQgcHJvY2Vzc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZGlnZXN0SW5zdGFsbGluZ0ZpbGVzKHJvb3REaXI/OiBzdHJpbmcpIHtcbiAgaWYgKHJvb3REaXIgPT0gbnVsbCkge1xuICAgIHJvb3REaXIgPSBQYXRoLnJlc29sdmUoKTtcbiAgfVxuICBjb25zdCBsaXN0ID0gZnMucmVhZGRpclN5bmMocm9vdERpcik7XG4gIGZvciAoY29uc3QgbmFtZSBvZiBsaXN0KSB7XG4gICAgY29uc3QgbWF0Y2ggPSAvXmluc3RhbGwtKFteXSspJC8uZXhlYyhuYW1lKTtcbiAgICBpZiAobWF0Y2ggPT0gbnVsbCB8fCAhZnMuc3RhdFN5bmMoUGF0aC5yZXNvbHZlKHJvb3REaXIsIG5hbWUpKS5pc0RpcmVjdG9yeSgpKVxuICAgICAgY29udGludWU7XG4gICAgY29uc3QgZW52ID0gbWF0Y2hbMV07XG4gICAgY29uc3QgZmlsZXMgPSBmcy5yZWFkZGlyU3luYyhQYXRoLnJlc29sdmUocm9vdERpciwgbmFtZSkpO1xuXG4gICAgY29uc3QgY2hlY2tzdW1Eb25lczogUHJvbWlzZTxDaGVja3N1bUl0ZW0+W10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgICAgaWYgKCFmaWxlLmVuZHNXaXRoKCcuemlwJykpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaGFzaCA9IGNyeXB0by5jcmVhdGVIYXNoKCdzaGEyNTYnKTtcbiAgICAgIGNvbnN0IHppcCA9IFBhdGgucmVzb2x2ZShyb290RGlyLCBuYW1lLCBmaWxlKTtcbiAgICAgIGNvbnN0IGlucHV0ID0gZnMuY3JlYXRlUmVhZFN0cmVhbSh6aXApO1xuICAgICAgY29uc3QgZG9uZSA9IG5ldyBQcm9taXNlPENoZWNrc3VtSXRlbT4ocmVzb2x2ZSA9PiB7XG4gICAgICAgIGNvbnN0IHN0cmVhbSA9IGlucHV0LnBpcGUoaGFzaCk7XG4gICAgICAgIHN0cmVhbS5vbigncmVhZGFibGUnLCAoKSA9PiB7XG4gICAgICAgICAgY29uc3QgYnVmID0gc3RyZWFtLnJlYWQoKSBhcyBCdWZmZXI7XG4gICAgICAgICAgaWYgKGJ1Zikge1xuICAgICAgICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICBzaGEyNTY6IGJ1Zi50b1N0cmluZygnaGV4JyksXG4gICAgICAgICAgICAgIGZpbGU6IChuYW1lICsgJy8nICsgZmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgICAgICAgICAgICBjcmVhdGVkOiBub3cudG9Mb2NhbGVTdHJpbmcoKSxcbiAgICAgICAgICAgICAgY3JlYXRlZFRpbWU6IG5vdy5nZXRUaW1lKClcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc3RyZWFtLnJlc3VtZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIGNoZWNrc3VtRG9uZXMucHVzaChkb25lKTtcbiAgICB9XG5cbiAgICBjb25zdCBjaGVja3N1bSA9IGF3YWl0IFByb21pc2UuYWxsKGNoZWNrc3VtRG9uZXMpO1xuICAgIGNvbnN0IGNoZWNrc3VtVGV4dCA9IEpTT04uc3RyaW5naWZ5KGNoZWNrc3VtLCBudWxsLCAnICAnKTtcbiAgICBjb25zb2xlLmxvZyhgY2hlY2tzdW0uJHtlbnZ9Lmpzb246XFxuYCwgY2hlY2tzdW1UZXh0KTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKFBhdGgucmVzb2x2ZShyb290RGlyLCBgY2hlY2tzdW0uJHtlbnZ9Lmpzb25gKSwgY2hlY2tzdW1UZXh0KTtcbiAgfVxufVxuIl19
