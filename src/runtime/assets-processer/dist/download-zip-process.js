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
process.on('unhandledRejection', (err) => {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2Rvd25sb2FkLXppcC1wcm9jZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRCQUE0QjtBQUM1QiwwREFBMEQ7QUFDMUQsOERBQThCO0FBRTlCLG9EQUFvQjtBQUNwQiwyQkFBMkI7QUFFM0IsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztBQUMxQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pCLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFFekMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO0lBQ3RDLDJCQUEyQjtJQUM1QixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2hCLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDO0FBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO0lBQ3ZDLDJCQUEyQjtJQUMzQixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDO0FBRUgsU0FBZSxXQUFXLENBQUMsUUFBZ0I7O1FBQ3pDLDJCQUEyQjtRQUM1QiwrS0FBK0s7UUFDOUssTUFBTSxRQUFRLEdBQUcsUUFBUSxHQUFHLEdB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QUMsS0FBSyxFQUFFLEdBQUcsRUFBQyxDQUFDLENBQUM7SUFDM0MsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2Rvd25sb2FkLXppcC1wcm9jZXNzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuLy8gaW1wb3J0IHtaaXBSZXNvdXJjZU1pZGRsZXdhcmV9IGZyb20gJ3NlcnZlLXN0YXRpYy16aXAnO1xuaW1wb3J0IHJlcXVlc3QgZnJvbSAncmVxdWVzdCc7XG5cbmltcG9ydCBmcyBmcm9tICdmcyc7XG4vLyBpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcblxuY29uc3QgYXJndiA9IHByb2Nlc3MuYXJndjtcbmNvbnN0IGZldGNoVXJsID0gYXJndlsyXTtcbmNvbnN0IGZpbGVOYW1lID0gYXJndlszXTtcbmNvbnN0IHJldHJ5VGltZXMgPSBwYXJzZUludChhcmd2WzRdLCAxMCk7XG5cbnByb2Nlc3Mub24oJ3VuY2F1Z2h0RXhjZXB0aW9uJywgKGVycikgPT4ge1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0Y29uc29sZS5sb2coZXJyKTtcbiAgcHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7ZXJyb3I6IGVycn0pO1xufSk7XG5cbnByb2Nlc3Mub24oJ3VuaGFuZGxlZFJlamVjdGlvbicsIChlcnIpID0+IHtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG4gIGNvbnNvbGUubG9nKGVycik7XG4gIHByb2Nlc3Muc2VuZCAmJiBwcm9jZXNzLnNlbmQoe2Vycm9yOiBlcnJ9KTtcbn0pO1xuXG5hc3luYyBmdW5jdGlvbiBkb3dubG9hZFppcChmZXRjaFVybDogc3RyaW5nKSB7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuXHQvLyBsb2cuaW5mbyhgJHtvcy5ob3N0bmFtZSgpfSAke29zLnVzZXJJbmZvKCkudXNlcm5hbWV9IGRvd25sb2FkIHppcFtGcmVlIG1lbV06ICR7TWF0aC5yb3VuZChvcy5mcmVlbWVtKCkgLyAxMDQ4NTc2KX1NLCBbdG90YWwgbWVtXTogJHtNYXRoLnJvdW5kKG9zLnRvdGFsbWVtKCkgLyAxMDQ4NTc2KX1NYCk7XG4gIGNvbnN0IHJlc291cmNlID0gZmV0Y2hVcmwgKyAnPycgKyBNYXRoLnJhbmRvbSgpO1xuICAvLyBjb25zdCBkb3dubG9hZFRvID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgYHJlbW90ZS0ke01hdGgucmFuZG9tKCl9LSR7cGF0aC5zcGxpdCgnLycpLnBvcCgpfWApO1xuICAvLyBsb2cuaW5mbygnZmV0Y2gnLCByZXNvdXJjZSk7XG4gIHByb2Nlc3Muc2VuZCAmJiBwcm9jZXNzLnNlbmQoe2xvZzogYFtwaWQ6JHtwcm9jZXNzLnBpZH1dIGZldGNoIGArIHJlc291cmNlfSk7XG4gIGF3YWl0IHJldHJ5KGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCBuZXcgUHJvbWlzZTxCdWZmZXI+KChyZXNvbHZlLCByZWopID0+IHtcbiAgICAgIGNvbnN0IHdyaXRlU3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0oZmlsZU5hbWUpO1xuICAgICAgd3JpdGVTdHJlYW0ub24oJ2ZpbmlzaCcsICgpID0+IHtcbiAgICAgICAgcHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7bG9nOiAnemlwIGZpbGUgaXMgd3JpdHRlbjogJyArIGZpbGVOYW1lfSk7XG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgIH0pO1xuICAgICAgcmVxdWVzdCh7XG4gICAgICAgIHVyaTogcmVzb3VyY2UsIG1ldGhvZDogJ0dFVCcsIGVuY29kaW5nOiBudWxsXG4gICAgICB9KVxuICAgICAgLm9uKCdyZXNwb25zZScsIHJlcyA9PiB7XG4gICAgICAgIGlmIChyZXMuc3RhdHVzQ29kZSA+IDI5OSB8fCByZXMuc3RhdHVzQ29kZSA8IDIwMClcbiAgICAgICAgICByZXR1cm4gcmVqKG5ldyBFcnJvcihyZXMuc3RhdHVzQ29kZSArICcgJyArIHJlcy5zdGF0dXNNZXNzYWdlKSk7XG4gICAgICB9KVxuICAgICAgLm9uKCdlcnJvcicsIGVyciA9PiB7XG4gICAgICAgIHJldHVybiByZWooZXJyKTtcbiAgICAgIH0pXG4gICAgICAucGlwZSh3cml0ZVN0cmVhbSk7XG4gICAgfSk7XG4gICAgLy8gZnMud3JpdGVGaWxlU3luYyhQYXRoLnJlc29sdmUoZGlzdERpciwgZmlsZU5hbWUpLFxuICAgIC8vIFx0YnVmKTtcbiAgICBwcm9jZXNzLnNlbmQgJiYgcHJvY2Vzcy5zZW5kKHtsb2c6IGAke2ZpbGVOYW1lfSBpcyB3cml0dGVuLmB9KTtcbiAgICAvLyBjb25zdCB6aXAgPSBuZXcgQWRtWmlwKGJ1Zik7XG4gICAgLy8gYXdhaXQgdHJ5RXh0cmFjdCh6aXApO1xuICB9KTtcbn1cblxuXG5cbmFzeW5jIGZ1bmN0aW9uIHJldHJ5PFQ+KGZ1bmM6ICguLi5hcmdzOiBhbnlbXSkgPT4gUHJvbWlzZTxUPiwgLi4uYXJnczogYW55W10pOiBQcm9taXNlPFQ+IHtcbiAgZm9yIChsZXQgY250ID0gMDs7KSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBhd2FpdCBmdW5jKC4uLmFyZ3MpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY250Kys7XG4gICAgICBpZiAoY250ID49IHJldHJ5VGltZXMpIHtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgIHByb2Nlc3Muc2VuZCAmJiBwcm9jZXNzLnNlbmQoe2xvZzogJ0VuY291bnRlciBlcnJvciwgd2lsbCByZXRyeSAnICsgKGVyciBhcyBFcnJvcikuc3RhY2sgPyBlcnIuc3RhY2sgOiBlcnJ9KTtcbiAgICB9XG4gICAgYXdhaXQgbmV3IFByb21pc2UocmVzID0+IHNldFRpbWVvdXQocmVzLCBjbnQgKiA1MDAwKSk7XG4gIH1cbn1cblxuZG93bmxvYWRaaXAoZmV0Y2hVcmwpXG4uY2F0Y2goZXJyID0+IHtcbiAgcHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7ZXJyb3I6IGVycn0pO1xuICBwcm9jZXNzLmV4aXQoMSk7XG59KTtcbiJdfQ==
