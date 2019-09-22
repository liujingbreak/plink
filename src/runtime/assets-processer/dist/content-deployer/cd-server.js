"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const os_1 = tslib_1.__importDefault(require("os"));
const util_1 = tslib_1.__importDefault(require("util"));
const fetch_remote_1 = require("../fetch-remote");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const log = require('log4js').getLogger('@dr/assets-processer.cd-server');
function activate(app, imap) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let fwriter;
        let writingFile;
        const checksum = {
            versions: {}
        };
        const { isPm2, isMainProcess } = fetch_remote_1.getPm2Info();
        if (isPm2) {
            initPm2();
        }
        app.use('/_install/:app/:version', (req, res) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            log.info(`${req.method} [${os_1.default.hostname}]app: ${req.params.app}, version: ${req.params.version}\n${util_1.default.inspect(req.headers)}`);
            const nVersion = parseInt(req.params.version, 10);
            const existing = checksum.versions[req.params.app];
            if (isPm2 && !isMainProcess) {
                yield new Promise(resolve => setTimeout(resolve, 800));
            }
            if (existing && existing.version >= nVersion) {
                // I want to cancel recieving request body asap
                // https://stackoverflow.com/questions/18367824/how-to-cancel-http-upload-from-data-events
                res.header('Connection', 'close');
                res.status(409).send(`REJECT from ${os_1.default.hostname()} pid: ${process.pid}: ${JSON.stringify(checksum, null, '  ')}`);
                req.socket.end();
                res.connection.end();
                return;
            }
            checksum.versions[req.params.app] = { version: parseInt(req.params.version, 10) };
            if (isPm2) {
                process.send({
                    type: 'process:msg',
                    data: {
                        'cd-server:checksum updating': checksum,
                        pid: process.pid
                    }
                });
            }
            if (req.method === 'PUT') {
                log.info('recieving data');
                let countBytes = 0;
                req.on('data', (data) => {
                    countBytes += data.byteLength;
                    if (fwriter == null) {
                        writingFile = path_1.default.resolve(fetch_remote_1.zipDownloadDir, `${req.params.app}.${process.pid}.zip`);
                        fwriter = fs_extra_1.default.createWriteStream(writingFile);
                    }
                    fwriter.write(data);
                });
                req.on('end', () => {
                    log.info(`${writingFile} is written with ${countBytes} bytes`);
                    fwriter.end(onZipFileWritten);
                    fwriter = undefined;
                    res.send(`[ACCEPT] ${os_1.default.hostname()} pid: ${process.pid}: ${JSON.stringify(checksum, null, '  ')}`);
                });
            }
            else
                res.send(`[INFO] ${os_1.default.hostname()} pid: ${process.pid}: ${JSON.stringify(checksum, null, '  ')}`);
        }));
        let checkedSeq = '';
        app.get('/_checkmail/:seq', (req, res) => {
            log.info('force check mail for:', req.params.seq);
            if (checkedSeq === req.params.seq)
                return;
            if (isPm2 && !isMainProcess) {
                process.send({
                    type: 'process:msg',
                    data: {
                        'cd-server:check mail': req.params.seq,
                        pid: process.pid
                    }
                });
            }
            else {
                imap.checkMailForUpdate();
            }
        });
        function onZipFileWritten() {
            if (isPm2 && !isMainProcess) {
                process.send({
                    type: 'process:msg',
                    data: { extractZip: true, pid: process.pid }
                });
            }
            else
                fetch_remote_1.retry(2, fetch_remote_1.forkExtractExstingZip);
        }
        function initPm2() {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                const pm2 = require('@growth/pm2');
                const pm2connect = util_1.default.promisify(pm2.connect.bind(pm2));
                const pm2launchBus = util_1.default.promisify(pm2.launchBus.bind(pm2));
                yield pm2connect();
                const bus = yield pm2launchBus();
                bus.on('process:msg', packet => {
                    if (!packet.data) {
                        return;
                    }
                    const updatingProp = packet.data['cd-server:checksum updating'];
                    if (updatingProp && packet.data.pid !== process.pid) {
                        const recievedChecksum = updatingProp;
                        if (recievedChecksum)
                            checksum.versions = recievedChecksum.versions;
                        log.info('Other process recieved updating checksum %s from id: %s', util_1.default.inspect(checksum), lodash_1.default.get(packet, 'process.pm_id'));
                    }
                    const checkMailProp = packet.data['cd-server:check mail'];
                    if (checkMailProp && packet.data.pid !== process.pid) {
                        checkedSeq = checkMailProp;
                        log.info('Other process triggers "check mail" from id:', lodash_1.default.get(packet, 'process.pm_id'));
                        imap.checkMailForUpdate();
                    }
                    if (packet.data.extractZip && packet.data.pid !== process.pid) {
                        log.info('Other process triggers "extractZip" from id:', lodash_1.default.get(packet, 'process.pm_id'));
                        fetch_remote_1.retry(2, fetch_remote_1.forkExtractExstingZip);
                    }
                });
            });
        }
    });
}
exports.activate = activate;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2NvbnRlbnQtZGVwbG95ZXIvY2Qtc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG9EQUFvQjtBQUVwQix3REFBd0I7QUFFeEIsa0RBQXlGO0FBQ3pGLHdEQUF3QjtBQUV4QixnRUFBMEI7QUFDMUIsNERBQXVCO0FBQ3ZCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQVkxRSxTQUFzQixRQUFRLENBQUMsR0FBZ0IsRUFBRSxJQUFpQjs7UUFDaEUsSUFBSSxPQUFtQyxDQUFDO1FBQ3hDLElBQUksV0FBK0IsQ0FBQztRQUVwQyxNQUFNLFFBQVEsR0FBYTtZQUN6QixRQUFRLEVBQUUsRUFBRTtTQUNiLENBQUM7UUFFRixNQUFNLEVBQUMsS0FBSyxFQUFFLGFBQWEsRUFBQyxHQUFHLHlCQUFVLEVBQUUsQ0FBQztRQUM1QyxJQUFJLEtBQUssRUFBRTtZQUNULE9BQU8sRUFBRSxDQUFDO1NBQ1g7UUFFRCxHQUFHLENBQUMsR0FBRyxDQUFDLHlCQUF5QixFQUFFLENBQU8sR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQ3BELEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxLQUFLLFlBQUUsQ0FBQyxRQUFRLFNBQVMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLGNBQWMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEtBQUssY0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQy9ILE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNsRCxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsUUFBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENB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LE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDO3dCQUN6RixJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztxQkFDM0I7b0JBRUQsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxPQUFPLENBQUMsR0FBRyxFQUFFO3dCQUM3RCxHQUFHLENBQUMsSUFBSSxDQUFDLDhDQUE4QyxFQUFFLGdCQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDO3dCQUN6RixvQkFBSyxDQUFDLENBQUMsRUFBRSxvQ0FBcUIsQ0FBQyxDQUFDO3FCQUNqQztnQkFDSCxDQUFDLENBQUMsQ0FBQztZQUNMLENBQUM7U0FBQTtJQUVILENBQUM7Q0FBQTtBQTdIRCw0QkE2SEMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9jb250ZW50LWRlcGxveWVyL2NkLXNlcnZlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7QXBwbGljYXRpb259IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCB7Q2hlY2tzdW19IGZyb20gJy4uL2ZldGNoLXR5cGVzJztcbmltcG9ydCB1dGlsIGZyb20gJ3V0aWwnO1xuaW1wb3J0IF9wbTIgZnJvbSAnQGdyb3d0aC9wbTInO1xuaW1wb3J0IHtnZXRQbTJJbmZvLCB6aXBEb3dubG9hZERpciwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwLCByZXRyeX0gZnJvbSAnLi4vZmV0Y2gtcmVtb3RlJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtJbWFwTWFuYWdlcn0gZnJvbSAnLi4vZmV0Y2gtcmVtb3RlLWltYXAnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ0Bkci9hc3NldHMtcHJvY2Vzc2VyLmNkLXNlcnZlcicpO1xuXG5pbnRlcmZhY2UgUG0yUGFja2V0IHtcbiAgdHlwZTogJ3Byb2Nlc3M6bXNnJztcbiAgZGF0YTogYW55O1xuICBwcm9jZXNzOiB7cG1faWQ6IHN0cmluZ307XG59XG5cbmludGVyZmFjZSBQbTJCdXMge1xuICBvbihldmVudDogJ3Byb2Nlc3M6bXNnJywgY2I6IChwYWNrZXQ6IFBtMlBhY2tldCkgPT4gdm9pZCk6IHZvaWQ7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhY3RpdmF0ZShhcHA6IEFwcGxpY2F0aW9uLCBpbWFwOiBJbWFwTWFuYWdlcikge1xuICBsZXQgZndyaXRlcjogZnMuV3JpdGVTdHJlYW0gfCB1bmRlZmluZWQ7XG4gIGxldCB3cml0aW5nRmlsZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0IGNoZWNrc3VtOiBDaGVja3N1bSA9IHtcbiAgICB2ZXJzaW9uczoge31cbiAgfTtcblxuICBjb25zdCB7aXNQbTIsIGlzTWFpblByb2Nlc3N9ID0gZ2V0UG0ySW5mbygpO1xuICBpZiAoaXNQbTIpIHtcbiAgICBpbml0UG0yKCk7XG4gIH1cblxuICBhcHAudXNlKCcvX2luc3RhbGwvOmFwcC86dmVyc2lvbicsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIGxvZy5pbmZvKGAke3JlcS5tZXRob2R9IFske29zLmhvc3RuYW1lfV1hcHA6ICR7cmVxLnBhcmFtcy5hcHB9LCB2ZXJzaW9uOiAke3JlcS5wYXJhbXMudmVyc2lvbn1cXG4ke3V0aWwuaW5zcGVjdChyZXEuaGVhZGVycyl9YCk7XG4gICAgY29uc3QgblZlcnNpb24gPSBwYXJzZUludChyZXEucGFyYW1zLnZlcnNpb24sIDEwKTtcbiAgICBjb25zdCBleGlzdGluZyA9IGNoZWNrc3VtLnZlcnNpb25zIVtyZXEucGFyYW1zLmFwcF07XG5cbiAgICBpZiAoaXNQbTIgJiYgIWlzTWFpblByb2Nlc3MpIHtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCA4MDApKTtcbiAgICB9XG5cbiAgICBpZiAoZXhpc3RpbmcgJiYgZXhpc3RpbmcudmVyc2lvbiA+PSBuVmVyc2lvbikge1xuICAgICAgLy8gSSB3YW50IHRvIGNhbmNlbCByZWNpZXZpbmcgcmVxdWVzdCBib2R5IGFzYXBcbiAgICAgIC8vIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE4MzY3ODI0L2hvdy10by1jYW5jZWwtaHR0cC11cGxvYWQtZnJvbS1kYXRhLWV2ZW50c1xuICAgICAgcmVzLmhlYWRlcignQ29ubmVjdGlvbicsICdjbG9zZScpO1xuICAgICAgcmVzLnN0YXR1cyg0MDkpLnNlbmQoYFJFSkVDVCBmcm9tICR7b3MuaG9zdG5hbWUoKX0gcGlkOiAke3Byb2Nlc3MucGlkfTogJHtKU09OLnN0cmluZ2lmeShjaGVja3N1bSwgbnVsbCwgJyAgJyl9YCk7XG4gICAgICByZXEuc29ja2V0LmVuZCgpO1xuICAgICAgcmVzLmNvbm5lY3Rpb24uZW5kKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY2hlY2tzdW0udmVyc2lvbnMhW3JlcS5wYXJhbXMuYXBwXSA9IHt2ZXJzaW9uOiBwYXJzZUludChyZXEucGFyYW1zLnZlcnNpb24sIDEwKX07XG4gICAgaWYgKGlzUG0yKSB7XG4gICAgICBwcm9jZXNzLnNlbmQhKHtcbiAgICAgICAgdHlwZSA6ICdwcm9jZXNzOm1zZycsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAnY2Qtc2VydmVyOmNoZWNrc3VtIHVwZGF0aW5nJzogY2hlY2tzdW0sXG4gICAgICAgICAgcGlkOiBwcm9jZXNzLnBpZFxuICAgICAgICB9XG4gICAgICB9IGFzIFBtMlBhY2tldCk7XG4gICAgfVxuICAgIGlmIChyZXEubWV0aG9kID09PSAnUFVUJykge1xuICAgICAgbG9nLmluZm8oJ3JlY2lldmluZyBkYXRhJyk7XG4gICAgICBsZXQgY291bnRCeXRlcyA9IDA7XG4gICAgICByZXEub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PiB7XG4gICAgICAgIGNvdW50Qnl0ZXMgKz0gZGF0YS5ieXRlTGVuZ3RoO1xuICAgICAgICBpZiAoZndyaXRlciA9PSBudWxsKSB7XG4gICAgICAgICAgd3JpdGluZ0ZpbGUgPSBQYXRoLnJlc29sdmUoemlwRG93bmxvYWREaXIsIGAke3JlcS5wYXJhbXMuYXBwfS4ke3Byb2Nlc3MucGlkfS56aXBgKTtcbiAgICAgICAgICBmd3JpdGVyID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0od3JpdGluZ0ZpbGUpO1xuICAgICAgICB9XG4gICAgICAgIGZ3cml0ZXIud3JpdGUoZGF0YSk7XG4gICAgICB9KTtcbiAgICAgIHJlcS5vbignZW5kJywgKCkgPT4ge1xuICAgICAgICBsb2cuaW5mbyhgJHt3cml0aW5nRmlsZX0gaXMgd3JpdHRlbiB3aXRoICR7Y291bnRCeXRlc30gYnl0ZXNgKTtcbiAgICAgICAgZndyaXRlciEuZW5kKG9uWmlwRmlsZVdyaXR0ZW4pO1xuICAgICAgICBmd3JpdGVyID0gdW5kZWZpbmVkO1xuICAgICAgICByZXMuc2VuZChgW0FDQ0VQVF0gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiAke0pTT04uc3RyaW5naWZ5KGNoZWNrc3VtLCBudWxsLCAnICAnKX1gKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZVxuICAgICAgcmVzLnNlbmQoYFtJTkZPXSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06ICR7SlNPTi5zdHJpbmdpZnkoY2hlY2tzdW0sIG51bGwsICcgICcpfWApO1xuICB9KTtcblxuICBsZXQgY2hlY2tlZFNlcSA9ICcnO1xuXG4gIGFwcC5nZXQoJy9fY2hlY2ttYWlsLzpzZXEnLCAocmVxLCByZXMpID0+IHtcbiAgICBsb2cuaW5mbygnZm9yY2UgY2hlY2sgbWFpbCBmb3I6JywgcmVxLnBhcmFtcy5zZXEpO1xuICAgIGlmIChjaGVja2VkU2VxID09PSByZXEucGFyYW1zLnNlcSlcbiAgICAgIHJldHVybjtcbiAgICBpZiAoaXNQbTIgJiYgIWlzTWFpblByb2Nlc3MpIHtcbiAgICAgIHByb2Nlc3Muc2VuZCEoe1xuICAgICAgICB0eXBlIDogJ3Byb2Nlc3M6bXNnJyxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICdjZC1zZXJ2ZXI6Y2hlY2sgbWFpbCc6IHJlcS5wYXJhbXMuc2VxLFxuICAgICAgICAgIHBpZDogcHJvY2Vzcy5waWRcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGltYXAuY2hlY2tNYWlsRm9yVXBkYXRlKCk7XG4gICAgfVxuICB9KTtcblxuICBmdW5jdGlvbiBvblppcEZpbGVXcml0dGVuKCkge1xuICAgIGlmIChpc1BtMiAmJiAhaXNNYWluUHJvY2Vzcykge1xuICAgICAgcHJvY2Vzcy5zZW5kISh7XG4gICAgICAgIHR5cGUgOiAncHJvY2Vzczptc2cnLFxuICAgICAgICBkYXRhOiB7ZXh0cmFjdFppcDogdHJ1ZSwgcGlkOiBwcm9jZXNzLnBpZH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZVxuICAgICAgcmV0cnkoMiwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwKTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGluaXRQbTIoKSB7XG4gICAgY29uc3QgcG0yOiB0eXBlb2YgX3BtMiA9IHJlcXVpcmUoJ0Bncm93dGgvcG0yJyk7XG4gICAgY29uc3QgcG0yY29ubmVjdCA9IHV0aWwucHJvbWlzaWZ5KHBtMi5jb25uZWN0LmJpbmQocG0yKSk7XG4gICAgY29uc3QgcG0ybGF1bmNoQnVzID0gdXRpbC5wcm9taXNpZnk8UG0yQnVzPihwbTIubGF1bmNoQnVzLmJpbmQocG0yKSk7XG5cbiAgICBhd2FpdCBwbTJjb25uZWN0KCk7XG4gICAgY29uc3QgYnVzID0gYXdhaXQgcG0ybGF1bmNoQnVzKCk7XG4gICAgYnVzLm9uKCdwcm9jZXNzOm1zZycsIHBhY2tldCA9PiB7XG4gICAgICBpZiAoIXBhY2tldC5kYXRhKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHVwZGF0aW5nUHJvcCA9IHBhY2tldC5kYXRhWydjZC1zZXJ2ZXI6Y2hlY2tzdW0gdXBkYXRpbmcnXTtcbiAgICAgIGlmICh1cGRhdGluZ1Byb3AgJiYgcGFja2V0LmRhdGEucGlkICE9PSBwcm9jZXNzLnBpZCkge1xuICAgICAgICBjb25zdCByZWNpZXZlZENoZWNrc3VtID0gdXBkYXRpbmdQcm9wO1xuICAgICAgICBpZiAocmVjaWV2ZWRDaGVja3N1bSlcbiAgICAgICAgICBjaGVja3N1bS52ZXJzaW9ucyA9IHJlY2lldmVkQ2hlY2tzdW0udmVyc2lvbnM7XG4gICAgICAgICAgbG9nLmluZm8oJ090aGVyIHByb2Nlc3MgcmVjaWV2ZWQgdXBkYXRpbmcgY2hlY2tzdW0gJXMgZnJvbSBpZDogJXMnLFxuICAgICAgICAgICAgdXRpbC5pbnNwZWN0KGNoZWNrc3VtKSwgXy5nZXQocGFja2V0LCAncHJvY2Vzcy5wbV9pZCcpKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGNoZWNrTWFpbFByb3AgPSBwYWNrZXQuZGF0YVsnY2Qtc2VydmVyOmNoZWNrIG1haWwnXTtcbiAgICAgIGlmIChjaGVja01haWxQcm9wICYmIHBhY2tldC5kYXRhLnBpZCAhPT0gcHJvY2Vzcy5waWQpIHtcbiAgICAgICAgY2hlY2tlZFNlcSA9IGNoZWNrTWFpbFByb3A7XG4gICAgICAgIGxvZy5pbmZvKCdPdGhlciBwcm9jZXNzIHRyaWdnZXJzIFwiY2hlY2sgbWFpbFwiIGZyb20gaWQ6JywgXy5nZXQocGFja2V0LCAncHJvY2Vzcy5wbV9pZCcpKTtcbiAgICAgICAgaW1hcC5jaGVja01haWxGb3JVcGRhdGUoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBhY2tldC5kYXRhLmV4dHJhY3RaaXAgJiYgcGFja2V0LmRhdGEucGlkICE9PSBwcm9jZXNzLnBpZCkge1xuICAgICAgICBsb2cuaW5mbygnT3RoZXIgcHJvY2VzcyB0cmlnZ2VycyBcImV4dHJhY3RaaXBcIiBmcm9tIGlkOicsIF8uZ2V0KHBhY2tldCwgJ3Byb2Nlc3MucG1faWQnKSk7XG4gICAgICAgIHJldHJ5KDIsIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxufVxuXG4iXX0=
