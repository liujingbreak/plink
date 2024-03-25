"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const node_child_process_1 = require("node:child_process");
const path_1 = tslib_1.__importDefault(require("path"));
const http = tslib_1.__importStar(require("node:http"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const rx = tslib_1.__importStar(require("rxjs"));
const reactivizer_1 = require("../../../packages/reactivizer");
const args = process.argv.splice(2);
const outputTableFor = ['onResponse'];
const clientSerivce = new reactivizer_1.ReactorComposite2({
    name: 'client',
    debug: process.env.NODE_ENV === 'development',
    outputTableFor
});
const { i, o, r, outputTable } = clientSerivce;
process.on('SIGINT', () => i.ft.signalInt().dp());
r('requestStart, onConnRefused -> request(), startCmdServer', i.pt.requestStart.pipe(rx.concatMap(([m]) => rx.merge(o.pt.onConnRefused.pipe(rx.map(() => {
    o.ft.startCmdServer().dp(m);
}), rx.take(1)), new rx.Observable(sub => {
    o.ft.requesting().dp(m);
    sub.complete();
})))));
r('onReqError -> onConnRefused', o.pt.onReqError.pipe(rx.map(([, err]) => {
    if (err.code === 'ECONNREFUSED') {
        o.ft.onConnRefused().dp();
    }
    else {
        console.error(err);
        clientSerivce.dispose();
        process.exit(1);
    }
})));
r('startCmdServer, onConnRefused -> request()', o.pt.startCmdServer.pipe(rx.concatMap(([m]) => {
    const cp = (0, node_child_process_1.fork)(path_1.default.resolve(__dirname, 'cmd-server.js'), {
        stdio: 'ignore',
        detached: true
    });
    cp.unref();
    cp.on('spawn', () => {
        // eslint-disable-next-line no-console
        console.log('daemon process ID:', chalk_1.default.cyan(cp.pid));
    });
    return rx.concat(rx.timer(1500), rx.merge(o.pt.onConnRefused.pipe(rx.concatMap(() => rx.timer(1000)), rx.map((_, idx) => {
        if (idx < 3) {
            o.ft.requesting().dp(m);
        }
        else {
            console.error('Can not connect to daemon process');
            clientSerivce.dispose();
            process.exit();
        }
    })), new rx.Observable(sub => {
        function h(err) {
            console.error(err);
        }
        cp.on('error', h);
        o.ft.requesting().dp(m);
        sub.complete();
        return () => cp.off('error', h);
    })));
})));
r('onServerReplied', o.pt.onServerReplied.pipe(rx.tap(() => {
    clientSerivce.dispose();
    // In case a new server child process is started, client process still does not exit after all
    process.exit();
})));
r('requesting', o.pt.requesting.pipe(rx.concatMap(([m]) => {
    return request(m);
})));
r('onRequestReady, (onReqClosed, onReqError) -> onRequestReady(undefined)', o.pt.onRequestReady.pipe(rx.filter(([, req]) => req != null), rx.concatMap(([m]) => rx.merge(o.pt.onReqClosed.pipe((0, reactivizer_1.actionRelatedToActionRelatives)(m)), o.pt.onReqError.pipe((0, reactivizer_1.actionRelatedToActionRelatives)(m))).pipe(rx.tap(() => o.ft.onRequestReady().dp(m))))));
r('signalInt (onResponse) -> dispose', i.pt.signalInt.pipe(rx.exhaustMap(([m]) => outputTable.l.onResponse.pipe(rx.take(1), rx.concatMap(() => {
    return request(m, ['SIGINT']);
}), rx.concatMap(() => rx.timer(100)))), rx.tap(() => {
    clientSerivce.dispose();
    process.exit();
})));
i.ft.requestStart().dp();
function request(m, cmd = args) {
    const req = http.request({
        port: 14329,
        method: 'POST',
        timeout: 1000
    });
    return rx.merge(rx.fromEventPattern(h => req.on('error', h), h => req.off('error', h)).pipe(rx.map(err => {
        o.ft.onReqError(err).dp(m);
    }), rx.ignoreElements()), rx.fromEventPattern(h => req.on('close', h), h => req.off('close', h)).pipe(rx.tap(() => {
        o.ft.onReqClosed().dp(m);
        o.ft.onRequestReady().dp(m);
    })), rx.fromEventPattern(h => req.on('response', h), h => req.off('response', h)).pipe(rx.tap(res => {
        o.ft.onResponse().dp(m);
        res.pipe(process.stdout);
        res.on('end', () => o.ft.onServerReplied().dp(m));
    })), new rx.Observable(sub => {
        o.ft.onRequestReady(req).dp(m);
        req.write(JSON.stringify(['setSize', process.stdout.columns, process.stdout.rows]));
        req.write('\n');
        req.end(JSON.stringify([process.cwd(), cmd]));
        sub.complete();
    })).pipe(rx.takeUntil(rx.merge(o.pt.onServerReplied, o.pt.onReqClosed, o.pt.onReqError).pipe((0, reactivizer_1.actionRelatedToAction)(m))));
}
//# sourceMappingURL=cmd-client.js.map