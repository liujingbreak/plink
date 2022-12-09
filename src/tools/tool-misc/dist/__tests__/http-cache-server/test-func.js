"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testStore = void 0;
const tslib_1 = require("tslib");
/* eslint-disable no-console */
const node_child_process_1 = require("node:child_process");
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const op = tslib_1.__importStar(require("rxjs/operators"));
const plink_1 = require("@wfh/plink");
const cache_service_client_1 = require("@wfh/tool-misc/dist/http-cache-server/cache-service-client");
async function testStore() {
    const mainProc = (0, node_child_process_1.fork)(node_path_1.default.join(plink_1.plinkEnv.workDir, 'node_modules/@wfh/tool-misc/dist/__tests__/http-cache-server/service-main-process'));
    const mainProcExited = new Promise(resolve => {
        mainProc.once('exit', (code, sig) => {
            resolve(code);
        });
    });
    const client = (0, cache_service_client_1.createClient)();
    const cp2 = (0, node_child_process_1.fork)(node_path_1.default.resolve(__dirname, 'service-client-2.js'));
    const clientProcess2Exited = new Promise(resolve => {
        cp2.on('exit', (code, sig) => {
            console.log('2nd CLIENT EXITED');
            resolve(code);
        });
    });
    client.dispatcher.ping('test');
    await client.serverReplied('ping', payload => payload === 'test');
    const keyChanged = client.actionOfType('onChange').pipe(op.filter(({ payload: [key] }) => key === 'test-key'), op.map(({ payload: [key, value] }) => {
        // eslint-disable-next-line no-console
        console.log(`key ${key} is changed: ${value}`);
        return value;
    }), op.takeWhile(value => value !== 1)).toPromise();
    client.dispatcher.subscribeKey('test-key');
    client.dispatcher.subscribeKey('test-key2');
    await new Promise(resolve => setTimeout(resolve, 500));
    client.dispatcher.setForNonexist('test-key', 1);
    await client.serverReplied('setForNonexist', ([key, value]) => key === 'test-key' && value === 1);
    await keyChanged;
    console.log('test-key is changed for sure');
    await new Promise(resolve => setTimeout(resolve, 2500));
    const keyChangedAgain = client.actionOfType('onChange').pipe(op.filter(({ payload: [key, value] }) => key === 'test-key2'), 
    // op.skip(1),
    op.map(({ payload: [key, value] }) => {
        // eslint-disable-next-line no-console
        console.log(`2nd key ${key} is changed: ${value}`);
        return value;
    }), op.takeWhile(value => value !== 2)).toPromise();
    client.dispatcher.setForNonexist('test-key2', 2);
    await keyChangedAgain;
    client.dispatcher.shutdownServer();
    await client.serverReplied('shutdownServer', () => true);
    // childProcess.kill('SIGINT');
<<<<<<< HEAD
    await mainProcExited;
    console.log('Store server process exits');
=======
    return Promise.all([clientProcess2Exited, mainProcExited]);
>>>>>>> f8c1fbeb... wip
}
exports.testStore = testStore;
//# sourceMappingURL=test-func.js.map