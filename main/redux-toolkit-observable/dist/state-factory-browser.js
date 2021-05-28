"use strict";
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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ofPayloadAction = exports.stateFactory = void 0;
// tslint:disable:no-console
var redux_toolkit_observable_1 = require("./redux-toolkit-observable");
Object.defineProperty(exports, "ofPayloadAction", { enumerable: true, get: function () { return redux_toolkit_observable_1.ofPayloadAction; } });
var immer_1 = require("immer");
var operators_1 = require("rxjs/operators");
__exportStar(require("./resource-map"), exports);
immer_1.enableES5();
immer_1.enableMapSet();
exports.stateFactory = module.hot && module.hot.data && module.hot.data.stateFactory ? module.hot.data.stateFactory :
    new redux_toolkit_observable_1.StateFactory({});
var sub;
if (process.env.NODE_ENV === 'development' || (process.env.REACT_APP_env && process.env.REACT_APP_env !== 'prod')) {
    sub = exports.stateFactory.log$.pipe(operators_1.tap(function (params) {
        if (params[0] === 'state')
            console.log.apply(console, __spreadArrays(['%c redux:state ', 'font-weight: bold; color: black; background: #44c2fd;'], params.slice(1)));
        else if (params[0] === 'action')
            console.log.apply(console, __spreadArrays(['%c redux:action ', 'font-weight: bold; color: white; background: #8c61ff;'], params.slice(1)));
        else
            console.log.apply(console, params);
    })).subscribe();
}
if (module.hot) {
    module.hot.dispose(function (data) {
        data.stateFactory = exports.stateFactory;
        sub.unsubscribe();
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGUtZmFjdG9yeS1icm93c2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3RhdGUtZmFjdG9yeS1icm93c2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLHVFQUEyRTtBQXlCbEUsZ0dBekJBLDBDQUFlLE9BeUJBO0FBeEJ4QiwrQkFBZ0Q7QUFDaEQsNENBQXFDO0FBQ3JDLGlEQUErQjtBQUUvQixpQkFBUyxFQUFFLENBQUM7QUFDWixvQkFBWSxFQUFFLENBQUM7QUFFRixRQUFBLFlBQVksR0FBRyxNQUFNLENBQUMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBNEIsQ0FBQSxDQUFDO0lBQ3ZJLElBQUksdUNBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUV2QixJQUFJLEdBQXNELENBQUM7QUFDM0QsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsS0FBSyxhQUFhLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsS0FBSyxNQUFNLENBQUMsRUFBRTtJQUNqSCxHQUFHLEdBQUcsb0JBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUMxQixlQUFHLENBQUMsVUFBQSxNQUFNO1FBQ1IsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssT0FBTztZQUN2QixPQUFPLENBQUMsR0FBRyxPQUFYLE9BQU8sa0JBQUssaUJBQWlCLEVBQUUsdURBQXVELEdBQUssTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRTthQUN6RyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRO1lBQy9CLE9BQU8sQ0FBQyxHQUFHLE9BQVgsT0FBTyxrQkFBSyxrQkFBa0IsRUFBRSx1REFBdUQsR0FBSyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFFOztZQUUzRyxPQUFPLENBQUMsR0FBRyxPQUFYLE9BQU8sRUFBUSxNQUFNLEVBQUU7SUFDM0IsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztDQUNmO0FBSUQsSUFBSSxNQUFNLENBQUMsR0FBRyxFQUFFO0lBQ2QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsVUFBQSxJQUFJO1FBQ3JCLElBQUksQ0FBQyxZQUFZLEdBQUcsb0JBQVksQ0FBQztRQUNqQyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDcEIsQ0FBQyxDQUFDLENBQUM7Q0FDSiIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcbmltcG9ydCB7IG9mUGF5bG9hZEFjdGlvbiwgU3RhdGVGYWN0b3J5IH0gZnJvbSAnLi9yZWR1eC10b29sa2l0LW9ic2VydmFibGUnO1xuaW1wb3J0IHsgZW5hYmxlRVM1LCBlbmFibGVNYXBTZXQgfSBmcm9tICdpbW1lcic7XG5pbXBvcnQgeyB0YXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5leHBvcnQgKiBmcm9tICcuL3Jlc291cmNlLW1hcCc7XG5cbmVuYWJsZUVTNSgpO1xuZW5hYmxlTWFwU2V0KCk7XG5cbmV4cG9ydCBjb25zdCBzdGF0ZUZhY3RvcnkgPSBtb2R1bGUuaG90ICYmIG1vZHVsZS5ob3QuZGF0YSAmJiBtb2R1bGUuaG90LmRhdGEuc3RhdGVGYWN0b3J5ID8gbW9kdWxlLmhvdC5kYXRhLnN0YXRlRmFjdG9yeSBhcyBTdGF0ZUZhY3Rvcnk6XG4gIG5ldyBTdGF0ZUZhY3Rvcnkoe30pO1xuXG5sZXQgc3ViOiBSZXR1cm5UeXBlPHR5cGVvZiBzdGF0ZUZhY3RvcnkubG9nJFsnc3Vic2NyaWJlJ10+O1xuaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnIHx8IChwcm9jZXNzLmVudi5SRUFDVF9BUFBfZW52ICYmIHByb2Nlc3MuZW52LlJFQUNUX0FQUF9lbnYgIT09ICdwcm9kJykpIHtcbiAgc3ViID0gc3RhdGVGYWN0b3J5LmxvZyQucGlwZShcbiAgICB0YXAocGFyYW1zID0+IHtcbiAgICAgIGlmIChwYXJhbXNbMF0gPT09ICdzdGF0ZScpXG4gICAgICAgIGNvbnNvbGUubG9nKCclYyByZWR1eDpzdGF0ZSAnLCAnZm9udC13ZWlnaHQ6IGJvbGQ7IGNvbG9yOiBibGFjazsgYmFja2dyb3VuZDogIzQ0YzJmZDsnLCAuLi5wYXJhbXMuc2xpY2UoMSkpO1xuICAgICAgZWxzZSBpZiAocGFyYW1zWzBdID09PSAnYWN0aW9uJylcbiAgICAgIGNvbnNvbGUubG9nKCclYyByZWR1eDphY3Rpb24gJywgJ2ZvbnQtd2VpZ2h0OiBib2xkOyBjb2xvcjogd2hpdGU7IGJhY2tncm91bmQ6ICM4YzYxZmY7JywgLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgIGVsc2VcbiAgICAgICAgY29uc29sZS5sb2coLi4ucGFyYW1zKTtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xufVxuXG5leHBvcnQgeyBvZlBheWxvYWRBY3Rpb24gfTtcblxuaWYgKG1vZHVsZS5ob3QpIHtcbiAgbW9kdWxlLmhvdC5kaXNwb3NlKGRhdGEgPT4ge1xuICAgIGRhdGEuc3RhdGVGYWN0b3J5ID0gc3RhdGVGYWN0b3J5O1xuICAgIHN1Yi51bnN1YnNjcmliZSgpO1xuICB9KTtcbn1cbiJdfQ==