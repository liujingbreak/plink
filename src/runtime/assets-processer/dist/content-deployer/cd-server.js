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
const log = require('log4js').getLogger(__api_1.default.packageName + '.cd-server');
const requireToken = __api_1.default.config.get([__api_1.default.packageName, 'requireToken'], false);
const mailSetting = __api_1.default.config.get(__api_1.default.packageName).fetchMailServer;
function activate(app, imap) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
            let recieved;
            // checksum.versions![req.params.app] = {version: parseInt(req.params.version, 10)};
            try {
                recieved = yield readResponseToBuffer(req, req.params.hash, contentLen ? parseInt(contentLen, 10) : 10 * 1024 * 1024);
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
            let fileBaseName = path_1.default.basename(req.params.file);
            const dot = fileBaseName.lastIndexOf('.');
            if (dot >= 0)
                fileBaseName = fileBaseName.slice(0, dot);
            writingFile = path_1.default.resolve(fetch_remote_1.zipDownloadDir, `${fileBaseName.slice(0, fileBaseName.lastIndexOf('.'))}.${process.pid}.zip`);
            fs_extra_1.default.mkdirpSync(path_1.default.dirname(writingFile));
            fs_extra_1.default.writeFile(writingFile, recieved.content, onZipFileWritten);
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
    // let countBytes = 0;
    let hash;
    let hashDone;
    const buf = Buffer.alloc(length);
    let bufOffset = 0;
    req.on('data', (data) => {
        bufOffset += data.copy(buf, bufOffset, 0);
        log.debug(`Recieving, ${bufOffset} bytes`);
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
    return new Promise((resolve, rej) => {
        req.on('end', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
            log.info(`Total recieved ${bufOffset} bytes`);
            if (bufOffset > length) {
                return rej(new Error(`Recieved data length ${bufOffset} is greater than expecred content length ${length}`));
            }
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
                return rej(err);
            }
            resolve({
                hash: sha,
                content: buf.slice(0, bufOffset),
                length: bufOffset
            });
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
    });
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2NvbnRlbnQtZGVwbG95ZXIvY2Qtc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG9EQUFvQjtBQUVwQixtREFBNkI7QUFFN0Isa0RBQXlGO0FBQ3pGLHdEQUF3QjtBQUV4QixnRUFBMEI7QUFDMUIsNERBQXVCO0FBQ3ZCLGlHQUErRDtBQUMvRCw0REFBb0M7QUFDcEMsMERBQXdCO0FBQ3hCLDJEQUFxRTtBQUVyRSxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsWUFBWSxDQUFDLENBQUM7QUFzQnhFLE1BQU0sWUFBWSxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsZUFBRyxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUM5RSxNQUFNLFdBQVcsR0FBSSxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUEwQixDQUFDLGVBQWUsQ0FBQztBQUc5RixTQUFzQixRQUFRLENBQUMsR0FBZ0IsRUFBRSxJQUFpQjs7UUFDaEUsSUFBSSxXQUErQixDQUFDO1FBRXBDLElBQUksU0FBUyxHQUFHLGdCQUFnQixFQUFFLENBQUM7UUFFbkMsTUFBTSxFQUFDLEtBQUssRUFBRSxhQUFhLEVBQUMsR0FBRyx5QkFBVSxFQUFFLENBQUM7UUFDNUMsSUFBSSxLQUFLLEVBQUU7WUFDVCxPQUFPLEVBQUUsQ0FBQztTQUNYO1FBRUQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLFlBQUUsQ0FBQyxRQUFRLElBQUksT0FBTyxDQUFDLEdBQUcsWUFBWSxFQUFFLElBQUksSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFFbkYsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBTyxHQUFHLEVB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LElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsRUFBd0IsQ0FBQyxDQUFDO0FBQ2hHLENBQUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLFFBQTZDO0lBQ3RFLE1BQU0sR0FBRyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQ3BELGtCQUFFLENBQUMsU0FBUyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxHQUFHLEdBQUcsR0FBRyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7UUFDekgsSUFBSSxHQUFHLEVBQUU7WUFDUCxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ2hCO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvY29udGVudC1kZXBsb3llci9jZC1zZXJ2ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0FwcGxpY2F0aW9uLCBSZXF1ZXN0fSBmcm9tICdleHByZXNzJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQge0NoZWNrc3VtLCBXaXRoTWFpbFNlcnZlckNvbmZpZ30gZnJvbSAnLi4vZmV0Y2gtdHlwZXMnO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICd1dGlsJztcbmltcG9ydCBfcG0yIGZyb20gJ0Bncm93dGgvcG0yJztcbmltcG9ydCB7Z2V0UG0ySW5mbywgemlwRG93bmxvYWREaXIsIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCwgcmV0cnl9IGZyb20gJy4uL2ZldGNoLXJlbW90ZSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7SW1hcE1hbmFnZXJ9IGZyb20gJy4uL2ZldGNoLXJlbW90ZS1pbWFwJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IG1lbXN0YXQgZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3V0aWxzL21lbS1zdGF0cyc7XG5pbXBvcnQgY3J5cHRvLCB7SGFzaH0gZnJvbSAnY3J5cHRvJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHtzdHJpbmdpZnlMaXN0QWxsVmVyc2lvbnN9IGZyb20gJ0Biay9wcmVidWlsZC9kaXN0L2FydGlmYWN0cyc7XG5cbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmNkLXNlcnZlcicpO1xuXG5pbnRlcmZhY2UgUG0yUGFja2V0IHtcbiAgdHlwZTogJ3Byb2Nlc3M6bXNnJztcbiAgZGF0YToge1xuICAgIHBpZDogbnVtYmVyO1xuICAgICdjZC1zZXJ2ZXI6Y2hlY2tzdW0gdXBkYXRpbmcnPzogQ2hlY2tzdW1JdGVtO1xuICAgICdjZC1zZXJ2ZXI6Y2hlY2sgbWFpbCc/OiBzdHJpbmc7XG4gICAgZXh0cmFjdFppcD86IGJvb2xlYW47XG4gIH07XG59XG5cbmludGVyZmFjZSBQbTJCdXMge1xuICBvbihldmVudDogJ3Byb2Nlc3M6bXNnJywgY2I6IChwYWNrZXQ6IFBtMlBhY2tldCkgPT4gdm9pZCk6IHZvaWQ7XG59XG5cbnR5cGUgQ2hlY2tzdW1JdGVtID0gQ2hlY2tzdW0gZXh0ZW5kcyBBcnJheTxpbmZlciBJPiA/IEkgOiB1bmtub3duO1xuXG5pbnRlcmZhY2UgUmVjaWV2ZWREYXRhIHtcbiAgaGFzaD86IHN0cmluZzsgY29udGVudDogQnVmZmVyOyBsZW5ndGg6IG51bWJlcjtcbn1cblxuY29uc3QgcmVxdWlyZVRva2VuID0gYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ3JlcXVpcmVUb2tlbiddLCBmYWxzZSk7XG5jb25zdCBtYWlsU2V0dGluZyA9IChhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpIGFzIFdpdGhNYWlsU2VydmVyQ29uZmlnKS5mZXRjaE1haWxTZXJ2ZXI7XG5cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFjdGl2YXRlKGFwcDogQXBwbGljYXRpb24sIGltYXA6IEltYXBNYW5hZ2VyKSB7XG4gIGxldCB3cml0aW5nRmlsZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIGxldCBmaWxlc0hhc2ggPSByZWFkQ2hlY2tzdW1GaWxlKCk7XG5cbiAgY29uc3Qge2lzUG0yLCBpc01haW5Qcm9jZXNzfSA9IGdldFBtMkluZm8oKTtcbiAgaWYgKGlzUG0yKSB7XG4gICAgaW5pdFBtMigpO1xuICB9XG5cbiAgaW1hcC5hcHBlbmRNYWlsKGBzZXJ2ZXIgJHtvcy5ob3N0bmFtZX0gJHtwcm9jZXNzLnBpZH0gYWN0aXZhdGVzYCwgbmV3IERhdGUoKSArICcnKTtcblxuICBhcHAudXNlKCcvX3N0YXQnLCBhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICBpZiAocmVxdWlyZVRva2VuICYmIHJlcS5xdWVyeS53aGlzcGVyICE9PSBnZW5lcmF0ZVRva2VuKCkpIHtcbiAgICAgIHJlcy5oZWFkZXIoJ0Nvbm5lY3Rpb24nLCAnY2xvc2UnKTtcbiAgICAgIHJlcy5zdGF0dXMoNDAxKS5zZW5kKGBSRUpFQ1QgZnJvbSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06IE5vdCBhbGxvd2VkIHRvIHB1c2ggYXJ0aWZhY3QgaW4gdGhpcyBlbnZpcm9ubWVudC5gKTtcbiAgICAgIHJlcS5zb2NrZXQuZW5kKCk7XG4gICAgICByZXMuY29ubmVjdGlvbi5lbmQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cblxuICAgIGlmIChyZXEubWV0aG9kID09PSAnR0VUJyAmJiAvXlxcL19zdGF0KFsjPy9dfCQpLy50ZXN0KHJlcS5vcmlnaW5hbFVybCkpIHtcbiAgICAgIHJlcy5jb250ZW50VHlwZSgnanNvbicpO1xuICAgICAgcmVzLnNlbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBpc01haW5Qcm9jZXNzLFxuICAgICAgICBmaWxlc0hhc2g6IEFycmF5LmZyb20oZmlsZXNIYXNoLnZhbHVlcygpKSxcbiAgICAgICAgaXNfcG0yX3NsYXZlOiBpc1BtMixcbiAgICAgICAgaG9zdG5hbWU6IG9zLmhvc3RuYW1lKCksXG4gICAgICAgIHBpZDogcHJvY2Vzcy5waWQsXG4gICAgICAgIG1lbTogbWVtc3RhdCgpLFxuICAgICAgICBjcHVzOiBvcy5jcHVzKCksXG4gICAgICAgIGFyY2g6IG9zLmFyY2goKSxcbiAgICAgICAgcGxhdGZvcm06IG9zLnBsYXRmb3JtKCksXG4gICAgICAgIGxvYWRhdmc6IG9zLmxvYWRhdmcoKVxuICAgICAgfSwgbnVsbCwgJyAgJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuZXh0KCk7XG4gICAgfVxuICB9KTtcblxuICBsZXQgY2hlY2tlZFNlcSA9ICcnO1xuXG4gIGFwcC51c2UoJy9fY2hlY2ttYWlsLzpzZXEnLCAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICBsb2cuaW5mbygnZm9yY2UgY2hlY2sgbWFpbCBmb3I6JywgcmVxLnBhcmFtcy5zZXEpO1xuICAgIGlmIChjaGVja2VkU2VxID09PSByZXEucGFyYW1zLnNlcSlcbiAgICAgIHJldHVybjtcbiAgICBpZiAoaXNQbTIgJiYgIWlzTWFpblByb2Nlc3MpIHtcbiAgICAgIHByb2Nlc3Muc2VuZCEoe1xuICAgICAgICB0eXBlIDogJ3Byb2Nlc3M6bXNnJyxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICdjZC1zZXJ2ZXI6Y2hlY2sgbWFpbCc6IHJlcS5wYXJhbXMuc2VxLFxuICAgICAgICAgIHBpZDogcHJvY2Vzcy5waWRcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGltYXAuY2hlY2tNYWlsRm9yVXBkYXRlKCk7XG4gICAgfVxuICB9KTtcblxuICBhcHAudXNlKCcvX3RpbWUnLCAocmVxLCByZXMpID0+IHtcbiAgICByZXMuc2VuZChnZW5lcmF0ZVRva2VuKCkpO1xuICB9KTtcblxuXG4gIGNvbnN0IHJvdXRlciA9IGFwaS5leHByZXNzLlJvdXRlcigpO1xuICByb3V0ZXIuZ2V0KCcvX2dpdGhhc2gnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICByZXMuc2V0SGVhZGVyKCdjb250ZW50LXR5cGUnLCAndGV4dC9wbGFpbicpO1xuICAgIHJlcy5zZW5kKGF3YWl0IHN0cmluZ2lmeUxpc3RBbGxWZXJzaW9ucygpKTtcbiAgfSk7XG5cbiAgcm91dGVyLnB1dDx7ZmlsZTogc3RyaW5nLCBoYXNoOiBzdHJpbmd9PignL19pbnN0YWxsLzpmaWxlLzpoYXNoJywgYXN5bmMgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG5cbiAgICBpZiAocmVxdWlyZVRva2VuICYmIHJlcS5xdWVyeS53aGlzcGVyICE9PSBnZW5lcmF0ZVRva2VuKCkpIHtcbiAgICAgIHJlcy5oZWFkZXIoJ0Nvbm5lY3Rpb24nLCAnY2xvc2UnKTtcbiAgICAgIHJlcy5zdGF0dXMoNDAxKS5zZW5kKGBSRUpFQ1QgZnJvbSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06IE5vdCBhbGxvd2VkIHRvIHB1c2ggYXJ0aWZhY3QgaW4gdGhpcyBlbnZpcm9ubWVudC5gKTtcbiAgICAgIHJlcS5zb2NrZXQuZW5kKCk7XG4gICAgICByZXMuY29ubmVjdGlvbi5lbmQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgZXhpc3RpbmcgPSBmaWxlc0hhc2guZ2V0KHJlcS5wYXJhbXMuZmlsZSk7XG4gICAgbG9nLmluZm8oYCR7cmVxLm1ldGhvZH0gWyR7b3MuaG9zdG5hbWV9XWZpbGU6ICR7cmVxLnBhcmFtcy5maWxlfSwgaGFzaDogJHtyZXEucGFyYW1zLmhhc2h9LFxcbmV4aXN0aW5nIGZpbGU6ICR7ZXhpc3RpbmcgPyBleGlzdGluZy5maWxlICsgJyAvICcgKyBleGlzdGluZy5zaGEyNTYgOiAnPE5PPid9YCArXG4gICAgICBgXFxuJHt1dGlsLmluc3BlY3QocmVxLmhlYWRlcnMpfWApO1xuXG4gICAgaWYgKHJlcXVpcmVUb2tlbiAmJiByZXEucXVlcnkud2hpc3BlciAhPT0gZ2VuZXJhdGVUb2tlbigpKSB7XG4gICAgICByZXMuaGVhZGVyKCdDb25uZWN0aW9uJywgJ2Nsb3NlJyk7XG4gICAgICByZXMuc3RhdHVzKDQwMSkuc2VuZChgUkVKRUNUIGZyb20gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiBOb3QgYWxsb3dlZCB0byBwdXNoIGFydGlmYWN0IGluIHRoaXMgZW52aXJvbm1lbnQuYCk7XG4gICAgICByZXEuc29ja2V0LmVuZCgpO1xuICAgICAgcmVzLmNvbm5lY3Rpb24uZW5kKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbG9nLmluZm8oJ3JlY2lldmluZyBkYXRhJyk7XG4gICAgaWYgKGlzUG0yICYmICFpc01haW5Qcm9jZXNzKSB7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgODAwKSk7XG4gICAgfVxuICAgIGlmIChleGlzdGluZyAmJiBleGlzdGluZy5zaGEyNTYgPT09IHJlcS5wYXJhbXMuaGFzaCkge1xuICAgICAgLy8gSSB3YW50IHRvIGNhbmNlbCByZWNpZXZpbmcgcmVxdWVzdCBib2R5IGFzYXBcbiAgICAgIC8vIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE4MzY3ODI0L2hvdy10by1jYW5jZWwtaHR0cC11cGxvYWQtZnJvbS1kYXRhLWV2ZW50c1xuICAgICAgcmVzLmhlYWRlcignQ29ubmVjdGlvbicsICdjbG9zZScpO1xuICAgICAgcmVzLnN0YXR1cyg0MDkpLnNlbmQoYFtSRUpFQ1RdICR7b3MuaG9zdG5hbWUoKX0gcGlkOiAke3Byb2Nlc3MucGlkfTpgICtcbiAgICAgIGAtIGZvdW5kIGV4aXN0aW5nOiAke0pTT04uc3RyaW5naWZ5KGV4aXN0aW5nLCBudWxsLCAnICAnKX1cXG5gICtcbiAgICAgIGAtIGhhc2hzOlxcbiAgJHtKU09OLnN0cmluZ2lmeShmaWxlc0hhc2gsIG51bGwsICcgICcpfWApO1xuICAgICAgcmVxLnNvY2tldC5lbmQoKTtcbiAgICAgIHJlcy5jb25uZWN0aW9uLmVuZCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgY29uc3QgbmV3Q2hlY2tzdW1JdGVtOiBDaGVja3N1bUl0ZW0gPSB7XG4gICAgICBmaWxlOiByZXEucGFyYW1zLmZpbGUsXG4gICAgICBzaGEyNTY6IHJlcS5wYXJhbXMuaGFzaCxcbiAgICAgIGNyZWF0ZWQ6IG5vdy50b0xvY2FsZVN0cmluZygpLFxuICAgICAgY3JlYXRlZFRpbWU6IG5vdy5nZXRUaW1lKClcbiAgICB9O1xuXG4gICAgY29uc3QgY29udGVudExlbiA9IHJlcS5oZWFkZXJzWydjb250ZW50LWxlbmd0aCddO1xuICAgIGxldCByZWNpZXZlZDogUmVjaWV2ZWREYXRhO1xuICAgIC8vIGNoZWNrc3VtLnZlcnNpb25zIVtyZXEucGFyYW1zLmFwcF0gPSB7dmVyc2lvbjogcGFyc2VJbnQocmVxLnBhcmFtcy52ZXJzaW9uLCAxMCl9O1xuICAgIHRyeSB7XG4gICAgICByZWNpZXZlZCA9IGF3YWl0IHJlYWRSZXNwb25zZVRvQnVmZmVyKHJlcSwgcmVxLnBhcmFtcy5oYXNoLCBjb250ZW50TGVuID8gcGFyc2VJbnQoY29udGVudExlbiwgMTApIDogMTAgKiAxMDI0ICogMTAyNCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUubWVzc2FnZSA9PT0gJ3NoYTI1NiBub3QgbWF0Y2gnKSB7XG4gICAgICAgIHJlcy5zZW5kKGBbV0FSTl0gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiAke0pTT04uc3RyaW5naWZ5KG5ld0NoZWNrc3VtSXRlbSwgbnVsbCwgJyAgJyl9XFxuYCArXG4gICAgICAgICAgYFJlY2lldmVkIGZpbGUgaXMgY29ycnVwdGVkIHdpdGggaGFzaCAke2Uuc2hhMjU2fSxcXG53aGlsZSBleHBlY3RpbmcgZmlsZSBoYXNoIGlzICR7bmV3Q2hlY2tzdW1JdGVtLnNoYTI1Nn1gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlcy5zdGF0dXMoNTAwKTtcbiAgICAgICAgcmVzLnNlbmQoZS5zdGFjayk7XG4gICAgICB9XG4gICAgfVxuICAgIHJlcy5zZW5kKGBbQUNDRVBUXSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06ICR7SlNPTi5zdHJpbmdpZnkobmV3Q2hlY2tzdW1JdGVtLCBudWxsLCAnICAnKX1gKTtcblxuICAgIGxldCBmaWxlQmFzZU5hbWUgPSBQYXRoLmJhc2VuYW1lKHJlcS5wYXJhbXMuZmlsZSk7XG4gICAgY29uc3QgZG90ID0gZmlsZUJhc2VOYW1lLmxhc3RJbmRleE9mKCcuJyk7XG4gICAgaWYgKGRvdCA+PTAgKVxuICAgICAgZmlsZUJhc2VOYW1lID0gZmlsZUJhc2VOYW1lLnNsaWNlKDAsIGRvdCk7XG4gICAgd3JpdGluZ0ZpbGUgPSBQYXRoLnJlc29sdmUoemlwRG93bmxvYWREaXIsIGAke2ZpbGVCYXNlTmFtZS5zbGljZSgwLCBmaWxlQmFzZU5hbWUubGFzdEluZGV4T2YoJy4nKSl9LiR7cHJvY2Vzcy5waWR9LnppcGApO1xuICAgIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKHdyaXRpbmdGaWxlKSk7XG4gICAgZnMud3JpdGVGaWxlKHdyaXRpbmdGaWxlLCByZWNpZXZlZCEuY29udGVudCwgb25aaXBGaWxlV3JpdHRlbik7XG4gICAgZmlsZXNIYXNoLnNldChuZXdDaGVja3N1bUl0ZW0uZmlsZSwgbmV3Q2hlY2tzdW1JdGVtKTtcbiAgICB3cml0ZUNoZWNrc3VtRmlsZShmaWxlc0hhc2gpO1xuICAgIGlmIChpc1BtMikge1xuICAgICAgY29uc3QgbXNnOiBQbTJQYWNrZXQgPSB7XG4gICAgICAgIHR5cGUgOiAncHJvY2Vzczptc2cnLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgJ2NkLXNlcnZlcjpjaGVja3N1bSB1cGRhdGluZyc6IG5ld0NoZWNrc3VtSXRlbSxcbiAgICAgICAgICBwaWQ6IHByb2Nlc3MucGlkXG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBwcm9jZXNzLnNlbmQhKG1zZyk7XG4gICAgfVxuICB9KTtcblxuXG4gIGFwcC51c2UoJy8nLCByb3V0ZXIpO1xuXG4gIGZ1bmN0aW9uIG9uWmlwRmlsZVdyaXR0ZW4oKSB7XG4gICAgaWYgKGlzUG0yICYmICFpc01haW5Qcm9jZXNzKSB7XG4gICAgICBjb25zdCBtc2c6IFBtMlBhY2tldCA9IHtcbiAgICAgICAgdHlwZSA6ICdwcm9jZXNzOm1zZycsXG4gICAgICAgIGRhdGE6IHtleHRyYWN0WmlwOiB0cnVlLCBwaWQ6IHByb2Nlc3MucGlkfVxuICAgICAgfTtcbiAgICAgIHByb2Nlc3Muc2VuZCEobXNnKTtcbiAgICB9IGVsc2VcbiAgICAgIHJldHJ5KDIsIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBpbml0UG0yKCkge1xuICAgIGNvbnN0IHBtMjogdHlwZW9mIF9wbTIgPSByZXF1aXJlKCdAZ3Jvd3RoL3BtMicpO1xuICAgIGNvbnN0IHBtMmNvbm5lY3QgPSB1dGlsLnByb21pc2lmeShwbTIuY29ubmVjdC5iaW5kKHBtMikpO1xuICAgIGNvbnN0IHBtMmxhdW5jaEJ1cyA9IHV0aWwucHJvbWlzaWZ5PFBtMkJ1cz4ocG0yLmxhdW5jaEJ1cy5iaW5kKHBtMikpO1xuXG4gICAgYXdhaXQgcG0yY29ubmVjdCgpO1xuICAgIGNvbnN0IGJ1cyA9IGF3YWl0IHBtMmxhdW5jaEJ1cygpO1xuICAgIGJ1cy5vbigncHJvY2Vzczptc2cnLCBwYWNrZXQgPT4ge1xuICAgICAgaWYgKCFwYWNrZXQuZGF0YSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCB1cGRhdGVkQ2hlY2tzdW1JdGVtID0gcGFja2V0LmRhdGFbJ2NkLXNlcnZlcjpjaGVja3N1bSB1cGRhdGluZyddO1xuICAgICAgaWYgKHVwZGF0ZWRDaGVja3N1bUl0ZW0gJiYgcGFja2V0LmRhdGEucGlkICE9PSBwcm9jZXNzLnBpZCkge1xuICAgICAgICBjb25zdCByZWNpZXZlZENoZWNrc3VtID0gdXBkYXRlZENoZWNrc3VtSXRlbTtcbiAgICAgICAgZmlsZXNIYXNoLnNldChyZWNpZXZlZENoZWNrc3VtLmZpbGUsIHJlY2lldmVkQ2hlY2tzdW0pO1xuICAgICAgICBsb2cuaW5mbygnT3RoZXIgcHJvY2VzcyByZWNpZXZlZCB1cGRhdGluZyBjaGVja3N1bSAlcyBmcm9tIGlkOiAlcycsXG4gICAgICAgICAgdXRpbC5pbnNwZWN0KHJlY2lldmVkQ2hlY2tzdW0pLCBfLmdldChwYWNrZXQsICdwcm9jZXNzLnBtX2lkJykpO1xuICAgICAgfVxuICAgICAgY29uc3QgY2hlY2tNYWlsUHJvcCA9IHBhY2tldC5kYXRhWydjZC1zZXJ2ZXI6Y2hlY2sgbWFpbCddO1xuICAgICAgaWYgKGNoZWNrTWFpbFByb3AgJiYgcGFja2V0LmRhdGEucGlkICE9PSBwcm9jZXNzLnBpZCkge1xuICAgICAgICBjaGVja2VkU2VxID0gY2hlY2tNYWlsUHJvcDtcbiAgICAgICAgbG9nLmluZm8oJ090aGVyIHByb2Nlc3MgdHJpZ2dlcnMgXCJjaGVjayBtYWlsXCIgZnJvbSBpZDonLCBfLmdldChwYWNrZXQsICdwcm9jZXNzLnBtX2lkJykpO1xuICAgICAgICAvLyBpbWFwLmNoZWNrTWFpbEZvclVwZGF0ZSgpO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFja2V0LmRhdGEuZXh0cmFjdFppcCAmJiBwYWNrZXQuZGF0YS5waWQgIT09IHByb2Nlc3MucGlkKSB7XG4gICAgICAgIGxvZy5pbmZvKCdPdGhlciBwcm9jZXNzIHRyaWdnZXJzIFwiZXh0cmFjdFppcFwiIGZyb20gaWQ6JywgXy5nZXQocGFja2V0LCAncHJvY2Vzcy5wbV9pZCcpKTtcbiAgICAgICAgcmV0cnkoMiwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVUb2tlbigpIHtcbiAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IHRva2VuID0gZGF0ZS5nZXREYXRlKCkgKyAnJyArIGRhdGUuZ2V0SG91cnMoKTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKHRva2VuKTtcbiAgcmV0dXJuIHRva2VuO1xufVxuXG5mdW5jdGlvbiByZWFkUmVzcG9uc2VUb0J1ZmZlcihyZXE6IFJlcXVlc3Q8e2ZpbGU6IHN0cmluZywgaGFzaDogc3RyaW5nfT4sIGV4cGVjdFNoYTI1Njogc3RyaW5nLCBsZW5ndGg6IG51bWJlcilcbiAgOiBQcm9taXNlPFJlY2lldmVkRGF0YT4ge1xuICAvLyBsZXQgY291bnRCeXRlcyA9IDA7XG5cbiAgbGV0IGhhc2g6IEhhc2g7XG4gIGxldCBoYXNoRG9uZTogUHJvbWlzZTxzdHJpbmc+O1xuXG4gIGNvbnN0IGJ1ZiA9IEJ1ZmZlci5hbGxvYyhsZW5ndGgpO1xuICBsZXQgYnVmT2Zmc2V0ID0gMDtcblxuICByZXEub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PiB7XG4gICAgYnVmT2Zmc2V0ICs9IGRhdGEuY29weShidWYsIGJ1Zk9mZnNldCwgMCk7XG4gICAgbG9nLmRlYnVnKGBSZWNpZXZpbmcsICR7YnVmT2Zmc2V0fSBieXRlc2ApO1xuICAgIGlmIChoYXNoID09IG51bGwpIHtcbiAgICAgIGhhc2ggPSBjcnlwdG8uY3JlYXRlSGFzaCgnc2hhMjU2Jyk7XG4gICAgICBoYXNoRG9uZSA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICBoYXNoLm9uKCdyZWFkYWJsZScsICgpID0+IHtcbiAgICAgICAgICBjb25zdCBkYXRhID0gaGFzaC5yZWFkKCk7XG4gICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgIHJlc29sdmUoZGF0YS50b1N0cmluZygnaGV4JykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgaGFzaC53cml0ZShkYXRhKTtcblxuICAgIC8vIGlmIChmd3JpdGVyID09IG51bGwpIHtcbiAgICAvLyAgIGxldCBmaWxlQmFzZU5hbWUgPSBQYXRoLmJhc2VuYW1lKHJlcS5wYXJhbXMuZmlsZSk7XG4gICAgLy8gICBjb25zdCBkb3QgPSBmaWxlQmFzZU5hbWUubGFzdEluZGV4T2YoJy4nKTtcbiAgICAvLyAgIGlmIChkb3QgPj0wIClcbiAgICAvLyAgICAgZmlsZUJhc2VOYW1lID0gZmlsZUJhc2VOYW1lLnNsaWNlKDAsIGRvdCk7XG4gICAgLy8gICB3cml0aW5nRmlsZSA9IFBhdGgucmVzb2x2ZSh6aXBEb3dubG9hZERpciwgYCR7ZmlsZUJhc2VOYW1lLnNsaWNlKDAsIGZpbGVCYXNlTmFtZS5sYXN0SW5kZXhPZignLicpKX0uJHtwcm9jZXNzLnBpZH0uemlwYCk7XG4gICAgLy8gICBmcy5ta2RpcnBTeW5jKFBhdGguZGlybmFtZSh3cml0aW5nRmlsZSkpO1xuICAgIC8vICAgZndyaXRlciA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKHdyaXRpbmdGaWxlKTtcbiAgICAvLyB9XG4gICAgLy8gZndyaXRlci53cml0ZShkYXRhKTtcbiAgfSk7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqKSA9PiB7XG4gICAgcmVxLm9uKCdlbmQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBsb2cuaW5mbyhgVG90YWwgcmVjaWV2ZWQgJHtidWZPZmZzZXR9IGJ5dGVzYCk7XG4gICAgICBpZiAoYnVmT2Zmc2V0ID4gbGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiByZWoobmV3IEVycm9yKGBSZWNpZXZlZCBkYXRhIGxlbmd0aCAke2J1Zk9mZnNldH0gaXMgZ3JlYXRlciB0aGFuIGV4cGVjcmVkIGNvbnRlbnQgbGVuZ3RoICR7bGVuZ3RofWApKTtcbiAgICAgIH1cbiAgICAgIGxldCBzaGE6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgIGlmIChoYXNoKSB7XG4gICAgICAgIGhhc2guZW5kKCk7XG4gICAgICAgIHNoYSA9IGF3YWl0IGhhc2hEb25lO1xuICAgICAgfVxuXG4gICAgICBpZiAoc2hhICE9PSBleHBlY3RTaGEyNTYpIHtcbiAgICAgICAgY29uc3QgZXJyID0gbmV3IEVycm9yKCdzaGEyNTYgbm90IG1hdGNoJyk7XG4gICAgICAgIChlcnIgYXMgYW55KS5zaGEyNTYgPSBzaGE7XG4gICAgICAgIC8vIFRPRE86XG4gICAgICAgIC8vIHJlcy5zZW5kKGBbV0FSTl0gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiAke0pTT04uc3RyaW5naWZ5KG5ld0NoZWNrc3VtSXRlbSwgbnVsbCwgJyAgJyl9XFxuYCArXG4gICAgICAgIC8vICAgYFJlY2lldmVkIGZpbGUgaXMgY29ycnVwdGVkIHdpdGggaGFzaCAke3NoYX0sXFxud2hpbGUgZXhwZWN0aW5nIGZpbGUgaGFzaCBpcyAke25ld0NoZWNrc3VtSXRlbS5zaGEyNTZ9YCk7XG4gICAgICAgIC8vIGZ3cml0ZXIhLmVuZChvblppcEZpbGVXcml0dGVuKTtcbiAgICAgICAgLy8gZndyaXRlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIHJlaihlcnIpO1xuICAgICAgfVxuICAgICAgcmVzb2x2ZSh7XG4gICAgICAgIGhhc2g6IHNoYSxcbiAgICAgICAgY29udGVudDogYnVmLnNsaWNlKDAsIGJ1Zk9mZnNldCksXG4gICAgICAgIGxlbmd0aDogYnVmT2Zmc2V0XG4gICAgICB9KTtcblxuICAgICAgLy8gZndyaXRlciEuZW5kKG9uWmlwRmlsZVdyaXR0ZW4pO1xuICAgICAgLy8gZndyaXRlciA9IHVuZGVmaW5lZDtcbiAgICAgIC8vIHJlcy5zZW5kKGBbQUNDRVBUXSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06ICR7SlNPTi5zdHJpbmdpZnkobmV3Q2hlY2tzdW1JdGVtLCBudWxsLCAnICAnKX1gKTtcblxuICAgICAgLy8gZmlsZXNIYXNoLnNldChuZXdDaGVja3N1bUl0ZW0uZmlsZSwgbmV3Q2hlY2tzdW1JdGVtKTtcbiAgICAgIC8vIHdyaXRlQ2hlY2tzdW1GaWxlKGZpbGVzSGFzaCk7XG4gICAgICAvLyBpZiAoaXNQbTIpIHtcbiAgICAgIC8vICAgY29uc3QgbXNnOiBQbTJQYWNrZXQgPSB7XG4gICAgICAvLyAgICAgdHlwZSA6ICdwcm9jZXNzOm1zZycsXG4gICAgICAvLyAgICAgZGF0YToge1xuICAgICAgLy8gICAgICAgJ2NkLXNlcnZlcjpjaGVja3N1bSB1cGRhdGluZyc6IG5ld0NoZWNrc3VtSXRlbSxcbiAgICAgIC8vICAgICAgIHBpZDogcHJvY2Vzcy5waWRcbiAgICAgIC8vICAgICB9XG4gICAgICAvLyAgIH07XG4gICAgICAvLyAgIHByb2Nlc3Muc2VuZCEobXNnKTtcbiAgICAgIC8vIH1cbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJlYWRDaGVja3N1bUZpbGUoKTogTWFwPHN0cmluZywgQ2hlY2tzdW1JdGVtPiB7XG4gIGNvbnN0IGVudiA9IG1haWxTZXR0aW5nID8gbWFpbFNldHRpbmcuZW52IDogJ2xvY2FsJztcbiAgY29uc3QgY2hlY2tzdW1GaWxlID0gUGF0aC5yZXNvbHZlKCdjaGVja3N1bS4nICsgZW52ICsgJy5qc29uJyk7XG4gIGxldCBjaGVja3N1bTogQ2hlY2tzdW07XG4gIGlmIChmcy5leGlzdHNTeW5jKGNoZWNrc3VtRmlsZSkpIHtcbiAgICB0cnkge1xuICAgICAgY2hlY2tzdW0gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhjaGVja3N1bUZpbGUsICd1dGY4JykpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZy53YXJuKGUpO1xuICAgICAgY2hlY2tzdW0gPSBbXTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgY2hlY2tzdW0gPSBbXTtcbiAgfVxuICByZXR1cm4gY2hlY2tzdW0ucmVkdWNlKChtYXAsIHZhbCkgPT4gbWFwLnNldCh2YWwuZmlsZSwgdmFsKSwgbmV3IE1hcDxzdHJpbmcsIENoZWNrc3VtSXRlbT4oKSk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlQ2hlY2tzdW1GaWxlKGNoZWNrc3VtOiBSZXR1cm5UeXBlPHR5cGVvZiByZWFkQ2hlY2tzdW1GaWxlPikge1xuICBjb25zdCBlbnYgPSBtYWlsU2V0dGluZyA/IG1haWxTZXR0aW5nLmVudiA6ICdsb2NhbCc7XG4gIGZzLndyaXRlRmlsZShQYXRoLnJlc29sdmUoJ2NoZWNrc3VtLicgKyBlbnYgKyAnLmpzb24nKSwgSlNPTi5zdHJpbmdpZnkoQXJyYXkuZnJvbShjaGVja3N1bS52YWx1ZXMoKSksIG51bGwsICcgICcpLCAoZXJyKSA9PiB7XG4gICAgaWYgKGVycikge1xuICAgICAgbG9nLmVycm9yKGVycik7XG4gICAgfVxuICB9KTtcbn1cbiJdfQ==
