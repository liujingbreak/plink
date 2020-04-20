"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const os_1 = tslib_1.__importDefault(require("os"));
const util = tslib_1.__importStar(require("util"));
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
        router.put('/_install/:file/:hash', (req, res, next) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (requireToken && req.query.whisper !== generateToken()) {
                res.header('Connection', 'close');
                res.status(401).send(`REJECT from ${os_1.default.hostname()} pid: ${process.pid}: Not allowed to push artifact in this environment.`);
                req.socket.end();
                res.connection.end();
                return;
            }
            const existing = filesHash.get(req.params.file);
            log.info(`${req.method} [${os_1.default.hostname}]file: ${req.params.file}, hash: ${req.params.hash},\nexisting file: ${existing ? existing.file + ' / ' + existing.sha256 : '<NO>'}` +
                `\n${util.inspect(req.headers)}`);
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
            const contentLen = req.headers['content-length'];
            // checksum.versions![req.params.app] = {version: parseInt(req.params.version, 10)};
            try {
                yield readResponseToBuffer(req, req.params.hash, contentLen ? parseInt(contentLen, 10) : 10 * 1024 * 1024);
            }
            catch (e) {
                if (e.message === 'sha256 not match') {
                    res.send(`[WARN] ${os_1.default.hostname()} pid: ${process.pid}: ${JSON.stringify(newChecksumItem, null, '  ')}\n` +
                        `Recieved file is corrupted with hash ${e.sha256},\nwhile expecting file hash is ${newChecksumItem.sha256}`);
                }
                else {
                    res.status(500);
                    res.send(e.stack);
                }
            }
            res.send(`[ACCEPT] ${os_1.default.hostname()} pid: ${process.pid}: ${JSON.stringify(newChecksumItem, null, '  ')}`);
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
                const pm2connect = util.promisify(pm2.connect.bind(pm2));
                const pm2launchBus = util.promisify(pm2.launchBus.bind(pm2));
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
                        log.info('Other process recieved updating checksum %s from id: %s', util.inspect(recievedChecksum), lodash_1.default.get(packet, 'process.pm_id'));
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
function readResponseToBuffer(req, expectSha256, length) {
    let countBytes = 0;
    let hash;
    let hashDone;
    req.on('data', (data) => {
        countBytes += data.byteLength;
        log.info(`Recieving, ${countBytes} bytes`);
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
        // if (fwriter == null) {
        //   let fileBaseName = Path.basename(req.params.file);
        //   const dot = fileBaseName.lastIndexOf('.');
        //   if (dot >=0 )
        //     fileBaseName = fileBaseName.slice(0, dot);
        //   writingFile = Path.resolve(zipDownloadDir, `${fileBaseName.slice(0, fileBaseName.lastIndexOf('.'))}.${process.pid}.zip`);
        //   fs.mkdirpSync(Path.dirname(writingFile));
        //   fwriter = fs.createWriteStream(writingFile);
        // }
        // fwriter.write(data);
    });
    req.on('end', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        log.info(`Total recieved ${countBytes} bytes`);
        let sha;
        if (hash) {
            hash.end();
            sha = yield hashDone;
        }
        if (sha !== expectSha256) {
            const err = new Error('sha256 not match');
            err.sha256 = sha;
            // TODO:
            // res.send(`[WARN] ${os.hostname()} pid: ${process.pid}: ${JSON.stringify(newChecksumItem, null, '  ')}\n` +
            //   `Recieved file is corrupted with hash ${sha},\nwhile expecting file hash is ${newChecksumItem.sha256}`);
            // fwriter!.end(onZipFileWritten);
            // fwriter = undefined;
            throw err;
        }
        // fwriter!.end(onZipFileWritten);
        // fwriter = undefined;
        // res.send(`[ACCEPT] ${os.hostname()} pid: ${process.pid}: ${JSON.stringify(newChecksumItem, null, '  ')}`);
        // filesHash.set(newChecksumItem.file, newChecksumItem);
        // writeChecksumFile(filesHash);
        // if (isPm2) {
        //   const msg: Pm2Packet = {
        //     type : 'process:msg',
        //     data: {
        //       'cd-server:checksum updating': newChecksumItem,
        //       pid: process.pid
        //     }
        //   };
        //   process.send!(msg);
        // }
    }));
}
function readChecksumFile() {
    const env = mailSetting ? mailSetting.env : 'local';
    const checksumFile = path_1.default.resolve('checksum.' + env + '.json');
    let checksum;
    if (fs_extra_1.default.existsSync(checksumFile)) {
        try {
            checksum = JSON.parse(fs_extra_1.default.readFileSync(checksumFile, 'utf8'));
        }
        catch (e) {
            log.warn(e);
            checksum = [];
        }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2NvbnRlbnQtZGVwbG95ZXIvY2Qtc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG9EQUFvQjtBQUVwQixtREFBNkI7QUFFN0Isa0RBQXlGO0FBQ3pGLHdEQUF3QjtBQUV4QixnRUFBMEI7QUFDMUIsNERBQXVCO0FBQ3ZCLGlHQUErRDtBQUMvRCw0REFBb0M7QUFDcEMsMERBQXdCO0FBQ3hCLDJEQUFxRTtBQUVyRSxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFrQjFFLE1BQU0sWUFBWSxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsZUFBRyxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUM5RSxNQUFNLFdBQVcsR0FBSSxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUEwQixDQUFDLGVBQWUsQ0FBQztBQUc5RixTQUFzQixRQUFRLENBQUMsR0FBZ0IsRUFBRSxJQUFpQjs7UUFDaEUsSUFBSSxPQUFtQyxDQUFDO1FBQ3hDLElBQUksV0FBK0IsQ0FBQztRQUVwQyxJQUFJLFNBQVMsR0FBRyxnQkFBZ0IsRUFBRSxDQUFDO1FBRW5DLE1BQU0sRUFBQyxLQUFLLEVBQUUsYUFBYSxFQUFDLEdBQUcseUJBQVUsRUFBRSxDQUFDO1FBQzVDLElBQUksS0FBSyxFQUFFO1lBQ1QsT0FBTyxFQUFFLENBQUM7U0FDWDtRQUVELElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxZQUFFLENBQUMsUUFBUSxJQUFJLE9BQU8sQ0FBQyxHQUFHLFlBQVksRUFBRSxJQUFJLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBRW5GLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQU8sR0FB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QUMsQ0FBQyxPQUFPLENBQUM7SUFDcEQsa0JBQUUsQ0FBQyxTQUFTLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEdBQUcsR0FBRyxHQUFHLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtRQUN6SCxJQUFJLEdBQUcsRUFBRTtZQUNQLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDaEI7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9jb250ZW50LWRlcGxveWVyL2NkLXNlcnZlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7QXBwbGljYXRpb24sIFJlcXVlc3R9IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCB7Q2hlY2tzdW0sIFdpdGhNYWlsU2VydmVyQ29uZmlnfSBmcm9tICcuLi9mZXRjaC10eXBlcyc7XG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJ3V0aWwnO1xuaW1wb3J0IF9wbTIgZnJvbSAnQGdyb3d0aC9wbTInO1xuaW1wb3J0IHtnZXRQbTJJbmZvLCB6aXBEb3dubG9hZERpciwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwLCByZXRyeX0gZnJvbSAnLi4vZmV0Y2gtcmVtb3RlJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtJbWFwTWFuYWdlcn0gZnJvbSAnLi4vZmV0Y2gtcmVtb3RlLWltYXAnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgbWVtc3RhdCBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvdXRpbHMvbWVtLXN0YXRzJztcbmltcG9ydCBjcnlwdG8sIHtIYXNofSBmcm9tICdjcnlwdG8nO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQge3N0cmluZ2lmeUxpc3RBbGxWZXJzaW9uc30gZnJvbSAnQGJrL3ByZWJ1aWxkL2Rpc3QvYXJ0aWZhY3RzJztcblxuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdAZHIvYXNzZXRzLXByb2Nlc3Nlci5jZC1zZXJ2ZXInKTtcblxuaW50ZXJmYWNlIFBtMlBhY2tldCB7XG4gIHR5cGU6ICdwcm9jZXNzOm1zZyc7XG4gIGRhdGE6IHtcbiAgICBwaWQ6IG51bWJlcjtcbiAgICAnY2Qtc2VydmVyOmNoZWNrc3VtIHVwZGF0aW5nJz86IENoZWNrc3VtSXRlbTtcbiAgICAnY2Qtc2VydmVyOmNoZWNrIG1haWwnPzogc3RyaW5nO1xuICAgIGV4dHJhY3RaaXA/OiBib29sZWFuO1xuICB9O1xufVxuXG5pbnRlcmZhY2UgUG0yQnVzIHtcbiAgb24oZXZlbnQ6ICdwcm9jZXNzOm1zZycsIGNiOiAocGFja2V0OiBQbTJQYWNrZXQpID0+IHZvaWQpOiB2b2lkO1xufVxuXG50eXBlIENoZWNrc3VtSXRlbSA9IENoZWNrc3VtIGV4dGVuZHMgQXJyYXk8aW5mZXIgST4gPyBJIDogdW5rbm93bjtcblxuY29uc3QgcmVxdWlyZVRva2VuID0gYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ3JlcXVpcmVUb2tlbiddLCBmYWxzZSk7XG5jb25zdCBtYWlsU2V0dGluZyA9IChhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpIGFzIFdpdGhNYWlsU2VydmVyQ29uZmlnKS5mZXRjaE1haWxTZXJ2ZXI7XG5cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFjdGl2YXRlKGFwcDogQXBwbGljYXRpb24sIGltYXA6IEltYXBNYW5hZ2VyKSB7XG4gIGxldCBmd3JpdGVyOiBmcy5Xcml0ZVN0cmVhbSB8IHVuZGVmaW5lZDtcbiAgbGV0IHdyaXRpbmdGaWxlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgbGV0IGZpbGVzSGFzaCA9IHJlYWRDaGVja3N1bUZpbGUoKTtcblxuICBjb25zdCB7aXNQbTIsIGlzTWFpblByb2Nlc3N9ID0gZ2V0UG0ySW5mbygpO1xuICBpZiAoaXNQbTIpIHtcbiAgICBpbml0UG0yKCk7XG4gIH1cblxuICBpbWFwLmFwcGVuZE1haWwoYHNlcnZlciAke29zLmhvc3RuYW1lfSAke3Byb2Nlc3MucGlkfSBhY3RpdmF0ZXNgLCBuZXcgRGF0ZSgpICsgJycpO1xuXG4gIGFwcC51c2UoJy9fc3RhdCcsIGFzeW5jIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIGlmIChyZXF1aXJlVG9rZW4gJiYgcmVxLnF1ZXJ5LndoaXNwZXIgIT09IGdlbmVyYXRlVG9rZW4oKSkge1xuICAgICAgcmVzLmhlYWRlcignQ29ubmVjdGlvbicsICdjbG9zZScpO1xuICAgICAgcmVzLnN0YXR1cyg0MDEpLnNlbmQoYFJFSkVDVCBmcm9tICR7b3MuaG9zdG5hbWUoKX0gcGlkOiAke3Byb2Nlc3MucGlkfTogTm90IGFsbG93ZWQgdG8gcHVzaCBhcnRpZmFjdCBpbiB0aGlzIGVudmlyb25tZW50LmApO1xuICAgICAgcmVxLnNvY2tldC5lbmQoKTtcbiAgICAgIHJlcy5jb25uZWN0aW9uLmVuZCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuXG4gICAgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnICYmIC9eXFwvX3N0YXQoWyM/L118JCkvLnRlc3QocmVxLm9yaWdpbmFsVXJsKSkge1xuICAgICAgcmVzLmNvbnRlbnRUeXBlKCdqc29uJyk7XG4gICAgICByZXMuc2VuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIGlzTWFpblByb2Nlc3MsXG4gICAgICAgIGZpbGVzSGFzaDogQXJyYXkuZnJvbShmaWxlc0hhc2gudmFsdWVzKCkpLFxuICAgICAgICBpc19wbTJfc2xhdmU6IGlzUG0yLFxuICAgICAgICBob3N0bmFtZTogb3MuaG9zdG5hbWUoKSxcbiAgICAgICAgcGlkOiBwcm9jZXNzLnBpZCxcbiAgICAgICAgbWVtOiBtZW1zdGF0KCksXG4gICAgICAgIGNwdXM6IG9zLmNwdXMoKSxcbiAgICAgICAgYXJjaDogb3MuYXJjaCgpLFxuICAgICAgICBwbGF0Zm9ybTogb3MucGxhdGZvcm0oKSxcbiAgICAgICAgbG9hZGF2Zzogb3MubG9hZGF2ZygpXG4gICAgICB9LCBudWxsLCAnICAnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5leHQoKTtcbiAgICB9XG4gIH0pO1xuXG4gIGxldCBjaGVja2VkU2VxID0gJyc7XG5cbiAgYXBwLnVzZSgnL19jaGVja21haWwvOnNlcScsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIGxvZy5pbmZvKCdmb3JjZSBjaGVjayBtYWlsIGZvcjonLCByZXEucGFyYW1zLnNlcSk7XG4gICAgaWYgKGNoZWNrZWRTZXEgPT09IHJlcS5wYXJhbXMuc2VxKVxuICAgICAgcmV0dXJuO1xuICAgIGlmIChpc1BtMiAmJiAhaXNNYWluUHJvY2Vzcykge1xuICAgICAgcHJvY2Vzcy5zZW5kISh7XG4gICAgICAgIHR5cGUgOiAncHJvY2Vzczptc2cnLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgJ2NkLXNlcnZlcjpjaGVjayBtYWlsJzogcmVxLnBhcmFtcy5zZXEsXG4gICAgICAgICAgcGlkOiBwcm9jZXNzLnBpZFxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgaW1hcC5jaGVja01haWxGb3JVcGRhdGUoKTtcbiAgICB9XG4gIH0pO1xuXG4gIGFwcC51c2UoJy9fdGltZScsIChyZXEsIHJlcykgPT4ge1xuICAgIHJlcy5zZW5kKGdlbmVyYXRlVG9rZW4oKSk7XG4gIH0pO1xuXG5cbiAgY29uc3Qgcm91dGVyID0gYXBpLmV4cHJlc3MuUm91dGVyKCk7XG4gIHJvdXRlci5nZXQoJy9fZ2l0aGFzaCcsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHJlcy5zZXRIZWFkZXIoJ2NvbnRlbnQtdHlwZScsICd0ZXh0L3BsYWluJyk7XG4gICAgcmVzLnNlbmQoYXdhaXQgc3RyaW5naWZ5TGlzdEFsbFZlcnNpb25zKCkpO1xuICB9KTtcblxuICByb3V0ZXIucHV0PHtmaWxlOiBzdHJpbmcsIGhhc2g6IHN0cmluZ30+KCcvX2luc3RhbGwvOmZpbGUvOmhhc2gnLCBhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcblxuICAgIGlmIChyZXF1aXJlVG9rZW4gJiYgcmVxLnF1ZXJ5LndoaXNwZXIgIT09IGdlbmVyYXRlVG9rZW4oKSkge1xuICAgICAgcmVzLmhlYWRlcignQ29ubmVjdGlvbicsICdjbG9zZScpO1xuICAgICAgcmVzLnN0YXR1cyg0MDEpLnNlbmQoYFJFSkVDVCBmcm9tICR7b3MuaG9zdG5hbWUoKX0gcGlkOiAke3Byb2Nlc3MucGlkfTogTm90IGFsbG93ZWQgdG8gcHVzaCBhcnRpZmFjdCBpbiB0aGlzIGVudmlyb25tZW50LmApO1xuICAgICAgcmVxLnNvY2tldC5lbmQoKTtcbiAgICAgIHJlcy5jb25uZWN0aW9uLmVuZCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBleGlzdGluZyA9IGZpbGVzSGFzaC5nZXQocmVxLnBhcmFtcy5maWxlKTtcbiAgICBsb2cuaW5mbyhgJHtyZXEubWV0aG9kfSBbJHtvcy5ob3N0bmFtZX1dZmlsZTogJHtyZXEucGFyYW1zLmZpbGV9LCBoYXNoOiAke3JlcS5wYXJhbXMuaGFzaH0sXFxuZXhpc3RpbmcgZmlsZTogJHtleGlzdGluZyA/IGV4aXN0aW5nLmZpbGUgKyAnIC8gJyArIGV4aXN0aW5nLnNoYTI1NiA6ICc8Tk8+J31gICtcbiAgICAgIGBcXG4ke3V0aWwuaW5zcGVjdChyZXEuaGVhZGVycyl9YCk7XG5cbiAgICBpZiAocmVxdWlyZVRva2VuICYmIHJlcS5xdWVyeS53aGlzcGVyICE9PSBnZW5lcmF0ZVRva2VuKCkpIHtcbiAgICAgIHJlcy5oZWFkZXIoJ0Nvbm5lY3Rpb24nLCAnY2xvc2UnKTtcbiAgICAgIHJlcy5zdGF0dXMoNDAxKS5zZW5kKGBSRUpFQ1QgZnJvbSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06IE5vdCBhbGxvd2VkIHRvIHB1c2ggYXJ0aWZhY3QgaW4gdGhpcyBlbnZpcm9ubWVudC5gKTtcbiAgICAgIHJlcS5zb2NrZXQuZW5kKCk7XG4gICAgICByZXMuY29ubmVjdGlvbi5lbmQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsb2cuaW5mbygncmVjaWV2aW5nIGRhdGEnKTtcbiAgICBpZiAoaXNQbTIgJiYgIWlzTWFpblByb2Nlc3MpIHtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCA4MDApKTtcbiAgICB9XG4gICAgaWYgKGV4aXN0aW5nICYmIGV4aXN0aW5nLnNoYTI1NiA9PT0gcmVxLnBhcmFtcy5oYXNoKSB7XG4gICAgICAvLyBJIHdhbnQgdG8gY2FuY2VsIHJlY2lldmluZyByZXF1ZXN0IGJvZHkgYXNhcFxuICAgICAgLy8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTgzNjc4MjQvaG93LXRvLWNhbmNlbC1odHRwLXVwbG9hZC1mcm9tLWRhdGEtZXZlbnRzXG4gICAgICByZXMuaGVhZGVyKCdDb25uZWN0aW9uJywgJ2Nsb3NlJyk7XG4gICAgICByZXMuc3RhdHVzKDQwOSkuc2VuZChgW1JFSkVDVF0gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OmAgK1xuICAgICAgYC0gZm91bmQgZXhpc3Rpbmc6ICR7SlNPTi5zdHJpbmdpZnkoZXhpc3RpbmcsIG51bGwsICcgICcpfVxcbmAgK1xuICAgICAgYC0gaGFzaHM6XFxuICAke0pTT04uc3RyaW5naWZ5KGZpbGVzSGFzaCwgbnVsbCwgJyAgJyl9YCk7XG4gICAgICByZXEuc29ja2V0LmVuZCgpO1xuICAgICAgcmVzLmNvbm5lY3Rpb24uZW5kKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICBjb25zdCBuZXdDaGVja3N1bUl0ZW06IENoZWNrc3VtSXRlbSA9IHtcbiAgICAgIGZpbGU6IHJlcS5wYXJhbXMuZmlsZSxcbiAgICAgIHNoYTI1NjogcmVxLnBhcmFtcy5oYXNoLFxuICAgICAgY3JlYXRlZDogbm93LnRvTG9jYWxlU3RyaW5nKCksXG4gICAgICBjcmVhdGVkVGltZTogbm93LmdldFRpbWUoKVxuICAgIH07XG5cbiAgICBjb25zdCBjb250ZW50TGVuID0gcmVxLmhlYWRlcnNbJ2NvbnRlbnQtbGVuZ3RoJ107XG4gICAgLy8gY2hlY2tzdW0udmVyc2lvbnMhW3JlcS5wYXJhbXMuYXBwXSA9IHt2ZXJzaW9uOiBwYXJzZUludChyZXEucGFyYW1zLnZlcnNpb24sIDEwKX07XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHJlYWRSZXNwb25zZVRvQnVmZmVyKHJlcSwgcmVxLnBhcmFtcy5oYXNoLCBjb250ZW50TGVuID8gcGFyc2VJbnQoY29udGVudExlbiwgMTApIDogMTAgKiAxMDI0ICogMTAyNCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUubWVzc2FnZSA9PT0gJ3NoYTI1NiBub3QgbWF0Y2gnKSB7XG4gICAgICAgIHJlcy5zZW5kKGBbV0FSTl0gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiAke0pTT04uc3RyaW5naWZ5KG5ld0NoZWNrc3VtSXRlbSwgbnVsbCwgJyAgJyl9XFxuYCArXG4gICAgICAgICAgYFJlY2lldmVkIGZpbGUgaXMgY29ycnVwdGVkIHdpdGggaGFzaCAke2Uuc2hhMjU2fSxcXG53aGlsZSBleHBlY3RpbmcgZmlsZSBoYXNoIGlzICR7bmV3Q2hlY2tzdW1JdGVtLnNoYTI1Nn1gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlcy5zdGF0dXMoNTAwKTtcbiAgICAgICAgcmVzLnNlbmQoZS5zdGFjayk7XG4gICAgICB9XG4gICAgfVxuICAgIHJlcy5zZW5kKGBbQUNDRVBUXSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06ICR7SlNPTi5zdHJpbmdpZnkobmV3Q2hlY2tzdW1JdGVtLCBudWxsLCAnICAnKX1gKTtcbiAgICB3cml0ZUNoZWNrc3VtRmlsZShmaWxlc0hhc2gpO1xuICAgIGlmIChpc1BtMikge1xuICAgICAgY29uc3QgbXNnOiBQbTJQYWNrZXQgPSB7XG4gICAgICAgIHR5cGUgOiAncHJvY2Vzczptc2cnLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgJ2NkLXNlcnZlcjpjaGVja3N1bSB1cGRhdGluZyc6IG5ld0NoZWNrc3VtSXRlbSxcbiAgICAgICAgICBwaWQ6IHByb2Nlc3MucGlkXG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBwcm9jZXNzLnNlbmQhKG1zZyk7XG4gICAgfVxuICB9KTtcblxuXG4gIGFwcC51c2UoJy8nLCByb3V0ZXIpO1xuXG4gIGZ1bmN0aW9uIG9uWmlwRmlsZVdyaXR0ZW4oKSB7XG4gICAgaWYgKGlzUG0yICYmICFpc01haW5Qcm9jZXNzKSB7XG4gICAgICBjb25zdCBtc2c6IFBtMlBhY2tldCA9IHtcbiAgICAgICAgdHlwZSA6ICdwcm9jZXNzOm1zZycsXG4gICAgICAgIGRhdGE6IHtleHRyYWN0WmlwOiB0cnVlLCBwaWQ6IHByb2Nlc3MucGlkfVxuICAgICAgfTtcbiAgICAgIHByb2Nlc3Muc2VuZCEobXNnKTtcbiAgICB9IGVsc2VcbiAgICAgIHJldHJ5KDIsIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBpbml0UG0yKCkge1xuICAgIGNvbnN0IHBtMjogdHlwZW9mIF9wbTIgPSByZXF1aXJlKCdAZ3Jvd3RoL3BtMicpO1xuICAgIGNvbnN0IHBtMmNvbm5lY3QgPSB1dGlsLnByb21pc2lmeShwbTIuY29ubmVjdC5iaW5kKHBtMikpO1xuICAgIGNvbnN0IHBtMmxhdW5jaEJ1cyA9IHV0aWwucHJvbWlzaWZ5PFBtMkJ1cz4ocG0yLmxhdW5jaEJ1cy5iaW5kKHBtMikpO1xuXG4gICAgYXdhaXQgcG0yY29ubmVjdCgpO1xuICAgIGNvbnN0IGJ1cyA9IGF3YWl0IHBtMmxhdW5jaEJ1cygpO1xuICAgIGJ1cy5vbigncHJvY2Vzczptc2cnLCBwYWNrZXQgPT4ge1xuICAgICAgaWYgKCFwYWNrZXQuZGF0YSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCB1cGRhdGVkQ2hlY2tzdW1JdGVtID0gcGFja2V0LmRhdGFbJ2NkLXNlcnZlcjpjaGVja3N1bSB1cGRhdGluZyddO1xuICAgICAgaWYgKHVwZGF0ZWRDaGVja3N1bUl0ZW0gJiYgcGFja2V0LmRhdGEucGlkICE9PSBwcm9jZXNzLnBpZCkge1xuICAgICAgICBjb25zdCByZWNpZXZlZENoZWNrc3VtID0gdXBkYXRlZENoZWNrc3VtSXRlbTtcbiAgICAgICAgZmlsZXNIYXNoLnNldChyZWNpZXZlZENoZWNrc3VtLmZpbGUsIHJlY2lldmVkQ2hlY2tzdW0pO1xuICAgICAgICBsb2cuaW5mbygnT3RoZXIgcHJvY2VzcyByZWNpZXZlZCB1cGRhdGluZyBjaGVja3N1bSAlcyBmcm9tIGlkOiAlcycsXG4gICAgICAgICAgdXRpbC5pbnNwZWN0KHJlY2lldmVkQ2hlY2tzdW0pLCBfLmdldChwYWNrZXQsICdwcm9jZXNzLnBtX2lkJykpO1xuICAgICAgfVxuICAgICAgY29uc3QgY2hlY2tNYWlsUHJvcCA9IHBhY2tldC5kYXRhWydjZC1zZXJ2ZXI6Y2hlY2sgbWFpbCddO1xuICAgICAgaWYgKGNoZWNrTWFpbFByb3AgJiYgcGFja2V0LmRhdGEucGlkICE9PSBwcm9jZXNzLnBpZCkge1xuICAgICAgICBjaGVja2VkU2VxID0gY2hlY2tNYWlsUHJvcDtcbiAgICAgICAgbG9nLmluZm8oJ090aGVyIHByb2Nlc3MgdHJpZ2dlcnMgXCJjaGVjayBtYWlsXCIgZnJvbSBpZDonLCBfLmdldChwYWNrZXQsICdwcm9jZXNzLnBtX2lkJykpO1xuICAgICAgICAvLyBpbWFwLmNoZWNrTWFpbEZvclVwZGF0ZSgpO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFja2V0LmRhdGEuZXh0cmFjdFppcCAmJiBwYWNrZXQuZGF0YS5waWQgIT09IHByb2Nlc3MucGlkKSB7XG4gICAgICAgIGxvZy5pbmZvKCdPdGhlciBwcm9jZXNzIHRyaWdnZXJzIFwiZXh0cmFjdFppcFwiIGZyb20gaWQ6JywgXy5nZXQocGFja2V0LCAncHJvY2Vzcy5wbV9pZCcpKTtcbiAgICAgICAgcmV0cnkoMiwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVUb2tlbigpIHtcbiAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IHRva2VuID0gZGF0ZS5nZXREYXRlKCkgKyAnJyArIGRhdGUuZ2V0SG91cnMoKTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKHRva2VuKTtcbiAgcmV0dXJuIHRva2VuO1xufVxuXG5mdW5jdGlvbiByZWFkUmVzcG9uc2VUb0J1ZmZlcihyZXE6IFJlcXVlc3Q8e2ZpbGU6IHN0cmluZywgaGFzaDogc3RyaW5nfT4sIGV4cGVjdFNoYTI1Njogc3RyaW5nLCBsZW5ndGg6IG51bWJlcilcbiAgOiBQcm9taXNlPHtoYXNoOiBzdHJpbmcsIGNvbnRlbnQ6IEJ1ZmZlcn0+IHtcbiAgbGV0IGNvdW50Qnl0ZXMgPSAwO1xuXG4gIGxldCBoYXNoOiBIYXNoO1xuICBsZXQgaGFzaERvbmU6IFByb21pc2U8c3RyaW5nPjtcblxuICByZXEub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PiB7XG4gICAgY291bnRCeXRlcyArPSBkYXRhLmJ5dGVMZW5ndGg7XG4gICAgbG9nLmluZm8oYFJlY2lldmluZywgJHtjb3VudEJ5dGVzfSBieXRlc2ApO1xuICAgIGlmIChoYXNoID09IG51bGwpIHtcbiAgICAgIGhhc2ggPSBjcnlwdG8uY3JlYXRlSGFzaCgnc2hhMjU2Jyk7XG4gICAgICBoYXNoRG9uZSA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICBoYXNoLm9uKCdyZWFkYWJsZScsICgpID0+IHtcbiAgICAgICAgICBjb25zdCBkYXRhID0gaGFzaC5yZWFkKCk7XG4gICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgIHJlc29sdmUoZGF0YS50b1N0cmluZygnaGV4JykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgaGFzaC53cml0ZShkYXRhKTtcblxuICAgIC8vIGlmIChmd3JpdGVyID09IG51bGwpIHtcbiAgICAvLyAgIGxldCBmaWxlQmFzZU5hbWUgPSBQYXRoLmJhc2VuYW1lKHJlcS5wYXJhbXMuZmlsZSk7XG4gICAgLy8gICBjb25zdCBkb3QgPSBmaWxlQmFzZU5hbWUubGFzdEluZGV4T2YoJy4nKTtcbiAgICAvLyAgIGlmIChkb3QgPj0wIClcbiAgICAvLyAgICAgZmlsZUJhc2VOYW1lID0gZmlsZUJhc2VOYW1lLnNsaWNlKDAsIGRvdCk7XG4gICAgLy8gICB3cml0aW5nRmlsZSA9IFBhdGgucmVzb2x2ZSh6aXBEb3dubG9hZERpciwgYCR7ZmlsZUJhc2VOYW1lLnNsaWNlKDAsIGZpbGVCYXNlTmFtZS5sYXN0SW5kZXhPZignLicpKX0uJHtwcm9jZXNzLnBpZH0uemlwYCk7XG4gICAgLy8gICBmcy5ta2RpcnBTeW5jKFBhdGguZGlybmFtZSh3cml0aW5nRmlsZSkpO1xuICAgIC8vICAgZndyaXRlciA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKHdyaXRpbmdGaWxlKTtcbiAgICAvLyB9XG4gICAgLy8gZndyaXRlci53cml0ZShkYXRhKTtcbiAgfSk7XG4gIHJlcS5vbignZW5kJywgYXN5bmMgKCkgPT4ge1xuICAgIGxvZy5pbmZvKGBUb3RhbCByZWNpZXZlZCAke2NvdW50Qnl0ZXN9IGJ5dGVzYCk7XG4gICAgbGV0IHNoYTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIGlmIChoYXNoKSB7XG4gICAgICBoYXNoLmVuZCgpO1xuICAgICAgc2hhID0gYXdhaXQgaGFzaERvbmU7XG4gICAgfVxuICAgIGlmIChzaGEgIT09IGV4cGVjdFNoYTI1Nikge1xuICAgICAgY29uc3QgZXJyID0gbmV3IEVycm9yKCdzaGEyNTYgbm90IG1hdGNoJyk7XG4gICAgICAoZXJyIGFzIGFueSkuc2hhMjU2ID0gc2hhO1xuICAgICAgLy8gVE9ETzpcbiAgICAgIC8vIHJlcy5zZW5kKGBbV0FSTl0gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiAke0pTT04uc3RyaW5naWZ5KG5ld0NoZWNrc3VtSXRlbSwgbnVsbCwgJyAgJyl9XFxuYCArXG4gICAgICAvLyAgIGBSZWNpZXZlZCBmaWxlIGlzIGNvcnJ1cHRlZCB3aXRoIGhhc2ggJHtzaGF9LFxcbndoaWxlIGV4cGVjdGluZyBmaWxlIGhhc2ggaXMgJHtuZXdDaGVja3N1bUl0ZW0uc2hhMjU2fWApO1xuICAgICAgLy8gZndyaXRlciEuZW5kKG9uWmlwRmlsZVdyaXR0ZW4pO1xuICAgICAgLy8gZndyaXRlciA9IHVuZGVmaW5lZDtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG5cbiAgICAvLyBmd3JpdGVyIS5lbmQob25aaXBGaWxlV3JpdHRlbik7XG4gICAgLy8gZndyaXRlciA9IHVuZGVmaW5lZDtcbiAgICAvLyByZXMuc2VuZChgW0FDQ0VQVF0gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiAke0pTT04uc3RyaW5naWZ5KG5ld0NoZWNrc3VtSXRlbSwgbnVsbCwgJyAgJyl9YCk7XG5cbiAgICAvLyBmaWxlc0hhc2guc2V0KG5ld0NoZWNrc3VtSXRlbS5maWxlLCBuZXdDaGVja3N1bUl0ZW0pO1xuICAgIC8vIHdyaXRlQ2hlY2tzdW1GaWxlKGZpbGVzSGFzaCk7XG4gICAgLy8gaWYgKGlzUG0yKSB7XG4gICAgLy8gICBjb25zdCBtc2c6IFBtMlBhY2tldCA9IHtcbiAgICAvLyAgICAgdHlwZSA6ICdwcm9jZXNzOm1zZycsXG4gICAgLy8gICAgIGRhdGE6IHtcbiAgICAvLyAgICAgICAnY2Qtc2VydmVyOmNoZWNrc3VtIHVwZGF0aW5nJzogbmV3Q2hlY2tzdW1JdGVtLFxuICAgIC8vICAgICAgIHBpZDogcHJvY2Vzcy5waWRcbiAgICAvLyAgICAgfVxuICAgIC8vICAgfTtcbiAgICAvLyAgIHByb2Nlc3Muc2VuZCEobXNnKTtcbiAgICAvLyB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiByZWFkQ2hlY2tzdW1GaWxlKCk6IE1hcDxzdHJpbmcsIENoZWNrc3VtSXRlbT4ge1xuICBjb25zdCBlbnYgPSBtYWlsU2V0dGluZyA/IG1haWxTZXR0aW5nLmVudiA6ICdsb2NhbCc7XG4gIGNvbnN0IGNoZWNrc3VtRmlsZSA9IFBhdGgucmVzb2x2ZSgnY2hlY2tzdW0uJyArIGVudiArICcuanNvbicpO1xuICBsZXQgY2hlY2tzdW06IENoZWNrc3VtO1xuICBpZiAoZnMuZXhpc3RzU3luYyhjaGVja3N1bUZpbGUpKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNoZWNrc3VtID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoY2hlY2tzdW1GaWxlLCAndXRmOCcpKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsb2cud2FybihlKTtcbiAgICAgIGNoZWNrc3VtID0gW107XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGNoZWNrc3VtID0gW107XG4gIH1cbiAgcmV0dXJuIGNoZWNrc3VtLnJlZHVjZSgobWFwLCB2YWwpID0+IG1hcC5zZXQodmFsLmZpbGUsIHZhbCksIG5ldyBNYXA8c3RyaW5nLCBDaGVja3N1bUl0ZW0+KCkpO1xufVxuXG5mdW5jdGlvbiB3cml0ZUNoZWNrc3VtRmlsZShjaGVja3N1bTogUmV0dXJuVHlwZTx0eXBlb2YgcmVhZENoZWNrc3VtRmlsZT4pIHtcbiAgY29uc3QgZW52ID0gbWFpbFNldHRpbmcgPyBtYWlsU2V0dGluZy5lbnYgOiAnbG9jYWwnO1xuICBmcy53cml0ZUZpbGUoUGF0aC5yZXNvbHZlKCdjaGVja3N1bS4nICsgZW52ICsgJy5qc29uJyksIEpTT04uc3RyaW5naWZ5KEFycmF5LmZyb20oY2hlY2tzdW0udmFsdWVzKCkpLCBudWxsLCAnICAnKSwgKGVycikgPT4ge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIGxvZy5lcnJvcihlcnIpO1xuICAgIH1cbiAgfSk7XG59XG4iXX0=
