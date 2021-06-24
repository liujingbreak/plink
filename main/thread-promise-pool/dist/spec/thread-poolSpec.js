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
var index_1 = require("../index");
describe('Thread pool', function () {
    it('all worker should run simultaneously', function () { return __awaiter(void 0, void 0, void 0, function () {
        var pool, dones, i, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pool = new index_1.Pool(3, 999);
                    dones = [];
                    for (i = 1; i <= 3; i++) {
                        dones.push(pool.submit({
                            file: require.resolve('./thread-job'),
                            exportFn: 'default',
                            args: [i]
                        }));
                    }
                    return [4 /*yield*/, Promise.all(dones)];
                case 1:
                    res = _a.sent();
                    console.log('--- end ----', res);
                    expect(res).toEqual([10, 20, 30]);
                    return [2 /*return*/];
            }
        });
    }); });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhyZWFkLXBvb2xTcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvc3BlYy90aHJlYWQtcG9vbFNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFBK0I7QUFDL0Isa0NBQThCO0FBRTlCLFFBQVEsQ0FBQyxhQUFhLEVBQUU7SUFDdEIsRUFBRSxDQUFDLHNDQUFzQyxFQUFFOzs7OztvQkFDbkMsSUFBSSxHQUFHLElBQUksWUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztvQkFDeEIsS0FBSyxHQUFzQixFQUFFLENBQUM7b0JBQ3BDLEtBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO3dCQUMzQixLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQVM7NEJBQzdCLElBQUksRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQzs0QkFDckMsUUFBUSxFQUFFLFNBQVM7NEJBQ25CLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQzt5QkFDVixDQUFDLENBQUMsQ0FBQztxQkFDTDtvQkFDVyxxQkFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFBOztvQkFBOUIsR0FBRyxHQUFHLFNBQXdCO29CQUNwQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsQ0FBQztvQkFDakMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQzs7OztTQUNuQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCB7UG9vbH0gZnJvbSAnLi4vaW5kZXgnO1xuXG5kZXNjcmliZSgnVGhyZWFkIHBvb2wnLCAoKSA9PiB7XG4gIGl0KCdhbGwgd29ya2VyIHNob3VsZCBydW4gc2ltdWx0YW5lb3VzbHknLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgcG9vbCA9IG5ldyBQb29sKDMsIDk5OSk7XG4gICAgY29uc3QgZG9uZXM6IFByb21pc2U8bnVtYmVyPltdID0gW107XG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPD0gMzsgaSsrKSB7XG4gICAgICBkb25lcy5wdXNoKHBvb2wuc3VibWl0PG51bWJlcj4oe1xuICAgICAgICBmaWxlOiByZXF1aXJlLnJlc29sdmUoJy4vdGhyZWFkLWpvYicpLFxuICAgICAgICBleHBvcnRGbjogJ2RlZmF1bHQnLFxuICAgICAgICBhcmdzOiBbaV1cbiAgICAgIH0pKTtcbiAgICB9XG4gICAgY29uc3QgcmVzID0gYXdhaXQgUHJvbWlzZS5hbGwoZG9uZXMpO1xuICAgIGNvbnNvbGUubG9nKCctLS0gZW5kIC0tLS0nLCByZXMpO1xuICAgIGV4cGVjdChyZXMpLnRvRXF1YWwoWzEwLCAyMCwgMzBdKTtcbiAgfSk7XG59KTtcbiJdfQ==