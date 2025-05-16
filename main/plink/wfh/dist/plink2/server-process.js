"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProcessManager = createProcessManager;
const tslib_1 = require("tslib");
const Path = tslib_1.__importStar(require("node:path"));
const cp = tslib_1.__importStar(require("node:child_process"));
const util = tslib_1.__importStar(require("node:util"));
const rx = tslib_1.__importStar(require("rxjs"));
const reactivizer_1 = require("@wfh/reactivizer");
const fork_for_preserve_symlink_1 = require("../fork-for-preserve-symlink");
const process_common_1 = require("./process-common");
const server_child_process_service_1 = require("./server-child-process-service");
const server_process_stdout_1 = require("./server-process-stdout");
const cmd_model_1 = require("./cmd-model");
const process_common_2 = require("./process-common");
const tableFor = ['onCachedError'];
function createProcessManager(log) {
    const mainPlinkRoot = (0, process_common_2.lookupPlinkRoot)(process.cwd());
    const plinkProcessByDir = new Map();
    const processManager = new reactivizer_1.ReactorComposite2({
        name: 'server-process',
        debug: false,
        outputTableFor: tableFor,
        log
    });
    /** Child process service */
    const cpProxy = new reactivizer_1.SimplexReactor({
        name: 'cmdChildProcessProcProxy',
        debug: false,
        log
    });
    const svrChdService = (0, server_child_process_service_1.createService)(log);
    const { i, o, r } = processManager;
    const errors$ = rx.merge(svrChdService.error$, svrChdService.s.pt.onCommandError, svrChdService.s.pt.onUncaughtServiceError.pipe(rx.map(([, ...errInfo]) => errInfo)), processManager.error$, cpProxy.error$);
    r('error$, startRecordError, sendCommand -> onCachedError', errors$.pipe(
    // rx.tap(errWithLabel => { log('got', errWithLabel); }),
    rx.bufferToggle(o.pt.startRecordError, () => i.pt.sendCommand), rx.map(errors => {
        o.ft.onCachedError(errors).dp();
    })));
    r('onCachedError, sendCommand', rx.zip(o.pt.onCachedError, i.pt.sendCommand).pipe(rx.map(([[, errors], [, , , , output]]) => {
        for (const [err, label] of errors) {
            if (label) {
                output.write(label);
                output.write(' - ');
            }
            output.write(util.inspect(err));
            output.write('\n');
        }
    })));
    r('cmdModelService.enableRxMessageTrace ->', cmd_model_1.cmdModelService.inputTable.l.enableRxMessageTrace.pipe(rx.distinctUntilChanged(([, a], [, b]) => a === b), rx.map(([, enabled]) => {
        const opts = { debug: enabled };
        svrChdService.config(opts);
        processManager.config(opts);
        cpProxy.config(opts);
    })));
    r('getProcessFor -> processFor', i.pt.getProcessFor.pipe(rx.map(([m, dir]) => {
        const root = (0, process_common_2.lookupPlinkRoot)(Path.resolve(dir));
        if (root == null) {
            processManager.dispatchErrorFor(new Error(`No installed PLink found for ${dir}`), m);
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
                    processManager.dispatchErrorFor(e, m);
                }
            }
        }));
    })));
    r('sendCommand, (onCommandDoneAnyway) -> startRecordError', i.pt.sendCommand.pipe(rx.mergeMap(([m, , , , output]) => {
        return errors$.pipe(rx.map(([err, label]) => {
            if (label) {
                output.write(util.inspect(label));
                output.write('\n');
            }
            output.write(util.inspect(err));
            output.write('\n');
        }), rx.takeUntil(o.pt.onCommandDoneAnyway.pipe((0, reactivizer_1.actionRelatedToAction)(m))), rx.finalize(() => {
            o.ft.startRecordError().dp(m);
        }));
    })));
    r('sendCommand (childProcess.onCommandDone, onCommandError) -> childProcess.doCommand', i.pt.sendCommand.pipe(
    // Join process creation information
    rx.mergeMap(([m, [cols, rows], cwd, cmd, output]) => i.ft.getProcessFor(cwd).od(o.pt.processFor).pipe(rx.take(1), rx.map(([, p, rootDir]) => [
        m, cols, rows, cmd, output, p,
        rootDir, cwd
    ]))), rx.groupBy(([, , , , , , rootDir]) => rootDir), rx.mergeMap(grouped => grouped.pipe(
    // Using concatMap: commands should be queued up by correspoding child process or rootDir
    rx.mergeMap(([m, cols, rows, cmd, output, p, rootDir, cwd]) => {
        var _a;
        try {
            if (p === 'main') {
                (0, process_common_1.setupTTY)(cols, rows);
                if (process.cwd() !== cwd) {
                    process.chdir(cwd);
                    (0, fork_for_preserve_symlink_1.workDirChangedByCli)(cmd);
                }
                const [stdout, stopReadStdout] = (0, server_process_stdout_1.createCurrentProcessOutputReader)();
                stdout.pipe(output);
                const [done$, error$] = svrChdService.s.ft.doCommand(cols, rows, cwd, cmd)
                    .od(svrChdService.s.pt.onCommandDone, svrChdService.s.pt.onCommandError);
                return done$.pipe(rx.take(1), rx.timeout(120000), // 2 min
                rx.takeUntil(error$.pipe(rx.map(([, err]) => {
                    return err;
                }))), rx.catchError(err => {
                    processManager.dispatchErrorFor(err, m);
                    return rx.EMPTY;
                }), rx.finalize(() => {
                    stopReadStdout();
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
                    const msg = cpProxy.s.createAction('doCommand', [cols, rows, cwd, cmd]);
                    msg.r = m.i;
                    p.send({
                        type: 'rx:message',
                        content: (0, reactivizer_1.serializeAction)(msg)
                    });
                    return rx.merge(cpProxy.s.pt.onCommandDone, cpProxy.s.pt.onCommandError).pipe((0, reactivizer_1.actionRelatedToAction)(msg), rx.take(1));
                }), rx.finalize(() => {
                    o.ft.onCommandDoneAnyway().dp(m);
                    p.stdout.unpipe(output);
                    p.stderr.unpipe(output);
                }));
            }
        }
        catch (err) {
            processManager.dispatchErrorFor(err, m);
            return rx.EMPTY;
        }
    })))));
    r('processFor (onReady) -> change plinkProcessByDir', o.pt.processFor.pipe(rx.mergeMap(([m, , dir]) => cpProxy.s.pt.onReady.pipe((0, reactivizer_1.actionRelatedToActionRelatives)(m), rx.map(() => {
        plinkProcessByDir.get(dir).ready = true;
        o.ft.onChildProcessReady(dir).dp(m);
    }), rx.take(1)))));
    r('onShutdown -> dispose', rx.merge(svrChdService.s.pt.onShutdown, cpProxy.s.pt.onShutdown).pipe(rx.concatMap(() => rx.timer(500)), rx.mergeMap(() => rx.from(plinkProcessByDir.entries()).pipe(rx.mergeMap(([dir, { ready, process: child }]) => (child === 'main' ?
        rx.of(null) :
        ready ?
            rx.of(child) :
            o.pt.onChildProcessReady.pipe(rx.filter(([, d]) => dir === d), rx.take(1), rx.map(() => child)))), rx.filter(isChild => isChild != null), rx.map(child => child.kill('SIGINT')), rx.finalize(() => {
        setTimeout(() => {
            processManager.dispose();
            cpProxy.dispose();
        }, 20);
    })))));
    r('interrupt', i.pt.interrupt.pipe(rx.mergeMap(([m, cwd]) => i.ft.getProcessFor(cwd).ddo(o.pt.processFor, m).pipe(rx.take(1), rx.map(([, ...param]) => [m, ...param]))), rx.groupBy(([, , root]) => root)
    // rx.mergeMap(g$ => g$.pipe(
    //   rx.exhaustMap(([, p, rootDir]) => {
    //     if (p === 'main') {
    //       i.ft.sendCommand([150, 50], rootDir, ['stop'], new );
    //     } else 
    //     // TODO
    //   })
    // ))
    ));
    o.ft.startRecordError().dp();
    if (mainPlinkRoot) {
        plinkProcessByDir.set(mainPlinkRoot, { process: 'main', ready: true });
        svrChdService.s.ft.setRootDir(mainPlinkRoot).dp();
    }
    else {
        throw new Error('can not find @wfh/plink directory in');
    }
    function createChildProcess(m, dir) {
        const p = cp.fork(plinkServerModule, ['' + m.i], {
            cwd: dir,
            stdio: 'pipe',
            detached: true
        });
        // eslint-disable-next-line no-console
        log('server-process fork new process', p.pid);
        p.on('exit', (_code) => {
            plinkProcessByDir.delete(dir);
        });
        p.on('message', msg => {
            if (msg.type === 'rx:message') {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
                const action = msg.content;
                if (action.r == null)
                    action.r = m.i;
                (0, reactivizer_1.deserializeAction2)(action, cpProxy.s);
            }
            else if (msg.type === 'plink2:log') {
                log(...msg.msg);
            }
        });
        return new Promise((resolve, rej) => {
            p.on('error', rej);
            p.on('spawn', () => resolve(p));
        });
    }
    return processManager;
}
const plinkServerModule = Path.resolve(__dirname, 'server-process-child.js');
//# sourceMappingURL=server-process.js.map