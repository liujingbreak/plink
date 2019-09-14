"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const nodemailer_1 = require("nodemailer");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const tls_1 = require("tls");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const fetch_types_1 = require("./fetch-types");
const __api_1 = tslib_1.__importDefault(require("__api"));
// import {Socket} from 'net';
const log = require('log4js').getLogger(__api_1.default.packageName + '.fetch-remote-imap');
function sendMail(subject, text, file) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        log.info('login');
        const { fetchMailServer: { user: EMAIL, loginSecret: SECRET, 
        // imap: IMAP,
        smtp: SMTP } } = __api_1.default.config.get(__api_1.default.packageName);
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
var FetchState;
(function (FetchState) {
    FetchState[FetchState["start"] = 0] = "start";
    FetchState[FetchState["headers"] = 1] = "headers";
    FetchState[FetchState["headersEnd"] = 2] = "headersEnd";
    FetchState[FetchState["textHeaders"] = 3] = "textHeaders";
    FetchState[FetchState["textBody"] = 4] = "textBody";
    FetchState[FetchState["attachmentHeaders"] = 5] = "attachmentHeaders";
    FetchState[FetchState["attachementBody"] = 6] = "attachementBody";
    FetchState[FetchState["end"] = 7] = "end";
})(FetchState || (FetchState = {}));
/**
 * IMAP specification
 * https://tools.ietf.org/html/rfc1730
 *
 * ID command
 * https://tools.ietf.org/html/rfc2971
 */
