"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.service = void 0;
const tslib_1 = require("tslib");
const node_util_1 = tslib_1.__importDefault(require("node:util"));
const worker_threads_1 = require("worker_threads");
const rx = tslib_1.__importStar(require("rxjs"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const reactivizer_1 = require("@wfh/reactivizer");
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
// import {initProcess} from '../utils/bootstrap-process';
const fork_for_preserve_symlink_1 = require("../fork-for-preserve-symlink");
const cmd_model_1 = require("./cmd-model");
const cmd_definition_1 = require("./cmd-definition");
const process_common_1 = require("./process-common");
// import inspector from 'inspector';
// inspector.open(9222);
const startTime = new Date().getTime();
if (process.send) {
    process.on('message', (msg) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (msg.type === 'rx:message') {
            (0, reactivizer_1.deserializeAction2)(msg.content, exports.service.s);
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
const tableFor = ['setRootDir', 'onCommanderInited'];
exports.service = new reactivizer_1.SimplexReactor({
    name: 'server-child-process-entry',
    debug: true,
    tableFor,
    log(msg, ...objs) {
        // eslint-disable-next-line no-console
        console.log(new Date().toLocaleTimeString(), (0, nodejs_utils_1.formatToConciseNoColor)(msg, ...objs));
    }
});
const { s, r, table } = exports.service;
// const rootDir$ = (process.send ?
//   rx.of(process.cwd()) :
//   service.table.l.setRootDir.pipe(
//     rx.map(([, dir]) => dir)
//   ));
if (process.send) {
    s.ft.setRootDir(process.cwd()).dp();
}
(0, cmd_definition_1.define)(exports.service);
r('cmdModelService.enableRxMessageTrace ->', cmd_model_1.cmdModelService.inputTable.l.enableRxMessageTrace.pipe(rx.distinctUntilChanged(([, a], [, b]) => a === b), rx.map(([, enabled]) => {
    exports.service.config({ debug: enabled });
})));
r('doCommand -> onCommandDone', s.pt.doCommand.pipe(rx.mergeMap((a) => table.l.onCommanderInited.pipe(rx.map(([, commander]) => [...a, commander]), rx.take(1))), rx.mergeMap(async ([m, cols, rows, cwd, cmd, commander]) => {
    (0, process_common_1.setupTTY)(cols, rows);
    if (process.cwd() !== cwd) {
        process.chdir(cwd);
        (0, fork_for_preserve_symlink_1.workDirChangedByCli)(cmd);
    }
    const exit = process.exit;
    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        process.exit = (() => {
            throw new Error('cmd-help');
        }); // commander's help() will invoke process.exit(), I have to void this happends
        await commander.parseAsync(cmd, { from: 'user' });
        s.ft.onCommandDone().dp(m);
    }
    catch (err) {
        if (err.message === 'cmd-help') {
            s.ft.onCommandDone().dp(m);
        }
        else {
            s.ft.onCommandError(node_util_1.default.inspect(err)).dp(m);
            exports.service.dispatchErrorFor(err, m);
        }
    }
    finally {
        process.exit = exit;
    }
})));
if (process.send) {
    r('events should be lifted to parent process', rx.merge(s.at.onCommandError, s.at.onCommandDone, s.at.onReady, s.at.onShutdown, s.at.__onError, s.at.onUncaughtServiceError).pipe(rx.map(a => process.send({
        type: 'rx:message',
        content: (0, reactivizer_1.serializeAction)(a)
    }))));
}
r('onShutdown', s.pt.onShutdown.pipe(rx.map(() => setImmediate(() => exports.service.dispose()))));
if (process.send)
    s.ft.onReady().dp({ i: Number(process.argv[2]) });
//# sourceMappingURL=server-child-process-entry.js.map