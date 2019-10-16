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
            return JSON.parse(yield ctx.waitForFetchText(idx));
        });
    }
}
exports.ImapManager = ImapManager;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS1pbWFwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDJDQUE2QztBQUU3QywrQkFBa0U7QUFDbEUsOENBQzRDO0FBQzVDLDZCQUEwRTtBQUMxRSxnRUFBMEI7QUFFMUIsd0RBQXdCO0FBRXhCLDBEQUF3QjtBQUN4Qiw4QkFBOEI7QUFDOUIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLG9CQUFvQixDQUFDLENBQUM7QUFFaEYsTUFBTSxPQUFPLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBeUIsQ0FBQztBQUN4RSxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBRzVFLE1BQU0sZ0JBQWdCLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEdBQUcsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDO0FBRXpHLFNBQXNCLFFBQVEsQ0FBQyxPQUFlLEVBQUUsSUFBWSxFQUFFLElBQWE7O1FBQ3pFLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUU7WUFDNUIsR0FBRyxDQUFDLElBQUksQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO1lBQzdELE9BQU87U0FDUjtRQUNELE1BQU0sRUFDSixJQUFJLEVBQUUsS0FBSyxFQUNYLFdBQVcsRUFBRSxNQUFNO1FBQ25CLGNBQWM7UUFDZCxJQUFJLEVBQUUsSUFBSSxFQUNYLEdB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RSxFQUFFLEVBQUMsQ0FBQzthQUN2QjtZQUNELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFJLENBQUMsQ0FBYSxDQUFDO1FBQ2xFLENBQUM7S0FBQTtDQUVGO0FBdklELGtDQXVJQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2ZldGNoLXJlbW90ZS1pbWFwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3JlYXRlVHJhbnNwb3J0IH0gZnJvbSAnbm9kZW1haWxlcic7XG5pbXBvcnQgU01UUFRyYW5zcG9ydCBmcm9tICdub2RlbWFpbGVyL2xpYi9zbXRwLXRyYW5zcG9ydCc7XG5pbXBvcnQgeyBTdWJqZWN0LCBPYnNlcnZhYmxlLCBmcm9tLCBCZWhhdmlvclN1YmplY3QgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IG1hcCwgY29uY2F0TWFwLCB0YWtlV2hpbGUsIHRha2VMYXN0LCBtYXBUbywgZGlzdGluY3RVbnRpbENoYW5nZWQsXG4gIHNraXAsIGZpbHRlciwgdGFrZX0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgY29ubmVjdCBhcyB0c2xDb25uZWN0LCBDb25uZWN0aW9uT3B0aW9ucywgVExTU29ja2V0IH0gZnJvbSAndGxzJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Q2hlY2tzdW0sIFdpdGhNYWlsU2VydmVyQ29uZmlnfSBmcm9tICcuL2ZldGNoLXR5cGVzJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuLy8gaW1wb3J0IHtTb2NrZXR9IGZyb20gJ25ldCc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5mZXRjaC1yZW1vdGUtaW1hcCcpO1xuXG5jb25zdCBzZXR0aW5nID0gYXBpLmNvbmZpZy5nZXQoYXBpLnBhY2thZ2VOYW1lKSBhcyBXaXRoTWFpbFNlcnZlckNvbmZpZztcbmNvbnN0IGVudiA9IHNldHRpbmcuZmV0Y2hNYWlsU2VydmVyID8gc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIuZW52IDogJ2xvY2FsJztcblxuXG5jb25zdCBjdXJyQ2hlY2tzdW1GaWxlID0gUGF0aC5yZXNvbHZlKCdjaGVja3N1bS4nICsgKHNldHRpbmcuZmV0Y2hNYWlsU2VydmVyID8gZW52IDogJ2xvY2FsJykgKyAnLmpzb24nKTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlbmRNYWlsKHN1YmplY3Q6IHN0cmluZywgdGV4dDogc3RyaW5nLCBmaWxlPzogc3RyaW5nKSB7XG4gIGxvZy5pbmZvKCdsb2dpbicpO1xuICBpZiAoIXNldHRpbmcuZmV0Y2hNYWlsU2VydmVyKSB7XG4gICAgbG9nLndhcm4oJ2ZldGNoTWFpbFNlcnZlciBpcyBub3QgY29uZmlndXJlZCEgU2tpcCBzZW5kTWFpbCcpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCB7XG4gICAgdXNlcjogRU1BSUwsXG4gICAgbG9naW5TZWNyZXQ6IFNFQ1JFVCxcbiAgICAvLyBpbWFwOiBJTUFQLFxuICAgIHNtdHA6IFNNVFBcbiAgfSA9IHNldHRpbmcuZmV0Y2hNYWlsU2VydmVyO1xuXG4gIGNvbnN0IHRyYW5zcG9ydGVyID0gY3JlYXRlVHJhbnNwb3J0KHtcbiAgICBob3N0OiBTTVRQLFxuICAgIGF1dGg6IHtcbiAgICAgIHR5cGU6ICdsb2dpbicsXG4gICAgICB1c2VyOiBFTUFJTCxcbiAgICAgIHBhc3M6IFNFQ1JFVFxuICAgIH0sXG4gICAgc2VjdXJlOiB0cnVlXG4gIH0gYXMgU01UUFRyYW5zcG9ydC5PcHRpb25zKTtcblxuICBsb2cuaW5mbygnc2VuZCBtYWlsJyk7XG4gIGNvbnN0IGluZm8gPSBhd2FpdCB0cmFuc3BvcnRlci5zZW5kTWFpbCh7XG4gICAgZnJvbTogRU1BSUwsXG4gICAgdG86IEVNQUlMLFxuICAgIHN1YmplY3Q6IGBidWlsZCBhcnRpZmFjdDogJHtzdWJqZWN0fWAsXG4gICAgdGV4dCxcbiAgICBhdHRhY2htZW50czogZmlsZSA/IFtcbiAgICAgIHtcbiAgICAgICAgZmlsZW5hbWU6IFBhdGguYmFzZW5hbWUoZmlsZSksXG4gICAgICAgIHBhdGg6IFBhdGgucmVzb2x2ZShmaWxlKVxuICAgICAgfVxuICAgIF0gOiB1bmRlZmluZWRcbiAgfSk7XG5cbiAgbG9nLmluZm8oaW5mbyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXRyeVNlbmRNYWlsKHN1YmplY3Q6IHN0cmluZywgdGV4dDogc3RyaW5nLCBmaWxlPzogc3RyaW5nKSB7XG4gIGxldCBlcnJvcjogRXJyb3IgfCB1bmRlZmluZWQ7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHNlbmRNYWlsKHN1YmplY3QsIHRleHQsIGZpbGUpO1xuICAgICAgZXJyb3IgPSB1bmRlZmluZWQ7XG4gICAgICBicmVhaztcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGxvZy5pbmZvKCdHb3QgZXJyb3InLCBlcnIpO1xuICAgICAgZXJyb3IgPSBlcnI7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwMCkpO1xuICAgIH1cbiAgfVxuICBpZiAoZXJyb3IpIHtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuXG5lbnVtIEZldGNoU3RhdGUge1xuICBzdGFydCA9IDAsXG4gIGhlYWRlcnMsXG4gIGhlYWRlcnNFbmQsXG4gIHRleHRIZWFkZXJzLFxuICB0ZXh0Qm9keSxcbiAgYXR0YWNobWVudEhlYWRlcnMsXG4gIGF0dGFjaGVtZW50Qm9keSxcbiAgZW5kXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW1hcEZldGNoRGF0YSB7XG4gIGhlYWRlcnM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmdbXSB8IHVuZGVmaW5lZH07XG4gIHRleHRCb2R5Pzogc3RyaW5nO1xuICBmaWxlTmFtZT86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbWFwQ29tbWFuZENvbnRleHQge1xuICAvKipcbiAgICogSW5kZXggb2YgbGF0ZXN0IG1haWxcbiAgICovXG4gIGxhc3RJbmRleDogbnVtYmVyO1xuICBmaWxlV3JpdGluZ1N0YXRlOiBPYnNlcnZhYmxlPGJvb2xlYW4+O1xuICB3YWl0Rm9yUmVwbHkoY29tbWFuZD86IHN0cmluZywgb25MaW5lPzogKGxpbmU6IHN0cmluZywgdGFnOiBzdHJpbmcpID0+IFByb21pc2U8YW55Pik6IFByb21pc2U8c3RyaW5nfG51bGw+O1xuICBmaW5kTWFpbChmcm9tSW5keDogbnVtYmVyLCBzdWJqZWN0OiBzdHJpbmcpOiBQcm9taXNlPG51bWJlciB8IHVuZGVmaW5lZD47XG4gIHdhaXRGb3JGZXRjaChtYWlsSWR4OiBzdHJpbmcgfCBudW1iZXIsIGhlYWRlck9ubHk/OiBib29sZWFuLCBvdmVycmlkZUZpbGVOYW1lPzogc3RyaW5nKTogUHJvbWlzZTxJbWFwRmV0Y2hEYXRhPjtcbiAgd2FpdEZvckZldGNoVGV4dChpbmRleDogbnVtYmVyKTogUHJvbWlzZTxzdHJpbmc+O1xufVxuXG4vKipcbiAqIElNQVAgc3BlY2lmaWNhdGlvblxuICogaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzE3MzBcbiAqIFxuICogSUQgY29tbWFuZFxuICogaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzI5NzFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvbm5lY3RJbWFwKGNhbGxiYWNrOiAoY29udGV4dDogSW1hcENvbW1hbmRDb250ZXh0KSA9PiBQcm9taXNlPGFueT4pIHtcbiAgbGV0IGJ1ZiA9ICcnO1xuICBjb25zdCBsaW5lU3ViamVjdCA9IG5ldyBTdWJqZWN0PHN0cmluZz4oKTtcbiAgbGV0IGxvZ0VuYWJsZWQgPSB0cnVlO1xuICBsZXQgY21kSWR4ID0gMTtcbiAgY29uc3QgZmlsZVdyaXRpbmdTdGF0ZSA9IG5ldyBCZWhhdmlvclN1YmplY3Q8U2V0PHN0cmluZz4+KG5ldyBTZXQ8c3RyaW5nPigpKTtcblxuICBpZiAoIXNldHRpbmcuZmV0Y2hNYWlsU2VydmVyKSB7XG4gICAgbG9nLndhcm4oJ2ZldGNoTWFpbFNlcnZlciBpcyBub3QgY29uZmlndXJlZCEgU2tpcCBzZW5kTWFpbCcpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCB7XG4gICAgICB1c2VyOiBFTUFJTCxcbiAgICAgIGxvZ2luU2VjcmV0OiBTRUNSRVQsXG4gICAgICBpbWFwOiBJTUFQXG4gICAgICAvLyBzbXRwOiBTTVRQXG4gIH0gPSBzZXR0aW5nLmZldGNoTWFpbFNlcnZlcjtcblxuICBjb25zdCBjb250ZXh0OiB7W2sgaW4ga2V5b2YgSW1hcENvbW1hbmRDb250ZXh0XT86IEltYXBDb21tYW5kQ29udGV4dFtrXX0gPSB7fTtcblxuICBjb250ZXh0LndhaXRGb3JSZXBseSA9IHdhaXRGb3JSZXBseTtcbiAgY29udGV4dC53YWl0Rm9yRmV0Y2ggPSB3YWl0Rm9yRmV0Y2g7XG4gIGNvbnRleHQud2FpdEZvckZldGNoVGV4dCA9IHdhaXRGb3JGZXRjaFRleHQ7XG4gIGNvbnRleHQuZmluZE1haWwgPSBmaW5kTWFpbDtcbiAgY29udGV4dC5maWxlV3JpdGluZ1N0YXRlID0gZmlsZVdyaXRpbmdTdGF0ZS5waXBlKFxuICAgIG1hcChmaWxlU2V0ID0+IHtcbiAgICAgIC8vIGxvZy53YXJuKCd3cml0aW5nOiAnLCBmaWxlU2V0LnZhbHVlcygpKTtcbiAgICAgIHJldHVybiBmaWxlU2V0LnNpemUgPiAwO1xuICAgIH0pLFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKClcbiAgKTtcblxuICAvLyBjb250ZXh0LmZpbGVXcml0aW5nU3RhdGUuc3Vic2NyaWJlKHNpemUgPT4ge1xuICAvLyAgIGxvZy53YXJuKCd3cml0aW5nIGZpbGVzOicsIHNpemUpO1xuICAvLyB9KTtcblxuICBsZXQgc29ja2V0OiBUTFNTb2NrZXR8dW5kZWZpbmVkO1xuICB0cnkge1xuICAgIHNvY2tldCA9IGF3YWl0IG5ldyBQcm9taXNlPFJldHVyblR5cGU8dHlwZW9mIHRzbENvbm5lY3Q+PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCBzb2NrZXQgPSB0c2xDb25uZWN0KHtcbiAgICAgICAgaG9zdDogSU1BUCwgcG9ydDogOTkzLFxuICAgICAgICBlbmFibGVUcmFjZTogdHJ1ZVxuICAgICAgfSBhcyBDb25uZWN0aW9uT3B0aW9ucyk7XG5cbiAgICAgIHNvY2tldC5vbignc2VjdXJlQ29ubmVjdCcsICgpID0+IHtcbiAgICAgICAgbG9nLmluZm8oJ2Nvbm5lY3RlZCcsIHNvY2tldC5hdXRob3JpemVkID8gJ2F1dGhvcml6ZWQnIDogJ3VuYXV0aG9yaXplZCcpO1xuICAgICAgICByZXNvbHZlKHNvY2tldCk7XG4gICAgICB9KVxuICAgICAgLm9uKCdlcnJvcicsIGVyciA9PiByZWplY3QoZXJyKSlcbiAgICAgIC5vbigndGltZW91dCcsICgpID0+IHJlamVjdChuZXcgRXJyb3IoJ1RpbWVvdXQnKSkpO1xuICAgICAgc29ja2V0Lm9uKCdkYXRhJywgKGRhdGE6IEJ1ZmZlcikgPT4gX29uUmVzcG9uc2UoZGF0YS50b1N0cmluZygndXRmOCcpKSk7XG4gICAgfSk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGF3YWl0IHdhaXRGb3JSZXBseSgpKTtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoJ0lEIChcIm5hbWVcIiBcImNvbS50ZW5jZW50LmZveG1haWxcIiBcInZlcnNpb25cIiBcIjcuMi45Ljc5XCIpJyk7XG4gICAgYXdhaXQgd2FpdEZvclJlcGx5KGBMT0dJTiAke0VNQUlMfSAke1NFQ1JFVH1gKTtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoJ1NFTEVDVCBJTkJPWCcpO1xuXG4gICAgbGV0IGZyb21JbmR4OiBudW1iZXI7XG4gICAgYXdhaXQgd2FpdEZvclJlcGx5KCdTRUFSQ0ggKicsIGFzeW5jIGxpbmUgPT4ge1xuICAgICAgaWYgKGZyb21JbmR4ICE9IG51bGwpXG4gICAgICAgIHJldHVybjtcbiAgICAgIGNvbnN0IG0gPSAvXFwqXFxzK1NFQVJDSFxccysoXFxkKyk/Ly5leGVjKGxpbmUpO1xuICAgICAgaWYgKG0pIHtcbiAgICAgICAgZnJvbUluZHggPSBwYXJzZUludChtWzFdLCAxMCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb250ZXh0Lmxhc3RJbmRleCA9IGZyb21JbmR4ITtcbiAgICBhd2FpdCBjYWxsYmFjayhjb250ZXh0IGFzIEltYXBDb21tYW5kQ29udGV4dCk7XG4gICAgYXdhaXQgd2FpdEZvclJlcGx5KCdMT0dPVVQnKTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgd2FpdEZvclJlcGx5KCdMT0dPVVQnKTtcbiAgICB9IGNhdGNoIChlcikge31cbiAgICBpZiAoc29ja2V0KVxuICAgICAgc29ja2V0LmVuZCgpO1xuICAgIHRocm93IGV4O1xuICB9XG5cbiAgc29ja2V0LmVuZCgpO1xuXG4gIGZ1bmN0aW9uIF9vblJlc3BvbnNlKHJlczogc3RyaW5nKSB7XG4gICAgYnVmICs9IHJlcztcbiAgICBpZiAocmVzLmluZGV4T2YoJ1xcbicpIDwgMClcbiAgICAgIHJldHVybjtcbiAgICBjb25zdCBsaW5lcyA9IGJ1Zi5zcGxpdCgvKD86XFxyXFxufFxccnxcXG4pLyk7XG4gICAgYnVmID0gbGluZXNbbGluZXMubGVuZ3RoIC0gMV07XG4gICAgbGluZXMuc2xpY2UoMCwgbGluZXMubGVuZ3RoIC0gMSkuZm9yRWFjaChsaW5lID0+IF9vbkVhY2hMaW5lKGxpbmUpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIF9vbkVhY2hMaW5lKGxpbmU6IHN0cmluZykge1xuICAgIGlmIChsb2dFbmFibGVkKVxuICAgICAgbG9nLmRlYnVnKCcgIDw9JywgbGluZSk7XG4gICAgbGluZVN1YmplY3QubmV4dChsaW5lKTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIHdhaXRGb3JGZXRjaFRleHQoaW5kZXg6IG51bWJlcikge1xuICAgIGxldCBidWYgPSAnJztcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoYEZFVENIICR7aW5kZXh9IEJPRFlbMV1gLCBhc3luYyBsaW5lID0+IHtcbiAgICAgIGJ1ZiArPSBsaW5lICsgJ1xcbic7XG4gICAgfSk7XG4gICAgLy8gbG9nLndhcm4oYnVmKTtcbiAgICByZXR1cm4gL15cXCpcXHMrXFxkK1xccytGRVRDSFxccytcXCguKj9cXHtcXGQrXFx9KFteXSopXFwpJC9tLmV4ZWMoYnVmKSFbMV07XG4gIH1cblxuICBmdW5jdGlvbiB3YWl0Rm9yUmVwbHkoY29tbWFuZD86IHN0cmluZywgb25MaW5lPzogKGxpbmU6IHN0cmluZywgdGFnOiBzdHJpbmcpID0+IFByb21pc2U8YW55Pikge1xuICAgIGxldCB0YWc6IHN0cmluZztcbiAgICBpZiAoY29tbWFuZClcbiAgICAgIHRhZyA9ICdhJyArIChjbWRJZHgrKyk7XG5cbiAgICBsZXQgc291cmNlOiBPYnNlcnZhYmxlPHN0cmluZz4gPSBsaW5lU3ViamVjdDtcbiAgICBpZiAob25MaW5lKSB7XG4gICAgICBzb3VyY2UgPSBzb3VyY2UucGlwZShcbiAgICAgICAgY29uY2F0TWFwKGxpbmUgPT4ge1xuICAgICAgICAgIHJldHVybiBmcm9tKG9uTGluZShsaW5lLCB0YWcpKS5waXBlKG1hcFRvKGxpbmUpKTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuICAgIGNvbnN0IHByb20gPSBzb3VyY2UucGlwZShcbiAgICAgIG1hcChsaW5lID0+IHtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSAvXihcXFMrKVxccysoT0t8Tk98QkFEKSg/PShcXHN8JCkpL2kuZXhlYyhsaW5lKTtcbiAgICAgICAgaWYgKG1hdGNoICYmICghdGFnIHx8IHRhZyA9PT0gbWF0Y2hbMV0pKSB7XG4gICAgICAgICAgaWYgKG1hdGNoWzJdID09PSAnT0snIHx8IG1hdGNoWzJdID09PSAnTk8nKSB7XG4gICAgICAgICAgICAvLyBsb2cuaW5mbyhgXFx0JHtjb21tYW5kfSByZXBsaWVkYCk7XG4gICAgICAgICAgICByZXR1cm4gbGluZS5zbGljZShtYXRjaFswXS5sZW5ndGgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlcGx5OiAke2xpbmV9YCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIHRha2VXaGlsZShyZXN1bHQgPT4gcmVzdWx0ID09IG51bGwsIHRydWUpLFxuICAgICAgdGFrZUxhc3QoMSlcbiAgICApLnRvUHJvbWlzZSgpO1xuXG4gICAgaWYgKGNvbW1hbmQpIHtcbiAgICAgIGNvbnN0IGNtZCA9IHRhZyEgKyAnICcgKyBjb21tYW5kO1xuICAgICAgaWYgKHNvY2tldClcbiAgICAgICAgc29ja2V0LndyaXRlKEJ1ZmZlci5mcm9tKGAke3RhZyF9ICR7Y29tbWFuZH1cXHJcXG5gLCAndXRmOCcpKTtcbiAgICAgIGxvZy5kZWJ1ZygnPT4nLCBjbWQpO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9tO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gd2FpdEZvckZldGNoKG1haWxJZHg6IHN0cmluZyB8IG51bWJlciA9ICcqJywgaGVhZGVyT25seSA9IHRydWUsIG92ZXJyaWRlRmlsZU5hbWU/OiBzdHJpbmcpOiBQcm9taXNlPEltYXBGZXRjaERhdGE+IHtcbiAgICBsZXQgc3RhdGU6IEZldGNoU3RhdGUgPSBGZXRjaFN0YXRlLnN0YXJ0O1xuICAgIGxldCBoZWFkZXJzOiB7XG4gICAgICBzdWJqZWN0Pzogc3RyaW5nW107XG4gICAgICAnY29udGVudC10eXBlJz86IHN0cmluZ1tdO1xuICAgICAgW2tleTogc3RyaW5nXTogc3RyaW5nW10gfCB1bmRlZmluZWQ7XG4gICAgfSA9IHt9O1xuICAgIGxldCBsYXN0SGVhZGVyTmFtZTogc3RyaW5nO1xuICAgIGxldCBib3VuZGFyeTogc3RyaW5nO1xuICAgIGxldCB0ZXh0Qm9keTogc3RyaW5nID0gJyc7XG4gICAgbGV0IGZpbGVOYW1lOiBzdHJpbmc7XG4gICAgbGV0IGZpbGVXcml0ZXI6IGZzLldyaXRlU3RyZWFtO1xuICAgIGxldCBhdHRhY2hlbWVudEZpbGU6IHN0cmluZztcblxuICAgIGNvbnN0IG9yaWdpbkxvZ0VuYWJsZWQgPSBsb2dFbmFibGVkO1xuICAgIGxvZ0VuYWJsZWQgPSBoZWFkZXJPbmx5O1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseShgRkVUQ0ggJHttYWlsSWR4fSBSRkM4MjIke2hlYWRlck9ubHkgPyAnLkhFQURFUicgOiAnJ31gLCAobGluZSkgPT4ge1xuICAgICAgc3dpdGNoIChzdGF0ZSkge1xuICAgICAgICBjYXNlIEZldGNoU3RhdGUuc3RhcnQ6XG4gICAgICAgICAgaWYgKC9eXFwqXFxzK1swLTldK1xccytGRVRDSFxccysvLnRlc3QobGluZSkpIHtcbiAgICAgICAgICAgIHN0YXRlID0gRmV0Y2hTdGF0ZS5oZWFkZXJzO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBGZXRjaFN0YXRlLmhlYWRlcnM6XG4gICAgICAgICAgaWYgKC9eXFxzLy50ZXN0KGxpbmUpKSB7XG4gICAgICAgICAgICBjb25zdCBpdGVtcyA9IGhlYWRlcnNbbGFzdEhlYWRlck5hbWVdITtcbiAgICAgICAgICAgIGl0ZW1zLnB1c2goLi4ubGluZS5zcGxpdCgnOycpLm1hcChpdGVtID0+IGl0ZW0udHJpbSgpKS5maWx0ZXIoaXRlbSA9PiBpdGVtLmxlbmd0aCA+IDApKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAobGluZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHN0YXRlID0gRmV0Y2hTdGF0ZS5oZWFkZXJzRW5kO1xuXG4gICAgICAgICAgICBjb25zdCBub3JtYWxpemVkSGVhZGVyczogdHlwZW9mIGhlYWRlcnMgPSB7fTtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGhlYWRlcnMpLmZvckVhY2goa2V5ID0+IG5vcm1hbGl6ZWRIZWFkZXJzW2tleS50b0xvd2VyQ2FzZSgpXSA9IGhlYWRlcnNba2V5XSk7XG4gICAgICAgICAgICBoZWFkZXJzID0gbm9ybWFsaXplZEhlYWRlcnM7XG5cbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnRUeXBlID0gaGVhZGVyc1snY29udGVudC10eXBlJ107XG4gICAgICAgICAgICBpZiAoIWNvbnRlbnRUeXBlKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBDb250ZW50LVR5cGUgaW4gaGVhZGVyczogJHtKU09OLnN0cmluZ2lmeShoZWFkZXJzLCBudWxsLCAnICAnKX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGh0dHBzOi8vd3d3LnczLm9yZy9Qcm90b2NvbHMvcmZjMTM0MS83XzJfTXVsdGlwYXJ0Lmh0bWxcbiAgICAgICAgICAgIGlmIChjb250ZW50VHlwZVswXSAhPT0gJ211bHRpcGFydC9taXhlZCcpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgnTm8gc3VwcG9ydCBmb3IgY29udGVudC10eXBlOiAnICsgY29udGVudFR5cGVbMF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYm91bmRhcnkgPSBjb250ZW50VHlwZS5maW5kKGl0ZW0gPT4gaXRlbS5zdGFydHNXaXRoKCdib3VuZGFyeT0nKSkhO1xuICAgICAgICAgICAgYm91bmRhcnkgPSAnLS0nICsgL15bXCInXT8oLio/KVtcIiddPyQvLmV4ZWMoYm91bmRhcnkuc2xpY2UoJ2JvdW5kYXJ5PScubGVuZ3RoKSkhWzFdO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IG0gPSAvXihbXjpdKylcXDooLiopJC8uZXhlYyhsaW5lKTtcbiAgICAgICAgICBpZiAobSkge1xuICAgICAgICAgICAgaGVhZGVyc1ttWzFdXSA9IG1bMl0uc3BsaXQoJzsnKS5tYXAoaXRlbSA9PiBpdGVtLnRyaW0oKSkuZmlsdGVyKGl0ZW0gPT4gaXRlbS5sZW5ndGggPiAwKTtcbiAgICAgICAgICAgIGxhc3RIZWFkZXJOYW1lID0gbVsxXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgRmV0Y2hTdGF0ZS5oZWFkZXJzRW5kOlxuICAgICAgICAgIGlmIChsaW5lID09PSBib3VuZGFyeSkge1xuICAgICAgICAgICAgc3RhdGUgPSBGZXRjaFN0YXRlLnRleHRIZWFkZXJzO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBGZXRjaFN0YXRlLnRleHRIZWFkZXJzOlxuICAgICAgICAgIGlmIChsaW5lLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgIHN0YXRlID0gRmV0Y2hTdGF0ZS50ZXh0Qm9keTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBGZXRjaFN0YXRlLnRleHRCb2R5OlxuICAgICAgICAgIGlmIChsaW5lID09PSBib3VuZGFyeSkge1xuICAgICAgICAgICAgdGV4dEJvZHkgPSB0ZXh0Qm9keS5zbGljZSgwLCB0ZXh0Qm9keS5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgIHN0YXRlID0gRmV0Y2hTdGF0ZS5hdHRhY2htZW50SGVhZGVycztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0ZXh0Qm9keSArPSBsaW5lICsgJ1xcbic7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgRmV0Y2hTdGF0ZS5hdHRhY2htZW50SGVhZGVyczpcbiAgICAgICAgICBpZiAobGluZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHN0YXRlID0gRmV0Y2hTdGF0ZS5hdHRhY2hlbWVudEJvZHk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFmaWxlTmFtZSkge1xuICAgICAgICAgICAgY29uc3QgZm91bmQgPSAvZmlsZW5hbWU9W1wiJyBdPyhbXidcIiBdKylbXCInIF0/JC8uZXhlYyhsaW5lKTtcbiAgICAgICAgICAgIGlmIChmb3VuZClcbiAgICAgICAgICAgICAgZmlsZU5hbWUgPSBmb3VuZFsxXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgRmV0Y2hTdGF0ZS5hdHRhY2hlbWVudEJvZHk6XG4gICAgICAgICAgaWYgKGxpbmUuaW5kZXhPZihib3VuZGFyeSkgPj0wICkge1xuICAgICAgICAgICAgc3RhdGUgPSBGZXRjaFN0YXRlLmVuZDtcbiAgICAgICAgICAgIGlmIChmaWxlV3JpdGVyKSB7XG4gICAgICAgICAgICAgIGZpbGVXcml0ZXIuZW5kKCgpID0+IHtcbiAgICAgICAgICAgICAgICBsb2cuaW5mbygnZmlsZSBlbmQgZG9uZTonLCBhdHRhY2hlbWVudEZpbGUpO1xuICAgICAgICAgICAgICAgIGZpbGVXcml0aW5nU3RhdGUuZ2V0VmFsdWUoKS5kZWxldGUoYXR0YWNoZW1lbnRGaWxlKTtcbiAgICAgICAgICAgICAgICBmaWxlV3JpdGluZ1N0YXRlLm5leHQoZmlsZVdyaXRpbmdTdGF0ZS5nZXRWYWx1ZSgpKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFmaWxlV3JpdGVyKSB7XG4gICAgICAgICAgICBhdHRhY2hlbWVudEZpbGUgPSBvdmVycmlkZUZpbGVOYW1lIHx8IFBhdGgucmVzb2x2ZSgnZGlzdC8nICsgZmlsZU5hbWUpO1xuICAgICAgICAgICAgZnMubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUoYXR0YWNoZW1lbnRGaWxlKSk7XG4gICAgICAgICAgICBmaWxlV3JpdGVyID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0oYXR0YWNoZW1lbnRGaWxlKTtcbiAgICAgICAgICAgIGZpbGVXcml0aW5nU3RhdGUuZ2V0VmFsdWUoKS5hZGQoYXR0YWNoZW1lbnRGaWxlKTtcbiAgICAgICAgICAgIGZpbGVXcml0aW5nU3RhdGUubmV4dChmaWxlV3JpdGluZ1N0YXRlLmdldFZhbHVlKCkpO1xuICAgICAgICAgICAgbG9nLmluZm8oJ0NyZWF0ZSBhdHRhY2hlbWVudCBmaWxlOiAnLCBhdHRhY2hlbWVudEZpbGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBsb2cud2FybignYm91bmRhcnknLCBib3VuZGFyeSk7XG4gICAgICAgICAgLy8gVE9ETzogd2FpdCBmb3IgZHJhaW5lZFxuICAgICAgICAgIGZpbGVXcml0ZXIud3JpdGUoQnVmZmVyLmZyb20obGluZSwgJ2Jhc2U2NCcpKTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgIH1cbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoMCk7XG4gICAgfSk7XG4gICAgbG9nRW5hYmxlZCA9IG9yaWdpbkxvZ0VuYWJsZWQ7XG5cbiAgICByZXR1cm4ge1xuICAgICAgaGVhZGVycyxcbiAgICAgIHRleHRCb2R5LFxuICAgICAgZmlsZU5hbWU6IGZpbGVOYW1lIVxuICAgIH07XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBmaW5kTWFpbChmcm9tSW5keDogbnVtYmVyLCBzdWJqZWN0OiBzdHJpbmcpOiBQcm9taXNlPG51bWJlciB8IHVuZGVmaW5lZD4ge1xuICAgIGxvZy5pbmZvKCdmaW5kTWFpbCcsIGZyb21JbmR4LCBzdWJqZWN0KTtcbiAgICB3aGlsZSAoZnJvbUluZHggPiAwKSB7XG4gICAgICBjb25zdCByZXMgPSBhd2FpdCB3YWl0Rm9yRmV0Y2goZnJvbUluZHgpO1xuICAgICAgaWYgKHJlcy5oZWFkZXJzLnN1YmplY3QgJiYgcmVzLmhlYWRlcnMuc3ViamVjdFswXS5pbmRleE9mKHN1YmplY3QpID49IDApXG4gICAgICAgIHJldHVybiBmcm9tSW5keDtcbiAgICAgIGZyb21JbmR4LS07XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyByZXR1cm4gc29ja2V0O1xufVxuXG5leHBvcnQgY2xhc3MgSW1hcE1hbmFnZXIge1xuICAvLyBjaGVja3N1bTogQ2hlY2tzdW07XG4gIGNoZWNrc3VtU3RhdGUgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PENoZWNrc3VtIHwgbnVsbD4obnVsbCk7XG4gIGZpbGVXcml0aW5nU3RhdGU6IEltYXBDb21tYW5kQ29udGV4dFsnZmlsZVdyaXRpbmdTdGF0ZSddO1xuICB3YXRjaGluZyA9IGZhbHNlO1xuICBwcml2YXRlIHRvRmV0Y2hBcHBzU3RhdGUgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PHN0cmluZ1tdPihbXSk7XG4gIC8vIHByaXZhdGUgIHppcERvd25sb2FkRGlyOiBzdHJpbmc7XG4gIC8vIHByaXZhdGUgaW1hcEFjdGlvbnMgPSBuZXcgU3ViamVjdDwoY3R4OiBJbWFwQ29tbWFuZENvbnRleHQpID0+IFByb21pc2U8YW55Pj4oKTtcblxuICBwcml2YXRlIGN0eDogSW1hcENvbW1hbmRDb250ZXh0O1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBlbnY6IHN0cmluZywgcHVibGljIHppcERvd25sb2FkRGlyPzogc3RyaW5nKSB7XG4gICAgaWYgKHppcERvd25sb2FkRGlyID09IG51bGwpXG4gICAgICB0aGlzLnppcERvd25sb2FkRGlyID0gUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShjdXJyQ2hlY2tzdW1GaWxlKSwgJ2RlcGxveS1zdGF0aWMtJyArIGVudik7XG4gIH1cblxuICBhc3luYyBmZXRjaENoZWNrc3VtKCk6IFByb21pc2U8Q2hlY2tzdW0gfCB1bmRlZmluZWQ+ICB7XG4gICAgbGV0IGNzOiBDaGVja3N1bSB8IHVuZGVmaW5lZDtcbiAgICBhd2FpdCBjb25uZWN0SW1hcChhc3luYyBjdHggPT4ge1xuICAgICAgY3MgPSBhd2FpdCB0aGlzLl9mZXRjaENoZWNrc3VtKGN0eCk7XG4gICAgfSk7XG4gICAgbG9nLmluZm8oJ2ZldGNoZWQgY2hlY2tzdW06JywgY3MpO1xuICAgIHRoaXMuY2hlY2tzdW1TdGF0ZS5uZXh0KGNzISk7XG4gICAgcmV0dXJuIGNzO1xuICB9XG5cbiAgYXN5bmMgZmV0Y2hVcGRhdGVDaGVja1N1bShhcHBOYW1lOiBzdHJpbmcpOiBQcm9taXNlPENoZWNrc3VtPiB7XG4gICAgbGV0IGNzID0gYXdhaXQgdGhpcy5mZXRjaENoZWNrc3VtKCk7XG4gICAgbG9nLmluZm8oJ2ZldGNoZWQgY2hlY2tzdW06JywgY3MpO1xuICAgIGlmIChjcyEudmVyc2lvbnMhW2FwcE5hbWVdID09IG51bGwpIHtcbiAgICAgIGNzIS52ZXJzaW9ucyFbYXBwTmFtZV0gPSB7XG4gICAgICAgIHZlcnNpb246IDAsXG4gICAgICAgIHBhdGg6ICc8c2VlIGF0dGFjaGVtZW50IGZpbGUgbmFtZT4nXG4gICAgICB9O1xuICAgIH1cbiAgICBjcyEudmVyc2lvbnMhW2FwcE5hbWVdLnZlcnNpb24rKztcbiAgICB0aGlzLmNoZWNrc3VtU3RhdGUubmV4dChjcyEpO1xuICAgIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKGN1cnJDaGVja3N1bUZpbGUpKTtcbiAgICBjb25zdCBjaGVja3N1bVN0ciA9IEpTT04uc3RyaW5naWZ5KGNzISwgbnVsbCwgJyAgJyk7XG4gICAgZnMud3JpdGVGaWxlU3luYyhjdXJyQ2hlY2tzdW1GaWxlLCBjaGVja3N1bVN0cik7XG4gICAgbG9nLmluZm8oJ3dyaXRlICVzXFxuJXMnLCBjdXJyQ2hlY2tzdW1GaWxlLCBjaGVja3N1bVN0cik7XG4gICAgcmV0dXJuIGNzITtcbiAgfVxuXG4gIC8qKlxuICAgKiBEb25lIHdoZW4gZmlsZXMgYXJlIHdyaXR0ZW5cbiAgICogQHBhcmFtIGV4Y2x1ZGVBcHAgZXhjbHVkZSBhcHBcbiAgICovXG4gIGFzeW5jIGZldGNoT3RoZXJaaXBzKGV4Y2x1ZGVBcHA/OiBzdHJpbmcpIHtcbiAgICBsZXQgYXBwTmFtZXMgPSBPYmplY3Qua2V5cyh0aGlzLmNoZWNrc3VtU3RhdGUuZ2V0VmFsdWUoKSEudmVyc2lvbnMhKVxuICAgIC5maWx0ZXIoYXBwID0+IGFwcCAhPT0gZXhjbHVkZUFwcCk7XG5cbiAgICBsZXQgZmlsZVdyaXR0ZW5Qcm9tOiBQcm9taXNlPGJvb2xlYW4+IHwgdW5kZWZpbmVkO1xuXG4gICAgYXdhaXQgY29ubmVjdEltYXAoYXN5bmMgY3R4ID0+IHtcblxuICAgICAgZmlsZVdyaXR0ZW5Qcm9tID0gY3R4LmZpbGVXcml0aW5nU3RhdGUucGlwZShcbiAgICAgICAgc2tpcCgxKSxcbiAgICAgICAgZmlsdGVyKHdyaXRpbmcgPT4gIXdyaXRpbmcpLFxuICAgICAgICB0YWtlKGFwcE5hbWVzLmxlbmd0aClcbiAgICAgICkudG9Qcm9taXNlKCk7XG5cbiAgICAgIGZvciAoY29uc3QgYXBwIG9mIGFwcE5hbWVzKSB7XG4gICAgICAgIGxvZy5pbmZvKCdmZXRjaCBvdGhlciB6aXA6ICcgKyBhcHApO1xuICAgICAgICBjb25zdCBpZHggPSBhd2FpdCBjdHguZmluZE1haWwoY3R4Lmxhc3RJbmRleCwgYGJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LSR7YXBwfSlgKTtcbiAgICAgICAgaWYgKCFpZHgpIHtcbiAgICAgICAgICBsb2cuaW5mbyhgbWFpbCBcImJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LSR7YXBwfSlcIiBpcyBub3QgRm91bmQsIHNraXAgZG93bmxvYWQgemlwYCk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgY3R4LndhaXRGb3JGZXRjaChpZHgsIGZhbHNlLCBQYXRoLnJlc29sdmUodGhpcy56aXBEb3dubG9hZERpciEsIGFwcCArICcuemlwJykpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmIChmaWxlV3JpdHRlblByb20pXG4gICAgICBhd2FpdCBmaWxlV3JpdHRlblByb207XG4gICAgcmV0dXJuIGFwcE5hbWVzO1xuICB9XG5cbiAgYXN5bmMgc3RhcnRXYXRjaE1haWwocG9sbEludGVydmFsID0gNjAwMDApIHtcbiAgICB0aGlzLndhdGNoaW5nID0gdHJ1ZTtcbiAgICB3aGlsZSAodGhpcy53YXRjaGluZykge1xuICAgICAgYXdhaXQgdGhpcy5jaGVja01haWxGb3JVcGRhdGUoKTtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBwb2xsSW50ZXJ2YWwpKTsgLy8gNjAgc2VjXG4gICAgfVxuICB9XG5cbiAgYXN5bmMgY2hlY2tNYWlsRm9yVXBkYXRlKCkge1xuICAgIGF3YWl0IGNvbm5lY3RJbWFwKGFzeW5jIGN0eCA9PiB7XG4gICAgICB0aGlzLmN0eCA9IGN0eDtcbiAgICAgIHRoaXMuZmlsZVdyaXRpbmdTdGF0ZSA9IGN0eC5maWxlV3JpdGluZ1N0YXRlO1xuXG4gICAgICBjb25zdCBjcyA9IGF3YWl0IHRoaXMuX2ZldGNoQ2hlY2tzdW0oY3R4KTtcbiAgICAgIHRoaXMuY2hlY2tzdW1TdGF0ZS5uZXh0KGNzISk7XG5cbiAgICAgIGNvbnN0IHRvRmV0Y2hBcHBzID0gdGhpcy50b0ZldGNoQXBwc1N0YXRlLmdldFZhbHVlKCk7XG4gICAgICBpZiAodG9GZXRjaEFwcHMubGVuZ3RoID4gMCkge1xuICAgICAgICB0aGlzLnRvRmV0Y2hBcHBzU3RhdGUubmV4dChbXSk7XG4gICAgICAgIGZvciAoY29uc3QgYXBwTmFtZSBvZiB0b0ZldGNoQXBwcykge1xuICAgICAgICAgIGF3YWl0IHRoaXMuZmV0Y2hBdHRhY2htZW50KGFwcE5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBhd2FpdCBjdHgud2FpdEZvclJlcGx5KCdTVUJTQ1JJQkUgSU5CT1gnKTtcbiAgICAgIC8vIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAzMDAwMCkpOyAvLyAzMCBzZWNcbiAgICAgIGRlbGV0ZSB0aGlzLmN0eDtcbiAgICB9KTtcbiAgfVxuXG4gIGZldGNoQXBwRHVyaW5nV2F0Y2hBY3Rpb24oLi4uYXBwTmFtZXM6IHN0cmluZ1tdKSB7XG4gICAgdGhpcy50b0ZldGNoQXBwc1N0YXRlLm5leHQoYXBwTmFtZXMpO1xuICB9XG5cbiAgYXN5bmMgc2VuZEZpbGVBbmRVcGRhdGVkQ2hlY2tzdW0oYXBwTmFtZTogc3RyaW5nLCBmaWxlOiBzdHJpbmcpIHtcbiAgICBjb25zdCBjcyA9IGF3YWl0IHRoaXMuZmV0Y2hVcGRhdGVDaGVja1N1bShhcHBOYW1lKTtcbiAgICBhd2FpdCByZXRyeVNlbmRNYWlsKGBia2prLXByZS1idWlsZCgke3RoaXMuZW52fS0ke2FwcE5hbWV9KWAsIEpTT04uc3RyaW5naWZ5KGNzLCBudWxsLCAnICAnKSwgZmlsZSk7XG4gIH1cblxuICBzdG9wV2F0Y2goKSB7XG4gICAgdGhpcy53YXRjaGluZyA9IGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBmZXRjaEF0dGFjaG1lbnQoYXBwOiBzdHJpbmcpIHtcbiAgICBjb25zdCBpZHggPSBhd2FpdCB0aGlzLmN0eC5maW5kTWFpbCh0aGlzLmN0eC5sYXN0SW5kZXgsIGBia2prLXByZS1idWlsZCgke3RoaXMuZW52fS0ke2FwcH0pYCk7XG4gICAgaWYgKGlkeCA9PSBudWxsKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW50IGZpbmQgbWFpbDogJyArIGBia2prLXByZS1idWlsZCgke3RoaXMuZW52fS0ke2FwcH0pYCk7XG4gICAgYXdhaXQgdGhpcy5jdHgud2FpdEZvckZldGNoKGlkeCEsIGZhbHNlLCBQYXRoLnJlc29sdmUodGhpcy56aXBEb3dubG9hZERpciEsIGAke2FwcH0uemlwYCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBfZmV0Y2hDaGVja3N1bShjdHg6IEltYXBDb21tYW5kQ29udGV4dCkge1xuICAgIGNvbnN0IGlkeCA9IGF3YWl0IGN0eC5maW5kTWFpbChjdHgubGFzdEluZGV4LCBgYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tYCk7XG4gICAgbG9nLmluZm8oJ19mZXRjaENoZWNrc3VtLCBpbmRleDonLCBpZHgpO1xuICAgIGlmIChpZHggPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHt2ZXJzaW9uczoge319O1xuICAgIH1cbiAgICByZXR1cm4gSlNPTi5wYXJzZShhd2FpdCBjdHgud2FpdEZvckZldGNoVGV4dChpZHghKSkgYXMgQ2hlY2tzdW07XG4gIH1cblxufVxuIl19
