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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9zcGVjL2Nzcy11dGwtbG9hZGVyU3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDRCQUE0QjtBQUM1QixvREFBcUQ7QUFFckQsNkJBQTRCO0FBRTVCLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDOUIsRUFBRSxDQUFDLCtCQUErQixFQUFFLENBQUMsSUFBUyxFQUFFLEVBQUU7UUFDaEQsTUFBTSxPQUFPLEdBQUc7WUFDZCxTQUFTLEVBQUU7Z0JBQ1QsT0FBTyxFQUFFO29CQUNQLE1BQU0sRUFBRTt3QkFDTixVQUFVLEVBQUUsbUJBQW1CO3FCQUNoQztpQkFDRjthQUNGO1lBQ0QsS0FBSztnQkFDSCxPQUFPLFVBQVMsR0FBVSxFQUFFLE9BQWU7b0JBQ3pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO29CQUM5QixNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUNsQiwrSEFBK0gsQ0FBQyxDQUFDO29CQUNuSSxJQUFJLEVBQUUsQ0FBQztnQkFDVCxDQUFDLENBQUM7WUFDSixDQUFDO1lBQ0QsVUFBVSxDQUFDLEdBQVcsRUFBRSxFQUE4QztnQkFDcEUsb0NBQW9DO2dCQUNwQyxHQUFHLEdBQUcsYUFBTyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUN0QyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsK0NBQStDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUMzRixDQUFDO1lBQ0QsU0FBUyxDQUFDLEdBQVU7Z0JBQ2xCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDakIsQ0FBQztTQUNGLENBQUM7UUFDRixNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSwrRUFBK0UsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM5RyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6ImRpc3Qvc3BlYy9jc3MtdXRsLWxvYWRlclNwZWMuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdfQ==
