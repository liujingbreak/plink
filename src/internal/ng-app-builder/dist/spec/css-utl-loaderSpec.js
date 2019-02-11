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
                    expect(content).toBe('.test {background: url(/foobar/abc.jpg)}\n.test2 {background: url(/foobar/efg.svg#filter-id)}');
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
.test2 {background: url(efg.svg#filter-id)}', null);
    });
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zcGVjL2Nzcy11dGwtbG9hZGVyU3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDRCQUE0QjtBQUM1QixvREFBcUQ7QUFHckQsUUFBUSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtJQUMvQixFQUFFLENBQUMsK0JBQStCLEVBQUUsQ0FBQyxJQUFTLEVBQUUsRUFBRTtRQUNqRCxNQUFNLE9BQU8sR0FBRztZQUNmLEtBQUs7Z0JBQ0osT0FBTyxVQUFTLEdBQVUsRUFBRSxPQUFlO29CQUMxQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDOUIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FDbkIsK0ZBQStGLENBQUMsQ0FBQztvQkFDbEcsSUFBSSxFQUFFLENBQUM7Z0JBQ1IsQ0FBQyxDQUFDO1lBQ0gsQ0FBQztZQUNELFVBQVUsQ0FBQyxHQUFXLEVBQUUsRUFBdUM7Z0JBQzlELE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSw2QkFBNkIsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3hFLENBQUM7WUFDRCxTQUFTLENBQUMsR0FBVTtnQkFDbkIsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNoQixDQUFDO1NBQ0QsQ0FBQztRQUNGLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFOzRDQUNxQixFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ25ELENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3Qvc3BlYy9jc3MtdXRsLWxvYWRlclNwZWMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG5pbXBvcnQgbG9hZGVyID0gcmVxdWlyZSgnLi4vbG9hZGVycy9jc3MtdXJsLWxvYWRlcicpO1xuaW1wb3J0ICogYXMgd2IgZnJvbSAnd2VicGFjayc7XG5cbmRlc2NyaWJlKCdjc3MtdXJsLWxvYWRlcicsICgpID0+IHtcblx0aXQoJ3Nob3VsZCByZXNvbHZlIHJlbGF0aXZlIHVybCgpJywgKGRvbmU6IGFueSkgPT4ge1xuXHRcdGNvbnN0IGNvbnRleHQgPSB7XG5cdFx0XHRhc3luYygpOiB3Yi5sb2FkZXIubG9hZGVyQ2FsbGJhY2sge1xuXHRcdFx0XHRyZXR1cm4gZnVuY3Rpb24oZXJyOiBFcnJvciwgY29udGVudDogc3RyaW5nKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ2RvbmUgJywgY29udGVudCk7XG5cdFx0XHRcdFx0ZXhwZWN0KGNvbnRlbnQpLnRvQmUoXG5cdFx0XHRcdFx0XHQnLnRlc3Qge2JhY2tncm91bmQ6IHVybCgvZm9vYmFyL2FiYy5qcGcpfVxcbi50ZXN0MiB7YmFja2dyb3VuZDogdXJsKC9mb29iYXIvZWZnLnN2ZyNmaWx0ZXItaWQpfScpO1xuXHRcdFx0XHRcdGRvbmUoKTtcblx0XHRcdFx0fTtcblx0XHRcdH0sXG5cdFx0XHRsb2FkTW9kdWxlKHVybDogc3RyaW5nLCBjYjogKGVycjogRXJyb3IsIHNvdXJjZTogYW55KSA9PiBzdHJpbmcpIHtcblx0XHRcdFx0cHJvY2Vzcy5uZXh0VGljaygoKSA9PiBjYihudWxsLCBgbW9kdWxlLmV4cG9ydHMgPSBcIi9mb29iYXIvJHt1cmx9XCI7YCkpO1xuXHRcdFx0fSxcblx0XHRcdGVtaXRFcnJvcihlcnI6IEVycm9yKSB7XG5cdFx0XHRcdGRvbmUuZmFpbChlcnIpO1xuXHRcdFx0fVxuXHRcdH07XG5cdFx0bG9hZGVyLmNhbGwoY29udGV4dCwgJy50ZXN0IHtiYWNrZ3JvdW5kOiB1cmwoYWJjLmpwZyl9XFxuXFxcbi50ZXN0MiB7YmFja2dyb3VuZDogdXJsKGVmZy5zdmcjZmlsdGVyLWlkKX0nLCBudWxsKTtcblx0fSk7XG59KTtcbiJdfQ==
