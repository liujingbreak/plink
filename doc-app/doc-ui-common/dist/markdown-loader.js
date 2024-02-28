"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const rx = tslib_1.__importStar(require("rxjs"));
const reactivizer_1 = require("@wfh/reactivizer");
const plink_1 = require("@wfh/plink");
const markdown_util_1 = require("./markdown-util");
const markdown_processor_main_1 = require("./markdown-processor-main");
const log = (0, plink_1.log4File)(__filename);
const broker = (0, markdown_processor_main_1.setupBroker)(false);
const { i, o } = markdown_processor_main_1.markdownProcessor;
const processStateByFile = new Map();
broker.r('newWorkerReady, (imageToBeResolved, linkToBeResolved)', broker.outputTable.l.newWorkerReady.pipe(rx.mergeMap(([, _workerNo, workerOutput, workerInput]) => rx.merge(workerOutput.pt.imageToBeResolved.pipe(rx.tap(([m, imgSrc, file]) => {
    try {
        const state = processStateByFile.get(file);
        const { importCode, imgIdx } = state;
        const url = imgSrc.startsWith('.') ? imgSrc : './' + imgSrc;
        importCode.push(`import imgSrc${imgIdx} from '${url}';`);
        workerInput.ft.imageResolved('imgSrc' + imgIdx).dp(m);
        state.imgIdx++;
    }
    catch (e) {
        markdown_processor_main_1.markdownProcessor.dispatchErrorFor(e, m);
    }
})), workerOutput.pt.linkToBeResolved.pipe(rx.mergeMap(async ([m, href, file]) => {
    const matched = /^(?:\w+:)?\/\//.exec(href);
    const state = processStateByFile.get(file);
    if (matched == null) {
        const mdMatch = /^(.*?)\.md$/.exec(href);
        if (mdMatch) {
            const absFile = node_path_1.default.resolve(node_path_1.default.dirname(file), href).replace(/\\/g, '/');
            const hash = await (0, markdown_util_1.digestSha1)(absFile);
            workerInput.ft.linkResolved(JSON.stringify('md-hash:' + hash)).dp(m);
            state.links.push([hash, absFile]);
            return;
        }
    }
    workerInput.ft.linkResolved(JSON.stringify(href)).dp(m);
}))))));
const markdownLoader = function (source, sourceMap) {
    const cb = this.async();
    processStateByFile.set(this.resourcePath, { importCode: [], imgIdx: 0, links: [] });
    i.ft.forkProcessFile(source, this.resourcePath).ddo(o.at.processFileDone).pipe(rx.take(1), rx.tap(([, { resultHtml, toc, mermaid }]) => {
        const { importCode, links } = processStateByFile.get(this.resourcePath);
        cb(null, importCode.join('\n') + '\nconst html = ' + (0, reactivizer_1.arrayBuffer2str)(resultHtml) +
            ';\nlet toc = ' + JSON.stringify(toc) +
            ';\nlet mermaids = ' + JSON.stringify(mermaid.map(item => (0, reactivizer_1.arrayBuffer2str)(item))) + ';' +
            ';\nlet links = {' +
            links.map(([hash, absFile], i) => {
                let linkPath = node_path_1.default.relative(this.context, absFile).replace(/\\/g, '/');
                if (!linkPath.startsWith('.'))
                    linkPath = './' + linkPath;
                log.info('link:', linkPath);
                return `${i > 0 ? ',' : ''}\n\r'${hash}': () => import('@wfh/reactivizer/whatever.js!=!@wfh/doc-ui-common/dist/markdown-loader!${linkPath}').then(res => res.default)`;
            }).join('') + '\n}' +
            ';\nlet m = {html, toc, mermaids, links};\nexport default m;\n', sourceMap);
    }), rx.catchError(err => {
        cb(err, JSON.stringify(err), sourceMap);
        return rx.EMPTY;
    }), rx.finalize(() => {
        processStateByFile.delete(this.resourcePath);
    })).subscribe();
};
exports.default = markdownLoader;
//# sourceMappingURL=markdown-loader.js.map