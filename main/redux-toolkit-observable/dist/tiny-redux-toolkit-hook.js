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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTinyReduxTookit = void 0;
var react_1 = __importDefault(require("react"));
var tiny_redux_toolkit_1 = require("./tiny-redux-toolkit");
var op = __importStar(require("rxjs/operators"));
var clone_1 = __importDefault(require("lodash/clone"));
__exportStar(require("./tiny-redux-toolkit"), exports);
/**
 * For performance reason, better define opts.reducers outside of component rendering function
 * @param opts
 * @returns
 */
function useTinyReduxTookit(opts) {
    // To avoid a mutatable version is passed in
    var clonedState = clone_1.default(opts.initialState);
    var _a = react_1.default.useState(clonedState), state = _a[0], setState = _a[1];
    // const [slice, setSlice] = React.useState<Slice<S, R>>();
    var slice = react_1.default.useMemo(function () {
        var slice = tiny_redux_toolkit_1.createSlice(__assign(__assign({}, opts), { initialState: clonedState }));
        if (opts.epicFactory) {
            slice.addEpic(opts.epicFactory);
        }
        return slice;
    }, []);
    react_1.default.useEffect(function () {
        var sub = slice.state$.pipe(op.distinctUntilChanged(), op.tap(function (changed) { return setState(changed); })).subscribe();
        return function () {
            // console.log('unmount', slice.name);
            sub.unsubscribe();
            slice.destroy();
        };
    }, []);
    return [state, slice];
}
exports.useTinyReduxTookit = useTinyReduxTookit;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlueS1yZWR1eC10b29sa2l0LWhvb2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90aW55LXJlZHV4LXRvb2xraXQtaG9vay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBMEI7QUFDMUIsMkRBQTZGO0FBQzdGLGlEQUFxQztBQUNyQyx1REFBaUM7QUFDakMsdURBQXFDO0FBQ3JDOzs7O0dBSUc7QUFDSCxTQUFnQixrQkFBa0IsQ0FDaEMsSUFBNEQ7SUFHNUQsNENBQTRDO0lBQzVDLElBQU0sV0FBVyxHQUFHLGVBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7SUFFdkMsSUFBQSxLQUFvQixlQUFLLENBQUMsUUFBUSxDQUFJLFdBQVcsQ0FBQyxFQUFqRCxLQUFLLFFBQUEsRUFBRSxRQUFRLFFBQWtDLENBQUM7SUFDekQsMkRBQTJEO0lBQzNELElBQU0sS0FBSyxHQUFHLGVBQUssQ0FBQyxPQUFPLENBQWM7UUFDdkMsSUFBTSxLQUFLLEdBQUcsZ0NBQVcsdUJBQUssSUFBSSxLQUFFLFlBQVksRUFBRSxXQUFXLElBQUUsQ0FBQztRQUNoRSxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUU7WUFDcEIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7U0FDakM7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUVQLGVBQUssQ0FBQyxTQUFTLENBQUM7UUFDZCxJQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FDM0IsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEVBQ3pCLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBQSxPQUFPLElBQUksT0FBQSxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQWpCLENBQWlCLENBQUMsQ0FDckMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNkLE9BQU87WUFDTCxzQ0FBc0M7WUFDdEMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2xCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsQixDQUFDLENBQUM7SUFDSixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDUCxPQUFPLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3hCLENBQUM7QUE3QkQsZ0RBNkJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7Y3JlYXRlU2xpY2UsIFJlZHVjZXJzLCBTbGljZSwgU2xpY2VPcHRpb25zLCBFcGljRmFjdG9yeX0gZnJvbSAnLi90aW55LXJlZHV4LXRvb2xraXQnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGNsb25lIGZyb20gJ2xvZGFzaC9jbG9uZSc7XG5leHBvcnQgKiBmcm9tICcuL3RpbnktcmVkdXgtdG9vbGtpdCc7XG4vKipcbiAqIEZvciBwZXJmb3JtYW5jZSByZWFzb24sIGJldHRlciBkZWZpbmUgb3B0cy5yZWR1Y2VycyBvdXRzaWRlIG9mIGNvbXBvbmVudCByZW5kZXJpbmcgZnVuY3Rpb25cbiAqIEBwYXJhbSBvcHRzIFxuICogQHJldHVybnMgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1c2VUaW55UmVkdXhUb29raXQ8UyBleHRlbmRzIHtlcnJvcj86IEVycm9yfSwgUiBleHRlbmRzIFJlZHVjZXJzPFM+PihcbiAgb3B0czogU2xpY2VPcHRpb25zPFMsIFI+ICYge2VwaWNGYWN0b3J5PzogRXBpY0ZhY3Rvcnk8UywgUj59KTpcbiAgW3N0YXRlOiBTLCBzbGljZTogU2xpY2U8UywgUj5dIHtcblxuICAvLyBUbyBhdm9pZCBhIG11dGF0YWJsZSB2ZXJzaW9uIGlzIHBhc3NlZCBpblxuICBjb25zdCBjbG9uZWRTdGF0ZSA9IGNsb25lKG9wdHMuaW5pdGlhbFN0YXRlKTtcblxuICBjb25zdCBbc3RhdGUsIHNldFN0YXRlXSA9IFJlYWN0LnVzZVN0YXRlPFM+KGNsb25lZFN0YXRlKTtcbiAgLy8gY29uc3QgW3NsaWNlLCBzZXRTbGljZV0gPSBSZWFjdC51c2VTdGF0ZTxTbGljZTxTLCBSPj4oKTtcbiAgY29uc3Qgc2xpY2UgPSBSZWFjdC51c2VNZW1vPFNsaWNlPFMsIFI+PigoKSA9PiB7XG4gICAgY29uc3Qgc2xpY2UgPSBjcmVhdGVTbGljZSh7Li4ub3B0cywgaW5pdGlhbFN0YXRlOiBjbG9uZWRTdGF0ZX0pO1xuICAgIGlmIChvcHRzLmVwaWNGYWN0b3J5KSB7XG4gICAgICBzbGljZS5hZGRFcGljKG9wdHMuZXBpY0ZhY3RvcnkpO1xuICAgIH1cbiAgICByZXR1cm4gc2xpY2U7XG4gIH0sIFtdKTtcblxuICBSZWFjdC51c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IHN1YiA9IHNsaWNlLnN0YXRlJC5waXBlKFxuICAgICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG9wLnRhcChjaGFuZ2VkID0+IHNldFN0YXRlKGNoYW5nZWQpKVxuICAgICkuc3Vic2NyaWJlKCk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCd1bm1vdW50Jywgc2xpY2UubmFtZSk7XG4gICAgICBzdWIudW5zdWJzY3JpYmUoKTtcbiAgICAgIHNsaWNlLmRlc3Ryb3koKTtcbiAgICB9O1xuICB9LCBbXSk7XG4gIHJldHVybiBbc3RhdGUsIHNsaWNlXTtcbn1cbiJdfQ==