"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable:no-console
// import {ZipResourceMiddleware} from 'serve-static-zip';
const request_1 = tslib_1.__importDefault(require("request"));
const fs_1 = tslib_1.__importDefault(require("fs"));
// import Path from 'path';
const argv = process.argv;
const fetchUrl = argv[2];
const fileName = argv[3];
const retryTimes = parseInt(argv[4], 10);
process.on('uncaughtException', (err) => {
    // tslint:disable-next-line
    console.log(err);
    process.send && process.send({ error: err });
});
function downloadZip(fetchUrl) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line
        // log.info(`${os.hostname()} ${os.userInfo().username} download zip[Free mem]: ${Math.round(os.freemem() / 1048576)}M, [total mem]: ${Math.round(os.totalmem() / 1048576)}M`);
        const resource = fetchUrl + '?' + Math.random();
        // const downloadTo = api.config.resolve('destDir', `remote-${Math.random()}-${path.split('/').pop()}`);
        // log.info('fetch', resource);
        process.send && process.send({ log: `[pid:${process.pid}] fetch ` + resource });
        yield retry(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield new Promise((resolve, rej) => {
                const writeStream = fs_1.default.createWriteStream(fileName);
                writeStream.on('finish', () => {
                    process.send && process.send({ log: 'zip file is written: ' + fileName });
                    resolve();
                });
                request_1.default({
                    uri: resource, method: 'GET', encoding: null
                })
                    .on('response', res => {
                    if (res.statusCode > 299 || res.statusCode < 200)
                        return rej(new Error(res.statusCode + ' ' + res.statusMessage));
                })
                    .on('error', err => {
                    return rej(err);
                })
                    .pipe(writeStream);
            });
            // fs.writeFileSync(Path.resolve(distDir, fileName),
            // 	buf);
            process.send && process.send({ log: `${fileName} is written.` });
            // const zip = new AdmZip(buf);
            // await tryExtract(zip);
        }));
    });
}
function retry(func, ...args) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        for (let cnt = 0;;) {
            try {
                return yield func(...args);
            }
            catch (err) {
                cnt++;
                if (cnt >= retryTimes) {
                    throw err;
                }
                console.log(err);
                process.send && process.send({ log: 'Encounter error, will retry ' + err.stack ? err.stack : err });
            }
            yield new Promise(res => setTimeout(res, cnt * 5000));
        }
    });
}
downloadZip(fetchUrl)
    .catch(err => {
    process.send && process.send({ error: err });
    process.exit(1);
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2Rvd25sb2FkLXppcC1wcm9jZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRCQUE0QjtBQUM1QiwwREFBMEQ7QUFDMUQsOERBQThCO0FBRTlCLG9EQUFvQjtBQUNwQiwyQkFBMkI7QUFFM0IsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztBQUMxQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pCLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFFekMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO0lBQ3RDLDJCQUEyQjtJQUM1QixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2hCLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDO0FBRUgsU0FBZSxXQUFXLENBQUMsUUFBZ0I7O1FBQ3pDLDJCQUEyQjtRQUM1QiwrS0FBK0s7UUFDOUssTUFBTSxRQUFRLEdBQUcsUUFBUSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDaEQsd0dBQXdHO1FBQ3hHLCtCQUErQjtRQUMvQixPQUFPLENBQUMsSUFBSSxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBQyxHQUFHLEVBQUUsUUFBUSxPQUFPLENBQUMsR0FBRyxVQUFVLEdBQUUsUUFBUSxFQUFDLENBQUMsQ0FBQztRQUM3RSxNQUFNLEtBQUssQ0FBQyxHQUFTLEVBQUU7WUFDckIsTUFBTSxJQUFJLE9BQU8sQ0FBUyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsRUFBRTtnQkFDekMsTUFBTSxXQUFXLEdBQUcsWUFBRSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNuRCxXQUFXLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7b0JBQzVCLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSx1QkFBdUIsR0FBRyxRQUFRLEVBQUMsQ0FBQyxDQUFDO29CQUN4RSxPQUFPLEVBQUUsQ0FBQztnQkFDWixDQUFDLENBQUMsQ0FBQztnQkFDSCxpQkFBTyxDQUFDO29CQUNOLEdBQUcsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBSTtpQkFDN0MsQ0FBQztxQkFDRCxFQUFFLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxFQUFFO29CQUNwQixJQUFJLEdBQUcsQ0FBQyxVQUFVLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxVQUFVLEdBQUcsR0FBRzt3QkFDOUMsT0FBTyxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BFLENBQUMsQ0FBQztxQkFDRCxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUFFO29CQUNqQixPQUFPLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDbEIsQ0FBQyxDQUFDO3FCQUNELElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNyQixDQUFDLENBQUMsQ0FBQztZQUNILG9EQUFvRDtZQUNwRCxTQUFTO1lBQ1QsT0FBTyxDQUFDLElBQUksSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUMsR0FBRyxFQUFFLEdBQUcsUUFBUSxjQUFjLEVBQUMsQ0FBQyxDQUFDO1lBQy9ELCtCQUErQjtZQUMvQix5QkFBeUI7UUFDM0IsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FBQTtBQUlELFNBQWUsS0FBSyxDQUFJLElBQW9DLEVBQUUsR0FBRyxJQUFXOztRQUMxRSxLQUFLLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSTtZQUNsQixJQUFJO2dCQUNGLE9BQU8sTUFBTSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQzthQUM1QjtZQUFDLE9BQU8sR0FBRyxFQUFFO2dCQUNaLEdBQUcsRUFBRSxDQUFDO2dCQUNOLElBQUksR0FBRyxJQUFJLFVBQVUsRUFBRTtvQkFDckIsTUFBTSxHQUFHLENBQUM7aUJBQ1g7Z0JBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDakIsT0FBTyxDQUFDLElBQUksSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUMsR0FBRyxFQUFFLDhCQUE4QixHQUFJLEdBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBQyxDQUFDLENBQUM7YUFDOUc7WUFDRCxNQUFNLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUN2RDtJQUNILENBQUM7Q0FBQTtBQUVELFdBQVcsQ0FBQyxRQUFRLENBQUM7S0FDcEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQ1gsT0FBTyxDQUFDLElBQUksSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUMsS0FBSyxFQUFFLEdBQUcsRUFBQyxDQUFDLENBQUM7SUFDM0MsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2Rvd25sb2FkLXppcC1wcm9jZXNzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuLy8gaW1wb3J0IHtaaXBSZXNvdXJjZU1pZGRsZXdhcmV9IGZyb20gJ3NlcnZlLXN0YXRpYy16aXAnO1xuaW1wb3J0IHJlcXVlc3QgZnJvbSAncmVxdWVzdCc7XG5cbmltcG9ydCBmcyBmcm9tICdmcyc7XG4vLyBpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcblxuY29uc3QgYXJndiA9IHByb2Nlc3MuYXJndjtcbmNvbnN0IGZldGNoVXJsID0gYXJndlsyXTtcbmNvbnN0IGZpbGVOYW1lID0gYXJndlszXTtcbmNvbnN0IHJldHJ5VGltZXMgPSBwYXJzZUludChhcmd2WzRdLCAxMCk7XG5cbnByb2Nlc3Mub24oJ3VuY2F1Z2h0RXhjZXB0aW9uJywgKGVycikgPT4ge1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0Y29uc29sZS5sb2coZXJyKTtcbiAgcHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7ZXJyb3I6IGVycn0pO1xufSk7XG5cbmFzeW5jIGZ1bmN0aW9uIGRvd25sb2FkWmlwKGZldGNoVXJsOiBzdHJpbmcpIHtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdC8vIGxvZy5pbmZvKGAke29zLmhvc3RuYW1lKCl9ICR7b3MudXNlckluZm8oKS51c2VybmFtZX0gZG93bmxvYWQgemlwW0ZyZWUgbWVtXTogJHtNYXRoLnJvdW5kKG9zLmZyZWVtZW0oKSAvIDEwNDg1NzYpfU0sIFt0b3RhbCBtZW1dOiAke01hdGgucm91bmQob3MudG90YWxtZW0oKSAvIDEwNDg1NzYpfU1gKTtcbiAgY29uc3QgcmVzb3VyY2UgPSBmZXRjaFVybCArICc/JyArIE1hdGgucmFuZG9tKCk7XG4gIC8vIGNvbnN0IGRvd25sb2FkVG8gPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCBgcmVtb3RlLSR7TWF0aC5yYW5kb20oKX0tJHtwYXRoLnNwbGl0KCcvJykucG9wKCl9YCk7XG4gIC8vIGxvZy5pbmZvKCdmZXRjaCcsIHJlc291cmNlKTtcbiAgcHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7bG9nOiBgW3BpZDoke3Byb2Nlc3MucGlkfV0gZmV0Y2ggYCsgcmVzb3VyY2V9KTtcbiAgYXdhaXQgcmV0cnkoYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IG5ldyBQcm9taXNlPEJ1ZmZlcj4oKHJlc29sdmUsIHJlaikgPT4ge1xuICAgICAgY29uc3Qgd3JpdGVTdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShmaWxlTmFtZSk7XG4gICAgICB3cml0ZVN0cmVhbS5vbignZmluaXNoJywgKCkgPT4ge1xuICAgICAgICBwcm9jZXNzLnNlbmQgJiYgcHJvY2Vzcy5zZW5kKHtsb2c6ICd6aXAgZmlsZSBpcyB3cml0dGVuOiAnICsgZmlsZU5hbWV9KTtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfSk7XG4gICAgICByZXF1ZXN0KHtcbiAgICAgICAgdXJpOiByZXNvdXJjZSwgbWV0aG9kOiAnR0VUJywgZW5jb2Rpbmc6IG51bGxcbiAgICAgIH0pXG4gICAgICAub24oJ3Jlc3BvbnNlJywgcmVzID0+IHtcbiAgICAgICAgaWYgKHJlcy5zdGF0dXNDb2RlID4gMjk5IHx8IHJlcy5zdGF0dXNDb2RlIDwgMjAwKVxuICAgICAgICAgIHJldHVybiByZWoobmV3IEVycm9yKHJlcy5zdGF0dXNDb2RlICsgJyAnICsgcmVzLnN0YXR1c01lc3NhZ2UpKTtcbiAgICAgIH0pXG4gICAgICAub24oJ2Vycm9yJywgZXJyID0+IHtcbiAgICAgICAgcmV0dXJuIHJlaihlcnIpO1xuICAgICAgfSlcbiAgICAgIC5waXBlKHdyaXRlU3RyZWFtKTtcbiAgICB9KTtcbiAgICAvLyBmcy53cml0ZUZpbGVTeW5jKFBhdGgucmVzb2x2ZShkaXN0RGlyLCBmaWxlTmFtZSksXG4gICAgLy8gXHRidWYpO1xuICAgIHByb2Nlc3Muc2VuZCAmJiBwcm9jZXNzLnNlbmQoe2xvZzogYCR7ZmlsZU5hbWV9IGlzIHdyaXR0ZW4uYH0pO1xuICAgIC8vIGNvbnN0IHppcCA9IG5ldyBBZG1aaXAoYnVmKTtcbiAgICAvLyBhd2FpdCB0cnlFeHRyYWN0KHppcCk7XG4gIH0pO1xufVxuXG5cblxuYXN5bmMgZnVuY3Rpb24gcmV0cnk8VD4oZnVuYzogKC4uLmFyZ3M6IGFueVtdKSA9PiBQcm9taXNlPFQ+LCAuLi5hcmdzOiBhbnlbXSk6IFByb21pc2U8VD4ge1xuICBmb3IgKGxldCBjbnQgPSAwOzspIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGF3YWl0IGZ1bmMoLi4uYXJncyk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjbnQrKztcbiAgICAgIGlmIChjbnQgPj0gcmV0cnlUaW1lcykge1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgcHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7bG9nOiAnRW5jb3VudGVyIGVycm9yLCB3aWxsIHJldHJ5ICcgKyAoZXJyIGFzIEVycm9yKS5zdGFjayA/IGVyci5zdGFjayA6IGVycn0pO1xuICAgIH1cbiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXMgPT4gc2V0VGltZW91dChyZXMsIGNudCAqIDUwMDApKTtcbiAgfVxufVxuXG5kb3dubG9hZFppcChmZXRjaFVybClcbi5jYXRjaChlcnIgPT4ge1xuICBwcm9jZXNzLnNlbmQgJiYgcHJvY2Vzcy5zZW5kKHtlcnJvcjogZXJyfSk7XG4gIHByb2Nlc3MuZXhpdCgxKTtcbn0pO1xuIl19
