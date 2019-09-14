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
    process.send && process.send({ error: err });
});
process.on('unhandledRejection', (err) => {
    // tslint:disable-next-line
    console.log(err);
    process.send && process.send({ error: err });
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
            .map(name => {
            const file = path_1.default.resolve(zipDir, name);
            return () => tslib_1.__awaiter(this, void 0, void 0, function* () {
                console.log(`[pid:${process.pid}] start extracting ${file}`);
                process.send && process.send({ log: `[pid:${process.pid}] start extracting ${file}` });
                yield tryExtract(file);
                fs_1.default.unlinkSync(file);
                console.log('done', file);
                process.send && process.send({ done: `[pid:${process.pid}] done extracting ${file}` });
            });
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2V4dHJhY3QtemlwLXByb2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEJBQTRCO0FBQzVCOztHQUVHO0FBQ0gsOERBQTZCO0FBQzdCLG9EQUFvQjtBQUNwQix3REFBd0I7QUFDeEIsb0RBQW9CO0FBQ3BCLHdEQUF3QjtBQUN4QixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFFN0IsT0FBTyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO0lBQ3RDLDJCQUEyQjtJQUMzQixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDO0FBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO0lBQ3ZDLDJCQUEyQjtJQUMzQixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUU7SUFDakIsMkJBQTJCO0lBQzVCLE9BQU8sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7Q0FDekM7QUFFRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQzFCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2QixNQUFN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QkFDaEMsT0FBTyxDQUFDLElBQUksSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUMsR0FBRyxFQUFFLFFBQVEsT0FBTyxDQUFDLEdBQUcsSUFBSSxZQUFFLENBQUMsUUFBUSxFQUFFLElBQUksWUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsZ0JBQWdCLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBQyxDQUFDLENBQUM7cUJBQzNNO29CQUNELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDYjtxQkFBTTtvQkFDTCxPQUFPLEVBQUUsQ0FBQztpQkFDWDtZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQUE7QUFFRCxLQUFLLEVBQUUsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2V4dHJhY3QtemlwLXByb2Nlc3MuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG4vKipcbiAqIEBkZXByZWNhdGVkXG4gKi9cbmltcG9ydCBBZG1aaXAgZnJvbSAnYWRtLXppcCc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IHV0aWwgZnJvbSAndXRpbCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5jb25zdCBwaWZ5ID0gcmVxdWlyZSgncGlmeScpO1xuXG5wcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsIChlcnIpID0+IHtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG4gIGNvbnNvbGUubG9nKGVycik7XG4gIHByb2Nlc3Muc2VuZCAmJiBwcm9jZXNzLnNlbmQoe2Vycm9yOiBlcnJ9KTtcbn0pO1xuXG5wcm9jZXNzLm9uKCd1bmhhbmRsZWRSZWplY3Rpb24nLCAoZXJyKSA9PiB7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuICBjb25zb2xlLmxvZyhlcnIpO1xuICBwcm9jZXNzLnNlbmQgJiYgcHJvY2Vzcy5zZW5kKHtlcnJvcjogZXJyfSk7XG59KTtcblxuaWYgKCFwcm9jZXNzLnNlbmQpIHtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdHByb2Nlc3Muc2VuZCA9IGNvbnNvbGUubG9nLmJpbmQoY29uc29sZSk7XG59XG5cbmNvbnN0IGFyZ3YgPSBwcm9jZXNzLmFyZ3Y7XG5jb25zdCB6aXBEaXIgPSBhcmd2WzJdO1xuY29uc3QgemlwRXh0cmFjdERpciA9IGFyZ3ZbM107XG5cbmNvbnN0IHJlYWRGaWxlQXN5bmM6IChmaWxlOiBzdHJpbmcsIGNvZGU/OiBzdHJpbmcpID0+IFByb21pc2U8QnVmZmVyPiA9IHBpZnkoZnMucmVhZEZpbGUpO1xuYXN5bmMgZnVuY3Rpb24gc3RhcnQoKSB7XG4gIGNvbnN0IGZpbGVOYW1lcyA9IGZzLnJlYWRkaXJTeW5jKHppcERpcik7XG4gIGNvbnN0IHByb21zID0gZmlsZU5hbWVzLmZpbHRlcihuYW1lID0+IFBhdGguZXh0bmFtZShuYW1lKS50b0xvd2VyQ2FzZSgpID09PSAnLnppcCcpXG4gIC5tYXAobmFtZSA9PiB7XG4gICAgY29uc3QgZmlsZSA9IFBhdGgucmVzb2x2ZSh6aXBEaXIsIG5hbWUpO1xuICAgIHJldHVybiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhgW3BpZDoke3Byb2Nlc3MucGlkfV0gc3RhcnQgZXh0cmFjdGluZyAke2ZpbGV9YCk7XG4gICAgICBwcm9jZXNzLnNlbmQgJiYgcHJvY2Vzcy5zZW5kKHtsb2c6IGBbcGlkOiR7cHJvY2Vzcy5waWR9XSBzdGFydCBleHRyYWN0aW5nICR7ZmlsZX1gfSk7XG4gICAgICBhd2FpdCB0cnlFeHRyYWN0KGZpbGUpO1xuICAgICAgZnMudW5saW5rU3luYyhmaWxlKTtcbiAgICAgIGNvbnNvbGUubG9nKCdkb25lJywgZmlsZSk7XG4gICAgICBwcm9jZXNzLnNlbmQgJiYgcHJvY2Vzcy5zZW5kKHtkb25lOiBgW3BpZDoke3Byb2Nlc3MucGlkfV0gZG9uZSBleHRyYWN0aW5nICR7ZmlsZX1gfSk7XG4gICAgfTtcbiAgfSk7XG4gIGlmIChwcm9tcy5sZW5ndGggPiAwKSB7XG4gICAgZm9yIChjb25zdCBwcm9tIG9mIHByb21zKSB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBwcm9tKCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuXHRcdFx0XHRjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgcHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7ZXJyb3I6IGV9KTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7bG9nOiBgW3BpZDoke3Byb2Nlc3MucGlkfV0gbm8gZG93bmxvYWRlZCBmaWxlIGZvdW5kYH0pO1xuICB9XG59XG5cblxuYXN5bmMgZnVuY3Rpb24gdHJ5RXh0cmFjdChmaWxlOiBzdHJpbmcpIHtcbiAgY29uc3QgZGF0YTogQnVmZmVyID0gYXdhaXQgcmVhZEZpbGVBc3luYyhmaWxlKTtcbiAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IHppcCA9IG5ldyBBZG1aaXAoZGF0YSk7XG4gICAgemlwLmV4dHJhY3RBbGxUb0FzeW5jKHppcEV4dHJhY3REaXIsIHRydWUsIChlcnIpID0+IHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7ZXJyb3I6IHV0aWwuaW5zcGVjdChlcnIpfSk7XG4gICAgICAgIGlmICgoZXJyIGFzIGFueSkuY29kZSA9PT0gJ0VOT01FTScgfHwgZXJyLnRvU3RyaW5nKCkuaW5kZXhPZignbm90IGVub3VnaCBtZW1vcnknKSA+PSAwKSB7XG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdFx0XHRcdFx0cHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7bG9nOiBgW3BpZDoke3Byb2Nlc3MucGlkfV0ke29zLmhvc3RuYW1lKCl9ICR7b3MudXNlckluZm8oKS51c2VybmFtZX0gW0ZyZWUgbWVtXTogJHtNYXRoLnJvdW5kKG9zLmZyZWVtZW0oKSAvIDEwNDg1NzYpfU0sIFt0b3RhbCBtZW1dOiAke01hdGgucm91bmQob3MudG90YWxtZW0oKSAvIDEwNDg1NzYpfU1gfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xufVxuXG5zdGFydCgpO1xuIl19
