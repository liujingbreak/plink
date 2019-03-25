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
        yield retry(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
            const buf = yield new Promise((resolve, rej) => {
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
            });
            const zip = new adm_zip_1.default(buf);
            yield tryExtract(zip);
        }));
    });
}
function tryExtract(zip) {
    return new Promise((resolve, reject) => {
        zip.extractAllToAsync(zipExtractDir, true, (err) => {
            if (err) {
                process.send({ error: err });
                if (err.code === 'ENOMEM' || err.toString().indexOf('not enough memory') >= 0) {
                    // tslint:disable-next-line
                    process.send({ log: `[pid:${process.pid}]${os_1.default.hostname()} ${os_1.default.userInfo().username} [Free mem]: ${Math.round(os_1.default.freemem() / 1048576)}M, [total mem]: ${Math.round(os_1.default.totalmem() / 1048576)}M` });
                }
                reject(err);
            }
            else {
                process.send({ done: `[pid:${process.pid}]done` });
                console.log('zip extracted to ' + zipExtractDir);
                resolve();
            }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2Rvd25sb2FkLXppcC1wcm9jZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRCQUE0QjtBQUM1QiwwREFBMEQ7QUFDMUQsOERBQThCO0FBQzlCLDhEQUE2QjtBQUM3QixvREFBb0I7QUFHcEIsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztBQUMxQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekIsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlCLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFFekMsU0FBZSxXQUFXLENBQUMsUUFBZ0I7O1FBQzFDLDJCQUEyQjtRQUMzQiwrS0FBK0s7UUFDL0ssTUFBTSxRQUFRLEdBQUcsUUFBUSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDaEQsd0dBQXdHO1FBQ3hHLCtCQUErQjtRQUMvQixPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUMsR0FBRyxFQUFFLFFBQVEsT0FBTyxDQUFDLEdBQUcsVUFBVSxHQUFFLFFBQVEsRUFBQyxDQUFDLENBQUM7UUFDN0QsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSxRQUFRLE9BQU8sQ0FBQyxHQUFHLHdDQUF3QyxFQUFDLENBQUMsQ0FBQztRQUNqRixNQUFNLEtBQUssQ0FBQyxHQUFTLEVBQUU7WUFDdEIsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLE9BQU8sQ0FBUyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsRUFBRTtnQkFDdEQsaUJBQU8sQ0FBQztvQkFDUCxHQUFHLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLElBQUk7aUJBQzVDLEVBQUUs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QUU7b0JBQ3RCLE1BQU0sR0FBRyxDQUFDO2lCQUNWO2dCQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2pCLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBQyxHQUFHLEVBQUUsNkJBQTZCLEVBQUMsQ0FBQyxDQUFDO2FBQ25EO1lBQ0QsTUFBTSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUNoRDtJQUNGLENBQUM7Q0FBQTtBQUVELFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2Rvd25sb2FkLXppcC1wcm9jZXNzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuLy8gaW1wb3J0IHtaaXBSZXNvdXJjZU1pZGRsZXdhcmV9IGZyb20gJ3NlcnZlLXN0YXRpYy16aXAnO1xuaW1wb3J0IHJlcXVlc3QgZnJvbSAncmVxdWVzdCc7XG5pbXBvcnQgQWRtWmlwIGZyb20gJ2FkbS16aXAnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcblxuXG5jb25zdCBhcmd2ID0gcHJvY2Vzcy5hcmd2O1xuY29uc3QgZmV0Y2hVcmwgPSBhcmd2WzJdO1xuY29uc3QgemlwRXh0cmFjdERpciA9IGFyZ3ZbM107XG5jb25zdCByZXRyeVRpbWVzID0gcGFyc2VJbnQoYXJndls0XSwgMTApO1xuXG5hc3luYyBmdW5jdGlvbiBkb3dubG9hZFppcChmZXRjaFVybDogc3RyaW5nKSB7XG5cdC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuXHQvLyBsb2cuaW5mbyhgJHtvcy5ob3N0bmFtZSgpfSAke29zLnVzZXJJbmZvKCkudXNlcm5hbWV9IGRvd25sb2FkIHppcFtGcmVlIG1lbV06ICR7TWF0aC5yb3VuZChvcy5mcmVlbWVtKCkgLyAxMDQ4NTc2KX1NLCBbdG90YWwgbWVtXTogJHtNYXRoLnJvdW5kKG9zLnRvdGFsbWVtKCkgLyAxMDQ4NTc2KX1NYCk7XG5cdGNvbnN0IHJlc291cmNlID0gZmV0Y2hVcmwgKyAnPycgKyBNYXRoLnJhbmRvbSgpO1xuXHQvLyBjb25zdCBkb3dubG9hZFRvID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgYHJlbW90ZS0ke01hdGgucmFuZG9tKCl9LSR7cGF0aC5zcGxpdCgnLycpLnBvcCgpfWApO1xuXHQvLyBsb2cuaW5mbygnZmV0Y2gnLCByZXNvdXJjZSk7XG5cdHByb2Nlc3Muc2VuZCh7bG9nOiBgW3BpZDoke3Byb2Nlc3MucGlkfV0gZmV0Y2ggYCsgcmVzb3VyY2V9KTtcblx0cHJvY2Vzcy5zZW5kKHtsb2c6IGBbcGlkOiR7cHJvY2Vzcy5waWR9XSBkb3dubG9hZGluZyB6aXAgY29udGVudCB0byBtZW1vcnkuLi5gfSk7XG5cdGF3YWl0IHJldHJ5KGFzeW5jICgpID0+IHtcblx0XHRjb25zdCBidWYgPSBhd2FpdCBuZXcgUHJvbWlzZTxCdWZmZXI+KChyZXNvbHZlLCByZWopID0+IHtcblx0XHRcdHJlcXVlc3Qoe1xuXHRcdFx0XHR1cmk6IHJlc291cmNlLCBtZXRob2Q6ICdHRVQnLCBlbmNvZGluZzogbnVsbFxuXHRcdFx0fSwgKGVyciwgcmVzLCBib2R5KSA9PiB7XG5cdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRyZXR1cm4gcmVqKGVycik7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHJlcy5zdGF0dXNDb2RlID4gMjk5IHx8IHJlcy5zdGF0dXNDb2RlIDwgMjAwKVxuXHRcdFx0XHRcdHJldHVybiByZWoobmV3IEVycm9yKHJlcy5zdGF0dXNDb2RlICsgJyAnICsgcmVzLnN0YXR1c01lc3NhZ2UpKTtcblx0XHRcdFx0Y29uc3Qgc2l6ZSA9IChib2R5IGFzIEJ1ZmZlcikuYnl0ZUxlbmd0aDtcblx0XHRcdFx0Ly8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdFx0XHRcdHByb2Nlc3Muc2VuZCh7bG9nOiBgW3BpZDoke3Byb2Nlc3MucGlkfV0gemlwIGxvYWRlZCwgbGVuZ3RoOiR7c2l6ZSA+IDEwMjQgPyBNYXRoLnJvdW5kKHNpemUgLyAxMDI0KSArICdrJyA6IHNpemV9YH0pO1xuXHRcdFx0XHRyZXNvbHZlKGJvZHkpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdFx0Y29uc3QgemlwID0gbmV3IEFkbVppcChidWYpO1xuXHRcdGF3YWl0IHRyeUV4dHJhY3QoemlwKTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIHRyeUV4dHJhY3QoemlwOiBBZG1aaXApIHtcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHR6aXAuZXh0cmFjdEFsbFRvQXN5bmMoemlwRXh0cmFjdERpciwgdHJ1ZSwgKGVycikgPT4ge1xuXHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRwcm9jZXNzLnNlbmQoe2Vycm9yOiBlcnJ9KTtcblx0XHRcdFx0aWYgKChlcnIgYXMgYW55KS5jb2RlID09PSAnRU5PTUVNJyB8fCBlcnIudG9TdHJpbmcoKS5pbmRleE9mKCdub3QgZW5vdWdoIG1lbW9yeScpID49IDApIHtcblx0XHRcdFx0XHQvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0XHRcdFx0XHRwcm9jZXNzLnNlbmQoe2xvZzogYFtwaWQ6JHtwcm9jZXNzLnBpZH1dJHtvcy5ob3N0bmFtZSgpfSAke29zLnVzZXJJbmZvKCkudXNlcm5hbWV9IFtGcmVlIG1lbV06ICR7TWF0aC5yb3VuZChvcy5mcmVlbWVtKCkgLyAxMDQ4NTc2KX1NLCBbdG90YWwgbWVtXTogJHtNYXRoLnJvdW5kKG9zLnRvdGFsbWVtKCkgLyAxMDQ4NTc2KX1NYH0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJlamVjdChlcnIpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cHJvY2Vzcy5zZW5kKHtkb25lOiBgW3BpZDoke3Byb2Nlc3MucGlkfV1kb25lYH0pO1xuXHRcdFx0XHRjb25zb2xlLmxvZygnemlwIGV4dHJhY3RlZCB0byAnICsgemlwRXh0cmFjdERpcik7XG5cdFx0XHRcdHJlc29sdmUoKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJldHJ5PFQ+KGZ1bmM6ICguLi5hcmdzOiBhbnlbXSkgPT4gUHJvbWlzZTxUPiwgLi4uYXJnczogYW55W10pOiBQcm9taXNlPFQ+IHtcblx0Zm9yIChsZXQgY250ID0gMDs7KSB7XG5cdFx0dHJ5IHtcblx0XHRcdHJldHVybiBhd2FpdCBmdW5jKC4uLmFyZ3MpO1xuXHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0Y250Kys7XG5cdFx0XHRpZiAoY250ID49IHJldHJ5VGltZXMpIHtcblx0XHRcdFx0dGhyb3cgZXJyO1xuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coZXJyKTtcblx0XHRcdHByb2Nlc3Muc2VuZCh7bG9nOiAnRW5jb3VudGVyIGVycm9yLCB3aWxsIHJldHJ5J30pO1xuXHRcdH1cblx0XHRhd2FpdCBuZXcgUHJvbWlzZShyZXMgPT4gc2V0VGltZW91dChyZXMsIDUwMDApKTtcblx0fVxufVxuXG5kb3dubG9hZFppcChmZXRjaFVybCk7XG4iXX0=
