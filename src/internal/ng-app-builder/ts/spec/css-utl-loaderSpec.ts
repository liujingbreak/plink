// tslint:disable:no-console
import loader = require('../loaders/css-url-loader');
import * as wb from 'webpack';

describe('css-url-loader', () => {
  it('should resolve relative url()', (done: any) => {
    const context = {
      _compiler: {
        options: {
          output: {
            publicPath: 'http://localhost/'
          }
        }
      },
      async(): wb.loader.loaderCallback {
        return function(err: Error, content: string) {
          console.log('done ', content);
          expect(content).toBe(
            '.test {background: url(http://localhost/foobar/abc.jpg)}\n.test2 {background: url(http://localhost/foobar/efg.svg#filter-id)}');
          done();
        };
      },
      loadModule(url: string, cb: (err: Error | null, source: any) => string) {
        process.nextTick(() => cb(null, `module.exports = __webpack_public_path__ + "foobar/${url}";`));
      },
      emitError(err: Error) {
        done.fail(err);
      }
    };
    loader.call(context, '.test {background: url(abc.jpg)}\n\
.test2 {background: url(efg.svg#filter-id)}', null);
  });
});
