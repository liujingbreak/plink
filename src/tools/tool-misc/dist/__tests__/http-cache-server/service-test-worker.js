"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const op = tslib_1.__importStar(require("rxjs/operators"));
const rx = tslib_1.__importStar(require("rxjs"));
const plink_1 = require("@wfh/plink");
(0, plink_1.initProcess)('none');
void (async () => {
    const { createClient } = await Promise.resolve().then(() => tslib_1.__importStar(require('../../http-cache-server/cache-service-store')));
    const log = (0, plink_1.log4File)(__filename);
    const client = createClient();
    rx.concat(client.actionOfType('_done').pipe(op.map(act => log.info(act.type, 'is done')), op.take(2)), rx.of(1).pipe(op.map(() => process.exit(0)))).subscribe();
    client.dispatcher.ping(process.pid + '');
    await new Promise(resolve => setTimeout(resolve, 500));
    client.dispatcher.ping(process.pid + '');
    log.info('ping sent');
})();
//# sourceMappingURL=service-test-worker.js.map