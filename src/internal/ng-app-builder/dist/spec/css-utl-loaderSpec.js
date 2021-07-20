"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3NzLXV0bC1sb2FkZXJTcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY3NzLXV0bC1sb2FkZXJTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsK0JBQStCO0FBQy9CLG9EQUFxRDtBQUVyRCw2QkFBNEI7QUFFNUIsUUFBUSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtJQUM5QixFQUFFLENBQUMsK0JBQStCLEVBQUUsQ0FBQyxJQUFTLEVBQUUsRUFBRTtRQUNoRCxNQUFNLE9BQU8sR0FBRztZQUNkLFNBQVMsRUFBRTtnQkFDVCxPQUFPLEVBQUU7b0JBQ1AsTUFBTSxFQUFFO3dCQUNOLFVBQVUsRUFBRSxtQkFBbUI7cUJBQ2hDO2lCQUNGO2FBQ0Y7WUFDRCxLQUFLO2dCQUNILE9BQU8sVUFBUyxHQUFVLEVBQUUsT0FBZTtvQkFDekMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7b0JBQzlCLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQ2xCLCtIQUErSCxDQUFDLENBQUM7b0JBQ25JLElBQUksRUFBRSxDQUFDO2dCQUNULENBQUMsQ0FBQztZQUNKLENBQUM7WUFDRCxVQUFVLENBQUMsR0FBVyxFQUFFLEVBQThDO2dCQUNwRSxvQ0FBb0M7Z0JBQ3BDLEdBQUcsR0FBRyxhQUFPLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ3RDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSwrQ0FBK0MsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzNGLENBQUM7WUFDRCxTQUFTLENBQUMsR0FBVTtnQkFDbEIsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNqQixDQUFDO1NBQ0YsQ0FBQztRQUNGLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLCtFQUErRSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzlHLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQgbG9hZGVyID0gcmVxdWlyZSgnLi4vbG9hZGVycy9jc3MtdXJsLWxvYWRlcicpO1xuaW1wb3J0ICogYXMgd2IgZnJvbSAnd2VicGFjayc7XG5pbXBvcnQge3Jlc29sdmV9IGZyb20gJ3VybCc7XG5cbmRlc2NyaWJlKCdjc3MtdXJsLWxvYWRlcicsICgpID0+IHtcbiAgaXQoJ3Nob3VsZCByZXNvbHZlIHJlbGF0aXZlIHVybCgpJywgKGRvbmU6IGFueSkgPT4ge1xuICAgIGNvbnN0IGNvbnRleHQgPSB7XG4gICAgICBfY29tcGlsZXI6IHtcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIG91dHB1dDoge1xuICAgICAgICAgICAgcHVibGljUGF0aDogJ2h0dHA6Ly9sb2NhbGhvc3QvJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGFzeW5jKCk6IHdiLmxvYWRlci5sb2FkZXJDYWxsYmFjayB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihlcnI6IEVycm9yLCBjb250ZW50OiBzdHJpbmcpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnZG9uZSAnLCBjb250ZW50KTtcbiAgICAgICAgICBleHBlY3QoY29udGVudCkudG9CZShcbiAgICAgICAgICAgICcudGVzdCB7YmFja2dyb3VuZDogdXJsKGh0dHA6Ly9sb2NhbGhvc3QvZm9vYmFyL2FiYy5qcGcpfVxcbi50ZXN0MiB7YmFja2dyb3VuZDogdXJsKGh0dHA6Ly9sb2NhbGhvc3QvZm9vYmFyL2VmZy5zdmcjZmlsdGVyLWlkKX0nKTtcbiAgICAgICAgICBkb25lKCk7XG4gICAgICAgIH07XG4gICAgICB9LFxuICAgICAgbG9hZE1vZHVsZSh1cmw6IHN0cmluZywgY2I6IChlcnI6IEVycm9yIHwgbnVsbCwgc291cmNlOiBhbnkpID0+IHN0cmluZykge1xuICAgICAgICAvLyBNaW1pYyBBbmd1bGFyIDguMCwgcG9zdGNzcyBwbHVnaW5cbiAgICAgICAgdXJsID0gcmVzb2x2ZSgnZm9vYmFyL2N1cnJGaWxlJywgdXJsKTtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiBjYihudWxsLCBgbW9kdWxlLmV4cG9ydHMgPSBfX3dlYnBhY2tfcHVibGljX3BhdGhfXyArIFwiJHt1cmx9XCI7YCkpO1xuICAgICAgfSxcbiAgICAgIGVtaXRFcnJvcihlcnI6IEVycm9yKSB7XG4gICAgICAgIGRvbmUuZmFpbChlcnIpO1xuICAgICAgfVxuICAgIH07XG4gICAgbG9hZGVyLmNhbGwoY29udGV4dCwgJy50ZXN0IHtiYWNrZ3JvdW5kOiB1cmwoYWJjLmpwZyl9XFxuLnRlc3QyIHtiYWNrZ3JvdW5kOiB1cmwoZWZnLnN2ZyNmaWx0ZXItaWQpfScsIG51bGwpO1xuICB9KTtcbn0pO1xuIl19