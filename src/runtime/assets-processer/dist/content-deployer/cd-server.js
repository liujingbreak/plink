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
// import {stringifyListAllVersions} from '@wfh/prebuild/dist/artifacts';
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
        // router.get('/_githash', async (req, res) => {
        //   res.setHeader('content-type', 'text/plain');
        //   res.send(await stringifyListAllVersions());
        // });
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
                if (res.connection)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2Qtc2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2Qtc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSw0Q0FBb0I7QUFFcEIsMkNBQTZCO0FBQzdCLGtEQUF5RjtBQUN6RixnREFBd0I7QUFFeEIsd0RBQTBCO0FBQzFCLG9EQUF1QjtBQUN2QixvRkFBMEQ7QUFDMUQsb0RBQW9DO0FBQ3BDLGtEQUF3QjtBQUN4Qix5RUFBeUU7QUFFekUsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLFlBQVksQ0FBQyxDQUFDO0FBc0J4RSxNQUFNLFlBQVksR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEVBQUUsY0FBYyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDOUUsTUFBTSxXQUFXLEdBQUksZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBMEIsQ0FBQyxlQUFlLENBQUM7QUFHOUYsU0FBc0IsUUFBUSxDQUFDLEdBQWdCLEVBQUUsSUFBaUI7O1FBQ2hFLElBQUksV0FBK0IsQ0FBQztRQUVwQyxJQUFJLFNBQVMsR0FBRyxnQkFBZ0IsRUFBRSxDQUFDO1FBRW5DLE1BQU0sRUFBQyxLQUFLLEVBQUUsYUFBYSxFQUFDLEdBQUcseUJBQVUsRUFBRSxDQUFDO1FBQzVDLElBQUksS0FBSyxFQUFFO1lBQ1QsT0FBTyxFQUFFLENBQUM7U0FDWDtRQUVELElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxZQUFFLENBQUMsUUFBUSxJQUFJLE9BQU8sQ0FBQyxHQUFHLFlBQVksRUFBRSxJQUFJLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBRW5GLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENB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dH0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IHtDaGVja3N1bSwgV2l0aE1haWxTZXJ2ZXJDb25maWd9IGZyb20gJy4uL2ZldGNoLXR5cGVzJztcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAndXRpbCc7XG5pbXBvcnQge2dldFBtMkluZm8sIHppcERvd25sb2FkRGlyLCBmb3JrRXh0cmFjdEV4c3RpbmdaaXAsIHJldHJ5fSBmcm9tICcuLi9mZXRjaC1yZW1vdGUnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge0ltYXBNYW5hZ2VyfSBmcm9tICcuLi9mZXRjaC1yZW1vdGUtaW1hcCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBtZW1zdGF0IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvbWVtLXN0YXRzJztcbmltcG9ydCBjcnlwdG8sIHtIYXNofSBmcm9tICdjcnlwdG8nO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG4vLyBpbXBvcnQge3N0cmluZ2lmeUxpc3RBbGxWZXJzaW9uc30gZnJvbSAnQHdmaC9wcmVidWlsZC9kaXN0L2FydGlmYWN0cyc7XG5cbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmNkLXNlcnZlcicpO1xuXG5pbnRlcmZhY2UgUG0yUGFja2V0IHtcbiAgdHlwZTogJ3Byb2Nlc3M6bXNnJztcbiAgZGF0YToge1xuICAgIHBpZDogbnVtYmVyO1xuICAgICdjZC1zZXJ2ZXI6Y2hlY2tzdW0gdXBkYXRpbmcnPzogQ2hlY2tzdW1JdGVtO1xuICAgICdjZC1zZXJ2ZXI6Y2hlY2sgbWFpbCc/OiBzdHJpbmc7XG4gICAgZXh0cmFjdFppcD86IGJvb2xlYW47XG4gIH07XG59XG5cbmludGVyZmFjZSBQbTJCdXMge1xuICBvbihldmVudDogJ3Byb2Nlc3M6bXNnJywgY2I6IChwYWNrZXQ6IFBtMlBhY2tldCkgPT4gdm9pZCk6IHZvaWQ7XG59XG5cbnR5cGUgQ2hlY2tzdW1JdGVtID0gQ2hlY2tzdW0gZXh0ZW5kcyBBcnJheTxpbmZlciBJPiA/IEkgOiB1bmtub3duO1xuXG5pbnRlcmZhY2UgUmVjaWV2ZWREYXRhIHtcbiAgaGFzaD86IHN0cmluZzsgY29udGVudDogQnVmZmVyOyBsZW5ndGg6IG51bWJlcjtcbn1cblxuY29uc3QgcmVxdWlyZVRva2VuID0gYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ3JlcXVpcmVUb2tlbiddLCBmYWxzZSk7XG5jb25zdCBtYWlsU2V0dGluZyA9IChhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpIGFzIFdpdGhNYWlsU2VydmVyQ29uZmlnKS5mZXRjaE1haWxTZXJ2ZXI7XG5cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFjdGl2YXRlKGFwcDogQXBwbGljYXRpb24sIGltYXA6IEltYXBNYW5hZ2VyKSB7XG4gIGxldCB3cml0aW5nRmlsZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIGxldCBmaWxlc0hhc2ggPSByZWFkQ2hlY2tzdW1GaWxlKCk7XG5cbiAgY29uc3Qge2lzUG0yLCBpc01haW5Qcm9jZXNzfSA9IGdldFBtMkluZm8oKTtcbiAgaWYgKGlzUG0yKSB7XG4gICAgaW5pdFBtMigpO1xuICB9XG5cbiAgaW1hcC5hcHBlbmRNYWlsKGBzZXJ2ZXIgJHtvcy5ob3N0bmFtZX0gJHtwcm9jZXNzLnBpZH0gYWN0aXZhdGVzYCwgbmV3IERhdGUoKSArICcnKTtcblxuICBhcHAudXNlKCcvX3N0YXQnLCBhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICBpZiAocmVxdWlyZVRva2VuICYmIHJlcS5xdWVyeS53aGlzcGVyICE9PSBnZW5lcmF0ZVRva2VuKCkpIHtcbiAgICAgIHJlcy5oZWFkZXIoJ0Nvbm5lY3Rpb24nLCAnY2xvc2UnKTtcbiAgICAgIHJlcy5zdGF0dXMoNDAxKS5zZW5kKGBSRUpFQ1QgZnJvbSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06IE5vdCBhbGxvd2VkIHRvIHB1c2ggYXJ0aWZhY3QgaW4gdGhpcyBlbnZpcm9ubWVudC5gKTtcbiAgICAgIHJlcS5zb2NrZXQuZW5kKCk7XG4gICAgICBpZiAocmVzLmNvbm5lY3Rpb24pXG4gICAgICAgIHJlcy5jb25uZWN0aW9uLmVuZCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuXG4gICAgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnICYmIC9eXFwvX3N0YXQoWyM/L118JCkvLnRlc3QocmVxLm9yaWdpbmFsVXJsKSkge1xuICAgICAgcmVzLmNvbnRlbnRUeXBlKCdqc29uJyk7XG4gICAgICByZXMuc2VuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIGlzTWFpblByb2Nlc3MsXG4gICAgICAgIGZpbGVzSGFzaDogQXJyYXkuZnJvbShmaWxlc0hhc2gudmFsdWVzKCkpLFxuICAgICAgICBpc19wbTJfc2xhdmU6IGlzUG0yLFxuICAgICAgICBob3N0bmFtZTogb3MuaG9zdG5hbWUoKSxcbiAgICAgICAgcGlkOiBwcm9jZXNzLnBpZCxcbiAgICAgICAgbWVtOiBtZW1zdGF0KCksXG4gICAgICAgIGNwdXM6IG9zLmNwdXMoKSxcbiAgICAgICAgYXJjaDogb3MuYXJjaCgpLFxuICAgICAgICBwbGF0Zm9ybTogb3MucGxhdGZvcm0oKSxcbiAgICAgICAgbG9hZGF2Zzogb3MubG9hZGF2ZygpXG4gICAgICB9LCBudWxsLCAnICAnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5leHQoKTtcbiAgICB9XG4gIH0pO1xuXG4gIGxldCBjaGVja2VkU2VxID0gJyc7XG5cbiAgYXBwLnVzZSgnL19jaGVja21haWwvOnNlcScsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIGxvZy5pbmZvKCdmb3JjZSBjaGVjayBtYWlsIGZvcjonLCByZXEucGFyYW1zLnNlcSk7XG4gICAgaWYgKGNoZWNrZWRTZXEgPT09IHJlcS5wYXJhbXMuc2VxKVxuICAgICAgcmV0dXJuO1xuICAgIGlmIChpc1BtMiAmJiAhaXNNYWluUHJvY2Vzcykge1xuICAgICAgcHJvY2Vzcy5zZW5kISh7XG4gICAgICAgIHR5cGUgOiAncHJvY2Vzczptc2cnLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgJ2NkLXNlcnZlcjpjaGVjayBtYWlsJzogcmVxLnBhcmFtcy5zZXEsXG4gICAgICAgICAgcGlkOiBwcm9jZXNzLnBpZFxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgaW1hcC5jaGVja01haWxGb3JVcGRhdGUoKTtcbiAgICB9XG4gIH0pO1xuXG4gIGFwcC51c2UoJy9fdGltZScsIChyZXEsIHJlcykgPT4ge1xuICAgIHJlcy5zZW5kKGdlbmVyYXRlVG9rZW4oKSk7XG4gIH0pO1xuXG5cbiAgY29uc3Qgcm91dGVyID0gYXBpLmV4cHJlc3MuUm91dGVyKCk7XG4gIC8vIHJvdXRlci5nZXQoJy9fZ2l0aGFzaCcsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAvLyAgIHJlcy5zZXRIZWFkZXIoJ2NvbnRlbnQtdHlwZScsICd0ZXh0L3BsYWluJyk7XG4gIC8vICAgcmVzLnNlbmQoYXdhaXQgc3RyaW5naWZ5TGlzdEFsbFZlcnNpb25zKCkpO1xuICAvLyB9KTtcblxuICByb3V0ZXIucHV0PHtmaWxlOiBzdHJpbmcsIGhhc2g6IHN0cmluZ30+KCcvX2luc3RhbGxfZm9yY2UvOmZpbGUvOmhhc2gnLCBhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAocmVxIGFzIGFueSkuX2luc3RhbGxGb3JjZSA9IHRydWU7XG4gICAgbmV4dCgpO1xuICB9KTtcblxuICByb3V0ZXIucHV0PHtmaWxlOiBzdHJpbmcsIGhhc2g6IHN0cmluZ30+KCcvX2luc3RhbGwvOmZpbGUvOmhhc2gnLCBhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICBjb25zdCBpc0ZvcmNlID0gKHJlcSBhcyBhbnkpLl9pbnN0YWxsRm9yY2UgPT09IHRydWU7XG5cbiAgICBpZiAocmVxdWlyZVRva2VuICYmIHJlcS5xdWVyeS53aGlzcGVyICE9PSBnZW5lcmF0ZVRva2VuKCkpIHtcbiAgICAgIHJlcy5oZWFkZXIoJ0Nvbm5lY3Rpb24nLCAnY2xvc2UnKTtcbiAgICAgIHJlcy5zdGF0dXMoNDAxKS5zZW5kKGBSRUpFQ1QgZnJvbSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06IE5vdCBhbGxvd2VkIHRvIHB1c2ggYXJ0aWZhY3QgaW4gdGhpcyBlbnZpcm9ubWVudC5gKTtcbiAgICAgIHJlcS5zb2NrZXQuZW5kKCk7XG4gICAgICBpZiAocmVzLmNvbm5lY3Rpb24pXG4gICAgICAgIHJlcy5jb25uZWN0aW9uLmVuZCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBleGlzdGluZyA9IGZpbGVzSGFzaC5nZXQocmVxLnBhcmFtcy5maWxlKTtcbiAgICBsb2cuaW5mbyhgJHtyZXEubWV0aG9kfSBbJHtvcy5ob3N0bmFtZX1dZmlsZTogJHtyZXEucGFyYW1zLmZpbGV9LCBoYXNoOiAke3JlcS5wYXJhbXMuaGFzaH0sXFxuZXhpc3RpbmcgZmlsZTogJHtleGlzdGluZyA/IGV4aXN0aW5nLmZpbGUgKyAnIC8gJyArIGV4aXN0aW5nLnNoYTI1NiA6ICc8Tk8+J31gICtcbiAgICAgIGBcXG4ke3V0aWwuaW5zcGVjdChyZXEuaGVhZGVycyl9YCk7XG5cbiAgICBpZiAocmVxdWlyZVRva2VuICYmIHJlcS5xdWVyeS53aGlzcGVyICE9PSBnZW5lcmF0ZVRva2VuKCkpIHtcbiAgICAgIHJlcy5oZWFkZXIoJ0Nvbm5lY3Rpb24nLCAnY2xvc2UnKTtcbiAgICAgIHJlcy5zdGF0dXMoNDAxKS5zZW5kKGBSRUpFQ1QgZnJvbSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06IE5vdCBhbGxvd2VkIHRvIHB1c2ggYXJ0aWZhY3QgaW4gdGhpcyBlbnZpcm9ubWVudC5gKTtcbiAgICAgIHJlcS5zb2NrZXQuZW5kKCk7XG4gICAgICBpZiAocmVzLmNvbm5lY3Rpb24pXG4gICAgICAgIHJlcy5jb25uZWN0aW9uLmVuZCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxvZy5pbmZvKCdyZWNpZXZpbmcgZGF0YScpO1xuICAgIGlmIChpc1BtMiAmJiAhaXNNYWluUHJvY2Vzcykge1xuICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDgwMCkpO1xuICAgIH1cbiAgICBpZiAoIWlzRm9yY2UgJiYgZXhpc3RpbmcgJiYgZXhpc3Rpbmcuc2hhMjU2ID09PSByZXEucGFyYW1zLmhhc2gpIHtcbiAgICAgIC8vIEkgd2FudCB0byBjYW5jZWwgcmVjaWV2aW5nIHJlcXVlc3QgYm9keSBhc2FwXG4gICAgICAvLyBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xODM2NzgyNC9ob3ctdG8tY2FuY2VsLWh0dHAtdXBsb2FkLWZyb20tZGF0YS1ldmVudHNcbiAgICAgIHJlcy5oZWFkZXIoJ0Nvbm5lY3Rpb24nLCAnY2xvc2UnKTtcbiAgICAgIHJlcy5zdGF0dXMoNDA5KS5zZW5kKGBbUkVKRUNUXSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06YCArXG4gICAgICBgLSBmb3VuZCBleGlzdGluZzogJHtKU09OLnN0cmluZ2lmeShleGlzdGluZywgbnVsbCwgJyAgJyl9XFxuYCArXG4gICAgICBgLSBoYXNoczpcXG4gICR7SlNPTi5zdHJpbmdpZnkoZmlsZXNIYXNoLCBudWxsLCAnICAnKX1gKTtcbiAgICAgIHJlcS5zb2NrZXQuZW5kKCk7XG4gICAgICBpZiAocmVzLmNvbm5lY3Rpb24pXG4gICAgICAgIHJlcy5jb25uZWN0aW9uLmVuZCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgY29uc3QgbmV3Q2hlY2tzdW1JdGVtOiBDaGVja3N1bUl0ZW0gPSB7XG4gICAgICBmaWxlOiByZXEucGFyYW1zLmZpbGUsXG4gICAgICBzaGEyNTY6IHJlcS5wYXJhbXMuaGFzaCxcbiAgICAgIGNyZWF0ZWQ6IG5vdy50b0xvY2FsZVN0cmluZygpLFxuICAgICAgY3JlYXRlZFRpbWU6IG5vdy5nZXRUaW1lKClcbiAgICB9O1xuXG4gICAgY29uc3QgY29udGVudExlbiA9IHJlcS5oZWFkZXJzWydjb250ZW50LWxlbmd0aCddO1xuICAgIGxldCByZWNpZXZlZDogUmVjaWV2ZWREYXRhO1xuICAgIC8vIGNoZWNrc3VtLnZlcnNpb25zIVtyZXEucGFyYW1zLmFwcF0gPSB7dmVyc2lvbjogcGFyc2VJbnQocmVxLnBhcmFtcy52ZXJzaW9uLCAxMCl9O1xuICAgIHRyeSB7XG4gICAgICByZWNpZXZlZCA9IGF3YWl0IHJlYWRSZXNwb25zZVRvQnVmZmVyKHJlcSwgcmVxLnBhcmFtcy5oYXNoLCBjb250ZW50TGVuID8gcGFyc2VJbnQoY29udGVudExlbiwgMTApIDogMTAgKiAxMDI0ICogMTAyNCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUubWVzc2FnZSA9PT0gJ3NoYTI1NiBub3QgbWF0Y2gnKSB7XG4gICAgICAgIHJlcy5zZW5kKGBbV0FSTl0gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiAke0pTT04uc3RyaW5naWZ5KG5ld0NoZWNrc3VtSXRlbSwgbnVsbCwgJyAgJyl9XFxuYCArXG4gICAgICAgICAgYFJlY2lldmVkIGZpbGUgaXMgY29ycnVwdGVkIHdpdGggaGFzaCAke2Uuc2hhMjU2fSxcXG53aGlsZSBleHBlY3RpbmcgZmlsZSBoYXNoIGlzICR7bmV3Q2hlY2tzdW1JdGVtLnNoYTI1Nn1gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlcy5zdGF0dXMoNTAwKTtcbiAgICAgICAgcmVzLnNlbmQoZS5zdGFjayk7XG4gICAgICB9XG4gICAgfVxuICAgIHJlcy5zZW5kKGBbQUNDRVBUXSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06ICR7SlNPTi5zdHJpbmdpZnkobmV3Q2hlY2tzdW1JdGVtLCBudWxsLCAnICAnKX1gKTtcblxuICAgIGxldCBmaWxlQmFzZU5hbWUgPSBQYXRoLmJhc2VuYW1lKHJlcS5wYXJhbXMuZmlsZSk7XG4gICAgY29uc3QgZG90ID0gZmlsZUJhc2VOYW1lLmxhc3RJbmRleE9mKCcuJyk7XG4gICAgaWYgKGRvdCA+PTAgKVxuICAgICAgZmlsZUJhc2VOYW1lID0gZmlsZUJhc2VOYW1lLnNsaWNlKDAsIGRvdCk7XG4gICAgd3JpdGluZ0ZpbGUgPSBQYXRoLnJlc29sdmUoemlwRG93bmxvYWREaXIsIGAke2ZpbGVCYXNlTmFtZS5zbGljZSgwLCBmaWxlQmFzZU5hbWUubGFzdEluZGV4T2YoJy4nKSl9LiR7cHJvY2Vzcy5waWR9LnppcGApO1xuICAgIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKHdyaXRpbmdGaWxlKSk7XG4gICAgZnMud3JpdGVGaWxlKHdyaXRpbmdGaWxlLCByZWNpZXZlZCEuY29udGVudCwgb25aaXBGaWxlV3JpdHRlbik7XG4gICAgZmlsZXNIYXNoLnNldChuZXdDaGVja3N1bUl0ZW0uZmlsZSwgbmV3Q2hlY2tzdW1JdGVtKTtcbiAgICB3cml0ZUNoZWNrc3VtRmlsZShmaWxlc0hhc2gpO1xuICAgIGlmIChpc1BtMikge1xuICAgICAgY29uc3QgbXNnOiBQbTJQYWNrZXQgPSB7XG4gICAgICAgIHR5cGUgOiAncHJvY2Vzczptc2cnLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgJ2NkLXNlcnZlcjpjaGVja3N1bSB1cGRhdGluZyc6IG5ld0NoZWNrc3VtSXRlbSxcbiAgICAgICAgICBwaWQ6IHByb2Nlc3MucGlkXG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBwcm9jZXNzLnNlbmQhKG1zZyk7XG4gICAgfVxuICB9KTtcblxuXG4gIGFwcC51c2UoJy8nLCByb3V0ZXIpO1xuXG4gIGZ1bmN0aW9uIG9uWmlwRmlsZVdyaXR0ZW4oKSB7XG4gICAgaWYgKGlzUG0yICYmICFpc01haW5Qcm9jZXNzKSB7XG4gICAgICBjb25zdCBtc2c6IFBtMlBhY2tldCA9IHtcbiAgICAgICAgdHlwZSA6ICdwcm9jZXNzOm1zZycsXG4gICAgICAgIGRhdGE6IHtleHRyYWN0WmlwOiB0cnVlLCBwaWQ6IHByb2Nlc3MucGlkfVxuICAgICAgfTtcbiAgICAgIHByb2Nlc3Muc2VuZCEobXNnKTtcbiAgICB9IGVsc2VcbiAgICAgIHJldHJ5KDIsIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCkudGhlbigoKSA9PiBhcGkuZXZlbnRCdXMuZW1pdChhcGkucGFja2FnZU5hbWUgKyAnLmRvd25sb2FkZWQnKSk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBpbml0UG0yKCkge1xuICAgIGNvbnN0IHBtMiA9IHJlcXVpcmUoJ3BtMicpO1xuICAgIGNvbnN0IHBtMmNvbm5lY3QgPSB1dGlsLnByb21pc2lmeShwbTIuY29ubmVjdC5iaW5kKHBtMikpO1xuICAgIGNvbnN0IHBtMmxhdW5jaEJ1cyA9IHV0aWwucHJvbWlzaWZ5PFBtMkJ1cz4ocG0yLmxhdW5jaEJ1cy5iaW5kKHBtMikpO1xuXG4gICAgYXdhaXQgcG0yY29ubmVjdCgpO1xuICAgIGNvbnN0IGJ1cyA9IGF3YWl0IHBtMmxhdW5jaEJ1cygpO1xuICAgIGJ1cy5vbigncHJvY2Vzczptc2cnLCBwYWNrZXQgPT4ge1xuICAgICAgaWYgKCFwYWNrZXQuZGF0YSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCB1cGRhdGVkQ2hlY2tzdW1JdGVtID0gcGFja2V0LmRhdGFbJ2NkLXNlcnZlcjpjaGVja3N1bSB1cGRhdGluZyddO1xuICAgICAgaWYgKHVwZGF0ZWRDaGVja3N1bUl0ZW0gJiYgcGFja2V0LmRhdGEucGlkICE9PSBwcm9jZXNzLnBpZCkge1xuICAgICAgICBjb25zdCByZWNpZXZlZENoZWNrc3VtID0gdXBkYXRlZENoZWNrc3VtSXRlbTtcbiAgICAgICAgZmlsZXNIYXNoLnNldChyZWNpZXZlZENoZWNrc3VtLmZpbGUsIHJlY2lldmVkQ2hlY2tzdW0pO1xuICAgICAgICBsb2cuaW5mbygnT3RoZXIgcHJvY2VzcyByZWNpZXZlZCB1cGRhdGluZyBjaGVja3N1bSAlcyBmcm9tIGlkOiAlcycsXG4gICAgICAgICAgdXRpbC5pbnNwZWN0KHJlY2lldmVkQ2hlY2tzdW0pLCBfLmdldChwYWNrZXQsICdwcm9jZXNzLnBtX2lkJykpO1xuICAgICAgfVxuICAgICAgY29uc3QgY2hlY2tNYWlsUHJvcCA9IHBhY2tldC5kYXRhWydjZC1zZXJ2ZXI6Y2hlY2sgbWFpbCddO1xuICAgICAgaWYgKGNoZWNrTWFpbFByb3AgJiYgcGFja2V0LmRhdGEucGlkICE9PSBwcm9jZXNzLnBpZCkge1xuICAgICAgICBjaGVja2VkU2VxID0gY2hlY2tNYWlsUHJvcDtcbiAgICAgICAgbG9nLmluZm8oJ090aGVyIHByb2Nlc3MgdHJpZ2dlcnMgXCJjaGVjayBtYWlsXCIgZnJvbSBpZDonLCBfLmdldChwYWNrZXQsICdwcm9jZXNzLnBtX2lkJykpO1xuICAgICAgICAvLyBpbWFwLmNoZWNrTWFpbEZvclVwZGF0ZSgpO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFja2V0LmRhdGEuZXh0cmFjdFppcCAmJiBwYWNrZXQuZGF0YS5waWQgIT09IHByb2Nlc3MucGlkKSB7XG4gICAgICAgIGxvZy5pbmZvKCdPdGhlciBwcm9jZXNzIHRyaWdnZXJzIFwiZXh0cmFjdFppcFwiIGZyb20gaWQ6JywgXy5nZXQocGFja2V0LCAncHJvY2Vzcy5wbV9pZCcpKTtcbiAgICAgICAgcmV0cnkoMiwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwKS50aGVuKCgpID0+IGFwaS5ldmVudEJ1cy5lbWl0KGFwaS5wYWNrYWdlTmFtZSArICcuZG93bmxvYWRlZCcpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVUb2tlbigpIHtcbiAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IHRva2VuID0gZGF0ZS5nZXREYXRlKCkgKyAnJyArIGRhdGUuZ2V0SG91cnMoKTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKHRva2VuKTtcbiAgcmV0dXJuIHRva2VuO1xufVxuXG5mdW5jdGlvbiByZWFkUmVzcG9uc2VUb0J1ZmZlcihyZXE6IFJlcXVlc3Q8e2ZpbGU6IHN0cmluZywgaGFzaDogc3RyaW5nfT4sIGV4cGVjdFNoYTI1Njogc3RyaW5nLCBsZW5ndGg6IG51bWJlcilcbiAgOiBQcm9taXNlPFJlY2lldmVkRGF0YT4ge1xuICAvLyBsZXQgY291bnRCeXRlcyA9IDA7XG5cbiAgbGV0IGhhc2g6IEhhc2g7XG4gIGxldCBoYXNoRG9uZTogUHJvbWlzZTxzdHJpbmc+O1xuXG4gIGNvbnN0IGJ1ZiA9IEJ1ZmZlci5hbGxvYyhsZW5ndGgpO1xuICBsZXQgYnVmT2Zmc2V0ID0gMDtcblxuICByZXEub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PiB7XG4gICAgYnVmT2Zmc2V0ICs9IGRhdGEuY29weShidWYsIGJ1Zk9mZnNldCwgMCk7XG4gICAgbG9nLmRlYnVnKGBSZWNpZXZpbmcsICR7YnVmT2Zmc2V0fSBieXRlc2ApO1xuICAgIGlmIChoYXNoID09IG51bGwpIHtcbiAgICAgIGhhc2ggPSBjcnlwdG8uY3JlYXRlSGFzaCgnc2hhMjU2Jyk7XG4gICAgICBoYXNoRG9uZSA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICBoYXNoLm9uKCdyZWFkYWJsZScsICgpID0+IHtcbiAgICAgICAgICBjb25zdCBkYXRhID0gaGFzaC5yZWFkKCk7XG4gICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgIHJlc29sdmUoZGF0YS50b1N0cmluZygnaGV4JykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgaGFzaC53cml0ZShkYXRhKTtcblxuICAgIC8vIGlmIChmd3JpdGVyID09IG51bGwpIHtcbiAgICAvLyAgIGxldCBmaWxlQmFzZU5hbWUgPSBQYXRoLmJhc2VuYW1lKHJlcS5wYXJhbXMuZmlsZSk7XG4gICAgLy8gICBjb25zdCBkb3QgPSBmaWxlQmFzZU5hbWUubGFzdEluZGV4T2YoJy4nKTtcbiAgICAvLyAgIGlmIChkb3QgPj0wIClcbiAgICAvLyAgICAgZmlsZUJhc2VOYW1lID0gZmlsZUJhc2VOYW1lLnNsaWNlKDAsIGRvdCk7XG4gICAgLy8gICB3cml0aW5nRmlsZSA9IFBhdGgucmVzb2x2ZSh6aXBEb3dubG9hZERpciwgYCR7ZmlsZUJhc2VOYW1lLnNsaWNlKDAsIGZpbGVCYXNlTmFtZS5sYXN0SW5kZXhPZignLicpKX0uJHtwcm9jZXNzLnBpZH0uemlwYCk7XG4gICAgLy8gICBmcy5ta2RpcnBTeW5jKFBhdGguZGlybmFtZSh3cml0aW5nRmlsZSkpO1xuICAgIC8vICAgZndyaXRlciA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKHdyaXRpbmdGaWxlKTtcbiAgICAvLyB9XG4gICAgLy8gZndyaXRlci53cml0ZShkYXRhKTtcbiAgfSk7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqKSA9PiB7XG4gICAgcmVxLm9uKCdlbmQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBsb2cuaW5mbyhgVG90YWwgcmVjaWV2ZWQgJHtidWZPZmZzZXR9IGJ5dGVzYCk7XG4gICAgICBpZiAoYnVmT2Zmc2V0ID4gbGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiByZWoobmV3IEVycm9yKGBSZWNpZXZlZCBkYXRhIGxlbmd0aCAke2J1Zk9mZnNldH0gaXMgZ3JlYXRlciB0aGFuIGV4cGVjcmVkIGNvbnRlbnQgbGVuZ3RoICR7bGVuZ3RofWApKTtcbiAgICAgIH1cbiAgICAgIGxldCBzaGE6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgIGlmIChoYXNoKSB7XG4gICAgICAgIGhhc2guZW5kKCk7XG4gICAgICAgIHNoYSA9IGF3YWl0IGhhc2hEb25lO1xuICAgICAgfVxuXG4gICAgICBpZiAoc2hhICE9PSBleHBlY3RTaGEyNTYpIHtcbiAgICAgICAgY29uc3QgZXJyID0gbmV3IEVycm9yKCdzaGEyNTYgbm90IG1hdGNoJyk7XG4gICAgICAgIChlcnIgYXMgYW55KS5zaGEyNTYgPSBzaGE7XG4gICAgICAgIC8vIFRPRE86XG4gICAgICAgIC8vIHJlcy5zZW5kKGBbV0FSTl0gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiAke0pTT04uc3RyaW5naWZ5KG5ld0NoZWNrc3VtSXRlbSwgbnVsbCwgJyAgJyl9XFxuYCArXG4gICAgICAgIC8vICAgYFJlY2lldmVkIGZpbGUgaXMgY29ycnVwdGVkIHdpdGggaGFzaCAke3NoYX0sXFxud2hpbGUgZXhwZWN0aW5nIGZpbGUgaGFzaCBpcyAke25ld0NoZWNrc3VtSXRlbS5zaGEyNTZ9YCk7XG4gICAgICAgIC8vIGZ3cml0ZXIhLmVuZChvblppcEZpbGVXcml0dGVuKTtcbiAgICAgICAgLy8gZndyaXRlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIHJlaihlcnIpO1xuICAgICAgfVxuICAgICAgcmVzb2x2ZSh7XG4gICAgICAgIGhhc2g6IHNoYSxcbiAgICAgICAgY29udGVudDogYnVmLnNsaWNlKDAsIGJ1Zk9mZnNldCksXG4gICAgICAgIGxlbmd0aDogYnVmT2Zmc2V0XG4gICAgICB9KTtcblxuICAgICAgLy8gZndyaXRlciEuZW5kKG9uWmlwRmlsZVdyaXR0ZW4pO1xuICAgICAgLy8gZndyaXRlciA9IHVuZGVmaW5lZDtcbiAgICAgIC8vIHJlcy5zZW5kKGBbQUNDRVBUXSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06ICR7SlNPTi5zdHJpbmdpZnkobmV3Q2hlY2tzdW1JdGVtLCBudWxsLCAnICAnKX1gKTtcblxuICAgICAgLy8gZmlsZXNIYXNoLnNldChuZXdDaGVja3N1bUl0ZW0uZmlsZSwgbmV3Q2hlY2tzdW1JdGVtKTtcbiAgICAgIC8vIHdyaXRlQ2hlY2tzdW1GaWxlKGZpbGVzSGFzaCk7XG4gICAgICAvLyBpZiAoaXNQbTIpIHtcbiAgICAgIC8vICAgY29uc3QgbXNnOiBQbTJQYWNrZXQgPSB7XG4gICAgICAvLyAgICAgdHlwZSA6ICdwcm9jZXNzOm1zZycsXG4gICAgICAvLyAgICAgZGF0YToge1xuICAgICAgLy8gICAgICAgJ2NkLXNlcnZlcjpjaGVja3N1bSB1cGRhdGluZyc6IG5ld0NoZWNrc3VtSXRlbSxcbiAgICAgIC8vICAgICAgIHBpZDogcHJvY2Vzcy5waWRcbiAgICAgIC8vICAgICB9XG4gICAgICAvLyAgIH07XG4gICAgICAvLyAgIHByb2Nlc3Muc2VuZCEobXNnKTtcbiAgICAgIC8vIH1cbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJlYWRDaGVja3N1bUZpbGUoKTogTWFwPHN0cmluZywgQ2hlY2tzdW1JdGVtPiB7XG4gIGNvbnN0IGVudiA9IG1haWxTZXR0aW5nID8gbWFpbFNldHRpbmcuZW52IDogJ2xvY2FsJztcbiAgY29uc3QgY2hlY2tzdW1GaWxlID0gUGF0aC5yZXNvbHZlKCdjaGVja3N1bS4nICsgZW52ICsgJy5qc29uJyk7XG4gIGxldCBjaGVja3N1bTogQ2hlY2tzdW07XG4gIGlmIChmcy5leGlzdHNTeW5jKGNoZWNrc3VtRmlsZSkpIHtcbiAgICB0cnkge1xuICAgICAgY2hlY2tzdW0gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhjaGVja3N1bUZpbGUsICd1dGY4JykpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZy53YXJuKGUpO1xuICAgICAgY2hlY2tzdW0gPSBbXTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgY2hlY2tzdW0gPSBbXTtcbiAgfVxuICByZXR1cm4gY2hlY2tzdW0ucmVkdWNlKChtYXAsIHZhbCkgPT4gbWFwLnNldCh2YWwuZmlsZSwgdmFsKSwgbmV3IE1hcDxzdHJpbmcsIENoZWNrc3VtSXRlbT4oKSk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlQ2hlY2tzdW1GaWxlKGNoZWNrc3VtOiBSZXR1cm5UeXBlPHR5cGVvZiByZWFkQ2hlY2tzdW1GaWxlPikge1xuICBjb25zdCBlbnYgPSBtYWlsU2V0dGluZyA/IG1haWxTZXR0aW5nLmVudiA6ICdsb2NhbCc7XG4gIGZzLndyaXRlRmlsZShQYXRoLnJlc29sdmUoJ2NoZWNrc3VtLicgKyBlbnYgKyAnLmpzb24nKSwgSlNPTi5zdHJpbmdpZnkoQXJyYXkuZnJvbShjaGVja3N1bS52YWx1ZXMoKSksIG51bGwsICcgICcpLCAoZXJyKSA9PiB7XG4gICAgaWYgKGVycikge1xuICAgICAgbG9nLmVycm9yKGVycik7XG4gICAgfVxuICB9KTtcbn1cbiJdfQ==