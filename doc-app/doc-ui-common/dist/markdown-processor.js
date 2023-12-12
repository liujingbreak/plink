"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markdownProcessor = void 0;
const plink_1 = require("@wfh/plink");
const node_worker_1 = require("@wfh/reactivizer/dist/fork-join/node-worker");
const markdown_process_common_1 = require("../isom/markdown-process-common");
const log = (0, plink_1.log4File)(__filename);
exports.markdownProcessor = (0, node_worker_1.createWorkerControl)({
    name: 'markdownProcessor',
    debug: true,
    debugExcludeTypes: ['wait', 'stopWaiting'],
    log(...msg) {
        log.info(...msg);
    }
});
(0, markdown_process_common_1.setupReacting)(exports.markdownProcessor);
//# sourceMappingURL=markdown-processor.js.map