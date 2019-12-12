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
        const serverResHandler = imap_msg_parser_1.createServerDataHandler();
        serverResHandler.output.pipe(operators_1.tap(msg => {
            if (msg != null)
                log.debug('  <- ' + msg.map(token => token.text).join(' '));
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
                    yield onLine(la, tag);
                }
            }));
            if (command) {
                const cmd = tag + ' ' + command;
                if (socket)
                    socket.write(Buffer.from(`${tag} ${command}\r\n`, 'utf8'));
                log.debug('=>', cmd);
            }
            return prom;
        }
        function waitForFetch(mailIdx = '*', headerOnly = true, overrideFileName) {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                // let state: FetchState = FetchState.start;
                let headers = {};
                // let lastHeaderName: string;
                // let boundary: string;
                let textBody = '';
                let fileName;
                // let fileWriter: fs.WriteStream;
                // let attachementFile: string;
                const originLogEnabled = logEnabled;
                logEnabled = headerOnly;
                yield waitForReply(`FETCH ${mailIdx} RFC822${headerOnly ? '.HEADER' : ''}`, (la) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                    while ((yield la.la()) != null) {
                        const tk = yield la.advance();
                        if (tk.type !== imap_msg_parser_1.ImapTokenType.stringLit) {
                            log.warn(tk.text);
                        }
                        else {
                            // log.warn('string literal:\n', (tk as any as StringLit).data.toString('utf8'));
                            // parseRfc822((tk as any as StringLit).data);
                        }
                    }
                    // switch (state) {
                    //   case FetchState.start:
                    //     if (/^\*\s+[0-9]+\s+FETCH\s+/.test(line)) {
                    //       state = FetchState.headers;
                    //     }
                    //     break;
                    //   case FetchState.headers:
                    //     if (/^\s/.test(line)) {
                    //       const items = headers[lastHeaderName]!;
                    //       items.push(...line.split(';').map(item => item.trim()).filter(item => item.length > 0));
                    //       break;
                    //     }
                    //     if (line.length === 0) {
                    //       state = FetchState.headersEnd;
                    //       const normalizedHeaders: typeof headers = {};
                    //       Object.keys(headers).forEach(key => normalizedHeaders[key.toLowerCase()] = headers[key]);
                    //       headers = normalizedHeaders;
                    //       const contentType = headers['content-type'];
                    //       if (!contentType) {
                    //         throw new Error(`missing Content-Type in headers: ${JSON.stringify(headers, null, '  ')}`);
                    //       }
                    //       // https://www.w3.org/Protocols/rfc1341/7_2_Multipart.html
                    //       if (contentType[0] !== 'multipart/mixed') {
                    //         return Promise.resolve('No support for content-type: ' + contentType[0]);
                    //       }
                    //       boundary = contentType.find(item => item.startsWith('boundary='))!;
                    //       boundary = '--' + /^["']?(.*?)["']?$/.exec(boundary.slice('boundary='.length))![1];
                    //       break;
                    //     }
                    //     const m = /^([^:]+)\:(.*)$/.exec(line);
                    //     if (m) {
                    //       headers[m[1]] = m[2].split(';').map(item => item.trim()).filter(item => item.length > 0);
                    //       lastHeaderName = m[1];
                    //     }
                    //     break;
                    //   case FetchState.headersEnd:
                    //     if (line === boundary) {
                    //       state = FetchState.textHeaders;
                    //     }
                    //     break;
                    //   case FetchState.textHeaders:
                    //     if (line.length === 0)
                    //       state = FetchState.textBody;
                    //     break;
                    //   case FetchState.textBody:
                    //     if (line === boundary) {
                    //       textBody = textBody.slice(0, textBody.length - 1);
                    //       state = FetchState.attachmentHeaders;
                    //       break;
                    //     }
                    //     textBody += line + '\n';
                    //     break;
                    //   case FetchState.attachmentHeaders:
                    //     if (line.length === 0) {
                    //       state = FetchState.attachementBody;
                    //       break;
                    //     }
                    //     if (!fileName) {
                    //       const found = /filename=["' ]?([^'" ]+)["' ]?$/.exec(line);
                    //       if (found)
                    //         fileName = found[1];
                    //     }
                    //     break;
                    //   case FetchState.attachementBody:
                    //     if (line.indexOf(boundary) >=0 ) {
                    //       state = FetchState.end;
                    //       if (fileWriter) {
                    //         fileWriter.end(() => {
                    //           log.info('file end done:', attachementFile);
                    //           fileWritingState.getValue().delete(attachementFile);
                    //           fileWritingState.next(fileWritingState.getValue());
                    //         });
                    //       }
                    //       break;
                    //     }
                    //     if (!fileWriter) {
                    //       attachementFile = overrideFileName || Path.resolve('dist/' + fileName);
                    //       fs.mkdirpSync(Path.dirname(attachementFile));
                    //       fileWriter = fs.createWriteStream(attachementFile);
                    //       fileWritingState.getValue().add(attachementFile);
                    //       fileWritingState.next(fileWritingState.getValue());
                    //       log.info('Create attachement file: ', attachementFile);
                    //     }
                    //     // log.warn('boundary', boundary);
                    //     // TODO: wait for drained
                    //     fileWriter.write(Buffer.from(line, 'base64'));
                    //   default:
                    // }
                    return Promise.resolve(0);
                }));
                logEnabled = originLogEnabled;
                return {
                    headers,
                    textBody,
                    fileName: fileName
                };
            });
        }
        function findMail(fromIndx, subject) {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                log.info('findMail', fromIndx, subject);
                while (fromIndx > 0) {
                    const res = yield waitForFetch(fromIndx);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS1pbWFwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDJDQUE2QztBQUU3QywrQkFBa0Q7QUFDbEQsOENBQzRDO0FBQzVDLDZCQUEwRTtBQUMxRSxnRUFBMEI7QUFFMUIsd0RBQXdCO0FBRXhCLDREQUE2RztBQUM3RywwREFBd0I7QUFHeEIsOEJBQThCO0FBQzlCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxvQkFBb0IsQ0FBQyxDQUFDO0FBRWhGLE1BQU0sT0FBTyxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQXlCLENBQUM7QUFDeEUsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUc1RSxNQUFNLGdCQUFnQixHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxHQUFHLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQztBQUV6RyxTQUFzQixRQUFRLENBQUMsT0FBZSxFQUFFLElBQVksRUFBRSxJQUFhOztRQUN6RSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFO1lBQzVCLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0RBQWtELENBQUMsQ0FBQztZQUM3RCxPQUFPO1NBQ1I7UUFDRCxNQUFNLEVBQ0osSUFBSSxFQUFFLEtBQUssRUFDWCxXQUFXLEVBQUUsTUFBTTtRQUNuQixjQUFjO1FBQ2QsSUFBSSxFQUFF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LENBQUMsa0JBQWtCLElBQUcsTUFBTSxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUEsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0YsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FBQTtBQVRELDRCQVNDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvZmV0Y2gtcmVtb3RlLWltYXAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcmVhdGVUcmFuc3BvcnQgfSBmcm9tICdub2RlbWFpbGVyJztcbmltcG9ydCBTTVRQVHJhbnNwb3J0IGZyb20gJ25vZGVtYWlsZXIvbGliL3NtdHAtdHJhbnNwb3J0JztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgQmVoYXZpb3JTdWJqZWN0IH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBtYXAsIC8qY29uY2F0TWFwLCB0YWtlV2hpbGUsIHRha2VMYXN0LCBtYXBUbywqLyB0YXAsIGRpc3RpbmN0VW50aWxDaGFuZ2VkLFxuICBza2lwLCBmaWx0ZXIsIHRha2V9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGNvbm5lY3QgYXMgdHNsQ29ubmVjdCwgQ29ubmVjdGlvbk9wdGlvbnMsIFRMU1NvY2tldCB9IGZyb20gJ3Rscyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge0NoZWNrc3VtLCBXaXRoTWFpbFNlcnZlckNvbmZpZ30gZnJvbSAnLi9mZXRjaC10eXBlcyc7XG5pbXBvcnQge2NyZWF0ZVNlcnZlckRhdGFIYW5kbGVyLCBwYXJzZUxpbmVzT2ZUb2tlbnMsIEltYXBUb2tlblR5cGUsIFN0cmluZ0xpdH0gZnJvbSAnLi9tYWlsL2ltYXAtbXNnLXBhcnNlcic7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7IExvb2tBaGVhZCwgVG9rZW4gfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvYXN5bmMtTExuLXBhcnNlcic7XG5pbXBvcnQge3BhcnNlIGFzIHBhcnNlUmZjODIyfSBmcm9tICcuL21haWwvcmZjODIyLXBhcnNlcic7XG4vLyBpbXBvcnQge1NvY2tldH0gZnJvbSAnbmV0JztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmZldGNoLXJlbW90ZS1pbWFwJyk7XG5cbmNvbnN0IHNldHRpbmcgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpIGFzIFdpdGhNYWlsU2VydmVyQ29uZmlnO1xuY29uc3QgZW52ID0gc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIgPyBzZXR0aW5nLmZldGNoTWFpbFNlcnZlci5lbnYgOiAnbG9jYWwnO1xuXG5cbmNvbnN0IGN1cnJDaGVja3N1bUZpbGUgPSBQYXRoLnJlc29sdmUoJ2NoZWNrc3VtLicgKyAoc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIgPyBlbnYgOiAnbG9jYWwnKSArICcuanNvbicpO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VuZE1haWwoc3ViamVjdDogc3RyaW5nLCB0ZXh0OiBzdHJpbmcsIGZpbGU/OiBzdHJpbmcpIHtcbiAgbG9nLmluZm8oJ2xvZ2luJyk7XG4gIGlmICghc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIpIHtcbiAgICBsb2cud2FybignZmV0Y2hNYWlsU2VydmVyIGlzIG5vdCBjb25maWd1cmVkISBTa2lwIHNlbmRNYWlsJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHtcbiAgICB1c2VyOiBFTUFJTCxcbiAgICBsb2dpblNlY3JldDogU0VDUkVULFxuICAgIC8vIGltYXA6IElNQVAsXG4gICAgc210cDogU01UUFxuICB9ID0gc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXI7XG5cbiAgY29uc3QgdHJhbnNwb3J0ZXIgPSBjcmVhdGVUcmFuc3BvcnQoe1xuICAgIGhvc3Q6IFNNVFAsXG4gICAgYXV0aDoge1xuICAgICAgdHlwZTogJ2xvZ2luJyxcbiAgICAgIHVzZXI6IEVNQUlMLFxuICAgICAgcGFzczogU0VDUkVUXG4gICAgfSxcbiAgICBzZWN1cmU6IHRydWVcbiAgfSBhcyBTTVRQVHJhbnNwb3J0Lk9wdGlvbnMpO1xuXG4gIGxvZy5pbmZvKCdzZW5kIG1haWwnKTtcbiAgY29uc3QgaW5mbyA9IGF3YWl0IHRyYW5zcG9ydGVyLnNlbmRNYWlsKHtcbiAgICBmcm9tOiBFTUFJTCxcbiAgICB0bzogRU1BSUwsXG4gICAgc3ViamVjdDogYGJ1aWxkIGFydGlmYWN0OiAke3N1YmplY3R9YCxcbiAgICB0ZXh0LFxuICAgIGF0dGFjaG1lbnRzOiBmaWxlID8gW1xuICAgICAge1xuICAgICAgICBmaWxlbmFtZTogUGF0aC5iYXNlbmFtZShmaWxlKSxcbiAgICAgICAgcGF0aDogUGF0aC5yZXNvbHZlKGZpbGUpXG4gICAgICB9XG4gICAgXSA6IHVuZGVmaW5lZFxuICB9KTtcblxuICBsb2cuaW5mbyhpbmZvKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJldHJ5U2VuZE1haWwoc3ViamVjdDogc3RyaW5nLCB0ZXh0OiBzdHJpbmcsIGZpbGU/OiBzdHJpbmcpIHtcbiAgbGV0IGVycm9yOiBFcnJvciB8IHVuZGVmaW5lZDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgc2VuZE1haWwoc3ViamVjdCwgdGV4dCwgZmlsZSk7XG4gICAgICBlcnJvciA9IHVuZGVmaW5lZDtcbiAgICAgIGJyZWFrO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgbG9nLmluZm8oJ0dvdCBlcnJvcicsIGVycik7XG4gICAgICBlcnJvciA9IGVycjtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDAwKSk7XG4gICAgfVxuICB9XG4gIGlmIChlcnJvcikge1xuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbi8vIGVudW0gRmV0Y2hTdGF0ZSB7XG4vLyAgIHN0YXJ0ID0gMCxcbi8vICAgaGVhZGVycyxcbi8vICAgaGVhZGVyc0VuZCxcbi8vICAgdGV4dEhlYWRlcnMsXG4vLyAgIHRleHRCb2R5LFxuLy8gICBhdHRhY2htZW50SGVhZGVycyxcbi8vICAgYXR0YWNoZW1lbnRCb2R5LFxuLy8gICBlbmRcbi8vIH1cblxuZXhwb3J0IGludGVyZmFjZSBJbWFwRmV0Y2hEYXRhIHtcbiAgaGVhZGVyczoge1trZXk6IHN0cmluZ106IHN0cmluZ1tdIHwgdW5kZWZpbmVkfTtcbiAgdGV4dEJvZHk/OiBzdHJpbmc7XG4gIGZpbGVOYW1lPzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEltYXBDb21tYW5kQ29udGV4dCB7XG4gIC8qKlxuICAgKiBJbmRleCBvZiBsYXRlc3QgbWFpbFxuICAgKi9cbiAgbGFzdEluZGV4OiBudW1iZXI7XG4gIGZpbGVXcml0aW5nU3RhdGU6IE9ic2VydmFibGU8Ym9vbGVhbj47XG4gIHdhaXRGb3JSZXBseShjb21tYW5kPzogc3RyaW5nLCBvbkxpbmU/OiAobGE6IExvb2tBaGVhZDxUb2tlbjxJbWFwVG9rZW5UeXBlPj4sIHRhZzogc3RyaW5nKSA9PiBQcm9taXNlPGFueT4pOiBQcm9taXNlPHN0cmluZ1tdfG51bGw+O1xuICBmaW5kTWFpbChmcm9tSW5keDogbnVtYmVyLCBzdWJqZWN0OiBzdHJpbmcpOiBQcm9taXNlPG51bWJlciB8IHVuZGVmaW5lZD47XG4gIHdhaXRGb3JGZXRjaChtYWlsSWR4OiBzdHJpbmcgfCBudW1iZXIsIGhlYWRlck9ubHk/OiBib29sZWFuLCBvdmVycmlkZUZpbGVOYW1lPzogc3RyaW5nKTogUHJvbWlzZTxJbWFwRmV0Y2hEYXRhPjtcbiAgd2FpdEZvckZldGNoVGV4dChpbmRleDogbnVtYmVyKTogUHJvbWlzZTxzdHJpbmcgfCB1bmRlZmluZWQ+O1xufVxuXG4vKipcbiAqIElNQVAgc3BlY2lmaWNhdGlvblxuICogaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzE3MzBcbiAqIFxuICogSUQgY29tbWFuZFxuICogaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzI5NzFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvbm5lY3RJbWFwKGNhbGxiYWNrOiAoY29udGV4dDogSW1hcENvbW1hbmRDb250ZXh0KSA9PiBQcm9taXNlPGFueT4pIHtcblxuICBsZXQgbG9nRW5hYmxlZCA9IHRydWU7XG4gIGxldCBjbWRJZHggPSAxO1xuICBjb25zdCBmaWxlV3JpdGluZ1N0YXRlID0gbmV3IEJlaGF2aW9yU3ViamVjdDxTZXQ8c3RyaW5nPj4obmV3IFNldDxzdHJpbmc+KCkpO1xuXG4gIGlmICghc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIpIHtcbiAgICBsb2cud2FybignZmV0Y2hNYWlsU2VydmVyIGlzIG5vdCBjb25maWd1cmVkISBTa2lwIHNlbmRNYWlsJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHtcbiAgICAgIHVzZXI6IEVNQUlMLFxuICAgICAgbG9naW5TZWNyZXQ6IFNFQ1JFVCxcbiAgICAgIGltYXA6IElNQVBcbiAgICAgIC8vIHNtdHA6IFNNVFBcbiAgfSA9IHNldHRpbmcuZmV0Y2hNYWlsU2VydmVyO1xuXG4gIGNvbnN0IGNvbnRleHQ6IHtbayBpbiBrZXlvZiBJbWFwQ29tbWFuZENvbnRleHRdPzogSW1hcENvbW1hbmRDb250ZXh0W2tdfSA9IHt9O1xuXG4gIGNvbnRleHQud2FpdEZvclJlcGx5ID0gd2FpdEZvclJlcGx5O1xuICBjb250ZXh0LndhaXRGb3JGZXRjaCA9IHdhaXRGb3JGZXRjaDtcbiAgY29udGV4dC53YWl0Rm9yRmV0Y2hUZXh0ID0gd2FpdEZvckZldGNoVGV4dDtcbiAgY29udGV4dC5maW5kTWFpbCA9IGZpbmRNYWlsO1xuICBjb250ZXh0LmZpbGVXcml0aW5nU3RhdGUgPSBmaWxlV3JpdGluZ1N0YXRlLnBpcGUoXG4gICAgbWFwKGZpbGVTZXQgPT4ge1xuICAgICAgLy8gbG9nLndhcm4oJ3dyaXRpbmc6ICcsIGZpbGVTZXQudmFsdWVzKCkpO1xuICAgICAgcmV0dXJuIGZpbGVTZXQuc2l6ZSA+IDA7XG4gICAgfSksXG4gICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKVxuICApO1xuXG4gIGNvbnN0IHNlcnZlclJlc0hhbmRsZXIgPSBjcmVhdGVTZXJ2ZXJEYXRhSGFuZGxlcigpO1xuICBzZXJ2ZXJSZXNIYW5kbGVyLm91dHB1dC5waXBlKFxuICAgIHRhcChtc2cgPT4ge1xuICAgICAgaWYgKG1zZyAhPSBudWxsKSBsb2cuZGVidWcoJyAgPC0gJyArIG1zZy5tYXAodG9rZW4gPT4gdG9rZW4udGV4dCkuam9pbignICcpKTtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuXG4gIGxldCBzb2NrZXQ6IFRMU1NvY2tldHx1bmRlZmluZWQ7XG4gIHRyeSB7XG4gICAgc29ja2V0ID0gYXdhaXQgbmV3IFByb21pc2U8UmV0dXJuVHlwZTx0eXBlb2YgdHNsQ29ubmVjdD4+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHNvY2tldCA9IHRzbENvbm5lY3Qoe1xuICAgICAgICBob3N0OiBJTUFQLCBwb3J0OiA5OTMsXG4gICAgICAgIGVuYWJsZVRyYWNlOiB0cnVlXG4gICAgICB9IGFzIENvbm5lY3Rpb25PcHRpb25zKTtcblxuICAgICAgc29ja2V0Lm9uKCdzZWN1cmVDb25uZWN0JywgKCkgPT4ge1xuICAgICAgICBsb2cuaW5mbygnY29ubmVjdGVkJywgc29ja2V0LmF1dGhvcml6ZWQgPyAnYXV0aG9yaXplZCcgOiAndW5hdXRob3JpemVkJyk7XG4gICAgICAgIHJlc29sdmUoc29ja2V0KTtcbiAgICAgIH0pXG4gICAgICAub24oJ2Vycm9yJywgZXJyID0+IHJlamVjdChlcnIpKVxuICAgICAgLm9uKCd0aW1lb3V0JywgKCkgPT4gcmVqZWN0KG5ldyBFcnJvcignVGltZW91dCcpKSk7XG4gICAgICBzb2NrZXQub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGRhdGEudG9TdHJpbmcoKSk7XG4gICAgICAgIHNlcnZlclJlc0hhbmRsZXIuaW5wdXQoZGF0YSk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IHdhaXRGb3JSZXBseSgpO1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseSgnSUQgKFwibmFtZVwiIFwiY29tLnRlbmNlbnQuZm94bWFpbFwiIFwidmVyc2lvblwiIFwiNy4yLjkuNzlcIiknKTtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoYExPR0lOICR7RU1BSUx9ICR7U0VDUkVUfWApO1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseSgnU0VMRUNUIElOQk9YJywgYXN5bmMgbGEgPT4ge1xuICAgICAgY29uc3QgZXhpdHNUayA9IGF3YWl0IGxhLmxhKDMpO1xuICAgICAgaWYgKGV4aXRzVGsgJiYgZXhpdHNUay50ZXh0LnRvVXBwZXJDYXNlKCkgPT09ICdFWElTVFMnKSB7XG4gICAgICAgIGNvbnRleHQubGFzdEluZGV4ID0gcGFyc2VJbnQoKGF3YWl0IGxhLmxhKDIpKSEudGV4dCwgMTApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgYXdhaXQgY2FsbGJhY2soY29udGV4dCBhcyBJbWFwQ29tbWFuZENvbnRleHQpO1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseSgnTE9HT1VUJyk7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgbG9nLmVycm9yKGV4KTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgd2FpdEZvclJlcGx5KCdMT0dPVVQnKTtcbiAgICB9IGNhdGNoIChlcikge31cbiAgICBpZiAoc29ja2V0KVxuICAgICAgc29ja2V0LmVuZCgpO1xuICAgIHRocm93IGV4O1xuICB9XG5cbiAgc2VydmVyUmVzSGFuZGxlci5pbnB1dChudWxsKTtcbiAgc29ja2V0LmVuZCgpO1xuXG4gIGFzeW5jIGZ1bmN0aW9uIHdhaXRGb3JGZXRjaFRleHQoaW5kZXg6IG51bWJlcikge1xuICAgIGxldCBib2R5MTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseShgRkVUQ0ggJHtpbmRleH0gQk9EWVsxXWAsIGFzeW5jIGxhID0+IHtcbiAgICAgIHdoaWxlICgoYXdhaXQgbGEubGEoKSkgIT0gbnVsbCkge1xuICAgICAgICBjb25zdCB0b2tlbiA9IGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgICAgaWYgKHRva2VuLnRleHQgPT09ICdCT0RZJyAmJiAoYXdhaXQgbGEubGEoKSkhLnRleHQgPT09ICdbMV0nKSB7XG4gICAgICAgICAgYXdhaXQgbGEuYWR2YW5jZSgpO1xuICAgICAgICAgIGJvZHkxID0gKChhd2FpdCBsYS5hZHZhbmNlKCkpIGFzIHVua25vd24gYXMgU3RyaW5nTGl0KS5kYXRhLnRvU3RyaW5nKCd1dGY4Jyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGxvZy53YXJuKGJ1Zik7XG4gICAgLy8gcmV0dXJuIC9eXFwqXFxzK1xcZCtcXHMrRkVUQ0hcXHMrXFwoLio/XFx7XFxkK1xcfShbXl0qKVxcKSQvbS5leGVjKGJ1ZikhWzFdO1xuICAgIHJldHVybiBib2R5MTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHdhaXRGb3JSZXBseShjb21tYW5kPzogc3RyaW5nLCBvbkxpbmU/OiAobGE6IExvb2tBaGVhZDxUb2tlbjxJbWFwVG9rZW5UeXBlPj4sIHRhZzogc3RyaW5nKSA9PiBQcm9taXNlPGFueT4pIHtcbiAgICBsZXQgdGFnOiBzdHJpbmc7XG4gICAgaWYgKGNvbW1hbmQpXG4gICAgICB0YWcgPSAnYScgKyAoY21kSWR4KyspO1xuXG4gICAgY29uc3QgcHJvbSA9IHBhcnNlTGluZXNPZlRva2VucyhzZXJ2ZXJSZXNIYW5kbGVyLm91dHB1dCwgYXN5bmMgbGEgPT4ge1xuICAgICAgY29uc3QgcmVzVGFnID0gYXdhaXQgbGEubGEoKTtcbiAgICAgIGlmICghdGFnICYmIHJlc1RhZyEudGV4dCA9PT0gJyonIHx8IHJlc1RhZyEudGV4dCA9PT0gdGFnKSB7XG4gICAgICAgIGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBhd2FpdCBsYS5sYSgpO1xuICAgICAgICBsZXQgcmV0dXJuVGV4dCA9ICcnO1xuICAgICAgICBpZiAoL09LfE5PLy50ZXN0KHN0YXRlIS50ZXh0KSkge1xuICAgICAgICAgIHJldHVyblRleHQgKz0gKGF3YWl0IGxhLmFkdmFuY2UoKSkudGV4dDtcbiAgICAgICAgICB3aGlsZSAoKGF3YWl0IGxhLmxhKCkpICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVyblRleHQgKz0gJyAnICsgKGF3YWl0IGxhLmFkdmFuY2UoKSkudGV4dDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldHVyblRleHQ7XG4gICAgICB9IGVsc2UgaWYgKG9uTGluZSkge1xuICAgICAgICBhd2FpdCBvbkxpbmUobGEsIHRhZyk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAoY29tbWFuZCkge1xuICAgICAgY29uc3QgY21kID0gdGFnISArICcgJyArIGNvbW1hbmQ7XG4gICAgICBpZiAoc29ja2V0KVxuICAgICAgICBzb2NrZXQud3JpdGUoQnVmZmVyLmZyb20oYCR7dGFnIX0gJHtjb21tYW5kfVxcclxcbmAsICd1dGY4JykpO1xuICAgICAgbG9nLmRlYnVnKCc9PicsIGNtZCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb207XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiB3YWl0Rm9yRmV0Y2gobWFpbElkeDogc3RyaW5nIHwgbnVtYmVyID0gJyonLCBoZWFkZXJPbmx5ID0gdHJ1ZSwgb3ZlcnJpZGVGaWxlTmFtZT86IHN0cmluZyk6IFByb21pc2U8SW1hcEZldGNoRGF0YT4ge1xuICAgIC8vIGxldCBzdGF0ZTogRmV0Y2hTdGF0ZSA9IEZldGNoU3RhdGUuc3RhcnQ7XG4gICAgbGV0IGhlYWRlcnM6IHtcbiAgICAgIHN1YmplY3Q/OiBzdHJpbmdbXTtcbiAgICAgICdjb250ZW50LXR5cGUnPzogc3RyaW5nW107XG4gICAgICBba2V5OiBzdHJpbmddOiBzdHJpbmdbXSB8IHVuZGVmaW5lZDtcbiAgICB9ID0ge307XG4gICAgLy8gbGV0IGxhc3RIZWFkZXJOYW1lOiBzdHJpbmc7XG4gICAgLy8gbGV0IGJvdW5kYXJ5OiBzdHJpbmc7XG4gICAgbGV0IHRleHRCb2R5OiBzdHJpbmcgPSAnJztcbiAgICBsZXQgZmlsZU5hbWU6IHN0cmluZztcbiAgICAvLyBsZXQgZmlsZVdyaXRlcjogZnMuV3JpdGVTdHJlYW07XG4gICAgLy8gbGV0IGF0dGFjaGVtZW50RmlsZTogc3RyaW5nO1xuXG4gICAgY29uc3Qgb3JpZ2luTG9nRW5hYmxlZCA9IGxvZ0VuYWJsZWQ7XG4gICAgbG9nRW5hYmxlZCA9IGhlYWRlck9ubHk7XG4gICAgYXdhaXQgd2FpdEZvclJlcGx5KGBGRVRDSCAke21haWxJZHh9IFJGQzgyMiR7aGVhZGVyT25seSA/ICcuSEVBREVSJyA6ICcnfWAsIGFzeW5jIChsYSkgPT4ge1xuICAgICAgd2hpbGUgKChhd2FpdCBsYS5sYSgpKSAhPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IHRrID0gYXdhaXQgbGEuYWR2YW5jZSgpO1xuICAgICAgICBpZiAodGsudHlwZSAhPT0gSW1hcFRva2VuVHlwZS5zdHJpbmdMaXQpIHtcbiAgICAgICAgICBsb2cud2Fybih0ay50ZXh0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBsb2cud2Fybignc3RyaW5nIGxpdGVyYWw6XFxuJywgKHRrIGFzIGFueSBhcyBTdHJpbmdMaXQpLmRhdGEudG9TdHJpbmcoJ3V0ZjgnKSk7XG4gICAgICAgICAgLy8gcGFyc2VSZmM4MjIoKHRrIGFzIGFueSBhcyBTdHJpbmdMaXQpLmRhdGEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBzd2l0Y2ggKHN0YXRlKSB7XG4gICAgICAvLyAgIGNhc2UgRmV0Y2hTdGF0ZS5zdGFydDpcbiAgICAgIC8vICAgICBpZiAoL15cXCpcXHMrWzAtOV0rXFxzK0ZFVENIXFxzKy8udGVzdChsaW5lKSkge1xuICAgICAgLy8gICAgICAgc3RhdGUgPSBGZXRjaFN0YXRlLmhlYWRlcnM7XG4gICAgICAvLyAgICAgfVxuICAgICAgLy8gICAgIGJyZWFrO1xuICAgICAgLy8gICBjYXNlIEZldGNoU3RhdGUuaGVhZGVyczpcbiAgICAgIC8vICAgICBpZiAoL15cXHMvLnRlc3QobGluZSkpIHtcbiAgICAgIC8vICAgICAgIGNvbnN0IGl0ZW1zID0gaGVhZGVyc1tsYXN0SGVhZGVyTmFtZV0hO1xuICAgICAgLy8gICAgICAgaXRlbXMucHVzaCguLi5saW5lLnNwbGl0KCc7JykubWFwKGl0ZW0gPT4gaXRlbS50cmltKCkpLmZpbHRlcihpdGVtID0+IGl0ZW0ubGVuZ3RoID4gMCkpO1xuICAgICAgLy8gICAgICAgYnJlYWs7XG4gICAgICAvLyAgICAgfVxuICAgICAgLy8gICAgIGlmIChsaW5lLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy8gICAgICAgc3RhdGUgPSBGZXRjaFN0YXRlLmhlYWRlcnNFbmQ7XG5cbiAgICAgIC8vICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRIZWFkZXJzOiB0eXBlb2YgaGVhZGVycyA9IHt9O1xuICAgICAgLy8gICAgICAgT2JqZWN0LmtleXMoaGVhZGVycykuZm9yRWFjaChrZXkgPT4gbm9ybWFsaXplZEhlYWRlcnNba2V5LnRvTG93ZXJDYXNlKCldID0gaGVhZGVyc1trZXldKTtcbiAgICAgIC8vICAgICAgIGhlYWRlcnMgPSBub3JtYWxpemVkSGVhZGVycztcblxuICAgICAgLy8gICAgICAgY29uc3QgY29udGVudFR5cGUgPSBoZWFkZXJzWydjb250ZW50LXR5cGUnXTtcbiAgICAgIC8vICAgICAgIGlmICghY29udGVudFR5cGUpIHtcbiAgICAgIC8vICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIENvbnRlbnQtVHlwZSBpbiBoZWFkZXJzOiAke0pTT04uc3RyaW5naWZ5KGhlYWRlcnMsIG51bGwsICcgICcpfWApO1xuICAgICAgLy8gICAgICAgfVxuICAgICAgLy8gICAgICAgLy8gaHR0cHM6Ly93d3cudzMub3JnL1Byb3RvY29scy9yZmMxMzQxLzdfMl9NdWx0aXBhcnQuaHRtbFxuICAgICAgLy8gICAgICAgaWYgKGNvbnRlbnRUeXBlWzBdICE9PSAnbXVsdGlwYXJ0L21peGVkJykge1xuICAgICAgLy8gICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCdObyBzdXBwb3J0IGZvciBjb250ZW50LXR5cGU6ICcgKyBjb250ZW50VHlwZVswXSk7XG4gICAgICAvLyAgICAgICB9XG4gICAgICAvLyAgICAgICBib3VuZGFyeSA9IGNvbnRlbnRUeXBlLmZpbmQoaXRlbSA9PiBpdGVtLnN0YXJ0c1dpdGgoJ2JvdW5kYXJ5PScpKSE7XG4gICAgICAvLyAgICAgICBib3VuZGFyeSA9ICctLScgKyAvXltcIiddPyguKj8pW1wiJ10/JC8uZXhlYyhib3VuZGFyeS5zbGljZSgnYm91bmRhcnk9Jy5sZW5ndGgpKSFbMV07XG4gICAgICAvLyAgICAgICBicmVhaztcbiAgICAgIC8vICAgICB9XG4gICAgICAvLyAgICAgY29uc3QgbSA9IC9eKFteOl0rKVxcOiguKikkLy5leGVjKGxpbmUpO1xuICAgICAgLy8gICAgIGlmIChtKSB7XG4gICAgICAvLyAgICAgICBoZWFkZXJzW21bMV1dID0gbVsyXS5zcGxpdCgnOycpLm1hcChpdGVtID0+IGl0ZW0udHJpbSgpKS5maWx0ZXIoaXRlbSA9PiBpdGVtLmxlbmd0aCA+IDApO1xuICAgICAgLy8gICAgICAgbGFzdEhlYWRlck5hbWUgPSBtWzFdO1xuICAgICAgLy8gICAgIH1cbiAgICAgIC8vICAgICBicmVhaztcbiAgICAgIC8vICAgY2FzZSBGZXRjaFN0YXRlLmhlYWRlcnNFbmQ6XG4gICAgICAvLyAgICAgaWYgKGxpbmUgPT09IGJvdW5kYXJ5KSB7XG4gICAgICAvLyAgICAgICBzdGF0ZSA9IEZldGNoU3RhdGUudGV4dEhlYWRlcnM7XG4gICAgICAvLyAgICAgfVxuICAgICAgLy8gICAgIGJyZWFrO1xuICAgICAgLy8gICBjYXNlIEZldGNoU3RhdGUudGV4dEhlYWRlcnM6XG4gICAgICAvLyAgICAgaWYgKGxpbmUubGVuZ3RoID09PSAwKVxuICAgICAgLy8gICAgICAgc3RhdGUgPSBGZXRjaFN0YXRlLnRleHRCb2R5O1xuICAgICAgLy8gICAgIGJyZWFrO1xuICAgICAgLy8gICBjYXNlIEZldGNoU3RhdGUudGV4dEJvZHk6XG4gICAgICAvLyAgICAgaWYgKGxpbmUgPT09IGJvdW5kYXJ5KSB7XG4gICAgICAvLyAgICAgICB0ZXh0Qm9keSA9IHRleHRCb2R5LnNsaWNlKDAsIHRleHRCb2R5Lmxlbmd0aCAtIDEpO1xuICAgICAgLy8gICAgICAgc3RhdGUgPSBGZXRjaFN0YXRlLmF0dGFjaG1lbnRIZWFkZXJzO1xuICAgICAgLy8gICAgICAgYnJlYWs7XG4gICAgICAvLyAgICAgfVxuICAgICAgLy8gICAgIHRleHRCb2R5ICs9IGxpbmUgKyAnXFxuJztcbiAgICAgIC8vICAgICBicmVhaztcbiAgICAgIC8vICAgY2FzZSBGZXRjaFN0YXRlLmF0dGFjaG1lbnRIZWFkZXJzOlxuICAgICAgLy8gICAgIGlmIChsaW5lLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy8gICAgICAgc3RhdGUgPSBGZXRjaFN0YXRlLmF0dGFjaGVtZW50Qm9keTtcbiAgICAgIC8vICAgICAgIGJyZWFrO1xuICAgICAgLy8gICAgIH1cbiAgICAgIC8vICAgICBpZiAoIWZpbGVOYW1lKSB7XG4gICAgICAvLyAgICAgICBjb25zdCBmb3VuZCA9IC9maWxlbmFtZT1bXCInIF0/KFteJ1wiIF0rKVtcIicgXT8kLy5leGVjKGxpbmUpO1xuICAgICAgLy8gICAgICAgaWYgKGZvdW5kKVxuICAgICAgLy8gICAgICAgICBmaWxlTmFtZSA9IGZvdW5kWzFdO1xuICAgICAgLy8gICAgIH1cbiAgICAgIC8vICAgICBicmVhaztcbiAgICAgIC8vICAgY2FzZSBGZXRjaFN0YXRlLmF0dGFjaGVtZW50Qm9keTpcbiAgICAgIC8vICAgICBpZiAobGluZS5pbmRleE9mKGJvdW5kYXJ5KSA+PTAgKSB7XG4gICAgICAvLyAgICAgICBzdGF0ZSA9IEZldGNoU3RhdGUuZW5kO1xuICAgICAgLy8gICAgICAgaWYgKGZpbGVXcml0ZXIpIHtcbiAgICAgIC8vICAgICAgICAgZmlsZVdyaXRlci5lbmQoKCkgPT4ge1xuICAgICAgLy8gICAgICAgICAgIGxvZy5pbmZvKCdmaWxlIGVuZCBkb25lOicsIGF0dGFjaGVtZW50RmlsZSk7XG4gICAgICAvLyAgICAgICAgICAgZmlsZVdyaXRpbmdTdGF0ZS5nZXRWYWx1ZSgpLmRlbGV0ZShhdHRhY2hlbWVudEZpbGUpO1xuICAgICAgLy8gICAgICAgICAgIGZpbGVXcml0aW5nU3RhdGUubmV4dChmaWxlV3JpdGluZ1N0YXRlLmdldFZhbHVlKCkpO1xuICAgICAgLy8gICAgICAgICB9KTtcbiAgICAgIC8vICAgICAgIH1cbiAgICAgIC8vICAgICAgIGJyZWFrO1xuICAgICAgLy8gICAgIH1cbiAgICAgIC8vICAgICBpZiAoIWZpbGVXcml0ZXIpIHtcbiAgICAgIC8vICAgICAgIGF0dGFjaGVtZW50RmlsZSA9IG92ZXJyaWRlRmlsZU5hbWUgfHwgUGF0aC5yZXNvbHZlKCdkaXN0LycgKyBmaWxlTmFtZSk7XG4gICAgICAvLyAgICAgICBmcy5ta2RpcnBTeW5jKFBhdGguZGlybmFtZShhdHRhY2hlbWVudEZpbGUpKTtcbiAgICAgIC8vICAgICAgIGZpbGVXcml0ZXIgPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShhdHRhY2hlbWVudEZpbGUpO1xuICAgICAgLy8gICAgICAgZmlsZVdyaXRpbmdTdGF0ZS5nZXRWYWx1ZSgpLmFkZChhdHRhY2hlbWVudEZpbGUpO1xuICAgICAgLy8gICAgICAgZmlsZVdyaXRpbmdTdGF0ZS5uZXh0KGZpbGVXcml0aW5nU3RhdGUuZ2V0VmFsdWUoKSk7XG4gICAgICAvLyAgICAgICBsb2cuaW5mbygnQ3JlYXRlIGF0dGFjaGVtZW50IGZpbGU6ICcsIGF0dGFjaGVtZW50RmlsZSk7XG4gICAgICAvLyAgICAgfVxuICAgICAgLy8gICAgIC8vIGxvZy53YXJuKCdib3VuZGFyeScsIGJvdW5kYXJ5KTtcbiAgICAgIC8vICAgICAvLyBUT0RPOiB3YWl0IGZvciBkcmFpbmVkXG4gICAgICAvLyAgICAgZmlsZVdyaXRlci53cml0ZShCdWZmZXIuZnJvbShsaW5lLCAnYmFzZTY0JykpO1xuICAgICAgLy8gICBkZWZhdWx0OlxuICAgICAgLy8gfVxuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgwKTtcbiAgICB9KTtcbiAgICBsb2dFbmFibGVkID0gb3JpZ2luTG9nRW5hYmxlZDtcblxuICAgIHJldHVybiB7XG4gICAgICBoZWFkZXJzLFxuICAgICAgdGV4dEJvZHksXG4gICAgICBmaWxlTmFtZTogZmlsZU5hbWUhXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGZpbmRNYWlsKGZyb21JbmR4OiBudW1iZXIsIHN1YmplY3Q6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyIHwgdW5kZWZpbmVkPiB7XG4gICAgbG9nLmluZm8oJ2ZpbmRNYWlsJywgZnJvbUluZHgsIHN1YmplY3QpO1xuICAgIHdoaWxlIChmcm9tSW5keCA+IDApIHtcbiAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IHdhaXRGb3JGZXRjaChmcm9tSW5keCk7XG4gICAgICBpZiAocmVzLmhlYWRlcnMuc3ViamVjdCAmJiByZXMuaGVhZGVycy5zdWJqZWN0WzBdLmluZGV4T2Yoc3ViamVjdCkgPj0gMClcbiAgICAgICAgcmV0dXJuIGZyb21JbmR4O1xuICAgICAgZnJvbUluZHgtLTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgSW1hcE1hbmFnZXIge1xuICAvLyBjaGVja3N1bTogQ2hlY2tzdW07XG4gIGNoZWNrc3VtU3RhdGUgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PENoZWNrc3VtIHwgbnVsbD4obnVsbCk7XG4gIGZpbGVXcml0aW5nU3RhdGU6IEltYXBDb21tYW5kQ29udGV4dFsnZmlsZVdyaXRpbmdTdGF0ZSddO1xuICB3YXRjaGluZyA9IGZhbHNlO1xuICBwcml2YXRlIHRvRmV0Y2hBcHBzU3RhdGUgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PHN0cmluZ1tdPihbXSk7XG4gIC8vIHByaXZhdGUgIHppcERvd25sb2FkRGlyOiBzdHJpbmc7XG4gIC8vIHByaXZhdGUgaW1hcEFjdGlvbnMgPSBuZXcgU3ViamVjdDwoY3R4OiBJbWFwQ29tbWFuZENvbnRleHQpID0+IFByb21pc2U8YW55Pj4oKTtcblxuICBwcml2YXRlIGN0eDogSW1hcENvbW1hbmRDb250ZXh0O1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBlbnY6IHN0cmluZywgcHVibGljIHppcERvd25sb2FkRGlyPzogc3RyaW5nKSB7XG4gICAgaWYgKHppcERvd25sb2FkRGlyID09IG51bGwpXG4gICAgICB0aGlzLnppcERvd25sb2FkRGlyID0gUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShjdXJyQ2hlY2tzdW1GaWxlKSwgJ2RlcGxveS1zdGF0aWMtJyArIGVudik7XG4gIH1cblxuICBhc3luYyBmZXRjaENoZWNrc3VtKCk6IFByb21pc2U8Q2hlY2tzdW0gfCB1bmRlZmluZWQ+ICB7XG4gICAgbGV0IGNzOiBDaGVja3N1bSB8IHVuZGVmaW5lZDtcbiAgICBhd2FpdCBjb25uZWN0SW1hcChhc3luYyBjdHggPT4ge1xuICAgICAgY3MgPSBhd2FpdCB0aGlzLl9mZXRjaENoZWNrc3VtKGN0eCk7XG4gICAgfSk7XG4gICAgbG9nLmluZm8oJ2ZldGNoZWQgY2hlY2tzdW06JywgY3MpO1xuICAgIHRoaXMuY2hlY2tzdW1TdGF0ZS5uZXh0KGNzISk7XG4gICAgcmV0dXJuIGNzO1xuICB9XG5cbiAgYXN5bmMgZmV0Y2hVcGRhdGVDaGVja1N1bShhcHBOYW1lOiBzdHJpbmcpOiBQcm9taXNlPENoZWNrc3VtPiB7XG4gICAgbGV0IGNzID0gYXdhaXQgdGhpcy5mZXRjaENoZWNrc3VtKCk7XG4gICAgbG9nLmluZm8oJ2ZldGNoZWQgY2hlY2tzdW06JywgY3MpO1xuICAgIGlmIChjcyEudmVyc2lvbnMhW2FwcE5hbWVdID09IG51bGwpIHtcbiAgICAgIGNzIS52ZXJzaW9ucyFbYXBwTmFtZV0gPSB7XG4gICAgICAgIHZlcnNpb246IDAsXG4gICAgICAgIHBhdGg6ICc8c2VlIGF0dGFjaGVtZW50IGZpbGUgbmFtZT4nXG4gICAgICB9O1xuICAgIH1cbiAgICBjcyEudmVyc2lvbnMhW2FwcE5hbWVdLnZlcnNpb24rKztcbiAgICB0aGlzLmNoZWNrc3VtU3RhdGUubmV4dChjcyEpO1xuICAgIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKGN1cnJDaGVja3N1bUZpbGUpKTtcbiAgICBjb25zdCBjaGVja3N1bVN0ciA9IEpTT04uc3RyaW5naWZ5KGNzISwgbnVsbCwgJyAgJyk7XG4gICAgZnMud3JpdGVGaWxlU3luYyhjdXJyQ2hlY2tzdW1GaWxlLCBjaGVja3N1bVN0cik7XG4gICAgbG9nLmluZm8oJ3dyaXRlICVzXFxuJXMnLCBjdXJyQ2hlY2tzdW1GaWxlLCBjaGVja3N1bVN0cik7XG4gICAgcmV0dXJuIGNzITtcbiAgfVxuXG4gIC8qKlxuICAgKiBEb25lIHdoZW4gZmlsZXMgYXJlIHdyaXR0ZW5cbiAgICogQHBhcmFtIGV4Y2x1ZGVBcHAgZXhjbHVkZSBhcHBcbiAgICovXG4gIGFzeW5jIGZldGNoT3RoZXJaaXBzKGV4Y2x1ZGVBcHA/OiBzdHJpbmcpIHtcbiAgICBsZXQgYXBwTmFtZXMgPSBPYmplY3Qua2V5cyh0aGlzLmNoZWNrc3VtU3RhdGUuZ2V0VmFsdWUoKSEudmVyc2lvbnMhKVxuICAgIC5maWx0ZXIoYXBwID0+IGFwcCAhPT0gZXhjbHVkZUFwcCk7XG5cbiAgICBsZXQgZmlsZVdyaXR0ZW5Qcm9tOiBQcm9taXNlPGJvb2xlYW4+IHwgdW5kZWZpbmVkO1xuXG4gICAgYXdhaXQgY29ubmVjdEltYXAoYXN5bmMgY3R4ID0+IHtcblxuICAgICAgZmlsZVdyaXR0ZW5Qcm9tID0gY3R4LmZpbGVXcml0aW5nU3RhdGUucGlwZShcbiAgICAgICAgc2tpcCgxKSxcbiAgICAgICAgZmlsdGVyKHdyaXRpbmcgPT4gIXdyaXRpbmcpLFxuICAgICAgICB0YWtlKGFwcE5hbWVzLmxlbmd0aClcbiAgICAgICkudG9Qcm9taXNlKCk7XG5cbiAgICAgIGZvciAoY29uc3QgYXBwIG9mIGFwcE5hbWVzKSB7XG4gICAgICAgIGxvZy5pbmZvKCdmZXRjaCBvdGhlciB6aXA6ICcgKyBhcHApO1xuICAgICAgICBjb25zdCBpZHggPSBhd2FpdCBjdHguZmluZE1haWwoY3R4Lmxhc3RJbmRleCwgYGJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LSR7YXBwfSlgKTtcbiAgICAgICAgaWYgKCFpZHgpIHtcbiAgICAgICAgICBsb2cuaW5mbyhgbWFpbCBcImJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LSR7YXBwfSlcIiBpcyBub3QgRm91bmQsIHNraXAgZG93bmxvYWQgemlwYCk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgY3R4LndhaXRGb3JGZXRjaChpZHgsIGZhbHNlLCBQYXRoLnJlc29sdmUodGhpcy56aXBEb3dubG9hZERpciEsIGFwcCArICcuemlwJykpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmIChmaWxlV3JpdHRlblByb20pXG4gICAgICBhd2FpdCBmaWxlV3JpdHRlblByb207XG4gICAgcmV0dXJuIGFwcE5hbWVzO1xuICB9XG5cbiAgYXN5bmMgc3RhcnRXYXRjaE1haWwocG9sbEludGVydmFsID0gNjAwMDApIHtcbiAgICB0aGlzLndhdGNoaW5nID0gdHJ1ZTtcbiAgICB3aGlsZSAodGhpcy53YXRjaGluZykge1xuICAgICAgYXdhaXQgdGhpcy5jaGVja01haWxGb3JVcGRhdGUoKTtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBwb2xsSW50ZXJ2YWwpKTsgLy8gNjAgc2VjXG4gICAgfVxuICB9XG5cbiAgYXN5bmMgY2hlY2tNYWlsRm9yVXBkYXRlKCkge1xuICAgIGF3YWl0IGNvbm5lY3RJbWFwKGFzeW5jIGN0eCA9PiB7XG4gICAgICB0aGlzLmN0eCA9IGN0eDtcbiAgICAgIHRoaXMuZmlsZVdyaXRpbmdTdGF0ZSA9IGN0eC5maWxlV3JpdGluZ1N0YXRlO1xuXG4gICAgICBjb25zdCBjcyA9IGF3YWl0IHRoaXMuX2ZldGNoQ2hlY2tzdW0oY3R4KTtcbiAgICAgIHRoaXMuY2hlY2tzdW1TdGF0ZS5uZXh0KGNzISk7XG5cbiAgICAgIGNvbnN0IHRvRmV0Y2hBcHBzID0gdGhpcy50b0ZldGNoQXBwc1N0YXRlLmdldFZhbHVlKCk7XG4gICAgICBpZiAodG9GZXRjaEFwcHMubGVuZ3RoID4gMCkge1xuICAgICAgICB0aGlzLnRvRmV0Y2hBcHBzU3RhdGUubmV4dChbXSk7XG4gICAgICAgIGZvciAoY29uc3QgYXBwTmFtZSBvZiB0b0ZldGNoQXBwcykge1xuICAgICAgICAgIGF3YWl0IHRoaXMuZmV0Y2hBdHRhY2htZW50KGFwcE5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBhd2FpdCBjdHgud2FpdEZvclJlcGx5KCdTVUJTQ1JJQkUgSU5CT1gnKTtcbiAgICAgIC8vIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAzMDAwMCkpOyAvLyAzMCBzZWNcbiAgICAgIGRlbGV0ZSB0aGlzLmN0eDtcbiAgICB9KTtcbiAgfVxuXG4gIGZldGNoQXBwRHVyaW5nV2F0Y2hBY3Rpb24oLi4uYXBwTmFtZXM6IHN0cmluZ1tdKSB7XG4gICAgdGhpcy50b0ZldGNoQXBwc1N0YXRlLm5leHQoYXBwTmFtZXMpO1xuICB9XG5cbiAgYXN5bmMgc2VuZEZpbGVBbmRVcGRhdGVkQ2hlY2tzdW0oYXBwTmFtZTogc3RyaW5nLCBmaWxlOiBzdHJpbmcpIHtcbiAgICBjb25zdCBjcyA9IGF3YWl0IHRoaXMuZmV0Y2hVcGRhdGVDaGVja1N1bShhcHBOYW1lKTtcbiAgICBhd2FpdCByZXRyeVNlbmRNYWlsKGBia2prLXByZS1idWlsZCgke3RoaXMuZW52fS0ke2FwcE5hbWV9KWAsIEpTT04uc3RyaW5naWZ5KGNzLCBudWxsLCAnICAnKSwgZmlsZSk7XG4gIH1cblxuICBzdG9wV2F0Y2goKSB7XG4gICAgdGhpcy53YXRjaGluZyA9IGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBmZXRjaEF0dGFjaG1lbnQoYXBwOiBzdHJpbmcpIHtcbiAgICBjb25zdCBpZHggPSBhd2FpdCB0aGlzLmN0eC5maW5kTWFpbCh0aGlzLmN0eC5sYXN0SW5kZXgsIGBia2prLXByZS1idWlsZCgke3RoaXMuZW52fS0ke2FwcH0pYCk7XG4gICAgaWYgKGlkeCA9PSBudWxsKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW50IGZpbmQgbWFpbDogJyArIGBia2prLXByZS1idWlsZCgke3RoaXMuZW52fS0ke2FwcH0pYCk7XG4gICAgYXdhaXQgdGhpcy5jdHgud2FpdEZvckZldGNoKGlkeCEsIGZhbHNlLCBQYXRoLnJlc29sdmUodGhpcy56aXBEb3dubG9hZERpciEsIGAke2FwcH0uemlwYCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBfZmV0Y2hDaGVja3N1bShjdHg6IEltYXBDb21tYW5kQ29udGV4dCkge1xuICAgIGNvbnN0IGlkeCA9IGF3YWl0IGN0eC5maW5kTWFpbChjdHgubGFzdEluZGV4LCBgYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tYCk7XG4gICAgbG9nLmluZm8oJ19mZXRjaENoZWNrc3VtLCBpbmRleDonLCBpZHgpO1xuICAgIGlmIChpZHggPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHt2ZXJzaW9uczoge319O1xuICAgIH1cbiAgICBjb25zdCBqc29uU3RyID0gYXdhaXQgY3R4LndhaXRGb3JGZXRjaFRleHQoaWR4ISk7XG4gICAgaWYgKGpzb25TdHIgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdFbXB0eSBKU09OIHRleHQnKTtcbiAgICB9XG4gICAgcmV0dXJuIEpTT04ucGFyc2UoanNvblN0cikgYXMgQ2hlY2tzdW07XG4gIH1cblxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdGVzdE1haWwoaW1hcDogc3RyaW5nLCB1c2VyOiBzdHJpbmcsIGxvZ2luU2VjcmV0OiBzdHJpbmcpIHtcbiAgbG9nLmRlYnVnID0gbG9nLmluZm87XG4gIGFwaS5jb25maWcuc2V0KFthcGkucGFja2FnZU5hbWUsICdmZXRjaE1haWxTZXJ2ZXInXSwge1xuICAgIGltYXAsIHVzZXIsIGxvZ2luU2VjcmV0XG4gIH0gYXMgV2l0aE1haWxTZXJ2ZXJDb25maWdbJ2ZldGNoTWFpbFNlcnZlciddKTtcbiAgYXdhaXQgY29ubmVjdEltYXAoYXN5bmMgY3R4ID0+IHtcbiAgICAvLyBsb2cuaW5mbygnRmV0Y2ggbWFpbCAlZCBhcyB0ZXh0IDpcXG4nICsgKGF3YWl0IGN0eC53YWl0Rm9yRmV0Y2hUZXh0KGN0eC5sYXN0SW5kZXgpKSwgY3R4Lmxhc3RJbmRleCk7XG4gICAgbG9nLmluZm8oJ0ZldGNoIG1haWwgJWQ6XFxuJyArIGF3YWl0IGN0eC53YWl0Rm9yRmV0Y2goY3R4Lmxhc3RJbmRleCwgZmFsc2UpLCBjdHgubGFzdEluZGV4KTtcbiAgfSk7XG59XG4iXX0=
