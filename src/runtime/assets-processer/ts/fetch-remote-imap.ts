import { createTransport } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import {Observable, BehaviorSubject } from 'rxjs';
import { map, /*concatMap, takeWhile, takeLast, mapTo,*/ tap, distinctUntilChanged,
  skip, filter, take} from 'rxjs/operators';
import { connect as tslConnect, ConnectionOptions, TLSSocket } from 'tls';
import fs from 'fs-extra';
import * as _ from 'lodash';
import Path from 'path';
import {Checksum, WithMailServerConfig} from './fetch-types';
import {createServerDataHandler, parseLinesOfTokens, ImapTokenType, StringLit} from './mail/imap-msg-parser';
import api from '__api';
import { LookAhead, Token } from 'dr-comp-package/wfh/dist/async-LLn-parser';
import {parse as parseRfc822} from './mail/rfc822-parser';
// import {Socket} from 'net';
const log = require('log4js').getLogger(api.packageName + '.fetch-remote-imap');

const setting = api.config.get(api.packageName) as WithMailServerConfig;
const env = setting.fetchMailServer ? setting.fetchMailServer.env : 'local';


const currChecksumFile = Path.resolve('checksum.' + (setting.fetchMailServer ? env : 'local') + '.json');

export async function sendMail(subject: string, text: string, file?: string) {
  log.info('login');
  if (!setting.fetchMailServer) {
    log.warn('fetchMailServer is not configured! Skip sendMail');
    return;
  }
  const {
    user: EMAIL,
    loginSecret: SECRET,
    // imap: IMAP,
    smtp: SMTP
  } = setting.fetchMailServer;

  const transporter = createTransport({
    host: SMTP,
    auth: {
      type: 'login',
      user: EMAIL,
      pass: SECRET
    },
    secure: true
  } as SMTPTransport.Options);

  log.info('send mail');
  const info = await transporter.sendMail({
    from: EMAIL,
    to: EMAIL,
    subject: `build artifact: ${subject}`,
    text,
    attachments: file ? [
      {
        filename: Path.basename(file),
        path: Path.resolve(file)
      }
    ] : undefined
  });

  log.info(info);
}

