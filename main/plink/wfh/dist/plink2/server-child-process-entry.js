"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.service = void 0;
const tslib_1 = require("tslib");
const node_util_1 = tslib_1.__importDefault(require("node:util"));
const worker_threads_1 = require("worker_threads");
const rx = tslib_1.__importStar(require("rxjs"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const reactivizer_1 = require("@wfh/reactivizer");
const bootstrap_process_1 = require("../utils/bootstrap-process");
const cli_1 = require("../cmd/cli");
const fork_for_preserve_symlink_1 = require("../fork-for-preserve-symlink");
const cmd_definition_1 = require("./cmd-definition");
const process_common_1 = require("./process-common");
const startTime = new Date().getTime();
if (process.send) {
    process.on('message', (msg) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (msg.type === 'rx:message') {
            (0, reactivizer_1.deserializeAction2)(msg.content, exports.service.i);
            return;
        }
    });
    process.env.__plinkLogMainPid = process.pid + '';
    (0, bootstrap_process_1.initProcess)('save');
    process.on('exit', (code) => {
        // eslint-disable-next-line no-console
        console.log((process.send || !worker_threads_1.isMainThread ? `[P${process.pid}.T${worker_threads_1.threadId}] ` : '') +
            chalk_1.default.green(`${code !== 0 ? 'Failed' : 'Done'} in ${new Date().getTime() - startTime} ms`));
    });
}
const inputTableFor = ['setRootDir'];
const outputTableFor = ['onCommanderInited'];
exports.service = new reactivizer_1.ReactorComposite2({
    name: 'server-child-process-entry',
    debug: true,
    inputTableFor,
    outputTableFor
});
const { i, o, r, outputTable } = exports.service;
const rootDir$ = (process.send ?
    rx.of(process.cwd()) :
    exports.service.inputTable.l.setRootDir.pipe(rx.map(([, dir]) => dir)));
r('setRootDir? -> onCommanderInited', rootDir$.pipe(rx.mergeMap(dir => (0, cmd_definition_1.define)(dir, () => o.ft.onShutdown().dp())), rx.tap(program => o.ft.onCommanderInited(program).dp())));
r('doCommand -> onCommandDone', i.pt.doCommand.pipe(rx.mergeMap((a) => outputTable.l.onCommanderInited.pipe(rx.map(([, commander]) => [...a, commander]), rx.take(1))), rx.mergeMap(async ([m, cols, rows, cwd, cmd, commander]) => {
    (0, process_common_1.setupTTY)(cols, rows);
    if (process.cwd() !== cwd) {
        process.chdir(cwd);
        (0, fork_for_preserve_symlink_1.workDirChangedByCli)(cmd);
    }
    try {
        await (0, cli_1.parseCommand)(commander, cmd);
        o.ft.onCommandDone().dp(m);
    }
    catch (err) {
        o.ft.onCommandError(node_util_1.default.inspect(err)).dp(m);
    }
})));
if (process.send) {
    r('events should be lifted to parent process', rx.merge(o.at.onCommandError, o.at.onCommandDone, o.at.onReady, o.at.onShutdown, o.at._onErrorFor).pipe(rx.map(a => process.send({
        type: 'rx:message',
        content: (0, reactivizer_1.serializeAction)(a)
    }))));
}
r('onShutdown', o.pt.onShutdown.pipe(rx.map(() => setImmediate(() => exports.service.dispose()))));
if (process.send)
    o.ft.onReady().dp({ i: Number(process.argv[2]) });
//# sourceMappingURL=server-child-process-entry.js.map