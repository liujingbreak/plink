"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const nodemailer_1 = require("nodemailer");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const tls_1 = require("tls");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const imap_msg_parser_1 = require("./mail/imap-msg-parser");
const __api_1 = tslib_1.__importDefault(require("__api"));
const rfc822_sync_parser_1 = require("./mail/rfc822-sync-parser");
// import {Socket} from 'net';
const log = require('log4js').getLogger(__api_1.default.packageName + '.fetch-remote-imap');
const setting = __api_1.default.config.get(__api_1.default.packageName);
const env = setting.fetchMailServer ? setting.fetchMailServer.env : 'local';
const currChecksumFile = path_1.default.resolve('checksum.' + (setting.fetchMailServer ? env : 'local') + '.json');
function sendMail(subject, text, file) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
            yield waitForReply('SELECT INBOX', (la) => tslib_1.__awaiter(this, void 0, void 0, function* () {
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
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                let body1;
                yield waitForReply(`FETCH ${index} BODY[1]`, (la) => tslib_1.__awaiter(this, void 0, void 0, function* () {
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
            const prom = imap_msg_parser_1.parseLinesOfTokens(serverResHandler.output, (la) => tslib_1.__awaiter(this, void 0, void 0, function* () {
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
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                const originLogEnabled = logEnabled;
                logEnabled = headerOnly;
                const result = yield waitForReply(`FETCH ${mailIdx} RFC822${headerOnly ? '.HEADER' : ''}`, (la) => tslib_1.__awaiter(this, void 0, void 0, function* () {
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
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield connectImap((ctx) => tslib_1.__awaiter(this, void 0, void 0, function* () {
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
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield connectImap((ctx) => tslib_1.__awaiter(this, void 0, void 0, function* () {
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
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            // const idx = await this.ctx.findMail(this.ctx.lastIndex, `bkjk-pre-build(${this.env}-${app})`);
            // if (idx == null)
            //   throw new Error('Cant find mail: ' + `bkjk-pre-build(${this.env}-${app})`);
            // await this.ctx.waitForFetch(idx!, false, Path.resolve(this.zipDownloadDir!, `${app}.zip`));
        });
    }
    _fetchChecksum(ctx) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        log.debug = log.info;
        if (imap)
            __api_1.default.config.set([__api_1.default.packageName, 'fetchMailServer'], {
                imap, user, loginSecret
            });
        yield connectImap((ctx) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield ctx.waitForReply('SEARCH HEAD Subject "build artifact: bkjk-pre-build"');
        }));
    });
}
exports.testMail = testMail;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS1pbWFwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDJDQUE2QztBQUU3QywrQkFBa0Q7QUFDbEQsOENBRXdCO0FBQ3hCLDZCQUEwRTtBQUMxRSxnRUFBMEI7QUFFMUIsd0RBQXdCO0FBRXhCLDREQUE2RztBQUM3RywwREFBd0I7QUFFeEIsa0VBQWtGO0FBRWxGLDhCQUE4QjtBQUM5QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsb0JBQW9CLENBQUMsQ0FBQztBQUVoRixNQUFNLE9BQU8sR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUF5QixDQUFDO0FBQ3hFLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFHNUUsTUFBTSxnQkFBZ0IsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUM7QUFFekcsU0FBc0IsUUFBUSxDQUFDLE9BQWUsRUFBRSxJQUFZLEVBQUUsSUFBYTs7UUFDekUsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRTtZQUM1QixHQUFHLENBQUMsSUFBSSxDQUFDLGtEQUFrRCxDQUFDLENBQUM7WUFDN0QsT0FBTztTQUNSO1FBQ0QsTUFBTSxFQUNKLElBQUksRUFBRSxLQUFLLEVBQ1gsV0FBVyxFQUFFLE1BQU07UUFDbkIsY0FBYztR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QUFDLENBQUM7UUFDakYsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FBQTtBQVRELDRCQVNDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvZmV0Y2gtcmVtb3RlLWltYXAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcmVhdGVUcmFuc3BvcnQgfSBmcm9tICdub2RlbWFpbGVyJztcbmltcG9ydCBTTVRQVHJhbnNwb3J0IGZyb20gJ25vZGVtYWlsZXIvbGliL3NtdHAtdHJhbnNwb3J0JztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgQmVoYXZpb3JTdWJqZWN0IH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBtYXAsIC8qY29uY2F0TWFwLCB0YWtlV2hpbGUsIHRha2VMYXN0LCBtYXBUbywqLyB0YXAsIGRpc3RpbmN0VW50aWxDaGFuZ2VkXG4gIC8vIHNraXAsIGZpbHRlciwgdGFrZVxufSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBjb25uZWN0IGFzIHRzbENvbm5lY3QsIENvbm5lY3Rpb25PcHRpb25zLCBUTFNTb2NrZXQgfSBmcm9tICd0bHMnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtDaGVja3N1bSwgV2l0aE1haWxTZXJ2ZXJDb25maWd9IGZyb20gJy4vZmV0Y2gtdHlwZXMnO1xuaW1wb3J0IHtjcmVhdGVTZXJ2ZXJEYXRhSGFuZGxlciwgcGFyc2VMaW5lc09mVG9rZW5zLCBJbWFwVG9rZW5UeXBlLCBTdHJpbmdMaXR9IGZyb20gJy4vbWFpbC9pbWFwLW1zZy1wYXJzZXInO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyBMb29rQWhlYWQsIFRva2VuIH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2FzeW5jLUxMbi1wYXJzZXInO1xuaW1wb3J0IHtwYXJzZSBhcyBwYXJzZVJmYzgyMiwgUkNGODIyUGFyc2VSZXN1bHR9IGZyb20gJy4vbWFpbC9yZmM4MjItc3luYy1wYXJzZXInO1xuXG4vLyBpbXBvcnQge1NvY2tldH0gZnJvbSAnbmV0JztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmZldGNoLXJlbW90ZS1pbWFwJyk7XG5cbmNvbnN0IHNldHRpbmcgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpIGFzIFdpdGhNYWlsU2VydmVyQ29uZmlnO1xuY29uc3QgZW52ID0gc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIgPyBzZXR0aW5nLmZldGNoTWFpbFNlcnZlci5lbnYgOiAnbG9jYWwnO1xuXG5cbmNvbnN0IGN1cnJDaGVja3N1bUZpbGUgPSBQYXRoLnJlc29sdmUoJ2NoZWNrc3VtLicgKyAoc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIgPyBlbnYgOiAnbG9jYWwnKSArICcuanNvbicpO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VuZE1haWwoc3ViamVjdDogc3RyaW5nLCB0ZXh0OiBzdHJpbmcsIGZpbGU/OiBzdHJpbmcpIHtcbiAgbG9nLmluZm8oJ2xvZ2luJyk7XG4gIGlmICghc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIpIHtcbiAgICBsb2cud2FybignZmV0Y2hNYWlsU2VydmVyIGlzIG5vdCBjb25maWd1cmVkISBTa2lwIHNlbmRNYWlsJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHtcbiAgICB1c2VyOiBFTUFJTCxcbiAgICBsb2dpblNlY3JldDogU0VDUkVULFxuICAgIC8vIGltYXA6IElNQVAsXG4gICAgc210cDogU01UUFxuICB9ID0gc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXI7XG5cbiAgY29uc3QgdHJhbnNwb3J0ZXIgPSBjcmVhdGVUcmFuc3BvcnQoe1xuICAgIGhvc3Q6IFNNVFAsXG4gICAgYXV0aDoge1xuICAgICAgdHlwZTogJ2xvZ2luJyxcbiAgICAgIHVzZXI6IEVNQUlMLFxuICAgICAgcGFzczogU0VDUkVUXG4gICAgfSxcbiAgICBzZWN1cmU6IHRydWVcbiAgfSBhcyBTTVRQVHJhbnNwb3J0Lk9wdGlvbnMpO1xuXG4gIGxvZy5pbmZvKCdzZW5kIG1haWwnKTtcbiAgY29uc3QgaW5mbyA9IGF3YWl0IHRyYW5zcG9ydGVyLnNlbmRNYWlsKHtcbiAgICBmcm9tOiBFTUFJTCxcbiAgICB0bzogRU1BSUwsXG4gICAgc3ViamVjdDogYGJ1aWxkIGFydGlmYWN0OiAke3N1YmplY3R9YCxcbiAgICB0ZXh0LFxuICAgIGF0dGFjaG1lbnRzOiBmaWxlID8gW1xuICAgICAge1xuICAgICAgICBmaWxlbmFtZTogUGF0aC5iYXNlbmFtZShmaWxlKSxcbiAgICAgICAgcGF0aDogUGF0aC5yZXNvbHZlKGZpbGUpXG4gICAgICB9XG4gICAgXSA6IHVuZGVmaW5lZFxuICB9KTtcblxuICBsb2cuaW5mbyhpbmZvKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJldHJ5U2VuZE1haWwoc3ViamVjdDogc3RyaW5nLCB0ZXh0OiBzdHJpbmcsIGZpbGU/OiBzdHJpbmcpIHtcbiAgbGV0IGVycm9yOiBFcnJvciB8IHVuZGVmaW5lZDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgc2VuZE1haWwoc3ViamVjdCwgdGV4dCwgZmlsZSk7XG4gICAgICBlcnJvciA9IHVuZGVmaW5lZDtcbiAgICAgIGJyZWFrO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgbG9nLmluZm8oJ0dvdCBlcnJvcicsIGVycik7XG4gICAgICBlcnJvciA9IGVycjtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDAwKSk7XG4gICAgfVxuICB9XG4gIGlmIChlcnJvcikge1xuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW1hcEZldGNoRGF0YSB7XG4gIGhlYWRlcnM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmdbXSB8IHVuZGVmaW5lZH07XG4gIHRleHRzOiBzdHJpbmdbXTtcbiAgZmlsZXM6IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEltYXBDb21tYW5kQ29udGV4dCB7XG4gIC8qKlxuICAgKiBJbmRleCBvZiBsYXRlc3QgbWFpbFxuICAgKi9cbiAgbGFzdEluZGV4OiBudW1iZXI7XG4gIGZpbGVXcml0aW5nU3RhdGU6IE9ic2VydmFibGU8Ym9vbGVhbj47XG4gIHdhaXRGb3JSZXBseTxSID0gYW55Pihjb21tYW5kPzogc3RyaW5nLFxuICAgIG9uTGluZT86IChsYTogTG9va0FoZWFkPFRva2VuPEltYXBUb2tlblR5cGU+PiwgdGFnOiBzdHJpbmcpID0+IFByb21pc2U8Uj4pOiBQcm9taXNlPFIgfCBudWxsPjtcbiAgZmluZE1haWwoZnJvbUluZHg6IG51bWJlciwgc3ViamVjdDogc3RyaW5nKTogUHJvbWlzZTxudW1iZXIgfCB1bmRlZmluZWQ+O1xuICB3YWl0Rm9yRmV0Y2gobWFpbElkeDogc3RyaW5nIHwgbnVtYmVyLCBoZWFkZXJPbmx5PzogYm9vbGVhbiwgb3ZlcnJpZGVGaWxlTmFtZT86IHN0cmluZyk6IFByb21pc2U8SW1hcEZldGNoRGF0YT47XG4gIHdhaXRGb3JGZXRjaFRleHQoaW5kZXg6IG51bWJlcik6IFByb21pc2U8c3RyaW5nIHwgdW5kZWZpbmVkPjtcbiAgYXBwZW5kTWFpbChzdWJqZWN0OiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyk6IFByb21pc2U8dm9pZHxudWxsPjtcbn1cblxuLyoqXG4gKiBJTUFQIHNwZWNpZmljYXRpb25cbiAqIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMxNzMwXG4gKiBcbiAqIElEIGNvbW1hbmRcbiAqIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMyOTcxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb25uZWN0SW1hcChjYWxsYmFjazogKGNvbnRleHQ6IEltYXBDb21tYW5kQ29udGV4dCkgPT4gUHJvbWlzZTxhbnk+KSB7XG5cbiAgbGV0IGxvZ0VuYWJsZWQgPSB0cnVlO1xuICBsZXQgY21kSWR4ID0gMTtcbiAgY29uc3QgZmlsZVdyaXRpbmdTdGF0ZSA9IG5ldyBCZWhhdmlvclN1YmplY3Q8U2V0PHN0cmluZz4+KG5ldyBTZXQ8c3RyaW5nPigpKTtcblxuICBpZiAoIXNldHRpbmcuZmV0Y2hNYWlsU2VydmVyKSB7XG4gICAgbG9nLndhcm4oJ2ZldGNoTWFpbFNlcnZlciBpcyBub3QgY29uZmlndXJlZCEgU2tpcCBzZW5kTWFpbCcpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCB7XG4gICAgICB1c2VyOiBFTUFJTCxcbiAgICAgIGxvZ2luU2VjcmV0OiBTRUNSRVQsXG4gICAgICBpbWFwOiBJTUFQXG4gICAgICAvLyBzbXRwOiBTTVRQXG4gIH0gPSBzZXR0aW5nLmZldGNoTWFpbFNlcnZlcjtcblxuICBjb25zdCBjb250ZXh0OiB7W2sgaW4ga2V5b2YgSW1hcENvbW1hbmRDb250ZXh0XT86IEltYXBDb21tYW5kQ29udGV4dFtrXX0gPSB7fTtcblxuICBjb250ZXh0LndhaXRGb3JSZXBseSA9IHdhaXRGb3JSZXBseTtcbiAgY29udGV4dC53YWl0Rm9yRmV0Y2ggPSB3YWl0Rm9yRmV0Y2g7XG4gIGNvbnRleHQud2FpdEZvckZldGNoVGV4dCA9IHdhaXRGb3JGZXRjaFRleHQ7XG4gIGNvbnRleHQuZmluZE1haWwgPSBmaW5kTWFpbDtcbiAgY29udGV4dC5maWxlV3JpdGluZ1N0YXRlID0gZmlsZVdyaXRpbmdTdGF0ZS5waXBlKFxuICAgIG1hcChmaWxlU2V0ID0+IHtcbiAgICAgIC8vIGxvZy53YXJuKCd3cml0aW5nOiAnLCBmaWxlU2V0LnZhbHVlcygpKTtcbiAgICAgIHJldHVybiBmaWxlU2V0LnNpemUgPiAwO1xuICAgIH0pLFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKClcbiAgKTtcblxuICBjb250ZXh0LmFwcGVuZE1haWwgPSAoc3ViamVjdDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBtYWlsQm9keSA9IGBEYXRlOiBNb24sIDcgRmViIDIwMjAgMjE6NTI6MjUgLTA4MDAgKFBTVClcbiAgICAgIEZyb206IENyZWRpdCB0ZWFtIGJ1aWxkIG1hY2hpbmVcbiAgICAgIFN1YmplY3Q6ICR7c3ViamVjdH1cbiAgICAgIFRvOiBBZG1pbmluc3RyYXRvclxuICAgICAgTWVzc2FnZS1JZDogPEIyNzM5Ny0wMTAwMDAwQEJsdXJkeWJsb29wLkNPTT5cbiAgICAgIE1JTUUtVmVyc2lvbjogMS4wXG4gICAgICBDb250ZW50LVR5cGU6IFRFWFQvUExBSU47IENIQVJTRVQ9VVMtQVNDSUlcbiAgICAgIFxuICAgICAgJHtjb250ZW50fVxuICAgICAgYC5yZXBsYWNlKC9eWyBdKy9tZywgJycpLnJlcGxhY2UoL1xcci9nLCAnJykucmVwbGFjZSgvXFxuL2csICdcXHJcXG4nKTtcbiAgICByZXR1cm4gd2FpdEZvclJlcGx5KGBBUFBFTkQgSU5CT1ggeyR7bWFpbEJvZHkubGVuZ3RofX1cXHJcXG5gICsgbWFpbEJvZHkpO1xuICB9O1xuXG4gIGNvbnN0IHNlcnZlclJlc0hhbmRsZXIgPSBjcmVhdGVTZXJ2ZXJEYXRhSGFuZGxlcigpO1xuICBzZXJ2ZXJSZXNIYW5kbGVyLm91dHB1dC5waXBlKFxuICAgIHRhcChtc2cgPT4ge1xuICAgICAgaWYgKG1zZyAhPSBudWxsKVxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2coJyAgPC0gJyArIG1zZy5tYXAodG9rZW4gPT4gdG9rZW4udGV4dCkuam9pbignICcpKTtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuXG4gIGxldCBzb2NrZXQ6IFRMU1NvY2tldHx1bmRlZmluZWQ7XG4gIHRyeSB7XG4gICAgc29ja2V0ID0gYXdhaXQgbmV3IFByb21pc2U8UmV0dXJuVHlwZTx0eXBlb2YgdHNsQ29ubmVjdD4+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHNvY2tldCA9IHRzbENvbm5lY3Qoe1xuICAgICAgICBob3N0OiBJTUFQLCBwb3J0OiA5OTMsXG4gICAgICAgIGVuYWJsZVRyYWNlOiB0cnVlXG4gICAgICB9IGFzIENvbm5lY3Rpb25PcHRpb25zKTtcblxuICAgICAgc29ja2V0Lm9uKCdzZWN1cmVDb25uZWN0JywgKCkgPT4ge1xuICAgICAgICBsb2cuaW5mbygnY29ubmVjdGVkJywgc29ja2V0LmF1dGhvcml6ZWQgPyAnYXV0aG9yaXplZCcgOiAndW5hdXRob3JpemVkJyk7XG4gICAgICAgIHJlc29sdmUoc29ja2V0KTtcbiAgICAgIH0pXG4gICAgICAub24oJ2Vycm9yJywgZXJyID0+IHJlamVjdChlcnIpKVxuICAgICAgLm9uKCd0aW1lb3V0JywgKCkgPT4gcmVqZWN0KG5ldyBFcnJvcignVGltZW91dCcpKSk7XG4gICAgICBzb2NrZXQub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGRhdGEudG9TdHJpbmcoKSk7XG4gICAgICAgIHNlcnZlclJlc0hhbmRsZXIuaW5wdXQoZGF0YSk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IHdhaXRGb3JSZXBseSgpO1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseSgnSUQgKFwibmFtZVwiIFwiY29tLnRlbmNlbnQuZm94bWFpbFwiIFwidmVyc2lvblwiIFwiNy4yLjkuNzlcIiknKTtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoYExPR0lOICR7RU1BSUx9ICR7U0VDUkVUfWApO1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseSgnU0VMRUNUIElOQk9YJywgYXN5bmMgbGEgPT4ge1xuICAgICAgY29uc3QgZXhpdHNUayA9IGF3YWl0IGxhLmxhKDMpO1xuICAgICAgaWYgKGV4aXRzVGsgJiYgZXhpdHNUay50ZXh0LnRvVXBwZXJDYXNlKCkgPT09ICdFWElTVFMnKSB7XG4gICAgICAgIGNvbnRleHQubGFzdEluZGV4ID0gcGFyc2VJbnQoKGF3YWl0IGxhLmxhKDIpKSEudGV4dCwgMTApO1xuICAgICAgfVxuICAgIH0pO1xuICAgIC8vIGF3YWl0IHdhaXRGb3JSZXBseSgnU0VBUkNIIEFMTCcpO1xuXG4gICAgYXdhaXQgY2FsbGJhY2soY29udGV4dCBhcyBJbWFwQ29tbWFuZENvbnRleHQpO1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseSgnTE9HT1VUJyk7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgbG9nLmVycm9yKGV4KTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgd2FpdEZvclJlcGx5KCdMT0dPVVQnKTtcbiAgICB9IGNhdGNoIChlcikge31cbiAgICBpZiAoc29ja2V0KVxuICAgICAgc29ja2V0LmVuZCgpO1xuICAgIHRocm93IGV4O1xuICB9XG5cbiAgc2VydmVyUmVzSGFuZGxlci5pbnB1dChudWxsKTtcbiAgc29ja2V0LmVuZCgpO1xuXG4gIGFzeW5jIGZ1bmN0aW9uIHdhaXRGb3JGZXRjaFRleHQoaW5kZXg6IG51bWJlcikge1xuICAgIGxldCBib2R5MTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseShgRkVUQ0ggJHtpbmRleH0gQk9EWVsxXWAsIGFzeW5jIGxhID0+IHtcbiAgICAgIHdoaWxlICgoYXdhaXQgbGEubGEoKSkgIT0gbnVsbCkge1xuICAgICAgICBjb25zdCB0b2tlbiA9IGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgICAgaWYgKHRva2VuLnRleHQgPT09ICdCT0RZJyAmJiAoYXdhaXQgbGEubGEoKSkhLnRleHQgPT09ICdbMV0nKSB7XG4gICAgICAgICAgYXdhaXQgbGEuYWR2YW5jZSgpO1xuICAgICAgICAgIGJvZHkxID0gKChhd2FpdCBsYS5hZHZhbmNlKCkpIGFzIHVua25vd24gYXMgU3RyaW5nTGl0KS5kYXRhLnRvU3RyaW5nKCd1dGY4Jyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGxvZy53YXJuKGJ1Zik7XG4gICAgLy8gcmV0dXJuIC9eXFwqXFxzK1xcZCtcXHMrRkVUQ0hcXHMrXFwoLio/XFx7XFxkK1xcfShbXl0qKVxcKSQvbS5leGVjKGJ1ZikhWzFdO1xuICAgIHJldHVybiBib2R5MTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHdhaXRGb3JSZXBseTxSID0gYW55Pihjb21tYW5kPzogc3RyaW5nLCBvbkxpbmU/OiAobGE6IExvb2tBaGVhZDxUb2tlbjxJbWFwVG9rZW5UeXBlPj4sIHRhZzogc3RyaW5nKSA9PiBQcm9taXNlPFI+KTogUHJvbWlzZTxSIHwgbnVsbD4ge1xuICAgIGxldCB0YWc6IHN0cmluZztcbiAgICBpZiAoY29tbWFuZClcbiAgICAgIHRhZyA9ICdhJyArIChjbWRJZHgrKyk7XG5cbiAgICBsZXQgcmVzdWx0OiBSIHwgbnVsbCA9IG51bGw7XG4gICAgY29uc3QgcHJvbSA9IHBhcnNlTGluZXNPZlRva2VucyhzZXJ2ZXJSZXNIYW5kbGVyLm91dHB1dCwgYXN5bmMgbGEgPT4ge1xuICAgICAgY29uc3QgcmVzVGFnID0gYXdhaXQgbGEubGEoKTtcbiAgICAgIGlmICghdGFnICYmIHJlc1RhZyEudGV4dCA9PT0gJyonIHx8IHJlc1RhZyEudGV4dCA9PT0gdGFnKSB7XG4gICAgICAgIGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBhd2FpdCBsYS5sYSgpO1xuICAgICAgICBsZXQgcmV0dXJuVGV4dCA9ICcnO1xuICAgICAgICBpZiAoL09LfE5PLy50ZXN0KHN0YXRlIS50ZXh0KSkge1xuICAgICAgICAgIHJldHVyblRleHQgKz0gKGF3YWl0IGxhLmFkdmFuY2UoKSkudGV4dDtcbiAgICAgICAgICB3aGlsZSAoKGF3YWl0IGxhLmxhKCkpICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVyblRleHQgKz0gJyAnICsgKGF3YWl0IGxhLmFkdmFuY2UoKSkudGV4dDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldHVyblRleHQ7XG4gICAgICB9IGVsc2UgaWYgKG9uTGluZSkge1xuICAgICAgICByZXN1bHQgPSBhd2FpdCBvbkxpbmUobGEsIHRhZyk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAoY29tbWFuZCkge1xuICAgICAgY29uc3QgY21kID0gdGFnISArICcgJyArIGNvbW1hbmQ7XG4gICAgICBpZiAoc29ja2V0KVxuICAgICAgICBzb2NrZXQud3JpdGUoQnVmZmVyLmZyb20oYCR7dGFnIX0gJHtjb21tYW5kfVxcclxcbmAsICd1dGY4JykpO1xuICAgICAgbG9nLmRlYnVnKCc9PicsIGNtZCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb20udGhlbigoKSA9PiByZXN1bHQpO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gd2FpdEZvckZldGNoKG1haWxJZHg6IHN0cmluZyB8IG51bWJlciA9ICcqJywgaGVhZGVyT25seSA9IHRydWUsIG92ZXJyaWRlRmlsZU5hbWU/OiBzdHJpbmcpOiBQcm9taXNlPEltYXBGZXRjaERhdGE+IHtcbiAgICBjb25zdCBvcmlnaW5Mb2dFbmFibGVkID0gbG9nRW5hYmxlZDtcbiAgICBsb2dFbmFibGVkID0gaGVhZGVyT25seTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB3YWl0Rm9yUmVwbHkoYEZFVENIICR7bWFpbElkeH0gUkZDODIyJHtoZWFkZXJPbmx5ID8gJy5IRUFERVInIDogJyd9YCwgYXN5bmMgKGxhKSA9PiB7XG4gICAgICBsZXQgbXNnOiBSQ0Y4MjJQYXJzZVJlc3VsdCB8IHVuZGVmaW5lZDtcbiAgICAgIHdoaWxlICgoYXdhaXQgbGEubGEoKSkgIT0gbnVsbCkge1xuICAgICAgICBjb25zdCB0ayA9IGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgICAgaWYgKHRrLnR5cGUgIT09IEltYXBUb2tlblR5cGUuc3RyaW5nTGl0KSB7XG4gICAgICAgICAgLy8gbG9nLmRlYnVnKHRrLnRleHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGxvZy5kZWJ1Zygnc3RyaW5nIGxpdGVyYWw6XFxuJywgKHRrIGFzIHVua25vd24gYXMgU3RyaW5nTGl0KS5kYXRhLmJ5dGVMZW5ndGgpO1xuICAgICAgICAgIC8vIGNvbnN0IHdyaXR0ZW5GaWxlID0gYGVtYWlsLSR7bmV3IERhdGUoKS5nZXRUaW1lKCl9LnR4dGA7XG4gICAgICAgICAgLy8gZnMud3JpdGVGaWxlU3luYyh3cml0dGVuRmlsZSwgKHRrIGFzIHVua25vd24gYXMgU3RyaW5nTGl0KS5kYXRhLCAndXRmOCcpO1xuICAgICAgICAgIC8vIGxvZy5kZWJ1Zyhgd3JpdGVuIHRvICR7d3JpdHRlbkZpbGV9YCk7XG4gICAgICAgICAgbXNnID0gcGFyc2VSZmM4MjIoKHRrIGFzIFN0cmluZ0xpdCkuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGhlYWRlcnM6IG1zZyA/IG1zZy5oZWFkZXJzLnJlZHVjZSgocHJldiwgY3VycikgPT4ge1xuICAgICAgICAgIHByZXZbY3Vyci5rZXkudG9Mb3dlckNhc2UoKV0gPSBjdXJyLnZhbHVlO1xuICAgICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgICB9LCB7fSBhcyBJbWFwRmV0Y2hEYXRhWydoZWFkZXJzJ10pIDoge30sXG4gICAgICAgIHRleHRzOiBtc2cgPyBtc2cucGFydHMuZmlsdGVyKHBhcnQgPT4gcGFydC5ib2R5ICE9IG51bGwpLm1hcChwYXJ0ID0+IHBhcnQuYm9keSEudG9TdHJpbmcoKSkgOiBbXSxcbiAgICAgICAgZmlsZXM6IG1zZyA/IG1zZy5wYXJ0cy5maWx0ZXIocGFydCA9PiBwYXJ0LmZpbGUgIT0gbnVsbCkubWFwKHBhcnQgPT4gcGFydC5maWxlISkgOiBbXVxuICAgICAgfSBhcyBJbWFwRmV0Y2hEYXRhO1xuICAgIH0pO1xuICAgIGxvZ0VuYWJsZWQgPSBvcmlnaW5Mb2dFbmFibGVkO1xuXG4gICAgaWYgKG92ZXJyaWRlRmlsZU5hbWUgJiYgcmVzdWx0IS5maWxlc1swXSkge1xuICAgICAgZnMucmVuYW1lU3luYyhyZXN1bHQhLmZpbGVzWzBdLCBvdmVycmlkZUZpbGVOYW1lKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0ITtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGZpbmRNYWlsKGZyb21JbmR4OiBudW1iZXIsIHN1YmplY3Q6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyIHwgdW5kZWZpbmVkPiB7XG4gICAgbG9nLmluZm8oJ2ZpbmRNYWlsJywgZnJvbUluZHgsIHN1YmplY3QpO1xuICAgIHdoaWxlIChmcm9tSW5keCA+IDApIHtcbiAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IHdhaXRGb3JGZXRjaChmcm9tSW5keCk7XG4gICAgICBpZiAocmVzLmhlYWRlcnMuc3ViamVjdCkge1xuICAgICAgICBsb2cuZGVidWcocmVzLmhlYWRlcnMuc3ViamVjdCk7XG4gICAgICB9XG4gICAgICBpZiAocmVzLmhlYWRlcnMuc3ViamVjdCAmJiByZXMuaGVhZGVycy5zdWJqZWN0WzBdLmluZGV4T2Yoc3ViamVjdCkgPj0gMClcbiAgICAgICAgcmV0dXJuIGZyb21JbmR4O1xuICAgICAgZnJvbUluZHgtLTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgSW1hcE1hbmFnZXIge1xuICBjaGVja3N1bVN0YXRlID0gbmV3IEJlaGF2aW9yU3ViamVjdDxDaGVja3N1bSB8IG51bGw+KG51bGwpO1xuICBmaWxlV3JpdGluZ1N0YXRlOiBJbWFwQ29tbWFuZENvbnRleHRbJ2ZpbGVXcml0aW5nU3RhdGUnXTtcbiAgd2F0Y2hpbmcgPSBmYWxzZTtcbiAgcHJpdmF0ZSB0b0ZldGNoQXBwc1N0YXRlID0gbmV3IEJlaGF2aW9yU3ViamVjdDxzdHJpbmdbXT4oW10pO1xuXG4gIHByaXZhdGUgY3R4OiBJbWFwQ29tbWFuZENvbnRleHQ7XG5cbiAgY29uc3RydWN0b3IocHVibGljIGVudjogc3RyaW5nLCBwdWJsaWMgemlwRG93bmxvYWREaXI/OiBzdHJpbmcpIHtcbiAgICBpZiAoemlwRG93bmxvYWREaXIgPT0gbnVsbClcbiAgICAgIHRoaXMuemlwRG93bmxvYWREaXIgPSBQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGN1cnJDaGVja3N1bUZpbGUpLCAnZGVwbG95LXN0YXRpYy0nICsgZW52KTtcbiAgfVxuXG4gIGFzeW5jIGZldGNoQ2hlY2tzdW0oKSB7XG4gIC8vICAgbGV0IGNzOiBDaGVja3N1bSB8IHVuZGVmaW5lZDtcbiAgLy8gICBhd2FpdCBjb25uZWN0SW1hcChhc3luYyBjdHggPT4ge1xuICAvLyAgICAgY3MgPSBhd2FpdCB0aGlzLl9mZXRjaENoZWNrc3VtKGN0eCk7XG4gIC8vICAgfSk7XG4gIC8vICAgbG9nLmluZm8oJ2ZldGNoZWQgY2hlY2tzdW06JywgY3MpO1xuICAvLyAgIHRoaXMuY2hlY2tzdW1TdGF0ZS5uZXh0KGNzISk7XG4gIC8vICAgcmV0dXJuIGNzO1xuICB9XG5cbiAgYXN5bmMgZmV0Y2hVcGRhdGVDaGVja1N1bShhcHBOYW1lOiBzdHJpbmcpIHtcbiAgLy8gICBsZXQgY3MgPSBhd2FpdCB0aGlzLmZldGNoQ2hlY2tzdW0oKTtcbiAgLy8gICBsb2cuaW5mbygnZmV0Y2hlZCBjaGVja3N1bTonLCBjcyk7XG4gIC8vICAgaWYgKGNzIS52ZXJzaW9ucyFbYXBwTmFtZV0gPT0gbnVsbCkge1xuICAvLyAgICAgY3MhLnZlcnNpb25zIVthcHBOYW1lXSA9IHtcbiAgLy8gICAgICAgdmVyc2lvbjogMCxcbiAgLy8gICAgICAgcGF0aDogJzxzZWUgYXR0YWNoZW1lbnQgZmlsZSBuYW1lPidcbiAgLy8gICAgIH07XG4gIC8vICAgfVxuICAvLyAgIGNzIS52ZXJzaW9ucyFbYXBwTmFtZV0udmVyc2lvbisrO1xuICAvLyAgIHRoaXMuY2hlY2tzdW1TdGF0ZS5uZXh0KGNzISk7XG4gIC8vICAgZnMubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUoY3VyckNoZWNrc3VtRmlsZSkpO1xuICAvLyAgIGNvbnN0IGNoZWNrc3VtU3RyID0gSlNPTi5zdHJpbmdpZnkoY3MhLCBudWxsLCAnICAnKTtcbiAgLy8gICBmcy53cml0ZUZpbGVTeW5jKGN1cnJDaGVja3N1bUZpbGUsIGNoZWNrc3VtU3RyKTtcbiAgLy8gICBsb2cuaW5mbygnd3JpdGUgJXNcXG4lcycsIGN1cnJDaGVja3N1bUZpbGUsIGNoZWNrc3VtU3RyKTtcbiAgLy8gICByZXR1cm4gY3MhO1xuICB9XG5cbiAgLyoqXG4gICAqIERvbmUgd2hlbiBmaWxlcyBhcmUgd3JpdHRlblxuICAgKiBAcGFyYW0gZXhjbHVkZUFwcCBleGNsdWRlIGFwcFxuICAgKi9cbiAgYXN5bmMgZmV0Y2hPdGhlclppcHMoZXhjbHVkZUFwcD86IHN0cmluZykge1xuICAvLyAgIGxldCBhcHBOYW1lcyA9IE9iamVjdC5rZXlzKHRoaXMuY2hlY2tzdW1TdGF0ZS5nZXRWYWx1ZSgpIS52ZXJzaW9ucyEpXG4gIC8vICAgLmZpbHRlcihhcHAgPT4gYXBwICE9PSBleGNsdWRlQXBwKTtcblxuICAvLyAgIGxldCBmaWxlV3JpdHRlblByb206IFByb21pc2U8Ym9vbGVhbj4gfCB1bmRlZmluZWQ7XG5cbiAgLy8gICBhd2FpdCBjb25uZWN0SW1hcChhc3luYyBjdHggPT4ge1xuXG4gIC8vICAgICBmaWxlV3JpdHRlblByb20gPSBjdHguZmlsZVdyaXRpbmdTdGF0ZS5waXBlKFxuICAvLyAgICAgICBza2lwKDEpLFxuICAvLyAgICAgICBmaWx0ZXIod3JpdGluZyA9PiAhd3JpdGluZyksXG4gIC8vICAgICAgIHRha2UoYXBwTmFtZXMubGVuZ3RoKVxuICAvLyAgICAgKS50b1Byb21pc2UoKTtcblxuICAvLyAgICAgZm9yIChjb25zdCBhcHAgb2YgYXBwTmFtZXMpIHtcbiAgLy8gICAgICAgbG9nLmluZm8oJ2ZldGNoIG90aGVyIHppcDogJyArIGFwcCk7XG4gIC8vICAgICAgIGNvbnN0IGlkeCA9IGF3YWl0IGN0eC5maW5kTWFpbChjdHgubGFzdEluZGV4LCBgYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tJHthcHB9KWApO1xuICAvLyAgICAgICBpZiAoIWlkeCkge1xuICAvLyAgICAgICAgIGxvZy5pbmZvKGBtYWlsIFwiYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tJHthcHB9KVwiIGlzIG5vdCBGb3VuZCwgc2tpcCBkb3dubG9hZCB6aXBgKTtcbiAgLy8gICAgICAgICBjb250aW51ZTtcbiAgLy8gICAgICAgfVxuICAvLyAgICAgICBhd2FpdCBjdHgud2FpdEZvckZldGNoKGlkeCwgZmFsc2UsIFBhdGgucmVzb2x2ZSh0aGlzLnppcERvd25sb2FkRGlyISwgYXBwICsgJy56aXAnKSk7XG4gIC8vICAgICB9XG4gIC8vICAgfSk7XG4gIC8vICAgaWYgKGZpbGVXcml0dGVuUHJvbSlcbiAgLy8gICAgIGF3YWl0IGZpbGVXcml0dGVuUHJvbTtcbiAgLy8gICByZXR1cm4gYXBwTmFtZXM7XG4gIH1cblxuICBhc3luYyBhcHBlbmRNYWlsKHN1YmplY3Q6IHN0cmluZywgY29udGVudDogc3RyaW5nKSB7XG4gICAgYXdhaXQgY29ubmVjdEltYXAoYXN5bmMgY3R4ID0+IHtcbiAgICAgIGF3YWl0IGN0eC5hcHBlbmRNYWlsKHN1YmplY3QsIGNvbnRlbnQpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gYXN5bmMgc3RhcnRXYXRjaE1haWwocG9sbEludGVydmFsID0gNjAwMDApIHtcbiAgLy8gICB0aGlzLndhdGNoaW5nID0gdHJ1ZTtcbiAgLy8gICB3aGlsZSAodGhpcy53YXRjaGluZykge1xuICAvLyAgICAgYXdhaXQgdGhpcy5jaGVja01haWxGb3JVcGRhdGUoKTtcbiAgLy8gICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBwb2xsSW50ZXJ2YWwpKTsgLy8gNjAgc2VjXG4gIC8vICAgfVxuICAvLyB9XG5cbiAgYXN5bmMgY2hlY2tNYWlsRm9yVXBkYXRlKCkge1xuICAgIGF3YWl0IGNvbm5lY3RJbWFwKGFzeW5jIGN0eCA9PiB7XG4gICAgICB0aGlzLmN0eCA9IGN0eDtcbiAgICAgIHRoaXMuZmlsZVdyaXRpbmdTdGF0ZSA9IGN0eC5maWxlV3JpdGluZ1N0YXRlO1xuXG4gICAgICBjb25zdCBjcyA9IGF3YWl0IHRoaXMuX2ZldGNoQ2hlY2tzdW0oY3R4KTtcbiAgICAgIHRoaXMuY2hlY2tzdW1TdGF0ZS5uZXh0KGNzISk7XG5cbiAgICAgIGNvbnN0IHRvRmV0Y2hBcHBzID0gdGhpcy50b0ZldGNoQXBwc1N0YXRlLmdldFZhbHVlKCk7XG4gICAgICBpZiAodG9GZXRjaEFwcHMubGVuZ3RoID4gMCkge1xuICAgICAgICB0aGlzLnRvRmV0Y2hBcHBzU3RhdGUubmV4dChbXSk7XG4gICAgICAgIGZvciAoY29uc3QgYXBwTmFtZSBvZiB0b0ZldGNoQXBwcykge1xuICAgICAgICAgIGF3YWl0IHRoaXMuZmV0Y2hBdHRhY2htZW50KGFwcE5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBhd2FpdCBjdHgud2FpdEZvclJlcGx5KCdTVUJTQ1JJQkUgSU5CT1gnKTtcbiAgICAgIC8vIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAzMDAwMCkpOyAvLyAzMCBzZWNcbiAgICAgIGRlbGV0ZSB0aGlzLmN0eDtcbiAgICB9KTtcbiAgfVxuXG4gIGZldGNoQXBwRHVyaW5nV2F0Y2hBY3Rpb24oLi4uYXBwTmFtZXM6IHN0cmluZ1tdKSB7XG4gICAgdGhpcy50b0ZldGNoQXBwc1N0YXRlLm5leHQoYXBwTmFtZXMpO1xuICB9XG5cbiAgLy8gYXN5bmMgc2VuZEZpbGVBbmRVcGRhdGVkQ2hlY2tzdW0oYXBwTmFtZTogc3RyaW5nLCBmaWxlOiBzdHJpbmcpIHtcbiAgLy8gICBjb25zdCBjcyA9IGF3YWl0IHRoaXMuZmV0Y2hVcGRhdGVDaGVja1N1bShhcHBOYW1lKTtcbiAgLy8gICBhd2FpdCByZXRyeVNlbmRNYWlsKGBia2prLXByZS1idWlsZCgke3RoaXMuZW52fS0ke2FwcE5hbWV9KWAsIEpTT04uc3RyaW5naWZ5KGNzLCBudWxsLCAnICAnKSwgZmlsZSk7XG4gIC8vIH1cblxuICBzdG9wV2F0Y2goKSB7XG4gICAgdGhpcy53YXRjaGluZyA9IGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBmZXRjaEF0dGFjaG1lbnQoYXBwOiBzdHJpbmcpIHtcbiAgICAvLyBjb25zdCBpZHggPSBhd2FpdCB0aGlzLmN0eC5maW5kTWFpbCh0aGlzLmN0eC5sYXN0SW5kZXgsIGBia2prLXByZS1idWlsZCgke3RoaXMuZW52fS0ke2FwcH0pYCk7XG4gICAgLy8gaWYgKGlkeCA9PSBudWxsKVxuICAgIC8vICAgdGhyb3cgbmV3IEVycm9yKCdDYW50IGZpbmQgbWFpbDogJyArIGBia2prLXByZS1idWlsZCgke3RoaXMuZW52fS0ke2FwcH0pYCk7XG4gICAgLy8gYXdhaXQgdGhpcy5jdHgud2FpdEZvckZldGNoKGlkeCEsIGZhbHNlLCBQYXRoLnJlc29sdmUodGhpcy56aXBEb3dubG9hZERpciEsIGAke2FwcH0uemlwYCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBfZmV0Y2hDaGVja3N1bShjdHg6IEltYXBDb21tYW5kQ29udGV4dCkge1xuICAgIGNvbnN0IGlkeCA9IGF3YWl0IGN0eC5maW5kTWFpbChjdHgubGFzdEluZGV4LCBgYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tYCk7XG4gICAgbG9nLmluZm8oJ19mZXRjaENoZWNrc3VtLCBpbmRleDonLCBpZHgpO1xuICAgIGlmIChpZHggPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zdCBqc29uU3RyID0gYXdhaXQgY3R4LndhaXRGb3JGZXRjaFRleHQoaWR4ISk7XG4gICAgaWYgKGpzb25TdHIgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdFbXB0eSBKU09OIHRleHQnKTtcbiAgICB9XG4gICAgcmV0dXJuIEpTT04ucGFyc2UoanNvblN0cikgYXMgQ2hlY2tzdW07XG4gIH1cblxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdGVzdE1haWwoaW1hcDogc3RyaW5nLCB1c2VyOiBzdHJpbmcsIGxvZ2luU2VjcmV0OiBzdHJpbmcpIHtcbiAgbG9nLmRlYnVnID0gbG9nLmluZm87XG4gIGlmIChpbWFwKVxuICAgIGFwaS5jb25maWcuc2V0KFthcGkucGFja2FnZU5hbWUsICdmZXRjaE1haWxTZXJ2ZXInXSwge1xuICAgICAgaW1hcCwgdXNlciwgbG9naW5TZWNyZXRcbiAgICB9IGFzIFdpdGhNYWlsU2VydmVyQ29uZmlnWydmZXRjaE1haWxTZXJ2ZXInXSk7XG4gIGF3YWl0IGNvbm5lY3RJbWFwKGFzeW5jIGN0eCA9PiB7XG4gICAgYXdhaXQgY3R4LndhaXRGb3JSZXBseSgnU0VBUkNIIEhFQUQgU3ViamVjdCBcImJ1aWxkIGFydGlmYWN0OiBia2prLXByZS1idWlsZFwiJyk7XG4gIH0pO1xufVxuIl19
