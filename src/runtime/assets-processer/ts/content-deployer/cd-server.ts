import {Application, Request} from 'express';
import os from 'os';
import {Checksum} from '../fetch-types';
import * as util from 'util';
import {getPm2Info, zipDownloadDir, forkExtractExstingZip, retry} from '../fetch-remote';
import Path from 'path';
import {ImapManager} from '../fetch-remote-imap';
import fs from 'fs-extra';
import _ from 'lodash';
import memstat from '@wfh/plink/wfh/dist/utils/mem-stats';
import crypto, {Hash} from 'crypto';
import api from '__api';
import {log4File, config} from '@wfh/plink';
const log = log4File(__filename);
// import {stringifyListAllVersions} from '@wfh/prebuild/dist/artifacts';

// const log = require('log4js').getLogger(api.packageName + '.cd-server');

interface Pm2Packet {
  type: 'process:msg';
  data: {
    pid: number;
    'cd-server:checksum updating'?: ChecksumItem;
    'cd-server:check mail'?: string;
    extractZip?: boolean;
  };
}

interface Pm2Bus {
  on(event: 'process:msg', cb: (packet: Pm2Packet) => void): void;
}

type ChecksumItem = Checksum extends Array<infer I> ? I : unknown;

interface RecievedData {
  hash?: string; content: Buffer; length: number;
}

const requireToken = config()['@wfh/assets-processer'].requireToken;
const mailSetting = config()['@wfh/assets-processer'].fetchMailServer;


export function activate(app: Application, imap: ImapManager) {
  let writingFile: string | undefined;

  let filesHash = readChecksumFile();

  const {isPm2, isMainProcess} = getPm2Info();
  if (isPm2) {
    void initPm2();
  }

  void imap.appendMail(`server ${os.hostname()} ${process.pid} activates`, new Date() + '');

  app.use('/_stat', (req, res, next) => {
    if (requireToken && req.query.whisper !== generateToken()) {
      res.header('Connection', 'close');
      res.status(401).send(`REJECT from ${os.hostname()} pid: ${process.pid}: Not allowed to push artifact in this environment.`);
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
        hostname: os.hostname(),
        pid: process.pid,
        mem: memstat(),
        cpus: os.cpus(),
        arch: os.arch(),
        platform: os.platform(),
        loadavg: os.loadavg()
      }, null, '  '));
    } else {
      next();
    }
  });

  let checkedSeq = '';

  app.use('/_checkmail/:seq', (req, res, next) => {
    log.info('force check mail for:', req.params.seq);
    if (checkedSeq === req.params.seq)
      return;
    if (isPm2 && !isMainProcess) {
      process.send!({
        type : 'process:msg',
        data: {
          'cd-server:check mail': req.params.seq,
          pid: process.pid
        }
      });
    } else {
      void imap.checkMailForUpdate();
    }
  });

  app.use('/_time', (req, res) => {
    res.send(generateToken());
  });


  const router = api.express.Router();
  // router.get('/_githash', async (req, res) => {
  //   res.setHeader('content-type', 'text/plain');
  //   res.send(await stringifyListAllVersions());
  // });

  router.put<{file: string; hash: string}>('/_install_force/:file/:hash', (req, res, next) => {
    (req as unknown as {_installForce: boolean})._installForce = true;
    next();
  });

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.put<{file: string; hash: string}>('/_install/:file/:hash', async (req, res) => {
    const isForce = (req as unknown as {_installForce: boolean})._installForce === true;

    if (requireToken && req.query.whisper !== generateToken()) {
      res.header('Connection', 'close');
      res.status(401).send(`REJECT from ${os.hostname()} pid: ${process.pid}: Not allowed to push artifact in this environment.`);
      req.socket.end();
      if (res.connection)
        res.connection.end();
      return;
    }
    const existing = filesHash.get(req.params.file);
    log.info(`${req.method} [${os.hostname()}]file: ${req.params.file}, hash: ${req.params.hash},\nexisting file: ${existing ? existing.file + ' / ' + existing.sha256 : '<NO>'}` +
      `\n${util.inspect(req.headers)}`);

    if (requireToken && req.query.whisper !== generateToken()) {
      res.header('Connection', 'close');
      res.status(401).send(`REJECT from ${os.hostname()} pid: ${process.pid}: Not allowed to push artifact in this environment.`);
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
      res.status(409).send(`[REJECT] ${os.hostname()} pid: ${process.pid}:` +
      `- found existing: ${JSON.stringify(existing, null, '  ')}\n` +
      `- hashs:\n  ${JSON.stringify(filesHash, null, '  ')}`);
      req.socket.end();
      if (res.connection)
        res.connection.end();
      return;
    }

    const now = new Date();
    const newChecksumItem: ChecksumItem = {
      file: req.params.file,
      sha256: req.params.hash,
      created: now.toLocaleString(),
      createdTime: now.getTime()
    };

    const contentLen = req.headers['content-length'];
    let recieved: RecievedData;
    // checksum.versions![req.params.app] = {version: parseInt(req.params.version, 10)};
    try {
      recieved = await readResponseToBuffer(req, req.params.hash, contentLen ? parseInt(contentLen, 10) : 10 * 1024 * 1024);
    } catch (e) {
      if (e.message === 'sha256 not match') {
        res.send(`[WARN] ${os.hostname()} pid: ${process.pid}: ${JSON.stringify(newChecksumItem, null, '  ')}\n` +
          `Recieved file is corrupted with hash ${(e as {sha256?: string}).sha256 || '<unknown>'},\nwhile expecting file hash is ${newChecksumItem.sha256}`);
      } else {
        res.status(500);
        res.send(e.stack);
      }
    }
    res.send(`[ACCEPT] ${os.hostname()} pid: ${process.pid}: ${JSON.stringify(newChecksumItem, null, '  ')}`);

    let fileBaseName = Path.basename(req.params.file);
    const dot = fileBaseName.lastIndexOf('.');
    if (dot >=0 )
      fileBaseName = fileBaseName.slice(0, dot);
    writingFile = Path.resolve(zipDownloadDir, `${fileBaseName.slice(0, fileBaseName.lastIndexOf('.'))}.${process.pid}.zip`);
    fs.mkdirpSync(Path.dirname(writingFile));
    fs.writeFile(writingFile, recieved!.content, onZipFileWritten);
    filesHash.set(newChecksumItem.file, newChecksumItem);
    writeChecksumFile(filesHash);
    if (isPm2) {
      const msg: Pm2Packet = {
        type : 'process:msg',
        data: {
          'cd-server:checksum updating': newChecksumItem,
          pid: process.pid
        }
      };
      process.send!(msg);
    }
  });


  app.use('/', router);

  function onZipFileWritten() {
    if (isPm2 && !isMainProcess) {
      const msg: Pm2Packet = {
        type : 'process:msg',
        data: {extractZip: true, pid: process.pid}
      };
      process.send!(msg);
    } else
      retry(2, forkExtractExstingZip).then(() => api.eventBus.emit(api.packageName + '.downloaded'))
        .catch(e => {log.error(e);});
  }

  async function initPm2() {
    const pm2 = require('pm2');
    const pm2connect = util.promisify(pm2.connect.bind(pm2));
    const pm2launchBus = util.promisify<Pm2Bus>(pm2.launchBus.bind(pm2));

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
        log.info('Other process recieved updating checksum %s from id: %s',
          util.inspect(recievedChecksum), _.get(packet, 'process.pm_id'));
      }
      const checkMailProp = packet.data['cd-server:check mail'];
      if (checkMailProp && packet.data.pid !== process.pid) {
        checkedSeq = checkMailProp;
        log.info('Other process triggers "check mail" from id:', _.get(packet, 'process.pm_id'));
        // imap.checkMailForUpdate();
      }

      if (packet.data.extractZip && packet.data.pid !== process.pid) {
        log.info('Other process triggers "extractZip" from id:', _.get(packet, 'process.pm_id'));
        retry(2, forkExtractExstingZip)
          .then(() => api.eventBus.emit(api.packageName + '.downloaded'))
          .catch(e => {log.error(e);});
      }
    });
  }
}

