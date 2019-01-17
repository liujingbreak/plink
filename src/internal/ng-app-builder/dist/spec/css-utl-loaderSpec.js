"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-console
const loader = require("../loaders/css-url-loader");
describe('css-url-loader', () => {
    it('should resolve relative url()', (done) => {
        const context = {
            async() {
                return function (err, content) {
                    console.log('done ', content);
                    expect(content).toBe('.test {background: url(/foobar/abc.jpg)}\n.test2 {background: url(/foobar/efg.jpg)}');
                    done();
                };
            },
            loadModule(url, cb) {
                process.nextTick(() => cb(null, `module.exports = "/foobar/${url}";`));
            },
            emitError(err) {
                done.fail(err);
            }
        };
        loader.call(context, '.test {background: url(abc.jpg)}\n\
.test2 {background: url(efg.jpg)}', null);
    });
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zcGVjL2Nzcy11dGwtbG9hZGVyU3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDRCQUE0QjtBQUM1QixvREFBcUQ7QUFHckQsUUFBUSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtJQUMvQixFQUFFLENBQUMsK0JBQStCLEVBQUUsQ0FBQyxJQUFTLEVBQUUsRUFBRTtRQUNqRCxNQUFNLE9BQU8sR0FBRztZQUNmLEtBQUs7Z0JBQ0osT0FBTyxVQUFTLEdBQVUsRUFBRSxPQUFlO29CQUMxQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDOUIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxxRkFBcUYsQ0FBQyxDQUFDO29CQUM1RyxJQUFJLEVBQUUsQ0FBQztnQkFDUixDQUFDLENBQUM7WUFDSCxDQUFDO1lBQ0QsVUFBVSxDQUFDLEdBQVcsRUFBRSxFQUF1QztnQkFDOUQsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLDZCQUE2QixHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDeEUsQ0FBQztZQUNELFNBQVMsQ0FBQyxHQUFVO2dCQUNuQixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2hCLENBQUM7U0FDRCxDQUFDO1FBQ0YsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7a0NBQ1csRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN6QyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3NwZWMvY3NzLXV0bC1sb2FkZXJTcGVjLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuaW1wb3J0IGxvYWRlciA9IHJlcXVpcmUoJy4uL2xvYWRlcnMvY3NzLXVybC1sb2FkZXInKTtcbmltcG9ydCAqIGFzIHdiIGZyb20gJ3dlYnBhY2snO1xuXG5kZXNjcmliZSgnY3NzLXVybC1sb2FkZXInLCAoKSA9PiB7XG5cdGl0KCdzaG91bGQgcmVzb2x2ZSByZWxhdGl2ZSB1cmwoKScsIChkb25lOiBhbnkpID0+IHtcblx0XHRjb25zdCBjb250ZXh0ID0ge1xuXHRcdFx0YXN5bmMoKTogd2IubG9hZGVyLmxvYWRlckNhbGxiYWNrIHtcblx0XHRcdFx0cmV0dXJuIGZ1bmN0aW9uKGVycjogRXJyb3IsIGNvbnRlbnQ6IHN0cmluZykge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdkb25lICcsIGNvbnRlbnQpO1xuXHRcdFx0XHRcdGV4cGVjdChjb250ZW50KS50b0JlKCcudGVzdCB7YmFja2dyb3VuZDogdXJsKC9mb29iYXIvYWJjLmpwZyl9XFxuLnRlc3QyIHtiYWNrZ3JvdW5kOiB1cmwoL2Zvb2Jhci9lZmcuanBnKX0nKTtcblx0XHRcdFx0XHRkb25lKCk7XG5cdFx0XHRcdH07XG5cdFx0XHR9LFxuXHRcdFx0bG9hZE1vZHVsZSh1cmw6IHN0cmluZywgY2I6IChlcnI6IEVycm9yLCBzb3VyY2U6IGFueSkgPT4gc3RyaW5nKSB7XG5cdFx0XHRcdHByb2Nlc3MubmV4dFRpY2soKCkgPT4gY2IobnVsbCwgYG1vZHVsZS5leHBvcnRzID0gXCIvZm9vYmFyLyR7dXJsfVwiO2ApKTtcblx0XHRcdH0sXG5cdFx0XHRlbWl0RXJyb3IoZXJyOiBFcnJvcikge1xuXHRcdFx0XHRkb25lLmZhaWwoZXJyKTtcblx0XHRcdH1cblx0XHR9O1xuXHRcdGxvYWRlci5jYWxsKGNvbnRleHQsICcudGVzdCB7YmFja2dyb3VuZDogdXJsKGFiYy5qcGcpfVxcblxcXG4udGVzdDIge2JhY2tncm91bmQ6IHVybChlZmcuanBnKX0nLCBudWxsKTtcblx0fSk7XG59KTtcbiJdfQ==
