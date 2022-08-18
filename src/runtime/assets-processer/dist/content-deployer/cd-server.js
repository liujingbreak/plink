"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = exports.activate = void 0;
const tslib_1 = require("tslib");
const os_1 = tslib_1.__importDefault(require("os"));
const util = tslib_1.__importStar(require("util"));
const fetch_remote_1 = require("../fetch-remote");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const mem_stats_1 = tslib_1.__importDefault(require("@wfh/plink/wfh/dist/utils/mem-stats"));
const crypto_1 = tslib_1.__importDefault(require("crypto"));
const __api_1 = tslib_1.__importDefault(require("__api"));
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
//# sourceMappingURL=cd-server.js.map