export async function retrySendMail(subject: string, text: string, file?: string) {
  let error: Error | undefined;
  for (let i = 0; i < 3; i++) {
    try {
      await sendMail(subject, text, file);
      error = undefined;
      break;
    } catch (err) {
      log.info('Got error', err);
      error = err;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  if (error) {
    throw error;
  }
}

// enum FetchState {
//   start = 0,
//   headers,
//   headersEnd,
//   textHeaders,
//   textBody,
//   attachmentHeaders,
//   attachementBody,
//   end
// }

export interface ImapFetchData {
  headers: {[key: string]: string[] | undefined};
  textBody?: string;
  fileName?: string;
}

export interface ImapCommandContext {
  /**
   * Index of latest mail
   */
  lastIndex: number;
  fileWritingState: Observable<boolean>;
  waitForReply(command?: string, onLine?: (la: LookAhead<Token<ImapTokenType>>, tag: string) => Promise<any>): Promise<string[]|null>;
  findMail(fromIndx: number, subject: string): Promise<number | undefined>;
  waitForFetch(mailIdx: string | number, headerOnly?: boolean, overrideFileName?: string): Promise<ImapFetchData>;
  waitForFetchText(index: number): Promise<string | undefined>;
}

/**
 * IMAP specification
 * https://tools.ietf.org/html/rfc1730
 * 
 * ID command
 * https://tools.ietf.org/html/rfc2971
 */
export async function connectImap(callback: (context: ImapCommandContext) => Promise<any>) {

  let logEnabled = true;
  let cmdIdx = 1;
  const fileWritingState = new BehaviorSubject<Set<string>>(new Set<string>());

  if (!setting.fetchMailServer) {
    log.warn('fetchMailServer is not configured! Skip sendMail');
    return;
  }
  const {
      user: EMAIL,
      loginSecret: SECRET,
      imap: IMAP
      // smtp: SMTP
  } = setting.fetchMailServer;

  const context: {[k in keyof ImapCommandContext]?: ImapCommandContext[k]} = {};

  context.waitForReply = waitForReply;
  context.waitForFetch = waitForFetch;
  context.waitForFetchText = waitForFetchText;
  context.findMail = findMail;
  context.fileWritingState = fileWritingState.pipe(
    map(fileSet => {
      // log.warn('writing: ', fileSet.values());
      return fileSet.size > 0;
    }),
    distinctUntilChanged()
  );

  const serverResHandler = createServerDataHandler();
  serverResHandler.output.pipe(
    tap(msg => {
      if (msg != null) log.debug('  <- ' + msg.map(token => token.text).join(' '));
    })
  ).subscribe();

  let socket: TLSSocket|undefined;
  try {
    socket = await new Promise<ReturnType<typeof tslConnect>>((resolve, reject) => {
      const socket = tslConnect({
        host: IMAP, port: 993,
        enableTrace: true
      } as ConnectionOptions);

      socket.on('secureConnect', () => {
        log.info('connected', socket.authorized ? 'authorized' : 'unauthorized');
        resolve(socket);
      })
      .on('error', err => reject(err))
      .on('timeout', () => reject(new Error('Timeout')));
      socket.on('data', (data: Buffer) => {
        // console.log(data.toString());
        serverResHandler.input(data);
      });
    });

    await waitForReply();
    await waitForReply('ID ("name" "com.tencent.foxmail" "version" "7.2.9.79")');
    await waitForReply(`LOGIN ${EMAIL} ${SECRET}`);
    await waitForReply('SELECT INBOX', async la => {
      const exitsTk = await la.la(3);
      if (exitsTk && exitsTk.text.toUpperCase() === 'EXISTS') {
        context.lastIndex = parseInt((await la.la(2))!.text, 10);
      }
    });

    await callback(context as ImapCommandContext);
    await waitForReply('LOGOUT');
  } catch (ex) {
    log.error(ex);
    try {
      await waitForReply('LOGOUT');
    } catch (er) {}
    if (socket)
      socket.end();
    throw ex;
  }

  serverResHandler.input(null);
  socket.end();

  async function waitForFetchText(index: number) {
    let body1: string | undefined;
    await waitForReply(`FETCH ${index} BODY[1]`, async la => {
      while ((await la.la()) != null) {
        const token = await la.advance();
        if (token.text === 'BODY' && (await la.la())!.text === '[1]') {
          await la.advance();
          body1 = ((await la.advance()) as unknown as StringLit).data.toString('utf8');
        }
      }
    });

    // log.warn(buf);
    // return /^\*\s+\d+\s+FETCH\s+\(.*?\{\d+\}([^]*)\)$/m.exec(buf)![1];
    return body1;
  }

  function waitForReply(command?: string, onLine?: (la: LookAhead<Token<ImapTokenType>>, tag: string) => Promise<any>) {
    let tag: string;
    if (command)
      tag = 'a' + (cmdIdx++);

    const prom = parseLinesOfTokens(serverResHandler.output, async la => {
      const resTag = await la.la();
      if (!tag && resTag!.text === '*' || resTag!.text === tag) {
        await la.advance();
        const state = await la.la();
        let returnText = '';
        if (/OK|NO/.test(state!.text)) {
          returnText += (await la.advance()).text;
          while ((await la.la()) != null) {
            returnText += ' ' + (await la.advance()).text;
          }
        }
        return returnText;
      } else if (onLine) {
        await onLine(la, tag);
      }
    });

    if (command) {
      const cmd = tag! + ' ' + command;
      if (socket)
        socket.write(Buffer.from(`${tag!} ${command}\r\n`, 'utf8'));
      log.debug('=>', cmd);
    }

    return prom;
  }

  async function waitForFetch(mailIdx: string | number = '*', headerOnly = true, overrideFileName?: string): Promise<ImapFetchData> {
    // let state: FetchState = FetchState.start;
    let headers: {
      subject?: string[];
      'content-type'?: string[];
      [key: string]: string[] | undefined;
    } = {};
    // let lastHeaderName: string;
    // let boundary: string;
    let textBody: string = '';
    let fileName: string;
    // let fileWriter: fs.WriteStream;
    // let attachementFile: string;

    const originLogEnabled = logEnabled;
    logEnabled = headerOnly;
    await waitForReply(`FETCH ${mailIdx} RFC822${headerOnly ? '.HEADER' : ''}`, async (la) => {
      while ((await la.la()) != null) {
        const tk = await la.advance();
        if (tk.type !== ImapTokenType.stringLit) {
          log.warn(tk.text);
        } else {
          // log.warn('string literal:\n', (tk as any as StringLit).data.toString('utf8'));
          // parseRfc822((tk as any as StringLit).data);
        }
      }
      // switch (state) {
      //   case FetchState.start:
      //     if (/^\*\s+[0-9]+\s+FETCH\s+/.test(line)) {
      //       state = FetchState.headers;
      //     }
      //     break;
      //   case FetchState.headers:
      //     if (/^\s/.test(line)) {
      //       const items = headers[lastHeaderName]!;
      //       items.push(...line.split(';').map(item => item.trim()).filter(item => item.length > 0));
      //       break;
      //     }
      //     if (line.length === 0) {
      //       state = FetchState.headersEnd;

      //       const normalizedHeaders: typeof headers = {};
      //       Object.keys(headers).forEach(key => normalizedHeaders[key.toLowerCase()] = headers[key]);
      //       headers = normalizedHeaders;

      //       const contentType = headers['content-type'];
      //       if (!contentType) {
      //         throw new Error(`missing Content-Type in headers: ${JSON.stringify(headers, null, '  ')}`);
      //       }
      //       // https://www.w3.org/Protocols/rfc1341/7_2_Multipart.html
      //       if (contentType[0] !== 'multipart/mixed') {
      //         return Promise.resolve('No support for content-type: ' + contentType[0]);
      //       }
      //       boundary = contentType.find(item => item.startsWith('boundary='))!;
      //       boundary = '--' + /^["']?(.*?)["']?$/.exec(boundary.slice('boundary='.length))![1];
      //       break;
      //     }
      //     const m = /^([^:]+)\:(.*)$/.exec(line);
      //     if (m) {
      //       headers[m[1]] = m[2].split(';').map(item => item.trim()).filter(item => item.length > 0);
      //       lastHeaderName = m[1];
      //     }
      //     break;
      //   case FetchState.headersEnd:
      //     if (line === boundary) {
      //       state = FetchState.textHeaders;
      //     }
      //     break;
      //   case FetchState.textHeaders:
      //     if (line.length === 0)
      //       state = FetchState.textBody;
      //     break;
      //   case FetchState.textBody:
      //     if (line === boundary) {
      //       textBody = textBody.slice(0, textBody.length - 1);
      //       state = FetchState.attachmentHeaders;
      //       break;
      //     }
      //     textBody += line + '\n';
      //     break;
      //   case FetchState.attachmentHeaders:
      //     if (line.length === 0) {
      //       state = FetchState.attachementBody;
      //       break;
      //     }
      //     if (!fileName) {
      //       const found = /filename=["' ]?([^'" ]+)["' ]?$/.exec(line);
      //       if (found)
      //         fileName = found[1];
      //     }
      //     break;
      //   case FetchState.attachementBody:
      //     if (line.indexOf(boundary) >=0 ) {
      //       state = FetchState.end;
      //       if (fileWriter) {
      //         fileWriter.end(() => {
      //           log.info('file end done:', attachementFile);
      //           fileWritingState.getValue().delete(attachementFile);
      //           fileWritingState.next(fileWritingState.getValue());
      //         });
      //       }
      //       break;
      //     }
      //     if (!fileWriter) {
      //       attachementFile = overrideFileName || Path.resolve('dist/' + fileName);
      //       fs.mkdirpSync(Path.dirname(attachementFile));
      //       fileWriter = fs.createWriteStream(attachementFile);
      //       fileWritingState.getValue().add(attachementFile);
      //       fileWritingState.next(fileWritingState.getValue());
      //       log.info('Create attachement file: ', attachementFile);
      //     }
      //     // log.warn('boundary', boundary);
      //     // TODO: wait for drained
      //     fileWriter.write(Buffer.from(line, 'base64'));
      //   default:
      // }
      return Promise.resolve(0);
    });
    logEnabled = originLogEnabled;

    return {
      headers,
      textBody,
      fileName: fileName!
    };
  }

  async function findMail(fromIndx: number, subject: string): Promise<number | undefined> {
    log.info('findMail', fromIndx, subject);
    while (fromIndx > 0) {
      const res = await waitForFetch(fromIndx);
      if (res.headers.subject && res.headers.subject[0].indexOf(subject) >= 0)
        return fromIndx;
      fromIndx--;
    }
    return undefined;
  }
}

export class ImapManager {
  // checksum: Checksum;
  checksumState = new BehaviorSubject<Checksum | null>(null);
  fileWritingState: ImapCommandContext['fileWritingState'];
  watching = false;
  private toFetchAppsState = new BehaviorSubject<string[]>([]);
  // private  zipDownloadDir: string;
  // private imapActions = new Subject<(ctx: ImapCommandContext) => Promise<any>>();

  private ctx: ImapCommandContext;

  constructor(public env: string, public zipDownloadDir?: string) {
    if (zipDownloadDir == null)
      this.zipDownloadDir = Path.resolve(Path.dirname(currChecksumFile), 'deploy-static-' + env);
  }

  async fetchChecksum(): Promise<Checksum | undefined>  {
    let cs: Checksum | undefined;
    await connectImap(async ctx => {
      cs = await this._fetchChecksum(ctx);
    });
    log.info('fetched checksum:', cs);
    this.checksumState.next(cs!);
    return cs;
  }

  async fetchUpdateCheckSum(appName: string): Promise<Checksum> {
    let cs = await this.fetchChecksum();
    log.info('fetched checksum:', cs);
    if (cs!.versions![appName] == null) {
      cs!.versions![appName] = {
        version: 0,
        path: '<see attachement file name>'
      };
    }
    cs!.versions![appName].version++;
    this.checksumState.next(cs!);
    fs.mkdirpSync(Path.dirname(currChecksumFile));
    const checksumStr = JSON.stringify(cs!, null, '  ');
    fs.writeFileSync(currChecksumFile, checksumStr);
    log.info('write %s\n%s', currChecksumFile, checksumStr);
    return cs!;
  }

  /**
   * Done when files are written
   * @param excludeApp exclude app
   */
  async fetchOtherZips(excludeApp?: string) {
    let appNames = Object.keys(this.checksumState.getValue()!.versions!)
    .filter(app => app !== excludeApp);

    let fileWrittenProm: Promise<boolean> | undefined;

    await connectImap(async ctx => {

      fileWrittenProm = ctx.fileWritingState.pipe(
        skip(1),
        filter(writing => !writing),
        take(appNames.length)
      ).toPromise();

      for (const app of appNames) {
        log.info('fetch other zip: ' + app);
        const idx = await ctx.findMail(ctx.lastIndex, `bkjk-pre-build(${this.env}-${app})`);
        if (!idx) {
          log.info(`mail "bkjk-pre-build(${this.env}-${app})" is not Found, skip download zip`);
          continue;
        }
        await ctx.waitForFetch(idx, false, Path.resolve(this.zipDownloadDir!, app + '.zip'));
      }
    });
    if (fileWrittenProm)
      await fileWrittenProm;
    return appNames;
  }

  async startWatchMail(pollInterval = 60000) {
    this.watching = true;
    while (this.watching) {
      await this.checkMailForUpdate();
      await new Promise(resolve => setTimeout(resolve, pollInterval)); // 60 sec
    }
  }

  async checkMailForUpdate() {
    await connectImap(async ctx => {
      this.ctx = ctx;
      this.fileWritingState = ctx.fileWritingState;

      const cs = await this._fetchChecksum(ctx);
      this.checksumState.next(cs!);

      const toFetchApps = this.toFetchAppsState.getValue();
      if (toFetchApps.length > 0) {
        this.toFetchAppsState.next([]);
        for (const appName of toFetchApps) {
          await this.fetchAttachment(appName);
        }
      }
      // await ctx.waitForReply('SUBSCRIBE INBOX');
      // await new Promise(resolve => setTimeout(resolve, 30000)); // 30 sec
      delete this.ctx;
    });
  }

  fetchAppDuringWatchAction(...appNames: string[]) {
    this.toFetchAppsState.next(appNames);
  }

  async sendFileAndUpdatedChecksum(appName: string, file: string) {
    const cs = await this.fetchUpdateCheckSum(appName);
    await retrySendMail(`bkjk-pre-build(${this.env}-${appName})`, JSON.stringify(cs, null, '  '), file);
  }

  stopWatch() {
    this.watching = false;
  }

  private async fetchAttachment(app: string) {
    const idx = await this.ctx.findMail(this.ctx.lastIndex, `bkjk-pre-build(${this.env}-${app})`);
    if (idx == null)
      throw new Error('Cant find mail: ' + `bkjk-pre-build(${this.env}-${app})`);
    await this.ctx.waitForFetch(idx!, false, Path.resolve(this.zipDownloadDir!, `${app}.zip`));
  }

  private async _fetchChecksum(ctx: ImapCommandContext) {
    const idx = await ctx.findMail(ctx.lastIndex, `bkjk-pre-build(${this.env}-`);
    log.info('_fetchChecksum, index:', idx);
    if (idx == null) {
      return {versions: {}};
    }
    const jsonStr = await ctx.waitForFetchText(idx!);
    if (jsonStr == null) {
      throw new Error('Empty JSON text');
    }
    return JSON.parse(jsonStr) as Checksum;
  }

}

export async function testMail(imap: string, user: string, loginSecret: string) {
  log.debug = log.info;
  api.config.set([api.packageName, 'fetchMailServer'], {
    imap, user, loginSecret
  } as WithMailServerConfig['fetchMailServer']);
  await connectImap(async ctx => {
    // log.info('Fetch mail %d as text :\n' + (await ctx.waitForFetchText(ctx.lastIndex)), ctx.lastIndex);
    log.info('Fetch mail %d:\n' + await ctx.waitForFetch(ctx.lastIndex, false), ctx.lastIndex);
  });
}
