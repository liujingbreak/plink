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
        let { env, appName, src, buildStaticOnly } = __api_1.default.argv;
        if (env == null || appName == null) {
            // tslint:disable-next-line: no-console
            console.log('missing command arguments,', __api_1.default.argv);
            process.exit(1);
            return;
        }
        const installDir = path_1.resolve('install-' + env);
        if (!fs_extra_1.default.existsSync(installDir))
            fs_extra_1.default.mkdirpSync(installDir);
        const imap = new fetch_remote_imap_1.ImapManager(env, installDir);
        const zipFile = yield checkZipFile(src, installDir, appName);
        yield imap.sendFileAndUpdatedChecksum(appName, zipFile);
        if (buildStaticOnly === 'false') {
            yield imap.fetchOtherZips(appName);
        }
    });
}
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
/**
 * drcp run ts/remote-deploy.ts#fetchAllZips --env test -c conf/remote-deploy-test.yaml
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL3JlbW90ZS1kZXBsb3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkJBQTZCO0FBQzdCLGdFQUEwQjtBQUUxQiwrQkFBa0Q7QUFDbEQsK0JBQTBDO0FBQzFDLDhDQUF3RDtBQUN4RCwwREFBd0I7QUFDeEIsMkRBQWtEO0FBQ2xELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQzVFLDJDQUEyQztBQUMzQyw0Q0FBNEM7QUFDNUMsNkNBQTZDO0FBQzdDLHFCQUFxQjtBQUNyQixNQUFNO0FBRU4sNENBQTRDO0FBQzVDLDRDQUE0QztBQUM1Qyw4Q0FBOEM7QUFDOUMscUJBQXFCO0FBQ3JCLE1BQU07QUFFTixTQUFnQixJQUFJO0lBQ2hCLFlBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUM3QyxzQkFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2YsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNkLE9BQU8sWUFBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFHLENBQUMsR0FBRyxFQUFFO1lBQy9CLE1BQU0sR0FBRyxDQUFDO1FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNOLENBQUMsQ0FBQyxFQUNGLGlCQUFLLENBQUMsQ0FBQyxDQUFDLENBQ1AsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUNsQixDQUFDO0FBVkQsb0JBVUM7QUFFRCxTQUFlLG1CQUFtQjs7UUFDaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQ3ZDLElBQUksRUFBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxlQUFlLEVBQUMsR0FB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QUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO3FCQUMxQixFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDbkMsQ0FBQyxDQUFDLENBQUM7WUFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3RCLFlBQVksR0FBRyxPQUFPLENBQUM7U0FDeEI7UUFDRCxPQUFPLFlBQVksQ0FBQztJQUN0QixDQUFDO0NBQUE7QUFFRDs7R0FFRztBQUNILFNBQXNCLFlBQVk7O1FBQ2hDLE1BQU0sR0FBRyxHQUFHLGVBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3pCLElBQUksR0FBRyxJQUFJLElBQUksRUFBRTtZQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMseUNBQXlDLENBQUMsQ0FBQztTQUM1RDtRQUNELE1BQU0sVUFBVSxHQUFHLGNBQU8sQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFFN0MsSUFBSSxDQUFDLGtCQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQztZQUM1QixrQkFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM1QixNQUFNLElBQUksR0FBRyxJQUFJLCtCQUFXLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQzNCLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNoQyxDQUFDO0NBQUE7QUFaRCxvQ0FZQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L3JlbW90ZS1kZXBsb3kuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbm8tY29uc29sZVxuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfZ3VscCBmcm9tICdndWxwJztcbmltcG9ydCB7IGJhc2VuYW1lLCBkaXJuYW1lLCByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBkZWZlciwgZnJvbSwgdGltZXIgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGNhdGNoRXJyb3IsIG1hcCwgcmV0cnkgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7IEltYXBNYW5hZ2VyIH0gZnJvbSAnLi9mZXRjaC1yZW1vdGUtaW1hcCc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5yZW1vdGUtZGVwbG95Jyk7XG4vLyBwcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsIGVyciA9PiB7XG4vLyAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuLy8gICBjb25zb2xlLmVycm9yKCd1bmNhdWdodEV4Y2VwdGlvbicsIGVycik7XG4vLyAgIHByb2Nlc3MuZXhpdCgxKTtcbi8vIH0pO1xuXG4vLyBwcm9jZXNzLm9uKCd1bmhhbmRsZWRSZWplY3Rpb24nLCBlcnIgPT4ge1xuLy8gICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbi8vICAgY29uc29sZS5lcnJvcigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXJyKTtcbi8vICAgcHJvY2Vzcy5leGl0KDEpO1xuLy8gfSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWluKCkge1xuICAgIGRlZmVyKCgpID0+IGZyb20obWFpbERlcGxveVN0YXRpY1JlcygpKSkucGlwZShcbiAgICBjYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICBsb2cud2FybihlcnIpO1xuICAgICAgcmV0dXJuIHRpbWVyKDEwMDApLnBpcGUobWFwKCgpID0+IHtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfSkpO1xuICAgIH0pLFxuICAgIHJldHJ5KDMpXG4gICAgKS5zdWJzY3JpYmUoKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gbWFpbERlcGxveVN0YXRpY1JlcygpIHtcbiAgY29uc29sZS5sb2coJ1JlbW90ZSBkZXBsb3kgKG1haWwpLi4uJyk7XG4gIGxldCB7ZW52LCBhcHBOYW1lLCBzcmMsIGJ1aWxkU3RhdGljT25seX0gPSBhcGkuYXJndjtcblxuICBpZiAoZW52ID09IG51bGwgfHwgYXBwTmFtZSA9PSBudWxsKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ21pc3NpbmcgY29tbWFuZCBhcmd1bWVudHMsJywgYXBpLmFyZ3YpO1xuICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgaW5zdGFsbERpciA9IHJlc29sdmUoJ2luc3RhbGwtJyArIGVudik7XG5cbiAgaWYgKCFmcy5leGlzdHNTeW5jKGluc3RhbGxEaXIpKVxuICAgIGZzLm1rZGlycFN5bmMoaW5zdGFsbERpcik7XG4gIGNvbnN0IGltYXAgPSBuZXcgSW1hcE1hbmFnZXIoZW52LCBpbnN0YWxsRGlyKTtcblxuICBjb25zdCB6aXBGaWxlID0gYXdhaXQgY2hlY2taaXBGaWxlKHNyYywgaW5zdGFsbERpciwgYXBwTmFtZSk7XG5cblxuICBhd2FpdCBpbWFwLnNlbmRGaWxlQW5kVXBkYXRlZENoZWNrc3VtKGFwcE5hbWUsIHppcEZpbGUpO1xuXG4gIGlmIChidWlsZFN0YXRpY09ubHkgPT09ICdmYWxzZScpIHtcbiAgICBhd2FpdCBpbWFwLmZldGNoT3RoZXJaaXBzKGFwcE5hbWUpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNoZWNrWmlwRmlsZSh6aXBGaWxlT3JEaXI6IHN0cmluZywgaW5zdGFsbERpcjogc3RyaW5nLCBhcHBOYW1lOiBzdHJpbmcpIHtcblxuICB6aXBGaWxlT3JEaXIgPSB6aXBGaWxlT3JEaXIgPyByZXNvbHZlKHppcEZpbGVPckRpcikgOiByZXNvbHZlKGluc3RhbGxEaXIsIGAke2FwcE5hbWV9LnppcGApO1xuXG4gIGlmICghZnMuZXhpc3RzU3luYyh6aXBGaWxlT3JEaXIpKSB7XG4gICAgY29uc29sZS5lcnJvcignXFxuJXMgbm90IGV4aXN0LCBxdWl0IScsIHppcEZpbGVPckRpcik7XG4gICAgdGhyb3cgbmV3IEVycm9yKGAke3ppcEZpbGVPckRpcn0gbm90IGV4aXN0YCk7XG4gIH1cbiAgaWYgKGZzLnN0YXRTeW5jKHppcEZpbGVPckRpcikuaXNEaXJlY3RvcnkoKSkge1xuICAgIGNvbnN0IGRlc3RaaXAgPSByZXNvbHZlKGluc3RhbGxEaXIsIGAke2FwcE5hbWV9LnppcGApO1xuICAgIGNvbnNvbGUubG9nKGAke3ppcEZpbGVPckRpcn0gaXMgYSBkaXJlY3RvcnksIHppcHBpbmcgaW50byAke2Rlc3RaaXB9YCk7XG4gICAgY29uc3QgZ3VscDogdHlwZW9mIF9ndWxwID0gcmVxdWlyZSgnZ3VscCcpO1xuICAgIGNvbnN0IHRocm91Z2gyID0gcmVxdWlyZSgndGhyb3VnaDInKTtcbiAgICBjb25zdCB6aXAgPSByZXF1aXJlKCdndWxwLXppcCcpO1xuXG4gICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgZ3VscC5zcmMoemlwRmlsZU9yRGlyICsgJy8qKi8qJylcbiAgICAgIC5waXBlPE5vZGVKUy5SZWFkV3JpdGVTdHJlYW0+KFxuICAgICAgICB0aHJvdWdoMi5vYmooZnVuY3Rpb24oZmlsZTogYW55LCBlbmNvZGluZzogc3RyaW5nLCBjYjogKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJy0gemlwIGNvbnRlbnQ6JywgZmlsZS5wYXRoKTtcbiAgICAgICAgICBjYihudWxsLCBmaWxlKTtcbiAgICAgIH0sIGZ1bmN0aW9uIGZsdXNoKGNhbGxiYWNrOiAoKSA9PiB2b2lkKSB7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB9KSlcbiAgICAgIC5waXBlPE5vZGVKUy5SZWFkV3JpdGVTdHJlYW0+KHppcChiYXNlbmFtZShkZXN0WmlwKSkpXG4gICAgICAucGlwZShndWxwLmRlc3QoZGlybmFtZShkZXN0WmlwKSkpXG4gICAgICAub24oJ2VuZCcsICgpID0+IHJlc29sdmUoKSlcbiAgICAgIC5vbignZXJyb3InLCBlcnIgPT4gcmVqZWN0KGVycikpO1xuICAgIH0pO1xuICAgIGNvbnNvbGUubG9nKCd6aXBwZWQnKTtcbiAgICB6aXBGaWxlT3JEaXIgPSBkZXN0WmlwO1xuICB9XG4gIHJldHVybiB6aXBGaWxlT3JEaXI7XG59XG5cbi8qKlxuICogZHJjcCBydW4gdHMvcmVtb3RlLWRlcGxveS50cyNmZXRjaEFsbFppcHMgLS1lbnYgdGVzdCAtYyBjb25mL3JlbW90ZS1kZXBsb3ktdGVzdC55YW1sXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaEFsbFppcHMoKSB7XG4gIGNvbnN0IGVudiA9IGFwaS5hcmd2LmVudjtcbiAgaWYgKGVudiA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGFyZ3VtZW50cyBcIi0tZW52IDxlbnZpcm9ubWVudD5cIicpO1xuICB9XG4gIGNvbnN0IGluc3RhbGxEaXIgPSByZXNvbHZlKCdpbnN0YWxsLScgKyBlbnYpO1xuXG4gIGlmICghZnMuZXhpc3RzU3luYyhpbnN0YWxsRGlyKSlcbiAgICBmcy5ta2RpcnBTeW5jKGluc3RhbGxEaXIpO1xuICBjb25zdCBpbWFwID0gbmV3IEltYXBNYW5hZ2VyKGVudiwgaW5zdGFsbERpcik7XG4gIGF3YWl0IGltYXAuZmV0Y2hDaGVja3N1bSgpO1xuICBhd2FpdCBpbWFwLmZldGNoT3RoZXJaaXBzKCcnKTtcbn1cbiJdfQ==
