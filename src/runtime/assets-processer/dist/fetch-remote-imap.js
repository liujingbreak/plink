"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testMail = exports.ImapManager = exports.connectImap = exports.retrySendMail = exports.sendMail = void 0;
const nodemailer_1 = require("nodemailer");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const tls_1 = require("tls");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const plink_1 = require("@wfh/plink");
const __plink_1 = __importDefault(require("__plink"));
const imap_msg_parser_1 = require("./mail/imap-msg-parser");
const rfc822_sync_parser_1 = require("./mail/rfc822-sync-parser");
// import {Socket} from 'net';
const log = (0, plink_1.log4File)(__filename);
const setting = (0, plink_1.config)()['@wfh/assets-processer'];
const env = setting.fetchMailServer ? setting.fetchMailServer.env : 'local';
const currChecksumFile = path_1.default.resolve('checksum.' + (setting.fetchMailServer ? env : 'local') + '.json');
function sendMail(subject, text, file) {
    return __awaiter(this, void 0, void 0, function* () {
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
        const info = yield transporter.sendMail({
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
    });
}
exports.sendMail = sendMail;
function retrySendMail(subject, text, file) {
    return __awaiter(this, void 0, void 0, function* () {
        let error;
        for (let i = 0; i < 3; i++) {
            try {
                yield sendMail(subject, text, file);
                error = undefined;
                break;
            }
            catch (err) {
                log.info('Got error', err);
                error = err;
                yield new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        if (error) {
            throw error;
        }
    });
}
exports.retrySendMail = retrySendMail;
/**
 * IMAP specification
 * https://tools.ietf.org/html/rfc1730
 *
 * ID command
 * https://tools.ietf.org/html/rfc2971
 */
function connectImap(callback) {
    return __awaiter(this, void 0, void 0, function* () {
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
            socket = yield new Promise((resolve, reject) => {
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
            yield waitForReply();
            yield waitForReply('ID ("name" "com.tencent.foxmail" "version" "7.2.9.79")');
            yield waitForReply(`LOGIN ${EMAIL} ${SECRET}`);
            yield waitForReply('SELECT INBOX', (la) => __awaiter(this, void 0, void 0, function* () {
                const exitsTk = yield la.la(3);
                if (exitsTk && exitsTk.text.toUpperCase() === 'EXISTS') {
                    context.lastIndex = parseInt((yield la.la(2)).text, 10);
                }
            }));
            // await waitForReply('SEARCH ALL');
            yield callback(context);
            yield waitForReply('LOGOUT');
        }
        catch (ex) {
            log.error(ex);
            try {
                yield waitForReply('LOGOUT');
            }
            catch (er) { }
            if (socket)
                socket.end();
            throw ex;
        }
        serverResHandler.input(null);
        socket.end();
        function waitForFetchText(index) {
            return __awaiter(this, void 0, void 0, function* () {
                let body1;
                yield waitForReply(`FETCH ${index} BODY[1]`, (la) => __awaiter(this, void 0, void 0, function* () {
                    while ((yield la.la()) != null) {
                        const token = yield la.advance();
                        if (token.text === 'BODY' && (yield la.la()).text === '[1]') {
                            yield la.advance();
                            body1 = (yield la.advance()).data.toString('utf8');
                        }
                    }
                }));
                // log.warn(buf);
                // return /^\*\s+\d+\s+FETCH\s+\(.*?\{\d+\}([^]*)\)$/m.exec(buf)![1];
                return body1;
            });
        }
        function waitForReply(command, onLine) {
            let tag;
            if (command)
                tag = 'a' + (cmdIdx++);
            let result = null;
            const prom = (0, imap_msg_parser_1.parseLinesOfTokens)(serverResHandler.output, (la) => __awaiter(this, void 0, void 0, function* () {
                const resTag = yield la.la();
                if (!tag && resTag.text === '*' || resTag.text === tag) {
                    yield la.advance();
                    const state = yield la.la();
                    let returnText = '';
                    if (/OK|NO/.test(state.text)) {
                        returnText += (yield la.advance()).text;
                        while ((yield la.la()) != null) {
                            returnText += ' ' + (yield la.advance()).text;
                        }
                    }
                    return returnText;
                }
                else if (onLine) {
                    result = yield onLine(la, tag);
                }
            }));
            if (command) {
                const cmd = tag + ' ' + command;
                if (socket)
                    socket.write(Buffer.from(`${tag} ${command}\r\n`, 'utf8'));
                log.debug('=>', cmd);
            }
            return prom.then(() => result);
        }
        function waitForFetch(mailIdx = '*', headerOnly = true, overrideFileName) {
            return __awaiter(this, void 0, void 0, function* () {
                const originLogEnabled = logEnabled;
                logEnabled = headerOnly;
                const result = yield waitForReply(`FETCH ${mailIdx} RFC822${headerOnly ? '.HEADER' : ''}`, (la) => __awaiter(this, void 0, void 0, function* () {
                    let msg;
                    while ((yield la.la()) != null) {
                        const tk = yield la.advance();
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
                }));
                logEnabled = originLogEnabled;
                if (overrideFileName && result.files[0]) {
                    fs_extra_1.default.renameSync(result.files[0], overrideFileName);
                }
                return result;
            });
        }
        function findMail(fromIndx, subject) {
            return __awaiter(this, void 0, void 0, function* () {
                log.info('findMail', fromIndx, subject);
                while (fromIndx > 0) {
                    const res = yield waitForFetch(fromIndx);
                    if (res.headers.subject) {
                        log.debug(res.headers.subject);
                    }
                    if (res.headers.subject && res.headers.subject[0].indexOf(subject) >= 0)
                        return fromIndx;
                    fromIndx--;
                }
                return undefined;
            });
        }
    });
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
    fetchChecksum() {
        return __awaiter(this, void 0, void 0, function* () {
            //   let cs: Checksum | undefined;
            //   await connectImap(async ctx => {
            //     cs = await this._fetchChecksum(ctx);
            //   });
            //   log.info('fetched checksum:', cs);
            //   this.checksumState.next(cs!);
            //   return cs;
        });
    }
    fetchUpdateCheckSum(appName) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    /**
     * Done when files are written
     * @param excludeApp exclude app
     */
    fetchOtherZips(excludeApp) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    appendMail(subject, content) {
        return __awaiter(this, void 0, void 0, function* () {
            yield connectImap((ctx) => __awaiter(this, void 0, void 0, function* () {
                yield ctx.appendMail(subject, content);
            }));
        });
    }
    // async startWatchMail(pollInterval = 60000) {
    //   this.watching = true;
    //   while (this.watching) {
    //     await this.checkMailForUpdate();
    //     await new Promise(resolve => setTimeout(resolve, pollInterval)); // 60 sec
    //   }
    // }
    checkMailForUpdate() {
        return __awaiter(this, void 0, void 0, function* () {
            yield connectImap((ctx) => __awaiter(this, void 0, void 0, function* () {
                this.ctx = ctx;
                this.fileWritingState = ctx.fileWritingState;
                const cs = yield this._fetchChecksum(ctx);
                this.checksumState.next(cs);
                const toFetchApps = this.toFetchAppsState.getValue();
                if (toFetchApps.length > 0) {
                    this.toFetchAppsState.next([]);
                    for (const appName of toFetchApps) {
                        yield this.fetchAttachment(appName);
                    }
                }
                // await ctx.waitForReply('SUBSCRIBE INBOX');
                // await new Promise(resolve => setTimeout(resolve, 30000)); // 30 sec
                delete this.ctx;
            }));
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
    fetchAttachment(app) {
        return __awaiter(this, void 0, void 0, function* () {
            // const idx = await this.ctx.findMail(this.ctx.lastIndex, `bkjk-pre-build(${this.env}-${app})`);
            // if (idx == null)
            //   throw new Error('Cant find mail: ' + `bkjk-pre-build(${this.env}-${app})`);
            // await this.ctx.waitForFetch(idx!, false, Path.resolve(this.zipDownloadDir!, `${app}.zip`));
        });
    }
    _fetchChecksum(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const idx = yield ctx.findMail(ctx.lastIndex, `bkjk-pre-build(${this.env}-`);
            log.info('_fetchChecksum, index:', idx);
            if (idx == null) {
                return [];
            }
            const jsonStr = yield ctx.waitForFetchText(idx);
            if (jsonStr == null) {
                throw new Error('Empty JSON text');
            }
            return JSON.parse(jsonStr);
        });
    }
}
exports.ImapManager = ImapManager;
function testMail(imap, user, loginSecret) {
    return __awaiter(this, void 0, void 0, function* () {
        log.debug = log.info;
        if (imap)
            plink_1.config.set([__plink_1.default.packageName, 'fetchMailServer'], {
                imap, user, loginSecret
            });
        yield connectImap((ctx) => __awaiter(this, void 0, void 0, function* () {
            yield ctx.waitForReply('SEARCH HEAD Subject "build artifact: bkjk-pre-build"');
        }));
    });
}
exports.testMail = testMail;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmV0Y2gtcmVtb3RlLWltYXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmZXRjaC1yZW1vdGUtaW1hcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkM7QUFFN0MsK0JBQWtEO0FBQ2xELDhDQUV3QjtBQUN4Qiw2QkFBMEU7QUFDMUUsd0RBQTBCO0FBRTFCLGdEQUF3QjtBQUV4QixzQ0FBNEM7QUFDNUMsc0RBQThCO0FBQzlCLDREQUE2RztBQUU3RyxrRUFBa0Y7QUFFbEYsOEJBQThCO0FBQzlCLE1BQU0sR0FBRyxHQUFHLElBQUEsZ0JBQVEsRUFBQyxVQUFVLENBQUMsQ0FBQztBQUVqQyxNQUFNLE9BQU8sR0FBRyxJQUFBLGNBQU0sR0FBRSxDQUFDLHVCQUF1QixDQUFDLENBQUM7QUFDbEQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUc1RSxNQUFNLGdCQUFnQixHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxHQUFHLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQztBQUV6RyxTQUFzQixRQUFRLENBQUMsT0FBZSxFQUFFLElBQVksRUFBRSxJQUFhOztRQUN6RSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFO1lBQzVCLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0RBQWtELENBQUMsQ0FBQztZQUM3RCxPQUFPO1NBQ1I7UUFDRCxNQUFNLEVBQ0osSUFBSSxFQUFFLEtBQUssRUFDWCxXQUFXLEVBQUUsTUFBTTtRQUNuQixjQUFjO1FBQ2QsSUFBSSxFQUFFLElBQUksRUFDWCxHQUFHLE9B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QUFDLENBQUM7UUFDakYsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FBQTtBQVRELDRCQVNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3JlYXRlVHJhbnNwb3J0IH0gZnJvbSAnbm9kZW1haWxlcic7XG5pbXBvcnQgU01UUFRyYW5zcG9ydCBmcm9tICdub2RlbWFpbGVyL2xpYi9zbXRwLXRyYW5zcG9ydCc7XG5pbXBvcnQge09ic2VydmFibGUsIEJlaGF2aW9yU3ViamVjdCB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgbWFwLCAvKiBjb25jYXRNYXAsIHRha2VXaGlsZSwgdGFrZUxhc3QsIG1hcFRvLCovIHRhcCwgZGlzdGluY3RVbnRpbENoYW5nZWRcbiAgLy8gc2tpcCwgZmlsdGVyLCB0YWtlXG59IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGNvbm5lY3QgYXMgdHNsQ29ubmVjdCwgQ29ubmVjdGlvbk9wdGlvbnMsIFRMU1NvY2tldCB9IGZyb20gJ3Rscyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge0NoZWNrc3VtLCBXaXRoTWFpbFNlcnZlckNvbmZpZ30gZnJvbSAnLi9mZXRjaC10eXBlcyc7XG5pbXBvcnQge2xvZzRGaWxlLCBjb25maWd9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IF9fcGxpbmsgZnJvbSAnX19wbGluayc7XG5pbXBvcnQge2NyZWF0ZVNlcnZlckRhdGFIYW5kbGVyLCBwYXJzZUxpbmVzT2ZUb2tlbnMsIEltYXBUb2tlblR5cGUsIFN0cmluZ0xpdH0gZnJvbSAnLi9tYWlsL2ltYXAtbXNnLXBhcnNlcic7XG5pbXBvcnQgeyBMb29rQWhlYWQsIFRva2VuIH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9hc3luYy1MTG4tcGFyc2VyJztcbmltcG9ydCB7cGFyc2UgYXMgcGFyc2VSZmM4MjIsIFJDRjgyMlBhcnNlUmVzdWx0fSBmcm9tICcuL21haWwvcmZjODIyLXN5bmMtcGFyc2VyJztcblxuLy8gaW1wb3J0IHtTb2NrZXR9IGZyb20gJ25ldCc7XG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcblxuY29uc3Qgc2V0dGluZyA9IGNvbmZpZygpWydAd2ZoL2Fzc2V0cy1wcm9jZXNzZXInXTtcbmNvbnN0IGVudiA9IHNldHRpbmcuZmV0Y2hNYWlsU2VydmVyID8gc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIuZW52IDogJ2xvY2FsJztcblxuXG5jb25zdCBjdXJyQ2hlY2tzdW1GaWxlID0gUGF0aC5yZXNvbHZlKCdjaGVja3N1bS4nICsgKHNldHRpbmcuZmV0Y2hNYWlsU2VydmVyID8gZW52IDogJ2xvY2FsJykgKyAnLmpzb24nKTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlbmRNYWlsKHN1YmplY3Q6IHN0cmluZywgdGV4dDogc3RyaW5nLCBmaWxlPzogc3RyaW5nKSB7XG4gIGxvZy5pbmZvKCdsb2dpbicpO1xuICBpZiAoIXNldHRpbmcuZmV0Y2hNYWlsU2VydmVyKSB7XG4gICAgbG9nLmluZm8oJ2ZldGNoTWFpbFNlcnZlciBpcyBub3QgY29uZmlndXJlZCEgU2tpcCBzZW5kTWFpbCcpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCB7XG4gICAgdXNlcjogRU1BSUwsXG4gICAgbG9naW5TZWNyZXQ6IFNFQ1JFVCxcbiAgICAvLyBpbWFwOiBJTUFQLFxuICAgIHNtdHA6IFNNVFBcbiAgfSA9IHNldHRpbmcuZmV0Y2hNYWlsU2VydmVyO1xuXG4gIGNvbnN0IHRyYW5zcG9ydGVyID0gY3JlYXRlVHJhbnNwb3J0KHtcbiAgICBob3N0OiBTTVRQLFxuICAgIGF1dGg6IHtcbiAgICAgIHR5cGU6ICdsb2dpbicsXG4gICAgICB1c2VyOiBFTUFJTCxcbiAgICAgIHBhc3M6IFNFQ1JFVFxuICAgIH0sXG4gICAgc2VjdXJlOiB0cnVlXG4gIH0gYXMgU01UUFRyYW5zcG9ydC5PcHRpb25zKTtcblxuICBsb2cuaW5mbygnc2VuZCBtYWlsJyk7XG4gIGNvbnN0IGluZm8gPSBhd2FpdCB0cmFuc3BvcnRlci5zZW5kTWFpbCh7XG4gICAgZnJvbTogRU1BSUwsXG4gICAgdG86IEVNQUlMLFxuICAgIHN1YmplY3Q6IGBidWlsZCBhcnRpZmFjdDogJHtzdWJqZWN0fWAsXG4gICAgdGV4dCxcbiAgICBhdHRhY2htZW50czogZmlsZSA/IFtcbiAgICAgIHtcbiAgICAgICAgZmlsZW5hbWU6IFBhdGguYmFzZW5hbWUoZmlsZSksXG4gICAgICAgIHBhdGg6IFBhdGgucmVzb2x2ZShmaWxlKVxuICAgICAgfVxuICAgIF0gOiB1bmRlZmluZWRcbiAgfSk7XG5cbiAgbG9nLmluZm8oaW5mbyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXRyeVNlbmRNYWlsKHN1YmplY3Q6IHN0cmluZywgdGV4dDogc3RyaW5nLCBmaWxlPzogc3RyaW5nKSB7XG4gIGxldCBlcnJvcjogRXJyb3IgfCB1bmRlZmluZWQ7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHNlbmRNYWlsKHN1YmplY3QsIHRleHQsIGZpbGUpO1xuICAgICAgZXJyb3IgPSB1bmRlZmluZWQ7XG4gICAgICBicmVhaztcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGxvZy5pbmZvKCdHb3QgZXJyb3InLCBlcnIpO1xuICAgICAgZXJyb3IgPSBlcnI7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwMCkpO1xuICAgIH1cbiAgfVxuICBpZiAoZXJyb3IpIHtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEltYXBGZXRjaERhdGEge1xuICBoZWFkZXJzOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW10gfCB1bmRlZmluZWR9O1xuICB0ZXh0czogc3RyaW5nW107XG4gIGZpbGVzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbWFwQ29tbWFuZENvbnRleHQge1xuICAvKipcbiAgICogSW5kZXggb2YgbGF0ZXN0IG1haWxcbiAgICovXG4gIGxhc3RJbmRleDogbnVtYmVyO1xuICBmaWxlV3JpdGluZ1N0YXRlOiBPYnNlcnZhYmxlPGJvb2xlYW4+O1xuICB3YWl0Rm9yUmVwbHk8UiA9IGFueT4oY29tbWFuZD86IHN0cmluZyxcbiAgICBvbkxpbmU/OiAobGE6IExvb2tBaGVhZDxUb2tlbjxJbWFwVG9rZW5UeXBlPj4sIHRhZzogc3RyaW5nKSA9PiBQcm9taXNlPFI+KTogUHJvbWlzZTxSIHwgbnVsbD47XG4gIGZpbmRNYWlsKGZyb21JbmR4OiBudW1iZXIsIHN1YmplY3Q6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyIHwgdW5kZWZpbmVkPjtcbiAgd2FpdEZvckZldGNoKG1haWxJZHg6IHN0cmluZyB8IG51bWJlciwgaGVhZGVyT25seT86IGJvb2xlYW4sIG92ZXJyaWRlRmlsZU5hbWU/OiBzdHJpbmcpOiBQcm9taXNlPEltYXBGZXRjaERhdGE+O1xuICB3YWl0Rm9yRmV0Y2hUZXh0KGluZGV4OiBudW1iZXIpOiBQcm9taXNlPHN0cmluZyB8IHVuZGVmaW5lZD47XG4gIGFwcGVuZE1haWwoc3ViamVjdDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQgfCBudWxsPjtcbn1cblxuLyoqXG4gKiBJTUFQIHNwZWNpZmljYXRpb25cbiAqIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMxNzMwXG4gKiBcbiAqIElEIGNvbW1hbmRcbiAqIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMyOTcxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb25uZWN0SW1hcChjYWxsYmFjazogKGNvbnRleHQ6IEltYXBDb21tYW5kQ29udGV4dCkgPT4gUHJvbWlzZTxhbnk+KSB7XG5cbiAgbGV0IGxvZ0VuYWJsZWQgPSB0cnVlO1xuICBsZXQgY21kSWR4ID0gMTtcbiAgY29uc3QgZmlsZVdyaXRpbmdTdGF0ZSA9IG5ldyBCZWhhdmlvclN1YmplY3Q8U2V0PHN0cmluZz4+KG5ldyBTZXQ8c3RyaW5nPigpKTtcblxuICBpZiAoIXNldHRpbmcuZmV0Y2hNYWlsU2VydmVyKSB7XG4gICAgbG9nLndhcm4oJ2ZldGNoTWFpbFNlcnZlciBpcyBub3QgY29uZmlndXJlZCEgU2tpcCBzZW5kTWFpbCcpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCB7XG4gICAgICB1c2VyOiBFTUFJTCxcbiAgICAgIGxvZ2luU2VjcmV0OiBTRUNSRVQsXG4gICAgICBpbWFwOiBJTUFQXG4gICAgICAvLyBzbXRwOiBTTVRQXG4gIH0gPSBzZXR0aW5nLmZldGNoTWFpbFNlcnZlcjtcblxuICBjb25zdCBjb250ZXh0OiB7W2sgaW4ga2V5b2YgSW1hcENvbW1hbmRDb250ZXh0XT86IEltYXBDb21tYW5kQ29udGV4dFtrXX0gPSB7fTtcblxuICBjb250ZXh0LndhaXRGb3JSZXBseSA9IHdhaXRGb3JSZXBseTtcbiAgY29udGV4dC53YWl0Rm9yRmV0Y2ggPSB3YWl0Rm9yRmV0Y2g7XG4gIGNvbnRleHQud2FpdEZvckZldGNoVGV4dCA9IHdhaXRGb3JGZXRjaFRleHQ7XG4gIGNvbnRleHQuZmluZE1haWwgPSBmaW5kTWFpbDtcbiAgY29udGV4dC5maWxlV3JpdGluZ1N0YXRlID0gZmlsZVdyaXRpbmdTdGF0ZS5waXBlKFxuICAgIG1hcChmaWxlU2V0ID0+IHtcbiAgICAgIC8vIGxvZy53YXJuKCd3cml0aW5nOiAnLCBmaWxlU2V0LnZhbHVlcygpKTtcbiAgICAgIHJldHVybiBmaWxlU2V0LnNpemUgPiAwO1xuICAgIH0pLFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKClcbiAgKTtcblxuICBjb250ZXh0LmFwcGVuZE1haWwgPSAoc3ViamVjdDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBtYWlsQm9keSA9IGBEYXRlOiBNb24sIDcgRmViIDIwMjAgMjE6NTI6MjUgLTA4MDAgKFBTVClcbiAgICAgIEZyb206IENyZWRpdCB0ZWFtIGJ1aWxkIG1hY2hpbmVcbiAgICAgIFN1YmplY3Q6ICR7c3ViamVjdH1cbiAgICAgIFRvOiBBZG1pbmluc3RyYXRvclxuICAgICAgTWVzc2FnZS1JZDogPEIyNzM5Ny0wMTAwMDAwQEJsdXJkeWJsb29wLkNPTT5cbiAgICAgIE1JTUUtVmVyc2lvbjogMS4wXG4gICAgICBDb250ZW50LVR5cGU6IFRFWFQvUExBSU47IENIQVJTRVQ9VVMtQVNDSUlcbiAgICAgIFxuICAgICAgJHtjb250ZW50fVxuICAgICAgYC5yZXBsYWNlKC9eWyBdKy9tZywgJycpLnJlcGxhY2UoL1xcci9nLCAnJykucmVwbGFjZSgvXFxuL2csICdcXHJcXG4nKTtcbiAgICByZXR1cm4gd2FpdEZvclJlcGx5KGBBUFBFTkQgSU5CT1ggeyR7bWFpbEJvZHkubGVuZ3RofX1cXHJcXG5gICsgbWFpbEJvZHkpO1xuICB9O1xuXG4gIGNvbnN0IHNlcnZlclJlc0hhbmRsZXIgPSBjcmVhdGVTZXJ2ZXJEYXRhSGFuZGxlcigpO1xuICBzZXJ2ZXJSZXNIYW5kbGVyLm91dHB1dC5waXBlKFxuICAgIHRhcChtc2cgPT4ge1xuICAgICAgaWYgKG1zZyAhPSBudWxsKVxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZygnICA8LSAnICsgbXNnLm1hcCh0b2tlbiA9PiB0b2tlbi50ZXh0KS5qb2luKCcgJykpO1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG5cbiAgbGV0IHNvY2tldDogVExTU29ja2V0IHwgdW5kZWZpbmVkO1xuICB0cnkge1xuICAgIHNvY2tldCA9IGF3YWl0IG5ldyBQcm9taXNlPFJldHVyblR5cGU8dHlwZW9mIHRzbENvbm5lY3Q+PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCBzb2NrZXQgPSB0c2xDb25uZWN0KHtcbiAgICAgICAgaG9zdDogSU1BUCwgcG9ydDogOTkzLFxuICAgICAgICBlbmFibGVUcmFjZTogdHJ1ZVxuICAgICAgfSBhcyBDb25uZWN0aW9uT3B0aW9ucyk7XG5cbiAgICAgIHNvY2tldC5vbignc2VjdXJlQ29ubmVjdCcsICgpID0+IHtcbiAgICAgICAgbG9nLmluZm8oJ2Nvbm5lY3RlZCcsIHNvY2tldC5hdXRob3JpemVkID8gJ2F1dGhvcml6ZWQnIDogJ3VuYXV0aG9yaXplZCcpO1xuICAgICAgICByZXNvbHZlKHNvY2tldCk7XG4gICAgICB9KVxuICAgICAgLm9uKCdlcnJvcicsIGVyciA9PiByZWplY3QoZXJyKSlcbiAgICAgIC5vbigndGltZW91dCcsICgpID0+IHJlamVjdChuZXcgRXJyb3IoJ1RpbWVvdXQnKSkpO1xuICAgICAgc29ja2V0Lm9uKCdkYXRhJywgKGRhdGE6IEJ1ZmZlcikgPT4ge1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhkYXRhLnRvU3RyaW5nKCkpO1xuICAgICAgICBzZXJ2ZXJSZXNIYW5kbGVyLmlucHV0KGRhdGEpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoKTtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoJ0lEIChcIm5hbWVcIiBcImNvbS50ZW5jZW50LmZveG1haWxcIiBcInZlcnNpb25cIiBcIjcuMi45Ljc5XCIpJyk7XG4gICAgYXdhaXQgd2FpdEZvclJlcGx5KGBMT0dJTiAke0VNQUlMfSAke1NFQ1JFVH1gKTtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoJ1NFTEVDVCBJTkJPWCcsIGFzeW5jIGxhID0+IHtcbiAgICAgIGNvbnN0IGV4aXRzVGsgPSBhd2FpdCBsYS5sYSgzKTtcbiAgICAgIGlmIChleGl0c1RrICYmIGV4aXRzVGsudGV4dC50b1VwcGVyQ2FzZSgpID09PSAnRVhJU1RTJykge1xuICAgICAgICBjb250ZXh0Lmxhc3RJbmRleCA9IHBhcnNlSW50KChhd2FpdCBsYS5sYSgyKSkhLnRleHQsIDEwKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICAvLyBhd2FpdCB3YWl0Rm9yUmVwbHkoJ1NFQVJDSCBBTEwnKTtcblxuICAgIGF3YWl0IGNhbGxiYWNrKGNvbnRleHQgYXMgSW1hcENvbW1hbmRDb250ZXh0KTtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoJ0xPR09VVCcpO1xuICB9IGNhdGNoIChleCkge1xuICAgIGxvZy5lcnJvcihleCk7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHdhaXRGb3JSZXBseSgnTE9HT1VUJyk7XG4gICAgfSBjYXRjaCAoZXIpIHt9XG4gICAgaWYgKHNvY2tldClcbiAgICAgIHNvY2tldC5lbmQoKTtcbiAgICB0aHJvdyBleDtcbiAgfVxuXG4gIHNlcnZlclJlc0hhbmRsZXIuaW5wdXQobnVsbCk7XG4gIHNvY2tldC5lbmQoKTtcblxuICBhc3luYyBmdW5jdGlvbiB3YWl0Rm9yRmV0Y2hUZXh0KGluZGV4OiBudW1iZXIpIHtcbiAgICBsZXQgYm9keTE6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoYEZFVENIICR7aW5kZXh9IEJPRFlbMV1gLCBhc3luYyBsYSA9PiB7XG4gICAgICB3aGlsZSAoKGF3YWl0IGxhLmxhKCkpICE9IG51bGwpIHtcbiAgICAgICAgY29uc3QgdG9rZW4gPSBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgICAgIGlmICh0b2tlbi50ZXh0ID09PSAnQk9EWScgJiYgKGF3YWl0IGxhLmxhKCkpIS50ZXh0ID09PSAnWzFdJykge1xuICAgICAgICAgIGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgICAgICBib2R5MSA9ICgoYXdhaXQgbGEuYWR2YW5jZSgpKSBhcyB1bmtub3duIGFzIFN0cmluZ0xpdCkuZGF0YS50b1N0cmluZygndXRmOCcpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBsb2cud2FybihidWYpO1xuICAgIC8vIHJldHVybiAvXlxcKlxccytcXGQrXFxzK0ZFVENIXFxzK1xcKC4qP1xce1xcZCtcXH0oW15dKilcXCkkL20uZXhlYyhidWYpIVsxXTtcbiAgICByZXR1cm4gYm9keTE7XG4gIH1cblxuICBmdW5jdGlvbiB3YWl0Rm9yUmVwbHk8UiA9IGFueT4oY29tbWFuZD86IHN0cmluZywgb25MaW5lPzogKGxhOiBMb29rQWhlYWQ8VG9rZW48SW1hcFRva2VuVHlwZT4+LCB0YWc6IHN0cmluZykgPT4gUHJvbWlzZTxSPik6IFByb21pc2U8UiB8IG51bGw+IHtcbiAgICBsZXQgdGFnOiBzdHJpbmc7XG4gICAgaWYgKGNvbW1hbmQpXG4gICAgICB0YWcgPSAnYScgKyAoY21kSWR4KyspO1xuXG4gICAgbGV0IHJlc3VsdDogUiB8IG51bGwgPSBudWxsO1xuICAgIGNvbnN0IHByb20gPSBwYXJzZUxpbmVzT2ZUb2tlbnMoc2VydmVyUmVzSGFuZGxlci5vdXRwdXQsIGFzeW5jIGxhID0+IHtcbiAgICAgIGNvbnN0IHJlc1RhZyA9IGF3YWl0IGxhLmxhKCk7XG4gICAgICBpZiAoIXRhZyAmJiByZXNUYWchLnRleHQgPT09ICcqJyB8fCByZXNUYWchLnRleHQgPT09IHRhZykge1xuICAgICAgICBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgICAgIGNvbnN0IHN0YXRlID0gYXdhaXQgbGEubGEoKTtcbiAgICAgICAgbGV0IHJldHVyblRleHQgPSAnJztcbiAgICAgICAgaWYgKC9PS3xOTy8udGVzdChzdGF0ZSEudGV4dCkpIHtcbiAgICAgICAgICByZXR1cm5UZXh0ICs9IChhd2FpdCBsYS5hZHZhbmNlKCkpLnRleHQ7XG4gICAgICAgICAgd2hpbGUgKChhd2FpdCBsYS5sYSgpKSAhPSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm5UZXh0ICs9ICcgJyArIChhd2FpdCBsYS5hZHZhbmNlKCkpLnRleHQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXR1cm5UZXh0O1xuICAgICAgfSBlbHNlIGlmIChvbkxpbmUpIHtcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgb25MaW5lKGxhLCB0YWcpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKGNvbW1hbmQpIHtcbiAgICAgIGNvbnN0IGNtZCA9IHRhZyEgKyAnICcgKyBjb21tYW5kO1xuICAgICAgaWYgKHNvY2tldClcbiAgICAgICAgc29ja2V0LndyaXRlKEJ1ZmZlci5mcm9tKGAke3RhZyF9ICR7Y29tbWFuZH1cXHJcXG5gLCAndXRmOCcpKTtcbiAgICAgIGxvZy5kZWJ1ZygnPT4nLCBjbWQpO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9tLnRoZW4oKCkgPT4gcmVzdWx0KTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIHdhaXRGb3JGZXRjaChtYWlsSWR4OiBzdHJpbmcgfCBudW1iZXIgPSAnKicsIGhlYWRlck9ubHkgPSB0cnVlLCBvdmVycmlkZUZpbGVOYW1lPzogc3RyaW5nKTogUHJvbWlzZTxJbWFwRmV0Y2hEYXRhPiB7XG4gICAgY29uc3Qgb3JpZ2luTG9nRW5hYmxlZCA9IGxvZ0VuYWJsZWQ7XG4gICAgbG9nRW5hYmxlZCA9IGhlYWRlck9ubHk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgd2FpdEZvclJlcGx5KGBGRVRDSCAke21haWxJZHh9IFJGQzgyMiR7aGVhZGVyT25seSA/ICcuSEVBREVSJyA6ICcnfWAsIGFzeW5jIChsYSkgPT4ge1xuICAgICAgbGV0IG1zZzogUkNGODIyUGFyc2VSZXN1bHQgfCB1bmRlZmluZWQ7XG4gICAgICB3aGlsZSAoKGF3YWl0IGxhLmxhKCkpICE9IG51bGwpIHtcbiAgICAgICAgY29uc3QgdGsgPSBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgICAgIGlmICh0ay50eXBlICE9PSBJbWFwVG9rZW5UeXBlLnN0cmluZ0xpdCkge1xuICAgICAgICAgIC8vIGxvZy5kZWJ1Zyh0ay50ZXh0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBsb2cuZGVidWcoJ3N0cmluZyBsaXRlcmFsOlxcbicsICh0ayBhcyB1bmtub3duIGFzIFN0cmluZ0xpdCkuZGF0YS5ieXRlTGVuZ3RoKTtcbiAgICAgICAgICAvLyBjb25zdCB3cml0dGVuRmlsZSA9IGBlbWFpbC0ke25ldyBEYXRlKCkuZ2V0VGltZSgpfS50eHRgO1xuICAgICAgICAgIC8vIGZzLndyaXRlRmlsZVN5bmMod3JpdHRlbkZpbGUsICh0ayBhcyB1bmtub3duIGFzIFN0cmluZ0xpdCkuZGF0YSwgJ3V0ZjgnKTtcbiAgICAgICAgICAvLyBsb2cuZGVidWcoYHdyaXRlbiB0byAke3dyaXR0ZW5GaWxlfWApO1xuICAgICAgICAgIG1zZyA9IHBhcnNlUmZjODIyKCh0ayBhcyBTdHJpbmdMaXQpLmRhdGEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBoZWFkZXJzOiBtc2cgPyBtc2cuaGVhZGVycy5yZWR1Y2UoKHByZXYsIGN1cnIpID0+IHtcbiAgICAgICAgICBwcmV2W2N1cnIua2V5LnRvTG93ZXJDYXNlKCldID0gY3Vyci52YWx1ZTtcbiAgICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgICAgfSwge30gYXMgSW1hcEZldGNoRGF0YVsnaGVhZGVycyddKSA6IHt9LFxuICAgICAgICB0ZXh0czogbXNnID8gbXNnLnBhcnRzLmZpbHRlcihwYXJ0ID0+IHBhcnQuYm9keSAhPSBudWxsKS5tYXAocGFydCA9PiBwYXJ0LmJvZHkhLnRvU3RyaW5nKCkpIDogW10sXG4gICAgICAgIGZpbGVzOiBtc2cgPyBtc2cucGFydHMuZmlsdGVyKHBhcnQgPT4gcGFydC5maWxlICE9IG51bGwpLm1hcChwYXJ0ID0+IHBhcnQuZmlsZSEpIDogW11cbiAgICAgIH0gYXMgSW1hcEZldGNoRGF0YTtcbiAgICB9KTtcbiAgICBsb2dFbmFibGVkID0gb3JpZ2luTG9nRW5hYmxlZDtcblxuICAgIGlmIChvdmVycmlkZUZpbGVOYW1lICYmIHJlc3VsdCEuZmlsZXNbMF0pIHtcbiAgICAgIGZzLnJlbmFtZVN5bmMocmVzdWx0IS5maWxlc1swXSwgb3ZlcnJpZGVGaWxlTmFtZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdCE7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBmaW5kTWFpbChmcm9tSW5keDogbnVtYmVyLCBzdWJqZWN0OiBzdHJpbmcpOiBQcm9taXNlPG51bWJlciB8IHVuZGVmaW5lZD4ge1xuICAgIGxvZy5pbmZvKCdmaW5kTWFpbCcsIGZyb21JbmR4LCBzdWJqZWN0KTtcbiAgICB3aGlsZSAoZnJvbUluZHggPiAwKSB7XG4gICAgICBjb25zdCByZXMgPSBhd2FpdCB3YWl0Rm9yRmV0Y2goZnJvbUluZHgpO1xuICAgICAgaWYgKHJlcy5oZWFkZXJzLnN1YmplY3QpIHtcbiAgICAgICAgbG9nLmRlYnVnKHJlcy5oZWFkZXJzLnN1YmplY3QpO1xuICAgICAgfVxuICAgICAgaWYgKHJlcy5oZWFkZXJzLnN1YmplY3QgJiYgcmVzLmhlYWRlcnMuc3ViamVjdFswXS5pbmRleE9mKHN1YmplY3QpID49IDApXG4gICAgICAgIHJldHVybiBmcm9tSW5keDtcbiAgICAgIGZyb21JbmR4LS07XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEltYXBNYW5hZ2VyIHtcbiAgY2hlY2tzdW1TdGF0ZSA9IG5ldyBCZWhhdmlvclN1YmplY3Q8Q2hlY2tzdW0gfCBudWxsPihudWxsKTtcbiAgZmlsZVdyaXRpbmdTdGF0ZTogSW1hcENvbW1hbmRDb250ZXh0WydmaWxlV3JpdGluZ1N0YXRlJ107XG4gIHdhdGNoaW5nID0gZmFsc2U7XG4gIHByaXZhdGUgdG9GZXRjaEFwcHNTdGF0ZSA9IG5ldyBCZWhhdmlvclN1YmplY3Q8c3RyaW5nW10+KFtdKTtcblxuICBwcml2YXRlIGN0eD86IEltYXBDb21tYW5kQ29udGV4dDtcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgZW52OiBzdHJpbmcsIHB1YmxpYyB6aXBEb3dubG9hZERpcj86IHN0cmluZykge1xuICAgIGlmICh6aXBEb3dubG9hZERpciA9PSBudWxsKVxuICAgICAgdGhpcy56aXBEb3dubG9hZERpciA9IFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUoY3VyckNoZWNrc3VtRmlsZSksICdkZXBsb3ktc3RhdGljLScgKyBlbnYpO1xuICB9XG5cbiAgYXN5bmMgZmV0Y2hDaGVja3N1bSgpIHtcbiAgLy8gICBsZXQgY3M6IENoZWNrc3VtIHwgdW5kZWZpbmVkO1xuICAvLyAgIGF3YWl0IGNvbm5lY3RJbWFwKGFzeW5jIGN0eCA9PiB7XG4gIC8vICAgICBjcyA9IGF3YWl0IHRoaXMuX2ZldGNoQ2hlY2tzdW0oY3R4KTtcbiAgLy8gICB9KTtcbiAgLy8gICBsb2cuaW5mbygnZmV0Y2hlZCBjaGVja3N1bTonLCBjcyk7XG4gIC8vICAgdGhpcy5jaGVja3N1bVN0YXRlLm5leHQoY3MhKTtcbiAgLy8gICByZXR1cm4gY3M7XG4gIH1cblxuICBhc3luYyBmZXRjaFVwZGF0ZUNoZWNrU3VtKGFwcE5hbWU6IHN0cmluZykge1xuICAvLyAgIGxldCBjcyA9IGF3YWl0IHRoaXMuZmV0Y2hDaGVja3N1bSgpO1xuICAvLyAgIGxvZy5pbmZvKCdmZXRjaGVkIGNoZWNrc3VtOicsIGNzKTtcbiAgLy8gICBpZiAoY3MhLnZlcnNpb25zIVthcHBOYW1lXSA9PSBudWxsKSB7XG4gIC8vICAgICBjcyEudmVyc2lvbnMhW2FwcE5hbWVdID0ge1xuICAvLyAgICAgICB2ZXJzaW9uOiAwLFxuICAvLyAgICAgICBwYXRoOiAnPHNlZSBhdHRhY2hlbWVudCBmaWxlIG5hbWU+J1xuICAvLyAgICAgfTtcbiAgLy8gICB9XG4gIC8vICAgY3MhLnZlcnNpb25zIVthcHBOYW1lXS52ZXJzaW9uKys7XG4gIC8vICAgdGhpcy5jaGVja3N1bVN0YXRlLm5leHQoY3MhKTtcbiAgLy8gICBmcy5ta2RpcnBTeW5jKFBhdGguZGlybmFtZShjdXJyQ2hlY2tzdW1GaWxlKSk7XG4gIC8vICAgY29uc3QgY2hlY2tzdW1TdHIgPSBKU09OLnN0cmluZ2lmeShjcyEsIG51bGwsICcgICcpO1xuICAvLyAgIGZzLndyaXRlRmlsZVN5bmMoY3VyckNoZWNrc3VtRmlsZSwgY2hlY2tzdW1TdHIpO1xuICAvLyAgIGxvZy5pbmZvKCd3cml0ZSAlc1xcbiVzJywgY3VyckNoZWNrc3VtRmlsZSwgY2hlY2tzdW1TdHIpO1xuICAvLyAgIHJldHVybiBjcyE7XG4gIH1cblxuICAvKipcbiAgICogRG9uZSB3aGVuIGZpbGVzIGFyZSB3cml0dGVuXG4gICAqIEBwYXJhbSBleGNsdWRlQXBwIGV4Y2x1ZGUgYXBwXG4gICAqL1xuICBhc3luYyBmZXRjaE90aGVyWmlwcyhleGNsdWRlQXBwPzogc3RyaW5nKSB7XG4gIC8vICAgbGV0IGFwcE5hbWVzID0gT2JqZWN0LmtleXModGhpcy5jaGVja3N1bVN0YXRlLmdldFZhbHVlKCkhLnZlcnNpb25zISlcbiAgLy8gICAuZmlsdGVyKGFwcCA9PiBhcHAgIT09IGV4Y2x1ZGVBcHApO1xuXG4gIC8vICAgbGV0IGZpbGVXcml0dGVuUHJvbTogUHJvbWlzZTxib29sZWFuPiB8IHVuZGVmaW5lZDtcblxuICAvLyAgIGF3YWl0IGNvbm5lY3RJbWFwKGFzeW5jIGN0eCA9PiB7XG5cbiAgLy8gICAgIGZpbGVXcml0dGVuUHJvbSA9IGN0eC5maWxlV3JpdGluZ1N0YXRlLnBpcGUoXG4gIC8vICAgICAgIHNraXAoMSksXG4gIC8vICAgICAgIGZpbHRlcih3cml0aW5nID0+ICF3cml0aW5nKSxcbiAgLy8gICAgICAgdGFrZShhcHBOYW1lcy5sZW5ndGgpXG4gIC8vICAgICApLnRvUHJvbWlzZSgpO1xuXG4gIC8vICAgICBmb3IgKGNvbnN0IGFwcCBvZiBhcHBOYW1lcykge1xuICAvLyAgICAgICBsb2cuaW5mbygnZmV0Y2ggb3RoZXIgemlwOiAnICsgYXBwKTtcbiAgLy8gICAgICAgY29uc3QgaWR4ID0gYXdhaXQgY3R4LmZpbmRNYWlsKGN0eC5sYXN0SW5kZXgsIGBia2prLXByZS1idWlsZCgke3RoaXMuZW52fS0ke2FwcH0pYCk7XG4gIC8vICAgICAgIGlmICghaWR4KSB7XG4gIC8vICAgICAgICAgbG9nLmluZm8oYG1haWwgXCJia2prLXByZS1idWlsZCgke3RoaXMuZW52fS0ke2FwcH0pXCIgaXMgbm90IEZvdW5kLCBza2lwIGRvd25sb2FkIHppcGApO1xuICAvLyAgICAgICAgIGNvbnRpbnVlO1xuICAvLyAgICAgICB9XG4gIC8vICAgICAgIGF3YWl0IGN0eC53YWl0Rm9yRmV0Y2goaWR4LCBmYWxzZSwgUGF0aC5yZXNvbHZlKHRoaXMuemlwRG93bmxvYWREaXIhLCBhcHAgKyAnLnppcCcpKTtcbiAgLy8gICAgIH1cbiAgLy8gICB9KTtcbiAgLy8gICBpZiAoZmlsZVdyaXR0ZW5Qcm9tKVxuICAvLyAgICAgYXdhaXQgZmlsZVdyaXR0ZW5Qcm9tO1xuICAvLyAgIHJldHVybiBhcHBOYW1lcztcbiAgfVxuXG4gIGFzeW5jIGFwcGVuZE1haWwoc3ViamVjdDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpIHtcbiAgICBhd2FpdCBjb25uZWN0SW1hcChhc3luYyBjdHggPT4ge1xuICAgICAgYXdhaXQgY3R4LmFwcGVuZE1haWwoc3ViamVjdCwgY29udGVudCk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBhc3luYyBzdGFydFdhdGNoTWFpbChwb2xsSW50ZXJ2YWwgPSA2MDAwMCkge1xuICAvLyAgIHRoaXMud2F0Y2hpbmcgPSB0cnVlO1xuICAvLyAgIHdoaWxlICh0aGlzLndhdGNoaW5nKSB7XG4gIC8vICAgICBhd2FpdCB0aGlzLmNoZWNrTWFpbEZvclVwZGF0ZSgpO1xuICAvLyAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIHBvbGxJbnRlcnZhbCkpOyAvLyA2MCBzZWNcbiAgLy8gICB9XG4gIC8vIH1cblxuICBhc3luYyBjaGVja01haWxGb3JVcGRhdGUoKSB7XG4gICAgYXdhaXQgY29ubmVjdEltYXAoYXN5bmMgY3R4ID0+IHtcbiAgICAgIHRoaXMuY3R4ID0gY3R4O1xuICAgICAgdGhpcy5maWxlV3JpdGluZ1N0YXRlID0gY3R4LmZpbGVXcml0aW5nU3RhdGU7XG5cbiAgICAgIGNvbnN0IGNzID0gYXdhaXQgdGhpcy5fZmV0Y2hDaGVja3N1bShjdHgpO1xuICAgICAgdGhpcy5jaGVja3N1bVN0YXRlLm5leHQoY3MpO1xuXG4gICAgICBjb25zdCB0b0ZldGNoQXBwcyA9IHRoaXMudG9GZXRjaEFwcHNTdGF0ZS5nZXRWYWx1ZSgpO1xuICAgICAgaWYgKHRvRmV0Y2hBcHBzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy50b0ZldGNoQXBwc1N0YXRlLm5leHQoW10pO1xuICAgICAgICBmb3IgKGNvbnN0IGFwcE5hbWUgb2YgdG9GZXRjaEFwcHMpIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLmZldGNoQXR0YWNobWVudChhcHBOYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gYXdhaXQgY3R4LndhaXRGb3JSZXBseSgnU1VCU0NSSUJFIElOQk9YJyk7XG4gICAgICAvLyBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMzAwMDApKTsgLy8gMzAgc2VjXG4gICAgICBkZWxldGUgdGhpcy5jdHg7XG4gICAgfSk7XG4gIH1cblxuICBmZXRjaEFwcER1cmluZ1dhdGNoQWN0aW9uKC4uLmFwcE5hbWVzOiBzdHJpbmdbXSkge1xuICAgIHRoaXMudG9GZXRjaEFwcHNTdGF0ZS5uZXh0KGFwcE5hbWVzKTtcbiAgfVxuXG4gIC8vIGFzeW5jIHNlbmRGaWxlQW5kVXBkYXRlZENoZWNrc3VtKGFwcE5hbWU6IHN0cmluZywgZmlsZTogc3RyaW5nKSB7XG4gIC8vICAgY29uc3QgY3MgPSBhd2FpdCB0aGlzLmZldGNoVXBkYXRlQ2hlY2tTdW0oYXBwTmFtZSk7XG4gIC8vICAgYXdhaXQgcmV0cnlTZW5kTWFpbChgYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tJHthcHBOYW1lfSlgLCBKU09OLnN0cmluZ2lmeShjcywgbnVsbCwgJyAgJyksIGZpbGUpO1xuICAvLyB9XG5cbiAgc3RvcFdhdGNoKCkge1xuICAgIHRoaXMud2F0Y2hpbmcgPSBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZmV0Y2hBdHRhY2htZW50KGFwcDogc3RyaW5nKSB7XG4gICAgLy8gY29uc3QgaWR4ID0gYXdhaXQgdGhpcy5jdHguZmluZE1haWwodGhpcy5jdHgubGFzdEluZGV4LCBgYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tJHthcHB9KWApO1xuICAgIC8vIGlmIChpZHggPT0gbnVsbClcbiAgICAvLyAgIHRocm93IG5ldyBFcnJvcignQ2FudCBmaW5kIG1haWw6ICcgKyBgYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tJHthcHB9KWApO1xuICAgIC8vIGF3YWl0IHRoaXMuY3R4LndhaXRGb3JGZXRjaChpZHghLCBmYWxzZSwgUGF0aC5yZXNvbHZlKHRoaXMuemlwRG93bmxvYWREaXIhLCBgJHthcHB9LnppcGApKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgX2ZldGNoQ2hlY2tzdW0oY3R4OiBJbWFwQ29tbWFuZENvbnRleHQpIHtcbiAgICBjb25zdCBpZHggPSBhd2FpdCBjdHguZmluZE1haWwoY3R4Lmxhc3RJbmRleCwgYGJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LWApO1xuICAgIGxvZy5pbmZvKCdfZmV0Y2hDaGVja3N1bSwgaW5kZXg6JywgaWR4KTtcbiAgICBpZiAoaWR4ID09IG51bGwpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QganNvblN0ciA9IGF3YWl0IGN0eC53YWl0Rm9yRmV0Y2hUZXh0KGlkeCk7XG4gICAgaWYgKGpzb25TdHIgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdFbXB0eSBKU09OIHRleHQnKTtcbiAgICB9XG4gICAgcmV0dXJuIEpTT04ucGFyc2UoanNvblN0cikgYXMgQ2hlY2tzdW07XG4gIH1cblxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdGVzdE1haWwoaW1hcDogc3RyaW5nLCB1c2VyOiBzdHJpbmcsIGxvZ2luU2VjcmV0OiBzdHJpbmcpIHtcbiAgbG9nLmRlYnVnID0gbG9nLmluZm87XG4gIGlmIChpbWFwKVxuICAgIGNvbmZpZy5zZXQoW19fcGxpbmsucGFja2FnZU5hbWUsICdmZXRjaE1haWxTZXJ2ZXInXSwge1xuICAgICAgaW1hcCwgdXNlciwgbG9naW5TZWNyZXRcbiAgICB9IGFzIFdpdGhNYWlsU2VydmVyQ29uZmlnWydmZXRjaE1haWxTZXJ2ZXInXSk7XG4gIGF3YWl0IGNvbm5lY3RJbWFwKGFzeW5jIGN0eCA9PiB7XG4gICAgYXdhaXQgY3R4LndhaXRGb3JSZXBseSgnU0VBUkNIIEhFQUQgU3ViamVjdCBcImJ1aWxkIGFydGlmYWN0OiBia2prLXByZS1idWlsZFwiJyk7XG4gIH0pO1xufVxuIl19