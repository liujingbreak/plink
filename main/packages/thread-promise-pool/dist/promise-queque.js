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
exports.queue = exports.queueUp = void 0;
function queueUp(parallel, actions) {
    return __awaiter(this, void 0, void 0, function () {
        function performAction() {
            return __awaiter(this, void 0, void 0, function () {
                var _a, _b, err_1;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!(actionIdx < actions.length)) return [3 /*break*/, 5];
                            _c.label = 1;
                        case 1:
                            _c.trys.push([1, 3, , 4]);
                            _b = (_a = results).push;
                            return [4 /*yield*/, actions[actionIdx++]()];
                        case 2:
                            _b.apply(_a, [_c.sent()]);
                            return [3 /*break*/, 4];
                        case 3:
                            err_1 = _c.sent();
                            results.push(err_1);
                            return [3 /*break*/, 4];
                        case 4: return [3 /*break*/, 0];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        }
        var actionIdx, results, done, i;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    actionIdx = 0;
                    results = [];
                    done = new Array(parallel);
                    for (i = 0; i < parallel; i++) {
                        done[i] = performAction();
                    }
                    return [4 /*yield*/, Promise.all(done)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, results];
            }
        });
    });
}
exports.queueUp = queueUp;
function queue(maxParallel) {
    var actions = [];
    // let actionIdx = 0;
    var parallel = 0;
    function performAction() {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        parallel++;
                        _a.label = 1;
                    case 1:
                        if (!(actions.length > 0)) return [3 /*break*/, 3];
                        return [4 /*yield*/, (actions.shift())()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 3:
                        parallel--;
                        return [2 /*return*/];
                }
            });
        });
    }
    return {
        add: function (action) {
            return new Promise(function (resolve, rej) {
                actions.push(function () { return action().then(resolve).catch(rej); });
                if (parallel < maxParallel) {
                    // TODO: handle promise rejection
                    void performAction();
                }
            });
        }
    };
}
exports.queue = queue;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbWlzZS1xdWVxdWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wcm9taXNlLXF1ZXF1ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxTQUFzQixPQUFPLENBQUksUUFBZ0IsRUFBRSxPQUFnQzs7UUFTakYsU0FBZSxhQUFhOzs7Ozs7aUNBQ25CLENBQUEsU0FBUyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUE7Ozs7NEJBRTdCLEtBQUEsQ0FBQSxLQUFBLE9BQU8sQ0FBQSxDQUFDLElBQUksQ0FBQTs0QkFBQyxxQkFBTSxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFBOzs0QkFBekMsY0FBYSxTQUE0QixFQUFDLENBQUM7Ozs7NEJBRTNDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUM7Ozs7Ozs7U0FHdkI7Ozs7O29CQWhCRyxTQUFTLEdBQUcsQ0FBQyxDQUFDO29CQUNaLE9BQU8sR0FBRyxFQUFTLENBQUM7b0JBRXBCLElBQUksR0FBRyxJQUFJLEtBQUssQ0FBTSxRQUFRLENBQW1CLENBQUM7b0JBQ3hELEtBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxFQUFFLENBQUMsRUFBRSxFQUFFO3dCQUNqQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsYUFBYSxFQUFFLENBQUM7cUJBQzNCO29CQVlELHFCQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUE7O29CQUF2QixTQUF1QixDQUFDO29CQUN4QixzQkFBTyxPQUFPLEVBQUM7Ozs7Q0FDaEI7QUFyQkQsMEJBcUJDO0FBRUQsU0FBZ0IsS0FBSyxDQUFDLFdBQW1CO0lBQ3ZDLElBQU0sT0FBTyxHQUErQixFQUFFLENBQUM7SUFDL0MscUJBQXFCO0lBQ3JCLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQztJQUVqQixTQUFlLGFBQWE7Ozs7O3dCQUMxQixRQUFRLEVBQUUsQ0FBQzs7OzZCQUNKLENBQUEsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7d0JBQ3ZCLHFCQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFFLEVBQUUsRUFBQTs7d0JBQTFCLFNBQTBCLENBQUM7Ozt3QkFFN0IsUUFBUSxFQUFFLENBQUM7Ozs7O0tBQ1o7SUFFRCxPQUFPO1FBQ0wsR0FBRyxFQUFILFVBQU8sTUFBd0I7WUFDN0IsT0FBTyxJQUFJLE9BQU8sQ0FBSSxVQUFDLE9BQU8sRUFBRSxHQUFHO2dCQUNqQyxPQUFPLENBQUMsSUFBSSxDQUFDLGNBQU0sT0FBQSxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFqQyxDQUFpQyxDQUFDLENBQUM7Z0JBQ3RELElBQUksUUFBUSxHQUFHLFdBQVcsRUFBRTtvQkFDMUIsaUNBQWlDO29CQUNqQyxLQUFLLGFBQWEsRUFBRSxDQUFDO2lCQUN0QjtZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztLQUNGLENBQUM7QUFDSixDQUFDO0FBeEJELHNCQXdCQyIsInNvdXJjZXNDb250ZW50IjpbIlxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHF1ZXVlVXA8VD4ocGFyYWxsZWw6IG51bWJlciwgYWN0aW9uczogQXJyYXk8KCkgPT4gUHJvbWlzZTxUPj4pOiBQcm9taXNlPFRbXT4ge1xuICBsZXQgYWN0aW9uSWR4ID0gMDtcbiAgY29uc3QgcmVzdWx0cyA9IFtdIGFzIFRbXTtcblxuICBjb25zdCBkb25lID0gbmV3IEFycmF5PGFueT4ocGFyYWxsZWwpIGFzIFByb21pc2U8YW55PltdO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHBhcmFsbGVsOyBpKyspIHtcbiAgICBkb25lW2ldID0gcGVyZm9ybUFjdGlvbigpO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gcGVyZm9ybUFjdGlvbigpIHtcbiAgICB3aGlsZSAoYWN0aW9uSWR4IDwgYWN0aW9ucy5sZW5ndGgpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdHMucHVzaChhd2FpdCBhY3Rpb25zW2FjdGlvbklkeCsrXSgpKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICByZXN1bHRzLnB1c2goZXJyKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhd2FpdCBQcm9taXNlLmFsbChkb25lKTtcbiAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBxdWV1ZShtYXhQYXJhbGxlbDogbnVtYmVyKSB7XG4gIGNvbnN0IGFjdGlvbnM6IEFycmF5PCgpID0+IFByb21pc2U8dm9pZD4+ID0gW107XG4gIC8vIGxldCBhY3Rpb25JZHggPSAwO1xuICBsZXQgcGFyYWxsZWwgPSAwO1xuXG4gIGFzeW5jIGZ1bmN0aW9uIHBlcmZvcm1BY3Rpb24oKSB7XG4gICAgcGFyYWxsZWwrKztcbiAgICB3aGlsZSAoYWN0aW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICBhd2FpdCAoYWN0aW9ucy5zaGlmdCgpKSEoKTtcbiAgICB9XG4gICAgcGFyYWxsZWwtLTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgYWRkPFQ+KGFjdGlvbjogKCkgPT4gUHJvbWlzZTxUPik6IFByb21pc2U8VD4ge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPFQ+KChyZXNvbHZlLCByZWopID0+IHtcbiAgICAgICAgYWN0aW9ucy5wdXNoKCgpID0+IGFjdGlvbigpLnRoZW4ocmVzb2x2ZSkuY2F0Y2gocmVqKSk7XG4gICAgICAgIGlmIChwYXJhbGxlbCA8IG1heFBhcmFsbGVsKSB7XG4gICAgICAgICAgLy8gVE9ETzogaGFuZGxlIHByb21pc2UgcmVqZWN0aW9uXG4gICAgICAgICAgdm9pZCBwZXJmb3JtQWN0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn1cblxuXG5cbiJdfQ==