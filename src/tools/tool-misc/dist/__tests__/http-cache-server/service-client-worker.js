"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const op = tslib_1.__importStar(require("rxjs/operators"));
const rx = tslib_1.__importStar(require("rxjs"));
const plink_1 = require("@wfh/plink");
const masterMsg$ = new rx.ReplaySubject(1);
process.on('message', msg => {
    if (typeof msg === 'string') {
        try {
            const json = JSON.parse(msg);
            if (json.__plink_cluster_worker_index != null) {
                masterMsg$.next(json.__plink_cluster_worker_index);
            }
            // eslint-disable-next-line no-empty
        }
        catch (e) { }
    }
});
(0, plink_1.initProcess)('none');
void (async () => {
    const { createClient } = await Promise.resolve().then(() => tslib_1.__importStar(require('../../http-cache-server/cache-service-client')));
    const log = (0, plink_1.log4File)(__filename);
    const client = createClient();
    rx.concat(rx.merge(masterMsg$.pipe(op.map(idx => {
        log.info('worker idx:', idx);
    }), op.take(1)), client.actionOfType('onRespond').pipe(op.map(act => log.info(act.type, 'is done')), op.take(2))), rx.of(1).pipe(op.map(() => {
        log.info('worker exists');
        process.exit(0);
    }))).subscribe();
    client.dispatcher.ping(process.pid + '');
    await new Promise(resolve => setTimeout(resolve, 500));
    client.dispatcher.ping(process.pid + '');
    // client.dispatcher.subscribeChange('testkey');
    log.info('ping sent');
})();
//# sourceMappingURL=service-client-worker.js.map