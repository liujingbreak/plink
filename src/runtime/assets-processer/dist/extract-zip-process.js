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
/* eslint-disable no-console */
/**
 * @deprecated
 */
require("source-map-support/register");
const adm_zip_1 = __importDefault(require("adm-zip"));
const os_1 = __importDefault(require("os"));
const util_1 = __importDefault(require("util"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pify = require('pify');
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
if (!process.send) {
    // eslint-disable-next-line
    process.send = console.log.bind(console);
}
const argv = process.argv;
const zipDir = argv[2];
const zipExtractDir = argv[3];
const deleteOption = argv[4];
const readFileAsync = pify(fs_1.default.readFile);
function start() {
    return __awaiter(this, void 0, void 0, function* () {
        const fileNames = fs_1.default.readdirSync(zipDir);
        const proms = fileNames.filter(name => path_1.default.extname(name).toLowerCase() === '.zip')
            .map(name => {
            const file = path_1.default.resolve(zipDir, name);
            return () => __awaiter(this, void 0, void 0, function* () {
                console.log(`[pid:${process.pid}] start extracting ${file}`);
                process.send && process.send({ log: `[pid:${process.pid}] start extracting ${file}` });
                yield tryExtract(file);
                yield new Promise(resolve => setTimeout(resolve, 1000));
                if (deleteOption !== 'keep')
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
                    // eslint-disable-next-line
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
    return __awaiter(this, void 0, void 0, function* () {
        const data = yield readFileAsync(file);
        yield new Promise((resolve, reject) => {
            const zip = new adm_zip_1.default(data);
            zip.extractAllToAsync(zipExtractDir, true, (err) => {
                if (err) {
                    process.send && process.send({ error: util_1.default.inspect(err) });
                    if (err.code === 'ENOMEM' || err.toString().indexOf('not enough memory') >= 0) {
                        // eslint-disable-next-line
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
void start();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdC16aXAtcHJvY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImV4dHJhY3QtemlwLXByb2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFBK0I7QUFDL0I7O0dBRUc7QUFDSCx1Q0FBcUM7QUFDckMsc0RBQTZCO0FBQzdCLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFFN0IsT0FBTyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO0lBQ3RDLDJCQUEyQjtJQUMzQixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDO0FBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO0lBQ3ZDLDJCQUEyQjtJQUMzQixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUU7SUFDakIsMkJBQTJCO0lBQzVCLE9BQU8sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7Q0FDekM7QUFFRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQzFCLE1BQU0sTUFBTSxHQUFHLElBQUks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LElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFDLENBQUMsQ0FBQztvQkFDekQsSUFBSyxHQUFXLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFO3dCQUN0RiwyQkFBMkI7d0JBQ2hDLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSxRQUFRLE9BQU8sQ0FBQyxHQUFHLElBQUksWUFBRSxDQUFDLFFBQVEsRUFBRSxJQUFJLFlBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLGdCQUFnQixJQUFJLENBQUMsS0FBSyxDQUFDLFlBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxPQUFPLENBQUMsbUJBQW1CLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUMsQ0FBQyxDQUFDO3FCQUMzTTtvQkFDRCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ2I7cUJBQU07b0JBQ0wsT0FBTyxFQUFFLENBQUM7aUJBQ1g7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUFBO0FBRUQsS0FBSyxLQUFLLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbi8qKlxuICogQGRlcHJlY2F0ZWRcbiAqL1xuaW1wb3J0ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInO1xuaW1wb3J0IEFkbVppcCBmcm9tICdhZG0temlwJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgdXRpbCBmcm9tICd1dGlsJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmNvbnN0IHBpZnkgPSByZXF1aXJlKCdwaWZ5Jyk7XG5cbnByb2Nlc3Mub24oJ3VuY2F1Z2h0RXhjZXB0aW9uJywgKGVycikgPT4ge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmVcbiAgY29uc29sZS5sb2coZXJyKTtcbiAgcHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7ZXJyb3I6IGVycn0pO1xufSk7XG5cbnByb2Nlc3Mub24oJ3VuaGFuZGxlZFJlamVjdGlvbicsIChlcnIpID0+IHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lXG4gIGNvbnNvbGUubG9nKGVycik7XG4gIHByb2Nlc3Muc2VuZCAmJiBwcm9jZXNzLnNlbmQoe2Vycm9yOiBlcnJ9KTtcbn0pO1xuXG5pZiAoIXByb2Nlc3Muc2VuZCkge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmVcblx0cHJvY2Vzcy5zZW5kID0gY29uc29sZS5sb2cuYmluZChjb25zb2xlKTtcbn1cblxuY29uc3QgYXJndiA9IHByb2Nlc3MuYXJndjtcbmNvbnN0IHppcERpciA9IGFyZ3ZbMl07XG5jb25zdCB6aXBFeHRyYWN0RGlyID0gYXJndlszXTtcbmNvbnN0IGRlbGV0ZU9wdGlvbiA9IGFyZ3ZbNF07XG5cbmNvbnN0IHJlYWRGaWxlQXN5bmM6IChmaWxlOiBzdHJpbmcsIGNvZGU/OiBzdHJpbmcpID0+IFByb21pc2U8QnVmZmVyPiA9IHBpZnkoZnMucmVhZEZpbGUpO1xuYXN5bmMgZnVuY3Rpb24gc3RhcnQoKSB7XG4gIGNvbnN0IGZpbGVOYW1lcyA9IGZzLnJlYWRkaXJTeW5jKHppcERpcik7XG4gIGNvbnN0IHByb21zID0gZmlsZU5hbWVzLmZpbHRlcihuYW1lID0+IFBhdGguZXh0bmFtZShuYW1lKS50b0xvd2VyQ2FzZSgpID09PSAnLnppcCcpXG4gIC5tYXAobmFtZSA9PiB7XG4gICAgY29uc3QgZmlsZSA9IFBhdGgucmVzb2x2ZSh6aXBEaXIsIG5hbWUpO1xuICAgIHJldHVybiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhgW3BpZDoke3Byb2Nlc3MucGlkfV0gc3RhcnQgZXh0cmFjdGluZyAke2ZpbGV9YCk7XG4gICAgICBwcm9jZXNzLnNlbmQgJiYgcHJvY2Vzcy5zZW5kKHtsb2c6IGBbcGlkOiR7cHJvY2Vzcy5waWR9XSBzdGFydCBleHRyYWN0aW5nICR7ZmlsZX1gfSk7XG4gICAgICBhd2FpdCB0cnlFeHRyYWN0KGZpbGUpO1xuICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMDApKTtcbiAgICAgIGlmIChkZWxldGVPcHRpb24gIT09ICdrZWVwJylcbiAgICAgICAgZnMudW5saW5rU3luYyhmaWxlKTtcbiAgICAgIGNvbnNvbGUubG9nKCdkb25lJywgZmlsZSk7XG4gICAgICBwcm9jZXNzLnNlbmQgJiYgcHJvY2Vzcy5zZW5kKHtkb25lOiBgW3BpZDoke3Byb2Nlc3MucGlkfV0gZG9uZSBleHRyYWN0aW5nICR7ZmlsZX1gfSk7XG4gICAgfTtcbiAgfSk7XG4gIGlmIChwcm9tcy5sZW5ndGggPiAwKSB7XG4gICAgZm9yIChjb25zdCBwcm9tIG9mIHByb21zKSB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBwcm9tKCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZVxuXHRcdFx0XHRjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgcHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7ZXJyb3I6IGV9KTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7bG9nOiBgW3BpZDoke3Byb2Nlc3MucGlkfV0gbm8gZG93bmxvYWRlZCBmaWxlIGZvdW5kYH0pO1xuICB9XG59XG5cblxuYXN5bmMgZnVuY3Rpb24gdHJ5RXh0cmFjdChmaWxlOiBzdHJpbmcpIHtcbiAgY29uc3QgZGF0YTogQnVmZmVyID0gYXdhaXQgcmVhZEZpbGVBc3luYyhmaWxlKTtcbiAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IHppcCA9IG5ldyBBZG1aaXAoZGF0YSk7XG4gICAgemlwLmV4dHJhY3RBbGxUb0FzeW5jKHppcEV4dHJhY3REaXIsIHRydWUsIChlcnIpID0+IHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7ZXJyb3I6IHV0aWwuaW5zcGVjdChlcnIpfSk7XG4gICAgICAgIGlmICgoZXJyIGFzIGFueSkuY29kZSA9PT0gJ0VOT01FTScgfHwgZXJyLnRvU3RyaW5nKCkuaW5kZXhPZignbm90IGVub3VnaCBtZW1vcnknKSA+PSAwKSB7XG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lXG5cdFx0XHRcdFx0cHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7bG9nOiBgW3BpZDoke3Byb2Nlc3MucGlkfV0ke29zLmhvc3RuYW1lKCl9ICR7b3MudXNlckluZm8oKS51c2VybmFtZX0gW0ZyZWUgbWVtXTogJHtNYXRoLnJvdW5kKG9zLmZyZWVtZW0oKSAvIDEwNDg1NzYpfU0sIFt0b3RhbCBtZW1dOiAke01hdGgucm91bmQob3MudG90YWxtZW0oKSAvIDEwNDg1NzYpfU1gfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xufVxuXG52b2lkIHN0YXJ0KCk7XG4iXX0=