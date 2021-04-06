"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTinyReduxTookit = void 0;
var react_1 = __importDefault(require("react"));
var tiny_redux_toolkit_1 = __importDefault(require("./tiny-redux-toolkit"));
__exportStar(require("./tiny-redux-toolkit"), exports);
function useTinyReduxTookit(opt) {
    var _a = react_1.default.useState(opt.initialState), state = _a[0], setState = _a[1];
    var tool = react_1.default.useMemo(function () { return tiny_redux_toolkit_1.default(__assign(__assign({}, opt), { onStateChange: function (s) { return setState(s); } })); }, []);
    react_1.default.useEffect(function () {
        return tool.destroy;
    }, []);
    return __assign(__assign({ useEpic: function (epic) {
            react_1.default.useEffect(function () {
                tool.addEpic(epic);
            }, []);
        } }, tool), { state: state });
}
exports.useTinyReduxTookit = useTinyReduxTookit;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlueS1yZWR1eC10b29sa2l0LWhvb2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90aW55LXJlZHV4LXRvb2xraXQtaG9vay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBMEI7QUFDMUIsNEVBQThGO0FBRTlGLHVEQUFxQztBQUVyQyxTQUFnQixrQkFBa0IsQ0FBbUQsR0FBK0M7SUFDNUgsSUFBQSxLQUFvQixlQUFLLENBQUMsUUFBUSxDQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBdEQsS0FBSyxRQUFBLEVBQUUsUUFBUSxRQUF1QyxDQUFDO0lBRTlELElBQU0sSUFBSSxHQUFHLGVBQUssQ0FBQyxPQUFPLENBQUMsY0FBTSxPQUFBLDRCQUFZLHVCQUFLLEdBQUcsS0FBRSxhQUFhLEVBQUUsVUFBQSxDQUFDLElBQUksT0FBQSxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQVgsQ0FBVyxJQUFFLEVBQXZELENBQXVELEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFOUYsZUFBSyxDQUFDLFNBQVMsQ0FBQztRQUNkLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztJQUN0QixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDUCwyQkFDRSxPQUFPLEVBQVAsVUFBUSxJQUEwSDtZQUNoSSxlQUFLLENBQUMsU0FBUyxDQUFDO2dCQUNkLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckIsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ1QsQ0FBQyxJQUNFLElBQUksS0FDUCxLQUFLLE9BQUEsSUFDTDtBQUNKLENBQUM7QUFqQkQsZ0RBaUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCBjcmVhdGVUb29raXQsIHtSZWR1Y2VycywgQ3JlYXRlT3B0aW9ucywgQWN0aW9uV2l0aFJlZHVjZXJ9IGZyb20gJy4vdGlueS1yZWR1eC10b29sa2l0JztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuZXhwb3J0ICogZnJvbSAnLi90aW55LXJlZHV4LXRvb2xraXQnO1xuXG5leHBvcnQgZnVuY3Rpb24gdXNlVGlueVJlZHV4VG9va2l0PFMgZXh0ZW5kcyB7ZXJyb3I/OiBFcnJvcn0sIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4ob3B0OiBPbWl0PENyZWF0ZU9wdGlvbnM8UywgUj4sICdvblN0YXRlQ2hhbmdlJz4pIHtcbiAgY29uc3QgW3N0YXRlLCBzZXRTdGF0ZV0gPSBSZWFjdC51c2VTdGF0ZTxTPihvcHQuaW5pdGlhbFN0YXRlKTtcblxuICBjb25zdCB0b29sID0gUmVhY3QudXNlTWVtbygoKSA9PiBjcmVhdGVUb29raXQoey4uLm9wdCwgb25TdGF0ZUNoYW5nZTogcyA9PiBzZXRTdGF0ZShzKX0pLCBbXSk7XG5cbiAgUmVhY3QudXNlRWZmZWN0KCgpID0+IHtcbiAgICByZXR1cm4gdG9vbC5kZXN0cm95O1xuICB9LCBbXSk7XG4gIHJldHVybiB7XG4gICAgdXNlRXBpYyhlcGljOiAoYWN0aW9uczogcnguT2JzZXJ2YWJsZTxBY3Rpb25XaXRoUmVkdWNlcjxTPj4sIHN0YXRlczogcnguQmVoYXZpb3JTdWJqZWN0PFM+KSA9PiByeC5PYnNlcnZhYmxlPEFjdGlvbldpdGhSZWR1Y2VyPFM+Pikge1xuICAgICAgUmVhY3QudXNlRWZmZWN0KCgpID0+IHtcbiAgICAgICAgdG9vbC5hZGRFcGljKGVwaWMpO1xuICAgICAgfSwgW10pO1xuICAgIH0sXG4gICAgLi4udG9vbCxcbiAgICBzdGF0ZVxuICB9O1xufVxuIl19