"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-console
const loader = require("../loaders/css-url-loader");
const url_1 = require("url");
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
                // Mimic Angular 8.0, postcss plugin
                url = url_1.resolve('foobar/currFile', url);
                process.nextTick(() => cb(null, `module.exports = __webpack_public_path__ + "${url}";`));
            },
            emitError(err) {
                done.fail(err);
            }
        };
        loader.call(context, '.test {background: url(abc.jpg)}\n.test2 {background: url(efg.svg#filter-id)}', null);
    });
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zcGVjL2Nzcy11dGwtbG9hZGVyU3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDRCQUE0QjtBQUM1QixvREFBcUQ7QUFFckQsNkJBQTRCO0FBRTVCLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDOUIsRUFBRSxDQUFDLCtCQUErQixFQUFFLENBQUMsSUFBUyxFQUFFLEVBQUU7UUFDaEQsTUFBTSxPQUFPLEdBQUc7WUFDZCxTQUFTLEVBQUU7Z0JBQ1QsT0FBTyxFQUFFO29CQUNQLE1BQU0sRUFBRTt3QkFDTixVQUFVLEVBQUUsbUJBQW1CO3FCQUNoQztpQkFDRjthQUNGO1lBQ0QsS0FBSztnQkFDSCxPQUFPLFVBQVMsR0FBVSxFQUFFLE9BQWU7b0JBQ3pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO29CQUM5QixNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUNsQiwrSEFBK0gsQ0FBQyxDQUFDO29CQUNuSSxJQUFJLEVBQUUsQ0FBQztnQkFDVCxDQUFDLENBQUM7WUFDSixDQUFDO1lBQ0QsVUFBVSxDQUFDLEdBQVcsRUFBRSxFQUE4QztnQkFDcEUsb0NBQW9DO2dCQUNwQyxHQUFHLEdBQUcsYUFBTyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUN0QyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsK0NBQStDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUMzRixDQUFDO1lBQ0QsU0FBUyxDQUFDLEdBQVU7Z0JBQ2xCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDakIsQ0FBQztTQUNGLENBQUM7UUFDRixNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSwrRUFBK0UsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM5RyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3NwZWMvY3NzLXV0bC1sb2FkZXJTcGVjLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuaW1wb3J0IGxvYWRlciA9IHJlcXVpcmUoJy4uL2xvYWRlcnMvY3NzLXVybC1sb2FkZXInKTtcbmltcG9ydCAqIGFzIHdiIGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHtyZXNvbHZlfSBmcm9tICd1cmwnO1xuXG5kZXNjcmliZSgnY3NzLXVybC1sb2FkZXInLCAoKSA9PiB7XG4gIGl0KCdzaG91bGQgcmVzb2x2ZSByZWxhdGl2ZSB1cmwoKScsIChkb25lOiBhbnkpID0+IHtcbiAgICBjb25zdCBjb250ZXh0ID0ge1xuICAgICAgX2NvbXBpbGVyOiB7XG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICAgIHB1YmxpY1BhdGg6ICdodHRwOi8vbG9jYWxob3N0LydcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBhc3luYygpOiB3Yi5sb2FkZXIubG9hZGVyQ2FsbGJhY2sge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oZXJyOiBFcnJvciwgY29udGVudDogc3RyaW5nKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ2RvbmUgJywgY29udGVudCk7XG4gICAgICAgICAgZXhwZWN0KGNvbnRlbnQpLnRvQmUoXG4gICAgICAgICAgICAnLnRlc3Qge2JhY2tncm91bmQ6IHVybChodHRwOi8vbG9jYWxob3N0L2Zvb2Jhci9hYmMuanBnKX1cXG4udGVzdDIge2JhY2tncm91bmQ6IHVybChodHRwOi8vbG9jYWxob3N0L2Zvb2Jhci9lZmcuc3ZnI2ZpbHRlci1pZCl9Jyk7XG4gICAgICAgICAgZG9uZSgpO1xuICAgICAgICB9O1xuICAgICAgfSxcbiAgICAgIGxvYWRNb2R1bGUodXJsOiBzdHJpbmcsIGNiOiAoZXJyOiBFcnJvciB8IG51bGwsIHNvdXJjZTogYW55KSA9PiBzdHJpbmcpIHtcbiAgICAgICAgLy8gTWltaWMgQW5ndWxhciA4LjAsIHBvc3Rjc3MgcGx1Z2luXG4gICAgICAgIHVybCA9IHJlc29sdmUoJ2Zvb2Jhci9jdXJyRmlsZScsIHVybCk7XG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4gY2IobnVsbCwgYG1vZHVsZS5leHBvcnRzID0gX193ZWJwYWNrX3B1YmxpY19wYXRoX18gKyBcIiR7dXJsfVwiO2ApKTtcbiAgICAgIH0sXG4gICAgICBlbWl0RXJyb3IoZXJyOiBFcnJvcikge1xuICAgICAgICBkb25lLmZhaWwoZXJyKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGxvYWRlci5jYWxsKGNvbnRleHQsICcudGVzdCB7YmFja2dyb3VuZDogdXJsKGFiYy5qcGcpfVxcbi50ZXN0MiB7YmFja2dyb3VuZDogdXJsKGVmZy5zdmcjZmlsdGVyLWlkKX0nLCBudWxsKTtcbiAgfSk7XG59KTtcbiJdfQ==
