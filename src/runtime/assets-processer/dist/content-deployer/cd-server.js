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
const log = plink_1.log4File(__filename);
const requireToken = plink_1.config()['@wfh/assets-processer'].requireToken;
const mailSetting = plink_1.config()['@wfh/assets-processer'].fetchMailServer;
function activate(app, imap) {
    let writingFile;
    let filesHash = readChecksumFile();
    const { isPm2, isMainProcess } = fetch_remote_1.getPm2Info();
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
            fetch_remote_1.retry(2, fetch_remote_1.forkExtractExstingZip).then(() => __api_1.default.eventBus.emit(__api_1.default.packageName + '.downloaded'))
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
                    fetch_remote_1.retry(2, fetch_remote_1.forkExtractExstingZip)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2Qtc2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2Qtc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSw0Q0FBb0I7QUFFcEIsMkNBQTZCO0FBQzdCLGtEQUF5RjtBQUN6RixnREFBd0I7QUFFeEIsd0RBQTBCO0FBQzFCLG9EQUF1QjtBQUN2QixvRkFBMEQ7QUFDMUQsb0RBQW9DO0FBQ3BDLGtEQUF3QjtBQUN4QixzQ0FBNEM7QUFDNUMsTUFBTSxHQUFHLEdBQUcsZ0JBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQXlCakMsTUFBTSxZQUFZLEdBQUcsY0FBTSxFQUFFLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxZQUFZLENBQUM7QUFDcEUsTUFBTSxXQUFXLEdBQUcsY0FBTSxFQUFFLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxlQUFlLENBQUM7QUFHdEUsU0FBZ0IsUUFBUSxDQUFDLEdBQWdCLEVBQUUsSUFBaUI7SUFDMUQsSUFBSSxXQUErQixDQUFDO0lBRXBDLElBQUksU0FBUyxHQUFHLGdCQUFnQixFQUFFLENBQUM7SUFFbkMsTUFBTSxFQUFDLEtBQUssRUFBRSxhQUFhLEVBQUMsR0FBRyx5QkFBVSxFQUFFLENBQUM7SUFDNUMsSUFBSSxLQUFLLEVBQUU7UUFDVCxLQUFLLE9BQU8sRUFBRSxDQUFDO0tBQ2hCO0lBRUQsS0FBSyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsWUFBRSxDQUFDLFFBQVEsRUFBRSxJQUFJLE9BQU8sQ0FBQyxHQUFHLFlBQVksRUFBRSxJQUFJLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBRTFGLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUNuQyxJQUFJLFlBQVksSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sS0FBSyxhQUFhLEVB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LCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0FwcGxpY2F0aW9uLCBSZXF1ZXN0fSBmcm9tICdleHByZXNzJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQge0NoZWNrc3VtfSBmcm9tICcuLi9mZXRjaC10eXBlcyc7XG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJ3V0aWwnO1xuaW1wb3J0IHtnZXRQbTJJbmZvLCB6aXBEb3dubG9hZERpciwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwLCByZXRyeX0gZnJvbSAnLi4vZmV0Y2gtcmVtb3RlJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtJbWFwTWFuYWdlcn0gZnJvbSAnLi4vZmV0Y2gtcmVtb3RlLWltYXAnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgbWVtc3RhdCBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL21lbS1zdGF0cyc7XG5pbXBvcnQgY3J5cHRvLCB7SGFzaH0gZnJvbSAnY3J5cHRvJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHtsb2c0RmlsZSwgY29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rJztcbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuLy8gaW1wb3J0IHtzdHJpbmdpZnlMaXN0QWxsVmVyc2lvbnN9IGZyb20gJ0B3ZmgvcHJlYnVpbGQvZGlzdC9hcnRpZmFjdHMnO1xuXG4vLyBjb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5jZC1zZXJ2ZXInKTtcblxuaW50ZXJmYWNlIFBtMlBhY2tldCB7XG4gIHR5cGU6ICdwcm9jZXNzOm1zZyc7XG4gIGRhdGE6IHtcbiAgICBwaWQ6IG51bWJlcjtcbiAgICAnY2Qtc2VydmVyOmNoZWNrc3VtIHVwZGF0aW5nJz86IENoZWNrc3VtSXRlbTtcbiAgICAnY2Qtc2VydmVyOmNoZWNrIG1haWwnPzogc3RyaW5nO1xuICAgIGV4dHJhY3RaaXA/OiBib29sZWFuO1xuICB9O1xufVxuXG5pbnRlcmZhY2UgUG0yQnVzIHtcbiAgb24oZXZlbnQ6ICdwcm9jZXNzOm1zZycsIGNiOiAocGFja2V0OiBQbTJQYWNrZXQpID0+IHZvaWQpOiB2b2lkO1xufVxuXG50eXBlIENoZWNrc3VtSXRlbSA9IENoZWNrc3VtIGV4dGVuZHMgQXJyYXk8aW5mZXIgST4gPyBJIDogdW5rbm93bjtcblxuaW50ZXJmYWNlIFJlY2lldmVkRGF0YSB7XG4gIGhhc2g/OiBzdHJpbmc7IGNvbnRlbnQ6IEJ1ZmZlcjsgbGVuZ3RoOiBudW1iZXI7XG59XG5cbmNvbnN0IHJlcXVpcmVUb2tlbiA9IGNvbmZpZygpWydAd2ZoL2Fzc2V0cy1wcm9jZXNzZXInXS5yZXF1aXJlVG9rZW47XG5jb25zdCBtYWlsU2V0dGluZyA9IGNvbmZpZygpWydAd2ZoL2Fzc2V0cy1wcm9jZXNzZXInXS5mZXRjaE1haWxTZXJ2ZXI7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGFjdGl2YXRlKGFwcDogQXBwbGljYXRpb24sIGltYXA6IEltYXBNYW5hZ2VyKSB7XG4gIGxldCB3cml0aW5nRmlsZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIGxldCBmaWxlc0hhc2ggPSByZWFkQ2hlY2tzdW1GaWxlKCk7XG5cbiAgY29uc3Qge2lzUG0yLCBpc01haW5Qcm9jZXNzfSA9IGdldFBtMkluZm8oKTtcbiAgaWYgKGlzUG0yKSB7XG4gICAgdm9pZCBpbml0UG0yKCk7XG4gIH1cblxuICB2b2lkIGltYXAuYXBwZW5kTWFpbChgc2VydmVyICR7b3MuaG9zdG5hbWUoKX0gJHtwcm9jZXNzLnBpZH0gYWN0aXZhdGVzYCwgbmV3IERhdGUoKSArICcnKTtcblxuICBhcHAudXNlKCcvX3N0YXQnLCAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICBpZiAocmVxdWlyZVRva2VuICYmIHJlcS5xdWVyeS53aGlzcGVyICE9PSBnZW5lcmF0ZVRva2VuKCkpIHtcbiAgICAgIHJlcy5oZWFkZXIoJ0Nvbm5lY3Rpb24nLCAnY2xvc2UnKTtcbiAgICAgIHJlcy5zdGF0dXMoNDAxKS5zZW5kKGBSRUpFQ1QgZnJvbSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06IE5vdCBhbGxvd2VkIHRvIHB1c2ggYXJ0aWZhY3QgaW4gdGhpcyBlbnZpcm9ubWVudC5gKTtcbiAgICAgIHJlcS5zb2NrZXQuZW5kKCk7XG4gICAgICBpZiAocmVzLmNvbm5lY3Rpb24pXG4gICAgICAgIHJlcy5jb25uZWN0aW9uLmVuZCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuXG4gICAgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnICYmIC9eXFwvX3N0YXQoWyM/L118JCkvLnRlc3QocmVxLm9yaWdpbmFsVXJsKSkge1xuICAgICAgcmVzLmNvbnRlbnRUeXBlKCdqc29uJyk7XG4gICAgICByZXMuc2VuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIGlzTWFpblByb2Nlc3MsXG4gICAgICAgIGZpbGVzSGFzaDogQXJyYXkuZnJvbShmaWxlc0hhc2gudmFsdWVzKCkpLFxuICAgICAgICBpc19wbTJfc2xhdmU6IGlzUG0yLFxuICAgICAgICBob3N0bmFtZTogb3MuaG9zdG5hbWUoKSxcbiAgICAgICAgcGlkOiBwcm9jZXNzLnBpZCxcbiAgICAgICAgbWVtOiBtZW1zdGF0KCksXG4gICAgICAgIGNwdXM6IG9zLmNwdXMoKSxcbiAgICAgICAgYXJjaDogb3MuYXJjaCgpLFxuICAgICAgICBwbGF0Zm9ybTogb3MucGxhdGZvcm0oKSxcbiAgICAgICAgbG9hZGF2Zzogb3MubG9hZGF2ZygpXG4gICAgICB9LCBudWxsLCAnICAnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5leHQoKTtcbiAgICB9XG4gIH0pO1xuXG4gIGxldCBjaGVja2VkU2VxID0gJyc7XG5cbiAgYXBwLnVzZSgnL19jaGVja21haWwvOnNlcScsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIGxvZy5pbmZvKCdmb3JjZSBjaGVjayBtYWlsIGZvcjonLCByZXEucGFyYW1zLnNlcSk7XG4gICAgaWYgKGNoZWNrZWRTZXEgPT09IHJlcS5wYXJhbXMuc2VxKVxuICAgICAgcmV0dXJuO1xuICAgIGlmIChpc1BtMiAmJiAhaXNNYWluUHJvY2Vzcykge1xuICAgICAgcHJvY2Vzcy5zZW5kISh7XG4gICAgICAgIHR5cGUgOiAncHJvY2Vzczptc2cnLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgJ2NkLXNlcnZlcjpjaGVjayBtYWlsJzogcmVxLnBhcmFtcy5zZXEsXG4gICAgICAgICAgcGlkOiBwcm9jZXNzLnBpZFxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdm9pZCBpbWFwLmNoZWNrTWFpbEZvclVwZGF0ZSgpO1xuICAgIH1cbiAgfSk7XG5cbiAgYXBwLnVzZSgnL190aW1lJywgKHJlcSwgcmVzKSA9PiB7XG4gICAgcmVzLnNlbmQoZ2VuZXJhdGVUb2tlbigpKTtcbiAgfSk7XG5cblxuICBjb25zdCByb3V0ZXIgPSBhcGkuZXhwcmVzcy5Sb3V0ZXIoKTtcbiAgLy8gcm91dGVyLmdldCgnL19naXRoYXNoJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gIC8vICAgcmVzLnNldEhlYWRlcignY29udGVudC10eXBlJywgJ3RleHQvcGxhaW4nKTtcbiAgLy8gICByZXMuc2VuZChhd2FpdCBzdHJpbmdpZnlMaXN0QWxsVmVyc2lvbnMoKSk7XG4gIC8vIH0pO1xuXG4gIHJvdXRlci5wdXQ8e2ZpbGU6IHN0cmluZzsgaGFzaDogc3RyaW5nfT4oJy9faW5zdGFsbF9mb3JjZS86ZmlsZS86aGFzaCcsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIChyZXEgYXMgdW5rbm93biBhcyB7X2luc3RhbGxGb3JjZTogYm9vbGVhbn0pLl9pbnN0YWxsRm9yY2UgPSB0cnVlO1xuICAgIG5leHQoKTtcbiAgfSk7XG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1taXN1c2VkLXByb21pc2VzXG4gIHJvdXRlci5wdXQ8e2ZpbGU6IHN0cmluZzsgaGFzaDogc3RyaW5nfT4oJy9faW5zdGFsbC86ZmlsZS86aGFzaCcsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIGNvbnN0IGlzRm9yY2UgPSAocmVxIGFzIHVua25vd24gYXMge19pbnN0YWxsRm9yY2U6IGJvb2xlYW59KS5faW5zdGFsbEZvcmNlID09PSB0cnVlO1xuXG4gICAgaWYgKHJlcXVpcmVUb2tlbiAmJiByZXEucXVlcnkud2hpc3BlciAhPT0gZ2VuZXJhdGVUb2tlbigpKSB7XG4gICAgICByZXMuaGVhZGVyKCdDb25uZWN0aW9uJywgJ2Nsb3NlJyk7XG4gICAgICByZXMuc3RhdHVzKDQwMSkuc2VuZChgUkVKRUNUIGZyb20gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiBOb3QgYWxsb3dlZCB0byBwdXNoIGFydGlmYWN0IGluIHRoaXMgZW52aXJvbm1lbnQuYCk7XG4gICAgICByZXEuc29ja2V0LmVuZCgpO1xuICAgICAgaWYgKHJlcy5jb25uZWN0aW9uKVxuICAgICAgICByZXMuY29ubmVjdGlvbi5lbmQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgZXhpc3RpbmcgPSBmaWxlc0hhc2guZ2V0KHJlcS5wYXJhbXMuZmlsZSk7XG4gICAgbG9nLmluZm8oYCR7cmVxLm1ldGhvZH0gWyR7b3MuaG9zdG5hbWUoKX1dZmlsZTogJHtyZXEucGFyYW1zLmZpbGV9LCBoYXNoOiAke3JlcS5wYXJhbXMuaGFzaH0sXFxuZXhpc3RpbmcgZmlsZTogJHtleGlzdGluZyA/IGV4aXN0aW5nLmZpbGUgKyAnIC8gJyArIGV4aXN0aW5nLnNoYTI1NiA6ICc8Tk8+J31gICtcbiAgICAgIGBcXG4ke3V0aWwuaW5zcGVjdChyZXEuaGVhZGVycyl9YCk7XG5cbiAgICBpZiAocmVxdWlyZVRva2VuICYmIHJlcS5xdWVyeS53aGlzcGVyICE9PSBnZW5lcmF0ZVRva2VuKCkpIHtcbiAgICAgIHJlcy5oZWFkZXIoJ0Nvbm5lY3Rpb24nLCAnY2xvc2UnKTtcbiAgICAgIHJlcy5zdGF0dXMoNDAxKS5zZW5kKGBSRUpFQ1QgZnJvbSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06IE5vdCBhbGxvd2VkIHRvIHB1c2ggYXJ0aWZhY3QgaW4gdGhpcyBlbnZpcm9ubWVudC5gKTtcbiAgICAgIHJlcS5zb2NrZXQuZW5kKCk7XG4gICAgICBpZiAocmVzLmNvbm5lY3Rpb24pXG4gICAgICAgIHJlcy5jb25uZWN0aW9uLmVuZCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxvZy5pbmZvKCdyZWNpZXZpbmcgZGF0YScpO1xuICAgIGlmIChpc1BtMiAmJiAhaXNNYWluUHJvY2Vzcykge1xuICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDgwMCkpO1xuICAgIH1cbiAgICBpZiAoIWlzRm9yY2UgJiYgZXhpc3RpbmcgJiYgZXhpc3Rpbmcuc2hhMjU2ID09PSByZXEucGFyYW1zLmhhc2gpIHtcbiAgICAgIC8vIEkgd2FudCB0byBjYW5jZWwgcmVjaWV2aW5nIHJlcXVlc3QgYm9keSBhc2FwXG4gICAgICAvLyBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xODM2NzgyNC9ob3ctdG8tY2FuY2VsLWh0dHAtdXBsb2FkLWZyb20tZGF0YS1ldmVudHNcbiAgICAgIHJlcy5oZWFkZXIoJ0Nvbm5lY3Rpb24nLCAnY2xvc2UnKTtcbiAgICAgIHJlcy5zdGF0dXMoNDA5KS5zZW5kKGBbUkVKRUNUXSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06YCArXG4gICAgICBgLSBmb3VuZCBleGlzdGluZzogJHtKU09OLnN0cmluZ2lmeShleGlzdGluZywgbnVsbCwgJyAgJyl9XFxuYCArXG4gICAgICBgLSBoYXNoczpcXG4gICR7SlNPTi5zdHJpbmdpZnkoZmlsZXNIYXNoLCBudWxsLCAnICAnKX1gKTtcbiAgICAgIHJlcS5zb2NrZXQuZW5kKCk7XG4gICAgICBpZiAocmVzLmNvbm5lY3Rpb24pXG4gICAgICAgIHJlcy5jb25uZWN0aW9uLmVuZCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgY29uc3QgbmV3Q2hlY2tzdW1JdGVtOiBDaGVja3N1bUl0ZW0gPSB7XG4gICAgICBmaWxlOiByZXEucGFyYW1zLmZpbGUsXG4gICAgICBzaGEyNTY6IHJlcS5wYXJhbXMuaGFzaCxcbiAgICAgIGNyZWF0ZWQ6IG5vdy50b0xvY2FsZVN0cmluZygpLFxuICAgICAgY3JlYXRlZFRpbWU6IG5vdy5nZXRUaW1lKClcbiAgICB9O1xuXG4gICAgY29uc3QgY29udGVudExlbiA9IHJlcS5oZWFkZXJzWydjb250ZW50LWxlbmd0aCddO1xuICAgIGxldCByZWNpZXZlZDogUmVjaWV2ZWREYXRhO1xuICAgIC8vIGNoZWNrc3VtLnZlcnNpb25zIVtyZXEucGFyYW1zLmFwcF0gPSB7dmVyc2lvbjogcGFyc2VJbnQocmVxLnBhcmFtcy52ZXJzaW9uLCAxMCl9O1xuICAgIHRyeSB7XG4gICAgICByZWNpZXZlZCA9IGF3YWl0IHJlYWRSZXNwb25zZVRvQnVmZmVyKHJlcSwgcmVxLnBhcmFtcy5oYXNoLCBjb250ZW50TGVuID8gcGFyc2VJbnQoY29udGVudExlbiwgMTApIDogMTAgKiAxMDI0ICogMTAyNCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUubWVzc2FnZSA9PT0gJ3NoYTI1NiBub3QgbWF0Y2gnKSB7XG4gICAgICAgIHJlcy5zZW5kKGBbV0FSTl0gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiAke0pTT04uc3RyaW5naWZ5KG5ld0NoZWNrc3VtSXRlbSwgbnVsbCwgJyAgJyl9XFxuYCArXG4gICAgICAgICAgYFJlY2lldmVkIGZpbGUgaXMgY29ycnVwdGVkIHdpdGggaGFzaCAkeyhlIGFzIHtzaGEyNTY/OiBzdHJpbmd9KS5zaGEyNTYgfHwgJzx1bmtub3duPid9LFxcbndoaWxlIGV4cGVjdGluZyBmaWxlIGhhc2ggaXMgJHtuZXdDaGVja3N1bUl0ZW0uc2hhMjU2fWApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzLnN0YXR1cyg1MDApO1xuICAgICAgICByZXMuc2VuZChlLnN0YWNrKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmVzLnNlbmQoYFtBQ0NFUFRdICR7b3MuaG9zdG5hbWUoKX0gcGlkOiAke3Byb2Nlc3MucGlkfTogJHtKU09OLnN0cmluZ2lmeShuZXdDaGVja3N1bUl0ZW0sIG51bGwsICcgICcpfWApO1xuXG4gICAgbGV0IGZpbGVCYXNlTmFtZSA9IFBhdGguYmFzZW5hbWUocmVxLnBhcmFtcy5maWxlKTtcbiAgICBjb25zdCBkb3QgPSBmaWxlQmFzZU5hbWUubGFzdEluZGV4T2YoJy4nKTtcbiAgICBpZiAoZG90ID49MCApXG4gICAgICBmaWxlQmFzZU5hbWUgPSBmaWxlQmFzZU5hbWUuc2xpY2UoMCwgZG90KTtcbiAgICB3cml0aW5nRmlsZSA9IFBhdGgucmVzb2x2ZSh6aXBEb3dubG9hZERpciwgYCR7ZmlsZUJhc2VOYW1lLnNsaWNlKDAsIGZpbGVCYXNlTmFtZS5sYXN0SW5kZXhPZignLicpKX0uJHtwcm9jZXNzLnBpZH0uemlwYCk7XG4gICAgZnMubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUod3JpdGluZ0ZpbGUpKTtcbiAgICBmcy53cml0ZUZpbGUod3JpdGluZ0ZpbGUsIHJlY2lldmVkIS5jb250ZW50LCBvblppcEZpbGVXcml0dGVuKTtcbiAgICBmaWxlc0hhc2guc2V0KG5ld0NoZWNrc3VtSXRlbS5maWxlLCBuZXdDaGVja3N1bUl0ZW0pO1xuICAgIHdyaXRlQ2hlY2tzdW1GaWxlKGZpbGVzSGFzaCk7XG4gICAgaWYgKGlzUG0yKSB7XG4gICAgICBjb25zdCBtc2c6IFBtMlBhY2tldCA9IHtcbiAgICAgICAgdHlwZSA6ICdwcm9jZXNzOm1zZycsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAnY2Qtc2VydmVyOmNoZWNrc3VtIHVwZGF0aW5nJzogbmV3Q2hlY2tzdW1JdGVtLFxuICAgICAgICAgIHBpZDogcHJvY2Vzcy5waWRcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIHByb2Nlc3Muc2VuZCEobXNnKTtcbiAgICB9XG4gIH0pO1xuXG5cbiAgYXBwLnVzZSgnLycsIHJvdXRlcik7XG5cbiAgZnVuY3Rpb24gb25aaXBGaWxlV3JpdHRlbigpIHtcbiAgICBpZiAoaXNQbTIgJiYgIWlzTWFpblByb2Nlc3MpIHtcbiAgICAgIGNvbnN0IG1zZzogUG0yUGFja2V0ID0ge1xuICAgICAgICB0eXBlIDogJ3Byb2Nlc3M6bXNnJyxcbiAgICAgICAgZGF0YToge2V4dHJhY3RaaXA6IHRydWUsIHBpZDogcHJvY2Vzcy5waWR9XG4gICAgICB9O1xuICAgICAgcHJvY2Vzcy5zZW5kIShtc2cpO1xuICAgIH0gZWxzZVxuICAgICAgcmV0cnkoMiwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwKS50aGVuKCgpID0+IGFwaS5ldmVudEJ1cy5lbWl0KGFwaS5wYWNrYWdlTmFtZSArICcuZG93bmxvYWRlZCcpKVxuICAgICAgICAuY2F0Y2goZSA9PiB7bG9nLmVycm9yKGUpO30pO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gaW5pdFBtMigpIHtcbiAgICBjb25zdCBwbTIgPSByZXF1aXJlKCdwbTInKTtcbiAgICBjb25zdCBwbTJjb25uZWN0ID0gdXRpbC5wcm9taXNpZnkocG0yLmNvbm5lY3QuYmluZChwbTIpKTtcbiAgICBjb25zdCBwbTJsYXVuY2hCdXMgPSB1dGlsLnByb21pc2lmeTxQbTJCdXM+KHBtMi5sYXVuY2hCdXMuYmluZChwbTIpKTtcblxuICAgIGF3YWl0IHBtMmNvbm5lY3QoKTtcbiAgICBjb25zdCBidXMgPSBhd2FpdCBwbTJsYXVuY2hCdXMoKTtcbiAgICBidXMub24oJ3Byb2Nlc3M6bXNnJywgcGFja2V0ID0+IHtcbiAgICAgIGlmICghcGFja2V0LmRhdGEpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgdXBkYXRlZENoZWNrc3VtSXRlbSA9IHBhY2tldC5kYXRhWydjZC1zZXJ2ZXI6Y2hlY2tzdW0gdXBkYXRpbmcnXTtcbiAgICAgIGlmICh1cGRhdGVkQ2hlY2tzdW1JdGVtICYmIHBhY2tldC5kYXRhLnBpZCAhPT0gcHJvY2Vzcy5waWQpIHtcbiAgICAgICAgY29uc3QgcmVjaWV2ZWRDaGVja3N1bSA9IHVwZGF0ZWRDaGVja3N1bUl0ZW07XG4gICAgICAgIGZpbGVzSGFzaC5zZXQocmVjaWV2ZWRDaGVja3N1bS5maWxlLCByZWNpZXZlZENoZWNrc3VtKTtcbiAgICAgICAgbG9nLmluZm8oJ090aGVyIHByb2Nlc3MgcmVjaWV2ZWQgdXBkYXRpbmcgY2hlY2tzdW0gJXMgZnJvbSBpZDogJXMnLFxuICAgICAgICAgIHV0aWwuaW5zcGVjdChyZWNpZXZlZENoZWNrc3VtKSwgXy5nZXQocGFja2V0LCAncHJvY2Vzcy5wbV9pZCcpKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGNoZWNrTWFpbFByb3AgPSBwYWNrZXQuZGF0YVsnY2Qtc2VydmVyOmNoZWNrIG1haWwnXTtcbiAgICAgIGlmIChjaGVja01haWxQcm9wICYmIHBhY2tldC5kYXRhLnBpZCAhPT0gcHJvY2Vzcy5waWQpIHtcbiAgICAgICAgY2hlY2tlZFNlcSA9IGNoZWNrTWFpbFByb3A7XG4gICAgICAgIGxvZy5pbmZvKCdPdGhlciBwcm9jZXNzIHRyaWdnZXJzIFwiY2hlY2sgbWFpbFwiIGZyb20gaWQ6JywgXy5nZXQocGFja2V0LCAncHJvY2Vzcy5wbV9pZCcpKTtcbiAgICAgICAgLy8gaW1hcC5jaGVja01haWxGb3JVcGRhdGUoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBhY2tldC5kYXRhLmV4dHJhY3RaaXAgJiYgcGFja2V0LmRhdGEucGlkICE9PSBwcm9jZXNzLnBpZCkge1xuICAgICAgICBsb2cuaW5mbygnT3RoZXIgcHJvY2VzcyB0cmlnZ2VycyBcImV4dHJhY3RaaXBcIiBmcm9tIGlkOicsIF8uZ2V0KHBhY2tldCwgJ3Byb2Nlc3MucG1faWQnKSk7XG4gICAgICAgIHJldHJ5KDIsIGZvcmtFeHRyYWN0RXhzdGluZ1ppcClcbiAgICAgICAgICAudGhlbigoKSA9PiBhcGkuZXZlbnRCdXMuZW1pdChhcGkucGFja2FnZU5hbWUgKyAnLmRvd25sb2FkZWQnKSlcbiAgICAgICAgICAuY2F0Y2goZSA9PiB7bG9nLmVycm9yKGUpO30pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVRva2VuKCkge1xuICBjb25zdCBkYXRlID0gbmV3IERhdGUoKTtcbiAgY29uc3QgdG9rZW4gPSBkYXRlLmdldERhdGUoKSArICcnICsgZGF0ZS5nZXRIb3VycygpO1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyh0b2tlbik7XG4gIHJldHVybiB0b2tlbjtcbn1cblxuZnVuY3Rpb24gcmVhZFJlc3BvbnNlVG9CdWZmZXIocmVxOiBSZXF1ZXN0PHtmaWxlOiBzdHJpbmc7IGhhc2g6IHN0cmluZ30+LCBleHBlY3RTaGEyNTY6IHN0cmluZywgbGVuZ3RoOiBudW1iZXIpXG4gIDogUHJvbWlzZTxSZWNpZXZlZERhdGE+IHtcbiAgLy8gbGV0IGNvdW50Qnl0ZXMgPSAwO1xuXG4gIGxldCBoYXNoOiBIYXNoO1xuICBsZXQgaGFzaERvbmU6IFByb21pc2U8c3RyaW5nPjtcblxuICBjb25zdCBidWYgPSBCdWZmZXIuYWxsb2MobGVuZ3RoKTtcbiAgbGV0IGJ1Zk9mZnNldCA9IDA7XG5cbiAgcmVxLm9uKCdkYXRhJywgKGRhdGE6IEJ1ZmZlcikgPT4ge1xuICAgIGJ1Zk9mZnNldCArPSBkYXRhLmNvcHkoYnVmLCBidWZPZmZzZXQsIDApO1xuICAgIGxvZy5kZWJ1ZyhgUmVjaWV2aW5nLCAke2J1Zk9mZnNldH0gYnl0ZXNgKTtcbiAgICBpZiAoaGFzaCA9PSBudWxsKSB7XG4gICAgICBoYXNoID0gY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTI1NicpO1xuICAgICAgaGFzaERvbmUgPSBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgaGFzaC5vbigncmVhZGFibGUnLCAoKSA9PiB7XG4gICAgICAgICAgY29uc3QgZGF0YSA9IGhhc2gucmVhZCgpIGFzIEJ1ZmZlcjtcbiAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgcmVzb2x2ZShkYXRhLnRvU3RyaW5nKCdoZXgnKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBoYXNoLndyaXRlKGRhdGEpO1xuXG4gICAgLy8gaWYgKGZ3cml0ZXIgPT0gbnVsbCkge1xuICAgIC8vICAgbGV0IGZpbGVCYXNlTmFtZSA9IFBhdGguYmFzZW5hbWUocmVxLnBhcmFtcy5maWxlKTtcbiAgICAvLyAgIGNvbnN0IGRvdCA9IGZpbGVCYXNlTmFtZS5sYXN0SW5kZXhPZignLicpO1xuICAgIC8vICAgaWYgKGRvdCA+PTAgKVxuICAgIC8vICAgICBmaWxlQmFzZU5hbWUgPSBmaWxlQmFzZU5hbWUuc2xpY2UoMCwgZG90KTtcbiAgICAvLyAgIHdyaXRpbmdGaWxlID0gUGF0aC5yZXNvbHZlKHppcERvd25sb2FkRGlyLCBgJHtmaWxlQmFzZU5hbWUuc2xpY2UoMCwgZmlsZUJhc2VOYW1lLmxhc3RJbmRleE9mKCcuJykpfS4ke3Byb2Nlc3MucGlkfS56aXBgKTtcbiAgICAvLyAgIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKHdyaXRpbmdGaWxlKSk7XG4gICAgLy8gICBmd3JpdGVyID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0od3JpdGluZ0ZpbGUpO1xuICAgIC8vIH1cbiAgICAvLyBmd3JpdGVyLndyaXRlKGRhdGEpO1xuICB9KTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWopID0+IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW1pc3VzZWQtcHJvbWlzZXNcbiAgICByZXEub24oJ2VuZCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGxvZy5pbmZvKGBUb3RhbCByZWNpZXZlZCAke2J1Zk9mZnNldH0gYnl0ZXNgKTtcbiAgICAgIGlmIChidWZPZmZzZXQgPiBsZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHJlaihuZXcgRXJyb3IoYFJlY2lldmVkIGRhdGEgbGVuZ3RoICR7YnVmT2Zmc2V0fSBpcyBncmVhdGVyIHRoYW4gZXhwZWNyZWQgY29udGVudCBsZW5ndGggJHtsZW5ndGh9YCkpO1xuICAgICAgfVxuICAgICAgbGV0IHNoYTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgaWYgKGhhc2gpIHtcbiAgICAgICAgaGFzaC5lbmQoKTtcbiAgICAgICAgc2hhID0gYXdhaXQgaGFzaERvbmU7XG4gICAgICB9XG5cbiAgICAgIGlmIChzaGEgIT09IGV4cGVjdFNoYTI1Nikge1xuICAgICAgICBjb25zdCBlcnIgPSBuZXcgRXJyb3IoJ3NoYTI1NiBub3QgbWF0Y2gnKTtcbiAgICAgICAgKGVyciBhcyBhbnkpLnNoYTI1NiA9IHNoYTtcbiAgICAgICAgLy8gVE9ETzpcbiAgICAgICAgLy8gcmVzLnNlbmQoYFtXQVJOXSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06ICR7SlNPTi5zdHJpbmdpZnkobmV3Q2hlY2tzdW1JdGVtLCBudWxsLCAnICAnKX1cXG5gICtcbiAgICAgICAgLy8gICBgUmVjaWV2ZWQgZmlsZSBpcyBjb3JydXB0ZWQgd2l0aCBoYXNoICR7c2hhfSxcXG53aGlsZSBleHBlY3RpbmcgZmlsZSBoYXNoIGlzICR7bmV3Q2hlY2tzdW1JdGVtLnNoYTI1Nn1gKTtcbiAgICAgICAgLy8gZndyaXRlciEuZW5kKG9uWmlwRmlsZVdyaXR0ZW4pO1xuICAgICAgICAvLyBmd3JpdGVyID0gdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gcmVqKGVycik7XG4gICAgICB9XG4gICAgICByZXNvbHZlKHtcbiAgICAgICAgaGFzaDogc2hhLFxuICAgICAgICBjb250ZW50OiBidWYuc2xpY2UoMCwgYnVmT2Zmc2V0KSxcbiAgICAgICAgbGVuZ3RoOiBidWZPZmZzZXRcbiAgICAgIH0pO1xuXG4gICAgICAvLyBmd3JpdGVyIS5lbmQob25aaXBGaWxlV3JpdHRlbik7XG4gICAgICAvLyBmd3JpdGVyID0gdW5kZWZpbmVkO1xuICAgICAgLy8gcmVzLnNlbmQoYFtBQ0NFUFRdICR7b3MuaG9zdG5hbWUoKX0gcGlkOiAke3Byb2Nlc3MucGlkfTogJHtKU09OLnN0cmluZ2lmeShuZXdDaGVja3N1bUl0ZW0sIG51bGwsICcgICcpfWApO1xuXG4gICAgICAvLyBmaWxlc0hhc2guc2V0KG5ld0NoZWNrc3VtSXRlbS5maWxlLCBuZXdDaGVja3N1bUl0ZW0pO1xuICAgICAgLy8gd3JpdGVDaGVja3N1bUZpbGUoZmlsZXNIYXNoKTtcbiAgICAgIC8vIGlmIChpc1BtMikge1xuICAgICAgLy8gICBjb25zdCBtc2c6IFBtMlBhY2tldCA9IHtcbiAgICAgIC8vICAgICB0eXBlIDogJ3Byb2Nlc3M6bXNnJyxcbiAgICAgIC8vICAgICBkYXRhOiB7XG4gICAgICAvLyAgICAgICAnY2Qtc2VydmVyOmNoZWNrc3VtIHVwZGF0aW5nJzogbmV3Q2hlY2tzdW1JdGVtLFxuICAgICAgLy8gICAgICAgcGlkOiBwcm9jZXNzLnBpZFxuICAgICAgLy8gICAgIH1cbiAgICAgIC8vICAgfTtcbiAgICAgIC8vICAgcHJvY2Vzcy5zZW5kIShtc2cpO1xuICAgICAgLy8gfVxuICAgIH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcmVhZENoZWNrc3VtRmlsZSgpOiBNYXA8c3RyaW5nLCBDaGVja3N1bUl0ZW0+IHtcbiAgY29uc3QgZW52ID0gbWFpbFNldHRpbmcgPyBtYWlsU2V0dGluZy5lbnYgOiAnbG9jYWwnO1xuICBjb25zdCBjaGVja3N1bUZpbGUgPSBQYXRoLnJlc29sdmUoJ2NoZWNrc3VtLicgKyBlbnYgKyAnLmpzb24nKTtcbiAgbGV0IGNoZWNrc3VtOiBDaGVja3N1bTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMoY2hlY2tzdW1GaWxlKSkge1xuICAgIHRyeSB7XG4gICAgICBjaGVja3N1bSA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGNoZWNrc3VtRmlsZSwgJ3V0ZjgnKSkgYXMgQ2hlY2tzdW07XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nLndhcm4oZSk7XG4gICAgICBjaGVja3N1bSA9IFtdO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBjaGVja3N1bSA9IFtdO1xuICB9XG4gIHJldHVybiBjaGVja3N1bS5yZWR1Y2UoKG1hcCwgdmFsKSA9PiBtYXAuc2V0KHZhbC5maWxlLCB2YWwpLCBuZXcgTWFwPHN0cmluZywgQ2hlY2tzdW1JdGVtPigpKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVDaGVja3N1bUZpbGUoY2hlY2tzdW06IFJldHVyblR5cGU8dHlwZW9mIHJlYWRDaGVja3N1bUZpbGU+KSB7XG4gIGNvbnN0IGVudiA9IG1haWxTZXR0aW5nID8gbWFpbFNldHRpbmcuZW52IDogJ2xvY2FsJztcbiAgZnMud3JpdGVGaWxlKFBhdGgucmVzb2x2ZSgnY2hlY2tzdW0uJyArIGVudiArICcuanNvbicpLCBKU09OLnN0cmluZ2lmeShBcnJheS5mcm9tKGNoZWNrc3VtLnZhbHVlcygpKSwgbnVsbCwgJyAgJyksIChlcnIpID0+IHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICB9XG4gIH0pO1xufVxuIl19