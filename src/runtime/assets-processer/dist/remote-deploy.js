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
        let { env, src, buildStaticOnly } = __api_1.default.argv;
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
            const zipFile = yield checkZipFile(src, installDir, appName);
            yield imap.sendFileAndUpdatedChecksum(appName, zipFile);
        }
        else {
            yield imap.fetchChecksum();
        }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL3JlbW90ZS1kZXBsb3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkJBQTZCO0FBQzdCLGdFQUEwQjtBQUUxQiwrQkFBa0Q7QUFDbEQsK0JBQTBDO0FBQzFDLDhDQUF3RDtBQUN4RCwwREFBd0I7QUFDeEIsMkRBQWtEO0FBQ2xELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQzVFLDJDQUEyQztBQUMzQyw0Q0FBNEM7QUFDNUMsNkNBQTZDO0FBQzdDLHFCQUFxQjtBQUNyQixNQUFNO0FBRU4sNENBQTRDO0FBQzVDLDRDQUE0QztBQUM1Qyw4Q0FBOEM7QUFDOUMscUJBQXFCO0FBQ3JCLE1BQU07QUFFTixTQUFnQixJQUFJO0lBQ2hCLFlBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUM3QyxzQkFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2YsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNkLE9BQU8sWUFBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFHLENBQUMsR0FBRyxFQUFFO1lBQy9CLE1BQU0sR0FBRyxDQUFDO1FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNOLENBQUMsQ0FBQyxFQUNGLGlCQUFLLENBQUMsQ0FBQyxDQUFDLENBQ1AsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUNsQixDQUFDO0FBVkQsb0JBVUM7QUFFRCxTQUFlLG1CQUFtQjs7UUFDaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQ3ZDLElBQUksRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBQyxHQUFHLGVBQUcsQ0FBQyxJQUFJLENBQUM7UUFDM0MsSUFBSSxPQUEyQixDQUFDO1FBQ2hDLElBQUksZUFBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDcEIsT0FBTyxHQUFHLGVBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1NBQzVCO1FBRUQsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFO1lBQ2YsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLEVBQUUsZUFBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3BELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEIsT0FBTztTQUNSO1FBQ0QsTUFBTSxVQUFVLEdBQUcsY0FBTyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsQ0FBQztRQUU3QyxJQUFJLENBQUMsa0JBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO1lBQzVCLGtCQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzVCLE1BQU0sSUFBSSxHQUFHLElBQUksK0JBQVcsQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFOUMsSUFBSSxPQUFPLEVBQUU7WUFDWCxNQUFNLE9BQU8sR0FBRyxNQUFNLFlBQVksQ0FBQyxHQUFHLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzdELE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztTQUN6RDthQUFNO1lBQ0wsTUFBTSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7U0FDNUI7UUFFRCxJQUFJLGVBQWUsS0FBSyxPQUFPLEVBQUU7WUFDL0IsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ3BDO0lBQ0gsQ0FBQztDQUFBO0FBRUQsU0FBZSxZQUFZLENBQUMsWUFBb0IsRUFBRSxVQUFrQixFQUFFLE9BQWU7O1FBRW5GLFlBQVksR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDLGNBQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBTyxDQUFDLFVBQVUsRUFBRSxHQUFHLE9BQU8sTUFBTSxDQUFDLENBQUM7UUFFNUYsSUFBSSxDQUFDLGtCQUFFLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxFQUFFO1lBQ2hDLE9BQU8sQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDckQsTUFBTSxJQUFJLEtBQUssQ0FBQyxHQUFHLFlBQVksWUFBWSxDQUFDLENBQUM7U0FDOUM7UUFDRCxJQUFJLGtCQUFFLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFFO1lBQzNDLE1BQU0sT0FBTyxHQUFHLGNBQU8sQ0FBQyxVQUFVLEVBQUUsR0FBRyxPQUFPLE1BQU0sQ0FBQyxDQUFDO1lBQ3RELE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxZQUFZLGlDQUFpQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZFLE1BQU0sSUFBSSxHQUFpQixPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDM0MsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3JDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUVoQyxNQUFNLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO2dCQUNwQyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUM7cUJBQy9CLElBQUksQ0FDSCxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVMsSUFBUyxFQUFFLFFBQWdCLEVBQUUsRUFBNEI7b0JBQzdFLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUN6QyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNuQixDQUFDLEVBQUUsU0FBUyxLQUFLLENBQUMsUUFBb0I7b0JBQ3BDLFFBQVEsRUFBRSxDQUFDO2dCQUNiLENBQUMsQ0FBQyxDQUFDO3FCQUNGLElBQUksQ0FBeUIsR0FBRyxDQUFDLGVBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO3FCQUNwRCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztxQkFDakMsRUFBRSxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztxQkFDMUIsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ25DLENBQUMsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN0QixZQUFZLEdBQUcsT0FBTyxDQUFDO1NBQ3hCO1FBQ0QsT0FBTyxZQUFZLENBQUM7SUFDdEIsQ0FBQztDQUFBO0FBRUQ7O0dBRUc7QUFDSCxTQUFzQixZQUFZOztRQUNoQyxNQUFNLEdBQUcsR0FBRyxlQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUN6QixJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7WUFDZixNQUFNLElBQUksS0FBSyxDQUFDLHlDQUF5QyxDQUFDLENBQUM7U0FDNUQ7UUFDRCxNQUFNLFVBQVUsR0FBRyxjQUFPLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBRTdDLElBQUksQ0FBQyxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7WUFDNUIsa0JBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDNUIsTUFBTSxJQUFJLEdBQUcsSUFBSSwrQkFBVyxDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUM5QyxNQUFNLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUMzQixNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDaEMsQ0FBQztDQUFBO0FBWkQsb0NBWUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9yZW1vdGUtZGVwbG95LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG5vLWNvbnNvbGVcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgX2d1bHAgZnJvbSAnZ3VscCc7XG5pbXBvcnQgeyBiYXNlbmFtZSwgZGlybmFtZSwgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZGVmZXIsIGZyb20sIHRpbWVyIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBjYXRjaEVycm9yLCBtYXAsIHJldHJ5IH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyBJbWFwTWFuYWdlciB9IGZyb20gJy4vZmV0Y2gtcmVtb3RlLWltYXAnO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcucmVtb3RlLWRlcGxveScpO1xuLy8gcHJvY2Vzcy5vbigndW5jYXVnaHRFeGNlcHRpb24nLCBlcnIgPT4ge1xuLy8gICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbi8vICAgY29uc29sZS5lcnJvcigndW5jYXVnaHRFeGNlcHRpb24nLCBlcnIpO1xuLy8gICBwcm9jZXNzLmV4aXQoMSk7XG4vLyB9KTtcblxuLy8gcHJvY2Vzcy5vbigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXJyID0+IHtcbi8vICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4vLyAgIGNvbnNvbGUuZXJyb3IoJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVycik7XG4vLyAgIHByb2Nlc3MuZXhpdCgxKTtcbi8vIH0pO1xuXG5leHBvcnQgZnVuY3Rpb24gbWFpbigpIHtcbiAgICBkZWZlcigoKSA9PiBmcm9tKG1haWxEZXBsb3lTdGF0aWNSZXMoKSkpLnBpcGUoXG4gICAgY2F0Y2hFcnJvcihlcnIgPT4ge1xuICAgICAgbG9nLndhcm4oZXJyKTtcbiAgICAgIHJldHVybiB0aW1lcigxMDAwKS5waXBlKG1hcCgoKSA9PiB7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH0pKTtcbiAgICB9KSxcbiAgICByZXRyeSgzKVxuICAgICkuc3Vic2NyaWJlKCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIG1haWxEZXBsb3lTdGF0aWNSZXMoKSB7XG4gIGNvbnNvbGUubG9nKCdSZW1vdGUgZGVwbG95IChtYWlsKS4uLicpO1xuICBsZXQge2Vudiwgc3JjLCBidWlsZFN0YXRpY09ubHl9ID0gYXBpLmFyZ3Y7XG4gIGxldCBhcHBOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGlmIChhcGkuYXJndi5hcHBOYW1lKSB7XG4gICAgYXBwTmFtZSA9IGFwaS5hcmd2LmFwcE5hbWU7XG4gIH1cblxuICBpZiAoZW52ID09IG51bGwpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnbWlzc2luZyBjb21tYW5kIGFyZ3VtZW50cywnLCBhcGkuYXJndik7XG4gICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBpbnN0YWxsRGlyID0gcmVzb2x2ZSgnaW5zdGFsbC0nICsgZW52KTtcblxuICBpZiAoIWZzLmV4aXN0c1N5bmMoaW5zdGFsbERpcikpXG4gICAgZnMubWtkaXJwU3luYyhpbnN0YWxsRGlyKTtcbiAgY29uc3QgaW1hcCA9IG5ldyBJbWFwTWFuYWdlcihlbnYsIGluc3RhbGxEaXIpO1xuXG4gIGlmIChhcHBOYW1lKSB7XG4gICAgY29uc3QgemlwRmlsZSA9IGF3YWl0IGNoZWNrWmlwRmlsZShzcmMsIGluc3RhbGxEaXIsIGFwcE5hbWUpO1xuICAgIGF3YWl0IGltYXAuc2VuZEZpbGVBbmRVcGRhdGVkQ2hlY2tzdW0oYXBwTmFtZSwgemlwRmlsZSk7XG4gIH0gZWxzZSB7XG4gICAgYXdhaXQgaW1hcC5mZXRjaENoZWNrc3VtKCk7XG4gIH1cblxuICBpZiAoYnVpbGRTdGF0aWNPbmx5ID09PSAnZmFsc2UnKSB7XG4gICAgYXdhaXQgaW1hcC5mZXRjaE90aGVyWmlwcyhhcHBOYW1lKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBjaGVja1ppcEZpbGUoemlwRmlsZU9yRGlyOiBzdHJpbmcsIGluc3RhbGxEaXI6IHN0cmluZywgYXBwTmFtZTogc3RyaW5nKSB7XG5cbiAgemlwRmlsZU9yRGlyID0gemlwRmlsZU9yRGlyID8gcmVzb2x2ZSh6aXBGaWxlT3JEaXIpIDogcmVzb2x2ZShpbnN0YWxsRGlyLCBgJHthcHBOYW1lfS56aXBgKTtcblxuICBpZiAoIWZzLmV4aXN0c1N5bmMoemlwRmlsZU9yRGlyKSkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1xcbiVzIG5vdCBleGlzdCwgcXVpdCEnLCB6aXBGaWxlT3JEaXIpO1xuICAgIHRocm93IG5ldyBFcnJvcihgJHt6aXBGaWxlT3JEaXJ9IG5vdCBleGlzdGApO1xuICB9XG4gIGlmIChmcy5zdGF0U3luYyh6aXBGaWxlT3JEaXIpLmlzRGlyZWN0b3J5KCkpIHtcbiAgICBjb25zdCBkZXN0WmlwID0gcmVzb2x2ZShpbnN0YWxsRGlyLCBgJHthcHBOYW1lfS56aXBgKTtcbiAgICBjb25zb2xlLmxvZyhgJHt6aXBGaWxlT3JEaXJ9IGlzIGEgZGlyZWN0b3J5LCB6aXBwaW5nIGludG8gJHtkZXN0WmlwfWApO1xuICAgIGNvbnN0IGd1bHA6IHR5cGVvZiBfZ3VscCA9IHJlcXVpcmUoJ2d1bHAnKTtcbiAgICBjb25zdCB0aHJvdWdoMiA9IHJlcXVpcmUoJ3Rocm91Z2gyJyk7XG4gICAgY29uc3QgemlwID0gcmVxdWlyZSgnZ3VscC16aXAnKTtcblxuICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGd1bHAuc3JjKHppcEZpbGVPckRpciArICcvKiovKicpXG4gICAgICAucGlwZTxOb2RlSlMuUmVhZFdyaXRlU3RyZWFtPihcbiAgICAgICAgdGhyb3VnaDIub2JqKGZ1bmN0aW9uKGZpbGU6IGFueSwgZW5jb2Rpbmc6IHN0cmluZywgY2I6ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCctIHppcCBjb250ZW50OicsIGZpbGUucGF0aCk7XG4gICAgICAgICAgY2IobnVsbCwgZmlsZSk7XG4gICAgICB9LCBmdW5jdGlvbiBmbHVzaChjYWxsYmFjazogKCkgPT4gdm9pZCkge1xuICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgfSkpXG4gICAgICAucGlwZTxOb2RlSlMuUmVhZFdyaXRlU3RyZWFtPih6aXAoYmFzZW5hbWUoZGVzdFppcCkpKVxuICAgICAgLnBpcGUoZ3VscC5kZXN0KGRpcm5hbWUoZGVzdFppcCkpKVxuICAgICAgLm9uKCdlbmQnLCAoKSA9PiByZXNvbHZlKCkpXG4gICAgICAub24oJ2Vycm9yJywgZXJyID0+IHJlamVjdChlcnIpKTtcbiAgICB9KTtcbiAgICBjb25zb2xlLmxvZygnemlwcGVkJyk7XG4gICAgemlwRmlsZU9yRGlyID0gZGVzdFppcDtcbiAgfVxuICByZXR1cm4gemlwRmlsZU9yRGlyO1xufVxuXG4vKipcbiAqIGRyY3AgcnVuIHRzL3JlbW90ZS1kZXBsb3kudHMjZmV0Y2hBbGxaaXBzIC0tZW52IHRlc3QgLWMgY29uZi9yZW1vdGUtZGVwbG95LXRlc3QueWFtbFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmV0Y2hBbGxaaXBzKCkge1xuICBjb25zdCBlbnYgPSBhcGkuYXJndi5lbnY7XG4gIGlmIChlbnYgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBhcmd1bWVudHMgXCItLWVudiA8ZW52aXJvbm1lbnQ+XCInKTtcbiAgfVxuICBjb25zdCBpbnN0YWxsRGlyID0gcmVzb2x2ZSgnaW5zdGFsbC0nICsgZW52KTtcblxuICBpZiAoIWZzLmV4aXN0c1N5bmMoaW5zdGFsbERpcikpXG4gICAgZnMubWtkaXJwU3luYyhpbnN0YWxsRGlyKTtcbiAgY29uc3QgaW1hcCA9IG5ldyBJbWFwTWFuYWdlcihlbnYsIGluc3RhbGxEaXIpO1xuICBhd2FpdCBpbWFwLmZldGNoQ2hlY2tzdW0oKTtcbiAgYXdhaXQgaW1hcC5mZXRjaE90aGVyWmlwcygnJyk7XG59XG4iXX0=
