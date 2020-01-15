"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const os_1 = tslib_1.__importDefault(require("os"));
const util_1 = tslib_1.__importDefault(require("util"));
const fetch_remote_1 = require("../fetch-remote");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const __api_1 = tslib_1.__importDefault(require("__api"));
const log = require('log4js').getLogger('@dr/assets-processer.cd-server');
const requireToken = __api_1.default.config.get([__api_1.default.packageName, 'requireToken'], false);
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
        imap.appendMail(`server ${os_1.default.hostname} ${process.pid} activates`, new Date() + '');
        app.use('/_install/:app/:version', (req, res) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (requireToken && req.query.whisper !== generateToken()) {
                res.header('Connection', 'close');
                res.status(401).send(`REJECT from ${os_1.default.hostname()} pid: ${process.pid}: Not allowed to push artifact in this environment.`);
                req.socket.end();
                res.connection.end();
            }
            log.info(`${req.method} [${os_1.default.hostname}]app: ${req.params.app}, version: ${req.params.version}\n${util_1.default.inspect(req.headers)}`);
            const nVersion = parseInt(req.params.version, 10);
            const existing = checksum.versions[req.params.app];
            if (req.method === 'PUT') {
                log.info('recieving data');
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
        app.get('/_time', (req, res) => {
            res.send(generateToken());
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
function generateToken() {
    const date = new Date();
    const token = date.getDate() + '' + date.getHours();
    // tslint:disable-next-line: no-console
    console.log(token);
    return token;
}
exports.generateToken = generateToken;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2NvbnRlbnQtZGVwbG95ZXIvY2Qtc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG9EQUFvQjtBQUVwQix3REFBd0I7QUFFeEIsa0RBQXlGO0FBQ3pGLHdEQUF3QjtBQUV4QixnRUFBMEI7QUFDMUIsNERBQXVCO0FBQ3ZCLDBEQUF3QjtBQUN4QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFZMUUsTUFBTSxZQUFZLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxlQUFHLENBQUMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBRTlFLFNBQXNCLFFBQVEsQ0FBQyxHQUFnQixFQUFFLElBQWlCOztRQUNoRSxJQUFJLE9BQW1DLENBQUM7UUFDeEMsSUFBSSxXQUErQixDQUFDO1FBRXBDLE1BQU0sUUFBUSxHQUFhO1lBQ3pCLFFBQVEsRUFBRSxFQUFFO1NBQ2IsQ0FBQztRQUVGLE1BQU0sRUFBQyxLQUFLLEVBQUUsYUFBYSxFQUFDLEdBQUcseUJBQVUsRUFBRSxDQUFDO1FBQzVDLElBQUksS0FBSyxFQUFFO1lBQ1QsT0FBTyxFQUFFLENBQUM7U0FDWDtRQUVELElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxZQUFFLENBQUMsUUFBUSxJQUFJLE9BQU8sQ0FBQyxHQUFHLFlBQVksRUFBRSxJQUFJLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBRW5GLEdBQUcsQ0FBQyxHQUFHLENBQUMseUJBQXlCLEVBQUUsQ0FBTyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDcEQsSUFBSSxZQUFZLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLEtBQUssYUFBYSxFQUFFLEVBQUU7Z0JBQ3pELEdBQUcsQ0FBQyxNQUFNLENB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QUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDO3dCQUN6RixvQkFBSyxDQUFDLENBQUMsRUFBRSxvQ0FBcUIsQ0FBQyxDQUFDO3FCQUNqQztnQkFDSCxDQUFDLENBQUMsQ0FBQztZQUNMLENBQUM7U0FBQTtJQUNILENBQUM7Q0FBQTtBQXRJRCw0QkFzSUM7QUFFRCxTQUFnQixhQUFhO0lBQzNCLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7SUFDeEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDcEQsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbkIsT0FBTyxLQUFLLENBQUM7QUFDZixDQUFDO0FBTkQsc0NBTUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9jb250ZW50LWRlcGxveWVyL2NkLXNlcnZlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7QXBwbGljYXRpb259IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCB7Q2hlY2tzdW19IGZyb20gJy4uL2ZldGNoLXR5cGVzJztcbmltcG9ydCB1dGlsIGZyb20gJ3V0aWwnO1xuaW1wb3J0IF9wbTIgZnJvbSAnQGdyb3d0aC9wbTInO1xuaW1wb3J0IHtnZXRQbTJJbmZvLCB6aXBEb3dubG9hZERpciwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwLCByZXRyeX0gZnJvbSAnLi4vZmV0Y2gtcmVtb3RlJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtJbWFwTWFuYWdlcn0gZnJvbSAnLi4vZmV0Y2gtcmVtb3RlLWltYXAnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignQGRyL2Fzc2V0cy1wcm9jZXNzZXIuY2Qtc2VydmVyJyk7XG5cbmludGVyZmFjZSBQbTJQYWNrZXQge1xuICB0eXBlOiAncHJvY2Vzczptc2cnO1xuICBkYXRhOiBhbnk7XG4gIHByb2Nlc3M6IHtwbV9pZDogc3RyaW5nfTtcbn1cblxuaW50ZXJmYWNlIFBtMkJ1cyB7XG4gIG9uKGV2ZW50OiAncHJvY2Vzczptc2cnLCBjYjogKHBhY2tldDogUG0yUGFja2V0KSA9PiB2b2lkKTogdm9pZDtcbn1cblxuY29uc3QgcmVxdWlyZVRva2VuID0gYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ3JlcXVpcmVUb2tlbiddLCBmYWxzZSk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhY3RpdmF0ZShhcHA6IEFwcGxpY2F0aW9uLCBpbWFwOiBJbWFwTWFuYWdlcikge1xuICBsZXQgZndyaXRlcjogZnMuV3JpdGVTdHJlYW0gfCB1bmRlZmluZWQ7XG4gIGxldCB3cml0aW5nRmlsZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0IGNoZWNrc3VtOiBDaGVja3N1bSA9IHtcbiAgICB2ZXJzaW9uczoge31cbiAgfTtcblxuICBjb25zdCB7aXNQbTIsIGlzTWFpblByb2Nlc3N9ID0gZ2V0UG0ySW5mbygpO1xuICBpZiAoaXNQbTIpIHtcbiAgICBpbml0UG0yKCk7XG4gIH1cblxuICBpbWFwLmFwcGVuZE1haWwoYHNlcnZlciAke29zLmhvc3RuYW1lfSAke3Byb2Nlc3MucGlkfSBhY3RpdmF0ZXNgLCBuZXcgRGF0ZSgpICsgJycpO1xuXG4gIGFwcC51c2UoJy9faW5zdGFsbC86YXBwLzp2ZXJzaW9uJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgaWYgKHJlcXVpcmVUb2tlbiAmJiByZXEucXVlcnkud2hpc3BlciAhPT0gZ2VuZXJhdGVUb2tlbigpKSB7XG4gICAgICByZXMuaGVhZGVyKCdDb25uZWN0aW9uJywgJ2Nsb3NlJyk7XG4gICAgICByZXMuc3RhdHVzKDQwMSkuc2VuZChgUkVKRUNUIGZyb20gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiBOb3QgYWxsb3dlZCB0byBwdXNoIGFydGlmYWN0IGluIHRoaXMgZW52aXJvbm1lbnQuYCk7XG4gICAgICByZXEuc29ja2V0LmVuZCgpO1xuICAgICAgcmVzLmNvbm5lY3Rpb24uZW5kKCk7XG4gICAgfVxuICAgIGxvZy5pbmZvKGAke3JlcS5tZXRob2R9IFske29zLmhvc3RuYW1lfV1hcHA6ICR7cmVxLnBhcmFtcy5hcHB9LCB2ZXJzaW9uOiAke3JlcS5wYXJhbXMudmVyc2lvbn1cXG4ke3V0aWwuaW5zcGVjdChyZXEuaGVhZGVycyl9YCk7XG4gICAgY29uc3QgblZlcnNpb24gPSBwYXJzZUludChyZXEucGFyYW1zLnZlcnNpb24sIDEwKTtcbiAgICBjb25zdCBleGlzdGluZyA9IGNoZWNrc3VtLnZlcnNpb25zIVtyZXEucGFyYW1zLmFwcF07XG5cbiAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ1BVVCcpIHtcbiAgICAgIGxvZy5pbmZvKCdyZWNpZXZpbmcgZGF0YScpO1xuICAgICAgaWYgKGlzUG0yICYmICFpc01haW5Qcm9jZXNzKSB7XG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCA4MDApKTtcbiAgICAgIH1cbiAgICAgIGlmIChleGlzdGluZyAmJiBleGlzdGluZy52ZXJzaW9uID49IG5WZXJzaW9uKSB7XG4gICAgICAgIC8vIEkgd2FudCB0byBjYW5jZWwgcmVjaWV2aW5nIHJlcXVlc3QgYm9keSBhc2FwXG4gICAgICAgIC8vIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE4MzY3ODI0L2hvdy10by1jYW5jZWwtaHR0cC11cGxvYWQtZnJvbS1kYXRhLWV2ZW50c1xuICAgICAgICByZXMuaGVhZGVyKCdDb25uZWN0aW9uJywgJ2Nsb3NlJyk7XG4gICAgICAgIHJlcy5zdGF0dXMoNDA5KS5zZW5kKGBSRUpFQ1QgZnJvbSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06ICR7SlNPTi5zdHJpbmdpZnkoY2hlY2tzdW0sIG51bGwsICcgICcpfWApO1xuICAgICAgICByZXEuc29ja2V0LmVuZCgpO1xuICAgICAgICByZXMuY29ubmVjdGlvbi5lbmQoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY2hlY2tzdW0udmVyc2lvbnMhW3JlcS5wYXJhbXMuYXBwXSA9IHt2ZXJzaW9uOiBwYXJzZUludChyZXEucGFyYW1zLnZlcnNpb24sIDEwKX07XG4gICAgICBpZiAoaXNQbTIpIHtcbiAgICAgICAgcHJvY2Vzcy5zZW5kISh7XG4gICAgICAgICAgdHlwZSA6ICdwcm9jZXNzOm1zZycsXG4gICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgJ2NkLXNlcnZlcjpjaGVja3N1bSB1cGRhdGluZyc6IGNoZWNrc3VtLFxuICAgICAgICAgICAgcGlkOiBwcm9jZXNzLnBpZFxuICAgICAgICAgIH1cbiAgICAgICAgfSBhcyBQbTJQYWNrZXQpO1xuICAgICAgfVxuICAgICAgbGV0IGNvdW50Qnl0ZXMgPSAwO1xuICAgICAgcmVxLm9uKCdkYXRhJywgKGRhdGE6IEJ1ZmZlcikgPT4ge1xuICAgICAgICBjb3VudEJ5dGVzICs9IGRhdGEuYnl0ZUxlbmd0aDtcbiAgICAgICAgaWYgKGZ3cml0ZXIgPT0gbnVsbCkge1xuICAgICAgICAgIHdyaXRpbmdGaWxlID0gUGF0aC5yZXNvbHZlKHppcERvd25sb2FkRGlyLCBgJHtyZXEucGFyYW1zLmFwcH0uJHtwcm9jZXNzLnBpZH0uemlwYCk7XG4gICAgICAgICAgZndyaXRlciA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKHdyaXRpbmdGaWxlKTtcbiAgICAgICAgfVxuICAgICAgICBmd3JpdGVyLndyaXRlKGRhdGEpO1xuICAgICAgfSk7XG4gICAgICByZXEub24oJ2VuZCcsICgpID0+IHtcbiAgICAgICAgbG9nLmluZm8oYCR7d3JpdGluZ0ZpbGV9IGlzIHdyaXR0ZW4gd2l0aCAke2NvdW50Qnl0ZXN9IGJ5dGVzYCk7XG4gICAgICAgIGZ3cml0ZXIhLmVuZChvblppcEZpbGVXcml0dGVuKTtcbiAgICAgICAgZndyaXRlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgcmVzLnNlbmQoYFtBQ0NFUFRdICR7b3MuaG9zdG5hbWUoKX0gcGlkOiAke3Byb2Nlc3MucGlkfTogJHtKU09OLnN0cmluZ2lmeShjaGVja3N1bSwgbnVsbCwgJyAgJyl9YCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2VcbiAgICAgIHJlcy5zZW5kKGBbSU5GT10gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiAke0pTT04uc3RyaW5naWZ5KGNoZWNrc3VtLCBudWxsLCAnICAnKX1gKTtcbiAgfSk7XG5cbiAgbGV0IGNoZWNrZWRTZXEgPSAnJztcblxuICBhcHAuZ2V0KCcvX2NoZWNrbWFpbC86c2VxJywgKHJlcSwgcmVzKSA9PiB7XG4gICAgbG9nLmluZm8oJ2ZvcmNlIGNoZWNrIG1haWwgZm9yOicsIHJlcS5wYXJhbXMuc2VxKTtcbiAgICBpZiAoY2hlY2tlZFNlcSA9PT0gcmVxLnBhcmFtcy5zZXEpXG4gICAgICByZXR1cm47XG4gICAgaWYgKGlzUG0yICYmICFpc01haW5Qcm9jZXNzKSB7XG4gICAgICBwcm9jZXNzLnNlbmQhKHtcbiAgICAgICAgdHlwZSA6ICdwcm9jZXNzOm1zZycsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAnY2Qtc2VydmVyOmNoZWNrIG1haWwnOiByZXEucGFyYW1zLnNlcSxcbiAgICAgICAgICBwaWQ6IHByb2Nlc3MucGlkXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBpbWFwLmNoZWNrTWFpbEZvclVwZGF0ZSgpO1xuICAgIH1cbiAgfSk7XG5cbiAgYXBwLmdldCgnL190aW1lJywgKHJlcSwgcmVzKSA9PiB7XG4gICAgcmVzLnNlbmQoZ2VuZXJhdGVUb2tlbigpKTtcbiAgfSk7XG5cbiAgZnVuY3Rpb24gb25aaXBGaWxlV3JpdHRlbigpIHtcbiAgICBpZiAoaXNQbTIgJiYgIWlzTWFpblByb2Nlc3MpIHtcbiAgICAgIHByb2Nlc3Muc2VuZCEoe1xuICAgICAgICB0eXBlIDogJ3Byb2Nlc3M6bXNnJyxcbiAgICAgICAgZGF0YToge2V4dHJhY3RaaXA6IHRydWUsIHBpZDogcHJvY2Vzcy5waWR9XG4gICAgICB9KTtcbiAgICB9IGVsc2VcbiAgICAgIHJldHJ5KDIsIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBpbml0UG0yKCkge1xuICAgIGNvbnN0IHBtMjogdHlwZW9mIF9wbTIgPSByZXF1aXJlKCdAZ3Jvd3RoL3BtMicpO1xuICAgIGNvbnN0IHBtMmNvbm5lY3QgPSB1dGlsLnByb21pc2lmeShwbTIuY29ubmVjdC5iaW5kKHBtMikpO1xuICAgIGNvbnN0IHBtMmxhdW5jaEJ1cyA9IHV0aWwucHJvbWlzaWZ5PFBtMkJ1cz4ocG0yLmxhdW5jaEJ1cy5iaW5kKHBtMikpO1xuXG4gICAgYXdhaXQgcG0yY29ubmVjdCgpO1xuICAgIGNvbnN0IGJ1cyA9IGF3YWl0IHBtMmxhdW5jaEJ1cygpO1xuICAgIGJ1cy5vbigncHJvY2Vzczptc2cnLCBwYWNrZXQgPT4ge1xuICAgICAgaWYgKCFwYWNrZXQuZGF0YSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCB1cGRhdGluZ1Byb3AgPSBwYWNrZXQuZGF0YVsnY2Qtc2VydmVyOmNoZWNrc3VtIHVwZGF0aW5nJ107XG4gICAgICBpZiAodXBkYXRpbmdQcm9wICYmIHBhY2tldC5kYXRhLnBpZCAhPT0gcHJvY2Vzcy5waWQpIHtcbiAgICAgICAgY29uc3QgcmVjaWV2ZWRDaGVja3N1bSA9IHVwZGF0aW5nUHJvcDtcbiAgICAgICAgaWYgKHJlY2lldmVkQ2hlY2tzdW0pXG4gICAgICAgICAgY2hlY2tzdW0udmVyc2lvbnMgPSByZWNpZXZlZENoZWNrc3VtLnZlcnNpb25zO1xuICAgICAgICAgIGxvZy5pbmZvKCdPdGhlciBwcm9jZXNzIHJlY2lldmVkIHVwZGF0aW5nIGNoZWNrc3VtICVzIGZyb20gaWQ6ICVzJyxcbiAgICAgICAgICAgIHV0aWwuaW5zcGVjdChjaGVja3N1bSksIF8uZ2V0KHBhY2tldCwgJ3Byb2Nlc3MucG1faWQnKSk7XG4gICAgICB9XG4gICAgICBjb25zdCBjaGVja01haWxQcm9wID0gcGFja2V0LmRhdGFbJ2NkLXNlcnZlcjpjaGVjayBtYWlsJ107XG4gICAgICBpZiAoY2hlY2tNYWlsUHJvcCAmJiBwYWNrZXQuZGF0YS5waWQgIT09IHByb2Nlc3MucGlkKSB7XG4gICAgICAgIGNoZWNrZWRTZXEgPSBjaGVja01haWxQcm9wO1xuICAgICAgICBsb2cuaW5mbygnT3RoZXIgcHJvY2VzcyB0cmlnZ2VycyBcImNoZWNrIG1haWxcIiBmcm9tIGlkOicsIF8uZ2V0KHBhY2tldCwgJ3Byb2Nlc3MucG1faWQnKSk7XG4gICAgICAgIGltYXAuY2hlY2tNYWlsRm9yVXBkYXRlKCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYWNrZXQuZGF0YS5leHRyYWN0WmlwICYmIHBhY2tldC5kYXRhLnBpZCAhPT0gcHJvY2Vzcy5waWQpIHtcbiAgICAgICAgbG9nLmluZm8oJ090aGVyIHByb2Nlc3MgdHJpZ2dlcnMgXCJleHRyYWN0WmlwXCIgZnJvbSBpZDonLCBfLmdldChwYWNrZXQsICdwcm9jZXNzLnBtX2lkJykpO1xuICAgICAgICByZXRyeSgyLCBmb3JrRXh0cmFjdEV4c3RpbmdaaXApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVRva2VuKCkge1xuICBjb25zdCBkYXRlID0gbmV3IERhdGUoKTtcbiAgY29uc3QgdG9rZW4gPSBkYXRlLmdldERhdGUoKSArICcnICsgZGF0ZS5nZXRIb3VycygpO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2codG9rZW4pO1xuICByZXR1cm4gdG9rZW47XG59XG4iXX0=
