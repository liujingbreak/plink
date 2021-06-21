/* eslint-disable no-console */
import loader = require('../loaders/css-url-loader');
import * as wb from 'webpack';
import {resolve} from 'url';

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
        // Mimic Angular 8.0, postcss plugin
        url = resolve('foobar/currFile', url);
        process.nextTick(() => cb(null, `module.exports = __webpack_public_path__ + "${url}";`));
      },
      emitError(err: Error) {
        done.fail(err);
      }
    };
    loader.call(context, '.test {background: url(abc.jpg)}\n.test2 {background: url(efg.svg#filter-id)}', null);
  });
});