export function generateToken() {
  const date = new Date();
  const token = date.getDate() + '' + date.getHours();
  // eslint-disable-next-line no-console
  console.log(token);
  return token;
}

function readResponseToBuffer(req: Request<{file: string; hash: string}>, expectSha256: string, length: number)
  : Promise<RecievedData> {
  // let countBytes = 0;

  let hash: Hash;
  let hashDone: Promise<string>;

  const buf = Buffer.alloc(length);
  let bufOffset = 0;

  req.on('data', (data: Buffer) => {
    bufOffset += data.copy(buf, bufOffset, 0);
    log.debug(`Recieving, ${bufOffset} bytes`);
    if (hash == null) {
      hash = crypto.createHash('sha256');
      hashDone = new Promise(resolve => {
        hash.on('readable', () => {
          const data = hash.read() as Buffer;
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
      let sha: string | undefined;
      if (hash) {
        hash.end();
        sha = await hashDone;
      }

      if (sha !== expectSha256) {
        const err = new Error('sha256 not match');
        (err as any).sha256 = sha;
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

function readChecksumFile(): Map<string, ChecksumItem> {
  const env = mailSetting ? mailSetting.env : 'local';
  const checksumFile = Path.resolve('checksum.' + env + '.json');
  let checksum: Checksum;
  if (fs.existsSync(checksumFile)) {
    try {
      checksum = JSON.parse(fs.readFileSync(checksumFile, 'utf8')) as Checksum;
    } catch (e) {
      log.warn(e);
      checksum = [];
    }
  } else {
    checksum = [];
  }
  return checksum.reduce((map, val) => map.set(val.file, val), new Map<string, ChecksumItem>());
}

function writeChecksumFile(checksum: ReturnType<typeof readChecksumFile>) {
  const env = mailSetting ? mailSetting.env : 'local';
  fs.writeFile(Path.resolve('checksum.' + env + '.json'), JSON.stringify(Array.from(checksum.values()), null, '  '), (err) => {
    if (err) {
      log.error(err);
    }
  });
}
