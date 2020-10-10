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
            log.warn('fetchMailServer is not configured! Skip sendMail');
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
                // tslint:disable-next-line: no-console
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

//# sourceMappingURL=fetch-remote-imap.js.map
