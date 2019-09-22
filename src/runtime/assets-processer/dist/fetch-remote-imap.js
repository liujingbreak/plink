"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const nodemailer_1 = require("nodemailer");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const tls_1 = require("tls");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
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
                                fs_extra_1.default.mkdirpSync(path_1.default.dirname(attachementFile));
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
     * @param appName exclude app
     */
    fetchOtherZips(appName) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let appNames = Object.keys(this.checksumState.getValue().versions)
                .filter(app => app !== appName);
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
            return JSON.parse(yield ctx.waitForFetchText(idx));
        });
    }
}
exports.ImapManager = ImapManager;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS1pbWFwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDJDQUE2QztBQUU3QywrQkFBa0U7QUFDbEUsOENBQzRDO0FBQzVDLDZCQUEwRTtBQUMxRSxnRUFBMEI7QUFFMUIsd0RBQXdCO0FBRXhCLDBEQUF3QjtBQUN4Qiw4QkFBOEI7QUFDOUIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLG9CQUFvQixDQUFDLENBQUM7QUFFaEYsTUFBTSxPQUFPLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBeUIsQ0FBQztBQUN4RSxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBRzVFLE1BQU0sZ0JBQWdCLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEdBQUcsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDO0FBRXpHLFNBQXNCLFFBQVEsQ0FBQyxPQUFlLEVBQUUsSUFBWSxFQUFFLElBQWE7O1FBQ3pFLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUU7WUFDNUIsR0FBRyxDQUFDLElBQUksQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO1lBQzdELE9BQU87U0FDUjtRQUNELE1BQU0sRUFDSixJQUFJLEVBQUUsS0FBSyxFQUNYLFdBQVcsRUFBRSxNQUFNO1FBQ25CLGNBQWM7UUFDZCxJQUFJLEVBQUUsSUFBSSxFQUNYLEdB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LEVBQUUsRUFBQyxDQUFDO2FBQ3ZCO1lBQ0QsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLGdCQUFnQixDQUFDLEdBQUksQ0FBQyxDQUFhLENBQUM7UUFDbEUsQ0FBQztLQUFBO0NBRUY7QUF2SUQsa0NBdUlDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvZmV0Y2gtcmVtb3RlLWltYXAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcmVhdGVUcmFuc3BvcnQgfSBmcm9tICdub2RlbWFpbGVyJztcbmltcG9ydCBTTVRQVHJhbnNwb3J0IGZyb20gJ25vZGVtYWlsZXIvbGliL3NtdHAtdHJhbnNwb3J0JztcbmltcG9ydCB7IFN1YmplY3QsIE9ic2VydmFibGUsIGZyb20sIEJlaGF2aW9yU3ViamVjdCB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgbWFwLCBjb25jYXRNYXAsIHRha2VXaGlsZSwgdGFrZUxhc3QsIG1hcFRvLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCxcbiAgc2tpcCwgZmlsdGVyLCB0YWtlfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBjb25uZWN0IGFzIHRzbENvbm5lY3QsIENvbm5lY3Rpb25PcHRpb25zLCBUTFNTb2NrZXQgfSBmcm9tICd0bHMnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtDaGVja3N1bSwgV2l0aE1haWxTZXJ2ZXJDb25maWd9IGZyb20gJy4vZmV0Y2gtdHlwZXMnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG4vLyBpbXBvcnQge1NvY2tldH0gZnJvbSAnbmV0JztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmZldGNoLXJlbW90ZS1pbWFwJyk7XG5cbmNvbnN0IHNldHRpbmcgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpIGFzIFdpdGhNYWlsU2VydmVyQ29uZmlnO1xuY29uc3QgZW52ID0gc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIgPyBzZXR0aW5nLmZldGNoTWFpbFNlcnZlci5lbnYgOiAnbG9jYWwnO1xuXG5cbmNvbnN0IGN1cnJDaGVja3N1bUZpbGUgPSBQYXRoLnJlc29sdmUoJ2NoZWNrc3VtLicgKyAoc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIgPyBlbnYgOiAnbG9jYWwnKSArICcuanNvbicpO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VuZE1haWwoc3ViamVjdDogc3RyaW5nLCB0ZXh0OiBzdHJpbmcsIGZpbGU/OiBzdHJpbmcpIHtcbiAgbG9nLmluZm8oJ2xvZ2luJyk7XG4gIGlmICghc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIpIHtcbiAgICBsb2cud2FybignZmV0Y2hNYWlsU2VydmVyIGlzIG5vdCBjb25maWd1cmVkISBTa2lwIHNlbmRNYWlsJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHtcbiAgICB1c2VyOiBFTUFJTCxcbiAgICBsb2dpblNlY3JldDogU0VDUkVULFxuICAgIC8vIGltYXA6IElNQVAsXG4gICAgc210cDogU01UUFxuICB9ID0gc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXI7XG5cbiAgY29uc3QgdHJhbnNwb3J0ZXIgPSBjcmVhdGVUcmFuc3BvcnQoe1xuICAgIGhvc3Q6IFNNVFAsXG4gICAgYXV0aDoge1xuICAgICAgdHlwZTogJ2xvZ2luJyxcbiAgICAgIHVzZXI6IEVNQUlMLFxuICAgICAgcGFzczogU0VDUkVUXG4gICAgfSxcbiAgICBzZWN1cmU6IHRydWVcbiAgfSBhcyBTTVRQVHJhbnNwb3J0Lk9wdGlvbnMpO1xuXG4gIGxvZy5pbmZvKCdzZW5kIG1haWwnKTtcbiAgY29uc3QgaW5mbyA9IGF3YWl0IHRyYW5zcG9ydGVyLnNlbmRNYWlsKHtcbiAgICBmcm9tOiBFTUFJTCxcbiAgICB0bzogRU1BSUwsXG4gICAgc3ViamVjdDogYGJ1aWxkIGFydGlmYWN0OiAke3N1YmplY3R9YCxcbiAgICB0ZXh0LFxuICAgIGF0dGFjaG1lbnRzOiBmaWxlID8gW1xuICAgICAge1xuICAgICAgICBmaWxlbmFtZTogUGF0aC5iYXNlbmFtZShmaWxlKSxcbiAgICAgICAgcGF0aDogUGF0aC5yZXNvbHZlKGZpbGUpXG4gICAgICB9XG4gICAgXSA6IHVuZGVmaW5lZFxuICB9KTtcblxuICBsb2cuaW5mbyhpbmZvKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJldHJ5U2VuZE1haWwoc3ViamVjdDogc3RyaW5nLCB0ZXh0OiBzdHJpbmcsIGZpbGU/OiBzdHJpbmcpIHtcbiAgbGV0IGVycm9yOiBFcnJvciB8IHVuZGVmaW5lZDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgc2VuZE1haWwoc3ViamVjdCwgdGV4dCwgZmlsZSk7XG4gICAgICBlcnJvciA9IHVuZGVmaW5lZDtcbiAgICAgIGJyZWFrO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgbG9nLmluZm8oJ0dvdCBlcnJvcicsIGVycik7XG4gICAgICBlcnJvciA9IGVycjtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDAwKSk7XG4gICAgfVxuICB9XG4gIGlmIChlcnJvcikge1xuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbmVudW0gRmV0Y2hTdGF0ZSB7XG4gIHN0YXJ0ID0gMCxcbiAgaGVhZGVycyxcbiAgaGVhZGVyc0VuZCxcbiAgdGV4dEhlYWRlcnMsXG4gIHRleHRCb2R5LFxuICBhdHRhY2htZW50SGVhZGVycyxcbiAgYXR0YWNoZW1lbnRCb2R5LFxuICBlbmRcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbWFwRmV0Y2hEYXRhIHtcbiAgaGVhZGVyczoge1trZXk6IHN0cmluZ106IHN0cmluZ1tdIHwgdW5kZWZpbmVkfTtcbiAgdGV4dEJvZHk/OiBzdHJpbmc7XG4gIGZpbGVOYW1lPzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEltYXBDb21tYW5kQ29udGV4dCB7XG4gIC8qKlxuICAgKiBJbmRleCBvZiBsYXRlc3QgbWFpbFxuICAgKi9cbiAgbGFzdEluZGV4OiBudW1iZXI7XG4gIGZpbGVXcml0aW5nU3RhdGU6IE9ic2VydmFibGU8Ym9vbGVhbj47XG4gIHdhaXRGb3JSZXBseShjb21tYW5kPzogc3RyaW5nLCBvbkxpbmU/OiAobGluZTogc3RyaW5nLCB0YWc6IHN0cmluZykgPT4gUHJvbWlzZTxhbnk+KTogUHJvbWlzZTxzdHJpbmd8bnVsbD47XG4gIGZpbmRNYWlsKGZyb21JbmR4OiBudW1iZXIsIHN1YmplY3Q6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyIHwgdW5kZWZpbmVkPjtcbiAgd2FpdEZvckZldGNoKG1haWxJZHg6IHN0cmluZyB8IG51bWJlciwgaGVhZGVyT25seT86IGJvb2xlYW4sIG92ZXJyaWRlRmlsZU5hbWU/OiBzdHJpbmcpOiBQcm9taXNlPEltYXBGZXRjaERhdGE+O1xuICB3YWl0Rm9yRmV0Y2hUZXh0KGluZGV4OiBudW1iZXIpOiBQcm9taXNlPHN0cmluZz47XG59XG5cbi8qKlxuICogSU1BUCBzcGVjaWZpY2F0aW9uXG4gKiBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMTczMFxuICogXG4gKiBJRCBjb21tYW5kXG4gKiBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMjk3MVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY29ubmVjdEltYXAoY2FsbGJhY2s6IChjb250ZXh0OiBJbWFwQ29tbWFuZENvbnRleHQpID0+IFByb21pc2U8YW55Pikge1xuICBsZXQgYnVmID0gJyc7XG4gIGNvbnN0IGxpbmVTdWJqZWN0ID0gbmV3IFN1YmplY3Q8c3RyaW5nPigpO1xuICBsZXQgbG9nRW5hYmxlZCA9IHRydWU7XG4gIGxldCBjbWRJZHggPSAxO1xuICBjb25zdCBmaWxlV3JpdGluZ1N0YXRlID0gbmV3IEJlaGF2aW9yU3ViamVjdDxTZXQ8c3RyaW5nPj4obmV3IFNldDxzdHJpbmc+KCkpO1xuXG4gIGlmICghc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIpIHtcbiAgICBsb2cud2FybignZmV0Y2hNYWlsU2VydmVyIGlzIG5vdCBjb25maWd1cmVkISBTa2lwIHNlbmRNYWlsJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHtcbiAgICAgIHVzZXI6IEVNQUlMLFxuICAgICAgbG9naW5TZWNyZXQ6IFNFQ1JFVCxcbiAgICAgIGltYXA6IElNQVBcbiAgICAgIC8vIHNtdHA6IFNNVFBcbiAgfSA9IHNldHRpbmcuZmV0Y2hNYWlsU2VydmVyO1xuXG4gIGNvbnN0IGNvbnRleHQ6IHtbayBpbiBrZXlvZiBJbWFwQ29tbWFuZENvbnRleHRdPzogSW1hcENvbW1hbmRDb250ZXh0W2tdfSA9IHt9O1xuXG4gIGNvbnRleHQud2FpdEZvclJlcGx5ID0gd2FpdEZvclJlcGx5O1xuICBjb250ZXh0LndhaXRGb3JGZXRjaCA9IHdhaXRGb3JGZXRjaDtcbiAgY29udGV4dC53YWl0Rm9yRmV0Y2hUZXh0ID0gd2FpdEZvckZldGNoVGV4dDtcbiAgY29udGV4dC5maW5kTWFpbCA9IGZpbmRNYWlsO1xuICBjb250ZXh0LmZpbGVXcml0aW5nU3RhdGUgPSBmaWxlV3JpdGluZ1N0YXRlLnBpcGUoXG4gICAgbWFwKGZpbGVTZXQgPT4ge1xuICAgICAgLy8gbG9nLndhcm4oJ3dyaXRpbmc6ICcsIGZpbGVTZXQudmFsdWVzKCkpO1xuICAgICAgcmV0dXJuIGZpbGVTZXQuc2l6ZSA+IDA7XG4gICAgfSksXG4gICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKVxuICApO1xuXG4gIC8vIGNvbnRleHQuZmlsZVdyaXRpbmdTdGF0ZS5zdWJzY3JpYmUoc2l6ZSA9PiB7XG4gIC8vICAgbG9nLndhcm4oJ3dyaXRpbmcgZmlsZXM6Jywgc2l6ZSk7XG4gIC8vIH0pO1xuXG4gIGxldCBzb2NrZXQ6IFRMU1NvY2tldHx1bmRlZmluZWQ7XG4gIHRyeSB7XG4gICAgc29ja2V0ID0gYXdhaXQgbmV3IFByb21pc2U8UmV0dXJuVHlwZTx0eXBlb2YgdHNsQ29ubmVjdD4+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHNvY2tldCA9IHRzbENvbm5lY3Qoe1xuICAgICAgICBob3N0OiBJTUFQLCBwb3J0OiA5OTMsXG4gICAgICAgIGVuYWJsZVRyYWNlOiB0cnVlXG4gICAgICB9IGFzIENvbm5lY3Rpb25PcHRpb25zKTtcblxuICAgICAgc29ja2V0Lm9uKCdzZWN1cmVDb25uZWN0JywgKCkgPT4ge1xuICAgICAgICBsb2cuaW5mbygnY29ubmVjdGVkJywgc29ja2V0LmF1dGhvcml6ZWQgPyAnYXV0aG9yaXplZCcgOiAndW5hdXRob3JpemVkJyk7XG4gICAgICAgIHJlc29sdmUoc29ja2V0KTtcbiAgICAgIH0pXG4gICAgICAub24oJ2Vycm9yJywgZXJyID0+IHJlamVjdChlcnIpKVxuICAgICAgLm9uKCd0aW1lb3V0JywgKCkgPT4gcmVqZWN0KG5ldyBFcnJvcignVGltZW91dCcpKSk7XG4gICAgICBzb2NrZXQub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PiBfb25SZXNwb25zZShkYXRhLnRvU3RyaW5nKCd1dGY4JykpKTtcbiAgICB9KTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coYXdhaXQgd2FpdEZvclJlcGx5KCkpO1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseSgnSUQgKFwibmFtZVwiIFwiY29tLnRlbmNlbnQuZm94bWFpbFwiIFwidmVyc2lvblwiIFwiNy4yLjkuNzlcIiknKTtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoYExPR0lOICR7RU1BSUx9ICR7U0VDUkVUfWApO1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseSgnU0VMRUNUIElOQk9YJyk7XG5cbiAgICBsZXQgZnJvbUluZHg6IG51bWJlcjtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoJ1NFQVJDSCAqJywgYXN5bmMgbGluZSA9PiB7XG4gICAgICBpZiAoZnJvbUluZHggIT0gbnVsbClcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY29uc3QgbSA9IC9cXCpcXHMrU0VBUkNIXFxzKyhcXGQrKT8vLmV4ZWMobGluZSk7XG4gICAgICBpZiAobSkge1xuICAgICAgICBmcm9tSW5keCA9IHBhcnNlSW50KG1bMV0sIDEwKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnRleHQubGFzdEluZGV4ID0gZnJvbUluZHghO1xuICAgIGF3YWl0IGNhbGxiYWNrKGNvbnRleHQgYXMgSW1hcENvbW1hbmRDb250ZXh0KTtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoJ0xPR09VVCcpO1xuICB9IGNhdGNoIChleCkge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoJ0xPR09VVCcpO1xuICAgIH0gY2F0Y2ggKGVyKSB7fVxuICAgIGlmIChzb2NrZXQpXG4gICAgICBzb2NrZXQuZW5kKCk7XG4gICAgdGhyb3cgZXg7XG4gIH1cblxuICBzb2NrZXQuZW5kKCk7XG5cbiAgZnVuY3Rpb24gX29uUmVzcG9uc2UocmVzOiBzdHJpbmcpIHtcbiAgICBidWYgKz0gcmVzO1xuICAgIGlmIChyZXMuaW5kZXhPZignXFxuJykgPCAwKVxuICAgICAgcmV0dXJuO1xuICAgIGNvbnN0IGxpbmVzID0gYnVmLnNwbGl0KC8oPzpcXHJcXG58XFxyfFxcbikvKTtcbiAgICBidWYgPSBsaW5lc1tsaW5lcy5sZW5ndGggLSAxXTtcbiAgICBsaW5lcy5zbGljZSgwLCBsaW5lcy5sZW5ndGggLSAxKS5mb3JFYWNoKGxpbmUgPT4gX29uRWFjaExpbmUobGluZSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gX29uRWFjaExpbmUobGluZTogc3RyaW5nKSB7XG4gICAgaWYgKGxvZ0VuYWJsZWQpXG4gICAgICBsb2cuZGVidWcoJyAgPD0nLCBsaW5lKTtcbiAgICBsaW5lU3ViamVjdC5uZXh0KGxpbmUpO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gd2FpdEZvckZldGNoVGV4dChpbmRleDogbnVtYmVyKSB7XG4gICAgbGV0IGJ1ZiA9ICcnO1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseShgRkVUQ0ggJHtpbmRleH0gQk9EWVsxXWAsIGFzeW5jIGxpbmUgPT4ge1xuICAgICAgYnVmICs9IGxpbmUgKyAnXFxuJztcbiAgICB9KTtcbiAgICAvLyBsb2cud2FybihidWYpO1xuICAgIHJldHVybiAvXlxcKlxccytcXGQrXFxzK0ZFVENIXFxzK1xcKC4qP1xce1xcZCtcXH0oW15dKilcXCkkL20uZXhlYyhidWYpIVsxXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHdhaXRGb3JSZXBseShjb21tYW5kPzogc3RyaW5nLCBvbkxpbmU/OiAobGluZTogc3RyaW5nLCB0YWc6IHN0cmluZykgPT4gUHJvbWlzZTxhbnk+KSB7XG4gICAgbGV0IHRhZzogc3RyaW5nO1xuICAgIGlmIChjb21tYW5kKVxuICAgICAgdGFnID0gJ2EnICsgKGNtZElkeCsrKTtcblxuICAgIGxldCBzb3VyY2U6IE9ic2VydmFibGU8c3RyaW5nPiA9IGxpbmVTdWJqZWN0O1xuICAgIGlmIChvbkxpbmUpIHtcbiAgICAgIHNvdXJjZSA9IHNvdXJjZS5waXBlKFxuICAgICAgICBjb25jYXRNYXAobGluZSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGZyb20ob25MaW5lKGxpbmUsIHRhZykpLnBpcGUobWFwVG8obGluZSkpO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9XG4gICAgY29uc3QgcHJvbSA9IHNvdXJjZS5waXBlKFxuICAgICAgbWFwKGxpbmUgPT4ge1xuICAgICAgICBjb25zdCBtYXRjaCA9IC9eKFxcUyspXFxzKyhPS3xOT3xCQUQpKD89KFxcc3wkKSkvaS5leGVjKGxpbmUpO1xuICAgICAgICBpZiAobWF0Y2ggJiYgKCF0YWcgfHwgdGFnID09PSBtYXRjaFsxXSkpIHtcbiAgICAgICAgICBpZiAobWF0Y2hbMl0gPT09ICdPSycgfHwgbWF0Y2hbMl0gPT09ICdOTycpIHtcbiAgICAgICAgICAgIC8vIGxvZy5pbmZvKGBcXHQke2NvbW1hbmR9IHJlcGxpZWRgKTtcbiAgICAgICAgICAgIHJldHVybiBsaW5lLnNsaWNlKG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUmVwbHk6ICR7bGluZX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgdGFrZVdoaWxlKHJlc3VsdCA9PiByZXN1bHQgPT0gbnVsbCwgdHJ1ZSksXG4gICAgICB0YWtlTGFzdCgxKVxuICAgICkudG9Qcm9taXNlKCk7XG5cbiAgICBpZiAoY29tbWFuZCkge1xuICAgICAgY29uc3QgY21kID0gdGFnISArICcgJyArIGNvbW1hbmQ7XG4gICAgICBpZiAoc29ja2V0KVxuICAgICAgICBzb2NrZXQud3JpdGUoQnVmZmVyLmZyb20oYCR7dGFnIX0gJHtjb21tYW5kfVxcclxcbmAsICd1dGY4JykpO1xuICAgICAgbG9nLmRlYnVnKCc9PicsIGNtZCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb207XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiB3YWl0Rm9yRmV0Y2gobWFpbElkeDogc3RyaW5nIHwgbnVtYmVyID0gJyonLCBoZWFkZXJPbmx5ID0gdHJ1ZSwgb3ZlcnJpZGVGaWxlTmFtZT86IHN0cmluZyk6IFByb21pc2U8SW1hcEZldGNoRGF0YT4ge1xuICAgIGxldCBzdGF0ZTogRmV0Y2hTdGF0ZSA9IEZldGNoU3RhdGUuc3RhcnQ7XG4gICAgbGV0IGhlYWRlcnM6IHtcbiAgICAgIHN1YmplY3Q/OiBzdHJpbmdbXTtcbiAgICAgICdjb250ZW50LXR5cGUnPzogc3RyaW5nW107XG4gICAgICBba2V5OiBzdHJpbmddOiBzdHJpbmdbXSB8IHVuZGVmaW5lZDtcbiAgICB9ID0ge307XG4gICAgbGV0IGxhc3RIZWFkZXJOYW1lOiBzdHJpbmc7XG4gICAgbGV0IGJvdW5kYXJ5OiBzdHJpbmc7XG4gICAgbGV0IHRleHRCb2R5OiBzdHJpbmcgPSAnJztcbiAgICBsZXQgZmlsZU5hbWU6IHN0cmluZztcbiAgICBsZXQgZmlsZVdyaXRlcjogZnMuV3JpdGVTdHJlYW07XG4gICAgbGV0IGF0dGFjaGVtZW50RmlsZTogc3RyaW5nO1xuXG4gICAgY29uc3Qgb3JpZ2luTG9nRW5hYmxlZCA9IGxvZ0VuYWJsZWQ7XG4gICAgbG9nRW5hYmxlZCA9IGhlYWRlck9ubHk7XG4gICAgYXdhaXQgd2FpdEZvclJlcGx5KGBGRVRDSCAke21haWxJZHh9IFJGQzgyMiR7aGVhZGVyT25seSA/ICcuSEVBREVSJyA6ICcnfWAsIChsaW5lKSA9PiB7XG4gICAgICBzd2l0Y2ggKHN0YXRlKSB7XG4gICAgICAgIGNhc2UgRmV0Y2hTdGF0ZS5zdGFydDpcbiAgICAgICAgICBpZiAoL15cXCpcXHMrWzAtOV0rXFxzK0ZFVENIXFxzKy8udGVzdChsaW5lKSkge1xuICAgICAgICAgICAgc3RhdGUgPSBGZXRjaFN0YXRlLmhlYWRlcnM7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEZldGNoU3RhdGUuaGVhZGVyczpcbiAgICAgICAgICBpZiAoL15cXHMvLnRlc3QobGluZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gaGVhZGVyc1tsYXN0SGVhZGVyTmFtZV0hO1xuICAgICAgICAgICAgaXRlbXMucHVzaCguLi5saW5lLnNwbGl0KCc7JykubWFwKGl0ZW0gPT4gaXRlbS50cmltKCkpLmZpbHRlcihpdGVtID0+IGl0ZW0ubGVuZ3RoID4gMCkpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChsaW5lLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgc3RhdGUgPSBGZXRjaFN0YXRlLmhlYWRlcnNFbmQ7XG5cbiAgICAgICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRIZWFkZXJzOiB0eXBlb2YgaGVhZGVycyA9IHt9O1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoaGVhZGVycykuZm9yRWFjaChrZXkgPT4gbm9ybWFsaXplZEhlYWRlcnNba2V5LnRvTG93ZXJDYXNlKCldID0gaGVhZGVyc1trZXldKTtcbiAgICAgICAgICAgIGhlYWRlcnMgPSBub3JtYWxpemVkSGVhZGVycztcblxuICAgICAgICAgICAgY29uc3QgY29udGVudFR5cGUgPSBoZWFkZXJzWydjb250ZW50LXR5cGUnXTtcbiAgICAgICAgICAgIGlmICghY29udGVudFR5cGUpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIENvbnRlbnQtVHlwZSBpbiBoZWFkZXJzOiAke0pTT04uc3RyaW5naWZ5KGhlYWRlcnMsIG51bGwsICcgICcpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gaHR0cHM6Ly93d3cudzMub3JnL1Byb3RvY29scy9yZmMxMzQxLzdfMl9NdWx0aXBhcnQuaHRtbFxuICAgICAgICAgICAgaWYgKGNvbnRlbnRUeXBlWzBdICE9PSAnbXVsdGlwYXJ0L21peGVkJykge1xuICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCdObyBzdXBwb3J0IGZvciBjb250ZW50LXR5cGU6ICcgKyBjb250ZW50VHlwZVswXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBib3VuZGFyeSA9IGNvbnRlbnRUeXBlLmZpbmQoaXRlbSA9PiBpdGVtLnN0YXJ0c1dpdGgoJ2JvdW5kYXJ5PScpKSE7XG4gICAgICAgICAgICBib3VuZGFyeSA9ICctLScgKyAvXltcIiddPyguKj8pW1wiJ10/JC8uZXhlYyhib3VuZGFyeS5zbGljZSgnYm91bmRhcnk9Jy5sZW5ndGgpKSFbMV07XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgbSA9IC9eKFteOl0rKVxcOiguKikkLy5leGVjKGxpbmUpO1xuICAgICAgICAgIGlmIChtKSB7XG4gICAgICAgICAgICBoZWFkZXJzW21bMV1dID0gbVsyXS5zcGxpdCgnOycpLm1hcChpdGVtID0+IGl0ZW0udHJpbSgpKS5maWx0ZXIoaXRlbSA9PiBpdGVtLmxlbmd0aCA+IDApO1xuICAgICAgICAgICAgbGFzdEhlYWRlck5hbWUgPSBtWzFdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBGZXRjaFN0YXRlLmhlYWRlcnNFbmQ6XG4gICAgICAgICAgaWYgKGxpbmUgPT09IGJvdW5kYXJ5KSB7XG4gICAgICAgICAgICBzdGF0ZSA9IEZldGNoU3RhdGUudGV4dEhlYWRlcnM7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEZldGNoU3RhdGUudGV4dEhlYWRlcnM6XG4gICAgICAgICAgaWYgKGxpbmUubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgc3RhdGUgPSBGZXRjaFN0YXRlLnRleHRCb2R5O1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEZldGNoU3RhdGUudGV4dEJvZHk6XG4gICAgICAgICAgaWYgKGxpbmUgPT09IGJvdW5kYXJ5KSB7XG4gICAgICAgICAgICB0ZXh0Qm9keSA9IHRleHRCb2R5LnNsaWNlKDAsIHRleHRCb2R5Lmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgc3RhdGUgPSBGZXRjaFN0YXRlLmF0dGFjaG1lbnRIZWFkZXJzO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRleHRCb2R5ICs9IGxpbmUgKyAnXFxuJztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBGZXRjaFN0YXRlLmF0dGFjaG1lbnRIZWFkZXJzOlxuICAgICAgICAgIGlmIChsaW5lLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgc3RhdGUgPSBGZXRjaFN0YXRlLmF0dGFjaGVtZW50Qm9keTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWZpbGVOYW1lKSB7XG4gICAgICAgICAgICBjb25zdCBmb3VuZCA9IC9maWxlbmFtZT1bXCInIF0/KFteJ1wiIF0rKVtcIicgXT8kLy5leGVjKGxpbmUpO1xuICAgICAgICAgICAgaWYgKGZvdW5kKVxuICAgICAgICAgICAgICBmaWxlTmFtZSA9IGZvdW5kWzFdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBGZXRjaFN0YXRlLmF0dGFjaGVtZW50Qm9keTpcbiAgICAgICAgICBpZiAobGluZS5pbmRleE9mKGJvdW5kYXJ5KSA+PTAgKSB7XG4gICAgICAgICAgICBzdGF0ZSA9IEZldGNoU3RhdGUuZW5kO1xuICAgICAgICAgICAgaWYgKGZpbGVXcml0ZXIpIHtcbiAgICAgICAgICAgICAgZmlsZVdyaXRlci5lbmQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGxvZy5pbmZvKCdmaWxlIGVuZCBkb25lOicsIGF0dGFjaGVtZW50RmlsZSk7XG4gICAgICAgICAgICAgICAgZmlsZVdyaXRpbmdTdGF0ZS5nZXRWYWx1ZSgpLmRlbGV0ZShhdHRhY2hlbWVudEZpbGUpO1xuICAgICAgICAgICAgICAgIGZpbGVXcml0aW5nU3RhdGUubmV4dChmaWxlV3JpdGluZ1N0YXRlLmdldFZhbHVlKCkpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWZpbGVXcml0ZXIpIHtcbiAgICAgICAgICAgIGF0dGFjaGVtZW50RmlsZSA9IG92ZXJyaWRlRmlsZU5hbWUgfHwgUGF0aC5yZXNvbHZlKCdkaXN0LycgKyBmaWxlTmFtZSk7XG4gICAgICAgICAgICBmcy5ta2RpcnBTeW5jKFBhdGguZGlybmFtZShhdHRhY2hlbWVudEZpbGUpKTtcbiAgICAgICAgICAgIGZpbGVXcml0ZXIgPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShhdHRhY2hlbWVudEZpbGUpO1xuICAgICAgICAgICAgZmlsZVdyaXRpbmdTdGF0ZS5nZXRWYWx1ZSgpLmFkZChhdHRhY2hlbWVudEZpbGUpO1xuICAgICAgICAgICAgZmlsZVdyaXRpbmdTdGF0ZS5uZXh0KGZpbGVXcml0aW5nU3RhdGUuZ2V0VmFsdWUoKSk7XG4gICAgICAgICAgICBsb2cuaW5mbygnQ3JlYXRlIGF0dGFjaGVtZW50IGZpbGU6ICcsIGF0dGFjaGVtZW50RmlsZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGxvZy53YXJuKCdib3VuZGFyeScsIGJvdW5kYXJ5KTtcbiAgICAgICAgICAvLyBUT0RPOiB3YWl0IGZvciBkcmFpbmVkXG4gICAgICAgICAgZmlsZVdyaXRlci53cml0ZShCdWZmZXIuZnJvbShsaW5lLCAnYmFzZTY0JykpO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgfVxuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgwKTtcbiAgICB9KTtcbiAgICBsb2dFbmFibGVkID0gb3JpZ2luTG9nRW5hYmxlZDtcblxuICAgIHJldHVybiB7XG4gICAgICBoZWFkZXJzLFxuICAgICAgdGV4dEJvZHksXG4gICAgICBmaWxlTmFtZTogZmlsZU5hbWUhXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGZpbmRNYWlsKGZyb21JbmR4OiBudW1iZXIsIHN1YmplY3Q6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyIHwgdW5kZWZpbmVkPiB7XG4gICAgbG9nLmluZm8oJ2ZpbmRNYWlsJywgZnJvbUluZHgsIHN1YmplY3QpO1xuICAgIHdoaWxlIChmcm9tSW5keCA+IDApIHtcbiAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IHdhaXRGb3JGZXRjaChmcm9tSW5keCk7XG4gICAgICBpZiAocmVzLmhlYWRlcnMuc3ViamVjdCAmJiByZXMuaGVhZGVycy5zdWJqZWN0WzBdLmluZGV4T2Yoc3ViamVjdCkgPj0gMClcbiAgICAgICAgcmV0dXJuIGZyb21JbmR4O1xuICAgICAgZnJvbUluZHgtLTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vIHJldHVybiBzb2NrZXQ7XG59XG5cbmV4cG9ydCBjbGFzcyBJbWFwTWFuYWdlciB7XG4gIC8vIGNoZWNrc3VtOiBDaGVja3N1bTtcbiAgY2hlY2tzdW1TdGF0ZSA9IG5ldyBCZWhhdmlvclN1YmplY3Q8Q2hlY2tzdW0gfCBudWxsPihudWxsKTtcbiAgZmlsZVdyaXRpbmdTdGF0ZTogSW1hcENvbW1hbmRDb250ZXh0WydmaWxlV3JpdGluZ1N0YXRlJ107XG4gIHdhdGNoaW5nID0gZmFsc2U7XG4gIHByaXZhdGUgdG9GZXRjaEFwcHNTdGF0ZSA9IG5ldyBCZWhhdmlvclN1YmplY3Q8c3RyaW5nW10+KFtdKTtcbiAgLy8gcHJpdmF0ZSAgemlwRG93bmxvYWREaXI6IHN0cmluZztcbiAgLy8gcHJpdmF0ZSBpbWFwQWN0aW9ucyA9IG5ldyBTdWJqZWN0PChjdHg6IEltYXBDb21tYW5kQ29udGV4dCkgPT4gUHJvbWlzZTxhbnk+PigpO1xuXG4gIHByaXZhdGUgY3R4OiBJbWFwQ29tbWFuZENvbnRleHQ7XG5cbiAgY29uc3RydWN0b3IocHVibGljIGVudjogc3RyaW5nLCBwdWJsaWMgemlwRG93bmxvYWREaXI/OiBzdHJpbmcpIHtcbiAgICBpZiAoemlwRG93bmxvYWREaXIgPT0gbnVsbClcbiAgICAgIHRoaXMuemlwRG93bmxvYWREaXIgPSBQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGN1cnJDaGVja3N1bUZpbGUpLCAnZGVwbG95LXN0YXRpYy0nICsgZW52KTtcbiAgfVxuXG4gIGFzeW5jIGZldGNoQ2hlY2tzdW0oKTogUHJvbWlzZTxDaGVja3N1bSB8IHVuZGVmaW5lZD4gIHtcbiAgICBsZXQgY3M6IENoZWNrc3VtIHwgdW5kZWZpbmVkO1xuICAgIGF3YWl0IGNvbm5lY3RJbWFwKGFzeW5jIGN0eCA9PiB7XG4gICAgICBjcyA9IGF3YWl0IHRoaXMuX2ZldGNoQ2hlY2tzdW0oY3R4KTtcbiAgICB9KTtcbiAgICBsb2cuaW5mbygnZmV0Y2hlZCBjaGVja3N1bTonLCBjcyk7XG4gICAgdGhpcy5jaGVja3N1bVN0YXRlLm5leHQoY3MhKTtcbiAgICByZXR1cm4gY3M7XG4gIH1cblxuICBhc3luYyBmZXRjaFVwZGF0ZUNoZWNrU3VtKGFwcE5hbWU6IHN0cmluZyk6IFByb21pc2U8Q2hlY2tzdW0+IHtcbiAgICBsZXQgY3MgPSBhd2FpdCB0aGlzLmZldGNoQ2hlY2tzdW0oKTtcbiAgICBsb2cuaW5mbygnZmV0Y2hlZCBjaGVja3N1bTonLCBjcyk7XG4gICAgaWYgKGNzIS52ZXJzaW9ucyFbYXBwTmFtZV0gPT0gbnVsbCkge1xuICAgICAgY3MhLnZlcnNpb25zIVthcHBOYW1lXSA9IHtcbiAgICAgICAgdmVyc2lvbjogMCxcbiAgICAgICAgcGF0aDogJzxzZWUgYXR0YWNoZW1lbnQgZmlsZSBuYW1lPidcbiAgICAgIH07XG4gICAgfVxuICAgIGNzIS52ZXJzaW9ucyFbYXBwTmFtZV0udmVyc2lvbisrO1xuICAgIHRoaXMuY2hlY2tzdW1TdGF0ZS5uZXh0KGNzISk7XG4gICAgZnMubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUoY3VyckNoZWNrc3VtRmlsZSkpO1xuICAgIGNvbnN0IGNoZWNrc3VtU3RyID0gSlNPTi5zdHJpbmdpZnkoY3MhLCBudWxsLCAnICAnKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKGN1cnJDaGVja3N1bUZpbGUsIGNoZWNrc3VtU3RyKTtcbiAgICBsb2cuaW5mbygnd3JpdGUgJXNcXG4lcycsIGN1cnJDaGVja3N1bUZpbGUsIGNoZWNrc3VtU3RyKTtcbiAgICByZXR1cm4gY3MhO1xuICB9XG5cbiAgLyoqXG4gICAqIERvbmUgd2hlbiBmaWxlcyBhcmUgd3JpdHRlblxuICAgKiBAcGFyYW0gYXBwTmFtZSBleGNsdWRlIGFwcFxuICAgKi9cbiAgYXN5bmMgZmV0Y2hPdGhlclppcHMoYXBwTmFtZTogc3RyaW5nKSB7XG4gICAgbGV0IGFwcE5hbWVzID0gT2JqZWN0LmtleXModGhpcy5jaGVja3N1bVN0YXRlLmdldFZhbHVlKCkhLnZlcnNpb25zISlcbiAgICAuZmlsdGVyKGFwcCA9PiBhcHAgIT09IGFwcE5hbWUpO1xuXG4gICAgbGV0IGZpbGVXcml0dGVuUHJvbTogUHJvbWlzZTxib29sZWFuPiB8IHVuZGVmaW5lZDtcblxuICAgIGF3YWl0IGNvbm5lY3RJbWFwKGFzeW5jIGN0eCA9PiB7XG5cbiAgICAgIGZpbGVXcml0dGVuUHJvbSA9IGN0eC5maWxlV3JpdGluZ1N0YXRlLnBpcGUoXG4gICAgICAgIHNraXAoMSksXG4gICAgICAgIGZpbHRlcih3cml0aW5nID0+ICF3cml0aW5nKSxcbiAgICAgICAgdGFrZShhcHBOYW1lcy5sZW5ndGgpXG4gICAgICApLnRvUHJvbWlzZSgpO1xuXG4gICAgICBmb3IgKGNvbnN0IGFwcCBvZiBhcHBOYW1lcykge1xuICAgICAgICBsb2cuaW5mbygnZmV0Y2ggb3RoZXIgemlwOiAnICsgYXBwKTtcbiAgICAgICAgY29uc3QgaWR4ID0gYXdhaXQgY3R4LmZpbmRNYWlsKGN0eC5sYXN0SW5kZXgsIGBia2prLXByZS1idWlsZCgke3RoaXMuZW52fS0ke2FwcH0pYCk7XG4gICAgICAgIGlmICghaWR4KSB7XG4gICAgICAgICAgbG9nLmluZm8oYG1haWwgXCJia2prLXByZS1idWlsZCgke3RoaXMuZW52fS0ke2FwcH0pXCIgaXMgbm90IEZvdW5kLCBza2lwIGRvd25sb2FkIHppcGApO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IGN0eC53YWl0Rm9yRmV0Y2goaWR4LCBmYWxzZSwgUGF0aC5yZXNvbHZlKHRoaXMuemlwRG93bmxvYWREaXIhLCBhcHAgKyAnLnppcCcpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoZmlsZVdyaXR0ZW5Qcm9tKVxuICAgICAgYXdhaXQgZmlsZVdyaXR0ZW5Qcm9tO1xuICAgIHJldHVybiBhcHBOYW1lcztcbiAgfVxuXG4gIGFzeW5jIHN0YXJ0V2F0Y2hNYWlsKHBvbGxJbnRlcnZhbCA9IDYwMDAwKSB7XG4gICAgdGhpcy53YXRjaGluZyA9IHRydWU7XG4gICAgd2hpbGUgKHRoaXMud2F0Y2hpbmcpIHtcbiAgICAgIGF3YWl0IHRoaXMuY2hlY2tNYWlsRm9yVXBkYXRlKCk7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgcG9sbEludGVydmFsKSk7IC8vIDYwIHNlY1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGNoZWNrTWFpbEZvclVwZGF0ZSgpIHtcbiAgICBhd2FpdCBjb25uZWN0SW1hcChhc3luYyBjdHggPT4ge1xuICAgICAgdGhpcy5jdHggPSBjdHg7XG4gICAgICB0aGlzLmZpbGVXcml0aW5nU3RhdGUgPSBjdHguZmlsZVdyaXRpbmdTdGF0ZTtcblxuICAgICAgY29uc3QgY3MgPSBhd2FpdCB0aGlzLl9mZXRjaENoZWNrc3VtKGN0eCk7XG4gICAgICB0aGlzLmNoZWNrc3VtU3RhdGUubmV4dChjcyEpO1xuXG4gICAgICBjb25zdCB0b0ZldGNoQXBwcyA9IHRoaXMudG9GZXRjaEFwcHNTdGF0ZS5nZXRWYWx1ZSgpO1xuICAgICAgaWYgKHRvRmV0Y2hBcHBzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy50b0ZldGNoQXBwc1N0YXRlLm5leHQoW10pO1xuICAgICAgICBmb3IgKGNvbnN0IGFwcE5hbWUgb2YgdG9GZXRjaEFwcHMpIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLmZldGNoQXR0YWNobWVudChhcHBOYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gYXdhaXQgY3R4LndhaXRGb3JSZXBseSgnU1VCU0NSSUJFIElOQk9YJyk7XG4gICAgICAvLyBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMzAwMDApKTsgLy8gMzAgc2VjXG4gICAgICBkZWxldGUgdGhpcy5jdHg7XG4gICAgfSk7XG4gIH1cblxuICBmZXRjaEFwcER1cmluZ1dhdGNoQWN0aW9uKC4uLmFwcE5hbWVzOiBzdHJpbmdbXSkge1xuICAgIHRoaXMudG9GZXRjaEFwcHNTdGF0ZS5uZXh0KGFwcE5hbWVzKTtcbiAgfVxuXG4gIGFzeW5jIHNlbmRGaWxlQW5kVXBkYXRlZENoZWNrc3VtKGFwcE5hbWU6IHN0cmluZywgZmlsZTogc3RyaW5nKSB7XG4gICAgY29uc3QgY3MgPSBhd2FpdCB0aGlzLmZldGNoVXBkYXRlQ2hlY2tTdW0oYXBwTmFtZSk7XG4gICAgYXdhaXQgcmV0cnlTZW5kTWFpbChgYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tJHthcHBOYW1lfSlgLCBKU09OLnN0cmluZ2lmeShjcywgbnVsbCwgJyAgJyksIGZpbGUpO1xuICB9XG5cbiAgc3RvcFdhdGNoKCkge1xuICAgIHRoaXMud2F0Y2hpbmcgPSBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZmV0Y2hBdHRhY2htZW50KGFwcDogc3RyaW5nKSB7XG4gICAgY29uc3QgaWR4ID0gYXdhaXQgdGhpcy5jdHguZmluZE1haWwodGhpcy5jdHgubGFzdEluZGV4LCBgYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tJHthcHB9KWApO1xuICAgIGlmIChpZHggPT0gbnVsbClcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2FudCBmaW5kIG1haWw6ICcgKyBgYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tJHthcHB9KWApO1xuICAgIGF3YWl0IHRoaXMuY3R4LndhaXRGb3JGZXRjaChpZHghLCBmYWxzZSwgUGF0aC5yZXNvbHZlKHRoaXMuemlwRG93bmxvYWREaXIhLCBgJHthcHB9LnppcGApKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgX2ZldGNoQ2hlY2tzdW0oY3R4OiBJbWFwQ29tbWFuZENvbnRleHQpIHtcbiAgICBjb25zdCBpZHggPSBhd2FpdCBjdHguZmluZE1haWwoY3R4Lmxhc3RJbmRleCwgYGJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LWApO1xuICAgIGxvZy5pbmZvKCdfZmV0Y2hDaGVja3N1bSwgaW5kZXg6JywgaWR4KTtcbiAgICBpZiAoaWR4ID09IG51bGwpIHtcbiAgICAgIHJldHVybiB7dmVyc2lvbnM6IHt9fTtcbiAgICB9XG4gICAgcmV0dXJuIEpTT04ucGFyc2UoYXdhaXQgY3R4LndhaXRGb3JGZXRjaFRleHQoaWR4ISkpIGFzIENoZWNrc3VtO1xuICB9XG5cbn1cbiJdfQ==
