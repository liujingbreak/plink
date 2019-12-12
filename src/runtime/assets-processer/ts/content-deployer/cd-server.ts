import {Application} from 'express';
import os from 'os';
import {Checksum} from '../fetch-types';
import util from 'util';
import _pm2 from '@growth/pm2';
import {getPm2Info, zipDownloadDir, forkExtractExstingZip, retry} from '../fetch-remote';
import Path from 'path';
import {ImapManager} from '../fetch-remote-imap';
import fs from 'fs-extra';
import _ from 'lodash';
const log = require('log4js').getLogger('@dr/assets-processer.cd-server');

interface Pm2Packet {
  type: 'process:msg';
  data: any;
  process: {pm_id: string};
}

interface Pm2Bus {
  on(event: 'process:msg', cb: (packet: Pm2Packet) => void): void;
}

export async function activate(app: Application, imap: ImapManager) {
  let fwriter: fs.WriteStream | undefined;
  let writingFile: string | undefined;

  const checksum: Checksum = {
    versions: {}
  };

  const {isPm2, isMainProcess} = getPm2Info();
  if (isPm2) {
    initPm2();
  }

  app.use('/_install/:app/:version', async (req, res) => {
    log.info(`${req.method} [${os.hostname}]app: ${req.params.app}, version: ${req.params.version}\n${util.inspect(req.headers)}`);
    const nVersion = parseInt(req.params.version, 10);
    const existing = checksum.versions![req.params.app];

    if (req.method === 'PUT') {
      log.info('recieving data');
      if (isPm2 && !isMainProcess) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      if (existing && existing.version >= nVersion) {
        // I want to cancel recieving request body asap
        // https://stackoverflow.com/questions/18367824/how-to-cancel-http-upload-from-data-events
        res.header('Connection', 'close');
        res.status(409).send(`REJECT from ${os.hostname()} pid: ${process.pid}: ${JSON.stringify(checksum, null, '  ')}`);
        req.socket.end();
        res.connection.end();
        return;
      }
      checksum.versions![req.params.app] = {version: parseInt(req.params.version, 10)};
      if (isPm2) {
        process.send!({
          type : 'process:msg',
          data: {
            'cd-server:checksum updating': checksum,
            pid: process.pid
          }
        } as Pm2Packet);
      }
      let countBytes = 0;
      req.on('data', (data: Buffer) => {
        countBytes += data.byteLength;
        if (fwriter == null) {
          writingFile = Path.resolve(zipDownloadDir, `${req.params.app}.${process.pid}.zip`);
          fwriter = fs.createWriteStream(writingFile);
        }
        fwriter.write(data);
      });
      req.on('end', () => {
        log.info(`${writingFile} is written with ${countBytes} bytes`);
        fwriter!.end(onZipFileWritten);
        fwriter = undefined;
        res.send(`[ACCEPT] ${os.hostname()} pid: ${process.pid}: ${JSON.stringify(checksum, null, '  ')}`);
      });
    } else
      res.send(`[INFO] ${os.hostname()} pid: ${process.pid}: ${JSON.stringify(checksum, null, '  ')}`);
  });

  let checkedSeq = '';

  app.get('/_checkmail/:seq', (req, res) => {
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
      imap.checkMailForUpdate();
    }
  });

  function onZipFileWritten() {
    if (isPm2 && !isMainProcess) {
      process.send!({
        type : 'process:msg',
        data: {extractZip: true, pid: process.pid}
      });
    } else
      retry(2, forkExtractExstingZip);
  }

  async function initPm2() {
    const pm2: typeof _pm2 = require('@growth/pm2');
    const pm2connect = util.promisify(pm2.connect.bind(pm2));
    const pm2launchBus = util.promisify<Pm2Bus>(pm2.launchBus.bind(pm2));

    await pm2connect();
    const bus = await pm2launchBus();
    bus.on('process:msg', packet => {
      if (!packet.data) {
        return;
      }
      const updatingProp = packet.data['cd-server:checksum updating'];
      if (updatingProp && packet.data.pid !== process.pid) {
        const recievedChecksum = updatingProp;
        if (recievedChecksum)
          checksum.versions = recievedChecksum.versions;
          log.info('Other process recieved updating checksum %s from id: %s',
            util.inspect(checksum), _.get(packet, 'process.pm_id'));
      }
      const checkMailProp = packet.data['cd-server:check mail'];
      if (checkMailProp && packet.data.pid !== process.pid) {
        checkedSeq = checkMailProp;
        log.info('Other process triggers "check mail" from id:', _.get(packet, 'process.pm_id'));
        imap.checkMailForUpdate();
      }

      if (packet.data.extractZip && packet.data.pid !== process.pid) {
        log.info('Other process triggers "extractZip" from id:', _.get(packet, 'process.pm_id'));
        retry(2, forkExtractExstingZip);
      }
    });
  }

}

