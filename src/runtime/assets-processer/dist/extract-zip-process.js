"use strict";
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
async function start() {
    const fileNames = fs_1.default.readdirSync(zipDir);
    const proms = fileNames.filter(name => path_1.default.extname(name).toLowerCase() === '.zip')
        .map(name => {
        const file = path_1.default.resolve(zipDir, name);
        return async () => {
            console.log(`[pid:${process.pid}] start extracting ${file}`);
            process.send && process.send({ log: `[pid:${process.pid}] start extracting ${file}` });
            await tryExtract(file);
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (deleteOption !== 'keep')
                fs_1.default.unlinkSync(file);
            console.log('done', file);
            process.send && process.send({ done: `[pid:${process.pid}] done extracting ${file}` });
        };
    });
    if (proms.length > 0) {
        for (const prom of proms) {
            try {
                await prom();
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
}
async function tryExtract(file) {
    const data = await readFileAsync(file);
    await new Promise((resolve, reject) => {
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
}
void start();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdC16aXAtcHJvY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImV4dHJhY3QtemlwLXByb2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSwrQkFBK0I7QUFDL0I7O0dBRUc7QUFDSCx1Q0FBcUM7QUFDckMsc0RBQTZCO0FBQzdCLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFFN0IsT0FBTyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO0lBQ3RDLDJCQUEyQjtJQUMzQixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDO0FBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO0lBQ3ZDLDJCQUEyQjtJQUMzQixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUU7SUFDakIsMkJBQTJCO0lBQzVCLE9BQU8sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7Q0FDekM7QUFFRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQzFCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2QixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRTdCLE1BQU0sYUFBYSxHQUFxRCxJQUFJLENBQUMsWUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzFGLEtBQUssVUFBVSxLQUFLO0lBQ2xCLE1BQU0sU0FBUyxHQUFHLFlBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDekMsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxFQUFFLEtBQUssTUFBTSxDQUFDO1NBQ2xGLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNWLE1BQU0sSUFBSSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hDLE9BQU8sS0FBSyxJQUFJLEVBQUU7WUFDaEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLE9BQU8sQ0FBQyxHQUFHLHNCQUFzQixJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQzdELE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSxRQUFRLE9BQU8sQ0FBQyxHQUFHLHNCQUFzQixJQUFJLEVBQUUsRUFBQyxDQUFDLENBQUM7WUFDckYsTUFBTSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdkIsTUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUN4RCxJQUFJLFlBQVksS0FBSyxNQUFNO2dCQUN6QixZQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3RCLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzFCLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksRUFBRSxRQUFRLE9BQU8sQ0FBQyxHQUFHLHFCQUFxQixJQUFJLEVBQUUsRUFBQyxDQUFDLENBQUM7UUFDdkYsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSCxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3BCLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1lBQ3hCLElBQUk7Z0JBQ0YsTUFBTSxJQUFJLEVBQUUsQ0FBQzthQUNkO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1YsMkJBQTJCO2dCQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNYLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDO2FBQzFDO1NBQ0Y7S0FDRjtTQUFNO1FBQ0wsT0FBTyxDQUFDLElBQUksSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUMsR0FBRyxFQUFFLFFBQVEsT0FBTyxDQUFDLEdBQUcsNEJBQTRCLEVBQUMsQ0FBQyxDQUFDO0tBQ3RGO0FBQ0gsQ0FBQztBQUdELEtBQUssVUFBVSxVQUFVLENBQUMsSUFBWTtJQUNwQyxNQUFNLElBQUksR0FBVyxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvQyxNQUFNLElBQUksT0FBTyxDQUFPLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQzFDLE1BQU0sR0FBRyxHQUFHLElBQUksaUJBQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QixHQUFHLENBQUMsaUJBQWlCLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ2pELElBQUksR0FBRyxFQUFFO2dCQUNQLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFDLENBQUMsQ0FBQztnQkFDekQsSUFBSyxHQUFXLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFO29CQUN0RiwyQkFBMkI7b0JBQ2hDLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSxRQUFRLE9BQU8sQ0FBQyxHQUFHLElBQUksWUFBRSxDQUFDLFFBQVEsRUFBRSxJQUFJLFlBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLGdCQUFnQixJQUFJLENBQUMsS0FBSyxDQUFDLFlBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxPQUFPLENBQUMsbUJBQW1CLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUMsQ0FBQyxDQUFDO2lCQUMzTTtnQkFDRCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDYjtpQkFBTTtnQkFDTCxPQUFPLEVBQUUsQ0FBQzthQUNYO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxLQUFLLEtBQUssRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuLyoqXG4gKiBAZGVwcmVjYXRlZFxuICovXG5pbXBvcnQgJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3Rlcic7XG5pbXBvcnQgQWRtWmlwIGZyb20gJ2FkbS16aXAnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCB1dGlsIGZyb20gJ3V0aWwnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuY29uc3QgcGlmeSA9IHJlcXVpcmUoJ3BpZnknKTtcblxucHJvY2Vzcy5vbigndW5jYXVnaHRFeGNlcHRpb24nLCAoZXJyKSA9PiB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZVxuICBjb25zb2xlLmxvZyhlcnIpO1xuICBwcm9jZXNzLnNlbmQgJiYgcHJvY2Vzcy5zZW5kKHtlcnJvcjogZXJyfSk7XG59KTtcblxucHJvY2Vzcy5vbigndW5oYW5kbGVkUmVqZWN0aW9uJywgKGVycikgPT4ge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmVcbiAgY29uc29sZS5sb2coZXJyKTtcbiAgcHJvY2Vzcy5zZW5kICYmIHByb2Nlc3Muc2VuZCh7ZXJyb3I6IGVycn0pO1xufSk7XG5cbmlmICghcHJvY2Vzcy5zZW5kKSB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZVxuXHRwcm9jZXNzLnNlbmQgPSBjb25zb2xlLmxvZy5iaW5kKGNvbnNvbGUpO1xufVxuXG5jb25zdCBhcmd2ID0gcHJvY2Vzcy5hcmd2O1xuY29uc3QgemlwRGlyID0gYXJndlsyXTtcbmNvbnN0IHppcEV4dHJhY3REaXIgPSBhcmd2WzNdO1xuY29uc3QgZGVsZXRlT3B0aW9uID0gYXJndls0XTtcblxuY29uc3QgcmVhZEZpbGVBc3luYzogKGZpbGU6IHN0cmluZywgY29kZT86IHN0cmluZykgPT4gUHJvbWlzZTxCdWZmZXI+ID0gcGlmeShmcy5yZWFkRmlsZSk7XG5hc3luYyBmdW5jdGlvbiBzdGFydCgpIHtcbiAgY29uc3QgZmlsZU5hbWVzID0gZnMucmVhZGRpclN5bmMoemlwRGlyKTtcbiAgY29uc3QgcHJvbXMgPSBmaWxlTmFtZXMuZmlsdGVyKG5hbWUgPT4gUGF0aC5leHRuYW1lKG5hbWUpLnRvTG93ZXJDYXNlKCkgPT09ICcuemlwJylcbiAgLm1hcChuYW1lID0+IHtcbiAgICBjb25zdCBmaWxlID0gUGF0aC5yZXNvbHZlKHppcERpciwgbmFtZSk7XG4gICAgcmV0dXJuIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKGBbcGlkOiR7cHJvY2Vzcy5waWR9XSBzdGFydCBleHRyYWN0aW5nICR7ZmlsZX1gKTtcbiAgICAgIHByb2Nlc3Muc2VuZCAmJiBwcm9jZXNzLnNlbmQoe2xvZzogYFtwaWQ6JHtwcm9jZXNzLnBpZH1dIHN0YXJ0IGV4dHJhY3RpbmcgJHtmaWxlfWB9KTtcbiAgICAgIGF3YWl0IHRyeUV4dHJhY3QoZmlsZSk7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwMCkpO1xuICAgICAgaWYgKGRlbGV0ZU9wdGlvbiAhPT0gJ2tlZXAnKVxuICAgICAgICBmcy51bmxpbmtTeW5jKGZpbGUpO1xuICAgICAgY29uc29sZS5sb2coJ2RvbmUnLCBmaWxlKTtcbiAgICAgIHByb2Nlc3Muc2VuZCAmJiBwcm9jZXNzLnNlbmQoe2RvbmU6IGBbcGlkOiR7cHJvY2Vzcy5waWR9XSBkb25lIGV4dHJhY3RpbmcgJHtmaWxlfWB9KTtcbiAgICB9O1xuICB9KTtcbiAgaWYgKHByb21zLmxlbmd0aCA+IDApIHtcbiAgICBmb3IgKGNvbnN0IHByb20gb2YgcHJvbXMpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHByb20oKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lXG5cdFx0XHRcdGNvbnNvbGUubG9nKGUpO1xuICAgICAgICBwcm9jZXNzLnNlbmQgJiYgcHJvY2Vzcy5zZW5kKHtlcnJvcjogZX0pO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBwcm9jZXNzLnNlbmQgJiYgcHJvY2Vzcy5zZW5kKHtsb2c6IGBbcGlkOiR7cHJvY2Vzcy5waWR9XSBubyBkb3dubG9hZGVkIGZpbGUgZm91bmRgfSk7XG4gIH1cbn1cblxuXG5hc3luYyBmdW5jdGlvbiB0cnlFeHRyYWN0KGZpbGU6IHN0cmluZykge1xuICBjb25zdCBkYXRhOiBCdWZmZXIgPSBhd2FpdCByZWFkRmlsZUFzeW5jKGZpbGUpO1xuICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc3QgemlwID0gbmV3IEFkbVppcChkYXRhKTtcbiAgICB6aXAuZXh0cmFjdEFsbFRvQXN5bmMoemlwRXh0cmFjdERpciwgdHJ1ZSwgKGVycikgPT4ge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICBwcm9jZXNzLnNlbmQgJiYgcHJvY2Vzcy5zZW5kKHtlcnJvcjogdXRpbC5pbnNwZWN0KGVycil9KTtcbiAgICAgICAgaWYgKChlcnIgYXMgYW55KS5jb2RlID09PSAnRU5PTUVNJyB8fCBlcnIudG9TdHJpbmcoKS5pbmRleE9mKCdub3QgZW5vdWdoIG1lbW9yeScpID49IDApIHtcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmVcblx0XHRcdFx0XHRwcm9jZXNzLnNlbmQgJiYgcHJvY2Vzcy5zZW5kKHtsb2c6IGBbcGlkOiR7cHJvY2Vzcy5waWR9XSR7b3MuaG9zdG5hbWUoKX0gJHtvcy51c2VySW5mbygpLnVzZXJuYW1lfSBbRnJlZSBtZW1dOiAke01hdGgucm91bmQob3MuZnJlZW1lbSgpIC8gMTA0ODU3Nil9TSwgW3RvdGFsIG1lbV06ICR7TWF0aC5yb3VuZChvcy50b3RhbG1lbSgpIC8gMTA0ODU3Nil9TWB9KTtcbiAgICAgICAgfVxuICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59XG5cbnZvaWQgc3RhcnQoKTtcbiJdfQ==