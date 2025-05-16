"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const worker_threads_1 = require("worker_threads");
const rx = tslib_1.__importStar(require("rxjs"));
const reactivizer_1 = require("@wfh/reactivizer");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const server_child_process_service_1 = require("./server-child-process-service");
const service = (0, server_child_process_service_1.createService)(log);
function log(...msg) {
    process.send({
        type: 'plink2:log',
        msg
    });
}
const startTime = new Date().getTime();
if (process.send) {
    const { s, r } = service;
    s.ft.onReady().dp({ i: Number(process.argv[2]) });
    s.ft.setRootDir(process.cwd()).dp();
    r('events should be lifted to parent process', rx.merge(s.at.onCommandError, s.at.onCommandDone, s.at.onReady, s.at.onShutdown, s.at.__onError, s.at.onUncaughtServiceError).pipe(rx.map(a => process.send({
        type: 'rx:message',
        content: (0, reactivizer_1.serializeAction)(a)
    }))));
    process.on('message', (msg) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (msg.type === 'rx:message') {
            (0, reactivizer_1.deserializeAction2)(msg.content, service.s);
            return;
        }
    });
    process.env.__plinkLogMainPid = process.pid + '';
    // initProcess('save');
    process.on('exit', (code) => {
        // eslint-disable-next-line no-console
        console.log((process.send || !worker_threads_1.isMainThread ? `[P${process.pid}.T${worker_threads_1.threadId}] ` : '') +
            chalk_1.default.green(`${code !== 0 ? 'Failed' : 'Done'} in ${new Date().getTime() - startTime} ms`));
    });
}
//# sourceMappingURL=server-process-child.js.map