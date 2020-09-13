"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModuleInjector = exports.setModuleInject = exports.ofPayloadAction = exports.injector = exports.stateFactory = void 0;
// tslint:disable:no-console
const redux_toolkit_observable_1 = require("./redux-toolkit-observable");
Object.defineProperty(exports, "ofPayloadAction", { enumerable: true, get: function () { return redux_toolkit_observable_1.ofPayloadAction; } });
const operators_1 = require("rxjs/operators");
const environment_1 = require("@bk/env/environment");
const get_1 = __importDefault(require("lodash/get"));
const immer_1 = require("immer");
immer_1.enableES5();
immer_1.enableMapSet();
exports.stateFactory = module.hot && module.hot.data && module.hot.data.stateFactory ? module.hot.data.stateFactory :
    new redux_toolkit_observable_1.StateFactory({});
exports.injector = get_1.default(module, 'hot.data.injector');
let sub;
if (environment_1.environment.devFriendly) {
    sub = exports.stateFactory.log$.pipe(operators_1.tap(params => {
        if (params[0] === 'state')
            console.log('[redux:state]', ...params.slice(1));
        else if (params[0] === 'action')
            console.log('[redux:action]', ...params.slice(1));
        else
            console.log(...params);
    })).subscribe();
}
function setModuleInject(_injector) {
    console.log('setModuleInject()');
    exports.injector = _injector;
}
exports.setModuleInject = setModuleInject;
function getModuleInjector() {
    return exports.injector;
}
exports.getModuleInjector = getModuleInjector;
if (module.hot) {
    module.hot.dispose(data => {
        data.stateFactory = exports.stateFactory;
        data.injector = exports.injector;
        sub.unsubscribe();
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGUtZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3JlZHV4LXRvb2xraXQtYWJzZXJ2YWJsZS9zdGF0ZS1mYWN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLDRCQUE0QjtBQUM1Qix5RUFBeUU7QUE2QmpFLGdHQTdCYywwQ0FBZSxPQTZCZDtBQTVCdkIsOENBQW1DO0FBQ25DLHFEQUF1RDtBQUV2RCxxREFBNkI7QUFDN0IsaUNBQThDO0FBRTlDLGlCQUFTLEVBQUUsQ0FBQztBQUNaLG9CQUFZLEVBQUUsQ0FBQztBQUVGLFFBQUEsWUFBWSxHQUFHLE1BQU0sQ0FBQyxHQUFHLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUE0QixDQUFBLENBQUM7SUFDdkksSUFBSSx1Q0FBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBRVosUUFBQSxRQUFRLEdBQWEsYUFBRyxDQUFDLE1BQU0sRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0FBRWpFLElBQUksR0FBc0QsQ0FBQztBQUMzRCxJQUFJLHlCQUFHLENBQUMsV0FBVyxFQUFFO0lBQ25CLEdBQUcsR0FBRyxvQkFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQzFCLGVBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTtRQUNYLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLE9BQU87WUFDdkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDOUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUTtZQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztZQUVsRCxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUM7SUFDM0IsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztDQUNmO0FBSUQsU0FBZ0IsZUFBZSxDQUFDLFNBQW1CO0lBQ2pELE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUNqQyxnQkFBUSxHQUFHLFNBQVMsQ0FBQztBQUN2QixDQUFDO0FBSEQsMENBR0M7QUFFRCxTQUFnQixpQkFBaUI7SUFDL0IsT0FBTyxnQkFBUSxDQUFDO0FBQ2xCLENBQUM7QUFGRCw4Q0FFQztBQUVELElBQUksTUFBTSxDQUFDLEdBQUcsRUFBRTtJQUNkLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ3hCLElBQUksQ0FBQyxZQUFZLEdBQUcsb0JBQVksQ0FBQztRQUNqQyxJQUFJLENBQUMsUUFBUSxHQUFHLGdCQUFRLENBQUM7UUFDekIsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ3BCLENBQUMsQ0FBQyxDQUFDO0NBQ0oiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG5pbXBvcnQge1N0YXRlRmFjdG9yeSwgb2ZQYXlsb2FkQWN0aW9ufSBmcm9tICcuL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZSc7XG5pbXBvcnQge3RhcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtlbnZpcm9ubWVudCBhcyBlbnZ9IGZyb20gJ0Biay9lbnYvZW52aXJvbm1lbnQnO1xuaW1wb3J0IHtJbmplY3Rvcn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgZ2V0IGZyb20gJ2xvZGFzaC9nZXQnO1xuaW1wb3J0IHtlbmFibGVFUzUsIGVuYWJsZU1hcFNldH0gZnJvbSAnaW1tZXInO1xuXG5lbmFibGVFUzUoKTtcbmVuYWJsZU1hcFNldCgpO1xuXG5leHBvcnQgY29uc3Qgc3RhdGVGYWN0b3J5ID0gbW9kdWxlLmhvdCAmJiBtb2R1bGUuaG90LmRhdGEgJiYgbW9kdWxlLmhvdC5kYXRhLnN0YXRlRmFjdG9yeSA/IG1vZHVsZS5ob3QuZGF0YS5zdGF0ZUZhY3RvcnkgYXMgU3RhdGVGYWN0b3J5OlxuICBuZXcgU3RhdGVGYWN0b3J5KHt9KTtcblxuZXhwb3J0IGxldCBpbmplY3RvcjogSW5qZWN0b3IgPSBnZXQobW9kdWxlLCAnaG90LmRhdGEuaW5qZWN0b3InKTtcblxubGV0IHN1YjogUmV0dXJuVHlwZTx0eXBlb2Ygc3RhdGVGYWN0b3J5LmxvZyRbJ3N1YnNjcmliZSddPjtcbmlmIChlbnYuZGV2RnJpZW5kbHkpIHtcbiAgc3ViID0gc3RhdGVGYWN0b3J5LmxvZyQucGlwZShcbiAgICB0YXAocGFyYW1zID0+IHtcbiAgICAgIGlmIChwYXJhbXNbMF0gPT09ICdzdGF0ZScpXG4gICAgICAgIGNvbnNvbGUubG9nKCdbcmVkdXg6c3RhdGVdJywgLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgIGVsc2UgaWYgKHBhcmFtc1swXSA9PT0gJ2FjdGlvbicpXG4gICAgICAgIGNvbnNvbGUubG9nKCdbcmVkdXg6YWN0aW9uXScsIC4uLnBhcmFtcy5zbGljZSgxKSk7XG4gICAgICBlbHNlXG4gICAgICAgIGNvbnNvbGUubG9nKC4uLnBhcmFtcyk7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcbn1cblxuZXhwb3J0IHtvZlBheWxvYWRBY3Rpb259O1xuXG5leHBvcnQgZnVuY3Rpb24gc2V0TW9kdWxlSW5qZWN0KF9pbmplY3RvcjogSW5qZWN0b3IpIHtcbiAgY29uc29sZS5sb2coJ3NldE1vZHVsZUluamVjdCgpJyk7XG4gIGluamVjdG9yID0gX2luamVjdG9yO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TW9kdWxlSW5qZWN0b3IoKSB7XG4gIHJldHVybiBpbmplY3Rvcjtcbn1cblxuaWYgKG1vZHVsZS5ob3QpIHtcbiAgbW9kdWxlLmhvdC5kaXNwb3NlKGRhdGEgPT4ge1xuICAgIGRhdGEuc3RhdGVGYWN0b3J5ID0gc3RhdGVGYWN0b3J5O1xuICAgIGRhdGEuaW5qZWN0b3IgPSBpbmplY3RvcjtcbiAgICBzdWIudW5zdWJzY3JpYmUoKTtcbiAgfSk7XG59XG4iXX0=