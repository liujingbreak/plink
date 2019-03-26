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
            yield new Promise(res => setTimeout(res, cnt * 5000));
        }
    });
}
downloadZip(fetchUrl);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2Rvd25sb2FkLXppcC1wcm9jZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRCQUE0QjtBQUM1QiwwREFBMEQ7QUFDMUQsOERBQThCO0FBQzlCLDhEQUE2QjtBQUM3QixvREFBb0I7QUFHcEIsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztBQUMxQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekIsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlCLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFFekMsU0FBZSxXQUFXLENBQUMsUUFBZ0I7O1FBQzFDLDJCQUEyQjtRQUMzQiwrS0FBK0s7UUFDL0ssTUFBTSxRQUFRLEdBQUcsUUFBUSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDaEQsd0dBQXdHO1FBQ3hHLCtCQUErQjtRQUMvQixPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUMsR0FBRyxFQUFFLFFBQVEsT0FBTyxDQUFDLEdBQUcsVUFBVSxHQUFFLFFBQVEsRUFBQyxDQUFDLENBQUM7UUFDN0QsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSxRQUFRLE9BQU8sQ0FBQyxHQUFHLHdDQUF3QyxFQUFDLENBQUMsQ0FBQztRQUNqRixNQUFNLEtBQUssQ0FBQyxHQUFTLEVBQUU7WUFDdEIsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLE9BQU8sQ0FBUyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsRUFBRTtnQkFDdEQsaUJBQU8sQ0FBQztvQkFDUCxHQUFHLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLElBQUk7aUJBQzVDLEVBQUUs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QUU7b0JBQ3RCLE1BQU0sR0FBRyxDQUFDO2lCQUNWO2dCQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2pCLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBQyxHQUFHLEVBQUUsNkJBQTZCLEVBQUMsQ0FBQyxDQUFDO2FBQ25EO1lBQ0QsTUFBTSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7U0FDdEQ7SUFDRixDQUFDO0NBQUE7QUFFRCxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9kb3dubG9hZC16aXAtcHJvY2Vzcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcbi8vIGltcG9ydCB7WmlwUmVzb3VyY2VNaWRkbGV3YXJlfSBmcm9tICdzZXJ2ZS1zdGF0aWMtemlwJztcbmltcG9ydCByZXF1ZXN0IGZyb20gJ3JlcXVlc3QnO1xuaW1wb3J0IEFkbVppcCBmcm9tICdhZG0temlwJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5cblxuY29uc3QgYXJndiA9IHByb2Nlc3MuYXJndjtcbmNvbnN0IGZldGNoVXJsID0gYXJndlsyXTtcbmNvbnN0IHppcEV4dHJhY3REaXIgPSBhcmd2WzNdO1xuY29uc3QgcmV0cnlUaW1lcyA9IHBhcnNlSW50KGFyZ3ZbNF0sIDEwKTtcblxuYXN5bmMgZnVuY3Rpb24gZG93bmxvYWRaaXAoZmV0Y2hVcmw6IHN0cmluZykge1xuXHQvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0Ly8gbG9nLmluZm8oYCR7b3MuaG9zdG5hbWUoKX0gJHtvcy51c2VySW5mbygpLnVzZXJuYW1lfSBkb3dubG9hZCB6aXBbRnJlZSBtZW1dOiAke01hdGgucm91bmQob3MuZnJlZW1lbSgpIC8gMTA0ODU3Nil9TSwgW3RvdGFsIG1lbV06ICR7TWF0aC5yb3VuZChvcy50b3RhbG1lbSgpIC8gMTA0ODU3Nil9TWApO1xuXHRjb25zdCByZXNvdXJjZSA9IGZldGNoVXJsICsgJz8nICsgTWF0aC5yYW5kb20oKTtcblx0Ly8gY29uc3QgZG93bmxvYWRUbyA9IGFwaS5jb25maWcucmVzb2x2ZSgnZGVzdERpcicsIGByZW1vdGUtJHtNYXRoLnJhbmRvbSgpfS0ke3BhdGguc3BsaXQoJy8nKS5wb3AoKX1gKTtcblx0Ly8gbG9nLmluZm8oJ2ZldGNoJywgcmVzb3VyY2UpO1xuXHRwcm9jZXNzLnNlbmQoe2xvZzogYFtwaWQ6JHtwcm9jZXNzLnBpZH1dIGZldGNoIGArIHJlc291cmNlfSk7XG5cdHByb2Nlc3Muc2VuZCh7bG9nOiBgW3BpZDoke3Byb2Nlc3MucGlkfV0gZG93bmxvYWRpbmcgemlwIGNvbnRlbnQgdG8gbWVtb3J5Li4uYH0pO1xuXHRhd2FpdCByZXRyeShhc3luYyAoKSA9PiB7XG5cdFx0Y29uc3QgYnVmID0gYXdhaXQgbmV3IFByb21pc2U8QnVmZmVyPigocmVzb2x2ZSwgcmVqKSA9PiB7XG5cdFx0XHRyZXF1ZXN0KHtcblx0XHRcdFx0dXJpOiByZXNvdXJjZSwgbWV0aG9kOiAnR0VUJywgZW5jb2Rpbmc6IG51bGxcblx0XHRcdH0sIChlcnIsIHJlcywgYm9keSkgPT4ge1xuXHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHJlaihlcnIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChyZXMuc3RhdHVzQ29kZSA+IDI5OSB8fCByZXMuc3RhdHVzQ29kZSA8IDIwMClcblx0XHRcdFx0XHRyZXR1cm4gcmVqKG5ldyBFcnJvcihyZXMuc3RhdHVzQ29kZSArICcgJyArIHJlcy5zdGF0dXNNZXNzYWdlKSk7XG5cdFx0XHRcdGNvbnN0IHNpemUgPSAoYm9keSBhcyBCdWZmZXIpLmJ5dGVMZW5ndGg7XG5cdFx0XHRcdC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuXHRcdFx0XHRwcm9jZXNzLnNlbmQoe2xvZzogYFtwaWQ6JHtwcm9jZXNzLnBpZH1dIHppcCBsb2FkZWQsIGxlbmd0aDoke3NpemUgPiAxMDI0ID8gTWF0aC5yb3VuZChzaXplIC8gMTAyNCkgKyAnaycgOiBzaXplfWB9KTtcblx0XHRcdFx0cmVzb2x2ZShib2R5KTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdGNvbnN0IHppcCA9IG5ldyBBZG1aaXAoYnVmKTtcblx0XHRhd2FpdCB0cnlFeHRyYWN0KHppcCk7XG5cdH0pO1xufVxuXG5mdW5jdGlvbiB0cnlFeHRyYWN0KHppcDogQWRtWmlwKSB7XG5cdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0emlwLmV4dHJhY3RBbGxUb0FzeW5jKHppcEV4dHJhY3REaXIsIHRydWUsIChlcnIpID0+IHtcblx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0cHJvY2Vzcy5zZW5kKHtlcnJvcjogZXJyfSk7XG5cdFx0XHRcdGlmICgoZXJyIGFzIGFueSkuY29kZSA9PT0gJ0VOT01FTScgfHwgZXJyLnRvU3RyaW5nKCkuaW5kZXhPZignbm90IGVub3VnaCBtZW1vcnknKSA+PSAwKSB7XG5cdFx0XHRcdFx0Ly8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdFx0XHRcdFx0cHJvY2Vzcy5zZW5kKHtsb2c6IGBbcGlkOiR7cHJvY2Vzcy5waWR9XSR7b3MuaG9zdG5hbWUoKX0gJHtvcy51c2VySW5mbygpLnVzZXJuYW1lfSBbRnJlZSBtZW1dOiAke01hdGgucm91bmQob3MuZnJlZW1lbSgpIC8gMTA0ODU3Nil9TSwgW3RvdGFsIG1lbV06ICR7TWF0aC5yb3VuZChvcy50b3RhbG1lbSgpIC8gMTA0ODU3Nil9TWB9KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZWplY3QoZXJyKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHByb2Nlc3Muc2VuZCh7ZG9uZTogYFtwaWQ6JHtwcm9jZXNzLnBpZH1dZG9uZWB9KTtcblx0XHRcdFx0Y29uc29sZS5sb2coJ3ppcCBleHRyYWN0ZWQgdG8gJyArIHppcEV4dHJhY3REaXIpO1xuXHRcdFx0XHRyZXNvbHZlKCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiByZXRyeTxUPihmdW5jOiAoLi4uYXJnczogYW55W10pID0+IFByb21pc2U8VD4sIC4uLmFyZ3M6IGFueVtdKTogUHJvbWlzZTxUPiB7XG5cdGZvciAobGV0IGNudCA9IDA7Oykge1xuXHRcdHRyeSB7XG5cdFx0XHRyZXR1cm4gYXdhaXQgZnVuYyguLi5hcmdzKTtcblx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdGNudCsrO1xuXHRcdFx0aWYgKGNudCA+PSByZXRyeVRpbWVzKSB7XG5cdFx0XHRcdHRocm93IGVycjtcblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKGVycik7XG5cdFx0XHRwcm9jZXNzLnNlbmQoe2xvZzogJ0VuY291bnRlciBlcnJvciwgd2lsbCByZXRyeSd9KTtcblx0XHR9XG5cdFx0YXdhaXQgbmV3IFByb21pc2UocmVzID0+IHNldFRpbWVvdXQocmVzLCBjbnQgKiA1MDAwKSk7XG5cdH1cbn1cblxuZG93bmxvYWRaaXAoZmV0Y2hVcmwpO1xuIl19
