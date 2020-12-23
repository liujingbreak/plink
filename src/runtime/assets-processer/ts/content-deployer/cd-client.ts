import { defer, Observable, Subject } from 'rxjs';
import http from 'http';
import https from 'https';
import Url from 'url';
import api from '__api';
import { Checksum } from '../fetch-types';
import util from 'util';
import fs from 'fs';
import crypto from 'crypto';
// import PromQ from 'promise-queue';
const log = require('log4js').getLogger(api.packageName + '.cd-client');

const RES_SKIP = 'Skip sending';
export interface Options {
  url: string;
  /** Name of the file to be created or replaced in remote server*/
  remoteFile: string;
  numOfNode: number;
  numOfConc: number; // number of concurrent request
  secret?: string;
}

export interface ServerMetaInfo {
  checksum: Checksum;
  id: string;
}

export async function sendAppZip(opt: Options = {} as Options, file?: string) {
  const argv = api.argv;
  if (!opt.url)
    opt.url = argv.url;

  if (opt.numOfNode == null) {
    if (argv.numOfNode == null)
      opt.numOfNode = 1;
    else
      opt.numOfNode = parseInt(argv.numOfNode, 10);
  }

  if (opt.numOfConc == null) {
    if (argv.numOfConc == null)
      opt.numOfConc = 2;
    else
      opt.numOfConc = parseInt(argv.numOfConc, 10);
  }

  if (file == null)
    file = api.argv.file;

  if (!opt.url) {
    throw new Error(`Missing arguments: url... in ${opt}`);
  }
  log.info(opt);

  let sendCount = 0;

  const bufferToSend = file ? fs.readFileSync(file) : undefined;
  let sha = '';
  if (bufferToSend) {
    const hash = crypto.createHash('sha256');
    hash.update(bufferToSend);
    sha = hash.digest('hex');
  }


  return new Promise<void>((resolve, reject) => {
    // const concurQ = new PromQ(opt.numOfConc, 20);

    let finishedSet = new Set<string>();

    for (let i = 0, l = opt.numOfConc; i < l; i++) {
      send();
    }

    async function send() {
      sendCount++;
      try {
        log.info('#%s sending App: %s', sendCount, sha);
        const reply = await sendRequest(opt, sha, bufferToSend);
        const match = /^\[ACCEPT\] \s*(\S+)\s+pid:/.exec(reply);
        if (match && match[1])
        finishedSet.add(match[1]);
      } catch (ex) {
        if (ex.message !== RES_SKIP)
          log.warn(ex);
      }
      if (finishedSet.size >= opt.numOfNode) {
        log.info(`All server recieved ${finishedSet.size} finished: ${Array.from(finishedSet.values()).join('\n')}`);
        resolve();
      } else if (sendCount > 15) {
        const msg = `Tried 15 times, ${finishedSet.size} finished: ${Array.from(finishedSet.values()).join('\n')}`;
        log.info(msg);
        reject(new Error(msg));
      } else {
        send();
      }
    }
  });
}

enum SendState {
  ready = 0, sending, sent
}
function sendRequest(opt: Options, sha: string, buffer?: Buffer): Promise<string> {
  const urlObj = Url.parse(opt.url, true);
  let url = opt.url + `/${encodeURIComponent(opt.remoteFile)}/${encodeURIComponent(sha)}`;

  if (opt.secret) {
    url += '?whisper=' + encodeURIComponent(opt.secret);
  }

  let sendState = SendState.ready;

  return new Promise<string>((resolve, reject) => {
    let req: http.ClientRequest;
    const reqOpt: http.RequestOptions = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    };

    if (urlObj.protocol === 'http:') {
      req = http.request(url, reqOpt, onResponse);
    } else {
      req = https.request(url, reqOpt, onResponse);
    }

    function onResponse(res: http.IncomingMessage) {
      const status = res.statusCode;
      if (status == null) {
        reject(new Error('response status Null'));
        return;
      }

      res.setEncoding('utf8');
      let buf = '';
      res.on('data', (chunk: string) => {
        buf += chunk;
      });
      res.on('end', () => {
        log.info('recieve: ', buf);

        if (status === 409) {
          if (timer) {
            clearTimeout(timer);
            req.end();
            log.info('Skip sending');
          }
          reject(new Error(RES_SKIP));
          return;
        } else if (status < 200 || status > 299) {
          reject(new Error(`status: ${status} ${res.statusMessage}, headers: ${util.inspect(res.headers)}`));
          return;
        }
        resolve(buf);
      });
    }

    req.on('error', err => reject(err));
    let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      timer = null;
      sendState++;
      if (buffer)
        log.info('sending....%s b', buffer!.byteLength);
      req.end(buffer ? buffer : 'ok', () => {
        sendState++;
        log.info('done sending body ', sendState);
      });
    }, 1000);
  });
}

const LR = '\n'.charCodeAt(0);

// async function connectToContentServer(opt: Options) {
//   enum State {
//     wait4ServerInfo = 0,
//     wait4UploadAck
//   }
//   let state = State.wait4ServerInfo;
//   let socket: TLSSocket|undefined;
//   try {
//     socket = await new Promise<ReturnType<typeof tslConnect>>((resolve, reject) => {
//       const socket = tslConnect({
//         host: opt.host, port: opt.port,
//         enableTrace: true
//       } as ConnectionOptions);

//       fromEventPattern<Buffer>(handler => {
//         socket!.on('data', handler);
//       })
//       .pipe(
//         toLines,
//         tap(onEachReply)
//       ).subscribe();

//       socket.on('secureConnect', () => {
//         log.info('connected', socket.authorized ? 'authorized' : 'unauthorized');
//         resolve(socket);
//       })
//       .on('error', err => reject(err))
//       .on('timeout', () => reject(new Error('Timeout')));
//     });
//   } catch (ex) {
//     if (socket)
//       socket.end();
//   }

//   function onEachReply(line: string) {
//     log.info('<=', line);
//     switch (state) {
//       case State.wait4ServerInfo:
//         state++;

//         break;
//       case State.wait4UploadAck:
//       default:
//     }
//   }
// }

export function toLines(src: Observable<Buffer>) {
  let chars = Buffer.alloc(100);
    let charsOffset = 0;
    return defer(() => {
      const sub = new Subject<string>();
      src.subscribe(data => {
          for (const byte of data) {
            if (byte === LR) {
              sub.next(chars.toString('utf8', 0, charsOffset));
              charsOffset = 0;
              continue;
            }
            if (chars.byteLength === charsOffset) {
              let newChars = Buffer.alloc(Math.ceil(chars.byteLength * 1.3));
              chars.copy(newChars, 0, 0, chars.byteLength);
              chars = newChars;
            }
            chars.writeUInt8(byte, charsOffset++);
          }
        },
        err => sub.error(err),
        () => sub.complete()
      );
      return sub;
    });
}
