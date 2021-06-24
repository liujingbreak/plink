"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ofPayloadAction = exports.stateFactory = void 0;
/* eslint-disable no-console */
var redux_toolkit_observable_1 = require("./redux-toolkit-observable");
Object.defineProperty(exports, "ofPayloadAction", { enumerable: true, get: function () { return redux_toolkit_observable_1.ofPayloadAction; } });
var immer_1 = require("immer");
var operators_1 = require("rxjs/operators");
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        data.stateFactory = exports.stateFactory;
        sub.unsubscribe();
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGUtZmFjdG9yeS1icm93c2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3RhdGUtZmFjdG9yeS1icm93c2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSwrQkFBK0I7QUFDL0IsdUVBQTJFO0FBd0JsRSxnR0F4QkEsMENBQWUsT0F3QkE7QUF2QnhCLCtCQUFnRDtBQUNoRCw0Q0FBcUM7QUFFckMsaUJBQVMsRUFBRSxDQUFDO0FBQ1osb0JBQVksRUFBRSxDQUFDO0FBRUYsUUFBQSxZQUFZLEdBQUcsTUFBTSxDQUFDLEdBQUcsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQTRCLENBQUEsQ0FBQztJQUN2SSxJQUFJLHVDQUFZLENBQUMsRUFBRSxDQUFDLENBQUM7QUFFdkIsSUFBSSxHQUFzRCxDQUFDO0FBQzNELElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEtBQUssYUFBYSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEtBQUssTUFBTSxDQUFDLEVBQUU7SUFDakgsR0FBRyxHQUFHLG9CQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FDMUIsZUFBRyxDQUFDLFVBQUEsTUFBTTtRQUNSLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLE9BQU87WUFDdkIsT0FBTyxDQUFDLEdBQUcsT0FBWCxPQUFPLGtCQUFLLGlCQUFpQixFQUFFLHVEQUF1RCxHQUFLLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUU7YUFDekcsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUTtZQUMvQixPQUFPLENBQUMsR0FBRyxPQUFYLE9BQU8sa0JBQUssa0JBQWtCLEVBQUUsdURBQXVELEdBQUssTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRTs7WUFFM0csT0FBTyxDQUFDLEdBQUcsT0FBWCxPQUFPLEVBQVEsTUFBTSxFQUFFO0lBQzNCLENBQUMsQ0FBQyxDQUNILENBQUMsU0FBUyxFQUFFLENBQUM7Q0FDZjtBQUlELElBQUksTUFBTSxDQUFDLEdBQUcsRUFBRTtJQUNkLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFVBQUEsSUFBSTtRQUNyQixzRUFBc0U7UUFDdEUsSUFBSSxDQUFDLFlBQVksR0FBRyxvQkFBWSxDQUFDO1FBQ2pDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUNwQixDQUFDLENBQUMsQ0FBQztDQUNKIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0IHsgb2ZQYXlsb2FkQWN0aW9uLCBTdGF0ZUZhY3RvcnkgfSBmcm9tICcuL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBlbmFibGVFUzUsIGVuYWJsZU1hcFNldCB9IGZyb20gJ2ltbWVyJztcbmltcG9ydCB7IHRhcCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuZW5hYmxlRVM1KCk7XG5lbmFibGVNYXBTZXQoKTtcblxuZXhwb3J0IGNvbnN0IHN0YXRlRmFjdG9yeSA9IG1vZHVsZS5ob3QgJiYgbW9kdWxlLmhvdC5kYXRhICYmIG1vZHVsZS5ob3QuZGF0YS5zdGF0ZUZhY3RvcnkgPyBtb2R1bGUuaG90LmRhdGEuc3RhdGVGYWN0b3J5IGFzIFN0YXRlRmFjdG9yeTpcbiAgbmV3IFN0YXRlRmFjdG9yeSh7fSk7XG5cbmxldCBzdWI6IFJldHVyblR5cGU8dHlwZW9mIHN0YXRlRmFjdG9yeS5sb2ckWydzdWJzY3JpYmUnXT47XG5pZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdkZXZlbG9wbWVudCcgfHwgKHByb2Nlc3MuZW52LlJFQUNUX0FQUF9lbnYgJiYgcHJvY2Vzcy5lbnYuUkVBQ1RfQVBQX2VudiAhPT0gJ3Byb2QnKSkge1xuICBzdWIgPSBzdGF0ZUZhY3RvcnkubG9nJC5waXBlKFxuICAgIHRhcChwYXJhbXMgPT4ge1xuICAgICAgaWYgKHBhcmFtc1swXSA9PT0gJ3N0YXRlJylcbiAgICAgICAgY29uc29sZS5sb2coJyVjIHJlZHV4OnN0YXRlICcsICdmb250LXdlaWdodDogYm9sZDsgY29sb3I6IGJsYWNrOyBiYWNrZ3JvdW5kOiAjNDRjMmZkOycsIC4uLnBhcmFtcy5zbGljZSgxKSk7XG4gICAgICBlbHNlIGlmIChwYXJhbXNbMF0gPT09ICdhY3Rpb24nKVxuICAgICAgY29uc29sZS5sb2coJyVjIHJlZHV4OmFjdGlvbiAnLCAnZm9udC13ZWlnaHQ6IGJvbGQ7IGNvbG9yOiB3aGl0ZTsgYmFja2dyb3VuZDogIzhjNjFmZjsnLCAuLi5wYXJhbXMuc2xpY2UoMSkpO1xuICAgICAgZWxzZVxuICAgICAgICBjb25zb2xlLmxvZyguLi5wYXJhbXMpO1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG59XG5cbmV4cG9ydCB7IG9mUGF5bG9hZEFjdGlvbiB9O1xuXG5pZiAobW9kdWxlLmhvdCkge1xuICBtb2R1bGUuaG90LmRpc3Bvc2UoZGF0YSA9PiB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzc1xuICAgIGRhdGEuc3RhdGVGYWN0b3J5ID0gc3RhdGVGYWN0b3J5O1xuICAgIHN1Yi51bnN1YnNjcmliZSgpO1xuICB9KTtcbn1cbiJdfQ==