function connectImap(callback) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let buf = '';
        const lineSubject = new rxjs_1.Subject();
        let logEnabled = true;
        let cmdIdx = 1;
        const fileWritingState = new rxjs_1.BehaviorSubject(new Set());
        const { fetchMailServer: { user: EMAIL, loginSecret: SECRET, imap: IMAP
        // smtp: SMTP
         } } = __api_1.default.config.get(__api_1.default.packageName);
        const context = {};
        context.waitForReply = waitForReply;
        context.waitForFetch = waitForFetch;
        context.waitForFetchText = waitForFetchText;
        context.findMail = findMail;
        context.fileWritingState = fileWritingState.pipe(operators_1.map(fileSet => {
            // log.warn('writing: ', fileSet.values());
            return fileSet.size > 0;
        }), operators_1.distinctUntilChanged());
        // context.fileWritingState.subscribe(size => {
        //   log.warn('writing files:', size);
        // });
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
                socket.on('data', (data) => _onResponse(data.toString('utf8')));
                return socket;
            });
            // tslint:disable-next-line: no-console
            console.log(yield waitForReply());
            yield waitForReply('ID ("name" "com.tencent.foxmail" "version" "7.2.9.79")');
            yield waitForReply(`LOGIN ${EMAIL} ${SECRET}`);
            yield waitForReply('SELECT INBOX');
            let fromIndx;
            yield waitForReply('SEARCH *', (line) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                if (fromIndx != null)
                    return;
                const m = /\*\s+SEARCH\s+(\d+)?/.exec(line);
                if (m) {
                    fromIndx = parseInt(m[1], 10);
                }
            }));
            context.lastIndex = fromIndx;
            yield callback(context);
            yield waitForReply('LOGOUT');
        }
        catch (ex) {
            try {
                yield waitForReply('LOGOUT');
            }
            catch (er) { }
            if (socket)
                socket.end();
            throw ex;
        }
        socket.end();
        function _onResponse(res) {
            buf += res;
            if (res.indexOf('\n') < 0)
                return;
            const lines = buf.split(/(?:\r\n|\r|\n)/);
            buf = lines[lines.length - 1];
            lines.slice(0, lines.length - 1).forEach(line => _onEachLine(line));
        }
        function _onEachLine(line) {
            if (logEnabled)
                log.debug('  <=', line);
            lineSubject.next(line);
        }
        function waitForFetchText(index) {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                let buf = '';
                yield waitForReply(`FETCH ${index} BODY[1]`, (line) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                    buf += line + '\n';
                }));
                // log.warn(buf);
                return /^\*\s+\d+\s+FETCH\s+\(.*?\{\d+\}([^]*)\)$/m.exec(buf)[1];
            });
        }
        function waitForReply(command, onLine) {
            let tag;
            if (command)
                tag = 'a' + (cmdIdx++);
            let source = lineSubject;
            if (onLine) {
                source = source.pipe(operators_1.concatMap(line => {
                    return rxjs_1.from(onLine(line, tag)).pipe(operators_1.mapTo(line));
                }));
            }
            const prom = source.pipe(operators_1.map(line => {
                const match = /^(\S+)\s+(OK|NO|BAD)(?=(\s|$))/i.exec(line);
                if (match && (!tag || tag === match[1])) {
                    if (match[2] === 'OK' || match[2] === 'NO') {
                        // log.info(`\t${command} replied`);
                        return line.slice(match[0].length);
                    }
                    else {
                        throw new Error(`Reply: ${line}`);
                    }
                }
                else {
                    return null;
                }
            }), operators_1.takeWhile(result => result == null, true), operators_1.takeLast(1)).toPromise();
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
                let state = FetchState.start;
                let headers = {};
                let lastHeaderName;
                let boundary;
                let textBody = '';
                let fileName;
                let fileWriter;
                let attachementFile;
                const originLogEnabled = logEnabled;
                logEnabled = headerOnly;
                yield waitForReply(`FETCH ${mailIdx} RFC822${headerOnly ? '.HEADER' : ''}`, (line) => {
                    switch (state) {
                        case FetchState.start:
                            if (/^\*\s+[0-9]+\s+FETCH\s+/.test(line)) {
                                state = FetchState.headers;
                            }
                            break;
                        case FetchState.headers:
                            if (/^\s/.test(line)) {
                                const items = headers[lastHeaderName];
                                items.push(...line.split(';').map(item => item.trim()).filter(item => item.length > 0));
                                break;
                            }
                            if (line.length === 0) {
                                state = FetchState.headersEnd;
                                const normalizedHeaders = {};
                                Object.keys(headers).forEach(key => normalizedHeaders[key.toLowerCase()] = headers[key]);
                                headers = normalizedHeaders;
                                const contentType = headers['content-type'];
                                if (!contentType) {
                                    throw new Error(`missing Content-Type in headers: ${JSON.stringify(headers, null, '  ')}`);
                                }
                                // https://www.w3.org/Protocols/rfc1341/7_2_Multipart.html
                                if (contentType[0] !== 'multipart/mixed') {
                                    return Promise.resolve('No support for content-type: ' + contentType[0]);
                                }
                                boundary = contentType.find(item => item.startsWith('boundary='));
                                boundary = '--' + /^["']?(.*?)["']?$/.exec(boundary.slice('boundary='.length))[1];
                                break;
                            }
                            const m = /^([^:]+)\:(.*)$/.exec(line);
                            if (m) {
                                headers[m[1]] = m[2].split(';').map(item => item.trim()).filter(item => item.length > 0);
                                lastHeaderName = m[1];
                            }
                            break;
                        case FetchState.headersEnd:
                            if (line === boundary) {
                                state = FetchState.textHeaders;
                            }
                            break;
                        case FetchState.textHeaders:
                            if (line.length === 0)
                                state = FetchState.textBody;
                            break;
                        case FetchState.textBody:
                            if (line === boundary) {
                                textBody = textBody.slice(0, textBody.length - 1);
                                state = FetchState.attachmentHeaders;
                                break;
                            }
                            textBody += line + '\n';
                            break;
                        case FetchState.attachmentHeaders:
                            if (line.length === 0) {
                                state = FetchState.attachementBody;
                                break;
                            }
                            if (!fileName) {
                                const found = /filename=["' ]?([^'" ]+)["' ]?$/.exec(line);
                                if (found)
                                    fileName = found[1];
                            }
                            break;
                        case FetchState.attachementBody:
                            if (line.indexOf(boundary) >= 0) {
                                state = FetchState.end;
                                if (fileWriter) {
                                    fileWriter.end(() => {
                                        log.info('file end done:', attachementFile);
                                        fileWritingState.getValue().delete(attachementFile);
                                        fileWritingState.next(fileWritingState.getValue());
                                    });
                                }
                                break;
                            }
                            if (!fileWriter) {
                                attachementFile = overrideFileName || path_1.default.resolve('dist/' + fileName);
                                fileWriter = fs_extra_1.default.createWriteStream(attachementFile);
                                fileWritingState.getValue().add(attachementFile);
                                fileWritingState.next(fileWritingState.getValue());
                                log.info('Create attachement file: ', attachementFile);
                            }
                            // log.warn('boundary', boundary);
                            // TODO: wait for drained
                            fileWriter.write(Buffer.from(line, 'base64'));
                        default:
                    }
                    return Promise.resolve(0);
                });
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
        // return socket;
    });
}
exports.connectImap = connectImap;
class ImapManager {
    constructor(env) {
        this.env = env;
        this.zipDownloadDir = path_1.default.resolve();
        // checksum: Checksum;
        this.checksumState = new rxjs_1.BehaviorSubject(null);
        this.watching = false;
        this.toFetchAppsState = new rxjs_1.BehaviorSubject([]);
    }
    fetchUpdateCheckSum(appName) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let cs;
            yield connectImap((ctx) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                cs = yield this._fetchChecksum(ctx);
            }));
            log.info('fetched checksum:', cs);
            if (cs.versions[appName] == null) {
                cs.versions[appName] = {
                    version: 0,
                    path: '<see attachement file name>'
                };
            }
            cs.versions[appName].version++;
            this.checksumState.next(cs);
            fs_extra_1.default.mkdirpSync(path_1.default.dirname(fetch_types_1.currChecksumFile));
            const checksumStr = JSON.stringify(cs, null, '  ');
            fs_extra_1.default.writeFileSync(fetch_types_1.currChecksumFile, checksumStr);
            log.info('write %s\n%s', fetch_types_1.currChecksumFile, checksumStr);
            return cs;
        });
    }
    /**
     * Done when files are written
     * @param appName exclude app
     */
    fetchOtherZips(appName) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let appNames = Object.keys(this.checksumState.getValue().versions)
                .filter(app => app !== appName);
            yield connectImap((ctx) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                for (const app of appNames) {
                    log.info('fetch other zip: ' + app);
                    const idx = yield ctx.findMail(ctx.lastIndex, `bkjk-pre-build(${this.env}-${app})`);
                    if (!idx) {
                        log.info(`mail "bkjk-pre-build(${this.env}-${app})" is not Found, skip download zip`);
                        continue;
                    }
                    const reply = ctx.waitForFetch(idx, false, path_1.default.resolve(this.zipDownloadDir, app + '.zip'));
                    yield ctx.fileWritingState.pipe(operators_1.skip(1), operators_1.filter(writing => !writing), operators_1.take(appNames.length)).toPromise();
                    yield reply;
                }
            }));
            return appNames;
        });
    }
    startWatchMail() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this.watching = true;
            while (this.watching) {
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
                yield new Promise(resolve => setTimeout(resolve, 60000)); // 60 sec
            }
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
            return JSON.parse(yield ctx.waitForFetchText(idx));
        });
    }
}
exports.ImapManager = ImapManager;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS1pbWFwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDJDQUE2QztBQUU3QywrQkFBa0U7QUFDbEUsOENBQzRDO0FBQzVDLDZCQUEwRTtBQUMxRSxnRUFBMEI7QUFFMUIsd0RBQXdCO0FBQ3hCLCtDQUErRTtBQUMvRSwwREFBd0I7QUFDeEIsOEJBQThCO0FBQzlCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxvQkFBb0IsQ0FBQyxDQUFDO0FBR2hGLFNBQXNCLFFBQVEsQ0FBQyxPQUFlLEVBQUUsSUFBWSxFQUFFLElBQWE7O1FBQ3pFLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEIsTUFBTSxFQUNKLGVBQWUsRUFBRSxFQUNmLElBQUksRUFBRSxLQUFLLEVBQ1gsV0FBVyxFQUFFLE1BQU07UUFDbkIsY0FBYztRQUNkLElBQUksRUFBRSxJQUFJLEVBQ1gsRUFDRixHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQXlCLENBQUM7UUFFNUQsTUFBTSxXQUFXLEdBQUcsNEJBQWUsQ0FBQztZQUNsQyxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRTtnQkFDSixJQUFJLEVBQUUsT0FBTztnQkFDYixJQUFJLEVBQUUsS0FBSztnQkFDWCxJQUFJLEVBQUUsTUFBTTthQUNiO1lBQ0QsTUFBTSxFQUFFLElBQUk7U0FDWSxDQUFDLENBQUM7UUFFNUIsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN0QixNQUFNLElBQUksR0FBRyxNQUFNLFdBQVcsQ0FBQyxRQUFRLENBQUM7WUFDdEMsSUFBSSxFQUFFLEtBQUs7WUFDWCxFQUFFLEVBQUUsS0FBSztZQUNULE9BQU8sRUFBRSxtQkFB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ZixPQUFPLEVBQUMsUUFBUSxFQUFFLEVBQUUsRUFBQyxDQUFDO2FBQ3ZCO1lBQ0QsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLGdCQUFnQixDQUFDLEdBQUksQ0FBQyxDQUFhLENBQUM7UUFDbEUsQ0FBQztLQUFBO0NBRUY7QUFuSEQsa0NBbUhDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvZmV0Y2gtcmVtb3RlLWltYXAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcmVhdGVUcmFuc3BvcnQgfSBmcm9tICdub2RlbWFpbGVyJztcbmltcG9ydCBTTVRQVHJhbnNwb3J0IGZyb20gJ25vZGVtYWlsZXIvbGliL3NtdHAtdHJhbnNwb3J0JztcbmltcG9ydCB7IFN1YmplY3QsIE9ic2VydmFibGUsIGZyb20sIEJlaGF2aW9yU3ViamVjdCB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgbWFwLCBjb25jYXRNYXAsIHRha2VXaGlsZSwgdGFrZUxhc3QsIG1hcFRvLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCxcbiAgc2tpcCwgZmlsdGVyLCB0YWtlfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBjb25uZWN0IGFzIHRzbENvbm5lY3QsIENvbm5lY3Rpb25PcHRpb25zLCBUTFNTb2NrZXQgfSBmcm9tICd0bHMnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtDaGVja3N1bSwgV2l0aE1haWxTZXJ2ZXJDb25maWcsIGN1cnJDaGVja3N1bUZpbGV9IGZyb20gJy4vZmV0Y2gtdHlwZXMnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG4vLyBpbXBvcnQge1NvY2tldH0gZnJvbSAnbmV0JztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmZldGNoLXJlbW90ZS1pbWFwJyk7XG5cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlbmRNYWlsKHN1YmplY3Q6IHN0cmluZywgdGV4dDogc3RyaW5nLCBmaWxlPzogc3RyaW5nKSB7XG4gIGxvZy5pbmZvKCdsb2dpbicpO1xuICBjb25zdCB7XG4gICAgZmV0Y2hNYWlsU2VydmVyOiB7XG4gICAgICB1c2VyOiBFTUFJTCxcbiAgICAgIGxvZ2luU2VjcmV0OiBTRUNSRVQsXG4gICAgICAvLyBpbWFwOiBJTUFQLFxuICAgICAgc210cDogU01UUFxuICAgIH1cbiAgfSA9IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSkgYXMgV2l0aE1haWxTZXJ2ZXJDb25maWc7XG5cbiAgY29uc3QgdHJhbnNwb3J0ZXIgPSBjcmVhdGVUcmFuc3BvcnQoe1xuICAgIGhvc3Q6IFNNVFAsXG4gICAgYXV0aDoge1xuICAgICAgdHlwZTogJ2xvZ2luJyxcbiAgICAgIHVzZXI6IEVNQUlMLFxuICAgICAgcGFzczogU0VDUkVUXG4gICAgfSxcbiAgICBzZWN1cmU6IHRydWVcbiAgfSBhcyBTTVRQVHJhbnNwb3J0Lk9wdGlvbnMpO1xuXG4gIGxvZy5pbmZvKCdzZW5kIG1haWwnKTtcbiAgY29uc3QgaW5mbyA9IGF3YWl0IHRyYW5zcG9ydGVyLnNlbmRNYWlsKHtcbiAgICBmcm9tOiBFTUFJTCxcbiAgICB0bzogRU1BSUwsXG4gICAgc3ViamVjdDogYGJ1aWxkIGFydGlmYWN0OiAke3N1YmplY3R9YCxcbiAgICB0ZXh0LFxuICAgIGF0dGFjaG1lbnRzOiBmaWxlID8gW1xuICAgICAge1xuICAgICAgICBmaWxlbmFtZTogUGF0aC5iYXNlbmFtZShmaWxlKSxcbiAgICAgICAgcGF0aDogUGF0aC5yZXNvbHZlKGZpbGUpXG4gICAgICB9XG4gICAgXSA6IHVuZGVmaW5lZFxuICB9KTtcblxuICBsb2cuaW5mbyhpbmZvKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJldHJ5U2VuZE1haWwoc3ViamVjdDogc3RyaW5nLCB0ZXh0OiBzdHJpbmcsIGZpbGU/OiBzdHJpbmcpIHtcbiAgbGV0IGVycm9yOiBFcnJvciB8IHVuZGVmaW5lZDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgc2VuZE1haWwoc3ViamVjdCwgdGV4dCwgZmlsZSk7XG4gICAgICBlcnJvciA9IHVuZGVmaW5lZDtcbiAgICAgIGJyZWFrO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgbG9nLmluZm8oJ0dvdCBlcnJvcicsIGVycik7XG4gICAgICBlcnJvciA9IGVycjtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDAwKSk7XG4gICAgfVxuICB9XG4gIGlmIChlcnJvcikge1xuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbmVudW0gRmV0Y2hTdGF0ZSB7XG4gIHN0YXJ0ID0gMCxcbiAgaGVhZGVycyxcbiAgaGVhZGVyc0VuZCxcbiAgdGV4dEhlYWRlcnMsXG4gIHRleHRCb2R5LFxuICBhdHRhY2htZW50SGVhZGVycyxcbiAgYXR0YWNoZW1lbnRCb2R5LFxuICBlbmRcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbWFwRmV0Y2hEYXRhIHtcbiAgaGVhZGVyczoge1trZXk6IHN0cmluZ106IHN0cmluZ1tdIHwgdW5kZWZpbmVkfTtcbiAgdGV4dEJvZHk/OiBzdHJpbmc7XG4gIGZpbGVOYW1lPzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEltYXBDb21tYW5kQ29udGV4dCB7XG4gIC8qKlxuICAgKiBJbmRleCBvZiBsYXRlc3QgbWFpbFxuICAgKi9cbiAgbGFzdEluZGV4OiBudW1iZXI7XG4gIGZpbGVXcml0aW5nU3RhdGU6IE9ic2VydmFibGU8Ym9vbGVhbj47XG4gIHdhaXRGb3JSZXBseShjb21tYW5kPzogc3RyaW5nLCBvbkxpbmU/OiAobGluZTogc3RyaW5nLCB0YWc6IHN0cmluZykgPT4gUHJvbWlzZTxhbnk+KTogUHJvbWlzZTxzdHJpbmd8bnVsbD47XG4gIGZpbmRNYWlsKGZyb21JbmR4OiBudW1iZXIsIHN1YmplY3Q6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyIHwgdW5kZWZpbmVkPjtcbiAgd2FpdEZvckZldGNoKG1haWxJZHg6IHN0cmluZyB8IG51bWJlciwgaGVhZGVyT25seT86IGJvb2xlYW4sIG92ZXJyaWRlRmlsZU5hbWU/OiBzdHJpbmcpOiBQcm9taXNlPEltYXBGZXRjaERhdGE+O1xuICB3YWl0Rm9yRmV0Y2hUZXh0KGluZGV4OiBudW1iZXIpOiBQcm9taXNlPHN0cmluZz47XG59XG5cbi8qKlxuICogSU1BUCBzcGVjaWZpY2F0aW9uXG4gKiBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMTczMFxuICogXG4gKiBJRCBjb21tYW5kXG4gKiBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMjk3MVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY29ubmVjdEltYXAoY2FsbGJhY2s6IChjb250ZXh0OiBJbWFwQ29tbWFuZENvbnRleHQpID0+IFByb21pc2U8YW55Pikge1xuICBsZXQgYnVmID0gJyc7XG4gIGNvbnN0IGxpbmVTdWJqZWN0ID0gbmV3IFN1YmplY3Q8c3RyaW5nPigpO1xuICBsZXQgbG9nRW5hYmxlZCA9IHRydWU7XG4gIGxldCBjbWRJZHggPSAxO1xuICBjb25zdCBmaWxlV3JpdGluZ1N0YXRlID0gbmV3IEJlaGF2aW9yU3ViamVjdDxTZXQ8c3RyaW5nPj4obmV3IFNldDxzdHJpbmc+KCkpO1xuXG4gIGNvbnN0IHtcbiAgICBmZXRjaE1haWxTZXJ2ZXI6IHtcbiAgICAgIHVzZXI6IEVNQUlMLFxuICAgICAgbG9naW5TZWNyZXQ6IFNFQ1JFVCxcbiAgICAgIGltYXA6IElNQVBcbiAgICAgIC8vIHNtdHA6IFNNVFBcbiAgICB9XG4gIH0gPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpIGFzIFdpdGhNYWlsU2VydmVyQ29uZmlnO1xuXG4gIGNvbnN0IGNvbnRleHQ6IHtbayBpbiBrZXlvZiBJbWFwQ29tbWFuZENvbnRleHRdPzogSW1hcENvbW1hbmRDb250ZXh0W2tdfSA9IHt9O1xuXG4gIGNvbnRleHQud2FpdEZvclJlcGx5ID0gd2FpdEZvclJlcGx5O1xuICBjb250ZXh0LndhaXRGb3JGZXRjaCA9IHdhaXRGb3JGZXRjaDtcbiAgY29udGV4dC53YWl0Rm9yRmV0Y2hUZXh0ID0gd2FpdEZvckZldGNoVGV4dDtcbiAgY29udGV4dC5maW5kTWFpbCA9IGZpbmRNYWlsO1xuICBjb250ZXh0LmZpbGVXcml0aW5nU3RhdGUgPSBmaWxlV3JpdGluZ1N0YXRlLnBpcGUoXG4gICAgbWFwKGZpbGVTZXQgPT4ge1xuICAgICAgLy8gbG9nLndhcm4oJ3dyaXRpbmc6ICcsIGZpbGVTZXQudmFsdWVzKCkpO1xuICAgICAgcmV0dXJuIGZpbGVTZXQuc2l6ZSA+IDA7XG4gICAgfSksXG4gICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKVxuICApO1xuXG4gIC8vIGNvbnRleHQuZmlsZVdyaXRpbmdTdGF0ZS5zdWJzY3JpYmUoc2l6ZSA9PiB7XG4gIC8vICAgbG9nLndhcm4oJ3dyaXRpbmcgZmlsZXM6Jywgc2l6ZSk7XG4gIC8vIH0pO1xuXG4gIGxldCBzb2NrZXQ6IFRMU1NvY2tldHx1bmRlZmluZWQ7XG4gIHRyeSB7XG4gICAgc29ja2V0ID0gYXdhaXQgbmV3IFByb21pc2U8UmV0dXJuVHlwZTx0eXBlb2YgdHNsQ29ubmVjdD4+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHNvY2tldCA9IHRzbENvbm5lY3Qoe1xuICAgICAgICBob3N0OiBJTUFQLCBwb3J0OiA5OTMsXG4gICAgICAgIGVuYWJsZVRyYWNlOiB0cnVlXG4gICAgICB9IGFzIENvbm5lY3Rpb25PcHRpb25zKTtcblxuICAgICAgc29ja2V0Lm9uKCdzZWN1cmVDb25uZWN0JywgKCkgPT4ge1xuICAgICAgICBsb2cuaW5mbygnY29ubmVjdGVkJywgc29ja2V0LmF1dGhvcml6ZWQgPyAnYXV0aG9yaXplZCcgOiAndW5hdXRob3JpemVkJyk7XG4gICAgICAgIHJlc29sdmUoc29ja2V0KTtcbiAgICAgIH0pXG4gICAgICAub24oJ2Vycm9yJywgZXJyID0+IHJlamVjdChlcnIpKVxuICAgICAgLm9uKCd0aW1lb3V0JywgKCkgPT4gcmVqZWN0KG5ldyBFcnJvcignVGltZW91dCcpKSk7XG4gICAgICBzb2NrZXQub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PiBfb25SZXNwb25zZShkYXRhLnRvU3RyaW5nKCd1dGY4JykpKTtcblxuICAgICAgcmV0dXJuIHNvY2tldDtcbiAgICB9KTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coYXdhaXQgd2FpdEZvclJlcGx5KCkpO1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseSgnSUQgKFwibmFtZVwiIFwiY29tLnRlbmNlbnQuZm94bWFpbFwiIFwidmVyc2lvblwiIFwiNy4yLjkuNzlcIiknKTtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoYExPR0lOICR7RU1BSUx9ICR7U0VDUkVUfWApO1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseSgnU0VMRUNUIElOQk9YJyk7XG5cbiAgICBsZXQgZnJvbUluZHg6IG51bWJlcjtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoJ1NFQVJDSCAqJywgYXN5bmMgbGluZSA9PiB7XG4gICAgICBpZiAoZnJvbUluZHggIT0gbnVsbClcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY29uc3QgbSA9IC9cXCpcXHMrU0VBUkNIXFxzKyhcXGQrKT8vLmV4ZWMobGluZSk7XG4gICAgICBpZiAobSkge1xuICAgICAgICBmcm9tSW5keCA9IHBhcnNlSW50KG1bMV0sIDEwKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnRleHQubGFzdEluZGV4ID0gZnJvbUluZHghO1xuICAgIGF3YWl0IGNhbGxiYWNrKGNvbnRleHQgYXMgSW1hcENvbW1hbmRDb250ZXh0KTtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoJ0xPR09VVCcpO1xuICB9IGNhdGNoIChleCkge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoJ0xPR09VVCcpO1xuICAgIH0gY2F0Y2ggKGVyKSB7fVxuICAgIGlmIChzb2NrZXQpXG4gICAgICBzb2NrZXQuZW5kKCk7XG4gICAgdGhyb3cgZXg7XG4gIH1cblxuICBzb2NrZXQuZW5kKCk7XG5cbiAgZnVuY3Rpb24gX29uUmVzcG9uc2UocmVzOiBzdHJpbmcpIHtcbiAgICBidWYgKz0gcmVzO1xuICAgIGlmIChyZXMuaW5kZXhPZignXFxuJykgPCAwKVxuICAgICAgcmV0dXJuO1xuICAgIGNvbnN0IGxpbmVzID0gYnVmLnNwbGl0KC8oPzpcXHJcXG58XFxyfFxcbikvKTtcbiAgICBidWYgPSBsaW5lc1tsaW5lcy5sZW5ndGggLSAxXTtcbiAgICBsaW5lcy5zbGljZSgwLCBsaW5lcy5sZW5ndGggLSAxKS5mb3JFYWNoKGxpbmUgPT4gX29uRWFjaExpbmUobGluZSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gX29uRWFjaExpbmUobGluZTogc3RyaW5nKSB7XG4gICAgaWYgKGxvZ0VuYWJsZWQpXG4gICAgICBsb2cuZGVidWcoJyAgPD0nLCBsaW5lKTtcbiAgICBsaW5lU3ViamVjdC5uZXh0KGxpbmUpO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gd2FpdEZvckZldGNoVGV4dChpbmRleDogbnVtYmVyKSB7XG4gICAgbGV0IGJ1ZiA9ICcnO1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseShgRkVUQ0ggJHtpbmRleH0gQk9EWVsxXWAsIGFzeW5jIGxpbmUgPT4ge1xuICAgICAgYnVmICs9IGxpbmUgKyAnXFxuJztcbiAgICB9KTtcbiAgICAvLyBsb2cud2FybihidWYpO1xuICAgIHJldHVybiAvXlxcKlxccytcXGQrXFxzK0ZFVENIXFxzK1xcKC4qP1xce1xcZCtcXH0oW15dKilcXCkkL20uZXhlYyhidWYpIVsxXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHdhaXRGb3JSZXBseShjb21tYW5kPzogc3RyaW5nLCBvbkxpbmU/OiAobGluZTogc3RyaW5nLCB0YWc6IHN0cmluZykgPT4gUHJvbWlzZTxhbnk+KSB7XG4gICAgbGV0IHRhZzogc3RyaW5nO1xuICAgIGlmIChjb21tYW5kKVxuICAgICAgdGFnID0gJ2EnICsgKGNtZElkeCsrKTtcblxuICAgIGxldCBzb3VyY2U6IE9ic2VydmFibGU8c3RyaW5nPiA9IGxpbmVTdWJqZWN0O1xuICAgIGlmIChvbkxpbmUpIHtcbiAgICAgIHNvdXJjZSA9IHNvdXJjZS5waXBlKFxuICAgICAgICBjb25jYXRNYXAobGluZSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGZyb20ob25MaW5lKGxpbmUsIHRhZykpLnBpcGUobWFwVG8obGluZSkpO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9XG4gICAgY29uc3QgcHJvbSA9IHNvdXJjZS5waXBlKFxuICAgICAgbWFwKGxpbmUgPT4ge1xuICAgICAgICBjb25zdCBtYXRjaCA9IC9eKFxcUyspXFxzKyhPS3xOT3xCQUQpKD89KFxcc3wkKSkvaS5leGVjKGxpbmUpO1xuICAgICAgICBpZiAobWF0Y2ggJiYgKCF0YWcgfHwgdGFnID09PSBtYXRjaFsxXSkpIHtcbiAgICAgICAgICBpZiAobWF0Y2hbMl0gPT09ICdPSycgfHwgbWF0Y2hbMl0gPT09ICdOTycpIHtcbiAgICAgICAgICAgIC8vIGxvZy5pbmZvKGBcXHQke2NvbW1hbmR9IHJlcGxpZWRgKTtcbiAgICAgICAgICAgIHJldHVybiBsaW5lLnNsaWNlKG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUmVwbHk6ICR7bGluZX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgdGFrZVdoaWxlKHJlc3VsdCA9PiByZXN1bHQgPT0gbnVsbCwgdHJ1ZSksXG4gICAgICB0YWtlTGFzdCgxKVxuICAgICkudG9Qcm9taXNlKCk7XG5cbiAgICBpZiAoY29tbWFuZCkge1xuICAgICAgY29uc3QgY21kID0gdGFnISArICcgJyArIGNvbW1hbmQ7XG4gICAgICBpZiAoc29ja2V0KVxuICAgICAgICBzb2NrZXQud3JpdGUoQnVmZmVyLmZyb20oYCR7dGFnIX0gJHtjb21tYW5kfVxcclxcbmAsICd1dGY4JykpO1xuICAgICAgbG9nLmRlYnVnKCc9PicsIGNtZCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb207XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiB3YWl0Rm9yRmV0Y2gobWFpbElkeDogc3RyaW5nIHwgbnVtYmVyID0gJyonLCBoZWFkZXJPbmx5ID0gdHJ1ZSwgb3ZlcnJpZGVGaWxlTmFtZT86IHN0cmluZyk6IFByb21pc2U8SW1hcEZldGNoRGF0YT4ge1xuICAgIGxldCBzdGF0ZTogRmV0Y2hTdGF0ZSA9IEZldGNoU3RhdGUuc3RhcnQ7XG4gICAgbGV0IGhlYWRlcnM6IHtcbiAgICAgIHN1YmplY3Q/OiBzdHJpbmdbXTtcbiAgICAgICdjb250ZW50LXR5cGUnPzogc3RyaW5nW107XG4gICAgICBba2V5OiBzdHJpbmddOiBzdHJpbmdbXSB8IHVuZGVmaW5lZDtcbiAgICB9ID0ge307XG4gICAgbGV0IGxhc3RIZWFkZXJOYW1lOiBzdHJpbmc7XG4gICAgbGV0IGJvdW5kYXJ5OiBzdHJpbmc7XG4gICAgbGV0IHRleHRCb2R5OiBzdHJpbmcgPSAnJztcbiAgICBsZXQgZmlsZU5hbWU6IHN0cmluZztcbiAgICBsZXQgZmlsZVdyaXRlcjogZnMuV3JpdGVTdHJlYW07XG4gICAgbGV0IGF0dGFjaGVtZW50RmlsZTogc3RyaW5nO1xuXG4gICAgY29uc3Qgb3JpZ2luTG9nRW5hYmxlZCA9IGxvZ0VuYWJsZWQ7XG4gICAgbG9nRW5hYmxlZCA9IGhlYWRlck9ubHk7XG4gICAgYXdhaXQgd2FpdEZvclJlcGx5KGBGRVRDSCAke21haWxJZHh9IFJGQzgyMiR7aGVhZGVyT25seSA/ICcuSEVBREVSJyA6ICcnfWAsIChsaW5lKSA9PiB7XG4gICAgICBzd2l0Y2ggKHN0YXRlKSB7XG4gICAgICAgIGNhc2UgRmV0Y2hTdGF0ZS5zdGFydDpcbiAgICAgICAgICBpZiAoL15cXCpcXHMrWzAtOV0rXFxzK0ZFVENIXFxzKy8udGVzdChsaW5lKSkge1xuICAgICAgICAgICAgc3RhdGUgPSBGZXRjaFN0YXRlLmhlYWRlcnM7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEZldGNoU3RhdGUuaGVhZGVyczpcbiAgICAgICAgICBpZiAoL15cXHMvLnRlc3QobGluZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gaGVhZGVyc1tsYXN0SGVhZGVyTmFtZV0hO1xuICAgICAgICAgICAgaXRlbXMucHVzaCguLi5saW5lLnNwbGl0KCc7JykubWFwKGl0ZW0gPT4gaXRlbS50cmltKCkpLmZpbHRlcihpdGVtID0+IGl0ZW0ubGVuZ3RoID4gMCkpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChsaW5lLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgc3RhdGUgPSBGZXRjaFN0YXRlLmhlYWRlcnNFbmQ7XG5cbiAgICAgICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRIZWFkZXJzOiB0eXBlb2YgaGVhZGVycyA9IHt9O1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoaGVhZGVycykuZm9yRWFjaChrZXkgPT4gbm9ybWFsaXplZEhlYWRlcnNba2V5LnRvTG93ZXJDYXNlKCldID0gaGVhZGVyc1trZXldKTtcbiAgICAgICAgICAgIGhlYWRlcnMgPSBub3JtYWxpemVkSGVhZGVycztcblxuICAgICAgICAgICAgY29uc3QgY29udGVudFR5cGUgPSBoZWFkZXJzWydjb250ZW50LXR5cGUnXTtcbiAgICAgICAgICAgIGlmICghY29udGVudFR5cGUpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIENvbnRlbnQtVHlwZSBpbiBoZWFkZXJzOiAke0pTT04uc3RyaW5naWZ5KGhlYWRlcnMsIG51bGwsICcgICcpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gaHR0cHM6Ly93d3cudzMub3JnL1Byb3RvY29scy9yZmMxMzQxLzdfMl9NdWx0aXBhcnQuaHRtbFxuICAgICAgICAgICAgaWYgKGNvbnRlbnRUeXBlWzBdICE9PSAnbXVsdGlwYXJ0L21peGVkJykge1xuICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCdObyBzdXBwb3J0IGZvciBjb250ZW50LXR5cGU6ICcgKyBjb250ZW50VHlwZVswXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBib3VuZGFyeSA9IGNvbnRlbnRUeXBlLmZpbmQoaXRlbSA9PiBpdGVtLnN0YXJ0c1dpdGgoJ2JvdW5kYXJ5PScpKSE7XG4gICAgICAgICAgICBib3VuZGFyeSA9ICctLScgKyAvXltcIiddPyguKj8pW1wiJ10/JC8uZXhlYyhib3VuZGFyeS5zbGljZSgnYm91bmRhcnk9Jy5sZW5ndGgpKSFbMV07XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgbSA9IC9eKFteOl0rKVxcOiguKikkLy5leGVjKGxpbmUpO1xuICAgICAgICAgIGlmIChtKSB7XG4gICAgICAgICAgICBoZWFkZXJzW21bMV1dID0gbVsyXS5zcGxpdCgnOycpLm1hcChpdGVtID0+IGl0ZW0udHJpbSgpKS5maWx0ZXIoaXRlbSA9PiBpdGVtLmxlbmd0aCA+IDApO1xuICAgICAgICAgICAgbGFzdEhlYWRlck5hbWUgPSBtWzFdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBGZXRjaFN0YXRlLmhlYWRlcnNFbmQ6XG4gICAgICAgICAgaWYgKGxpbmUgPT09IGJvdW5kYXJ5KSB7XG4gICAgICAgICAgICBzdGF0ZSA9IEZldGNoU3RhdGUudGV4dEhlYWRlcnM7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEZldGNoU3RhdGUudGV4dEhlYWRlcnM6XG4gICAgICAgICAgaWYgKGxpbmUubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgc3RhdGUgPSBGZXRjaFN0YXRlLnRleHRCb2R5O1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEZldGNoU3RhdGUudGV4dEJvZHk6XG4gICAgICAgICAgaWYgKGxpbmUgPT09IGJvdW5kYXJ5KSB7XG4gICAgICAgICAgICB0ZXh0Qm9keSA9IHRleHRCb2R5LnNsaWNlKDAsIHRleHRCb2R5Lmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgc3RhdGUgPSBGZXRjaFN0YXRlLmF0dGFjaG1lbnRIZWFkZXJzO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRleHRCb2R5ICs9IGxpbmUgKyAnXFxuJztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBGZXRjaFN0YXRlLmF0dGFjaG1lbnRIZWFkZXJzOlxuICAgICAgICAgIGlmIChsaW5lLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgc3RhdGUgPSBGZXRjaFN0YXRlLmF0dGFjaGVtZW50Qm9keTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWZpbGVOYW1lKSB7XG4gICAgICAgICAgICBjb25zdCBmb3VuZCA9IC9maWxlbmFtZT1bXCInIF0/KFteJ1wiIF0rKVtcIicgXT8kLy5leGVjKGxpbmUpO1xuICAgICAgICAgICAgaWYgKGZvdW5kKVxuICAgICAgICAgICAgICBmaWxlTmFtZSA9IGZvdW5kWzFdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBGZXRjaFN0YXRlLmF0dGFjaGVtZW50Qm9keTpcbiAgICAgICAgICBpZiAobGluZS5pbmRleE9mKGJvdW5kYXJ5KSA+PTAgKSB7XG4gICAgICAgICAgICBzdGF0ZSA9IEZldGNoU3RhdGUuZW5kO1xuICAgICAgICAgICAgaWYgKGZpbGVXcml0ZXIpIHtcbiAgICAgICAgICAgICAgZmlsZVdyaXRlci5lbmQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGxvZy5pbmZvKCdmaWxlIGVuZCBkb25lOicsIGF0dGFjaGVtZW50RmlsZSk7XG4gICAgICAgICAgICAgICAgZmlsZVdyaXRpbmdTdGF0ZS5nZXRWYWx1ZSgpLmRlbGV0ZShhdHRhY2hlbWVudEZpbGUpO1xuICAgICAgICAgICAgICAgIGZpbGVXcml0aW5nU3RhdGUubmV4dChmaWxlV3JpdGluZ1N0YXRlLmdldFZhbHVlKCkpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWZpbGVXcml0ZXIpIHtcbiAgICAgICAgICAgIGF0dGFjaGVtZW50RmlsZSA9IG92ZXJyaWRlRmlsZU5hbWUgfHwgUGF0aC5yZXNvbHZlKCdkaXN0LycgKyBmaWxlTmFtZSk7XG4gICAgICAgICAgICBmaWxlV3JpdGVyID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0oYXR0YWNoZW1lbnRGaWxlKTtcbiAgICAgICAgICAgIGZpbGVXcml0aW5nU3RhdGUuZ2V0VmFsdWUoKS5hZGQoYXR0YWNoZW1lbnRGaWxlKTtcbiAgICAgICAgICAgIGZpbGVXcml0aW5nU3RhdGUubmV4dChmaWxlV3JpdGluZ1N0YXRlLmdldFZhbHVlKCkpO1xuICAgICAgICAgICAgbG9nLmluZm8oJ0NyZWF0ZSBhdHRhY2hlbWVudCBmaWxlOiAnLCBhdHRhY2hlbWVudEZpbGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBsb2cud2FybignYm91bmRhcnknLCBib3VuZGFyeSk7XG4gICAgICAgICAgLy8gVE9ETzogd2FpdCBmb3IgZHJhaW5lZFxuICAgICAgICAgIGZpbGVXcml0ZXIud3JpdGUoQnVmZmVyLmZyb20obGluZSwgJ2Jhc2U2NCcpKTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgIH1cbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoMCk7XG4gICAgfSk7XG4gICAgbG9nRW5hYmxlZCA9IG9yaWdpbkxvZ0VuYWJsZWQ7XG5cbiAgICByZXR1cm4ge1xuICAgICAgaGVhZGVycyxcbiAgICAgIHRleHRCb2R5LFxuICAgICAgZmlsZU5hbWU6IGZpbGVOYW1lIVxuICAgIH07XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBmaW5kTWFpbChmcm9tSW5keDogbnVtYmVyLCBzdWJqZWN0OiBzdHJpbmcpOiBQcm9taXNlPG51bWJlciB8IHVuZGVmaW5lZD4ge1xuICAgIGxvZy5pbmZvKCdmaW5kTWFpbCcsIGZyb21JbmR4LCBzdWJqZWN0KTtcbiAgICB3aGlsZSAoZnJvbUluZHggPiAwKSB7XG4gICAgICBjb25zdCByZXMgPSBhd2FpdCB3YWl0Rm9yRmV0Y2goZnJvbUluZHgpO1xuICAgICAgaWYgKHJlcy5oZWFkZXJzLnN1YmplY3QgJiYgcmVzLmhlYWRlcnMuc3ViamVjdFswXS5pbmRleE9mKHN1YmplY3QpID49IDApXG4gICAgICAgIHJldHVybiBmcm9tSW5keDtcbiAgICAgIGZyb21JbmR4LS07XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyByZXR1cm4gc29ja2V0O1xufVxuXG5leHBvcnQgY2xhc3MgSW1hcE1hbmFnZXIge1xuICB6aXBEb3dubG9hZERpciA9IFBhdGgucmVzb2x2ZSgpO1xuICAvLyBjaGVja3N1bTogQ2hlY2tzdW07XG4gIGNoZWNrc3VtU3RhdGUgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PENoZWNrc3VtIHwgbnVsbD4obnVsbCk7XG4gIGZpbGVXcml0aW5nU3RhdGU6IEltYXBDb21tYW5kQ29udGV4dFsnZmlsZVdyaXRpbmdTdGF0ZSddO1xuICB3YXRjaGluZyA9IGZhbHNlO1xuICBwcml2YXRlIHRvRmV0Y2hBcHBzU3RhdGUgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PHN0cmluZ1tdPihbXSk7XG4gIC8vIHByaXZhdGUgaW1hcEFjdGlvbnMgPSBuZXcgU3ViamVjdDwoY3R4OiBJbWFwQ29tbWFuZENvbnRleHQpID0+IFByb21pc2U8YW55Pj4oKTtcblxuICBwcml2YXRlIGN0eDogSW1hcENvbW1hbmRDb250ZXh0O1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBlbnY6IHN0cmluZykge31cblxuICBhc3luYyBmZXRjaFVwZGF0ZUNoZWNrU3VtKGFwcE5hbWU6IHN0cmluZyk6IFByb21pc2U8Q2hlY2tzdW0+IHtcbiAgICBsZXQgY3M6IENoZWNrc3VtIHwgdW5kZWZpbmVkO1xuICAgIGF3YWl0IGNvbm5lY3RJbWFwKGFzeW5jIGN0eCA9PiB7XG4gICAgICBjcyA9IGF3YWl0IHRoaXMuX2ZldGNoQ2hlY2tzdW0oY3R4KTtcbiAgICB9KTtcbiAgICBsb2cuaW5mbygnZmV0Y2hlZCBjaGVja3N1bTonLCBjcyk7XG4gICAgaWYgKGNzIS52ZXJzaW9ucyFbYXBwTmFtZV0gPT0gbnVsbCkge1xuICAgICAgY3MhLnZlcnNpb25zIVthcHBOYW1lXSA9IHtcbiAgICAgICAgdmVyc2lvbjogMCxcbiAgICAgICAgcGF0aDogJzxzZWUgYXR0YWNoZW1lbnQgZmlsZSBuYW1lPidcbiAgICAgIH07XG4gICAgfVxuICAgIGNzIS52ZXJzaW9ucyFbYXBwTmFtZV0udmVyc2lvbisrO1xuICAgIHRoaXMuY2hlY2tzdW1TdGF0ZS5uZXh0KGNzISk7XG4gICAgZnMubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUoY3VyckNoZWNrc3VtRmlsZSkpO1xuICAgIGNvbnN0IGNoZWNrc3VtU3RyID0gSlNPTi5zdHJpbmdpZnkoY3MhLCBudWxsLCAnICAnKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKGN1cnJDaGVja3N1bUZpbGUsIGNoZWNrc3VtU3RyKTtcbiAgICBsb2cuaW5mbygnd3JpdGUgJXNcXG4lcycsIGN1cnJDaGVja3N1bUZpbGUsIGNoZWNrc3VtU3RyKTtcbiAgICByZXR1cm4gY3MhO1xuICB9XG5cbiAgLyoqXG4gICAqIERvbmUgd2hlbiBmaWxlcyBhcmUgd3JpdHRlblxuICAgKiBAcGFyYW0gYXBwTmFtZSBleGNsdWRlIGFwcFxuICAgKi9cbiAgYXN5bmMgZmV0Y2hPdGhlclppcHMoYXBwTmFtZTogc3RyaW5nKSB7XG4gICAgbGV0IGFwcE5hbWVzID0gT2JqZWN0LmtleXModGhpcy5jaGVja3N1bVN0YXRlLmdldFZhbHVlKCkhLnZlcnNpb25zISlcbiAgICAuZmlsdGVyKGFwcCA9PiBhcHAgIT09IGFwcE5hbWUpO1xuICAgIGF3YWl0IGNvbm5lY3RJbWFwKGFzeW5jIGN0eCA9PiB7XG4gICAgICBmb3IgKGNvbnN0IGFwcCBvZiBhcHBOYW1lcykge1xuICAgICAgICBsb2cuaW5mbygnZmV0Y2ggb3RoZXIgemlwOiAnICsgYXBwKTtcbiAgICAgICAgY29uc3QgaWR4ID0gYXdhaXQgY3R4LmZpbmRNYWlsKGN0eC5sYXN0SW5kZXgsIGBia2prLXByZS1idWlsZCgke3RoaXMuZW52fS0ke2FwcH0pYCk7XG4gICAgICAgIGlmICghaWR4KSB7XG4gICAgICAgICAgbG9nLmluZm8oYG1haWwgXCJia2prLXByZS1idWlsZCgke3RoaXMuZW52fS0ke2FwcH0pXCIgaXMgbm90IEZvdW5kLCBza2lwIGRvd25sb2FkIHppcGApO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlcGx5ID0gY3R4LndhaXRGb3JGZXRjaChpZHgsIGZhbHNlLCBQYXRoLnJlc29sdmUodGhpcy56aXBEb3dubG9hZERpciwgYXBwICsgJy56aXAnKSk7XG4gICAgICAgIGF3YWl0IGN0eC5maWxlV3JpdGluZ1N0YXRlLnBpcGUoXG4gICAgICAgICAgc2tpcCgxKSxcbiAgICAgICAgICBmaWx0ZXIod3JpdGluZyA9PiAhd3JpdGluZyksXG4gICAgICAgICAgdGFrZShhcHBOYW1lcy5sZW5ndGgpXG4gICAgICAgICkudG9Qcm9taXNlKCk7XG4gICAgICAgIGF3YWl0IHJlcGx5O1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBhcHBOYW1lcztcbiAgfVxuXG4gIGFzeW5jIHN0YXJ0V2F0Y2hNYWlsKCkge1xuICAgIHRoaXMud2F0Y2hpbmcgPSB0cnVlO1xuICAgIHdoaWxlICh0aGlzLndhdGNoaW5nKSB7XG4gICAgICBhd2FpdCBjb25uZWN0SW1hcChhc3luYyBjdHggPT4ge1xuICAgICAgICB0aGlzLmN0eCA9IGN0eDtcbiAgICAgICAgdGhpcy5maWxlV3JpdGluZ1N0YXRlID0gY3R4LmZpbGVXcml0aW5nU3RhdGU7XG5cbiAgICAgICAgY29uc3QgY3MgPSBhd2FpdCB0aGlzLl9mZXRjaENoZWNrc3VtKGN0eCk7XG4gICAgICAgIHRoaXMuY2hlY2tzdW1TdGF0ZS5uZXh0KGNzISk7XG5cbiAgICAgICAgY29uc3QgdG9GZXRjaEFwcHMgPSB0aGlzLnRvRmV0Y2hBcHBzU3RhdGUuZ2V0VmFsdWUoKTtcbiAgICAgICAgaWYgKHRvRmV0Y2hBcHBzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB0aGlzLnRvRmV0Y2hBcHBzU3RhdGUubmV4dChbXSk7XG4gICAgICAgICAgZm9yIChjb25zdCBhcHBOYW1lIG9mIHRvRmV0Y2hBcHBzKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmZldGNoQXR0YWNobWVudChhcHBOYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gYXdhaXQgY3R4LndhaXRGb3JSZXBseSgnU1VCU0NSSUJFIElOQk9YJyk7XG4gICAgICAgIC8vIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAzMDAwMCkpOyAvLyAzMCBzZWNcbiAgICAgICAgZGVsZXRlIHRoaXMuY3R4O1xuICAgICAgfSk7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNjAwMDApKTsgLy8gNjAgc2VjXG4gICAgfVxuICB9XG5cbiAgZmV0Y2hBcHBEdXJpbmdXYXRjaEFjdGlvbiguLi5hcHBOYW1lczogc3RyaW5nW10pIHtcbiAgICB0aGlzLnRvRmV0Y2hBcHBzU3RhdGUubmV4dChhcHBOYW1lcyk7XG4gIH1cblxuICBhc3luYyBzZW5kRmlsZUFuZFVwZGF0ZWRDaGVja3N1bShhcHBOYW1lOiBzdHJpbmcsIGZpbGU6IHN0cmluZykge1xuICAgIGNvbnN0IGNzID0gYXdhaXQgdGhpcy5mZXRjaFVwZGF0ZUNoZWNrU3VtKGFwcE5hbWUpO1xuICAgIGF3YWl0IHJldHJ5U2VuZE1haWwoYGJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LSR7YXBwTmFtZX0pYCwgSlNPTi5zdHJpbmdpZnkoY3MsIG51bGwsICcgICcpLCBmaWxlKTtcbiAgfVxuXG4gIHN0b3BXYXRjaCgpIHtcbiAgICB0aGlzLndhdGNoaW5nID0gZmFsc2U7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGZldGNoQXR0YWNobWVudChhcHA6IHN0cmluZykge1xuICAgIGNvbnN0IGlkeCA9IGF3YWl0IHRoaXMuY3R4LmZpbmRNYWlsKHRoaXMuY3R4Lmxhc3RJbmRleCwgYGJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LSR7YXBwfSlgKTtcbiAgICBpZiAoaWR4ID09IG51bGwpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbnQgZmluZCBtYWlsOiAnICsgYGJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LSR7YXBwfSlgKTtcbiAgICBhd2FpdCB0aGlzLmN0eC53YWl0Rm9yRmV0Y2goaWR4ISwgZmFsc2UsIFBhdGgucmVzb2x2ZSh0aGlzLnppcERvd25sb2FkRGlyLCBgJHthcHB9LnppcGApKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgX2ZldGNoQ2hlY2tzdW0oY3R4OiBJbWFwQ29tbWFuZENvbnRleHQpIHtcbiAgICBjb25zdCBpZHggPSBhd2FpdCBjdHguZmluZE1haWwoY3R4Lmxhc3RJbmRleCwgYGJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LWApO1xuICAgIGxvZy5pbmZvKCdfZmV0Y2hDaGVja3N1bSwgaW5kZXg6JywgaWR4KTtcbiAgICBpZiAoaWR4ID09IG51bGwpIHtcbiAgICAgIHJldHVybiB7dmVyc2lvbnM6IHt9fTtcbiAgICB9XG4gICAgcmV0dXJuIEpTT04ucGFyc2UoYXdhaXQgY3R4LndhaXRGb3JGZXRjaFRleHQoaWR4ISkpIGFzIENoZWNrc3VtO1xuICB9XG5cbn1cbiJdfQ==
