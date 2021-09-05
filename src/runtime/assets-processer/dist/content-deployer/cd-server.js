"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.generateToken = exports.activate = void 0;
const os_1 = __importDefault(require("os"));
const util = __importStar(require("util"));
const fetch_remote_1 = require("../fetch-remote");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const mem_stats_1 = __importDefault(require("@wfh/plink/wfh/dist/utils/mem-stats"));
const crypto_1 = __importDefault(require("crypto"));
const __api_1 = __importDefault(require("__api"));
const plink_1 = require("@wfh/plink");
const log = (0, plink_1.log4File)(__filename);
const requireToken = (0, plink_1.config)()['@wfh/assets-processer'].requireToken;
const mailSetting = (0, plink_1.config)()['@wfh/assets-processer'].fetchMailServer;
function activate(app, imap) {
    let writingFile;
    let filesHash = readChecksumFile();
    const { isPm2, isMainProcess } = (0, fetch_remote_1.getPm2Info)();
    if (isPm2) {
        void initPm2();
    }
    void imap.appendMail(`server ${os_1.default.hostname()} ${process.pid} activates`, new Date() + '');
    app.use('/_stat', (req, res, next) => {
        if (requireToken && req.query.whisper !== generateToken()) {
            res.header('Connection', 'close');
            res.status(401).send(`REJECT from ${os_1.default.hostname()} pid: ${process.pid}: Not allowed to push artifact in this environment.`);
            req.socket.end();
            if (res.connection)
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
                mem: (0, mem_stats_1.default)(),
                cpus: os_1.default.cpus(),
                arch: os_1.default.arch(),
                platform: os_1.default.platform(),
                loadavg: os_1.default.loadavg()
            }, null, '  '));
        }
        else {
            next();
        }
    });
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
            void imap.checkMailForUpdate();
        }
    });
    app.use('/_time', (req, res) => {
        res.send(generateToken());
    });
    const router = __api_1.default.express.Router();
    // router.get('/_githash', async (req, res) => {
    //   res.setHeader('content-type', 'text/plain');
    //   res.send(await stringifyListAllVersions());
    // });
    router.put('/_install_force/:file/:hash', (req, res, next) => {
        req._installForce = true;
        next();
    });
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    router.put('/_install/:file/:hash', (req, res) => __awaiter(this, void 0, void 0, function* () {
        const isForce = req._installForce === true;
        if (requireToken && req.query.whisper !== generateToken()) {
            res.header('Connection', 'close');
            res.status(401).send(`REJECT from ${os_1.default.hostname()} pid: ${process.pid}: Not allowed to push artifact in this environment.`);
            req.socket.end();
            if (res.connection)
                res.connection.end();
            return;
        }
        const existing = filesHash.get(req.params.file);
        log.info(`${req.method} [${os_1.default.hostname()}]file: ${req.params.file}, hash: ${req.params.hash},\nexisting file: ${existing ? existing.file + ' / ' + existing.sha256 : '<NO>'}` +
            `\n${util.inspect(req.headers)}`);
        if (requireToken && req.query.whisper !== generateToken()) {
            res.header('Connection', 'close');
            res.status(401).send(`REJECT from ${os_1.default.hostname()} pid: ${process.pid}: Not allowed to push artifact in this environment.`);
            req.socket.end();
            if (res.connection)
                res.connection.end();
            return;
        }
        log.info('recieving data');
        if (isPm2 && !isMainProcess) {
            yield new Promise(resolve => setTimeout(resolve, 800));
        }
        if (!isForce && existing && existing.sha256 === req.params.hash) {
            // I want to cancel recieving request body asap
            // https://stackoverflow.com/questions/18367824/how-to-cancel-http-upload-from-data-events
            res.header('Connection', 'close');
            res.status(409).send(`[REJECT] ${os_1.default.hostname()} pid: ${process.pid}:` +
                `- found existing: ${JSON.stringify(existing, null, '  ')}\n` +
                `- hashs:\n  ${JSON.stringify(filesHash, null, '  ')}`);
            req.socket.end();
            if (res.connection)
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
                    `Recieved file is corrupted with hash ${e.sha256 || '<unknown>'},\nwhile expecting file hash is ${newChecksumItem.sha256}`);
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
            (0, fetch_remote_1.retry)(2, fetch_remote_1.forkExtractExstingZip).then(() => __api_1.default.eventBus.emit(__api_1.default.packageName + '.downloaded'))
                .catch(e => { log.error(e); });
    }
    function initPm2() {
        return __awaiter(this, void 0, void 0, function* () {
            const pm2 = require('pm2');
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
                    (0, fetch_remote_1.retry)(2, fetch_remote_1.forkExtractExstingZip)
                        .then(() => __api_1.default.eventBus.emit(__api_1.default.packageName + '.downloaded'))
                        .catch(e => { log.error(e); });
                }
            });
        });
    }
}
exports.activate = activate;
function generateToken() {
    const date = new Date();
    const token = date.getDate() + '' + date.getHours();
    // eslint-disable-next-line no-console
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
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        req.on('end', () => __awaiter(this, void 0, void 0, function* () {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2Qtc2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2Qtc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSw0Q0FBb0I7QUFFcEIsMkNBQTZCO0FBQzdCLGtEQUF5RjtBQUN6RixnREFBd0I7QUFFeEIsd0RBQTBCO0FBQzFCLG9EQUF1QjtBQUN2QixvRkFBMEQ7QUFDMUQsb0RBQW9DO0FBQ3BDLGtEQUF3QjtBQUN4QixzQ0FBNEM7QUFDNUMsTUFBTSxHQUFHLEdBQUcsSUFBQSxnQkFBUSxFQUFDLFVBQVUsQ0FBQyxDQUFDO0FBeUJqQyxNQUFNLFlBQVksR0FBRyxJQUFBLGNBQU0sR0FBRSxDQUFDLHVCQUF1QixDQUFDLENBQUMsWUFBWSxDQUFDO0FBQ3BFLE1BQU0sV0FBVyxHQUFHLElBQUEsY0FBTSxHQUFFLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxlQUFlLENBQUM7QUFHdEUsU0FBZ0IsUUFBUSxDQUFDLEdBQWdCLEVBQUUsSUFBaUI7SUFDMUQsSUFBSSxXQUErQixDQUFDO0lBRXBDLElBQUksU0FBUyxHQUFHLGdCQUFnQixFQUFFLENBQUM7SUFFbkMsTUFBTSxFQUFDLEtBQUssRUFBRSxhQUFhLEVBQUMsR0FBRyxJQUFBLHlCQUFVLEdBQUUsQ0FBQztJQUM1QyxJQUFJLEtBQUssRUFBRTtRQUNULEtBQUssT0FBTyxFQUFFLENBQUM7S0FDaEI7SUFFRCxLQUFLLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxZQUFFLENBQUMsUUFBUSxFQUFFLElBQUksT0FBTyxDQUFDLEdBQUcsWUFBWSxFQUFFLElBQUksSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFFMUYsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFO1FBQ25DLElBQUksWUFBWSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENB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QUNoQjtJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7QXBwbGljYXRpb24sIFJlcXVlc3R9IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCB7Q2hlY2tzdW19IGZyb20gJy4uL2ZldGNoLXR5cGVzJztcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAndXRpbCc7XG5pbXBvcnQge2dldFBtMkluZm8sIHppcERvd25sb2FkRGlyLCBmb3JrRXh0cmFjdEV4c3RpbmdaaXAsIHJldHJ5fSBmcm9tICcuLi9mZXRjaC1yZW1vdGUnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge0ltYXBNYW5hZ2VyfSBmcm9tICcuLi9mZXRjaC1yZW1vdGUtaW1hcCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBtZW1zdGF0IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvbWVtLXN0YXRzJztcbmltcG9ydCBjcnlwdG8sIHtIYXNofSBmcm9tICdjcnlwdG8nO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQge2xvZzRGaWxlLCBjb25maWd9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG4vLyBpbXBvcnQge3N0cmluZ2lmeUxpc3RBbGxWZXJzaW9uc30gZnJvbSAnQHdmaC9wcmVidWlsZC9kaXN0L2FydGlmYWN0cyc7XG5cbi8vIGNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmNkLXNlcnZlcicpO1xuXG5pbnRlcmZhY2UgUG0yUGFja2V0IHtcbiAgdHlwZTogJ3Byb2Nlc3M6bXNnJztcbiAgZGF0YToge1xuICAgIHBpZDogbnVtYmVyO1xuICAgICdjZC1zZXJ2ZXI6Y2hlY2tzdW0gdXBkYXRpbmcnPzogQ2hlY2tzdW1JdGVtO1xuICAgICdjZC1zZXJ2ZXI6Y2hlY2sgbWFpbCc/OiBzdHJpbmc7XG4gICAgZXh0cmFjdFppcD86IGJvb2xlYW47XG4gIH07XG59XG5cbmludGVyZmFjZSBQbTJCdXMge1xuICBvbihldmVudDogJ3Byb2Nlc3M6bXNnJywgY2I6IChwYWNrZXQ6IFBtMlBhY2tldCkgPT4gdm9pZCk6IHZvaWQ7XG59XG5cbnR5cGUgQ2hlY2tzdW1JdGVtID0gQ2hlY2tzdW0gZXh0ZW5kcyBBcnJheTxpbmZlciBJPiA/IEkgOiB1bmtub3duO1xuXG5pbnRlcmZhY2UgUmVjaWV2ZWREYXRhIHtcbiAgaGFzaD86IHN0cmluZzsgY29udGVudDogQnVmZmVyOyBsZW5ndGg6IG51bWJlcjtcbn1cblxuY29uc3QgcmVxdWlyZVRva2VuID0gY29uZmlnKClbJ0B3ZmgvYXNzZXRzLXByb2Nlc3NlciddLnJlcXVpcmVUb2tlbjtcbmNvbnN0IG1haWxTZXR0aW5nID0gY29uZmlnKClbJ0B3ZmgvYXNzZXRzLXByb2Nlc3NlciddLmZldGNoTWFpbFNlcnZlcjtcblxuXG5leHBvcnQgZnVuY3Rpb24gYWN0aXZhdGUoYXBwOiBBcHBsaWNhdGlvbiwgaW1hcDogSW1hcE1hbmFnZXIpIHtcbiAgbGV0IHdyaXRpbmdGaWxlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgbGV0IGZpbGVzSGFzaCA9IHJlYWRDaGVja3N1bUZpbGUoKTtcblxuICBjb25zdCB7aXNQbTIsIGlzTWFpblByb2Nlc3N9ID0gZ2V0UG0ySW5mbygpO1xuICBpZiAoaXNQbTIpIHtcbiAgICB2b2lkIGluaXRQbTIoKTtcbiAgfVxuXG4gIHZvaWQgaW1hcC5hcHBlbmRNYWlsKGBzZXJ2ZXIgJHtvcy5ob3N0bmFtZSgpfSAke3Byb2Nlc3MucGlkfSBhY3RpdmF0ZXNgLCBuZXcgRGF0ZSgpICsgJycpO1xuXG4gIGFwcC51c2UoJy9fc3RhdCcsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIGlmIChyZXF1aXJlVG9rZW4gJiYgcmVxLnF1ZXJ5LndoaXNwZXIgIT09IGdlbmVyYXRlVG9rZW4oKSkge1xuICAgICAgcmVzLmhlYWRlcignQ29ubmVjdGlvbicsICdjbG9zZScpO1xuICAgICAgcmVzLnN0YXR1cyg0MDEpLnNlbmQoYFJFSkVDVCBmcm9tICR7b3MuaG9zdG5hbWUoKX0gcGlkOiAke3Byb2Nlc3MucGlkfTogTm90IGFsbG93ZWQgdG8gcHVzaCBhcnRpZmFjdCBpbiB0aGlzIGVudmlyb25tZW50LmApO1xuICAgICAgcmVxLnNvY2tldC5lbmQoKTtcbiAgICAgIGlmIChyZXMuY29ubmVjdGlvbilcbiAgICAgICAgcmVzLmNvbm5lY3Rpb24uZW5kKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG5cbiAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ0dFVCcgJiYgL15cXC9fc3RhdChbIz8vXXwkKS8udGVzdChyZXEub3JpZ2luYWxVcmwpKSB7XG4gICAgICByZXMuY29udGVudFR5cGUoJ2pzb24nKTtcbiAgICAgIHJlcy5zZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgaXNNYWluUHJvY2VzcyxcbiAgICAgICAgZmlsZXNIYXNoOiBBcnJheS5mcm9tKGZpbGVzSGFzaC52YWx1ZXMoKSksXG4gICAgICAgIGlzX3BtMl9zbGF2ZTogaXNQbTIsXG4gICAgICAgIGhvc3RuYW1lOiBvcy5ob3N0bmFtZSgpLFxuICAgICAgICBwaWQ6IHByb2Nlc3MucGlkLFxuICAgICAgICBtZW06IG1lbXN0YXQoKSxcbiAgICAgICAgY3B1czogb3MuY3B1cygpLFxuICAgICAgICBhcmNoOiBvcy5hcmNoKCksXG4gICAgICAgIHBsYXRmb3JtOiBvcy5wbGF0Zm9ybSgpLFxuICAgICAgICBsb2FkYXZnOiBvcy5sb2FkYXZnKClcbiAgICAgIH0sIG51bGwsICcgICcpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmV4dCgpO1xuICAgIH1cbiAgfSk7XG5cbiAgbGV0IGNoZWNrZWRTZXEgPSAnJztcblxuICBhcHAudXNlKCcvX2NoZWNrbWFpbC86c2VxJywgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgbG9nLmluZm8oJ2ZvcmNlIGNoZWNrIG1haWwgZm9yOicsIHJlcS5wYXJhbXMuc2VxKTtcbiAgICBpZiAoY2hlY2tlZFNlcSA9PT0gcmVxLnBhcmFtcy5zZXEpXG4gICAgICByZXR1cm47XG4gICAgaWYgKGlzUG0yICYmICFpc01haW5Qcm9jZXNzKSB7XG4gICAgICBwcm9jZXNzLnNlbmQhKHtcbiAgICAgICAgdHlwZSA6ICdwcm9jZXNzOm1zZycsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAnY2Qtc2VydmVyOmNoZWNrIG1haWwnOiByZXEucGFyYW1zLnNlcSxcbiAgICAgICAgICBwaWQ6IHByb2Nlc3MucGlkXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB2b2lkIGltYXAuY2hlY2tNYWlsRm9yVXBkYXRlKCk7XG4gICAgfVxuICB9KTtcblxuICBhcHAudXNlKCcvX3RpbWUnLCAocmVxLCByZXMpID0+IHtcbiAgICByZXMuc2VuZChnZW5lcmF0ZVRva2VuKCkpO1xuICB9KTtcblxuXG4gIGNvbnN0IHJvdXRlciA9IGFwaS5leHByZXNzLlJvdXRlcigpO1xuICAvLyByb3V0ZXIuZ2V0KCcvX2dpdGhhc2gnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgLy8gICByZXMuc2V0SGVhZGVyKCdjb250ZW50LXR5cGUnLCAndGV4dC9wbGFpbicpO1xuICAvLyAgIHJlcy5zZW5kKGF3YWl0IHN0cmluZ2lmeUxpc3RBbGxWZXJzaW9ucygpKTtcbiAgLy8gfSk7XG5cbiAgcm91dGVyLnB1dDx7ZmlsZTogc3RyaW5nOyBoYXNoOiBzdHJpbmd9PignL19pbnN0YWxsX2ZvcmNlLzpmaWxlLzpoYXNoJywgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgKHJlcSBhcyB1bmtub3duIGFzIHtfaW5zdGFsbEZvcmNlOiBib29sZWFufSkuX2luc3RhbGxGb3JjZSA9IHRydWU7XG4gICAgbmV4dCgpO1xuICB9KTtcblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW1pc3VzZWQtcHJvbWlzZXNcbiAgcm91dGVyLnB1dDx7ZmlsZTogc3RyaW5nOyBoYXNoOiBzdHJpbmd9PignL19pbnN0YWxsLzpmaWxlLzpoYXNoJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgY29uc3QgaXNGb3JjZSA9IChyZXEgYXMgdW5rbm93biBhcyB7X2luc3RhbGxGb3JjZTogYm9vbGVhbn0pLl9pbnN0YWxsRm9yY2UgPT09IHRydWU7XG5cbiAgICBpZiAocmVxdWlyZVRva2VuICYmIHJlcS5xdWVyeS53aGlzcGVyICE9PSBnZW5lcmF0ZVRva2VuKCkpIHtcbiAgICAgIHJlcy5oZWFkZXIoJ0Nvbm5lY3Rpb24nLCAnY2xvc2UnKTtcbiAgICAgIHJlcy5zdGF0dXMoNDAxKS5zZW5kKGBSRUpFQ1QgZnJvbSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06IE5vdCBhbGxvd2VkIHRvIHB1c2ggYXJ0aWZhY3QgaW4gdGhpcyBlbnZpcm9ubWVudC5gKTtcbiAgICAgIHJlcS5zb2NrZXQuZW5kKCk7XG4gICAgICBpZiAocmVzLmNvbm5lY3Rpb24pXG4gICAgICAgIHJlcy5jb25uZWN0aW9uLmVuZCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBleGlzdGluZyA9IGZpbGVzSGFzaC5nZXQocmVxLnBhcmFtcy5maWxlKTtcbiAgICBsb2cuaW5mbyhgJHtyZXEubWV0aG9kfSBbJHtvcy5ob3N0bmFtZSgpfV1maWxlOiAke3JlcS5wYXJhbXMuZmlsZX0sIGhhc2g6ICR7cmVxLnBhcmFtcy5oYXNofSxcXG5leGlzdGluZyBmaWxlOiAke2V4aXN0aW5nID8gZXhpc3RpbmcuZmlsZSArICcgLyAnICsgZXhpc3Rpbmcuc2hhMjU2IDogJzxOTz4nfWAgK1xuICAgICAgYFxcbiR7dXRpbC5pbnNwZWN0KHJlcS5oZWFkZXJzKX1gKTtcblxuICAgIGlmIChyZXF1aXJlVG9rZW4gJiYgcmVxLnF1ZXJ5LndoaXNwZXIgIT09IGdlbmVyYXRlVG9rZW4oKSkge1xuICAgICAgcmVzLmhlYWRlcignQ29ubmVjdGlvbicsICdjbG9zZScpO1xuICAgICAgcmVzLnN0YXR1cyg0MDEpLnNlbmQoYFJFSkVDVCBmcm9tICR7b3MuaG9zdG5hbWUoKX0gcGlkOiAke3Byb2Nlc3MucGlkfTogTm90IGFsbG93ZWQgdG8gcHVzaCBhcnRpZmFjdCBpbiB0aGlzIGVudmlyb25tZW50LmApO1xuICAgICAgcmVxLnNvY2tldC5lbmQoKTtcbiAgICAgIGlmIChyZXMuY29ubmVjdGlvbilcbiAgICAgICAgcmVzLmNvbm5lY3Rpb24uZW5kKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbG9nLmluZm8oJ3JlY2lldmluZyBkYXRhJyk7XG4gICAgaWYgKGlzUG0yICYmICFpc01haW5Qcm9jZXNzKSB7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgODAwKSk7XG4gICAgfVxuICAgIGlmICghaXNGb3JjZSAmJiBleGlzdGluZyAmJiBleGlzdGluZy5zaGEyNTYgPT09IHJlcS5wYXJhbXMuaGFzaCkge1xuICAgICAgLy8gSSB3YW50IHRvIGNhbmNlbCByZWNpZXZpbmcgcmVxdWVzdCBib2R5IGFzYXBcbiAgICAgIC8vIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE4MzY3ODI0L2hvdy10by1jYW5jZWwtaHR0cC11cGxvYWQtZnJvbS1kYXRhLWV2ZW50c1xuICAgICAgcmVzLmhlYWRlcignQ29ubmVjdGlvbicsICdjbG9zZScpO1xuICAgICAgcmVzLnN0YXR1cyg0MDkpLnNlbmQoYFtSRUpFQ1RdICR7b3MuaG9zdG5hbWUoKX0gcGlkOiAke3Byb2Nlc3MucGlkfTpgICtcbiAgICAgIGAtIGZvdW5kIGV4aXN0aW5nOiAke0pTT04uc3RyaW5naWZ5KGV4aXN0aW5nLCBudWxsLCAnICAnKX1cXG5gICtcbiAgICAgIGAtIGhhc2hzOlxcbiAgJHtKU09OLnN0cmluZ2lmeShmaWxlc0hhc2gsIG51bGwsICcgICcpfWApO1xuICAgICAgcmVxLnNvY2tldC5lbmQoKTtcbiAgICAgIGlmIChyZXMuY29ubmVjdGlvbilcbiAgICAgICAgcmVzLmNvbm5lY3Rpb24uZW5kKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICBjb25zdCBuZXdDaGVja3N1bUl0ZW06IENoZWNrc3VtSXRlbSA9IHtcbiAgICAgIGZpbGU6IHJlcS5wYXJhbXMuZmlsZSxcbiAgICAgIHNoYTI1NjogcmVxLnBhcmFtcy5oYXNoLFxuICAgICAgY3JlYXRlZDogbm93LnRvTG9jYWxlU3RyaW5nKCksXG4gICAgICBjcmVhdGVkVGltZTogbm93LmdldFRpbWUoKVxuICAgIH07XG5cbiAgICBjb25zdCBjb250ZW50TGVuID0gcmVxLmhlYWRlcnNbJ2NvbnRlbnQtbGVuZ3RoJ107XG4gICAgbGV0IHJlY2lldmVkOiBSZWNpZXZlZERhdGE7XG4gICAgLy8gY2hlY2tzdW0udmVyc2lvbnMhW3JlcS5wYXJhbXMuYXBwXSA9IHt2ZXJzaW9uOiBwYXJzZUludChyZXEucGFyYW1zLnZlcnNpb24sIDEwKX07XG4gICAgdHJ5IHtcbiAgICAgIHJlY2lldmVkID0gYXdhaXQgcmVhZFJlc3BvbnNlVG9CdWZmZXIocmVxLCByZXEucGFyYW1zLmhhc2gsIGNvbnRlbnRMZW4gPyBwYXJzZUludChjb250ZW50TGVuLCAxMCkgOiAxMCAqIDEwMjQgKiAxMDI0KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZS5tZXNzYWdlID09PSAnc2hhMjU2IG5vdCBtYXRjaCcpIHtcbiAgICAgICAgcmVzLnNlbmQoYFtXQVJOXSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06ICR7SlNPTi5zdHJpbmdpZnkobmV3Q2hlY2tzdW1JdGVtLCBudWxsLCAnICAnKX1cXG5gICtcbiAgICAgICAgICBgUmVjaWV2ZWQgZmlsZSBpcyBjb3JydXB0ZWQgd2l0aCBoYXNoICR7KGUgYXMge3NoYTI1Nj86IHN0cmluZ30pLnNoYTI1NiB8fCAnPHVua25vd24+J30sXFxud2hpbGUgZXhwZWN0aW5nIGZpbGUgaGFzaCBpcyAke25ld0NoZWNrc3VtSXRlbS5zaGEyNTZ9YCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXMuc3RhdHVzKDUwMCk7XG4gICAgICAgIHJlcy5zZW5kKGUuc3RhY2spO1xuICAgICAgfVxuICAgIH1cbiAgICByZXMuc2VuZChgW0FDQ0VQVF0gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiAke0pTT04uc3RyaW5naWZ5KG5ld0NoZWNrc3VtSXRlbSwgbnVsbCwgJyAgJyl9YCk7XG5cbiAgICBsZXQgZmlsZUJhc2VOYW1lID0gUGF0aC5iYXNlbmFtZShyZXEucGFyYW1zLmZpbGUpO1xuICAgIGNvbnN0IGRvdCA9IGZpbGVCYXNlTmFtZS5sYXN0SW5kZXhPZignLicpO1xuICAgIGlmIChkb3QgPj0wIClcbiAgICAgIGZpbGVCYXNlTmFtZSA9IGZpbGVCYXNlTmFtZS5zbGljZSgwLCBkb3QpO1xuICAgIHdyaXRpbmdGaWxlID0gUGF0aC5yZXNvbHZlKHppcERvd25sb2FkRGlyLCBgJHtmaWxlQmFzZU5hbWUuc2xpY2UoMCwgZmlsZUJhc2VOYW1lLmxhc3RJbmRleE9mKCcuJykpfS4ke3Byb2Nlc3MucGlkfS56aXBgKTtcbiAgICBmcy5ta2RpcnBTeW5jKFBhdGguZGlybmFtZSh3cml0aW5nRmlsZSkpO1xuICAgIGZzLndyaXRlRmlsZSh3cml0aW5nRmlsZSwgcmVjaWV2ZWQhLmNvbnRlbnQsIG9uWmlwRmlsZVdyaXR0ZW4pO1xuICAgIGZpbGVzSGFzaC5zZXQobmV3Q2hlY2tzdW1JdGVtLmZpbGUsIG5ld0NoZWNrc3VtSXRlbSk7XG4gICAgd3JpdGVDaGVja3N1bUZpbGUoZmlsZXNIYXNoKTtcbiAgICBpZiAoaXNQbTIpIHtcbiAgICAgIGNvbnN0IG1zZzogUG0yUGFja2V0ID0ge1xuICAgICAgICB0eXBlIDogJ3Byb2Nlc3M6bXNnJyxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICdjZC1zZXJ2ZXI6Y2hlY2tzdW0gdXBkYXRpbmcnOiBuZXdDaGVja3N1bUl0ZW0sXG4gICAgICAgICAgcGlkOiBwcm9jZXNzLnBpZFxuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgcHJvY2Vzcy5zZW5kIShtc2cpO1xuICAgIH1cbiAgfSk7XG5cblxuICBhcHAudXNlKCcvJywgcm91dGVyKTtcblxuICBmdW5jdGlvbiBvblppcEZpbGVXcml0dGVuKCkge1xuICAgIGlmIChpc1BtMiAmJiAhaXNNYWluUHJvY2Vzcykge1xuICAgICAgY29uc3QgbXNnOiBQbTJQYWNrZXQgPSB7XG4gICAgICAgIHR5cGUgOiAncHJvY2Vzczptc2cnLFxuICAgICAgICBkYXRhOiB7ZXh0cmFjdFppcDogdHJ1ZSwgcGlkOiBwcm9jZXNzLnBpZH1cbiAgICAgIH07XG4gICAgICBwcm9jZXNzLnNlbmQhKG1zZyk7XG4gICAgfSBlbHNlXG4gICAgICByZXRyeSgyLCBmb3JrRXh0cmFjdEV4c3RpbmdaaXApLnRoZW4oKCkgPT4gYXBpLmV2ZW50QnVzLmVtaXQoYXBpLnBhY2thZ2VOYW1lICsgJy5kb3dubG9hZGVkJykpXG4gICAgICAgIC5jYXRjaChlID0+IHtsb2cuZXJyb3IoZSk7fSk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBpbml0UG0yKCkge1xuICAgIGNvbnN0IHBtMiA9IHJlcXVpcmUoJ3BtMicpO1xuICAgIGNvbnN0IHBtMmNvbm5lY3QgPSB1dGlsLnByb21pc2lmeShwbTIuY29ubmVjdC5iaW5kKHBtMikpO1xuICAgIGNvbnN0IHBtMmxhdW5jaEJ1cyA9IHV0aWwucHJvbWlzaWZ5PFBtMkJ1cz4ocG0yLmxhdW5jaEJ1cy5iaW5kKHBtMikpO1xuXG4gICAgYXdhaXQgcG0yY29ubmVjdCgpO1xuICAgIGNvbnN0IGJ1cyA9IGF3YWl0IHBtMmxhdW5jaEJ1cygpO1xuICAgIGJ1cy5vbigncHJvY2Vzczptc2cnLCBwYWNrZXQgPT4ge1xuICAgICAgaWYgKCFwYWNrZXQuZGF0YSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCB1cGRhdGVkQ2hlY2tzdW1JdGVtID0gcGFja2V0LmRhdGFbJ2NkLXNlcnZlcjpjaGVja3N1bSB1cGRhdGluZyddO1xuICAgICAgaWYgKHVwZGF0ZWRDaGVja3N1bUl0ZW0gJiYgcGFja2V0LmRhdGEucGlkICE9PSBwcm9jZXNzLnBpZCkge1xuICAgICAgICBjb25zdCByZWNpZXZlZENoZWNrc3VtID0gdXBkYXRlZENoZWNrc3VtSXRlbTtcbiAgICAgICAgZmlsZXNIYXNoLnNldChyZWNpZXZlZENoZWNrc3VtLmZpbGUsIHJlY2lldmVkQ2hlY2tzdW0pO1xuICAgICAgICBsb2cuaW5mbygnT3RoZXIgcHJvY2VzcyByZWNpZXZlZCB1cGRhdGluZyBjaGVja3N1bSAlcyBmcm9tIGlkOiAlcycsXG4gICAgICAgICAgdXRpbC5pbnNwZWN0KHJlY2lldmVkQ2hlY2tzdW0pLCBfLmdldChwYWNrZXQsICdwcm9jZXNzLnBtX2lkJykpO1xuICAgICAgfVxuICAgICAgY29uc3QgY2hlY2tNYWlsUHJvcCA9IHBhY2tldC5kYXRhWydjZC1zZXJ2ZXI6Y2hlY2sgbWFpbCddO1xuICAgICAgaWYgKGNoZWNrTWFpbFByb3AgJiYgcGFja2V0LmRhdGEucGlkICE9PSBwcm9jZXNzLnBpZCkge1xuICAgICAgICBjaGVja2VkU2VxID0gY2hlY2tNYWlsUHJvcDtcbiAgICAgICAgbG9nLmluZm8oJ090aGVyIHByb2Nlc3MgdHJpZ2dlcnMgXCJjaGVjayBtYWlsXCIgZnJvbSBpZDonLCBfLmdldChwYWNrZXQsICdwcm9jZXNzLnBtX2lkJykpO1xuICAgICAgICAvLyBpbWFwLmNoZWNrTWFpbEZvclVwZGF0ZSgpO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFja2V0LmRhdGEuZXh0cmFjdFppcCAmJiBwYWNrZXQuZGF0YS5waWQgIT09IHByb2Nlc3MucGlkKSB7XG4gICAgICAgIGxvZy5pbmZvKCdPdGhlciBwcm9jZXNzIHRyaWdnZXJzIFwiZXh0cmFjdFppcFwiIGZyb20gaWQ6JywgXy5nZXQocGFja2V0LCAncHJvY2Vzcy5wbV9pZCcpKTtcbiAgICAgICAgcmV0cnkoMiwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwKVxuICAgICAgICAgIC50aGVuKCgpID0+IGFwaS5ldmVudEJ1cy5lbWl0KGFwaS5wYWNrYWdlTmFtZSArICcuZG93bmxvYWRlZCcpKVxuICAgICAgICAgIC5jYXRjaChlID0+IHtsb2cuZXJyb3IoZSk7fSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlVG9rZW4oKSB7XG4gIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSgpO1xuICBjb25zdCB0b2tlbiA9IGRhdGUuZ2V0RGF0ZSgpICsgJycgKyBkYXRlLmdldEhvdXJzKCk7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKHRva2VuKTtcbiAgcmV0dXJuIHRva2VuO1xufVxuXG5mdW5jdGlvbiByZWFkUmVzcG9uc2VUb0J1ZmZlcihyZXE6IFJlcXVlc3Q8e2ZpbGU6IHN0cmluZzsgaGFzaDogc3RyaW5nfT4sIGV4cGVjdFNoYTI1Njogc3RyaW5nLCBsZW5ndGg6IG51bWJlcilcbiAgOiBQcm9taXNlPFJlY2lldmVkRGF0YT4ge1xuICAvLyBsZXQgY291bnRCeXRlcyA9IDA7XG5cbiAgbGV0IGhhc2g6IEhhc2g7XG4gIGxldCBoYXNoRG9uZTogUHJvbWlzZTxzdHJpbmc+O1xuXG4gIGNvbnN0IGJ1ZiA9IEJ1ZmZlci5hbGxvYyhsZW5ndGgpO1xuICBsZXQgYnVmT2Zmc2V0ID0gMDtcblxuICByZXEub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PiB7XG4gICAgYnVmT2Zmc2V0ICs9IGRhdGEuY29weShidWYsIGJ1Zk9mZnNldCwgMCk7XG4gICAgbG9nLmRlYnVnKGBSZWNpZXZpbmcsICR7YnVmT2Zmc2V0fSBieXRlc2ApO1xuICAgIGlmIChoYXNoID09IG51bGwpIHtcbiAgICAgIGhhc2ggPSBjcnlwdG8uY3JlYXRlSGFzaCgnc2hhMjU2Jyk7XG4gICAgICBoYXNoRG9uZSA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICBoYXNoLm9uKCdyZWFkYWJsZScsICgpID0+IHtcbiAgICAgICAgICBjb25zdCBkYXRhID0gaGFzaC5yZWFkKCkgYXMgQnVmZmVyO1xuICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICByZXNvbHZlKGRhdGEudG9TdHJpbmcoJ2hleCcpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGhhc2gud3JpdGUoZGF0YSk7XG5cbiAgICAvLyBpZiAoZndyaXRlciA9PSBudWxsKSB7XG4gICAgLy8gICBsZXQgZmlsZUJhc2VOYW1lID0gUGF0aC5iYXNlbmFtZShyZXEucGFyYW1zLmZpbGUpO1xuICAgIC8vICAgY29uc3QgZG90ID0gZmlsZUJhc2VOYW1lLmxhc3RJbmRleE9mKCcuJyk7XG4gICAgLy8gICBpZiAoZG90ID49MCApXG4gICAgLy8gICAgIGZpbGVCYXNlTmFtZSA9IGZpbGVCYXNlTmFtZS5zbGljZSgwLCBkb3QpO1xuICAgIC8vICAgd3JpdGluZ0ZpbGUgPSBQYXRoLnJlc29sdmUoemlwRG93bmxvYWREaXIsIGAke2ZpbGVCYXNlTmFtZS5zbGljZSgwLCBmaWxlQmFzZU5hbWUubGFzdEluZGV4T2YoJy4nKSl9LiR7cHJvY2Vzcy5waWR9LnppcGApO1xuICAgIC8vICAgZnMubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUod3JpdGluZ0ZpbGUpKTtcbiAgICAvLyAgIGZ3cml0ZXIgPSBmcy5jcmVhdGVXcml0ZVN0cmVhbSh3cml0aW5nRmlsZSk7XG4gICAgLy8gfVxuICAgIC8vIGZ3cml0ZXIud3JpdGUoZGF0YSk7XG4gIH0pO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlaikgPT4ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbWlzdXNlZC1wcm9taXNlc1xuICAgIHJlcS5vbignZW5kJywgYXN5bmMgKCkgPT4ge1xuICAgICAgbG9nLmluZm8oYFRvdGFsIHJlY2lldmVkICR7YnVmT2Zmc2V0fSBieXRlc2ApO1xuICAgICAgaWYgKGJ1Zk9mZnNldCA+IGxlbmd0aCkge1xuICAgICAgICByZXR1cm4gcmVqKG5ldyBFcnJvcihgUmVjaWV2ZWQgZGF0YSBsZW5ndGggJHtidWZPZmZzZXR9IGlzIGdyZWF0ZXIgdGhhbiBleHBlY3JlZCBjb250ZW50IGxlbmd0aCAke2xlbmd0aH1gKSk7XG4gICAgICB9XG4gICAgICBsZXQgc2hhOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICBpZiAoaGFzaCkge1xuICAgICAgICBoYXNoLmVuZCgpO1xuICAgICAgICBzaGEgPSBhd2FpdCBoYXNoRG9uZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHNoYSAhPT0gZXhwZWN0U2hhMjU2KSB7XG4gICAgICAgIGNvbnN0IGVyciA9IG5ldyBFcnJvcignc2hhMjU2IG5vdCBtYXRjaCcpO1xuICAgICAgICAoZXJyIGFzIGFueSkuc2hhMjU2ID0gc2hhO1xuICAgICAgICAvLyBUT0RPOlxuICAgICAgICAvLyByZXMuc2VuZChgW1dBUk5dICR7b3MuaG9zdG5hbWUoKX0gcGlkOiAke3Byb2Nlc3MucGlkfTogJHtKU09OLnN0cmluZ2lmeShuZXdDaGVja3N1bUl0ZW0sIG51bGwsICcgICcpfVxcbmAgK1xuICAgICAgICAvLyAgIGBSZWNpZXZlZCBmaWxlIGlzIGNvcnJ1cHRlZCB3aXRoIGhhc2ggJHtzaGF9LFxcbndoaWxlIGV4cGVjdGluZyBmaWxlIGhhc2ggaXMgJHtuZXdDaGVja3N1bUl0ZW0uc2hhMjU2fWApO1xuICAgICAgICAvLyBmd3JpdGVyIS5lbmQob25aaXBGaWxlV3JpdHRlbik7XG4gICAgICAgIC8vIGZ3cml0ZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIHJldHVybiByZWooZXJyKTtcbiAgICAgIH1cbiAgICAgIHJlc29sdmUoe1xuICAgICAgICBoYXNoOiBzaGEsXG4gICAgICAgIGNvbnRlbnQ6IGJ1Zi5zbGljZSgwLCBidWZPZmZzZXQpLFxuICAgICAgICBsZW5ndGg6IGJ1Zk9mZnNldFxuICAgICAgfSk7XG5cbiAgICAgIC8vIGZ3cml0ZXIhLmVuZChvblppcEZpbGVXcml0dGVuKTtcbiAgICAgIC8vIGZ3cml0ZXIgPSB1bmRlZmluZWQ7XG4gICAgICAvLyByZXMuc2VuZChgW0FDQ0VQVF0gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiAke0pTT04uc3RyaW5naWZ5KG5ld0NoZWNrc3VtSXRlbSwgbnVsbCwgJyAgJyl9YCk7XG5cbiAgICAgIC8vIGZpbGVzSGFzaC5zZXQobmV3Q2hlY2tzdW1JdGVtLmZpbGUsIG5ld0NoZWNrc3VtSXRlbSk7XG4gICAgICAvLyB3cml0ZUNoZWNrc3VtRmlsZShmaWxlc0hhc2gpO1xuICAgICAgLy8gaWYgKGlzUG0yKSB7XG4gICAgICAvLyAgIGNvbnN0IG1zZzogUG0yUGFja2V0ID0ge1xuICAgICAgLy8gICAgIHR5cGUgOiAncHJvY2Vzczptc2cnLFxuICAgICAgLy8gICAgIGRhdGE6IHtcbiAgICAgIC8vICAgICAgICdjZC1zZXJ2ZXI6Y2hlY2tzdW0gdXBkYXRpbmcnOiBuZXdDaGVja3N1bUl0ZW0sXG4gICAgICAvLyAgICAgICBwaWQ6IHByb2Nlc3MucGlkXG4gICAgICAvLyAgICAgfVxuICAgICAgLy8gICB9O1xuICAgICAgLy8gICBwcm9jZXNzLnNlbmQhKG1zZyk7XG4gICAgICAvLyB9XG4gICAgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiByZWFkQ2hlY2tzdW1GaWxlKCk6IE1hcDxzdHJpbmcsIENoZWNrc3VtSXRlbT4ge1xuICBjb25zdCBlbnYgPSBtYWlsU2V0dGluZyA/IG1haWxTZXR0aW5nLmVudiA6ICdsb2NhbCc7XG4gIGNvbnN0IGNoZWNrc3VtRmlsZSA9IFBhdGgucmVzb2x2ZSgnY2hlY2tzdW0uJyArIGVudiArICcuanNvbicpO1xuICBsZXQgY2hlY2tzdW06IENoZWNrc3VtO1xuICBpZiAoZnMuZXhpc3RzU3luYyhjaGVja3N1bUZpbGUpKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNoZWNrc3VtID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoY2hlY2tzdW1GaWxlLCAndXRmOCcpKSBhcyBDaGVja3N1bTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsb2cud2FybihlKTtcbiAgICAgIGNoZWNrc3VtID0gW107XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGNoZWNrc3VtID0gW107XG4gIH1cbiAgcmV0dXJuIGNoZWNrc3VtLnJlZHVjZSgobWFwLCB2YWwpID0+IG1hcC5zZXQodmFsLmZpbGUsIHZhbCksIG5ldyBNYXA8c3RyaW5nLCBDaGVja3N1bUl0ZW0+KCkpO1xufVxuXG5mdW5jdGlvbiB3cml0ZUNoZWNrc3VtRmlsZShjaGVja3N1bTogUmV0dXJuVHlwZTx0eXBlb2YgcmVhZENoZWNrc3VtRmlsZT4pIHtcbiAgY29uc3QgZW52ID0gbWFpbFNldHRpbmcgPyBtYWlsU2V0dGluZy5lbnYgOiAnbG9jYWwnO1xuICBmcy53cml0ZUZpbGUoUGF0aC5yZXNvbHZlKCdjaGVja3N1bS4nICsgZW52ICsgJy5qc29uJyksIEpTT04uc3RyaW5naWZ5KEFycmF5LmZyb20oY2hlY2tzdW0udmFsdWVzKCkpLCBudWxsLCAnICAnKSwgKGVycikgPT4ge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIGxvZy5lcnJvcihlcnIpO1xuICAgIH1cbiAgfSk7XG59XG4iXX0=