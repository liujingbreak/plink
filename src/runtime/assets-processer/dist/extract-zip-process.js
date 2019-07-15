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
start();
// setTimeout(start, 100);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2V4dHJhY3QtemlwLXByb2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEJBQTRCO0FBQzVCOztHQUVHO0FBQ0gsOERBQTZCO0FBQzdCLG9EQUFvQjtBQUNwQix3REFBd0I7QUFDeEIsb0RBQW9CO0FBQ3BCLHdEQUF3QjtBQUN4Qix3REFBd0I7QUFFeEIsT0FBTyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO0lBQ3RDLDJCQUEyQjtJQUM1QixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUU7SUFDakIsMkJBQTJCO0lBQzVCLE9BQU8sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7Q0FDekM7QUFFRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQzFCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2QixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFFOUIsTUFBTSxhQUFhLEdBQUcsY0FBSSxDQUFDLFlBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUN4QyxTQUFlLEtBQUs7O1FBQ2xCLE1BQU0sU0FBUyxHQUFHLFlBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDekMsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxFQUFFLEtBQUssTUFBTSxDQUFDO1lBQ25GLDRCQUE0QjtZQUM1Qix3Q0FBd0M7WUFDeEMsd0NBQXdDO1lB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QUUsQ0FBQztBQUNSLDBCQUEwQiIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2V4dHJhY3QtemlwLXByb2Nlc3MuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG4vKipcbiAqIEBkZXByZWNhdGVkXG4gKi9cbmltcG9ydCBBZG1aaXAgZnJvbSAnYWRtLXppcCc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IHV0aWwgZnJvbSAndXRpbCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgcGlmeSBmcm9tICdwaWZ5JztcblxucHJvY2Vzcy5vbigndW5jYXVnaHRFeGNlcHRpb24nLCAoZXJyKSA9PiB7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuXHRjb25zb2xlLmxvZyhlcnIpO1xufSk7XG5cbmlmICghcHJvY2Vzcy5zZW5kKSB7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuXHRwcm9jZXNzLnNlbmQgPSBjb25zb2xlLmxvZy5iaW5kKGNvbnNvbGUpO1xufVxuXG5jb25zdCBhcmd2ID0gcHJvY2Vzcy5hcmd2O1xuY29uc3QgemlwRGlyID0gYXJndlsyXTtcbmNvbnN0IHppcEV4dHJhY3REaXIgPSBhcmd2WzNdO1xuXG5jb25zdCByZWFkRmlsZUFzeW5jID0gcGlmeShmcy5yZWFkRmlsZSk7XG5hc3luYyBmdW5jdGlvbiBzdGFydCgpIHtcbiAgY29uc3QgZmlsZU5hbWVzID0gZnMucmVhZGRpclN5bmMoemlwRGlyKTtcbiAgY29uc3QgcHJvbXMgPSBmaWxlTmFtZXMuZmlsdGVyKG5hbWUgPT4gUGF0aC5leHRuYW1lKG5hbWUpLnRvTG93ZXJDYXNlKCkgPT09ICcuemlwJylcbiAgLy8gLnNvcnQoKG5hbWUxLCBuYW1lMikgPT4ge1xuICAvLyBcdGNvbnN0IG1hdGNoMSA9IC9bMC05XSsvLmV4ZWMobmFtZTEpO1xuICAvLyBcdGNvbnN0IG1hdGNoMiA9IC9bMC05XSsvLmV4ZWMobmFtZTIpO1xuICAvLyBcdGlmIChtYXRjaDEgJiYgbWF0Y2gxWzBdICYmIG1hdGNoMiAmJiBtYXRjaDJbMF0pIHtcbiAgLy8gXHRcdHJldHVybiBwYXJzZUludChtYXRjaDFbMF0sIDEwKSAtIHBhcnNlSW50KG1hdGNoMlswXSwgMTApO1xuICAvLyBcdH1cbiAgLy8gXHRyZXR1cm4gMDtcbiAgLy8gfSlcbiAgLm1hcChuYW1lID0+IHtcbiAgICBjb25zdCBmaWxlID0gUGF0aC5yZXNvbHZlKHppcERpciwgbmFtZSk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKGBbcGlkOiR7cHJvY2Vzcy5waWR9XSBzdGFydCBleHRyYWN0aW5nICR7ZmlsZX1gKTtcbiAgICAgIHByb2Nlc3Muc2VuZCh7bG9nOiBgW3BpZDoke3Byb2Nlc3MucGlkfV0gc3RhcnQgZXh0cmFjdGluZyAke2ZpbGV9YH0pO1xuICAgICAgcmV0dXJuIHRyeUV4dHJhY3QoZmlsZSlcbiAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgZnMudW5saW5rU3luYyhmaWxlKTtcbiAgICAgICAgcHJvY2Vzcy5zZW5kKHtkb25lOiBgW3BpZDoke3Byb2Nlc3MucGlkfV0gZG9uZSBleHRyYWN0aW5nICR7ZmlsZX1gfSk7XG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcbiAgaWYgKHByb21zLmxlbmd0aCA+IDApIHtcbiAgICBmb3IgKGNvbnN0IHByb20gb2YgcHJvbXMpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHByb20oKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdFx0XHRcdGNvbnNvbGUubG9nKGUpO1xuICAgICAgICBwcm9jZXNzLnNlbmQoe2Vycm9yOiBlfSk7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHByb2Nlc3Muc2VuZCh7bG9nOiBgW3BpZDoke3Byb2Nlc3MucGlkfV0gbm8gZG93bmxvYWRlZCBmaWxlIGZvdW5kYH0pO1xuICB9XG59XG5cblxuYXN5bmMgZnVuY3Rpb24gdHJ5RXh0cmFjdChmaWxlOiBzdHJpbmcpIHtcbiAgY29uc3QgZGF0YTogQnVmZmVyID0gYXdhaXQgcmVhZEZpbGVBc3luYyhmaWxlKTtcbiAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IHppcCA9IG5ldyBBZG1aaXAoZGF0YSk7XG4gICAgemlwLmV4dHJhY3RBbGxUb0FzeW5jKHppcEV4dHJhY3REaXIsIHRydWUsIChlcnIpID0+IHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcHJvY2Vzcy5zZW5kKHtlcnJvcjogdXRpbC5pbnNwZWN0KGVycil9KTtcbiAgICAgICAgaWYgKChlcnIgYXMgYW55KS5jb2RlID09PSAnRU5PTUVNJyB8fCBlcnIudG9TdHJpbmcoKS5pbmRleE9mKCdub3QgZW5vdWdoIG1lbW9yeScpID49IDApIHtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0XHRcdFx0XHRwcm9jZXNzLnNlbmQoe2xvZzogYFtwaWQ6JHtwcm9jZXNzLnBpZH1dJHtvcy5ob3N0bmFtZSgpfSAke29zLnVzZXJJbmZvKCkudXNlcm5hbWV9IFtGcmVlIG1lbV06ICR7TWF0aC5yb3VuZChvcy5mcmVlbWVtKCkgLyAxMDQ4NTc2KX1NLCBbdG90YWwgbWVtXTogJHtNYXRoLnJvdW5kKG9zLnRvdGFsbWVtKCkgLyAxMDQ4NTc2KX1NYH0pO1xuICAgICAgICB9XG4gICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn1cblxuc3RhcnQoKTtcbi8vIHNldFRpbWVvdXQoc3RhcnQsIDEwMCk7XG4iXX0=
