import { createTransport } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import {Observable, BehaviorSubject } from 'rxjs';
import { map, /* concatMap, takeWhile, takeLast, mapTo,*/ tap, distinctUntilChanged
  // skip, filter, take
} from 'rxjs/operators';
import { connect as tslConnect, ConnectionOptions, TLSSocket } from 'tls';
import fs from 'fs-extra';
import * as _ from 'lodash';
import Path from 'path';
import {Checksum, WithMailServerConfig} from './fetch-types';
import {log4File, config} from '@wfh/plink';
import __plink from '__plink';
import {createServerDataHandler, parseLinesOfTokens, ImapTokenType, StringLit} from './mail/imap-msg-parser';
import { LookAhead, Token } from '@wfh/plink/wfh/dist/async-LLn-parser';
import {parse as parseRfc822, RCF822ParseResult} from './mail/rfc822-sync-parser';

// import {Socket} from 'net';
const log = log4File(__filename);

const setting = config()['@wfh/assets-processer'];
const env = setting.fetchMailServer ? setting.fetchMailServer.env : 'local';


const currChecksumFile = Path.resolve('checksum.' + (setting.fetchMailServer ? env : 'local') + '.json');

export async function sendMail(subject: string, text: string, file?: string) {
  log.info('login');
  if (!setting.fetchMailServer) {
    log.info('fetchMailServer is not configured! Skip sendMail');
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

export interface ImapFetchData {
  headers: {[key: string]: string[] | undefined};
  texts: string[];
  files: string[];
}

export interface ImapCommandContext {
  /**
   * Index of latest mail
   */
  lastIndex: number;
  fileWritingState: Observable<boolean>;
  waitForReply<R = any>(command?: string,
    onLine?: (la: LookAhead<Token<ImapTokenType>>, tag: string) => Promise<R>): Promise<R | null>;
  findMail(fromIndx: number, subject: string): Promise<number | undefined>;
  waitForFetch(mailIdx: string | number, headerOnly?: boolean, overrideFileName?: string): Promise<ImapFetchData>;
  waitForFetchText(index: number): Promise<string | undefined>;
  appendMail(subject: string, content: string): Promise<void | null>;
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

  context.appendMail = (subject: string, content: string) => {
    const mailBody = `Date: Mon, 7 Feb 2020 21:52:25 -0800 (PST)
      From: Credit team build machine
      Subject: ${subject}
      To: Admininstrator
      Message-Id: <B27397-0100000@Blurdybloop.COM>
      MIME-Version: 1.0
      Content-Type: TEXT/PLAIN; CHARSET=US-ASCII
      
      ${content}
      `.replace(/^[ ]+/mg, '').replace(/\r/g, '').replace(/\n/g, '\r\n');
    return waitForReply(`APPEND INBOX {${mailBody.length}}\r\n` + mailBody);
  };

  const serverResHandler = createServerDataHandler();
  serverResHandler.output.pipe(
    tap(msg => {
      if (msg != null)
        // eslint-disable-next-line no-console
        console.log('  <- ' + msg.map(token => token.text).join(' '));
    })
  ).subscribe();

  let socket: TLSSocket | undefined;
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
    // await waitForReply('SEARCH ALL');

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

  function waitForReply<R = any>(command?: string, onLine?: (la: LookAhead<Token<ImapTokenType>>, tag: string) => Promise<R>): Promise<R | null> {
    let tag: string;
    if (command)
      tag = 'a' + (cmdIdx++);

    let result: R | null = null;
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
        result = await onLine(la, tag);
      }
    });

    if (command) {
      const cmd = tag! + ' ' + command;
      if (socket)
        socket.write(Buffer.from(`${tag!} ${command}\r\n`, 'utf8'));
      log.debug('=>', cmd);
    }

    return prom.then(() => result);
  }

  async function waitForFetch(mailIdx: string | number = '*', headerOnly = true, overrideFileName?: string): Promise<ImapFetchData> {
    const originLogEnabled = logEnabled;
    logEnabled = headerOnly;
    const result = await waitForReply(`FETCH ${mailIdx} RFC822${headerOnly ? '.HEADER' : ''}`, async (la) => {
      let msg: RCF822ParseResult | undefined;
      while ((await la.la()) != null) {
        const tk = await la.advance();
        if (tk.type !== ImapTokenType.stringLit) {
          // log.debug(tk.text);
        } else {
          // log.debug('string literal:\n', (tk as unknown as StringLit).data.byteLength);
          // const writtenFile = `email-${new Date().getTime()}.txt`;
          // fs.writeFileSync(writtenFile, (tk as unknown as StringLit).data, 'utf8');
          // log.debug(`writen to ${writtenFile}`);
          msg = parseRfc822((tk as StringLit).data);
        }
      }
      return {
        headers: msg ? msg.headers.reduce((prev, curr) => {
          prev[curr.key.toLowerCase()] = curr.value;
          return prev;
        }, {} as ImapFetchData['headers']) : {},
        texts: msg ? msg.parts.filter(part => part.body != null).map(part => part.body!.toString()) : [],
        files: msg ? msg.parts.filter(part => part.file != null).map(part => part.file!) : []
      } as ImapFetchData;
    });
    logEnabled = originLogEnabled;

    if (overrideFileName && result!.files[0]) {
      fs.renameSync(result!.files[0], overrideFileName);
    }

    return result!;
  }

  async function findMail(fromIndx: number, subject: string): Promise<number | undefined> {
    log.info('findMail', fromIndx, subject);
    while (fromIndx > 0) {
      const res = await waitForFetch(fromIndx);
      if (res.headers.subject) {
        log.debug(res.headers.subject);
      }
      if (res.headers.subject && res.headers.subject[0].indexOf(subject) >= 0)
        return fromIndx;
      fromIndx--;
    }
    return undefined;
  }
}

