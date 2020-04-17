"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const adm_zip_1 = tslib_1.__importDefault(require("adm-zip"));
const fs = tslib_1.__importStar(require("fs"));
const Path = tslib_1.__importStar(require("path"));
const _ = tslib_1.__importStar(require("lodash"));
const boxen_1 = tslib_1.__importStar(require("boxen"));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvYXJ0aWZhY3RzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDhEQUE2QjtBQUM3QiwrQ0FBeUI7QUFDekIsbURBQTZCO0FBQzdCLGtEQUE0QjtBQUM1Qix1REFBeUM7QUFLekMsU0FBc0IsWUFBWSxDQUFDLEdBQVc7O1FBQzVDLE1BQU0sSUFBSSxHQUFvQixFQUFFLENBQUM7UUFDakMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDM0MsTUFBTSxRQUFRLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFFM0MsS0FBSyxNQUFNLE9BQU8sSUFBSSxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3pDLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDNUIsTUFBTSxHQUFHLEdBQUcsSUFBSSxpQkFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ2hELE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUV2QyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUM5QixHQUFHLENBQUMsZUFBZSxDQUFDLEdBQUcsR0FBRyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsRUFBRTt3QkFDckQsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7d0JBQ3hCLE9BQU8sRUFBRSxDQUFDO29CQUNaLENBQUMsQ0FBQyxDQUFDO2dCQUNMLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDTDtTQUNGO1FBQ0QsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sUUFBUSxDQUFDO0lBQ2xCLENBQUM7Q0FBQTtBQXBCRCxvQ0FvQkM7QUFFRCxTQUFzQixlQUFlOztRQUNuQyxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBMEQsQ0FBQztRQUM5RSxNQUFNLElBQUksR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzthQUMxQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDWixPQUFPLEdBQUcsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDcEYsQ0FBQyxDQUFDO2FBQ0QsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQ3hCLE1BQU0sR0FBRyxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3QyxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ3ZDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3BCLENBQUMsQ0FBQyxDQUNILENBQUM7WUFDRixPQUFPLFFBQVEsQ0FBQztRQUNsQixDQUFDLEVBQUUsRUFBcUIsQ0FBQyxDQUFDO1FBRTFCLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4QixPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7Q0FBQTtBQWpCRCwwQ0FpQkM7QUFFRCxTQUFzQixxQkFBcUIsQ0FBQyxHQUFXOztRQUNyRCxNQUFNLEdBQUcsR0FBRyxNQUFNLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwQyxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDYixLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQzFDLEdBQUcsSUFBSSxlQUFLLENBQUMsSUFBSSxHQUFHLE1BQU0sR0FBRyxLQUFLLE9BQU8sSUFBSSxFQUFFLEVBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxXQUFXLHFCQUFtQixFQUFDLENBQUMsQ0FBQztZQUM1RixHQUFHLElBQUksSUFBSSxDQUFDO1NBQ2I7UUFDRCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7Q0FBQTtBQVJELHNEQVFDO0FBRUQsU0FBc0Isd0JBQXdCOztRQUM1QyxNQUFNLE1BQU0sR0FBRyxNQUFNLGVBQWUsRUFBRSxDQUFDO1FBQ3ZDLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNiLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDN0MsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDOUMsR0FBRyxJQUFJLGVBQUssQ0FBQyxLQUFLLEdBQUcsTUFBTSxHQUFHLEtBQUssT0FBTyxJQUFJLEVBQUUsRUFBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLFdBQVcscUJBQW1CLEVBQUMsQ0FBQyxDQUFDO2dCQUM3RixHQUFHLElBQUksSUFBSSxDQUFDO2FBQ2I7U0FDRjtRQUNELE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztDQUFBO0FBVkQsNERBVUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Biay9wcmVidWlsZC9kaXN0L2FydGlmYWN0cy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBBZG1aaXAgZnJvbSAnYWRtLXppcCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGJveGVuLCB7Qm9yZGVyU3R5bGV9IGZyb20gJ2JveGVuJztcblxuXG50eXBlIFVucGFja1Byb21pc2U8UD4gPSBQIGV4dGVuZHMgUHJvbWlzZTxpbmZlciBUPiA/IFQgOiB1bmtub3duO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbGlzdFZlcnNpb25zKGVudjogc3RyaW5nKSB7XG4gIGNvbnN0IGRvbmU6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICBjb25zdCBkaXIgPSBQYXRoLnJlc29sdmUoYGluc3RhbGwtJHtlbnZ9YCk7XG4gIGNvbnN0IHZlcnNpb25zID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcblxuICBmb3IgKGNvbnN0IHppcE5hbWUgb2YgZnMucmVhZGRpclN5bmMoZGlyKSkge1xuICAgIGlmICh6aXBOYW1lLmVuZHNXaXRoKCcuemlwJykpIHtcbiAgICAgIGNvbnN0IHppcCA9IG5ldyBBZG1aaXAoUGF0aC5qb2luKGRpciwgemlwTmFtZSkpO1xuICAgICAgY29uc3QgYXBwID0gXy50cmltRW5kKHppcE5hbWUsICcuemlwJyk7XG5cbiAgICAgIGRvbmUucHVzaChuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgemlwLnJlYWRBc1RleHRBc3luYyhhcHAgKyAnLmdpdGhhc2gtd2VidWkudHh0JywgZGF0YSA9PiB7XG4gICAgICAgICAgdmVyc2lvbnMuc2V0KGFwcCwgZGF0YSk7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pKTtcbiAgICB9XG4gIH1cbiAgYXdhaXQgUHJvbWlzZS5hbGwoZG9uZSk7XG4gIHJldHVybiB2ZXJzaW9ucztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxpc3RBbGxWZXJzaW9ucygpIHtcbiAgY29uc3QgbWFwID0gbmV3IE1hcDxzdHJpbmcsIFVucGFja1Byb21pc2U8UmV0dXJuVHlwZTx0eXBlb2YgbGlzdFZlcnNpb25zPj4+KCk7XG4gIGNvbnN0IGRvbmUgPSBmcy5yZWFkZGlyU3luYyhQYXRoLnJlc29sdmUoKSlcbiAgLmZpbHRlcihkaXIgPT4ge1xuICAgIHJldHVybiBkaXIuc3RhcnRzV2l0aCgnaW5zdGFsbC0nKSAmJiBmcy5zdGF0U3luYyhQYXRoLnJlc29sdmUoZGlyKSkuaXNEaXJlY3RvcnkoKTtcbiAgfSlcbiAgLnJlZHVjZSgocHJvbWlzZXMsIGRpcikgPT4ge1xuICAgIGNvbnN0IGVudiA9IC9eaW5zdGFsbC0oW15dKikkLy5leGVjKGRpcikhWzFdO1xuICAgIHByb21pc2VzLnB1c2gobGlzdFZlcnNpb25zKGVudikudGhlbihyZXMgPT4ge1xuICAgICAgICBtYXAuc2V0KGVudiwgcmVzKTtcbiAgICAgIH0pXG4gICAgKTtcbiAgICByZXR1cm4gcHJvbWlzZXM7XG4gIH0sIFtdIGFzIFByb21pc2U8dm9pZD5bXSk7XG5cbiAgYXdhaXQgUHJvbWlzZS5hbGwoZG9uZSk7XG4gIHJldHVybiBtYXA7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdHJpbmdpZnlMaXN0VmVyc2lvbnMoZW52OiBzdHJpbmcpIHtcbiAgY29uc3QgcmVzID0gYXdhaXQgbGlzdFZlcnNpb25zKGVudik7XG4gIGxldCBidWYgPSAnJztcbiAgZm9yIChjb25zdCBbYXBwLCBnaXRoYXNoXSBvZiByZXMuZW50cmllcygpKSB7XG4gICAgYnVmICs9IGJveGVuKGAgJHtlbnZ9IC0gJHthcHB9XFxuJHtnaXRoYXNofVxcbmAsIHttYXJnaW46IDEsIGJvcmRlclN0eWxlOiBCb3JkZXJTdHlsZS5Sb3VuZH0pO1xuICAgIGJ1ZiArPSAnXFxuJztcbiAgfVxuICByZXR1cm4gYnVmO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3RyaW5naWZ5TGlzdEFsbFZlcnNpb25zKCkge1xuICBjb25zdCBlbnZNYXAgPSBhd2FpdCBsaXN0QWxsVmVyc2lvbnMoKTtcbiAgbGV0IGJ1ZiA9ICcnO1xuICBmb3IgKGNvbnN0IFtlbnYsIGFwcEhhc2hdIG9mIGVudk1hcC5lbnRyaWVzKCkpIHtcbiAgICBmb3IgKGNvbnN0IFthcHAsIGdpdGhhc2hdIG9mIGFwcEhhc2guZW50cmllcygpKSB7XG4gICAgICBidWYgKz0gYm94ZW4oYCAgJHtlbnZ9IC0gJHthcHB9XFxuJHtnaXRoYXNofVxcbmAsIHttYXJnaW46IDEsIGJvcmRlclN0eWxlOiBCb3JkZXJTdHlsZS5Sb3VuZH0pO1xuICAgICAgYnVmICs9ICdcXG4nO1xuICAgIH1cbiAgfVxuICByZXR1cm4gYnVmO1xufVxuXG4iXX0=
