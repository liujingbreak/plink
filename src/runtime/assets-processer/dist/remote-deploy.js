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
            // await imap.sendFileAndUpdatedChecksum(appName, zipFile);
            yield imap.fetchUpdateCheckSum(appName);
        }
        else {
            yield imap.fetchChecksum();
        }
        // if (buildStaticOnly === 'false') {
        //   await imap.fetchOtherZips(appName);
        // }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL3JlbW90ZS1kZXBsb3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkJBQTZCO0FBQzdCLGdFQUEwQjtBQUUxQiwrQkFBa0Q7QUFDbEQsK0JBQTBDO0FBQzFDLDhDQUF3RDtBQUN4RCwwREFBd0I7QUFDeEIsMkRBQWtEO0FBQ2xELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQzVFLDJDQUEyQztBQUMzQyw0Q0FBNEM7QUFDNUMsNkNBQTZDO0FBQzdDLHFCQUFxQjtBQUNyQixNQUFNO0FBRU4sNENBQTRDO0FBQzVDLDRDQUE0QztBQUM1Qyw4Q0FBOEM7QUFDOUMscUJBQXFCO0FBQ3JCLE1BQU07QUFFTixTQUFnQixJQUFJO0lBQ2hCLFlBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUM3QyxzQkFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2YsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNkLE9BQU8sWUFBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFHLENBQUMsR0FBRyxFQUFFO1lBQy9CLE1BQU0sR0FBRyxDQUFDO1FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNOLENBQUMsQ0FBQyxFQUNGLGlCQUFLLENBQUMsQ0FBQyxDQUFDLENBQ1AsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUNsQixDQUFDO0FBVkQsb0JBVUM7QUFFRCxTQUFlLG1CQUFtQjs7UUFDaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQ3ZDLElBQUksRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLEdBQUcsZUFBRyxDQUFDLElBQUksQ0FB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LENBQUMsQ0FBQztxQkFDcEQsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7cUJBQ2pDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7cUJBQzFCLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNuQyxDQUFDLENBQUMsQ0FBQztZQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDdEIsWUFBWSxHQUFHLE9BQU8sQ0FBQztTQUN4QjtRQUNELE9BQU8sWUFBWSxDQUFDO0lBQ3RCLENBQUM7Q0FBQTtBQWpDRCxvQ0FpQ0M7QUFFRDs7R0FFRztBQUNILFNBQXNCLFlBQVk7O1FBQ2hDLE1BQU0sR0FBRyxHQUFHLGVBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3pCLElBQUksR0FBRyxJQUFJLElBQUksRUFBRTtZQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMseUNBQXlDLENBQUMsQ0FBQztTQUM1RDtRQUNELE1BQU0sVUFBVSxHQUFHLGNBQU8sQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFFN0MsSUFBSSxDQUFDLGtCQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQztZQUM1QixrQkFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM1QixNQUFNLElBQUksR0FBRyxJQUFJLCtCQUFXLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQzNCLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNoQyxDQUFDO0NBQUE7QUFaRCxvQ0FZQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L3JlbW90ZS1kZXBsb3kuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbm8tY29uc29sZVxuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfZ3VscCBmcm9tICdndWxwJztcbmltcG9ydCB7IGJhc2VuYW1lLCBkaXJuYW1lLCByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBkZWZlciwgZnJvbSwgdGltZXIgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGNhdGNoRXJyb3IsIG1hcCwgcmV0cnkgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7IEltYXBNYW5hZ2VyIH0gZnJvbSAnLi9mZXRjaC1yZW1vdGUtaW1hcCc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5yZW1vdGUtZGVwbG95Jyk7XG4vLyBwcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsIGVyciA9PiB7XG4vLyAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuLy8gICBjb25zb2xlLmVycm9yKCd1bmNhdWdodEV4Y2VwdGlvbicsIGVycik7XG4vLyAgIHByb2Nlc3MuZXhpdCgxKTtcbi8vIH0pO1xuXG4vLyBwcm9jZXNzLm9uKCd1bmhhbmRsZWRSZWplY3Rpb24nLCBlcnIgPT4ge1xuLy8gICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbi8vICAgY29uc29sZS5lcnJvcigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXJyKTtcbi8vICAgcHJvY2Vzcy5leGl0KDEpO1xuLy8gfSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWluKCkge1xuICAgIGRlZmVyKCgpID0+IGZyb20obWFpbERlcGxveVN0YXRpY1JlcygpKSkucGlwZShcbiAgICBjYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICBsb2cud2FybihlcnIpO1xuICAgICAgcmV0dXJuIHRpbWVyKDEwMDApLnBpcGUobWFwKCgpID0+IHtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfSkpO1xuICAgIH0pLFxuICAgIHJldHJ5KDMpXG4gICAgKS5zdWJzY3JpYmUoKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gbWFpbERlcGxveVN0YXRpY1JlcygpIHtcbiAgY29uc29sZS5sb2coJ1JlbW90ZSBkZXBsb3kgKG1haWwpLi4uJyk7XG4gIGxldCB7ZW52LCBzcmN9ID0gYXBpLmFyZ3Y7XG4gIGxldCBhcHBOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGlmIChhcGkuYXJndi5hcHBOYW1lKSB7XG4gICAgYXBwTmFtZSA9IGFwaS5hcmd2LmFwcE5hbWU7XG4gIH1cblxuICBpZiAoZW52ID09IG51bGwpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnbWlzc2luZyBjb21tYW5kIGFyZ3VtZW50cywnLCBhcGkuYXJndik7XG4gICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBpbnN0YWxsRGlyID0gcmVzb2x2ZSgnaW5zdGFsbC0nICsgZW52KTtcblxuICBpZiAoIWZzLmV4aXN0c1N5bmMoaW5zdGFsbERpcikpXG4gICAgZnMubWtkaXJwU3luYyhpbnN0YWxsRGlyKTtcbiAgY29uc3QgaW1hcCA9IG5ldyBJbWFwTWFuYWdlcihlbnYsIGluc3RhbGxEaXIpO1xuXG4gIGlmIChhcHBOYW1lKSB7XG4gICAgYXdhaXQgY2hlY2taaXBGaWxlKHNyYywgaW5zdGFsbERpciwgYXBwTmFtZSk7XG4gICAgLy8gYXdhaXQgaW1hcC5zZW5kRmlsZUFuZFVwZGF0ZWRDaGVja3N1bShhcHBOYW1lLCB6aXBGaWxlKTtcbiAgICBhd2FpdCBpbWFwLmZldGNoVXBkYXRlQ2hlY2tTdW0oYXBwTmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgYXdhaXQgaW1hcC5mZXRjaENoZWNrc3VtKCk7XG4gIH1cblxuICAvLyBpZiAoYnVpbGRTdGF0aWNPbmx5ID09PSAnZmFsc2UnKSB7XG4gIC8vICAgYXdhaXQgaW1hcC5mZXRjaE90aGVyWmlwcyhhcHBOYW1lKTtcbiAgLy8gfVxufVxuXG4vKipcbiAqIFBhY2sgZGlyZWN0b3J5IGludG8gemlwIGZpbGVcbiAqIEBwYXJhbSB6aXBGaWxlT3JEaXIgXG4gKiBAcGFyYW0gaW5zdGFsbERpciBcbiAqIEBwYXJhbSBhcHBOYW1lIFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hlY2taaXBGaWxlKHppcEZpbGVPckRpcjogc3RyaW5nLCBpbnN0YWxsRGlyOiBzdHJpbmcsIGFwcE5hbWU6IHN0cmluZykge1xuXG4gIHppcEZpbGVPckRpciA9IHppcEZpbGVPckRpciA/IHJlc29sdmUoemlwRmlsZU9yRGlyKSA6IHJlc29sdmUoaW5zdGFsbERpciwgYCR7YXBwTmFtZX0uemlwYCk7XG5cbiAgaWYgKCFmcy5leGlzdHNTeW5jKHppcEZpbGVPckRpcikpIHtcbiAgICBjb25zb2xlLmVycm9yKCdcXG4lcyBub3QgZXhpc3QsIHF1aXQhJywgemlwRmlsZU9yRGlyKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYCR7emlwRmlsZU9yRGlyfSBub3QgZXhpc3RgKTtcbiAgfVxuICBpZiAoZnMuc3RhdFN5bmMoemlwRmlsZU9yRGlyKS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgY29uc3QgZGVzdFppcCA9IHJlc29sdmUoaW5zdGFsbERpciwgYCR7YXBwTmFtZX0uemlwYCk7XG4gICAgY29uc29sZS5sb2coYCR7emlwRmlsZU9yRGlyfSBpcyBhIGRpcmVjdG9yeSwgemlwcGluZyBpbnRvICR7ZGVzdFppcH1gKTtcbiAgICBjb25zdCBndWxwOiB0eXBlb2YgX2d1bHAgPSByZXF1aXJlKCdndWxwJyk7XG4gICAgY29uc3QgdGhyb3VnaDIgPSByZXF1aXJlKCd0aHJvdWdoMicpO1xuICAgIGNvbnN0IHppcCA9IHJlcXVpcmUoJ2d1bHAtemlwJyk7XG5cbiAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBndWxwLnNyYyh6aXBGaWxlT3JEaXIgKyAnLyoqLyonKVxuICAgICAgLnBpcGU8Tm9kZUpTLlJlYWRXcml0ZVN0cmVhbT4oXG4gICAgICAgIHRocm91Z2gyLm9iaihmdW5jdGlvbihmaWxlOiBhbnksIGVuY29kaW5nOiBzdHJpbmcsIGNiOiAoLi4uYXJnczogYW55W10pID0+IHZvaWQpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnLSB6aXAgY29udGVudDonLCBmaWxlLnBhdGgpO1xuICAgICAgICAgIGNiKG51bGwsIGZpbGUpO1xuICAgICAgfSwgZnVuY3Rpb24gZmx1c2goY2FsbGJhY2s6ICgpID0+IHZvaWQpIHtcbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgIH0pKVxuICAgICAgLnBpcGU8Tm9kZUpTLlJlYWRXcml0ZVN0cmVhbT4oemlwKGJhc2VuYW1lKGRlc3RaaXApKSlcbiAgICAgIC5waXBlKGd1bHAuZGVzdChkaXJuYW1lKGRlc3RaaXApKSlcbiAgICAgIC5vbignZW5kJywgKCkgPT4gcmVzb2x2ZSgpKVxuICAgICAgLm9uKCdlcnJvcicsIGVyciA9PiByZWplY3QoZXJyKSk7XG4gICAgfSk7XG4gICAgY29uc29sZS5sb2coJ3ppcHBlZCcpO1xuICAgIHppcEZpbGVPckRpciA9IGRlc3RaaXA7XG4gIH1cbiAgcmV0dXJuIHppcEZpbGVPckRpcjtcbn1cblxuLyoqXG4gKiBkcmNwIHJ1biBhc3NldHMtcHJvY2Vzc2VyL3RzL3JlbW90ZS1kZXBsb3kudHMjZmV0Y2hBbGxaaXBzIC0tZW52IHRlc3QgLWMgY29uZi9yZW1vdGUtZGVwbG95LXRlc3QueWFtbFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmV0Y2hBbGxaaXBzKCkge1xuICBjb25zdCBlbnYgPSBhcGkuYXJndi5lbnY7XG4gIGlmIChlbnYgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBhcmd1bWVudHMgXCItLWVudiA8ZW52aXJvbm1lbnQ+XCInKTtcbiAgfVxuICBjb25zdCBpbnN0YWxsRGlyID0gcmVzb2x2ZSgnaW5zdGFsbC0nICsgZW52KTtcblxuICBpZiAoIWZzLmV4aXN0c1N5bmMoaW5zdGFsbERpcikpXG4gICAgZnMubWtkaXJwU3luYyhpbnN0YWxsRGlyKTtcbiAgY29uc3QgaW1hcCA9IG5ldyBJbWFwTWFuYWdlcihlbnYsIGluc3RhbGxEaXIpO1xuICBhd2FpdCBpbWFwLmZldGNoQ2hlY2tzdW0oKTtcbiAgYXdhaXQgaW1hcC5mZXRjaE90aGVyWmlwcygnJyk7XG59XG4iXX0=
