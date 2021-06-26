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
start();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdC16aXAtcHJvY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImV4dHJhY3QtemlwLXByb2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFBK0I7QUFDL0I7O0dBRUc7QUFDSCx1Q0FBcUM7QUFDckMsc0RBQTZCO0FBQzdCLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFFN0IsT0FBTyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO0lBQ3RDLDJCQUEyQjtJQUMzQixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDO0FBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO0lBQ3ZDLDJCQUEyQjtJQUMzQixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUU7SUFDakIsMkJBQTJCO0lBQzVCLE9BQU8sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7Q0FDekM7QUFFRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQzFCLE1BQU0sTUFBTSxHQUFHLElBQUks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LElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFDLENBQUMsQ0FBQztvQkFDekQsSUFBSyxHQUFXLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFO3dCQUN0RiwyQkFBMkI7d0JBQ2hDLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSxRQUFRLE9BQU8sQ0FBQyxHQUFHLElBQUksWUFBRSxDQUFDLFFBQVEsRUFBRSxJQUFJLFlBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLGdCQUFnQixJQUFJLENBQUMsS0FBSyxDQUFDLFlBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxPQUFPLENBQUMsbUJBQW1CLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUMsQ0FBQyxDQUFDO3FCQUMzTTtvQkFDRCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ2I7cUJBQU07b0JBQ0wsT0FBTyxFQUFFLENBQUM7aUJBQ1g7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUFBO0FBRUQsS0FBSyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG4vKipcbiAqIEBkZXByZWNhdGVkXG4gKi9cbmltcG9ydCAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJztcbmltcG9ydCBBZG1aaXAgZnJvbSAnYWRtLXppcCc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IHV0aWwgZnJvbSAndXRpbCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5jb25zdCBwaWZ5ID0gcmVxdWlyZSgncGlmeScpO1xuXG5wcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsIChlcnIpID0+IHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lXG4gIGNvbnNvbGUubG9nKGVycik7XG4gIHByb2Nlc3Muc2VuZCAmJiBwcm9jZXNzLnNlbmQoe2Vycm9yOiBlcnJ9KTtcbn0pO1xuXG5wcm9jZXNzLm9uKCd1bmhhbmRsZWRSZWplY3Rpb24nLCAoZXJyKSA9PiB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZVxuICBjb25zb2xlLmxvZyhlcnIpO1xuICBwcm9jZXNzLnNlbmQgJiYgcHJvY2Vzcy5zZW5kKHtlcnJvcjogZXJyfSk7XG59KTtcblxuaWYgKCFwcm9jZXNzLnNlbmQpIHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lXG5cdHByb2Nlc3Muc2VuZCA9IGNvbnNvbGUubG9nLmJpbmQoY29uc29sZSk7XG59XG5cbmNvbnN0IGFyZ3YgPSBwcm9jZXNzLmFyZ3Y7XG5jb25zdCB6aXBEaXIgPSBhcmd2WzJdO1xuY29uc3QgemlwRXh0cmFjdERpciA9IGFyZ3ZbM107XG5jb25zdCBkZWxldGVPcHRpb24gPSBhcmd2WzRdO1xuXG5jb25zdCByZWFkRmlsZUFzeW5jOiAoZmlsZTogc3RyaW5nLCBjb2RlPzogc3RyaW5nKSA9PiBQcm9taXNlPEJ1ZmZlcj4gPSBwaWZ5KGZzLnJlYWRGaWxlKTtcbmFzeW5jIGZ1bmN0aW9uIHN0YXJ0KCkge1xuICBjb25zdCBmaWxlTmFtZXMgPSBmcy5yZWFkZGlyU3luYyh6aXBEaXIpO1xuICBjb25zdCBwcm9tcyA9IGZpbGVOYW1lcy5maWx0ZXIobmFtZSA9PiBQYXRoLmV4dG5hbWUobmFtZSkudG9Mb3dlckNhc2UoKSA9PT0gJy56aXAnKVxuICAubWFwKG5hbWUgPT4ge1xuICAgIGNvbnN0IGZpbGUgPSBQYXRoLnJlc29sdmUoemlwRGlyLCBuYW1lKTtcbiAgICByZXR1cm4gYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc29sZS5sb2coYFtwaWQ6JHtwcm9jZXNzLnBpZH1dIHN0YXJ0IGV4dHJhY3RpbmcgJHtmaWxlfWApO1xuICAgICAgcHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7bG9nOiBgW3BpZDoke3Byb2Nlc3MucGlkfV0gc3RhcnQgZXh0cmFjdGluZyAke2ZpbGV9YH0pO1xuICAgICAgYXdhaXQgdHJ5RXh0cmFjdChmaWxlKTtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDAwKSk7XG4gICAgICBpZiAoZGVsZXRlT3B0aW9uICE9PSAna2VlcCcpXG4gICAgICAgIGZzLnVubGlua1N5bmMoZmlsZSk7XG4gICAgICBjb25zb2xlLmxvZygnZG9uZScsIGZpbGUpO1xuICAgICAgcHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7ZG9uZTogYFtwaWQ6JHtwcm9jZXNzLnBpZH1dIGRvbmUgZXh0cmFjdGluZyAke2ZpbGV9YH0pO1xuICAgIH07XG4gIH0pO1xuICBpZiAocHJvbXMubGVuZ3RoID4gMCkge1xuICAgIGZvciAoY29uc3QgcHJvbSBvZiBwcm9tcykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgcHJvbSgpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmVcblx0XHRcdFx0Y29uc29sZS5sb2coZSk7XG4gICAgICAgIHByb2Nlc3Muc2VuZCAmJiBwcm9jZXNzLnNlbmQoe2Vycm9yOiBlfSk7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHByb2Nlc3Muc2VuZCAmJiBwcm9jZXNzLnNlbmQoe2xvZzogYFtwaWQ6JHtwcm9jZXNzLnBpZH1dIG5vIGRvd25sb2FkZWQgZmlsZSBmb3VuZGB9KTtcbiAgfVxufVxuXG5cbmFzeW5jIGZ1bmN0aW9uIHRyeUV4dHJhY3QoZmlsZTogc3RyaW5nKSB7XG4gIGNvbnN0IGRhdGE6IEJ1ZmZlciA9IGF3YWl0IHJlYWRGaWxlQXN5bmMoZmlsZSk7XG4gIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjb25zdCB6aXAgPSBuZXcgQWRtWmlwKGRhdGEpO1xuICAgIHppcC5leHRyYWN0QWxsVG9Bc3luYyh6aXBFeHRyYWN0RGlyLCB0cnVlLCAoZXJyKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHByb2Nlc3Muc2VuZCAmJiBwcm9jZXNzLnNlbmQoe2Vycm9yOiB1dGlsLmluc3BlY3QoZXJyKX0pO1xuICAgICAgICBpZiAoKGVyciBhcyBhbnkpLmNvZGUgPT09ICdFTk9NRU0nIHx8IGVyci50b1N0cmluZygpLmluZGV4T2YoJ25vdCBlbm91Z2ggbWVtb3J5JykgPj0gMCkge1xuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZVxuXHRcdFx0XHRcdHByb2Nlc3Muc2VuZCAmJiBwcm9jZXNzLnNlbmQoe2xvZzogYFtwaWQ6JHtwcm9jZXNzLnBpZH1dJHtvcy5ob3N0bmFtZSgpfSAke29zLnVzZXJJbmZvKCkudXNlcm5hbWV9IFtGcmVlIG1lbV06ICR7TWF0aC5yb3VuZChvcy5mcmVlbWVtKCkgLyAxMDQ4NTc2KX1NLCBbdG90YWwgbWVtXTogJHtNYXRoLnJvdW5kKG9zLnRvdGFsbWVtKCkgLyAxMDQ4NTc2KX1NYH0pO1xuICAgICAgICB9XG4gICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn1cblxuc3RhcnQoKTtcbiJdfQ==