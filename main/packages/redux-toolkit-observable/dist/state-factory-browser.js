"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ofPayloadAction = exports.stateFactory = void 0;
/* eslint-disable no-console */
const redux_toolkit_observable_1 = require("./redux-toolkit-observable");
Object.defineProperty(exports, "ofPayloadAction", { enumerable: true, get: function () { return redux_toolkit_observable_1.ofPayloadAction; } });
const immer_1 = require("immer");
const operators_1 = require("rxjs/operators");
(0, immer_1.enableES5)();
(0, immer_1.enableMapSet)();
exports.stateFactory = module.hot && module.hot.data && module.hot.data.stateFactory ? module.hot.data.stateFactory :
    new redux_toolkit_observable_1.StateFactory({});
let sub;
if (process.env.NODE_ENV === 'development' || (process.env.REACT_APP_env && process.env.REACT_APP_env !== 'prod')) {
    sub = exports.stateFactory.log$.pipe((0, operators_1.tap)(params => {
        if (params[0] === 'state')
            console.log('%c redux:state ', 'font-weight: bold; color: black; background: #44c2fd;', ...params.slice(1));
        else if (params[0] === 'action')
            console.log('%c redux:action ', 'font-weight: bold; color: white; background: #8c61ff;', ...params.slice(1));
        else
            console.log(...params);
    })).subscribe();
}
if (module.hot) {
    module.hot.dispose(data => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        data.stateFactory = exports.stateFactory;
        sub.unsubscribe();
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGUtZmFjdG9yeS1icm93c2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3RhdGUtZmFjdG9yeS1icm93c2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLCtCQUErQjtBQUMvQix5RUFBMkU7QUF3QmxFLGdHQXhCQSwwQ0FBZSxPQXdCQTtBQXZCeEIsaUNBQWdEO0FBQ2hELDhDQUFxQztBQUVyQyxJQUFBLGlCQUFTLEdBQUUsQ0FBQztBQUNaLElBQUEsb0JBQVksR0FBRSxDQUFDO0FBRUYsUUFBQSxZQUFZLEdBQUcsTUFBTSxDQUFDLEdBQUcsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQTRCLENBQUEsQ0FBQztJQUN2SSxJQUFJLHVDQUFZLENBQUMsRUFBRSxDQUFDLENBQUM7QUFFdkIsSUFBSSxHQUFzRCxDQUFDO0FBQzNELElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEtBQUssYUFBYSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEtBQUssTUFBTSxDQUFDLEVBQUU7SUFDakgsR0FBRyxHQUFHLG9CQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FDMUIsSUFBQSxlQUFHLEVBQUMsTUFBTSxDQUFDLEVBQUU7UUFDWCxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxPQUFPO1lBQ3ZCLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsdURBQXVELEVBQUUsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDekcsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUTtZQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLHVEQUF1RCxFQUFFLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztZQUUzRyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUM7SUFDM0IsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztDQUNmO0FBSUQsSUFBSSxNQUFNLENBQUMsR0FBRyxFQUFFO0lBQ2QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDeEIsc0VBQXNFO1FBQ3RFLElBQUksQ0FBQyxZQUFZLEdBQUcsb0JBQVksQ0FBQztRQUNqQyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDcEIsQ0FBQyxDQUFDLENBQUM7Q0FDSiIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCB7IG9mUGF5bG9hZEFjdGlvbiwgU3RhdGVGYWN0b3J5IH0gZnJvbSAnLi9yZWR1eC10b29sa2l0LW9ic2VydmFibGUnO1xuaW1wb3J0IHsgZW5hYmxlRVM1LCBlbmFibGVNYXBTZXQgfSBmcm9tICdpbW1lcic7XG5pbXBvcnQgeyB0YXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmVuYWJsZUVTNSgpO1xuZW5hYmxlTWFwU2V0KCk7XG5cbmV4cG9ydCBjb25zdCBzdGF0ZUZhY3RvcnkgPSBtb2R1bGUuaG90ICYmIG1vZHVsZS5ob3QuZGF0YSAmJiBtb2R1bGUuaG90LmRhdGEuc3RhdGVGYWN0b3J5ID8gbW9kdWxlLmhvdC5kYXRhLnN0YXRlRmFjdG9yeSBhcyBTdGF0ZUZhY3Rvcnk6XG4gIG5ldyBTdGF0ZUZhY3Rvcnkoe30pO1xuXG5sZXQgc3ViOiBSZXR1cm5UeXBlPHR5cGVvZiBzdGF0ZUZhY3RvcnkubG9nJFsnc3Vic2NyaWJlJ10+O1xuaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnIHx8IChwcm9jZXNzLmVudi5SRUFDVF9BUFBfZW52ICYmIHByb2Nlc3MuZW52LlJFQUNUX0FQUF9lbnYgIT09ICdwcm9kJykpIHtcbiAgc3ViID0gc3RhdGVGYWN0b3J5LmxvZyQucGlwZShcbiAgICB0YXAocGFyYW1zID0+IHtcbiAgICAgIGlmIChwYXJhbXNbMF0gPT09ICdzdGF0ZScpXG4gICAgICAgIGNvbnNvbGUubG9nKCclYyByZWR1eDpzdGF0ZSAnLCAnZm9udC13ZWlnaHQ6IGJvbGQ7IGNvbG9yOiBibGFjazsgYmFja2dyb3VuZDogIzQ0YzJmZDsnLCAuLi5wYXJhbXMuc2xpY2UoMSkpO1xuICAgICAgZWxzZSBpZiAocGFyYW1zWzBdID09PSAnYWN0aW9uJylcbiAgICAgIGNvbnNvbGUubG9nKCclYyByZWR1eDphY3Rpb24gJywgJ2ZvbnQtd2VpZ2h0OiBib2xkOyBjb2xvcjogd2hpdGU7IGJhY2tncm91bmQ6ICM4YzYxZmY7JywgLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgIGVsc2VcbiAgICAgICAgY29uc29sZS5sb2coLi4ucGFyYW1zKTtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xufVxuXG5leHBvcnQgeyBvZlBheWxvYWRBY3Rpb24gfTtcblxuaWYgKG1vZHVsZS5ob3QpIHtcbiAgbW9kdWxlLmhvdC5kaXNwb3NlKGRhdGEgPT4ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3NcbiAgICBkYXRhLnN0YXRlRmFjdG9yeSA9IHN0YXRlRmFjdG9yeTtcbiAgICBzdWIudW5zdWJzY3JpYmUoKTtcbiAgfSk7XG59XG4iXX0=