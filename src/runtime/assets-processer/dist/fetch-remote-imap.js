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
        // checksum: Checksum;
        this.checksumState = new rxjs_1.BehaviorSubject(null);
        this.watching = false;
        this.toFetchAppsState = new rxjs_1.BehaviorSubject([]);
        if (zipDownloadDir == null)
            this.zipDownloadDir = path_1.default.resolve(path_1.default.dirname(currChecksumFile), 'deploy-static-' + env);
    }
    fetchChecksum() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let cs;
            yield connectImap((ctx) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                cs = yield this._fetchChecksum(ctx);
            }));
            log.info('fetched checksum:', cs);
            this.checksumState.next(cs);
            return cs;
        });
    }
    fetchUpdateCheckSum(appName) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let cs = yield this.fetchChecksum();
            log.info('fetched checksum:', cs);
            if (cs.versions[appName] == null) {
                cs.versions[appName] = {
                    version: 0,
                    path: '<see attachement file name>'
                };
            }
            cs.versions[appName].version++;
            this.checksumState.next(cs);
            fs_extra_1.default.mkdirpSync(path_1.default.dirname(currChecksumFile));
            const checksumStr = JSON.stringify(cs, null, '  ');
            fs_extra_1.default.writeFileSync(currChecksumFile, checksumStr);
            log.info('write %s\n%s', currChecksumFile, checksumStr);
            return cs;
        });
    }
    /**
     * Done when files are written
     * @param excludeApp exclude app
     */
    fetchOtherZips(excludeApp) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let appNames = Object.keys(this.checksumState.getValue().versions)
                .filter(app => app !== excludeApp);
            let fileWrittenProm;
            yield connectImap((ctx) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                fileWrittenProm = ctx.fileWritingState.pipe(operators_1.skip(1), operators_1.filter(writing => !writing), operators_1.take(appNames.length)).toPromise();
                for (const app of appNames) {
                    log.info('fetch other zip: ' + app);
                    const idx = yield ctx.findMail(ctx.lastIndex, `bkjk-pre-build(${this.env}-${app})`);
                    if (!idx) {
                        log.info(`mail "bkjk-pre-build(${this.env}-${app})" is not Found, skip download zip`);
                        continue;
                    }
                    yield ctx.waitForFetch(idx, false, path_1.default.resolve(this.zipDownloadDir, app + '.zip'));
                }
            }));
            if (fileWrittenProm)
                yield fileWrittenProm;
            return appNames;
        });
    }
    appendMail(subject, content) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield connectImap((ctx) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield ctx.appendMail(subject, content);
            }));
        });
    }
    startWatchMail(pollInterval = 60000) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this.watching = true;
            while (this.watching) {
                yield this.checkMailForUpdate();
                yield new Promise(resolve => setTimeout(resolve, pollInterval)); // 60 sec
            }
        });
    }
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
    sendFileAndUpdatedChecksum(appName, file) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const cs = yield this.fetchUpdateCheckSum(appName);
            yield retrySendMail(`bkjk-pre-build(${this.env}-${appName})`, JSON.stringify(cs, null, '  '), file);
        });
    }
    stopWatch() {
        this.watching = false;
    }
    fetchAttachment(app) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const idx = yield this.ctx.findMail(this.ctx.lastIndex, `bkjk-pre-build(${this.env}-${app})`);
            if (idx == null)
                throw new Error('Cant find mail: ' + `bkjk-pre-build(${this.env}-${app})`);
            yield this.ctx.waitForFetch(idx, false, path_1.default.resolve(this.zipDownloadDir, `${app}.zip`));
        });
    }
    _fetchChecksum(ctx) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const idx = yield ctx.findMail(ctx.lastIndex, `bkjk-pre-build(${this.env}-`);
            log.info('_fetchChecksum, index:', idx);
            if (idx == null) {
                return { versions: {} };
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
            // tslint:disable-next-line: no-console
            // console.log('Fetch mail %d as text :\n', ctx.lastIndex - 1, (await ctx.waitForFetch(ctx.lastIndex - 1)), ctx.lastIndex);
            // log.info('Fetch mail %d:\n' + await ctx.waitForFetch(ctx.lastIndex, false), ctx.lastIndex);
        }));
    });
}
exports.testMail = testMail;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS1pbWFwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDJDQUE2QztBQUU3QywrQkFBa0Q7QUFDbEQsOENBQzRDO0FBQzVDLDZCQUEwRTtBQUMxRSxnRUFBMEI7QUFFMUIsd0RBQXdCO0FBRXhCLDREQUE2RztBQUM3RywwREFBd0I7QUFFeEIsa0VBQWtGO0FBRWxGLDhCQUE4QjtBQUM5QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsb0JBQW9CLENBQUMsQ0FBQztBQUVoRixNQUFNLE9BQU8sR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUF5QixDQUFDO0FBQ3hFLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFHNUUsTUFBTSxnQkFBZ0IsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUM7QUFFekcsU0FBc0IsUUFBUSxDQUFDLE9BQWUsRUFBRSxJQUFZLEVBQUUsSUFBYTs7UUFDekUsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRTtZQUM1QixHQUFHLENBQUMsSUFBSSxDQUFDLGtEQUFrRCxDQUFDLENBQUM7WUFDN0QsT0FBTztTQUNSO1FBQ0QsTUFBTSxFQUNKLElBQUksRUFBRSxLQUFLLEVBQ1gsV0FBVyxFQUFFLE1BQU07UUFDbkIsY0FBYztR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QUM7UUFDckIsSUFBSSxJQUFJO1lBQ04sZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxlQUFHLENBQUMsV0FBVyxFQUFFLGlCQUFpQixDQUFDLEVBQUU7Z0JBQ25ELElBQUksRUFBRSxJQUFJLEVBQUUsV0FBVzthQUNtQixDQUFDLENBQUM7UUFDaEQsTUFBTSxXQUFXLENBQUMsQ0FBTSxHQUFHLEVBQUMsRUFBRTtZQUM1QixNQUFNLEdBQUcsQ0FBQyxZQUFZLENBQUMsc0RBQXNELENBQUMsQ0FBQztZQUMvRSx1Q0FBdUM7WUFDdkMsMkhBQTJIO1lBQzNILDhGQUE4RjtRQUNoRyxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUFBO0FBWkQsNEJBWUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9mZXRjaC1yZW1vdGUtaW1hcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZVRyYW5zcG9ydCB9IGZyb20gJ25vZGVtYWlsZXInO1xuaW1wb3J0IFNNVFBUcmFuc3BvcnQgZnJvbSAnbm9kZW1haWxlci9saWIvc210cC10cmFuc3BvcnQnO1xuaW1wb3J0IHtPYnNlcnZhYmxlLCBCZWhhdmlvclN1YmplY3QgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IG1hcCwgLypjb25jYXRNYXAsIHRha2VXaGlsZSwgdGFrZUxhc3QsIG1hcFRvLCovIHRhcCwgZGlzdGluY3RVbnRpbENoYW5nZWQsXG4gIHNraXAsIGZpbHRlciwgdGFrZX0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgY29ubmVjdCBhcyB0c2xDb25uZWN0LCBDb25uZWN0aW9uT3B0aW9ucywgVExTU29ja2V0IH0gZnJvbSAndGxzJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Q2hlY2tzdW0sIFdpdGhNYWlsU2VydmVyQ29uZmlnfSBmcm9tICcuL2ZldGNoLXR5cGVzJztcbmltcG9ydCB7Y3JlYXRlU2VydmVyRGF0YUhhbmRsZXIsIHBhcnNlTGluZXNPZlRva2VucywgSW1hcFRva2VuVHlwZSwgU3RyaW5nTGl0fSBmcm9tICcuL21haWwvaW1hcC1tc2ctcGFyc2VyJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHsgTG9va0FoZWFkLCBUb2tlbiB9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9hc3luYy1MTG4tcGFyc2VyJztcbmltcG9ydCB7cGFyc2UgYXMgcGFyc2VSZmM4MjIsIFJDRjgyMlBhcnNlUmVzdWx0fSBmcm9tICcuL21haWwvcmZjODIyLXN5bmMtcGFyc2VyJztcblxuLy8gaW1wb3J0IHtTb2NrZXR9IGZyb20gJ25ldCc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5mZXRjaC1yZW1vdGUtaW1hcCcpO1xuXG5jb25zdCBzZXR0aW5nID0gYXBpLmNvbmZpZy5nZXQoYXBpLnBhY2thZ2VOYW1lKSBhcyBXaXRoTWFpbFNlcnZlckNvbmZpZztcbmNvbnN0IGVudiA9IHNldHRpbmcuZmV0Y2hNYWlsU2VydmVyID8gc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIuZW52IDogJ2xvY2FsJztcblxuXG5jb25zdCBjdXJyQ2hlY2tzdW1GaWxlID0gUGF0aC5yZXNvbHZlKCdjaGVja3N1bS4nICsgKHNldHRpbmcuZmV0Y2hNYWlsU2VydmVyID8gZW52IDogJ2xvY2FsJykgKyAnLmpzb24nKTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlbmRNYWlsKHN1YmplY3Q6IHN0cmluZywgdGV4dDogc3RyaW5nLCBmaWxlPzogc3RyaW5nKSB7XG4gIGxvZy5pbmZvKCdsb2dpbicpO1xuICBpZiAoIXNldHRpbmcuZmV0Y2hNYWlsU2VydmVyKSB7XG4gICAgbG9nLndhcm4oJ2ZldGNoTWFpbFNlcnZlciBpcyBub3QgY29uZmlndXJlZCEgU2tpcCBzZW5kTWFpbCcpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCB7XG4gICAgdXNlcjogRU1BSUwsXG4gICAgbG9naW5TZWNyZXQ6IFNFQ1JFVCxcbiAgICAvLyBpbWFwOiBJTUFQLFxuICAgIHNtdHA6IFNNVFBcbiAgfSA9IHNldHRpbmcuZmV0Y2hNYWlsU2VydmVyO1xuXG4gIGNvbnN0IHRyYW5zcG9ydGVyID0gY3JlYXRlVHJhbnNwb3J0KHtcbiAgICBob3N0OiBTTVRQLFxuICAgIGF1dGg6IHtcbiAgICAgIHR5cGU6ICdsb2dpbicsXG4gICAgICB1c2VyOiBFTUFJTCxcbiAgICAgIHBhc3M6IFNFQ1JFVFxuICAgIH0sXG4gICAgc2VjdXJlOiB0cnVlXG4gIH0gYXMgU01UUFRyYW5zcG9ydC5PcHRpb25zKTtcblxuICBsb2cuaW5mbygnc2VuZCBtYWlsJyk7XG4gIGNvbnN0IGluZm8gPSBhd2FpdCB0cmFuc3BvcnRlci5zZW5kTWFpbCh7XG4gICAgZnJvbTogRU1BSUwsXG4gICAgdG86IEVNQUlMLFxuICAgIHN1YmplY3Q6IGBidWlsZCBhcnRpZmFjdDogJHtzdWJqZWN0fWAsXG4gICAgdGV4dCxcbiAgICBhdHRhY2htZW50czogZmlsZSA/IFtcbiAgICAgIHtcbiAgICAgICAgZmlsZW5hbWU6IFBhdGguYmFzZW5hbWUoZmlsZSksXG4gICAgICAgIHBhdGg6IFBhdGgucmVzb2x2ZShmaWxlKVxuICAgICAgfVxuICAgIF0gOiB1bmRlZmluZWRcbiAgfSk7XG5cbiAgbG9nLmluZm8oaW5mbyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXRyeVNlbmRNYWlsKHN1YmplY3Q6IHN0cmluZywgdGV4dDogc3RyaW5nLCBmaWxlPzogc3RyaW5nKSB7XG4gIGxldCBlcnJvcjogRXJyb3IgfCB1bmRlZmluZWQ7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHNlbmRNYWlsKHN1YmplY3QsIHRleHQsIGZpbGUpO1xuICAgICAgZXJyb3IgPSB1bmRlZmluZWQ7XG4gICAgICBicmVhaztcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGxvZy5pbmZvKCdHb3QgZXJyb3InLCBlcnIpO1xuICAgICAgZXJyb3IgPSBlcnI7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwMCkpO1xuICAgIH1cbiAgfVxuICBpZiAoZXJyb3IpIHtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEltYXBGZXRjaERhdGEge1xuICBoZWFkZXJzOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW10gfCB1bmRlZmluZWR9O1xuICB0ZXh0czogc3RyaW5nW107XG4gIGZpbGVzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbWFwQ29tbWFuZENvbnRleHQge1xuICAvKipcbiAgICogSW5kZXggb2YgbGF0ZXN0IG1haWxcbiAgICovXG4gIGxhc3RJbmRleDogbnVtYmVyO1xuICBmaWxlV3JpdGluZ1N0YXRlOiBPYnNlcnZhYmxlPGJvb2xlYW4+O1xuICB3YWl0Rm9yUmVwbHk8UiA9IGFueT4oY29tbWFuZD86IHN0cmluZyxcbiAgICBvbkxpbmU/OiAobGE6IExvb2tBaGVhZDxUb2tlbjxJbWFwVG9rZW5UeXBlPj4sIHRhZzogc3RyaW5nKSA9PiBQcm9taXNlPFI+KTogUHJvbWlzZTxSIHwgbnVsbD47XG4gIGZpbmRNYWlsKGZyb21JbmR4OiBudW1iZXIsIHN1YmplY3Q6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyIHwgdW5kZWZpbmVkPjtcbiAgd2FpdEZvckZldGNoKG1haWxJZHg6IHN0cmluZyB8IG51bWJlciwgaGVhZGVyT25seT86IGJvb2xlYW4sIG92ZXJyaWRlRmlsZU5hbWU/OiBzdHJpbmcpOiBQcm9taXNlPEltYXBGZXRjaERhdGE+O1xuICB3YWl0Rm9yRmV0Y2hUZXh0KGluZGV4OiBudW1iZXIpOiBQcm9taXNlPHN0cmluZyB8IHVuZGVmaW5lZD47XG4gIGFwcGVuZE1haWwoc3ViamVjdDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPHZvaWR8bnVsbD47XG59XG5cbi8qKlxuICogSU1BUCBzcGVjaWZpY2F0aW9uXG4gKiBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMTczMFxuICogXG4gKiBJRCBjb21tYW5kXG4gKiBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMjk3MVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY29ubmVjdEltYXAoY2FsbGJhY2s6IChjb250ZXh0OiBJbWFwQ29tbWFuZENvbnRleHQpID0+IFByb21pc2U8YW55Pikge1xuXG4gIGxldCBsb2dFbmFibGVkID0gdHJ1ZTtcbiAgbGV0IGNtZElkeCA9IDE7XG4gIGNvbnN0IGZpbGVXcml0aW5nU3RhdGUgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PFNldDxzdHJpbmc+PihuZXcgU2V0PHN0cmluZz4oKSk7XG5cbiAgaWYgKCFzZXR0aW5nLmZldGNoTWFpbFNlcnZlcikge1xuICAgIGxvZy53YXJuKCdmZXRjaE1haWxTZXJ2ZXIgaXMgbm90IGNvbmZpZ3VyZWQhIFNraXAgc2VuZE1haWwnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3Qge1xuICAgICAgdXNlcjogRU1BSUwsXG4gICAgICBsb2dpblNlY3JldDogU0VDUkVULFxuICAgICAgaW1hcDogSU1BUFxuICAgICAgLy8gc210cDogU01UUFxuICB9ID0gc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXI7XG5cbiAgY29uc3QgY29udGV4dDoge1trIGluIGtleW9mIEltYXBDb21tYW5kQ29udGV4dF0/OiBJbWFwQ29tbWFuZENvbnRleHRba119ID0ge307XG5cbiAgY29udGV4dC53YWl0Rm9yUmVwbHkgPSB3YWl0Rm9yUmVwbHk7XG4gIGNvbnRleHQud2FpdEZvckZldGNoID0gd2FpdEZvckZldGNoO1xuICBjb250ZXh0LndhaXRGb3JGZXRjaFRleHQgPSB3YWl0Rm9yRmV0Y2hUZXh0O1xuICBjb250ZXh0LmZpbmRNYWlsID0gZmluZE1haWw7XG4gIGNvbnRleHQuZmlsZVdyaXRpbmdTdGF0ZSA9IGZpbGVXcml0aW5nU3RhdGUucGlwZShcbiAgICBtYXAoZmlsZVNldCA9PiB7XG4gICAgICAvLyBsb2cud2Fybignd3JpdGluZzogJywgZmlsZVNldC52YWx1ZXMoKSk7XG4gICAgICByZXR1cm4gZmlsZVNldC5zaXplID4gMDtcbiAgICB9KSxcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpXG4gICk7XG5cbiAgY29udGV4dC5hcHBlbmRNYWlsID0gKHN1YmplY3Q6IHN0cmluZywgY29udGVudDogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgbWFpbEJvZHkgPSBgRGF0ZTogTW9uLCA3IEZlYiAyMDIwIDIxOjUyOjI1IC0wODAwIChQU1QpXG4gICAgICBGcm9tOiBDcmVkaXQgdGVhbSBidWlsZCBtYWNoaW5lXG4gICAgICBTdWJqZWN0OiAke3N1YmplY3R9XG4gICAgICBUbzogQWRtaW5pbnN0cmF0b3JcbiAgICAgIE1lc3NhZ2UtSWQ6IDxCMjczOTctMDEwMDAwMEBCbHVyZHlibG9vcC5DT00+XG4gICAgICBNSU1FLVZlcnNpb246IDEuMFxuICAgICAgQ29udGVudC1UeXBlOiBURVhUL1BMQUlOOyBDSEFSU0VUPVVTLUFTQ0lJXG4gICAgICBcbiAgICAgICR7Y29udGVudH1cbiAgICAgIGAucmVwbGFjZSgvXlsgXSsvbWcsICcnKS5yZXBsYWNlKC9cXHIvZywgJycpLnJlcGxhY2UoL1xcbi9nLCAnXFxyXFxuJyk7XG4gICAgcmV0dXJuIHdhaXRGb3JSZXBseShgQVBQRU5EIElOQk9YIHske21haWxCb2R5Lmxlbmd0aH19XFxyXFxuYCArIG1haWxCb2R5KTtcbiAgfTtcblxuICBjb25zdCBzZXJ2ZXJSZXNIYW5kbGVyID0gY3JlYXRlU2VydmVyRGF0YUhhbmRsZXIoKTtcbiAgc2VydmVyUmVzSGFuZGxlci5vdXRwdXQucGlwZShcbiAgICB0YXAobXNnID0+IHtcbiAgICAgIGlmIChtc2cgIT0gbnVsbClcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKCcgIDwtICcgKyBtc2cubWFwKHRva2VuID0+IHRva2VuLnRleHQpLmpvaW4oJyAnKSk7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcblxuICBsZXQgc29ja2V0OiBUTFNTb2NrZXR8dW5kZWZpbmVkO1xuICB0cnkge1xuICAgIHNvY2tldCA9IGF3YWl0IG5ldyBQcm9taXNlPFJldHVyblR5cGU8dHlwZW9mIHRzbENvbm5lY3Q+PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCBzb2NrZXQgPSB0c2xDb25uZWN0KHtcbiAgICAgICAgaG9zdDogSU1BUCwgcG9ydDogOTkzLFxuICAgICAgICBlbmFibGVUcmFjZTogdHJ1ZVxuICAgICAgfSBhcyBDb25uZWN0aW9uT3B0aW9ucyk7XG5cbiAgICAgIHNvY2tldC5vbignc2VjdXJlQ29ubmVjdCcsICgpID0+IHtcbiAgICAgICAgbG9nLmluZm8oJ2Nvbm5lY3RlZCcsIHNvY2tldC5hdXRob3JpemVkID8gJ2F1dGhvcml6ZWQnIDogJ3VuYXV0aG9yaXplZCcpO1xuICAgICAgICByZXNvbHZlKHNvY2tldCk7XG4gICAgICB9KVxuICAgICAgLm9uKCdlcnJvcicsIGVyciA9PiByZWplY3QoZXJyKSlcbiAgICAgIC5vbigndGltZW91dCcsICgpID0+IHJlamVjdChuZXcgRXJyb3IoJ1RpbWVvdXQnKSkpO1xuICAgICAgc29ja2V0Lm9uKCdkYXRhJywgKGRhdGE6IEJ1ZmZlcikgPT4ge1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhkYXRhLnRvU3RyaW5nKCkpO1xuICAgICAgICBzZXJ2ZXJSZXNIYW5kbGVyLmlucHV0KGRhdGEpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoKTtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoJ0lEIChcIm5hbWVcIiBcImNvbS50ZW5jZW50LmZveG1haWxcIiBcInZlcnNpb25cIiBcIjcuMi45Ljc5XCIpJyk7XG4gICAgYXdhaXQgd2FpdEZvclJlcGx5KGBMT0dJTiAke0VNQUlMfSAke1NFQ1JFVH1gKTtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoJ1NFTEVDVCBJTkJPWCcsIGFzeW5jIGxhID0+IHtcbiAgICAgIGNvbnN0IGV4aXRzVGsgPSBhd2FpdCBsYS5sYSgzKTtcbiAgICAgIGlmIChleGl0c1RrICYmIGV4aXRzVGsudGV4dC50b1VwcGVyQ2FzZSgpID09PSAnRVhJU1RTJykge1xuICAgICAgICBjb250ZXh0Lmxhc3RJbmRleCA9IHBhcnNlSW50KChhd2FpdCBsYS5sYSgyKSkhLnRleHQsIDEwKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICAvLyBhd2FpdCB3YWl0Rm9yUmVwbHkoJ1NFQVJDSCBBTEwnKTtcblxuICAgIGF3YWl0IGNhbGxiYWNrKGNvbnRleHQgYXMgSW1hcENvbW1hbmRDb250ZXh0KTtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoJ0xPR09VVCcpO1xuICB9IGNhdGNoIChleCkge1xuICAgIGxvZy5lcnJvcihleCk7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHdhaXRGb3JSZXBseSgnTE9HT1VUJyk7XG4gICAgfSBjYXRjaCAoZXIpIHt9XG4gICAgaWYgKHNvY2tldClcbiAgICAgIHNvY2tldC5lbmQoKTtcbiAgICB0aHJvdyBleDtcbiAgfVxuXG4gIHNlcnZlclJlc0hhbmRsZXIuaW5wdXQobnVsbCk7XG4gIHNvY2tldC5lbmQoKTtcblxuICBhc3luYyBmdW5jdGlvbiB3YWl0Rm9yRmV0Y2hUZXh0KGluZGV4OiBudW1iZXIpIHtcbiAgICBsZXQgYm9keTE6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoYEZFVENIICR7aW5kZXh9IEJPRFlbMV1gLCBhc3luYyBsYSA9PiB7XG4gICAgICB3aGlsZSAoKGF3YWl0IGxhLmxhKCkpICE9IG51bGwpIHtcbiAgICAgICAgY29uc3QgdG9rZW4gPSBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgICAgIGlmICh0b2tlbi50ZXh0ID09PSAnQk9EWScgJiYgKGF3YWl0IGxhLmxhKCkpIS50ZXh0ID09PSAnWzFdJykge1xuICAgICAgICAgIGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgICAgICBib2R5MSA9ICgoYXdhaXQgbGEuYWR2YW5jZSgpKSBhcyB1bmtub3duIGFzIFN0cmluZ0xpdCkuZGF0YS50b1N0cmluZygndXRmOCcpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBsb2cud2FybihidWYpO1xuICAgIC8vIHJldHVybiAvXlxcKlxccytcXGQrXFxzK0ZFVENIXFxzK1xcKC4qP1xce1xcZCtcXH0oW15dKilcXCkkL20uZXhlYyhidWYpIVsxXTtcbiAgICByZXR1cm4gYm9keTE7XG4gIH1cblxuICBmdW5jdGlvbiB3YWl0Rm9yUmVwbHk8UiA9IGFueT4oY29tbWFuZD86IHN0cmluZywgb25MaW5lPzogKGxhOiBMb29rQWhlYWQ8VG9rZW48SW1hcFRva2VuVHlwZT4+LCB0YWc6IHN0cmluZykgPT4gUHJvbWlzZTxSPik6IFByb21pc2U8UiB8IG51bGw+IHtcbiAgICBsZXQgdGFnOiBzdHJpbmc7XG4gICAgaWYgKGNvbW1hbmQpXG4gICAgICB0YWcgPSAnYScgKyAoY21kSWR4KyspO1xuXG4gICAgbGV0IHJlc3VsdDogUiB8IG51bGwgPSBudWxsO1xuICAgIGNvbnN0IHByb20gPSBwYXJzZUxpbmVzT2ZUb2tlbnMoc2VydmVyUmVzSGFuZGxlci5vdXRwdXQsIGFzeW5jIGxhID0+IHtcbiAgICAgIGNvbnN0IHJlc1RhZyA9IGF3YWl0IGxhLmxhKCk7XG4gICAgICBpZiAoIXRhZyAmJiByZXNUYWchLnRleHQgPT09ICcqJyB8fCByZXNUYWchLnRleHQgPT09IHRhZykge1xuICAgICAgICBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgICAgIGNvbnN0IHN0YXRlID0gYXdhaXQgbGEubGEoKTtcbiAgICAgICAgbGV0IHJldHVyblRleHQgPSAnJztcbiAgICAgICAgaWYgKC9PS3xOTy8udGVzdChzdGF0ZSEudGV4dCkpIHtcbiAgICAgICAgICByZXR1cm5UZXh0ICs9IChhd2FpdCBsYS5hZHZhbmNlKCkpLnRleHQ7XG4gICAgICAgICAgd2hpbGUgKChhd2FpdCBsYS5sYSgpKSAhPSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm5UZXh0ICs9ICcgJyArIChhd2FpdCBsYS5hZHZhbmNlKCkpLnRleHQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXR1cm5UZXh0O1xuICAgICAgfSBlbHNlIGlmIChvbkxpbmUpIHtcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgb25MaW5lKGxhLCB0YWcpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKGNvbW1hbmQpIHtcbiAgICAgIGNvbnN0IGNtZCA9IHRhZyEgKyAnICcgKyBjb21tYW5kO1xuICAgICAgaWYgKHNvY2tldClcbiAgICAgICAgc29ja2V0LndyaXRlKEJ1ZmZlci5mcm9tKGAke3RhZyF9ICR7Y29tbWFuZH1cXHJcXG5gLCAndXRmOCcpKTtcbiAgICAgIGxvZy5kZWJ1ZygnPT4nLCBjbWQpO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9tLnRoZW4oKCkgPT4gcmVzdWx0KTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIHdhaXRGb3JGZXRjaChtYWlsSWR4OiBzdHJpbmcgfCBudW1iZXIgPSAnKicsIGhlYWRlck9ubHkgPSB0cnVlLCBvdmVycmlkZUZpbGVOYW1lPzogc3RyaW5nKTogUHJvbWlzZTxJbWFwRmV0Y2hEYXRhPiB7XG4gICAgY29uc3Qgb3JpZ2luTG9nRW5hYmxlZCA9IGxvZ0VuYWJsZWQ7XG4gICAgbG9nRW5hYmxlZCA9IGhlYWRlck9ubHk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgd2FpdEZvclJlcGx5KGBGRVRDSCAke21haWxJZHh9IFJGQzgyMiR7aGVhZGVyT25seSA/ICcuSEVBREVSJyA6ICcnfWAsIGFzeW5jIChsYSkgPT4ge1xuICAgICAgbGV0IG1zZzogUkNGODIyUGFyc2VSZXN1bHQgfCB1bmRlZmluZWQ7XG4gICAgICB3aGlsZSAoKGF3YWl0IGxhLmxhKCkpICE9IG51bGwpIHtcbiAgICAgICAgY29uc3QgdGsgPSBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgICAgIGlmICh0ay50eXBlICE9PSBJbWFwVG9rZW5UeXBlLnN0cmluZ0xpdCkge1xuICAgICAgICAgIC8vIGxvZy5kZWJ1Zyh0ay50ZXh0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBsb2cuZGVidWcoJ3N0cmluZyBsaXRlcmFsOlxcbicsICh0ayBhcyB1bmtub3duIGFzIFN0cmluZ0xpdCkuZGF0YS5ieXRlTGVuZ3RoKTtcbiAgICAgICAgICAvLyBjb25zdCB3cml0dGVuRmlsZSA9IGBlbWFpbC0ke25ldyBEYXRlKCkuZ2V0VGltZSgpfS50eHRgO1xuICAgICAgICAgIC8vIGZzLndyaXRlRmlsZVN5bmMod3JpdHRlbkZpbGUsICh0ayBhcyB1bmtub3duIGFzIFN0cmluZ0xpdCkuZGF0YSwgJ3V0ZjgnKTtcbiAgICAgICAgICAvLyBsb2cuZGVidWcoYHdyaXRlbiB0byAke3dyaXR0ZW5GaWxlfWApO1xuICAgICAgICAgIG1zZyA9IHBhcnNlUmZjODIyKCh0ayBhcyBTdHJpbmdMaXQpLmRhdGEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBoZWFkZXJzOiBtc2cgPyBtc2cuaGVhZGVycy5yZWR1Y2UoKHByZXYsIGN1cnIpID0+IHtcbiAgICAgICAgICBwcmV2W2N1cnIua2V5LnRvTG93ZXJDYXNlKCldID0gY3Vyci52YWx1ZTtcbiAgICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgICAgfSwge30gYXMgSW1hcEZldGNoRGF0YVsnaGVhZGVycyddKSA6IHt9LFxuICAgICAgICB0ZXh0czogbXNnID8gbXNnLnBhcnRzLmZpbHRlcihwYXJ0ID0+IHBhcnQuYm9keSAhPSBudWxsKS5tYXAocGFydCA9PiBwYXJ0LmJvZHkhLnRvU3RyaW5nKCkpIDogW10sXG4gICAgICAgIGZpbGVzOiBtc2cgPyBtc2cucGFydHMuZmlsdGVyKHBhcnQgPT4gcGFydC5maWxlICE9IG51bGwpLm1hcChwYXJ0ID0+IHBhcnQuZmlsZSEpIDogW11cbiAgICAgIH0gYXMgSW1hcEZldGNoRGF0YTtcbiAgICB9KTtcbiAgICBsb2dFbmFibGVkID0gb3JpZ2luTG9nRW5hYmxlZDtcblxuICAgIGlmIChvdmVycmlkZUZpbGVOYW1lICYmIHJlc3VsdCEuZmlsZXNbMF0pIHtcbiAgICAgIGZzLnJlbmFtZVN5bmMocmVzdWx0IS5maWxlc1swXSwgb3ZlcnJpZGVGaWxlTmFtZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdCE7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBmaW5kTWFpbChmcm9tSW5keDogbnVtYmVyLCBzdWJqZWN0OiBzdHJpbmcpOiBQcm9taXNlPG51bWJlciB8IHVuZGVmaW5lZD4ge1xuICAgIGxvZy5pbmZvKCdmaW5kTWFpbCcsIGZyb21JbmR4LCBzdWJqZWN0KTtcbiAgICB3aGlsZSAoZnJvbUluZHggPiAwKSB7XG4gICAgICBjb25zdCByZXMgPSBhd2FpdCB3YWl0Rm9yRmV0Y2goZnJvbUluZHgpO1xuICAgICAgaWYgKHJlcy5oZWFkZXJzLnN1YmplY3QpIHtcbiAgICAgICAgbG9nLmRlYnVnKHJlcy5oZWFkZXJzLnN1YmplY3QpO1xuICAgICAgfVxuICAgICAgaWYgKHJlcy5oZWFkZXJzLnN1YmplY3QgJiYgcmVzLmhlYWRlcnMuc3ViamVjdFswXS5pbmRleE9mKHN1YmplY3QpID49IDApXG4gICAgICAgIHJldHVybiBmcm9tSW5keDtcbiAgICAgIGZyb21JbmR4LS07XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEltYXBNYW5hZ2VyIHtcbiAgLy8gY2hlY2tzdW06IENoZWNrc3VtO1xuICBjaGVja3N1bVN0YXRlID0gbmV3IEJlaGF2aW9yU3ViamVjdDxDaGVja3N1bSB8IG51bGw+KG51bGwpO1xuICBmaWxlV3JpdGluZ1N0YXRlOiBJbWFwQ29tbWFuZENvbnRleHRbJ2ZpbGVXcml0aW5nU3RhdGUnXTtcbiAgd2F0Y2hpbmcgPSBmYWxzZTtcbiAgcHJpdmF0ZSB0b0ZldGNoQXBwc1N0YXRlID0gbmV3IEJlaGF2aW9yU3ViamVjdDxzdHJpbmdbXT4oW10pO1xuICAvLyBwcml2YXRlICB6aXBEb3dubG9hZERpcjogc3RyaW5nO1xuICAvLyBwcml2YXRlIGltYXBBY3Rpb25zID0gbmV3IFN1YmplY3Q8KGN0eDogSW1hcENvbW1hbmRDb250ZXh0KSA9PiBQcm9taXNlPGFueT4+KCk7XG5cbiAgcHJpdmF0ZSBjdHg6IEltYXBDb21tYW5kQ29udGV4dDtcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgZW52OiBzdHJpbmcsIHB1YmxpYyB6aXBEb3dubG9hZERpcj86IHN0cmluZykge1xuICAgIGlmICh6aXBEb3dubG9hZERpciA9PSBudWxsKVxuICAgICAgdGhpcy56aXBEb3dubG9hZERpciA9IFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUoY3VyckNoZWNrc3VtRmlsZSksICdkZXBsb3ktc3RhdGljLScgKyBlbnYpO1xuICB9XG5cbiAgYXN5bmMgZmV0Y2hDaGVja3N1bSgpOiBQcm9taXNlPENoZWNrc3VtIHwgdW5kZWZpbmVkPiAge1xuICAgIGxldCBjczogQ2hlY2tzdW0gfCB1bmRlZmluZWQ7XG4gICAgYXdhaXQgY29ubmVjdEltYXAoYXN5bmMgY3R4ID0+IHtcbiAgICAgIGNzID0gYXdhaXQgdGhpcy5fZmV0Y2hDaGVja3N1bShjdHgpO1xuICAgIH0pO1xuICAgIGxvZy5pbmZvKCdmZXRjaGVkIGNoZWNrc3VtOicsIGNzKTtcbiAgICB0aGlzLmNoZWNrc3VtU3RhdGUubmV4dChjcyEpO1xuICAgIHJldHVybiBjcztcbiAgfVxuXG4gIGFzeW5jIGZldGNoVXBkYXRlQ2hlY2tTdW0oYXBwTmFtZTogc3RyaW5nKTogUHJvbWlzZTxDaGVja3N1bT4ge1xuICAgIGxldCBjcyA9IGF3YWl0IHRoaXMuZmV0Y2hDaGVja3N1bSgpO1xuICAgIGxvZy5pbmZvKCdmZXRjaGVkIGNoZWNrc3VtOicsIGNzKTtcbiAgICBpZiAoY3MhLnZlcnNpb25zIVthcHBOYW1lXSA9PSBudWxsKSB7XG4gICAgICBjcyEudmVyc2lvbnMhW2FwcE5hbWVdID0ge1xuICAgICAgICB2ZXJzaW9uOiAwLFxuICAgICAgICBwYXRoOiAnPHNlZSBhdHRhY2hlbWVudCBmaWxlIG5hbWU+J1xuICAgICAgfTtcbiAgICB9XG4gICAgY3MhLnZlcnNpb25zIVthcHBOYW1lXS52ZXJzaW9uKys7XG4gICAgdGhpcy5jaGVja3N1bVN0YXRlLm5leHQoY3MhKTtcbiAgICBmcy5ta2RpcnBTeW5jKFBhdGguZGlybmFtZShjdXJyQ2hlY2tzdW1GaWxlKSk7XG4gICAgY29uc3QgY2hlY2tzdW1TdHIgPSBKU09OLnN0cmluZ2lmeShjcyEsIG51bGwsICcgICcpO1xuICAgIGZzLndyaXRlRmlsZVN5bmMoY3VyckNoZWNrc3VtRmlsZSwgY2hlY2tzdW1TdHIpO1xuICAgIGxvZy5pbmZvKCd3cml0ZSAlc1xcbiVzJywgY3VyckNoZWNrc3VtRmlsZSwgY2hlY2tzdW1TdHIpO1xuICAgIHJldHVybiBjcyE7XG4gIH1cblxuICAvKipcbiAgICogRG9uZSB3aGVuIGZpbGVzIGFyZSB3cml0dGVuXG4gICAqIEBwYXJhbSBleGNsdWRlQXBwIGV4Y2x1ZGUgYXBwXG4gICAqL1xuICBhc3luYyBmZXRjaE90aGVyWmlwcyhleGNsdWRlQXBwPzogc3RyaW5nKSB7XG4gICAgbGV0IGFwcE5hbWVzID0gT2JqZWN0LmtleXModGhpcy5jaGVja3N1bVN0YXRlLmdldFZhbHVlKCkhLnZlcnNpb25zISlcbiAgICAuZmlsdGVyKGFwcCA9PiBhcHAgIT09IGV4Y2x1ZGVBcHApO1xuXG4gICAgbGV0IGZpbGVXcml0dGVuUHJvbTogUHJvbWlzZTxib29sZWFuPiB8IHVuZGVmaW5lZDtcblxuICAgIGF3YWl0IGNvbm5lY3RJbWFwKGFzeW5jIGN0eCA9PiB7XG5cbiAgICAgIGZpbGVXcml0dGVuUHJvbSA9IGN0eC5maWxlV3JpdGluZ1N0YXRlLnBpcGUoXG4gICAgICAgIHNraXAoMSksXG4gICAgICAgIGZpbHRlcih3cml0aW5nID0+ICF3cml0aW5nKSxcbiAgICAgICAgdGFrZShhcHBOYW1lcy5sZW5ndGgpXG4gICAgICApLnRvUHJvbWlzZSgpO1xuXG4gICAgICBmb3IgKGNvbnN0IGFwcCBvZiBhcHBOYW1lcykge1xuICAgICAgICBsb2cuaW5mbygnZmV0Y2ggb3RoZXIgemlwOiAnICsgYXBwKTtcbiAgICAgICAgY29uc3QgaWR4ID0gYXdhaXQgY3R4LmZpbmRNYWlsKGN0eC5sYXN0SW5kZXgsIGBia2prLXByZS1idWlsZCgke3RoaXMuZW52fS0ke2FwcH0pYCk7XG4gICAgICAgIGlmICghaWR4KSB7XG4gICAgICAgICAgbG9nLmluZm8oYG1haWwgXCJia2prLXByZS1idWlsZCgke3RoaXMuZW52fS0ke2FwcH0pXCIgaXMgbm90IEZvdW5kLCBza2lwIGRvd25sb2FkIHppcGApO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IGN0eC53YWl0Rm9yRmV0Y2goaWR4LCBmYWxzZSwgUGF0aC5yZXNvbHZlKHRoaXMuemlwRG93bmxvYWREaXIhLCBhcHAgKyAnLnppcCcpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoZmlsZVdyaXR0ZW5Qcm9tKVxuICAgICAgYXdhaXQgZmlsZVdyaXR0ZW5Qcm9tO1xuICAgIHJldHVybiBhcHBOYW1lcztcbiAgfVxuXG4gIGFzeW5jIGFwcGVuZE1haWwoc3ViamVjdDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpIHtcbiAgICBhd2FpdCBjb25uZWN0SW1hcChhc3luYyBjdHggPT4ge1xuICAgICAgYXdhaXQgY3R4LmFwcGVuZE1haWwoc3ViamVjdCwgY29udGVudCk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBzdGFydFdhdGNoTWFpbChwb2xsSW50ZXJ2YWwgPSA2MDAwMCkge1xuICAgIHRoaXMud2F0Y2hpbmcgPSB0cnVlO1xuICAgIHdoaWxlICh0aGlzLndhdGNoaW5nKSB7XG4gICAgICBhd2FpdCB0aGlzLmNoZWNrTWFpbEZvclVwZGF0ZSgpO1xuICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIHBvbGxJbnRlcnZhbCkpOyAvLyA2MCBzZWNcbiAgICB9XG4gIH1cblxuICBhc3luYyBjaGVja01haWxGb3JVcGRhdGUoKSB7XG4gICAgYXdhaXQgY29ubmVjdEltYXAoYXN5bmMgY3R4ID0+IHtcbiAgICAgIHRoaXMuY3R4ID0gY3R4O1xuICAgICAgdGhpcy5maWxlV3JpdGluZ1N0YXRlID0gY3R4LmZpbGVXcml0aW5nU3RhdGU7XG5cbiAgICAgIGNvbnN0IGNzID0gYXdhaXQgdGhpcy5fZmV0Y2hDaGVja3N1bShjdHgpO1xuICAgICAgdGhpcy5jaGVja3N1bVN0YXRlLm5leHQoY3MhKTtcblxuICAgICAgY29uc3QgdG9GZXRjaEFwcHMgPSB0aGlzLnRvRmV0Y2hBcHBzU3RhdGUuZ2V0VmFsdWUoKTtcbiAgICAgIGlmICh0b0ZldGNoQXBwcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHRoaXMudG9GZXRjaEFwcHNTdGF0ZS5uZXh0KFtdKTtcbiAgICAgICAgZm9yIChjb25zdCBhcHBOYW1lIG9mIHRvRmV0Y2hBcHBzKSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5mZXRjaEF0dGFjaG1lbnQoYXBwTmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIGF3YWl0IGN0eC53YWl0Rm9yUmVwbHkoJ1NVQlNDUklCRSBJTkJPWCcpO1xuICAgICAgLy8gYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDMwMDAwKSk7IC8vIDMwIHNlY1xuICAgICAgZGVsZXRlIHRoaXMuY3R4O1xuICAgIH0pO1xuICB9XG5cbiAgZmV0Y2hBcHBEdXJpbmdXYXRjaEFjdGlvbiguLi5hcHBOYW1lczogc3RyaW5nW10pIHtcbiAgICB0aGlzLnRvRmV0Y2hBcHBzU3RhdGUubmV4dChhcHBOYW1lcyk7XG4gIH1cblxuICBhc3luYyBzZW5kRmlsZUFuZFVwZGF0ZWRDaGVja3N1bShhcHBOYW1lOiBzdHJpbmcsIGZpbGU6IHN0cmluZykge1xuICAgIGNvbnN0IGNzID0gYXdhaXQgdGhpcy5mZXRjaFVwZGF0ZUNoZWNrU3VtKGFwcE5hbWUpO1xuICAgIGF3YWl0IHJldHJ5U2VuZE1haWwoYGJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LSR7YXBwTmFtZX0pYCwgSlNPTi5zdHJpbmdpZnkoY3MsIG51bGwsICcgICcpLCBmaWxlKTtcbiAgfVxuXG4gIHN0b3BXYXRjaCgpIHtcbiAgICB0aGlzLndhdGNoaW5nID0gZmFsc2U7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGZldGNoQXR0YWNobWVudChhcHA6IHN0cmluZykge1xuICAgIGNvbnN0IGlkeCA9IGF3YWl0IHRoaXMuY3R4LmZpbmRNYWlsKHRoaXMuY3R4Lmxhc3RJbmRleCwgYGJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LSR7YXBwfSlgKTtcbiAgICBpZiAoaWR4ID09IG51bGwpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbnQgZmluZCBtYWlsOiAnICsgYGJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LSR7YXBwfSlgKTtcbiAgICBhd2FpdCB0aGlzLmN0eC53YWl0Rm9yRmV0Y2goaWR4ISwgZmFsc2UsIFBhdGgucmVzb2x2ZSh0aGlzLnppcERvd25sb2FkRGlyISwgYCR7YXBwfS56aXBgKSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIF9mZXRjaENoZWNrc3VtKGN0eDogSW1hcENvbW1hbmRDb250ZXh0KSB7XG4gICAgY29uc3QgaWR4ID0gYXdhaXQgY3R4LmZpbmRNYWlsKGN0eC5sYXN0SW5kZXgsIGBia2prLXByZS1idWlsZCgke3RoaXMuZW52fS1gKTtcbiAgICBsb2cuaW5mbygnX2ZldGNoQ2hlY2tzdW0sIGluZGV4OicsIGlkeCk7XG4gICAgaWYgKGlkeCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4ge3ZlcnNpb25zOiB7fX07XG4gICAgfVxuICAgIGNvbnN0IGpzb25TdHIgPSBhd2FpdCBjdHgud2FpdEZvckZldGNoVGV4dChpZHghKTtcbiAgICBpZiAoanNvblN0ciA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0VtcHR5IEpTT04gdGV4dCcpO1xuICAgIH1cbiAgICByZXR1cm4gSlNPTi5wYXJzZShqc29uU3RyKSBhcyBDaGVja3N1bTtcbiAgfVxuXG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB0ZXN0TWFpbChpbWFwOiBzdHJpbmcsIHVzZXI6IHN0cmluZywgbG9naW5TZWNyZXQ6IHN0cmluZykge1xuICBsb2cuZGVidWcgPSBsb2cuaW5mbztcbiAgaWYgKGltYXApXG4gICAgYXBpLmNvbmZpZy5zZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ2ZldGNoTWFpbFNlcnZlciddLCB7XG4gICAgICBpbWFwLCB1c2VyLCBsb2dpblNlY3JldFxuICAgIH0gYXMgV2l0aE1haWxTZXJ2ZXJDb25maWdbJ2ZldGNoTWFpbFNlcnZlciddKTtcbiAgYXdhaXQgY29ubmVjdEltYXAoYXN5bmMgY3R4ID0+IHtcbiAgICBhd2FpdCBjdHgud2FpdEZvclJlcGx5KCdTRUFSQ0ggSEVBRCBTdWJqZWN0IFwiYnVpbGQgYXJ0aWZhY3Q6IGJramstcHJlLWJ1aWxkXCInKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAvLyBjb25zb2xlLmxvZygnRmV0Y2ggbWFpbCAlZCBhcyB0ZXh0IDpcXG4nLCBjdHgubGFzdEluZGV4IC0gMSwgKGF3YWl0IGN0eC53YWl0Rm9yRmV0Y2goY3R4Lmxhc3RJbmRleCAtIDEpKSwgY3R4Lmxhc3RJbmRleCk7XG4gICAgLy8gbG9nLmluZm8oJ0ZldGNoIG1haWwgJWQ6XFxuJyArIGF3YWl0IGN0eC53YWl0Rm9yRmV0Y2goY3R4Lmxhc3RJbmRleCwgZmFsc2UpLCBjdHgubGFzdEluZGV4KTtcbiAgfSk7XG59XG4iXX0=
