"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const os_1 = tslib_1.__importDefault(require("os"));
const util_1 = tslib_1.__importDefault(require("util"));
const fetch_remote_1 = require("../fetch-remote");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const mem_stats_1 = tslib_1.__importDefault(require("dr-comp-package/wfh/dist/utils/mem-stats"));
const crypto_1 = tslib_1.__importDefault(require("crypto"));
const __api_1 = tslib_1.__importDefault(require("__api"));
const log = require('log4js').getLogger('@dr/assets-processer.cd-server');
const requireToken = __api_1.default.config.get([__api_1.default.packageName, 'requireToken'], false);
const mailSetting = __api_1.default.config.get(__api_1.default.packageName).fetchMailServer;
function activate(app, imap) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let fwriter;
        let writingFile;
        let filesHash = readChecksumFile();
        const { isPm2, isMainProcess } = fetch_remote_1.getPm2Info();
        if (isPm2) {
            initPm2();
        }
        imap.appendMail(`server ${os_1.default.hostname} ${process.pid} activates`, new Date() + '');
        app.use('/_stat', (req, res, next) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (requireToken && req.query.whisper !== generateToken()) {
                res.header('Connection', 'close');
                res.status(401).send(`REJECT from ${os_1.default.hostname()} pid: ${process.pid}: Not allowed to push artifact in this environment.`);
                req.socket.end();
                res.connection.end();
                return;
            }
            if (req.method === 'GET' && /^\/_stat([#?/]|$)/.test(req.originalUrl)) {
                res.contentType('json');
                res.send(JSON.stringify({
                    isMainProcess,
                    filesHash: Array.from(filesHash.values()),
                    is_pm2_slave: isPm2,
                    hostname: os_1.default.hostname(),
                    pid: process.pid,
                    mem: mem_stats_1.default(),
                    cpus: os_1.default.cpus(),
                    arch: os_1.default.arch(),
                    platform: os_1.default.platform(),
                    loadavg: os_1.default.loadavg()
                }, null, '  '));
            }
            else {
                next();
            }
        }));
        app.use('/_install/:file/:hash', (req, res, next) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            const existing = filesHash.get(req.params.file);
            log.info(`${req.method} [${os_1.default.hostname}]file: ${req.params.file}, hash: ${req.params.hash},\nexisting file: ${existing ? existing : '<NO>'}` +
                `\n${util_1.default.inspect(req.headers)}`);
            if (req.method === 'PUT') {
                log.info('recieving data');
                if (isPm2 && !isMainProcess) {
                    yield new Promise(resolve => setTimeout(resolve, 800));
                }
                if (existing && existing.sha256 === req.params.hash) {
                    // I want to cancel recieving request body asap
                    // https://stackoverflow.com/questions/18367824/how-to-cancel-http-upload-from-data-events
                    res.header('Connection', 'close');
                    res.status(409).send(`[REJECT] ${os_1.default.hostname()} pid: ${process.pid}:` +
                        `- found existing: ${JSON.stringify(existing, null, '  ')}\n` +
                        `- hashs:\n  ${JSON.stringify(filesHash, null, '  ')}`);
                    req.socket.end();
                    res.connection.end();
                    return;
                }
                const now = new Date();
                const newChecksumItem = {
                    file: req.params.file,
                    sha256: req.params.hash,
                    created: now.toLocaleString(),
                    createdTime: now.getTime()
                };
                // checksum.versions![req.params.app] = {version: parseInt(req.params.version, 10)};
                let countBytes = 0;
                let hash;
                let hashDone;
                req.on('data', (data) => {
                    countBytes += data.byteLength;
                    if (hash == null) {
                        hash = crypto_1.default.createHash('sha256');
                        hashDone = new Promise(resolve => {
                            hash.on('readable', () => {
                                const data = hash.read();
                                if (data) {
                                    resolve(data.toString('hex'));
                                }
                            });
                        });
                    }
                    hash.write(data);
                    if (fwriter == null) {
                        let fileBaseName = path_1.default.basename(req.params.file);
                        const dot = fileBaseName.lastIndexOf('.');
                        if (dot >= 0)
                            fileBaseName = fileBaseName.slice(0, dot);
                        writingFile = path_1.default.resolve(fetch_remote_1.zipDownloadDir, `${fileBaseName.slice(0, fileBaseName.lastIndexOf('.'))}.${process.pid}.zip`);
                        fwriter = fs_extra_1.default.createWriteStream(writingFile);
                    }
                    fwriter.write(data);
                });
                req.on('end', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
                    log.info(`${writingFile} is written with ${countBytes} bytes`);
                    let sha;
                    if (hash) {
                        hash.end();
                        sha = yield hashDone;
                    }
                    if (sha !== newChecksumItem.sha256) {
                        res.send(`[WARN] ${os_1.default.hostname()} pid: ${process.pid}: ${JSON.stringify(newChecksumItem, null, '  ')}\n` +
                            `Recieved file is corrupted with hash ${sha},\nwhile expecting file hash is ${newChecksumItem.sha256}`);
                        fwriter.end(onZipFileWritten);
                        fwriter = undefined;
                        return;
                    }
                    fwriter.end(onZipFileWritten);
                    fwriter = undefined;
                    res.send(`[ACCEPT] ${os_1.default.hostname()} pid: ${process.pid}: ${JSON.stringify(newChecksumItem, null, '  ')}`);
                    filesHash.set(newChecksumItem.file, newChecksumItem);
                    writeChecksumFile(filesHash);
                    if (isPm2) {
                        const msg = {
                            type: 'process:msg',
                            data: {
                                'cd-server:checksum updating': newChecksumItem,
                                pid: process.pid
                            }
                        };
                        process.send(msg);
                    }
                }));
            }
            else {
                next();
            }
        }));
        let checkedSeq = '';
        app.use('/_checkmail/:seq', (req, res, next) => {
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
        app.use('/_time', (req, res) => {
            res.send(generateToken());
        });
        function onZipFileWritten() {
            if (isPm2 && !isMainProcess) {
                const msg = {
                    type: 'process:msg',
                    data: { extractZip: true, pid: process.pid }
                };
                process.send(msg);
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
                    const updatedChecksumItem = packet.data['cd-server:checksum updating'];
                    if (updatedChecksumItem && packet.data.pid !== process.pid) {
                        const recievedChecksum = updatedChecksumItem;
                        filesHash.set(recievedChecksum.file, recievedChecksum);
                        log.info('Other process recieved updating checksum %s from id: %s', util_1.default.inspect(recievedChecksum), lodash_1.default.get(packet, 'process.pm_id'));
                    }
                    const checkMailProp = packet.data['cd-server:check mail'];
                    if (checkMailProp && packet.data.pid !== process.pid) {
                        checkedSeq = checkMailProp;
                        log.info('Other process triggers "check mail" from id:', lodash_1.default.get(packet, 'process.pm_id'));
                        // imap.checkMailForUpdate();
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
function readChecksumFile() {
    const env = mailSetting ? mailSetting.env : 'local';
    const checksumFile = path_1.default.resolve('checksum.' + env + '.json');
    let checksum;
    if (fs_extra_1.default.existsSync(checksumFile)) {
        checksum = JSON.parse(fs_extra_1.default.readFileSync(checksumFile, 'utf8'));
    }
    else {
        checksum = [];
    }
    return checksum.reduce((map, val) => map.set(val.file, val), new Map());
}
function writeChecksumFile(checksum) {
    const env = mailSetting ? mailSetting.env : 'local';
    fs_extra_1.default.writeFile(path_1.default.resolve('checksum.' + env + '.json'), JSON.stringify(Array.from(checksum.values()), null, '  '), (err) => {
        if (err) {
            log.error(err);
        }
    });
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2NvbnRlbnQtZGVwbG95ZXIvY2Qtc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG9EQUFvQjtBQUVwQix3REFBd0I7QUFFeEIsa0RBQXlGO0FBQ3pGLHdEQUF3QjtBQUV4QixnRUFBMEI7QUFDMUIsNERBQXVCO0FBQ3ZCLGlHQUErRDtBQUMvRCw0REFBb0M7QUFDcEMsMERBQXdCO0FBQ3hCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQWtCMUUsTUFBTSxZQUFZLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxlQUFHLENBQUMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzlFLE1BQU0sV0FBVyxHQUFJLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQTBCLENBQUMsZUFBZSxDQUFDO0FBRzlGLFNBQXNCLFFBQVEsQ0FBQyxHQUFnQixFQUFFLElBQWlCOztRQUNoRSxJQUFJLE9BQW1DLENBQUM7UUFDeEMsSUFBSSxXQUErQixDQUFDO1FBRXBDLElBQUksU0FBUyxHQUFHLGdCQUFnQixFQUFFLENBQUM7UUFFbkMsTUFBTSxFQUFDLEtBQUssRUFBRSxhQUFhLEVBQUMsR0FBRyx5QkFBVSxFQUFFLENBQUM7UUFDNUMsSUFBSSxLQUFLLEVBQUU7WUFDVCxPQUFPLEVBQUUsQ0FBQztTQUNYO1FBRUQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLFlBQUUsQ0FBQyxRQUFRLElBQUksT0FBTyxDQUFDLEdBQUcsWUFBWSxFQUFFLElBQUksSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFFbkYsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBTyxHQUFHLEVBQUUsR0FBRyxF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RCxNQUFNLFlBQVksR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsR0FBRyxHQUFHLEdBQUcsT0FBTyxDQUFDLENBQUM7SUFDL0QsSUFBSSxRQUFrQixDQUFDO0lBQ3ZCLElBQUksa0JBQUUsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUU7UUFDL0IsUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQUUsQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7S0FDOUQ7U0FBTTtRQUNMLFFBQVEsR0FBRyxFQUFFLENBQUM7S0FDZjtJQUNELE9BQU8sUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsRUFBd0IsQ0FBQyxDQUFDO0FBQ2hHLENBQUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLFFBQTZDO0lBQ3RFLE1BQU0sR0FBRyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQ3BELGtCQUFFLENBQUMsU0FBUyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxHQUFHLEdBQUcsR0FBRyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7UUFDekgsSUFBSSxHQUFHLEVBQUU7WUFDUCxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ2hCO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvY29udGVudC1kZXBsb3llci9jZC1zZXJ2ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0FwcGxpY2F0aW9ufSBmcm9tICdleHByZXNzJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQge0NoZWNrc3VtLCBXaXRoTWFpbFNlcnZlckNvbmZpZ30gZnJvbSAnLi4vZmV0Y2gtdHlwZXMnO1xuaW1wb3J0IHV0aWwgZnJvbSAndXRpbCc7XG5pbXBvcnQgX3BtMiBmcm9tICdAZ3Jvd3RoL3BtMic7XG5pbXBvcnQge2dldFBtMkluZm8sIHppcERvd25sb2FkRGlyLCBmb3JrRXh0cmFjdEV4c3RpbmdaaXAsIHJldHJ5fSBmcm9tICcuLi9mZXRjaC1yZW1vdGUnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge0ltYXBNYW5hZ2VyfSBmcm9tICcuLi9mZXRjaC1yZW1vdGUtaW1hcCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBtZW1zdGF0IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC91dGlscy9tZW0tc3RhdHMnO1xuaW1wb3J0IGNyeXB0bywge0hhc2h9IGZyb20gJ2NyeXB0byc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignQGRyL2Fzc2V0cy1wcm9jZXNzZXIuY2Qtc2VydmVyJyk7XG5cbmludGVyZmFjZSBQbTJQYWNrZXQge1xuICB0eXBlOiAncHJvY2Vzczptc2cnO1xuICBkYXRhOiB7XG4gICAgcGlkOiBudW1iZXI7XG4gICAgJ2NkLXNlcnZlcjpjaGVja3N1bSB1cGRhdGluZyc/OiBDaGVja3N1bUl0ZW07XG4gICAgJ2NkLXNlcnZlcjpjaGVjayBtYWlsJz86IHN0cmluZztcbiAgICBleHRyYWN0WmlwPzogYm9vbGVhbjtcbiAgfTtcbn1cblxuaW50ZXJmYWNlIFBtMkJ1cyB7XG4gIG9uKGV2ZW50OiAncHJvY2Vzczptc2cnLCBjYjogKHBhY2tldDogUG0yUGFja2V0KSA9PiB2b2lkKTogdm9pZDtcbn1cblxudHlwZSBDaGVja3N1bUl0ZW0gPSBDaGVja3N1bSBleHRlbmRzIEFycmF5PGluZmVyIEk+ID8gSSA6IHVua25vd247XG5cbmNvbnN0IHJlcXVpcmVUb2tlbiA9IGFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICdyZXF1aXJlVG9rZW4nXSwgZmFsc2UpO1xuY29uc3QgbWFpbFNldHRpbmcgPSAoYXBpLmNvbmZpZy5nZXQoYXBpLnBhY2thZ2VOYW1lKSBhcyBXaXRoTWFpbFNlcnZlckNvbmZpZykuZmV0Y2hNYWlsU2VydmVyO1xuXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhY3RpdmF0ZShhcHA6IEFwcGxpY2F0aW9uLCBpbWFwOiBJbWFwTWFuYWdlcikge1xuICBsZXQgZndyaXRlcjogZnMuV3JpdGVTdHJlYW0gfCB1bmRlZmluZWQ7XG4gIGxldCB3cml0aW5nRmlsZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIGxldCBmaWxlc0hhc2ggPSByZWFkQ2hlY2tzdW1GaWxlKCk7XG5cbiAgY29uc3Qge2lzUG0yLCBpc01haW5Qcm9jZXNzfSA9IGdldFBtMkluZm8oKTtcbiAgaWYgKGlzUG0yKSB7XG4gICAgaW5pdFBtMigpO1xuICB9XG5cbiAgaW1hcC5hcHBlbmRNYWlsKGBzZXJ2ZXIgJHtvcy5ob3N0bmFtZX0gJHtwcm9jZXNzLnBpZH0gYWN0aXZhdGVzYCwgbmV3IERhdGUoKSArICcnKTtcblxuICBhcHAudXNlKCcvX3N0YXQnLCBhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICBpZiAocmVxdWlyZVRva2VuICYmIHJlcS5xdWVyeS53aGlzcGVyICE9PSBnZW5lcmF0ZVRva2VuKCkpIHtcbiAgICAgIHJlcy5oZWFkZXIoJ0Nvbm5lY3Rpb24nLCAnY2xvc2UnKTtcbiAgICAgIHJlcy5zdGF0dXMoNDAxKS5zZW5kKGBSRUpFQ1QgZnJvbSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06IE5vdCBhbGxvd2VkIHRvIHB1c2ggYXJ0aWZhY3QgaW4gdGhpcyBlbnZpcm9ubWVudC5gKTtcbiAgICAgIHJlcS5zb2NrZXQuZW5kKCk7XG4gICAgICByZXMuY29ubmVjdGlvbi5lbmQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cblxuICAgIGlmIChyZXEubWV0aG9kID09PSAnR0VUJyAmJiAvXlxcL19zdGF0KFsjPy9dfCQpLy50ZXN0KHJlcS5vcmlnaW5hbFVybCkpIHtcbiAgICAgIHJlcy5jb250ZW50VHlwZSgnanNvbicpO1xuICAgICAgcmVzLnNlbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBpc01haW5Qcm9jZXNzLFxuICAgICAgICBmaWxlc0hhc2g6IEFycmF5LmZyb20oZmlsZXNIYXNoLnZhbHVlcygpKSxcbiAgICAgICAgaXNfcG0yX3NsYXZlOiBpc1BtMixcbiAgICAgICAgaG9zdG5hbWU6IG9zLmhvc3RuYW1lKCksXG4gICAgICAgIHBpZDogcHJvY2Vzcy5waWQsXG4gICAgICAgIG1lbTogbWVtc3RhdCgpLFxuICAgICAgICBjcHVzOiBvcy5jcHVzKCksXG4gICAgICAgIGFyY2g6IG9zLmFyY2goKSxcbiAgICAgICAgcGxhdGZvcm06IG9zLnBsYXRmb3JtKCksXG4gICAgICAgIGxvYWRhdmc6IG9zLmxvYWRhdmcoKVxuICAgICAgfSwgbnVsbCwgJyAgJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuZXh0KCk7XG4gICAgfVxuICB9KTtcblxuICBhcHAudXNlPHtmaWxlOiBzdHJpbmcsIGhhc2g6IHN0cmluZ30+KCcvX2luc3RhbGwvOmZpbGUvOmhhc2gnLCBhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICBjb25zdCBleGlzdGluZyA9IGZpbGVzSGFzaC5nZXQocmVxLnBhcmFtcy5maWxlKTtcbiAgICBsb2cuaW5mbyhgJHtyZXEubWV0aG9kfSBbJHtvcy5ob3N0bmFtZX1dZmlsZTogJHtyZXEucGFyYW1zLmZpbGV9LCBoYXNoOiAke3JlcS5wYXJhbXMuaGFzaH0sXFxuZXhpc3RpbmcgZmlsZTogJHtleGlzdGluZyA/IGV4aXN0aW5nIDogJzxOTz4nfWAgK1xuICAgICAgYFxcbiR7dXRpbC5pbnNwZWN0KHJlcS5oZWFkZXJzKX1gKTtcblxuICAgIGlmIChyZXEubWV0aG9kID09PSAnUFVUJykge1xuICAgICAgbG9nLmluZm8oJ3JlY2lldmluZyBkYXRhJyk7XG4gICAgICBpZiAoaXNQbTIgJiYgIWlzTWFpblByb2Nlc3MpIHtcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDgwMCkpO1xuICAgICAgfVxuICAgICAgaWYgKGV4aXN0aW5nICYmIGV4aXN0aW5nLnNoYTI1NiA9PT0gcmVxLnBhcmFtcy5oYXNoKSB7XG4gICAgICAgIC8vIEkgd2FudCB0byBjYW5jZWwgcmVjaWV2aW5nIHJlcXVlc3QgYm9keSBhc2FwXG4gICAgICAgIC8vIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE4MzY3ODI0L2hvdy10by1jYW5jZWwtaHR0cC11cGxvYWQtZnJvbS1kYXRhLWV2ZW50c1xuICAgICAgICByZXMuaGVhZGVyKCdDb25uZWN0aW9uJywgJ2Nsb3NlJyk7XG4gICAgICAgIHJlcy5zdGF0dXMoNDA5KS5zZW5kKGBbUkVKRUNUXSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06YCArXG4gICAgICAgIGAtIGZvdW5kIGV4aXN0aW5nOiAke0pTT04uc3RyaW5naWZ5KGV4aXN0aW5nLCBudWxsLCAnICAnKX1cXG5gICtcbiAgICAgICAgYC0gaGFzaHM6XFxuICAke0pTT04uc3RyaW5naWZ5KGZpbGVzSGFzaCwgbnVsbCwgJyAgJyl9YCk7XG4gICAgICAgIHJlcS5zb2NrZXQuZW5kKCk7XG4gICAgICAgIHJlcy5jb25uZWN0aW9uLmVuZCgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgICBjb25zdCBuZXdDaGVja3N1bUl0ZW06IENoZWNrc3VtSXRlbSA9IHtcbiAgICAgICAgZmlsZTogcmVxLnBhcmFtcy5maWxlLFxuICAgICAgICBzaGEyNTY6IHJlcS5wYXJhbXMuaGFzaCxcbiAgICAgICAgY3JlYXRlZDogbm93LnRvTG9jYWxlU3RyaW5nKCksXG4gICAgICAgIGNyZWF0ZWRUaW1lOiBub3cuZ2V0VGltZSgpXG4gICAgICB9O1xuXG4gICAgICAvLyBjaGVja3N1bS52ZXJzaW9ucyFbcmVxLnBhcmFtcy5hcHBdID0ge3ZlcnNpb246IHBhcnNlSW50KHJlcS5wYXJhbXMudmVyc2lvbiwgMTApfTtcblxuICAgICAgbGV0IGNvdW50Qnl0ZXMgPSAwO1xuXG4gICAgICBsZXQgaGFzaDogSGFzaDtcbiAgICAgIGxldCBoYXNoRG9uZTogUHJvbWlzZTxzdHJpbmc+O1xuXG4gICAgICByZXEub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PiB7XG4gICAgICAgIGNvdW50Qnl0ZXMgKz0gZGF0YS5ieXRlTGVuZ3RoO1xuICAgICAgICBpZiAoaGFzaCA9PSBudWxsKSB7XG4gICAgICAgICAgaGFzaCA9IGNyeXB0by5jcmVhdGVIYXNoKCdzaGEyNTYnKTtcbiAgICAgICAgICBoYXNoRG9uZSA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgICAgaGFzaC5vbigncmVhZGFibGUnLCAoKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBoYXNoLnJlYWQoKTtcbiAgICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEudG9TdHJpbmcoJ2hleCcpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaGFzaC53cml0ZShkYXRhKTtcblxuICAgICAgICBpZiAoZndyaXRlciA9PSBudWxsKSB7XG4gICAgICAgICAgbGV0IGZpbGVCYXNlTmFtZSA9IFBhdGguYmFzZW5hbWUocmVxLnBhcmFtcy5maWxlKTtcbiAgICAgICAgICBjb25zdCBkb3QgPSBmaWxlQmFzZU5hbWUubGFzdEluZGV4T2YoJy4nKTtcbiAgICAgICAgICBpZiAoZG90ID49MCApXG4gICAgICAgICAgICBmaWxlQmFzZU5hbWUgPSBmaWxlQmFzZU5hbWUuc2xpY2UoMCwgZG90KTtcbiAgICAgICAgICB3cml0aW5nRmlsZSA9IFBhdGgucmVzb2x2ZSh6aXBEb3dubG9hZERpciwgYCR7ZmlsZUJhc2VOYW1lLnNsaWNlKDAsIGZpbGVCYXNlTmFtZS5sYXN0SW5kZXhPZignLicpKX0uJHtwcm9jZXNzLnBpZH0uemlwYCk7XG4gICAgICAgICAgZndyaXRlciA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKHdyaXRpbmdGaWxlKTtcbiAgICAgICAgfVxuICAgICAgICBmd3JpdGVyLndyaXRlKGRhdGEpO1xuICAgICAgfSk7XG4gICAgICByZXEub24oJ2VuZCcsIGFzeW5jICgpID0+IHtcbiAgICAgICAgbG9nLmluZm8oYCR7d3JpdGluZ0ZpbGV9IGlzIHdyaXR0ZW4gd2l0aCAke2NvdW50Qnl0ZXN9IGJ5dGVzYCk7XG4gICAgICAgIGxldCBzaGE6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKGhhc2gpIHtcbiAgICAgICAgICBoYXNoLmVuZCgpO1xuICAgICAgICAgIHNoYSA9IGF3YWl0IGhhc2hEb25lO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzaGEgIT09IG5ld0NoZWNrc3VtSXRlbS5zaGEyNTYpIHtcbiAgICAgICAgICByZXMuc2VuZChgW1dBUk5dICR7b3MuaG9zdG5hbWUoKX0gcGlkOiAke3Byb2Nlc3MucGlkfTogJHtKU09OLnN0cmluZ2lmeShuZXdDaGVja3N1bUl0ZW0sIG51bGwsICcgICcpfVxcbmAgK1xuICAgICAgICAgICAgYFJlY2lldmVkIGZpbGUgaXMgY29ycnVwdGVkIHdpdGggaGFzaCAke3NoYX0sXFxud2hpbGUgZXhwZWN0aW5nIGZpbGUgaGFzaCBpcyAke25ld0NoZWNrc3VtSXRlbS5zaGEyNTZ9YCk7XG4gICAgICAgICAgZndyaXRlciEuZW5kKG9uWmlwRmlsZVdyaXR0ZW4pO1xuICAgICAgICAgIGZ3cml0ZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgZndyaXRlciEuZW5kKG9uWmlwRmlsZVdyaXR0ZW4pO1xuICAgICAgICBmd3JpdGVyID0gdW5kZWZpbmVkO1xuICAgICAgICByZXMuc2VuZChgW0FDQ0VQVF0gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiAke0pTT04uc3RyaW5naWZ5KG5ld0NoZWNrc3VtSXRlbSwgbnVsbCwgJyAgJyl9YCk7XG5cbiAgICAgICAgZmlsZXNIYXNoLnNldChuZXdDaGVja3N1bUl0ZW0uZmlsZSwgbmV3Q2hlY2tzdW1JdGVtKTtcbiAgICAgICAgd3JpdGVDaGVja3N1bUZpbGUoZmlsZXNIYXNoKTtcbiAgICAgICAgaWYgKGlzUG0yKSB7XG4gICAgICAgICAgY29uc3QgbXNnOiBQbTJQYWNrZXQgPSB7XG4gICAgICAgICAgICB0eXBlIDogJ3Byb2Nlc3M6bXNnJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgJ2NkLXNlcnZlcjpjaGVja3N1bSB1cGRhdGluZyc6IG5ld0NoZWNrc3VtSXRlbSxcbiAgICAgICAgICAgICAgcGlkOiBwcm9jZXNzLnBpZFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgICAgcHJvY2Vzcy5zZW5kIShtc2cpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmV4dCgpO1xuICAgIH1cbiAgfSk7XG5cbiAgbGV0IGNoZWNrZWRTZXEgPSAnJztcblxuICBhcHAudXNlKCcvX2NoZWNrbWFpbC86c2VxJywgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgbG9nLmluZm8oJ2ZvcmNlIGNoZWNrIG1haWwgZm9yOicsIHJlcS5wYXJhbXMuc2VxKTtcbiAgICBpZiAoY2hlY2tlZFNlcSA9PT0gcmVxLnBhcmFtcy5zZXEpXG4gICAgICByZXR1cm47XG4gICAgaWYgKGlzUG0yICYmICFpc01haW5Qcm9jZXNzKSB7XG4gICAgICBwcm9jZXNzLnNlbmQhKHtcbiAgICAgICAgdHlwZSA6ICdwcm9jZXNzOm1zZycsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAnY2Qtc2VydmVyOmNoZWNrIG1haWwnOiByZXEucGFyYW1zLnNlcSxcbiAgICAgICAgICBwaWQ6IHByb2Nlc3MucGlkXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBpbWFwLmNoZWNrTWFpbEZvclVwZGF0ZSgpO1xuICAgIH1cbiAgfSk7XG5cbiAgYXBwLnVzZSgnL190aW1lJywgKHJlcSwgcmVzKSA9PiB7XG4gICAgcmVzLnNlbmQoZ2VuZXJhdGVUb2tlbigpKTtcbiAgfSk7XG5cbiAgZnVuY3Rpb24gb25aaXBGaWxlV3JpdHRlbigpIHtcbiAgICBpZiAoaXNQbTIgJiYgIWlzTWFpblByb2Nlc3MpIHtcbiAgICAgIGNvbnN0IG1zZzogUG0yUGFja2V0ID0ge1xuICAgICAgICB0eXBlIDogJ3Byb2Nlc3M6bXNnJyxcbiAgICAgICAgZGF0YToge2V4dHJhY3RaaXA6IHRydWUsIHBpZDogcHJvY2Vzcy5waWR9XG4gICAgICB9O1xuICAgICAgcHJvY2Vzcy5zZW5kIShtc2cpO1xuICAgIH0gZWxzZVxuICAgICAgcmV0cnkoMiwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwKTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGluaXRQbTIoKSB7XG4gICAgY29uc3QgcG0yOiB0eXBlb2YgX3BtMiA9IHJlcXVpcmUoJ0Bncm93dGgvcG0yJyk7XG4gICAgY29uc3QgcG0yY29ubmVjdCA9IHV0aWwucHJvbWlzaWZ5KHBtMi5jb25uZWN0LmJpbmQocG0yKSk7XG4gICAgY29uc3QgcG0ybGF1bmNoQnVzID0gdXRpbC5wcm9taXNpZnk8UG0yQnVzPihwbTIubGF1bmNoQnVzLmJpbmQocG0yKSk7XG5cbiAgICBhd2FpdCBwbTJjb25uZWN0KCk7XG4gICAgY29uc3QgYnVzID0gYXdhaXQgcG0ybGF1bmNoQnVzKCk7XG4gICAgYnVzLm9uKCdwcm9jZXNzOm1zZycsIHBhY2tldCA9PiB7XG4gICAgICBpZiAoIXBhY2tldC5kYXRhKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHVwZGF0ZWRDaGVja3N1bUl0ZW0gPSBwYWNrZXQuZGF0YVsnY2Qtc2VydmVyOmNoZWNrc3VtIHVwZGF0aW5nJ107XG4gICAgICBpZiAodXBkYXRlZENoZWNrc3VtSXRlbSAmJiBwYWNrZXQuZGF0YS5waWQgIT09IHByb2Nlc3MucGlkKSB7XG4gICAgICAgIGNvbnN0IHJlY2lldmVkQ2hlY2tzdW0gPSB1cGRhdGVkQ2hlY2tzdW1JdGVtO1xuICAgICAgICBmaWxlc0hhc2guc2V0KHJlY2lldmVkQ2hlY2tzdW0uZmlsZSwgcmVjaWV2ZWRDaGVja3N1bSk7XG4gICAgICAgIGxvZy5pbmZvKCdPdGhlciBwcm9jZXNzIHJlY2lldmVkIHVwZGF0aW5nIGNoZWNrc3VtICVzIGZyb20gaWQ6ICVzJyxcbiAgICAgICAgICB1dGlsLmluc3BlY3QocmVjaWV2ZWRDaGVja3N1bSksIF8uZ2V0KHBhY2tldCwgJ3Byb2Nlc3MucG1faWQnKSk7XG4gICAgICB9XG4gICAgICBjb25zdCBjaGVja01haWxQcm9wID0gcGFja2V0LmRhdGFbJ2NkLXNlcnZlcjpjaGVjayBtYWlsJ107XG4gICAgICBpZiAoY2hlY2tNYWlsUHJvcCAmJiBwYWNrZXQuZGF0YS5waWQgIT09IHByb2Nlc3MucGlkKSB7XG4gICAgICAgIGNoZWNrZWRTZXEgPSBjaGVja01haWxQcm9wO1xuICAgICAgICBsb2cuaW5mbygnT3RoZXIgcHJvY2VzcyB0cmlnZ2VycyBcImNoZWNrIG1haWxcIiBmcm9tIGlkOicsIF8uZ2V0KHBhY2tldCwgJ3Byb2Nlc3MucG1faWQnKSk7XG4gICAgICAgIC8vIGltYXAuY2hlY2tNYWlsRm9yVXBkYXRlKCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYWNrZXQuZGF0YS5leHRyYWN0WmlwICYmIHBhY2tldC5kYXRhLnBpZCAhPT0gcHJvY2Vzcy5waWQpIHtcbiAgICAgICAgbG9nLmluZm8oJ090aGVyIHByb2Nlc3MgdHJpZ2dlcnMgXCJleHRyYWN0WmlwXCIgZnJvbSBpZDonLCBfLmdldChwYWNrZXQsICdwcm9jZXNzLnBtX2lkJykpO1xuICAgICAgICByZXRyeSgyLCBmb3JrRXh0cmFjdEV4c3RpbmdaaXApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVRva2VuKCkge1xuICBjb25zdCBkYXRlID0gbmV3IERhdGUoKTtcbiAgY29uc3QgdG9rZW4gPSBkYXRlLmdldERhdGUoKSArICcnICsgZGF0ZS5nZXRIb3VycygpO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2codG9rZW4pO1xuICByZXR1cm4gdG9rZW47XG59XG5cbmZ1bmN0aW9uIHJlYWRDaGVja3N1bUZpbGUoKTogTWFwPHN0cmluZywgQ2hlY2tzdW1JdGVtPiB7XG4gIGNvbnN0IGVudiA9IG1haWxTZXR0aW5nID8gbWFpbFNldHRpbmcuZW52IDogJ2xvY2FsJztcbiAgY29uc3QgY2hlY2tzdW1GaWxlID0gUGF0aC5yZXNvbHZlKCdjaGVja3N1bS4nICsgZW52ICsgJy5qc29uJyk7XG4gIGxldCBjaGVja3N1bTogQ2hlY2tzdW07XG4gIGlmIChmcy5leGlzdHNTeW5jKGNoZWNrc3VtRmlsZSkpIHtcbiAgICBjaGVja3N1bSA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGNoZWNrc3VtRmlsZSwgJ3V0ZjgnKSk7XG4gIH0gZWxzZSB7XG4gICAgY2hlY2tzdW0gPSBbXTtcbiAgfVxuICByZXR1cm4gY2hlY2tzdW0ucmVkdWNlKChtYXAsIHZhbCkgPT4gbWFwLnNldCh2YWwuZmlsZSwgdmFsKSwgbmV3IE1hcDxzdHJpbmcsIENoZWNrc3VtSXRlbT4oKSk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlQ2hlY2tzdW1GaWxlKGNoZWNrc3VtOiBSZXR1cm5UeXBlPHR5cGVvZiByZWFkQ2hlY2tzdW1GaWxlPikge1xuICBjb25zdCBlbnYgPSBtYWlsU2V0dGluZyA/IG1haWxTZXR0aW5nLmVudiA6ICdsb2NhbCc7XG4gIGZzLndyaXRlRmlsZShQYXRoLnJlc29sdmUoJ2NoZWNrc3VtLicgKyBlbnYgKyAnLmpzb24nKSwgSlNPTi5zdHJpbmdpZnkoQXJyYXkuZnJvbShjaGVja3N1bS52YWx1ZXMoKSksIG51bGwsICcgICcpLCAoZXJyKSA9PiB7XG4gICAgaWYgKGVycikge1xuICAgICAgbG9nLmVycm9yKGVycik7XG4gICAgfVxuICB9KTtcbn1cbiJdfQ==
