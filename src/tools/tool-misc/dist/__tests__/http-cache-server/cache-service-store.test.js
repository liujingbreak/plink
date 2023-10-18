"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const node_stream_1 = require("node:stream");
const op = tslib_1.__importStar(require("rxjs/operators"));
const globals_1 = require("@jest/globals");
require("@wfh/plink-test/dist/init-plink");
const plink_1 = require("@wfh/plink");
const cache_service_client_1 = require("@wfh/tool-misc/dist/http-cache-server/cache-service-client");
globals_1.jest.setTimeout(20000);
(0, globals_1.describe)('http cache server', () => {
    (0, globals_1.it)('multi-process state server and client uses http "keep-alive" connection', async () => {
        const chrProcOutput = new node_stream_1.Writable({
            write(chunk, _enc, cb) {
                // eslint-disable-next-line no-console
                console.log(chunk.toString());
                cb();
            },
            final(cb) {
                cb();
            }
        });
        const { exited, childProcess } = (0, plink_1.forceForkAsPreserveSymlink)('@wfh/tool-misc/dist/__tests__/http-cache-server/service-main-process', {
            stdio: 'pipe'
        });
        childProcess.stdout.pipe(chrProcOutput);
        childProcess.stderr.pipe(chrProcOutput);
        const client = (0, cache_service_client_1.createClient)();
        client.dispatcher.ping('test');
        await client.serverReplied('ping', payload => payload === 'test');
        const keyChanged = client.actionOfType('onChange').pipe(op.map(({ payload: [key, value] }) => {
            // eslint-disable-next-line no-console
            console.log(`key ${key} is changed: ${value}`);
        }), op.take(1)).toPromise();
        client.dispatcher.subscribeKey('test-key');
        client.dispatcher.subscribeKey('test-key2');
        await new Promise(resolve => setTimeout(resolve, 500));
        client.dispatcher.setForNonexist('test-key', 1);
        await client.serverReplied('setForNonexist', ([key, value]) => key === 'test-key' && value === 1);
        await keyChanged;
        await new Promise(resolve => setTimeout(resolve, 2500));
        const keyChangedAgain = client.actionOfType('onChange').pipe(op.filter(({ payload: [key, value] }) => key === 'test-key2'), op.map(({ payload: [key, value] }) => {
            // eslint-disable-next-line no-console
            console.log(`key ${key} is changed: ${value}`);
        }), op.take(1)).toPromise();
        client.dispatcher.setForNonexist('test-key2', 2);
        await keyChangedAgain;
        client.dispatcher.shutdownServer();
        await client.serverReplied('shutdownServer', () => true);
        childProcess.kill('SIGINT');
        return exited;
    });
});
//# sourceMappingURL=cache-service-store.test.js.map