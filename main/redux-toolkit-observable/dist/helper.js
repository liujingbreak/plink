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
exports.createReducers = exports.createSliceHelper = void 0;
var rxjs_1 = require("rxjs");
var op = __importStar(require("rxjs/operators"));
function createSliceHelper(stateFactory, opts) {
    var slice = stateFactory.newSlice(opts);
    var actionDispatcher = stateFactory.bindActionCreators(slice);
    var destory$ = new rxjs_1.Subject();
    function addEpic$(epicFactory$) {
        var sub = epicFactory$.pipe(op.distinctUntilChanged(), op.switchMap(function (fac) {
            if (fac) {
                var epic_1 = fac(helper);
                if (epic_1) {
                    return new rxjs_1.Observable(function () {
                        var release = stateFactory.addEpic(epic_1, opts.name);
                        return release;
                    });
                }
            }
            return rxjs_1.EMPTY;
        }), op.takeUntil(destory$)).subscribe();
        // releaseEpic.push(() => sub.unsubscribe());
        return function () { return sub.unsubscribe(); };
    }
    // let releaseEpic: Array<() => void> = [];
    var helper = __assign(__assign({}, slice), { actionDispatcher: actionDispatcher,
        addEpic: function (epicFactory) {
            return addEpic$(rxjs_1.of(epicFactory));
        },
        addEpic$: addEpic$,
        destroy: function () {
            destory$.next();
            destory$.complete();
            stateFactory.removeSlice(slice);
        },
        getStore: function () {
            return stateFactory.sliceStore(slice);
        },
        getState: function () {
            return stateFactory.sliceState(slice);
        } });
    return helper;
}
exports.createSliceHelper = createSliceHelper;
/**
 * createReducers helps to simplify how we writing definition of SliceCaseReducers,
 * e.g. A regular SliceCaseReducers takes PayloadAction as parameter, like:
 * ```ts
 * const reducers = {
 *   reducerName(state: State, {payload}: PayloadAction<number>) {
 *      // update state with payload data
 *    }
 * };
 * ```
 * Normally reducer's logic only care about `payload` instead of `PayloadAction`,
 * createReducers accepts a simpler format:
 * ```ts
 * const reducers = createReducers({
 *   reducerName(draft: State, payload: number) {
 *   }
 * });
 * ```
 * You can declare payload as reducer's parameter instead of a PayloadAction
 * @param simpleReducers
 * @returns SliceCaseReducers which can be part of parameter of createSliceHelper
 */
