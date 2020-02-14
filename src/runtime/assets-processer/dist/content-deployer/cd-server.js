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
            if (req.method === 'GET' && req.originalUrl === '/_stat' || req.originalUrl === '/_stat/') {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2NvbnRlbnQtZGVwbG95ZXIvY2Qtc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG9EQUFvQjtBQUVwQix3REFBd0I7QUFFeEIsa0RBQXlGO0FBQ3pGLHdEQUF3QjtBQUV4QixnRUFBMEI7QUFDMUIsNERBQXVCO0FBQ3ZCLGlHQUErRDtBQUMvRCw0REFBb0M7QUFDcEMsMERBQXdCO0FBQ3hCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQWtCMUUsTUFBTSxZQUFZLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxlQUFHLENBQUMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzlFLE1BQU0sV0FBVyxHQUFJLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQTBCLENBQUMsZUFBZSxDQUFDO0FBRzlGLFNBQXNCLFFBQVEsQ0FBQyxHQUFnQixFQUFFLElBQWlCOztRQUNoRSxJQUFJLE9BQW1DLENBQUM7UUFDeEMsSUFBSSxXQUErQixDQUFDO1FBRXBDLElBQUksU0FBUyxHQUFHLGdCQUFnQixFQUFFLENBQUM7UUFFbkMsTUFBTSxFQUFDLEtBQUssRUFBRSxhQUFhLEVBQUMsR0FBRyx5QkFBVSxFQUFFLENBQUM7UUFDNUMsSUFBSSxLQUFLLEVBQUU7WUFDVCxPQUFPLEVBQUUsQ0FBQztTQUNYO1FBRUQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLFlBQUUsQ0FBQyxRQUFRLElBQUksT0FBTyxDQUFDLEdBQUcsWUFBWSxFQUFFLElBQUksSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFFbkYsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBTyxHQUFHLEVBQUUsR0FBRyxF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bnQtZGVwbG95ZXIvY2Qtc2VydmVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtBcHBsaWNhdGlvbn0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IHtDaGVja3N1bSwgV2l0aE1haWxTZXJ2ZXJDb25maWd9IGZyb20gJy4uL2ZldGNoLXR5cGVzJztcbmltcG9ydCB1dGlsIGZyb20gJ3V0aWwnO1xuaW1wb3J0IF9wbTIgZnJvbSAnQGdyb3d0aC9wbTInO1xuaW1wb3J0IHtnZXRQbTJJbmZvLCB6aXBEb3dubG9hZERpciwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwLCByZXRyeX0gZnJvbSAnLi4vZmV0Y2gtcmVtb3RlJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtJbWFwTWFuYWdlcn0gZnJvbSAnLi4vZmV0Y2gtcmVtb3RlLWltYXAnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgbWVtc3RhdCBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvdXRpbHMvbWVtLXN0YXRzJztcbmltcG9ydCBjcnlwdG8sIHtIYXNofSBmcm9tICdjcnlwdG8nO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ0Bkci9hc3NldHMtcHJvY2Vzc2VyLmNkLXNlcnZlcicpO1xuXG5pbnRlcmZhY2UgUG0yUGFja2V0IHtcbiAgdHlwZTogJ3Byb2Nlc3M6bXNnJztcbiAgZGF0YToge1xuICAgIHBpZDogbnVtYmVyO1xuICAgICdjZC1zZXJ2ZXI6Y2hlY2tzdW0gdXBkYXRpbmcnPzogQ2hlY2tzdW1JdGVtO1xuICAgICdjZC1zZXJ2ZXI6Y2hlY2sgbWFpbCc/OiBzdHJpbmc7XG4gICAgZXh0cmFjdFppcD86IGJvb2xlYW47XG4gIH07XG59XG5cbmludGVyZmFjZSBQbTJCdXMge1xuICBvbihldmVudDogJ3Byb2Nlc3M6bXNnJywgY2I6IChwYWNrZXQ6IFBtMlBhY2tldCkgPT4gdm9pZCk6IHZvaWQ7XG59XG5cbnR5cGUgQ2hlY2tzdW1JdGVtID0gQ2hlY2tzdW0gZXh0ZW5kcyBBcnJheTxpbmZlciBJPiA/IEkgOiB1bmtub3duO1xuXG5jb25zdCByZXF1aXJlVG9rZW4gPSBhcGkuY29uZmlnLmdldChbYXBpLnBhY2thZ2VOYW1lLCAncmVxdWlyZVRva2VuJ10sIGZhbHNlKTtcbmNvbnN0IG1haWxTZXR0aW5nID0gKGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSkgYXMgV2l0aE1haWxTZXJ2ZXJDb25maWcpLmZldGNoTWFpbFNlcnZlcjtcblxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWN0aXZhdGUoYXBwOiBBcHBsaWNhdGlvbiwgaW1hcDogSW1hcE1hbmFnZXIpIHtcbiAgbGV0IGZ3cml0ZXI6IGZzLldyaXRlU3RyZWFtIHwgdW5kZWZpbmVkO1xuICBsZXQgd3JpdGluZ0ZpbGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBsZXQgZmlsZXNIYXNoID0gcmVhZENoZWNrc3VtRmlsZSgpO1xuXG4gIGNvbnN0IHtpc1BtMiwgaXNNYWluUHJvY2Vzc30gPSBnZXRQbTJJbmZvKCk7XG4gIGlmIChpc1BtMikge1xuICAgIGluaXRQbTIoKTtcbiAgfVxuXG4gIGltYXAuYXBwZW5kTWFpbChgc2VydmVyICR7b3MuaG9zdG5hbWV9ICR7cHJvY2Vzcy5waWR9IGFjdGl2YXRlc2AsIG5ldyBEYXRlKCkgKyAnJyk7XG5cbiAgYXBwLnVzZSgnL19zdGF0JywgYXN5bmMgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgaWYgKHJlcXVpcmVUb2tlbiAmJiByZXEucXVlcnkud2hpc3BlciAhPT0gZ2VuZXJhdGVUb2tlbigpKSB7XG4gICAgICByZXMuaGVhZGVyKCdDb25uZWN0aW9uJywgJ2Nsb3NlJyk7XG4gICAgICByZXMuc3RhdHVzKDQwMSkuc2VuZChgUkVKRUNUIGZyb20gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiBOb3QgYWxsb3dlZCB0byBwdXNoIGFydGlmYWN0IGluIHRoaXMgZW52aXJvbm1lbnQuYCk7XG4gICAgICByZXEuc29ja2V0LmVuZCgpO1xuICAgICAgcmVzLmNvbm5lY3Rpb24uZW5kKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnICYmIHJlcS5vcmlnaW5hbFVybCA9PT0gJy9fc3RhdCcgfHwgcmVxLm9yaWdpbmFsVXJsID09PSAnL19zdGF0LycpIHtcbiAgICAgIHJlcy5jb250ZW50VHlwZSgnanNvbicpO1xuICAgICAgcmVzLnNlbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBpc01haW5Qcm9jZXNzLFxuICAgICAgICBmaWxlc0hhc2g6IEFycmF5LmZyb20oZmlsZXNIYXNoLnZhbHVlcygpKSxcbiAgICAgICAgaXNfcG0yX3NsYXZlOiBpc1BtMixcbiAgICAgICAgaG9zdG5hbWU6IG9zLmhvc3RuYW1lKCksXG4gICAgICAgIHBpZDogcHJvY2Vzcy5waWQsXG4gICAgICAgIG1lbTogbWVtc3RhdCgpLFxuICAgICAgICBjcHVzOiBvcy5jcHVzKCksXG4gICAgICAgIGFyY2g6IG9zLmFyY2goKSxcbiAgICAgICAgcGxhdGZvcm06IG9zLnBsYXRmb3JtKCksXG4gICAgICAgIGxvYWRhdmc6IG9zLmxvYWRhdmcoKVxuICAgICAgfSwgbnVsbCwgJyAgJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuZXh0KCk7XG4gICAgfVxuICB9KTtcblxuICBhcHAudXNlPHtmaWxlOiBzdHJpbmcsIGhhc2g6IHN0cmluZ30+KCcvX2luc3RhbGwvOmZpbGUvOmhhc2gnLCBhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICBjb25zdCBleGlzdGluZyA9IGZpbGVzSGFzaC5nZXQocmVxLnBhcmFtcy5maWxlKTtcbiAgICBsb2cuaW5mbyhgJHtyZXEubWV0aG9kfSBbJHtvcy5ob3N0bmFtZX1dZmlsZTogJHtyZXEucGFyYW1zLmZpbGV9LCBoYXNoOiAke3JlcS5wYXJhbXMuaGFzaH0sXFxuZXhpc3RpbmcgZmlsZTogJHtleGlzdGluZyA/IGV4aXN0aW5nIDogJzxOTz4nfWAgK1xuICAgICAgYFxcbiR7dXRpbC5pbnNwZWN0KHJlcS5oZWFkZXJzKX1gKTtcblxuICAgIGlmIChyZXEubWV0aG9kID09PSAnUFVUJykge1xuICAgICAgbG9nLmluZm8oJ3JlY2lldmluZyBkYXRhJyk7XG4gICAgICBpZiAoaXNQbTIgJiYgIWlzTWFpblByb2Nlc3MpIHtcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDgwMCkpO1xuICAgICAgfVxuICAgICAgaWYgKGV4aXN0aW5nICYmIGV4aXN0aW5nLnNoYTI1NiA9PT0gcmVxLnBhcmFtcy5oYXNoKSB7XG4gICAgICAgIC8vIEkgd2FudCB0byBjYW5jZWwgcmVjaWV2aW5nIHJlcXVlc3QgYm9keSBhc2FwXG4gICAgICAgIC8vIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE4MzY3ODI0L2hvdy10by1jYW5jZWwtaHR0cC11cGxvYWQtZnJvbS1kYXRhLWV2ZW50c1xuICAgICAgICByZXMuaGVhZGVyKCdDb25uZWN0aW9uJywgJ2Nsb3NlJyk7XG4gICAgICAgIHJlcy5zdGF0dXMoNDA5KS5zZW5kKGBbUkVKRUNUXSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06YCArXG4gICAgICAgIGAtIGZvdW5kIGV4aXN0aW5nOiAke0pTT04uc3RyaW5naWZ5KGV4aXN0aW5nLCBudWxsLCAnICAnKX1cXG5gICtcbiAgICAgICAgYC0gaGFzaHM6XFxuICAke0pTT04uc3RyaW5naWZ5KGZpbGVzSGFzaCwgbnVsbCwgJyAgJyl9YCk7XG4gICAgICAgIHJlcS5zb2NrZXQuZW5kKCk7XG4gICAgICAgIHJlcy5jb25uZWN0aW9uLmVuZCgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgICBjb25zdCBuZXdDaGVja3N1bUl0ZW06IENoZWNrc3VtSXRlbSA9IHtcbiAgICAgICAgZmlsZTogcmVxLnBhcmFtcy5maWxlLFxuICAgICAgICBzaGEyNTY6IHJlcS5wYXJhbXMuaGFzaCxcbiAgICAgICAgY3JlYXRlZDogbm93LnRvTG9jYWxlU3RyaW5nKCksXG4gICAgICAgIGNyZWF0ZWRUaW1lOiBub3cuZ2V0VGltZSgpXG4gICAgICB9O1xuXG4gICAgICAvLyBjaGVja3N1bS52ZXJzaW9ucyFbcmVxLnBhcmFtcy5hcHBdID0ge3ZlcnNpb246IHBhcnNlSW50KHJlcS5wYXJhbXMudmVyc2lvbiwgMTApfTtcblxuICAgICAgbGV0IGNvdW50Qnl0ZXMgPSAwO1xuXG4gICAgICBsZXQgaGFzaDogSGFzaDtcbiAgICAgIGxldCBoYXNoRG9uZTogUHJvbWlzZTxzdHJpbmc+O1xuXG4gICAgICByZXEub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PiB7XG4gICAgICAgIGNvdW50Qnl0ZXMgKz0gZGF0YS5ieXRlTGVuZ3RoO1xuICAgICAgICBpZiAoaGFzaCA9PSBudWxsKSB7XG4gICAgICAgICAgaGFzaCA9IGNyeXB0by5jcmVhdGVIYXNoKCdzaGEyNTYnKTtcbiAgICAgICAgICBoYXNoRG9uZSA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgICAgaGFzaC5vbigncmVhZGFibGUnLCAoKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBoYXNoLnJlYWQoKTtcbiAgICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEudG9TdHJpbmcoJ2hleCcpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaGFzaC53cml0ZShkYXRhKTtcblxuICAgICAgICBpZiAoZndyaXRlciA9PSBudWxsKSB7XG4gICAgICAgICAgbGV0IGZpbGVCYXNlTmFtZSA9IFBhdGguYmFzZW5hbWUocmVxLnBhcmFtcy5maWxlKTtcbiAgICAgICAgICBjb25zdCBkb3QgPSBmaWxlQmFzZU5hbWUubGFzdEluZGV4T2YoJy4nKTtcbiAgICAgICAgICBpZiAoZG90ID49MCApXG4gICAgICAgICAgICBmaWxlQmFzZU5hbWUgPSBmaWxlQmFzZU5hbWUuc2xpY2UoMCwgZG90KTtcbiAgICAgICAgICB3cml0aW5nRmlsZSA9IFBhdGgucmVzb2x2ZSh6aXBEb3dubG9hZERpciwgYCR7ZmlsZUJhc2VOYW1lLnNsaWNlKDAsIGZpbGVCYXNlTmFtZS5sYXN0SW5kZXhPZignLicpKX0uJHtwcm9jZXNzLnBpZH0uemlwYCk7XG4gICAgICAgICAgZndyaXRlciA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKHdyaXRpbmdGaWxlKTtcbiAgICAgICAgfVxuICAgICAgICBmd3JpdGVyLndyaXRlKGRhdGEpO1xuICAgICAgfSk7XG4gICAgICByZXEub24oJ2VuZCcsIGFzeW5jICgpID0+IHtcbiAgICAgICAgbG9nLmluZm8oYCR7d3JpdGluZ0ZpbGV9IGlzIHdyaXR0ZW4gd2l0aCAke2NvdW50Qnl0ZXN9IGJ5dGVzYCk7XG4gICAgICAgIGxldCBzaGE6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKGhhc2gpIHtcbiAgICAgICAgICBoYXNoLmVuZCgpO1xuICAgICAgICAgIHNoYSA9IGF3YWl0IGhhc2hEb25lO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzaGEgIT09IG5ld0NoZWNrc3VtSXRlbS5zaGEyNTYpIHtcbiAgICAgICAgICByZXMuc2VuZChgW1dBUk5dICR7b3MuaG9zdG5hbWUoKX0gcGlkOiAke3Byb2Nlc3MucGlkfTogJHtKU09OLnN0cmluZ2lmeShuZXdDaGVja3N1bUl0ZW0sIG51bGwsICcgICcpfVxcbmAgK1xuICAgICAgICAgICAgYFJlY2lldmVkIGZpbGUgaXMgY29ycnVwdGVkIHdpdGggaGFzaCAke3NoYX0sXFxud2hpbGUgZXhwZWN0aW5nIGZpbGUgaGFzaCBpcyAke25ld0NoZWNrc3VtSXRlbS5zaGEyNTZ9YCk7XG4gICAgICAgICAgZndyaXRlciEuZW5kKG9uWmlwRmlsZVdyaXR0ZW4pO1xuICAgICAgICAgIGZ3cml0ZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgZndyaXRlciEuZW5kKG9uWmlwRmlsZVdyaXR0ZW4pO1xuICAgICAgICBmd3JpdGVyID0gdW5kZWZpbmVkO1xuICAgICAgICByZXMuc2VuZChgW0FDQ0VQVF0gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiAke0pTT04uc3RyaW5naWZ5KG5ld0NoZWNrc3VtSXRlbSwgbnVsbCwgJyAgJyl9YCk7XG5cbiAgICAgICAgZmlsZXNIYXNoLnNldChuZXdDaGVja3N1bUl0ZW0uZmlsZSwgbmV3Q2hlY2tzdW1JdGVtKTtcbiAgICAgICAgd3JpdGVDaGVja3N1bUZpbGUoZmlsZXNIYXNoKTtcbiAgICAgICAgaWYgKGlzUG0yKSB7XG4gICAgICAgICAgY29uc3QgbXNnOiBQbTJQYWNrZXQgPSB7XG4gICAgICAgICAgICB0eXBlIDogJ3Byb2Nlc3M6bXNnJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgJ2NkLXNlcnZlcjpjaGVja3N1bSB1cGRhdGluZyc6IG5ld0NoZWNrc3VtSXRlbSxcbiAgICAgICAgICAgICAgcGlkOiBwcm9jZXNzLnBpZFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgICAgcHJvY2Vzcy5zZW5kIShtc2cpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmV4dCgpO1xuICAgIH1cbiAgfSk7XG5cbiAgbGV0IGNoZWNrZWRTZXEgPSAnJztcblxuICBhcHAudXNlKCcvX2NoZWNrbWFpbC86c2VxJywgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgbG9nLmluZm8oJ2ZvcmNlIGNoZWNrIG1haWwgZm9yOicsIHJlcS5wYXJhbXMuc2VxKTtcbiAgICBpZiAoY2hlY2tlZFNlcSA9PT0gcmVxLnBhcmFtcy5zZXEpXG4gICAgICByZXR1cm47XG4gICAgaWYgKGlzUG0yICYmICFpc01haW5Qcm9jZXNzKSB7XG4gICAgICBwcm9jZXNzLnNlbmQhKHtcbiAgICAgICAgdHlwZSA6ICdwcm9jZXNzOm1zZycsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAnY2Qtc2VydmVyOmNoZWNrIG1haWwnOiByZXEucGFyYW1zLnNlcSxcbiAgICAgICAgICBwaWQ6IHByb2Nlc3MucGlkXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBpbWFwLmNoZWNrTWFpbEZvclVwZGF0ZSgpO1xuICAgIH1cbiAgfSk7XG5cbiAgYXBwLnVzZSgnL190aW1lJywgKHJlcSwgcmVzKSA9PiB7XG4gICAgcmVzLnNlbmQoZ2VuZXJhdGVUb2tlbigpKTtcbiAgfSk7XG5cbiAgZnVuY3Rpb24gb25aaXBGaWxlV3JpdHRlbigpIHtcbiAgICBpZiAoaXNQbTIgJiYgIWlzTWFpblByb2Nlc3MpIHtcbiAgICAgIGNvbnN0IG1zZzogUG0yUGFja2V0ID0ge1xuICAgICAgICB0eXBlIDogJ3Byb2Nlc3M6bXNnJyxcbiAgICAgICAgZGF0YToge2V4dHJhY3RaaXA6IHRydWUsIHBpZDogcHJvY2Vzcy5waWR9XG4gICAgICB9O1xuICAgICAgcHJvY2Vzcy5zZW5kIShtc2cpO1xuICAgIH0gZWxzZVxuICAgICAgcmV0cnkoMiwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwKTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGluaXRQbTIoKSB7XG4gICAgY29uc3QgcG0yOiB0eXBlb2YgX3BtMiA9IHJlcXVpcmUoJ0Bncm93dGgvcG0yJyk7XG4gICAgY29uc3QgcG0yY29ubmVjdCA9IHV0aWwucHJvbWlzaWZ5KHBtMi5jb25uZWN0LmJpbmQocG0yKSk7XG4gICAgY29uc3QgcG0ybGF1bmNoQnVzID0gdXRpbC5wcm9taXNpZnk8UG0yQnVzPihwbTIubGF1bmNoQnVzLmJpbmQocG0yKSk7XG5cbiAgICBhd2FpdCBwbTJjb25uZWN0KCk7XG4gICAgY29uc3QgYnVzID0gYXdhaXQgcG0ybGF1bmNoQnVzKCk7XG4gICAgYnVzLm9uKCdwcm9jZXNzOm1zZycsIHBhY2tldCA9PiB7XG4gICAgICBpZiAoIXBhY2tldC5kYXRhKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHVwZGF0ZWRDaGVja3N1bUl0ZW0gPSBwYWNrZXQuZGF0YVsnY2Qtc2VydmVyOmNoZWNrc3VtIHVwZGF0aW5nJ107XG4gICAgICBpZiAodXBkYXRlZENoZWNrc3VtSXRlbSAmJiBwYWNrZXQuZGF0YS5waWQgIT09IHByb2Nlc3MucGlkKSB7XG4gICAgICAgIGNvbnN0IHJlY2lldmVkQ2hlY2tzdW0gPSB1cGRhdGVkQ2hlY2tzdW1JdGVtO1xuICAgICAgICBmaWxlc0hhc2guc2V0KHJlY2lldmVkQ2hlY2tzdW0uZmlsZSwgcmVjaWV2ZWRDaGVja3N1bSk7XG4gICAgICAgIGxvZy5pbmZvKCdPdGhlciBwcm9jZXNzIHJlY2lldmVkIHVwZGF0aW5nIGNoZWNrc3VtICVzIGZyb20gaWQ6ICVzJyxcbiAgICAgICAgICB1dGlsLmluc3BlY3QocmVjaWV2ZWRDaGVja3N1bSksIF8uZ2V0KHBhY2tldCwgJ3Byb2Nlc3MucG1faWQnKSk7XG4gICAgICB9XG4gICAgICBjb25zdCBjaGVja01haWxQcm9wID0gcGFja2V0LmRhdGFbJ2NkLXNlcnZlcjpjaGVjayBtYWlsJ107XG4gICAgICBpZiAoY2hlY2tNYWlsUHJvcCAmJiBwYWNrZXQuZGF0YS5waWQgIT09IHByb2Nlc3MucGlkKSB7XG4gICAgICAgIGNoZWNrZWRTZXEgPSBjaGVja01haWxQcm9wO1xuICAgICAgICBsb2cuaW5mbygnT3RoZXIgcHJvY2VzcyB0cmlnZ2VycyBcImNoZWNrIG1haWxcIiBmcm9tIGlkOicsIF8uZ2V0KHBhY2tldCwgJ3Byb2Nlc3MucG1faWQnKSk7XG4gICAgICAgIC8vIGltYXAuY2hlY2tNYWlsRm9yVXBkYXRlKCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYWNrZXQuZGF0YS5leHRyYWN0WmlwICYmIHBhY2tldC5kYXRhLnBpZCAhPT0gcHJvY2Vzcy5waWQpIHtcbiAgICAgICAgbG9nLmluZm8oJ090aGVyIHByb2Nlc3MgdHJpZ2dlcnMgXCJleHRyYWN0WmlwXCIgZnJvbSBpZDonLCBfLmdldChwYWNrZXQsICdwcm9jZXNzLnBtX2lkJykpO1xuICAgICAgICByZXRyeSgyLCBmb3JrRXh0cmFjdEV4c3RpbmdaaXApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVRva2VuKCkge1xuICBjb25zdCBkYXRlID0gbmV3IERhdGUoKTtcbiAgY29uc3QgdG9rZW4gPSBkYXRlLmdldERhdGUoKSArICcnICsgZGF0ZS5nZXRIb3VycygpO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2codG9rZW4pO1xuICByZXR1cm4gdG9rZW47XG59XG5cbmZ1bmN0aW9uIHJlYWRDaGVja3N1bUZpbGUoKTogTWFwPHN0cmluZywgQ2hlY2tzdW1JdGVtPiB7XG4gIGNvbnN0IGVudiA9IG1haWxTZXR0aW5nID8gbWFpbFNldHRpbmcuZW52IDogJ2xvY2FsJztcbiAgY29uc3QgY2hlY2tzdW1GaWxlID0gUGF0aC5yZXNvbHZlKCdjaGVja3N1bS4nICsgZW52ICsgJy5qc29uJyk7XG4gIGxldCBjaGVja3N1bTogQ2hlY2tzdW07XG4gIGlmIChmcy5leGlzdHNTeW5jKGNoZWNrc3VtRmlsZSkpIHtcbiAgICBjaGVja3N1bSA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGNoZWNrc3VtRmlsZSwgJ3V0ZjgnKSk7XG4gIH0gZWxzZSB7XG4gICAgY2hlY2tzdW0gPSBbXTtcbiAgfVxuICByZXR1cm4gY2hlY2tzdW0ucmVkdWNlKChtYXAsIHZhbCkgPT4gbWFwLnNldCh2YWwuZmlsZSwgdmFsKSwgbmV3IE1hcDxzdHJpbmcsIENoZWNrc3VtSXRlbT4oKSk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlQ2hlY2tzdW1GaWxlKGNoZWNrc3VtOiBSZXR1cm5UeXBlPHR5cGVvZiByZWFkQ2hlY2tzdW1GaWxlPikge1xuICBjb25zdCBlbnYgPSBtYWlsU2V0dGluZyA/IG1haWxTZXR0aW5nLmVudiA6ICdsb2NhbCc7XG4gIGZzLndyaXRlRmlsZShQYXRoLnJlc29sdmUoJ2NoZWNrc3VtLicgKyBlbnYgKyAnLmpzb24nKSwgSlNPTi5zdHJpbmdpZnkoQXJyYXkuZnJvbShjaGVja3N1bS52YWx1ZXMoKSksIG51bGwsICcgICcpLCAoZXJyKSA9PiB7XG4gICAgaWYgKGVycikge1xuICAgICAgbG9nLmVycm9yKGVycik7XG4gICAgfVxuICB9KTtcbn1cbiJdfQ==
