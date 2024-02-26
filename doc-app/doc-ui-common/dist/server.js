"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const tslib_1 = require("tslib");
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const rx = tslib_1.__importStar(require("rxjs"));
const plink_1 = require("@wfh/plink");
const md5_1 = tslib_1.__importDefault(require("md5"));
const reactivizer_1 = require("@wfh/reactivizer");
const markdown_processor_main_1 = require("./markdown-processor-main");
const log = (0, plink_1.log4File)(__filename);
function activate(ctx) {
    const router = ctx.router();
    const imgUrl2File = new Map();
    const broker = (0, markdown_processor_main_1.setupBroker)(false);
    const { i, o, r } = markdown_processor_main_1.markdownProcessor;
    router.get('/markdown-local/md', (req, res) => {
        log.info('load local markdown file', req.query.file, 'context:', ctx.contextPath);
        i.ft.loadFile(req.query.file, req.hostname).ddo(o.at.fileLoaded).pipe(rx.mergeMap(([, content]) => {
            return i.ft.forkProcessFile(content, req.query.file).do(o.at.processFileDone);
        }), rx.tap(([, { resultHtml, toc, mermaid }]) => {
            res.json({
                html: resultHtml,
                toc,
                mermaid: JSON.stringify(mermaid.map(item => (0, reactivizer_1.arrayBuffer2str)(item)))
            });
        }), rx.take(1), rx.catchError((err) => {
            res.status(400).json(err);
            return rx.EMPTY;
        }))
            .subscribe();
    });
    router.get('/markdown-local/image/:imgHash', (req, res) => {
        const hash = req.params.imgHash;
        const file = imgUrl2File.get(hash);
        res.contentType('image/' + node_path_1.default.extname(file));
        fs_1.default.createReadStream(file).pipe(res);
    });
    r('newWorkerReady(imageToBeResolved, linkToBeResolved) -> imageResolved', broker.outputTable.l.newWorkerReady.pipe(rx.mergeMap(([, _workerNo, workerOutput, workerInput]) => rx.merge(workerOutput.pt.imageToBeResolved.pipe(rx.tap(([m, imgSrc, file]) => {
        try {
            if (!/^\w+:\/\//.test(imgSrc)) {
                const imgFile = node_path_1.default.resolve(file, imgSrc);
                const hash = btoa((0, md5_1.default)(imgFile, { asString: true }));
                const url = '/markdown-local/image/' + hash;
                imgUrl2File.set(hash, imgFile);
                workerInput.ft.imageResolved(url).dp(m);
            }
            else
                workerInput.ft.imageResolved(imgSrc).dp(m);
        }
        catch (e) {
            markdown_processor_main_1.markdownProcessor.dispatchErrorFor(e, m);
        }
    })), workerOutput.pt.linkToBeResolved.pipe(rx.tap(([m, href, _file]) => {
        const matched = /([^/]+)\.md$/.exec(href);
        if (matched === null || matched === void 0 ? void 0 : matched[1]) {
            workerInput.ft.linkResolved(JSON.stringify(matched[1])).dp(m);
            return;
        }
        workerInput.ft.linkResolved(JSON.stringify(href)).dp(m);
    }))))));
    r('loadFile', i.pt.loadFile.pipe(rx.mergeMap(([m, file]) => fs_1.default.promises.readFile(file, 'utf8').then(data => {
        o.ft.fileLoaded(data).dp(m);
    }).catch(err => markdown_processor_main_1.markdownProcessor.dispatchErrorFor(err, m)))));
}
exports.activate = activate;
//# sourceMappingURL=server.js.map