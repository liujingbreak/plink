"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const worker_threads_1 = require("worker_threads");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const rx = __importStar(require("rxjs"));
const sqlite_api_1 = require("../sqlite-log/sqlite-api");
const simplex_reactor_1 = require("../simplex-reactor");
void (0, node_test_1.describe)('sqlite-log', async () => {
    const dbFile = path_1.default.resolve('test-log.db');
    await node_test_1.it.only('sqlite-api', async (t) => {
        if (fs_1.default.existsSync(dbFile))
            fs_1.default.rmSync(dbFile);
        await new Promise(r => setImmediate(r));
        const logger = (0, sqlite_api_1.useAsInitOption)(dbFile, true);
        const testWoker = new worker_threads_1.Worker(path_1.default.join(__dirname, './sqlite-log.test-worker.js'));
        const workerDone$ = new rx.ReplaySubject(1);
        testWoker.on('message', msg => {
            if (msg === 'done') {
                workerDone$.next();
                workerDone$.complete();
                console.log('-- test worker done');
                testWoker.unref();
            }
        });
        testWoker.on('error', err => {
            t.assert.fail(err);
        });
        testWoker.on('messageerror', err => {
            t.assert.fail(err);
        });
        const service = new simplex_reactor_1.SimplexReactor({
            name: 'testService',
            enableLog: true
        });
        const aaa = service.ft.testAction('AAA').dp();
        service.ft.testAction('BBB').dp(aaa);
        await new Promise(r => setTimeout(r, 1000));
        service.ft.testAction('CCC').dp(aaa);
        await rx.firstValueFrom(workerDone$);
        await logger.stop();
    });
});
//# sourceMappingURL=sqlite-log.node.test.js.map