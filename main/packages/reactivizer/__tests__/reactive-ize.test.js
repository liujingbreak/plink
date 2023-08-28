"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
    (0, globals_1.it)('ReactorComposite reactivize should work', function () { return __awaiter(void 0, void 0, void 0, function () {
        var comp, actionResults, ctl3, ctl4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    comp = new src_1.ReactorComposite();
                    actionResults = [];
                    comp.startAll();
                    comp.r(comp.i.pt.msg3.pipe(rx.map(function (_a) {
                        var a = _a[1], b = _a[2];
                        actionResults.push(a);
                    })));
                    ctl3 = comp.reactivize({
                        hello: function (greeting) { return 'Yes ' + greeting; },
                        world: function (foobar) {
                            return Promise.resolve(foobar);
                        }
                    });
                    ctl4 = ctl3.reactivize({
                        foobar: function () { return rx.of(1, 2, 3); }
                    });
                    ctl4.r(ctl4.o.pt.helloDone.pipe(rx.map(function (_a) {
                        var s = _a[1];
                        return actionResults.push(s);
                    })));
                    ctl4.r(ctl4.o.pt.worldDone.pipe(rx.map(function (_a) {
                        var s = _a[1];
                        return actionResults.push(s);
                    })));
                    ctl4.r(ctl4.o.pt.foobarDone.pipe(rx.map(function (_a) {
                        var s = _a[1];
                        return actionResults.push(s);
                    })));
                    ctl4.i.dp.msg3('start');
                    ctl4.i.dp.hello('human');
                    ctl4.i.dp.world(998);
                    ctl4.i.dp.foobar();
                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1000); })];
                case 1:
                    _a.sent();
                    // eslint-disable-next-line no-console
                    console.log('actionResults: ', actionResults);
                    (0, globals_1.expect)(actionResults).toEqual(['start', 'Yes human', 1, 2, 3, 998]);
                    return [2 /*return*/];
            }
        });
    }); });
});
