"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ofPayloadAction = exports.stateFactory = void 0;
/* eslint-disable no-console */
var redux_toolkit_observable_1 = require("./redux-toolkit-observable");
Object.defineProperty(exports, "ofPayloadAction", { enumerable: true, get: function () { return redux_toolkit_observable_1.ofPayloadAction; } });
var immer_1 = require("immer");
var operators_1 = require("rxjs/operators");
(0, immer_1.enableES5)();
(0, immer_1.enableMapSet)();
exports.stateFactory = module.hot && module.hot.data && module.hot.data.stateFactory ? module.hot.data.stateFactory :
    new redux_toolkit_observable_1.StateFactory({});
var sub;
if (process.env.NODE_ENV === 'development' || (process.env.REACT_APP_env && process.env.REACT_APP_env !== 'prod')) {
    sub = exports.stateFactory.log$.pipe((0, operators_1.tap)(function (params) {
        if (params[0] === 'state')
            console.log.apply(console, __spreadArray(['%c redux:state ', 'font-weight: bold; color: black; background: #44c2fd;'], params.slice(1), false));
        else if (params[0] === 'action')
            console.log.apply(console, __spreadArray(['%c redux:action ', 'font-weight: bold; color: white; background: #8c61ff;'], params.slice(1), false));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGUtZmFjdG9yeS1icm93c2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3RhdGUtZmFjdG9yeS1icm93c2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLCtCQUErQjtBQUMvQix1RUFBMkU7QUF3QmxFLGdHQXhCQSwwQ0FBZSxPQXdCQTtBQXZCeEIsK0JBQWdEO0FBQ2hELDRDQUFxQztBQUVyQyxJQUFBLGlCQUFTLEdBQUUsQ0FBQztBQUNaLElBQUEsb0JBQVksR0FBRSxDQUFDO0FBRUYsUUFBQSxZQUFZLEdBQUcsTUFBTSxDQUFDLEdBQUcsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQTRCLENBQUEsQ0FBQztJQUN2SSxJQUFJLHVDQUFZLENBQUMsRUFBRSxDQUFDLENBQUM7QUFFdkIsSUFBSSxHQUFzRCxDQUFDO0FBQzNELElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEtBQUssYUFBYSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEtBQUssTUFBTSxDQUFDLEVBQUU7SUFDakgsR0FBRyxHQUFHLG9CQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FDMUIsSUFBQSxlQUFHLEVBQUMsVUFBQSxNQUFNO1FBQ1IsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssT0FBTztZQUN2QixPQUFPLENBQUMsR0FBRyxPQUFYLE9BQU8saUJBQUssaUJBQWlCLEVBQUUsdURBQXVELEdBQUssTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsVUFBRTthQUN6RyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRO1lBQy9CLE9BQU8sQ0FBQyxHQUFHLE9BQVgsT0FBTyxpQkFBSyxrQkFBa0IsRUFBRSx1REFBdUQsR0FBSyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxVQUFFOztZQUUzRyxPQUFPLENBQUMsR0FBRyxPQUFYLE9BQU8sRUFBUSxNQUFNLEVBQUU7SUFDM0IsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztDQUNmO0FBSUQsSUFBSSxNQUFNLENBQUMsR0FBRyxFQUFFO0lBQ2QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsVUFBQSxJQUFJO1FBQ3JCLHNFQUFzRTtRQUN0RSxJQUFJLENBQUMsWUFBWSxHQUFHLG9CQUFZLENBQUM7UUFDakMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ3BCLENBQUMsQ0FBQyxDQUFDO0NBQ0oiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQgeyBvZlBheWxvYWRBY3Rpb24sIFN0YXRlRmFjdG9yeSB9IGZyb20gJy4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlJztcbmltcG9ydCB7IGVuYWJsZUVTNSwgZW5hYmxlTWFwU2V0IH0gZnJvbSAnaW1tZXInO1xuaW1wb3J0IHsgdGFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5lbmFibGVFUzUoKTtcbmVuYWJsZU1hcFNldCgpO1xuXG5leHBvcnQgY29uc3Qgc3RhdGVGYWN0b3J5ID0gbW9kdWxlLmhvdCAmJiBtb2R1bGUuaG90LmRhdGEgJiYgbW9kdWxlLmhvdC5kYXRhLnN0YXRlRmFjdG9yeSA/IG1vZHVsZS5ob3QuZGF0YS5zdGF0ZUZhY3RvcnkgYXMgU3RhdGVGYWN0b3J5OlxuICBuZXcgU3RhdGVGYWN0b3J5KHt9KTtcblxubGV0IHN1YjogUmV0dXJuVHlwZTx0eXBlb2Ygc3RhdGVGYWN0b3J5LmxvZyRbJ3N1YnNjcmliZSddPjtcbmlmIChwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ2RldmVsb3BtZW50JyB8fCAocHJvY2Vzcy5lbnYuUkVBQ1RfQVBQX2VudiAmJiBwcm9jZXNzLmVudi5SRUFDVF9BUFBfZW52ICE9PSAncHJvZCcpKSB7XG4gIHN1YiA9IHN0YXRlRmFjdG9yeS5sb2ckLnBpcGUoXG4gICAgdGFwKHBhcmFtcyA9PiB7XG4gICAgICBpZiAocGFyYW1zWzBdID09PSAnc3RhdGUnKVxuICAgICAgICBjb25zb2xlLmxvZygnJWMgcmVkdXg6c3RhdGUgJywgJ2ZvbnQtd2VpZ2h0OiBib2xkOyBjb2xvcjogYmxhY2s7IGJhY2tncm91bmQ6ICM0NGMyZmQ7JywgLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgIGVsc2UgaWYgKHBhcmFtc1swXSA9PT0gJ2FjdGlvbicpXG4gICAgICBjb25zb2xlLmxvZygnJWMgcmVkdXg6YWN0aW9uICcsICdmb250LXdlaWdodDogYm9sZDsgY29sb3I6IHdoaXRlOyBiYWNrZ3JvdW5kOiAjOGM2MWZmOycsIC4uLnBhcmFtcy5zbGljZSgxKSk7XG4gICAgICBlbHNlXG4gICAgICAgIGNvbnNvbGUubG9nKC4uLnBhcmFtcyk7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcbn1cblxuZXhwb3J0IHsgb2ZQYXlsb2FkQWN0aW9uIH07XG5cbmlmIChtb2R1bGUuaG90KSB7XG4gIG1vZHVsZS5ob3QuZGlzcG9zZShkYXRhID0+IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzXG4gICAgZGF0YS5zdGF0ZUZhY3RvcnkgPSBzdGF0ZUZhY3Rvcnk7XG4gICAgc3ViLnVuc3Vic2NyaWJlKCk7XG4gIH0pO1xufVxuIl19