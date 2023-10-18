"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testMail = exports.ImapManager = exports.connectImap = exports.retrySendMail = exports.sendMail = void 0;
const tslib_1 = require("tslib");
const tls_1 = require("tls");
const path_1 = tslib_1.__importDefault(require("path"));
const nodemailer_1 = require("nodemailer");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const plink_1 = require("@wfh/plink");
const __plink_1 = tslib_1.__importDefault(require("__plink"));
const imap_msg_parser_1 = require("./mail/imap-msg-parser");
const rfc822_sync_parser_1 = require("./mail/rfc822-sync-parser");
// import {Socket} from 'net';
const log = (0, plink_1.log4File)(__filename);
const setting = (0, plink_1.config)()['@wfh/assets-processer'];
const env = setting.fetchMailServer ? setting.fetchMailServer.env : 'local';
const currChecksumFile = path_1.default.resolve('checksum.' + (setting.fetchMailServer ? env : 'local') + '.json');
async function sendMail(subject, text, file) {
    log.info('login');
    if (!setting.fetchMailServer) {
        log.info('fetchMailServer is not configured! Skip sendMail');
        return;
    }
    const { user: EMAIL, loginSecret: SECRET, 
    // imap: IMAP,
    smtp: SMTP } = setting.fetchMailServer;
    const transporter = (0, nodemailer_1.createTransport)({
        host: SMTP,
        auth: {
            type: 'login',
            user: EMAIL,
            pass: SECRET
        },
        secure: true
    });
    log.info('send mail');
    const info = await transporter.sendMail({
        from: EMAIL,
        to: EMAIL,
        subject: `build artifact: ${subject}`,
        text,
        attachments: file ? [
            {
                filename: path_1.default.basename(file),
                path: path_1.default.resolve(file)
            }
        ] : undefined
    });
    log.info(info);
}
exports.sendMail = sendMail;
async function retrySendMail(subject, text, file) {
    let error;
    for (let i = 0; i < 3; i++) {
        try {
            await sendMail(subject, text, file);
            error = undefined;
            break;
        }
        catch (err) {
            log.info('Got error', err);
            error = err;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    if (error) {
        throw error;
    }
}
exports.retrySendMail = retrySendMail;
/**
 * IMAP specification
 * https://tools.ietf.org/html/rfc1730
 *
 * ID command
 * https://tools.ietf.org/html/rfc2971
 */
async function connectImap(callback) {
    let logEnabled = true;
    let cmdIdx = 1;
    const fileWritingState = new rxjs_1.BehaviorSubject(new Set());
    if (!setting.fetchMailServer) {
        log.warn('fetchMailServer is not configured! Skip sendMail');
        return;
    }
    const { user: EMAIL, loginSecret: SECRET, imap: IMAP
    // smtp: SMTP
     } = setting.fetchMailServer;
    const context = {};
    context.waitForReply = waitForReply;
    context.waitForFetch = waitForFetch;
    context.waitForFetchText = waitForFetchText;
    context.findMail = findMail;
    context.fileWritingState = fileWritingState.pipe((0, operators_1.map)(fileSet => {
        // log.warn('writing: ', fileSet.values());
        return fileSet.size > 0;
    }), (0, operators_1.distinctUntilChanged)());
    context.appendMail = (subject, content) => {
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
    const serverResHandler = (0, imap_msg_parser_1.createServerDataHandler)();
    serverResHandler.output.pipe((0, operators_1.tap)(msg => {
        if (msg != null)
            // eslint-disable-next-line no-console
            console.log('  <- ' + msg.map(token => token.text).join(' '));
    })).subscribe();
    let socket;
    try {
        socket = await new Promise((resolve, reject) => {
            const socket = (0, tls_1.connect)({
                host: IMAP, port: 993,
                enableTrace: true
            });
            socket.on('secureConnect', () => {
                log.info('connected', socket.authorized ? 'authorized' : 'unauthorized');
                resolve(socket);
            })
                .on('error', err => reject(err))
                .on('timeout', () => reject(new Error('Timeout')));
            socket.on('data', (data) => {
                // console.log(data.toString());
                serverResHandler.input(data);
            });
        });
        await waitForReply();
        await waitForReply('ID ("name" "com.tencent.foxmail" "version" "7.2.9.79")');
        await waitForReply(`LOGIN ${EMAIL} ${SECRET}`);
        await waitForReply('SELECT INBOX', async (la) => {
            const exitsTk = await la.la(3);
            if (exitsTk && exitsTk.text.toUpperCase() === 'EXISTS') {
                context.lastIndex = parseInt((await la.la(2)).text, 10);
            }
        });
        // await waitForReply('SEARCH ALL');
        await callback(context);
        await waitForReply('LOGOUT');
    }
    catch (ex) {
        log.error(ex);
        try {
            await waitForReply('LOGOUT');
        }
        catch (er) { }
        if (socket)
            socket.end();
        throw ex;
    }
    serverResHandler.input(null);
    socket.end();
    async function waitForFetchText(index) {
        let body1;
        await waitForReply(`FETCH ${index} BODY[1]`, async (la) => {
            while ((await la.la()) != null) {
                const token = await la.advance();
                if (token.text === 'BODY' && (await la.la()).text === '[1]') {
                    await la.advance();
                    body1 = (await la.advance()).data.toString('utf8');
                }
            }
        });
        // log.warn(buf);
        // return /^\*\s+\d+\s+FETCH\s+\(.*?\{\d+\}([^]*)\)$/m.exec(buf)![1];
        return body1;
    }
    function waitForReply(command, onLine) {
        let tag;
        if (command)
            tag = 'a' + (cmdIdx++);
        let result = null;
        const prom = (0, imap_msg_parser_1.parseLinesOfTokens)(serverResHandler.output, async (la) => {
            const resTag = await la.la();
            if (!tag && resTag.text === '*' || resTag.text === tag) {
                await la.advance();
                const state = await la.la();
                let returnText = '';
                if (/OK|NO/.test(state.text)) {
                    returnText += (await la.advance()).text;
                    while ((await la.la()) != null) {
                        returnText += ' ' + (await la.advance()).text;
                    }
                }
                return returnText;
            }
            else if (onLine) {
                result = await onLine(la, tag);
            }
        });
        if (command) {
            const cmd = tag + ' ' + command;
            if (socket)
                socket.write(Buffer.from(`${tag} ${command}\r\n`, 'utf8'));
            log.debug('=>', cmd);
        }
        return prom.then(() => result);
    }
    async function waitForFetch(mailIdx = '*', headerOnly = true, overrideFileName) {
        const originLogEnabled = logEnabled;
        logEnabled = headerOnly;
        const result = await waitForReply(`FETCH ${mailIdx} RFC822${headerOnly ? '.HEADER' : ''}`, async (la) => {
            let msg;
            while ((await la.la()) != null) {
                const tk = await la.advance();
                if (tk.type !== imap_msg_parser_1.ImapTokenType.stringLit) {
                    // log.debug(tk.text);
                }
                else {
                    // log.debug('string literal:\n', (tk as unknown as StringLit).data.byteLength);
                    // const writtenFile = `email-${new Date().getTime()}.txt`;
                    // fs.writeFileSync(writtenFile, (tk as unknown as StringLit).data, 'utf8');
                    // log.debug(`writen to ${writtenFile}`);
                    msg = (0, rfc822_sync_parser_1.parse)(tk.data);
                }
            }
            return {
                headers: msg ? msg.headers.reduce((prev, curr) => {
                    prev[curr.key.toLowerCase()] = curr.value;
                    return prev;
                }, {}) : {},
                texts: msg ? msg.parts.filter(part => part.body != null).map(part => part.body.toString()) : [],
                files: msg ? msg.parts.filter(part => part.file != null).map(part => part.file) : []
            };
        });
        logEnabled = originLogEnabled;
        if (overrideFileName && result.files[0]) {
            fs_extra_1.default.renameSync(result.files[0], overrideFileName);
        }
        return result;
    }
    async function findMail(fromIndx, subject) {
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
exports.connectImap = connectImap;
class ImapManager {
    constructor(env, zipDownloadDir) {
        this.env = env;
        this.zipDownloadDir = zipDownloadDir;
        this.checksumState = new rxjs_1.BehaviorSubject(null);
        this.watching = false;
        this.toFetchAppsState = new rxjs_1.BehaviorSubject([]);
        if (zipDownloadDir == null)
            this.zipDownloadDir = path_1.default.resolve(path_1.default.dirname(currChecksumFile), 'deploy-static-' + env);
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
    async fetchUpdateCheckSum(appName) {
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
    async fetchOtherZips(excludeApp) {
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
    async appendMail(subject, content) {
        await connectImap(async (ctx) => {
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
        await connectImap(async (ctx) => {
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
    fetchAppDuringWatchAction(...appNames) {
        this.toFetchAppsState.next(appNames);
    }
    // async sendFileAndUpdatedChecksum(appName: string, file: string) {
    //   const cs = await this.fetchUpdateCheckSum(appName);
    //   await retrySendMail(`bkjk-pre-build(${this.env}-${appName})`, JSON.stringify(cs, null, '  '), file);
    // }
    stopWatch() {
        this.watching = false;
    }
    async fetchAttachment(app) {
        // const idx = await this.ctx.findMail(this.ctx.lastIndex, `bkjk-pre-build(${this.env}-${app})`);
        // if (idx == null)
        //   throw new Error('Cant find mail: ' + `bkjk-pre-build(${this.env}-${app})`);
        // await this.ctx.waitForFetch(idx!, false, Path.resolve(this.zipDownloadDir!, `${app}.zip`));
    }
    async _fetchChecksum(ctx) {
        const idx = await ctx.findMail(ctx.lastIndex, `bkjk-pre-build(${this.env}-`);
        log.info('_fetchChecksum, index:', idx);
        if (idx == null) {
            return [];
        }
        const jsonStr = await ctx.waitForFetchText(idx);
        if (jsonStr == null) {
            throw new Error('Empty JSON text');
        }
        return JSON.parse(jsonStr);
    }
}
exports.ImapManager = ImapManager;
async function testMail(imap, user, loginSecret) {
    log.debug = log.info;
    if (imap)
        plink_1.config.set([__plink_1.default.packageName, 'fetchMailServer'], {
            imap, user, loginSecret
        });
    await connectImap(async (ctx) => {
        await ctx.waitForReply('SEARCH HEAD Subject "build artifact: bkjk-pre-build"');
    });
}
exports.testMail = testMail;
//# sourceMappingURL=fetch-remote-imap.js.map