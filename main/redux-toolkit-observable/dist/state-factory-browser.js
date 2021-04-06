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
if (process.env.REACT_APP_env !== 'prod') {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGUtZmFjdG9yeS1icm93c2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3RhdGUtZmFjdG9yeS1icm93c2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLHVFQUEyRTtBQXlCbEUsZ0dBekJBLDBDQUFlLE9BeUJBO0FBeEJ4QiwrQkFBZ0Q7QUFDaEQsNENBQXFDO0FBQ3JDLGlEQUErQjtBQUUvQixpQkFBUyxFQUFFLENBQUM7QUFDWixvQkFBWSxFQUFFLENBQUM7QUFFRixRQUFBLFlBQVksR0FBRyxNQUFNLENBQUMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBNEIsQ0FBQSxDQUFDO0lBQ3ZJLElBQUksdUNBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUV2QixJQUFJLEdBQXNELENBQUM7QUFDM0QsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsS0FBSyxNQUFNLEVBQUU7SUFDeEMsR0FBRyxHQUFHLG9CQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FDMUIsZUFBRyxDQUFDLFVBQUEsTUFBTTtRQUNSLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLE9BQU87WUFDdkIsT0FBTyxDQUFDLEdBQUcsT0FBWCxPQUFPLGtCQUFLLGlCQUFpQixFQUFFLHVEQUF1RCxHQUFLLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUU7YUFDekcsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUTtZQUMvQixPQUFPLENBQUMsR0FBRyxPQUFYLE9BQU8sa0JBQUssa0JBQWtCLEVBQUUsdURBQXVELEdBQUssTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRTs7WUFFM0csT0FBTyxDQUFDLEdBQUcsT0FBWCxPQUFPLEVBQVEsTUFBTSxFQUFFO0lBQzNCLENBQUMsQ0FBQyxDQUNILENBQUMsU0FBUyxFQUFFLENBQUM7Q0FDZjtBQUlELElBQUksTUFBTSxDQUFDLEdBQUcsRUFBRTtJQUNkLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFVBQUEsSUFBSTtRQUNyQixJQUFJLENBQUMsWUFBWSxHQUFHLG9CQUFZLENBQUM7UUFDakMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ3BCLENBQUMsQ0FBQyxDQUFDO0NBQ0oiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG5pbXBvcnQgeyBvZlBheWxvYWRBY3Rpb24sIFN0YXRlRmFjdG9yeSB9IGZyb20gJy4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlJztcbmltcG9ydCB7IGVuYWJsZUVTNSwgZW5hYmxlTWFwU2V0IH0gZnJvbSAnaW1tZXInO1xuaW1wb3J0IHsgdGFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuZXhwb3J0ICogZnJvbSAnLi9yZXNvdXJjZS1tYXAnO1xuXG5lbmFibGVFUzUoKTtcbmVuYWJsZU1hcFNldCgpO1xuXG5leHBvcnQgY29uc3Qgc3RhdGVGYWN0b3J5ID0gbW9kdWxlLmhvdCAmJiBtb2R1bGUuaG90LmRhdGEgJiYgbW9kdWxlLmhvdC5kYXRhLnN0YXRlRmFjdG9yeSA/IG1vZHVsZS5ob3QuZGF0YS5zdGF0ZUZhY3RvcnkgYXMgU3RhdGVGYWN0b3J5OlxuICBuZXcgU3RhdGVGYWN0b3J5KHt9KTtcblxubGV0IHN1YjogUmV0dXJuVHlwZTx0eXBlb2Ygc3RhdGVGYWN0b3J5LmxvZyRbJ3N1YnNjcmliZSddPjtcbmlmIChwcm9jZXNzLmVudi5SRUFDVF9BUFBfZW52ICE9PSAncHJvZCcpIHtcbiAgc3ViID0gc3RhdGVGYWN0b3J5LmxvZyQucGlwZShcbiAgICB0YXAocGFyYW1zID0+IHtcbiAgICAgIGlmIChwYXJhbXNbMF0gPT09ICdzdGF0ZScpXG4gICAgICAgIGNvbnNvbGUubG9nKCclYyByZWR1eDpzdGF0ZSAnLCAnZm9udC13ZWlnaHQ6IGJvbGQ7IGNvbG9yOiBibGFjazsgYmFja2dyb3VuZDogIzQ0YzJmZDsnLCAuLi5wYXJhbXMuc2xpY2UoMSkpO1xuICAgICAgZWxzZSBpZiAocGFyYW1zWzBdID09PSAnYWN0aW9uJylcbiAgICAgIGNvbnNvbGUubG9nKCclYyByZWR1eDphY3Rpb24gJywgJ2ZvbnQtd2VpZ2h0OiBib2xkOyBjb2xvcjogd2hpdGU7IGJhY2tncm91bmQ6ICM4YzYxZmY7JywgLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgIGVsc2VcbiAgICAgICAgY29uc29sZS5sb2coLi4ucGFyYW1zKTtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xufVxuXG5leHBvcnQgeyBvZlBheWxvYWRBY3Rpb24gfTtcblxuaWYgKG1vZHVsZS5ob3QpIHtcbiAgbW9kdWxlLmhvdC5kaXNwb3NlKGRhdGEgPT4ge1xuICAgIGRhdGEuc3RhdGVGYWN0b3J5ID0gc3RhdGVGYWN0b3J5O1xuICAgIHN1Yi51bnN1YnNjcmliZSgpO1xuICB9KTtcbn1cbiJdfQ==