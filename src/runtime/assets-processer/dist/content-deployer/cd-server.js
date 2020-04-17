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
const artifacts_1 = require("@bk/prebuild/dist/artifacts");
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
            if (requireToken && req.query.whisper !== generateToken()) {
                res.header('Connection', 'close');
                res.status(401).send(`REJECT from ${os_1.default.hostname()} pid: ${process.pid}: Not allowed to push artifact in this environment.`);
                req.socket.end();
                res.connection.end();
                return;
            }
            const existing = filesHash.get(req.params.file);
            log.info(`${req.method} [${os_1.default.hostname}]file: ${req.params.file}, hash: ${req.params.hash},\nexisting file: ${existing ? existing : '<NO>'}` +
                `\n${util_1.default.inspect(req.headers)}`);
            if (req.method === 'PUT') {
                if (requireToken && req.query.whisper !== generateToken()) {
                    res.header('Connection', 'close');
                    res.status(401).send(`REJECT from ${os_1.default.hostname()} pid: ${process.pid}: Not allowed to push artifact in this environment.`);
                    req.socket.end();
                    res.connection.end();
                    return;
                }
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
        const router = __api_1.default.express.Router();
        router.get('/_githash', (req, res) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            res.setHeader('content-type', 'text/plain');
            res.send(yield artifacts_1.stringifyListAllVersions());
        }));
        app.use('/', router);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2NvbnRlbnQtZGVwbG95ZXIvY2Qtc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG9EQUFvQjtBQUVwQix3REFBd0I7QUFFeEIsa0RBQXlGO0FBQ3pGLHdEQUF3QjtBQUV4QixnRUFBMEI7QUFDMUIsNERBQXVCO0FBQ3ZCLGlHQUErRDtBQUMvRCw0REFBb0M7QUFDcEMsMERBQXdCO0FBQ3hCLDJEQUFxRTtBQUVyRSxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFrQjFFLE1BQU0sWUFBWSxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsZUFBRyxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUM5RSxNQUFNLFdBQVcsR0FBSSxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUEwQixDQUFDLGVBQWUsQ0FBQztBQUc5RixTQUFzQixRQUFRLENBQUMsR0FBZ0IsRUFBRSxJQUFpQjs7UUFDaEUsSUFBSSxPQUFtQyxDQUFDO1FBQ3hDLElBQUksV0FBK0IsQ0FBQztRQUVwQyxJQUFJLFNBQVMsR0FBRyxnQkFBZ0IsRUFBRSxDQUFDO1FBRW5DLE1BQU0sRUFBQyxLQUFLLEVBQUUsYUFBYSxFQUFDLEdBQUcseUJBQVUsRUFBRSxDQUFDO1FBQzVDLElBQUksS0FBSyxFQUFFO1lBQ1QsT0FBTyxFQUFFLENBQUM7U0FDWDtRQUVELElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxZQUFFLENBQUMsUUFBUSxJQUFJLE9BQU8sQ0FBQyxHQUFHLFlBQVksRUFBRSxJQUFJLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBRW5GLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQU8sR0FB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QUFDTCxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvY29udGVudC1kZXBsb3llci9jZC1zZXJ2ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0FwcGxpY2F0aW9ufSBmcm9tICdleHByZXNzJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQge0NoZWNrc3VtLCBXaXRoTWFpbFNlcnZlckNvbmZpZ30gZnJvbSAnLi4vZmV0Y2gtdHlwZXMnO1xuaW1wb3J0IHV0aWwgZnJvbSAndXRpbCc7XG5pbXBvcnQgX3BtMiBmcm9tICdAZ3Jvd3RoL3BtMic7XG5pbXBvcnQge2dldFBtMkluZm8sIHppcERvd25sb2FkRGlyLCBmb3JrRXh0cmFjdEV4c3RpbmdaaXAsIHJldHJ5fSBmcm9tICcuLi9mZXRjaC1yZW1vdGUnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge0ltYXBNYW5hZ2VyfSBmcm9tICcuLi9mZXRjaC1yZW1vdGUtaW1hcCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBtZW1zdGF0IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC91dGlscy9tZW0tc3RhdHMnO1xuaW1wb3J0IGNyeXB0bywge0hhc2h9IGZyb20gJ2NyeXB0byc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7c3RyaW5naWZ5TGlzdEFsbFZlcnNpb25zfSBmcm9tICdAYmsvcHJlYnVpbGQvZGlzdC9hcnRpZmFjdHMnO1xuXG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ0Bkci9hc3NldHMtcHJvY2Vzc2VyLmNkLXNlcnZlcicpO1xuXG5pbnRlcmZhY2UgUG0yUGFja2V0IHtcbiAgdHlwZTogJ3Byb2Nlc3M6bXNnJztcbiAgZGF0YToge1xuICAgIHBpZDogbnVtYmVyO1xuICAgICdjZC1zZXJ2ZXI6Y2hlY2tzdW0gdXBkYXRpbmcnPzogQ2hlY2tzdW1JdGVtO1xuICAgICdjZC1zZXJ2ZXI6Y2hlY2sgbWFpbCc/OiBzdHJpbmc7XG4gICAgZXh0cmFjdFppcD86IGJvb2xlYW47XG4gIH07XG59XG5cbmludGVyZmFjZSBQbTJCdXMge1xuICBvbihldmVudDogJ3Byb2Nlc3M6bXNnJywgY2I6IChwYWNrZXQ6IFBtMlBhY2tldCkgPT4gdm9pZCk6IHZvaWQ7XG59XG5cbnR5cGUgQ2hlY2tzdW1JdGVtID0gQ2hlY2tzdW0gZXh0ZW5kcyBBcnJheTxpbmZlciBJPiA/IEkgOiB1bmtub3duO1xuXG5jb25zdCByZXF1aXJlVG9rZW4gPSBhcGkuY29uZmlnLmdldChbYXBpLnBhY2thZ2VOYW1lLCAncmVxdWlyZVRva2VuJ10sIGZhbHNlKTtcbmNvbnN0IG1haWxTZXR0aW5nID0gKGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSkgYXMgV2l0aE1haWxTZXJ2ZXJDb25maWcpLmZldGNoTWFpbFNlcnZlcjtcblxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWN0aXZhdGUoYXBwOiBBcHBsaWNhdGlvbiwgaW1hcDogSW1hcE1hbmFnZXIpIHtcbiAgbGV0IGZ3cml0ZXI6IGZzLldyaXRlU3RyZWFtIHwgdW5kZWZpbmVkO1xuICBsZXQgd3JpdGluZ0ZpbGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBsZXQgZmlsZXNIYXNoID0gcmVhZENoZWNrc3VtRmlsZSgpO1xuXG4gIGNvbnN0IHtpc1BtMiwgaXNNYWluUHJvY2Vzc30gPSBnZXRQbTJJbmZvKCk7XG4gIGlmIChpc1BtMikge1xuICAgIGluaXRQbTIoKTtcbiAgfVxuXG4gIGltYXAuYXBwZW5kTWFpbChgc2VydmVyICR7b3MuaG9zdG5hbWV9ICR7cHJvY2Vzcy5waWR9IGFjdGl2YXRlc2AsIG5ldyBEYXRlKCkgKyAnJyk7XG5cbiAgYXBwLnVzZSgnL19zdGF0JywgYXN5bmMgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgaWYgKHJlcXVpcmVUb2tlbiAmJiByZXEucXVlcnkud2hpc3BlciAhPT0gZ2VuZXJhdGVUb2tlbigpKSB7XG4gICAgICByZXMuaGVhZGVyKCdDb25uZWN0aW9uJywgJ2Nsb3NlJyk7XG4gICAgICByZXMuc3RhdHVzKDQwMSkuc2VuZChgUkVKRUNUIGZyb20gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiBOb3QgYWxsb3dlZCB0byBwdXNoIGFydGlmYWN0IGluIHRoaXMgZW52aXJvbm1lbnQuYCk7XG4gICAgICByZXEuc29ja2V0LmVuZCgpO1xuICAgICAgcmVzLmNvbm5lY3Rpb24uZW5kKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG5cbiAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ0dFVCcgJiYgL15cXC9fc3RhdChbIz8vXXwkKS8udGVzdChyZXEub3JpZ2luYWxVcmwpKSB7XG4gICAgICByZXMuY29udGVudFR5cGUoJ2pzb24nKTtcbiAgICAgIHJlcy5zZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgaXNNYWluUHJvY2VzcyxcbiAgICAgICAgZmlsZXNIYXNoOiBBcnJheS5mcm9tKGZpbGVzSGFzaC52YWx1ZXMoKSksXG4gICAgICAgIGlzX3BtMl9zbGF2ZTogaXNQbTIsXG4gICAgICAgIGhvc3RuYW1lOiBvcy5ob3N0bmFtZSgpLFxuICAgICAgICBwaWQ6IHByb2Nlc3MucGlkLFxuICAgICAgICBtZW06IG1lbXN0YXQoKSxcbiAgICAgICAgY3B1czogb3MuY3B1cygpLFxuICAgICAgICBhcmNoOiBvcy5hcmNoKCksXG4gICAgICAgIHBsYXRmb3JtOiBvcy5wbGF0Zm9ybSgpLFxuICAgICAgICBsb2FkYXZnOiBvcy5sb2FkYXZnKClcbiAgICAgIH0sIG51bGwsICcgICcpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmV4dCgpO1xuICAgIH1cbiAgfSk7XG5cbiAgYXBwLnVzZTx7ZmlsZTogc3RyaW5nLCBoYXNoOiBzdHJpbmd9PignL19pbnN0YWxsLzpmaWxlLzpoYXNoJywgYXN5bmMgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgaWYgKHJlcXVpcmVUb2tlbiAmJiByZXEucXVlcnkud2hpc3BlciAhPT0gZ2VuZXJhdGVUb2tlbigpKSB7XG4gICAgICByZXMuaGVhZGVyKCdDb25uZWN0aW9uJywgJ2Nsb3NlJyk7XG4gICAgICByZXMuc3RhdHVzKDQwMSkuc2VuZChgUkVKRUNUIGZyb20gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiBOb3QgYWxsb3dlZCB0byBwdXNoIGFydGlmYWN0IGluIHRoaXMgZW52aXJvbm1lbnQuYCk7XG4gICAgICByZXEuc29ja2V0LmVuZCgpO1xuICAgICAgcmVzLmNvbm5lY3Rpb24uZW5kKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGV4aXN0aW5nID0gZmlsZXNIYXNoLmdldChyZXEucGFyYW1zLmZpbGUpO1xuICAgIGxvZy5pbmZvKGAke3JlcS5tZXRob2R9IFske29zLmhvc3RuYW1lfV1maWxlOiAke3JlcS5wYXJhbXMuZmlsZX0sIGhhc2g6ICR7cmVxLnBhcmFtcy5oYXNofSxcXG5leGlzdGluZyBmaWxlOiAke2V4aXN0aW5nID8gZXhpc3RpbmcgOiAnPE5PPid9YCArXG4gICAgICBgXFxuJHt1dGlsLmluc3BlY3QocmVxLmhlYWRlcnMpfWApO1xuXG4gICAgaWYgKHJlcS5tZXRob2QgPT09ICdQVVQnKSB7XG4gICAgICBpZiAocmVxdWlyZVRva2VuICYmIHJlcS5xdWVyeS53aGlzcGVyICE9PSBnZW5lcmF0ZVRva2VuKCkpIHtcbiAgICAgICAgcmVzLmhlYWRlcignQ29ubmVjdGlvbicsICdjbG9zZScpO1xuICAgICAgICByZXMuc3RhdHVzKDQwMSkuc2VuZChgUkVKRUNUIGZyb20gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiBOb3QgYWxsb3dlZCB0byBwdXNoIGFydGlmYWN0IGluIHRoaXMgZW52aXJvbm1lbnQuYCk7XG4gICAgICAgIHJlcS5zb2NrZXQuZW5kKCk7XG4gICAgICAgIHJlcy5jb25uZWN0aW9uLmVuZCgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGxvZy5pbmZvKCdyZWNpZXZpbmcgZGF0YScpO1xuICAgICAgaWYgKGlzUG0yICYmICFpc01haW5Qcm9jZXNzKSB7XG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCA4MDApKTtcbiAgICAgIH1cbiAgICAgIGlmIChleGlzdGluZyAmJiBleGlzdGluZy5zaGEyNTYgPT09IHJlcS5wYXJhbXMuaGFzaCkge1xuICAgICAgICAvLyBJIHdhbnQgdG8gY2FuY2VsIHJlY2lldmluZyByZXF1ZXN0IGJvZHkgYXNhcFxuICAgICAgICAvLyBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xODM2NzgyNC9ob3ctdG8tY2FuY2VsLWh0dHAtdXBsb2FkLWZyb20tZGF0YS1ldmVudHNcbiAgICAgICAgcmVzLmhlYWRlcignQ29ubmVjdGlvbicsICdjbG9zZScpO1xuICAgICAgICByZXMuc3RhdHVzKDQwOSkuc2VuZChgW1JFSkVDVF0gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OmAgK1xuICAgICAgICBgLSBmb3VuZCBleGlzdGluZzogJHtKU09OLnN0cmluZ2lmeShleGlzdGluZywgbnVsbCwgJyAgJyl9XFxuYCArXG4gICAgICAgIGAtIGhhc2hzOlxcbiAgJHtKU09OLnN0cmluZ2lmeShmaWxlc0hhc2gsIG51bGwsICcgICcpfWApO1xuICAgICAgICByZXEuc29ja2V0LmVuZCgpO1xuICAgICAgICByZXMuY29ubmVjdGlvbi5lbmQoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgY29uc3QgbmV3Q2hlY2tzdW1JdGVtOiBDaGVja3N1bUl0ZW0gPSB7XG4gICAgICAgIGZpbGU6IHJlcS5wYXJhbXMuZmlsZSxcbiAgICAgICAgc2hhMjU2OiByZXEucGFyYW1zLmhhc2gsXG4gICAgICAgIGNyZWF0ZWQ6IG5vdy50b0xvY2FsZVN0cmluZygpLFxuICAgICAgICBjcmVhdGVkVGltZTogbm93LmdldFRpbWUoKVxuICAgICAgfTtcblxuICAgICAgLy8gY2hlY2tzdW0udmVyc2lvbnMhW3JlcS5wYXJhbXMuYXBwXSA9IHt2ZXJzaW9uOiBwYXJzZUludChyZXEucGFyYW1zLnZlcnNpb24sIDEwKX07XG5cbiAgICAgIGxldCBjb3VudEJ5dGVzID0gMDtcblxuICAgICAgbGV0IGhhc2g6IEhhc2g7XG4gICAgICBsZXQgaGFzaERvbmU6IFByb21pc2U8c3RyaW5nPjtcblxuICAgICAgcmVxLm9uKCdkYXRhJywgKGRhdGE6IEJ1ZmZlcikgPT4ge1xuICAgICAgICBjb3VudEJ5dGVzICs9IGRhdGEuYnl0ZUxlbmd0aDtcbiAgICAgICAgaWYgKGhhc2ggPT0gbnVsbCkge1xuICAgICAgICAgIGhhc2ggPSBjcnlwdG8uY3JlYXRlSGFzaCgnc2hhMjU2Jyk7XG4gICAgICAgICAgaGFzaERvbmUgPSBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICAgIGhhc2gub24oJ3JlYWRhYmxlJywgKCkgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBkYXRhID0gaGFzaC5yZWFkKCk7XG4gICAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShkYXRhLnRvU3RyaW5nKCdoZXgnKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGhhc2gud3JpdGUoZGF0YSk7XG5cbiAgICAgICAgaWYgKGZ3cml0ZXIgPT0gbnVsbCkge1xuICAgICAgICAgIGxldCBmaWxlQmFzZU5hbWUgPSBQYXRoLmJhc2VuYW1lKHJlcS5wYXJhbXMuZmlsZSk7XG4gICAgICAgICAgY29uc3QgZG90ID0gZmlsZUJhc2VOYW1lLmxhc3RJbmRleE9mKCcuJyk7XG4gICAgICAgICAgaWYgKGRvdCA+PTAgKVxuICAgICAgICAgICAgZmlsZUJhc2VOYW1lID0gZmlsZUJhc2VOYW1lLnNsaWNlKDAsIGRvdCk7XG4gICAgICAgICAgd3JpdGluZ0ZpbGUgPSBQYXRoLnJlc29sdmUoemlwRG93bmxvYWREaXIsIGAke2ZpbGVCYXNlTmFtZS5zbGljZSgwLCBmaWxlQmFzZU5hbWUubGFzdEluZGV4T2YoJy4nKSl9LiR7cHJvY2Vzcy5waWR9LnppcGApO1xuICAgICAgICAgIGZ3cml0ZXIgPSBmcy5jcmVhdGVXcml0ZVN0cmVhbSh3cml0aW5nRmlsZSk7XG4gICAgICAgIH1cbiAgICAgICAgZndyaXRlci53cml0ZShkYXRhKTtcbiAgICAgIH0pO1xuICAgICAgcmVxLm9uKCdlbmQnLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIGxvZy5pbmZvKGAke3dyaXRpbmdGaWxlfSBpcyB3cml0dGVuIHdpdGggJHtjb3VudEJ5dGVzfSBieXRlc2ApO1xuICAgICAgICBsZXQgc2hhOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChoYXNoKSB7XG4gICAgICAgICAgaGFzaC5lbmQoKTtcbiAgICAgICAgICBzaGEgPSBhd2FpdCBoYXNoRG9uZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2hhICE9PSBuZXdDaGVja3N1bUl0ZW0uc2hhMjU2KSB7XG4gICAgICAgICAgcmVzLnNlbmQoYFtXQVJOXSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06ICR7SlNPTi5zdHJpbmdpZnkobmV3Q2hlY2tzdW1JdGVtLCBudWxsLCAnICAnKX1cXG5gICtcbiAgICAgICAgICAgIGBSZWNpZXZlZCBmaWxlIGlzIGNvcnJ1cHRlZCB3aXRoIGhhc2ggJHtzaGF9LFxcbndoaWxlIGV4cGVjdGluZyBmaWxlIGhhc2ggaXMgJHtuZXdDaGVja3N1bUl0ZW0uc2hhMjU2fWApO1xuICAgICAgICAgIGZ3cml0ZXIhLmVuZChvblppcEZpbGVXcml0dGVuKTtcbiAgICAgICAgICBmd3JpdGVyID0gdW5kZWZpbmVkO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ3cml0ZXIhLmVuZChvblppcEZpbGVXcml0dGVuKTtcbiAgICAgICAgZndyaXRlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgcmVzLnNlbmQoYFtBQ0NFUFRdICR7b3MuaG9zdG5hbWUoKX0gcGlkOiAke3Byb2Nlc3MucGlkfTogJHtKU09OLnN0cmluZ2lmeShuZXdDaGVja3N1bUl0ZW0sIG51bGwsICcgICcpfWApO1xuXG4gICAgICAgIGZpbGVzSGFzaC5zZXQobmV3Q2hlY2tzdW1JdGVtLmZpbGUsIG5ld0NoZWNrc3VtSXRlbSk7XG4gICAgICAgIHdyaXRlQ2hlY2tzdW1GaWxlKGZpbGVzSGFzaCk7XG4gICAgICAgIGlmIChpc1BtMikge1xuICAgICAgICAgIGNvbnN0IG1zZzogUG0yUGFja2V0ID0ge1xuICAgICAgICAgICAgdHlwZSA6ICdwcm9jZXNzOm1zZycsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICdjZC1zZXJ2ZXI6Y2hlY2tzdW0gdXBkYXRpbmcnOiBuZXdDaGVja3N1bUl0ZW0sXG4gICAgICAgICAgICAgIHBpZDogcHJvY2Vzcy5waWRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICAgIHByb2Nlc3Muc2VuZCEobXNnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5leHQoKTtcbiAgICB9XG4gIH0pO1xuXG4gIGxldCBjaGVja2VkU2VxID0gJyc7XG5cbiAgYXBwLnVzZSgnL19jaGVja21haWwvOnNlcScsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIGxvZy5pbmZvKCdmb3JjZSBjaGVjayBtYWlsIGZvcjonLCByZXEucGFyYW1zLnNlcSk7XG4gICAgaWYgKGNoZWNrZWRTZXEgPT09IHJlcS5wYXJhbXMuc2VxKVxuICAgICAgcmV0dXJuO1xuICAgIGlmIChpc1BtMiAmJiAhaXNNYWluUHJvY2Vzcykge1xuICAgICAgcHJvY2Vzcy5zZW5kISh7XG4gICAgICAgIHR5cGUgOiAncHJvY2Vzczptc2cnLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgJ2NkLXNlcnZlcjpjaGVjayBtYWlsJzogcmVxLnBhcmFtcy5zZXEsXG4gICAgICAgICAgcGlkOiBwcm9jZXNzLnBpZFxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgaW1hcC5jaGVja01haWxGb3JVcGRhdGUoKTtcbiAgICB9XG4gIH0pO1xuXG4gIGFwcC51c2UoJy9fdGltZScsIChyZXEsIHJlcykgPT4ge1xuICAgIHJlcy5zZW5kKGdlbmVyYXRlVG9rZW4oKSk7XG4gIH0pO1xuXG5cbiAgY29uc3Qgcm91dGVyID0gYXBpLmV4cHJlc3MuUm91dGVyKCk7XG4gIHJvdXRlci5nZXQoJy9fZ2l0aGFzaCcsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHJlcy5zZXRIZWFkZXIoJ2NvbnRlbnQtdHlwZScsICd0ZXh0L3BsYWluJyk7XG4gICAgcmVzLnNlbmQoYXdhaXQgc3RyaW5naWZ5TGlzdEFsbFZlcnNpb25zKCkpO1xuICB9KTtcbiAgYXBwLnVzZSgnLycsIHJvdXRlcik7XG5cbiAgZnVuY3Rpb24gb25aaXBGaWxlV3JpdHRlbigpIHtcbiAgICBpZiAoaXNQbTIgJiYgIWlzTWFpblByb2Nlc3MpIHtcbiAgICAgIGNvbnN0IG1zZzogUG0yUGFja2V0ID0ge1xuICAgICAgICB0eXBlIDogJ3Byb2Nlc3M6bXNnJyxcbiAgICAgICAgZGF0YToge2V4dHJhY3RaaXA6IHRydWUsIHBpZDogcHJvY2Vzcy5waWR9XG4gICAgICB9O1xuICAgICAgcHJvY2Vzcy5zZW5kIShtc2cpO1xuICAgIH0gZWxzZVxuICAgICAgcmV0cnkoMiwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwKTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGluaXRQbTIoKSB7XG4gICAgY29uc3QgcG0yOiB0eXBlb2YgX3BtMiA9IHJlcXVpcmUoJ0Bncm93dGgvcG0yJyk7XG4gICAgY29uc3QgcG0yY29ubmVjdCA9IHV0aWwucHJvbWlzaWZ5KHBtMi5jb25uZWN0LmJpbmQocG0yKSk7XG4gICAgY29uc3QgcG0ybGF1bmNoQnVzID0gdXRpbC5wcm9taXNpZnk8UG0yQnVzPihwbTIubGF1bmNoQnVzLmJpbmQocG0yKSk7XG5cbiAgICBhd2FpdCBwbTJjb25uZWN0KCk7XG4gICAgY29uc3QgYnVzID0gYXdhaXQgcG0ybGF1bmNoQnVzKCk7XG4gICAgYnVzLm9uKCdwcm9jZXNzOm1zZycsIHBhY2tldCA9PiB7XG4gICAgICBpZiAoIXBhY2tldC5kYXRhKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHVwZGF0ZWRDaGVja3N1bUl0ZW0gPSBwYWNrZXQuZGF0YVsnY2Qtc2VydmVyOmNoZWNrc3VtIHVwZGF0aW5nJ107XG4gICAgICBpZiAodXBkYXRlZENoZWNrc3VtSXRlbSAmJiBwYWNrZXQuZGF0YS5waWQgIT09IHByb2Nlc3MucGlkKSB7XG4gICAgICAgIGNvbnN0IHJlY2lldmVkQ2hlY2tzdW0gPSB1cGRhdGVkQ2hlY2tzdW1JdGVtO1xuICAgICAgICBmaWxlc0hhc2guc2V0KHJlY2lldmVkQ2hlY2tzdW0uZmlsZSwgcmVjaWV2ZWRDaGVja3N1bSk7XG4gICAgICAgIGxvZy5pbmZvKCdPdGhlciBwcm9jZXNzIHJlY2lldmVkIHVwZGF0aW5nIGNoZWNrc3VtICVzIGZyb20gaWQ6ICVzJyxcbiAgICAgICAgICB1dGlsLmluc3BlY3QocmVjaWV2ZWRDaGVja3N1bSksIF8uZ2V0KHBhY2tldCwgJ3Byb2Nlc3MucG1faWQnKSk7XG4gICAgICB9XG4gICAgICBjb25zdCBjaGVja01haWxQcm9wID0gcGFja2V0LmRhdGFbJ2NkLXNlcnZlcjpjaGVjayBtYWlsJ107XG4gICAgICBpZiAoY2hlY2tNYWlsUHJvcCAmJiBwYWNrZXQuZGF0YS5waWQgIT09IHByb2Nlc3MucGlkKSB7XG4gICAgICAgIGNoZWNrZWRTZXEgPSBjaGVja01haWxQcm9wO1xuICAgICAgICBsb2cuaW5mbygnT3RoZXIgcHJvY2VzcyB0cmlnZ2VycyBcImNoZWNrIG1haWxcIiBmcm9tIGlkOicsIF8uZ2V0KHBhY2tldCwgJ3Byb2Nlc3MucG1faWQnKSk7XG4gICAgICAgIC8vIGltYXAuY2hlY2tNYWlsRm9yVXBkYXRlKCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYWNrZXQuZGF0YS5leHRyYWN0WmlwICYmIHBhY2tldC5kYXRhLnBpZCAhPT0gcHJvY2Vzcy5waWQpIHtcbiAgICAgICAgbG9nLmluZm8oJ090aGVyIHByb2Nlc3MgdHJpZ2dlcnMgXCJleHRyYWN0WmlwXCIgZnJvbSBpZDonLCBfLmdldChwYWNrZXQsICdwcm9jZXNzLnBtX2lkJykpO1xuICAgICAgICByZXRyeSgyLCBmb3JrRXh0cmFjdEV4c3RpbmdaaXApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVRva2VuKCkge1xuICBjb25zdCBkYXRlID0gbmV3IERhdGUoKTtcbiAgY29uc3QgdG9rZW4gPSBkYXRlLmdldERhdGUoKSArICcnICsgZGF0ZS5nZXRIb3VycygpO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2codG9rZW4pO1xuICByZXR1cm4gdG9rZW47XG59XG5cbmZ1bmN0aW9uIHJlYWRDaGVja3N1bUZpbGUoKTogTWFwPHN0cmluZywgQ2hlY2tzdW1JdGVtPiB7XG4gIGNvbnN0IGVudiA9IG1haWxTZXR0aW5nID8gbWFpbFNldHRpbmcuZW52IDogJ2xvY2FsJztcbiAgY29uc3QgY2hlY2tzdW1GaWxlID0gUGF0aC5yZXNvbHZlKCdjaGVja3N1bS4nICsgZW52ICsgJy5qc29uJyk7XG4gIGxldCBjaGVja3N1bTogQ2hlY2tzdW07XG4gIGlmIChmcy5leGlzdHNTeW5jKGNoZWNrc3VtRmlsZSkpIHtcbiAgICBjaGVja3N1bSA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGNoZWNrc3VtRmlsZSwgJ3V0ZjgnKSk7XG4gIH0gZWxzZSB7XG4gICAgY2hlY2tzdW0gPSBbXTtcbiAgfVxuICByZXR1cm4gY2hlY2tzdW0ucmVkdWNlKChtYXAsIHZhbCkgPT4gbWFwLnNldCh2YWwuZmlsZSwgdmFsKSwgbmV3IE1hcDxzdHJpbmcsIENoZWNrc3VtSXRlbT4oKSk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlQ2hlY2tzdW1GaWxlKGNoZWNrc3VtOiBSZXR1cm5UeXBlPHR5cGVvZiByZWFkQ2hlY2tzdW1GaWxlPikge1xuICBjb25zdCBlbnYgPSBtYWlsU2V0dGluZyA/IG1haWxTZXR0aW5nLmVudiA6ICdsb2NhbCc7XG4gIGZzLndyaXRlRmlsZShQYXRoLnJlc29sdmUoJ2NoZWNrc3VtLicgKyBlbnYgKyAnLmpzb24nKSwgSlNPTi5zdHJpbmdpZnkoQXJyYXkuZnJvbShjaGVja3N1bS52YWx1ZXMoKSksIG51bGwsICcgICcpLCAoZXJyKSA9PiB7XG4gICAgaWYgKGVycikge1xuICAgICAgbG9nLmVycm9yKGVycik7XG4gICAgfVxuICB9KTtcbn1cbiJdfQ==
