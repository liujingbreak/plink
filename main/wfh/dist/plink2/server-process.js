"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProcessService = void 0;
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const Path = tslib_1.__importStar(require("node:path"));
const cp = tslib_1.__importStar(require("node:child_process"));
const rx = tslib_1.__importStar(require("rxjs"));
const reactivizer_1 = require("../../../packages/reactivizer");
const fork_for_preserve_symlink_1 = require("../fork-for-preserve-symlink");
const cli_1 = require("../cmd/cli");
const cmd_types_1 = require("./cmd.types");
const process_common_1 = require("./process-common");
function lookupPlinkRoot(cwd) {
    const { root } = Path.parse(cwd);
    let plinkRoot;
    while (cwd !== root) {
        if (fs_1.default.existsSync(Path.join(cwd, 'node_modules/@wfh/plink'))) {
            plinkRoot = cwd;
            break;
        }
        cwd = Path.dirname(cwd);
    }
    return plinkRoot;
}
function createProcessService(log) {
    const mainPlinkRoot = lookupPlinkRoot(process.cwd());
    const plinkProcessByDir = new Map();
    if (mainPlinkRoot)
        plinkProcessByDir.set(mainPlinkRoot, { process: 'main', ready: true });
    const processService = new reactivizer_1.ReactorComposite2({
        name: 'server-process',
        debug: true,
        outputTableFor: cmd_types_1.outputTableForCmdEntryProcEvents,
        log
    });
    /** Child process service */
    const cpService = new reactivizer_1.ReactorComposite2({
        name: 'cmdChildProcessProcProxy',
        debug: true,
        log
    });
    const { i, o, r } = processService;
    r('init commander', rx.from((0, cli_1.defineCommander)(() => {
        cpService.o.ft.onShutdown().dp();
    })).pipe(rx.tap(program => o.ft.onCommanderInited(program).dp())));
    r('getProcessFor -> processFor', i.pt.getProcessFor.pipe(rx.map(([m, dir]) => {
        const root = lookupPlinkRoot(Path.resolve(dir));
        if (root == null) {
            processService.dispatchErrorFor(new Error(`No installed PLink found for ${dir}`), m);
        }
        return [m, root];
    }), rx.filter(([, root]) => root != null), rx.groupBy(([, dir]) => dir), rx.mergeMap(grouped$ => {
        return grouped$.pipe(rx.concatMap(async ([m, dir]) => {
            const p = plinkProcessByDir.get(dir);
            if (p != null) {
                o.ft.processFor(p.process, dir).dp(m);
            }
            else {
                try {
                    const childProcess = await createChildProcess(m, dir);
                    plinkProcessByDir.set(dir, {
                        process: childProcess,
                        ready: false
                    });
                    o.ft.processFor(childProcess, dir).dp(m);
                }
                catch (e) {
                    processService.dispatchErrorFor(e, m);
                }
            }
        }));
    })));
    r('sendCommand (childProcess.onCommandDone, onCommandError) -> childProcess.doCommand', i.pt.sendCommand.pipe(
    // Join process creation information
    rx.mergeMap(([m, [cols, rows], cwd, cmd, output]) => rx.combineLatest([
        i.ft.getProcessFor(cwd).ddo(o.pt.processFor),
        processService.outputTable.l.onCommanderInited
    ]).pipe(rx.take(1), rx.map(([[, p, rootDir], [, commanderOfMainProc]]) => [m, cols, rows, cmd, output, p, rootDir, commanderOfMainProc, cwd]))), rx.groupBy(([, , , , , , rootDir]) => rootDir), rx.mergeMap(grouped => grouped.pipe(
    // Using concatMap: commands should be queued up by correspoding child process or rootDir
    rx.concatMap(([m, cols, rows, cmd, output, p, rootDir, commanderOfMainProc, cwd]) => {
        var _a;
        if (p === 'main') {
            (0, process_common_1.setupTTY)(cols, rows);
            Object.assign(process.stdout, output);
            Object.assign(process.stderr, output);
            process.chdir(cwd);
            (0, fork_for_preserve_symlink_1.workDirChangedByCli)(cmd);
            return rx.from((0, cli_1.parseCommand)(commanderOfMainProc, cmd)).pipe(rx.catchError(err => {
                processService.dispatchErrorFor(err, m);
                return rx.EMPTY;
            }), rx.finalize(() => {
                cpService.o.ft.onCommandDone().dp(m);
                o.ft.onCommandDoneAnyway().dp(m);
            }));
        }
        else {
            p.stdout.pipe(output);
            p.stderr.pipe(output);
            return (
            // wait for child process ready
            ((_a = plinkProcessByDir.get(rootDir)) === null || _a === void 0 ? void 0 : _a.ready) ?
                rx.of(p) :
                o.pt.onChildProcessReady.pipe(rx.filter(([, d]) => rootDir === d), rx.take(1), rx.map(() => p))).pipe(rx.mergeMap(() => {
                const msg = cpService.i.createAction('doCommand', [cols, rows, cwd, cmd]);
                msg.r = m.i;
                p.send({
                    type: 'rx:message',
                    content: (0, reactivizer_1.serializeAction)(msg)
                });
                return rx.merge(cpService.o.pt.onCommandDone, cpService.o.pt.onCommandError).pipe((0, reactivizer_1.actionRelatedToAction)(msg), rx.take(1));
            }), rx.finalize(() => {
                o.ft.onCommandDoneAnyway().dp(m);
                p.stdout.unpipe(output);
                p.stderr.unpipe(output);
            }));
        }
    })))));
    r('processFor (onReady) -> change plinkProcessByDir', o.pt.processFor.pipe(rx.mergeMap(([m, , dir]) => cpService.o.pt.onReady.pipe((0, reactivizer_1.actionRelatedToActionRelatives)(m), rx.map(() => {
        plinkProcessByDir.get(dir).ready = true;
        o.ft.onChildProcessReady(dir).dp(m);
    }), rx.take(1)))));
    r('onShutdown', cpService.o.pt.onShutdown.pipe(rx.concatMap(() => rx.timer(500)), rx.mergeMap(() => rx.from(plinkProcessByDir.entries()).pipe(rx.mergeMap(([dir, { ready, process: child }]) => (child === 'main' ?
        rx.of(null) :
        ready ?
            rx.of(child) :
            o.pt.onChildProcessReady.pipe(rx.filter(([, d]) => dir === d), rx.take(1), rx.map(() => child)))), rx.filter(isChild => isChild != null), rx.map(child => child.kill('SIGINT')), rx.finalize(() => {
        setTimeout(() => {
            processService.dispose();
            cpService.dispose();
        }, 20);
    })))));
    r('interrupt', i.pt.interrupt.pipe(rx.mergeMap(([m, cwd]) => i.ft.getProcessFor(cwd).ddo(o.pt.processFor, m).pipe(rx.take(1), rx.map(([, ...param]) => [m, ...param]))), rx.groupBy(([, , root]) => root)));
    function createChildProcess(m, dir) {
        const p = cp.fork(plinkServerModule, ['' + m.i], {
            cwd: dir,
            stdio: 'pipe',
            detached: true
        });
        log('fork new process', p.pid);
        p.on('exit', (_code) => {
            plinkProcessByDir.delete(dir);
        });
        p.on('message', msg => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (msg.type === 'rx:message') {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
                const action = msg.content;
                if (action.r == null)
                    action.r = m.i;
                (0, reactivizer_1.deserializeAction2)(action, cpService.o);
            }
        });
        // rx.merge(
        //   processEvents.pt.onCommandDone.pipe(
        //     rx.map(() => o.ft.onCommandDone().dp(m))
        //   ),
        //   processEvents.pt.onCommandError.pipe(
        //     rx.map(([, err]) => processService.dispatchErrorFor(err, m))
        //   )
        // ).subscribe();
        return new Promise((resolve, rej) => {
            p.on('error', rej);
            p.on('spawn', () => resolve(p));
        });
    }
    return processService;
}
exports.createProcessService = createProcessService;
const plinkServerModule = Path.resolve(__dirname, 'server-child-process-entry.js');
//# sourceMappingURL=server-process.js.map