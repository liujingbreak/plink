"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-console
const loader = require("../loaders/css-url-loader");
describe('css-url-loader', () => {
    it('should resolve relative url()', (done) => {
        const context = {
            _compiler: {
                options: {
                    output: {
                        publicPath: 'http://localhost/'
                    }
                }
            },
            async() {
                return function (err, content) {
                    console.log('done ', content);
                    expect(content).toBe('.test {background: url(http://localhost/foobar/abc.jpg)}\n.test2 {background: url(http://localhost/foobar/efg.svg#filter-id)}');
                    done();
                };
            },
            loadModule(url, cb) {
                process.nextTick(() => cb(null, `module.exports = __webpack_public_path__ + "foobar/${url}";`));
            },
            emitError(err) {
                done.fail(err);
            }
        };
        loader.call(context, '.test {background: url(abc.jpg)}\n\
.test2 {background: url(efg.svg#filter-id)}', null);
    });
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zcGVjL2Nzcy11dGwtbG9hZGVyU3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDRCQUE0QjtBQUM1QixvREFBcUQ7QUFHckQsUUFBUSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtJQUM5QixFQUFFLENBQUMsK0JBQStCLEVBQUUsQ0FBQyxJQUFTLEVBQUUsRUFBRTtRQUNoRCxNQUFNLE9BQU8sR0FBRztZQUNkLFNBQVMsRUFBRTtnQkFDVCxPQUFPLEVBQUU7b0JBQ1AsTUFBTSxFQUFFO3dCQUNOLFVBQVUsRUFBRSxtQkFBbUI7cUJBQ2hDO2lCQUNGO2FBQ0Y7WUFDRCxLQUFLO2dCQUNILE9BQU8sVUFBUyxHQUFVLEVBQUUsT0FBZTtvQkFDekMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7b0JBQzlCLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQ2xCLCtIQUErSCxDQUFDLENBQUM7b0JBQ25JLElBQUksRUFBRSxDQUFDO2dCQUNULENBQUMsQ0FBQztZQUNKLENBQUM7WUFDRCxVQUFVLENBQUMsR0FBVyxFQUFFLEVBQThDO2dCQUNwRSxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsc0RBQXNELEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNsRyxDQUFDO1lBQ0QsU0FBUyxDQUFDLEdBQVU7Z0JBQ2xCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDakIsQ0FBQztTQUNGLENBQUM7UUFDRixNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTs0Q0FDbUIsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNsRCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3NwZWMvY3NzLXV0bC1sb2FkZXJTcGVjLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuaW1wb3J0IGxvYWRlciA9IHJlcXVpcmUoJy4uL2xvYWRlcnMvY3NzLXVybC1sb2FkZXInKTtcbmltcG9ydCAqIGFzIHdiIGZyb20gJ3dlYnBhY2snO1xuXG5kZXNjcmliZSgnY3NzLXVybC1sb2FkZXInLCAoKSA9PiB7XG4gIGl0KCdzaG91bGQgcmVzb2x2ZSByZWxhdGl2ZSB1cmwoKScsIChkb25lOiBhbnkpID0+IHtcbiAgICBjb25zdCBjb250ZXh0ID0ge1xuICAgICAgX2NvbXBpbGVyOiB7XG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICAgIHB1YmxpY1BhdGg6ICdodHRwOi8vbG9jYWxob3N0LydcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBhc3luYygpOiB3Yi5sb2FkZXIubG9hZGVyQ2FsbGJhY2sge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oZXJyOiBFcnJvciwgY29udGVudDogc3RyaW5nKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ2RvbmUgJywgY29udGVudCk7XG4gICAgICAgICAgZXhwZWN0KGNvbnRlbnQpLnRvQmUoXG4gICAgICAgICAgICAnLnRlc3Qge2JhY2tncm91bmQ6IHVybChodHRwOi8vbG9jYWxob3N0L2Zvb2Jhci9hYmMuanBnKX1cXG4udGVzdDIge2JhY2tncm91bmQ6IHVybChodHRwOi8vbG9jYWxob3N0L2Zvb2Jhci9lZmcuc3ZnI2ZpbHRlci1pZCl9Jyk7XG4gICAgICAgICAgZG9uZSgpO1xuICAgICAgICB9O1xuICAgICAgfSxcbiAgICAgIGxvYWRNb2R1bGUodXJsOiBzdHJpbmcsIGNiOiAoZXJyOiBFcnJvciB8IG51bGwsIHNvdXJjZTogYW55KSA9PiBzdHJpbmcpIHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiBjYihudWxsLCBgbW9kdWxlLmV4cG9ydHMgPSBfX3dlYnBhY2tfcHVibGljX3BhdGhfXyArIFwiZm9vYmFyLyR7dXJsfVwiO2ApKTtcbiAgICAgIH0sXG4gICAgICBlbWl0RXJyb3IoZXJyOiBFcnJvcikge1xuICAgICAgICBkb25lLmZhaWwoZXJyKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGxvYWRlci5jYWxsKGNvbnRleHQsICcudGVzdCB7YmFja2dyb3VuZDogdXJsKGFiYy5qcGcpfVxcblxcXG4udGVzdDIge2JhY2tncm91bmQ6IHVybChlZmcuc3ZnI2ZpbHRlci1pZCl9JywgbnVsbCk7XG4gIH0pO1xufSk7XG4iXX0=
