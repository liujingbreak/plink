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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reg = void 0;
/** @deprecated */
/* eslint-disable no-console */
const node_assert_1 = __importDefault(require("node:assert"));
const rx = __importStar(require("rxjs"));
// import {ReactorComposite2} from '../reactor-composite';
// import {RxController2} from '../control2';
const global_config_1 = require("../global-config");
const formater = new Intl.NumberFormat();
const NUM = process.argv[2] ? Number(process.argv[2]) : 3000;
let countReclaimed = 0;
let countRegistered = 0;
const onFinalize$ = new rx.Subject();
exports.reg = new FinalizationRegistry(() => {
    countReclaimed++;
    onFinalize$.next(countReclaimed);
});
class TestObject {
    constructor(opts) {
        this.logPrefix = opts.name;
    }
}
async function test() {
    countReclaimed = 0;
    countRegistered = 0;
    // FinalizationRegistry must be exported to maintain strongly refered by ROOT module to avoid being GCed
    console.log('Initial heapTotal', formater.format(process.memoryUsage().heapTotal));
    let items = [];
    for (let i = 0; i < NUM; i++) {
        const item = items[i] = new TestObject({ name: 'bitter' });
        exports.reg.register(item, item.logPrefix, item);
        countRegistered++;
    }
    console.log('\n> before GC heapTotal', formater.format(process.memoryUsage().heapTotal));
    // for (const item of items) {
    //   item.dispose();
    // }
    const done = rx.firstValueFrom(rx.merge(onFinalize$.asObservable().pipe(rx.timeout(20000), rx.take(NUM), rx.map((claimedCount, i) => {
        if ((i + 1) % 500 === 0)
            console.log('message count: #', i + 1, ': ', claimedCount, ', count reclaimed', countReclaimed);
    }), rx.count(), rx.map((count) => {
        console.log('---- After GC, rss', formater.format(process.memoryUsage.rss()));
        console.log('\n> heapTotal', formater.format(process.memoryUsage().heapTotal));
        console.log('> Reclaimed number of Configurables', count);
        console.log('> size of Configurables:', formater.format(global_config_1.allRefs.size));
        node_assert_1.default.equal(countReclaimed, NUM);
        // assert.equal(allRefs.size, 0);
    }), rx.catchError((err, src) => {
        console.error(err);
        throw err;
    })), rx.timer(0, 1000).pipe(rx.map((t) => console.log(`${t}s count reclaimed: ` + countReclaimed, 'allRefs:', global_config_1.allRefs.size, 'first item', global_config_1.allRefs.size < 5 ? [...global_config_1.allRefs.values()].map(item => { var _a; return (_a = item.deref()) === null || _a === void 0 ? void 0 : _a.logPrefix; }) : '')), rx.ignoreElements()), rx.timer(30000) // wait for 30s at most, if there is no timer, Node.js will exit due to event loop become empty before GC taking place
    ).pipe(rx.take(1)));
    items = [];
    console.log('size of Configurables:', formater.format(global_config_1.allRefs.size));
    console.log('Number of finalization registry items', countRegistered);
    // GC must be triggered after a few million seconds to be able to take effect on all heap objects, otherwise it might miss latest created objects
    await new Promise(resolve => setTimeout(resolve, 1500));
    globalThis.gc();
    console.log('::countReclaimed: ', countReclaimed);
    await new Promise(resolve => setImmediate(resolve));
    await done;
    return exports.reg;
}
// This script must be executed with command line option "--expose-gc --trace-gc", you may find more v8 options with command `node --v8-options`
async function run() {
    for (let i = 0; i < 4; i++) {
        await test();
    }
    // eslint-disable-next-line no-debugger
    debugger;
}
void run();
//# sourceMappingURL=global-config-test.js.map