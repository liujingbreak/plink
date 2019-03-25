"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable:no-console
// import {ZipResourceMiddleware} from 'serve-static-zip';
const request_1 = tslib_1.__importDefault(require("request"));
const adm_zip_1 = tslib_1.__importDefault(require("adm-zip"));
const os_1 = tslib_1.__importDefault(require("os"));
const argv = process.argv;
const fetchUrl = argv[2];
const zipExtractDir = argv[3];
const retryTimes = parseInt(argv[4], 10);
function downloadZip(fetchUrl) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line
        // log.info(`${os.hostname()} ${os.userInfo().username} download zip[Free mem]: ${Math.round(os.freemem() / 1048576)}M, [total mem]: ${Math.round(os.totalmem() / 1048576)}M`);
        const resource = fetchUrl + '?' + Math.random();
        // const downloadTo = api.config.resolve('destDir', `remote-${Math.random()}-${path.split('/').pop()}`);
        // log.info('fetch', resource);
        process.send({ log: `[pid:${process.pid}] fetch ` + resource });
        process.send({ log: `[pid:${process.pid}] downloading zip content to memory...` });
        yield retry(() => {
            return new Promise((resolve, rej) => {
                request_1.default({
                    uri: resource, method: 'GET', encoding: null
                }, (err, res, body) => {
                    if (err) {
                        return rej(err);
                    }
                    if (res.statusCode > 299 || res.statusCode < 200)
                        return rej(new Error(res.statusCode + ' ' + res.statusMessage));
                    const size = body.byteLength;
                    // tslint:disable-next-line
                    process.send({ log: `[pid:${process.pid}] zip loaded, length:${size > 1024 ? Math.round(size / 1024) + 'k' : size}` });
                    resolve(body);
                });
            })
                .then(buf => {
                const zip = new adm_zip_1.default(buf);
                return tryExtract(zip);
            });
        });
    });
}
function tryExtract(zip) {
    return new Promise((resolve, reject) => {
        zip.extractAllToAsync(zipExtractDir, true, (err) => {
            if (err) {
                process.send({ error: err });
                if (err.code === 'ENOMEM' || err.toString().indexOf('not enough memory') >= 0) {
                    // tslint:disable-next-line
                    process.send({ log: `${os_1.default.hostname()} ${os_1.default.userInfo().username} [Free mem]: ${Math.round(os_1.default.freemem() / 1048576)}M, [total mem]: ${Math.round(os_1.default.totalmem() / 1048576)}M` });
                }
                reject(err);
            }
            else
                resolve();
        });
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
                process.send({ log: 'Encounter error, will retry' });
            }
            yield new Promise(res => setTimeout(res, 5000));
        }
    });
}
downloadZip(fetchUrl);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2Rvd25sb2FkLXppcC1wcm9jZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRCQUE0QjtBQUM1QiwwREFBMEQ7QUFDMUQsOERBQThCO0FBQzlCLDhEQUE2QjtBQUM3QixvREFBb0I7QUFHcEIsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztBQUMxQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekIsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlCLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFFekMsU0FBZSxXQUFXLENBQUMsUUFBZ0I7O1FBQzFDLDJCQUEyQjtRQUMzQiwrS0FBK0s7UUFDL0ssTUFBTSxRQUFRLEdBQUcsUUFBUSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDaEQsd0dBQXdHO1FBQ3hHLCtCQUErQjtRQUMvQixPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUMsR0FBRyxFQUFFLFFBQVEsT0FBTyxDQUFDLEdBQUcsVUFBVSxHQUFFLFFBQVEsRUFBQyxDQUFDLENBQUM7UUFDN0QsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSxRQUFRLE9BQU8sQ0FBQyxHQUFHLHdDQUF3QyxFQUFDLENBQUMsQ0FBQztRQUNqRixNQUFNLEtBQUssQ0FBQyxHQUFHLEVBQUU7WUFDaEIsT0FBTyxJQUFJLE9BQU8sQ0FBUyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsRUFBRTtnQkFDM0MsaUJBQU8sQ0FBQztvQkFDUCxHQUFHLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLElBQUk7aUJBQzVDLEVBQUUsQ0FBQyxHQUFHLEVBQUUs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Q25EO1lBQ0QsTUFBTSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUNoRDtJQUNGLENBQUM7Q0FBQTtBQUVELFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2Rvd25sb2FkLXppcC1wcm9jZXNzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuLy8gaW1wb3J0IHtaaXBSZXNvdXJjZU1pZGRsZXdhcmV9IGZyb20gJ3NlcnZlLXN0YXRpYy16aXAnO1xuaW1wb3J0IHJlcXVlc3QgZnJvbSAncmVxdWVzdCc7XG5pbXBvcnQgQWRtWmlwIGZyb20gJ2FkbS16aXAnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcblxuXG5jb25zdCBhcmd2ID0gcHJvY2Vzcy5hcmd2O1xuY29uc3QgZmV0Y2hVcmwgPSBhcmd2WzJdO1xuY29uc3QgemlwRXh0cmFjdERpciA9IGFyZ3ZbM107XG5jb25zdCByZXRyeVRpbWVzID0gcGFyc2VJbnQoYXJndls0XSwgMTApO1xuXG5hc3luYyBmdW5jdGlvbiBkb3dubG9hZFppcChmZXRjaFVybDogc3RyaW5nKSB7XG5cdC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuXHQvLyBsb2cuaW5mbyhgJHtvcy5ob3N0bmFtZSgpfSAke29zLnVzZXJJbmZvKCkudXNlcm5hbWV9IGRvd25sb2FkIHppcFtGcmVlIG1lbV06ICR7TWF0aC5yb3VuZChvcy5mcmVlbWVtKCkgLyAxMDQ4NTc2KX1NLCBbdG90YWwgbWVtXTogJHtNYXRoLnJvdW5kKG9zLnRvdGFsbWVtKCkgLyAxMDQ4NTc2KX1NYCk7XG5cdGNvbnN0IHJlc291cmNlID0gZmV0Y2hVcmwgKyAnPycgKyBNYXRoLnJhbmRvbSgpO1xuXHQvLyBjb25zdCBkb3dubG9hZFRvID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgYHJlbW90ZS0ke01hdGgucmFuZG9tKCl9LSR7cGF0aC5zcGxpdCgnLycpLnBvcCgpfWApO1xuXHQvLyBsb2cuaW5mbygnZmV0Y2gnLCByZXNvdXJjZSk7XG5cdHByb2Nlc3Muc2VuZCh7bG9nOiBgW3BpZDoke3Byb2Nlc3MucGlkfV0gZmV0Y2ggYCsgcmVzb3VyY2V9KTtcblx0cHJvY2Vzcy5zZW5kKHtsb2c6IGBbcGlkOiR7cHJvY2Vzcy5waWR9XSBkb3dubG9hZGluZyB6aXAgY29udGVudCB0byBtZW1vcnkuLi5gfSk7XG5cdGF3YWl0IHJldHJ5KCgpID0+IHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2U8QnVmZmVyPigocmVzb2x2ZSwgcmVqKSA9PiB7XG5cdFx0XHRyZXF1ZXN0KHtcblx0XHRcdFx0dXJpOiByZXNvdXJjZSwgbWV0aG9kOiAnR0VUJywgZW5jb2Rpbmc6IG51bGxcblx0XHRcdH0sIChlcnIsIHJlcywgYm9keSkgPT4ge1xuXHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHJlaihlcnIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChyZXMuc3RhdHVzQ29kZSA+IDI5OSB8fCByZXMuc3RhdHVzQ29kZSA8IDIwMClcblx0XHRcdFx0XHRyZXR1cm4gcmVqKG5ldyBFcnJvcihyZXMuc3RhdHVzQ29kZSArICcgJyArIHJlcy5zdGF0dXNNZXNzYWdlKSk7XG5cdFx0XHRcdGNvbnN0IHNpemUgPSAoYm9keSBhcyBCdWZmZXIpLmJ5dGVMZW5ndGg7XG5cdFx0XHRcdC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuXHRcdFx0XHRwcm9jZXNzLnNlbmQoe2xvZzogYFtwaWQ6JHtwcm9jZXNzLnBpZH1dIHppcCBsb2FkZWQsIGxlbmd0aDoke3NpemUgPiAxMDI0ID8gTWF0aC5yb3VuZChzaXplIC8gMTAyNCkgKyAnaycgOiBzaXplfWB9KTtcblx0XHRcdFx0cmVzb2x2ZShib2R5KTtcblx0XHRcdH0pO1xuXHRcdH0pXG5cdFx0LnRoZW4oYnVmID0+IHtcblx0XHRcdGNvbnN0IHppcCA9IG5ldyBBZG1aaXAoYnVmKTtcblx0XHRcdHJldHVybiB0cnlFeHRyYWN0KHppcCk7XG5cdFx0fSk7XG5cdH0pO1xufVxuXG5mdW5jdGlvbiB0cnlFeHRyYWN0KHppcDogQWRtWmlwKSB7XG5cdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0emlwLmV4dHJhY3RBbGxUb0FzeW5jKHppcEV4dHJhY3REaXIsIHRydWUsIChlcnIpID0+IHtcblx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0cHJvY2Vzcy5zZW5kKHtlcnJvcjogZXJyfSk7XG5cdFx0XHRcdGlmICgoZXJyIGFzIGFueSkuY29kZSA9PT0gJ0VOT01FTScgfHwgZXJyLnRvU3RyaW5nKCkuaW5kZXhPZignbm90IGVub3VnaCBtZW1vcnknKSA+PSAwKSB7XG5cdFx0XHRcdFx0Ly8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdFx0XHRcdFx0cHJvY2Vzcy5zZW5kKHtsb2c6IGAke29zLmhvc3RuYW1lKCl9ICR7b3MudXNlckluZm8oKS51c2VybmFtZX0gW0ZyZWUgbWVtXTogJHtNYXRoLnJvdW5kKG9zLmZyZWVtZW0oKSAvIDEwNDg1NzYpfU0sIFt0b3RhbCBtZW1dOiAke01hdGgucm91bmQob3MudG90YWxtZW0oKSAvIDEwNDg1NzYpfU1gfSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmVqZWN0KGVycik7XG5cdFx0XHR9IGVsc2Vcblx0XHRcdFx0cmVzb2x2ZSgpO1xuXHRcdH0pO1xuXHR9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcmV0cnk8VD4oZnVuYzogKC4uLmFyZ3M6IGFueVtdKSA9PiBQcm9taXNlPFQ+LCAuLi5hcmdzOiBhbnlbXSk6IFByb21pc2U8VD4ge1xuXHRmb3IgKGxldCBjbnQgPSAwOzspIHtcblx0XHR0cnkge1xuXHRcdFx0cmV0dXJuIGF3YWl0IGZ1bmMoLi4uYXJncyk7XG5cdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRjbnQrKztcblx0XHRcdGlmIChjbnQgPj0gcmV0cnlUaW1lcykge1xuXHRcdFx0XHR0aHJvdyBlcnI7XG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZyhlcnIpO1xuXHRcdFx0cHJvY2Vzcy5zZW5kKHtsb2c6ICdFbmNvdW50ZXIgZXJyb3IsIHdpbGwgcmV0cnknfSk7XG5cdFx0fVxuXHRcdGF3YWl0IG5ldyBQcm9taXNlKHJlcyA9PiBzZXRUaW1lb3V0KHJlcywgNTAwMCkpO1xuXHR9XG59XG5cbmRvd25sb2FkWmlwKGZldGNoVXJsKTtcbiJdfQ==
