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
/* eslint-disable no-console */
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const rx = __importStar(require("rxjs"));
const index_js_1 = require("../index.js");
void (0, node_test_1.describe)('simplexReactor', () => {
    void node_test_1.it.only('interceptors', () => {
        const service = new index_js_1.SimplexReactor({ debug: true });
        const { r, pt, ft, interceptors } = service;
        const fn = node_test_1.mock.fn();
        r('', interceptors.foobar1.pipe(rx.map(([next, , key, v]) => {
            return next([key + '.changed', v]);
        }), rx.take(2)));
        r('', pt.foobar1.pipe(rx.map(([, ...p]) => { fn(...p); })));
        ft.foobar1('foobar1', 1).dp();
        ft.foobar1('foobar1', 2).dp();
        ft.foobar1('foobar1', 3).dp();
        node_assert_1.default.equal(fn.mock.callCount(), 3);
        node_assert_1.default.deepEqual(fn.mock.calls[0].arguments, ['foobar1.changed', 1]);
        node_assert_1.default.deepEqual(fn.mock.calls[1].arguments, ['foobar1.changed', 2]);
        node_assert_1.default.deepEqual(fn.mock.calls[2].arguments, ['foobar1', 3]);
    });
    void (0, node_test_1.it)('prehook', async () => {
        const c = new index_js_1.SimplexReactor({ debug: true });
        const { preHooks, r, pt, ft } = c;
        const mock = node_test_1.mock.fn();
        r('foobar1 -> foobar2', pt.foobar1.pipe(rx.map(([m, k]) => {
            mock('reactor', k);
            ft.foobar2(k, '').dp(m);
        })));
        const removePreHook = preHooks.foobar1('prehook', (_m, key, val) => {
            mock('preHook', key);
            return new rx.Observable(s => {
                setTimeout(() => {
                    s.next([key + '.changed', val]);
                    s.complete();
                }, 50);
            });
        });
        ft.foobar1('test1', 0).dp();
        await rx.firstValueFrom(ft.foobar1('test2', 1).od(pt.foobar2));
        node_assert_1.default.equal(mock.mock.callCount(), 4);
        node_assert_1.default.deepEqual(mock.mock.calls.map(c => c.arguments), [
            ['preHook', 'test1'],
            ['preHook', 'test2'],
            ['reactor', 'test1.changed'],
            ['reactor', 'test2.changed']
        ]);
        removePreHook();
        await rx.firstValueFrom(ft.foobar1('test3', 1).od(pt.foobar2));
        node_assert_1.default.equal(mock.mock.callCount(), 5);
    });
    void (0, node_test_1.it)('SingleActionFactory.od()', async () => {
        const service = new index_js_1.SimplexReactor({ name: 'case .od()', debug: true });
        const { ft, pt, r } = service;
        const fn = node_test_1.mock.fn();
        r('message1 -> reply1, reply2, reply4', pt.message1.pipe(rx.mergeMap(([m]) => {
            return rx.merge(service.s.onCancelOf(m).pipe(rx.map(() => { fn('onCancel'); })), new rx.Observable(() => {
                ft.reply1('1').dp(m);
                ft.reply2('2').dp(m);
                ft.reply4(4).dp(m);
            }));
        })));
        const [o4, o2, o1] = ft.message1().od(pt.reply4, pt.reply2, pt.reply1);
        const [[, v4], [, v2], [, v1]] = await rx.firstValueFrom(rx.zip(o4, o2, o1));
        node_assert_1.default.equal(v4, 4);
        node_assert_1.default.equal(v2, '2');
        node_assert_1.default.equal(v1, '1');
        node_assert_1.default.equal(fn.mock.callCount(), 1);
    });
    void (0, node_test_1.it)('intercept mulitiple cascading messages', () => {
        const service = new index_js_1.SimplexReactor({ debug: true });
        const { r, pt, ft, interceptors } = service;
        r('', pt.message1.pipe(rx.map(([m]) => {
            ft.reply1().dp(m);
        })));
        r('', interceptors.message1.pipe(rx.mergeMap(([next, , ...p]) => {
            const [reply1Hook] = next(p, interceptors.reply1);
            return reply1Hook.pipe(rx.map(([next2, , ...p2]) => {
                next2(p2);
            }));
        })));
        ft.message1('test intercept').dp();
    });
});
//# sourceMappingURL=simplex-reactor.node.test.js.map