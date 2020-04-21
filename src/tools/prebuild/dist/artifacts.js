"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const adm_zip_1 = tslib_1.__importDefault(require("adm-zip"));
const fs = tslib_1.__importStar(require("fs"));
const Path = tslib_1.__importStar(require("path"));
const _ = tslib_1.__importStar(require("lodash"));
// import boxen, {BorderStyle} from 'boxen';
const yazl_1 = require("yazl");
const moment_1 = tslib_1.__importDefault(require("moment"));
function listVersions(env) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const done = [];
        const dir = Path.resolve(`install-${env}`);
        const versions = new Map();
        for (const zipName of fs.readdirSync(dir)) {
            if (zipName.endsWith('.zip')) {
                const zip = new adm_zip_1.default(Path.join(dir, zipName));
                const app = _.trimEnd(zipName, '.zip');
                done.push(new Promise(resolve => {
                    zip.readAsTextAsync(app + '.githash-webui.txt', data => {
                        versions.set(app, data);
                        resolve();
                    });
                }));
            }
        }
        yield Promise.all(done);
        return versions;
    });
}
exports.listVersions = listVersions;
function listAllVersions() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const map = new Map();
        const done = fs.readdirSync(Path.resolve())
            .filter(dir => {
            return dir.startsWith('install-') && fs.statSync(Path.resolve(dir)).isDirectory();
        })
            .reduce((promises, dir) => {
            const env = /^install-([^]*)$/.exec(dir)[1];
            promises.push(listVersions(env).then(res => {
                map.set(env, res);
            }));
            return promises;
        }, []);
        yield Promise.all(done);
        return map;
    });
}
exports.listAllVersions = listAllVersions;
function stringifyListVersions(env) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const res = yield listVersions(env);
        let buf = '';
        for (const [app, githash] of res.entries()) {
            buf += ` ${env} - ${app}\n${githash}\n`;
            buf += '\n';
        }
        return buf;
    });
}
exports.stringifyListVersions = stringifyListVersions;
function stringifyListAllVersions() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const envMap = yield listAllVersions();
        let buf = '';
        for (const [env, appHash] of envMap.entries()) {
            for (const [app, githash] of appHash.entries()) {
                buf += `  ${env} - ${app}\n${githash}\n`;
                buf += '\n';
            }
        }
        return buf;
    });
}
exports.stringifyListAllVersions = stringifyListAllVersions;
function writeMockZip(writeTo, content) {
    const zipFile = new yazl_1.ZipFile();
    const prom = new Promise(resolve => {
        zipFile.outputStream.pipe(fs.createWriteStream(writeTo))
            .on('close', resolve);
    });
    const current = moment_1.default();
    const fileName = `fake-${current.format('YYMMDD')}-${current.format('HHmmss')}.txt`;
    zipFile.addBuffer(Buffer.from(content), fileName);
    zipFile.end({ forceZip64Format: false });
    return prom;
}
exports.writeMockZip = writeMockZip;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvYXJ0aWZhY3RzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDhEQUE2QjtBQUM3QiwrQ0FBeUI7QUFDekIsbURBQTZCO0FBQzdCLGtEQUE0QjtBQUM1Qiw0Q0FBNEM7QUFDNUMsK0JBQTZCO0FBQzdCLDREQUE0QjtBQUk1QixTQUFzQixZQUFZLENBQUMsR0FBVzs7UUFDNUMsTUFBTSxJQUFJLEdBQW9CLEVBQUUsQ0FBQztRQUNqQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUMzQyxNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUUzQyxLQUFLLE1BQU0sT0FBTyxJQUFJLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDekMsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUM1QixNQUFNLEdBQUcsR0FBRyxJQUFJLGlCQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDaEQsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBRXZDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQzlCLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxHQUFHLG9CQUFvQixFQUFFLElBQUksQ0FBQyxFQUFFO3dCQUNyRCxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQzt3QkFDeEIsT0FBTyxFQUFFLENBQUM7b0JBQ1osQ0FBQyxDQUFDLENBQUM7Z0JBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNMO1NBQ0Y7UUFDRCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDeEIsT0FBTyxRQUFRLENBQUM7SUFDbEIsQ0FBQztDQUFBO0FBcEJELG9DQW9CQztBQUVELFNBQXNCLGVBQWU7O1FBQ25DLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUEwRCxDQUFDO1FBQzlFLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2FBQzFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNaLE9BQU8sR0FBRyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNwRixDQUFDLENBQUM7YUFDRCxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDeEIsTUFBTSxHQUFHLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdDLFFBQVEsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDdkMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDcEIsQ0FBQyxDQUFDLENBQ0gsQ0FBQztZQUNGLE9BQU8sUUFBUSxDQUFDO1FBQ2xCLENBQUMsRUFBRSxFQUFxQixDQUFDLENBQUM7UUFFMUIsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztDQUFBO0FBakJELDBDQWlCQztBQUVELFNBQXNCLHFCQUFxQixDQUFDLEdBQVc7O1FBQ3JELE1BQU0sR0FBRyxHQUFHLE1BQU0sWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BDLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNiLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsSUFBSSxHQUFHLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDMUMsR0FBRyxJQUFJLElBQUksR0FBRyxNQUFNLEdBQUcsS0FBSyxPQUFPLElBQUksQ0FBQztZQUN4QyxHQUFHLElBQUksSUFBSSxDQUFDO1NBQ2I7UUFDRCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7Q0FBQTtBQVJELHNEQVFDO0FBRUQsU0FBc0Isd0JBQXdCOztRQUM1QyxNQUFNLE1BQU0sR0FBRyxNQUFNLGVBQWUsRUFBRSxDQUFDO1FBQ3ZDLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNiLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDN0MsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDOUMsR0FBRyxJQUFJLEtBQUssR0FBRyxNQUFNLEdBQUcsS0FBSyxPQUFPLElBQUksQ0FBQztnQkFDekMsR0FBRyxJQUFJLElBQUksQ0FBQzthQUNiO1NBQ0Y7UUFDRCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7Q0FBQTtBQVZELDREQVVDO0FBRUQsU0FBZ0IsWUFBWSxDQUFDLE9BQWUsRUFBRSxPQUFlO0lBQzNELE1BQU0sT0FBTyxHQUFHLElBQUksY0FBTyxFQUFFLENBQUM7SUFDOUIsTUFBTSxJQUFJLEdBQUcsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDakMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ3ZELEVBQUUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDeEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxNQUFNLE9BQU8sR0FBRyxnQkFBTSxFQUFFLENBQUM7SUFDekIsTUFBTSxRQUFRLEdBQUcsUUFBUSxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztJQUVwRixPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDbEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFDLGdCQUFnQixFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7SUFDdkMsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBYkQsb0NBYUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Biay9wcmVidWlsZC9kaXN0L2FydGlmYWN0cy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBBZG1aaXAgZnJvbSAnYWRtLXppcCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0IGJveGVuLCB7Qm9yZGVyU3R5bGV9IGZyb20gJ2JveGVuJztcbmltcG9ydCB7WmlwRmlsZX0gZnJvbSAneWF6bCc7XG5pbXBvcnQgbW9tZW50IGZyb20gJ21vbWVudCc7XG5cbnR5cGUgVW5wYWNrUHJvbWlzZTxQPiA9IFAgZXh0ZW5kcyBQcm9taXNlPGluZmVyIFQ+ID8gVCA6IHVua25vd247XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsaXN0VmVyc2lvbnMoZW52OiBzdHJpbmcpIHtcbiAgY29uc3QgZG9uZTogUHJvbWlzZTx2b2lkPltdID0gW107XG4gIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShgaW5zdGFsbC0ke2Vudn1gKTtcbiAgY29uc3QgdmVyc2lvbnMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuXG4gIGZvciAoY29uc3QgemlwTmFtZSBvZiBmcy5yZWFkZGlyU3luYyhkaXIpKSB7XG4gICAgaWYgKHppcE5hbWUuZW5kc1dpdGgoJy56aXAnKSkge1xuICAgICAgY29uc3QgemlwID0gbmV3IEFkbVppcChQYXRoLmpvaW4oZGlyLCB6aXBOYW1lKSk7XG4gICAgICBjb25zdCBhcHAgPSBfLnRyaW1FbmQoemlwTmFtZSwgJy56aXAnKTtcblxuICAgICAgZG9uZS5wdXNoKG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICB6aXAucmVhZEFzVGV4dEFzeW5jKGFwcCArICcuZ2l0aGFzaC13ZWJ1aS50eHQnLCBkYXRhID0+IHtcbiAgICAgICAgICB2ZXJzaW9ucy5zZXQoYXBwLCBkYXRhKTtcbiAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSkpO1xuICAgIH1cbiAgfVxuICBhd2FpdCBQcm9taXNlLmFsbChkb25lKTtcbiAgcmV0dXJuIHZlcnNpb25zO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbGlzdEFsbFZlcnNpb25zKCkge1xuICBjb25zdCBtYXAgPSBuZXcgTWFwPHN0cmluZywgVW5wYWNrUHJvbWlzZTxSZXR1cm5UeXBlPHR5cGVvZiBsaXN0VmVyc2lvbnM+Pj4oKTtcbiAgY29uc3QgZG9uZSA9IGZzLnJlYWRkaXJTeW5jKFBhdGgucmVzb2x2ZSgpKVxuICAuZmlsdGVyKGRpciA9PiB7XG4gICAgcmV0dXJuIGRpci5zdGFydHNXaXRoKCdpbnN0YWxsLScpICYmIGZzLnN0YXRTeW5jKFBhdGgucmVzb2x2ZShkaXIpKS5pc0RpcmVjdG9yeSgpO1xuICB9KVxuICAucmVkdWNlKChwcm9taXNlcywgZGlyKSA9PiB7XG4gICAgY29uc3QgZW52ID0gL15pbnN0YWxsLShbXl0qKSQvLmV4ZWMoZGlyKSFbMV07XG4gICAgcHJvbWlzZXMucHVzaChsaXN0VmVyc2lvbnMoZW52KS50aGVuKHJlcyA9PiB7XG4gICAgICAgIG1hcC5zZXQoZW52LCByZXMpO1xuICAgICAgfSlcbiAgICApO1xuICAgIHJldHVybiBwcm9taXNlcztcbiAgfSwgW10gYXMgUHJvbWlzZTx2b2lkPltdKTtcblxuICBhd2FpdCBQcm9taXNlLmFsbChkb25lKTtcbiAgcmV0dXJuIG1hcDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN0cmluZ2lmeUxpc3RWZXJzaW9ucyhlbnY6IHN0cmluZykge1xuICBjb25zdCByZXMgPSBhd2FpdCBsaXN0VmVyc2lvbnMoZW52KTtcbiAgbGV0IGJ1ZiA9ICcnO1xuICBmb3IgKGNvbnN0IFthcHAsIGdpdGhhc2hdIG9mIHJlcy5lbnRyaWVzKCkpIHtcbiAgICBidWYgKz0gYCAke2Vudn0gLSAke2FwcH1cXG4ke2dpdGhhc2h9XFxuYDtcbiAgICBidWYgKz0gJ1xcbic7XG4gIH1cbiAgcmV0dXJuIGJ1Zjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN0cmluZ2lmeUxpc3RBbGxWZXJzaW9ucygpIHtcbiAgY29uc3QgZW52TWFwID0gYXdhaXQgbGlzdEFsbFZlcnNpb25zKCk7XG4gIGxldCBidWYgPSAnJztcbiAgZm9yIChjb25zdCBbZW52LCBhcHBIYXNoXSBvZiBlbnZNYXAuZW50cmllcygpKSB7XG4gICAgZm9yIChjb25zdCBbYXBwLCBnaXRoYXNoXSBvZiBhcHBIYXNoLmVudHJpZXMoKSkge1xuICAgICAgYnVmICs9IGAgICR7ZW52fSAtICR7YXBwfVxcbiR7Z2l0aGFzaH1cXG5gO1xuICAgICAgYnVmICs9ICdcXG4nO1xuICAgIH1cbiAgfVxuICByZXR1cm4gYnVmO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVNb2NrWmlwKHdyaXRlVG86IHN0cmluZywgY29udGVudDogc3RyaW5nKSB7XG4gIGNvbnN0IHppcEZpbGUgPSBuZXcgWmlwRmlsZSgpO1xuICBjb25zdCBwcm9tID0gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgemlwRmlsZS5vdXRwdXRTdHJlYW0ucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbSh3cml0ZVRvKSlcbiAgICAub24oJ2Nsb3NlJywgcmVzb2x2ZSk7XG4gIH0pO1xuXG4gIGNvbnN0IGN1cnJlbnQgPSBtb21lbnQoKTtcbiAgY29uc3QgZmlsZU5hbWUgPSBgZmFrZS0ke2N1cnJlbnQuZm9ybWF0KCdZWU1NREQnKX0tJHtjdXJyZW50LmZvcm1hdCgnSEhtbXNzJyl9LnR4dGA7XG5cbiAgemlwRmlsZS5hZGRCdWZmZXIoQnVmZmVyLmZyb20oY29udGVudCksIGZpbGVOYW1lKTtcbiAgemlwRmlsZS5lbmQoe2ZvcmNlWmlwNjRGb3JtYXQ6IGZhbHNlfSk7XG4gIHJldHVybiBwcm9tO1xufVxuXG4iXX0=
