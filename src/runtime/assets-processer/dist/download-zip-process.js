"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
// import {ZipResourceMiddleware} from 'serve-static-zip';
const request_1 = __importDefault(require("request"));
const fs_1 = __importDefault(require("fs"));
// import Path from 'path';
const argv = process.argv;
const fetchUrl = argv[2];
const fileName = argv[3];
const retryTimes = parseInt(argv[4], 10);
process.on('uncaughtException', (err) => {
    // eslint-disable-next-line
    console.log(err);
    process.send && process.send({ error: err });
});
process.on('unhandledRejection', (err) => {
    // eslint-disable-next-line
    console.log(err);
    process.send && process.send({ error: err });
});
async function downloadZip(fetchUrl) {
    // eslint-disable-next-line
    // log.info(`${os.hostname()} ${os.userInfo().username} download zip[Free mem]: ${Math.round(os.freemem() / 1048576)}M, [total mem]: ${Math.round(os.totalmem() / 1048576)}M`);
    const resource = fetchUrl + '?' + Math.random();
    // const downloadTo = api.config.resolve('destDir', `remote-${Math.random()}-${path.split('/').pop()}`);
    // log.info('fetch', resource);
    process.send && process.send({ log: `[pid:${process.pid}] fetch ` + resource });
    await retry(async () => {
        await new Promise((resolve, rej) => {
            const writeStream = fs_1.default.createWriteStream(fileName);
            writeStream.on('finish', () => {
                process.send && process.send({ log: 'zip file is written: ' + fileName });
                resolve(null);
            });
            (0, request_1.default)({
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
    });
}
async function retry(func, ...args) {
    for (let cnt = 0;;) {
        try {
            return await func(...args);
        }
        catch (err) {
            cnt++;
            if (cnt >= retryTimes) {
                throw err;
            }
            console.log(err);
            process.send && process.send({ log: 'Encounter error, will retry ' + err.stack ? err.stack : err });
        }
        await new Promise(res => setTimeout(res, cnt * 5000));
    }
}
downloadZip(fetchUrl)
    .catch(err => {
    process.send && process.send({ error: err });
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG93bmxvYWQtemlwLXByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkb3dubG9hZC16aXAtcHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLCtCQUErQjtBQUMvQiwwREFBMEQ7QUFDMUQsc0RBQThCO0FBQzlCLDRDQUFvQjtBQUNwQiwyQkFBMkI7QUFFM0IsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztBQUMxQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pCLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFFekMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO0lBQ3RDLDJCQUEyQjtJQUM1QixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2hCLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDO0FBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO0lBQ3ZDLDJCQUEyQjtJQUMzQixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDO0FBRUgsS0FBSyxVQUFVLFdBQVcsQ0FBQyxRQUFnQjtJQUN6QywyQkFBMkI7SUFDNUIsK0tBQStLO0lBQzlLLE1BQU0sUUFBUSxHQUFH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QUksQ0FBQyxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO0lBQzNDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG4vLyBpbXBvcnQge1ppcFJlc291cmNlTWlkZGxld2FyZX0gZnJvbSAnc2VydmUtc3RhdGljLXppcCc7XG5pbXBvcnQgcmVxdWVzdCBmcm9tICdyZXF1ZXN0JztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG4vLyBpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcblxuY29uc3QgYXJndiA9IHByb2Nlc3MuYXJndjtcbmNvbnN0IGZldGNoVXJsID0gYXJndlsyXTtcbmNvbnN0IGZpbGVOYW1lID0gYXJndlszXTtcbmNvbnN0IHJldHJ5VGltZXMgPSBwYXJzZUludChhcmd2WzRdLCAxMCk7XG5cbnByb2Nlc3Mub24oJ3VuY2F1Z2h0RXhjZXB0aW9uJywgKGVycikgPT4ge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmVcblx0Y29uc29sZS5sb2coZXJyKTtcbiAgcHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7ZXJyb3I6IGVycn0pO1xufSk7XG5cbnByb2Nlc3Mub24oJ3VuaGFuZGxlZFJlamVjdGlvbicsIChlcnIpID0+IHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lXG4gIGNvbnNvbGUubG9nKGVycik7XG4gIHByb2Nlc3Muc2VuZCAmJiBwcm9jZXNzLnNlbmQoe2Vycm9yOiBlcnJ9KTtcbn0pO1xuXG5hc3luYyBmdW5jdGlvbiBkb3dubG9hZFppcChmZXRjaFVybDogc3RyaW5nKSB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZVxuXHQvLyBsb2cuaW5mbyhgJHtvcy5ob3N0bmFtZSgpfSAke29zLnVzZXJJbmZvKCkudXNlcm5hbWV9IGRvd25sb2FkIHppcFtGcmVlIG1lbV06ICR7TWF0aC5yb3VuZChvcy5mcmVlbWVtKCkgLyAxMDQ4NTc2KX1NLCBbdG90YWwgbWVtXTogJHtNYXRoLnJvdW5kKG9zLnRvdGFsbWVtKCkgLyAxMDQ4NTc2KX1NYCk7XG4gIGNvbnN0IHJlc291cmNlID0gZmV0Y2hVcmwgKyAnPycgKyBNYXRoLnJhbmRvbSgpO1xuICAvLyBjb25zdCBkb3dubG9hZFRvID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgYHJlbW90ZS0ke01hdGgucmFuZG9tKCl9LSR7cGF0aC5zcGxpdCgnLycpLnBvcCgpfWApO1xuICAvLyBsb2cuaW5mbygnZmV0Y2gnLCByZXNvdXJjZSk7XG4gIHByb2Nlc3Muc2VuZCAmJiBwcm9jZXNzLnNlbmQoe2xvZzogYFtwaWQ6JHtwcm9jZXNzLnBpZH1dIGZldGNoIGArIHJlc291cmNlfSk7XG4gIGF3YWl0IHJldHJ5KGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCBuZXcgUHJvbWlzZTxCdWZmZXJ8bnVsbD4oKHJlc29sdmUsIHJlaikgPT4ge1xuICAgICAgY29uc3Qgd3JpdGVTdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShmaWxlTmFtZSk7XG4gICAgICB3cml0ZVN0cmVhbS5vbignZmluaXNoJywgKCkgPT4ge1xuICAgICAgICBwcm9jZXNzLnNlbmQgJiYgcHJvY2Vzcy5zZW5kKHtsb2c6ICd6aXAgZmlsZSBpcyB3cml0dGVuOiAnICsgZmlsZU5hbWV9KTtcbiAgICAgICAgcmVzb2x2ZShudWxsKTtcbiAgICAgIH0pO1xuICAgICAgcmVxdWVzdCh7XG4gICAgICAgIHVyaTogcmVzb3VyY2UsIG1ldGhvZDogJ0dFVCcsIGVuY29kaW5nOiBudWxsXG4gICAgICB9KVxuICAgICAgLm9uKCdyZXNwb25zZScsIHJlcyA9PiB7XG4gICAgICAgIGlmIChyZXMuc3RhdHVzQ29kZSA+IDI5OSB8fCByZXMuc3RhdHVzQ29kZSA8IDIwMClcbiAgICAgICAgICByZXR1cm4gcmVqKG5ldyBFcnJvcihyZXMuc3RhdHVzQ29kZSArICcgJyArIHJlcy5zdGF0dXNNZXNzYWdlKSk7XG4gICAgICB9KVxuICAgICAgLm9uKCdlcnJvcicsIGVyciA9PiB7XG4gICAgICAgIHJldHVybiByZWooZXJyKTtcbiAgICAgIH0pXG4gICAgICAucGlwZSh3cml0ZVN0cmVhbSk7XG4gICAgfSk7XG4gICAgLy8gZnMud3JpdGVGaWxlU3luYyhQYXRoLnJlc29sdmUoZGlzdERpciwgZmlsZU5hbWUpLFxuICAgIC8vIFx0YnVmKTtcbiAgICBwcm9jZXNzLnNlbmQgJiYgcHJvY2Vzcy5zZW5kKHtsb2c6IGAke2ZpbGVOYW1lfSBpcyB3cml0dGVuLmB9KTtcbiAgICAvLyBjb25zdCB6aXAgPSBuZXcgQWRtWmlwKGJ1Zik7XG4gICAgLy8gYXdhaXQgdHJ5RXh0cmFjdCh6aXApO1xuICB9KTtcbn1cblxuXG5cbmFzeW5jIGZ1bmN0aW9uIHJldHJ5PFQ+KGZ1bmM6ICguLi5hcmdzOiBhbnlbXSkgPT4gUHJvbWlzZTxUPiwgLi4uYXJnczogYW55W10pOiBQcm9taXNlPFQ+IHtcbiAgZm9yIChsZXQgY250ID0gMDs7KSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBhd2FpdCBmdW5jKC4uLmFyZ3MpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY250Kys7XG4gICAgICBpZiAoY250ID49IHJldHJ5VGltZXMpIHtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgIHByb2Nlc3Muc2VuZCAmJiBwcm9jZXNzLnNlbmQoe2xvZzogJ0VuY291bnRlciBlcnJvciwgd2lsbCByZXRyeSAnICsgKGVyciBhcyBFcnJvcikuc3RhY2sgPyBlcnIuc3RhY2sgOiBlcnJ9KTtcbiAgICB9XG4gICAgYXdhaXQgbmV3IFByb21pc2UocmVzID0+IHNldFRpbWVvdXQocmVzLCBjbnQgKiA1MDAwKSk7XG4gIH1cbn1cblxuZG93bmxvYWRaaXAoZmV0Y2hVcmwpXG4uY2F0Y2goZXJyID0+IHtcbiAgcHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7ZXJyb3I6IGVycn0pO1xuICBwcm9jZXNzLmV4aXQoMSk7XG59KTtcbiJdfQ==