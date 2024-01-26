"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const tslib_1 = require("tslib");
const rx = tslib_1.__importStar(require("rxjs"));
const plink_1 = require("@wfh/plink");
const reactivizer_1 = require("@wfh/reactivizer");
const markdown_processor_main_1 = require("./markdown-processor-main");
const log = (0, plink_1.log4File)(__filename);
const broker = (0, markdown_processor_main_1.setupBroker)(false);
const { i, o, r } = markdown_processor_main_1.markdownProcessor;
function activate(ctx) {
    const router = ctx.router();
    router.get('/markdown-local', (req, res) => {
        log.info('load local markdown file', req.query.file);
        i.do.loadFile(o.at.fileLoaded, req.query.file).pipe(rx.mergeMap(([, content]) => {
            return i.do.forkProcessFile(o.at.processFileDone, content, req.query.file);
        }), rx.tap(([, { resultHtml, toc, mermaid }]) => {
            res.json({
                html: resultHtml,
                toc,
                mermaid: JSON.stringify(mermaid.map(item => (0, reactivizer_1.arrayBuffer2str)(item)))
            });
        }), rx.take(1), rx.catchError((err) => {
            res.status(400).json(err);
            return rx.EMPTY;
        })).subscribe();
    });
}
exports.activate = activate;
r('newWorkerReady(imageToBeResolved, linkToBeResolved) -> imageResolved', broker.outputTable.l.newWorkerReady.pipe(rx.mergeMap(([, _workerNo, workerOutput, workerInput]) => rx.merge(workerOutput.pt.imageToBeResolved.pipe(rx.tap(([m, imgSrc, _file]) => {
    try {
        const url = imgSrc.startsWith('.') ? imgSrc : './' + imgSrc;
        // TODO
        workerInput.dpf.imageResolved(m, 'TODO');
    }
    catch (e) {
        markdown_processor_main_1.markdownProcessor.dispatchErrorFor(e, m);
    }
})), workerOutput.pt.linkToBeResolved.pipe(rx.tap(([m, href, _file]) => {
    const matched = /([^/]+)\.md$/.exec(href);
    if (matched === null || matched === void 0 ? void 0 : matched[1]) {
        workerInput.dpf.linkResolved(m, JSON.stringify(matched[1]));
        return;
    }
    workerInput.dpf.linkResolved(m, JSON.stringify(href));
}))))));
//# sourceMappingURL=server.js.map