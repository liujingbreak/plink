"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const node_util_1 = tslib_1.__importDefault(require("node:util"));
const worker_threads_1 = require("worker_threads");
const rx = tslib_1.__importStar(require("rxjs"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const bootstrap_process_1 = require("../utils/bootstrap-process");
const cli_1 = require("../cmd/cli");
const fork_for_preserve_symlink_1 = require("../fork-for-preserve-symlink");
const reactivizer_1 = require("../../../packages/reactivizer");
const cmd_types_1 = require("./cmd.types");
const process_common_1 = require("./process-common");
const startTime = new Date().getTime();
process.env.__plinkLogMainPid = process.pid + '';
(0, bootstrap_process_1.initProcess)('save');
process.on('exit', (code) => {
    // eslint-disable-next-line no-console
    console.log((process.send || !worker_threads_1.isMainThread ? `[P${process.pid}.T${worker_threads_1.threadId}] ` : '') +
        chalk_1.default.green(`${code !== 0 ? 'Failed' : 'Done'} in ${new Date().getTime() - startTime} ms`));
});
const service = new reactivizer_1.ReactorComposite2({
    name: 'cmd-child-process',
    debug: true,
    outputTableFor: cmd_types_1.outputTableForCmdEntryProcEvents
});
const { i, o, r, outputTable } = service;
r('init commander', rx.from((0, cli_1.defineCommander)(() => {
    o.ft.onShutdown().dp();
    setImmediate(() => {
        o.ft.onShutdown().dp();
        setImmediate(() => {
            service.dispose();
            process.exit();
        });
    });
})).pipe(rx.tap(program => o.ft.onCommanderInited(program).dp())));
r('doCommand -> onCommandDone', i.pt.doCommand.pipe(rx.mergeMap((a) => outputTable.l.onCommanderInited.pipe(rx.map(([, commander]) => [...a, commander]), rx.take(1))), rx.mergeMap(async ([m, cols, rows, cwd, cmd, commander]) => {
    (0, process_common_1.setupTTY)(cols, rows);
    process.chdir(cwd);
    (0, fork_for_preserve_symlink_1.workDirChangedByCli)(cmd);
    try {
        await (0, cli_1.parseCommand)(commander, cmd);
        o.ft.onCommandDone().dp(m);
    }
    catch (err) {
        o.ft.onCommandError(node_util_1.default.inspect(err)).dp(m);
    }
})));
r('events should be lifted to parent process', rx.merge(o.at.onCommandError, o.at.onCommandDone, o.at.onReady, o.at.onShutdown, o.at._onErrorFor).pipe(rx.map(a => process.send({
    type: 'rx:message',
    content: (0, reactivizer_1.serializeAction)(a)
}))));
o.ft.onReady().dp({ i: Number(process.argv[2]) });
process.on('message', (msg) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (msg.type === 'rx:message') {
        (0, reactivizer_1.deserializeAction2)(msg.content, service.i);
        return;
    }
});
//# sourceMappingURL=server-child-process-entry.js.map