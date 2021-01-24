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
// tslint:disable:no-console
var redux_toolkit_observable_1 = require("./redux-toolkit-observable");
Object.defineProperty(exports, "ofPayloadAction", { enumerable: true, get: function () { return redux_toolkit_observable_1.ofPayloadAction; } });
var immer_1 = require("immer");
var operators_1 = require("rxjs/operators");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGUtZmFjdG9yeS1icm93c2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3RhdGUtZmFjdG9yeS1icm93c2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIsdUVBQTJFO0FBd0JsRSxnR0F4QkEsMENBQWUsT0F3QkE7QUF2QnhCLCtCQUFnRDtBQUNoRCw0Q0FBcUM7QUFFckMsaUJBQVMsRUFBRSxDQUFDO0FBQ1osb0JBQVksRUFBRSxDQUFDO0FBRUYsUUFBQSxZQUFZLEdBQUcsTUFBTSxDQUFDLEdBQUcsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQTRCLENBQUEsQ0FBQztJQUN2SSxJQUFJLHVDQUFZLENBQUMsRUFBRSxDQUFDLENBQUM7QUFFdkIsSUFBSSxHQUFzRCxDQUFDO0FBQzNELElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEtBQUssTUFBTSxFQUFFO0lBQ3hDLEdBQUcsR0FBRyxvQkFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQzFCLGVBQUcsQ0FBQyxVQUFBLE1BQU07UUFDUixJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxPQUFPO1lBQ3ZCLE9BQU8sQ0FBQyxHQUFHLE9BQVgsT0FBTyxrQkFBSyxpQkFBaUIsRUFBRSx1REFBdUQsR0FBSyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFFO2FBQ3pHLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLFFBQVE7WUFDL0IsT0FBTyxDQUFDLEdBQUcsT0FBWCxPQUFPLGtCQUFLLGtCQUFrQixFQUFFLHVEQUF1RCxHQUFLLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUU7O1lBRTNHLE9BQU8sQ0FBQyxHQUFHLE9BQVgsT0FBTyxFQUFRLE1BQU0sRUFBRTtJQUMzQixDQUFDLENBQUMsQ0FDSCxDQUFDLFNBQVMsRUFBRSxDQUFDO0NBQ2Y7QUFJRCxJQUFJLE1BQU0sQ0FBQyxHQUFHLEVBQUU7SUFDZCxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxVQUFBLElBQUk7UUFDckIsSUFBSSxDQUFDLFlBQVksR0FBRyxvQkFBWSxDQUFDO1FBQ2pDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUNwQixDQUFDLENBQUMsQ0FBQztDQUNKIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuaW1wb3J0IHsgb2ZQYXlsb2FkQWN0aW9uLCBTdGF0ZUZhY3RvcnkgfSBmcm9tICcuL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBlbmFibGVFUzUsIGVuYWJsZU1hcFNldCB9IGZyb20gJ2ltbWVyJztcbmltcG9ydCB7IHRhcCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuZW5hYmxlRVM1KCk7XG5lbmFibGVNYXBTZXQoKTtcblxuZXhwb3J0IGNvbnN0IHN0YXRlRmFjdG9yeSA9IG1vZHVsZS5ob3QgJiYgbW9kdWxlLmhvdC5kYXRhICYmIG1vZHVsZS5ob3QuZGF0YS5zdGF0ZUZhY3RvcnkgPyBtb2R1bGUuaG90LmRhdGEuc3RhdGVGYWN0b3J5IGFzIFN0YXRlRmFjdG9yeTpcbiAgbmV3IFN0YXRlRmFjdG9yeSh7fSk7XG5cbmxldCBzdWI6IFJldHVyblR5cGU8dHlwZW9mIHN0YXRlRmFjdG9yeS5sb2ckWydzdWJzY3JpYmUnXT47XG5pZiAocHJvY2Vzcy5lbnYuUkVBQ1RfQVBQX2VudiAhPT0gJ3Byb2QnKSB7XG4gIHN1YiA9IHN0YXRlRmFjdG9yeS5sb2ckLnBpcGUoXG4gICAgdGFwKHBhcmFtcyA9PiB7XG4gICAgICBpZiAocGFyYW1zWzBdID09PSAnc3RhdGUnKVxuICAgICAgICBjb25zb2xlLmxvZygnJWMgcmVkdXg6c3RhdGUgJywgJ2ZvbnQtd2VpZ2h0OiBib2xkOyBjb2xvcjogYmxhY2s7IGJhY2tncm91bmQ6ICM0NGMyZmQ7JywgLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgIGVsc2UgaWYgKHBhcmFtc1swXSA9PT0gJ2FjdGlvbicpXG4gICAgICBjb25zb2xlLmxvZygnJWMgcmVkdXg6YWN0aW9uICcsICdmb250LXdlaWdodDogYm9sZDsgY29sb3I6IHdoaXRlOyBiYWNrZ3JvdW5kOiAjOGM2MWZmOycsIC4uLnBhcmFtcy5zbGljZSgxKSk7XG4gICAgICBlbHNlXG4gICAgICAgIGNvbnNvbGUubG9nKC4uLnBhcmFtcyk7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcbn1cblxuZXhwb3J0IHsgb2ZQYXlsb2FkQWN0aW9uIH07XG5cbmlmIChtb2R1bGUuaG90KSB7XG4gIG1vZHVsZS5ob3QuZGlzcG9zZShkYXRhID0+IHtcbiAgICBkYXRhLnN0YXRlRmFjdG9yeSA9IHN0YXRlRmFjdG9yeTtcbiAgICBzdWIudW5zdWJzY3JpYmUoKTtcbiAgfSk7XG59XG4iXX0=