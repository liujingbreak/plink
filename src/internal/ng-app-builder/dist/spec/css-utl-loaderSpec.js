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

//# sourceMappingURL=css-utl-loaderSpec.js.map
