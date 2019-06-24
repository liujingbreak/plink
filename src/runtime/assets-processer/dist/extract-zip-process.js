"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable:no-console
/**
 * @deprecated
 */
const adm_zip_1 = tslib_1.__importDefault(require("adm-zip"));
const os_1 = tslib_1.__importDefault(require("os"));
const util_1 = tslib_1.__importDefault(require("util"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
const pify = require('pify');
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
const readFileAsync = pify(fs_1.default.readFile);
function start() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const fileNames = fs_1.default.readdirSync(zipDir);
        const proms = fileNames.filter(name => path_1.default.extname(name).toLowerCase() === '.zip')
            // .sort((name1, name2) => {
            // 	const match1 = /[0-9]+/.exec(name1);
            // 	const match2 = /[0-9]+/.exec(name2);
            // 	if (match1 && match1[0] && match2 && match2[0]) {
            // 		return parseInt(match1[0], 10) - parseInt(match2[0], 10);
            // 	}
            // 	return 0;
            // })
            .map(name => {
            const file = path_1.default.resolve(zipDir, name);
            return () => {
                // console.log(`[pid:${process.pid}] start extracting ${file}`);
                process.send && process.send({ log: `[pid:${process.pid}] start extracting ${file}` });
                return tryExtract(file)
                    .then(() => {
                    fs_1.default.unlinkSync(file);
                    process.send && process.send({ done: `[pid:${process.pid}] done extracting ${file}` });
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
                    process.send && process.send({ error: e });
                }
            }
        }
        else {
            process.send && process.send({ log: `[pid:${process.pid}] no downloaded file found` });
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
                    process.send && process.send({ error: util_1.default.inspect(err) });
                    if (err.code === 'ENOMEM' || err.toString().indexOf('not enough memory') >= 0) {
                        // tslint:disable-next-line
                        process.send && process.send({ log: `[pid:${process.pid}]${os_1.default.hostname()} ${os_1.default.userInfo().username} [Free mem]: ${Math.round(os_1.default.freemem() / 1048576)}M, [total mem]: ${Math.round(os_1.default.totalmem() / 1048576)}M` });
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
start();
// setTimeout(start, 100);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2V4dHJhY3QtemlwLXByb2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEJBQTRCO0FBQzVCOztHQUVHO0FBQ0gsOERBQTZCO0FBQzdCLG9EQUFvQjtBQUNwQix3REFBd0I7QUFDeEIsb0RBQW9CO0FBQ3BCLHdEQUF3QjtBQUN4QixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFFN0IsT0FBTyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO0lBQ3ZDLDJCQUEyQjtJQUMzQixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUU7SUFDbEIsMkJBQTJCO0lBQzNCLE9BQU8sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7Q0FDekM7QUFFRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQzFCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2QixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFFOUIsTUFBTSxhQUFhLEdBQXFELElBQUksQ0FBQyxZQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDMUYsU0FBZSxLQUFLOztRQUNuQixNQUFNLFNBQVMsR0FBRyxZQUFFLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsRUFBRSxLQUFLLE1BQU0sQ0FBQztZQUNuRiw0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Q0FBQyxDQUFDO3FCQUMvTTtvQkFDRCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ1o7cUJBQU07b0JBQ04sT0FBTyxFQUFFLENBQUM7aUJBQ1Y7WUFDRixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUFBO0FBRUQsS0FBSyxFQUFFLENBQUM7QUFDUiwwQkFBMEIiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9leHRyYWN0LXppcC1wcm9jZXNzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuLyoqXG4gKiBAZGVwcmVjYXRlZFxuICovXG5pbXBvcnQgQWRtWmlwIGZyb20gJ2FkbS16aXAnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCB1dGlsIGZyb20gJ3V0aWwnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuY29uc3QgcGlmeSA9IHJlcXVpcmUoJ3BpZnknKTtcblxucHJvY2Vzcy5vbigndW5jYXVnaHRFeGNlcHRpb24nLCAoZXJyKSA9PiB7XG5cdC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuXHRjb25zb2xlLmxvZyhlcnIpO1xufSk7XG5cbmlmICghcHJvY2Vzcy5zZW5kKSB7XG5cdC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuXHRwcm9jZXNzLnNlbmQgPSBjb25zb2xlLmxvZy5iaW5kKGNvbnNvbGUpO1xufVxuXG5jb25zdCBhcmd2ID0gcHJvY2Vzcy5hcmd2O1xuY29uc3QgemlwRGlyID0gYXJndlsyXTtcbmNvbnN0IHppcEV4dHJhY3REaXIgPSBhcmd2WzNdO1xuXG5jb25zdCByZWFkRmlsZUFzeW5jOiAoZmlsZTogc3RyaW5nLCBjb2RlPzogc3RyaW5nKSA9PiBQcm9taXNlPEJ1ZmZlcj4gPSBwaWZ5KGZzLnJlYWRGaWxlKTtcbmFzeW5jIGZ1bmN0aW9uIHN0YXJ0KCkge1xuXHRjb25zdCBmaWxlTmFtZXMgPSBmcy5yZWFkZGlyU3luYyh6aXBEaXIpO1xuXHRjb25zdCBwcm9tcyA9IGZpbGVOYW1lcy5maWx0ZXIobmFtZSA9PiBQYXRoLmV4dG5hbWUobmFtZSkudG9Mb3dlckNhc2UoKSA9PT0gJy56aXAnKVxuXHQvLyAuc29ydCgobmFtZTEsIG5hbWUyKSA9PiB7XG5cdC8vIFx0Y29uc3QgbWF0Y2gxID0gL1swLTldKy8uZXhlYyhuYW1lMSk7XG5cdC8vIFx0Y29uc3QgbWF0Y2gyID0gL1swLTldKy8uZXhlYyhuYW1lMik7XG5cdC8vIFx0aWYgKG1hdGNoMSAmJiBtYXRjaDFbMF0gJiYgbWF0Y2gyICYmIG1hdGNoMlswXSkge1xuXHQvLyBcdFx0cmV0dXJuIHBhcnNlSW50KG1hdGNoMVswXSwgMTApIC0gcGFyc2VJbnQobWF0Y2gyWzBdLCAxMCk7XG5cdC8vIFx0fVxuXHQvLyBcdHJldHVybiAwO1xuXHQvLyB9KVxuXHQubWFwKG5hbWUgPT4ge1xuXHRcdGNvbnN0IGZpbGUgPSBQYXRoLnJlc29sdmUoemlwRGlyLCBuYW1lKTtcblx0XHRyZXR1cm4gKCkgPT4ge1xuXHRcdFx0Ly8gY29uc29sZS5sb2coYFtwaWQ6JHtwcm9jZXNzLnBpZH1dIHN0YXJ0IGV4dHJhY3RpbmcgJHtmaWxlfWApO1xuXHRcdFx0cHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7bG9nOiBgW3BpZDoke3Byb2Nlc3MucGlkfV0gc3RhcnQgZXh0cmFjdGluZyAke2ZpbGV9YH0pO1xuXHRcdFx0cmV0dXJuIHRyeUV4dHJhY3QoZmlsZSlcblx0XHRcdC50aGVuKCgpID0+IHtcblx0XHRcdFx0ZnMudW5saW5rU3luYyhmaWxlKTtcblx0XHRcdFx0cHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7ZG9uZTogYFtwaWQ6JHtwcm9jZXNzLnBpZH1dIGRvbmUgZXh0cmFjdGluZyAke2ZpbGV9YH0pO1xuXHRcdFx0fSk7XG5cdFx0fTtcblx0fSk7XG5cdGlmIChwcm9tcy5sZW5ndGggPiAwKSB7XG5cdFx0Zm9yIChjb25zdCBwcm9tIG9mIHByb21zKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRhd2FpdCBwcm9tKCk7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuXHRcdFx0XHRjb25zb2xlLmxvZyhlKTtcblx0XHRcdFx0cHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7ZXJyb3I6IGV9KTtcblx0XHRcdH1cblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0cHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7bG9nOiBgW3BpZDoke3Byb2Nlc3MucGlkfV0gbm8gZG93bmxvYWRlZCBmaWxlIGZvdW5kYH0pO1xuXHR9XG59XG5cblxuYXN5bmMgZnVuY3Rpb24gdHJ5RXh0cmFjdChmaWxlOiBzdHJpbmcpIHtcblx0Y29uc3QgZGF0YTogQnVmZmVyID0gYXdhaXQgcmVhZEZpbGVBc3luYyhmaWxlKTtcblx0YXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdGNvbnN0IHppcCA9IG5ldyBBZG1aaXAoZGF0YSk7XG5cdFx0emlwLmV4dHJhY3RBbGxUb0FzeW5jKHppcEV4dHJhY3REaXIsIHRydWUsIChlcnIpID0+IHtcblx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0cHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7ZXJyb3I6IHV0aWwuaW5zcGVjdChlcnIpfSk7XG5cdFx0XHRcdGlmICgoZXJyIGFzIGFueSkuY29kZSA9PT0gJ0VOT01FTScgfHwgZXJyLnRvU3RyaW5nKCkuaW5kZXhPZignbm90IGVub3VnaCBtZW1vcnknKSA+PSAwKSB7XG5cdFx0XHRcdFx0Ly8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdFx0XHRcdFx0cHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7bG9nOiBgW3BpZDoke3Byb2Nlc3MucGlkfV0ke29zLmhvc3RuYW1lKCl9ICR7b3MudXNlckluZm8oKS51c2VybmFtZX0gW0ZyZWUgbWVtXTogJHtNYXRoLnJvdW5kKG9zLmZyZWVtZW0oKSAvIDEwNDg1NzYpfU0sIFt0b3RhbCBtZW1dOiAke01hdGgucm91bmQob3MudG90YWxtZW0oKSAvIDEwNDg1NzYpfU1gfSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmVqZWN0KGVycik7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXNvbHZlKCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0pO1xufVxuXG5zdGFydCgpO1xuLy8gc2V0VGltZW91dChzdGFydCwgMTAwKTtcbiJdfQ==
