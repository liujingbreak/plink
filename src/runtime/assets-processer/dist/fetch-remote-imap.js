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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS1pbWFwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDJDQUE2QztBQUU3QywrQkFBa0U7QUFDbEUsOENBQzRDO0FBQzVDLDZCQUEwRTtBQUMxRSxnRUFBMEI7QUFFMUIsd0RBQXdCO0FBQ3hCLCtDQUErRTtBQUMvRSwwREFBd0I7QUFDeEIsOEJBQThCO0FBQzlCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxvQkFBb0IsQ0FBQyxDQUFDO0FBR2hGLFNBQXNCLFFBQVEsQ0FBQyxPQUFlLEVBQUUsSUFBWSxFQUFFLElBQWE7O1FBQ3pFLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEIsTUFBTSxFQUNKLGVBQWUsRUFBRSxFQUNmLElBQUksRUFBRSxLQUFLLEVBQ1gsV0FBVyxFQUFFLE1BQU07UUFDbkIsY0FBYztRQUNkLElBQUksRUFBRSxJQUFJLEVBQ1gsRUFDRixHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQXlCLENBQUM7UUFFNUQsTUFBTSxXQUFXLEdBQUcsNEJBQWUsQ0FBQztZQUNsQyxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRTtnQkFDSixJQUFJLEVBQUUsT0FBTztnQkFDYixJQUFJLEVBQUUsS0FBSztnQkFDWCxJQUFJLEVBQUUsTUFBTTthQUNiO1lBQ0QsTUFBTSxFQUFFLElBQUk7U0FDWSxDQUFDLENBQUM7UUFFNUIsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN0QixNQUFNLElBQUksR0FBRyxNQUFNLFdBQVcsQ0FBQyxRQUFRLENBQUM7WUFDdEMsSUFBSSxFQUFFLEtBQUs7WUFDWCxFQUFFLEVBQUUsS0FBSztZQUNULE9BQU8sRUFBRSxtQkFBbUIsT0FBTyxFQUFFO1lBQ3JDLElBQUk7WUFDSixXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDbEI7b0JBQ0UsUUFBUSxFQUFFLGNBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO29CQUM3QixJQUFJLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7aUJBQ3pCO2FBQ0YsQ0FBQyxDQUFDLENBQUMsU0FBUztTQUNkLENBQUMsQ0FBQztRQUVILEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDakIsQ0FBQztDQUFBO0FBcENELDRCQW9DQztBQUVELFNBQXNCLGFBQWEsQ0FBQyxPQUFlLEVBQUUsSUFBWSxFQUFFLElBQWE7O1FBQzlFLElBQUksS0FBd0IsQ0FBQztRQUM3QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzFCLElBQUk7Z0JBQ0YsTUFBTSxRQUFRLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDcEMsS0FBSyxHQUFHLFNBQVMsQ0FBQztnQkFDbEIsTUFBTTthQUNQO1lBQUMsT0FBTyxHQUFHLEVBQUU7Z0JBQ1osR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQzNCLEtBQUssR0FBRyxHQUFHLENBQUM7Z0JBQ1osTUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQzthQUN6RDtTQUNGO1FBQ0QsSUFBSSxLQUFLLEVBQUU7WUFDVCxNQUFNLEtBQUssQ0FBQztTQUNiO0lBQ0gsQ0FBQztDQUFBO0FBaEJELHNDQWdCQztBQUVELElBQUssVUFTSjtBQVRELFdBQUssVUFBVTtJQUNiLDZDQUFTLENBQUE7SUFDVCxpREFBTyxDQUFBO0lBQ1AsdURBQVUsQ0FBQTtJQUNWLHlEQUFXLENBQUE7SUFDWCxtREFBUSxDQUFBO0lBQ1IscUVBQWlCLENBQUE7SUFDakIsaUVBQWUsQ0FBQTtJQUNmLHlDQUFHLENBQUE7QUFDTCxDQUFDLEVBVEksVUFBVSxLQUFWLFVBQVUsUUFTZDtBQW9CRDs7Ozs7O0dBTUc7QUFDSCxTQUFzQixXQUFXLENBQUMsUUFBdUQ7O1FBQ3ZGLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNiLE1BQU0sV0FBVyxHQUFHLElBQUksY0FBTyxFQUFVLENBQUM7UUFDMUMsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDO1FBQ3RCLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQztRQUNmLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxzQkFBZSxDQUFjLElBQUksR0FBRyxFQUFVLENBQUMsQ0FBQztRQUU3RSxNQUFNLEVBQ0osZUFBZSxFQUFFLEVBQ2YsSUFBSSxFQUFFLEtBQUssRUFDWCxXQUFXLEVBQUUsTUFBTSxFQUNuQixJQUFJLEVBQUUsSUFBSTtRQUNWLGFBQWE7VUFDZCxFQUNGLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBeUIsQ0FBQztRQUU1RCxNQUFNLE9BQU8sR0FBOEQsRUFBRSxDQUFDO1FBRTlFLE9BQU8sQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO1FBQ3BDLE9BQU8sQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO1FBQ3BDLE9BQU8sQ0FBQyxnQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQztRQUM1QyxPQUFPLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUM1QixPQUFPLENBQUMsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUM5QyxlQUFHLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDWiwyQ0FBMkM7WUFDM0MsT0FBTyxPQUFPLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQztRQUMxQixDQUFDLENBQUMsRUFDRixnQ0FBb0IsRUFBRSxDQUN2QixDQUFDO1FBRUYsK0NBQStDO1FBQy9DLHNDQUFzQztRQUN0QyxNQUFNO1FBRU4sSUFBSSxNQUEyQixDQUFDO1FBQ2hDLElBQUk7WUFDRixNQUFNLEdBQUcsTUFBTSxJQUFJLE9BQU8sQ0FBZ0MsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQzVFLE1BQU0sTUFBTSxHQUFHLGFBQVUsQ0FBQztvQkFDeEIsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRztvQkFDckIsV0FBVyxFQUFFLElBQUk7aUJBQ0csQ0FBQyxDQUFDO2dCQUV4QixNQUFNLENBQUMsRUFBRSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7b0JBQzlCLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUM7b0JBQ3pFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbEIsQ0FBQyxDQUFDO3FCQUNELEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7cUJBQy9CLEVBQUUsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbkQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFeEUsT0FBTyxNQUFNLENBQUM7WUFDaEIsQ0FBQyxDQUFDLENBQUM7WUFDTCx1Q0FBdUM7WUFDckMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLFlBQVksRUFBRSxDQUFDLENBQUM7WUFDbEMsTUFBTSxZQUFZLENBQUMsd0RBQXdELENBQUMsQ0FBQztZQUM3RSxNQUFNLFlBQVksQ0FBQyxTQUFTLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQy9DLE1BQU0sWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBRW5DLElBQUksUUFBZ0IsQ0FBQztZQUNyQixNQUFNLFlBQVksQ0FBQyxVQUFVLEVBQUUsQ0FBTSxJQUFJLEVBQUMsRUFBRTtnQkFDMUMsSUFBSSxRQUFRLElBQUksSUFBSTtvQkFDbEIsT0FBTztnQkFDVCxNQUFNLENBQUMsR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzVDLElBQUksQ0FBQyxFQUFFO29CQUNMLFFBQVEsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2lCQUMvQjtZQUNILENBQUMsQ0FBQSxDQUFDLENBQUM7WUFFSCxPQUFPLENBQUMsU0FBUyxHQUFHLFFBQVMsQ0FBQztZQUM5QixNQUFNLFFBQVEsQ0FBQyxPQUE2QixDQUFDLENBQUM7WUFDOUMsTUFBTSxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDOUI7UUFBQyxPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUk7Z0JBQ0YsTUFBTSxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDOUI7WUFBQyxPQUFPLEVBQUUsRUFBRSxHQUFFO1lBQ2YsSUFBSSxNQUFNO2dCQUNSLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNmLE1BQU0sRUFBRSxDQUFDO1NBQ1Y7UUFFRCxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFYixTQUFTLFdBQVcsQ0FBQyxHQUFXO1lBQzlCLEdBQUcsSUFBSSxHQUFHLENBQUM7WUFDWCxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztnQkFDdkIsT0FBTztZQUNULE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUMxQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDOUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN0RSxDQUFDO1FBRUQsU0FBUyxXQUFXLENBQUMsSUFBWTtZQUMvQixJQUFJLFVBQVU7Z0JBQ1osR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDMUIsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QixDQUFDO1FBRUQsU0FBZSxnQkFBZ0IsQ0FBQyxLQUFhOztnQkFDM0MsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDO2dCQUNiLE1BQU0sWUFBWSxDQUFDLFNBQVMsS0FBSyxVQUFVLEVBQUUsQ0FBTSxJQUFJLEVBQUMsRUFBRTtvQkFDeEQsR0FBRyxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7Z0JBQ3JCLENBQUMsQ0FBQSxDQUFDLENBQUM7Z0JBQ0gsaUJBQWlCO2dCQUNqQixPQUFPLDRDQUE0QyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwRSxDQUFDO1NBQUE7UUFFRCxTQUFTLFlBQVksQ0FBQyxPQUFnQixFQUFFLE1BQW9EO1lBQzFGLElBQUksR0FBVyxDQUFDO1lBQ2hCLElBQUksT0FBTztnQkFDVCxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUV6QixJQUFJLE1BQU0sR0FBdUIsV0FBVyxDQUFDO1lBQzdDLElBQUksTUFBTSxFQUFFO2dCQUNWLE1BQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUNsQixxQkFBUyxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUNmLE9BQU8sV0FBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNuRCxDQUFDLENBQUMsQ0FDSCxDQUFDO2FBQ0g7WUFDRCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUN0QixlQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ1QsTUFBTSxLQUFLLEdBQUcsaUNBQWlDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMzRCxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtvQkFDdkMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUU7d0JBQzFDLG9DQUFvQzt3QkFDcEMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztxQkFDcEM7eUJBQU07d0JBQ0wsTUFBTSxJQUFJLEtBQUssQ0FBQyxVQUFVLElBQUksRUFBRSxDQUFDLENBQUM7cUJBQ25DO2lCQUNGO3FCQUFNO29CQUNMLE9BQU8sSUFBSSxDQUFDO2lCQUNiO1lBQ0gsQ0FBQyxDQUFDLEVBQ0YscUJBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sSUFBSSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQ3pDLG9CQUFRLENBQUMsQ0FBQyxDQUFDLENBQ1osQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUVkLElBQUksT0FBTyxFQUFFO2dCQUNYLE1BQU0sR0FBRyxHQUFHLEdBQUksR0FBRyxHQUFHLEdBQUcsT0FBTyxDQUFDO2dCQUNqQyxJQUFJLE1BQU07b0JBQ1IsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBSSxJQUFJLE9BQU8sTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQzlELEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2FBQ3RCO1lBRUQsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBRUQsU0FBZSxZQUFZLENBQUMsVUFBMkIsR0FBRyxFQUFFLFVBQVUsR0FBRyxJQUFJLEVBQUUsZ0JBQXlCOztnQkFDdEcsSUFBSSxLQUFLLEdBQWUsVUFBVSxDQUFDLEtBQUssQ0FBQztnQkFDekMsSUFBSSxPQUFPLEdBSVAsRUFBRSxDQUFDO2dCQUNQLElBQUksY0FBc0IsQ0FBQztnQkFDM0IsSUFBSSxRQUFnQixDQUFDO2dCQUNyQixJQUFJLFFBQVEsR0FBVyxFQUFFLENBQUM7Z0JBQzFCLElBQUksUUFBZ0IsQ0FBQztnQkFDckIsSUFBSSxVQUEwQixDQUFDO2dCQUMvQixJQUFJLGVBQXVCLENBQUM7Z0JBRTVCLE1BQU0sZ0JBQWdCLEdBQUcsVUFBVSxDQUFDO2dCQUNwQyxVQUFVLEdBQUcsVUFBVSxDQUFDO2dCQUN4QixNQUFNLFlBQVksQ0FBQyxTQUFTLE9BQU8sVUFBVSxVQUFVLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtvQkFDbkYsUUFBUSxLQUFLLEVBQUU7d0JBQ2IsS0FBSyxVQUFVLENBQUMsS0FBSzs0QkFDbkIsSUFBSSx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0NBQ3hDLEtBQUssR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDOzZCQUM1Qjs0QkFDRCxNQUFNO3dCQUNSLEtBQUssVUFBVSxDQUFDLE9BQU87NEJBQ3JCLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtnQ0FDcEIsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBRSxDQUFDO2dDQUN2QyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0NBQ3hGLE1BQU07NkJBQ1A7NEJBQ0QsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQ0FDckIsS0FBSyxHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUM7Z0NBRTlCLE1BQU0saUJBQWlCLEdBQW1CLEVBQUUsQ0FBQztnQ0FDN0MsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQ0FDekYsT0FBTyxHQUFHLGlCQUFpQixDQUFDO2dDQUU1QixNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7Z0NBQzVDLElBQUksQ0FBQyxXQUFXLEVBQUU7b0NBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsb0NBQW9DLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7aUNBQzVGO2dDQUNELDBEQUEwRDtnQ0FDMUQsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssaUJBQWlCLEVBQUU7b0NBQ3hDLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQywrQkFBK0IsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQ0FDMUU7Z0NBQ0QsUUFBUSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFFLENBQUM7Z0NBQ25FLFFBQVEsR0FBRyxJQUFJLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0NBQ25GLE1BQU07NkJBQ1A7NEJBQ0QsTUFBTSxDQUFDLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOzRCQUN2QyxJQUFJLENBQUMsRUFBRTtnQ0FDTCxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dDQUN6RixjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzZCQUN2Qjs0QkFDRCxNQUFNO3dCQUNSLEtBQUssVUFBVSxDQUFDLFVBQVU7NEJBQ3hCLElBQUksSUFBSSxLQUFLLFFBQVEsRUFBRTtnQ0FDckIsS0FBSyxHQUFHLFVBQVUsQ0FBQyxXQUFXLENBQUM7NkJBQ2hDOzRCQUNELE1BQU07d0JBQ1IsS0FBSyxVQUFVLENBQUMsV0FBVzs0QkFDekIsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUM7Z0NBQ25CLEtBQUssR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDOzRCQUM5QixNQUFNO3dCQUNSLEtBQUssVUFBVSxDQUFDLFFBQVE7NEJBQ3RCLElBQUksSUFBSSxLQUFLLFFBQVEsRUFBRTtnQ0FDckIsUUFBUSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0NBQ2xELEtBQUssR0FBRyxVQUFVLENBQUMsaUJBQWlCLENBQUM7Z0NBQ3JDLE1BQU07NkJBQ1A7NEJBQ0QsUUFBUSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7NEJBQ3hCLE1BQU07d0JBQ1IsS0FBSyxVQUFVLENBQUMsaUJBQWlCOzRCQUMvQixJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dDQUNyQixLQUFLLEdBQUcsVUFBVSxDQUFDLGVBQWUsQ0FBQztnQ0FDbkMsTUFBTTs2QkFDUDs0QkFDRCxJQUFJLENBQUMsUUFBUSxFQUFFO2dDQUNiLE1BQU0sS0FBSyxHQUFHLGlDQUFpQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQ0FDM0QsSUFBSSxLQUFLO29DQUNQLFFBQVEsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7NkJBQ3ZCOzRCQUNELE1BQU07d0JBQ1IsS0FBSyxVQUFVLENBQUMsZUFBZTs0QkFDN0IsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFHLENBQUMsRUFBRztnQ0FDL0IsS0FBSyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUM7Z0NBQ3ZCLElBQUksVUFBVSxFQUFFO29DQUNkLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFO3dDQUNsQixHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLGVBQWUsQ0FBQyxDQUFDO3dDQUM1QyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUM7d0NBQ3BELGdCQUFnQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO29DQUNyRCxDQUFDLENBQUMsQ0FBQztpQ0FDSjtnQ0FDRCxNQUFNOzZCQUNQOzRCQUNELElBQUksQ0FBQyxVQUFVLEVBQUU7Z0NBQ2YsZUFBZSxHQUFHLGdCQUFnQixJQUFJLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxDQUFDO2dDQUN2RSxVQUFVLEdBQUcsa0JBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsQ0FBQztnQ0FDbkQsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO2dDQUNqRCxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztnQ0FDbkQsR0FBRyxDQUFDLElBQUksQ0FBQywyQkFBMkIsRUFBRSxlQUFlLENBQUMsQ0FBQzs2QkFDeEQ7NEJBQ0Qsa0NBQWtDOzRCQUNsQyx5QkFBeUI7NEJBQ3pCLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQzt3QkFDaEQsUUFBUTtxQkFDVDtvQkFDRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzVCLENBQUMsQ0FBQyxDQUFDO2dCQUNILFVBQVUsR0FBRyxnQkFBZ0IsQ0FBQztnQkFFOUIsT0FBTztvQkFDTCxPQUFPO29CQUNQLFFBQVE7b0JBQ1IsUUFBUSxFQUFFLFFBQVM7aUJBQ3BCLENBQUM7WUFDSixDQUFDO1NBQUE7UUFFRCxTQUFlLFFBQVEsQ0FBQyxRQUFnQixFQUFFLE9BQWU7O2dCQUN2RCxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQ3hDLE9BQU8sUUFBUSxHQUFHLENBQUMsRUFBRTtvQkFDbkIsTUFBTSxHQUFHLEdBQUcsTUFBTSxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ3pDLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7d0JBQ3JFLE9BQU8sUUFBUSxDQUFDO29CQUNsQixRQUFRLEVBQUUsQ0FBQztpQkFDWjtnQkFDRCxPQUFPLFNBQVMsQ0FBQztZQUNuQixDQUFDO1NBQUE7UUFFRCxpQkFBaUI7SUFDbkIsQ0FBQztDQUFBO0FBcFJELGtDQW9SQztBQUVELE1BQWEsV0FBVztJQVd0QixZQUFtQixHQUFXO1FBQVgsUUFBRyxHQUFILEdBQUcsQ0FBUTtRQVY5QixtQkFBYyxHQUFHLGNBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNoQyxzQkFBc0I7UUFDdEIsa0JBQWEsR0FBRyxJQUFJLHNCQUFlLENBQWtCLElBQUksQ0FBQyxDQUFDO1FBRTNELGFBQVEsR0FBRyxLQUFLLENBQUM7UUFDVCxxQkFBZ0IsR0FBRyxJQUFJLHNCQUFlLENBQVcsRUFBRSxDQUFDLENBQUM7SUFLNUIsQ0FBQztJQUU1QixtQkFBbUIsQ0FBQyxPQUFlOztZQUN2QyxJQUFJLEVBQXdCLENBQUM7WUFDN0IsTUFBTSxXQUFXLENBQUMsQ0FBTSxHQUFHLEVBQUMsRUFBRTtnQkFDNUIsRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN0QyxDQUFDLENBQUEsQ0FBQyxDQUFDO1lBQ0gsR0FBRyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNsQyxJQUFJLEVBQUcsQ0FBQyxRQUFTLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxFQUFFO2dCQUNsQyxFQUFHLENBQUMsUUFBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHO29CQUN2QixPQUFPLEVBQUUsQ0FBQztvQkFDVixJQUFJLEVBQUUsNkJBQTZCO2lCQUNwQyxDQUFDO2FBQ0g7WUFDRCxFQUFHLENBQUMsUUFBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEVBQUcsQ0FBQyxDQUFDO1lBQzdCLGtCQUFFLENBQUMsVUFBVSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsOEJBQWdCLENBQUMsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNwRCxrQkFBRSxDQUFDLGFBQWEsQ0FBQyw4QkFBZ0IsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUNoRCxHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSw4QkFBZ0IsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUN4RCxPQUFPLEVBQUcsQ0FBQztRQUNiLENBQUM7S0FBQTtJQUVEOzs7T0FHRztJQUNHLGNBQWMsQ0FBQyxPQUFlOztZQUNsQyxJQUFJLFFBQVEsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFHLENBQUMsUUFBUyxDQUFDO2lCQUNuRSxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssT0FBTyxDQUFDLENBQUM7WUFFaEMsSUFBSSxlQUE2QyxDQUFDO1lBRWxELE1BQU0sV0FBVyxDQUFDLENBQU0sR0FBRyxFQUFDLEVBQUU7Z0JBRTVCLGVBQWUsR0FBRyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUN6QyxnQkFBSSxDQUFDLENBQUMsQ0FBQyxFQUNQLGtCQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUMzQixnQkFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FDdEIsQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFFZCxLQUFLLE1BQU0sR0FBRyxJQUFJLFFBQVEsRUFBRTtvQkFDMUIsR0FBRyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxHQUFHLENBQUMsQ0FBQztvQkFDcEMsTUFBTSxHQUFHLEdBQUcsTUFBTSxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsa0JBQWtCLElBQUksQ0FBQyxHQUFHLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQztvQkFDcEYsSUFBSSxDQUFDLEdBQUcsRUFBRTt3QkFDUixHQUFHLENBQUMsSUFBSSxDQUFDLHdCQUF3QixJQUFJLENBQUMsR0FBRyxJQUFJLEdBQUcsb0NBQW9DLENBQUMsQ0FBQzt3QkFDdEYsU0FBUztxQkFDVjtvQkFDRCxNQUFNLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUM7aUJBQ3JGO1lBQ0gsQ0FBQyxDQUFBLENBQUMsQ0FBQztZQUNILElBQUksZUFBZTtnQkFDakIsTUFBTSxlQUFlLENBQUM7WUFDeEIsT0FBTyxRQUFRLENBQUM7UUFDbEIsQ0FBQztLQUFBO0lBRUssY0FBYzs7WUFDbEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7WUFDckIsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFO2dCQUNwQixNQUFNLFdBQVcsQ0FBQyxDQUFNLEdBQUcsRUFBQyxFQUFFO29CQUM1QixJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztvQkFDZixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsR0FBRyxDQUFDLGdCQUFnQixDQUFDO29CQUU3QyxNQUFNLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQzFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEVBQUcsQ0FBQyxDQUFDO29CQUU3QixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ3JELElBQUksV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7d0JBQzFCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQy9CLEtBQUssTUFBTSxPQUFPLElBQUksV0FBVyxFQUFFOzRCQUNqQyxNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7eUJBQ3JDO3FCQUNGO29CQUNELDZDQUE2QztvQkFDN0Msc0VBQXNFO29CQUN0RSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUM7Z0JBQ2xCLENBQUMsQ0FBQSxDQUFDLENBQUM7Z0JBQ0gsTUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7YUFDcEU7UUFDSCxDQUFDO0tBQUE7SUFFRCx5QkFBeUIsQ0FBQyxHQUFHLFFBQWtCO1FBQzdDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVLLDBCQUEwQixDQUFDLE9BQWUsRUFBRSxJQUFZOztZQUM1RCxNQUFNLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuRCxNQUFNLGFBQWEsQ0FBQyxrQkFBa0IsSUFBSSxDQUFDLEdBQUcsSUFBSSxPQUFPLEdBQUcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdEcsQ0FBQztLQUFBO0lBRUQsU0FBUztRQUNQLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO0lBQ3hCLENBQUM7SUFFYSxlQUFlLENBQUMsR0FBVzs7WUFDdkMsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxrQkFBa0IsSUFBSSxDQUFDLEdBQUcsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQzlGLElBQUksR0FBRyxJQUFJLElBQUk7Z0JBQ2IsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsR0FBRyxrQkFBa0IsSUFBSSxDQUFDLEdBQUcsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQzdFLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBSSxFQUFFLEtBQUssRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDNUYsQ0FBQztLQUFBO0lBRWEsY0FBYyxDQUFDLEdBQXVCOztZQUNsRCxNQUFNLEdBQUcsR0FBRyxNQUFNLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxrQkFBa0IsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFDN0UsR0FBRyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN4QyxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7Z0JBQ2YsT0FBTyxFQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUMsQ0FBQzthQUN2QjtZQUNELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFJLENBQUMsQ0FBYSxDQUFDO1FBQ2xFLENBQUM7S0FBQTtDQUVGO0FBekhELGtDQXlIQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2ZldGNoLXJlbW90ZS1pbWFwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3JlYXRlVHJhbnNwb3J0IH0gZnJvbSAnbm9kZW1haWxlcic7XG5pbXBvcnQgU01UUFRyYW5zcG9ydCBmcm9tICdub2RlbWFpbGVyL2xpYi9zbXRwLXRyYW5zcG9ydCc7XG5pbXBvcnQgeyBTdWJqZWN0LCBPYnNlcnZhYmxlLCBmcm9tLCBCZWhhdmlvclN1YmplY3QgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IG1hcCwgY29uY2F0TWFwLCB0YWtlV2hpbGUsIHRha2VMYXN0LCBtYXBUbywgZGlzdGluY3RVbnRpbENoYW5nZWQsXG4gIHNraXAsIGZpbHRlciwgdGFrZX0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgY29ubmVjdCBhcyB0c2xDb25uZWN0LCBDb25uZWN0aW9uT3B0aW9ucywgVExTU29ja2V0IH0gZnJvbSAndGxzJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Q2hlY2tzdW0sIFdpdGhNYWlsU2VydmVyQ29uZmlnLCBjdXJyQ2hlY2tzdW1GaWxlfSBmcm9tICcuL2ZldGNoLXR5cGVzJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuLy8gaW1wb3J0IHtTb2NrZXR9IGZyb20gJ25ldCc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5mZXRjaC1yZW1vdGUtaW1hcCcpO1xuXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZW5kTWFpbChzdWJqZWN0OiBzdHJpbmcsIHRleHQ6IHN0cmluZywgZmlsZT86IHN0cmluZykge1xuICBsb2cuaW5mbygnbG9naW4nKTtcbiAgY29uc3Qge1xuICAgIGZldGNoTWFpbFNlcnZlcjoge1xuICAgICAgdXNlcjogRU1BSUwsXG4gICAgICBsb2dpblNlY3JldDogU0VDUkVULFxuICAgICAgLy8gaW1hcDogSU1BUCxcbiAgICAgIHNtdHA6IFNNVFBcbiAgICB9XG4gIH0gPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpIGFzIFdpdGhNYWlsU2VydmVyQ29uZmlnO1xuXG4gIGNvbnN0IHRyYW5zcG9ydGVyID0gY3JlYXRlVHJhbnNwb3J0KHtcbiAgICBob3N0OiBTTVRQLFxuICAgIGF1dGg6IHtcbiAgICAgIHR5cGU6ICdsb2dpbicsXG4gICAgICB1c2VyOiBFTUFJTCxcbiAgICAgIHBhc3M6IFNFQ1JFVFxuICAgIH0sXG4gICAgc2VjdXJlOiB0cnVlXG4gIH0gYXMgU01UUFRyYW5zcG9ydC5PcHRpb25zKTtcblxuICBsb2cuaW5mbygnc2VuZCBtYWlsJyk7XG4gIGNvbnN0IGluZm8gPSBhd2FpdCB0cmFuc3BvcnRlci5zZW5kTWFpbCh7XG4gICAgZnJvbTogRU1BSUwsXG4gICAgdG86IEVNQUlMLFxuICAgIHN1YmplY3Q6IGBidWlsZCBhcnRpZmFjdDogJHtzdWJqZWN0fWAsXG4gICAgdGV4dCxcbiAgICBhdHRhY2htZW50czogZmlsZSA/IFtcbiAgICAgIHtcbiAgICAgICAgZmlsZW5hbWU6IFBhdGguYmFzZW5hbWUoZmlsZSksXG4gICAgICAgIHBhdGg6IFBhdGgucmVzb2x2ZShmaWxlKVxuICAgICAgfVxuICAgIF0gOiB1bmRlZmluZWRcbiAgfSk7XG5cbiAgbG9nLmluZm8oaW5mbyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXRyeVNlbmRNYWlsKHN1YmplY3Q6IHN0cmluZywgdGV4dDogc3RyaW5nLCBmaWxlPzogc3RyaW5nKSB7XG4gIGxldCBlcnJvcjogRXJyb3IgfCB1bmRlZmluZWQ7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHNlbmRNYWlsKHN1YmplY3QsIHRleHQsIGZpbGUpO1xuICAgICAgZXJyb3IgPSB1bmRlZmluZWQ7XG4gICAgICBicmVhaztcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGxvZy5pbmZvKCdHb3QgZXJyb3InLCBlcnIpO1xuICAgICAgZXJyb3IgPSBlcnI7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwMCkpO1xuICAgIH1cbiAgfVxuICBpZiAoZXJyb3IpIHtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuXG5lbnVtIEZldGNoU3RhdGUge1xuICBzdGFydCA9IDAsXG4gIGhlYWRlcnMsXG4gIGhlYWRlcnNFbmQsXG4gIHRleHRIZWFkZXJzLFxuICB0ZXh0Qm9keSxcbiAgYXR0YWNobWVudEhlYWRlcnMsXG4gIGF0dGFjaGVtZW50Qm9keSxcbiAgZW5kXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW1hcEZldGNoRGF0YSB7XG4gIGhlYWRlcnM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmdbXSB8IHVuZGVmaW5lZH07XG4gIHRleHRCb2R5Pzogc3RyaW5nO1xuICBmaWxlTmFtZT86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbWFwQ29tbWFuZENvbnRleHQge1xuICAvKipcbiAgICogSW5kZXggb2YgbGF0ZXN0IG1haWxcbiAgICovXG4gIGxhc3RJbmRleDogbnVtYmVyO1xuICBmaWxlV3JpdGluZ1N0YXRlOiBPYnNlcnZhYmxlPGJvb2xlYW4+O1xuICB3YWl0Rm9yUmVwbHkoY29tbWFuZD86IHN0cmluZywgb25MaW5lPzogKGxpbmU6IHN0cmluZywgdGFnOiBzdHJpbmcpID0+IFByb21pc2U8YW55Pik6IFByb21pc2U8c3RyaW5nfG51bGw+O1xuICBmaW5kTWFpbChmcm9tSW5keDogbnVtYmVyLCBzdWJqZWN0OiBzdHJpbmcpOiBQcm9taXNlPG51bWJlciB8IHVuZGVmaW5lZD47XG4gIHdhaXRGb3JGZXRjaChtYWlsSWR4OiBzdHJpbmcgfCBudW1iZXIsIGhlYWRlck9ubHk/OiBib29sZWFuLCBvdmVycmlkZUZpbGVOYW1lPzogc3RyaW5nKTogUHJvbWlzZTxJbWFwRmV0Y2hEYXRhPjtcbiAgd2FpdEZvckZldGNoVGV4dChpbmRleDogbnVtYmVyKTogUHJvbWlzZTxzdHJpbmc+O1xufVxuXG4vKipcbiAqIElNQVAgc3BlY2lmaWNhdGlvblxuICogaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzE3MzBcbiAqIFxuICogSUQgY29tbWFuZFxuICogaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzI5NzFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvbm5lY3RJbWFwKGNhbGxiYWNrOiAoY29udGV4dDogSW1hcENvbW1hbmRDb250ZXh0KSA9PiBQcm9taXNlPGFueT4pIHtcbiAgbGV0IGJ1ZiA9ICcnO1xuICBjb25zdCBsaW5lU3ViamVjdCA9IG5ldyBTdWJqZWN0PHN0cmluZz4oKTtcbiAgbGV0IGxvZ0VuYWJsZWQgPSB0cnVlO1xuICBsZXQgY21kSWR4ID0gMTtcbiAgY29uc3QgZmlsZVdyaXRpbmdTdGF0ZSA9IG5ldyBCZWhhdmlvclN1YmplY3Q8U2V0PHN0cmluZz4+KG5ldyBTZXQ8c3RyaW5nPigpKTtcblxuICBjb25zdCB7XG4gICAgZmV0Y2hNYWlsU2VydmVyOiB7XG4gICAgICB1c2VyOiBFTUFJTCxcbiAgICAgIGxvZ2luU2VjcmV0OiBTRUNSRVQsXG4gICAgICBpbWFwOiBJTUFQXG4gICAgICAvLyBzbXRwOiBTTVRQXG4gICAgfVxuICB9ID0gYXBpLmNvbmZpZy5nZXQoYXBpLnBhY2thZ2VOYW1lKSBhcyBXaXRoTWFpbFNlcnZlckNvbmZpZztcblxuICBjb25zdCBjb250ZXh0OiB7W2sgaW4ga2V5b2YgSW1hcENvbW1hbmRDb250ZXh0XT86IEltYXBDb21tYW5kQ29udGV4dFtrXX0gPSB7fTtcblxuICBjb250ZXh0LndhaXRGb3JSZXBseSA9IHdhaXRGb3JSZXBseTtcbiAgY29udGV4dC53YWl0Rm9yRmV0Y2ggPSB3YWl0Rm9yRmV0Y2g7XG4gIGNvbnRleHQud2FpdEZvckZldGNoVGV4dCA9IHdhaXRGb3JGZXRjaFRleHQ7XG4gIGNvbnRleHQuZmluZE1haWwgPSBmaW5kTWFpbDtcbiAgY29udGV4dC5maWxlV3JpdGluZ1N0YXRlID0gZmlsZVdyaXRpbmdTdGF0ZS5waXBlKFxuICAgIG1hcChmaWxlU2V0ID0+IHtcbiAgICAgIC8vIGxvZy53YXJuKCd3cml0aW5nOiAnLCBmaWxlU2V0LnZhbHVlcygpKTtcbiAgICAgIHJldHVybiBmaWxlU2V0LnNpemUgPiAwO1xuICAgIH0pLFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKClcbiAgKTtcblxuICAvLyBjb250ZXh0LmZpbGVXcml0aW5nU3RhdGUuc3Vic2NyaWJlKHNpemUgPT4ge1xuICAvLyAgIGxvZy53YXJuKCd3cml0aW5nIGZpbGVzOicsIHNpemUpO1xuICAvLyB9KTtcblxuICBsZXQgc29ja2V0OiBUTFNTb2NrZXR8dW5kZWZpbmVkO1xuICB0cnkge1xuICAgIHNvY2tldCA9IGF3YWl0IG5ldyBQcm9taXNlPFJldHVyblR5cGU8dHlwZW9mIHRzbENvbm5lY3Q+PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCBzb2NrZXQgPSB0c2xDb25uZWN0KHtcbiAgICAgICAgaG9zdDogSU1BUCwgcG9ydDogOTkzLFxuICAgICAgICBlbmFibGVUcmFjZTogdHJ1ZVxuICAgICAgfSBhcyBDb25uZWN0aW9uT3B0aW9ucyk7XG5cbiAgICAgIHNvY2tldC5vbignc2VjdXJlQ29ubmVjdCcsICgpID0+IHtcbiAgICAgICAgbG9nLmluZm8oJ2Nvbm5lY3RlZCcsIHNvY2tldC5hdXRob3JpemVkID8gJ2F1dGhvcml6ZWQnIDogJ3VuYXV0aG9yaXplZCcpO1xuICAgICAgICByZXNvbHZlKHNvY2tldCk7XG4gICAgICB9KVxuICAgICAgLm9uKCdlcnJvcicsIGVyciA9PiByZWplY3QoZXJyKSlcbiAgICAgIC5vbigndGltZW91dCcsICgpID0+IHJlamVjdChuZXcgRXJyb3IoJ1RpbWVvdXQnKSkpO1xuICAgICAgc29ja2V0Lm9uKCdkYXRhJywgKGRhdGE6IEJ1ZmZlcikgPT4gX29uUmVzcG9uc2UoZGF0YS50b1N0cmluZygndXRmOCcpKSk7XG5cbiAgICAgIHJldHVybiBzb2NrZXQ7XG4gICAgfSk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGF3YWl0IHdhaXRGb3JSZXBseSgpKTtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoJ0lEIChcIm5hbWVcIiBcImNvbS50ZW5jZW50LmZveG1haWxcIiBcInZlcnNpb25cIiBcIjcuMi45Ljc5XCIpJyk7XG4gICAgYXdhaXQgd2FpdEZvclJlcGx5KGBMT0dJTiAke0VNQUlMfSAke1NFQ1JFVH1gKTtcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoJ1NFTEVDVCBJTkJPWCcpO1xuXG4gICAgbGV0IGZyb21JbmR4OiBudW1iZXI7XG4gICAgYXdhaXQgd2FpdEZvclJlcGx5KCdTRUFSQ0ggKicsIGFzeW5jIGxpbmUgPT4ge1xuICAgICAgaWYgKGZyb21JbmR4ICE9IG51bGwpXG4gICAgICAgIHJldHVybjtcbiAgICAgIGNvbnN0IG0gPSAvXFwqXFxzK1NFQVJDSFxccysoXFxkKyk/Ly5leGVjKGxpbmUpO1xuICAgICAgaWYgKG0pIHtcbiAgICAgICAgZnJvbUluZHggPSBwYXJzZUludChtWzFdLCAxMCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb250ZXh0Lmxhc3RJbmRleCA9IGZyb21JbmR4ITtcbiAgICBhd2FpdCBjYWxsYmFjayhjb250ZXh0IGFzIEltYXBDb21tYW5kQ29udGV4dCk7XG4gICAgYXdhaXQgd2FpdEZvclJlcGx5KCdMT0dPVVQnKTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgd2FpdEZvclJlcGx5KCdMT0dPVVQnKTtcbiAgICB9IGNhdGNoIChlcikge31cbiAgICBpZiAoc29ja2V0KVxuICAgICAgc29ja2V0LmVuZCgpO1xuICAgIHRocm93IGV4O1xuICB9XG5cbiAgc29ja2V0LmVuZCgpO1xuXG4gIGZ1bmN0aW9uIF9vblJlc3BvbnNlKHJlczogc3RyaW5nKSB7XG4gICAgYnVmICs9IHJlcztcbiAgICBpZiAocmVzLmluZGV4T2YoJ1xcbicpIDwgMClcbiAgICAgIHJldHVybjtcbiAgICBjb25zdCBsaW5lcyA9IGJ1Zi5zcGxpdCgvKD86XFxyXFxufFxccnxcXG4pLyk7XG4gICAgYnVmID0gbGluZXNbbGluZXMubGVuZ3RoIC0gMV07XG4gICAgbGluZXMuc2xpY2UoMCwgbGluZXMubGVuZ3RoIC0gMSkuZm9yRWFjaChsaW5lID0+IF9vbkVhY2hMaW5lKGxpbmUpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIF9vbkVhY2hMaW5lKGxpbmU6IHN0cmluZykge1xuICAgIGlmIChsb2dFbmFibGVkKVxuICAgICAgbG9nLmRlYnVnKCcgIDw9JywgbGluZSk7XG4gICAgbGluZVN1YmplY3QubmV4dChsaW5lKTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIHdhaXRGb3JGZXRjaFRleHQoaW5kZXg6IG51bWJlcikge1xuICAgIGxldCBidWYgPSAnJztcbiAgICBhd2FpdCB3YWl0Rm9yUmVwbHkoYEZFVENIICR7aW5kZXh9IEJPRFlbMV1gLCBhc3luYyBsaW5lID0+IHtcbiAgICAgIGJ1ZiArPSBsaW5lICsgJ1xcbic7XG4gICAgfSk7XG4gICAgLy8gbG9nLndhcm4oYnVmKTtcbiAgICByZXR1cm4gL15cXCpcXHMrXFxkK1xccytGRVRDSFxccytcXCguKj9cXHtcXGQrXFx9KFteXSopXFwpJC9tLmV4ZWMoYnVmKSFbMV07XG4gIH1cblxuICBmdW5jdGlvbiB3YWl0Rm9yUmVwbHkoY29tbWFuZD86IHN0cmluZywgb25MaW5lPzogKGxpbmU6IHN0cmluZywgdGFnOiBzdHJpbmcpID0+IFByb21pc2U8YW55Pikge1xuICAgIGxldCB0YWc6IHN0cmluZztcbiAgICBpZiAoY29tbWFuZClcbiAgICAgIHRhZyA9ICdhJyArIChjbWRJZHgrKyk7XG5cbiAgICBsZXQgc291cmNlOiBPYnNlcnZhYmxlPHN0cmluZz4gPSBsaW5lU3ViamVjdDtcbiAgICBpZiAob25MaW5lKSB7XG4gICAgICBzb3VyY2UgPSBzb3VyY2UucGlwZShcbiAgICAgICAgY29uY2F0TWFwKGxpbmUgPT4ge1xuICAgICAgICAgIHJldHVybiBmcm9tKG9uTGluZShsaW5lLCB0YWcpKS5waXBlKG1hcFRvKGxpbmUpKTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuICAgIGNvbnN0IHByb20gPSBzb3VyY2UucGlwZShcbiAgICAgIG1hcChsaW5lID0+IHtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSAvXihcXFMrKVxccysoT0t8Tk98QkFEKSg/PShcXHN8JCkpL2kuZXhlYyhsaW5lKTtcbiAgICAgICAgaWYgKG1hdGNoICYmICghdGFnIHx8IHRhZyA9PT0gbWF0Y2hbMV0pKSB7XG4gICAgICAgICAgaWYgKG1hdGNoWzJdID09PSAnT0snIHx8IG1hdGNoWzJdID09PSAnTk8nKSB7XG4gICAgICAgICAgICAvLyBsb2cuaW5mbyhgXFx0JHtjb21tYW5kfSByZXBsaWVkYCk7XG4gICAgICAgICAgICByZXR1cm4gbGluZS5zbGljZShtYXRjaFswXS5sZW5ndGgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlcGx5OiAke2xpbmV9YCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIHRha2VXaGlsZShyZXN1bHQgPT4gcmVzdWx0ID09IG51bGwsIHRydWUpLFxuICAgICAgdGFrZUxhc3QoMSlcbiAgICApLnRvUHJvbWlzZSgpO1xuXG4gICAgaWYgKGNvbW1hbmQpIHtcbiAgICAgIGNvbnN0IGNtZCA9IHRhZyEgKyAnICcgKyBjb21tYW5kO1xuICAgICAgaWYgKHNvY2tldClcbiAgICAgICAgc29ja2V0LndyaXRlKEJ1ZmZlci5mcm9tKGAke3RhZyF9ICR7Y29tbWFuZH1cXHJcXG5gLCAndXRmOCcpKTtcbiAgICAgIGxvZy5kZWJ1ZygnPT4nLCBjbWQpO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9tO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gd2FpdEZvckZldGNoKG1haWxJZHg6IHN0cmluZyB8IG51bWJlciA9ICcqJywgaGVhZGVyT25seSA9IHRydWUsIG92ZXJyaWRlRmlsZU5hbWU/OiBzdHJpbmcpOiBQcm9taXNlPEltYXBGZXRjaERhdGE+IHtcbiAgICBsZXQgc3RhdGU6IEZldGNoU3RhdGUgPSBGZXRjaFN0YXRlLnN0YXJ0O1xuICAgIGxldCBoZWFkZXJzOiB7XG4gICAgICBzdWJqZWN0Pzogc3RyaW5nW107XG4gICAgICAnY29udGVudC10eXBlJz86IHN0cmluZ1tdO1xuICAgICAgW2tleTogc3RyaW5nXTogc3RyaW5nW10gfCB1bmRlZmluZWQ7XG4gICAgfSA9IHt9O1xuICAgIGxldCBsYXN0SGVhZGVyTmFtZTogc3RyaW5nO1xuICAgIGxldCBib3VuZGFyeTogc3RyaW5nO1xuICAgIGxldCB0ZXh0Qm9keTogc3RyaW5nID0gJyc7XG4gICAgbGV0IGZpbGVOYW1lOiBzdHJpbmc7XG4gICAgbGV0IGZpbGVXcml0ZXI6IGZzLldyaXRlU3RyZWFtO1xuICAgIGxldCBhdHRhY2hlbWVudEZpbGU6IHN0cmluZztcblxuICAgIGNvbnN0IG9yaWdpbkxvZ0VuYWJsZWQgPSBsb2dFbmFibGVkO1xuICAgIGxvZ0VuYWJsZWQgPSBoZWFkZXJPbmx5O1xuICAgIGF3YWl0IHdhaXRGb3JSZXBseShgRkVUQ0ggJHttYWlsSWR4fSBSRkM4MjIke2hlYWRlck9ubHkgPyAnLkhFQURFUicgOiAnJ31gLCAobGluZSkgPT4ge1xuICAgICAgc3dpdGNoIChzdGF0ZSkge1xuICAgICAgICBjYXNlIEZldGNoU3RhdGUuc3RhcnQ6XG4gICAgICAgICAgaWYgKC9eXFwqXFxzK1swLTldK1xccytGRVRDSFxccysvLnRlc3QobGluZSkpIHtcbiAgICAgICAgICAgIHN0YXRlID0gRmV0Y2hTdGF0ZS5oZWFkZXJzO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBGZXRjaFN0YXRlLmhlYWRlcnM6XG4gICAgICAgICAgaWYgKC9eXFxzLy50ZXN0KGxpbmUpKSB7XG4gICAgICAgICAgICBjb25zdCBpdGVtcyA9IGhlYWRlcnNbbGFzdEhlYWRlck5hbWVdITtcbiAgICAgICAgICAgIGl0ZW1zLnB1c2goLi4ubGluZS5zcGxpdCgnOycpLm1hcChpdGVtID0+IGl0ZW0udHJpbSgpKS5maWx0ZXIoaXRlbSA9PiBpdGVtLmxlbmd0aCA+IDApKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAobGluZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHN0YXRlID0gRmV0Y2hTdGF0ZS5oZWFkZXJzRW5kO1xuXG4gICAgICAgICAgICBjb25zdCBub3JtYWxpemVkSGVhZGVyczogdHlwZW9mIGhlYWRlcnMgPSB7fTtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGhlYWRlcnMpLmZvckVhY2goa2V5ID0+IG5vcm1hbGl6ZWRIZWFkZXJzW2tleS50b0xvd2VyQ2FzZSgpXSA9IGhlYWRlcnNba2V5XSk7XG4gICAgICAgICAgICBoZWFkZXJzID0gbm9ybWFsaXplZEhlYWRlcnM7XG5cbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnRUeXBlID0gaGVhZGVyc1snY29udGVudC10eXBlJ107XG4gICAgICAgICAgICBpZiAoIWNvbnRlbnRUeXBlKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBDb250ZW50LVR5cGUgaW4gaGVhZGVyczogJHtKU09OLnN0cmluZ2lmeShoZWFkZXJzLCBudWxsLCAnICAnKX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGh0dHBzOi8vd3d3LnczLm9yZy9Qcm90b2NvbHMvcmZjMTM0MS83XzJfTXVsdGlwYXJ0Lmh0bWxcbiAgICAgICAgICAgIGlmIChjb250ZW50VHlwZVswXSAhPT0gJ211bHRpcGFydC9taXhlZCcpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgnTm8gc3VwcG9ydCBmb3IgY29udGVudC10eXBlOiAnICsgY29udGVudFR5cGVbMF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYm91bmRhcnkgPSBjb250ZW50VHlwZS5maW5kKGl0ZW0gPT4gaXRlbS5zdGFydHNXaXRoKCdib3VuZGFyeT0nKSkhO1xuICAgICAgICAgICAgYm91bmRhcnkgPSAnLS0nICsgL15bXCInXT8oLio/KVtcIiddPyQvLmV4ZWMoYm91bmRhcnkuc2xpY2UoJ2JvdW5kYXJ5PScubGVuZ3RoKSkhWzFdO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IG0gPSAvXihbXjpdKylcXDooLiopJC8uZXhlYyhsaW5lKTtcbiAgICAgICAgICBpZiAobSkge1xuICAgICAgICAgICAgaGVhZGVyc1ttWzFdXSA9IG1bMl0uc3BsaXQoJzsnKS5tYXAoaXRlbSA9PiBpdGVtLnRyaW0oKSkuZmlsdGVyKGl0ZW0gPT4gaXRlbS5sZW5ndGggPiAwKTtcbiAgICAgICAgICAgIGxhc3RIZWFkZXJOYW1lID0gbVsxXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgRmV0Y2hTdGF0ZS5oZWFkZXJzRW5kOlxuICAgICAgICAgIGlmIChsaW5lID09PSBib3VuZGFyeSkge1xuICAgICAgICAgICAgc3RhdGUgPSBGZXRjaFN0YXRlLnRleHRIZWFkZXJzO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBGZXRjaFN0YXRlLnRleHRIZWFkZXJzOlxuICAgICAgICAgIGlmIChsaW5lLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgIHN0YXRlID0gRmV0Y2hTdGF0ZS50ZXh0Qm9keTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBGZXRjaFN0YXRlLnRleHRCb2R5OlxuICAgICAgICAgIGlmIChsaW5lID09PSBib3VuZGFyeSkge1xuICAgICAgICAgICAgdGV4dEJvZHkgPSB0ZXh0Qm9keS5zbGljZSgwLCB0ZXh0Qm9keS5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgIHN0YXRlID0gRmV0Y2hTdGF0ZS5hdHRhY2htZW50SGVhZGVycztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0ZXh0Qm9keSArPSBsaW5lICsgJ1xcbic7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgRmV0Y2hTdGF0ZS5hdHRhY2htZW50SGVhZGVyczpcbiAgICAgICAgICBpZiAobGluZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHN0YXRlID0gRmV0Y2hTdGF0ZS5hdHRhY2hlbWVudEJvZHk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFmaWxlTmFtZSkge1xuICAgICAgICAgICAgY29uc3QgZm91bmQgPSAvZmlsZW5hbWU9W1wiJyBdPyhbXidcIiBdKylbXCInIF0/JC8uZXhlYyhsaW5lKTtcbiAgICAgICAgICAgIGlmIChmb3VuZClcbiAgICAgICAgICAgICAgZmlsZU5hbWUgPSBmb3VuZFsxXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgRmV0Y2hTdGF0ZS5hdHRhY2hlbWVudEJvZHk6XG4gICAgICAgICAgaWYgKGxpbmUuaW5kZXhPZihib3VuZGFyeSkgPj0wICkge1xuICAgICAgICAgICAgc3RhdGUgPSBGZXRjaFN0YXRlLmVuZDtcbiAgICAgICAgICAgIGlmIChmaWxlV3JpdGVyKSB7XG4gICAgICAgICAgICAgIGZpbGVXcml0ZXIuZW5kKCgpID0+IHtcbiAgICAgICAgICAgICAgICBsb2cuaW5mbygnZmlsZSBlbmQgZG9uZTonLCBhdHRhY2hlbWVudEZpbGUpO1xuICAgICAgICAgICAgICAgIGZpbGVXcml0aW5nU3RhdGUuZ2V0VmFsdWUoKS5kZWxldGUoYXR0YWNoZW1lbnRGaWxlKTtcbiAgICAgICAgICAgICAgICBmaWxlV3JpdGluZ1N0YXRlLm5leHQoZmlsZVdyaXRpbmdTdGF0ZS5nZXRWYWx1ZSgpKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFmaWxlV3JpdGVyKSB7XG4gICAgICAgICAgICBhdHRhY2hlbWVudEZpbGUgPSBvdmVycmlkZUZpbGVOYW1lIHx8IFBhdGgucmVzb2x2ZSgnZGlzdC8nICsgZmlsZU5hbWUpO1xuICAgICAgICAgICAgZmlsZVdyaXRlciA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKGF0dGFjaGVtZW50RmlsZSk7XG4gICAgICAgICAgICBmaWxlV3JpdGluZ1N0YXRlLmdldFZhbHVlKCkuYWRkKGF0dGFjaGVtZW50RmlsZSk7XG4gICAgICAgICAgICBmaWxlV3JpdGluZ1N0YXRlLm5leHQoZmlsZVdyaXRpbmdTdGF0ZS5nZXRWYWx1ZSgpKTtcbiAgICAgICAgICAgIGxvZy5pbmZvKCdDcmVhdGUgYXR0YWNoZW1lbnQgZmlsZTogJywgYXR0YWNoZW1lbnRGaWxlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gbG9nLndhcm4oJ2JvdW5kYXJ5JywgYm91bmRhcnkpO1xuICAgICAgICAgIC8vIFRPRE86IHdhaXQgZm9yIGRyYWluZWRcbiAgICAgICAgICBmaWxlV3JpdGVyLndyaXRlKEJ1ZmZlci5mcm9tKGxpbmUsICdiYXNlNjQnKSk7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICB9XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKDApO1xuICAgIH0pO1xuICAgIGxvZ0VuYWJsZWQgPSBvcmlnaW5Mb2dFbmFibGVkO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGhlYWRlcnMsXG4gICAgICB0ZXh0Qm9keSxcbiAgICAgIGZpbGVOYW1lOiBmaWxlTmFtZSFcbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gZmluZE1haWwoZnJvbUluZHg6IG51bWJlciwgc3ViamVjdDogc3RyaW5nKTogUHJvbWlzZTxudW1iZXIgfCB1bmRlZmluZWQ+IHtcbiAgICBsb2cuaW5mbygnZmluZE1haWwnLCBmcm9tSW5keCwgc3ViamVjdCk7XG4gICAgd2hpbGUgKGZyb21JbmR4ID4gMCkge1xuICAgICAgY29uc3QgcmVzID0gYXdhaXQgd2FpdEZvckZldGNoKGZyb21JbmR4KTtcbiAgICAgIGlmIChyZXMuaGVhZGVycy5zdWJqZWN0ICYmIHJlcy5oZWFkZXJzLnN1YmplY3RbMF0uaW5kZXhPZihzdWJqZWN0KSA+PSAwKVxuICAgICAgICByZXR1cm4gZnJvbUluZHg7XG4gICAgICBmcm9tSW5keC0tO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8gcmV0dXJuIHNvY2tldDtcbn1cblxuZXhwb3J0IGNsYXNzIEltYXBNYW5hZ2VyIHtcbiAgemlwRG93bmxvYWREaXIgPSBQYXRoLnJlc29sdmUoKTtcbiAgLy8gY2hlY2tzdW06IENoZWNrc3VtO1xuICBjaGVja3N1bVN0YXRlID0gbmV3IEJlaGF2aW9yU3ViamVjdDxDaGVja3N1bSB8IG51bGw+KG51bGwpO1xuICBmaWxlV3JpdGluZ1N0YXRlOiBJbWFwQ29tbWFuZENvbnRleHRbJ2ZpbGVXcml0aW5nU3RhdGUnXTtcbiAgd2F0Y2hpbmcgPSBmYWxzZTtcbiAgcHJpdmF0ZSB0b0ZldGNoQXBwc1N0YXRlID0gbmV3IEJlaGF2aW9yU3ViamVjdDxzdHJpbmdbXT4oW10pO1xuICAvLyBwcml2YXRlIGltYXBBY3Rpb25zID0gbmV3IFN1YmplY3Q8KGN0eDogSW1hcENvbW1hbmRDb250ZXh0KSA9PiBQcm9taXNlPGFueT4+KCk7XG5cbiAgcHJpdmF0ZSBjdHg6IEltYXBDb21tYW5kQ29udGV4dDtcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgZW52OiBzdHJpbmcpIHt9XG5cbiAgYXN5bmMgZmV0Y2hVcGRhdGVDaGVja1N1bShhcHBOYW1lOiBzdHJpbmcpOiBQcm9taXNlPENoZWNrc3VtPiB7XG4gICAgbGV0IGNzOiBDaGVja3N1bSB8IHVuZGVmaW5lZDtcbiAgICBhd2FpdCBjb25uZWN0SW1hcChhc3luYyBjdHggPT4ge1xuICAgICAgY3MgPSBhd2FpdCB0aGlzLl9mZXRjaENoZWNrc3VtKGN0eCk7XG4gICAgfSk7XG4gICAgbG9nLmluZm8oJ2ZldGNoZWQgY2hlY2tzdW06JywgY3MpO1xuICAgIGlmIChjcyEudmVyc2lvbnMhW2FwcE5hbWVdID09IG51bGwpIHtcbiAgICAgIGNzIS52ZXJzaW9ucyFbYXBwTmFtZV0gPSB7XG4gICAgICAgIHZlcnNpb246IDAsXG4gICAgICAgIHBhdGg6ICc8c2VlIGF0dGFjaGVtZW50IGZpbGUgbmFtZT4nXG4gICAgICB9O1xuICAgIH1cbiAgICBjcyEudmVyc2lvbnMhW2FwcE5hbWVdLnZlcnNpb24rKztcbiAgICB0aGlzLmNoZWNrc3VtU3RhdGUubmV4dChjcyEpO1xuICAgIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKGN1cnJDaGVja3N1bUZpbGUpKTtcbiAgICBjb25zdCBjaGVja3N1bVN0ciA9IEpTT04uc3RyaW5naWZ5KGNzISwgbnVsbCwgJyAgJyk7XG4gICAgZnMud3JpdGVGaWxlU3luYyhjdXJyQ2hlY2tzdW1GaWxlLCBjaGVja3N1bVN0cik7XG4gICAgbG9nLmluZm8oJ3dyaXRlICVzXFxuJXMnLCBjdXJyQ2hlY2tzdW1GaWxlLCBjaGVja3N1bVN0cik7XG4gICAgcmV0dXJuIGNzITtcbiAgfVxuXG4gIC8qKlxuICAgKiBEb25lIHdoZW4gZmlsZXMgYXJlIHdyaXR0ZW5cbiAgICogQHBhcmFtIGFwcE5hbWUgZXhjbHVkZSBhcHBcbiAgICovXG4gIGFzeW5jIGZldGNoT3RoZXJaaXBzKGFwcE5hbWU6IHN0cmluZykge1xuICAgIGxldCBhcHBOYW1lcyA9IE9iamVjdC5rZXlzKHRoaXMuY2hlY2tzdW1TdGF0ZS5nZXRWYWx1ZSgpIS52ZXJzaW9ucyEpXG4gICAgLmZpbHRlcihhcHAgPT4gYXBwICE9PSBhcHBOYW1lKTtcblxuICAgIGxldCBmaWxlV3JpdHRlblByb206IFByb21pc2U8Ym9vbGVhbj4gfCB1bmRlZmluZWQ7XG5cbiAgICBhd2FpdCBjb25uZWN0SW1hcChhc3luYyBjdHggPT4ge1xuXG4gICAgICBmaWxlV3JpdHRlblByb20gPSBjdHguZmlsZVdyaXRpbmdTdGF0ZS5waXBlKFxuICAgICAgICBza2lwKDEpLFxuICAgICAgICBmaWx0ZXIod3JpdGluZyA9PiAhd3JpdGluZyksXG4gICAgICAgIHRha2UoYXBwTmFtZXMubGVuZ3RoKVxuICAgICAgKS50b1Byb21pc2UoKTtcblxuICAgICAgZm9yIChjb25zdCBhcHAgb2YgYXBwTmFtZXMpIHtcbiAgICAgICAgbG9nLmluZm8oJ2ZldGNoIG90aGVyIHppcDogJyArIGFwcCk7XG4gICAgICAgIGNvbnN0IGlkeCA9IGF3YWl0IGN0eC5maW5kTWFpbChjdHgubGFzdEluZGV4LCBgYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tJHthcHB9KWApO1xuICAgICAgICBpZiAoIWlkeCkge1xuICAgICAgICAgIGxvZy5pbmZvKGBtYWlsIFwiYmtqay1wcmUtYnVpbGQoJHt0aGlzLmVudn0tJHthcHB9KVwiIGlzIG5vdCBGb3VuZCwgc2tpcCBkb3dubG9hZCB6aXBgKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCBjdHgud2FpdEZvckZldGNoKGlkeCwgZmFsc2UsIFBhdGgucmVzb2x2ZSh0aGlzLnppcERvd25sb2FkRGlyLCBhcHAgKyAnLnppcCcpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoZmlsZVdyaXR0ZW5Qcm9tKVxuICAgICAgYXdhaXQgZmlsZVdyaXR0ZW5Qcm9tO1xuICAgIHJldHVybiBhcHBOYW1lcztcbiAgfVxuXG4gIGFzeW5jIHN0YXJ0V2F0Y2hNYWlsKCkge1xuICAgIHRoaXMud2F0Y2hpbmcgPSB0cnVlO1xuICAgIHdoaWxlICh0aGlzLndhdGNoaW5nKSB7XG4gICAgICBhd2FpdCBjb25uZWN0SW1hcChhc3luYyBjdHggPT4ge1xuICAgICAgICB0aGlzLmN0eCA9IGN0eDtcbiAgICAgICAgdGhpcy5maWxlV3JpdGluZ1N0YXRlID0gY3R4LmZpbGVXcml0aW5nU3RhdGU7XG5cbiAgICAgICAgY29uc3QgY3MgPSBhd2FpdCB0aGlzLl9mZXRjaENoZWNrc3VtKGN0eCk7XG4gICAgICAgIHRoaXMuY2hlY2tzdW1TdGF0ZS5uZXh0KGNzISk7XG5cbiAgICAgICAgY29uc3QgdG9GZXRjaEFwcHMgPSB0aGlzLnRvRmV0Y2hBcHBzU3RhdGUuZ2V0VmFsdWUoKTtcbiAgICAgICAgaWYgKHRvRmV0Y2hBcHBzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB0aGlzLnRvRmV0Y2hBcHBzU3RhdGUubmV4dChbXSk7XG4gICAgICAgICAgZm9yIChjb25zdCBhcHBOYW1lIG9mIHRvRmV0Y2hBcHBzKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmZldGNoQXR0YWNobWVudChhcHBOYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gYXdhaXQgY3R4LndhaXRGb3JSZXBseSgnU1VCU0NSSUJFIElOQk9YJyk7XG4gICAgICAgIC8vIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAzMDAwMCkpOyAvLyAzMCBzZWNcbiAgICAgICAgZGVsZXRlIHRoaXMuY3R4O1xuICAgICAgfSk7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNjAwMDApKTsgLy8gNjAgc2VjXG4gICAgfVxuICB9XG5cbiAgZmV0Y2hBcHBEdXJpbmdXYXRjaEFjdGlvbiguLi5hcHBOYW1lczogc3RyaW5nW10pIHtcbiAgICB0aGlzLnRvRmV0Y2hBcHBzU3RhdGUubmV4dChhcHBOYW1lcyk7XG4gIH1cblxuICBhc3luYyBzZW5kRmlsZUFuZFVwZGF0ZWRDaGVja3N1bShhcHBOYW1lOiBzdHJpbmcsIGZpbGU6IHN0cmluZykge1xuICAgIGNvbnN0IGNzID0gYXdhaXQgdGhpcy5mZXRjaFVwZGF0ZUNoZWNrU3VtKGFwcE5hbWUpO1xuICAgIGF3YWl0IHJldHJ5U2VuZE1haWwoYGJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LSR7YXBwTmFtZX0pYCwgSlNPTi5zdHJpbmdpZnkoY3MsIG51bGwsICcgICcpLCBmaWxlKTtcbiAgfVxuXG4gIHN0b3BXYXRjaCgpIHtcbiAgICB0aGlzLndhdGNoaW5nID0gZmFsc2U7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGZldGNoQXR0YWNobWVudChhcHA6IHN0cmluZykge1xuICAgIGNvbnN0IGlkeCA9IGF3YWl0IHRoaXMuY3R4LmZpbmRNYWlsKHRoaXMuY3R4Lmxhc3RJbmRleCwgYGJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LSR7YXBwfSlgKTtcbiAgICBpZiAoaWR4ID09IG51bGwpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbnQgZmluZCBtYWlsOiAnICsgYGJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LSR7YXBwfSlgKTtcbiAgICBhd2FpdCB0aGlzLmN0eC53YWl0Rm9yRmV0Y2goaWR4ISwgZmFsc2UsIFBhdGgucmVzb2x2ZSh0aGlzLnppcERvd25sb2FkRGlyLCBgJHthcHB9LnppcGApKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgX2ZldGNoQ2hlY2tzdW0oY3R4OiBJbWFwQ29tbWFuZENvbnRleHQpIHtcbiAgICBjb25zdCBpZHggPSBhd2FpdCBjdHguZmluZE1haWwoY3R4Lmxhc3RJbmRleCwgYGJramstcHJlLWJ1aWxkKCR7dGhpcy5lbnZ9LWApO1xuICAgIGxvZy5pbmZvKCdfZmV0Y2hDaGVja3N1bSwgaW5kZXg6JywgaWR4KTtcbiAgICBpZiAoaWR4ID09IG51bGwpIHtcbiAgICAgIHJldHVybiB7dmVyc2lvbnM6IHt9fTtcbiAgICB9XG4gICAgcmV0dXJuIEpTT04ucGFyc2UoYXdhaXQgY3R4LndhaXRGb3JGZXRjaFRleHQoaWR4ISkpIGFzIENoZWNrc3VtO1xuICB9XG5cbn1cbiJdfQ==
