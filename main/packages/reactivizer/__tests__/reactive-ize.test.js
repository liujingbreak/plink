"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var rx = require("rxjs");
var globals_1 = require("@jest/globals");
var src_1 = require("../src");
var TestObject = /** @class */ (function () {
    function TestObject() {
    }
    TestObject.prototype.msg4 = function () {
    };
    TestObject.prototype.msg5 = function (a) {
        return rx.of(a);
    };
    TestObject.prototype.msg6 = function (a, b) {
        return rx.of(a, b);
    };
    return TestObject;
}());
(0, globals_1.describe)('reactivizer', function () {
    (0, globals_1.it)('RxController should work with Typescript\'s type inference', function () {
        var ctl = new src_1.RxController();
        var dp = ctl.dp, pt = ctl.pt;
        dp.msg3('msg3-a', 9);
        pt.msg3.pipe(rx.map(function (_a) {
            var id = _a[0], a = _a[1], b = _a[2];
            // eslint-disable-next-line no-console
            console.log(id, a, b);
        }));
        var ctl2 = new src_1.RxController();
        var l = ctl2.createLatestPayloadsFor('msg5', 'msg6');
        var dp2 = ctl2.dp;
        dp2.msg1();
        dp2.msg5('x');
        dp2.msg6('aaa', 2);
        var countExpect = 0;
        rx.merge(l.msg5.pipe(rx.map(function (_a) {
            var a = _a[1];
            (0, globals_1.expect)(a).toBe('x');
            countExpect++;
        })), l.msg6.pipe(rx.map(function (_a) {
            var a = _a[1], b = _a[2];
            (0, globals_1.expect)(a).toBe('aaa');
            (0, globals_1.expect)(b).toBe(2);
            countExpect += 2;
        }))).subscribe();
        (0, globals_1.expect)(countExpect).toBe(3);
    });
});
