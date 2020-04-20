"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const adm_zip_1 = tslib_1.__importDefault(require("adm-zip"));
const fs = tslib_1.__importStar(require("fs"));
const Path = tslib_1.__importStar(require("path"));
const _ = tslib_1.__importStar(require("lodash"));
const boxen_1 = tslib_1.__importStar(require("boxen"));
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
            buf += boxen_1.default(` ${env} - ${app}\n${githash}\n`, { margin: 1, borderStyle: "round" /* Round */ });
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
                buf += boxen_1.default(`  ${env} - ${app}\n${githash}\n`, { margin: 1, borderStyle: "round" /* Round */ });
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
    zipFile.end();
    return prom;
}
exports.writeMockZip = writeMockZip;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvYXJ0aWZhY3RzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDhEQUE2QjtBQUM3QiwrQ0FBeUI7QUFDekIsbURBQTZCO0FBQzdCLGtEQUE0QjtBQUM1Qix1REFBeUM7QUFDekMsK0JBQTZCO0FBQzdCLDREQUE0QjtBQUk1QixTQUFzQixZQUFZLENBQUMsR0FBVzs7UUFDNUMsTUFBTSxJQUFJLEdBQW9CLEVBQUUsQ0FBQztRQUNqQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUMzQyxNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUUzQyxLQUFLLE1BQU0sT0FBTyxJQUFJLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDekMsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUM1QixNQUFNLEdBQUcsR0FBRyxJQUFJLGlCQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDaEQsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBRXZDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQzlCLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxHQUFHLG9CQUFvQixFQUFFLElBQUksQ0FBQyxFQUFFO3dCQUNyRCxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQzt3QkFDeEIsT0FBTyxFQUFFLENBQUM7b0JBQ1osQ0FBQyxDQUFDLENBQUM7Z0JBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNMO1NBQ0Y7UUFDRCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFB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T0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3hCLENBQUMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxPQUFPLEdBQUcsZ0JBQU0sRUFBRSxDQUFDO0lBQ3pCLE1BQU0sUUFBUSxHQUFHLFFBQVEsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7SUFFcEYsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ2xELE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUNkLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQWJELG9DQWFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvZGlzdC9hcnRpZmFjdHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgQWRtWmlwIGZyb20gJ2FkbS16aXAnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBib3hlbiwge0JvcmRlclN0eWxlfSBmcm9tICdib3hlbic7XG5pbXBvcnQge1ppcEZpbGV9IGZyb20gJ3lhemwnO1xuaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnO1xuXG50eXBlIFVucGFja1Byb21pc2U8UD4gPSBQIGV4dGVuZHMgUHJvbWlzZTxpbmZlciBUPiA/IFQgOiB1bmtub3duO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbGlzdFZlcnNpb25zKGVudjogc3RyaW5nKSB7XG4gIGNvbnN0IGRvbmU6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICBjb25zdCBkaXIgPSBQYXRoLnJlc29sdmUoYGluc3RhbGwtJHtlbnZ9YCk7XG4gIGNvbnN0IHZlcnNpb25zID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcblxuICBmb3IgKGNvbnN0IHppcE5hbWUgb2YgZnMucmVhZGRpclN5bmMoZGlyKSkge1xuICAgIGlmICh6aXBOYW1lLmVuZHNXaXRoKCcuemlwJykpIHtcbiAgICAgIGNvbnN0IHppcCA9IG5ldyBBZG1aaXAoUGF0aC5qb2luKGRpciwgemlwTmFtZSkpO1xuICAgICAgY29uc3QgYXBwID0gXy50cmltRW5kKHppcE5hbWUsICcuemlwJyk7XG5cbiAgICAgIGRvbmUucHVzaChuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgemlwLnJlYWRBc1RleHRBc3luYyhhcHAgKyAnLmdpdGhhc2gtd2VidWkudHh0JywgZGF0YSA9PiB7XG4gICAgICAgICAgdmVyc2lvbnMuc2V0KGFwcCwgZGF0YSk7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pKTtcbiAgICB9XG4gIH1cbiAgYXdhaXQgUHJvbWlzZS5hbGwoZG9uZSk7XG4gIHJldHVybiB2ZXJzaW9ucztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxpc3RBbGxWZXJzaW9ucygpIHtcbiAgY29uc3QgbWFwID0gbmV3IE1hcDxzdHJpbmcsIFVucGFja1Byb21pc2U8UmV0dXJuVHlwZTx0eXBlb2YgbGlzdFZlcnNpb25zPj4+KCk7XG4gIGNvbnN0IGRvbmUgPSBmcy5yZWFkZGlyU3luYyhQYXRoLnJlc29sdmUoKSlcbiAgLmZpbHRlcihkaXIgPT4ge1xuICAgIHJldHVybiBkaXIuc3RhcnRzV2l0aCgnaW5zdGFsbC0nKSAmJiBmcy5zdGF0U3luYyhQYXRoLnJlc29sdmUoZGlyKSkuaXNEaXJlY3RvcnkoKTtcbiAgfSlcbiAgLnJlZHVjZSgocHJvbWlzZXMsIGRpcikgPT4ge1xuICAgIGNvbnN0IGVudiA9IC9eaW5zdGFsbC0oW15dKikkLy5leGVjKGRpcikhWzFdO1xuICAgIHByb21pc2VzLnB1c2gobGlzdFZlcnNpb25zKGVudikudGhlbihyZXMgPT4ge1xuICAgICAgICBtYXAuc2V0KGVudiwgcmVzKTtcbiAgICAgIH0pXG4gICAgKTtcbiAgICByZXR1cm4gcHJvbWlzZXM7XG4gIH0sIFtdIGFzIFByb21pc2U8dm9pZD5bXSk7XG5cbiAgYXdhaXQgUHJvbWlzZS5hbGwoZG9uZSk7XG4gIHJldHVybiBtYXA7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdHJpbmdpZnlMaXN0VmVyc2lvbnMoZW52OiBzdHJpbmcpIHtcbiAgY29uc3QgcmVzID0gYXdhaXQgbGlzdFZlcnNpb25zKGVudik7XG4gIGxldCBidWYgPSAnJztcbiAgZm9yIChjb25zdCBbYXBwLCBnaXRoYXNoXSBvZiByZXMuZW50cmllcygpKSB7XG4gICAgYnVmICs9IGJveGVuKGAgJHtlbnZ9IC0gJHthcHB9XFxuJHtnaXRoYXNofVxcbmAsIHttYXJnaW46IDEsIGJvcmRlclN0eWxlOiBCb3JkZXJTdHlsZS5Sb3VuZH0pO1xuICAgIGJ1ZiArPSAnXFxuJztcbiAgfVxuICByZXR1cm4gYnVmO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3RyaW5naWZ5TGlzdEFsbFZlcnNpb25zKCkge1xuICBjb25zdCBlbnZNYXAgPSBhd2FpdCBsaXN0QWxsVmVyc2lvbnMoKTtcbiAgbGV0IGJ1ZiA9ICcnO1xuICBmb3IgKGNvbnN0IFtlbnYsIGFwcEhhc2hdIG9mIGVudk1hcC5lbnRyaWVzKCkpIHtcbiAgICBmb3IgKGNvbnN0IFthcHAsIGdpdGhhc2hdIG9mIGFwcEhhc2guZW50cmllcygpKSB7XG4gICAgICBidWYgKz0gYm94ZW4oYCAgJHtlbnZ9IC0gJHthcHB9XFxuJHtnaXRoYXNofVxcbmAsIHttYXJnaW46IDEsIGJvcmRlclN0eWxlOiBCb3JkZXJTdHlsZS5Sb3VuZH0pO1xuICAgICAgYnVmICs9ICdcXG4nO1xuICAgIH1cbiAgfVxuICByZXR1cm4gYnVmO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVNb2NrWmlwKHdyaXRlVG86IHN0cmluZywgY29udGVudDogc3RyaW5nKSB7XG4gIGNvbnN0IHppcEZpbGUgPSBuZXcgWmlwRmlsZSgpO1xuICBjb25zdCBwcm9tID0gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgemlwRmlsZS5vdXRwdXRTdHJlYW0ucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbSh3cml0ZVRvKSlcbiAgICAub24oJ2Nsb3NlJywgcmVzb2x2ZSk7XG4gIH0pO1xuXG4gIGNvbnN0IGN1cnJlbnQgPSBtb21lbnQoKTtcbiAgY29uc3QgZmlsZU5hbWUgPSBgZmFrZS0ke2N1cnJlbnQuZm9ybWF0KCdZWU1NREQnKX0tJHtjdXJyZW50LmZvcm1hdCgnSEhtbXNzJyl9LnR4dGA7XG5cbiAgemlwRmlsZS5hZGRCdWZmZXIoQnVmZmVyLmZyb20oY29udGVudCksIGZpbGVOYW1lKTtcbiAgemlwRmlsZS5lbmQoKTtcbiAgcmV0dXJuIHByb207XG59XG5cbiJdfQ==
