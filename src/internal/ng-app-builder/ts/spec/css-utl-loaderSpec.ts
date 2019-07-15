// tslint:disable:no-console
import loader = require('../loaders/css-url-loader');
import * as wb from 'webpack';

describe('css-url-loader', () => {
  it('should resolve relative url()', (done: any) => {
    const context = {
      async(): wb.loader.loaderCallback {
        return function(err: Error, content: string) {
          console.log('done ', content);
          expect(content).toBe(
            '.test {background: url(/foobar/abc.jpg)}\n.test2 {background: url(/foobar/efg.svg#filter-id)}');
          done();
        };
      },
      loadModule(url: string, cb: (err: Error, source: any) => string) {
        process.nextTick(() => cb(null, `module.exports = "/foobar/${url}";`));
      },
      emitError(err: Error) {
        done.fail(err);
      }
    };
    loader.call(context, '.test {background: url(abc.jpg)}\n\
.test2 {background: url(efg.svg#filter-id)}', null);
  });
});
