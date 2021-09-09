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
        while (_) try {
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
/* eslint-disable no-console */
var promise_queque_1 = require("../promise-queque");
describe('promise-queue', function () {
    it('parallel queueUp() task should work', function () { return __awaiter(void 0, void 0, void 0, function () {
        var actions, _loop_1, i, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    actions = [];
                    _loop_1 = function (i) {
                        actions.push(function () {
                            var idx = i;
                            console.log(idx + " start");
                            return new Promise(function (resolve) { return setTimeout(function () {
                                resolve(idx);
                                console.log(idx + " done");
                            }, 500); });
                        });
                    };
                    for (i = 0; i < 10; i++) {
                        _loop_1(i);
                    }
                    return [4 /*yield*/, (0, promise_queque_1.queueUp)(3, actions)];
                case 1:
                    res = _a.sent();
                    console.log(res, res.length);
                    return [2 /*return*/];
            }
        });
    }); });
    it('create queue and dynamically add async task to it', function () { return __awaiter(void 0, void 0, void 0, function () {
        var add, dones, _loop_2, i, _loop_3, i, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    add = (0, promise_queque_1.queue)(3).add;
                    dones = [];
                    _loop_2 = function (i) {
                        var done = add(function () {
                            var idx = i;
                            console.log(idx + " start " + new Date().toLocaleTimeString());
                            return new Promise(function (resolve) { return setTimeout(function () {
                                resolve(idx);
                                console.log(idx + " done " + new Date().toLocaleTimeString());
                            }, 500); });
                        });
                        dones.push(done);
                    };
                    for (i = 0; i < 10; i++) {
                        _loop_2(i);
                    }
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                case 1:
                    _c.sent();
                    _loop_3 = function (i) {
                        var done = add(function () {
                            var idx = 10 + i;
                            console.log(idx + " start " + new Date().toLocaleTimeString());
                            return new Promise(function (resolve) { return setTimeout(function () {
                                resolve(idx);
                                console.log(idx + " done " + new Date().toLocaleTimeString());
                            }, 500); });
                        });
                        dones.push(done);
                    };
                    for (i = 0; i < 5; i++) {
                        _loop_3(i);
                    }
                    _b = (_a = console).log;
                    return [4 /*yield*/, Promise.all(dones)];
                case 2:
                    _b.apply(_a, [_c.sent()]);
                    return [2 /*return*/];
            }
        });
    }); });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbWlzZS1xdWVxdWVTcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvc3BlYy9wcm9taXNlLXF1ZXF1ZVNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFBK0I7QUFDL0Isb0RBQWlEO0FBRWpELFFBQVEsQ0FBQyxlQUFlLEVBQUU7SUFDeEIsRUFBRSxDQUFDLHFDQUFxQyxFQUFFOzs7OztvQkFDbEMsT0FBTyxHQUFHLEVBQStCLENBQUM7d0NBQ3ZDLENBQUM7d0JBQ1IsT0FBTyxDQUFDLElBQUksQ0FBQzs0QkFDWCxJQUFNLEdBQUcsR0FBRyxDQUFDLENBQUM7NEJBQ2QsT0FBTyxDQUFDLEdBQUcsQ0FBSSxHQUFHLFdBQVEsQ0FBQyxDQUFDOzRCQUM1QixPQUFPLElBQUksT0FBTyxDQUFDLFVBQUEsT0FBTyxJQUFJLE9BQUEsVUFBVSxDQUFDO2dDQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7Z0NBQ2IsT0FBTyxDQUFDLEdBQUcsQ0FBSSxHQUFHLFVBQU8sQ0FBQyxDQUFDOzRCQUM3QixDQUFDLEVBQUUsR0FBRyxDQUFDLEVBSHVCLENBR3ZCLENBQUMsQ0FBQzt3QkFDWCxDQUFDLENBQUMsQ0FBQzs7b0JBUkwsS0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFO2dDQUFsQixDQUFDO3FCQVNUO29CQUNXLHFCQUFNLElBQUEsd0JBQU8sRUFBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLEVBQUE7O29CQUEvQixHQUFHLEdBQUcsU0FBeUI7b0JBQ3JDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQzs7OztTQUU5QixDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsbURBQW1ELEVBQUU7Ozs7O29CQUMvQyxHQUFHLEdBQUksSUFBQSxzQkFBSyxFQUFDLENBQUMsQ0FBQyxJQUFaLENBQWE7b0JBQ2pCLEtBQUssR0FBRyxFQUF1QixDQUFDO3dDQUM3QixDQUFDO3dCQUNSLElBQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQzs0QkFDZixJQUFNLEdBQUcsR0FBRyxDQUFDLENBQUM7NEJBQ2QsT0FBTyxDQUFDLEdBQUcsQ0FBSSxHQUFHLGVBQVUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsRUFBSSxDQUFDLENBQUM7NEJBQy9ELE9BQU8sSUFBSSxPQUFPLENBQVMsVUFBQSxPQUFPLElBQUksT0FBQSxVQUFVLENBQUM7Z0NBQy9DLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQ0FDYixPQUFPLENBQUMsR0FBRyxDQUFJLEdBQUcsY0FBUyxJQUFJLElBQUksRUFBRSxDQUFDLGtCQUFrQixFQUFJLENBQUMsQ0FBQzs0QkFDaEUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUgrQixDQUcvQixDQUFDLENBQUM7d0JBQ1gsQ0FBQyxDQUFDLENBQUM7d0JBQ0gsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzs7b0JBVG5CLEtBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRTtnQ0FBbEIsQ0FBQztxQkFVVDtvQkFFRCxxQkFBTSxJQUFJLE9BQU8sQ0FBQyxVQUFBLE9BQU8sSUFBSSxPQUFBLFVBQVUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEVBQXpCLENBQXlCLENBQUMsRUFBQTs7b0JBQXZELFNBQXVELENBQUM7d0NBRS9DLENBQUM7d0JBQ1IsSUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDOzRCQUNmLElBQU0sR0FBRyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7NEJBQ25CLE9BQU8sQ0FBQyxHQUFHLENBQUksR0FBRyxlQUFVLElBQUksSUFBSSxFQUFFLENBQUMsa0JBQWtCLEVBQUksQ0FBQyxDQUFDOzRCQUMvRCxPQUFPLElBQUksT0FBTyxDQUFTLFVBQUEsT0FBTyxJQUFJLE9BQUEsVUFBVSxDQUFDO2dDQUMvQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7Z0NBQ2IsT0FBTyxDQUFDLEdBQUcsQ0FBSSxHQUFHLGNBQVMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsRUFBSSxDQUFDLENBQUM7NEJBQ2hFLENBQUMsRUFBRSxHQUFHLENBQUMsRUFIK0IsQ0FHL0IsQ0FBQyxDQUFDO3dCQUNYLENBQUMsQ0FBQyxDQUFDO3dCQUNILEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7O29CQVRuQixLQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0NBQWpCLENBQUM7cUJBVVQ7b0JBQ0QsS0FBQSxDQUFBLEtBQUEsT0FBTyxDQUFBLENBQUMsR0FBRyxDQUFBO29CQUFDLHFCQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUE7O29CQUFwQyxjQUFZLFNBQXdCLEVBQUMsQ0FBQzs7OztTQUN2QyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCB7cXVldWVVcCwgcXVldWV9IGZyb20gJy4uL3Byb21pc2UtcXVlcXVlJztcblxuZGVzY3JpYmUoJ3Byb21pc2UtcXVldWUnLCAoKSA9PiB7XG4gIGl0KCdwYXJhbGxlbCBxdWV1ZVVwKCkgdGFzayBzaG91bGQgd29yaycsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBhY3Rpb25zID0gW10gYXMgQXJyYXk8KCkgPT4gUHJvbWlzZTxhbnk+PjtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDEwOyBpKyspIHtcbiAgICAgIGFjdGlvbnMucHVzaCgoKSA9PiB7XG4gICAgICAgIGNvbnN0IGlkeCA9IGk7XG4gICAgICAgIGNvbnNvbGUubG9nKGAke2lkeH0gc3RhcnRgKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgcmVzb2x2ZShpZHgpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGAke2lkeH0gZG9uZWApO1xuICAgICAgICB9LCA1MDApKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBjb25zdCByZXMgPSBhd2FpdCBxdWV1ZVVwKDMsIGFjdGlvbnMpO1xuICAgIGNvbnNvbGUubG9nKHJlcywgcmVzLmxlbmd0aCk7XG5cbiAgfSk7XG5cbiAgaXQoJ2NyZWF0ZSBxdWV1ZSBhbmQgZHluYW1pY2FsbHkgYWRkIGFzeW5jIHRhc2sgdG8gaXQnLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3Qge2FkZH0gPSBxdWV1ZSgzKTtcbiAgICBjb25zdCBkb25lcyA9IFtdIGFzIFByb21pc2U8bnVtYmVyPltdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMTA7IGkrKykge1xuICAgICAgY29uc3QgZG9uZSA9IGFkZCgoKSA9PiB7XG4gICAgICAgIGNvbnN0IGlkeCA9IGk7XG4gICAgICAgIGNvbnNvbGUubG9nKGAke2lkeH0gc3RhcnQgJHtuZXcgRGF0ZSgpLnRvTG9jYWxlVGltZVN0cmluZygpfWApO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8bnVtYmVyPihyZXNvbHZlID0+IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHJlc29sdmUoaWR4KTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhgJHtpZHh9IGRvbmUgJHtuZXcgRGF0ZSgpLnRvTG9jYWxlVGltZVN0cmluZygpfWApO1xuICAgICAgICB9LCA1MDApKTtcbiAgICAgIH0pO1xuICAgICAgZG9uZXMucHVzaChkb25lKTtcbiAgICB9XG5cbiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwMCkpO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCA1OyBpKyspIHtcbiAgICAgIGNvbnN0IGRvbmUgPSBhZGQoKCkgPT4ge1xuICAgICAgICBjb25zdCBpZHggPSAxMCArIGk7XG4gICAgICAgIGNvbnNvbGUubG9nKGAke2lkeH0gc3RhcnQgJHtuZXcgRGF0ZSgpLnRvTG9jYWxlVGltZVN0cmluZygpfWApO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8bnVtYmVyPihyZXNvbHZlID0+IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHJlc29sdmUoaWR4KTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhgJHtpZHh9IGRvbmUgJHtuZXcgRGF0ZSgpLnRvTG9jYWxlVGltZVN0cmluZygpfWApO1xuICAgICAgICB9LCA1MDApKTtcbiAgICAgIH0pO1xuICAgICAgZG9uZXMucHVzaChkb25lKTtcbiAgICB9XG4gICAgY29uc29sZS5sb2coYXdhaXQgUHJvbWlzZS5hbGwoZG9uZXMpKTtcbiAgfSk7XG59KTtcbiJdfQ==