export class ImapManager {
  checksumState = new BehaviorSubject<Checksum | null>(null);
  fileWritingState: ImapCommandContext['fileWritingState'];
  watching = false;
  private toFetchAppsState = new BehaviorSubject<string[]>([]);

  private ctx?: ImapCommandContext;

  constructor(public env: string, public zipDownloadDir?: string) {
    if (zipDownloadDir == null)
      this.zipDownloadDir = Path.resolve(Path.dirname(currChecksumFile), 'deploy-static-' + env);
  }

  async fetchChecksum() {
  //   let cs: Checksum | undefined;
  //   await connectImap(async ctx => {
  //     cs = await this._fetchChecksum(ctx);
  //   });
  //   log.info('fetched checksum:', cs);
  //   this.checksumState.next(cs!);
  //   return cs;
  }

  async fetchUpdateCheckSum(appName: string) {
  //   let cs = await this.fetchChecksum();
  //   log.info('fetched checksum:', cs);
  //   if (cs!.versions![appName] == null) {
  //     cs!.versions![appName] = {
  //       version: 0,
  //       path: '<see attachement file name>'
  //     };
  //   }
  //   cs!.versions![appName].version++;
  //   this.checksumState.next(cs!);
  //   fs.mkdirpSync(Path.dirname(currChecksumFile));
  //   const checksumStr = JSON.stringify(cs!, null, '  ');
  //   fs.writeFileSync(currChecksumFile, checksumStr);
  //   log.info('write %s\n%s', currChecksumFile, checksumStr);
  //   return cs!;
  }

  /**
   * Done when files are written
   * @param excludeApp exclude app
   */
  async fetchOtherZips(excludeApp?: string) {
  //   let appNames = Object.keys(this.checksumState.getValue()!.versions!)
  //   .filter(app => app !== excludeApp);

  //   let fileWrittenProm: Promise<boolean> | undefined;

  //   await connectImap(async ctx => {

  //     fileWrittenProm = ctx.fileWritingState.pipe(
  //       skip(1),
  //       filter(writing => !writing),
  //       take(appNames.length)
  //     ).toPromise();

  //     for (const app of appNames) {
  //       log.info('fetch other zip: ' + app);
  //       const idx = await ctx.findMail(ctx.lastIndex, `bkjk-pre-build(${this.env}-${app})`);
  //       if (!idx) {
  //         log.info(`mail "bkjk-pre-build(${this.env}-${app})" is not Found, skip download zip`);
  //         continue;
  //       }
  //       await ctx.waitForFetch(idx, false, Path.resolve(this.zipDownloadDir!, app + '.zip'));
  //     }
  //   });
  //   if (fileWrittenProm)
  //     await fileWrittenProm;
  //   return appNames;
  }

  async appendMail(subject: string, content: string) {
    await connectImap(async ctx => {
      await ctx.appendMail(subject, content);
    });
  }

  // async startWatchMail(pollInterval = 60000) {
  //   this.watching = true;
  //   while (this.watching) {
  //     await this.checkMailForUpdate();
  //     await new Promise(resolve => setTimeout(resolve, pollInterval)); // 60 sec
  //   }
  // }

  async checkMailForUpdate() {
    await connectImap(async ctx => {
      this.ctx = ctx;
      this.fileWritingState = ctx.fileWritingState;

      const cs = await this._fetchChecksum(ctx);
      this.checksumState.next(cs);

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

  // async sendFileAndUpdatedChecksum(appName: string, file: string) {
  //   const cs = await this.fetchUpdateCheckSum(appName);
  //   await retrySendMail(`bkjk-pre-build(${this.env}-${appName})`, JSON.stringify(cs, null, '  '), file);
  // }

  stopWatch() {
    this.watching = false;
  }

  private async fetchAttachment(app: string) {
    // const idx = await this.ctx.findMail(this.ctx.lastIndex, `bkjk-pre-build(${this.env}-${app})`);
    // if (idx == null)
    //   throw new Error('Cant find mail: ' + `bkjk-pre-build(${this.env}-${app})`);
    // await this.ctx.waitForFetch(idx!, false, Path.resolve(this.zipDownloadDir!, `${app}.zip`));
  }

  private async _fetchChecksum(ctx: ImapCommandContext) {
    const idx = await ctx.findMail(ctx.lastIndex, `bkjk-pre-build(${this.env}-`);
    log.info('_fetchChecksum, index:', idx);
    if (idx == null) {
      return [];
    }
    const jsonStr = await ctx.waitForFetchText(idx);
    if (jsonStr == null) {
      throw new Error('Empty JSON text');
    }
    return JSON.parse(jsonStr) as Checksum;
  }

}

export async function testMail(imap: string, user: string, loginSecret: string) {
  log.debug = log.info;
  if (imap)
    config.set([__plink.packageName, 'fetchMailServer'], {
      imap, user, loginSecret
    } as WithMailServerConfig['fetchMailServer']);
  await connectImap(async ctx => {
    await ctx.waitForReply('SEARCH HEAD Subject "build artifact: bkjk-pre-build"');
  });
}
