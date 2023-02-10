"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const op = tslib_1.__importStar(require("rxjs/operators"));
const plink_1 = require("@wfh/plink");
(0, plink_1.initProcess)('none');
const log = (0, plink_1.log4File)(__filename);
log.info('client process starts');
const { createClient } = require('@wfh/tool-misc/dist/http-cache-server/cache-service-client');
const client = createClient();
client.dispatcher.subscribeKey('test-key');
client.actionOfType('onChange').pipe(op.map(({ payload: [key, value] }) => {
    // eslint-disable-next-line no-console
    log.info(`2nd client onChange: key ${key} is changed: ${value}`);
    client.dispatcher._shutdownSelf();
}), op.take(1)).subscribe();
//# sourceMappingURL=service-client-2.js.map