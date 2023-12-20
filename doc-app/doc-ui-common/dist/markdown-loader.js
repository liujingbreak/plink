"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const rx = tslib_1.__importStar(require("rxjs"));
const op = tslib_1.__importStar(require("rxjs/operators"));
const reactivizer_1 = require("@wfh/reactivizer");
// import {markdownToHtml} from './markdown-util';
const markdown_processor_main_1 = require("./markdown-processor-main");
// require('node:inspector').open(9222, 'localhost', true);
const broker = (0, markdown_processor_main_1.setupBroker)(false);
const markdownLoader = function (source, sourceMap) {
    const cb = this.async();
    const importCode = [];
    let imgIdx = 0;
    // const logger = this.getLogger('markdown-loader');
    // debugger;
    const { i, o } = markdown_processor_main_1.markdownProcessor;
    broker.outputTable.l.newWorkerReady.pipe(rx.mergeMap(([, _workerNo, workerOutput, workerInput]) => rx.merge(workerOutput.pt.imageToBeResolved.pipe(rx.tap(([m, imgSrc, _file]) => {
        try {
            const url = imgSrc.startsWith('.') ? imgSrc : './' + imgSrc;
            importCode.push(`import imgSrc${imgIdx} from '${url}';`);
            workerInput.dpf.imageResolved(m, 'imgSrc' + (imgIdx++));
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
    })))), rx.takeUntil(i.do.forkProcessFile(o.at.processFileDone, source, this.resourcePath).pipe(rx.take(1), rx.tap(([, { resultHtml, toc, mermaid }]) => {
        cb(null, importCode.join('\n') + '\nconst html = ' + (0, reactivizer_1.arrayBuffer2str)(resultHtml) +
            ';\nlet toc = ' + JSON.stringify(toc) +
            ';\nlet mermaids = ' + JSON.stringify(mermaid.map(item => (0, reactivizer_1.arrayBuffer2str)(item))) + ';' +
            ';\nlet m = {html, toc, mermaids};\nexport default m;\n', sourceMap);
    }), op.catchError(err => {
        cb(err, JSON.stringify(err), sourceMap);
        return rx.EMPTY;
    })))).subscribe();
};
exports.default = markdownLoader;
//# sourceMappingURL=markdown-loader.js.map