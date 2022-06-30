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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmV0Y2gtcmVtb3RlLWltYXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmZXRjaC1yZW1vdGUtaW1hcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsNkJBQTBFO0FBQzFFLHdEQUF3QjtBQUN4QiwyQ0FBNkM7QUFFN0MsK0JBQWtEO0FBQ2xELDhDQUV3QjtBQUN4QixnRUFBMEI7QUFFMUIsc0NBQTRDO0FBQzVDLDhEQUE4QjtBQUc5Qiw0REFBNkc7QUFDN0csa0VBQWtGO0FBRWxGLDhCQUE4QjtBQUM5QixNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFFakMsTUFBTSxPQUFPLEdBQUcsSUFBQSxjQUFNLEdBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBQ2xELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFHNUUsTUFBTSxnQkFBZ0IsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUM7QUFFbEcsS0FBSyxVQUFVLFFBQVEsQ0FBQyxPQUFlLEVBQUUsSUFBWSxFQUFFLElBQWE7SUFDekUsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRTtRQUM1QixHQUFHLENBQUMsSUFBSSxDQUFDLGtEQUFrRCxDQUFDLENBQUM7UUFDN0QsT0FBTztLQUNSO0lBQ0QsTUFBTSxFQUNKLElBQUksRUFBRSxLQUFLLEVBQ1gsV0FBVyxFQUFFLE1BQU07SUFDbkIsY0FBYztJQUNkLElBQUksRUFBRSxJQUFJLEVBQ1gsR0FBRyxPQUFPLENBQUMs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b250ZW50IjpbImltcG9ydCB7IGNvbm5lY3QgYXMgdHNsQ29ubmVjdCwgQ29ubmVjdGlvbk9wdGlvbnMsIFRMU1NvY2tldCB9IGZyb20gJ3Rscyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGNyZWF0ZVRyYW5zcG9ydCB9IGZyb20gJ25vZGVtYWlsZXInO1xuaW1wb3J0IFNNVFBUcmFuc3BvcnQgZnJvbSAnbm9kZW1haWxlci9saWIvc210cC10cmFuc3BvcnQnO1xuaW1wb3J0IHtPYnNlcnZhYmxlLCBCZWhhdmlvclN1YmplY3QgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IG1hcCwgLyogY29uY2F0TWFwLCB0YWtlV2hpbGUsIHRha2VMYXN0LCBtYXBUbywqLyB0YXAsIGRpc3RpbmN0VW50aWxDaGFuZ2VkXG4gIC8vIHNraXAsIGZpbHRlciwgdGFrZVxufSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtsb2c0RmlsZSwgY29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCBfX3BsaW5rIGZyb20gJ19fcGxpbmsnO1xuaW1wb3J0IHsgTG9va0FoZWFkLCBUb2tlbiB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvYXN5bmMtTExuLXBhcnNlcic7XG5pbXBvcnQge0NoZWNrc3VtLCBXaXRoTWFpbFNlcnZlckNvbmZpZ30gZnJvbSAnLi9mZXRjaC10eXBlcyc7XG5pbXBvcnQge2NyZWF0ZVNlcnZlckRhdGFIYW5kbGVyLCBwYXJzZUxpbmVzT2ZUb2tlbnMsIEltYXBUb2tlblR5cGUsIFN0cmluZ0xpdH0gZnJvbSAnLi9tYWlsL2ltYXAtbXNnLXBhcnNlcic7XG5pbXBvcnQge3BhcnNlIGFzIHBhcnNlUmZjODIyLCBSQ0Y4MjJQYXJzZVJlc3VsdH0gZnJvbSAnLi9tYWlsL3JmYzgyMi1zeW5jLXBhcnNlcic7XG5cbi8vIGltcG9ydCB7U29ja2V0fSBmcm9tICduZXQnO1xuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG5cbmNvbnN0IHNldHRpbmcgPSBjb25maWcoKVsnQHdmaC9hc3NldHMtcHJvY2Vzc2VyJ107XG5jb25zdCBlbnYgPSBzZXR0aW5nLmZldGNoTWFpbFNlcnZlciA/IHNldHRpbmcuZmV0Y2hNYWlsU2VydmVyLmVudiA6ICdsb2NhbCc7XG5cblxuY29uc3QgY3VyckNoZWNrc3VtRmlsZSA9IFBhdGgucmVzb2x2ZSgnY2hlY2tzdW0uJyArIChzZXR0aW5nLmZldGNoTWFpbFNlcnZlciA/IGVudiA6ICdsb2NhbCcpICsgJy5qc29uJyk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZW5kTWFpbChzdWJqZWN0OiBzdHJpbmcsIHRleHQ6IHN0cmluZywgZmlsZT86IHN0cmluZykge1xuICBsb2cuaW5mbygnbG9naW4nKTtcbiAgaWYgKCFzZXR0aW5nLmZldGNoTWFpbFNlcnZlcikge1xuICAgIGxvZy5pbmZvKCdmZXRjaE1haWxTZXJ2ZXIgaXMgbm90IGNvbmZpZ3VyZWQhIFNraXAgc2VuZE1haWwnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3Qge1xuICAgIHVzZXI6IEVNQUlMLFxuICAgIGxvZ2luU2VjcmV0OiBTRUNSRVQsXG4gICAgLy8gaW1hcDogSU1BUCxcbiAgICBzbXRwOiBTTVRQXG4gIH0gPSBzZXR0aW5nLmZldGNoTWFpbFNlcnZlcjtcblxuICBjb25zdCB0cmFuc3BvcnRlciA9IGNyZWF0ZVRyYW5zcG9ydCh7XG4gICAgaG9zdDogU01UUCxcbiAgICBhdXRoOiB7XG4gICAgICB0eXBlOiAnbG9naW4nLFxuICAgICAgdXNlcjogRU1BSUwsXG4gICAgICBwYXNzOiBTRUNSRVRcbiAgICB9LFxuICAgIHNlY3VyZTogdHJ1ZVxuICB9IGFzIFNNVFBUcmFuc3BvcnQuT3B0aW9ucyk7XG5cbiAgbG9nLmluZm8oJ3NlbmQgbWFpbCcpO1xuICBjb25zdCBpbmZvID0gYXdhaXQgdHJhbnNwb3J0ZXIuc2VuZE1haWwoe1xuICAgIGZyb206IEVNQUlMLFxuICAgIHRvOiBFTUFJTCxcbiAgICBzdWJqZWN0OiBgYnVpbGQgYXJ0aWZhY3Q6ICR7c3ViamVjdH1gLFxuICAgIHRleHQsXG4gICAgYXR0YWNobWVudHM6IGZpbGUgPyBbXG4gICAgICB7XG4gICAgICAgIGZpbGVuYW1lOiBQYXRoLmJhc2VuYW1lKGZpbGUpLFxuICAgICAgICBwYXRoOiBQYXRoLnJlc29sdmUoZmlsZSlcbiAgICAgIH1cbiAgICBdIDogdW5kZWZpbmVkXG4gIH0pO1xuXG4gIGxvZy5pbmZvKGluZm8pO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmV0cnlTZW5kTWFpbChzdWJqZWN0OiBzdHJpbmcsIHRleHQ6IHN0cmluZywgZmlsZT86IHN0cmluZykge1xuICBsZXQgZXJyb3I6IEVycm9yIHwgdW5kZWZpbmVkO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBzZW5kTWFpbChzdWJqZWN0LCB0ZXh0LCBmaWxlKTtcbiAgICAgIGVycm9yID0gdW5kZWZpbmVkO1xuICAgICAgYnJlYWs7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBsb2cuaW5mbygnR290IGVycm9yJywgZXJyKTtcbiAgICAgIGVycm9yID0gZXJyO1xuICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMDApKTtcbiAgICB9XG4gIH1cbiAgaWYgKGVycm9yKSB7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbWFwRmV0Y2hEYXRhIHtcbiAgaGVhZGVyczoge1trZXk6IHN0cmluZ106IHN0cmluZ1tdIHwgdW5kZWZpbmVkfTtcbiAgdGV4dHM6IHN0cmluZ1tdO1xuICBmaWxlczogc3RyaW5nW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW1hcENvbW1hbmRDb250ZXh0IHtcbiAgLyoqXG4gICAqIEluZGV4IG9mIGxhdGVzdCBtYWlsXG4gICAqL1xuICBsYXN0SW5kZXg6IG51bWJlcjtcbiAgZmlsZVdyaXRpbmdTdGF0ZTogT2JzZXJ2YWJsZTxib29sZWFuPjtcbiAgd2FpdEZvclJlcGx5PFIgPSBhbnk+KGNvbW1hbmQ/OiBzdHJpbmcsXG4gICAgb25MaW5lPzogKGxhOiBMb29rQWhlYWQ8VG9rZW48SW1hcFRva2VuVHlwZT4+LCB0YWc6IHN0cmluZykgPT4gUHJvbWlzZTxSPik6IFByb21pc2U8UiB8IG51bGw+O1xuICBmaW5kTWFpbChmcm9tSW5keDogbnVtYmVyLCBzdWJqZWN0OiBzdHJpbmcpOiBQcm9taXNlPG51bWJlciB8IHVuZGVmaW5lZD47XG4gIHdhaXRGb3JGZXRjaChtYWlsSWR4OiBzdHJpbmcgfCBudW1iZXIsIGhlYWRlck9ubHk/OiBib29sZWFuLCBvdmVycmlkZUZpbGVOYW1lPzogc3RyaW5nKTogUHJvbWlzZTxJbWFwRmV0Y2hEYXRhPjtcbiAgd2FpdEZvckZldGNoVGV4dChpbmRleDogbnVtYmVyKTogUHJvbWlzZTxzdHJpbmcgfCB1bmRlZmluZWQ+O1xuICBhcHBlbmRNYWlsKHN1YmplY3Q6IHN0cmluZywgY29udGVudDogc3RyaW5nKTogUHJvbWlzZTx2b2lkIHwgbnVsbD47XG59XG5cbi8qKlxuICogSU1BUCBzcGVjaWZpY2F0aW9uXG4gKiBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMTczMFxuICogXG4gKiBJRCBjb21tYW5kXG4gKiBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMjk3MVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY29ubmVjdEltYXAoY2FsbGJhY2s6IChjb250ZXh0OiBJbWFwQ29tbWFuZENvbnRleHQpID0+IFByb21pc2U8YW55Pikge1xuXG4gIGxldCBsb2dFbmFibGVkID0gdHJ1ZTtcbiAgbGV0IGNtZElkeCA9IDE7XG4gIGNvbnN0IGZpbGVXcml0aW5nU3RhdGUgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PFNldDxzdHJpbmc+PihuZXcgU2V0PHN0cmluZz4oKSk7XG5cbiAgaWYgKCFzZXR0aW5nLmZldGNoTWFpbFNlcnZlcikge1xuICAgIGxvZy53YXJuKCdmZXRjaE1haWxTZXJ2ZXIgaXMgbm90IGNvbmZpZ3VyZWQhIFNraXAgc2VuZE1haWwnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3Qge1xuICAgICAgdXNlcjogRU1BSUwsXG4gICAgICBsb2dpblNlY3JldDogU0VDUkVULFxuICAgICAgaW1hcDogSU1BUFxuICAgICAgLy8gc210cDogU01UUFxuICB9ID0gc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXI7XG5cbiAgY29uc3QgY29udGV4dDoge1trIGluIGtleW9mIEltYXBDb21tYW5kQ29udGV4dF0/OiBJbWFwQ29tbWFuZENvbnRleHRba119ID0ge307XG5cbiAgY29udGV4dC53YWl0Rm9yUmVwbHkgPSB3YWl0Rm9yUmVwbHk7XG4gIGNvbnRleHQud2FpdEZvckZldGNoID0gd2FpdEZvckZldGNoO1xuICBjb250ZXh0LndhaXRGb3JGZXRjaFRleHQgPSB3YWl0Rm9yRmV0Y2hUZXh0O1xuICBjb250ZXh0LmZpbmRNYWlsID0gZmluZE1haWw7XG4gIGNvbnRleHQuZmlsZVdyaXRpbmdTdGF0ZSA9IGZpbGVXcml0aW5nU3RhdGUucGlwZShcbiAgICBtYXAoZmlsZVNldCA9PiB7XG4gICAgICAvLyBsb2cud2Fybignd3JpdGluZzogJywgZmlsZVNldC52YWx1ZXMoKSk7XG4gICAgICByZXR1cm4gZmlsZVNldC5zaXplID4gMDtcbiAgICB9KSxcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpXG4gICk7XG5cbiAgY29udGV4dC5hcHBlbmRNYWlsID0gKHN1YmplY3Q6IHN0cmluZywgY29udGVudDogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgbWFpbEJvZHkgPSBgRGF0ZTogTW9uLCA3IEZlYiAyMDIwIDIxOjUyOjI1IC0wODAwIChQU1QpXG4gICAgICBGcm9tOiBDcmVkaXQgdGVhbSBidWlsZCBtYWNoaW5lXG4gICAgICBTdWJqZWN0OiAke3N1YmplY3R9XG4gICAgICBUbzogQWRtaW5pbnN0cmF0b3JcbiAgICAgIE1lc3NhZ2UtSWQ6IDxCMjczOTctMDEwMDAwMEBCbHVyZHlibG9vcC5DT00+XG4gICAgICBNSU1FLVZlcnNpb246IDEuMFxuICAgICAgQ29udGVudC1UeXBlOiBURVhUL1BMQUlOOyBDSEFSU0VUPVVTLUFTQ0lJXG4gICAgICBcbiAgICAgICR7Y29udGVudH1cbiAgICAgIGAucmVwbGFjZSgvXlsgXSsvbWcsICcnKS5yZXBsYWNlKC9cXHIvZywgJycpLnJlcGxhY2UoL1xcbi9nLCAnXFxyXFxuJyk7XG4gICAgcmV0dXJuIHdhaXRGb3JSZXBseShgQVBQRU5EIElOQk9YIHske21haWxCb2R5Lmxlbmd0aH19XFxyXFxuYCArIG1haWxCb2R5KTtcbiAgfTtcblxuICBjb25zdCBzZXJ2ZXJSZXNIYW5kbGVyID0gY3JlYXRlU2VydmVyRGF0YUhhbmRsZXIoKTtcbiAgc2VydmVyUmVzSGFuZGxlci5vdXRwdXQucGlwZShcbiAgICB0YXAobXNnID0+IHtcbiAgICAgIGlmIChtc2cgIT0gbnVsbClcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2coJyAgPC0gJyArIG1zZy5tYXAodG9rZW4gPT4gdG9rZW4udGV4dCkuam9pbignICcpKTtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuXG4gIGxldCBzb2NrZXQ6IFRMU1NvY2tldCB8IHVuZGVmaW5lZDtcbiAgdHJ5IHtcbiAgICBzb2NrZXQgPSBhd2FpdCBuZXcgUHJvbWlzZTxSZXR1cm5UeXBlPHR5cGVvZiB0c2xDb25uZWN0Pj4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3Qgc29ja2V0ID0gdHNsQ29ubmVjdCh7XG4gICAgICAgIGhvc3Q6IElNQVAsIHBvcnQ6IDk5MyxcbiAgICAgICAgZW5hYmxlVHJhY2U6IHRydWVcbiAgICAgIH0gYXMgQ29ubmVjdGlvbk9wdGlvbnMpO1xuXG4gICAgICBzb2NrZXQub24oJ3NlY3VyZUNvbm5lY3QnLCAoKSA9PiB7XG4gICAgICAgIGxvZy5pbmZvKCdjb25uZWN0ZWQnLCBzb2NrZXQuYXV0aG9yaXplZCA/ICdhdXRob3JpemVkJyA6ICd1bmF1dGhvcml6ZWQnKTtcbiAgICAgICAgcmVzb2x2ZShzb2NrZXQpO1xuICAgICAgfSlcbiAgICAgIC5vbignZXJyb3InLCBlcnIgPT4gcmVqZWN0KGVycikpXG4gICAgICAub24oJ3RpbWVvdXQnLCAoKSA9PiByZWplY3QobmV3IEVycm9yKCdUaW1lb3V0JykpKTtcbiAgICAgIHNvY2tldC5vbignZGF0YScsIChkYXRhOiBCdWZmZXIpID0+IHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coZGF0YS50b1N0cmluZygpKTtcbiAgICAgICAgc2VydmVyUmVzSGFuZGxlci5pbnB1dChkYXRhKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgd2FpdEZvclJlcGx5KCk7XG4gICAgYXdhaXQgd2FpdEZvclJlcGx5KCdJRCAoXCJuYW1lXCIgXCJjb20udGVuY2VudC5mb3htYWlsXCIgXCJ2ZXJzaW9uXCIgXCI3LjIuOS43OVwiKScpO1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseShgTE9HSU4gJHtFTUFJTH0gJHtTRUNSRVR9YCk7XG4gICAgYXdhaXQgd2FpdEZvclJlcGx5KCdTRUxFQ1QgSU5CT1gnLCBhc3luYyBsYSA9PiB7XG4gICAgICBjb25zdCBleGl0c1RrID0gYXdhaXQgbGEubGEoMyk7XG4gICAgICBpZiAoZXhpdHNUayAmJiBleGl0c1RrLnRleHQudG9VcHBlckNhc2UoKSA9PT0gJ0VYSVNUUycpIHtcbiAgICAgICAgY29udGV4dC5sYXN0SW5kZXggPSBwYXJzZUludCgoYXdhaXQgbGEubGEoMikpIS50ZXh0LCAxMCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgLy8gYXdhaXQgd2FpdEZvclJlcGx5KCdTRUFSQ0ggQUxMJyk7XG5cbiAgICBhd2FpdCBjYWxsYmFjayhjb250ZXh0IGFzIEltYXBDb21tYW5kQ29udGV4dCk7XG4gICAgYXdhaXQgd2FpdEZvclJlcGx5KCdMT0dPVVQnKTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICBsb2cuZXJyb3IoZXgpO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoJ0xPR09VVCcpO1xuICAgIH0gY2F0Y2ggKGVyKSB7fVxuICAgIGlmIChzb2NrZXQpXG4gICAgICBzb2NrZXQuZW5kKCk7XG4gICAgdGhyb3cgZXg7XG4gIH1cblxuICBzZXJ2ZXJSZXNIYW5kbGVyLmlucHV0KG51bGwpO1xuICBzb2NrZXQuZW5kKCk7XG5cbiAgYXN5bmMgZnVuY3Rpb24gd2FpdEZvckZldGNoVGV4dChpbmRleDogbnVtYmVyKSB7XG4gICAgbGV0IGJvZHkxOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgYXdhaXQgd2FpdEZvclJlcGx5KGBGRVRDSCAke2luZGV4fSBCT0RZWzFdYCwgYXN5bmMgbGEgPT4ge1xuICAgICAgd2hpbGUgKChhd2FpdCBsYS5sYSgpKSAhPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IHRva2VuID0gYXdhaXQgbGEuYWR2YW5jZSgpO1xuICAgICAgICBpZiAodG9rZW4udGV4dCA9PT0gJ0JPRFknICYmIChhd2FpdCBsYS5sYSgpKSEudGV4dCA9PT0gJ1sxXScpIHtcbiAgICAgICAgICBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgICAgICAgYm9keTEgPSAoKGF3YWl0IGxhLmFkdmFuY2UoKSkgYXMgdW5rbm93biBhcyBTdHJpbmdMaXQpLmRhdGEudG9TdHJpbmcoJ3V0ZjgnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gbG9nLndhcm4oYnVmKTtcbiAgICAvLyByZXR1cm4gL15cXCpcXHMrXFxkK1xccytGRVRDSFxccytcXCguKj9cXHtcXGQrXFx9KFteXSopXFwpJC9tLmV4ZWMoYnVmKSFbMV07XG4gICAgcmV0dXJuIGJvZHkxO1xuICB9XG5cbiAgZnVuY3Rpb24gd2FpdEZvclJlcGx5PFIgPSBhbnk+KGNvbW1hbmQ/OiBzdHJpbmcsIG9uTGluZT86IChsYTogTG9va0FoZWFkPFRva2VuPEltYXBUb2tlblR5cGU+PiwgdGFnOiBzdHJpbmcpID0+IFByb21pc2U8Uj4pOiBQcm9taXNlPFIgfCBudWxsPiB7XG4gICAgbGV0IHRhZzogc3RyaW5nO1xuICAgIGlmIChjb21tYW5kKVxuICAgICAgdGFnID0gJ2EnICsgKGNtZElkeCsrKTtcblxuICAgIGxldCByZXN1bHQ6IFIgfCBudWxsID0gbnVsbDtcbiAgICBjb25zdCBwcm9tID0gcGFyc2VMaW5lc09mVG9rZW5zKHNlcnZlclJlc0hhbmRsZXIub3V0cHV0LCBhc3luYyBsYSA9PiB7XG4gICAgICBjb25zdCByZXNUYWcgPSBhd2FpdCBsYS5sYSgpO1xuICAgICAgaWYgKCF0YWcgJiYgcmVzVGFnIS50ZXh0ID09PSAnKicgfHwgcmVzVGFnIS50ZXh0ID09PSB0YWcpIHtcbiAgICAgICAgYXdhaXQgbGEuYWR2YW5jZSgpO1xuICAgICAgICBjb25zdCBzdGF0ZSA9IGF3YWl0IGxhLmxhKCk7XG4gICAgICAgIGxldCByZXR1cm5UZXh0ID0gJyc7XG4gICAgICAgIGlmICgvT0t8Tk8vLnRlc3Qoc3RhdGUhLnRleHQpKSB7XG4gICAgICAgICAgcmV0dXJuVGV4dCArPSAoYXdhaXQgbGEuYWR2YW5jZSgpKS50ZXh0O1xuICAgICAgICAgIHdoaWxlICgoYXdhaXQgbGEubGEoKSkgIT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuVGV4dCArPSAnICcgKyAoYXdhaXQgbGEuYWR2YW5jZSgpKS50ZXh0O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0dXJuVGV4dDtcbiAgICAgIH0gZWxzZSBpZiAob25MaW5lKSB7XG4gICAgICAgIHJlc3VsdCA9IGF3YWl0IG9uTGluZShsYSwgdGFnKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmIChjb21tYW5kKSB7XG4gICAgICBjb25zdCBjbWQgPSB0YWchICsgJyAnICsgY29tbWFuZDtcbiAgICAgIGlmIChzb2NrZXQpXG4gICAgICAgIHNvY2tldC53cml0ZShCdWZmZXIuZnJvbShgJHt0YWchfSAke2NvbW1hbmR9XFxyXFxuYCwgJ3V0ZjgnKSk7XG4gICAgICBsb2cuZGVidWcoJz0+JywgY21kKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJvbS50aGVuKCgpID0+IHJlc3VsdCk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiB3YWl0Rm9yRmV0Y2gobWFpbElkeDogc3RyaW5nIHwgbnVtYmVyID0gJyonLCBoZWFkZXJPbmx5ID0gdHJ1ZSwgb3ZlcnJpZGVGaWxlTmFtZT86IHN0cmluZyk6IFByb21pc2U8SW1hcEZldGNoRGF0YT4ge1xuICAgIGNvbnN0IG9yaWdpbkxvZ0VuYWJsZWQgPSBsb2dFbmFibGVkO1xuICAgIGxvZ0VuYWJsZWQgPSBoZWFkZXJPbmx5O1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHdhaXRGb3JSZXBseShgRkVUQ0ggJHttYWlsSWR4fSBSRkM4MjIke2hlYWRlck9ubHkgPyAnLkhFQURFUicgOiAnJ31gLCBhc3luYyAobGEpID0+IHtcbiAgICAgIGxldCBtc2c6IFJDRjgyMlBhcnNlUmVzdWx0IHwgdW5kZWZpbmVkO1xuICAgICAgd2hpbGUgKChhd2FpdCBsYS5sYSgpKSAhPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IHRrID0gYXdhaXQgbGEuYWR2YW5jZSgpO1xuICAgICAgICBpZiAodGsudHlwZSAhPT0gSW1hcFRva2VuVHlwZS5zdHJpbmdMaXQpIHtcbiAgICAgICAgICAvLyBsb2cuZGVidWcodGsudGV4dCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gbG9nLmRlYnVnKCdzdHJpbmcgbGl0ZXJhbDpcXG4nLCAodGsgYXMgdW5rbm93biBhcyBTdHJpbmdMaXQpLmRhdGEuYnl0ZUxlbmd0aCk7XG4gICAgICAgICAgLy8gY29uc3Qgd3JpdHRlbkZpbGUgPSBgZW1haWwtJHtuZXcgRGF0ZSgpLmdldFRpbWUoKX0udHh0YDtcbiAgICAgICAgICAvLyBmcy53cml0ZUZpbGVTeW5jKHdyaXR0ZW5GaWxlLCAodGsgYXMgdW5rbm93biBhcyBTdHJpbmdMaXQpLmRhdGEsICd1dGY4Jyk7XG4gICAgICAgICAgLy8gbG9nLmRlYnVnKGB3cml0ZW4gdG8gJHt3cml0dGVuRmlsZX1gKTtcbiAgICAgICAgICBtc2cgPSBwYXJzZVJmYzgyMigodGsgYXMgU3RyaW5nTGl0KS5kYXRhKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaGVhZGVyczogbXNnID8gbXNnLmhlYWRlcnMucmVkdWNlKChwcmV2LCBjdXJyKSA9PiB7XG4gICAgICAgICAgcHJldltjdXJyLmtleS50b0xvd2VyQ2FzZSgpXSA9IGN1cnIudmFsdWU7XG4gICAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgICAgIH0sIHt9IGFzIEltYXBGZXRjaERhdGFbJ2hlYWRlcnMnXSkgOiB7fSxcbiAgICAgICAgdGV4dHM6IG1zZyA/IG1zZy5wYXJ0cy5maWx0ZXIocGFydCA9PiBwYXJ0LmJvZHkgIT0gbnVsbCkubWFwKHBhcnQgPT4gcGFydC5ib2R5IS50b1N0cmluZygpKSA6IFtdLFxuICAgICAgICBmaWxlczogbXNnID8gbXNnLnBhcnRzLmZpbHRlcihwYXJ0ID0+IHBhcnQuZmlsZSAhPSBudWxsKS5tYXAocGFydCA9PiBwYXJ0LmZpbGUhKSA6IFtdXG4gICAgICB9IGFzIEltYXBGZXRjaERhdGE7XG4gICAgfSk7XG4gICAgbG9nRW5hYmxlZCA9IG9yaWdpbkxvZ0VuYWJsZWQ7XG5cbiAgICBpZiAob3ZlcnJpZGVGaWxlTmFtZSAmJiByZXN1bHQhLmZpbGVzWzBdKSB7XG4gICAgICBmcy5yZW5hbWVTeW5jKHJlc3VsdCEuZmlsZXNbMF0sIG92ZXJyaWRlRmlsZU5hbWUpO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQhO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gZmluZE1haWwoZnJvbUluZHg6IG51bWJlciwgc3ViamVjdDogc3RyaW5nKTogUHJvbWlzZTxudW1iZXIgfCB1bmRlZmluZWQ+IHtcbiAgICBsb2cuaW5mbygnZmluZE1haWwnLCBmcm9tSW5keCwgc3ViamVjdCk7XG4gICAgd2hpbGUgKGZyb21JbmR4ID4gMCkge1xuICAgICAgY29uc3QgcmVzID0gYXdhaXQgd2FpdEZvckZldGNoKGZyb21JbmR4KTtcbiAgICAgIGlmIChyZXMuaGVhZGVycy5zdWJqZWN0KSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhyZXMuaGVhZGVycy5zdWJqZWN0KTtcbiAgICAgIH1cbiAgICAgIGlmIChyZXMuaGVhZGVycy5zdWJqZWN0ICYmIHJlcy5oZWFkZXJzLnN1YmplY3RbMF0uaW5kZXhPZihzdWJqZWN0KSA+PSAwKVxuICAgICAgICByZXR1cm4gZnJvbUluZHg7XG4gICAgICBmcm9tSW5keC0tO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBJbWFwTWFuYWdlciB7XG4gIGNoZWNrc3VtU3RhdGUgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PENoZWNrc3VtIHwgbnVsbD4obnVsbCk7XG4gIGZpbGVXcml0aW5nU3RhdGU6IEltYXBDb21tYW5kQ29udGV4dFsnZmlsZVdyaXRpbmdTdGF0ZSddO1xuICB3YXRjaGluZyA9IGZhbHNlO1xuICBwcml2YXRlIHRvRmV0Y2hBcHBzU3RhdGUgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PHN0cmluZ1tdPihbXSk7XG5cbiAgcHJpdmF0ZSBjdHg/OiBJbWFwQ29tbWFuZENvbnRleHQ7XG5cbiAgY29uc3RydWN0b3IocHVibGljIGVudjogc3RyaW5nLCBwdWJsaWMgemlwRG93bmxvYWREaXI/OiBzdHJpbmcpIHtcbiAgICBpZiAoemlwRG93bmxvYWREaXIgPT0gbnVsbClcbiAgICAgIHRoaXMuemlwRG93bmxvYWREaXIgPSBQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGN1cnJDaGVja3N1bUZpbGUpLCAnZGVwbG95LXN0YXRpYy0nICsgZW52KTtcbiAgfVxuXG4gIGFzeW5jIGZldGNoQ2hlY2tzdW0oKSB7XG4gIC8vICAgbGV0IGNzOiBDaGVja3N1bSB8IHVuZGVmaW5lZDtcbiAgLy8gICBhd2FpdCBjb25uZWN0SW1hcChhc3luYyBjdHggPT4ge1xuICAvLyAgICAgY3MgPSBhd2FpdCB0aGlzLl9mZXRjaENoZWNrc3VtKGN0eCk7XG4gIC8vICAgfSk7XG4gIC8vICAgbG9nLmluZm8oJ2ZldGNoZWQgY2hlY2tzdW06JywgY3MpO1xuICAvLyAgIHRoaXMuY2hlY2tzdW1TdGF0ZS5uZXh0KGNzISk7XG4gIC8vICAgcmV0dXJuIGNzO1xuICB9XG5cbiAgYXN5bmMgZmV0Y2hVcGRhdGVDaGVja1N1bShhcHBOYW1lOiBzdHJpbmcpIHtcbiAgLy8gICBsZXQgY3MgPSBhd2FpdCB0aGlzLmZldGNoQ2hlY2tzdW0oKTtcbiAgLy8gICBsb2cuaW5mbygnZmV0Y2hlZCBjaGVja3N1bTonLCBjcyk7XG4gIC8vICAgaWYgKGNzIS52ZXJzaW9ucyFbYXBwTmFtZV0gPT0gbnVsbCkge1xuICAvLyAgICAgY3MhLnZlcnNpb25zIVthcHBOYW1lXSA9IHtcbiAgLy8gICAgICAgdmVyc2lvbjogMCxcbiAgLy8gICAgICAgcGF0aDogJzxzZWUgYXR0YWNoZW1lbnQgZmlsZSBuYW1lPidcbiAgLy8gICAgIH07XG4gIC8vICAgfVxuICAvLyAgIGNzIS52ZXJzaW9ucyFbYXBwTmFtZV0udmVyc2lvbisrO1xuICAvLyAgIHRoaXMuY2hlY2tzdW1TdGF0ZS5uZXh0KGNzISk7XG4gIC8vICAgZnMubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUoY3VyckNoZWNrc3VtRmlsZSkpO1xuICAvLyAgIGNvbnN0IGNoZWNrc3VtU3RyID0gSlNPTi5zdHJpbmdpZnkoY3MhLCBudWxsLCAnICAnKTtcbiAgLy8gICBmcy53cml0ZUZpbGVTeW5jKGN1cnJDaGVja3N1bUZpbGUsIGNoZWNrc3VtU3RyKTtcbiAgLy8gICBsb2cuaW5mbygnd3JpdGUgJXNcXG4lcycsIGN1cnJDaGVja3N1bUZpbGUsIGNoZWNrc3VtU3RyKTtcbiAgLy8gICByZXR1cm4gY3MhO1xuICB9XG5cbiAgLyoqXG4gICAqIERvbmUgd2hlbiBmaWxlcyBhcmUgd3JpdHRlblxuICAgKiBAcGFyYW0gZXhjbHVkZUFwcCBleGNsdWRlIGFwcFxuICAgKi9cbiAgYXN5bmMgZmV0Y2hPdGhlclppcHMoZXhjbHVkZUFwcD86IHN0cmluZykge1xuICAvLyAgIGxldCBhcHBOYW1lcyA9IE9iamVjdC5rZXlzKHRoaXMuY2hlY2tzdW1TdGF0ZS5nZXRWYWx1ZSgpIS52ZXJzaW9ucyEpXG4gIC8vICAgLmZpbHRlcihhcHAgPT4gYXBwICE9PSBleGNsdWRlQXBwKTtcblxuICAvLyAgIGxldCBmaWxlV3JpdHRlblByb206IFByb21pc2U8Ym9vbGVhbj4gfCB1bmRlZmluZWQ7XG5cbiAgLy8gICBhd2FpdCBjb25uZWN0SW1hcChhc3luYyBjdHggPT4ge1xuXG4gIC8vICAgICBmaWxlV3JpdHRlblByb20gPSBjdHguZmlsZVdyaXRpbmdTdGF0ZS5waXBlKFxuICAvLyAgICAgICBza2lwKDEpLFxuICAvLyAgICAgICBmaWx0ZXIod3JpdGluZyA9PiAhd3JpdGluZyksXG4gIC8vICAgICAgIHRha2UoYXBwTmFtZXMubGVuZ3RoKVxuICAvLyAgICAgKS50b1Byb21pc2UoKTtcblxuICAvLyAgICAgZm9yIChjb25zdCBhcHAgb2YgYXBwTmFtZXMpIHtcbiAgLy8gICAgICAgbG9nLmluZm8oJ2ZldGNoIG90aGVyIHppcDogJyArIGFwcCk7XG4gIC8vICAgICAgIGNvbnN0IGlkeCA9IGF3YWl0IGN0eC5maW5kTWFpbChjdHgubGFzdEluZGV4LCBgYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tJHthcHB9KWApO1xuICAvLyAgICAgICBpZiAoIWlkeCkge1xuICAvLyAgICAgICAgIGxvZy5pbmZvKGBtYWlsIFwiYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tJHthcHB9KVwiIGlzIG5vdCBGb3VuZCwgc2tpcCBkb3dubG9hZCB6aXBgKTtcbiAgLy8gICAgICAgICBjb250aW51ZTtcbiAgLy8gICAgICAgfVxuICAvLyAgICAgICBhd2FpdCBjdHgud2FpdEZvckZldGNoKGlkeCwgZmFsc2UsIFBhdGgucmVzb2x2ZSh0aGlzLnppcERvd25sb2FkRGlyISwgYXBwICsgJy56aXAnKSk7XG4gIC8vICAgICB9XG4gIC8vICAgfSk7XG4gIC8vICAgaWYgKGZpbGVXcml0dGVuUHJvbSlcbiAgLy8gICAgIGF3YWl0IGZpbGVXcml0dGVuUHJvbTtcbiAgLy8gICByZXR1cm4gYXBwTmFtZXM7XG4gIH1cblxuICBhc3luYyBhcHBlbmRNYWlsKHN1YmplY3Q6IHN0cmluZywgY29udGVudDogc3RyaW5nKSB7XG4gICAgYXdhaXQgY29ubmVjdEltYXAoYXN5bmMgY3R4ID0+IHtcbiAgICAgIGF3YWl0IGN0eC5hcHBlbmRNYWlsKHN1YmplY3QsIGNvbnRlbnQpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gYXN5bmMgc3RhcnRXYXRjaE1haWwocG9sbEludGVydmFsID0gNjAwMDApIHtcbiAgLy8gICB0aGlzLndhdGNoaW5nID0gdHJ1ZTtcbiAgLy8gICB3aGlsZSAodGhpcy53YXRjaGluZykge1xuICAvLyAgICAgYXdhaXQgdGhpcy5jaGVja01haWxGb3JVcGRhdGUoKTtcbiAgLy8gICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBwb2xsSW50ZXJ2YWwpKTsgLy8gNjAgc2VjXG4gIC8vICAgfVxuICAvLyB9XG5cbiAgYXN5bmMgY2hlY2tNYWlsRm9yVXBkYXRlKCkge1xuICAgIGF3YWl0IGNvbm5lY3RJbWFwKGFzeW5jIGN0eCA9PiB7XG4gICAgICB0aGlzLmN0eCA9IGN0eDtcbiAgICAgIHRoaXMuZmlsZVdyaXRpbmdTdGF0ZSA9IGN0eC5maWxlV3JpdGluZ1N0YXRlO1xuXG4gICAgICBjb25zdCBjcyA9IGF3YWl0IHRoaXMuX2ZldGNoQ2hlY2tzdW0oY3R4KTtcbiAgICAgIHRoaXMuY2hlY2tzdW1TdGF0ZS5uZXh0KGNzKTtcblxuICAgICAgY29uc3QgdG9GZXRjaEFwcHMgPSB0aGlzLnRvRmV0Y2hBcHBzU3RhdGUuZ2V0VmFsdWUoKTtcbiAgICAgIGlmICh0b0ZldGNoQXBwcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHRoaXMudG9GZXRjaEFwcHNTdGF0ZS5uZXh0KFtdKTtcbiAgICAgICAgZm9yIChjb25zdCBhcHBOYW1lIG9mIHRvRmV0Y2hBcHBzKSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5mZXRjaEF0dGFjaG1lbnQoYXBwTmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIGF3YWl0IGN0eC53YWl0Rm9yUmVwbHkoJ1NVQlNDUklCRSBJTkJPWCcpO1xuICAgICAgLy8gYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDMwMDAwKSk7IC8vIDMwIHNlY1xuICAgICAgZGVsZXRlIHRoaXMuY3R4O1xuICAgIH0pO1xuICB9XG5cbiAgZmV0Y2hBcHBEdXJpbmdXYXRjaEFjdGlvbiguLi5hcHBOYW1lczogc3RyaW5nW10pIHtcbiAgICB0aGlzLnRvRmV0Y2hBcHBzU3RhdGUubmV4dChhcHBOYW1lcyk7XG4gIH1cblxuICAvLyBhc3luYyBzZW5kRmlsZUFuZFVwZGF0ZWRDaGVja3N1bShhcHBOYW1lOiBzdHJpbmcsIGZpbGU6IHN0cmluZykge1xuICAvLyAgIGNvbnN0IGNzID0gYXdhaXQgdGhpcy5mZXRjaFVwZGF0ZUNoZWNrU3VtKGFwcE5hbWUpO1xuICAvLyAgIGF3YWl0IHJldHJ5U2VuZE1haWwoYGJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LSR7YXBwTmFtZX0pYCwgSlNPTi5zdHJpbmdpZnkoY3MsIG51bGwsICcgICcpLCBmaWxlKTtcbiAgLy8gfVxuXG4gIHN0b3BXYXRjaCgpIHtcbiAgICB0aGlzLndhdGNoaW5nID0gZmFsc2U7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGZldGNoQXR0YWNobWVudChhcHA6IHN0cmluZykge1xuICAgIC8vIGNvbnN0IGlkeCA9IGF3YWl0IHRoaXMuY3R4LmZpbmRNYWlsKHRoaXMuY3R4Lmxhc3RJbmRleCwgYGJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LSR7YXBwfSlgKTtcbiAgICAvLyBpZiAoaWR4ID09IG51bGwpXG4gICAgLy8gICB0aHJvdyBuZXcgRXJyb3IoJ0NhbnQgZmluZCBtYWlsOiAnICsgYGJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LSR7YXBwfSlgKTtcbiAgICAvLyBhd2FpdCB0aGlzLmN0eC53YWl0Rm9yRmV0Y2goaWR4ISwgZmFsc2UsIFBhdGgucmVzb2x2ZSh0aGlzLnppcERvd25sb2FkRGlyISwgYCR7YXBwfS56aXBgKSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIF9mZXRjaENoZWNrc3VtKGN0eDogSW1hcENvbW1hbmRDb250ZXh0KSB7XG4gICAgY29uc3QgaWR4ID0gYXdhaXQgY3R4LmZpbmRNYWlsKGN0eC5sYXN0SW5kZXgsIGBia2prLXByZS1idWlsZCgke3RoaXMuZW52fS1gKTtcbiAgICBsb2cuaW5mbygnX2ZldGNoQ2hlY2tzdW0sIGluZGV4OicsIGlkeCk7XG4gICAgaWYgKGlkeCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGNvbnN0IGpzb25TdHIgPSBhd2FpdCBjdHgud2FpdEZvckZldGNoVGV4dChpZHgpO1xuICAgIGlmIChqc29uU3RyID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRW1wdHkgSlNPTiB0ZXh0Jyk7XG4gICAgfVxuICAgIHJldHVybiBKU09OLnBhcnNlKGpzb25TdHIpIGFzIENoZWNrc3VtO1xuICB9XG5cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRlc3RNYWlsKGltYXA6IHN0cmluZywgdXNlcjogc3RyaW5nLCBsb2dpblNlY3JldDogc3RyaW5nKSB7XG4gIGxvZy5kZWJ1ZyA9IGxvZy5pbmZvO1xuICBpZiAoaW1hcClcbiAgICBjb25maWcuc2V0KFtfX3BsaW5rLnBhY2thZ2VOYW1lLCAnZmV0Y2hNYWlsU2VydmVyJ10sIHtcbiAgICAgIGltYXAsIHVzZXIsIGxvZ2luU2VjcmV0XG4gICAgfSBhcyBXaXRoTWFpbFNlcnZlckNvbmZpZ1snZmV0Y2hNYWlsU2VydmVyJ10pO1xuICBhd2FpdCBjb25uZWN0SW1hcChhc3luYyBjdHggPT4ge1xuICAgIGF3YWl0IGN0eC53YWl0Rm9yUmVwbHkoJ1NFQVJDSCBIRUFEIFN1YmplY3QgXCJidWlsZCBhcnRpZmFjdDogYmtqay1wcmUtYnVpbGRcIicpO1xuICB9KTtcbn1cbiJdfQ==