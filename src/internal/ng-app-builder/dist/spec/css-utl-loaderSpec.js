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

//# sourceMappingURL=css-utl-loaderSpec.js.map
