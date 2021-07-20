"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable  no-console */
const _ = __importStar(require("lodash"));
const Path = __importStar(require("path"));
// var log = require('log4js').getLogger('gzipSizePlugin');
const gzipSize = require('gzip-size');
var { magenta, cyan } = require('chalk');
var prettyBytes = require('pretty-bytes');
class GzipSize {
    constructor() {
        this.done = false;
    }
    apply(compiler) {
        this.compiler = compiler;
        compiler.hooks.emit.tapPromise('GzipSize', (compilation) => {
            if (this.done)
                return Promise.resolve();
            this.done = true;
            var all = [];
            var maxLenName = _.max(_.map(compilation.assets, (src, file) => file.length));
            if (maxLenName == null)
                return Promise.resolve();
            _.each(compilation.assets, (source, file) => {
                if (Path.extname(file) === '.map')
                    return;
                all.push(gzipSize(source.source()).then((size) => {
                    let colorFunc;
                    if (size >= 100 * 1024) {
                        colorFunc = magenta;
                    }
                    else {
                        colorFunc = cyan;
                    }
                    return [file, size, colorFunc];
                }));
            });
            return Promise.all(all).then((rawDatas) => {
                rawDatas.sort((item, item2) => {
                    return item2[1] - item[1];
                })
                    .forEach((item) => {
                    item[1] = prettyBytes(item[1]);
                });
                const datas = rawDatas;
                var maxLenSize = _.max(_.map(datas, data => data[1].length));
                if (maxLenSize == null)
                    maxLenSize = 0;
                var sepLineLen = '(gzipped)'.length + maxLenSize + maxLenName + 10;
                console.log();
                console.log(_.pad(' Gzip size ', sepLineLen, '-'));
                _.each(datas, (data) => {
                    console.log(_.padStart(data[0], maxLenName + 2, ' ') +
                        data[2](_.padStart(data[1], maxLenSize + 2, ' ')) + ' (gzipped)');
                });
                console.log(_.pad('', sepLineLen, '-'));
            })
                .catch((err) => {
                console.log('Failed in GzipSize plugin', err);
            });
        });
    }
}
exports.default = GzipSize;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3ppcC1zaXplLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ3ppcC1zaXplLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdDQUFnQztBQUNoQywwQ0FBNEI7QUFDNUIsMkNBQTZCO0FBRTdCLDJEQUEyRDtBQUMzRCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDdEMsSUFBSSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDdkMsSUFBSSxXQUFXLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBRTFDLE1BQXFCLFFBQVE7SUFBN0I7UUFFRSxTQUFJLEdBQUcsS0FBSyxDQUFDO0lBdURmLENBQUM7SUFyREMsS0FBSyxDQUFDLFFBQWE7UUFDakIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxDQUFDLFdBQWdCLEVBQUUsRUFBRTtZQUM5RCxJQUFJLElBQUksQ0FBQyxJQUFJO2dCQUNYLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1lBQ2pCLElBQUksR0FBRyxHQUE0QixFQUFFLENBQUM7WUFDdEMsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUM5RSxJQUFJLFVBQVUsSUFBSSxJQUFJO2dCQUNwQixPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUUzQixDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxN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YmxlICBuby1jb25zb2xlICovXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuXG4vLyB2YXIgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdnemlwU2l6ZVBsdWdpbicpO1xuY29uc3QgZ3ppcFNpemUgPSByZXF1aXJlKCdnemlwLXNpemUnKTtcbnZhciB7bWFnZW50YSwgY3lhbn0gPSByZXF1aXJlKCdjaGFsaycpO1xudmFyIHByZXR0eUJ5dGVzID0gcmVxdWlyZSgncHJldHR5LWJ5dGVzJyk7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEd6aXBTaXplIHtcbiAgY29tcGlsZXI6IGFueTtcbiAgZG9uZSA9IGZhbHNlO1xuXG4gIGFwcGx5KGNvbXBpbGVyOiBhbnkpIHtcbiAgICB0aGlzLmNvbXBpbGVyID0gY29tcGlsZXI7XG4gICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXBQcm9taXNlKCdHemlwU2l6ZScsIChjb21waWxhdGlvbjogYW55KSA9PiB7XG4gICAgICBpZiAodGhpcy5kb25lKVxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICB0aGlzLmRvbmUgPSB0cnVlO1xuICAgICAgdmFyIGFsbDogQXJyYXk8UHJvbWlzZUxpa2U8YW55Pj4gPSBbXTtcbiAgICAgIHZhciBtYXhMZW5OYW1lID0gXy5tYXgoXy5tYXAoY29tcGlsYXRpb24uYXNzZXRzLCAoc3JjLCBmaWxlKSA9PiBmaWxlLmxlbmd0aCkpO1xuICAgICAgaWYgKG1heExlbk5hbWUgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXG4gICAgICBfLmVhY2goY29tcGlsYXRpb24uYXNzZXRzLCAoc291cmNlLCBmaWxlKSA9PiB7XG4gICAgICAgIGlmIChQYXRoLmV4dG5hbWUoZmlsZSkgPT09ICcubWFwJylcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIGFsbC5wdXNoKGd6aXBTaXplKHNvdXJjZS5zb3VyY2UoKSkudGhlbigoc2l6ZTogbnVtYmVyKSA9PiB7XG4gICAgICAgICAgbGV0IGNvbG9yRnVuYzogYW55O1xuICAgICAgICAgIGlmIChzaXplID49IDEwMCAqIDEwMjQpIHtcbiAgICAgICAgICAgIGNvbG9yRnVuYyA9IG1hZ2VudGE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbG9yRnVuYyA9IGN5YW47XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBbZmlsZSwgc2l6ZSwgY29sb3JGdW5jXTtcbiAgICAgICAgfSkpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5hbGwoYWxsKS50aGVuKChyYXdEYXRhczogQXJyYXk8W3N0cmluZywgbnVtYmVyXT4pID0+IHtcbiAgICAgICAgcmF3RGF0YXMuc29ydCgoaXRlbTogW3N0cmluZywgbnVtYmVyXSwgaXRlbTI6IFtzdHJpbmcsIG51bWJlcl0pID0+IHtcbiAgICAgICAgICByZXR1cm4gaXRlbTJbMV0gLSBpdGVtWzFdO1xuICAgICAgICB9KVxuICAgICAgICAuZm9yRWFjaCgoaXRlbTogW3N0cmluZywgbnVtYmVyXSkgPT4ge1xuICAgICAgICAgIGl0ZW1bMV0gPSBwcmV0dHlCeXRlcyhpdGVtWzFdKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IGRhdGFzID0gKHJhd0RhdGFzIGFzIGFueSkgYXMgQXJyYXk8W3N0cmluZywgc3RyaW5nXT47XG5cbiAgICAgICAgdmFyIG1heExlblNpemUgPSBfLm1heChfLm1hcChkYXRhcywgZGF0YSA9PiBkYXRhWzFdLmxlbmd0aCkpO1xuXG4gICAgICAgIGlmIChtYXhMZW5TaXplID09IG51bGwpXG4gICAgICAgICAgbWF4TGVuU2l6ZSA9IDA7XG5cbiAgICAgICAgdmFyIHNlcExpbmVMZW4gPSAnKGd6aXBwZWQpJy5sZW5ndGggKyBtYXhMZW5TaXplICsgbWF4TGVuTmFtZSEgKyAxMDtcbiAgICAgICAgY29uc29sZS5sb2coKTtcbiAgICAgICAgY29uc29sZS5sb2coXy5wYWQoJyBHemlwIHNpemUgJywgc2VwTGluZUxlbiwgJy0nKSk7XG5cbiAgICAgICAgXy5lYWNoKGRhdGFzLCAoZGF0YTogYW55KSA9PiB7XG4gICAgICAgICAgY29uc29sZS5sb2coXy5wYWRTdGFydChkYXRhWzBdLCBtYXhMZW5OYW1lISArIDIsICcgJykgK1xuICAgICAgICAgICAgZGF0YVsyXShfLnBhZFN0YXJ0KGRhdGFbMV0sIG1heExlblNpemUhICsgMiwgJyAnKSkgKyAnIChnemlwcGVkKScpO1xuICAgICAgICB9KTtcbiAgICAgICAgY29uc29sZS5sb2coXy5wYWQoJycsIHNlcExpbmVMZW4sICctJykpO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyOiBhbnkpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ0ZhaWxlZCBpbiBHemlwU2l6ZSBwbHVnaW4nLCBlcnIpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==