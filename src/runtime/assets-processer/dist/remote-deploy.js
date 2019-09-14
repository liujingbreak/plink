"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable: no-console
const fetch_remote_imap_1 = require("./fetch-remote-imap");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = require("path");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const __api_1 = tslib_1.__importDefault(require("__api"));
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
        let { env, configName, zipFile, buildStaticOnly } = __api_1.default.argv;
        if (env == null || configName == null) {
            // tslint:disable-next-line: no-console
            console.log('missing command arguments,', __api_1.default.argv);
            process.exit(1);
            return;
        }
        zipFile = yield checkZipFile(zipFile);
        const imap = new fetch_remote_imap_1.ImapManager(env);
        yield imap.sendFileAndUpdatedChecksum(configName, zipFile);
        if (buildStaticOnly === 'false') {
            yield imap.fetchOtherZips(configName);
        }
    });
}
function checkZipFile(zipFile) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const defaultZip = path_1.resolve(__dirname, '../webui-static.zip');
        zipFile = zipFile ? path_1.resolve(zipFile) : path_1.resolve(__dirname, '../webui-static.zip');
        if (!fs_extra_1.default.existsSync(zipFile)) {
            console.error('\n%s not exist, quit!', zipFile);
            throw new Error(`${zipFile} not exist`);
        }
        if (fs_extra_1.default.statSync(zipFile).isDirectory()) {
            console.log(`${zipFile} is a directory, zipping into ${defaultZip}`);
            const gulp = require('gulp');
            const through2 = require('through2');
            const zip = require('gulp-zip');
            yield new Promise((resolve, reject) => {
                gulp.src(zipFile + '/**/*')
                    .pipe(through2.obj(function (file, encoding, cb) {
                    console.log('- zip content:', file.path);
                    cb(null, file);
                }, function flush(callback) {
                    callback();
                }))
                    .pipe(zip(path_1.basename(defaultZip)))
                    .pipe(gulp.dest(path_1.dirname(defaultZip)))
                    .on('end', () => resolve())
                    .on('error', err => reject(err));
            });
            console.log('zipped');
            zipFile = defaultZip;
        }
        return zipFile;
    });
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL3JlbW90ZS1kZXBsb3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkJBQTZCO0FBQzdCLDJEQUFrRDtBQUNsRCxnRUFBMEI7QUFFMUIsK0JBQWtEO0FBQ2xELCtCQUEwQztBQUMxQyw4Q0FBNEU7QUFDNUUsMERBQXdCO0FBQ3hCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQzVFLDJDQUEyQztBQUMzQyw0Q0FBNEM7QUFDNUMsNkNBQTZDO0FBQzdDLHFCQUFxQjtBQUNyQixNQUFNO0FBRU4sNENBQTRDO0FBQzVDLDRDQUE0QztBQUM1Qyw4Q0FBOEM7QUFDOUMscUJBQXFCO0FBQ3JCLE1BQU07QUFFTixTQUFnQixJQUFJO0lBQ2hCLFlBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUM3QyxzQkFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2YsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNkLE9BQU8sWUFBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFHLENBQUMsR0FBRyxFQUFFO1lBQy9CLE1BQU0sR0FBRyxDQUFDO1FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNOLENBQUMsQ0FBQyxFQUNGLGlCQUFLLENBQUMsQ0FBQyxDQUFDLENBQ1AsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUNsQixDQUFDO0FBVkQsb0JBVUM7QUFFRCxTQUFlLG1CQUFtQjs7UUFDaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQ3ZDLElBQUksRUFBQyxHQUFHLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUMsR0FB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LENBQUM7SUFDakIsQ0FBQztDQUFBIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvcmVtb3RlLWRlcGxveS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlXG5pbXBvcnQgeyBJbWFwTWFuYWdlciB9IGZyb20gJy4vZmV0Y2gtcmVtb3RlLWltYXAnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfZ3VscCBmcm9tICdndWxwJztcbmltcG9ydCB7IGJhc2VuYW1lLCBkaXJuYW1lLCByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyB0aW1lciwgZGVmZXIsIGZyb20gfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGNhdGNoRXJyb3IsIG1hcCwgcmV0cnksIHNraXAsIHRha2UsIGZpbHRlciB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcucmVtb3RlLWRlcGxveScpO1xuLy8gcHJvY2Vzcy5vbigndW5jYXVnaHRFeGNlcHRpb24nLCBlcnIgPT4ge1xuLy8gICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbi8vICAgY29uc29sZS5lcnJvcigndW5jYXVnaHRFeGNlcHRpb24nLCBlcnIpO1xuLy8gICBwcm9jZXNzLmV4aXQoMSk7XG4vLyB9KTtcblxuLy8gcHJvY2Vzcy5vbigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXJyID0+IHtcbi8vICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4vLyAgIGNvbnNvbGUuZXJyb3IoJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVycik7XG4vLyAgIHByb2Nlc3MuZXhpdCgxKTtcbi8vIH0pO1xuXG5leHBvcnQgZnVuY3Rpb24gbWFpbigpIHtcbiAgICBkZWZlcigoKSA9PiBmcm9tKG1haWxEZXBsb3lTdGF0aWNSZXMoKSkpLnBpcGUoXG4gICAgY2F0Y2hFcnJvcihlcnIgPT4ge1xuICAgICAgbG9nLndhcm4oZXJyKTtcbiAgICAgIHJldHVybiB0aW1lcigxMDAwKS5waXBlKG1hcCgoKSA9PiB7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH0pKTtcbiAgICB9KSxcbiAgICByZXRyeSgzKVxuICAgICkuc3Vic2NyaWJlKCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIG1haWxEZXBsb3lTdGF0aWNSZXMoKSB7XG4gIGNvbnNvbGUubG9nKCdSZW1vdGUgZGVwbG95IChtYWlsKS4uLicpO1xuICBsZXQge2VudiwgY29uZmlnTmFtZSwgemlwRmlsZSwgYnVpbGRTdGF0aWNPbmx5fSA9IGFwaS5hcmd2O1xuXG4gIGlmIChlbnYgPT0gbnVsbCB8fCBjb25maWdOYW1lID09IG51bGwpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnbWlzc2luZyBjb21tYW5kIGFyZ3VtZW50cywnLCBhcGkuYXJndik7XG4gICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHppcEZpbGUgPSBhd2FpdCBjaGVja1ppcEZpbGUoemlwRmlsZSk7XG5cbiAgY29uc3QgaW1hcCA9IG5ldyBJbWFwTWFuYWdlcihlbnYpO1xuICBhd2FpdCBpbWFwLnNlbmRGaWxlQW5kVXBkYXRlZENoZWNrc3VtKGNvbmZpZ05hbWUsIHppcEZpbGUpO1xuXG4gIGlmIChidWlsZFN0YXRpY09ubHkgPT09ICdmYWxzZScpIHtcbiAgICBhd2FpdCBpbWFwLmZldGNoT3RoZXJaaXBzKGNvbmZpZ05hbWUpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNoZWNrWmlwRmlsZSh6aXBGaWxlOiBzdHJpbmcpIHtcbiAgY29uc3QgZGVmYXVsdFppcCA9IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vd2VidWktc3RhdGljLnppcCcpO1xuXG4gIHppcEZpbGUgPSB6aXBGaWxlID8gcmVzb2x2ZSh6aXBGaWxlKSA6IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vd2VidWktc3RhdGljLnppcCcpO1xuXG4gIGlmICghZnMuZXhpc3RzU3luYyh6aXBGaWxlKSkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1xcbiVzIG5vdCBleGlzdCwgcXVpdCEnLCB6aXBGaWxlKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYCR7emlwRmlsZX0gbm90IGV4aXN0YCk7XG4gIH1cbiAgaWYgKGZzLnN0YXRTeW5jKHppcEZpbGUpLmlzRGlyZWN0b3J5KCkpIHtcbiAgICBjb25zb2xlLmxvZyhgJHt6aXBGaWxlfSBpcyBhIGRpcmVjdG9yeSwgemlwcGluZyBpbnRvICR7ZGVmYXVsdFppcH1gKTtcbiAgICBjb25zdCBndWxwOiB0eXBlb2YgX2d1bHAgPSByZXF1aXJlKCdndWxwJyk7XG4gICAgY29uc3QgdGhyb3VnaDIgPSByZXF1aXJlKCd0aHJvdWdoMicpO1xuICAgIGNvbnN0IHppcCA9IHJlcXVpcmUoJ2d1bHAtemlwJyk7XG5cbiAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBndWxwLnNyYyh6aXBGaWxlICsgJy8qKi8qJylcbiAgICAgIC5waXBlPE5vZGVKUy5SZWFkV3JpdGVTdHJlYW0+KFxuICAgICAgICB0aHJvdWdoMi5vYmooZnVuY3Rpb24oZmlsZTogYW55LCBlbmNvZGluZzogc3RyaW5nLCBjYjogKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJy0gemlwIGNvbnRlbnQ6JywgZmlsZS5wYXRoKTtcbiAgICAgICAgICBjYihudWxsLCBmaWxlKTtcbiAgICAgIH0sIGZ1bmN0aW9uIGZsdXNoKGNhbGxiYWNrOiAoKSA9PiB2b2lkKSB7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB9KSlcbiAgICAgIC5waXBlPE5vZGVKUy5SZWFkV3JpdGVTdHJlYW0+KHppcChiYXNlbmFtZShkZWZhdWx0WmlwKSkpXG4gICAgICAucGlwZShndWxwLmRlc3QoZGlybmFtZShkZWZhdWx0WmlwKSkpXG4gICAgICAub24oJ2VuZCcsICgpID0+IHJlc29sdmUoKSlcbiAgICAgIC5vbignZXJyb3InLCBlcnIgPT4gcmVqZWN0KGVycikpO1xuICAgIH0pO1xuICAgIGNvbnNvbGUubG9nKCd6aXBwZWQnKTtcbiAgICB6aXBGaWxlID0gZGVmYXVsdFppcDtcbiAgfVxuICByZXR1cm4gemlwRmlsZTtcbn1cbiJdfQ==
