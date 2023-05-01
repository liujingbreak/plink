"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toContentAndToc = void 0;
const tslib_1 = require("tslib");
const node_worker_threads_1 = require("node:worker_threads");
const markdown_it_1 = tslib_1.__importDefault(require("markdown-it"));
const op = tslib_1.__importStar(require("rxjs/operators"));
const rx = tslib_1.__importStar(require("rxjs"));
const highlight = tslib_1.__importStar(require("highlight.js"));
const plink_1 = require("@wfh/plink");
(0, plink_1.initAsChildProcess)();
const log = (0, plink_1.log4File)(__filename);
const md = new markdown_it_1.default({
    html: true,
    highlight(str, lang, attrs) {
        if (lang && lang !== 'mermaid') {
            try {
                return highlight.highlight(lang, str, true).value;
            }
            catch (e) {
                log.debug(e); // skip non-important error like: Unknown language: "mermaid"
            }
        }
        return str;
    }
});
const THREAD_MSG_TYPE_RESOLVE_IMG = 'resolveImageSrc';
function toContentAndToc(source) {
    const { parseHtml } = require('./markdown-util');
    return parseHtml(md.render(source), imgSrc => {
        return new rx.Observable(sub => {
            const cb = (msg) => {
                if (msg.type === THREAD_MSG_TYPE_RESOLVE_IMG) {
                    node_worker_threads_1.parentPort.off('message', cb);
                    log.info('thread', node_worker_threads_1.threadId, 'recieved resolved URL', msg.data);
                    sub.next(msg.data);
                    sub.complete();
                }
            };
            node_worker_threads_1.parentPort.on('message', cb);
            node_worker_threads_1.parentPort.postMessage({ type: THREAD_MSG_TYPE_RESOLVE_IMG, data: imgSrc });
            return () => node_worker_threads_1.parentPort.off('message', cb);
        });
    }).pipe(op.take(1)).toPromise();
}
exports.toContentAndToc = toContentAndToc;
//# sourceMappingURL=markdown-loader-worker.js.map