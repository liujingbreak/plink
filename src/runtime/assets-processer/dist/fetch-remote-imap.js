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
const imap_msg_parser_1 = require("./mail/imap-msg-parser");
const __api_1 = __importDefault(require("__api"));
const rfc822_sync_parser_1 = require("./mail/rfc822-sync-parser");
// import {Socket} from 'net';
const log = require('log4js').getLogger(__api_1.default.packageName + '.fetch-remote-imap');
const setting = __api_1.default.config.get(__api_1.default.packageName);
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
        const transporter = nodemailer_1.createTransport({
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
        context.fileWritingState = fileWritingState.pipe(operators_1.map(fileSet => {
            // log.warn('writing: ', fileSet.values());
            return fileSet.size > 0;
        }), operators_1.distinctUntilChanged());
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
        const serverResHandler = imap_msg_parser_1.createServerDataHandler();
        serverResHandler.output.pipe(operators_1.tap(msg => {
            if (msg != null)
                // eslint-disable-next-line no-console
                console.log('  <- ' + msg.map(token => token.text).join(' '));
        })).subscribe();
        let socket;
        try {
            socket = yield new Promise((resolve, reject) => {
                const socket = tls_1.connect({
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
            const prom = imap_msg_parser_1.parseLinesOfTokens(serverResHandler.output, (la) => __awaiter(this, void 0, void 0, function* () {
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
                            msg = rfc822_sync_parser_1.parse(tk.data);
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
            __api_1.default.config.set([__api_1.default.packageName, 'fetchMailServer'], {
                imap, user, loginSecret
            });
        yield connectImap((ctx) => __awaiter(this, void 0, void 0, function* () {
            yield ctx.waitForReply('SEARCH HEAD Subject "build artifact: bkjk-pre-build"');
        }));
    });
}
exports.testMail = testMail;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmV0Y2gtcmVtb3RlLWltYXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmZXRjaC1yZW1vdGUtaW1hcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkM7QUFFN0MsK0JBQWtEO0FBQ2xELDhDQUV3QjtBQUN4Qiw2QkFBMEU7QUFDMUUsd0RBQTBCO0FBRTFCLGdEQUF3QjtBQUV4Qiw0REFBNkc7QUFDN0csa0RBQXdCO0FBRXhCLGtFQUFrRjtBQUVsRiw4QkFBOEI7QUFDOUIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLG9CQUFvQixDQUFDLENBQUM7QUFFaEYsTUFBTSxPQUFPLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBeUIsQ0FBQztBQUN4RSxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBRzVFLE1BQU0sZ0JBQWdCLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEdBQUcsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDO0FBRXpHLFNBQXNCLFFBQVEsQ0FBQyxPQUFlLEVBQUUsSUFBWSxFQUFFLElBQWE7O1FBQ3pFLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUU7WUFDNUIsR0FBRyxDQUFDLElBQUksQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO1lBQzdELE9BQU87U0FDUjtRQUNELE1BQU0sRUFDSixJQUFJLEVBQUUsS0FBSyxFQUNYLFdBQVcsRUFBRSxN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QVksQ0FBQyxzREFBc0QsQ0FBQyxDQUFDO1FBQ2pGLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQUE7QUFURCw0QkFTQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZVRyYW5zcG9ydCB9IGZyb20gJ25vZGVtYWlsZXInO1xuaW1wb3J0IFNNVFBUcmFuc3BvcnQgZnJvbSAnbm9kZW1haWxlci9saWIvc210cC10cmFuc3BvcnQnO1xuaW1wb3J0IHtPYnNlcnZhYmxlLCBCZWhhdmlvclN1YmplY3QgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IG1hcCwgLypjb25jYXRNYXAsIHRha2VXaGlsZSwgdGFrZUxhc3QsIG1hcFRvLCovIHRhcCwgZGlzdGluY3RVbnRpbENoYW5nZWRcbiAgLy8gc2tpcCwgZmlsdGVyLCB0YWtlXG59IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGNvbm5lY3QgYXMgdHNsQ29ubmVjdCwgQ29ubmVjdGlvbk9wdGlvbnMsIFRMU1NvY2tldCB9IGZyb20gJ3Rscyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge0NoZWNrc3VtLCBXaXRoTWFpbFNlcnZlckNvbmZpZ30gZnJvbSAnLi9mZXRjaC10eXBlcyc7XG5pbXBvcnQge2NyZWF0ZVNlcnZlckRhdGFIYW5kbGVyLCBwYXJzZUxpbmVzT2ZUb2tlbnMsIEltYXBUb2tlblR5cGUsIFN0cmluZ0xpdH0gZnJvbSAnLi9tYWlsL2ltYXAtbXNnLXBhcnNlcic7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7IExvb2tBaGVhZCwgVG9rZW4gfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2FzeW5jLUxMbi1wYXJzZXInO1xuaW1wb3J0IHtwYXJzZSBhcyBwYXJzZVJmYzgyMiwgUkNGODIyUGFyc2VSZXN1bHR9IGZyb20gJy4vbWFpbC9yZmM4MjItc3luYy1wYXJzZXInO1xuXG4vLyBpbXBvcnQge1NvY2tldH0gZnJvbSAnbmV0JztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmZldGNoLXJlbW90ZS1pbWFwJyk7XG5cbmNvbnN0IHNldHRpbmcgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpIGFzIFdpdGhNYWlsU2VydmVyQ29uZmlnO1xuY29uc3QgZW52ID0gc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIgPyBzZXR0aW5nLmZldGNoTWFpbFNlcnZlci5lbnYgOiAnbG9jYWwnO1xuXG5cbmNvbnN0IGN1cnJDaGVja3N1bUZpbGUgPSBQYXRoLnJlc29sdmUoJ2NoZWNrc3VtLicgKyAoc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIgPyBlbnYgOiAnbG9jYWwnKSArICcuanNvbicpO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VuZE1haWwoc3ViamVjdDogc3RyaW5nLCB0ZXh0OiBzdHJpbmcsIGZpbGU/OiBzdHJpbmcpIHtcbiAgbG9nLmluZm8oJ2xvZ2luJyk7XG4gIGlmICghc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIpIHtcbiAgICBsb2cuaW5mbygnZmV0Y2hNYWlsU2VydmVyIGlzIG5vdCBjb25maWd1cmVkISBTa2lwIHNlbmRNYWlsJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHtcbiAgICB1c2VyOiBFTUFJTCxcbiAgICBsb2dpblNlY3JldDogU0VDUkVULFxuICAgIC8vIGltYXA6IElNQVAsXG4gICAgc210cDogU01UUFxuICB9ID0gc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXI7XG5cbiAgY29uc3QgdHJhbnNwb3J0ZXIgPSBjcmVhdGVUcmFuc3BvcnQoe1xuICAgIGhvc3Q6IFNNVFAsXG4gICAgYXV0aDoge1xuICAgICAgdHlwZTogJ2xvZ2luJyxcbiAgICAgIHVzZXI6IEVNQUlMLFxuICAgICAgcGFzczogU0VDUkVUXG4gICAgfSxcbiAgICBzZWN1cmU6IHRydWVcbiAgfSBhcyBTTVRQVHJhbnNwb3J0Lk9wdGlvbnMpO1xuXG4gIGxvZy5pbmZvKCdzZW5kIG1haWwnKTtcbiAgY29uc3QgaW5mbyA9IGF3YWl0IHRyYW5zcG9ydGVyLnNlbmRNYWlsKHtcbiAgICBmcm9tOiBFTUFJTCxcbiAgICB0bzogRU1BSUwsXG4gICAgc3ViamVjdDogYGJ1aWxkIGFydGlmYWN0OiAke3N1YmplY3R9YCxcbiAgICB0ZXh0LFxuICAgIGF0dGFjaG1lbnRzOiBmaWxlID8gW1xuICAgICAge1xuICAgICAgICBmaWxlbmFtZTogUGF0aC5iYXNlbmFtZShmaWxlKSxcbiAgICAgICAgcGF0aDogUGF0aC5yZXNvbHZlKGZpbGUpXG4gICAgICB9XG4gICAgXSA6IHVuZGVmaW5lZFxuICB9KTtcblxuICBsb2cuaW5mbyhpbmZvKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJldHJ5U2VuZE1haWwoc3ViamVjdDogc3RyaW5nLCB0ZXh0OiBzdHJpbmcsIGZpbGU/OiBzdHJpbmcpIHtcbiAgbGV0IGVycm9yOiBFcnJvciB8IHVuZGVmaW5lZDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgc2VuZE1haWwoc3ViamVjdCwgdGV4dCwgZmlsZSk7XG4gICAgICBlcnJvciA9IHVuZGVmaW5lZDtcbiAgICAgIGJyZWFrO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgbG9nLmluZm8oJ0dvdCBlcnJvcicsIGVycik7XG4gICAgICBlcnJvciA9IGVycjtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDAwKSk7XG4gICAgfVxuICB9XG4gIGlmIChlcnJvcikge1xuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW1hcEZldGNoRGF0YSB7XG4gIGhlYWRlcnM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmdbXSB8IHVuZGVmaW5lZH07XG4gIHRleHRzOiBzdHJpbmdbXTtcbiAgZmlsZXM6IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEltYXBDb21tYW5kQ29udGV4dCB7XG4gIC8qKlxuICAgKiBJbmRleCBvZiBsYXRlc3QgbWFpbFxuICAgKi9cbiAgbGFzdEluZGV4OiBudW1iZXI7XG4gIGZpbGVXcml0aW5nU3RhdGU6IE9ic2VydmFibGU8Ym9vbGVhbj47XG4gIHdhaXRGb3JSZXBseTxSID0gYW55Pihjb21tYW5kPzogc3RyaW5nLFxuICAgIG9uTGluZT86IChsYTogTG9va0FoZWFkPFRva2VuPEltYXBUb2tlblR5cGU+PiwgdGFnOiBzdHJpbmcpID0+IFByb21pc2U8Uj4pOiBQcm9taXNlPFIgfCBudWxsPjtcbiAgZmluZE1haWwoZnJvbUluZHg6IG51bWJlciwgc3ViamVjdDogc3RyaW5nKTogUHJvbWlzZTxudW1iZXIgfCB1bmRlZmluZWQ+O1xuICB3YWl0Rm9yRmV0Y2gobWFpbElkeDogc3RyaW5nIHwgbnVtYmVyLCBoZWFkZXJPbmx5PzogYm9vbGVhbiwgb3ZlcnJpZGVGaWxlTmFtZT86IHN0cmluZyk6IFByb21pc2U8SW1hcEZldGNoRGF0YT47XG4gIHdhaXRGb3JGZXRjaFRleHQoaW5kZXg6IG51bWJlcik6IFByb21pc2U8c3RyaW5nIHwgdW5kZWZpbmVkPjtcbiAgYXBwZW5kTWFpbChzdWJqZWN0OiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyk6IFByb21pc2U8dm9pZHxudWxsPjtcbn1cblxuLyoqXG4gKiBJTUFQIHNwZWNpZmljYXRpb25cbiAqIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMxNzMwXG4gKiBcbiAqIElEIGNvbW1hbmRcbiAqIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMyOTcxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb25uZWN0SW1hcChjYWxsYmFjazogKGNvbnRleHQ6IEltYXBDb21tYW5kQ29udGV4dCkgPT4gUHJvbWlzZTxhbnk+KSB7XG5cbiAgbGV0IGxvZ0VuYWJsZWQgPSB0cnVlO1xuICBsZXQgY21kSWR4ID0gMTtcbiAgY29uc3QgZmlsZVdyaXRpbmdTdGF0ZSA9IG5ldyBCZWhhdmlvclN1YmplY3Q8U2V0PHN0cmluZz4+KG5ldyBTZXQ8c3RyaW5nPigpKTtcblxuICBpZiAoIXNldHRpbmcuZmV0Y2hNYWlsU2VydmVyKSB7XG4gICAgbG9nLndhcm4oJ2ZldGNoTWFpbFNlcnZlciBpcyBub3QgY29uZmlndXJlZCEgU2tpcCBzZW5kTWFpbCcpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCB7XG4gICAgICB1c2VyOiBFTUFJTCxcbiAgICAgIGxvZ2luU2VjcmV0OiBTRUNSRVQsXG4gICAgICBpbWFwOiBJTUFQXG4gICAgICAvLyBzbXRwOiBTTVRQXG4gIH0gPSBzZXR0aW5nLmZldGNoTWFpbFNlcnZlcjtcblxuICBjb25zdCBjb250ZXh0OiB7W2sgaW4ga2V5b2YgSW1hcENvbW1hbmRDb250ZXh0XT86IEltYXBDb21tYW5kQ29udGV4dFtrXX0gPSB7fTtcblxuICBjb250ZXh0LndhaXRGb3JSZXBseSA9IHdhaXRGb3JSZXBseTtcbiAgY29udGV4dC53YWl0Rm9yRmV0Y2ggPSB3YWl0Rm9yRmV0Y2g7XG4gIGNvbnRleHQud2FpdEZvckZldGNoVGV4dCA9IHdhaXRGb3JGZXRjaFRleHQ7XG4gIGNvbnRleHQuZmluZE1haWwgPSBmaW5kTWFpbDtcbiAgY29udGV4dC5maWxlV3JpdGluZ1N0YXRlID0gZmlsZVdyaXRpbmdTdGF0ZS5waXBlKFxuICAgIG1hcChmaWxlU2V0ID0+IHtcbiAgICAgIC8vIGxvZy53YXJuKCd3cml0aW5nOiAnLCBmaWxlU2V0LnZhbHVlcygpKTtcbiAgICAgIHJldHVybiBmaWxlU2V0LnNpemUgPiAwO1xuICAgIH0pLFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKClcbiAgKTtcblxuICBjb250ZXh0LmFwcGVuZE1haWwgPSAoc3ViamVjdDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBtYWlsQm9keSA9IGBEYXRlOiBNb24sIDcgRmViIDIwMjAgMjE6NTI6MjUgLTA4MDAgKFBTVClcbiAgICAgIEZyb206IENyZWRpdCB0ZWFtIGJ1aWxkIG1hY2hpbmVcbiAgICAgIFN1YmplY3Q6ICR7c3ViamVjdH1cbiAgICAgIFRvOiBBZG1pbmluc3RyYXRvclxuICAgICAgTWVzc2FnZS1JZDogPEIyNzM5Ny0wMTAwMDAwQEJsdXJkeWJsb29wLkNPTT5cbiAgICAgIE1JTUUtVmVyc2lvbjogMS4wXG4gICAgICBDb250ZW50LVR5cGU6IFRFWFQvUExBSU47IENIQVJTRVQ9VVMtQVNDSUlcbiAgICAgIFxuICAgICAgJHtjb250ZW50fVxuICAgICAgYC5yZXBsYWNlKC9eWyBdKy9tZywgJycpLnJlcGxhY2UoL1xcci9nLCAnJykucmVwbGFjZSgvXFxuL2csICdcXHJcXG4nKTtcbiAgICByZXR1cm4gd2FpdEZvclJlcGx5KGBBUFBFTkQgSU5CT1ggeyR7bWFpbEJvZHkubGVuZ3RofX1cXHJcXG5gICsgbWFpbEJvZHkpO1xuICB9O1xuXG4gIGNvbnN0IHNlcnZlclJlc0hhbmRsZXIgPSBjcmVhdGVTZXJ2ZXJEYXRhSGFuZGxlcigpO1xuICBzZXJ2ZXJSZXNIYW5kbGVyLm91dHB1dC5waXBlKFxuICAgIHRhcChtc2cgPT4ge1xuICAgICAgaWYgKG1zZyAhPSBudWxsKVxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZygnICA8LSAnICsgbXNnLm1hcCh0b2tlbiA9PiB0b2tlbi50ZXh0KS5qb2luKCcgJykpO1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG5cbiAgbGV0IHNvY2tldDogVExTU29ja2V0fHVuZGVmaW5lZDtcbiAgdHJ5IHtcbiAgICBzb2NrZXQgPSBhd2FpdCBuZXcgUHJvbWlzZTxSZXR1cm5UeXBlPHR5cGVvZiB0c2xDb25uZWN0Pj4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3Qgc29ja2V0ID0gdHNsQ29ubmVjdCh7XG4gICAgICAgIGhvc3Q6IElNQVAsIHBvcnQ6IDk5MyxcbiAgICAgICAgZW5hYmxlVHJhY2U6IHRydWVcbiAgICAgIH0gYXMgQ29ubmVjdGlvbk9wdGlvbnMpO1xuXG4gICAgICBzb2NrZXQub24oJ3NlY3VyZUNvbm5lY3QnLCAoKSA9PiB7XG4gICAgICAgIGxvZy5pbmZvKCdjb25uZWN0ZWQnLCBzb2NrZXQuYXV0aG9yaXplZCA/ICdhdXRob3JpemVkJyA6ICd1bmF1dGhvcml6ZWQnKTtcbiAgICAgICAgcmVzb2x2ZShzb2NrZXQpO1xuICAgICAgfSlcbiAgICAgIC5vbignZXJyb3InLCBlcnIgPT4gcmVqZWN0KGVycikpXG4gICAgICAub24oJ3RpbWVvdXQnLCAoKSA9PiByZWplY3QobmV3IEVycm9yKCdUaW1lb3V0JykpKTtcbiAgICAgIHNvY2tldC5vbignZGF0YScsIChkYXRhOiBCdWZmZXIpID0+IHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coZGF0YS50b1N0cmluZygpKTtcbiAgICAgICAgc2VydmVyUmVzSGFuZGxlci5pbnB1dChkYXRhKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgd2FpdEZvclJlcGx5KCk7XG4gICAgYXdhaXQgd2FpdEZvclJlcGx5KCdJRCAoXCJuYW1lXCIgXCJjb20udGVuY2VudC5mb3htYWlsXCIgXCJ2ZXJzaW9uXCIgXCI3LjIuOS43OVwiKScpO1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseShgTE9HSU4gJHtFTUFJTH0gJHtTRUNSRVR9YCk7XG4gICAgYXdhaXQgd2FpdEZvclJlcGx5KCdTRUxFQ1QgSU5CT1gnLCBhc3luYyBsYSA9PiB7XG4gICAgICBjb25zdCBleGl0c1RrID0gYXdhaXQgbGEubGEoMyk7XG4gICAgICBpZiAoZXhpdHNUayAmJiBleGl0c1RrLnRleHQudG9VcHBlckNhc2UoKSA9PT0gJ0VYSVNUUycpIHtcbiAgICAgICAgY29udGV4dC5sYXN0SW5kZXggPSBwYXJzZUludCgoYXdhaXQgbGEubGEoMikpIS50ZXh0LCAxMCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgLy8gYXdhaXQgd2FpdEZvclJlcGx5KCdTRUFSQ0ggQUxMJyk7XG5cbiAgICBhd2FpdCBjYWxsYmFjayhjb250ZXh0IGFzIEltYXBDb21tYW5kQ29udGV4dCk7XG4gICAgYXdhaXQgd2FpdEZvclJlcGx5KCdMT0dPVVQnKTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICBsb2cuZXJyb3IoZXgpO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoJ0xPR09VVCcpO1xuICAgIH0gY2F0Y2ggKGVyKSB7fVxuICAgIGlmIChzb2NrZXQpXG4gICAgICBzb2NrZXQuZW5kKCk7XG4gICAgdGhyb3cgZXg7XG4gIH1cblxuICBzZXJ2ZXJSZXNIYW5kbGVyLmlucHV0KG51bGwpO1xuICBzb2NrZXQuZW5kKCk7XG5cbiAgYXN5bmMgZnVuY3Rpb24gd2FpdEZvckZldGNoVGV4dChpbmRleDogbnVtYmVyKSB7XG4gICAgbGV0IGJvZHkxOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgYXdhaXQgd2FpdEZvclJlcGx5KGBGRVRDSCAke2luZGV4fSBCT0RZWzFdYCwgYXN5bmMgbGEgPT4ge1xuICAgICAgd2hpbGUgKChhd2FpdCBsYS5sYSgpKSAhPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IHRva2VuID0gYXdhaXQgbGEuYWR2YW5jZSgpO1xuICAgICAgICBpZiAodG9rZW4udGV4dCA9PT0gJ0JPRFknICYmIChhd2FpdCBsYS5sYSgpKSEudGV4dCA9PT0gJ1sxXScpIHtcbiAgICAgICAgICBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgICAgICAgYm9keTEgPSAoKGF3YWl0IGxhLmFkdmFuY2UoKSkgYXMgdW5rbm93biBhcyBTdHJpbmdMaXQpLmRhdGEudG9TdHJpbmcoJ3V0ZjgnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gbG9nLndhcm4oYnVmKTtcbiAgICAvLyByZXR1cm4gL15cXCpcXHMrXFxkK1xccytGRVRDSFxccytcXCguKj9cXHtcXGQrXFx9KFteXSopXFwpJC9tLmV4ZWMoYnVmKSFbMV07XG4gICAgcmV0dXJuIGJvZHkxO1xuICB9XG5cbiAgZnVuY3Rpb24gd2FpdEZvclJlcGx5PFIgPSBhbnk+KGNvbW1hbmQ/OiBzdHJpbmcsIG9uTGluZT86IChsYTogTG9va0FoZWFkPFRva2VuPEltYXBUb2tlblR5cGU+PiwgdGFnOiBzdHJpbmcpID0+IFByb21pc2U8Uj4pOiBQcm9taXNlPFIgfCBudWxsPiB7XG4gICAgbGV0IHRhZzogc3RyaW5nO1xuICAgIGlmIChjb21tYW5kKVxuICAgICAgdGFnID0gJ2EnICsgKGNtZElkeCsrKTtcblxuICAgIGxldCByZXN1bHQ6IFIgfCBudWxsID0gbnVsbDtcbiAgICBjb25zdCBwcm9tID0gcGFyc2VMaW5lc09mVG9rZW5zKHNlcnZlclJlc0hhbmRsZXIub3V0cHV0LCBhc3luYyBsYSA9PiB7XG4gICAgICBjb25zdCByZXNUYWcgPSBhd2FpdCBsYS5sYSgpO1xuICAgICAgaWYgKCF0YWcgJiYgcmVzVGFnIS50ZXh0ID09PSAnKicgfHwgcmVzVGFnIS50ZXh0ID09PSB0YWcpIHtcbiAgICAgICAgYXdhaXQgbGEuYWR2YW5jZSgpO1xuICAgICAgICBjb25zdCBzdGF0ZSA9IGF3YWl0IGxhLmxhKCk7XG4gICAgICAgIGxldCByZXR1cm5UZXh0ID0gJyc7XG4gICAgICAgIGlmICgvT0t8Tk8vLnRlc3Qoc3RhdGUhLnRleHQpKSB7XG4gICAgICAgICAgcmV0dXJuVGV4dCArPSAoYXdhaXQgbGEuYWR2YW5jZSgpKS50ZXh0O1xuICAgICAgICAgIHdoaWxlICgoYXdhaXQgbGEubGEoKSkgIT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuVGV4dCArPSAnICcgKyAoYXdhaXQgbGEuYWR2YW5jZSgpKS50ZXh0O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0dXJuVGV4dDtcbiAgICAgIH0gZWxzZSBpZiAob25MaW5lKSB7XG4gICAgICAgIHJlc3VsdCA9IGF3YWl0IG9uTGluZShsYSwgdGFnKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmIChjb21tYW5kKSB7XG4gICAgICBjb25zdCBjbWQgPSB0YWchICsgJyAnICsgY29tbWFuZDtcbiAgICAgIGlmIChzb2NrZXQpXG4gICAgICAgIHNvY2tldC53cml0ZShCdWZmZXIuZnJvbShgJHt0YWchfSAke2NvbW1hbmR9XFxyXFxuYCwgJ3V0ZjgnKSk7XG4gICAgICBsb2cuZGVidWcoJz0+JywgY21kKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJvbS50aGVuKCgpID0+IHJlc3VsdCk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiB3YWl0Rm9yRmV0Y2gobWFpbElkeDogc3RyaW5nIHwgbnVtYmVyID0gJyonLCBoZWFkZXJPbmx5ID0gdHJ1ZSwgb3ZlcnJpZGVGaWxlTmFtZT86IHN0cmluZyk6IFByb21pc2U8SW1hcEZldGNoRGF0YT4ge1xuICAgIGNvbnN0IG9yaWdpbkxvZ0VuYWJsZWQgPSBsb2dFbmFibGVkO1xuICAgIGxvZ0VuYWJsZWQgPSBoZWFkZXJPbmx5O1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHdhaXRGb3JSZXBseShgRkVUQ0ggJHttYWlsSWR4fSBSRkM4MjIke2hlYWRlck9ubHkgPyAnLkhFQURFUicgOiAnJ31gLCBhc3luYyAobGEpID0+IHtcbiAgICAgIGxldCBtc2c6IFJDRjgyMlBhcnNlUmVzdWx0IHwgdW5kZWZpbmVkO1xuICAgICAgd2hpbGUgKChhd2FpdCBsYS5sYSgpKSAhPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IHRrID0gYXdhaXQgbGEuYWR2YW5jZSgpO1xuICAgICAgICBpZiAodGsudHlwZSAhPT0gSW1hcFRva2VuVHlwZS5zdHJpbmdMaXQpIHtcbiAgICAgICAgICAvLyBsb2cuZGVidWcodGsudGV4dCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gbG9nLmRlYnVnKCdzdHJpbmcgbGl0ZXJhbDpcXG4nLCAodGsgYXMgdW5rbm93biBhcyBTdHJpbmdMaXQpLmRhdGEuYnl0ZUxlbmd0aCk7XG4gICAgICAgICAgLy8gY29uc3Qgd3JpdHRlbkZpbGUgPSBgZW1haWwtJHtuZXcgRGF0ZSgpLmdldFRpbWUoKX0udHh0YDtcbiAgICAgICAgICAvLyBmcy53cml0ZUZpbGVTeW5jKHdyaXR0ZW5GaWxlLCAodGsgYXMgdW5rbm93biBhcyBTdHJpbmdMaXQpLmRhdGEsICd1dGY4Jyk7XG4gICAgICAgICAgLy8gbG9nLmRlYnVnKGB3cml0ZW4gdG8gJHt3cml0dGVuRmlsZX1gKTtcbiAgICAgICAgICBtc2cgPSBwYXJzZVJmYzgyMigodGsgYXMgU3RyaW5nTGl0KS5kYXRhKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaGVhZGVyczogbXNnID8gbXNnLmhlYWRlcnMucmVkdWNlKChwcmV2LCBjdXJyKSA9PiB7XG4gICAgICAgICAgcHJldltjdXJyLmtleS50b0xvd2VyQ2FzZSgpXSA9IGN1cnIudmFsdWU7XG4gICAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgICAgIH0sIHt9IGFzIEltYXBGZXRjaERhdGFbJ2hlYWRlcnMnXSkgOiB7fSxcbiAgICAgICAgdGV4dHM6IG1zZyA/IG1zZy5wYXJ0cy5maWx0ZXIocGFydCA9PiBwYXJ0LmJvZHkgIT0gbnVsbCkubWFwKHBhcnQgPT4gcGFydC5ib2R5IS50b1N0cmluZygpKSA6IFtdLFxuICAgICAgICBmaWxlczogbXNnID8gbXNnLnBhcnRzLmZpbHRlcihwYXJ0ID0+IHBhcnQuZmlsZSAhPSBudWxsKS5tYXAocGFydCA9PiBwYXJ0LmZpbGUhKSA6IFtdXG4gICAgICB9IGFzIEltYXBGZXRjaERhdGE7XG4gICAgfSk7XG4gICAgbG9nRW5hYmxlZCA9IG9yaWdpbkxvZ0VuYWJsZWQ7XG5cbiAgICBpZiAob3ZlcnJpZGVGaWxlTmFtZSAmJiByZXN1bHQhLmZpbGVzWzBdKSB7XG4gICAgICBmcy5yZW5hbWVTeW5jKHJlc3VsdCEuZmlsZXNbMF0sIG92ZXJyaWRlRmlsZU5hbWUpO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQhO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gZmluZE1haWwoZnJvbUluZHg6IG51bWJlciwgc3ViamVjdDogc3RyaW5nKTogUHJvbWlzZTxudW1iZXIgfCB1bmRlZmluZWQ+IHtcbiAgICBsb2cuaW5mbygnZmluZE1haWwnLCBmcm9tSW5keCwgc3ViamVjdCk7XG4gICAgd2hpbGUgKGZyb21JbmR4ID4gMCkge1xuICAgICAgY29uc3QgcmVzID0gYXdhaXQgd2FpdEZvckZldGNoKGZyb21JbmR4KTtcbiAgICAgIGlmIChyZXMuaGVhZGVycy5zdWJqZWN0KSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhyZXMuaGVhZGVycy5zdWJqZWN0KTtcbiAgICAgIH1cbiAgICAgIGlmIChyZXMuaGVhZGVycy5zdWJqZWN0ICYmIHJlcy5oZWFkZXJzLnN1YmplY3RbMF0uaW5kZXhPZihzdWJqZWN0KSA+PSAwKVxuICAgICAgICByZXR1cm4gZnJvbUluZHg7XG4gICAgICBmcm9tSW5keC0tO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBJbWFwTWFuYWdlciB7XG4gIGNoZWNrc3VtU3RhdGUgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PENoZWNrc3VtIHwgbnVsbD4obnVsbCk7XG4gIGZpbGVXcml0aW5nU3RhdGU6IEltYXBDb21tYW5kQ29udGV4dFsnZmlsZVdyaXRpbmdTdGF0ZSddO1xuICB3YXRjaGluZyA9IGZhbHNlO1xuICBwcml2YXRlIHRvRmV0Y2hBcHBzU3RhdGUgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PHN0cmluZ1tdPihbXSk7XG5cbiAgcHJpdmF0ZSBjdHg/OiBJbWFwQ29tbWFuZENvbnRleHQ7XG5cbiAgY29uc3RydWN0b3IocHVibGljIGVudjogc3RyaW5nLCBwdWJsaWMgemlwRG93bmxvYWREaXI/OiBzdHJpbmcpIHtcbiAgICBpZiAoemlwRG93bmxvYWREaXIgPT0gbnVsbClcbiAgICAgIHRoaXMuemlwRG93bmxvYWREaXIgPSBQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGN1cnJDaGVja3N1bUZpbGUpLCAnZGVwbG95LXN0YXRpYy0nICsgZW52KTtcbiAgfVxuXG4gIGFzeW5jIGZldGNoQ2hlY2tzdW0oKSB7XG4gIC8vICAgbGV0IGNzOiBDaGVja3N1bSB8IHVuZGVmaW5lZDtcbiAgLy8gICBhd2FpdCBjb25uZWN0SW1hcChhc3luYyBjdHggPT4ge1xuICAvLyAgICAgY3MgPSBhd2FpdCB0aGlzLl9mZXRjaENoZWNrc3VtKGN0eCk7XG4gIC8vICAgfSk7XG4gIC8vICAgbG9nLmluZm8oJ2ZldGNoZWQgY2hlY2tzdW06JywgY3MpO1xuICAvLyAgIHRoaXMuY2hlY2tzdW1TdGF0ZS5uZXh0KGNzISk7XG4gIC8vICAgcmV0dXJuIGNzO1xuICB9XG5cbiAgYXN5bmMgZmV0Y2hVcGRhdGVDaGVja1N1bShhcHBOYW1lOiBzdHJpbmcpIHtcbiAgLy8gICBsZXQgY3MgPSBhd2FpdCB0aGlzLmZldGNoQ2hlY2tzdW0oKTtcbiAgLy8gICBsb2cuaW5mbygnZmV0Y2hlZCBjaGVja3N1bTonLCBjcyk7XG4gIC8vICAgaWYgKGNzIS52ZXJzaW9ucyFbYXBwTmFtZV0gPT0gbnVsbCkge1xuICAvLyAgICAgY3MhLnZlcnNpb25zIVthcHBOYW1lXSA9IHtcbiAgLy8gICAgICAgdmVyc2lvbjogMCxcbiAgLy8gICAgICAgcGF0aDogJzxzZWUgYXR0YWNoZW1lbnQgZmlsZSBuYW1lPidcbiAgLy8gICAgIH07XG4gIC8vICAgfVxuICAvLyAgIGNzIS52ZXJzaW9ucyFbYXBwTmFtZV0udmVyc2lvbisrO1xuICAvLyAgIHRoaXMuY2hlY2tzdW1TdGF0ZS5uZXh0KGNzISk7XG4gIC8vICAgZnMubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUoY3VyckNoZWNrc3VtRmlsZSkpO1xuICAvLyAgIGNvbnN0IGNoZWNrc3VtU3RyID0gSlNPTi5zdHJpbmdpZnkoY3MhLCBudWxsLCAnICAnKTtcbiAgLy8gICBmcy53cml0ZUZpbGVTeW5jKGN1cnJDaGVja3N1bUZpbGUsIGNoZWNrc3VtU3RyKTtcbiAgLy8gICBsb2cuaW5mbygnd3JpdGUgJXNcXG4lcycsIGN1cnJDaGVja3N1bUZpbGUsIGNoZWNrc3VtU3RyKTtcbiAgLy8gICByZXR1cm4gY3MhO1xuICB9XG5cbiAgLyoqXG4gICAqIERvbmUgd2hlbiBmaWxlcyBhcmUgd3JpdHRlblxuICAgKiBAcGFyYW0gZXhjbHVkZUFwcCBleGNsdWRlIGFwcFxuICAgKi9cbiAgYXN5bmMgZmV0Y2hPdGhlclppcHMoZXhjbHVkZUFwcD86IHN0cmluZykge1xuICAvLyAgIGxldCBhcHBOYW1lcyA9IE9iamVjdC5rZXlzKHRoaXMuY2hlY2tzdW1TdGF0ZS5nZXRWYWx1ZSgpIS52ZXJzaW9ucyEpXG4gIC8vICAgLmZpbHRlcihhcHAgPT4gYXBwICE9PSBleGNsdWRlQXBwKTtcblxuICAvLyAgIGxldCBmaWxlV3JpdHRlblByb206IFByb21pc2U8Ym9vbGVhbj4gfCB1bmRlZmluZWQ7XG5cbiAgLy8gICBhd2FpdCBjb25uZWN0SW1hcChhc3luYyBjdHggPT4ge1xuXG4gIC8vICAgICBmaWxlV3JpdHRlblByb20gPSBjdHguZmlsZVdyaXRpbmdTdGF0ZS5waXBlKFxuICAvLyAgICAgICBza2lwKDEpLFxuICAvLyAgICAgICBmaWx0ZXIod3JpdGluZyA9PiAhd3JpdGluZyksXG4gIC8vICAgICAgIHRha2UoYXBwTmFtZXMubGVuZ3RoKVxuICAvLyAgICAgKS50b1Byb21pc2UoKTtcblxuICAvLyAgICAgZm9yIChjb25zdCBhcHAgb2YgYXBwTmFtZXMpIHtcbiAgLy8gICAgICAgbG9nLmluZm8oJ2ZldGNoIG90aGVyIHppcDogJyArIGFwcCk7XG4gIC8vICAgICAgIGNvbnN0IGlkeCA9IGF3YWl0IGN0eC5maW5kTWFpbChjdHgubGFzdEluZGV4LCBgYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tJHthcHB9KWApO1xuICAvLyAgICAgICBpZiAoIWlkeCkge1xuICAvLyAgICAgICAgIGxvZy5pbmZvKGBtYWlsIFwiYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tJHthcHB9KVwiIGlzIG5vdCBGb3VuZCwgc2tpcCBkb3dubG9hZCB6aXBgKTtcbiAgLy8gICAgICAgICBjb250aW51ZTtcbiAgLy8gICAgICAgfVxuICAvLyAgICAgICBhd2FpdCBjdHgud2FpdEZvckZldGNoKGlkeCwgZmFsc2UsIFBhdGgucmVzb2x2ZSh0aGlzLnppcERvd25sb2FkRGlyISwgYXBwICsgJy56aXAnKSk7XG4gIC8vICAgICB9XG4gIC8vICAgfSk7XG4gIC8vICAgaWYgKGZpbGVXcml0dGVuUHJvbSlcbiAgLy8gICAgIGF3YWl0IGZpbGVXcml0dGVuUHJvbTtcbiAgLy8gICByZXR1cm4gYXBwTmFtZXM7XG4gIH1cblxuICBhc3luYyBhcHBlbmRNYWlsKHN1YmplY3Q6IHN0cmluZywgY29udGVudDogc3RyaW5nKSB7XG4gICAgYXdhaXQgY29ubmVjdEltYXAoYXN5bmMgY3R4ID0+IHtcbiAgICAgIGF3YWl0IGN0eC5hcHBlbmRNYWlsKHN1YmplY3QsIGNvbnRlbnQpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gYXN5bmMgc3RhcnRXYXRjaE1haWwocG9sbEludGVydmFsID0gNjAwMDApIHtcbiAgLy8gICB0aGlzLndhdGNoaW5nID0gdHJ1ZTtcbiAgLy8gICB3aGlsZSAodGhpcy53YXRjaGluZykge1xuICAvLyAgICAgYXdhaXQgdGhpcy5jaGVja01haWxGb3JVcGRhdGUoKTtcbiAgLy8gICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBwb2xsSW50ZXJ2YWwpKTsgLy8gNjAgc2VjXG4gIC8vICAgfVxuICAvLyB9XG5cbiAgYXN5bmMgY2hlY2tNYWlsRm9yVXBkYXRlKCkge1xuICAgIGF3YWl0IGNvbm5lY3RJbWFwKGFzeW5jIGN0eCA9PiB7XG4gICAgICB0aGlzLmN0eCA9IGN0eDtcbiAgICAgIHRoaXMuZmlsZVdyaXRpbmdTdGF0ZSA9IGN0eC5maWxlV3JpdGluZ1N0YXRlO1xuXG4gICAgICBjb25zdCBjcyA9IGF3YWl0IHRoaXMuX2ZldGNoQ2hlY2tzdW0oY3R4KTtcbiAgICAgIHRoaXMuY2hlY2tzdW1TdGF0ZS5uZXh0KGNzISk7XG5cbiAgICAgIGNvbnN0IHRvRmV0Y2hBcHBzID0gdGhpcy50b0ZldGNoQXBwc1N0YXRlLmdldFZhbHVlKCk7XG4gICAgICBpZiAodG9GZXRjaEFwcHMubGVuZ3RoID4gMCkge1xuICAgICAgICB0aGlzLnRvRmV0Y2hBcHBzU3RhdGUubmV4dChbXSk7XG4gICAgICAgIGZvciAoY29uc3QgYXBwTmFtZSBvZiB0b0ZldGNoQXBwcykge1xuICAgICAgICAgIGF3YWl0IHRoaXMuZmV0Y2hBdHRhY2htZW50KGFwcE5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBhd2FpdCBjdHgud2FpdEZvclJlcGx5KCdTVUJTQ1JJQkUgSU5CT1gnKTtcbiAgICAgIC8vIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAzMDAwMCkpOyAvLyAzMCBzZWNcbiAgICAgIGRlbGV0ZSB0aGlzLmN0eDtcbiAgICB9KTtcbiAgfVxuXG4gIGZldGNoQXBwRHVyaW5nV2F0Y2hBY3Rpb24oLi4uYXBwTmFtZXM6IHN0cmluZ1tdKSB7XG4gICAgdGhpcy50b0ZldGNoQXBwc1N0YXRlLm5leHQoYXBwTmFtZXMpO1xuICB9XG5cbiAgLy8gYXN5bmMgc2VuZEZpbGVBbmRVcGRhdGVkQ2hlY2tzdW0oYXBwTmFtZTogc3RyaW5nLCBmaWxlOiBzdHJpbmcpIHtcbiAgLy8gICBjb25zdCBjcyA9IGF3YWl0IHRoaXMuZmV0Y2hVcGRhdGVDaGVja1N1bShhcHBOYW1lKTtcbiAgLy8gICBhd2FpdCByZXRyeVNlbmRNYWlsKGBia2prLXByZS1idWlsZCgke3RoaXMuZW52fS0ke2FwcE5hbWV9KWAsIEpTT04uc3RyaW5naWZ5KGNzLCBudWxsLCAnICAnKSwgZmlsZSk7XG4gIC8vIH1cblxuICBzdG9wV2F0Y2goKSB7XG4gICAgdGhpcy53YXRjaGluZyA9IGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBmZXRjaEF0dGFjaG1lbnQoYXBwOiBzdHJpbmcpIHtcbiAgICAvLyBjb25zdCBpZHggPSBhd2FpdCB0aGlzLmN0eC5maW5kTWFpbCh0aGlzLmN0eC5sYXN0SW5kZXgsIGBia2prLXByZS1idWlsZCgke3RoaXMuZW52fS0ke2FwcH0pYCk7XG4gICAgLy8gaWYgKGlkeCA9PSBudWxsKVxuICAgIC8vICAgdGhyb3cgbmV3IEVycm9yKCdDYW50IGZpbmQgbWFpbDogJyArIGBia2prLXByZS1idWlsZCgke3RoaXMuZW52fS0ke2FwcH0pYCk7XG4gICAgLy8gYXdhaXQgdGhpcy5jdHgud2FpdEZvckZldGNoKGlkeCEsIGZhbHNlLCBQYXRoLnJlc29sdmUodGhpcy56aXBEb3dubG9hZERpciEsIGAke2FwcH0uemlwYCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBfZmV0Y2hDaGVja3N1bShjdHg6IEltYXBDb21tYW5kQ29udGV4dCkge1xuICAgIGNvbnN0IGlkeCA9IGF3YWl0IGN0eC5maW5kTWFpbChjdHgubGFzdEluZGV4LCBgYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tYCk7XG4gICAgbG9nLmluZm8oJ19mZXRjaENoZWNrc3VtLCBpbmRleDonLCBpZHgpO1xuICAgIGlmIChpZHggPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zdCBqc29uU3RyID0gYXdhaXQgY3R4LndhaXRGb3JGZXRjaFRleHQoaWR4ISk7XG4gICAgaWYgKGpzb25TdHIgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdFbXB0eSBKU09OIHRleHQnKTtcbiAgICB9XG4gICAgcmV0dXJuIEpTT04ucGFyc2UoanNvblN0cikgYXMgQ2hlY2tzdW07XG4gIH1cblxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdGVzdE1haWwoaW1hcDogc3RyaW5nLCB1c2VyOiBzdHJpbmcsIGxvZ2luU2VjcmV0OiBzdHJpbmcpIHtcbiAgbG9nLmRlYnVnID0gbG9nLmluZm87XG4gIGlmIChpbWFwKVxuICAgIGFwaS5jb25maWcuc2V0KFthcGkucGFja2FnZU5hbWUsICdmZXRjaE1haWxTZXJ2ZXInXSwge1xuICAgICAgaW1hcCwgdXNlciwgbG9naW5TZWNyZXRcbiAgICB9IGFzIFdpdGhNYWlsU2VydmVyQ29uZmlnWydmZXRjaE1haWxTZXJ2ZXInXSk7XG4gIGF3YWl0IGNvbm5lY3RJbWFwKGFzeW5jIGN0eCA9PiB7XG4gICAgYXdhaXQgY3R4LndhaXRGb3JSZXBseSgnU0VBUkNIIEhFQUQgU3ViamVjdCBcImJ1aWxkIGFydGlmYWN0OiBia2prLXByZS1idWlsZFwiJyk7XG4gIH0pO1xufVxuIl19