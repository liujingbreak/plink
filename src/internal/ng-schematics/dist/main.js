"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable:no-console
const ng_schematics_1 = require("./ng-schematics");
const __api_1 = tslib_1.__importDefault(require("__api"));
function toNg8() {
    if (__api_1.default.argv.dir == null) {
        console.log('You need provide parameter "--dir <directory>"');
    }
    return ng_schematics_1.fixViewChild(__api_1.default.argv.dir);
}
exports.toNg8 = toNg8;
// process.on('uncaughtException', (err) => {
//   console.error('uncaughtException', err);
// });
// process.on('unhandledRejection', (rej) => {
//   console.error('unhandledRejection', rej);
// });

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHIvbmctc2NoZW1hdGljcy9zcmMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw0QkFBNEI7QUFDNUIsbURBQTZDO0FBQzdDLDBEQUF3QjtBQUV4QixTQUFnQixLQUFLO0lBQ25CLElBQUksZUFBRyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxFQUFFO1FBQ3hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0RBQWdELENBQUMsQ0FBQztLQUMvRDtJQUNELE9BQU8sNEJBQVksQ0FBQyxlQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3BDLENBQUM7QUFMRCxzQkFLQztBQUNELDZDQUE2QztBQUM3Qyw2Q0FBNkM7QUFDN0MsTUFBTTtBQUNOLDhDQUE4QztBQUM5Qyw4Q0FBOEM7QUFDOUMsTUFBTSIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyL25nLXNjaGVtYXRpY3MvZGlzdC9tYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuaW1wb3J0IHtmaXhWaWV3Q2hpbGR9IGZyb20gJy4vbmctc2NoZW1hdGljcyc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcblxuZXhwb3J0IGZ1bmN0aW9uIHRvTmc4KCkge1xuICBpZiAoYXBpLmFyZ3YuZGlyID09IG51bGwpIHtcbiAgICBjb25zb2xlLmxvZygnWW91IG5lZWQgcHJvdmlkZSBwYXJhbWV0ZXIgXCItLWRpciA8ZGlyZWN0b3J5PlwiJyk7XG4gIH1cbiAgcmV0dXJuIGZpeFZpZXdDaGlsZChhcGkuYXJndi5kaXIpO1xufVxuLy8gcHJvY2Vzcy5vbigndW5jYXVnaHRFeGNlcHRpb24nLCAoZXJyKSA9PiB7XG4vLyAgIGNvbnNvbGUuZXJyb3IoJ3VuY2F1Z2h0RXhjZXB0aW9uJywgZXJyKTtcbi8vIH0pO1xuLy8gcHJvY2Vzcy5vbigndW5oYW5kbGVkUmVqZWN0aW9uJywgKHJlaikgPT4ge1xuLy8gICBjb25zb2xlLmVycm9yKCd1bmhhbmRsZWRSZWplY3Rpb24nLCByZWopO1xuLy8gfSk7XG4iXX0=
