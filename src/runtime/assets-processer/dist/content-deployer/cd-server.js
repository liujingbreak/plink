"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
    router.put('/_install/:file/:hash', async (req, res) => {
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
            await new Promise(resolve => setTimeout(resolve, 800));
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
            recieved = await readResponseToBuffer(req, req.params.hash, contentLen ? parseInt(contentLen, 10) : 10 * 1024 * 1024);
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
    });
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
    async function initPm2() {
        const pm2 = require('pm2');
        const pm2connect = util.promisify(pm2.connect.bind(pm2));
        const pm2launchBus = util.promisify(pm2.launchBus.bind(pm2));
        await pm2connect();
        const bus = await pm2launchBus();
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
        req.on('end', async () => {
            log.info(`Total recieved ${bufOffset} bytes`);
            if (bufOffset > length) {
                return rej(new Error(`Recieved data length ${bufOffset} is greater than expecred content length ${length}`));
            }
            let sha;
            if (hash) {
                hash.end();
                sha = await hashDone;
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
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2Qtc2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2Qtc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsNENBQW9CO0FBRXBCLDJDQUE2QjtBQUM3QixrREFBeUY7QUFDekYsZ0RBQXdCO0FBRXhCLHdEQUEwQjtBQUMxQixvREFBdUI7QUFDdkIsb0ZBQTBEO0FBQzFELG9EQUFvQztBQUNwQyxrREFBd0I7QUFDeEIsc0NBQTRDO0FBQzVDLE1BQU0sR0FBRyxHQUFHLElBQUEsZ0JBQVEsRUFBQyxVQUFVLENBQUMsQ0FBQztBQXlCakMsTUFBTSxZQUFZLEdBQUcsSUFBQSxjQUFNLEdBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLFlBQVksQ0FBQztBQUNwRSxNQUFNLFdBQVcsR0FBRyxJQUFBLGNBQU0sR0FBRSxDQUFDLHVCQUF1QixDQUFDLENBQUMsZUFBZSxDQUFDO0FBR3RFLFNBQWdCLFFBQVEsQ0FBQyxHQUFnQixFQUFFLElBQWlCO0lBQzFELElBQUksV0FBK0IsQ0FBQztJQUVwQyxJQUFJLFNBQVMsR0FBRyxnQkFBZ0IsRUFBRSxDQUFDO0lBRW5DLE1BQU0sRUFBQyxLQUFLLEVBQUUsYUFBYSxFQUFDLEdBQUcsSUFBQSx5QkFBVSxHQUFFLENBQUM7SUFDNUMsSUFBSSxLQUFLLEVBQUU7UUFDVCxLQUFLLE9BQU8sRUFBRSxDQUFDO0tBQ2hCO0lBRUQsS0FBSyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsWUFBRSxDQUFDLFFBQVEsRUFBRSxJQUFJLE9BQU8sQ0FBQyxHQUFHLFlBQVksRUFBRSxJQUFJLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBRTFGLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUNuQyxJQUFJLFlBQVksSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLE9B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QUFDLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtBcHBsaWNhdGlvbiwgUmVxdWVzdH0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IHtDaGVja3N1bX0gZnJvbSAnLi4vZmV0Y2gtdHlwZXMnO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICd1dGlsJztcbmltcG9ydCB7Z2V0UG0ySW5mbywgemlwRG93bmxvYWREaXIsIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCwgcmV0cnl9IGZyb20gJy4uL2ZldGNoLXJlbW90ZSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7SW1hcE1hbmFnZXJ9IGZyb20gJy4uL2ZldGNoLXJlbW90ZS1pbWFwJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IG1lbXN0YXQgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9tZW0tc3RhdHMnO1xuaW1wb3J0IGNyeXB0bywge0hhc2h9IGZyb20gJ2NyeXB0byc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7bG9nNEZpbGUsIGNvbmZpZ30gZnJvbSAnQHdmaC9wbGluayc7XG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcbi8vIGltcG9ydCB7c3RyaW5naWZ5TGlzdEFsbFZlcnNpb25zfSBmcm9tICdAd2ZoL3ByZWJ1aWxkL2Rpc3QvYXJ0aWZhY3RzJztcblxuLy8gY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuY2Qtc2VydmVyJyk7XG5cbmludGVyZmFjZSBQbTJQYWNrZXQge1xuICB0eXBlOiAncHJvY2Vzczptc2cnO1xuICBkYXRhOiB7XG4gICAgcGlkOiBudW1iZXI7XG4gICAgJ2NkLXNlcnZlcjpjaGVja3N1bSB1cGRhdGluZyc/OiBDaGVja3N1bUl0ZW07XG4gICAgJ2NkLXNlcnZlcjpjaGVjayBtYWlsJz86IHN0cmluZztcbiAgICBleHRyYWN0WmlwPzogYm9vbGVhbjtcbiAgfTtcbn1cblxuaW50ZXJmYWNlIFBtMkJ1cyB7XG4gIG9uKGV2ZW50OiAncHJvY2Vzczptc2cnLCBjYjogKHBhY2tldDogUG0yUGFja2V0KSA9PiB2b2lkKTogdm9pZDtcbn1cblxudHlwZSBDaGVja3N1bUl0ZW0gPSBDaGVja3N1bSBleHRlbmRzIEFycmF5PGluZmVyIEk+ID8gSSA6IHVua25vd247XG5cbmludGVyZmFjZSBSZWNpZXZlZERhdGEge1xuICBoYXNoPzogc3RyaW5nOyBjb250ZW50OiBCdWZmZXI7IGxlbmd0aDogbnVtYmVyO1xufVxuXG5jb25zdCByZXF1aXJlVG9rZW4gPSBjb25maWcoKVsnQHdmaC9hc3NldHMtcHJvY2Vzc2VyJ10ucmVxdWlyZVRva2VuO1xuY29uc3QgbWFpbFNldHRpbmcgPSBjb25maWcoKVsnQHdmaC9hc3NldHMtcHJvY2Vzc2VyJ10uZmV0Y2hNYWlsU2VydmVyO1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBhY3RpdmF0ZShhcHA6IEFwcGxpY2F0aW9uLCBpbWFwOiBJbWFwTWFuYWdlcikge1xuICBsZXQgd3JpdGluZ0ZpbGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBsZXQgZmlsZXNIYXNoID0gcmVhZENoZWNrc3VtRmlsZSgpO1xuXG4gIGNvbnN0IHtpc1BtMiwgaXNNYWluUHJvY2Vzc30gPSBnZXRQbTJJbmZvKCk7XG4gIGlmIChpc1BtMikge1xuICAgIHZvaWQgaW5pdFBtMigpO1xuICB9XG5cbiAgdm9pZCBpbWFwLmFwcGVuZE1haWwoYHNlcnZlciAke29zLmhvc3RuYW1lKCl9ICR7cHJvY2Vzcy5waWR9IGFjdGl2YXRlc2AsIG5ldyBEYXRlKCkgKyAnJyk7XG5cbiAgYXBwLnVzZSgnL19zdGF0JywgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgaWYgKHJlcXVpcmVUb2tlbiAmJiByZXEucXVlcnkud2hpc3BlciAhPT0gZ2VuZXJhdGVUb2tlbigpKSB7XG4gICAgICByZXMuaGVhZGVyKCdDb25uZWN0aW9uJywgJ2Nsb3NlJyk7XG4gICAgICByZXMuc3RhdHVzKDQwMSkuc2VuZChgUkVKRUNUIGZyb20gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiBOb3QgYWxsb3dlZCB0byBwdXNoIGFydGlmYWN0IGluIHRoaXMgZW52aXJvbm1lbnQuYCk7XG4gICAgICByZXEuc29ja2V0LmVuZCgpO1xuICAgICAgaWYgKHJlcy5jb25uZWN0aW9uKVxuICAgICAgICByZXMuY29ubmVjdGlvbi5lbmQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cblxuICAgIGlmIChyZXEubWV0aG9kID09PSAnR0VUJyAmJiAvXlxcL19zdGF0KFsjPy9dfCQpLy50ZXN0KHJlcS5vcmlnaW5hbFVybCkpIHtcbiAgICAgIHJlcy5jb250ZW50VHlwZSgnanNvbicpO1xuICAgICAgcmVzLnNlbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBpc01haW5Qcm9jZXNzLFxuICAgICAgICBmaWxlc0hhc2g6IEFycmF5LmZyb20oZmlsZXNIYXNoLnZhbHVlcygpKSxcbiAgICAgICAgaXNfcG0yX3NsYXZlOiBpc1BtMixcbiAgICAgICAgaG9zdG5hbWU6IG9zLmhvc3RuYW1lKCksXG4gICAgICAgIHBpZDogcHJvY2Vzcy5waWQsXG4gICAgICAgIG1lbTogbWVtc3RhdCgpLFxuICAgICAgICBjcHVzOiBvcy5jcHVzKCksXG4gICAgICAgIGFyY2g6IG9zLmFyY2goKSxcbiAgICAgICAgcGxhdGZvcm06IG9zLnBsYXRmb3JtKCksXG4gICAgICAgIGxvYWRhdmc6IG9zLmxvYWRhdmcoKVxuICAgICAgfSwgbnVsbCwgJyAgJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuZXh0KCk7XG4gICAgfVxuICB9KTtcblxuICBsZXQgY2hlY2tlZFNlcSA9ICcnO1xuXG4gIGFwcC51c2UoJy9fY2hlY2ttYWlsLzpzZXEnLCAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICBsb2cuaW5mbygnZm9yY2UgY2hlY2sgbWFpbCBmb3I6JywgcmVxLnBhcmFtcy5zZXEpO1xuICAgIGlmIChjaGVja2VkU2VxID09PSByZXEucGFyYW1zLnNlcSlcbiAgICAgIHJldHVybjtcbiAgICBpZiAoaXNQbTIgJiYgIWlzTWFpblByb2Nlc3MpIHtcbiAgICAgIHByb2Nlc3Muc2VuZCEoe1xuICAgICAgICB0eXBlIDogJ3Byb2Nlc3M6bXNnJyxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICdjZC1zZXJ2ZXI6Y2hlY2sgbWFpbCc6IHJlcS5wYXJhbXMuc2VxLFxuICAgICAgICAgIHBpZDogcHJvY2Vzcy5waWRcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZvaWQgaW1hcC5jaGVja01haWxGb3JVcGRhdGUoKTtcbiAgICB9XG4gIH0pO1xuXG4gIGFwcC51c2UoJy9fdGltZScsIChyZXEsIHJlcykgPT4ge1xuICAgIHJlcy5zZW5kKGdlbmVyYXRlVG9rZW4oKSk7XG4gIH0pO1xuXG5cbiAgY29uc3Qgcm91dGVyID0gYXBpLmV4cHJlc3MuUm91dGVyKCk7XG4gIC8vIHJvdXRlci5nZXQoJy9fZ2l0aGFzaCcsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAvLyAgIHJlcy5zZXRIZWFkZXIoJ2NvbnRlbnQtdHlwZScsICd0ZXh0L3BsYWluJyk7XG4gIC8vICAgcmVzLnNlbmQoYXdhaXQgc3RyaW5naWZ5TGlzdEFsbFZlcnNpb25zKCkpO1xuICAvLyB9KTtcblxuICByb3V0ZXIucHV0PHtmaWxlOiBzdHJpbmc7IGhhc2g6IHN0cmluZ30+KCcvX2luc3RhbGxfZm9yY2UvOmZpbGUvOmhhc2gnLCAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAocmVxIGFzIHVua25vd24gYXMge19pbnN0YWxsRm9yY2U6IGJvb2xlYW59KS5faW5zdGFsbEZvcmNlID0gdHJ1ZTtcbiAgICBuZXh0KCk7XG4gIH0pO1xuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbWlzdXNlZC1wcm9taXNlc1xuICByb3V0ZXIucHV0PHtmaWxlOiBzdHJpbmc7IGhhc2g6IHN0cmluZ30+KCcvX2luc3RhbGwvOmZpbGUvOmhhc2gnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICBjb25zdCBpc0ZvcmNlID0gKHJlcSBhcyB1bmtub3duIGFzIHtfaW5zdGFsbEZvcmNlOiBib29sZWFufSkuX2luc3RhbGxGb3JjZSA9PT0gdHJ1ZTtcblxuICAgIGlmIChyZXF1aXJlVG9rZW4gJiYgcmVxLnF1ZXJ5LndoaXNwZXIgIT09IGdlbmVyYXRlVG9rZW4oKSkge1xuICAgICAgcmVzLmhlYWRlcignQ29ubmVjdGlvbicsICdjbG9zZScpO1xuICAgICAgcmVzLnN0YXR1cyg0MDEpLnNlbmQoYFJFSkVDVCBmcm9tICR7b3MuaG9zdG5hbWUoKX0gcGlkOiAke3Byb2Nlc3MucGlkfTogTm90IGFsbG93ZWQgdG8gcHVzaCBhcnRpZmFjdCBpbiB0aGlzIGVudmlyb25tZW50LmApO1xuICAgICAgcmVxLnNvY2tldC5lbmQoKTtcbiAgICAgIGlmIChyZXMuY29ubmVjdGlvbilcbiAgICAgICAgcmVzLmNvbm5lY3Rpb24uZW5kKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGV4aXN0aW5nID0gZmlsZXNIYXNoLmdldChyZXEucGFyYW1zLmZpbGUpO1xuICAgIGxvZy5pbmZvKGAke3JlcS5tZXRob2R9IFske29zLmhvc3RuYW1lKCl9XWZpbGU6ICR7cmVxLnBhcmFtcy5maWxlfSwgaGFzaDogJHtyZXEucGFyYW1zLmhhc2h9LFxcbmV4aXN0aW5nIGZpbGU6ICR7ZXhpc3RpbmcgPyBleGlzdGluZy5maWxlICsgJyAvICcgKyBleGlzdGluZy5zaGEyNTYgOiAnPE5PPid9YCArXG4gICAgICBgXFxuJHt1dGlsLmluc3BlY3QocmVxLmhlYWRlcnMpfWApO1xuXG4gICAgaWYgKHJlcXVpcmVUb2tlbiAmJiByZXEucXVlcnkud2hpc3BlciAhPT0gZ2VuZXJhdGVUb2tlbigpKSB7XG4gICAgICByZXMuaGVhZGVyKCdDb25uZWN0aW9uJywgJ2Nsb3NlJyk7XG4gICAgICByZXMuc3RhdHVzKDQwMSkuc2VuZChgUkVKRUNUIGZyb20gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiBOb3QgYWxsb3dlZCB0byBwdXNoIGFydGlmYWN0IGluIHRoaXMgZW52aXJvbm1lbnQuYCk7XG4gICAgICByZXEuc29ja2V0LmVuZCgpO1xuICAgICAgaWYgKHJlcy5jb25uZWN0aW9uKVxuICAgICAgICByZXMuY29ubmVjdGlvbi5lbmQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsb2cuaW5mbygncmVjaWV2aW5nIGRhdGEnKTtcbiAgICBpZiAoaXNQbTIgJiYgIWlzTWFpblByb2Nlc3MpIHtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCA4MDApKTtcbiAgICB9XG4gICAgaWYgKCFpc0ZvcmNlICYmIGV4aXN0aW5nICYmIGV4aXN0aW5nLnNoYTI1NiA9PT0gcmVxLnBhcmFtcy5oYXNoKSB7XG4gICAgICAvLyBJIHdhbnQgdG8gY2FuY2VsIHJlY2lldmluZyByZXF1ZXN0IGJvZHkgYXNhcFxuICAgICAgLy8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTgzNjc4MjQvaG93LXRvLWNhbmNlbC1odHRwLXVwbG9hZC1mcm9tLWRhdGEtZXZlbnRzXG4gICAgICByZXMuaGVhZGVyKCdDb25uZWN0aW9uJywgJ2Nsb3NlJyk7XG4gICAgICByZXMuc3RhdHVzKDQwOSkuc2VuZChgW1JFSkVDVF0gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OmAgK1xuICAgICAgYC0gZm91bmQgZXhpc3Rpbmc6ICR7SlNPTi5zdHJpbmdpZnkoZXhpc3RpbmcsIG51bGwsICcgICcpfVxcbmAgK1xuICAgICAgYC0gaGFzaHM6XFxuICAke0pTT04uc3RyaW5naWZ5KGZpbGVzSGFzaCwgbnVsbCwgJyAgJyl9YCk7XG4gICAgICByZXEuc29ja2V0LmVuZCgpO1xuICAgICAgaWYgKHJlcy5jb25uZWN0aW9uKVxuICAgICAgICByZXMuY29ubmVjdGlvbi5lbmQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICAgIGNvbnN0IG5ld0NoZWNrc3VtSXRlbTogQ2hlY2tzdW1JdGVtID0ge1xuICAgICAgZmlsZTogcmVxLnBhcmFtcy5maWxlLFxuICAgICAgc2hhMjU2OiByZXEucGFyYW1zLmhhc2gsXG4gICAgICBjcmVhdGVkOiBub3cudG9Mb2NhbGVTdHJpbmcoKSxcbiAgICAgIGNyZWF0ZWRUaW1lOiBub3cuZ2V0VGltZSgpXG4gICAgfTtcblxuICAgIGNvbnN0IGNvbnRlbnRMZW4gPSByZXEuaGVhZGVyc1snY29udGVudC1sZW5ndGgnXTtcbiAgICBsZXQgcmVjaWV2ZWQ6IFJlY2lldmVkRGF0YTtcbiAgICAvLyBjaGVja3N1bS52ZXJzaW9ucyFbcmVxLnBhcmFtcy5hcHBdID0ge3ZlcnNpb246IHBhcnNlSW50KHJlcS5wYXJhbXMudmVyc2lvbiwgMTApfTtcbiAgICB0cnkge1xuICAgICAgcmVjaWV2ZWQgPSBhd2FpdCByZWFkUmVzcG9uc2VUb0J1ZmZlcihyZXEsIHJlcS5wYXJhbXMuaGFzaCwgY29udGVudExlbiA/IHBhcnNlSW50KGNvbnRlbnRMZW4sIDEwKSA6IDEwICogMTAyNCAqIDEwMjQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlLm1lc3NhZ2UgPT09ICdzaGEyNTYgbm90IG1hdGNoJykge1xuICAgICAgICByZXMuc2VuZChgW1dBUk5dICR7b3MuaG9zdG5hbWUoKX0gcGlkOiAke3Byb2Nlc3MucGlkfTogJHtKU09OLnN0cmluZ2lmeShuZXdDaGVja3N1bUl0ZW0sIG51bGwsICcgICcpfVxcbmAgK1xuICAgICAgICAgIGBSZWNpZXZlZCBmaWxlIGlzIGNvcnJ1cHRlZCB3aXRoIGhhc2ggJHsoZSBhcyB7c2hhMjU2Pzogc3RyaW5nfSkuc2hhMjU2IHx8ICc8dW5rbm93bj4nfSxcXG53aGlsZSBleHBlY3RpbmcgZmlsZSBoYXNoIGlzICR7bmV3Q2hlY2tzdW1JdGVtLnNoYTI1Nn1gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlcy5zdGF0dXMoNTAwKTtcbiAgICAgICAgcmVzLnNlbmQoZS5zdGFjayk7XG4gICAgICB9XG4gICAgfVxuICAgIHJlcy5zZW5kKGBbQUNDRVBUXSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06ICR7SlNPTi5zdHJpbmdpZnkobmV3Q2hlY2tzdW1JdGVtLCBudWxsLCAnICAnKX1gKTtcblxuICAgIGxldCBmaWxlQmFzZU5hbWUgPSBQYXRoLmJhc2VuYW1lKHJlcS5wYXJhbXMuZmlsZSk7XG4gICAgY29uc3QgZG90ID0gZmlsZUJhc2VOYW1lLmxhc3RJbmRleE9mKCcuJyk7XG4gICAgaWYgKGRvdCA+PTAgKVxuICAgICAgZmlsZUJhc2VOYW1lID0gZmlsZUJhc2VOYW1lLnNsaWNlKDAsIGRvdCk7XG4gICAgd3JpdGluZ0ZpbGUgPSBQYXRoLnJlc29sdmUoemlwRG93bmxvYWREaXIsIGAke2ZpbGVCYXNlTmFtZS5zbGljZSgwLCBmaWxlQmFzZU5hbWUubGFzdEluZGV4T2YoJy4nKSl9LiR7cHJvY2Vzcy5waWR9LnppcGApO1xuICAgIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKHdyaXRpbmdGaWxlKSk7XG4gICAgZnMud3JpdGVGaWxlKHdyaXRpbmdGaWxlLCByZWNpZXZlZCEuY29udGVudCwgb25aaXBGaWxlV3JpdHRlbik7XG4gICAgZmlsZXNIYXNoLnNldChuZXdDaGVja3N1bUl0ZW0uZmlsZSwgbmV3Q2hlY2tzdW1JdGVtKTtcbiAgICB3cml0ZUNoZWNrc3VtRmlsZShmaWxlc0hhc2gpO1xuICAgIGlmIChpc1BtMikge1xuICAgICAgY29uc3QgbXNnOiBQbTJQYWNrZXQgPSB7XG4gICAgICAgIHR5cGUgOiAncHJvY2Vzczptc2cnLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgJ2NkLXNlcnZlcjpjaGVja3N1bSB1cGRhdGluZyc6IG5ld0NoZWNrc3VtSXRlbSxcbiAgICAgICAgICBwaWQ6IHByb2Nlc3MucGlkXG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBwcm9jZXNzLnNlbmQhKG1zZyk7XG4gICAgfVxuICB9KTtcblxuXG4gIGFwcC51c2UoJy8nLCByb3V0ZXIpO1xuXG4gIGZ1bmN0aW9uIG9uWmlwRmlsZVdyaXR0ZW4oKSB7XG4gICAgaWYgKGlzUG0yICYmICFpc01haW5Qcm9jZXNzKSB7XG4gICAgICBjb25zdCBtc2c6IFBtMlBhY2tldCA9IHtcbiAgICAgICAgdHlwZSA6ICdwcm9jZXNzOm1zZycsXG4gICAgICAgIGRhdGE6IHtleHRyYWN0WmlwOiB0cnVlLCBwaWQ6IHByb2Nlc3MucGlkfVxuICAgICAgfTtcbiAgICAgIHByb2Nlc3Muc2VuZCEobXNnKTtcbiAgICB9IGVsc2VcbiAgICAgIHJldHJ5KDIsIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCkudGhlbigoKSA9PiBhcGkuZXZlbnRCdXMuZW1pdChhcGkucGFja2FnZU5hbWUgKyAnLmRvd25sb2FkZWQnKSlcbiAgICAgICAgLmNhdGNoKGUgPT4ge2xvZy5lcnJvcihlKTt9KTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGluaXRQbTIoKSB7XG4gICAgY29uc3QgcG0yID0gcmVxdWlyZSgncG0yJyk7XG4gICAgY29uc3QgcG0yY29ubmVjdCA9IHV0aWwucHJvbWlzaWZ5KHBtMi5jb25uZWN0LmJpbmQocG0yKSk7XG4gICAgY29uc3QgcG0ybGF1bmNoQnVzID0gdXRpbC5wcm9taXNpZnk8UG0yQnVzPihwbTIubGF1bmNoQnVzLmJpbmQocG0yKSk7XG5cbiAgICBhd2FpdCBwbTJjb25uZWN0KCk7XG4gICAgY29uc3QgYnVzID0gYXdhaXQgcG0ybGF1bmNoQnVzKCk7XG4gICAgYnVzLm9uKCdwcm9jZXNzOm1zZycsIHBhY2tldCA9PiB7XG4gICAgICBpZiAoIXBhY2tldC5kYXRhKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHVwZGF0ZWRDaGVja3N1bUl0ZW0gPSBwYWNrZXQuZGF0YVsnY2Qtc2VydmVyOmNoZWNrc3VtIHVwZGF0aW5nJ107XG4gICAgICBpZiAodXBkYXRlZENoZWNrc3VtSXRlbSAmJiBwYWNrZXQuZGF0YS5waWQgIT09IHByb2Nlc3MucGlkKSB7XG4gICAgICAgIGNvbnN0IHJlY2lldmVkQ2hlY2tzdW0gPSB1cGRhdGVkQ2hlY2tzdW1JdGVtO1xuICAgICAgICBmaWxlc0hhc2guc2V0KHJlY2lldmVkQ2hlY2tzdW0uZmlsZSwgcmVjaWV2ZWRDaGVja3N1bSk7XG4gICAgICAgIGxvZy5pbmZvKCdPdGhlciBwcm9jZXNzIHJlY2lldmVkIHVwZGF0aW5nIGNoZWNrc3VtICVzIGZyb20gaWQ6ICVzJyxcbiAgICAgICAgICB1dGlsLmluc3BlY3QocmVjaWV2ZWRDaGVja3N1bSksIF8uZ2V0KHBhY2tldCwgJ3Byb2Nlc3MucG1faWQnKSk7XG4gICAgICB9XG4gICAgICBjb25zdCBjaGVja01haWxQcm9wID0gcGFja2V0LmRhdGFbJ2NkLXNlcnZlcjpjaGVjayBtYWlsJ107XG4gICAgICBpZiAoY2hlY2tNYWlsUHJvcCAmJiBwYWNrZXQuZGF0YS5waWQgIT09IHByb2Nlc3MucGlkKSB7XG4gICAgICAgIGNoZWNrZWRTZXEgPSBjaGVja01haWxQcm9wO1xuICAgICAgICBsb2cuaW5mbygnT3RoZXIgcHJvY2VzcyB0cmlnZ2VycyBcImNoZWNrIG1haWxcIiBmcm9tIGlkOicsIF8uZ2V0KHBhY2tldCwgJ3Byb2Nlc3MucG1faWQnKSk7XG4gICAgICAgIC8vIGltYXAuY2hlY2tNYWlsRm9yVXBkYXRlKCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYWNrZXQuZGF0YS5leHRyYWN0WmlwICYmIHBhY2tldC5kYXRhLnBpZCAhPT0gcHJvY2Vzcy5waWQpIHtcbiAgICAgICAgbG9nLmluZm8oJ090aGVyIHByb2Nlc3MgdHJpZ2dlcnMgXCJleHRyYWN0WmlwXCIgZnJvbSBpZDonLCBfLmdldChwYWNrZXQsICdwcm9jZXNzLnBtX2lkJykpO1xuICAgICAgICByZXRyeSgyLCBmb3JrRXh0cmFjdEV4c3RpbmdaaXApXG4gICAgICAgICAgLnRoZW4oKCkgPT4gYXBpLmV2ZW50QnVzLmVtaXQoYXBpLnBhY2thZ2VOYW1lICsgJy5kb3dubG9hZGVkJykpXG4gICAgICAgICAgLmNhdGNoKGUgPT4ge2xvZy5lcnJvcihlKTt9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVUb2tlbigpIHtcbiAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IHRva2VuID0gZGF0ZS5nZXREYXRlKCkgKyAnJyArIGRhdGUuZ2V0SG91cnMoKTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2codG9rZW4pO1xuICByZXR1cm4gdG9rZW47XG59XG5cbmZ1bmN0aW9uIHJlYWRSZXNwb25zZVRvQnVmZmVyKHJlcTogUmVxdWVzdDx7ZmlsZTogc3RyaW5nOyBoYXNoOiBzdHJpbmd9PiwgZXhwZWN0U2hhMjU2OiBzdHJpbmcsIGxlbmd0aDogbnVtYmVyKVxuICA6IFByb21pc2U8UmVjaWV2ZWREYXRhPiB7XG4gIC8vIGxldCBjb3VudEJ5dGVzID0gMDtcblxuICBsZXQgaGFzaDogSGFzaDtcbiAgbGV0IGhhc2hEb25lOiBQcm9taXNlPHN0cmluZz47XG5cbiAgY29uc3QgYnVmID0gQnVmZmVyLmFsbG9jKGxlbmd0aCk7XG4gIGxldCBidWZPZmZzZXQgPSAwO1xuXG4gIHJlcS5vbignZGF0YScsIChkYXRhOiBCdWZmZXIpID0+IHtcbiAgICBidWZPZmZzZXQgKz0gZGF0YS5jb3B5KGJ1ZiwgYnVmT2Zmc2V0LCAwKTtcbiAgICBsb2cuZGVidWcoYFJlY2lldmluZywgJHtidWZPZmZzZXR9IGJ5dGVzYCk7XG4gICAgaWYgKGhhc2ggPT0gbnVsbCkge1xuICAgICAgaGFzaCA9IGNyeXB0by5jcmVhdGVIYXNoKCdzaGEyNTYnKTtcbiAgICAgIGhhc2hEb25lID0gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIGhhc2gub24oJ3JlYWRhYmxlJywgKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGRhdGEgPSBoYXNoLnJlYWQoKSBhcyBCdWZmZXI7XG4gICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgIHJlc29sdmUoZGF0YS50b1N0cmluZygnaGV4JykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgaGFzaC53cml0ZShkYXRhKTtcblxuICAgIC8vIGlmIChmd3JpdGVyID09IG51bGwpIHtcbiAgICAvLyAgIGxldCBmaWxlQmFzZU5hbWUgPSBQYXRoLmJhc2VuYW1lKHJlcS5wYXJhbXMuZmlsZSk7XG4gICAgLy8gICBjb25zdCBkb3QgPSBmaWxlQmFzZU5hbWUubGFzdEluZGV4T2YoJy4nKTtcbiAgICAvLyAgIGlmIChkb3QgPj0wIClcbiAgICAvLyAgICAgZmlsZUJhc2VOYW1lID0gZmlsZUJhc2VOYW1lLnNsaWNlKDAsIGRvdCk7XG4gICAgLy8gICB3cml0aW5nRmlsZSA9IFBhdGgucmVzb2x2ZSh6aXBEb3dubG9hZERpciwgYCR7ZmlsZUJhc2VOYW1lLnNsaWNlKDAsIGZpbGVCYXNlTmFtZS5sYXN0SW5kZXhPZignLicpKX0uJHtwcm9jZXNzLnBpZH0uemlwYCk7XG4gICAgLy8gICBmcy5ta2RpcnBTeW5jKFBhdGguZGlybmFtZSh3cml0aW5nRmlsZSkpO1xuICAgIC8vICAgZndyaXRlciA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKHdyaXRpbmdGaWxlKTtcbiAgICAvLyB9XG4gICAgLy8gZndyaXRlci53cml0ZShkYXRhKTtcbiAgfSk7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqKSA9PiB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1taXN1c2VkLXByb21pc2VzXG4gICAgcmVxLm9uKCdlbmQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBsb2cuaW5mbyhgVG90YWwgcmVjaWV2ZWQgJHtidWZPZmZzZXR9IGJ5dGVzYCk7XG4gICAgICBpZiAoYnVmT2Zmc2V0ID4gbGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiByZWoobmV3IEVycm9yKGBSZWNpZXZlZCBkYXRhIGxlbmd0aCAke2J1Zk9mZnNldH0gaXMgZ3JlYXRlciB0aGFuIGV4cGVjcmVkIGNvbnRlbnQgbGVuZ3RoICR7bGVuZ3RofWApKTtcbiAgICAgIH1cbiAgICAgIGxldCBzaGE6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgIGlmIChoYXNoKSB7XG4gICAgICAgIGhhc2guZW5kKCk7XG4gICAgICAgIHNoYSA9IGF3YWl0IGhhc2hEb25lO1xuICAgICAgfVxuXG4gICAgICBpZiAoc2hhICE9PSBleHBlY3RTaGEyNTYpIHtcbiAgICAgICAgY29uc3QgZXJyID0gbmV3IEVycm9yKCdzaGEyNTYgbm90IG1hdGNoJyk7XG4gICAgICAgIChlcnIgYXMgYW55KS5zaGEyNTYgPSBzaGE7XG4gICAgICAgIC8vIFRPRE86XG4gICAgICAgIC8vIHJlcy5zZW5kKGBbV0FSTl0gJHtvcy5ob3N0bmFtZSgpfSBwaWQ6ICR7cHJvY2Vzcy5waWR9OiAke0pTT04uc3RyaW5naWZ5KG5ld0NoZWNrc3VtSXRlbSwgbnVsbCwgJyAgJyl9XFxuYCArXG4gICAgICAgIC8vICAgYFJlY2lldmVkIGZpbGUgaXMgY29ycnVwdGVkIHdpdGggaGFzaCAke3NoYX0sXFxud2hpbGUgZXhwZWN0aW5nIGZpbGUgaGFzaCBpcyAke25ld0NoZWNrc3VtSXRlbS5zaGEyNTZ9YCk7XG4gICAgICAgIC8vIGZ3cml0ZXIhLmVuZChvblppcEZpbGVXcml0dGVuKTtcbiAgICAgICAgLy8gZndyaXRlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIHJlaihlcnIpO1xuICAgICAgfVxuICAgICAgcmVzb2x2ZSh7XG4gICAgICAgIGhhc2g6IHNoYSxcbiAgICAgICAgY29udGVudDogYnVmLnNsaWNlKDAsIGJ1Zk9mZnNldCksXG4gICAgICAgIGxlbmd0aDogYnVmT2Zmc2V0XG4gICAgICB9KTtcblxuICAgICAgLy8gZndyaXRlciEuZW5kKG9uWmlwRmlsZVdyaXR0ZW4pO1xuICAgICAgLy8gZndyaXRlciA9IHVuZGVmaW5lZDtcbiAgICAgIC8vIHJlcy5zZW5kKGBbQUNDRVBUXSAke29zLmhvc3RuYW1lKCl9IHBpZDogJHtwcm9jZXNzLnBpZH06ICR7SlNPTi5zdHJpbmdpZnkobmV3Q2hlY2tzdW1JdGVtLCBudWxsLCAnICAnKX1gKTtcblxuICAgICAgLy8gZmlsZXNIYXNoLnNldChuZXdDaGVja3N1bUl0ZW0uZmlsZSwgbmV3Q2hlY2tzdW1JdGVtKTtcbiAgICAgIC8vIHdyaXRlQ2hlY2tzdW1GaWxlKGZpbGVzSGFzaCk7XG4gICAgICAvLyBpZiAoaXNQbTIpIHtcbiAgICAgIC8vICAgY29uc3QgbXNnOiBQbTJQYWNrZXQgPSB7XG4gICAgICAvLyAgICAgdHlwZSA6ICdwcm9jZXNzOm1zZycsXG4gICAgICAvLyAgICAgZGF0YToge1xuICAgICAgLy8gICAgICAgJ2NkLXNlcnZlcjpjaGVja3N1bSB1cGRhdGluZyc6IG5ld0NoZWNrc3VtSXRlbSxcbiAgICAgIC8vICAgICAgIHBpZDogcHJvY2Vzcy5waWRcbiAgICAgIC8vICAgICB9XG4gICAgICAvLyAgIH07XG4gICAgICAvLyAgIHByb2Nlc3Muc2VuZCEobXNnKTtcbiAgICAgIC8vIH1cbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJlYWRDaGVja3N1bUZpbGUoKTogTWFwPHN0cmluZywgQ2hlY2tzdW1JdGVtPiB7XG4gIGNvbnN0IGVudiA9IG1haWxTZXR0aW5nID8gbWFpbFNldHRpbmcuZW52IDogJ2xvY2FsJztcbiAgY29uc3QgY2hlY2tzdW1GaWxlID0gUGF0aC5yZXNvbHZlKCdjaGVja3N1bS4nICsgZW52ICsgJy5qc29uJyk7XG4gIGxldCBjaGVja3N1bTogQ2hlY2tzdW07XG4gIGlmIChmcy5leGlzdHNTeW5jKGNoZWNrc3VtRmlsZSkpIHtcbiAgICB0cnkge1xuICAgICAgY2hlY2tzdW0gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhjaGVja3N1bUZpbGUsICd1dGY4JykpIGFzIENoZWNrc3VtO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZy53YXJuKGUpO1xuICAgICAgY2hlY2tzdW0gPSBbXTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgY2hlY2tzdW0gPSBbXTtcbiAgfVxuICByZXR1cm4gY2hlY2tzdW0ucmVkdWNlKChtYXAsIHZhbCkgPT4gbWFwLnNldCh2YWwuZmlsZSwgdmFsKSwgbmV3IE1hcDxzdHJpbmcsIENoZWNrc3VtSXRlbT4oKSk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlQ2hlY2tzdW1GaWxlKGNoZWNrc3VtOiBSZXR1cm5UeXBlPHR5cGVvZiByZWFkQ2hlY2tzdW1GaWxlPikge1xuICBjb25zdCBlbnYgPSBtYWlsU2V0dGluZyA/IG1haWxTZXR0aW5nLmVudiA6ICdsb2NhbCc7XG4gIGZzLndyaXRlRmlsZShQYXRoLnJlc29sdmUoJ2NoZWNrc3VtLicgKyBlbnYgKyAnLmpzb24nKSwgSlNPTi5zdHJpbmdpZnkoQXJyYXkuZnJvbShjaGVja3N1bS52YWx1ZXMoKSksIG51bGwsICcgICcpLCAoZXJyKSA9PiB7XG4gICAgaWYgKGVycikge1xuICAgICAgbG9nLmVycm9yKGVycik7XG4gICAgfVxuICB9KTtcbn1cbiJdfQ==