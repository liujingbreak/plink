"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.digestSha1 = exports.activate = void 0;
const tslib_1 = require("tslib");
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const rx = tslib_1.__importStar(require("rxjs"));
const plink_1 = require("@wfh/plink");
const http_proxy_1 = tslib_1.__importDefault(require("http-proxy"));
const reactivizer_1 = require("@wfh/reactivizer");
const utils_1 = require("@wfh/assets-processer/dist/utils");
const http_proxy_observable_1 = require("@wfh/assets-processer/dist/http-proxy-observable");
const utils_2 = require("@wfh/http-server/dist/utils");
const markdown_processor_helper_1 = require("../isom/markdown-processor-helper");
const markdown_processor_main_1 = require("./markdown-processor-plain/markdown-processor-main");
const log = (0, plink_1.log4File)(__filename);
function activate(ctx) {
    const router = ctx.router();
    const linksOfFile = new Map();
    const linkIdToFile = new Map();
    const imgUrl2File = new Map();
    const broker = (0, markdown_processor_main_1.setupBroker)(false);
    const { i, o, r } = markdown_processor_main_1.markdownProcessor;
    router.get('/markdown-local/md', (req, res) => {
        log.info('load local markdown file', req.query.file, 'context:', ctx.contextPath);
        linksOfFile.set(req.query.file, new Set());
        i.ft.loadFile(req.query.file, req.hostname).ddo(o.at.fileLoaded).pipe(rx.tap(([, content]) => {
            res.json(content);
        }), rx.take(1), rx.catchError((err) => {
            res.status(400).json(err);
            return rx.EMPTY;
        })).subscribe();
    });
    router.get('/markdown-local/linked-md/:hash', (req, res) => {
        log.info('load local markdown file by hash', req.params.hash, 'context:', ctx.contextPath);
        const file = linkIdToFile.get(req.params.hash);
        if (file) {
            linksOfFile.set(file, new Set());
            i.ft.loadFile(file, req.hostname).ddo(o.at.fileLoaded).pipe(rx.tap(([, content]) => {
                res.json(content);
            }), rx.take(1), rx.catchError((err) => {
                res.status(400).json(err);
                return rx.EMPTY;
            })).subscribe();
        }
        else {
            res.status(400).json(new Error(`file of ID: ${req.params.hash} doesn't exist`));
        }
    });
    router.get('/markdown-local/image/:imgHash', (req, res, next) => {
        const hash = req.params.imgHash;
        log.info('GET image', hash);
        const file = imgUrl2File.get(hash);
        res.contentType('image/' + node_path_1.default.extname(file));
        const input = fs_1.default.createReadStream(file);
        input.on('error', err => {
            log.error(err);
            next(err);
        });
        input.pipe(res).on('error', err => {
            log.error(err);
            next(err);
        });
    });
    router.get('/probe', (req, res) => {
        const url = new URL('/plink/markdown/local', req.protocol + '://' + req.headers.host);
        url.searchParams.set('nocache', Math.random() + '');
        url.searchParams.set('file', node_path_1.default.resolve(__dirname, '../../doc-ui-common/__tests__/sample-markdown.md'));
        log.info('redirect to ', url.toString());
        res.redirect(url.toString());
    });
    const devClientServer = (0, plink_1.config)()['@wfh/markdown-base'].markdownDevServer;
    if (devClientServer) {
        log.warn('Proxy static resource request to dev server', devClientServer);
        const proxyServer = http_proxy_1.default.createProxy({
            target: devClientServer + '/plink',
            changeOrigin: true,
            ws: true,
            secure: false
        });
        const proxy$ = (0, http_proxy_observable_1.httpProxyObservable)(proxyServer);
        // http://localhost:8080/plink/markdown/local?file=E%3A%5Cdr%5Cplink%5Cdoc-app%5Cdoc-ui-common%5C__tests__%5Csample-markdown.md
        ctx.expressAppUse(app => {
            app.use('/plink', (req, res, next) => {
                const body = (0, utils_1.createBufferForHttpProxy)(req);
                const selfHandleResponse = !/\.\w+$/.test(new URL(req.originalUrl, 'http://whatever').pathname);
                rx.merge(proxy$.error.pipe(rx.tap(({ payload: [err] }) => {
                    log.error(err);
                    next(err);
                }), rx.take(1)), selfHandleResponse ?
                    proxy$.proxyRes.pipe(rx.mergeMap(async ({ payload: [pRes] }) => {
                        var _a, _b;
                        if (/\bhtml\b/i.test((_a = pRes.headers['content-type']) !== null && _a !== void 0 ? _a : '')) {
                            const buf = await (0, utils_2.compressedIncomingMsgToBuffer)(pRes);
                            let html = buf.toString('utf8');
                            log.warn('Replace HTML', req.originalUrl);
                            for (const [name, value] of Object.entries(pRes.headers)) {
                                if (Array.isArray(value))
                                    value.forEach(v => res.setHeader(name, v));
                                else if (value)
                                    res.setHeader(name, value);
                            }
                            if (linkIdToFile.size > 0) {
                                html = addDocHashDefInHtml(html, '<script>\nvar __localMarkdownViewLinks = [' +
                                    [...linkIdToFile.keys()].map(id => '"' + id + '"').join(', ') +
                                    '];</script>');
                            }
                            res.removeHeader('Content-Length');
                            await (0, utils_2.compressResponse)(html, res, pRes.headers['content-encoding']);
                            // log.info('Response HTML:\n', );
                        }
                        else {
                            log.warn('response of ' + req.originalUrl + ' has unexpected content-type of ' + pRes.headers['content-type']);
                            res.status((_b = pRes.statusCode) !== null && _b !== void 0 ? _b : 200);
                            for (const [name, value] of Object.entries(pRes.headers)) {
                                if (Array.isArray(value))
                                    value.forEach(v => res.setHeader(name, v));
                                else if (value)
                                    res.setHeader(name, value);
                            }
                            pRes.pipe(res);
                        }
                    }), rx.take(1), rx.takeUntil(proxy$.error.pipe(rx.filter(({ payload: [, , res0] }) => res0 === res)))) :
                    rx.EMPTY).pipe(rx.catchError(err => {
                    res.status(500).send(err);
                    return rx.EMPTY;
                })).subscribe();
                proxyServer.web(req, res, {
                    buffer: body === null || body === void 0 ? void 0 : body.readable,
                    selfHandleResponse,
                    headers: Object.assign(Object.assign({}, (body ?
                        { 'content-length': body.length + '' }
                        : {})), (selfHandleResponse ?
                        { 'cache-control': 'no-cache' } :
                        {}))
                });
            });
        });
    }
    else {
        const indexHtmlFile = plink_1.config.resolve('staticDir', 'plink/index.html');
        if (!fs_1.default.existsSync(indexHtmlFile)) {
            log.error('Can\'t find index HTML file:', indexHtmlFile);
            return;
        }
        const htmlDone = fs_1.default.promises.readFile(indexHtmlFile, 'utf8');
        ctx.expressAppUse(app => {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            app.use('/plink', async (req, res, next) => {
                const containsNoDot = !/\.\w+$/.test(new URL(req.originalUrl, 'http://whatever').pathname);
                if (containsNoDot) {
                    if (linkIdToFile.size > 0) {
                        const html = addDocHashDefInHtml(await htmlDone, '<script>\nvar __localMarkdownViewLinks = [' +
                            [...linkIdToFile.keys()].map(id => '"' + id + '"').join(', ') +
                            '];</script>');
                        res.setHeader('content-type', 'text/html');
                        res.send(html);
                    }
                    else {
                        next();
                    }
                }
                else {
                    next();
                }
            });
        });
    }
    r('newWorkerReady(imageToBeResolved, linkToBeResolved) -> imageResolved', broker.outputTable.l.newWorkerReady.pipe(rx.mergeMap(([, _workerNo, workerOutput, workerInput]) => rx.merge(workerOutput.pt.imageToBeResolved.pipe(rx.mergeMap(async ([m, imgSrc, file]) => {
        try {
            if (!/^\w+:\/\//.test(imgSrc)) {
                const imgFile = node_path_1.default.resolve(node_path_1.default.dirname(file), imgSrc);
                const hash = await digestSha1(imgFile);
                const url = ctx.contextPath + '/markdown-local/image/' + encodeURIComponent(hash);
                imgUrl2File.set(hash, imgFile);
                workerInput.ft.imageResolved(url).dp(m);
            }
            else
                workerInput.ft.imageResolved(imgSrc).dp(m);
        }
        catch (e) {
            markdown_processor_main_1.markdownProcessor.dispatchErrorFor(e, m);
        }
    })), workerOutput.pt.linkToBeResolved.pipe(rx.mergeMap(async ([m, href, file]) => {
        if (/^(?:\w+:)?\/\/.*?$/.test(href)) {
            workerInput.ft.linkResolved().dp(m);
            return;
        }
        else if (/\.md$/.test(href)) {
            const linkedFile = node_path_1.default.resolve(node_path_1.default.dirname(file), href);
            const id = await digestSha1(linkedFile);
            linkIdToFile.set(id, linkedFile);
            linksOfFile.get(file).add(id);
            workerInput.ft.linkResolved(id).dp(m);
        }
        else {
            workerInput.ft.linkResolved().dp(m);
        }
    }))))));
    r('loadFile', i.pt.loadFile.pipe(rx.mergeMap(([m, file]) => rx.from(fs_1.default.promises.readFile(file, 'utf8')).pipe(rx.mergeMap(content => {
        return i.ft.forkProcessFile(content, file).do(o.at.processFileDone);
    }), rx.tap(([, { resultHtml, toc, mermaid }]) => {
        o.ft.fileLoaded({
            html: (0, reactivizer_1.arrayBuffer2str)(resultHtml),
            toc,
            mermaids: mermaid.map(item => (0, reactivizer_1.arrayBuffer2str)(item)),
            linkHashes: [...linksOfFile.get(file).keys()]
        }).dp(m);
    }), rx.catchError((err) => {
        markdown_processor_main_1.markdownProcessor.dispatchErrorFor(err, m);
        return rx.EMPTY;
    })))));
}
exports.activate = activate;
function addDocHashDefInHtml(html, def) {
    const foundTitle$ = (0, markdown_processor_helper_1.elementByTagName)(html, 'title');
    let changed = html;
    foundTitle$.pipe(rx.tap(titleEl => {
        const pos = titleEl.sourceCodeLocation.endOffset;
        changed = html.slice(0, pos) + def + html.slice(pos);
        log.warn('Change HTML');
    }), rx.take(1)).subscribe();
    return changed;
}
const textEncoder = new TextEncoder();
async function digestSha1(text) {
    return btoa(String.fromCodePoint(...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-1', textEncoder.encode(text)))));
}
exports.digestSha1 = digestSha1;
//# sourceMappingURL=server.js.map