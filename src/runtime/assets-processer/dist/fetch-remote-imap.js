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
const rfc822_parser_1 = require("./mail/rfc822-parser");
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
            // if (msg != null) log.debug('  <- ' + msg.map(token => token.text).join(' '));
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
                            msg = yield rfc822_parser_1.parse(tk.data);
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
        __api_1.default.config.set([__api_1.default.packageName, 'fetchMailServer'], {
            imap, user, loginSecret
        });
        yield connectImap((ctx) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            // log.info('Fetch mail %d as text :\n' + (await ctx.waitForFetchText(ctx.lastIndex)), ctx.lastIndex);
            log.info('Fetch mail %d:\n' + (yield ctx.waitForFetch(ctx.lastIndex, false)), ctx.lastIndex);
        }));
    });
}
exports.testMail = testMail;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS1pbWFwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDJDQUE2QztBQUU3QywrQkFBa0Q7QUFDbEQsOENBQzRDO0FBQzVDLDZCQUEwRTtBQUMxRSxnRUFBMEI7QUFFMUIsd0RBQXdCO0FBRXhCLDREQUE2RztBQUM3RywwREFBd0I7QUFFeEIsd0RBQTZFO0FBRTdFLDhCQUE4QjtBQUM5QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsb0JBQW9CLENBQUMsQ0FBQztBQUVoRixNQUFNLE9BQU8sR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUF5QixDQUFDO0FBQ3hFLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFHNUUsTUFBTSxnQkFBZ0IsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUM7QUFFekcsU0FBc0IsUUFBUSxDQUFDLE9BQWUsRUFBRSxJQUFZLEVBQUUsSUFBYTs7UUFDekUsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRTtZQUM1QixHQUFHLENBQUMsSUFBSSxDQUFDLGtEQUFrRCxDQUFDLENBQUM7WUFDN0QsT0FBTztTQUNSO1FBQ0QsTUFBTSxFQUNKLElBQUksRUFBRSxLQUFLLEVBQ1gsV0FBVyxFQUFFLE1BQU07UUFDbkIsY0FBYztR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QUU7WUFDNUIsc0dBQXNHO1lBQ3RHLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLElBQUcsTUFBTSxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUEsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0YsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FBQTtBQVRELDRCQVNDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvZmV0Y2gtcmVtb3RlLWltYXAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcmVhdGVUcmFuc3BvcnQgfSBmcm9tICdub2RlbWFpbGVyJztcbmltcG9ydCBTTVRQVHJhbnNwb3J0IGZyb20gJ25vZGVtYWlsZXIvbGliL3NtdHAtdHJhbnNwb3J0JztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgQmVoYXZpb3JTdWJqZWN0IH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBtYXAsIC8qY29uY2F0TWFwLCB0YWtlV2hpbGUsIHRha2VMYXN0LCBtYXBUbywqLyB0YXAsIGRpc3RpbmN0VW50aWxDaGFuZ2VkLFxuICBza2lwLCBmaWx0ZXIsIHRha2V9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGNvbm5lY3QgYXMgdHNsQ29ubmVjdCwgQ29ubmVjdGlvbk9wdGlvbnMsIFRMU1NvY2tldCB9IGZyb20gJ3Rscyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge0NoZWNrc3VtLCBXaXRoTWFpbFNlcnZlckNvbmZpZ30gZnJvbSAnLi9mZXRjaC10eXBlcyc7XG5pbXBvcnQge2NyZWF0ZVNlcnZlckRhdGFIYW5kbGVyLCBwYXJzZUxpbmVzT2ZUb2tlbnMsIEltYXBUb2tlblR5cGUsIFN0cmluZ0xpdH0gZnJvbSAnLi9tYWlsL2ltYXAtbXNnLXBhcnNlcic7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7IExvb2tBaGVhZCwgVG9rZW4gfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvYXN5bmMtTExuLXBhcnNlcic7XG5pbXBvcnQge3BhcnNlIGFzIHBhcnNlUmZjODIyLCBSQ0Y4MjJQYXJzZVJlc3VsdH0gZnJvbSAnLi9tYWlsL3JmYzgyMi1wYXJzZXInO1xuXG4vLyBpbXBvcnQge1NvY2tldH0gZnJvbSAnbmV0JztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmZldGNoLXJlbW90ZS1pbWFwJyk7XG5cbmNvbnN0IHNldHRpbmcgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpIGFzIFdpdGhNYWlsU2VydmVyQ29uZmlnO1xuY29uc3QgZW52ID0gc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIgPyBzZXR0aW5nLmZldGNoTWFpbFNlcnZlci5lbnYgOiAnbG9jYWwnO1xuXG5cbmNvbnN0IGN1cnJDaGVja3N1bUZpbGUgPSBQYXRoLnJlc29sdmUoJ2NoZWNrc3VtLicgKyAoc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIgPyBlbnYgOiAnbG9jYWwnKSArICcuanNvbicpO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VuZE1haWwoc3ViamVjdDogc3RyaW5nLCB0ZXh0OiBzdHJpbmcsIGZpbGU/OiBzdHJpbmcpIHtcbiAgbG9nLmluZm8oJ2xvZ2luJyk7XG4gIGlmICghc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIpIHtcbiAgICBsb2cud2FybignZmV0Y2hNYWlsU2VydmVyIGlzIG5vdCBjb25maWd1cmVkISBTa2lwIHNlbmRNYWlsJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHtcbiAgICB1c2VyOiBFTUFJTCxcbiAgICBsb2dpblNlY3JldDogU0VDUkVULFxuICAgIC8vIGltYXA6IElNQVAsXG4gICAgc210cDogU01UUFxuICB9ID0gc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXI7XG5cbiAgY29uc3QgdHJhbnNwb3J0ZXIgPSBjcmVhdGVUcmFuc3BvcnQoe1xuICAgIGhvc3Q6IFNNVFAsXG4gICAgYXV0aDoge1xuICAgICAgdHlwZTogJ2xvZ2luJyxcbiAgICAgIHVzZXI6IEVNQUlMLFxuICAgICAgcGFzczogU0VDUkVUXG4gICAgfSxcbiAgICBzZWN1cmU6IHRydWVcbiAgfSBhcyBTTVRQVHJhbnNwb3J0Lk9wdGlvbnMpO1xuXG4gIGxvZy5pbmZvKCdzZW5kIG1haWwnKTtcbiAgY29uc3QgaW5mbyA9IGF3YWl0IHRyYW5zcG9ydGVyLnNlbmRNYWlsKHtcbiAgICBmcm9tOiBFTUFJTCxcbiAgICB0bzogRU1BSUwsXG4gICAgc3ViamVjdDogYGJ1aWxkIGFydGlmYWN0OiAke3N1YmplY3R9YCxcbiAgICB0ZXh0LFxuICAgIGF0dGFjaG1lbnRzOiBmaWxlID8gW1xuICAgICAge1xuICAgICAgICBmaWxlbmFtZTogUGF0aC5iYXNlbmFtZShmaWxlKSxcbiAgICAgICAgcGF0aDogUGF0aC5yZXNvbHZlKGZpbGUpXG4gICAgICB9XG4gICAgXSA6IHVuZGVmaW5lZFxuICB9KTtcblxuICBsb2cuaW5mbyhpbmZvKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJldHJ5U2VuZE1haWwoc3ViamVjdDogc3RyaW5nLCB0ZXh0OiBzdHJpbmcsIGZpbGU/OiBzdHJpbmcpIHtcbiAgbGV0IGVycm9yOiBFcnJvciB8IHVuZGVmaW5lZDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgc2VuZE1haWwoc3ViamVjdCwgdGV4dCwgZmlsZSk7XG4gICAgICBlcnJvciA9IHVuZGVmaW5lZDtcbiAgICAgIGJyZWFrO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgbG9nLmluZm8oJ0dvdCBlcnJvcicsIGVycik7XG4gICAgICBlcnJvciA9IGVycjtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDAwKSk7XG4gICAgfVxuICB9XG4gIGlmIChlcnJvcikge1xuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW1hcEZldGNoRGF0YSB7XG4gIGhlYWRlcnM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmdbXSB8IHVuZGVmaW5lZH07XG4gIHRleHRzOiBzdHJpbmdbXTtcbiAgZmlsZXM6IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEltYXBDb21tYW5kQ29udGV4dCB7XG4gIC8qKlxuICAgKiBJbmRleCBvZiBsYXRlc3QgbWFpbFxuICAgKi9cbiAgbGFzdEluZGV4OiBudW1iZXI7XG4gIGZpbGVXcml0aW5nU3RhdGU6IE9ic2VydmFibGU8Ym9vbGVhbj47XG4gIHdhaXRGb3JSZXBseTxSID0gYW55Pihjb21tYW5kPzogc3RyaW5nLFxuICAgIG9uTGluZT86IChsYTogTG9va0FoZWFkPFRva2VuPEltYXBUb2tlblR5cGU+PiwgdGFnOiBzdHJpbmcpID0+IFByb21pc2U8Uj4pOiBQcm9taXNlPFIgfCBudWxsPjtcbiAgZmluZE1haWwoZnJvbUluZHg6IG51bWJlciwgc3ViamVjdDogc3RyaW5nKTogUHJvbWlzZTxudW1iZXIgfCB1bmRlZmluZWQ+O1xuICB3YWl0Rm9yRmV0Y2gobWFpbElkeDogc3RyaW5nIHwgbnVtYmVyLCBoZWFkZXJPbmx5PzogYm9vbGVhbiwgb3ZlcnJpZGVGaWxlTmFtZT86IHN0cmluZyk6IFByb21pc2U8SW1hcEZldGNoRGF0YT47XG4gIHdhaXRGb3JGZXRjaFRleHQoaW5kZXg6IG51bWJlcik6IFByb21pc2U8c3RyaW5nIHwgdW5kZWZpbmVkPjtcbiAgYXBwZW5kTWFpbChzdWJqZWN0OiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyk6IFByb21pc2U8dm9pZHxudWxsPjtcbn1cblxuLyoqXG4gKiBJTUFQIHNwZWNpZmljYXRpb25cbiAqIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMxNzMwXG4gKiBcbiAqIElEIGNvbW1hbmRcbiAqIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMyOTcxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb25uZWN0SW1hcChjYWxsYmFjazogKGNvbnRleHQ6IEltYXBDb21tYW5kQ29udGV4dCkgPT4gUHJvbWlzZTxhbnk+KSB7XG5cbiAgbGV0IGxvZ0VuYWJsZWQgPSB0cnVlO1xuICBsZXQgY21kSWR4ID0gMTtcbiAgY29uc3QgZmlsZVdyaXRpbmdTdGF0ZSA9IG5ldyBCZWhhdmlvclN1YmplY3Q8U2V0PHN0cmluZz4+KG5ldyBTZXQ8c3RyaW5nPigpKTtcblxuICBpZiAoIXNldHRpbmcuZmV0Y2hNYWlsU2VydmVyKSB7XG4gICAgbG9nLndhcm4oJ2ZldGNoTWFpbFNlcnZlciBpcyBub3QgY29uZmlndXJlZCEgU2tpcCBzZW5kTWFpbCcpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCB7XG4gICAgICB1c2VyOiBFTUFJTCxcbiAgICAgIGxvZ2luU2VjcmV0OiBTRUNSRVQsXG4gICAgICBpbWFwOiBJTUFQXG4gICAgICAvLyBzbXRwOiBTTVRQXG4gIH0gPSBzZXR0aW5nLmZldGNoTWFpbFNlcnZlcjtcblxuICBjb25zdCBjb250ZXh0OiB7W2sgaW4ga2V5b2YgSW1hcENvbW1hbmRDb250ZXh0XT86IEltYXBDb21tYW5kQ29udGV4dFtrXX0gPSB7fTtcblxuICBjb250ZXh0LndhaXRGb3JSZXBseSA9IHdhaXRGb3JSZXBseTtcbiAgY29udGV4dC53YWl0Rm9yRmV0Y2ggPSB3YWl0Rm9yRmV0Y2g7XG4gIGNvbnRleHQud2FpdEZvckZldGNoVGV4dCA9IHdhaXRGb3JGZXRjaFRleHQ7XG4gIGNvbnRleHQuZmluZE1haWwgPSBmaW5kTWFpbDtcbiAgY29udGV4dC5maWxlV3JpdGluZ1N0YXRlID0gZmlsZVdyaXRpbmdTdGF0ZS5waXBlKFxuICAgIG1hcChmaWxlU2V0ID0+IHtcbiAgICAgIC8vIGxvZy53YXJuKCd3cml0aW5nOiAnLCBmaWxlU2V0LnZhbHVlcygpKTtcbiAgICAgIHJldHVybiBmaWxlU2V0LnNpemUgPiAwO1xuICAgIH0pLFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKClcbiAgKTtcblxuICBjb250ZXh0LmFwcGVuZE1haWwgPSAoc3ViamVjdDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBtYWlsQm9keSA9IGBEYXRlOiBNb24sIDcgRmViIDIwMjAgMjE6NTI6MjUgLTA4MDAgKFBTVClcbiAgICAgIEZyb206IENyZWRpdCB0ZWFtIGJ1aWxkIG1hY2hpbmVcbiAgICAgIFN1YmplY3Q6ICR7c3ViamVjdH1cbiAgICAgIFRvOiBBZG1pbmluc3RyYXRvclxuICAgICAgTWVzc2FnZS1JZDogPEIyNzM5Ny0wMTAwMDAwQEJsdXJkeWJsb29wLkNPTT5cbiAgICAgIE1JTUUtVmVyc2lvbjogMS4wXG4gICAgICBDb250ZW50LVR5cGU6IFRFWFQvUExBSU47IENIQVJTRVQ9VVMtQVNDSUlcbiAgICAgIFxuICAgICAgJHtjb250ZW50fVxuICAgICAgYC5yZXBsYWNlKC9eWyBdKy9tZywgJycpLnJlcGxhY2UoL1xcci9nLCAnJykucmVwbGFjZSgvXFxuL2csICdcXHJcXG4nKTtcbiAgICByZXR1cm4gd2FpdEZvclJlcGx5KGBBUFBFTkQgSU5CT1ggeyR7bWFpbEJvZHkubGVuZ3RofX1cXHJcXG5gICsgbWFpbEJvZHkpO1xuICB9O1xuXG4gIGNvbnN0IHNlcnZlclJlc0hhbmRsZXIgPSBjcmVhdGVTZXJ2ZXJEYXRhSGFuZGxlcigpO1xuICBzZXJ2ZXJSZXNIYW5kbGVyLm91dHB1dC5waXBlKFxuICAgIHRhcChtc2cgPT4ge1xuICAgICAgLy8gaWYgKG1zZyAhPSBudWxsKSBsb2cuZGVidWcoJyAgPC0gJyArIG1zZy5tYXAodG9rZW4gPT4gdG9rZW4udGV4dCkuam9pbignICcpKTtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuXG4gIGxldCBzb2NrZXQ6IFRMU1NvY2tldHx1bmRlZmluZWQ7XG4gIHRyeSB7XG4gICAgc29ja2V0ID0gYXdhaXQgbmV3IFByb21pc2U8UmV0dXJuVHlwZTx0eXBlb2YgdHNsQ29ubmVjdD4+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHNvY2tldCA9IHRzbENvbm5lY3Qoe1xuICAgICAgICBob3N0OiBJTUFQLCBwb3J0OiA5OTMsXG4gICAgICAgIGVuYWJsZVRyYWNlOiB0cnVlXG4gICAgICB9IGFzIENvbm5lY3Rpb25PcHRpb25zKTtcblxuICAgICAgc29ja2V0Lm9uKCdzZWN1cmVDb25uZWN0JywgKCkgPT4ge1xuICAgICAgICBsb2cuaW5mbygnY29ubmVjdGVkJywgc29ja2V0LmF1dGhvcml6ZWQgPyAnYXV0aG9yaXplZCcgOiAndW5hdXRob3JpemVkJyk7XG4gICAgICAgIHJlc29sdmUoc29ja2V0KTtcbiAgICAgIH0pXG4gICAgICAub24oJ2Vycm9yJywgZXJyID0+IHJlamVjdChlcnIpKVxuICAgICAgLm9uKCd0aW1lb3V0JywgKCkgPT4gcmVqZWN0KG5ldyBFcnJvcignVGltZW91dCcpKSk7XG4gICAgICBzb2NrZXQub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGRhdGEudG9TdHJpbmcoKSk7XG4gICAgICAgIHNlcnZlclJlc0hhbmRsZXIuaW5wdXQoZGF0YSk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IHdhaXRGb3JSZXBseSgpO1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseSgnSUQgKFwibmFtZVwiIFwiY29tLnRlbmNlbnQuZm94bWFpbFwiIFwidmVyc2lvblwiIFwiNy4yLjkuNzlcIiknKTtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoYExPR0lOICR7RU1BSUx9ICR7U0VDUkVUfWApO1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseSgnU0VMRUNUIElOQk9YJywgYXN5bmMgbGEgPT4ge1xuICAgICAgY29uc3QgZXhpdHNUayA9IGF3YWl0IGxhLmxhKDMpO1xuICAgICAgaWYgKGV4aXRzVGsgJiYgZXhpdHNUay50ZXh0LnRvVXBwZXJDYXNlKCkgPT09ICdFWElTVFMnKSB7XG4gICAgICAgIGNvbnRleHQubGFzdEluZGV4ID0gcGFyc2VJbnQoKGF3YWl0IGxhLmxhKDIpKSEudGV4dCwgMTApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgYXdhaXQgY2FsbGJhY2soY29udGV4dCBhcyBJbWFwQ29tbWFuZENvbnRleHQpO1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseSgnTE9HT1VUJyk7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgbG9nLmVycm9yKGV4KTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgd2FpdEZvclJlcGx5KCdMT0dPVVQnKTtcbiAgICB9IGNhdGNoIChlcikge31cbiAgICBpZiAoc29ja2V0KVxuICAgICAgc29ja2V0LmVuZCgpO1xuICAgIHRocm93IGV4O1xuICB9XG5cbiAgc2VydmVyUmVzSGFuZGxlci5pbnB1dChudWxsKTtcbiAgc29ja2V0LmVuZCgpO1xuXG4gIGFzeW5jIGZ1bmN0aW9uIHdhaXRGb3JGZXRjaFRleHQoaW5kZXg6IG51bWJlcikge1xuICAgIGxldCBib2R5MTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseShgRkVUQ0ggJHtpbmRleH0gQk9EWVsxXWAsIGFzeW5jIGxhID0+IHtcbiAgICAgIHdoaWxlICgoYXdhaXQgbGEubGEoKSkgIT0gbnVsbCkge1xuICAgICAgICBjb25zdCB0b2tlbiA9IGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgICAgaWYgKHRva2VuLnRleHQgPT09ICdCT0RZJyAmJiAoYXdhaXQgbGEubGEoKSkhLnRleHQgPT09ICdbMV0nKSB7XG4gICAgICAgICAgYXdhaXQgbGEuYWR2YW5jZSgpO1xuICAgICAgICAgIGJvZHkxID0gKChhd2FpdCBsYS5hZHZhbmNlKCkpIGFzIHVua25vd24gYXMgU3RyaW5nTGl0KS5kYXRhLnRvU3RyaW5nKCd1dGY4Jyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGxvZy53YXJuKGJ1Zik7XG4gICAgLy8gcmV0dXJuIC9eXFwqXFxzK1xcZCtcXHMrRkVUQ0hcXHMrXFwoLio/XFx7XFxkK1xcfShbXl0qKVxcKSQvbS5leGVjKGJ1ZikhWzFdO1xuICAgIHJldHVybiBib2R5MTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHdhaXRGb3JSZXBseTxSID0gYW55Pihjb21tYW5kPzogc3RyaW5nLCBvbkxpbmU/OiAobGE6IExvb2tBaGVhZDxUb2tlbjxJbWFwVG9rZW5UeXBlPj4sIHRhZzogc3RyaW5nKSA9PiBQcm9taXNlPFI+KTogUHJvbWlzZTxSIHwgbnVsbD4ge1xuICAgIGxldCB0YWc6IHN0cmluZztcbiAgICBpZiAoY29tbWFuZClcbiAgICAgIHRhZyA9ICdhJyArIChjbWRJZHgrKyk7XG5cbiAgICBsZXQgcmVzdWx0OiBSIHwgbnVsbCA9IG51bGw7XG4gICAgY29uc3QgcHJvbSA9IHBhcnNlTGluZXNPZlRva2VucyhzZXJ2ZXJSZXNIYW5kbGVyLm91dHB1dCwgYXN5bmMgbGEgPT4ge1xuICAgICAgY29uc3QgcmVzVGFnID0gYXdhaXQgbGEubGEoKTtcbiAgICAgIGlmICghdGFnICYmIHJlc1RhZyEudGV4dCA9PT0gJyonIHx8IHJlc1RhZyEudGV4dCA9PT0gdGFnKSB7XG4gICAgICAgIGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBhd2FpdCBsYS5sYSgpO1xuICAgICAgICBsZXQgcmV0dXJuVGV4dCA9ICcnO1xuICAgICAgICBpZiAoL09LfE5PLy50ZXN0KHN0YXRlIS50ZXh0KSkge1xuICAgICAgICAgIHJldHVyblRleHQgKz0gKGF3YWl0IGxhLmFkdmFuY2UoKSkudGV4dDtcbiAgICAgICAgICB3aGlsZSAoKGF3YWl0IGxhLmxhKCkpICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVyblRleHQgKz0gJyAnICsgKGF3YWl0IGxhLmFkdmFuY2UoKSkudGV4dDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldHVyblRleHQ7XG4gICAgICB9IGVsc2UgaWYgKG9uTGluZSkge1xuICAgICAgICByZXN1bHQgPSBhd2FpdCBvbkxpbmUobGEsIHRhZyk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAoY29tbWFuZCkge1xuICAgICAgY29uc3QgY21kID0gdGFnISArICcgJyArIGNvbW1hbmQ7XG4gICAgICBpZiAoc29ja2V0KVxuICAgICAgICBzb2NrZXQud3JpdGUoQnVmZmVyLmZyb20oYCR7dGFnIX0gJHtjb21tYW5kfVxcclxcbmAsICd1dGY4JykpO1xuICAgICAgbG9nLmRlYnVnKCc9PicsIGNtZCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb20udGhlbigoKSA9PiByZXN1bHQpO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gd2FpdEZvckZldGNoKG1haWxJZHg6IHN0cmluZyB8IG51bWJlciA9ICcqJywgaGVhZGVyT25seSA9IHRydWUsIG92ZXJyaWRlRmlsZU5hbWU/OiBzdHJpbmcpOiBQcm9taXNlPEltYXBGZXRjaERhdGE+IHtcbiAgICBjb25zdCBvcmlnaW5Mb2dFbmFibGVkID0gbG9nRW5hYmxlZDtcbiAgICBsb2dFbmFibGVkID0gaGVhZGVyT25seTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB3YWl0Rm9yUmVwbHkoYEZFVENIICR7bWFpbElkeH0gUkZDODIyJHtoZWFkZXJPbmx5ID8gJy5IRUFERVInIDogJyd9YCwgYXN5bmMgKGxhKSA9PiB7XG4gICAgICBsZXQgbXNnOiBSQ0Y4MjJQYXJzZVJlc3VsdCB8IHVuZGVmaW5lZDtcbiAgICAgIHdoaWxlICgoYXdhaXQgbGEubGEoKSkgIT0gbnVsbCkge1xuICAgICAgICBjb25zdCB0ayA9IGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgICAgaWYgKHRrLnR5cGUgIT09IEltYXBUb2tlblR5cGUuc3RyaW5nTGl0KSB7XG4gICAgICAgICAgLy8gbG9nLmRlYnVnKHRrLnRleHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGxvZy5kZWJ1Zygnc3RyaW5nIGxpdGVyYWw6XFxuJywgKHRrIGFzIHVua25vd24gYXMgU3RyaW5nTGl0KS5kYXRhLmJ5dGVMZW5ndGgpO1xuICAgICAgICAgIC8vIGNvbnN0IHdyaXR0ZW5GaWxlID0gYGVtYWlsLSR7bmV3IERhdGUoKS5nZXRUaW1lKCl9LnR4dGA7XG4gICAgICAgICAgLy8gZnMud3JpdGVGaWxlU3luYyh3cml0dGVuRmlsZSwgKHRrIGFzIHVua25vd24gYXMgU3RyaW5nTGl0KS5kYXRhLCAndXRmOCcpO1xuICAgICAgICAgIC8vIGxvZy5kZWJ1Zyhgd3JpdGVuIHRvICR7d3JpdHRlbkZpbGV9YCk7XG4gICAgICAgICAgbXNnID0gYXdhaXQgcGFyc2VSZmM4MjIoKHRrIGFzIFN0cmluZ0xpdCkuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGhlYWRlcnM6IG1zZyA/IG1zZy5oZWFkZXJzLnJlZHVjZSgocHJldiwgY3VycikgPT4ge1xuICAgICAgICAgIHByZXZbY3Vyci5rZXkudG9Mb3dlckNhc2UoKV0gPSBjdXJyLnZhbHVlO1xuICAgICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgICB9LCB7fSBhcyBJbWFwRmV0Y2hEYXRhWydoZWFkZXJzJ10pIDoge30sXG4gICAgICAgIHRleHRzOiBtc2cgPyBtc2cucGFydHMuZmlsdGVyKHBhcnQgPT4gcGFydC5ib2R5ICE9IG51bGwpLm1hcChwYXJ0ID0+IHBhcnQuYm9keSEudG9TdHJpbmcoKSkgOiBbXSxcbiAgICAgICAgZmlsZXM6IG1zZyA/IG1zZy5wYXJ0cy5maWx0ZXIocGFydCA9PiBwYXJ0LmZpbGUgIT0gbnVsbCkubWFwKHBhcnQgPT4gcGFydC5maWxlISkgOiBbXVxuICAgICAgfSBhcyBJbWFwRmV0Y2hEYXRhO1xuICAgIH0pO1xuICAgIGxvZ0VuYWJsZWQgPSBvcmlnaW5Mb2dFbmFibGVkO1xuXG4gICAgaWYgKG92ZXJyaWRlRmlsZU5hbWUgJiYgcmVzdWx0IS5maWxlc1swXSkge1xuICAgICAgZnMucmVuYW1lU3luYyhyZXN1bHQhLmZpbGVzWzBdLCBvdmVycmlkZUZpbGVOYW1lKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0ITtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGZpbmRNYWlsKGZyb21JbmR4OiBudW1iZXIsIHN1YmplY3Q6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyIHwgdW5kZWZpbmVkPiB7XG4gICAgbG9nLmluZm8oJ2ZpbmRNYWlsJywgZnJvbUluZHgsIHN1YmplY3QpO1xuICAgIHdoaWxlIChmcm9tSW5keCA+IDApIHtcbiAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IHdhaXRGb3JGZXRjaChmcm9tSW5keCk7XG4gICAgICBpZiAocmVzLmhlYWRlcnMuc3ViamVjdCkge1xuICAgICAgICBsb2cuZGVidWcocmVzLmhlYWRlcnMuc3ViamVjdCk7XG4gICAgICB9XG4gICAgICBpZiAocmVzLmhlYWRlcnMuc3ViamVjdCAmJiByZXMuaGVhZGVycy5zdWJqZWN0WzBdLmluZGV4T2Yoc3ViamVjdCkgPj0gMClcbiAgICAgICAgcmV0dXJuIGZyb21JbmR4O1xuICAgICAgZnJvbUluZHgtLTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgSW1hcE1hbmFnZXIge1xuICAvLyBjaGVja3N1bTogQ2hlY2tzdW07XG4gIGNoZWNrc3VtU3RhdGUgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PENoZWNrc3VtIHwgbnVsbD4obnVsbCk7XG4gIGZpbGVXcml0aW5nU3RhdGU6IEltYXBDb21tYW5kQ29udGV4dFsnZmlsZVdyaXRpbmdTdGF0ZSddO1xuICB3YXRjaGluZyA9IGZhbHNlO1xuICBwcml2YXRlIHRvRmV0Y2hBcHBzU3RhdGUgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PHN0cmluZ1tdPihbXSk7XG4gIC8vIHByaXZhdGUgIHppcERvd25sb2FkRGlyOiBzdHJpbmc7XG4gIC8vIHByaXZhdGUgaW1hcEFjdGlvbnMgPSBuZXcgU3ViamVjdDwoY3R4OiBJbWFwQ29tbWFuZENvbnRleHQpID0+IFByb21pc2U8YW55Pj4oKTtcblxuICBwcml2YXRlIGN0eDogSW1hcENvbW1hbmRDb250ZXh0O1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBlbnY6IHN0cmluZywgcHVibGljIHppcERvd25sb2FkRGlyPzogc3RyaW5nKSB7XG4gICAgaWYgKHppcERvd25sb2FkRGlyID09IG51bGwpXG4gICAgICB0aGlzLnppcERvd25sb2FkRGlyID0gUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShjdXJyQ2hlY2tzdW1GaWxlKSwgJ2RlcGxveS1zdGF0aWMtJyArIGVudik7XG4gIH1cblxuICBhc3luYyBmZXRjaENoZWNrc3VtKCk6IFByb21pc2U8Q2hlY2tzdW0gfCB1bmRlZmluZWQ+ICB7XG4gICAgbGV0IGNzOiBDaGVja3N1bSB8IHVuZGVmaW5lZDtcbiAgICBhd2FpdCBjb25uZWN0SW1hcChhc3luYyBjdHggPT4ge1xuICAgICAgY3MgPSBhd2FpdCB0aGlzLl9mZXRjaENoZWNrc3VtKGN0eCk7XG4gICAgfSk7XG4gICAgbG9nLmluZm8oJ2ZldGNoZWQgY2hlY2tzdW06JywgY3MpO1xuICAgIHRoaXMuY2hlY2tzdW1TdGF0ZS5uZXh0KGNzISk7XG4gICAgcmV0dXJuIGNzO1xuICB9XG5cbiAgYXN5bmMgZmV0Y2hVcGRhdGVDaGVja1N1bShhcHBOYW1lOiBzdHJpbmcpOiBQcm9taXNlPENoZWNrc3VtPiB7XG4gICAgbGV0IGNzID0gYXdhaXQgdGhpcy5mZXRjaENoZWNrc3VtKCk7XG4gICAgbG9nLmluZm8oJ2ZldGNoZWQgY2hlY2tzdW06JywgY3MpO1xuICAgIGlmIChjcyEudmVyc2lvbnMhW2FwcE5hbWVdID09IG51bGwpIHtcbiAgICAgIGNzIS52ZXJzaW9ucyFbYXBwTmFtZV0gPSB7XG4gICAgICAgIHZlcnNpb246IDAsXG4gICAgICAgIHBhdGg6ICc8c2VlIGF0dGFjaGVtZW50IGZpbGUgbmFtZT4nXG4gICAgICB9O1xuICAgIH1cbiAgICBjcyEudmVyc2lvbnMhW2FwcE5hbWVdLnZlcnNpb24rKztcbiAgICB0aGlzLmNoZWNrc3VtU3RhdGUubmV4dChjcyEpO1xuICAgIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKGN1cnJDaGVja3N1bUZpbGUpKTtcbiAgICBjb25zdCBjaGVja3N1bVN0ciA9IEpTT04uc3RyaW5naWZ5KGNzISwgbnVsbCwgJyAgJyk7XG4gICAgZnMud3JpdGVGaWxlU3luYyhjdXJyQ2hlY2tzdW1GaWxlLCBjaGVja3N1bVN0cik7XG4gICAgbG9nLmluZm8oJ3dyaXRlICVzXFxuJXMnLCBjdXJyQ2hlY2tzdW1GaWxlLCBjaGVja3N1bVN0cik7XG4gICAgcmV0dXJuIGNzITtcbiAgfVxuXG4gIC8qKlxuICAgKiBEb25lIHdoZW4gZmlsZXMgYXJlIHdyaXR0ZW5cbiAgICogQHBhcmFtIGV4Y2x1ZGVBcHAgZXhjbHVkZSBhcHBcbiAgICovXG4gIGFzeW5jIGZldGNoT3RoZXJaaXBzKGV4Y2x1ZGVBcHA/OiBzdHJpbmcpIHtcbiAgICBsZXQgYXBwTmFtZXMgPSBPYmplY3Qua2V5cyh0aGlzLmNoZWNrc3VtU3RhdGUuZ2V0VmFsdWUoKSEudmVyc2lvbnMhKVxuICAgIC5maWx0ZXIoYXBwID0+IGFwcCAhPT0gZXhjbHVkZUFwcCk7XG5cbiAgICBsZXQgZmlsZVdyaXR0ZW5Qcm9tOiBQcm9taXNlPGJvb2xlYW4+IHwgdW5kZWZpbmVkO1xuXG4gICAgYXdhaXQgY29ubmVjdEltYXAoYXN5bmMgY3R4ID0+IHtcblxuICAgICAgZmlsZVdyaXR0ZW5Qcm9tID0gY3R4LmZpbGVXcml0aW5nU3RhdGUucGlwZShcbiAgICAgICAgc2tpcCgxKSxcbiAgICAgICAgZmlsdGVyKHdyaXRpbmcgPT4gIXdyaXRpbmcpLFxuICAgICAgICB0YWtlKGFwcE5hbWVzLmxlbmd0aClcbiAgICAgICkudG9Qcm9taXNlKCk7XG5cbiAgICAgIGZvciAoY29uc3QgYXBwIG9mIGFwcE5hbWVzKSB7XG4gICAgICAgIGxvZy5pbmZvKCdmZXRjaCBvdGhlciB6aXA6ICcgKyBhcHApO1xuICAgICAgICBjb25zdCBpZHggPSBhd2FpdCBjdHguZmluZE1haWwoY3R4Lmxhc3RJbmRleCwgYGJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LSR7YXBwfSlgKTtcbiAgICAgICAgaWYgKCFpZHgpIHtcbiAgICAgICAgICBsb2cuaW5mbyhgbWFpbCBcImJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LSR7YXBwfSlcIiBpcyBub3QgRm91bmQsIHNraXAgZG93bmxvYWQgemlwYCk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgY3R4LndhaXRGb3JGZXRjaChpZHgsIGZhbHNlLCBQYXRoLnJlc29sdmUodGhpcy56aXBEb3dubG9hZERpciEsIGFwcCArICcuemlwJykpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmIChmaWxlV3JpdHRlblByb20pXG4gICAgICBhd2FpdCBmaWxlV3JpdHRlblByb207XG4gICAgcmV0dXJuIGFwcE5hbWVzO1xuICB9XG5cbiAgYXN5bmMgYXBwZW5kTWFpbChzdWJqZWN0OiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZykge1xuICAgIGF3YWl0IGNvbm5lY3RJbWFwKGFzeW5jIGN0eCA9PiB7XG4gICAgICBhd2FpdCBjdHguYXBwZW5kTWFpbChzdWJqZWN0LCBjb250ZW50KTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIHN0YXJ0V2F0Y2hNYWlsKHBvbGxJbnRlcnZhbCA9IDYwMDAwKSB7XG4gICAgdGhpcy53YXRjaGluZyA9IHRydWU7XG4gICAgd2hpbGUgKHRoaXMud2F0Y2hpbmcpIHtcbiAgICAgIGF3YWl0IHRoaXMuY2hlY2tNYWlsRm9yVXBkYXRlKCk7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgcG9sbEludGVydmFsKSk7IC8vIDYwIHNlY1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGNoZWNrTWFpbEZvclVwZGF0ZSgpIHtcbiAgICBhd2FpdCBjb25uZWN0SW1hcChhc3luYyBjdHggPT4ge1xuICAgICAgdGhpcy5jdHggPSBjdHg7XG4gICAgICB0aGlzLmZpbGVXcml0aW5nU3RhdGUgPSBjdHguZmlsZVdyaXRpbmdTdGF0ZTtcblxuICAgICAgY29uc3QgY3MgPSBhd2FpdCB0aGlzLl9mZXRjaENoZWNrc3VtKGN0eCk7XG4gICAgICB0aGlzLmNoZWNrc3VtU3RhdGUubmV4dChjcyEpO1xuXG4gICAgICBjb25zdCB0b0ZldGNoQXBwcyA9IHRoaXMudG9GZXRjaEFwcHNTdGF0ZS5nZXRWYWx1ZSgpO1xuICAgICAgaWYgKHRvRmV0Y2hBcHBzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy50b0ZldGNoQXBwc1N0YXRlLm5leHQoW10pO1xuICAgICAgICBmb3IgKGNvbnN0IGFwcE5hbWUgb2YgdG9GZXRjaEFwcHMpIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLmZldGNoQXR0YWNobWVudChhcHBOYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gYXdhaXQgY3R4LndhaXRGb3JSZXBseSgnU1VCU0NSSUJFIElOQk9YJyk7XG4gICAgICAvLyBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMzAwMDApKTsgLy8gMzAgc2VjXG4gICAgICBkZWxldGUgdGhpcy5jdHg7XG4gICAgfSk7XG4gIH1cblxuICBmZXRjaEFwcER1cmluZ1dhdGNoQWN0aW9uKC4uLmFwcE5hbWVzOiBzdHJpbmdbXSkge1xuICAgIHRoaXMudG9GZXRjaEFwcHNTdGF0ZS5uZXh0KGFwcE5hbWVzKTtcbiAgfVxuXG4gIGFzeW5jIHNlbmRGaWxlQW5kVXBkYXRlZENoZWNrc3VtKGFwcE5hbWU6IHN0cmluZywgZmlsZTogc3RyaW5nKSB7XG4gICAgY29uc3QgY3MgPSBhd2FpdCB0aGlzLmZldGNoVXBkYXRlQ2hlY2tTdW0oYXBwTmFtZSk7XG4gICAgYXdhaXQgcmV0cnlTZW5kTWFpbChgYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tJHthcHBOYW1lfSlgLCBKU09OLnN0cmluZ2lmeShjcywgbnVsbCwgJyAgJyksIGZpbGUpO1xuICB9XG5cbiAgc3RvcFdhdGNoKCkge1xuICAgIHRoaXMud2F0Y2hpbmcgPSBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZmV0Y2hBdHRhY2htZW50KGFwcDogc3RyaW5nKSB7XG4gICAgY29uc3QgaWR4ID0gYXdhaXQgdGhpcy5jdHguZmluZE1haWwodGhpcy5jdHgubGFzdEluZGV4LCBgYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tJHthcHB9KWApO1xuICAgIGlmIChpZHggPT0gbnVsbClcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2FudCBmaW5kIG1haWw6ICcgKyBgYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tJHthcHB9KWApO1xuICAgIGF3YWl0IHRoaXMuY3R4LndhaXRGb3JGZXRjaChpZHghLCBmYWxzZSwgUGF0aC5yZXNvbHZlKHRoaXMuemlwRG93bmxvYWREaXIhLCBgJHthcHB9LnppcGApKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgX2ZldGNoQ2hlY2tzdW0oY3R4OiBJbWFwQ29tbWFuZENvbnRleHQpIHtcbiAgICBjb25zdCBpZHggPSBhd2FpdCBjdHguZmluZE1haWwoY3R4Lmxhc3RJbmRleCwgYGJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LWApO1xuICAgIGxvZy5pbmZvKCdfZmV0Y2hDaGVja3N1bSwgaW5kZXg6JywgaWR4KTtcbiAgICBpZiAoaWR4ID09IG51bGwpIHtcbiAgICAgIHJldHVybiB7dmVyc2lvbnM6IHt9fTtcbiAgICB9XG4gICAgY29uc3QganNvblN0ciA9IGF3YWl0IGN0eC53YWl0Rm9yRmV0Y2hUZXh0KGlkeCEpO1xuICAgIGlmIChqc29uU3RyID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRW1wdHkgSlNPTiB0ZXh0Jyk7XG4gICAgfVxuICAgIHJldHVybiBKU09OLnBhcnNlKGpzb25TdHIpIGFzIENoZWNrc3VtO1xuICB9XG5cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRlc3RNYWlsKGltYXA6IHN0cmluZywgdXNlcjogc3RyaW5nLCBsb2dpblNlY3JldDogc3RyaW5nKSB7XG4gIGxvZy5kZWJ1ZyA9IGxvZy5pbmZvO1xuICBhcGkuY29uZmlnLnNldChbYXBpLnBhY2thZ2VOYW1lLCAnZmV0Y2hNYWlsU2VydmVyJ10sIHtcbiAgICBpbWFwLCB1c2VyLCBsb2dpblNlY3JldFxuICB9IGFzIFdpdGhNYWlsU2VydmVyQ29uZmlnWydmZXRjaE1haWxTZXJ2ZXInXSk7XG4gIGF3YWl0IGNvbm5lY3RJbWFwKGFzeW5jIGN0eCA9PiB7XG4gICAgLy8gbG9nLmluZm8oJ0ZldGNoIG1haWwgJWQgYXMgdGV4dCA6XFxuJyArIChhd2FpdCBjdHgud2FpdEZvckZldGNoVGV4dChjdHgubGFzdEluZGV4KSksIGN0eC5sYXN0SW5kZXgpO1xuICAgIGxvZy5pbmZvKCdGZXRjaCBtYWlsICVkOlxcbicgKyBhd2FpdCBjdHgud2FpdEZvckZldGNoKGN0eC5sYXN0SW5kZXgsIGZhbHNlKSwgY3R4Lmxhc3RJbmRleCk7XG4gIH0pO1xufVxuIl19
