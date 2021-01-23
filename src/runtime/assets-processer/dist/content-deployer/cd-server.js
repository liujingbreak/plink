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
const artifacts_1 = require("@wfh/prebuild/dist/artifacts");
const log = require('log4js').getLogger(__api_1.default.packageName + '.cd-server');
const requireToken = __api_1.default.config.get([__api_1.default.packageName, 'requireToken'], false);
const mailSetting = __api_1.default.config.get(__api_1.default.packageName).fetchMailServer;
function activate(app, imap) {
    return __awaiter(this, void 0, void 0, function* () {
        let writingFile;
        let filesHash = readChecksumFile();
        const { isPm2, isMainProcess } = fetch_remote_1.getPm2Info();
        if (isPm2) {
            initPm2();
        }
        imap.appendMail(`server ${os_1.default.hostname} ${process.pid} activates`, new Date() + '');
        app.use('/_stat', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
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
        router.get('/_githash', (req, res) => __awaiter(this, void 0, void 0, function* () {
            res.setHeader('content-type', 'text/plain');
            res.send(yield artifacts_1.stringifyListAllVersions());
        }));
        router.put('/_install_force/:file/:hash', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            req._installForce = true;
            next();
        }));
        router.put('/_install/:file/:hash', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const isForce = req._installForce === true;
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
            if (!isForce && existing && existing.sha256 === req.params.hash) {
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
                fetch_remote_1.retry(2, fetch_remote_1.forkExtractExstingZip).then(() => __api_1.default.eventBus.emit(__api_1.default.packageName + '.downloaded'));
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
                        fetch_remote_1.retry(2, fetch_remote_1.forkExtractExstingZip).then(() => __api_1.default.eventBus.emit(__api_1.default.packageName + '.downloaded'));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2Qtc2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2Qtc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSw0Q0FBb0I7QUFFcEIsMkNBQTZCO0FBQzdCLGtEQUF5RjtBQUN6RixnREFBd0I7QUFFeEIsd0RBQTBCO0FBQzFCLG9EQUF1QjtBQUN2QixvRkFBMEQ7QUFDMUQsb0RBQW9DO0FBQ3BDLGtEQUF3QjtBQUN4Qiw0REFBc0U7QUFFdEUsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLFlBQVksQ0FBQyxDQUFDO0FBc0J4RSxNQUFNLFlBQVksR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEVBQUUsY0FBYyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDOUUsTUFBTSxXQUFXLEdBQUksZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBMEIsQ0FBQyxlQUFlLENBQUM7QUFHOUYsU0FBc0IsUUFBUSxDQUFDLEdBQWdCLEVBQUUsSUFBaUI7O1FBQ2hFLElBQUksV0FBK0IsQ0FBQztRQUVwQyxJQUFJLFNBQVMsR0FBRyxnQkFBZ0IsRUFBRSxDQUFDO1FBRW5DLE1BQU0sRUFBQyxLQUFLLEVBQUUsYUFBYSxFQUFDLEdBQUcseUJBQVUsRUFBRSxDQUFDO1FBQzVDLElBQUksS0FBSyxFQUFFO1lBQ1QsT0FBTyxFQUFFLENBQUM7U0FDWDtRQUVELElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxZQUFFLENBQUMsUUFBUSxJQUFJLE9BQU8sQ0FBQyxHQUFHLFlBQVksRUFBRSxJQUFJLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBRW5GLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENB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Q29udGVudCI6WyJpbXBvcnQge0FwcGxpY2F0aW9uLCBSZXF1ZXN0fSBmcm9tICdleHByZXNzJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQge0NoZWNrc3VtLCBXaXRoTWFpbFNlcnZlckNvbmZpZ30gZnJvbSAnLi4vZmV0Y2gtdHlwZXMnO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICd1dGlsJztcbmltcG9ydCB7Z2V0UG0ySW5mbywgemlwRG93bmxvYWREaXIsIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCwgcmV0cnl9IGZyb20gJy4uL2ZldGNoLXJlbW90ZSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7SW1hcE1hbmFnZXJ9IGZyb20gJy4uL2ZldGNoLXJlbW90ZS1pbWFwJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IG1lbXN0YXQgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9tZW0tc3RhdHMnO1xuaW1wb3J0IGNyeXB0bywge0hhc2h9IGZyb20gJ2NyeXB0byc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7c3RyaW5naWZ5TGlzdEFsbFZlcnNpb25zfSBmcm9tICdAd2ZoL3ByZWJ1aWxkL2Rpc3QvYXJ0aWZhY3RzJztcblxuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuY2Qtc2VydmVyJyk7XG5cbmludGVyZmFjZSBQbTJQYWNrZXQge1xuICB0eXBlOiAncHJvY2Vzczptc2cnO1xuICBkYXRhOiB7XG4gICAgcGlkOiBudW1iZXI7XG4gICAgJ2NkLXNlcnZlcjpjaGVja3N1bSB1cGRhdGluZyc/OiBDaGVja3N1bUl0ZW07XG4gICAgJ2NkLXNlcnZlcjpjaGVjayBtYWlsJz86IHN0cmluZztcbiAgICBleHRyYWN0WmlwPzogYm9vbGVhbjtcbiAgfTtcbn1cblxuaW50ZXJmYWNlIFBtMkJ1cyB7XG4gIG9uKGV2ZW50OiAncHJvY2Vzczptc2cnLCBjYjogKHBhY2tldDogUG0yUGFja2V0KSA9PiB2b2lkKTogdm9pZDtcbn1cblxudHlwZSBDaGVja3N1bUl0ZW0gPSBDaGVja3N1bSBleHRlbmRzIEFycmF5PGluZmVyIEk+ID8gSSA6IHVua25vd247XG5cbmludGVyZmFjZSBSZWNpZXZlZERhdGEge1xuICBoYXNoPzogc3RyaW5nOyBjb250ZW50OiBCdWZmZXI7IGxlbmd0aDogbnVtYmVyO1xufVxuXG5jb25zdCByZXF1aXJlVG9rZW4gPSBhcGkuY29uZmlnLmdldChbYXBpLnBhY2thZ2VOYW1lLCAncmVxdWlyZVRva2VuJ10sIGZhbHNlKTtcbmNvbnN0IG1haWxTZXR0aW5nID0gKGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSkgYXMgV2l0aE1haWxTZXJ2ZXJDb25maWcpLmZldGNoTWFpbFNlcnZlcjtcblxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWN0aXZhdGUoYXBwOiBBcHBsaWNhdGlvbiwgaW1hcDogSW1hcE1hbmFnZXIpIHtcbiAgbGV0IHdyaXRpbmdGaWxlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgbGV0IGZpbGVzSGFzaCA9IHJlYWRDaGVja3N1bUZpbGUoKTtcblxuICBjb25zdCB7aXNQbTIsIGlzTWFpblByb2Nlc3N9ID0gZ2V0UG0ySW5mbygpO1xuICBpZiAoaXNQbTIpIHtcbiAgICBpbml0UG0yKCk7XG4gIH1cblxuICBpbWFwLmFwcGVuZE1haWwoYHNlcnZlciAke29zLmhvc3RuYW1lfSAke3Byb2Nlc3MucGlkfSBhY3RpdmF0ZXNgLCBuZXcgRGF0ZSgpICsgJycpO1xuXG4gIGFwcC51c2UoJy9fc3RhdCcsIGFzeW5jIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIGlmIChyZXF1aXJlVG9rZW4gJiYgcmVxLnF1ZXJ5LndoaXNwZXIgIT09IGdlbmVyYXRlVG9rZW4oKSkge1xuICAgICAgcmVzLmhlYWRlcignQ29ubmVjdGlvbicsICdjbG9zZScpO1xuICAgICAgcmVzLnN0YXR1cyg0MDEpLnNlbmQoYFJFSkVDVCBmcm9tICR7b3MuaG9zdG5hbWUoKX0gcGlkOiAke3Byb2Nlc3MucGlkfTogTm90IGFsbG93ZWQgdG8gcHVzaCBhcnRpZmFjdCBpbiB0aGlzIGVudmlyb25tZW50LmApO1xuICAgICAgcmVxLnNvY2tldC5lbmQoKTtcbiAgICAgIHJlcy5jb25uZWN0aW9uLmVuZCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuXG4gICAgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnICYmIC9eXFwvX3N0YXQoWyM/L118JCkvLnRlc3QocmVxLm9yaWdpbmFsVXJsKSkge1xuICAgICAgcmVzLmNvbnRlbnRUeXBlKCdqc29uJyk7XG4gICAgICByZXMuc2VuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIGlzTWFpblByb2Nlc3MsXG4gICAgICAgIGZpbGVzSGFzaDogQXJyYXkuZnJvbShmaWxlc0hhc2gudmFsdWVzKCkpLFxuICAgICAgICBpc19wbTJfc2xhdmU6IGlzUG0yLFxuICAgICAgICBob3N0bmFtZTogb3MuaG9zdG5hbWUoKSxcbiAgICAgICAgcGlkOiBwcm9jZXNzLnBpZCxcbiAgICAgICAgbWVtOiBtZW1zdGF0KCksXG4gICAgICAgIGNwdXM6IG9zLmNwdXMoKSxcbiAgICAgICAgYXJjaDogb3MuYXJjaCgpLFxuICAgICAgICBwbGF0Zm9ybTogb3MucGxhdGZvcm0oKSxcbiAgICAgICAgbG9hZGF2Zzogb3MubG9hZGF2ZygpXG4gICAgICB9LCBudWxsLCAnICAnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5leHQoKTtcbiAgICB9XG4gIH0pO1xuXG4gIGxldCBjaGVja2VkU2VxID0gJyc7XG5cbiAgYXBwLnVzZSgnL19jaGVja21haWwvOnNlcScsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIGxvZy5pbmZvKCdmb3JjZSBjaGVjayBtYWlsIGZvcjonLCByZXEucGFyYW1zLnNlcSk7XG4gICAgaWYgKGNoZWNrZWRTZXEgPT09IHJlcS5wYXJhbXMuc2VxKVxuICAgICAgcmV0dXJuO1xuICAgIGlmIChpc1BtMiAmJiAhaXNNYWluUHJvY2Vzcykge1xuICAgICAgcHJvY2Vzcy5zZW5kISh7XG4gICAgICAgIHR5cGUgOiAncHJvY2Vzczptc2cnLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgJ2NkLXNlcnZlcjpjaGVjayBtYWlsJzogcmVxLnBhcmFtcy5zZXEsXG4gICAgICAgICAgcGlkOiBwcm9jZXNzLnBpZFxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgaW1hcC5jaGVja01haWxGb3JVcGRhdGUoKTtcbiAgICB9XG4gIH0pO1xuXG4gIGFwcC51c2UoJy9fdGltZScsIChyZXEsIHJlcykgPT4ge1xuICAgIHJlcy5zZW5kKGdlbmVyYXRlVG9rZW4oKSk7XG4gIH0pO1xuXG5cbiAgY29uc3Qgcm91dGVyID0gYXBpLmV4cHJlc3MuUm91dGVyKCk7XG4gIHJvdXRlci5nZXQoJy9fZ2l0aGFzaCcsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHJlcy5zZXRIZWFkZXIoJ2NvbnRlbnQtdHlwZScsICd0ZXh0L3BsYWluJyk7XG4gICAgcmVzLnNlbmQoYXdhaXQgc3RyaW5naWZ5TGlzdEFsbFZlcnNpb25zKCkpO1xuICB9KTtcblxuICByb3V0ZXIucHV0PHtmaWxlOiBzdHJpbmcsIGhhc2g6IHN0cmluZ30+KCcvX2luc3RhbGxfZm9yY2UvOmZpbGUvOmhhc2gnLCBhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAocmVxIGFzIGFueSkuX2luc3RhbGxGb3JjZSA9IHRydWU7XG4gICAgbmV4dCgpO1xuICB9KTtcblxuICByb3V0ZXIucHV0PHtmaWxlOiBzdHJpbmcsIGhhc2g6IHN0cmluZ30+KCcvX2luc3RhbGwvOmZpbGUvOmhhc2gnLCBhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICBjb25zdCBpc0ZvcmNlID0gKHJlcSBhcyBhbnkpLl9pbnN0YWxsRm9yY2UgPT09IHRydWU7XG5cbiAgICBpZiAocmVxdWlyZVRva2VuICYmIHJlcS5xdWVyeS53aGlzcGVyICE9PSBnZW5lcmF0ZVRva2VuKCkpIHtcbiAgICAgIHJlcy5oZWFkZXIoJ0Nvbm5lY3Rpb24nLCAnY2xvc2UnKTtcbiAgICAgIHJlcy5zdGF0dXMoNDAxKS5zZW5kKGBSRUpFQ1QgZnJvbSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06IE5vdCBhbGxvd2VkIHRvIHB1c2ggYXJ0aWZhY3QgaW4gdGhpcyBlbnZpcm9ubWVudC5gKTtcbiAgICAgIHJlcS5zb2NrZXQuZW5kKCk7XG4gICAgICByZXMuY29ubmVjdGlvbi5lbmQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgZXhpc3RpbmcgPSBmaWxlc0hhc2guZ2V0KHJlcS5wYXJhbXMuZmlsZSk7XG4gICAgbG9nLmluZm8oYCR7cmVxLm1ldGhvZH0gWyR7b3MuaG9zdG5hbWV9XWZpbGU6ICR7cmVxLnBhcmFtcy5maWxlfSwgaGFzaDogJHtyZXEucGFyYW1zLmhhc2h9LFxcbmV4aXN0aW5nIGZpbGU6ICR7ZXhpc3RpbmcgPyBleGlzdGluZy5maWxlICsgJyAvICcgKyBleGlzdGluZy5zaGEyNTYgOiAnPE5PPid9YCArXG4gICAgICBgXFxuJHt1dGlsLmluc3BlY3QocmVxLmhlYWRlcnMpfWApO1xuXG4gICAgaWYgKHJlcXVpcmVUb2tlbiAmJiByZXEucXVlcnkud2hpc3BlciAhPT0gZ2VuZXJhdGVUb2tlbigpKSB7XG4gICAgICByZXMuaGVhZGVyKCdDb25uZWN0aW9uJywgJ2Nsb3NlJyk7XG4gICAgICByZXMuc3RhdHVzKDQwMSkuc2VuZChgUkVKRUNUIGZyb20gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiBOb3QgYWxsb3dlZCB0byBwdXNoIGFydGlmYWN0IGluIHRoaXMgZW52aXJvbm1lbnQuYCk7XG4gICAgICByZXEuc29ja2V0LmVuZCgpO1xuICAgICAgcmVzLmNvbm5lY3Rpb24uZW5kKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbG9nLmluZm8oJ3JlY2lldmluZyBkYXRhJyk7XG4gICAgaWYgKGlzUG0yICYmICFpc01haW5Qcm9jZXNzKSB7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgODAwKSk7XG4gICAgfVxuICAgIGlmICghaXNGb3JjZSAmJiBleGlzdGluZyAmJiBleGlzdGluZy5zaGEyNTYgPT09IHJlcS5wYXJhbXMuaGFzaCkge1xuICAgICAgLy8gSSB3YW50IHRvIGNhbmNlbCByZWNpZXZpbmcgcmVxdWVzdCBib2R5IGFzYXBcbiAgICAgIC8vIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE4MzY3ODI0L2hvdy10by1jYW5jZWwtaHR0cC11cGxvYWQtZnJvbS1kYXRhLWV2ZW50c1xuICAgICAgcmVzLmhlYWRlcignQ29ubmVjdGlvbicsICdjbG9zZScpO1xuICAgICAgcmVzLnN0YXR1cyg0MDkpLnNlbmQoYFtSRUpFQ1RdICR7b3MuaG9zdG5hbWUoKX0gcGlkOiAke3Byb2Nlc3MucGlkfTpgICtcbiAgICAgIGAtIGZvdW5kIGV4aXN0aW5nOiAke0pTT04uc3RyaW5naWZ5KGV4aXN0aW5nLCBudWxsLCAnICAnKX1cXG5gICtcbiAgICAgIGAtIGhhc2hzOlxcbiAgJHtKU09OLnN0cmluZ2lmeShmaWxlc0hhc2gsIG51bGwsICcgICcpfWApO1xuICAgICAgcmVxLnNvY2tldC5lbmQoKTtcbiAgICAgIHJlcy5jb25uZWN0aW9uLmVuZCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgY29uc3QgbmV3Q2hlY2tzdW1JdGVtOiBDaGVja3N1bUl0ZW0gPSB7XG4gICAgICBmaWxlOiByZXEucGFyYW1zLmZpbGUsXG4gICAgICBzaGEyNTY6IHJlcS5wYXJhbXMuaGFzaCxcbiAgICAgIGNyZWF0ZWQ6IG5vdy50b0xvY2FsZVN0cmluZygpLFxuICAgICAgY3JlYXRlZFRpbWU6IG5vdy5nZXRUaW1lKClcbiAgICB9O1xuXG4gICAgY29uc3QgY29udGVudExlbiA9IHJlcS5oZWFkZXJzWydjb250ZW50LWxlbmd0aCddO1xuICAgIGxldCByZWNpZXZlZDogUmVjaWV2ZWREYXRhO1xuICAgIC8vIGNoZWNrc3VtLnZlcnNpb25zIVtyZXEucGFyYW1zLmFwcF0gPSB7dmVyc2lvbjogcGFyc2VJbnQocmVxLnBhcmFtcy52ZXJzaW9uLCAxMCl9O1xuICAgIHRyeSB7XG4gICAgICByZWNpZXZlZCA9IGF3YWl0IHJlYWRSZXNwb25zZVRvQnVmZmVyKHJlcSwgcmVxLnBhcmFtcy5oYXNoLCBjb250ZW50TGVuID8gcGFyc2VJbnQoY29udGVudExlbiwgMTApIDogMTAgKiAxMDI0ICogMTAyNCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUubWVzc2FnZSA9PT0gJ3NoYTI1NiBub3QgbWF0Y2gnKSB7XG4gICAgICAgIHJlcy5zZW5kKGBbV0FSTl0gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiAke0pTT04uc3RyaW5naWZ5KG5ld0NoZWNrc3VtSXRlbSwgbnVsbCwgJyAgJyl9XFxuYCArXG4gICAgICAgICAgYFJlY2lldmVkIGZpbGUgaXMgY29ycnVwdGVkIHdpdGggaGFzaCAke2Uuc2hhMjU2fSxcXG53aGlsZSBleHBlY3RpbmcgZmlsZSBoYXNoIGlzICR7bmV3Q2hlY2tzdW1JdGVtLnNoYTI1Nn1gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlcy5zdGF0dXMoNTAwKTtcbiAgICAgICAgcmVzLnNlbmQoZS5zdGFjayk7XG4gICAgICB9XG4gICAgfVxuICAgIHJlcy5zZW5kKGBbQUNDRVBUXSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06ICR7SlNPTi5zdHJpbmdpZnkobmV3Q2hlY2tzdW1JdGVtLCBudWxsLCAnICAnKX1gKTtcblxuICAgIGxldCBmaWxlQmFzZU5hbWUgPSBQYXRoLmJhc2VuYW1lKHJlcS5wYXJhbXMuZmlsZSk7XG4gICAgY29uc3QgZG90ID0gZmlsZUJhc2VOYW1lLmxhc3RJbmRleE9mKCcuJyk7XG4gICAgaWYgKGRvdCA+PTAgKVxuICAgICAgZmlsZUJhc2VOYW1lID0gZmlsZUJhc2VOYW1lLnNsaWNlKDAsIGRvdCk7XG4gICAgd3JpdGluZ0ZpbGUgPSBQYXRoLnJlc29sdmUoemlwRG93bmxvYWREaXIsIGAke2ZpbGVCYXNlTmFtZS5zbGljZSgwLCBmaWxlQmFzZU5hbWUubGFzdEluZGV4T2YoJy4nKSl9LiR7cHJvY2Vzcy5waWR9LnppcGApO1xuICAgIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKHdyaXRpbmdGaWxlKSk7XG4gICAgZnMud3JpdGVGaWxlKHdyaXRpbmdGaWxlLCByZWNpZXZlZCEuY29udGVudCwgb25aaXBGaWxlV3JpdHRlbik7XG4gICAgZmlsZXNIYXNoLnNldChuZXdDaGVja3N1bUl0ZW0uZmlsZSwgbmV3Q2hlY2tzdW1JdGVtKTtcbiAgICB3cml0ZUNoZWNrc3VtRmlsZShmaWxlc0hhc2gpO1xuICAgIGlmIChpc1BtMikge1xuICAgICAgY29uc3QgbXNnOiBQbTJQYWNrZXQgPSB7XG4gICAgICAgIHR5cGUgOiAncHJvY2Vzczptc2cnLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgJ2NkLXNlcnZlcjpjaGVja3N1bSB1cGRhdGluZyc6IG5ld0NoZWNrc3VtSXRlbSxcbiAgICAgICAgICBwaWQ6IHByb2Nlc3MucGlkXG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBwcm9jZXNzLnNlbmQhKG1zZyk7XG4gICAgfVxuICB9KTtcblxuXG4gIGFwcC51c2UoJy8nLCByb3V0ZXIpO1xuXG4gIGZ1bmN0aW9uIG9uWmlwRmlsZVdyaXR0ZW4oKSB7XG4gICAgaWYgKGlzUG0yICYmICFpc01haW5Qcm9jZXNzKSB7XG4gICAgICBjb25zdCBtc2c6IFBtMlBhY2tldCA9IHtcbiAgICAgICAgdHlwZSA6ICdwcm9jZXNzOm1zZycsXG4gICAgICAgIGRhdGE6IHtleHRyYWN0WmlwOiB0cnVlLCBwaWQ6IHByb2Nlc3MucGlkfVxuICAgICAgfTtcbiAgICAgIHByb2Nlc3Muc2VuZCEobXNnKTtcbiAgICB9IGVsc2VcbiAgICAgIHJldHJ5KDIsIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCkudGhlbigoKSA9PiBhcGkuZXZlbnRCdXMuZW1pdChhcGkucGFja2FnZU5hbWUgKyAnLmRvd25sb2FkZWQnKSk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBpbml0UG0yKCkge1xuICAgIGNvbnN0IHBtMiA9IHJlcXVpcmUoJ3BtMicpO1xuICAgIGNvbnN0IHBtMmNvbm5lY3QgPSB1dGlsLnByb21pc2lmeShwbTIuY29ubmVjdC5iaW5kKHBtMikpO1xuICAgIGNvbnN0IHBtMmxhdW5jaEJ1cyA9IHV0aWwucHJvbWlzaWZ5PFBtMkJ1cz4ocG0yLmxhdW5jaEJ1cy5iaW5kKHBtMikpO1xuXG4gICAgYXdhaXQgcG0yY29ubmVjdCgpO1xuICAgIGNvbnN0IGJ1cyA9IGF3YWl0IHBtMmxhdW5jaEJ1cygpO1xuICAgIGJ1cy5vbigncHJvY2Vzczptc2cnLCBwYWNrZXQgPT4ge1xuICAgICAgaWYgKCFwYWNrZXQuZGF0YSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCB1cGRhdGVkQ2hlY2tzdW1JdGVtID0gcGFja2V0LmRhdGFbJ2NkLXNlcnZlcjpjaGVja3N1bSB1cGRhdGluZyddO1xuICAgICAgaWYgKHVwZGF0ZWRDaGVja3N1bUl0ZW0gJiYgcGFja2V0LmRhdGEucGlkICE9PSBwcm9jZXNzLnBpZCkge1xuICAgICAgICBjb25zdCByZWNpZXZlZENoZWNrc3VtID0gdXBkYXRlZENoZWNrc3VtSXRlbTtcbiAgICAgICAgZmlsZXNIYXNoLnNldChyZWNpZXZlZENoZWNrc3VtLmZpbGUsIHJlY2lldmVkQ2hlY2tzdW0pO1xuICAgICAgICBsb2cuaW5mbygnT3RoZXIgcHJvY2VzcyByZWNpZXZlZCB1cGRhdGluZyBjaGVja3N1bSAlcyBmcm9tIGlkOiAlcycsXG4gICAgICAgICAgdXRpbC5pbnNwZWN0KHJlY2lldmVkQ2hlY2tzdW0pLCBfLmdldChwYWNrZXQsICdwcm9jZXNzLnBtX2lkJykpO1xuICAgICAgfVxuICAgICAgY29uc3QgY2hlY2tNYWlsUHJvcCA9IHBhY2tldC5kYXRhWydjZC1zZXJ2ZXI6Y2hlY2sgbWFpbCddO1xuICAgICAgaWYgKGNoZWNrTWFpbFByb3AgJiYgcGFja2V0LmRhdGEucGlkICE9PSBwcm9jZXNzLnBpZCkge1xuICAgICAgICBjaGVja2VkU2VxID0gY2hlY2tNYWlsUHJvcDtcbiAgICAgICAgbG9nLmluZm8oJ090aGVyIHByb2Nlc3MgdHJpZ2dlcnMgXCJjaGVjayBtYWlsXCIgZnJvbSBpZDonLCBfLmdldChwYWNrZXQsICdwcm9jZXNzLnBtX2lkJykpO1xuICAgICAgICAvLyBpbWFwLmNoZWNrTWFpbEZvclVwZGF0ZSgpO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFja2V0LmRhdGEuZXh0cmFjdFppcCAmJiBwYWNrZXQuZGF0YS5waWQgIT09IHByb2Nlc3MucGlkKSB7XG4gICAgICAgIGxvZy5pbmZvKCdPdGhlciBwcm9jZXNzIHRyaWdnZXJzIFwiZXh0cmFjdFppcFwiIGZyb20gaWQ6JywgXy5nZXQocGFja2V0LCAncHJvY2Vzcy5wbV9pZCcpKTtcbiAgICAgICAgcmV0cnkoMiwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwKS50aGVuKCgpID0+IGFwaS5ldmVudEJ1cy5lbWl0KGFwaS5wYWNrYWdlTmFtZSArICcuZG93bmxvYWRlZCcpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVUb2tlbigpIHtcbiAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IHRva2VuID0gZGF0ZS5nZXREYXRlKCkgKyAnJyArIGRhdGUuZ2V0SG91cnMoKTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKHRva2VuKTtcbiAgcmV0dXJuIHRva2VuO1xufVxuXG5mdW5jdGlvbiByZWFkUmVzcG9uc2VUb0J1ZmZlcihyZXE6IFJlcXVlc3Q8e2ZpbGU6IHN0cmluZywgaGFzaDogc3RyaW5nfT4sIGV4cGVjdFNoYTI1Njogc3RyaW5nLCBsZW5ndGg6IG51bWJlcilcbiAgOiBQcm9taXNlPFJlY2lldmVkRGF0YT4ge1xuICAvLyBsZXQgY291bnRCeXRlcyA9IDA7XG5cbiAgbGV0IGhhc2g6IEhhc2g7XG4gIGxldCBoYXNoRG9uZTogUHJvbWlzZTxzdHJpbmc+O1xuXG4gIGNvbnN0IGJ1ZiA9IEJ1ZmZlci5hbGxvYyhsZW5ndGgpO1xuICBsZXQgYnVmT2Zmc2V0ID0gMDtcblxuICByZXEub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PiB7XG4gICAgYnVmT2Zmc2V0ICs9IGRhdGEuY29weShidWYsIGJ1Zk9mZnNldCwgMCk7XG4gICAgbG9nLmRlYnVnKGBSZWNpZXZpbmcsICR7YnVmT2Zmc2V0fSBieXRlc2ApO1xuICAgIGlmIChoYXNoID09IG51bGwpIHtcbiAgICAgIGhhc2ggPSBjcnlwdG8uY3JlYXRlSGFzaCgnc2hhMjU2Jyk7XG4gICAgICBoYXNoRG9uZSA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICBoYXNoLm9uKCdyZWFkYWJsZScsICgpID0+IHtcbiAgICAgICAgICBjb25zdCBkYXRhID0gaGFzaC5yZWFkKCk7XG4gICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgIHJlc29sdmUoZGF0YS50b1N0cmluZygnaGV4JykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgaGFzaC53cml0ZShkYXRhKTtcblxuICAgIC8vIGlmIChmd3JpdGVyID09IG51bGwpIHtcbiAgICAvLyAgIGxldCBmaWxlQmFzZU5hbWUgPSBQYXRoLmJhc2VuYW1lKHJlcS5wYXJhbXMuZmlsZSk7XG4gICAgLy8gICBjb25zdCBkb3QgPSBmaWxlQmFzZU5hbWUubGFzdEluZGV4T2YoJy4nKTtcbiAgICAvLyAgIGlmIChkb3QgPj0wIClcbiAgICAvLyAgICAgZmlsZUJhc2VOYW1lID0gZmlsZUJhc2VOYW1lLnNsaWNlKDAsIGRvdCk7XG4gICAgLy8gICB3cml0aW5nRmlsZSA9IFBhdGgucmVzb2x2ZSh6aXBEb3dubG9hZERpciwgYCR7ZmlsZUJhc2VOYW1lLnNsaWNlKDAsIGZpbGVCYXNlTmFtZS5sYXN0SW5kZXhPZignLicpKX0uJHtwcm9jZXNzLnBpZH0uemlwYCk7XG4gICAgLy8gICBmcy5ta2RpcnBTeW5jKFBhdGguZGlybmFtZSh3cml0aW5nRmlsZSkpO1xuICAgIC8vICAgZndyaXRlciA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKHdyaXRpbmdGaWxlKTtcbiAgICAvLyB9XG4gICAgLy8gZndyaXRlci53cml0ZShkYXRhKTtcbiAgfSk7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqKSA9PiB7XG4gICAgcmVxLm9uKCdlbmQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBsb2cuaW5mbyhgVG90YWwgcmVjaWV2ZWQgJHtidWZPZmZzZXR9IGJ5dGVzYCk7XG4gICAgICBpZiAoYnVmT2Zmc2V0ID4gbGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiByZWoobmV3IEVycm9yKGBSZWNpZXZlZCBkYXRhIGxlbmd0aCAke2J1Zk9mZnNldH0gaXMgZ3JlYXRlciB0aGFuIGV4cGVjcmVkIGNvbnRlbnQgbGVuZ3RoICR7bGVuZ3RofWApKTtcbiAgICAgIH1cbiAgICAgIGxldCBzaGE6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgIGlmIChoYXNoKSB7XG4gICAgICAgIGhhc2guZW5kKCk7XG4gICAgICAgIHNoYSA9IGF3YWl0IGhhc2hEb25lO1xuICAgICAgfVxuXG4gICAgICBpZiAoc2hhICE9PSBleHBlY3RTaGEyNTYpIHtcbiAgICAgICAgY29uc3QgZXJyID0gbmV3IEVycm9yKCdzaGEyNTYgbm90IG1hdGNoJyk7XG4gICAgICAgIChlcnIgYXMgYW55KS5zaGEyNTYgPSBzaGE7XG4gICAgICAgIC8vIFRPRE86XG4gICAgICAgIC8vIHJlcy5zZW5kKGBbV0FSTl0gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiAke0pTT04uc3RyaW5naWZ5KG5ld0NoZWNrc3VtSXRlbSwgbnVsbCwgJyAgJyl9XFxuYCArXG4gICAgICAgIC8vICAgYFJlY2lldmVkIGZpbGUgaXMgY29ycnVwdGVkIHdpdGggaGFzaCAke3NoYX0sXFxud2hpbGUgZXhwZWN0aW5nIGZpbGUgaGFzaCBpcyAke25ld0NoZWNrc3VtSXRlbS5zaGEyNTZ9YCk7XG4gICAgICAgIC8vIGZ3cml0ZXIhLmVuZChvblppcEZpbGVXcml0dGVuKTtcbiAgICAgICAgLy8gZndyaXRlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIHJlaihlcnIpO1xuICAgICAgfVxuICAgICAgcmVzb2x2ZSh7XG4gICAgICAgIGhhc2g6IHNoYSxcbiAgICAgICAgY29udGVudDogYnVmLnNsaWNlKDAsIGJ1Zk9mZnNldCksXG4gICAgICAgIGxlbmd0aDogYnVmT2Zmc2V0XG4gICAgICB9KTtcblxuICAgICAgLy8gZndyaXRlciEuZW5kKG9uWmlwRmlsZVdyaXR0ZW4pO1xuICAgICAgLy8gZndyaXRlciA9IHVuZGVmaW5lZDtcbiAgICAgIC8vIHJlcy5zZW5kKGBbQUNDRVBUXSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06ICR7SlNPTi5zdHJpbmdpZnkobmV3Q2hlY2tzdW1JdGVtLCBudWxsLCAnICAnKX1gKTtcblxuICAgICAgLy8gZmlsZXNIYXNoLnNldChuZXdDaGVja3N1bUl0ZW0uZmlsZSwgbmV3Q2hlY2tzdW1JdGVtKTtcbiAgICAgIC8vIHdyaXRlQ2hlY2tzdW1GaWxlKGZpbGVzSGFzaCk7XG4gICAgICAvLyBpZiAoaXNQbTIpIHtcbiAgICAgIC8vICAgY29uc3QgbXNnOiBQbTJQYWNrZXQgPSB7XG4gICAgICAvLyAgICAgdHlwZSA6ICdwcm9jZXNzOm1zZycsXG4gICAgICAvLyAgICAgZGF0YToge1xuICAgICAgLy8gICAgICAgJ2NkLXNlcnZlcjpjaGVja3N1bSB1cGRhdGluZyc6IG5ld0NoZWNrc3VtSXRlbSxcbiAgICAgIC8vICAgICAgIHBpZDogcHJvY2Vzcy5waWRcbiAgICAgIC8vICAgICB9XG4gICAgICAvLyAgIH07XG4gICAgICAvLyAgIHByb2Nlc3Muc2VuZCEobXNnKTtcbiAgICAgIC8vIH1cbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJlYWRDaGVja3N1bUZpbGUoKTogTWFwPHN0cmluZywgQ2hlY2tzdW1JdGVtPiB7XG4gIGNvbnN0IGVudiA9IG1haWxTZXR0aW5nID8gbWFpbFNldHRpbmcuZW52IDogJ2xvY2FsJztcbiAgY29uc3QgY2hlY2tzdW1GaWxlID0gUGF0aC5yZXNvbHZlKCdjaGVja3N1bS4nICsgZW52ICsgJy5qc29uJyk7XG4gIGxldCBjaGVja3N1bTogQ2hlY2tzdW07XG4gIGlmIChmcy5leGlzdHNTeW5jKGNoZWNrc3VtRmlsZSkpIHtcbiAgICB0cnkge1xuICAgICAgY2hlY2tzdW0gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhjaGVja3N1bUZpbGUsICd1dGY4JykpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZy53YXJuKGUpO1xuICAgICAgY2hlY2tzdW0gPSBbXTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgY2hlY2tzdW0gPSBbXTtcbiAgfVxuICByZXR1cm4gY2hlY2tzdW0ucmVkdWNlKChtYXAsIHZhbCkgPT4gbWFwLnNldCh2YWwuZmlsZSwgdmFsKSwgbmV3IE1hcDxzdHJpbmcsIENoZWNrc3VtSXRlbT4oKSk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlQ2hlY2tzdW1GaWxlKGNoZWNrc3VtOiBSZXR1cm5UeXBlPHR5cGVvZiByZWFkQ2hlY2tzdW1GaWxlPikge1xuICBjb25zdCBlbnYgPSBtYWlsU2V0dGluZyA/IG1haWxTZXR0aW5nLmVudiA6ICdsb2NhbCc7XG4gIGZzLndyaXRlRmlsZShQYXRoLnJlc29sdmUoJ2NoZWNrc3VtLicgKyBlbnYgKyAnLmpzb24nKSwgSlNPTi5zdHJpbmdpZnkoQXJyYXkuZnJvbShjaGVja3N1bS52YWx1ZXMoKSksIG51bGwsICcgICcpLCAoZXJyKSA9PiB7XG4gICAgaWYgKGVycikge1xuICAgICAgbG9nLmVycm9yKGVycik7XG4gICAgfVxuICB9KTtcbn1cbiJdfQ==