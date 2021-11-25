"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testMail = exports.ImapManager = exports.connectImap = exports.retrySendMail = exports.sendMail = void 0;
const tls_1 = require("tls");
const path_1 = __importDefault(require("path"));
const nodemailer_1 = require("nodemailer");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const fs_extra_1 = __importDefault(require("fs-extra"));
const plink_1 = require("@wfh/plink");
const __plink_1 = __importDefault(require("__plink"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmV0Y2gtcmVtb3RlLWltYXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmZXRjaC1yZW1vdGUtaW1hcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSw2QkFBMEU7QUFDMUUsZ0RBQXdCO0FBQ3hCLDJDQUE2QztBQUU3QywrQkFBa0Q7QUFDbEQsOENBRXdCO0FBQ3hCLHdEQUEwQjtBQUUxQixzQ0FBNEM7QUFDNUMsc0RBQThCO0FBRzlCLDREQUE2RztBQUM3RyxrRUFBa0Y7QUFFbEYsOEJBQThCO0FBQzlCLE1BQU0sR0FBRyxHQUFHLElBQUEsZ0JBQVEsRUFBQyxVQUFVLENBQUMsQ0FBQztBQUVqQyxNQUFNLE9BQU8sR0FBRyxJQUFBLGNBQU0sR0FBRSxDQUFDLHVCQUF1QixDQUFDLENBQUM7QUFDbEQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUc1RSxNQUFNLGdCQUFnQixHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxHQUFHLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQztBQUVsRyxLQUFLLFVBQVUsUUFBUSxDQUFDLE9BQWUsRUFBRSxJQUFZLEVBQUUsSUFBYTtJQUN6RSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFO1FBQzVCLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0RBQWtELENBQUMsQ0FBQztRQUM3RCxPQUFPO0tBQ1I7SUFDRCxNQUFNLEVBQ0osSUFBSSxFQUFFLEtBQUssRUFDWCxXQUFXLEVBQUUsTUFBTTtJQUNuQixjQUFjO0lBQ2QsSUFBSSxFQUFFLElBQUksRUFDWCxHQUFHLE9BQU8sQ0FB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c0NvbnRlbnQiOlsiaW1wb3J0IHsgY29ubmVjdCBhcyB0c2xDb25uZWN0LCBDb25uZWN0aW9uT3B0aW9ucywgVExTU29ja2V0IH0gZnJvbSAndGxzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgY3JlYXRlVHJhbnNwb3J0IH0gZnJvbSAnbm9kZW1haWxlcic7XG5pbXBvcnQgU01UUFRyYW5zcG9ydCBmcm9tICdub2RlbWFpbGVyL2xpYi9zbXRwLXRyYW5zcG9ydCc7XG5pbXBvcnQge09ic2VydmFibGUsIEJlaGF2aW9yU3ViamVjdCB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgbWFwLCAvKiBjb25jYXRNYXAsIHRha2VXaGlsZSwgdGFrZUxhc3QsIG1hcFRvLCovIHRhcCwgZGlzdGluY3RVbnRpbENoYW5nZWRcbiAgLy8gc2tpcCwgZmlsdGVyLCB0YWtlXG59IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge2xvZzRGaWxlLCBjb25maWd9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IF9fcGxpbmsgZnJvbSAnX19wbGluayc7XG5pbXBvcnQgeyBMb29rQWhlYWQsIFRva2VuIH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9hc3luYy1MTG4tcGFyc2VyJztcbmltcG9ydCB7Q2hlY2tzdW0sIFdpdGhNYWlsU2VydmVyQ29uZmlnfSBmcm9tICcuL2ZldGNoLXR5cGVzJztcbmltcG9ydCB7Y3JlYXRlU2VydmVyRGF0YUhhbmRsZXIsIHBhcnNlTGluZXNPZlRva2VucywgSW1hcFRva2VuVHlwZSwgU3RyaW5nTGl0fSBmcm9tICcuL21haWwvaW1hcC1tc2ctcGFyc2VyJztcbmltcG9ydCB7cGFyc2UgYXMgcGFyc2VSZmM4MjIsIFJDRjgyMlBhcnNlUmVzdWx0fSBmcm9tICcuL21haWwvcmZjODIyLXN5bmMtcGFyc2VyJztcblxuLy8gaW1wb3J0IHtTb2NrZXR9IGZyb20gJ25ldCc7XG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcblxuY29uc3Qgc2V0dGluZyA9IGNvbmZpZygpWydAd2ZoL2Fzc2V0cy1wcm9jZXNzZXInXTtcbmNvbnN0IGVudiA9IHNldHRpbmcuZmV0Y2hNYWlsU2VydmVyID8gc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIuZW52IDogJ2xvY2FsJztcblxuXG5jb25zdCBjdXJyQ2hlY2tzdW1GaWxlID0gUGF0aC5yZXNvbHZlKCdjaGVja3N1bS4nICsgKHNldHRpbmcuZmV0Y2hNYWlsU2VydmVyID8gZW52IDogJ2xvY2FsJykgKyAnLmpzb24nKTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlbmRNYWlsKHN1YmplY3Q6IHN0cmluZywgdGV4dDogc3RyaW5nLCBmaWxlPzogc3RyaW5nKSB7XG4gIGxvZy5pbmZvKCdsb2dpbicpO1xuICBpZiAoIXNldHRpbmcuZmV0Y2hNYWlsU2VydmVyKSB7XG4gICAgbG9nLmluZm8oJ2ZldGNoTWFpbFNlcnZlciBpcyBub3QgY29uZmlndXJlZCEgU2tpcCBzZW5kTWFpbCcpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCB7XG4gICAgdXNlcjogRU1BSUwsXG4gICAgbG9naW5TZWNyZXQ6IFNFQ1JFVCxcbiAgICAvLyBpbWFwOiBJTUFQLFxuICAgIHNtdHA6IFNNVFBcbiAgfSA9IHNldHRpbmcuZmV0Y2hNYWlsU2VydmVyO1xuXG4gIGNvbnN0IHRyYW5zcG9ydGVyID0gY3JlYXRlVHJhbnNwb3J0KHtcbiAgICBob3N0OiBTTVRQLFxuICAgIGF1dGg6IHtcbiAgICAgIHR5cGU6ICdsb2dpbicsXG4gICAgICB1c2VyOiBFTUFJTCxcbiAgICAgIHBhc3M6IFNFQ1JFVFxuICAgIH0sXG4gICAgc2VjdXJlOiB0cnVlXG4gIH0gYXMgU01UUFRyYW5zcG9ydC5PcHRpb25zKTtcblxuICBsb2cuaW5mbygnc2VuZCBtYWlsJyk7XG4gIGNvbnN0IGluZm8gPSBhd2FpdCB0cmFuc3BvcnRlci5zZW5kTWFpbCh7XG4gICAgZnJvbTogRU1BSUwsXG4gICAgdG86IEVNQUlMLFxuICAgIHN1YmplY3Q6IGBidWlsZCBhcnRpZmFjdDogJHtzdWJqZWN0fWAsXG4gICAgdGV4dCxcbiAgICBhdHRhY2htZW50czogZmlsZSA/IFtcbiAgICAgIHtcbiAgICAgICAgZmlsZW5hbWU6IFBhdGguYmFzZW5hbWUoZmlsZSksXG4gICAgICAgIHBhdGg6IFBhdGgucmVzb2x2ZShmaWxlKVxuICAgICAgfVxuICAgIF0gOiB1bmRlZmluZWRcbiAgfSk7XG5cbiAgbG9nLmluZm8oaW5mbyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXRyeVNlbmRNYWlsKHN1YmplY3Q6IHN0cmluZywgdGV4dDogc3RyaW5nLCBmaWxlPzogc3RyaW5nKSB7XG4gIGxldCBlcnJvcjogRXJyb3IgfCB1bmRlZmluZWQ7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHNlbmRNYWlsKHN1YmplY3QsIHRleHQsIGZpbGUpO1xuICAgICAgZXJyb3IgPSB1bmRlZmluZWQ7XG4gICAgICBicmVhaztcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGxvZy5pbmZvKCdHb3QgZXJyb3InLCBlcnIpO1xuICAgICAgZXJyb3IgPSBlcnI7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwMCkpO1xuICAgIH1cbiAgfVxuICBpZiAoZXJyb3IpIHtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEltYXBGZXRjaERhdGEge1xuICBoZWFkZXJzOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW10gfCB1bmRlZmluZWR9O1xuICB0ZXh0czogc3RyaW5nW107XG4gIGZpbGVzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbWFwQ29tbWFuZENvbnRleHQge1xuICAvKipcbiAgICogSW5kZXggb2YgbGF0ZXN0IG1haWxcbiAgICovXG4gIGxhc3RJbmRleDogbnVtYmVyO1xuICBmaWxlV3JpdGluZ1N0YXRlOiBPYnNlcnZhYmxlPGJvb2xlYW4+O1xuICB3YWl0Rm9yUmVwbHk8UiA9IGFueT4oY29tbWFuZD86IHN0cmluZyxcbiAgICBvbkxpbmU/OiAobGE6IExvb2tBaGVhZDxUb2tlbjxJbWFwVG9rZW5UeXBlPj4sIHRhZzogc3RyaW5nKSA9PiBQcm9taXNlPFI+KTogUHJvbWlzZTxSIHwgbnVsbD47XG4gIGZpbmRNYWlsKGZyb21JbmR4OiBudW1iZXIsIHN1YmplY3Q6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyIHwgdW5kZWZpbmVkPjtcbiAgd2FpdEZvckZldGNoKG1haWxJZHg6IHN0cmluZyB8IG51bWJlciwgaGVhZGVyT25seT86IGJvb2xlYW4sIG92ZXJyaWRlRmlsZU5hbWU/OiBzdHJpbmcpOiBQcm9taXNlPEltYXBGZXRjaERhdGE+O1xuICB3YWl0Rm9yRmV0Y2hUZXh0KGluZGV4OiBudW1iZXIpOiBQcm9taXNlPHN0cmluZyB8IHVuZGVmaW5lZD47XG4gIGFwcGVuZE1haWwoc3ViamVjdDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQgfCBudWxsPjtcbn1cblxuLyoqXG4gKiBJTUFQIHNwZWNpZmljYXRpb25cbiAqIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMxNzMwXG4gKiBcbiAqIElEIGNvbW1hbmRcbiAqIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMyOTcxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb25uZWN0SW1hcChjYWxsYmFjazogKGNvbnRleHQ6IEltYXBDb21tYW5kQ29udGV4dCkgPT4gUHJvbWlzZTxhbnk+KSB7XG5cbiAgbGV0IGxvZ0VuYWJsZWQgPSB0cnVlO1xuICBsZXQgY21kSWR4ID0gMTtcbiAgY29uc3QgZmlsZVdyaXRpbmdTdGF0ZSA9IG5ldyBCZWhhdmlvclN1YmplY3Q8U2V0PHN0cmluZz4+KG5ldyBTZXQ8c3RyaW5nPigpKTtcblxuICBpZiAoIXNldHRpbmcuZmV0Y2hNYWlsU2VydmVyKSB7XG4gICAgbG9nLndhcm4oJ2ZldGNoTWFpbFNlcnZlciBpcyBub3QgY29uZmlndXJlZCEgU2tpcCBzZW5kTWFpbCcpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCB7XG4gICAgICB1c2VyOiBFTUFJTCxcbiAgICAgIGxvZ2luU2VjcmV0OiBTRUNSRVQsXG4gICAgICBpbWFwOiBJTUFQXG4gICAgICAvLyBzbXRwOiBTTVRQXG4gIH0gPSBzZXR0aW5nLmZldGNoTWFpbFNlcnZlcjtcblxuICBjb25zdCBjb250ZXh0OiB7W2sgaW4ga2V5b2YgSW1hcENvbW1hbmRDb250ZXh0XT86IEltYXBDb21tYW5kQ29udGV4dFtrXX0gPSB7fTtcblxuICBjb250ZXh0LndhaXRGb3JSZXBseSA9IHdhaXRGb3JSZXBseTtcbiAgY29udGV4dC53YWl0Rm9yRmV0Y2ggPSB3YWl0Rm9yRmV0Y2g7XG4gIGNvbnRleHQud2FpdEZvckZldGNoVGV4dCA9IHdhaXRGb3JGZXRjaFRleHQ7XG4gIGNvbnRleHQuZmluZE1haWwgPSBmaW5kTWFpbDtcbiAgY29udGV4dC5maWxlV3JpdGluZ1N0YXRlID0gZmlsZVdyaXRpbmdTdGF0ZS5waXBlKFxuICAgIG1hcChmaWxlU2V0ID0+IHtcbiAgICAgIC8vIGxvZy53YXJuKCd3cml0aW5nOiAnLCBmaWxlU2V0LnZhbHVlcygpKTtcbiAgICAgIHJldHVybiBmaWxlU2V0LnNpemUgPiAwO1xuICAgIH0pLFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKClcbiAgKTtcblxuICBjb250ZXh0LmFwcGVuZE1haWwgPSAoc3ViamVjdDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBtYWlsQm9keSA9IGBEYXRlOiBNb24sIDcgRmViIDIwMjAgMjE6NTI6MjUgLTA4MDAgKFBTVClcbiAgICAgIEZyb206IENyZWRpdCB0ZWFtIGJ1aWxkIG1hY2hpbmVcbiAgICAgIFN1YmplY3Q6ICR7c3ViamVjdH1cbiAgICAgIFRvOiBBZG1pbmluc3RyYXRvclxuICAgICAgTWVzc2FnZS1JZDogPEIyNzM5Ny0wMTAwMDAwQEJsdXJkeWJsb29wLkNPTT5cbiAgICAgIE1JTUUtVmVyc2lvbjogMS4wXG4gICAgICBDb250ZW50LVR5cGU6IFRFWFQvUExBSU47IENIQVJTRVQ9VVMtQVNDSUlcbiAgICAgIFxuICAgICAgJHtjb250ZW50fVxuICAgICAgYC5yZXBsYWNlKC9eWyBdKy9tZywgJycpLnJlcGxhY2UoL1xcci9nLCAnJykucmVwbGFjZSgvXFxuL2csICdcXHJcXG4nKTtcbiAgICByZXR1cm4gd2FpdEZvclJlcGx5KGBBUFBFTkQgSU5CT1ggeyR7bWFpbEJvZHkubGVuZ3RofX1cXHJcXG5gICsgbWFpbEJvZHkpO1xuICB9O1xuXG4gIGNvbnN0IHNlcnZlclJlc0hhbmRsZXIgPSBjcmVhdGVTZXJ2ZXJEYXRhSGFuZGxlcigpO1xuICBzZXJ2ZXJSZXNIYW5kbGVyLm91dHB1dC5waXBlKFxuICAgIHRhcChtc2cgPT4ge1xuICAgICAgaWYgKG1zZyAhPSBudWxsKVxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZygnICA8LSAnICsgbXNnLm1hcCh0b2tlbiA9PiB0b2tlbi50ZXh0KS5qb2luKCcgJykpO1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG5cbiAgbGV0IHNvY2tldDogVExTU29ja2V0IHwgdW5kZWZpbmVkO1xuICB0cnkge1xuICAgIHNvY2tldCA9IGF3YWl0IG5ldyBQcm9taXNlPFJldHVyblR5cGU8dHlwZW9mIHRzbENvbm5lY3Q+PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCBzb2NrZXQgPSB0c2xDb25uZWN0KHtcbiAgICAgICAgaG9zdDogSU1BUCwgcG9ydDogOTkzLFxuICAgICAgICBlbmFibGVUcmFjZTogdHJ1ZVxuICAgICAgfSBhcyBDb25uZWN0aW9uT3B0aW9ucyk7XG5cbiAgICAgIHNvY2tldC5vbignc2VjdXJlQ29ubmVjdCcsICgpID0+IHtcbiAgICAgICAgbG9nLmluZm8oJ2Nvbm5lY3RlZCcsIHNvY2tldC5hdXRob3JpemVkID8gJ2F1dGhvcml6ZWQnIDogJ3VuYXV0aG9yaXplZCcpO1xuICAgICAgICByZXNvbHZlKHNvY2tldCk7XG4gICAgICB9KVxuICAgICAgLm9uKCdlcnJvcicsIGVyciA9PiByZWplY3QoZXJyKSlcbiAgICAgIC5vbigndGltZW91dCcsICgpID0+IHJlamVjdChuZXcgRXJyb3IoJ1RpbWVvdXQnKSkpO1xuICAgICAgc29ja2V0Lm9uKCdkYXRhJywgKGRhdGE6IEJ1ZmZlcikgPT4ge1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhkYXRhLnRvU3RyaW5nKCkpO1xuICAgICAgICBzZXJ2ZXJSZXNIYW5kbGVyLmlucHV0KGRhdGEpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoKTtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoJ0lEIChcIm5hbWVcIiBcImNvbS50ZW5jZW50LmZveG1haWxcIiBcInZlcnNpb25cIiBcIjcuMi45Ljc5XCIpJyk7XG4gICAgYXdhaXQgd2FpdEZvclJlcGx5KGBMT0dJTiAke0VNQUlMfSAke1NFQ1JFVH1gKTtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoJ1NFTEVDVCBJTkJPWCcsIGFzeW5jIGxhID0+IHtcbiAgICAgIGNvbnN0IGV4aXRzVGsgPSBhd2FpdCBsYS5sYSgzKTtcbiAgICAgIGlmIChleGl0c1RrICYmIGV4aXRzVGsudGV4dC50b1VwcGVyQ2FzZSgpID09PSAnRVhJU1RTJykge1xuICAgICAgICBjb250ZXh0Lmxhc3RJbmRleCA9IHBhcnNlSW50KChhd2FpdCBsYS5sYSgyKSkhLnRleHQsIDEwKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICAvLyBhd2FpdCB3YWl0Rm9yUmVwbHkoJ1NFQVJDSCBBTEwnKTtcblxuICAgIGF3YWl0IGNhbGxiYWNrKGNvbnRleHQgYXMgSW1hcENvbW1hbmRDb250ZXh0KTtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoJ0xPR09VVCcpO1xuICB9IGNhdGNoIChleCkge1xuICAgIGxvZy5lcnJvcihleCk7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHdhaXRGb3JSZXBseSgnTE9HT1VUJyk7XG4gICAgfSBjYXRjaCAoZXIpIHt9XG4gICAgaWYgKHNvY2tldClcbiAgICAgIHNvY2tldC5lbmQoKTtcbiAgICB0aHJvdyBleDtcbiAgfVxuXG4gIHNlcnZlclJlc0hhbmRsZXIuaW5wdXQobnVsbCk7XG4gIHNvY2tldC5lbmQoKTtcblxuICBhc3luYyBmdW5jdGlvbiB3YWl0Rm9yRmV0Y2hUZXh0KGluZGV4OiBudW1iZXIpIHtcbiAgICBsZXQgYm9keTE6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoYEZFVENIICR7aW5kZXh9IEJPRFlbMV1gLCBhc3luYyBsYSA9PiB7XG4gICAgICB3aGlsZSAoKGF3YWl0IGxhLmxhKCkpICE9IG51bGwpIHtcbiAgICAgICAgY29uc3QgdG9rZW4gPSBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgICAgIGlmICh0b2tlbi50ZXh0ID09PSAnQk9EWScgJiYgKGF3YWl0IGxhLmxhKCkpIS50ZXh0ID09PSAnWzFdJykge1xuICAgICAgICAgIGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgICAgICBib2R5MSA9ICgoYXdhaXQgbGEuYWR2YW5jZSgpKSBhcyB1bmtub3duIGFzIFN0cmluZ0xpdCkuZGF0YS50b1N0cmluZygndXRmOCcpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBsb2cud2FybihidWYpO1xuICAgIC8vIHJldHVybiAvXlxcKlxccytcXGQrXFxzK0ZFVENIXFxzK1xcKC4qP1xce1xcZCtcXH0oW15dKilcXCkkL20uZXhlYyhidWYpIVsxXTtcbiAgICByZXR1cm4gYm9keTE7XG4gIH1cblxuICBmdW5jdGlvbiB3YWl0Rm9yUmVwbHk8UiA9IGFueT4oY29tbWFuZD86IHN0cmluZywgb25MaW5lPzogKGxhOiBMb29rQWhlYWQ8VG9rZW48SW1hcFRva2VuVHlwZT4+LCB0YWc6IHN0cmluZykgPT4gUHJvbWlzZTxSPik6IFByb21pc2U8UiB8IG51bGw+IHtcbiAgICBsZXQgdGFnOiBzdHJpbmc7XG4gICAgaWYgKGNvbW1hbmQpXG4gICAgICB0YWcgPSAnYScgKyAoY21kSWR4KyspO1xuXG4gICAgbGV0IHJlc3VsdDogUiB8IG51bGwgPSBudWxsO1xuICAgIGNvbnN0IHByb20gPSBwYXJzZUxpbmVzT2ZUb2tlbnMoc2VydmVyUmVzSGFuZGxlci5vdXRwdXQsIGFzeW5jIGxhID0+IHtcbiAgICAgIGNvbnN0IHJlc1RhZyA9IGF3YWl0IGxhLmxhKCk7XG4gICAgICBpZiAoIXRhZyAmJiByZXNUYWchLnRleHQgPT09ICcqJyB8fCByZXNUYWchLnRleHQgPT09IHRhZykge1xuICAgICAgICBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgICAgIGNvbnN0IHN0YXRlID0gYXdhaXQgbGEubGEoKTtcbiAgICAgICAgbGV0IHJldHVyblRleHQgPSAnJztcbiAgICAgICAgaWYgKC9PS3xOTy8udGVzdChzdGF0ZSEudGV4dCkpIHtcbiAgICAgICAgICByZXR1cm5UZXh0ICs9IChhd2FpdCBsYS5hZHZhbmNlKCkpLnRleHQ7XG4gICAgICAgICAgd2hpbGUgKChhd2FpdCBsYS5sYSgpKSAhPSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm5UZXh0ICs9ICcgJyArIChhd2FpdCBsYS5hZHZhbmNlKCkpLnRleHQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXR1cm5UZXh0O1xuICAgICAgfSBlbHNlIGlmIChvbkxpbmUpIHtcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgb25MaW5lKGxhLCB0YWcpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKGNvbW1hbmQpIHtcbiAgICAgIGNvbnN0IGNtZCA9IHRhZyEgKyAnICcgKyBjb21tYW5kO1xuICAgICAgaWYgKHNvY2tldClcbiAgICAgICAgc29ja2V0LndyaXRlKEJ1ZmZlci5mcm9tKGAke3RhZyF9ICR7Y29tbWFuZH1cXHJcXG5gLCAndXRmOCcpKTtcbiAgICAgIGxvZy5kZWJ1ZygnPT4nLCBjbWQpO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9tLnRoZW4oKCkgPT4gcmVzdWx0KTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIHdhaXRGb3JGZXRjaChtYWlsSWR4OiBzdHJpbmcgfCBudW1iZXIgPSAnKicsIGhlYWRlck9ubHkgPSB0cnVlLCBvdmVycmlkZUZpbGVOYW1lPzogc3RyaW5nKTogUHJvbWlzZTxJbWFwRmV0Y2hEYXRhPiB7XG4gICAgY29uc3Qgb3JpZ2luTG9nRW5hYmxlZCA9IGxvZ0VuYWJsZWQ7XG4gICAgbG9nRW5hYmxlZCA9IGhlYWRlck9ubHk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgd2FpdEZvclJlcGx5KGBGRVRDSCAke21haWxJZHh9IFJGQzgyMiR7aGVhZGVyT25seSA/ICcuSEVBREVSJyA6ICcnfWAsIGFzeW5jIChsYSkgPT4ge1xuICAgICAgbGV0IG1zZzogUkNGODIyUGFyc2VSZXN1bHQgfCB1bmRlZmluZWQ7XG4gICAgICB3aGlsZSAoKGF3YWl0IGxhLmxhKCkpICE9IG51bGwpIHtcbiAgICAgICAgY29uc3QgdGsgPSBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgICAgIGlmICh0ay50eXBlICE9PSBJbWFwVG9rZW5UeXBlLnN0cmluZ0xpdCkge1xuICAgICAgICAgIC8vIGxvZy5kZWJ1Zyh0ay50ZXh0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBsb2cuZGVidWcoJ3N0cmluZyBsaXRlcmFsOlxcbicsICh0ayBhcyB1bmtub3duIGFzIFN0cmluZ0xpdCkuZGF0YS5ieXRlTGVuZ3RoKTtcbiAgICAgICAgICAvLyBjb25zdCB3cml0dGVuRmlsZSA9IGBlbWFpbC0ke25ldyBEYXRlKCkuZ2V0VGltZSgpfS50eHRgO1xuICAgICAgICAgIC8vIGZzLndyaXRlRmlsZVN5bmMod3JpdHRlbkZpbGUsICh0ayBhcyB1bmtub3duIGFzIFN0cmluZ0xpdCkuZGF0YSwgJ3V0ZjgnKTtcbiAgICAgICAgICAvLyBsb2cuZGVidWcoYHdyaXRlbiB0byAke3dyaXR0ZW5GaWxlfWApO1xuICAgICAgICAgIG1zZyA9IHBhcnNlUmZjODIyKCh0ayBhcyBTdHJpbmdMaXQpLmRhdGEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBoZWFkZXJzOiBtc2cgPyBtc2cuaGVhZGVycy5yZWR1Y2UoKHByZXYsIGN1cnIpID0+IHtcbiAgICAgICAgICBwcmV2W2N1cnIua2V5LnRvTG93ZXJDYXNlKCldID0gY3Vyci52YWx1ZTtcbiAgICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgICAgfSwge30gYXMgSW1hcEZldGNoRGF0YVsnaGVhZGVycyddKSA6IHt9LFxuICAgICAgICB0ZXh0czogbXNnID8gbXNnLnBhcnRzLmZpbHRlcihwYXJ0ID0+IHBhcnQuYm9keSAhPSBudWxsKS5tYXAocGFydCA9PiBwYXJ0LmJvZHkhLnRvU3RyaW5nKCkpIDogW10sXG4gICAgICAgIGZpbGVzOiBtc2cgPyBtc2cucGFydHMuZmlsdGVyKHBhcnQgPT4gcGFydC5maWxlICE9IG51bGwpLm1hcChwYXJ0ID0+IHBhcnQuZmlsZSEpIDogW11cbiAgICAgIH0gYXMgSW1hcEZldGNoRGF0YTtcbiAgICB9KTtcbiAgICBsb2dFbmFibGVkID0gb3JpZ2luTG9nRW5hYmxlZDtcblxuICAgIGlmIChvdmVycmlkZUZpbGVOYW1lICYmIHJlc3VsdCEuZmlsZXNbMF0pIHtcbiAgICAgIGZzLnJlbmFtZVN5bmMocmVzdWx0IS5maWxlc1swXSwgb3ZlcnJpZGVGaWxlTmFtZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdCE7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBmaW5kTWFpbChmcm9tSW5keDogbnVtYmVyLCBzdWJqZWN0OiBzdHJpbmcpOiBQcm9taXNlPG51bWJlciB8IHVuZGVmaW5lZD4ge1xuICAgIGxvZy5pbmZvKCdmaW5kTWFpbCcsIGZyb21JbmR4LCBzdWJqZWN0KTtcbiAgICB3aGlsZSAoZnJvbUluZHggPiAwKSB7XG4gICAgICBjb25zdCByZXMgPSBhd2FpdCB3YWl0Rm9yRmV0Y2goZnJvbUluZHgpO1xuICAgICAgaWYgKHJlcy5oZWFkZXJzLnN1YmplY3QpIHtcbiAgICAgICAgbG9nLmRlYnVnKHJlcy5oZWFkZXJzLnN1YmplY3QpO1xuICAgICAgfVxuICAgICAgaWYgKHJlcy5oZWFkZXJzLnN1YmplY3QgJiYgcmVzLmhlYWRlcnMuc3ViamVjdFswXS5pbmRleE9mKHN1YmplY3QpID49IDApXG4gICAgICAgIHJldHVybiBmcm9tSW5keDtcbiAgICAgIGZyb21JbmR4LS07XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEltYXBNYW5hZ2VyIHtcbiAgY2hlY2tzdW1TdGF0ZSA9IG5ldyBCZWhhdmlvclN1YmplY3Q8Q2hlY2tzdW0gfCBudWxsPihudWxsKTtcbiAgZmlsZVdyaXRpbmdTdGF0ZTogSW1hcENvbW1hbmRDb250ZXh0WydmaWxlV3JpdGluZ1N0YXRlJ107XG4gIHdhdGNoaW5nID0gZmFsc2U7XG4gIHByaXZhdGUgdG9GZXRjaEFwcHNTdGF0ZSA9IG5ldyBCZWhhdmlvclN1YmplY3Q8c3RyaW5nW10+KFtdKTtcblxuICBwcml2YXRlIGN0eD86IEltYXBDb21tYW5kQ29udGV4dDtcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgZW52OiBzdHJpbmcsIHB1YmxpYyB6aXBEb3dubG9hZERpcj86IHN0cmluZykge1xuICAgIGlmICh6aXBEb3dubG9hZERpciA9PSBudWxsKVxuICAgICAgdGhpcy56aXBEb3dubG9hZERpciA9IFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUoY3VyckNoZWNrc3VtRmlsZSksICdkZXBsb3ktc3RhdGljLScgKyBlbnYpO1xuICB9XG5cbiAgYXN5bmMgZmV0Y2hDaGVja3N1bSgpIHtcbiAgLy8gICBsZXQgY3M6IENoZWNrc3VtIHwgdW5kZWZpbmVkO1xuICAvLyAgIGF3YWl0IGNvbm5lY3RJbWFwKGFzeW5jIGN0eCA9PiB7XG4gIC8vICAgICBjcyA9IGF3YWl0IHRoaXMuX2ZldGNoQ2hlY2tzdW0oY3R4KTtcbiAgLy8gICB9KTtcbiAgLy8gICBsb2cuaW5mbygnZmV0Y2hlZCBjaGVja3N1bTonLCBjcyk7XG4gIC8vICAgdGhpcy5jaGVja3N1bVN0YXRlLm5leHQoY3MhKTtcbiAgLy8gICByZXR1cm4gY3M7XG4gIH1cblxuICBhc3luYyBmZXRjaFVwZGF0ZUNoZWNrU3VtKGFwcE5hbWU6IHN0cmluZykge1xuICAvLyAgIGxldCBjcyA9IGF3YWl0IHRoaXMuZmV0Y2hDaGVja3N1bSgpO1xuICAvLyAgIGxvZy5pbmZvKCdmZXRjaGVkIGNoZWNrc3VtOicsIGNzKTtcbiAgLy8gICBpZiAoY3MhLnZlcnNpb25zIVthcHBOYW1lXSA9PSBudWxsKSB7XG4gIC8vICAgICBjcyEudmVyc2lvbnMhW2FwcE5hbWVdID0ge1xuICAvLyAgICAgICB2ZXJzaW9uOiAwLFxuICAvLyAgICAgICBwYXRoOiAnPHNlZSBhdHRhY2hlbWVudCBmaWxlIG5hbWU+J1xuICAvLyAgICAgfTtcbiAgLy8gICB9XG4gIC8vICAgY3MhLnZlcnNpb25zIVthcHBOYW1lXS52ZXJzaW9uKys7XG4gIC8vICAgdGhpcy5jaGVja3N1bVN0YXRlLm5leHQoY3MhKTtcbiAgLy8gICBmcy5ta2RpcnBTeW5jKFBhdGguZGlybmFtZShjdXJyQ2hlY2tzdW1GaWxlKSk7XG4gIC8vICAgY29uc3QgY2hlY2tzdW1TdHIgPSBKU09OLnN0cmluZ2lmeShjcyEsIG51bGwsICcgICcpO1xuICAvLyAgIGZzLndyaXRlRmlsZVN5bmMoY3VyckNoZWNrc3VtRmlsZSwgY2hlY2tzdW1TdHIpO1xuICAvLyAgIGxvZy5pbmZvKCd3cml0ZSAlc1xcbiVzJywgY3VyckNoZWNrc3VtRmlsZSwgY2hlY2tzdW1TdHIpO1xuICAvLyAgIHJldHVybiBjcyE7XG4gIH1cblxuICAvKipcbiAgICogRG9uZSB3aGVuIGZpbGVzIGFyZSB3cml0dGVuXG4gICAqIEBwYXJhbSBleGNsdWRlQXBwIGV4Y2x1ZGUgYXBwXG4gICAqL1xuICBhc3luYyBmZXRjaE90aGVyWmlwcyhleGNsdWRlQXBwPzogc3RyaW5nKSB7XG4gIC8vICAgbGV0IGFwcE5hbWVzID0gT2JqZWN0LmtleXModGhpcy5jaGVja3N1bVN0YXRlLmdldFZhbHVlKCkhLnZlcnNpb25zISlcbiAgLy8gICAuZmlsdGVyKGFwcCA9PiBhcHAgIT09IGV4Y2x1ZGVBcHApO1xuXG4gIC8vICAgbGV0IGZpbGVXcml0dGVuUHJvbTogUHJvbWlzZTxib29sZWFuPiB8IHVuZGVmaW5lZDtcblxuICAvLyAgIGF3YWl0IGNvbm5lY3RJbWFwKGFzeW5jIGN0eCA9PiB7XG5cbiAgLy8gICAgIGZpbGVXcml0dGVuUHJvbSA9IGN0eC5maWxlV3JpdGluZ1N0YXRlLnBpcGUoXG4gIC8vICAgICAgIHNraXAoMSksXG4gIC8vICAgICAgIGZpbHRlcih3cml0aW5nID0+ICF3cml0aW5nKSxcbiAgLy8gICAgICAgdGFrZShhcHBOYW1lcy5sZW5ndGgpXG4gIC8vICAgICApLnRvUHJvbWlzZSgpO1xuXG4gIC8vICAgICBmb3IgKGNvbnN0IGFwcCBvZiBhcHBOYW1lcykge1xuICAvLyAgICAgICBsb2cuaW5mbygnZmV0Y2ggb3RoZXIgemlwOiAnICsgYXBwKTtcbiAgLy8gICAgICAgY29uc3QgaWR4ID0gYXdhaXQgY3R4LmZpbmRNYWlsKGN0eC5sYXN0SW5kZXgsIGBia2prLXByZS1idWlsZCgke3RoaXMuZW52fS0ke2FwcH0pYCk7XG4gIC8vICAgICAgIGlmICghaWR4KSB7XG4gIC8vICAgICAgICAgbG9nLmluZm8oYG1haWwgXCJia2prLXByZS1idWlsZCgke3RoaXMuZW52fS0ke2FwcH0pXCIgaXMgbm90IEZvdW5kLCBza2lwIGRvd25sb2FkIHppcGApO1xuICAvLyAgICAgICAgIGNvbnRpbnVlO1xuICAvLyAgICAgICB9XG4gIC8vICAgICAgIGF3YWl0IGN0eC53YWl0Rm9yRmV0Y2goaWR4LCBmYWxzZSwgUGF0aC5yZXNvbHZlKHRoaXMuemlwRG93bmxvYWREaXIhLCBhcHAgKyAnLnppcCcpKTtcbiAgLy8gICAgIH1cbiAgLy8gICB9KTtcbiAgLy8gICBpZiAoZmlsZVdyaXR0ZW5Qcm9tKVxuICAvLyAgICAgYXdhaXQgZmlsZVdyaXR0ZW5Qcm9tO1xuICAvLyAgIHJldHVybiBhcHBOYW1lcztcbiAgfVxuXG4gIGFzeW5jIGFwcGVuZE1haWwoc3ViamVjdDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpIHtcbiAgICBhd2FpdCBjb25uZWN0SW1hcChhc3luYyBjdHggPT4ge1xuICAgICAgYXdhaXQgY3R4LmFwcGVuZE1haWwoc3ViamVjdCwgY29udGVudCk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBhc3luYyBzdGFydFdhdGNoTWFpbChwb2xsSW50ZXJ2YWwgPSA2MDAwMCkge1xuICAvLyAgIHRoaXMud2F0Y2hpbmcgPSB0cnVlO1xuICAvLyAgIHdoaWxlICh0aGlzLndhdGNoaW5nKSB7XG4gIC8vICAgICBhd2FpdCB0aGlzLmNoZWNrTWFpbEZvclVwZGF0ZSgpO1xuICAvLyAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIHBvbGxJbnRlcnZhbCkpOyAvLyA2MCBzZWNcbiAgLy8gICB9XG4gIC8vIH1cblxuICBhc3luYyBjaGVja01haWxGb3JVcGRhdGUoKSB7XG4gICAgYXdhaXQgY29ubmVjdEltYXAoYXN5bmMgY3R4ID0+IHtcbiAgICAgIHRoaXMuY3R4ID0gY3R4O1xuICAgICAgdGhpcy5maWxlV3JpdGluZ1N0YXRlID0gY3R4LmZpbGVXcml0aW5nU3RhdGU7XG5cbiAgICAgIGNvbnN0IGNzID0gYXdhaXQgdGhpcy5fZmV0Y2hDaGVja3N1bShjdHgpO1xuICAgICAgdGhpcy5jaGVja3N1bVN0YXRlLm5leHQoY3MpO1xuXG4gICAgICBjb25zdCB0b0ZldGNoQXBwcyA9IHRoaXMudG9GZXRjaEFwcHNTdGF0ZS5nZXRWYWx1ZSgpO1xuICAgICAgaWYgKHRvRmV0Y2hBcHBzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy50b0ZldGNoQXBwc1N0YXRlLm5leHQoW10pO1xuICAgICAgICBmb3IgKGNvbnN0IGFwcE5hbWUgb2YgdG9GZXRjaEFwcHMpIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLmZldGNoQXR0YWNobWVudChhcHBOYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gYXdhaXQgY3R4LndhaXRGb3JSZXBseSgnU1VCU0NSSUJFIElOQk9YJyk7XG4gICAgICAvLyBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMzAwMDApKTsgLy8gMzAgc2VjXG4gICAgICBkZWxldGUgdGhpcy5jdHg7XG4gICAgfSk7XG4gIH1cblxuICBmZXRjaEFwcER1cmluZ1dhdGNoQWN0aW9uKC4uLmFwcE5hbWVzOiBzdHJpbmdbXSkge1xuICAgIHRoaXMudG9GZXRjaEFwcHNTdGF0ZS5uZXh0KGFwcE5hbWVzKTtcbiAgfVxuXG4gIC8vIGFzeW5jIHNlbmRGaWxlQW5kVXBkYXRlZENoZWNrc3VtKGFwcE5hbWU6IHN0cmluZywgZmlsZTogc3RyaW5nKSB7XG4gIC8vICAgY29uc3QgY3MgPSBhd2FpdCB0aGlzLmZldGNoVXBkYXRlQ2hlY2tTdW0oYXBwTmFtZSk7XG4gIC8vICAgYXdhaXQgcmV0cnlTZW5kTWFpbChgYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tJHthcHBOYW1lfSlgLCBKU09OLnN0cmluZ2lmeShjcywgbnVsbCwgJyAgJyksIGZpbGUpO1xuICAvLyB9XG5cbiAgc3RvcFdhdGNoKCkge1xuICAgIHRoaXMud2F0Y2hpbmcgPSBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZmV0Y2hBdHRhY2htZW50KGFwcDogc3RyaW5nKSB7XG4gICAgLy8gY29uc3QgaWR4ID0gYXdhaXQgdGhpcy5jdHguZmluZE1haWwodGhpcy5jdHgubGFzdEluZGV4LCBgYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tJHthcHB9KWApO1xuICAgIC8vIGlmIChpZHggPT0gbnVsbClcbiAgICAvLyAgIHRocm93IG5ldyBFcnJvcignQ2FudCBmaW5kIG1haWw6ICcgKyBgYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tJHthcHB9KWApO1xuICAgIC8vIGF3YWl0IHRoaXMuY3R4LndhaXRGb3JGZXRjaChpZHghLCBmYWxzZSwgUGF0aC5yZXNvbHZlKHRoaXMuemlwRG93bmxvYWREaXIhLCBgJHthcHB9LnppcGApKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgX2ZldGNoQ2hlY2tzdW0oY3R4OiBJbWFwQ29tbWFuZENvbnRleHQpIHtcbiAgICBjb25zdCBpZHggPSBhd2FpdCBjdHguZmluZE1haWwoY3R4Lmxhc3RJbmRleCwgYGJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LWApO1xuICAgIGxvZy5pbmZvKCdfZmV0Y2hDaGVja3N1bSwgaW5kZXg6JywgaWR4KTtcbiAgICBpZiAoaWR4ID09IG51bGwpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QganNvblN0ciA9IGF3YWl0IGN0eC53YWl0Rm9yRmV0Y2hUZXh0KGlkeCk7XG4gICAgaWYgKGpzb25TdHIgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdFbXB0eSBKU09OIHRleHQnKTtcbiAgICB9XG4gICAgcmV0dXJuIEpTT04ucGFyc2UoanNvblN0cikgYXMgQ2hlY2tzdW07XG4gIH1cblxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdGVzdE1haWwoaW1hcDogc3RyaW5nLCB1c2VyOiBzdHJpbmcsIGxvZ2luU2VjcmV0OiBzdHJpbmcpIHtcbiAgbG9nLmRlYnVnID0gbG9nLmluZm87XG4gIGlmIChpbWFwKVxuICAgIGNvbmZpZy5zZXQoW19fcGxpbmsucGFja2FnZU5hbWUsICdmZXRjaE1haWxTZXJ2ZXInXSwge1xuICAgICAgaW1hcCwgdXNlciwgbG9naW5TZWNyZXRcbiAgICB9IGFzIFdpdGhNYWlsU2VydmVyQ29uZmlnWydmZXRjaE1haWxTZXJ2ZXInXSk7XG4gIGF3YWl0IGNvbm5lY3RJbWFwKGFzeW5jIGN0eCA9PiB7XG4gICAgYXdhaXQgY3R4LndhaXRGb3JSZXBseSgnU0VBUkNIIEhFQUQgU3ViamVjdCBcImJ1aWxkIGFydGlmYWN0OiBia2prLXByZS1idWlsZFwiJyk7XG4gIH0pO1xufVxuIl19