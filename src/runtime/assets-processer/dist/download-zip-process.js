"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-console
// import {ZipResourceMiddleware} from 'serve-static-zip';
const request_1 = __importDefault(require("request"));
const fs_1 = __importDefault(require("fs"));
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
process.on('unhandledRejection', (err) => {
    // tslint:disable-next-line
    console.log(err);
    process.send && process.send({ error: err });
});
function downloadZip(fetchUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line
        // log.info(`${os.hostname()} ${os.userInfo().username} download zip[Free mem]: ${Math.round(os.freemem() / 1048576)}M, [total mem]: ${Math.round(os.totalmem() / 1048576)}M`);
        const resource = fetchUrl + '?' + Math.random();
        // const downloadTo = api.config.resolve('destDir', `remote-${Math.random()}-${path.split('/').pop()}`);
        // log.info('fetch', resource);
        process.send && process.send({ log: `[pid:${process.pid}] fetch ` + resource });
        yield retry(() => __awaiter(this, void 0, void 0, function* () {
            yield new Promise((resolve, rej) => {
                const writeStream = fs_1.default.createWriteStream(fileName);
                writeStream.on('finish', () => {
                    process.send && process.send({ log: 'zip file is written: ' + fileName });
                    resolve(null);
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
    return __awaiter(this, void 0, void 0, function* () {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG93bmxvYWQtemlwLXByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkb3dubG9hZC16aXAtcHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1QiwwREFBMEQ7QUFDMUQsc0RBQThCO0FBQzlCLDRDQUFvQjtBQUNwQiwyQkFBMkI7QUFFM0IsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztBQUMxQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pCLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFFekMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO0lBQ3RDLDJCQUEyQjtJQUM1QixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2hCLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDO0FBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO0lBQ3ZDLDJCQUEyQjtJQUMzQixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDO0FBRUgsU0FBZSxXQUFXLENBQUMsUUFBZ0I7O1FBQ3pDLDJCQUEyQjtRQUM1QiwrS0FBK0s7UUFDOUssTUFBTSxRQUFR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SSxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FBQztJQUMzQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuLy8gaW1wb3J0IHtaaXBSZXNvdXJjZU1pZGRsZXdhcmV9IGZyb20gJ3NlcnZlLXN0YXRpYy16aXAnO1xuaW1wb3J0IHJlcXVlc3QgZnJvbSAncmVxdWVzdCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuLy8gaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5cbmNvbnN0IGFyZ3YgPSBwcm9jZXNzLmFyZ3Y7XG5jb25zdCBmZXRjaFVybCA9IGFyZ3ZbMl07XG5jb25zdCBmaWxlTmFtZSA9IGFyZ3ZbM107XG5jb25zdCByZXRyeVRpbWVzID0gcGFyc2VJbnQoYXJndls0XSwgMTApO1xuXG5wcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsIChlcnIpID0+IHtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdGNvbnNvbGUubG9nKGVycik7XG4gIHByb2Nlc3Muc2VuZCAmJiBwcm9jZXNzLnNlbmQoe2Vycm9yOiBlcnJ9KTtcbn0pO1xuXG5wcm9jZXNzLm9uKCd1bmhhbmRsZWRSZWplY3Rpb24nLCAoZXJyKSA9PiB7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuICBjb25zb2xlLmxvZyhlcnIpO1xuICBwcm9jZXNzLnNlbmQgJiYgcHJvY2Vzcy5zZW5kKHtlcnJvcjogZXJyfSk7XG59KTtcblxuYXN5bmMgZnVuY3Rpb24gZG93bmxvYWRaaXAoZmV0Y2hVcmw6IHN0cmluZykge1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0Ly8gbG9nLmluZm8oYCR7b3MuaG9zdG5hbWUoKX0gJHtvcy51c2VySW5mbygpLnVzZXJuYW1lfSBkb3dubG9hZCB6aXBbRnJlZSBtZW1dOiAke01hdGgucm91bmQob3MuZnJlZW1lbSgpIC8gMTA0ODU3Nil9TSwgW3RvdGFsIG1lbV06ICR7TWF0aC5yb3VuZChvcy50b3RhbG1lbSgpIC8gMTA0ODU3Nil9TWApO1xuICBjb25zdCByZXNvdXJjZSA9IGZldGNoVXJsICsgJz8nICsgTWF0aC5yYW5kb20oKTtcbiAgLy8gY29uc3QgZG93bmxvYWRUbyA9IGFwaS5jb25maWcucmVzb2x2ZSgnZGVzdERpcicsIGByZW1vdGUtJHtNYXRoLnJhbmRvbSgpfS0ke3BhdGguc3BsaXQoJy8nKS5wb3AoKX1gKTtcbiAgLy8gbG9nLmluZm8oJ2ZldGNoJywgcmVzb3VyY2UpO1xuICBwcm9jZXNzLnNlbmQgJiYgcHJvY2Vzcy5zZW5kKHtsb2c6IGBbcGlkOiR7cHJvY2Vzcy5waWR9XSBmZXRjaCBgKyByZXNvdXJjZX0pO1xuICBhd2FpdCByZXRyeShhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgbmV3IFByb21pc2U8QnVmZmVyfG51bGw+KChyZXNvbHZlLCByZWopID0+IHtcbiAgICAgIGNvbnN0IHdyaXRlU3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0oZmlsZU5hbWUpO1xuICAgICAgd3JpdGVTdHJlYW0ub24oJ2ZpbmlzaCcsICgpID0+IHtcbiAgICAgICAgcHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7bG9nOiAnemlwIGZpbGUgaXMgd3JpdHRlbjogJyArIGZpbGVOYW1lfSk7XG4gICAgICAgIHJlc29sdmUobnVsbCk7XG4gICAgICB9KTtcbiAgICAgIHJlcXVlc3Qoe1xuICAgICAgICB1cmk6IHJlc291cmNlLCBtZXRob2Q6ICdHRVQnLCBlbmNvZGluZzogbnVsbFxuICAgICAgfSlcbiAgICAgIC5vbigncmVzcG9uc2UnLCByZXMgPT4ge1xuICAgICAgICBpZiAocmVzLnN0YXR1c0NvZGUgPiAyOTkgfHwgcmVzLnN0YXR1c0NvZGUgPCAyMDApXG4gICAgICAgICAgcmV0dXJuIHJlaihuZXcgRXJyb3IocmVzLnN0YXR1c0NvZGUgKyAnICcgKyByZXMuc3RhdHVzTWVzc2FnZSkpO1xuICAgICAgfSlcbiAgICAgIC5vbignZXJyb3InLCBlcnIgPT4ge1xuICAgICAgICByZXR1cm4gcmVqKGVycik7XG4gICAgICB9KVxuICAgICAgLnBpcGUod3JpdGVTdHJlYW0pO1xuICAgIH0pO1xuICAgIC8vIGZzLndyaXRlRmlsZVN5bmMoUGF0aC5yZXNvbHZlKGRpc3REaXIsIGZpbGVOYW1lKSxcbiAgICAvLyBcdGJ1Zik7XG4gICAgcHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7bG9nOiBgJHtmaWxlTmFtZX0gaXMgd3JpdHRlbi5gfSk7XG4gICAgLy8gY29uc3QgemlwID0gbmV3IEFkbVppcChidWYpO1xuICAgIC8vIGF3YWl0IHRyeUV4dHJhY3QoemlwKTtcbiAgfSk7XG59XG5cblxuXG5hc3luYyBmdW5jdGlvbiByZXRyeTxUPihmdW5jOiAoLi4uYXJnczogYW55W10pID0+IFByb21pc2U8VD4sIC4uLmFyZ3M6IGFueVtdKTogUHJvbWlzZTxUPiB7XG4gIGZvciAobGV0IGNudCA9IDA7Oykge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gYXdhaXQgZnVuYyguLi5hcmdzKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNudCsrO1xuICAgICAgaWYgKGNudCA+PSByZXRyeVRpbWVzKSB7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICBwcm9jZXNzLnNlbmQgJiYgcHJvY2Vzcy5zZW5kKHtsb2c6ICdFbmNvdW50ZXIgZXJyb3IsIHdpbGwgcmV0cnkgJyArIChlcnIgYXMgRXJyb3IpLnN0YWNrID8gZXJyLnN0YWNrIDogZXJyfSk7XG4gICAgfVxuICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlcyA9PiBzZXRUaW1lb3V0KHJlcywgY250ICogNTAwMCkpO1xuICB9XG59XG5cbmRvd25sb2FkWmlwKGZldGNoVXJsKVxuLmNhdGNoKGVyciA9PiB7XG4gIHByb2Nlc3Muc2VuZCAmJiBwcm9jZXNzLnNlbmQoe2Vycm9yOiBlcnJ9KTtcbiAgcHJvY2Vzcy5leGl0KDEpO1xufSk7XG4iXX0=