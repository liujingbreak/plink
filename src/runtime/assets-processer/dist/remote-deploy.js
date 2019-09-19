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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL3JlbW90ZS1kZXBsb3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkJBQTZCO0FBQzdCLGdFQUEwQjtBQUUxQiwrQkFBa0Q7QUFDbEQsK0JBQTBDO0FBQzFDLDhDQUF3RDtBQUN4RCwwREFBd0I7QUFDeEIsMkRBQWtEO0FBQ2xELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQzVFLDJDQUEyQztBQUMzQyw0Q0FBNEM7QUFDNUMsNkNBQTZDO0FBQzdDLHFCQUFxQjtBQUNyQixNQUFNO0FBRU4sNENBQTRDO0FBQzVDLDRDQUE0QztBQUM1Qyw4Q0FBOEM7QUFDOUMscUJBQXFCO0FBQ3JCLE1BQU07QUFFTixTQUFnQixJQUFJO0lBQ2hCLFlBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUM3QyxzQkFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2YsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNkLE9BQU8sWUFBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFHLENBQUMsR0FBRyxFQUFFO1lBQy9CLE1BQU0sR0FBRyxDQUFDO1FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNOLENBQUMsQ0FBQyxFQUNGLGlCQUFLLENBQUMsQ0FBQyxDQUFDLENBQ1AsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUNsQixDQUFDO0FBVkQsb0JBVUM7QUFFRCxTQUFlLG1CQUFtQjs7UUFDaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQ3ZDLElBQUksRUFBQyxHQUFHLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUMsR0FB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LENBQUM7SUFDakIsQ0FBQztDQUFBIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvcmVtb3RlLWRlcGxveS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlXG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF9ndWxwIGZyb20gJ2d1bHAnO1xuaW1wb3J0IHsgYmFzZW5hbWUsIGRpcm5hbWUsIHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IGRlZmVyLCBmcm9tLCB0aW1lciB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgY2F0Y2hFcnJvciwgbWFwLCByZXRyeSB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHsgSW1hcE1hbmFnZXIgfSBmcm9tICcuL2ZldGNoLXJlbW90ZS1pbWFwJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLnJlbW90ZS1kZXBsb3knKTtcbi8vIHByb2Nlc3Mub24oJ3VuY2F1Z2h0RXhjZXB0aW9uJywgZXJyID0+IHtcbi8vICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4vLyAgIGNvbnNvbGUuZXJyb3IoJ3VuY2F1Z2h0RXhjZXB0aW9uJywgZXJyKTtcbi8vICAgcHJvY2Vzcy5leGl0KDEpO1xuLy8gfSk7XG5cbi8vIHByb2Nlc3Mub24oJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVyciA9PiB7XG4vLyAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuLy8gICBjb25zb2xlLmVycm9yKCd1bmhhbmRsZWRSZWplY3Rpb24nLCBlcnIpO1xuLy8gICBwcm9jZXNzLmV4aXQoMSk7XG4vLyB9KTtcblxuZXhwb3J0IGZ1bmN0aW9uIG1haW4oKSB7XG4gICAgZGVmZXIoKCkgPT4gZnJvbShtYWlsRGVwbG95U3RhdGljUmVzKCkpKS5waXBlKFxuICAgIGNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgIGxvZy53YXJuKGVycik7XG4gICAgICByZXR1cm4gdGltZXIoMTAwMCkucGlwZShtYXAoKCkgPT4ge1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9KSk7XG4gICAgfSksXG4gICAgcmV0cnkoMylcbiAgICApLnN1YnNjcmliZSgpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBtYWlsRGVwbG95U3RhdGljUmVzKCkge1xuICBjb25zb2xlLmxvZygnUmVtb3RlIGRlcGxveSAobWFpbCkuLi4nKTtcbiAgbGV0IHtlbnYsIGNvbmZpZ05hbWUsIHppcEZpbGUsIGJ1aWxkU3RhdGljT25seX0gPSBhcGkuYXJndjtcblxuICBpZiAoZW52ID09IG51bGwgfHwgY29uZmlnTmFtZSA9PSBudWxsKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ21pc3NpbmcgY29tbWFuZCBhcmd1bWVudHMsJywgYXBpLmFyZ3YpO1xuICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICByZXR1cm47XG4gIH1cblxuICB6aXBGaWxlID0gYXdhaXQgY2hlY2taaXBGaWxlKHppcEZpbGUpO1xuXG4gIGNvbnN0IGltYXAgPSBuZXcgSW1hcE1hbmFnZXIoZW52KTtcbiAgYXdhaXQgaW1hcC5zZW5kRmlsZUFuZFVwZGF0ZWRDaGVja3N1bShjb25maWdOYW1lLCB6aXBGaWxlKTtcblxuICBpZiAoYnVpbGRTdGF0aWNPbmx5ID09PSAnZmFsc2UnKSB7XG4gICAgYXdhaXQgaW1hcC5mZXRjaE90aGVyWmlwcyhjb25maWdOYW1lKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBjaGVja1ppcEZpbGUoemlwRmlsZTogc3RyaW5nKSB7XG4gIGNvbnN0IGRlZmF1bHRaaXAgPSByZXNvbHZlKF9fZGlybmFtZSwgJy4uL3dlYnVpLXN0YXRpYy56aXAnKTtcblxuICB6aXBGaWxlID0gemlwRmlsZSA/IHJlc29sdmUoemlwRmlsZSkgOiByZXNvbHZlKF9fZGlybmFtZSwgJy4uL3dlYnVpLXN0YXRpYy56aXAnKTtcblxuICBpZiAoIWZzLmV4aXN0c1N5bmMoemlwRmlsZSkpIHtcbiAgICBjb25zb2xlLmVycm9yKCdcXG4lcyBub3QgZXhpc3QsIHF1aXQhJywgemlwRmlsZSk7XG4gICAgdGhyb3cgbmV3IEVycm9yKGAke3ppcEZpbGV9IG5vdCBleGlzdGApO1xuICB9XG4gIGlmIChmcy5zdGF0U3luYyh6aXBGaWxlKS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgY29uc29sZS5sb2coYCR7emlwRmlsZX0gaXMgYSBkaXJlY3RvcnksIHppcHBpbmcgaW50byAke2RlZmF1bHRaaXB9YCk7XG4gICAgY29uc3QgZ3VscDogdHlwZW9mIF9ndWxwID0gcmVxdWlyZSgnZ3VscCcpO1xuICAgIGNvbnN0IHRocm91Z2gyID0gcmVxdWlyZSgndGhyb3VnaDInKTtcbiAgICBjb25zdCB6aXAgPSByZXF1aXJlKCdndWxwLXppcCcpO1xuXG4gICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgZ3VscC5zcmMoemlwRmlsZSArICcvKiovKicpXG4gICAgICAucGlwZTxOb2RlSlMuUmVhZFdyaXRlU3RyZWFtPihcbiAgICAgICAgdGhyb3VnaDIub2JqKGZ1bmN0aW9uKGZpbGU6IGFueSwgZW5jb2Rpbmc6IHN0cmluZywgY2I6ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCctIHppcCBjb250ZW50OicsIGZpbGUucGF0aCk7XG4gICAgICAgICAgY2IobnVsbCwgZmlsZSk7XG4gICAgICB9LCBmdW5jdGlvbiBmbHVzaChjYWxsYmFjazogKCkgPT4gdm9pZCkge1xuICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgfSkpXG4gICAgICAucGlwZTxOb2RlSlMuUmVhZFdyaXRlU3RyZWFtPih6aXAoYmFzZW5hbWUoZGVmYXVsdFppcCkpKVxuICAgICAgLnBpcGUoZ3VscC5kZXN0KGRpcm5hbWUoZGVmYXVsdFppcCkpKVxuICAgICAgLm9uKCdlbmQnLCAoKSA9PiByZXNvbHZlKCkpXG4gICAgICAub24oJ2Vycm9yJywgZXJyID0+IHJlamVjdChlcnIpKTtcbiAgICB9KTtcbiAgICBjb25zb2xlLmxvZygnemlwcGVkJyk7XG4gICAgemlwRmlsZSA9IGRlZmF1bHRaaXA7XG4gIH1cbiAgcmV0dXJuIHppcEZpbGU7XG59XG4iXX0=
