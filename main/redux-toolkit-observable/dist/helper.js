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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReducers = exports.createSliceHelper = void 0;
function createSliceHelper(stateFactory, opts) {
    var slice = stateFactory.newSlice(opts);
    var actionDispatcher = stateFactory.bindActionCreators(slice);
    var releaseEpic;
    var helper = __assign(__assign({}, slice), { actionDispatcher: actionDispatcher,
        setEpic: function (epicFactory) {
            var epic = epicFactory(helper);
            releaseEpic = stateFactory.addEpic(epic, opts.name);
        },
        destroy: function () {
            stateFactory.removeSlice(slice);
            if (releaseEpic)
                releaseEpic();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBZUEsU0FBZ0IsaUJBQWlCLENBQy9CLFlBQTBCLEVBQUUsSUFBOEI7SUFFMUQsSUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxQyxJQUFNLGdCQUFnQixHQUFHLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUVoRSxJQUFJLFdBQXFDLENBQUM7SUFDMUMsSUFBTSxNQUFNLHlCQUNQLEtBQUssS0FDUixnQkFBZ0Isa0JBQUE7UUFDaEIsT0FBTyxFQUFQLFVBQVEsV0FBOEI7WUFDcEMsSUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2pDLFdBQVcsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEQsQ0FBQztRQUNELE9BQU87WUFDTCxZQUFZLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hDLElBQUksV0FBVztnQkFDYixXQUFXLEVBQUUsQ0FBQztRQUNsQixDQUFDO1FBQ0QsUUFBUTtZQUNOLE9BQU8sWUFBWSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QyxDQUFDO1FBQ0QsUUFBUTtZQUNOLE9BQU8sWUFBWSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QyxDQUFDLEdBQ0YsQ0FBQztJQUNGLE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUEzQkQsOENBMkJDO0FBWUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXFCRztBQUNILFNBQWdCLGNBQWMsQ0FBaUMsY0FBaUI7SUFDOUUsSUFBTSxTQUFTLEdBQUcsRUFBUyxDQUFDOzRCQUNoQixHQUFHLEVBQUUsUUFBUTtRQUN2QixTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsVUFBQyxDQUFXLEVBQUUsRUFBNkI7Z0JBQTVCLE9BQU8sYUFBQTtZQUNyQyxPQUFPLFFBQVEsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDOUIsQ0FBQyxDQUFDOztJQUhKLEtBQThCLFVBQThCLEVBQTlCLEtBQUEsTUFBTSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsRUFBOUIsY0FBOEIsRUFBOUIsSUFBOEI7UUFBakQsSUFBQSxXQUFlLEVBQWQsR0FBRyxRQUFBLEVBQUUsUUFBUSxRQUFBO2dCQUFiLEdBQUcsRUFBRSxRQUFRO0tBSXhCO0lBQ0QsT0FBTyxTQUFTLENBQUM7QUFDbkIsQ0FBQztBQVJELHdDQVFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtTdGF0ZUZhY3RvcnksIEV4dHJhU2xpY2VSZWR1Y2Vyc30gZnJvbSAnLi9yZWR1eC10b29sa2l0LW9ic2VydmFibGUnO1xuaW1wb3J0IHtDcmVhdGVTbGljZU9wdGlvbnMsIFNsaWNlQ2FzZVJlZHVjZXJzLCBTbGljZSwgUGF5bG9hZEFjdGlvbiwgQ2FzZVJlZHVjZXJBY3Rpb25zLCBEcmFmdH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgeyBFcGljIH0gZnJvbSAncmVkdXgtb2JzZXJ2YWJsZSc7XG5pbXBvcnQge09ic2VydmFibGV9IGZyb20gJ3J4anMnO1xuXG5leHBvcnQgdHlwZSBFcGljRmFjdG9yeTxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+ID0gKHNsaWNlOiBTbGljZUhlbHBlcjxTLCBSPikgPT4gRXBpYzxQYXlsb2FkQWN0aW9uPGFueT4sIGFueSwgUz47XG5cbmV4cG9ydCB0eXBlIFNsaWNlSGVscGVyPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4gPSBTbGljZTxTLCBSPiAmIHtcbiAgYWN0aW9uRGlzcGF0Y2hlcjogQ2FzZVJlZHVjZXJBY3Rpb25zPFIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8Uz4+O1xuICBzZXRFcGljKGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPik6IHZvaWQ7XG4gIGRlc3Ryb3koKTogdm9pZDtcbiAgZ2V0U3RvcmUoKTogT2JzZXJ2YWJsZTxTPjtcbiAgZ2V0U3RhdGUoKTogUztcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTbGljZUhlbHBlcjxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KFxuICBzdGF0ZUZhY3Rvcnk6IFN0YXRlRmFjdG9yeSwgb3B0czogQ3JlYXRlU2xpY2VPcHRpb25zPFMsIFI+KTogU2xpY2VIZWxwZXI8UywgUj4ge1xuXG4gIGNvbnN0IHNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKG9wdHMpO1xuICBjb25zdCBhY3Rpb25EaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhzbGljZSk7XG5cbiAgbGV0IHJlbGVhc2VFcGljOiAoKCkgPT4gdm9pZCkgfCB1bmRlZmluZWQ7XG4gIGNvbnN0IGhlbHBlciA9IHtcbiAgICAuLi5zbGljZSxcbiAgICBhY3Rpb25EaXNwYXRjaGVyLFxuICAgIHNldEVwaWMoZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KSB7XG4gICAgICBjb25zdCBlcGljID0gZXBpY0ZhY3RvcnkoaGVscGVyKTtcbiAgICAgIHJlbGVhc2VFcGljID0gc3RhdGVGYWN0b3J5LmFkZEVwaWMoZXBpYywgb3B0cy5uYW1lKTtcbiAgICB9LFxuICAgIGRlc3Ryb3koKSB7XG4gICAgICBzdGF0ZUZhY3RvcnkucmVtb3ZlU2xpY2Uoc2xpY2UpO1xuICAgICAgaWYgKHJlbGVhc2VFcGljKVxuICAgICAgICByZWxlYXNlRXBpYygpO1xuICAgIH0sXG4gICAgZ2V0U3RvcmUoKSB7XG4gICAgICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoc2xpY2UpO1xuICAgIH0sXG4gICAgZ2V0U3RhdGUoKSB7XG4gICAgICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoc2xpY2UpO1xuICAgIH1cbiAgfTtcbiAgcmV0dXJuIGhlbHBlcjtcbn1cblxuaW50ZXJmYWNlIFNpbXBsZVJlZHVjZXJzPFM+IHtcbiAgW0s6IHN0cmluZ106IChkcmFmdDogRHJhZnQ8Uz4sIHBheWxvYWQ/OiBhbnkpID0+IHZvaWQgfCBEcmFmdDxTPjtcbn1cblxudHlwZSBSZWd1bGFyUmVkdWNlcnM8UywgUj4gPSB7XG4gIFtLIGluIGtleW9mIFJdOiBSW0tdIGV4dGVuZHMgKHM6IGFueSkgPT4gYW55ID8gKHM6IERyYWZ0PFM+KSA9PiB2b2lkIHwgRHJhZnQ8Uz4gOlxuICAgIFJbS10gZXh0ZW5kcyAoczogYW55LCBwYXlsb2FkOiBpbmZlciBQKSA9PiBhbnkgPyAoczogRHJhZnQ8Uz4sIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxQPikgPT4gdm9pZCB8IERyYWZ0PFM+IDpcbiAgICAgIChzOiBEcmFmdDxTPiwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHVua25vd24+KSA9PiB2b2lkIHwgRHJhZnQ8Uz47XG59O1xuXG4vKipcbiAqIGNyZWF0ZVJlZHVjZXJzIGhlbHBzIHRvIHNpbXBsaWZ5IGhvdyB3ZSB3cml0aW5nIGRlZmluaXRpb24gb2YgU2xpY2VDYXNlUmVkdWNlcnMsXG4gKiBlLmcuIEEgcmVndWxhciBTbGljZUNhc2VSZWR1Y2VycyB0YWtlcyBQYXlsb2FkQWN0aW9uIGFzIHBhcmFtZXRlciwgbGlrZTogXG4gKiBgYGB0c1xuICogY29uc3QgcmVkdWNlcnMgPSB7XG4gKiAgIHJlZHVjZXJOYW1lKHN0YXRlOiBTdGF0ZSwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPG51bWJlcj4pIHtcbiAqICAgICAgLy8gdXBkYXRlIHN0YXRlIHdpdGggcGF5bG9hZCBkYXRhXG4gKiAgICB9XG4gKiB9O1xuICogYGBgXG4gKiBOb3JtYWxseSByZWR1Y2VyJ3MgbG9naWMgb25seSBjYXJlIGFib3V0IGBwYXlsb2FkYCBpbnN0ZWFkIG9mIGBQYXlsb2FkQWN0aW9uYCxcbiAqIGNyZWF0ZVJlZHVjZXJzIGFjY2VwdHMgYSBzaW1wbGVyIGZvcm1hdDpcbiAqIGBgYHRzXG4gKiBjb25zdCByZWR1Y2VycyA9IGNyZWF0ZVJlZHVjZXJzKHtcbiAqICAgcmVkdWNlck5hbWUoZHJhZnQ6IFN0YXRlLCBwYXlsb2FkOiBudW1iZXIpIHtcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqIFlvdSBjYW4gZGVjbGFyZSBwYXlsb2FkIGFzIHJlZHVjZXIncyBwYXJhbWV0ZXIgaW5zdGVhZCBvZiBhIFBheWxvYWRBY3Rpb25cbiAqIEBwYXJhbSBzaW1wbGVSZWR1Y2Vyc1xuICogQHJldHVybnMgU2xpY2VDYXNlUmVkdWNlcnMgd2hpY2ggY2FuIGJlIHBhcnQgb2YgcGFyYW1ldGVyIG9mIGNyZWF0ZVNsaWNlSGVscGVyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSZWR1Y2VyczxTLCBSIGV4dGVuZHMgU2ltcGxlUmVkdWNlcnM8Uz4+KHNpbXBsZVJlZHVjZXJzOiBSKTogUmVndWxhclJlZHVjZXJzPFMsIFI+IHtcbiAgY29uc3QgclJlZHVjZXJzID0ge30gYXMgYW55O1xuICBmb3IgKGNvbnN0IFtrZXksIHNSZWR1Y2VyXSBvZiBPYmplY3QuZW50cmllcyhzaW1wbGVSZWR1Y2VycykpIHtcbiAgICByUmVkdWNlcnNba2V5XSA9IChzOiBEcmFmdDxTPiwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPGFueT4pID0+IHtcbiAgICAgIHJldHVybiBzUmVkdWNlcihzLCBwYXlsb2FkKTtcbiAgICB9O1xuICB9XG4gIHJldHVybiByUmVkdWNlcnM7XG59XG4iXX0=