function createReducers(simpleReducers) {
    var rReducers = {};
    var _loop_1 = function (key, sReducer) {
        rReducers[key] = function (s, _a) {
            var payload = _a.payload;
            return sReducer(s, payload);
        };
    };
    for (var _i = 0, _a = Object.entries(simpleReducers); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], sReducer = _b[1];
        _loop_1(key, sReducer);
    }
    return rReducers;
}
exports.createReducers = createReducers;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUdBLDZCQUFvRDtBQUNwRCxpREFBcUM7QUFhckMsU0FBZ0IsaUJBQWlCLENBQy9CLFlBQTBCLEVBQUUsSUFBOEI7SUFFMUQsSUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxQyxJQUFNLGdCQUFnQixHQUFHLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNoRSxJQUFNLFFBQVEsR0FBRyxJQUFJLGNBQU8sRUFBRSxDQUFDO0lBRS9CLFNBQVMsUUFBUSxDQUFDLFlBQThEO1FBQzlFLElBQU0sR0FBRyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQzNCLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxFQUN6QixFQUFFLENBQUMsU0FBUyxDQUFDLFVBQUEsR0FBRztZQUNkLElBQUksR0FBRyxFQUFFO2dCQUNQLElBQU0sTUFBSSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDekIsSUFBSSxNQUFJLEVBQUU7b0JBQ1IsT0FBTyxJQUFJLGlCQUFVLENBQUM7d0JBQ3BCLElBQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsTUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDdEQsT0FBTyxPQUFPLENBQUM7b0JBQ2pCLENBQUMsQ0FBQyxDQUFDO2lCQUNKO2FBQ0Y7WUFDRCxPQUFPLFlBQUssQ0FBQztRQUNmLENBQUMsQ0FBQyxFQUNGLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQ3ZCLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDZCw2Q0FBNkM7UUFDN0MsT0FBTyxjQUFNLE9BQUEsR0FBRyxDQUFDLFdBQVcsRUFBRSxFQUFqQixDQUFpQixDQUFDO0lBQ2pDLENBQUM7SUFFRCwyQ0FBMkM7SUFDM0MsSUFBTSxNQUFNLHlCQUNQLEtBQUssS0FDUixnQkFBZ0Isa0JBQUE7UUFDaEIsT0FBTyxFQUFQLFVBQVEsV0FBOEI7WUFDcEMsT0FBTyxRQUFRLENBQUMsU0FBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDbkMsQ0FBQztRQUNELFFBQVEsVUFBQTtRQUNSLE9BQU87WUFDTCxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3BCLFlBQVksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbEMsQ0FBQztRQUNELFFBQVE7WUFDTixPQUFPLFlBQVksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEMsQ0FBQztRQUNELFFBQVE7WUFDTixPQUFPLFlBQVksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEMsQ0FBQyxHQUNGLENBQUM7SUFDRixPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDO0FBakRELDhDQWlEQztBQVlEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FxQkc7QUFDSCxTQUFnQixjQUFjLENBQWlDLGNBQWlCO0lBQzlFLElBQU0sU0FBUyxHQUFHLEVBQVMsQ0FBQzs0QkFDaEIsR0FBRyxFQUFFLFFBQVE7UUFDdkIsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFVBQUMsQ0FBVyxFQUFFLEVBQTZCO2dCQUE1QixPQUFPLGFBQUE7WUFDckMsT0FBTyxRQUFRLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzlCLENBQUMsQ0FBQzs7SUFISixLQUE4QixVQUE4QixFQUE5QixLQUFBLE1BQU0sQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEVBQTlCLGNBQThCLEVBQTlCLElBQThCO1FBQWpELElBQUEsV0FBZSxFQUFkLEdBQUcsUUFBQSxFQUFFLFFBQVEsUUFBQTtnQkFBYixHQUFHLEVBQUUsUUFBUTtLQUl4QjtJQUNELE9BQU8sU0FBUyxDQUFDO0FBQ25CLENBQUM7QUFSRCx3Q0FRQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7U3RhdGVGYWN0b3J5LCBFeHRyYVNsaWNlUmVkdWNlcnN9IGZyb20gJy4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlJztcbmltcG9ydCB7Q3JlYXRlU2xpY2VPcHRpb25zLCBTbGljZUNhc2VSZWR1Y2VycywgU2xpY2UsIFBheWxvYWRBY3Rpb24sIENhc2VSZWR1Y2VyQWN0aW9ucywgRHJhZnR9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IHsgRXBpYyB9IGZyb20gJ3JlZHV4LW9ic2VydmFibGUnO1xuaW1wb3J0IHtPYnNlcnZhYmxlLCBFTVBUWSwgb2YsIFN1YmplY3R9IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5leHBvcnQgdHlwZSBFcGljRmFjdG9yeTxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+ID0gKHNsaWNlOiBTbGljZUhlbHBlcjxTLCBSPikgPT4gRXBpYzxQYXlsb2FkQWN0aW9uPGFueT4sIGFueSwgdW5rbm93bj4gfCB2b2lkO1xuXG5leHBvcnQgdHlwZSBTbGljZUhlbHBlcjxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+ID0gU2xpY2U8UywgUj4gJiB7XG4gIGFjdGlvbkRpc3BhdGNoZXI6IENhc2VSZWR1Y2VyQWN0aW9uczxSICYgRXh0cmFTbGljZVJlZHVjZXJzPFM+PjtcbiAgYWRkRXBpYyhlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4pOiAoKSA9PiB2b2lkO1xuICBhZGRFcGljJChlcGljRmFjdG9yeTogT2JzZXJ2YWJsZTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KTogKCkgPT4gdm9pZDtcbiAgZGVzdHJveSgpOiB2b2lkO1xuICBnZXRTdG9yZSgpOiBPYnNlcnZhYmxlPFM+O1xuICBnZXRTdGF0ZSgpOiBTO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNsaWNlSGVscGVyPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4oXG4gIHN0YXRlRmFjdG9yeTogU3RhdGVGYWN0b3J5LCBvcHRzOiBDcmVhdGVTbGljZU9wdGlvbnM8UywgUj4pOiBTbGljZUhlbHBlcjxTLCBSPiB7XG5cbiAgY29uc3Qgc2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uob3B0cyk7XG4gIGNvbnN0IGFjdGlvbkRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKHNsaWNlKTtcbiAgY29uc3QgZGVzdG9yeSQgPSBuZXcgU3ViamVjdCgpO1xuXG4gIGZ1bmN0aW9uIGFkZEVwaWMkKGVwaWNGYWN0b3J5JDogT2JzZXJ2YWJsZTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KSB7XG4gICAgY29uc3Qgc3ViID0gZXBpY0ZhY3RvcnkkLnBpcGUoXG4gICAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgb3Auc3dpdGNoTWFwKGZhYyA9PiB7XG4gICAgICAgIGlmIChmYWMpIHtcbiAgICAgICAgICBjb25zdCBlcGljID0gZmFjKGhlbHBlcik7XG4gICAgICAgICAgaWYgKGVwaWMpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZSgoKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHJlbGVhc2UgPSBzdGF0ZUZhY3RvcnkuYWRkRXBpYyhlcGljLCBvcHRzLm5hbWUpO1xuICAgICAgICAgICAgICByZXR1cm4gcmVsZWFzZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICB9KSxcbiAgICAgIG9wLnRha2VVbnRpbChkZXN0b3J5JClcbiAgICApLnN1YnNjcmliZSgpO1xuICAgIC8vIHJlbGVhc2VFcGljLnB1c2goKCkgPT4gc3ViLnVuc3Vic2NyaWJlKCkpO1xuICAgIHJldHVybiAoKSA9PiBzdWIudW5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIC8vIGxldCByZWxlYXNlRXBpYzogQXJyYXk8KCkgPT4gdm9pZD4gPSBbXTtcbiAgY29uc3QgaGVscGVyID0ge1xuICAgIC4uLnNsaWNlLFxuICAgIGFjdGlvbkRpc3BhdGNoZXIsXG4gICAgYWRkRXBpYyhlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4pIHtcbiAgICAgIHJldHVybiBhZGRFcGljJChvZihlcGljRmFjdG9yeSkpO1xuICAgIH0sXG4gICAgYWRkRXBpYyQsXG4gICAgZGVzdHJveSgpIHtcbiAgICAgIGRlc3RvcnkkLm5leHQoKTtcbiAgICAgIGRlc3RvcnkkLmNvbXBsZXRlKCk7XG4gICAgICBzdGF0ZUZhY3RvcnkucmVtb3ZlU2xpY2Uoc2xpY2UpO1xuICAgIH0sXG4gICAgZ2V0U3RvcmUoKSB7XG4gICAgICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoc2xpY2UpO1xuICAgIH0sXG4gICAgZ2V0U3RhdGUoKSB7XG4gICAgICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoc2xpY2UpO1xuICAgIH1cbiAgfTtcbiAgcmV0dXJuIGhlbHBlcjtcbn1cblxuaW50ZXJmYWNlIFNpbXBsZVJlZHVjZXJzPFM+IHtcbiAgW0s6IHN0cmluZ106IChkcmFmdDogRHJhZnQ8Uz4sIHBheWxvYWQ/OiBhbnkpID0+IFMgfCB2b2lkIHwgRHJhZnQ8Uz47XG59XG5cbmV4cG9ydCB0eXBlIFJlZ3VsYXJSZWR1Y2VyczxTLCBSIGV4dGVuZHMgU2ltcGxlUmVkdWNlcnM8Uz4+ID0ge1xuICBbSyBpbiBrZXlvZiBSXTogUltLXSBleHRlbmRzIChzOiBhbnkpID0+IGFueSA/IChzOiBEcmFmdDxTPikgPT4gUyB8IHZvaWQgfCBEcmFmdDxTPiA6XG4gICAgUltLXSBleHRlbmRzIChzOiBhbnksIHBheWxvYWQ6IGluZmVyIFApID0+IGFueSA/IChzOiBEcmFmdDxTPiwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPFA+KSA9PiB2b2lkIHwgRHJhZnQ8Uz4gOlxuICAgICAgKHM6IERyYWZ0PFM+LCBhY3Rpb246IFBheWxvYWRBY3Rpb248dW5rbm93bj4pID0+IHZvaWQgfCBEcmFmdDxTPjtcbn07XG5cbi8qKlxuICogY3JlYXRlUmVkdWNlcnMgaGVscHMgdG8gc2ltcGxpZnkgaG93IHdlIHdyaXRpbmcgZGVmaW5pdGlvbiBvZiBTbGljZUNhc2VSZWR1Y2VycyxcbiAqIGUuZy4gQSByZWd1bGFyIFNsaWNlQ2FzZVJlZHVjZXJzIHRha2VzIFBheWxvYWRBY3Rpb24gYXMgcGFyYW1ldGVyLCBsaWtlOiBcbiAqIGBgYHRzXG4gKiBjb25zdCByZWR1Y2VycyA9IHtcbiAqICAgcmVkdWNlck5hbWUoc3RhdGU6IFN0YXRlLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248bnVtYmVyPikge1xuICogICAgICAvLyB1cGRhdGUgc3RhdGUgd2l0aCBwYXlsb2FkIGRhdGFcbiAqICAgIH1cbiAqIH07XG4gKiBgYGBcbiAqIE5vcm1hbGx5IHJlZHVjZXIncyBsb2dpYyBvbmx5IGNhcmUgYWJvdXQgYHBheWxvYWRgIGluc3RlYWQgb2YgYFBheWxvYWRBY3Rpb25gLFxuICogY3JlYXRlUmVkdWNlcnMgYWNjZXB0cyBhIHNpbXBsZXIgZm9ybWF0OlxuICogYGBgdHNcbiAqIGNvbnN0IHJlZHVjZXJzID0gY3JlYXRlUmVkdWNlcnMoe1xuICogICByZWR1Y2VyTmFtZShkcmFmdDogU3RhdGUsIHBheWxvYWQ6IG51bWJlcikge1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICogWW91IGNhbiBkZWNsYXJlIHBheWxvYWQgYXMgcmVkdWNlcidzIHBhcmFtZXRlciBpbnN0ZWFkIG9mIGEgUGF5bG9hZEFjdGlvblxuICogQHBhcmFtIHNpbXBsZVJlZHVjZXJzXG4gKiBAcmV0dXJucyBTbGljZUNhc2VSZWR1Y2VycyB3aGljaCBjYW4gYmUgcGFydCBvZiBwYXJhbWV0ZXIgb2YgY3JlYXRlU2xpY2VIZWxwZXJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJlZHVjZXJzPFMsIFIgZXh0ZW5kcyBTaW1wbGVSZWR1Y2VyczxTPj4oc2ltcGxlUmVkdWNlcnM6IFIpOiBSZWd1bGFyUmVkdWNlcnM8UywgUj4ge1xuICBjb25zdCByUmVkdWNlcnMgPSB7fSBhcyBhbnk7XG4gIGZvciAoY29uc3QgW2tleSwgc1JlZHVjZXJdIG9mIE9iamVjdC5lbnRyaWVzKHNpbXBsZVJlZHVjZXJzKSkge1xuICAgIHJSZWR1Y2Vyc1trZXldID0gKHM6IERyYWZ0PFM+LCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248YW55PikgPT4ge1xuICAgICAgcmV0dXJuIHNSZWR1Y2VyKHMsIHBheWxvYWQpO1xuICAgIH07XG4gIH1cbiAgcmV0dXJuIHJSZWR1Y2Vycztcbn1cbiJdfQ==