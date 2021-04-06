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
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStoreOfStateFactory = exports.useInternalReduxForComponent = void 0;
var react_1 = require("react");
var op = __importStar(require("rxjs/operators"));
/**
 * Use "state" in React rendering template, use `getState()` to get current computed state from Redux Store,
 * be aware, `state` might not be the same as returned value of `getState()` at some moments.
 *
 * @param name
 * @param sliceFactory
 */
function useInternalReduxForComponent(name, sliceFactory) {
    var _a = react_1.useState(), reactState = _a[0], setReactState = _a[1];
    var toolkit = react_1.useMemo(function () {
        return sliceFactory(name);
    }, []);
    react_1.useEffect(function () {
        var sub = toolkit.getStore().pipe(op.tap(function (s) { return setReactState(__assign(__assign({}, s), { resourceMap: toolkit.resourceMap })); })).subscribe();
        return function () {
            sub.unsubscribe();
            toolkit.destory();
        };
    }, []);
    return __assign(__assign({}, toolkit), { state: reactState });
}
exports.useInternalReduxForComponent = useInternalReduxForComponent;
function useStoreOfStateFactory(stateFactory) {
    var _a = react_1.useState(undefined), reduxStore = _a[0], setReduxStore = _a[1];
    react_1.useEffect(function () {
        stateFactory.store$.subscribe({
            next: function (store) {
                setReduxStore(store);
            }
        });
    }, [stateFactory.getRootStore()]);
    return reduxStore;
}
exports.useStoreOfStateFactory = useStoreOfStateFactory;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVhY3QtcmVkdXgtaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVhY3QtcmVkdXgtaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUdBLCtCQUFtRDtBQUVuRCxpREFBcUM7QUFhckM7Ozs7OztHQU1HO0FBQ0gsU0FBZ0IsNEJBQTRCLENBQzFDLElBQVksRUFBRSxZQUFpQztJQUV6QyxJQUFBLEtBQThCLGdCQUFRLEVBQW1DLEVBQXhFLFVBQVUsUUFBQSxFQUFFLGFBQWEsUUFBK0MsQ0FBQztJQUVoRixJQUFNLE9BQU8sR0FBRyxlQUFPLENBQUM7UUFDdEIsT0FBTyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDNUIsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBRVAsaUJBQVMsQ0FBQztRQUNSLElBQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQ2pDLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxhQUFhLHVCQUFLLENBQUMsS0FBRSxXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVcsSUFBRSxFQUF2RCxDQUF1RCxDQUFDLENBQ3JFLENBQUMsU0FBUyxFQUFFLENBQUM7UUFFZCxPQUFPO1lBQ0wsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2xCLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNwQixDQUFDLENBQUM7SUFDSixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFUCw2QkFBVyxPQUFPLEtBQUUsS0FBSyxFQUFFLFVBQVUsSUFBRTtBQUN6QyxDQUFDO0FBckJELG9FQXFCQztBQUVELFNBQWdCLHNCQUFzQixDQUFDLFlBQTBCO0lBQ3pELElBQUEsS0FBOEIsZ0JBQVEsQ0FBMkMsU0FBUyxDQUFDLEVBQTFGLFVBQVUsUUFBQSxFQUFFLGFBQWEsUUFBaUUsQ0FBQztJQUNsRyxpQkFBUyxDQUFDO1FBQ1IsWUFBWSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7WUFDNUIsSUFBSSxZQUFDLEtBQUs7Z0JBQ1IsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3ZCLENBQUM7U0FDRixDQUFDLENBQUM7SUFFTCxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRWxDLE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUM7QUFaRCx3REFZQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7SW5mZXJhYmxlQ29tcG9uZW50RW5oYW5jZXJXaXRoUHJvcHN9IGZyb20gJ3JlYWN0LXJlZHV4JztcbmltcG9ydCB7U3RhdGVGYWN0b3J5fSBmcm9tICcuL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZSc7XG5pbXBvcnQge1Jlc291cmNlTWFwfSBmcm9tICcuL3Jlc291cmNlLW1hcCc7XG5pbXBvcnQge3VzZUVmZmVjdCwgdXNlU3RhdGUsIHVzZU1lbW99IGZyb20gJ3JlYWN0JztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5leHBvcnQgdHlwZSBJbmplY3RlZENvbXBQcm9wc1R5cGU8Q29ubmVjdEhPQz4gPVxuICAoQ29ubmVjdEhPQyBleHRlbmRzIEluZmVyYWJsZUNvbXBvbmVudEVuaGFuY2VyV2l0aFByb3BzPGluZmVyIFRJbmplY3RlZFByb3BzLCBhbnk+ID8gVEluamVjdGVkUHJvcHMgOiB7fSlcbiAgJlxuICAoQ29ubmVjdEhPQyBleHRlbmRzIEluZmVyYWJsZUNvbXBvbmVudEVuaGFuY2VyV2l0aFByb3BzPGFueSwgaW5mZXIgVE93blByb3BzPiA/IFRPd25Qcm9wcyA6IHt9KTtcblxuZXhwb3J0IGludGVyZmFjZSBSZWR1eEluc2lkZUNvbXBvbmVudDxTPiB7XG4gIHJlc291cmNlTWFwPzogUmVzb3VyY2VNYXA7XG4gIGdldFN0b3JlKCk6IHJ4Lk9ic2VydmFibGU8Uz47XG4gIGRlc3RvcnkoKTogdm9pZDtcbn1cblxuLyoqXG4gKiBVc2UgXCJzdGF0ZVwiIGluIFJlYWN0IHJlbmRlcmluZyB0ZW1wbGF0ZSwgdXNlIGBnZXRTdGF0ZSgpYCB0byBnZXQgY3VycmVudCBjb21wdXRlZCBzdGF0ZSBmcm9tIFJlZHV4IFN0b3JlLFxuICogYmUgYXdhcmUsIGBzdGF0ZWAgbWlnaHQgbm90IGJlIHRoZSBzYW1lIGFzIHJldHVybmVkIHZhbHVlIG9mIGBnZXRTdGF0ZSgpYCBhdCBzb21lIG1vbWVudHMuXG4gKiBcbiAqIEBwYXJhbSBuYW1lXG4gKiBAcGFyYW0gc2xpY2VGYWN0b3J5IFxuICovXG5leHBvcnQgZnVuY3Rpb24gdXNlSW50ZXJuYWxSZWR1eEZvckNvbXBvbmVudDxTIGV4dGVuZHMge1twcm9wOiBzdHJpbmddOiBhbnl9LCBUIGV4dGVuZHMgUmVkdXhJbnNpZGVDb21wb25lbnQ8Uz4+KFxuICBuYW1lOiBzdHJpbmcsIHNsaWNlRmFjdG9yeTogKG5hbWU6IHN0cmluZykgPT4gVCkge1xuXG4gIGNvbnN0IFtyZWFjdFN0YXRlLCBzZXRSZWFjdFN0YXRlXSA9IHVzZVN0YXRlPFMgJiB7cmVzb3VyY2VNYXA/OiBSZXNvdXJjZU1hcH0+KCk7XG5cbiAgY29uc3QgdG9vbGtpdCA9IHVzZU1lbW8oKCkgPT4ge1xuICAgIHJldHVybiBzbGljZUZhY3RvcnkobmFtZSk7XG4gIH0sIFtdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IHN1YiA9IHRvb2xraXQuZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgb3AudGFwKHMgPT4gc2V0UmVhY3RTdGF0ZSh7Li4ucywgcmVzb3VyY2VNYXA6IHRvb2xraXQucmVzb3VyY2VNYXB9KSlcbiAgICApLnN1YnNjcmliZSgpO1xuXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHN1Yi51bnN1YnNjcmliZSgpO1xuICAgICAgdG9vbGtpdC5kZXN0b3J5KCk7XG4gICAgfTtcbiAgfSwgW10pO1xuXG4gIHJldHVybiB7Li4udG9vbGtpdCwgc3RhdGU6IHJlYWN0U3RhdGV9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdXNlU3RvcmVPZlN0YXRlRmFjdG9yeShzdGF0ZUZhY3Rvcnk6IFN0YXRlRmFjdG9yeSkge1xuICBjb25zdCBbcmVkdXhTdG9yZSwgc2V0UmVkdXhTdG9yZV0gPSB1c2VTdGF0ZTxSZXR1cm5UeXBlPFN0YXRlRmFjdG9yeVsnZ2V0Um9vdFN0b3JlJ10+Pih1bmRlZmluZWQpO1xuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIHN0YXRlRmFjdG9yeS5zdG9yZSQuc3Vic2NyaWJlKHtcbiAgICAgIG5leHQoc3RvcmUpIHtcbiAgICAgICAgc2V0UmVkdXhTdG9yZShzdG9yZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgfSwgW3N0YXRlRmFjdG9yeS5nZXRSb290U3RvcmUoKV0pO1xuXG4gIHJldHVybiByZWR1eFN0b3JlO1xufVxuIl19