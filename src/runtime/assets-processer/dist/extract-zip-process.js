"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable:no-console
const adm_zip_1 = tslib_1.__importDefault(require("adm-zip"));
const os_1 = tslib_1.__importDefault(require("os"));
const util_1 = tslib_1.__importDefault(require("util"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
const pify_1 = tslib_1.__importDefault(require("pify"));
process.on('uncaughtException', (err) => {
    // tslint:disable-next-line
    console.log(err);
});
if (!process.send) {
    // tslint:disable-next-line
    process.send = console.log.bind(console);
}
const argv = process.argv;
const zipDir = argv[2];
const zipExtractDir = argv[3];
const readFileAsync = pify_1.default(fs_1.default.readFile);
function start() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const fileNames = fs_1.default.readdirSync(zipDir);
        const proms = fileNames.filter(name => name.startsWith('download-update-'))
            .sort((name1, name2) => {
            const match1 = /[0-9]+/.exec(name1);
            const match2 = /[0-9]+/.exec(name2);
            if (match1 && match1[0] && match2 && match2[0]) {
                return parseInt(match1[0], 10) - parseInt(match2[0], 10);
            }
            return 0;
        })
            .map(name => {
            const file = path_1.default.resolve(zipDir, name);
            return () => {
                console.log(`[pid:${process.pid}] start extracting ${file}`);
                process.send({ log: `[pid:${process.pid}] start extracting ${file}` });
                return tryExtract(file)
                    .then(() => {
                    fs_1.default.unlinkSync(file);
                    process.send({ done: `[pid:${process.pid}] done extracting ${file}` });
                });
            };
        });
        if (proms.length > 0) {
            for (const prom of proms) {
                try {
                    yield prom();
                }
                catch (e) {
                    // tslint:disable-next-line
                    console.log(e);
                    process.send({ error: e });
                }
            }
        }
        else {
            process.send({ log: `[pid:${process.pid}] no downloaded file found` });
        }
    });
}
function tryExtract(file) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const data = yield readFileAsync(file);
        yield new Promise((resolve, reject) => {
            const zip = new adm_zip_1.default(data);
            zip.extractAllToAsync(zipExtractDir, true, (err) => {
                if (err) {
                    process.send({ error: util_1.default.inspect(err) });
                    if (err.code === 'ENOMEM' || err.toString().indexOf('not enough memory') >= 0) {
                        // tslint:disable-next-line
                        process.send({ log: `[pid:${process.pid}]${os_1.default.hostname()} ${os_1.default.userInfo().username} [Free mem]: ${Math.round(os_1.default.freemem() / 1048576)}M, [total mem]: ${Math.round(os_1.default.totalmem() / 1048576)}M` });
                    }
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    });
}
setTimeout(start, 100);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2V4dHJhY3QtemlwLXByb2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEJBQTRCO0FBQzVCLDhEQUE2QjtBQUM3QixvREFBb0I7QUFDcEIsd0RBQXdCO0FBQ3hCLG9EQUFvQjtBQUNwQix3REFBd0I7QUFDeEIsd0RBQXdCO0FBRXhCLE9BQU8sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtJQUN2QywyQkFBMkI7SUFDM0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFO0lBQ2xCLDJCQUEyQjtJQUMzQixPQUFPLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0NBQ3pDO0FBRUQsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztBQUMxQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkIsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRTlCLE1BQU0sYUFBYSxHQUFHLGNBQUksQ0FBQyxZQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDeEMsU0FBZSxLQUFLOztRQUNuQixNQUFNLFNBQVMsR0FBRyxZQUFFLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLENBQUM7YUFDMUUsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQ3RCLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FB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QUFJLFlBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLGdCQUFnQixJQUFJLENBQUMsS0FBSyxDQUFDLFlBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxPQUFPLENBQUMsbUJBQW1CLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUMsQ0FBQyxDQUFDO3FCQUMvTDtvQkFDRCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ1o7cUJBQU07b0JBQ04sT0FBTyxFQUFFLENBQUM7aUJBQ1Y7WUFDRixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUFBO0FBRUQsVUFBVSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2V4dHJhY3QtemlwLXByb2Nlc3MuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG5pbXBvcnQgQWRtWmlwIGZyb20gJ2FkbS16aXAnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCB1dGlsIGZyb20gJ3V0aWwnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHBpZnkgZnJvbSAncGlmeSc7XG5cbnByb2Nlc3Mub24oJ3VuY2F1Z2h0RXhjZXB0aW9uJywgKGVycikgPT4ge1xuXHQvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0Y29uc29sZS5sb2coZXJyKTtcbn0pO1xuXG5pZiAoIXByb2Nlc3Muc2VuZCkge1xuXHQvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0cHJvY2Vzcy5zZW5kID0gY29uc29sZS5sb2cuYmluZChjb25zb2xlKTtcbn1cblxuY29uc3QgYXJndiA9IHByb2Nlc3MuYXJndjtcbmNvbnN0IHppcERpciA9IGFyZ3ZbMl07XG5jb25zdCB6aXBFeHRyYWN0RGlyID0gYXJndlszXTtcblxuY29uc3QgcmVhZEZpbGVBc3luYyA9IHBpZnkoZnMucmVhZEZpbGUpO1xuYXN5bmMgZnVuY3Rpb24gc3RhcnQoKSB7XG5cdGNvbnN0IGZpbGVOYW1lcyA9IGZzLnJlYWRkaXJTeW5jKHppcERpcik7XG5cdGNvbnN0IHByb21zID0gZmlsZU5hbWVzLmZpbHRlcihuYW1lID0+IG5hbWUuc3RhcnRzV2l0aCgnZG93bmxvYWQtdXBkYXRlLScpKVxuXHQuc29ydCgobmFtZTEsIG5hbWUyKSA9PiB7XG5cdFx0Y29uc3QgbWF0Y2gxID0gL1swLTldKy8uZXhlYyhuYW1lMSk7XG5cdFx0Y29uc3QgbWF0Y2gyID0gL1swLTldKy8uZXhlYyhuYW1lMik7XG5cdFx0aWYgKG1hdGNoMSAmJiBtYXRjaDFbMF0gJiYgbWF0Y2gyICYmIG1hdGNoMlswXSkge1xuXHRcdFx0cmV0dXJuIHBhcnNlSW50KG1hdGNoMVswXSwgMTApIC0gcGFyc2VJbnQobWF0Y2gyWzBdLCAxMCk7XG5cdFx0fVxuXHRcdHJldHVybiAwO1xuXHR9KVxuXHQubWFwKG5hbWUgPT4ge1xuXHRcdGNvbnN0IGZpbGUgPSBQYXRoLnJlc29sdmUoemlwRGlyLCBuYW1lKTtcblx0XHRyZXR1cm4gKCkgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coYFtwaWQ6JHtwcm9jZXNzLnBpZH1dIHN0YXJ0IGV4dHJhY3RpbmcgJHtmaWxlfWApO1xuXHRcdFx0cHJvY2Vzcy5zZW5kKHtsb2c6IGBbcGlkOiR7cHJvY2Vzcy5waWR9XSBzdGFydCBleHRyYWN0aW5nICR7ZmlsZX1gfSk7XG5cdFx0XHRyZXR1cm4gdHJ5RXh0cmFjdChmaWxlKVxuXHRcdFx0LnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRmcy51bmxpbmtTeW5jKGZpbGUpO1xuXHRcdFx0XHRwcm9jZXNzLnNlbmQoe2RvbmU6IGBbcGlkOiR7cHJvY2Vzcy5waWR9XSBkb25lIGV4dHJhY3RpbmcgJHtmaWxlfWB9KTtcblx0XHRcdH0pO1xuXHRcdH07XG5cdH0pO1xuXHRpZiAocHJvbXMubGVuZ3RoID4gMCkge1xuXHRcdGZvciAoY29uc3QgcHJvbSBvZiBwcm9tcykge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0YXdhaXQgcHJvbSgpO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHQvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0XHRcdFx0Y29uc29sZS5sb2coZSk7XG5cdFx0XHRcdHByb2Nlc3Muc2VuZCh7ZXJyb3I6IGV9KTtcblx0XHRcdH1cblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0cHJvY2Vzcy5zZW5kKHtsb2c6IGBbcGlkOiR7cHJvY2Vzcy5waWR9XSBubyBkb3dubG9hZGVkIGZpbGUgZm91bmRgfSk7XG5cdH1cbn1cblxuXG5hc3luYyBmdW5jdGlvbiB0cnlFeHRyYWN0KGZpbGU6IHN0cmluZykge1xuXHRjb25zdCBkYXRhOiBCdWZmZXIgPSBhd2FpdCByZWFkRmlsZUFzeW5jKGZpbGUpO1xuXHRhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0Y29uc3QgemlwID0gbmV3IEFkbVppcChkYXRhKTtcblx0XHR6aXAuZXh0cmFjdEFsbFRvQXN5bmMoemlwRXh0cmFjdERpciwgdHJ1ZSwgKGVycikgPT4ge1xuXHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRwcm9jZXNzLnNlbmQoe2Vycm9yOiB1dGlsLmluc3BlY3QoZXJyKX0pO1xuXHRcdFx0XHRpZiAoKGVyciBhcyBhbnkpLmNvZGUgPT09ICdFTk9NRU0nIHx8IGVyci50b1N0cmluZygpLmluZGV4T2YoJ25vdCBlbm91Z2ggbWVtb3J5JykgPj0gMCkge1xuXHRcdFx0XHRcdC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuXHRcdFx0XHRcdHByb2Nlc3Muc2VuZCh7bG9nOiBgW3BpZDoke3Byb2Nlc3MucGlkfV0ke29zLmhvc3RuYW1lKCl9ICR7b3MudXNlckluZm8oKS51c2VybmFtZX0gW0ZyZWUgbWVtXTogJHtNYXRoLnJvdW5kKG9zLmZyZWVtZW0oKSAvIDEwNDg1NzYpfU0sIFt0b3RhbCBtZW1dOiAke01hdGgucm91bmQob3MudG90YWxtZW0oKSAvIDEwNDg1NzYpfU1gfSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmVqZWN0KGVycik7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXNvbHZlKCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0pO1xufVxuXG5zZXRUaW1lb3V0KHN0YXJ0LCAxMDApO1xuIl19
