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
            __api_1.default.config.set([__api_1.default.packageName, 'fetchMailServer'], {
                imap, user, loginSecret
            });
        yield connectImap((ctx) => __awaiter(this, void 0, void 0, function* () {
            yield ctx.waitForReply('SEARCH HEAD Subject "build artifact: bkjk-pre-build"');
        }));
    });
}
exports.testMail = testMail;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmV0Y2gtcmVtb3RlLWltYXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmZXRjaC1yZW1vdGUtaW1hcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkM7QUFFN0MsK0JBQWtEO0FBQ2xELDhDQUV3QjtBQUN4Qiw2QkFBMEU7QUFDMUUsd0RBQTBCO0FBRTFCLGdEQUF3QjtBQUV4Qiw0REFBNkc7QUFDN0csa0RBQXdCO0FBRXhCLGtFQUFrRjtBQUVsRiw4QkFBOEI7QUFDOUIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLG9CQUFvQixDQUFDLENBQUM7QUFFaEYsTUFBTSxPQUFPLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBeUIsQ0FBQztBQUN4RSxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBRzVFLE1BQU0sZ0JBQWdCLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEdBQUcsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDO0FBRXpHLFNBQXNCLFFBQVEsQ0FBQyxPQUFlLEVBQUUsSUFBWSxFQUFFLElBQWE7O1FBQ3pFLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUU7WUFDNUIsR0FBRyxDQUFDLElBQUksQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO1lBQzdELE9BQU87U0FDUjtRQUNELE1BQU0sRUFDSixJQUFJLEVBQUUsS0FBSyxFQUNYLFdBQVcsRUFBRSxNQUFNO1FBQ25CLGNBQWM7UUFDZCxJQUFJLEVBQUUsSUFBSSxFQUNYLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQztRQUU1QixNQUFNLFdBQVcsR0FBRyxJQUFBLDRCQUFlLEVBQUM7WUFDbEMsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUU7Z0JBQ0osSUFBSSxFQUFFLE9BQU87Z0JBQ2IsSUFBSSxFQUFFLEtBQUs7Z0JBQ1gsSUFBSSxFQUFFLE1BQU07YUFDYjtZQUNELE1BQU0sRUFBRSxJQUFJO1NBQ1ksQ0FBQyxDQUFDO1FBRTVCLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDdEIsTUFBTSxJQUFJLEdBQUcsTUFBTSxXQUFXLENBQUMsUUFBUSxDQUFDO1lBQ3RDLElBQUksRUFBRSxLQUFLO1lBQ1gsRUFBRSxFQUFFLEtBQUs7WUFDVCxPQUFPLEVBQUUsbUJBQW1CLE9BQU8sRUFBRTtZQUNyQyxJQUFJO1lBQ0osV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ2xCO29CQUNFLFFBQVEsRUFBRSxjQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztvQkFDN0IsSUFBSSxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO2lCQUN6QjthQUNGLENBQUMsQ0FBQyxDQUFDLFNBQVM7U0FDZCxDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2pCLENBQUM7Q0FBQTtBQXRDRCw0QkFzQ0M7QUFFRCxTQUFzQixhQUFhLENBQUMsT0FBZSxFQUFFLElBQVksRUFBRSxJQUFhOztRQUM5RSxJQUFJLEtBQXdCLENBQUM7UUFDN0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMxQixJQUFJO2dCQUNGLE1BQU0sUUFBUSxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3BDLEtBQUssR0FBRyxTQUFTLENBQUM7Z0JBQ2xCLE1BQU07YUFDUDtZQUFDLE9BQU8sR0FBRyxFQUFFO2dCQUNaLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUMzQixLQUFLLEdBQUcsR0FBRyxDQUFDO2dCQUNaLE1BQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7YUFDekQ7U0FDRjtRQUNELElBQUksS0FBSyxFQUFFO1lBQ1QsTUFBTSxLQUFLLENBQUM7U0FDYjtJQUNILENBQUM7Q0FBQTtBQWhCRCxzQ0FnQkM7QUFzQkQ7Ozs7OztHQU1HO0FBQ0gsU0FBc0IsV0FBVyxDQUFDLFFBQXVEOztRQUV2RixJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDdEIsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ2YsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLHNCQUFlLENBQWMsSUFBSSxHQUFHLEVBQVUsQ0FBQyxDQUFDO1FBRTdFLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFO1lBQzVCLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0RBQWtELENBQUMsQ0FBQztZQUM3RCxPQUFPO1NBQ1I7UUFDRCxNQUFNLEVBQ0YsSUFBSSxFQUFFLEtBQUssRUFDWCxXQUFXLEVBQUUsTUFBTSxFQUNuQixJQUFJLEVBQUUsSUFBSTtRQUNWLGFBQWE7VUFDaEIsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDO1FBRTVCLE1BQU0sT0FBTyxHQUE4RCxFQUFFLENBQUM7UUFFOUUsT0FBTyxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7UUFDcEMsT0FBTyxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7UUFDcEMsT0FBTyxDQUFDLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDO1FBQzVDLE9BQU8sQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQzVCLE9BQU8sQ0FBQyxnQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQzlDLElBQUEsZUFBRyxFQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1osMkNBQTJDO1lBQzNDLE9BQU8sT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7UUFDMUIsQ0FBQyxDQUFDLEVBQ0YsSUFBQSxnQ0FBb0IsR0FBRSxDQUN2QixDQUFDO1FBRUYsT0FBTyxDQUFDLFVBQVUsR0FBRyxDQUFDLE9BQWUsRUFBRSxPQUFlLEVBQUUsRUFBRTtZQUN4RCxNQUFNLFFBQVEsR0FBRzs7aUJBRUosT0FBTzs7Ozs7O1FBTWhCLE9BQU87T0FDUixDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3JFLE9BQU8sWUFBWSxDQUFDLGlCQUFpQixRQUFRLENBQUMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLENBQUM7UUFDMUUsQ0FBQyxDQUFDO1FBRUYsTUFBTSxnQkFBZ0IsR0FBRyxJQUFBLHlDQUF1QixHQUFFLENBQUM7UUFDbkQsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FDMUIsSUFBQSxlQUFHLEVBQUMsR0FBRyxDQUFDLEVBQUU7WUFDUixJQUFJLEdBQUcsSUFBSSxJQUFJO2dCQUNiLHNDQUFzQztnQkFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNsRSxDQUFDLENBQUMsQ0FDSCxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBRWQsSUFBSSxNQUEyQixDQUFDO1FBQ2hDLElBQUk7WUFDRixNQUFNLEdBQUcsTUFBTSxJQUFJLE9BQU8sQ0FBZ0MsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQzVFLE1BQU0sTUFBTSxHQUFHLElBQUEsYUFBVSxFQUFDO29CQUN4QixJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHO29CQUNyQixXQUFXLEVBQUUsSUFBSTtpQkFDRyxDQUFDLENBQUM7Z0JBRXhCLE1BQU0sQ0FBQyxFQUFFLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtvQkFDOUIsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztvQkFDekUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNsQixDQUFDLENBQUM7cUJBQ0QsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztxQkFDL0IsRUFBRSxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNuRCxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQVksRUFBRSxFQUFFO29CQUNqQyxnQ0FBZ0M7b0JBQ2hDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDL0IsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztZQUVILE1BQU0sWUFBWSxFQUFFLENBQUM7WUFDckIsTUFBTSxZQUFZLENBQUMsd0RBQXdELENBQUMsQ0FBQztZQUM3RSxNQUFNLFlBQVksQ0FBQyxTQUFTLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQy9DLE1BQU0sWUFBWSxDQUFDLGNBQWMsRUFBRSxDQUFNLEVBQUUsRUFBQyxFQUFFO2dCQUM1QyxNQUFNLE9BQU8sR0FBRyxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQy9CLElBQUksT0FBTyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEtBQUssUUFBUSxFQUFFO29CQUN0RCxPQUFPLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztpQkFDMUQ7WUFDSCxDQUFDLENBQUEsQ0FBQyxDQUFDO1lBQ0gsb0NBQW9DO1lBRXBDLE1BQU0sUUFBUSxDQUFDLE9BQTZCLENBQUMsQ0FBQztZQUM5QyxNQUFNLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUM5QjtRQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ1gsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLElBQUk7Z0JBQ0YsTUFBTSxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDOUI7WUFBQyxPQUFPLEVBQUUsRUFBRSxHQUFFO1lBQ2YsSUFBSSxNQUFNO2dCQUNSLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNmLE1BQU0sRUFBRSxDQUFDO1NBQ1Y7UUFFRCxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBRWIsU0FBZSxnQkFBZ0IsQ0FBQyxLQUFhOztnQkFDM0MsSUFBSSxLQUF5QixDQUFDO2dCQUM5QixNQUFNLFlBQVksQ0FBQyxTQUFTLEtBQUssVUFBVSxFQUFFLENBQU0sRUFBRSxFQUFDLEVBQUU7b0JBQ3RELE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLElBQUksRUFBRTt3QkFDOUIsTUFBTSxLQUFLLEdBQUcsTUFBTSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7d0JBQ2pDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxNQUFNLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBRSxDQUFDLElBQUksS0FBSyxLQUFLLEVBQUU7NEJBQzVELE1BQU0sRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDOzRCQUNuQixLQUFLLEdBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBMEIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO3lCQUM5RTtxQkFDRjtnQkFDSCxDQUFDLENBQUEsQ0FBQyxDQUFDO2dCQUVILGlCQUFpQjtnQkFDakIscUVBQXFFO2dCQUNyRSxPQUFPLEtBQUssQ0FBQztZQUNmLENBQUM7U0FBQTtRQUVELFNBQVMsWUFBWSxDQUFVLE9BQWdCLEVBQUUsTUFBeUU7WUFDeEgsSUFBSSxHQUFXLENBQUM7WUFDaEIsSUFBSSxPQUFPO2dCQUNULEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBRXpCLElBQUksTUFBTSxHQUFhLElBQUksQ0FBQztZQUM1QixNQUFNLElBQUksR0FBRyxJQUFBLG9DQUFrQixFQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFNLEVBQUUsRUFBQyxFQUFFO2dCQUNsRSxNQUFNLE1BQU0sR0FBRyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDN0IsSUFBSSxDQUFDLEdBQUcsSUFBSSxNQUFPLENBQUMsSUFBSSxLQUFLLEdBQUcsSUFBSSxNQUFPLENBQUMsSUFBSSxLQUFLLEdBQUcsRUFBRTtvQkFDeEQsTUFBTSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ25CLE1BQU0sS0FBSyxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUM1QixJQUFJLFVBQVUsR0FBRyxFQUFFLENBQUM7b0JBQ3BCLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7d0JBQzdCLFVBQVUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDO3dCQUN4QyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxJQUFJLEVBQUU7NEJBQzlCLFVBQVUsSUFBSSxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQzt5QkFDL0M7cUJBQ0Y7b0JBQ0QsT0FBTyxVQUFVLENBQUM7aUJBQ25CO3FCQUFNLElBQUksTUFBTSxFQUFFO29CQUNqQixNQUFNLEdBQUcsTUFBTSxNQUFNLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2lCQUNoQztZQUNILENBQUMsQ0FBQSxDQUFDLENBQUM7WUFFSCxJQUFJLE9BQU8sRUFBRTtnQkFDWCxNQUFNLEdBQUcsR0FBRyxHQUFJLEdBQUcsR0FBRyxHQUFHLE9BQU8sQ0FBQztnQkFDakMsSUFBSSxNQUFNO29CQUNSLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUksSUFBSSxPQUFPLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUM5RCxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQzthQUN0QjtZQUVELE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNqQyxDQUFDO1FBRUQsU0FBZSxZQUFZLENBQUMsVUFBMkIsR0FBRyxFQUFFLFVBQVUsR0FBRyxJQUFJLEVBQUUsZ0JBQXlCOztnQkFDdEcsTUFBTSxnQkFBZ0IsR0FBRyxVQUFVLENBQUM7Z0JBQ3BDLFVBQVUsR0FBRyxVQUFVLENBQUM7Z0JBQ3hCLE1BQU0sTUFBTSxHQUFHLE1BQU0sWUFBWSxDQUFDLFNBQVMsT0FBTyxVQUFVLFVBQVUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFPLEVBQUUsRUFBRSxFQUFFO29CQUN0RyxJQUFJLEdBQWtDLENBQUM7b0JBQ3ZDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLElBQUksRUFBRTt3QkFDOUIsTUFBTSxFQUFFLEdBQUcsTUFBTSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7d0JBQzlCLElBQUksRUFBRSxDQUFDLElBQUksS0FBSywrQkFBYSxDQUFDLFNBQVMsRUFBRTs0QkFDdkMsc0JBQXNCO3lCQUN2Qjs2QkFBTTs0QkFDTCxnRkFBZ0Y7NEJBQ2hGLDJEQUEyRDs0QkFDM0QsNEVBQTRFOzRCQUM1RSx5Q0FBeUM7NEJBQ3pDLEdBQUcsR0FBRyxJQUFBLDBCQUFXLEVBQUUsRUFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQzt5QkFDM0M7cUJBQ0Y7b0JBQ0QsT0FBTzt3QkFDTCxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRTs0QkFDL0MsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDOzRCQUMxQyxPQUFPLElBQUksQ0FBQzt3QkFDZCxDQUFDLEVBQUUsRUFBOEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO3dCQUN2QyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO3dCQUNoRyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO3FCQUNyRSxDQUFDO2dCQUNyQixDQUFDLENBQUEsQ0FBQyxDQUFDO2dCQUNILFVBQVUsR0FBRyxnQkFBZ0IsQ0FBQztnQkFFOUIsSUFBSSxnQkFBZ0IsSUFBSSxNQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO29CQUN4QyxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLENBQUM7aUJBQ25EO2dCQUVELE9BQU8sTUFBTyxDQUFDO1lBQ2pCLENBQUM7U0FBQTtRQUVELFNBQWUsUUFBUSxDQUFDLFFBQWdCLEVBQUUsT0FBZTs7Z0JBQ3ZELEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDeEMsT0FBTyxRQUFRLEdBQUcsQ0FBQyxFQUFFO29CQUNuQixNQUFNLEdBQUcsR0FBRyxNQUFNLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDekMsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTt3QkFDdkIsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO3FCQUNoQztvQkFDRCxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO3dCQUNyRSxPQUFPLFFBQVEsQ0FBQztvQkFDbEIsUUFBUSxFQUFFLENBQUM7aUJBQ1o7Z0JBQ0QsT0FBTyxTQUFTLENBQUM7WUFDbkIsQ0FBQztTQUFBO0lBQ0gsQ0FBQztDQUFBO0FBdk1ELGtDQXVNQztBQUVELE1BQWEsV0FBVztJQVF0QixZQUFtQixHQUFXLEVBQVMsY0FBdUI7UUFBM0MsUUFBRyxHQUFILEdBQUcsQ0FBUTtRQUFTLG1CQUFjLEdBQWQsY0FBYyxDQUFTO1FBUDlELGtCQUFhLEdBQUcsSUFBSSxzQkFBZSxDQUFrQixJQUFJLENBQUMsQ0FBQztRQUUzRCxhQUFRLEdBQUcsS0FBSyxDQUFDO1FBQ1QscUJBQWdCLEdBQUcsSUFBSSxzQkFBZSxDQUFXLEVBQUUsQ0FBQyxDQUFDO1FBSzNELElBQUksY0FBYyxJQUFJLElBQUk7WUFDeEIsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxnQkFBZ0IsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMvRixDQUFDO0lBRUssYUFBYTs7WUFDbkIsa0NBQWtDO1lBQ2xDLHFDQUFxQztZQUNyQywyQ0FBMkM7WUFDM0MsUUFBUTtZQUNSLHVDQUF1QztZQUN2QyxrQ0FBa0M7WUFDbEMsZUFBZTtRQUNmLENBQUM7S0FBQTtJQUVLLG1CQUFtQixDQUFDLE9BQWU7O1lBQ3pDLHlDQUF5QztZQUN6Qyx1Q0FBdUM7WUFDdkMsMENBQTBDO1lBQzFDLGlDQUFpQztZQUNqQyxvQkFBb0I7WUFDcEIsNENBQTRDO1lBQzVDLFNBQVM7WUFDVCxNQUFNO1lBQ04sc0NBQXNDO1lBQ3RDLGtDQUFrQztZQUNsQyxtREFBbUQ7WUFDbkQseURBQXlEO1lBQ3pELHFEQUFxRDtZQUNyRCw2REFBNkQ7WUFDN0QsZ0JBQWdCO1FBQ2hCLENBQUM7S0FBQTtJQUVEOzs7T0FHRztJQUNHLGNBQWMsQ0FBQyxVQUFtQjs7WUFDeEMseUVBQXlFO1lBQ3pFLHdDQUF3QztZQUV4Qyx1REFBdUQ7WUFFdkQscUNBQXFDO1lBRXJDLG1EQUFtRDtZQUNuRCxpQkFBaUI7WUFDakIscUNBQXFDO1lBQ3JDLDhCQUE4QjtZQUM5QixxQkFBcUI7WUFFckIsb0NBQW9DO1lBQ3BDLDZDQUE2QztZQUM3Qyw2RkFBNkY7WUFDN0Ysb0JBQW9CO1lBQ3BCLGlHQUFpRztZQUNqRyxvQkFBb0I7WUFDcEIsVUFBVTtZQUNWLDhGQUE4RjtZQUM5RixRQUFRO1lBQ1IsUUFBUTtZQUNSLHlCQUF5QjtZQUN6Qiw2QkFBNkI7WUFDN0IscUJBQXFCO1FBQ3JCLENBQUM7S0FBQTtJQUVLLFVBQVUsQ0FBQyxPQUFlLEVBQUUsT0FBZTs7WUFDL0MsTUFBTSxXQUFXLENBQUMsQ0FBTSxHQUFHLEVBQUMsRUFBRTtnQkFDNUIsTUFBTSxHQUFHLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztZQUN6QyxDQUFDLENBQUEsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztLQUFBO0lBRUQsK0NBQStDO0lBQy9DLDBCQUEwQjtJQUMxQiw0QkFBNEI7SUFDNUIsdUNBQXVDO0lBQ3ZDLGlGQUFpRjtJQUNqRixNQUFNO0lBQ04sSUFBSTtJQUVFLGtCQUFrQjs7WUFDdEIsTUFBTSxXQUFXLENBQUMsQ0FBTSxHQUFHLEVBQUMsRUFBRTtnQkFDNUIsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7Z0JBQ2YsSUFBSSxDQUFDLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQztnQkFFN0MsTUFBTSxFQUFFLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUMxQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFHLENBQUMsQ0FBQztnQkFFN0IsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNyRCxJQUFJLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO29CQUMxQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUMvQixLQUFLLE1BQU0sT0FBTyxJQUFJLFdBQVcsRUFBRTt3QkFDakMsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO3FCQUNyQztpQkFDRjtnQkFDRCw2Q0FBNkM7Z0JBQzdDLHNFQUFzRTtnQkFDdEUsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDO1lBQ2xCLENBQUMsQ0FBQSxDQUFDLENBQUM7UUFDTCxDQUFDO0tBQUE7SUFFRCx5QkFBeUIsQ0FBQyxHQUFHLFFBQWtCO1FBQzdDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVELG9FQUFvRTtJQUNwRSx3REFBd0Q7SUFDeEQseUdBQXlHO0lBQ3pHLElBQUk7SUFFSixTQUFTO1FBQ1AsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7SUFDeEIsQ0FBQztJQUVhLGVBQWUsQ0FBQyxHQUFXOztZQUN2QyxpR0FBaUc7WUFDakcsbUJBQW1CO1lBQ25CLGdGQUFnRjtZQUNoRiw4RkFBOEY7UUFDaEcsQ0FBQztLQUFBO0lBRWEsY0FBYyxDQUFDLEdBQXVCOztZQUNsRCxNQUFNLEdBQUcsR0FBRyxNQUFNLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxrQkFBa0IsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFDN0UsR0FBRyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN4QyxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7Z0JBQ2YsT0FBTyxFQUFFLENBQUM7YUFDWDtZQUNELE1BQU0sT0FBTyxHQUFHLE1BQU0sR0FBRyxDQUFDLGdCQUFnQixDQUFDLEdBQUksQ0FBQyxDQUFDO1lBQ2pELElBQUksT0FBTyxJQUFJLElBQUksRUFBRTtnQkFDbkIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2FBQ3BDO1lBQ0QsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBYSxDQUFDO1FBQ3pDLENBQUM7S0FBQTtDQUVGO0FBOUlELGtDQThJQztBQUVELFNBQXNCLFFBQVEsQ0FBQyxJQUFZLEVBQUUsSUFBWSxFQUFFLFdBQW1COztRQUM1RSxHQUFHLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFDckIsSUFBSSxJQUFJO1lBQ04sZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxlQUFHLENBQUMsV0FBVyxFQUFFLGlCQUFpQixDQUFDLEVBQUU7Z0JBQ25ELElBQUksRUFBRSxJQUFJLEVBQUUsV0FBVzthQUNtQixDQUFDLENBQUM7UUFDaEQsTUFBTSxXQUFXLENBQUMsQ0FBTSxHQUFHLEVBQUMsRUFBRTtZQUM1QixNQUFNLEdBQUcsQ0FBQyxZQUFZLENBQUMsc0RBQXNELENBQUMsQ0FBQztRQUNqRixDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUFBO0FBVEQsNEJBU0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcmVhdGVUcmFuc3BvcnQgfSBmcm9tICdub2RlbWFpbGVyJztcbmltcG9ydCBTTVRQVHJhbnNwb3J0IGZyb20gJ25vZGVtYWlsZXIvbGliL3NtdHAtdHJhbnNwb3J0JztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgQmVoYXZpb3JTdWJqZWN0IH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBtYXAsIC8qY29uY2F0TWFwLCB0YWtlV2hpbGUsIHRha2VMYXN0LCBtYXBUbywqLyB0YXAsIGRpc3RpbmN0VW50aWxDaGFuZ2VkXG4gIC8vIHNraXAsIGZpbHRlciwgdGFrZVxufSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBjb25uZWN0IGFzIHRzbENvbm5lY3QsIENvbm5lY3Rpb25PcHRpb25zLCBUTFNTb2NrZXQgfSBmcm9tICd0bHMnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtDaGVja3N1bSwgV2l0aE1haWxTZXJ2ZXJDb25maWd9IGZyb20gJy4vZmV0Y2gtdHlwZXMnO1xuaW1wb3J0IHtjcmVhdGVTZXJ2ZXJEYXRhSGFuZGxlciwgcGFyc2VMaW5lc09mVG9rZW5zLCBJbWFwVG9rZW5UeXBlLCBTdHJpbmdMaXR9IGZyb20gJy4vbWFpbC9pbWFwLW1zZy1wYXJzZXInO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyBMb29rQWhlYWQsIFRva2VuIH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9hc3luYy1MTG4tcGFyc2VyJztcbmltcG9ydCB7cGFyc2UgYXMgcGFyc2VSZmM4MjIsIFJDRjgyMlBhcnNlUmVzdWx0fSBmcm9tICcuL21haWwvcmZjODIyLXN5bmMtcGFyc2VyJztcblxuLy8gaW1wb3J0IHtTb2NrZXR9IGZyb20gJ25ldCc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5mZXRjaC1yZW1vdGUtaW1hcCcpO1xuXG5jb25zdCBzZXR0aW5nID0gYXBpLmNvbmZpZy5nZXQoYXBpLnBhY2thZ2VOYW1lKSBhcyBXaXRoTWFpbFNlcnZlckNvbmZpZztcbmNvbnN0IGVudiA9IHNldHRpbmcuZmV0Y2hNYWlsU2VydmVyID8gc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIuZW52IDogJ2xvY2FsJztcblxuXG5jb25zdCBjdXJyQ2hlY2tzdW1GaWxlID0gUGF0aC5yZXNvbHZlKCdjaGVja3N1bS4nICsgKHNldHRpbmcuZmV0Y2hNYWlsU2VydmVyID8gZW52IDogJ2xvY2FsJykgKyAnLmpzb24nKTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlbmRNYWlsKHN1YmplY3Q6IHN0cmluZywgdGV4dDogc3RyaW5nLCBmaWxlPzogc3RyaW5nKSB7XG4gIGxvZy5pbmZvKCdsb2dpbicpO1xuICBpZiAoIXNldHRpbmcuZmV0Y2hNYWlsU2VydmVyKSB7XG4gICAgbG9nLmluZm8oJ2ZldGNoTWFpbFNlcnZlciBpcyBub3QgY29uZmlndXJlZCEgU2tpcCBzZW5kTWFpbCcpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCB7XG4gICAgdXNlcjogRU1BSUwsXG4gICAgbG9naW5TZWNyZXQ6IFNFQ1JFVCxcbiAgICAvLyBpbWFwOiBJTUFQLFxuICAgIHNtdHA6IFNNVFBcbiAgfSA9IHNldHRpbmcuZmV0Y2hNYWlsU2VydmVyO1xuXG4gIGNvbnN0IHRyYW5zcG9ydGVyID0gY3JlYXRlVHJhbnNwb3J0KHtcbiAgICBob3N0OiBTTVRQLFxuICAgIGF1dGg6IHtcbiAgICAgIHR5cGU6ICdsb2dpbicsXG4gICAgICB1c2VyOiBFTUFJTCxcbiAgICAgIHBhc3M6IFNFQ1JFVFxuICAgIH0sXG4gICAgc2VjdXJlOiB0cnVlXG4gIH0gYXMgU01UUFRyYW5zcG9ydC5PcHRpb25zKTtcblxuICBsb2cuaW5mbygnc2VuZCBtYWlsJyk7XG4gIGNvbnN0IGluZm8gPSBhd2FpdCB0cmFuc3BvcnRlci5zZW5kTWFpbCh7XG4gICAgZnJvbTogRU1BSUwsXG4gICAgdG86IEVNQUlMLFxuICAgIHN1YmplY3Q6IGBidWlsZCBhcnRpZmFjdDogJHtzdWJqZWN0fWAsXG4gICAgdGV4dCxcbiAgICBhdHRhY2htZW50czogZmlsZSA/IFtcbiAgICAgIHtcbiAgICAgICAgZmlsZW5hbWU6IFBhdGguYmFzZW5hbWUoZmlsZSksXG4gICAgICAgIHBhdGg6IFBhdGgucmVzb2x2ZShmaWxlKVxuICAgICAgfVxuICAgIF0gOiB1bmRlZmluZWRcbiAgfSk7XG5cbiAgbG9nLmluZm8oaW5mbyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXRyeVNlbmRNYWlsKHN1YmplY3Q6IHN0cmluZywgdGV4dDogc3RyaW5nLCBmaWxlPzogc3RyaW5nKSB7XG4gIGxldCBlcnJvcjogRXJyb3IgfCB1bmRlZmluZWQ7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHNlbmRNYWlsKHN1YmplY3QsIHRleHQsIGZpbGUpO1xuICAgICAgZXJyb3IgPSB1bmRlZmluZWQ7XG4gICAgICBicmVhaztcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGxvZy5pbmZvKCdHb3QgZXJyb3InLCBlcnIpO1xuICAgICAgZXJyb3IgPSBlcnI7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwMCkpO1xuICAgIH1cbiAgfVxuICBpZiAoZXJyb3IpIHtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEltYXBGZXRjaERhdGEge1xuICBoZWFkZXJzOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW10gfCB1bmRlZmluZWR9O1xuICB0ZXh0czogc3RyaW5nW107XG4gIGZpbGVzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbWFwQ29tbWFuZENvbnRleHQge1xuICAvKipcbiAgICogSW5kZXggb2YgbGF0ZXN0IG1haWxcbiAgICovXG4gIGxhc3RJbmRleDogbnVtYmVyO1xuICBmaWxlV3JpdGluZ1N0YXRlOiBPYnNlcnZhYmxlPGJvb2xlYW4+O1xuICB3YWl0Rm9yUmVwbHk8UiA9IGFueT4oY29tbWFuZD86IHN0cmluZyxcbiAgICBvbkxpbmU/OiAobGE6IExvb2tBaGVhZDxUb2tlbjxJbWFwVG9rZW5UeXBlPj4sIHRhZzogc3RyaW5nKSA9PiBQcm9taXNlPFI+KTogUHJvbWlzZTxSIHwgbnVsbD47XG4gIGZpbmRNYWlsKGZyb21JbmR4OiBudW1iZXIsIHN1YmplY3Q6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyIHwgdW5kZWZpbmVkPjtcbiAgd2FpdEZvckZldGNoKG1haWxJZHg6IHN0cmluZyB8IG51bWJlciwgaGVhZGVyT25seT86IGJvb2xlYW4sIG92ZXJyaWRlRmlsZU5hbWU/OiBzdHJpbmcpOiBQcm9taXNlPEltYXBGZXRjaERhdGE+O1xuICB3YWl0Rm9yRmV0Y2hUZXh0KGluZGV4OiBudW1iZXIpOiBQcm9taXNlPHN0cmluZyB8IHVuZGVmaW5lZD47XG4gIGFwcGVuZE1haWwoc3ViamVjdDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPHZvaWR8bnVsbD47XG59XG5cbi8qKlxuICogSU1BUCBzcGVjaWZpY2F0aW9uXG4gKiBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMTczMFxuICogXG4gKiBJRCBjb21tYW5kXG4gKiBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMjk3MVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY29ubmVjdEltYXAoY2FsbGJhY2s6IChjb250ZXh0OiBJbWFwQ29tbWFuZENvbnRleHQpID0+IFByb21pc2U8YW55Pikge1xuXG4gIGxldCBsb2dFbmFibGVkID0gdHJ1ZTtcbiAgbGV0IGNtZElkeCA9IDE7XG4gIGNvbnN0IGZpbGVXcml0aW5nU3RhdGUgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PFNldDxzdHJpbmc+PihuZXcgU2V0PHN0cmluZz4oKSk7XG5cbiAgaWYgKCFzZXR0aW5nLmZldGNoTWFpbFNlcnZlcikge1xuICAgIGxvZy53YXJuKCdmZXRjaE1haWxTZXJ2ZXIgaXMgbm90IGNvbmZpZ3VyZWQhIFNraXAgc2VuZE1haWwnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3Qge1xuICAgICAgdXNlcjogRU1BSUwsXG4gICAgICBsb2dpblNlY3JldDogU0VDUkVULFxuICAgICAgaW1hcDogSU1BUFxuICAgICAgLy8gc210cDogU01UUFxuICB9ID0gc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXI7XG5cbiAgY29uc3QgY29udGV4dDoge1trIGluIGtleW9mIEltYXBDb21tYW5kQ29udGV4dF0/OiBJbWFwQ29tbWFuZENvbnRleHRba119ID0ge307XG5cbiAgY29udGV4dC53YWl0Rm9yUmVwbHkgPSB3YWl0Rm9yUmVwbHk7XG4gIGNvbnRleHQud2FpdEZvckZldGNoID0gd2FpdEZvckZldGNoO1xuICBjb250ZXh0LndhaXRGb3JGZXRjaFRleHQgPSB3YWl0Rm9yRmV0Y2hUZXh0O1xuICBjb250ZXh0LmZpbmRNYWlsID0gZmluZE1haWw7XG4gIGNvbnRleHQuZmlsZVdyaXRpbmdTdGF0ZSA9IGZpbGVXcml0aW5nU3RhdGUucGlwZShcbiAgICBtYXAoZmlsZVNldCA9PiB7XG4gICAgICAvLyBsb2cud2Fybignd3JpdGluZzogJywgZmlsZVNldC52YWx1ZXMoKSk7XG4gICAgICByZXR1cm4gZmlsZVNldC5zaXplID4gMDtcbiAgICB9KSxcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpXG4gICk7XG5cbiAgY29udGV4dC5hcHBlbmRNYWlsID0gKHN1YmplY3Q6IHN0cmluZywgY29udGVudDogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgbWFpbEJvZHkgPSBgRGF0ZTogTW9uLCA3IEZlYiAyMDIwIDIxOjUyOjI1IC0wODAwIChQU1QpXG4gICAgICBGcm9tOiBDcmVkaXQgdGVhbSBidWlsZCBtYWNoaW5lXG4gICAgICBTdWJqZWN0OiAke3N1YmplY3R9XG4gICAgICBUbzogQWRtaW5pbnN0cmF0b3JcbiAgICAgIE1lc3NhZ2UtSWQ6IDxCMjczOTctMDEwMDAwMEBCbHVyZHlibG9vcC5DT00+XG4gICAgICBNSU1FLVZlcnNpb246IDEuMFxuICAgICAgQ29udGVudC1UeXBlOiBURVhUL1BMQUlOOyBDSEFSU0VUPVVTLUFTQ0lJXG4gICAgICBcbiAgICAgICR7Y29udGVudH1cbiAgICAgIGAucmVwbGFjZSgvXlsgXSsvbWcsICcnKS5yZXBsYWNlKC9cXHIvZywgJycpLnJlcGxhY2UoL1xcbi9nLCAnXFxyXFxuJyk7XG4gICAgcmV0dXJuIHdhaXRGb3JSZXBseShgQVBQRU5EIElOQk9YIHske21haWxCb2R5Lmxlbmd0aH19XFxyXFxuYCArIG1haWxCb2R5KTtcbiAgfTtcblxuICBjb25zdCBzZXJ2ZXJSZXNIYW5kbGVyID0gY3JlYXRlU2VydmVyRGF0YUhhbmRsZXIoKTtcbiAgc2VydmVyUmVzSGFuZGxlci5vdXRwdXQucGlwZShcbiAgICB0YXAobXNnID0+IHtcbiAgICAgIGlmIChtc2cgIT0gbnVsbClcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2coJyAgPC0gJyArIG1zZy5tYXAodG9rZW4gPT4gdG9rZW4udGV4dCkuam9pbignICcpKTtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuXG4gIGxldCBzb2NrZXQ6IFRMU1NvY2tldHx1bmRlZmluZWQ7XG4gIHRyeSB7XG4gICAgc29ja2V0ID0gYXdhaXQgbmV3IFByb21pc2U8UmV0dXJuVHlwZTx0eXBlb2YgdHNsQ29ubmVjdD4+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHNvY2tldCA9IHRzbENvbm5lY3Qoe1xuICAgICAgICBob3N0OiBJTUFQLCBwb3J0OiA5OTMsXG4gICAgICAgIGVuYWJsZVRyYWNlOiB0cnVlXG4gICAgICB9IGFzIENvbm5lY3Rpb25PcHRpb25zKTtcblxuICAgICAgc29ja2V0Lm9uKCdzZWN1cmVDb25uZWN0JywgKCkgPT4ge1xuICAgICAgICBsb2cuaW5mbygnY29ubmVjdGVkJywgc29ja2V0LmF1dGhvcml6ZWQgPyAnYXV0aG9yaXplZCcgOiAndW5hdXRob3JpemVkJyk7XG4gICAgICAgIHJlc29sdmUoc29ja2V0KTtcbiAgICAgIH0pXG4gICAgICAub24oJ2Vycm9yJywgZXJyID0+IHJlamVjdChlcnIpKVxuICAgICAgLm9uKCd0aW1lb3V0JywgKCkgPT4gcmVqZWN0KG5ldyBFcnJvcignVGltZW91dCcpKSk7XG4gICAgICBzb2NrZXQub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGRhdGEudG9TdHJpbmcoKSk7XG4gICAgICAgIHNlcnZlclJlc0hhbmRsZXIuaW5wdXQoZGF0YSk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IHdhaXRGb3JSZXBseSgpO1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseSgnSUQgKFwibmFtZVwiIFwiY29tLnRlbmNlbnQuZm94bWFpbFwiIFwidmVyc2lvblwiIFwiNy4yLjkuNzlcIiknKTtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoYExPR0lOICR7RU1BSUx9ICR7U0VDUkVUfWApO1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseSgnU0VMRUNUIElOQk9YJywgYXN5bmMgbGEgPT4ge1xuICAgICAgY29uc3QgZXhpdHNUayA9IGF3YWl0IGxhLmxhKDMpO1xuICAgICAgaWYgKGV4aXRzVGsgJiYgZXhpdHNUay50ZXh0LnRvVXBwZXJDYXNlKCkgPT09ICdFWElTVFMnKSB7XG4gICAgICAgIGNvbnRleHQubGFzdEluZGV4ID0gcGFyc2VJbnQoKGF3YWl0IGxhLmxhKDIpKSEudGV4dCwgMTApO1xuICAgICAgfVxuICAgIH0pO1xuICAgIC8vIGF3YWl0IHdhaXRGb3JSZXBseSgnU0VBUkNIIEFMTCcpO1xuXG4gICAgYXdhaXQgY2FsbGJhY2soY29udGV4dCBhcyBJbWFwQ29tbWFuZENvbnRleHQpO1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseSgnTE9HT1VUJyk7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgbG9nLmVycm9yKGV4KTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgd2FpdEZvclJlcGx5KCdMT0dPVVQnKTtcbiAgICB9IGNhdGNoIChlcikge31cbiAgICBpZiAoc29ja2V0KVxuICAgICAgc29ja2V0LmVuZCgpO1xuICAgIHRocm93IGV4O1xuICB9XG5cbiAgc2VydmVyUmVzSGFuZGxlci5pbnB1dChudWxsKTtcbiAgc29ja2V0LmVuZCgpO1xuXG4gIGFzeW5jIGZ1bmN0aW9uIHdhaXRGb3JGZXRjaFRleHQoaW5kZXg6IG51bWJlcikge1xuICAgIGxldCBib2R5MTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseShgRkVUQ0ggJHtpbmRleH0gQk9EWVsxXWAsIGFzeW5jIGxhID0+IHtcbiAgICAgIHdoaWxlICgoYXdhaXQgbGEubGEoKSkgIT0gbnVsbCkge1xuICAgICAgICBjb25zdCB0b2tlbiA9IGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgICAgaWYgKHRva2VuLnRleHQgPT09ICdCT0RZJyAmJiAoYXdhaXQgbGEubGEoKSkhLnRleHQgPT09ICdbMV0nKSB7XG4gICAgICAgICAgYXdhaXQgbGEuYWR2YW5jZSgpO1xuICAgICAgICAgIGJvZHkxID0gKChhd2FpdCBsYS5hZHZhbmNlKCkpIGFzIHVua25vd24gYXMgU3RyaW5nTGl0KS5kYXRhLnRvU3RyaW5nKCd1dGY4Jyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGxvZy53YXJuKGJ1Zik7XG4gICAgLy8gcmV0dXJuIC9eXFwqXFxzK1xcZCtcXHMrRkVUQ0hcXHMrXFwoLio/XFx7XFxkK1xcfShbXl0qKVxcKSQvbS5leGVjKGJ1ZikhWzFdO1xuICAgIHJldHVybiBib2R5MTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHdhaXRGb3JSZXBseTxSID0gYW55Pihjb21tYW5kPzogc3RyaW5nLCBvbkxpbmU/OiAobGE6IExvb2tBaGVhZDxUb2tlbjxJbWFwVG9rZW5UeXBlPj4sIHRhZzogc3RyaW5nKSA9PiBQcm9taXNlPFI+KTogUHJvbWlzZTxSIHwgbnVsbD4ge1xuICAgIGxldCB0YWc6IHN0cmluZztcbiAgICBpZiAoY29tbWFuZClcbiAgICAgIHRhZyA9ICdhJyArIChjbWRJZHgrKyk7XG5cbiAgICBsZXQgcmVzdWx0OiBSIHwgbnVsbCA9IG51bGw7XG4gICAgY29uc3QgcHJvbSA9IHBhcnNlTGluZXNPZlRva2VucyhzZXJ2ZXJSZXNIYW5kbGVyLm91dHB1dCwgYXN5bmMgbGEgPT4ge1xuICAgICAgY29uc3QgcmVzVGFnID0gYXdhaXQgbGEubGEoKTtcbiAgICAgIGlmICghdGFnICYmIHJlc1RhZyEudGV4dCA9PT0gJyonIHx8IHJlc1RhZyEudGV4dCA9PT0gdGFnKSB7XG4gICAgICAgIGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBhd2FpdCBsYS5sYSgpO1xuICAgICAgICBsZXQgcmV0dXJuVGV4dCA9ICcnO1xuICAgICAgICBpZiAoL09LfE5PLy50ZXN0KHN0YXRlIS50ZXh0KSkge1xuICAgICAgICAgIHJldHVyblRleHQgKz0gKGF3YWl0IGxhLmFkdmFuY2UoKSkudGV4dDtcbiAgICAgICAgICB3aGlsZSAoKGF3YWl0IGxhLmxhKCkpICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVyblRleHQgKz0gJyAnICsgKGF3YWl0IGxhLmFkdmFuY2UoKSkudGV4dDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldHVyblRleHQ7XG4gICAgICB9IGVsc2UgaWYgKG9uTGluZSkge1xuICAgICAgICByZXN1bHQgPSBhd2FpdCBvbkxpbmUobGEsIHRhZyk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAoY29tbWFuZCkge1xuICAgICAgY29uc3QgY21kID0gdGFnISArICcgJyArIGNvbW1hbmQ7XG4gICAgICBpZiAoc29ja2V0KVxuICAgICAgICBzb2NrZXQud3JpdGUoQnVmZmVyLmZyb20oYCR7dGFnIX0gJHtjb21tYW5kfVxcclxcbmAsICd1dGY4JykpO1xuICAgICAgbG9nLmRlYnVnKCc9PicsIGNtZCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb20udGhlbigoKSA9PiByZXN1bHQpO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gd2FpdEZvckZldGNoKG1haWxJZHg6IHN0cmluZyB8IG51bWJlciA9ICcqJywgaGVhZGVyT25seSA9IHRydWUsIG92ZXJyaWRlRmlsZU5hbWU/OiBzdHJpbmcpOiBQcm9taXNlPEltYXBGZXRjaERhdGE+IHtcbiAgICBjb25zdCBvcmlnaW5Mb2dFbmFibGVkID0gbG9nRW5hYmxlZDtcbiAgICBsb2dFbmFibGVkID0gaGVhZGVyT25seTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB3YWl0Rm9yUmVwbHkoYEZFVENIICR7bWFpbElkeH0gUkZDODIyJHtoZWFkZXJPbmx5ID8gJy5IRUFERVInIDogJyd9YCwgYXN5bmMgKGxhKSA9PiB7XG4gICAgICBsZXQgbXNnOiBSQ0Y4MjJQYXJzZVJlc3VsdCB8IHVuZGVmaW5lZDtcbiAgICAgIHdoaWxlICgoYXdhaXQgbGEubGEoKSkgIT0gbnVsbCkge1xuICAgICAgICBjb25zdCB0ayA9IGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgICAgaWYgKHRrLnR5cGUgIT09IEltYXBUb2tlblR5cGUuc3RyaW5nTGl0KSB7XG4gICAgICAgICAgLy8gbG9nLmRlYnVnKHRrLnRleHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGxvZy5kZWJ1Zygnc3RyaW5nIGxpdGVyYWw6XFxuJywgKHRrIGFzIHVua25vd24gYXMgU3RyaW5nTGl0KS5kYXRhLmJ5dGVMZW5ndGgpO1xuICAgICAgICAgIC8vIGNvbnN0IHdyaXR0ZW5GaWxlID0gYGVtYWlsLSR7bmV3IERhdGUoKS5nZXRUaW1lKCl9LnR4dGA7XG4gICAgICAgICAgLy8gZnMud3JpdGVGaWxlU3luYyh3cml0dGVuRmlsZSwgKHRrIGFzIHVua25vd24gYXMgU3RyaW5nTGl0KS5kYXRhLCAndXRmOCcpO1xuICAgICAgICAgIC8vIGxvZy5kZWJ1Zyhgd3JpdGVuIHRvICR7d3JpdHRlbkZpbGV9YCk7XG4gICAgICAgICAgbXNnID0gcGFyc2VSZmM4MjIoKHRrIGFzIFN0cmluZ0xpdCkuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGhlYWRlcnM6IG1zZyA/IG1zZy5oZWFkZXJzLnJlZHVjZSgocHJldiwgY3VycikgPT4ge1xuICAgICAgICAgIHByZXZbY3Vyci5rZXkudG9Mb3dlckNhc2UoKV0gPSBjdXJyLnZhbHVlO1xuICAgICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgICB9LCB7fSBhcyBJbWFwRmV0Y2hEYXRhWydoZWFkZXJzJ10pIDoge30sXG4gICAgICAgIHRleHRzOiBtc2cgPyBtc2cucGFydHMuZmlsdGVyKHBhcnQgPT4gcGFydC5ib2R5ICE9IG51bGwpLm1hcChwYXJ0ID0+IHBhcnQuYm9keSEudG9TdHJpbmcoKSkgOiBbXSxcbiAgICAgICAgZmlsZXM6IG1zZyA/IG1zZy5wYXJ0cy5maWx0ZXIocGFydCA9PiBwYXJ0LmZpbGUgIT0gbnVsbCkubWFwKHBhcnQgPT4gcGFydC5maWxlISkgOiBbXVxuICAgICAgfSBhcyBJbWFwRmV0Y2hEYXRhO1xuICAgIH0pO1xuICAgIGxvZ0VuYWJsZWQgPSBvcmlnaW5Mb2dFbmFibGVkO1xuXG4gICAgaWYgKG92ZXJyaWRlRmlsZU5hbWUgJiYgcmVzdWx0IS5maWxlc1swXSkge1xuICAgICAgZnMucmVuYW1lU3luYyhyZXN1bHQhLmZpbGVzWzBdLCBvdmVycmlkZUZpbGVOYW1lKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0ITtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGZpbmRNYWlsKGZyb21JbmR4OiBudW1iZXIsIHN1YmplY3Q6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyIHwgdW5kZWZpbmVkPiB7XG4gICAgbG9nLmluZm8oJ2ZpbmRNYWlsJywgZnJvbUluZHgsIHN1YmplY3QpO1xuICAgIHdoaWxlIChmcm9tSW5keCA+IDApIHtcbiAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IHdhaXRGb3JGZXRjaChmcm9tSW5keCk7XG4gICAgICBpZiAocmVzLmhlYWRlcnMuc3ViamVjdCkge1xuICAgICAgICBsb2cuZGVidWcocmVzLmhlYWRlcnMuc3ViamVjdCk7XG4gICAgICB9XG4gICAgICBpZiAocmVzLmhlYWRlcnMuc3ViamVjdCAmJiByZXMuaGVhZGVycy5zdWJqZWN0WzBdLmluZGV4T2Yoc3ViamVjdCkgPj0gMClcbiAgICAgICAgcmV0dXJuIGZyb21JbmR4O1xuICAgICAgZnJvbUluZHgtLTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgSW1hcE1hbmFnZXIge1xuICBjaGVja3N1bVN0YXRlID0gbmV3IEJlaGF2aW9yU3ViamVjdDxDaGVja3N1bSB8IG51bGw+KG51bGwpO1xuICBmaWxlV3JpdGluZ1N0YXRlOiBJbWFwQ29tbWFuZENvbnRleHRbJ2ZpbGVXcml0aW5nU3RhdGUnXTtcbiAgd2F0Y2hpbmcgPSBmYWxzZTtcbiAgcHJpdmF0ZSB0b0ZldGNoQXBwc1N0YXRlID0gbmV3IEJlaGF2aW9yU3ViamVjdDxzdHJpbmdbXT4oW10pO1xuXG4gIHByaXZhdGUgY3R4PzogSW1hcENvbW1hbmRDb250ZXh0O1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBlbnY6IHN0cmluZywgcHVibGljIHppcERvd25sb2FkRGlyPzogc3RyaW5nKSB7XG4gICAgaWYgKHppcERvd25sb2FkRGlyID09IG51bGwpXG4gICAgICB0aGlzLnppcERvd25sb2FkRGlyID0gUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShjdXJyQ2hlY2tzdW1GaWxlKSwgJ2RlcGxveS1zdGF0aWMtJyArIGVudik7XG4gIH1cblxuICBhc3luYyBmZXRjaENoZWNrc3VtKCkge1xuICAvLyAgIGxldCBjczogQ2hlY2tzdW0gfCB1bmRlZmluZWQ7XG4gIC8vICAgYXdhaXQgY29ubmVjdEltYXAoYXN5bmMgY3R4ID0+IHtcbiAgLy8gICAgIGNzID0gYXdhaXQgdGhpcy5fZmV0Y2hDaGVja3N1bShjdHgpO1xuICAvLyAgIH0pO1xuICAvLyAgIGxvZy5pbmZvKCdmZXRjaGVkIGNoZWNrc3VtOicsIGNzKTtcbiAgLy8gICB0aGlzLmNoZWNrc3VtU3RhdGUubmV4dChjcyEpO1xuICAvLyAgIHJldHVybiBjcztcbiAgfVxuXG4gIGFzeW5jIGZldGNoVXBkYXRlQ2hlY2tTdW0oYXBwTmFtZTogc3RyaW5nKSB7XG4gIC8vICAgbGV0IGNzID0gYXdhaXQgdGhpcy5mZXRjaENoZWNrc3VtKCk7XG4gIC8vICAgbG9nLmluZm8oJ2ZldGNoZWQgY2hlY2tzdW06JywgY3MpO1xuICAvLyAgIGlmIChjcyEudmVyc2lvbnMhW2FwcE5hbWVdID09IG51bGwpIHtcbiAgLy8gICAgIGNzIS52ZXJzaW9ucyFbYXBwTmFtZV0gPSB7XG4gIC8vICAgICAgIHZlcnNpb246IDAsXG4gIC8vICAgICAgIHBhdGg6ICc8c2VlIGF0dGFjaGVtZW50IGZpbGUgbmFtZT4nXG4gIC8vICAgICB9O1xuICAvLyAgIH1cbiAgLy8gICBjcyEudmVyc2lvbnMhW2FwcE5hbWVdLnZlcnNpb24rKztcbiAgLy8gICB0aGlzLmNoZWNrc3VtU3RhdGUubmV4dChjcyEpO1xuICAvLyAgIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKGN1cnJDaGVja3N1bUZpbGUpKTtcbiAgLy8gICBjb25zdCBjaGVja3N1bVN0ciA9IEpTT04uc3RyaW5naWZ5KGNzISwgbnVsbCwgJyAgJyk7XG4gIC8vICAgZnMud3JpdGVGaWxlU3luYyhjdXJyQ2hlY2tzdW1GaWxlLCBjaGVja3N1bVN0cik7XG4gIC8vICAgbG9nLmluZm8oJ3dyaXRlICVzXFxuJXMnLCBjdXJyQ2hlY2tzdW1GaWxlLCBjaGVja3N1bVN0cik7XG4gIC8vICAgcmV0dXJuIGNzITtcbiAgfVxuXG4gIC8qKlxuICAgKiBEb25lIHdoZW4gZmlsZXMgYXJlIHdyaXR0ZW5cbiAgICogQHBhcmFtIGV4Y2x1ZGVBcHAgZXhjbHVkZSBhcHBcbiAgICovXG4gIGFzeW5jIGZldGNoT3RoZXJaaXBzKGV4Y2x1ZGVBcHA/OiBzdHJpbmcpIHtcbiAgLy8gICBsZXQgYXBwTmFtZXMgPSBPYmplY3Qua2V5cyh0aGlzLmNoZWNrc3VtU3RhdGUuZ2V0VmFsdWUoKSEudmVyc2lvbnMhKVxuICAvLyAgIC5maWx0ZXIoYXBwID0+IGFwcCAhPT0gZXhjbHVkZUFwcCk7XG5cbiAgLy8gICBsZXQgZmlsZVdyaXR0ZW5Qcm9tOiBQcm9taXNlPGJvb2xlYW4+IHwgdW5kZWZpbmVkO1xuXG4gIC8vICAgYXdhaXQgY29ubmVjdEltYXAoYXN5bmMgY3R4ID0+IHtcblxuICAvLyAgICAgZmlsZVdyaXR0ZW5Qcm9tID0gY3R4LmZpbGVXcml0aW5nU3RhdGUucGlwZShcbiAgLy8gICAgICAgc2tpcCgxKSxcbiAgLy8gICAgICAgZmlsdGVyKHdyaXRpbmcgPT4gIXdyaXRpbmcpLFxuICAvLyAgICAgICB0YWtlKGFwcE5hbWVzLmxlbmd0aClcbiAgLy8gICAgICkudG9Qcm9taXNlKCk7XG5cbiAgLy8gICAgIGZvciAoY29uc3QgYXBwIG9mIGFwcE5hbWVzKSB7XG4gIC8vICAgICAgIGxvZy5pbmZvKCdmZXRjaCBvdGhlciB6aXA6ICcgKyBhcHApO1xuICAvLyAgICAgICBjb25zdCBpZHggPSBhd2FpdCBjdHguZmluZE1haWwoY3R4Lmxhc3RJbmRleCwgYGJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LSR7YXBwfSlgKTtcbiAgLy8gICAgICAgaWYgKCFpZHgpIHtcbiAgLy8gICAgICAgICBsb2cuaW5mbyhgbWFpbCBcImJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LSR7YXBwfSlcIiBpcyBub3QgRm91bmQsIHNraXAgZG93bmxvYWQgemlwYCk7XG4gIC8vICAgICAgICAgY29udGludWU7XG4gIC8vICAgICAgIH1cbiAgLy8gICAgICAgYXdhaXQgY3R4LndhaXRGb3JGZXRjaChpZHgsIGZhbHNlLCBQYXRoLnJlc29sdmUodGhpcy56aXBEb3dubG9hZERpciEsIGFwcCArICcuemlwJykpO1xuICAvLyAgICAgfVxuICAvLyAgIH0pO1xuICAvLyAgIGlmIChmaWxlV3JpdHRlblByb20pXG4gIC8vICAgICBhd2FpdCBmaWxlV3JpdHRlblByb207XG4gIC8vICAgcmV0dXJuIGFwcE5hbWVzO1xuICB9XG5cbiAgYXN5bmMgYXBwZW5kTWFpbChzdWJqZWN0OiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZykge1xuICAgIGF3YWl0IGNvbm5lY3RJbWFwKGFzeW5jIGN0eCA9PiB7XG4gICAgICBhd2FpdCBjdHguYXBwZW5kTWFpbChzdWJqZWN0LCBjb250ZW50KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIGFzeW5jIHN0YXJ0V2F0Y2hNYWlsKHBvbGxJbnRlcnZhbCA9IDYwMDAwKSB7XG4gIC8vICAgdGhpcy53YXRjaGluZyA9IHRydWU7XG4gIC8vICAgd2hpbGUgKHRoaXMud2F0Y2hpbmcpIHtcbiAgLy8gICAgIGF3YWl0IHRoaXMuY2hlY2tNYWlsRm9yVXBkYXRlKCk7XG4gIC8vICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgcG9sbEludGVydmFsKSk7IC8vIDYwIHNlY1xuICAvLyAgIH1cbiAgLy8gfVxuXG4gIGFzeW5jIGNoZWNrTWFpbEZvclVwZGF0ZSgpIHtcbiAgICBhd2FpdCBjb25uZWN0SW1hcChhc3luYyBjdHggPT4ge1xuICAgICAgdGhpcy5jdHggPSBjdHg7XG4gICAgICB0aGlzLmZpbGVXcml0aW5nU3RhdGUgPSBjdHguZmlsZVdyaXRpbmdTdGF0ZTtcblxuICAgICAgY29uc3QgY3MgPSBhd2FpdCB0aGlzLl9mZXRjaENoZWNrc3VtKGN0eCk7XG4gICAgICB0aGlzLmNoZWNrc3VtU3RhdGUubmV4dChjcyEpO1xuXG4gICAgICBjb25zdCB0b0ZldGNoQXBwcyA9IHRoaXMudG9GZXRjaEFwcHNTdGF0ZS5nZXRWYWx1ZSgpO1xuICAgICAgaWYgKHRvRmV0Y2hBcHBzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy50b0ZldGNoQXBwc1N0YXRlLm5leHQoW10pO1xuICAgICAgICBmb3IgKGNvbnN0IGFwcE5hbWUgb2YgdG9GZXRjaEFwcHMpIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLmZldGNoQXR0YWNobWVudChhcHBOYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gYXdhaXQgY3R4LndhaXRGb3JSZXBseSgnU1VCU0NSSUJFIElOQk9YJyk7XG4gICAgICAvLyBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMzAwMDApKTsgLy8gMzAgc2VjXG4gICAgICBkZWxldGUgdGhpcy5jdHg7XG4gICAgfSk7XG4gIH1cblxuICBmZXRjaEFwcER1cmluZ1dhdGNoQWN0aW9uKC4uLmFwcE5hbWVzOiBzdHJpbmdbXSkge1xuICAgIHRoaXMudG9GZXRjaEFwcHNTdGF0ZS5uZXh0KGFwcE5hbWVzKTtcbiAgfVxuXG4gIC8vIGFzeW5jIHNlbmRGaWxlQW5kVXBkYXRlZENoZWNrc3VtKGFwcE5hbWU6IHN0cmluZywgZmlsZTogc3RyaW5nKSB7XG4gIC8vICAgY29uc3QgY3MgPSBhd2FpdCB0aGlzLmZldGNoVXBkYXRlQ2hlY2tTdW0oYXBwTmFtZSk7XG4gIC8vICAgYXdhaXQgcmV0cnlTZW5kTWFpbChgYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tJHthcHBOYW1lfSlgLCBKU09OLnN0cmluZ2lmeShjcywgbnVsbCwgJyAgJyksIGZpbGUpO1xuICAvLyB9XG5cbiAgc3RvcFdhdGNoKCkge1xuICAgIHRoaXMud2F0Y2hpbmcgPSBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZmV0Y2hBdHRhY2htZW50KGFwcDogc3RyaW5nKSB7XG4gICAgLy8gY29uc3QgaWR4ID0gYXdhaXQgdGhpcy5jdHguZmluZE1haWwodGhpcy5jdHgubGFzdEluZGV4LCBgYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tJHthcHB9KWApO1xuICAgIC8vIGlmIChpZHggPT0gbnVsbClcbiAgICAvLyAgIHRocm93IG5ldyBFcnJvcignQ2FudCBmaW5kIG1haWw6ICcgKyBgYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tJHthcHB9KWApO1xuICAgIC8vIGF3YWl0IHRoaXMuY3R4LndhaXRGb3JGZXRjaChpZHghLCBmYWxzZSwgUGF0aC5yZXNvbHZlKHRoaXMuemlwRG93bmxvYWREaXIhLCBgJHthcHB9LnppcGApKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgX2ZldGNoQ2hlY2tzdW0oY3R4OiBJbWFwQ29tbWFuZENvbnRleHQpIHtcbiAgICBjb25zdCBpZHggPSBhd2FpdCBjdHguZmluZE1haWwoY3R4Lmxhc3RJbmRleCwgYGJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LWApO1xuICAgIGxvZy5pbmZvKCdfZmV0Y2hDaGVja3N1bSwgaW5kZXg6JywgaWR4KTtcbiAgICBpZiAoaWR4ID09IG51bGwpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QganNvblN0ciA9IGF3YWl0IGN0eC53YWl0Rm9yRmV0Y2hUZXh0KGlkeCEpO1xuICAgIGlmIChqc29uU3RyID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRW1wdHkgSlNPTiB0ZXh0Jyk7XG4gICAgfVxuICAgIHJldHVybiBKU09OLnBhcnNlKGpzb25TdHIpIGFzIENoZWNrc3VtO1xuICB9XG5cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRlc3RNYWlsKGltYXA6IHN0cmluZywgdXNlcjogc3RyaW5nLCBsb2dpblNlY3JldDogc3RyaW5nKSB7XG4gIGxvZy5kZWJ1ZyA9IGxvZy5pbmZvO1xuICBpZiAoaW1hcClcbiAgICBhcGkuY29uZmlnLnNldChbYXBpLnBhY2thZ2VOYW1lLCAnZmV0Y2hNYWlsU2VydmVyJ10sIHtcbiAgICAgIGltYXAsIHVzZXIsIGxvZ2luU2VjcmV0XG4gICAgfSBhcyBXaXRoTWFpbFNlcnZlckNvbmZpZ1snZmV0Y2hNYWlsU2VydmVyJ10pO1xuICBhd2FpdCBjb25uZWN0SW1hcChhc3luYyBjdHggPT4ge1xuICAgIGF3YWl0IGN0eC53YWl0Rm9yUmVwbHkoJ1NFQVJDSCBIRUFEIFN1YmplY3QgXCJidWlsZCBhcnRpZmFjdDogYmtqay1wcmUtYnVpbGRcIicpO1xuICB9KTtcbn1cbiJdfQ==