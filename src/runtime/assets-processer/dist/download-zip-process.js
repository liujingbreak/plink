"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable:no-console
// import {ZipResourceMiddleware} from 'serve-static-zip';
const request_1 = tslib_1.__importDefault(require("request"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
const argv = process.argv;
const fetchUrl = argv[2];
const distDir = argv[3];
const retryTimes = parseInt(argv[4], 10);
process.on('uncaughtException', (err) => {
    // tslint:disable-next-line
    console.log(err);
    process.send({ error: err });
});
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
            fs_1.default.writeFileSync(path_1.default.resolve(distDir, 'download-update-' + (new Date().getTime()) + '.zip'), buf);
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
                process.send({ log: 'Encounter error, will retry' });
            }
            yield new Promise(res => setTimeout(res, cnt * 5000));
        }
    });
}
downloadZip(fetchUrl);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2Rvd25sb2FkLXppcC1wcm9jZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRCQUE0QjtBQUM1QiwwREFBMEQ7QUFDMUQsOERBQThCO0FBRTlCLG9EQUFvQjtBQUNwQix3REFBd0I7QUFFeEIsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztBQUMxQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hCLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFFekMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO0lBQ3ZDLDJCQUEyQjtJQUMzQixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQztBQUVILFNBQWUsV0FBVyxDQUFDLFFBQWdCOztRQUMxQywyQkFBMkI7UUFDM0IsK0tBQStLO1FBQy9LLE1BQU0sUUFBUSxHQUFHLFFBQVEsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2hELHdHQUF3RztRQUN4RywrQkFBK0I7UUFDL0IsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSxRQUFRLE9BQU8sQ0FBQyxHQUFHLFVBQVUsR0FBRSxRQUFRLEVBQUMsQ0FBQyxDQUFDO1FBQzdELE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBQyxHQUFHLEVBQUUsUUFBUSxPQUFPLENBQUMsR0FBRyx3Q0FBd0MsRUFBQyxDQUFDLENBQUM7UUFDakYsTUFBTSxLQUFLLENBQUMsR0FBUyxFQUFFO1lBQ3RCLE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxPQUFPLENBQVMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLEVBQUU7Z0JBQ3RELGlCQUFPLENBQUM7b0JBQ1AsR0FBRyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUFJO2lCQUM1QyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtvQkFDckIsSUFBSSxHQUFHLEVBQUU7d0JBQ1IsT0FBTyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7cUJBQ2hCO29CQUNELElBQUksR0FBRyxDQUFDLFVBQVUsR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLFVBQVUsR0FBRyxHQUFHO3dCQUMvQyxPQUFPLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztvQkFDakUsTUFBTSxJQUFJLEdBQUksSUFBZSxDQUFDLFVBQVUsQ0FBQztvQkFDekMsMkJBQTJCO29CQUMzQixPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUMsR0FBRyxFQUFFLFFBQVEsT0FBTyxDQUFDLEdBQUcsd0JBQXdCLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUMsQ0FBQyxDQUFDO29CQUNySCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2YsQ0FBQyxDQUFDLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztZQUNILFlBQUUsQ0FBQyxhQUFhLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsa0JBQWtCLEdBQUcsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLEVBQzNGLEdBQUcsQ0FBQyxDQUFDO1lBQ04sK0JBQStCO1lBQy9CLHlCQUF5QjtRQUMxQixDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUFBO0FBSUQsU0FBZSxLQUFLLENBQUksSUFBb0MsRUFBRSxHQUFHLElBQVc7O1FBQzNFLEtBQUssSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJO1lBQ25CLElBQUk7Z0JBQ0gsT0FBTyxNQUFNLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO2FBQzNCO1lBQUMsT0FBTyxHQUFHLEVBQUU7Z0JBQ2IsR0FBRyxFQUFFLENBQUM7Z0JBQ04sSUFBSSxHQUFHLElBQUksVUFBVSxFQUFFO29CQUN0QixNQUFNLEdBQUcsQ0FBQztpQkFDVjtnQkFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUMsR0FBRyxFQUFFLDZCQUE2QixFQUFDLENBQUMsQ0FBQzthQUNuRDtZQUNELE1BQU0sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1NBQ3REO0lBQ0YsQ0FBQztDQUFBO0FBRUQsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvZG93bmxvYWQtemlwLXByb2Nlc3MuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG4vLyBpbXBvcnQge1ppcFJlc291cmNlTWlkZGxld2FyZX0gZnJvbSAnc2VydmUtc3RhdGljLXppcCc7XG5pbXBvcnQgcmVxdWVzdCBmcm9tICdyZXF1ZXN0JztcblxuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuXG5jb25zdCBhcmd2ID0gcHJvY2Vzcy5hcmd2O1xuY29uc3QgZmV0Y2hVcmwgPSBhcmd2WzJdO1xuY29uc3QgZGlzdERpciA9IGFyZ3ZbM107XG5jb25zdCByZXRyeVRpbWVzID0gcGFyc2VJbnQoYXJndls0XSwgMTApO1xuXG5wcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsIChlcnIpID0+IHtcblx0Ly8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdGNvbnNvbGUubG9nKGVycik7XG5cdHByb2Nlc3Muc2VuZCh7ZXJyb3I6IGVycn0pO1xufSk7XG5cbmFzeW5jIGZ1bmN0aW9uIGRvd25sb2FkWmlwKGZldGNoVXJsOiBzdHJpbmcpIHtcblx0Ly8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdC8vIGxvZy5pbmZvKGAke29zLmhvc3RuYW1lKCl9ICR7b3MudXNlckluZm8oKS51c2VybmFtZX0gZG93bmxvYWQgemlwW0ZyZWUgbWVtXTogJHtNYXRoLnJvdW5kKG9zLmZyZWVtZW0oKSAvIDEwNDg1NzYpfU0sIFt0b3RhbCBtZW1dOiAke01hdGgucm91bmQob3MudG90YWxtZW0oKSAvIDEwNDg1NzYpfU1gKTtcblx0Y29uc3QgcmVzb3VyY2UgPSBmZXRjaFVybCArICc/JyArIE1hdGgucmFuZG9tKCk7XG5cdC8vIGNvbnN0IGRvd25sb2FkVG8gPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCBgcmVtb3RlLSR7TWF0aC5yYW5kb20oKX0tJHtwYXRoLnNwbGl0KCcvJykucG9wKCl9YCk7XG5cdC8vIGxvZy5pbmZvKCdmZXRjaCcsIHJlc291cmNlKTtcblx0cHJvY2Vzcy5zZW5kKHtsb2c6IGBbcGlkOiR7cHJvY2Vzcy5waWR9XSBmZXRjaCBgKyByZXNvdXJjZX0pO1xuXHRwcm9jZXNzLnNlbmQoe2xvZzogYFtwaWQ6JHtwcm9jZXNzLnBpZH1dIGRvd25sb2FkaW5nIHppcCBjb250ZW50IHRvIG1lbW9yeS4uLmB9KTtcblx0YXdhaXQgcmV0cnkoYXN5bmMgKCkgPT4ge1xuXHRcdGNvbnN0IGJ1ZiA9IGF3YWl0IG5ldyBQcm9taXNlPEJ1ZmZlcj4oKHJlc29sdmUsIHJlaikgPT4ge1xuXHRcdFx0cmVxdWVzdCh7XG5cdFx0XHRcdHVyaTogcmVzb3VyY2UsIG1ldGhvZDogJ0dFVCcsIGVuY29kaW5nOiBudWxsXG5cdFx0XHR9LCAoZXJyLCByZXMsIGJvZHkpID0+IHtcblx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdHJldHVybiByZWooZXJyKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAocmVzLnN0YXR1c0NvZGUgPiAyOTkgfHwgcmVzLnN0YXR1c0NvZGUgPCAyMDApXG5cdFx0XHRcdFx0cmV0dXJuIHJlaihuZXcgRXJyb3IocmVzLnN0YXR1c0NvZGUgKyAnICcgKyByZXMuc3RhdHVzTWVzc2FnZSkpO1xuXHRcdFx0XHRjb25zdCBzaXplID0gKGJvZHkgYXMgQnVmZmVyKS5ieXRlTGVuZ3RoO1xuXHRcdFx0XHQvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0XHRcdFx0cHJvY2Vzcy5zZW5kKHtsb2c6IGBbcGlkOiR7cHJvY2Vzcy5waWR9XSB6aXAgbG9hZGVkLCBsZW5ndGg6JHtzaXplID4gMTAyNCA/IE1hdGgucm91bmQoc2l6ZSAvIDEwMjQpICsgJ2snIDogc2l6ZX1gfSk7XG5cdFx0XHRcdHJlc29sdmUoYm9keSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XHRmcy53cml0ZUZpbGVTeW5jKFBhdGgucmVzb2x2ZShkaXN0RGlyLCAnZG93bmxvYWQtdXBkYXRlLScgKyAobmV3IERhdGUoKS5nZXRUaW1lKCkpICsgJy56aXAnKSxcblx0XHRcdGJ1Zik7XG5cdFx0Ly8gY29uc3QgemlwID0gbmV3IEFkbVppcChidWYpO1xuXHRcdC8vIGF3YWl0IHRyeUV4dHJhY3QoemlwKTtcblx0fSk7XG59XG5cblxuXG5hc3luYyBmdW5jdGlvbiByZXRyeTxUPihmdW5jOiAoLi4uYXJnczogYW55W10pID0+IFByb21pc2U8VD4sIC4uLmFyZ3M6IGFueVtdKTogUHJvbWlzZTxUPiB7XG5cdGZvciAobGV0IGNudCA9IDA7Oykge1xuXHRcdHRyeSB7XG5cdFx0XHRyZXR1cm4gYXdhaXQgZnVuYyguLi5hcmdzKTtcblx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdGNudCsrO1xuXHRcdFx0aWYgKGNudCA+PSByZXRyeVRpbWVzKSB7XG5cdFx0XHRcdHRocm93IGVycjtcblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKGVycik7XG5cdFx0XHRwcm9jZXNzLnNlbmQoe2xvZzogJ0VuY291bnRlciBlcnJvciwgd2lsbCByZXRyeSd9KTtcblx0XHR9XG5cdFx0YXdhaXQgbmV3IFByb21pc2UocmVzID0+IHNldFRpbWVvdXQocmVzLCBjbnQgKiA1MDAwKSk7XG5cdH1cbn1cblxuZG93bmxvYWRaaXAoZmV0Y2hVcmwpO1xuIl19
